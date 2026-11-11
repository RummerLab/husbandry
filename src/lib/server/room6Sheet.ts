import type { sheets_v4 } from 'googleapis';
import { METADATA_HEADERS } from './sheetMetadata';

/**
 * Room 6 (egg room) tab in the master sheet (#79). It is new, so it always carries the provenance
 * columns: there is no legacy layout to preserve. Keep in sync with scripts/setup-room6.mjs (a test checks this).
 */
export const ROOM6_TAB = 'Room 6';
export const ROOM6_OPERATIONAL_HEADERS = ['Date', 'Initials', 'All eggs sighted & normal', 'Dead eggs removed', 'Temp (°C)', 'Salinity (ppt)', 'pH', 'Water change', 'Concerns', 'Notes'];
export const ROOM6_HEADERS = [...ROOM6_OPERATIONAL_HEADERS, ...METADATA_HEADERS];

/** Refuse to write until the setup script has created matching headers; the record stays queued (503). */
export async function assertRoom6Headers(sheets: sheets_v4.Sheets, spreadsheetId: string): Promise<void> {
	const response = await sheets.spreadsheets.values.get({ spreadsheetId, range: `'${ROOM6_TAB}'!1:1` }).catch(() => null);
	const labels = response?.data.values?.[0] || [];
	if (!ROOM6_HEADERS.every((label, i) => labels[i] === label)) {
		throw new Error('Room 6 tab or headers missing. Run scripts/setup-room6.mjs first.');
	}
}
