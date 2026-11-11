import { google } from 'googleapis';
import { pathToFileURL } from 'node:url';

// Keep in sync with ROOM6_TAB / ROOM6_HEADERS in src/lib/server/room6Sheet.ts (a test checks this).
export const TAB = 'Room 6';
export const HEADERS = ['Date', 'Initials', 'All eggs sighted & normal', 'Dead eggs removed', 'Temp (°C)', 'Salinity (ppt)', 'pH', 'Water change', 'Concerns', 'Notes', 'Submission ID', 'Client Device ID', 'Client Submitted At (UTC)', 'Server Received At (UTC)'];

/** Plan the Room 6 tab: create it if missing, write headers only into an empty or matching header row. */
export function planRoom6Setup(data) {
	const sheet = data.sheets?.find(s => s.properties?.title === TAB);
	if (!sheet) {
		return [{ addSheet: { properties: { title: TAB, gridProperties: { frozenRowCount: 1, columnCount: HEADERS.length } } } }];
	}
	const values = sheet.data?.[0]?.rowData?.[0]?.values || [];
	const current = values.map(v => v?.userEnteredValue?.stringValue ?? (v?.userEnteredValue ? '?' : ''));
	if (HEADERS.every((label, i) => current[i] === label)) return [];
	if (current.some(Boolean)) throw new Error(`'${TAB}' already has different headers; inspect manually`);
	const sheetId = sheet.properties.sheetId;
	return [
		{ updateSheetProperties: { properties: { sheetId, gridProperties: { frozenRowCount: 1, columnCount: Math.max(HEADERS.length, sheet.properties.gridProperties?.columnCount || 0) } }, fields: 'gridProperties(frozenRowCount,columnCount)' } },
		{ updateCells: { start: { sheetId, rowIndex: 0, columnIndex: 0 }, rows: [{ values: HEADERS.map(stringValue => ({ userEnteredValue: { stringValue }, userEnteredFormat: { textFormat: { bold: true } } })) }], fields: 'userEnteredValue,userEnteredFormat.textFormat.bold' } }
	];
}

async function main() {
	const apply = process.argv.includes('--apply');
	if (process.argv.slice(2).some(arg => arg !== '--apply')) throw new Error('Usage: node --env-file=.env scripts/setup-room6.mjs [--apply]');
	const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
	const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
	const spreadsheetId = process.env.GOOGLE_SHEET_ID?.trim();
	if (!email || !key || !spreadsheetId) throw new Error('Service account credentials and GOOGLE_SHEET_ID are required');
	const sheets = google.sheets({ version: 'v4', auth: new google.auth.JWT({ email, key, scopes: ['https://www.googleapis.com/auth/spreadsheets'] }) });
	const read = async () => (await sheets.spreadsheets.get({ spreadsheetId, includeGridData: true, ranges: [`'${TAB}'!1:1`], fields: 'sheets(properties,data(rowData(values(userEnteredValue))))' }).catch(async () => sheets.spreadsheets.get({ spreadsheetId, fields: 'sheets(properties)' }))).data;
	let requests = planRoom6Setup(await read());
	console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', operations: requests.length }, null, 2));
	if (!apply || !requests.length) { if (!apply) console.log('No writes performed. Re-run with --apply.'); return; }
	await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests } });
	// A newly created tab still needs its header row.
	requests = planRoom6Setup(await read());
	if (requests.length) await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests } });
	console.log('Room 6 tab ready.');
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => { console.error(error.message); process.exitCode = 1; });
