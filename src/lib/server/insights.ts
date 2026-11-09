import type { sheets_v4 } from 'googleapis';
import { ROOM12_TANKS } from '../tanksConfig';
import { formatFeedsRow } from './rows';
import { FEEDING_FLAG_DAYS, FEMALES, LOW_INTAKE_GRAMS, OVERVIEW_DAYS, outOfRange, WATER_QUALITY_RANGES } from '../insightsConfig';

/**
 * Lab Overview (#66): read-only summaries of the master sheet for allowlisted administrators.
 * Pure functions take raw sheet rows (header row removed) so they can be tested without Google.
 */
export type Row = string[];
export interface SheetData { lss: Row[]; tanksEggs: Row[]; feeds: Row[]; waterQuality: Row[] }

const TABS: Record<keyof SheetData, string> = { lss: 'LSS Checks', tanksEggs: 'Tanks + Eggs', feeds: 'Feeds', waterQuality: 'Water Quality' };

/** Accept app dates (YYYY-MM-DD) and Australian sheet dates (D/M/YYYY). */
export function normaliseDate(value: string | undefined): string | null {
	const v = (value || '').trim();
	let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
	if (m) return v;
	m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(v);
	if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
	return null;
}
const num = (value: string | undefined): number | null => {
	const v = (value || '').trim();
	return /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : null;
};
export function daysBefore(today: string, days: number): string {
	const d = new Date(`${today}T00:00:00Z`);
	d.setUTCDate(d.getUTCDate() - days);
	return d.toISOString().slice(0, 10);
}
/** Rows with a parseable date inside the window (inclusive), newest first. */
function recent(rows: Row[], today: string, days: number): { date: string; row: Row }[] {
	const from = daysBefore(today, days - 1);
	return rows
		.map(row => ({ date: normaliseDate(row[0]), row }))
		.filter((r): r is { date: string; row: Row } => !!r.date && r.date >= from && r.date <= today)
		.sort((a, b) => b.date.localeCompare(a.date));
}

// ---------- Water quality ----------
export interface WaterReading { value: number | null; raw: string; flagged: boolean }
export interface WaterQualityDay { date: string; initials: string; weekly: boolean; readings: Record<string, WaterReading>; notes: string }
const WQ_COLUMNS: Record<string, number> = {
	tempA: 2, tempB: 3, pHA: 4, pHB: 5, salinityA: 6, salinityB: 7, doA: 8, doB: 9,
	alkA: 10, alkB: 11, weeklypHA: 12, weeklypHB: 13, nh3A: 14, nh3B: 15, no2A: 16, no2B: 17, no3A: 18, no3B: 19, po4A: 20, po4B: 21
};
const rangeKey = (field: string) => (field.startsWith('weeklypH') ? 'pH' : field.slice(0, -1));

export function summariseWaterQuality(rows: Row[], today: string, days = OVERVIEW_DAYS): WaterQualityDay[] {
	return recent(rows, today, days).map(({ date, row }) => {
		const readings: Record<string, WaterReading> = {};
		for (const [field, col] of Object.entries(WQ_COLUMNS)) {
			const raw = (row[col] || '').trim();
			const value = num(raw);
			readings[field] = { value, raw, flagged: outOfRange(value, WATER_QUALITY_RANGES[rangeKey(field)]) };
		}
		return { date, initials: row[1] || '', weekly: Object.keys(WQ_COLUMNS).slice(8).some(f => readings[f].raw !== ''), readings, notes: row[22] || '' };
	});
}

// ---------- Palpation ----------
export interface PalpationStatus { female: string; latest: string; latestDate: string; lastEggsDate: string | null; lastEggs: string }
export function summarisePalpation(rows: Row[]): PalpationStatus[] {
	const dated = rows.map(row => ({ date: normaliseDate(row[0]), row })).filter((r): r is { date: string; row: Row } => !!r.date).sort((a, b) => b.date.localeCompare(a.date));
	return FEMALES.map((female, i) => {
		const col = 2 + i;
		const withValue = dated.filter(r => (r.row[col] || '').trim() !== '');
		const latest = withValue[0];
		const eggs = withValue.find(r => ['L', 'R', 'B'].includes((r.row[col] || '').trim().toUpperCase()));
		return { female, latest: latest ? latest.row[col].trim() : '', latestDate: latest?.date || '', lastEggsDate: eggs?.date || null, lastEggs: eggs ? eggs.row[col].trim() : '' };
	});
}

// ---------- Eggs, moves and concerns ----------
export interface EggActivity { date: string; initials: string; newEggs: string; newEggTag: string; windEggs: string; embryos: string; candling: string; deadEggTag: string; move: string; notes: string }
export function summariseEggActivity(rows: Row[], today: string, days = OVERVIEW_DAYS): EggActivity[] {
	const nonZero = (v: string | undefined) => !!v && v.trim() !== '' && v.trim() !== '0';
	return recent(rows, today, days)
		.map(({ date, row }) => ({
			date, initials: row[1] || '', windEggs: row[7] || '', newEggs: row[8] || '', newEggTag: row[9] || '', embryos: row[10] || '', candling: row[11] || '', deadEggTag: row[12] || '',
			move: [row[17], row[18] && `from ${row[18]}`, row[19] && `to ${row[19]}`, row[20] && `×${row[20]}`].filter(Boolean).join(' '),
			notes: row[16] || ''
		}))
		.filter(a => nonZero(a.newEggs) || nonZero(a.windEggs) || nonZero(a.deadEggTag) || a.embryos === 'Y' || a.candling === 'Y' || a.move !== '' || a.notes.trim() !== '');
}

export interface Concern { date: string; initials: string; animalsNormal: 'Y' | 'N' | ''; text: string; notes: string }
export function summariseConcerns(rows: Row[], today: string, days = OVERVIEW_DAYS): Concern[] {
	return recent(rows, today, days).map(({ date, row }) => {
		const col20 = (row[19] || '').trim();
		const m = /^All animals sighted & normal: ([YN])\.?\s*(.*)$/s.exec(col20);
		return { date, initials: [row[1], row[2]].filter(Boolean).join(' / '), animalsNormal: (m ? m[1] : '') as 'Y' | 'N' | '', text: m ? m[2] : col20, notes: (row[20] || '').trim() };
	}).filter(c => c.animalsNormal === 'N' || c.text !== '' || c.notes !== '');
}

/** Dates in the window with no LSS (daily) record: the ethics approval requires a check every day. */
export function missingDailyChecks(rows: Row[], today: string, days = OVERVIEW_DAYS): string[] {
	const present = new Set(rows.map(row => normaliseDate(row[0])).filter(Boolean));
	return Array.from({ length: days }, (_, i) => daysBefore(today, i)).filter(date => !present.has(date));
}

// ---------- Feeding ----------
/** Column of each tank's fed amount and uneaten grams, derived from the real row formatter. */
export function feedColumns(): { id: string; name: string; fed: number; uneaten: number }[] {
	const tanks = Object.fromEntries(ROOM12_TANKS.map(t => [t.id, { amountFed: `FED:${t.id}`, meds: {}, uneatenGrams: `UNEATEN:${t.id}` }]));
	const row = formatFeedsRow({ date: 'D', initials: 'I', tanks, notes: 'N' });
	return ROOM12_TANKS.map(t => ({ id: t.id, name: t.name, fed: row.indexOf(`FED:${t.id}`), uneaten: row.indexOf(`UNEATEN:${t.id}`) }));
}

export interface TankFeeding { id: string; name: string; days: { date: string; fed: number | null; uneaten: number | null; eaten: number | null }[]; lowIntakeDays: number; flagged: boolean }
export function summariseFeeding(rows: Row[], today: string, days = 7): TankFeeding[] {
	const window = recent(rows, today, days);
	return feedColumns().map(tank => {
		const perDay = window.map(({ date, row }) => {
			const fed = num(row[tank.fed]);
			const uneaten = num(row[tank.uneaten]);
			return { date, fed, uneaten, eaten: fed === null ? null : Math.max(0, fed - (uneaten ?? 0)) };
		});
		const lowIntakeDays = perDay.filter(d => d.eaten !== null && d.eaten <= LOW_INTAKE_GRAMS).length;
		return { id: tank.id, name: tank.name, days: perDay, lowIntakeDays, flagged: lowIntakeDays >= FEEDING_FLAG_DAYS };
	});
}

// ---------- Looker Studio ----------
/** One-click "create report" link (Looker Studio Linking API) with one data source per tab. Admin-only: it contains the sheet ID. */
export function lookerStudioCreateUrl(spreadsheetId: string, tabs: { title: string; sheetId: number }[]): string {
	const params = new URLSearchParams({ 'c.mode': 'edit', 'r.reportName': 'Room 12 Husbandry Insights' });
	tabs.forEach((tab, i) => {
		params.set(`ds.ds${i}.connector`, 'googleSheets');
		params.set(`ds.ds${i}.spreadsheetId`, spreadsheetId);
		params.set(`ds.ds${i}.worksheetId`, String(tab.sheetId));
		params.set(`ds.ds${i}.datasourceName`, tab.title);
	});
	return `https://lookerstudio.google.com/reporting/create?${params}`;
}

// ---------- Reader ----------
export async function readMasterSheet(sheets: sheets_v4.Sheets, spreadsheetId: string): Promise<SheetData> {
	const ranges = Object.values(TABS).map(title => `'${title}'!A2:CZ`);
	const result = (await sheets.spreadsheets.values.batchGet({ spreadsheetId, ranges, valueRenderOption: 'FORMATTED_VALUE', dateTimeRenderOption: 'FORMATTED_STRING' })).data.valueRanges || [];
	const rows = (i: number): Row[] => (result[i]?.values || []).map(r => r.map(v => String(v ?? '')));
	return { lss: rows(0), tanksEggs: rows(1), feeds: rows(2), waterQuality: rows(3) };
}

export async function readTabIds(sheets: sheets_v4.Sheets, spreadsheetId: string): Promise<{ title: string; sheetId: number }[]> {
	const meta = (await sheets.spreadsheets.get({ spreadsheetId, fields: 'sheets.properties(sheetId,title)' })).data;
	const wanted = new Set(Object.values(TABS));
	return (meta.sheets || []).map(s => ({ title: s.properties?.title || '', sheetId: s.properties?.sheetId ?? -1 })).filter(t => wanted.has(t.title) && t.sheetId >= 0);
}

export function buildOverview(data: SheetData, today: string) {
	return {
		today,
		days: OVERVIEW_DAYS,
		waterQuality: summariseWaterQuality(data.waterQuality, today),
		palpation: summarisePalpation(data.tanksEggs),
		eggs: summariseEggActivity(data.tanksEggs, today),
		concerns: summariseConcerns(data.lss, today),
		missingDailyChecks: missingDailyChecks(data.lss, today),
		feeding: summariseFeeding(data.feeds, today),
		counts: { lss: data.lss.length, tanksEggs: data.tanksEggs.length, feeds: data.feeds.length, waterQuality: data.waterQuality.length }
	};
}
export type Overview = ReturnType<typeof buildOverview>;
