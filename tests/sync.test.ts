import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { getLocalHistory, queueSubmission, saveLocalSubmission, syncPendingSubmissions } from '../src/lib/storage';
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
		const original = payload(); await queueSubmission(original, false);
		vi.mocked(fetch).mockResolvedValue(new Response('Login', { status: 401 }));
		await syncPendingSubmissions(); await syncPendingSubmissions();
		expect(fetch).toHaveBeenCalledTimes(1); expect(getLocalHistory()[0].payload).toEqual(original);
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
	const data: sheets_v4.Schema$Spreadsheet = { sheets: ['LSS Checks', 'Tanks + Eggs', 'Feeds', 'Water Quality'].map((title, sheetId) => ({ properties: { title, sheetId } })), namedRanges: [] };
	let appended = 0; let fail = false; let lostResponse = false;
	const batchUpdate = vi.fn(async ({ requestBody }: { requestBody: sheets_v4.Schema$BatchUpdateSpreadsheetRequest }) => {
		const receipt = requestBody.requests![0].addNamedRange!.namedRange!;
		if (fail || data.namedRanges!.some(r => r.namedRangeId === receipt.namedRangeId)) throw new Error('Batch rejected');
		data.namedRanges!.push(receipt); appended += requestBody.requests!.length - 1;
		if (lostResponse) throw new Error('Response lost');
		return {};
	});
	const client = { spreadsheets: { get: vi.fn(async () => ({ data: structuredClone(data) })), batchUpdate } } as unknown as sheets_v4.Sheets;
	return { client, batchUpdate, get appended() { return appended; }, set fail(v: boolean) { fail = v; }, set lostResponse(v: boolean) { lostResponse = v; } };
}
describe('atomic Sheets writes', () => {
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
