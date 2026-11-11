import { afterEach, expect, it, vi } from 'vitest';
import { inspectLocalHistory, getLocalHistory, migrateLocalHistory, syncPendingSubmissions } from '../src/lib/storage';
import { readQueueSnapshot } from '../src/lib/queueSnapshot';
import { migrateMetadataWorkbook } from '../scripts/migrate-sheet-metadata.mjs';
import { setupRequestLogWorkbook, TAB, HEADERS } from '../scripts/setup-request-log.mjs';
import config from '../src/lib/server/sheetMetadata.json';
import { readTabsSetup } from '../scripts/setup-room6.mjs';

class MemoryStorage {
	data = new Map<string, string>();
	get length() { return this.data.size; }
	key(index: number) { return [...this.data.keys()][index] ?? null; }
	getItem(key: string) { return this.data.get(key) ?? null; }
	setItem(key: string, value: string) { this.data.set(key, value); }
	removeItem(key: string) { this.data.delete(key); }
}
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const items = [1, 2, 3].map(i => ({ id: `sub_legacy_${i}`, submittedAt: '2026-11-11T00:00:00Z', synced: false, payload: { id: `sub_legacy_${i}`, date: '2026-11-11', modulesSubmitted: ['waterQuality'] } }));

it.each([1, 2, 3, 'remove'])('recovers after interruption at legacy migration operation %s without duplicates or enrichment', failing => {
	const memory = new MemoryStorage(); vi.stubGlobal('window', new EventTarget()); vi.stubGlobal('localStorage', memory);
	const raw = JSON.stringify(items); memory.setItem('rummerlab_husbandry_local_history', raw);
	const write = memory.setItem.bind(memory); const remove = memory.removeItem.bind(memory); let count = 0;
	vi.spyOn(memory, 'setItem').mockImplementation((key, value) => { if (++count === failing) throw new Error('Interrupted copy'); write(key, value); });
	vi.spyOn(memory, 'removeItem').mockImplementation(key => { if (failing === 'remove') throw new Error('Interrupted removal'); remove(key); });
	expect(() => migrateLocalHistory()).toThrow('Interrupted');
	expect(memory.getItem('rummerlab_husbandry_local_history')).toBe(raw);
	vi.mocked(memory.setItem).mockImplementation(write); vi.mocked(memory.removeItem).mockImplementation(remove);
	expect(migrateLocalHistory()).toBe('complete');
	expect(getLocalHistory().map(item => item.payload)).toEqual(items.map(item => item.payload));
	expect(memory.length).toBe(3);
});

it('preserves readable records for inspection while damaged data keeps all syncing paused', async () => {
	const memory = new MemoryStorage(); vi.stubGlobal('window', new EventTarget()); vi.stubGlobal('localStorage', memory); vi.stubGlobal('fetch', vi.fn());
	memory.setItem('rummerlab_submission_readable', JSON.stringify(items[0]));
	memory.setItem('rummerlab_submission_damaged', '{broken');
	expect(inspectLocalHistory()).toMatchObject({ state: 'damaged', records: [items[0]], damagedCount: 1 });
	expect(readQueueSnapshot()).toMatchObject({ kind: 'unavailable', records: [items[0]] });
	await expect(syncPendingSubmissions()).rejects.toThrow('recovery');
	expect(fetch).not.toHaveBeenCalled();
	expect(memory.getItem('rummerlab_submission_damaged')).toBe('{broken');
});

const workbook = () => ({ sheets: Object.entries(config.widths).map(([title, width], sheetId) => ({ properties: { title, sheetId, gridProperties: { columnCount: width + 4 } }, data: [{ rowData: [{ values: Array.from({ length: width }, () => ({ userEnteredValue: { stringValue: 'Operational header' } })) }] }] })) });
it('does not mistake incomplete metadata or omitted existing tabs for confirmed absence', async () => {
	for (const data of [{}, { sheets: [{ properties: { title: TAB, sheetId: 1 } }] }]) {
		const get = vi.fn().mockResolvedValueOnce({ data }).mockResolvedValueOnce({ data: { sheets: [] } });
		const batchUpdate = vi.fn();
		expect(await setupRequestLogWorkbook({ spreadsheets: { get, batchUpdate } }, 'disposable', true)).toMatchObject({ state: 'refused' });
		expect(batchUpdate).not.toHaveBeenCalled();
	}
	const get = vi.fn().mockResolvedValueOnce({ data: { sheets: [{ properties: { title: 'Room 6', sheetId: 1 } }] } }).mockResolvedValueOnce({ data: { sheets: [] } });
	await expect(readTabsSetup({ spreadsheets: { get } }, 'disposable')).rejects.toThrow('incomplete');
});
it('refuses incomplete or failed collision inspection without attempting metadata writes', async () => {
	for (const valueRanges of [undefined, [], [{ values: [] }]]) {
		const sheets = { spreadsheets: { get: vi.fn(async () => ({ data: workbook() })), values: { batchGet: vi.fn(async () => ({ data: { valueRanges } })) }, batchUpdate: vi.fn() } };
		expect(await migrateMetadataWorkbook(sheets, 'disposable', true)).toMatchObject({ state: 'refused' });
		expect(sheets.spreadsheets.batchUpdate).not.toHaveBeenCalled();
	}
});

it('reinspects an uncertain atomic metadata migration and converges to a no-op', async () => {
	const data = workbook();
	const batchUpdate = vi.fn(async () => {
		for (const sheet of data.sheets) sheet.data[0].rowData[0].values.push(...config.headers.map(stringValue => ({ userEnteredValue: { stringValue } })));
		throw new Error('Acknowledgement lost');
	});
	const sheets = { spreadsheets: { get: vi.fn(async () => ({ data: structuredClone(data) })), values: { batchGet: vi.fn(async () => ({ data: { valueRanges: data.sheets.map(() => ({ values: [] })) } })) }, batchUpdate } };
	expect(await migrateMetadataWorkbook(sheets, 'disposable')).toMatchObject({ state: 'dryRun' });
	expect(batchUpdate).not.toHaveBeenCalled();
	expect(await migrateMetadataWorkbook(sheets, 'disposable', true)).toMatchObject({ state: 'reinspectionRequired' });
	expect(await migrateMetadataWorkbook(sheets, 'disposable')).toEqual({ state: 'dryRun', operations: 0 });
	expect(await migrateMetadataWorkbook(sheets, 'disposable', true)).toEqual({ state: 'complete', operations: 0 });
	expect(batchUpdate).toHaveBeenCalledTimes(1);
});

it('recovers restricted log setup after creation, then verifies final headers', async () => {
	let data: object = { sheets: [] }; let interrupt = true;
	const batchUpdate = vi.fn(async ({ requestBody }: { requestBody: { requests: { addSheet?: object }[] } }) => {
		if (requestBody.requests.some(request => request.addSheet)) data = { sheets: [{ properties: { title: TAB, sheetId: 1 }, data: [{}] }] };
		else data = { sheets: [{ properties: { title: TAB, sheetId: 1 }, data: [{ rowData: [{ values: HEADERS.map((stringValue: string) => ({ userEnteredValue: { stringValue } })) }] }] }] };
		if (interrupt) { interrupt = false; throw new Error('Interrupted after create'); }
		return {};
	});
	const sheets = { spreadsheets: { get: vi.fn(async () => ({ data: structuredClone(data) })), batchUpdate } };
	expect(await setupRequestLogWorkbook(sheets, 'disposable', true)).toMatchObject({ state: 'reinspectionRequired' });
	expect(await setupRequestLogWorkbook(sheets, 'disposable', true)).toMatchObject({ state: 'complete' });
	expect(await setupRequestLogWorkbook(sheets, 'disposable', true)).toEqual({ state: 'complete', operations: 0 });
});
