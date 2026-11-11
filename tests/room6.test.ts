import { describe, expect, it, vi } from 'vitest';
import type { sheets_v4 } from 'googleapis';
import { createEmptyForms } from '../src/lib/formDefaults';
import { createEmptyStepForms, createEntryPayload } from '../src/lib/shiftWorkflow';
import { NOT_MEASURED, validateModule, validateSubmission } from '../src/lib/validation';
import { formatRoom6Row } from '../src/lib/server/rows';
import { writeAtomicSubmission } from '../src/lib/server/atomicSubmission';
import { ROOM6_HEADERS, ROOM6_OPERATIONAL_HEADERS, ROOM6_TAB } from '../src/lib/server/room6Sheet';
import { HEADERS, TAB, planRoom6Setup } from '../scripts/setup-room6.mjs';
import type { Room6Data } from '../src/lib/types';

const date = '2026-11-11';
const complete = (): Room6Data => ({ ...createEmptyForms(date, 'AB').room6, eggsChecked: 'Y', deadEggsRemoved: '0', temp: '26.1', salinity: '35', pH: '8.2', waterChange: 'None' });

describe('Room 6 validation (#79)', () => {
	it('accepts a complete check and starts with every answer blank', () => {
		expect(validateModule('room6', complete())).toEqual([]);
		const fields = validateModule('room6', createEmptyForms(date, 'AB').room6).join();
		for (const key of ['eggsChecked', 'deadEggsRemoved', 'temp', 'salinity', 'pH', 'waterChange']) expect(fields).toContain(key);
	});

	it('requires concerns when eggs are not normal, and notes for an "Other" water change', () => {
		expect(validateModule('room6', { ...complete(), eggsChecked: 'N' }).join()).toContain('concerns');
		expect(validateModule('room6', { ...complete(), eggsChecked: 'N', concerns: 'R6-03 discoloured' })).toEqual([]);
		expect(validateModule('room6', { ...complete(), waterChange: 'Other' }).join()).toContain('notes');
	});

	it('needs numeric readings; only pH may be Not measured', () => {
		expect(validateModule('room6', { ...complete(), pH: NOT_MEASURED })).toEqual([]);
		expect(validateModule('room6', { ...complete(), pH: '15' }).join()).toContain('pH');
		expect(validateModule('room6', { ...complete(), temp: NOT_MEASURED }).join()).toContain('temp');
		expect(validateModule('room6', { ...complete(), deadEggsRemoved: '1.5' }).join()).toContain('deadEggsRemoved');
	});

	it('saves alone without any Room 12 sections', () => {
		const forms = createEmptyStepForms(date, 'AB');
		forms.room6 = complete();
		const payload = createEntryPayload(['room6'], forms, date, 'AB');
		expect(payload.modulesSubmitted).toEqual(['room6']);
		expect(payload.lss).toBeUndefined();
		expect(validateSubmission(payload)).toEqual([]);
	});
});

describe('Room 6 sheet', () => {
	it('formats one row matching the operational headers, with Not measured pH blank', () => {
		const row = formatRoom6Row({ ...complete(), pH: NOT_MEASURED });
		expect(row).toHaveLength(ROOM6_OPERATIONAL_HEADERS.length);
		expect(row[ROOM6_OPERATIONAL_HEADERS.indexOf('pH')]).toBe('');
		expect(row[ROOM6_OPERATIONAL_HEADERS.indexOf('Temp (°C)')]).toBe('26.1');
	});

	it('keeps the setup script in step with the server', () => {
		expect(TAB).toBe(ROOM6_TAB);
		expect(HEADERS).toEqual(ROOM6_HEADERS);
		expect(planRoom6Setup({ sheets: [] })[0].addSheet.properties.title).toBe('Room 6');
		const ready = { sheets: [{ properties: { title: TAB, sheetId: 9 }, data: [{ rowData: [{ values: HEADERS.map(stringValue => ({ userEnteredValue: { stringValue } })) }] }] }] };
		expect(planRoom6Setup(ready)).toEqual([]);
		const other = { sheets: [{ properties: { title: TAB, sheetId: 9 }, data: [{ rowData: [{ values: [{ userEnteredValue: { stringValue: 'Something else' } }] }] }] }] };
		expect(() => planRoom6Setup(other)).toThrow('different headers');
	});
});

function fakeSheets(headers: string[] | null) {
	const titles = ['LSS Checks', 'Tanks + Eggs', 'Feeds', 'Water Quality', ...(headers ? [ROOM6_TAB] : [])];
	const data: sheets_v4.Schema$Spreadsheet = { sheets: titles.map((title, sheetId) => ({ properties: { title, sheetId } })), namedRanges: [] };
	const batchUpdate = vi.fn(async ({ requestBody }: { requestBody: sheets_v4.Schema$BatchUpdateSpreadsheetRequest }) => {
		data.namedRanges!.push(requestBody.requests![0].addNamedRange!.namedRange!);
		return {};
	});
	const valuesGet = vi.fn(async () => {
		if (!headers) throw new Error('Unable to parse range');
		return { data: { values: [headers] } };
	});
	const client = { spreadsheets: { get: vi.fn(async () => ({ data: structuredClone(data) })), batchUpdate, values: { get: valuesGet } } } as unknown as sheets_v4.Sheets;
	return { client, batchUpdate };
}

describe('Room 6 atomic write', () => {
	const submission = () => {
		const forms = createEmptyStepForms(date, 'AB');
		forms.room6 = complete();
		return { ...createEntryPayload(['room6'], forms, date, 'AB'), clientDeviceId: 'device_50271f5f-a2e0-4909-b61e-d6d867f7c4a7' };
	};

	it('writes one Room 6 row with provenance columns and numeric readings', async () => {
		const fake = fakeSheets(ROOM6_HEADERS);
		const item = submission();
		expect(await writeAtomicSubmission(fake.client, 'sheet', item)).toEqual([ROOM6_TAB]);
		const cells = fake.batchUpdate.mock.calls[0][0].requestBody.requests![1].appendCells!.rows![0].values!.map(c => c.userEnteredValue);
		expect(cells).toHaveLength(ROOM6_HEADERS.length);
		expect(cells[ROOM6_OPERATIONAL_HEADERS.indexOf('Temp (°C)')]).toEqual({ numberValue: 26.1 });
		expect(cells[ROOM6_OPERATIONAL_HEADERS.indexOf('Dead eggs removed')]).toEqual({ numberValue: 0 });
		expect(cells[ROOM6_HEADERS.indexOf('Submission ID')]).toEqual({ stringValue: item.id });
		expect(cells[ROOM6_HEADERS.indexOf('Client Device ID')]).toEqual({ stringValue: item.clientDeviceId });
	});

	it('refuses to write (record stays queued) until the setup script has run', async () => {
		const missing = fakeSheets(null);
		await expect(writeAtomicSubmission(missing.client, 'sheet', submission())).rejects.toThrow('setup-room6');
		expect(missing.batchUpdate).not.toHaveBeenCalled();
		const wrong = fakeSheets(['Date', 'Initials']);
		await expect(writeAtomicSubmission(wrong.client, 'sheet', submission())).rejects.toThrow('setup-room6');
	});
});
