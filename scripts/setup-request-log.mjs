import { google } from 'googleapis';
import { pathToFileURL } from 'node:url';

// Keep in sync with REQUEST_LOG_TAB / REQUEST_LOG_HEADERS in src/lib/server/requestLog.ts (a test checks this).
export const TAB = 'Request Log';
export const HEADERS = ['Submission ID', 'Server Logged At (UTC)', 'Client Submitted At (UTC)', 'Record Date', 'Initials', 'Modules', 'Client Device ID', 'User ID', 'IP Address', 'Country', 'Region', 'City', 'Latitude', 'Longitude', 'Timezone', 'User Agent', 'Browser Brands (sec-ch-ua)', 'Platform (sec-ch-ua-platform)', 'Mobile (sec-ch-ua-mobile)', 'Accept-Language', 'Vercel Request ID', 'Deployment ID', 'App Commit'];

/** Plan the restricted log tab: create it if missing, write headers only into an empty or matching header row. */
export function planRequestLogSetup(data) {
	if (!Array.isArray(data.sheets)) throw new Error('Tab metadata was not read; refusing to plan changes');
	const sheet = data.sheets?.find(s => s.properties?.title === TAB);
	if (!sheet) {
		return [
			{ addSheet: { properties: { title: TAB, gridProperties: { frozenRowCount: 1, columnCount: HEADERS.length } } } }
		];
	}
	if (!sheet.data) throw new Error(`'${TAB}' header data was not read; refusing to plan changes`);
	const values = sheet.data?.[0]?.rowData?.[0]?.values || [];
	const current = values.map(v => v?.userEnteredValue?.stringValue ?? (v?.userEnteredValue ? '?' : ''));
	const matches = HEADERS.every((label, i) => current[i] === label);
	if (matches) return [];
	if (current.some(Boolean)) throw new Error(`'${TAB}' already has different headers; inspect manually`);
	const sheetId = sheet.properties.sheetId;
	return [
		{ updateSheetProperties: { properties: { sheetId, gridProperties: { frozenRowCount: 1, columnCount: Math.max(HEADERS.length, sheet.properties.gridProperties?.columnCount || 0) } }, fields: 'gridProperties(frozenRowCount,columnCount)' } },
		{ updateCells: { start: { sheetId, rowIndex: 0, columnIndex: 0 }, rows: [{ values: HEADERS.map(stringValue => ({ userEnteredValue: { stringValue }, userEnteredFormat: { textFormat: { bold: true } } })) }], fields: 'userEnteredValue,userEnteredFormat.textFormat.bold' } }
	];
}

/** Missing and unreadable are different states: only confirmed absence may create a tab. */
export async function readRequestLogSetup(sheets, spreadsheetId) {
	const metadata = (await sheets.spreadsheets.get({ spreadsheetId, fields: 'sheets(properties)' })).data;
	if (!Array.isArray(metadata.sheets)) throw new Error('Tab metadata was not read; refusing to assume absence');
	if (!metadata.sheets?.some(sheet => sheet.properties?.title === TAB)) return metadata;
	const headers = (await sheets.spreadsheets.get({ spreadsheetId, includeGridData: true, ranges: [`'${TAB}'!1:1`], fields: 'sheets(properties,data(rowData(values(userEnteredValue))))' })).data;
	if (!headers.sheets?.some(sheet => sheet.properties?.title === TAB && Array.isArray(sheet.data))) throw new Error('Header inspection was incomplete; refusing to assume absence');
	return headers;
}

/** An uncertain write requires a fresh inspection, never an automatic blind retry.
 * @returns {Promise<{state: 'dryRun'|'complete', operations: number} | {state: 'refused'|'reinspectionRequired', operations: number, message: string}>}
 */
export async function setupRequestLogWorkbook(sheets, spreadsheetId, apply = false) {
	let phase = 'inspect';
	let operations = 0;
	try {
		const initial = planRequestLogSetup(await readRequestLogSetup(sheets, spreadsheetId));
		operations = initial.length;
		if (!apply) return { state: 'dryRun', operations };
		if (!operations) return { state: 'complete', operations };
		phase = 'apply';
		await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: initial } });
		const headers = planRequestLogSetup(await readRequestLogSetup(sheets, spreadsheetId));
		operations += headers.length;
		if (headers.length) await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: headers } });
		if (planRequestLogSetup(await readRequestLogSetup(sheets, spreadsheetId)).length) throw new Error('Setup incomplete');
		return { state: 'complete', operations };
	} catch {
		return { state: phase === 'inspect' ? 'refused' : 'reinspectionRequired', operations,
			message: phase === 'inspect' ? 'Could not safely inspect the restricted log headers. No writes attempted; inspect the workbook before rerunning.' : 'Setup outcome is uncertain. Inspect the workbook and rerun dry-run before applying again.' };
	}
}

async function main() {
	const apply = process.argv.includes('--apply');
	if (process.argv.slice(2).some(arg => arg !== '--apply')) throw new Error('Usage: node --env-file=.env scripts/setup-request-log.mjs [--apply]');
	const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
	const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
	const spreadsheetId = process.env.GOOGLE_REQUEST_LOG_SHEET_ID?.trim();
	if (!email || !key || !spreadsheetId) throw new Error('Service account credentials and GOOGLE_REQUEST_LOG_SHEET_ID are required');
	if (spreadsheetId === process.env.GOOGLE_SHEET_ID?.trim()) throw new Error('The request log must be a separate, restricted workbook, not the master sheet');
	const sheets = google.sheets({ version: 'v4', auth: new google.auth.JWT({ email, key, scopes: ['https://www.googleapis.com/auth/spreadsheets'] }) });
	const result = await setupRequestLogWorkbook(sheets, spreadsheetId, apply);
	console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', ...result }, null, 2));
	if (['refused', 'reinspectionRequired'].includes(result.state)) process.exitCode = 1;
	else console.log(apply ? 'Request log ready.' : 'No writes performed. Re-run with --apply.');
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => { console.error(error.message); process.exitCode = 1; });
