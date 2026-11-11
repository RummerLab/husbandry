import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { getLocalHistory, queueSubmission, saveLocalSubmission, syncPendingSubmissions } from '../src/lib/storage';
import { resumeSyncAfterAuthorization } from '../src/lib/authSync';
import metadataConfig from '../src/lib/server/sheetMetadata.json';
import { writeAtomicSubmission } from '../src/lib/server/atomicSubmission';
import type { FullHusbandrySubmission, LocalHistoryItem } from '../src/lib/types';
import type { sheets_v4 } from 'googleapis';

const payload = (id = 'sub_test'): FullHusbandrySubmission => ({ id, submittedAt: '2026-11-07T00:00:00Z', date: '2026-11-07', initials: 'AB', modulesSubmitted: ['feeds', 'waterQuality'], feeds: { date: '2026-11-07', initials: 'AB', tanks: {}, notes: '=1+1' }, waterQuality: { date: '2026-11-07', initials: 'AB', isWeeklyCheck: false, tempA: '26', tempB: '26', pHA: '8', pHB: '8', salinityA: '36', salinityB: '36', doA: '/', doB: '/', notes: '' } });
class MemoryStorage {
	data = new Map<string, string>();
	get length() { return this.data.size; }
	key(i: number) { return [...this.data.keys()][i] ?? null; }
	getItem(k: string) { return this.data.get(k) ?? null; }
	setItem(k: string, v: string) { this.data.set(k, v); }
	removeItem(k: string) { this.data.delete(k); }
}
beforeEach(() => { vi.stubGlobal('window', {}); vi.stubGlobal('localStorage', new MemoryStorage()); vi.stubGlobal('fetch', vi.fn()); });
afterEach(() => vi.unstubAllGlobals());
describe('durable device queue', () => {
	it('keeps more than 100 unsynced records', async () => {
		for (let i = 0; i < 101; i++) await queueSubmission(payload(`sub_${i}`), false);
		expect(getLocalHistory()).toHaveLength(101);
	});
	it('persists before network and coalesces simultaneous drains', async () => {
		let release!: (value: Response) => void;
		vi.mocked(fetch).mockImplementation(() => { expect(getLocalHistory()).toHaveLength(1); return new Promise(resolve => { release = resolve; }); });
		const submitted = queueSubmission(payload(), true);
		const a = syncPendingSubmissions(); const b = syncPendingSubmissions(); expect(a).toBe(b);
		release(new Response(JSON.stringify({ success: true, mode: 'live' })));
		expect((await submitted).synced).toBe(true); expect(fetch).toHaveBeenCalledTimes(1);
	});
	it('rejects storage failure before fetching', async () => {
		vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('Quota exceeded'); });
		await expect(queueSubmission(payload(), true)).rejects.toThrow('Quota exceeded'); expect(fetch).not.toHaveBeenCalled();
	});
	it('retains mock and network failures for later live sync', async () => {
		vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ success: true, mode: 'mock' })));
		expect((await queueSubmission(payload(), true)).synced).toBe(false);
		vi.mocked(fetch).mockRejectedValue(new Error('offline')); await syncPendingSubmissions(); expect(getLocalHistory()[0].synced).toBe(false);
		vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ success: true, mode: 'live' }))); await syncPendingSubmissions(); expect(getLocalHistory()[0].synced).toBe(true);
	});
	it('retains permanent rejections without repeatedly submitting them or blocking valid records', async () => {
		await queueSubmission(payload('sub_invalid'), false); await queueSubmission(payload('sub_valid'), false);
		vi.mocked(fetch).mockImplementation(async (_url, init) => JSON.parse(String(init?.body)).id === 'sub_invalid'
			? new Response(JSON.stringify({ error: 'Needs correction' }), { status: 422 })
			: new Response(JSON.stringify({ success: true, mode: 'live' })));
		await syncPendingSubmissions(); await syncPendingSubmissions();
		expect(fetch).toHaveBeenCalledTimes(2);
		expect(getLocalHistory().find(x => x.id === 'sub_invalid')).toMatchObject({ synced: false, syncBlocked: true });
		expect(getLocalHistory().find(x => x.id === 'sub_valid')?.synced).toBe(true);
	});
	it('stops on HTML throttling and honors cooldown across manual drains', async () => {
		vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-07T00:00:00Z'));
		try {
			await queueSubmission(payload('sub_a'), false); await queueSubmission(payload('sub_b'), false);
			vi.mocked(fetch).mockResolvedValue(new Response('<html>Limited</html>', { status: 429, headers: { 'Retry-After': '120' } }));
			await syncPendingSubmissions(); await syncPendingSubmissions(); expect(fetch).toHaveBeenCalledTimes(1);
			expect(getLocalHistory().every(x => !x.synced)).toBe(true);
			vi.advanceTimersByTime(119999); await syncPendingSubmissions(); expect(fetch).toHaveBeenCalledTimes(1);
			vi.advanceTimersByTime(4000); vi.mocked(fetch).mockImplementation(async () => new Response(JSON.stringify({ success: true, mode: 'live' })));
			await syncPendingSubmissions(); expect(getLocalHistory().every(x => x.synced)).toBe(true);
		} finally { vi.useRealTimers(); }
	});
	it('pauses unauthorized HTML responses without deleting or mutating queued payloads', async () => {
		const original = payload(); await queueSubmission(original, false); const stored = structuredClone(getLocalHistory()[0].payload);
		vi.mocked(fetch).mockResolvedValue(new Response('Login', { status: 401 }));
		await syncPendingSubmissions(); await syncPendingSubmissions();
		expect(fetch).toHaveBeenCalledTimes(1); expect(getLocalHistory()[0].payload).toEqual(stored);
	});
	it('requires a successful server authorization check before replay after login', async () => {
		await queueSubmission(payload(), false);
		vi.mocked(fetch).mockResolvedValueOnce(new Response('Login', { status: 401 })); await syncPendingSubmissions();
		vi.mocked(fetch).mockRejectedValueOnce(new Error('offline')); await resumeSyncAfterAuthorization(); await syncPendingSubmissions();
		expect(fetch).toHaveBeenCalledTimes(2); // No submission request while authorization remains paused.
		vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ authorized: true })));
		await resumeSyncAfterAuthorization();
		vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ success: true, mode: 'live' })));
		await syncPendingSubmissions(); expect(getLocalHistory()[0].synced).toBe(true);
	});
	it('captures a stable browser ID only when creating new durable queue records', async () => {
		await queueSubmission(payload('one'), false); await queueSubmission(payload('two'), false);
		const history = getLocalHistory();
		expect(history[0].payload.clientDeviceId).toMatch(/^device_[0-9a-f-]{36}$/);
		expect(history[0].payload.clientDeviceId).toBe(history[1].payload.clientDeviceId);
	});
	it('pauses a successful HTML login page instead of replaying the backlog', async () => {
		await queueSubmission(payload('html_login'), false);
		vi.mocked(fetch).mockResolvedValue(new Response('<html>Login</html>', { headers: { 'Content-Type': 'text/html' } }));
		await syncPendingSubmissions(); await syncPendingSubmissions();
		expect(fetch).toHaveBeenCalledTimes(1); expect(getLocalHistory()[0].synced).toBe(false);
	});
	it('migrates old history without losing records and keeps corrupt data', () => {
		const item = { id: 'old', payload: payload('old'), synced: false, submittedAt: '2026-11-07T00:00:00Z' } as LocalHistoryItem;
		localStorage.setItem('rummerlab_husbandry_local_history', JSON.stringify([item]));
		expect(getLocalHistory()[0].id).toBe('old'); expect(localStorage.getItem('rummerlab_husbandry_local_history')).toBeNull();
		localStorage.setItem('rummerlab_husbandry_local_history', '{broken'); expect(() => getLocalHistory()).toThrow(); expect(localStorage.getItem('rummerlab_husbandry_local_history')).toBe('{broken');
	});
});

function fakeSheets() {
	const data: sheets_v4.Schema$Spreadsheet = { sheets: ['LSS Checks', 'Tanks + Eggs', 'Feeds', 'Water Quality'].map((title, sheetId) => ({ properties: { title, sheetId }, data: [{ rowData: [{ values: [...Array(metadataConfig.widths[title as keyof typeof metadataConfig.widths]).fill({ userEnteredValue: { stringValue: 'Operational header' } }), ...metadataConfig.headers.map(stringValue => ({ userEnteredValue: { stringValue } }))] }] }] })), namedRanges: [] };
	let appended = 0; let fail = false; let lostResponse = false;
	const batchUpdate = vi.fn(async ({ requestBody }: { requestBody: sheets_v4.Schema$BatchUpdateSpreadsheetRequest }) => {
		const receipt = requestBody.requests![0].addNamedRange!.namedRange!;
		if (fail || data.namedRanges!.some(r => r.namedRangeId === receipt.namedRangeId)) throw new Error('Batch rejected');
		data.namedRanges!.push(receipt); appended += requestBody.requests!.length - 1;
		if (lostResponse) throw new Error('Response lost');
		return {};
	});
	const client = { spreadsheets: { get: vi.fn(async () => ({ data: structuredClone(data) })), batchUpdate } } as unknown as sheets_v4.Sheets;
	return { client, batchUpdate, removeMetadataHeaders() { data.sheets!.forEach(s => { s.data = []; }); }, get appended() { return appended; }, set fail(v: boolean) { fail = v; }, set lostResponse(v: boolean) { lostResponse = v; } };
}
describe('atomic Sheets writes', () => {
	it('keeps an unknown acknowledgement retryable until a later matching receipt is read', async () => {
		const fake = fakeSheets(); fake.lostResponse = true;
		const get = vi.mocked(fake.client.spreadsheets.get);
		const normalRead = get.getMockImplementation()!;
		get.mockImplementationOnce(normalRead).mockRejectedValueOnce(new Error('Reconciliation unavailable'));
		await expect(writeAtomicSubmission(fake.client, 'sheet', payload())).rejects.toThrow('Reconciliation unavailable');
		expect(fake.appended).toBe(2);
		fake.lostResponse = false;
		await writeAtomicSubmission(fake.client, 'sheet', payload());
		expect(fake.appended).toBe(2);
		expect(fake.batchUpdate).toHaveBeenCalledTimes(1);
	});
	it('deduplicates retries and concurrent requests', async () => {
		const fake = fakeSheets(); await Promise.all([writeAtomicSubmission(fake.client, 'sheet', payload()), writeAtomicSubmission(fake.client, 'sheet', payload())]);
		await writeAtomicSubmission(fake.client, 'sheet', payload()); expect(fake.appended).toBe(2);
	});
	it('reconciles lost responses and rejects changed payloads', async () => {
		const fake = fakeSheets(); fake.lostResponse = true; await writeAtomicSubmission(fake.client, 'sheet', payload()); expect(fake.appended).toBe(2);
		await expect(writeAtomicSubmission(fake.client, 'sheet', { ...payload(), initials: 'CD' })).rejects.toThrow('different data');
	});
	it('retries rejected batches without partial rows and writes notes literally', async () => {
		const fake = fakeSheets(); fake.fail = true;
		await expect(writeAtomicSubmission(fake.client, 'sheet', payload())).rejects.toThrow(); expect(fake.appended).toBe(0);
		fake.fail = false; await writeAtomicSubmission(fake.client, 'sheet', payload()); expect(fake.appended).toBe(2);
		const requests = fake.batchUpdate.mock.calls.at(-1)![0].requestBody.requests!;
		expect(requests[1].appendCells!.rows![0].values!.at(-1)!.userEnteredValue).toEqual({ stringValue: '=1+1' });
		expect(requests[2].appendCells!.rows![0].values![2].userEnteredValue).toEqual({ numberValue: 26 });
	});
});


describe('opt-in provenance columns', () => {
	it('writes IDs and stable ingestion time atomically while keeping notes as literal text', async () => {
		const fake = fakeSheets(); const item = payload(); item.feeds!.notes = '123'; item.clientDeviceId = 'device_50271f5f-a2e0-4909-b61e-d6d867f7c4a7';
		fake.lostResponse = true;
		await writeAtomicSubmission(fake.client, 'sheet', item, { metadataColumns: true });
		const batch = fake.batchUpdate.mock.calls[0][0].requestBody.requests!;
		const feeds = batch[1].appendCells!.rows![0].values!.map(c => c.userEnteredValue);
		const water = batch[2].appendCells!.rows![0].values!.map(c => c.userEnteredValue);
		expect(feeds).toHaveLength(88); expect(water).toHaveLength(27);
		expect(feeds[83]).toEqual({ stringValue: '123' });
		expect(feeds.slice(-4, -1)).toEqual([item.id, item.clientDeviceId, item.submittedAt].map(stringValue => ({ stringValue })));
		expect(feeds.at(-1)).toEqual(water.at(-1));
		await writeAtomicSubmission(fake.client, 'sheet', item, { metadataColumns: true });
		expect(fake.batchUpdate).toHaveBeenCalledTimes(1); expect(fake.appended).toBe(2);
	});
	it('blocks unmigrated headers and exports missing legacy device IDs as blank', async () => {
		const blocked = fakeSheets(); blocked.removeMetadataHeaders();
		await expect(writeAtomicSubmission(blocked.client, 'sheet', payload(), { metadataColumns: true })).rejects.toThrow('Metadata headers');
		expect(blocked.batchUpdate).not.toHaveBeenCalled();
		const legacy = fakeSheets(); await writeAtomicSubmission(legacy.client, 'sheet', payload(), { metadataColumns: true });
		const cells = legacy.batchUpdate.mock.calls[0][0].requestBody.requests![1].appendCells!.rows![0].values!;
		expect(cells.at(-3)?.userEnteredValue).toEqual({ stringValue: '' });
	});
});
