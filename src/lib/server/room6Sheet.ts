import type { sheets_v4 } from 'googleapis';
import { METADATA_HEADERS } from './sheetMetadata';
import { ROOM6_HEADERS as WORKBOOK_HEADERS, ROOM6_TABS, type Room6Module } from '../room6Config';

/**
 * Workbook-matching Room 6 tabs (#99). They are new, so rows always carry the provenance columns.
 * `numeric` lists 0-based operational columns written as numbers when they hold a plain number.
 */
export const ROOM6_SHEETS: Record<Room6Module, { tab: string; headers: string[]; numeric: number[] }> = {
	room6Eggs: { tab: ROOM6_TABS.room6Eggs, headers: [...WORKBOOK_HEADERS.room6Eggs, ...METADATA_HEADERS], numeric: [3, 5, 7, 9] },
	room6WaterQuality: { tab: ROOM6_TABS.room6WaterQuality, headers: [...WORKBOOK_HEADERS.room6WaterQuality, ...METADATA_HEADERS], numeric: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
	room6Lss: { tab: ROOM6_TABS.room6Lss, headers: [...WORKBOOK_HEADERS.room6Lss, ...METADATA_HEADERS], numeric: [] },
	room6Ammonia: { tab: ROOM6_TABS.room6Ammonia, headers: [...WORKBOOK_HEADERS.room6Ammonia, ...METADATA_HEADERS], numeric: [3, 4] }
};

/** Every Room 6 tab the server may write to. Keep in sync with scripts/setup-room6.mjs (a test checks this). */
export const ALL_ROOM6_TABS: { tab: string; headers: string[] }[] = Object.values(ROOM6_SHEETS).map(({ tab, headers }) => ({ tab, headers }));

/** Refuse to write until the setup script has created matching headers; the record stays queued (503). */
export async function assertTabHeaders(sheets: sheets_v4.Sheets, spreadsheetId: string, tab: string, headers: string[]): Promise<void> {
	const response = await sheets.spreadsheets.values.get({ spreadsheetId, range: `'${tab}'!1:1` }).catch(() => null);
	const labels = response?.data.values?.[0] || [];
	if (!headers.every((label, i) => labels[i] === label)) {
		throw new Error(`${tab} tab or headers missing. Run scripts/setup-room6.mjs first.`);
	}
}
