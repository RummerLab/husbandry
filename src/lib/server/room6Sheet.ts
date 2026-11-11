import type { sheets_v4 } from 'googleapis';
import { METADATA_HEADERS } from './sheetMetadata';
import { ROOM6_HEADERS as WORKBOOK_HEADERS, ROOM6_TABS, type Room6Module } from '../room6Config';

/**
 * Room 6 (egg room) tab in the master sheet (#79). It is new, so it always carries the provenance
 * columns: there is no legacy layout to preserve. Keep in sync with scripts/setup-room6.mjs (a test checks this).
 */
export const ROOM6_TAB = 'Room 6';
export const ROOM6_OPERATIONAL_HEADERS = ['Date', 'Initials', 'All eggs sighted & normal', 'Dead eggs removed', 'Temp (°C)', 'Salinity (ppt)', 'pH', 'Water change', 'Concerns', 'Notes'];
export const ROOM6_HEADERS = [...ROOM6_OPERATIONAL_HEADERS, ...METADATA_HEADERS];

/**
 * Workbook-matching Room 6 tabs (#99). Like the legacy tab they are new, so rows always carry the provenance
 * columns. `numeric` lists 0-based operational columns written as numbers when they hold a plain number.
 */
export const ROOM6_SHEETS: Record<Room6Module, { tab: string; headers: string[]; numeric: number[] }> = {
	room6Eggs: { tab: ROOM6_TABS.room6Eggs, headers: [...WORKBOOK_HEADERS.room6Eggs, ...METADATA_HEADERS], numeric: [3, 5, 7, 9] },
	room6WaterQuality: { tab: ROOM6_TABS.room6WaterQuality, headers: [...WORKBOOK_HEADERS.room6WaterQuality, ...METADATA_HEADERS], numeric: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
	room6Lss: { tab: ROOM6_TABS.room6Lss, headers: [...WORKBOOK_HEADERS.room6Lss, ...METADATA_HEADERS], numeric: [] },
	room6Ammonia: { tab: ROOM6_TABS.room6Ammonia, headers: [...WORKBOOK_HEADERS.room6Ammonia, ...METADATA_HEADERS], numeric: [3, 4] }
};

/** Every Room 6 tab the server may write to, including the legacy single-row tab (#79). */
export const ALL_ROOM6_TABS: { tab: string; headers: string[] }[] = [
	{ tab: ROOM6_TAB, headers: ROOM6_HEADERS },
	...Object.values(ROOM6_SHEETS).map(({ tab, headers }) => ({ tab, headers }))
];

/** Refuse to write until the setup script has created matching headers; the record stays queued (503). */
export async function assertTabHeaders(sheets: sheets_v4.Sheets, spreadsheetId: string, tab: string, headers: string[]): Promise<void> {
	const response = await sheets.spreadsheets.values.get({ spreadsheetId, range: `'${tab}'!1:1` }).catch(() => null);
	const labels = response?.data.values?.[0] || [];
	if (!headers.every((label, i) => labels[i] === label)) {
		throw new Error(`${tab} tab or headers missing. Run scripts/setup-room6.mjs first.`);
	}
}

export async function assertRoom6Headers(sheets: sheets_v4.Sheets, spreadsheetId: string): Promise<void> {
	await assertTabHeaders(sheets, spreadsheetId, ROOM6_TAB, ROOM6_HEADERS);
}
