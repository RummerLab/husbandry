import { describe, expect, it, vi } from 'vitest';
import type { sheets_v4 } from 'googleapis';
import { createEmptyForms } from '../src/lib/formDefaults';
import { createEmptyStepForms, createEntryPayload, ROOM6_SECTIONS, type StepForms } from '../src/lib/shiftWorkflow';
import { NOT_MEASURED, validateModule, validateSubmission } from '../src/lib/validation';
import { ROOM6_HEADERS, ROOM6_LSS_TANKS, ROOM6_TABS, ROOM6_TANK_TASK_KEYS, tankTaskKey } from '../src/lib/room6Config';
import { formatRoom6AmmoniaRow, formatRoom6EggsRow, formatRoom6LssRow, formatRoom6WaterQualityRow } from '../src/lib/server/rows';
import { ALL_ROOM6_TABS, ROOM6_SHEETS } from '../src/lib/server/room6Sheet';
import { writeAtomicSubmission } from '../src/lib/server/atomicSubmission';
import { ALL_TABS, WORKBOOK_TABS, planAllRoom6Setup, readTabsSetup } from '../scripts/setup-room6.mjs';

const date = '2026-11-11';
const blank = () => createEmptyForms(date, 'MB');
const eggs = () => ({ ...blank().room6Eggs, candling: 'Y' as const, windCount: '0', newCount: '2', newIds: 'AM013 + HO079', embryoCount: '0', deadCount: '0' });
const water = () => ({ ...blank().room6WaterQuality, temp: '26.1', salinity: '36', pH: NOT_MEASURED, dissolvedOxygen: NOT_MEASURED, alk: '7', weeklypH: '8.1', nh3: '0', no2: '0', no3: '20', po4: NOT_MEASURED });
const lss = () => ({ ...blank().room6Lss, sumpWaterChange: '50%' as const, sumpTopUp: 'Fresh' as const, biofilterFlowAir: 'Y' as const, biofilterFlowWater: 'Y' as const, tankFlowAir: 'Y' as const, tankFlowWater: 'Y' as const, [tankTaskKey('1', 'siphon')]: 'Y', [tankTaskKey('8', 'scrubWalls')]: 'Y' });
const ammonia = () => ({ ...blank().room6Ammonia, time: '07:00', ammonia: '0', nitrite: '0.25' });

describe('Room 6 workbook layout (#99)', () => {
	it('mirrors the workbook sheets, including 51 tank-clean columns (tank 8 has three)', () => {
		expect(ROOM6_LSS_TANKS).toHaveLength(9);
		expect(ROOM6_TANK_TASK_KEYS).toHaveLength(51);
		expect(ROOM6_HEADERS.room6Lss).toHaveLength(64);
		expect(ROOM6_HEADERS.room6Lss.filter(h => h.startsWith('Tank 8 (eggs)'))).toEqual(['Tank 8 (eggs): Siphon', 'Tank 8 (eggs): Scrub walls', 'Tank 8 (eggs): Scrub Pipes']);
	});

	it('keeps the setup script in step with the server for every Room 6 tab', () => {
		expect(WORKBOOK_TABS.map(t => t.tab)).toEqual(Object.values(ROOM6_TABS));
		expect(ALL_TABS).toEqual(ALL_ROOM6_TABS);
		for (const sheet of Object.values(ROOM6_SHEETS)) expect(sheet.headers.slice(-4)).toEqual(['Submission ID', 'Client Device ID', 'Client Submitted At (UTC)', 'Server Received At (UTC)']);
	});
});

describe('Room 6 validation', () => {
	it('starts every section unanswered and accepts a complete entry', () => {
		for (const [module, complete] of [['room6Eggs', eggs], ['room6WaterQuality', water], ['room6Lss', lss], ['room6Ammonia', ammonia]] as const) {
			expect(validateModule(module, blank()[module]).length, module).toBeGreaterThan(0);
			expect(validateModule(module, complete()), module).toEqual([]);
		}
	});

	it('egg checks: whole-number counts, and IDs for any eggs counted', () => {
		expect(validateModule('room6Eggs', { ...eggs(), newIds: '' }).join()).toContain('newIds');
		expect(validateModule('room6Eggs', { ...eggs(), deadCount: '1' }).join()).toContain('deadIds');
		expect(validateModule('room6Eggs', { ...eggs(), deadCount: '1', deadIds: 'HO080' })).toEqual([]);
		expect(validateModule('room6Eggs', { ...eggs(), windCount: '1.5' }).join()).toContain('windCount');
		expect(validateModule('room6Eggs', { ...eggs(), windCount: '9'.repeat(20) }).join()).toContain('windCount');
		expect(validateModule('room6Eggs', { ...eggs(), candling: '' }).join()).toContain('candling');
	});

	it('water quality: temperature and salinity always need a reading; the rest may be Not measured', () => {
		expect(validateModule('room6WaterQuality', { ...water(), temp: NOT_MEASURED }).join()).toContain('temp');
		expect(validateModule('room6WaterQuality', { ...water(), salinity: '' }).join()).toContain('salinity');
		expect(validateModule('room6WaterQuality', { ...water(), no3: '' }).join()).toContain('no3');
		expect(validateModule('room6WaterQuality', { ...water(), pH: '15' }).join()).toContain('pH');
	});

	it('LSS: flows need an answer, a flow problem needs notes, and ticks are Y or blank', () => {
		expect(validateModule('room6Lss', { ...lss(), tankFlowWater: '' }).join()).toContain('tankFlowWater');
		expect(validateModule('room6Lss', { ...lss(), tankFlowWater: 'N' }).join()).toContain('notes');
		expect(validateModule('room6Lss', { ...lss(), tankFlowWater: 'N', notes: 'Pump 2 blocked, cleared' })).toEqual([]);
		expect(validateModule('room6Lss', { ...lss(), [tankTaskKey('1', 'siphon')]: 'yes' }).join()).toContain('tank1_siphon');
		expect(validateModule('room6Lss', { ...lss(), sumpWaterChange: '' }).join()).toContain('sumpWaterChange');
	});

	it('ammonia + nitrite: a 24-hour time and numeric readings', () => {
		expect(validateModule('room6Ammonia', { ...ammonia(), time: '7am' }).join()).toContain('time');
		expect(validateModule('room6Ammonia', { ...ammonia(), time: '24:00' }).join()).toContain('time');
		expect(validateModule('room6Ammonia', { ...ammonia(), nitrite: '' }).join()).toContain('nitrite');
	});

	it('saves each section alone as a valid submission', () => {
		const forms: StepForms = { ...createEmptyStepForms(date, 'MB'), room6Eggs: eggs(), room6WaterQuality: water(), room6Lss: lss(), room6Ammonia: ammonia() };
		for (const { step } of ROOM6_SECTIONS) {
			const payload = createEntryPayload([step], forms, date, 'MB');
			expect(payload.modulesSubmitted).toEqual([step]);
			expect(validateSubmission(payload), step).toEqual([]);
		}
	});
});

describe('Room 6 rows', () => {
	it('match the operational headers, leave Not measured blank and write workbook values', () => {
		expect(formatRoom6EggsRow(eggs())).toHaveLength(ROOM6_HEADERS.room6Eggs.length);
		const wq = formatRoom6WaterQualityRow(water());
		expect(wq).toHaveLength(ROOM6_HEADERS.room6WaterQuality.length);
		expect(wq[ROOM6_HEADERS.room6WaterQuality.indexOf('pH')]).toBe('');
		expect(wq).not.toContain(NOT_MEASURED);
		const row = formatRoom6LssRow(lss());
		expect(row).toHaveLength(64);
		expect(row[ROOM6_HEADERS.room6Lss.indexOf('Tank 1: Siphon')]).toBe('Y');
		expect(row[ROOM6_HEADERS.room6Lss.indexOf('Tank 2: Siphon')]).toBe('');
		expect(row[ROOM6_HEADERS.room6Lss.indexOf('Sump: Water Change')]).toBe(0.5);
		expect(row[ROOM6_HEADERS.room6Lss.indexOf('Sump: Top Up')]).toBe('Fresh');
		expect(formatRoom6LssRow({ ...lss(), sumpWaterChange: 'None', sumpTopUp: 'None' }).slice(53, 55)).toEqual(['', '']);
		expect(formatRoom6AmmoniaRow(ammonia())).toEqual([date, '07:00', 'MB', '0', '0.25', '']);
	});
});

function fakeSheets(tabs: Record<string, string[]>) {
	const titles = ['LSS Checks', 'Tanks + Eggs', 'Feeds', 'Water Quality', ...Object.keys(tabs)];
	const data: sheets_v4.Schema$Spreadsheet = { sheets: titles.map((title, sheetId) => ({ properties: { title, sheetId } })), namedRanges: [] };
	const batchUpdate = vi.fn(async ({ requestBody }: { requestBody: sheets_v4.Schema$BatchUpdateSpreadsheetRequest }) => {
		data.namedRanges!.push(requestBody.requests![0].addNamedRange!.namedRange!);
		return {};
	});
	const valuesGet = vi.fn(async ({ range }: { range: string }) => {
		const tab = /^'(.+)'!/.exec(range)![1];
		if (!tabs[tab]) throw new Error('Unable to parse range');
		return { data: { values: [tabs[tab]] } };
	});
	const client = { spreadsheets: { get: vi.fn(async () => ({ data: structuredClone(data) })), batchUpdate, values: { get: valuesGet } } } as unknown as sheets_v4.Sheets;
	return { client, batchUpdate };
}

describe('Room 6 atomic writes', () => {
	const submit = (step: 'room6Eggs' | 'room6WaterQuality' | 'room6Lss' | 'room6Ammonia') => {
		const forms: StepForms = { ...createEmptyStepForms(date, 'MB'), room6Eggs: eggs(), room6WaterQuality: water(), room6Lss: lss(), room6Ammonia: ammonia() };
		return { ...createEntryPayload([step], forms, date, 'MB'), clientDeviceId: 'device_50271f5f-a2e0-4909-b61e-d6d867f7c4a7' };
	};
	const ready = Object.fromEntries(Object.values(ROOM6_SHEETS).map(s => [s.tab, s.headers]));

	it('writes each section to its own tab with provenance and numeric readings', async () => {
		for (const [step, sheet] of Object.entries(ROOM6_SHEETS) as [keyof typeof ROOM6_SHEETS, (typeof ROOM6_SHEETS)[keyof typeof ROOM6_SHEETS]][]) {
			const fake = fakeSheets(ready);
			const item = submit(step);
			expect(await writeAtomicSubmission(fake.client, 'sheet', item)).toEqual([sheet.tab]);
			const cells = fake.batchUpdate.mock.calls[0][0].requestBody.requests![1].appendCells!.rows![0].values!.map(c => c.userEnteredValue);
			expect(cells, step).toHaveLength(sheet.headers.length);
			expect(cells[sheet.headers.indexOf('Submission ID')]).toEqual({ stringValue: item.id });
		}
		const fake = fakeSheets(ready);
		await writeAtomicSubmission(fake.client, 'sheet', submit('room6WaterQuality'));
		const cells = fake.batchUpdate.mock.calls[0][0].requestBody.requests![1].appendCells!.rows![0].values!.map(c => c.userEnteredValue);
		expect(cells[ROOM6_HEADERS.room6WaterQuality.indexOf('Temp (°C)')]).toEqual({ numberValue: 26.1 });
		expect(cells[ROOM6_HEADERS.room6WaterQuality.indexOf('pH')]).toEqual({ stringValue: '' });
	});

	it('keeps the record queued until setup has created the tab', async () => {
		const fake = fakeSheets({});
		await expect(writeAtomicSubmission(fake.client, 'sheet', submit('room6Ammonia'))).rejects.toThrow('setup-room6');
		expect(fake.batchUpdate).not.toHaveBeenCalled();
	});
});

describe('Room 6 setup script', () => {
	it('creates only missing tabs and leaves matching ones alone', () => {
		const existing = { tab: 'Room 6', headers: ALL_TABS[0].headers };
		const data = { sheets: [{ properties: { title: existing.tab, sheetId: 9 }, data: [{ rowData: [{ values: existing.headers.map(stringValue => ({ userEnteredValue: { stringValue } })) }] }] }] };
		const plan = planAllRoom6Setup(data);
		expect(plan.map((r: { addSheet: { properties: { title: string } } }) => r.addSheet.properties.title)).toEqual(WORKBOOK_TABS.map(t => t.tab));
	});

	it('reads header rows only for tabs that exist', async () => {
		const get = vi.fn()
			.mockResolvedValueOnce({ data: { sheets: [{ properties: { title: 'Room 6', sheetId: 9 } }, { properties: { title: 'Room 6 LSS', sheetId: 10 } }] } })
			.mockResolvedValueOnce({ data: { sheets: [] } });
		await readTabsSetup({ spreadsheets: { get } }, 'sheet');
		expect(get.mock.calls[1][0].ranges).toEqual(["'Room 6'!1:1", "'Room 6 LSS'!1:1"]);
	});
});
