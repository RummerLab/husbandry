import { describe, expect, it, vi } from 'vitest';
import { WORKBOOK_TABS, planTabSetup, readTabsSetup } from '../scripts/setup-room6.mjs';

/** Header-safety regressions for the Room 6 setup script (#88), exercised on one workbook tab. */
const { tab: TAB, headers: HEADERS } = WORKBOOK_TABS[0];
const plan = (data: unknown) => planTabSetup(data, TAB, HEADERS);
const read = (sheets: unknown) => readTabsSetup(sheets, 'sheet', [TAB]);

describe('Room 6 setup script header safety', () => {
	it('creates a missing tab, leaves matching headers alone, and refuses different headers', () => {
		expect(plan({ sheets: [] })[0].addSheet.properties.title).toBe(TAB);
		const ready = { sheets: [{ properties: { title: TAB, sheetId: 9 }, data: [{ rowData: [{ values: HEADERS.map((stringValue: string) => ({ userEnteredValue: { stringValue } })) }] }] }] };
		expect(plan(ready)).toEqual([]);
		const other = { sheets: [{ properties: { title: TAB, sheetId: 9 }, data: [{ rowData: [{ values: [{ userEnteredValue: { stringValue: 'Something else' } }] }] }] }] };
		expect(() => plan(other)).toThrow('different headers');
	});

	it('refuses to plan a header overwrite when grid data was not fetched', () => {
		expect(() => plan({ sheets: [{ properties: { title: TAB, sheetId: 9 } }] })).toThrow('header data was not read');
	});

	it('initialises an explicitly fetched empty header row', () => {
		const requests = plan({ sheets: [{ properties: { title: TAB, sheetId: 9 }, data: [{}] }] });
		expect(requests[1].updateCells.rows[0].values.map((cell: { userEnteredValue: { stringValue: string } }) => cell.userEnteredValue.stringValue)).toEqual(HEADERS);
	});

	it('propagates an existing tab header-read failure instead of planning a write', async () => {
		const get = vi.fn()
			.mockResolvedValueOnce({ data: { sheets: [{ properties: { title: TAB, sheetId: 9 } }] } })
			.mockRejectedValueOnce(new Error('Temporary read failure'));
		await expect(read({ spreadsheets: { get } })).rejects.toThrow('Temporary read failure');
		expect(get).toHaveBeenCalledTimes(2);
	});

	it('creates only when metadata confirms absence and reads headers for an existing tab', async () => {
		const get = vi.fn().mockResolvedValueOnce({ data: { sheets: [] } });
		expect(plan(await read({ spreadsheets: { get } }))[0]).toHaveProperty('addSheet');
		expect(get).toHaveBeenCalledTimes(1);
		const existing = { sheets: [{ properties: { title: TAB, sheetId: 9 }, data: [{ rowData: [{ values: [{ userEnteredValue: { stringValue: 'Other schema' } }] }] }] }] };
		get.mockResolvedValueOnce({ data: existing }).mockResolvedValueOnce({ data: existing });
		const headers = await read({ spreadsheets: { get } });
		expect(() => plan(headers)).toThrow('different headers');
	});
});
