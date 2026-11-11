import { google } from 'googleapis';
import { pathToFileURL } from 'node:url';
import config from '../src/lib/server/sheetMetadata.json' with { type: 'json' };

/** Build one atomic migration; refuse to overwrite unfamiliar header cells. */
export function planMetadataMigration(data) {
	const requests = [];
	for (const [title, width] of Object.entries(config.widths)) {
		const sheet = data.sheets?.find(s => s.properties?.title === title);
		if (!sheet || sheet.properties?.sheetId == null) throw new Error(`Missing tab: ${title}`);
		const values = sheet.data?.[0]?.rowData?.[0]?.values || [];
		if (!Array.from({ length: width }, (_, i) => values[i]?.userEnteredValue?.stringValue).every(Boolean)) throw new Error(`Expected ${width} operational header labels in ${title}`);
		const trailing = values.slice(width);
		const complete = config.headers.every((label, i) => trailing[i]?.userEnteredValue?.stringValue === label);
		const occupied = cell => cell?.userEnteredValue && Object.keys(cell.userEnteredValue).length > 0;
		if ((!complete && trailing.some(occupied)) || trailing.slice(4).some(occupied)) throw new Error(`Unexpected trailing headers in ${title}; inspect manually`);
		const sheetId = sheet.properties.sheetId;
		if ((sheet.properties.gridProperties?.columnCount || 0) < width + 4) requests.push({ updateSheetProperties: { properties: { sheetId, gridProperties: { columnCount: width + 4 } }, fields: 'gridProperties.columnCount' } });
		if (!complete) requests.push({ updateCells: { start: { sheetId, rowIndex: 0, columnIndex: width }, rows: [{ values: config.headers.map(stringValue => ({ userEnteredValue: { stringValue } })) }], fields: 'userEnteredValue' } });
	}
	return requests;
}

const columnName = index => {
	let result = '';
	while (index > 0) { index--; result = String.fromCharCode(65 + index % 26) + result; index = Math.floor(index / 26); }
	return result;
};

/** Inspect proposed columns below their blank headers, not just the header row. */
export function metadataCollisionRanges(data) {
	return Object.entries(config.widths).flatMap(([title, width]) => {
		const sheet = data.sheets?.find(s => s.properties?.title === title);
		const values = sheet?.data?.[0]?.rowData?.[0]?.values || [];
		if (config.headers.every((label, i) => values[width + i]?.userEnteredValue?.stringValue === label)) return [];
		const existingColumns = sheet?.properties?.gridProperties?.columnCount || width;
		if (existingColumns <= width) return [];
		return [`'${title}'!${columnName(width + 1)}1:${columnName(Math.min(width + 4, existingColumns))}`];
	});
}
export function assertMetadataColumnsEmpty(valueRanges) {
	for (const range of valueRanges) {
		if (range.values?.some(row => row.some(value => value !== '' && value !== null))) throw new Error(`Proposed metadata columns contain existing data: ${range.range}. Review the workbook manually.`);
	}
}

/** Inspect and verify the opt-in metadata migration without ever setting the runtime flag.
 * @returns {Promise<{state: 'dryRun'|'complete', operations: number} | {state: 'refused'|'reinspectionRequired', operations: number, message: string}>}
 */
export async function migrateMetadataWorkbook(sheets, spreadsheetId, apply = false) {
	let phase = 'inspect';
	let operations = 0;
	const read = async () => (await sheets.spreadsheets.get({ spreadsheetId, ranges: Object.keys(config.widths).map(title => `'${title}'!1:1`), includeGridData: true, fields: 'sheets(properties,data(rowData(values(userEnteredValue))))' })).data;
	try {
		const data = await read();
		const requests = planMetadataMigration(data);
		operations = requests.length;
		const collisionRanges = metadataCollisionRanges(data);
		if (collisionRanges.length) {
			const existing = (await sheets.spreadsheets.values.batchGet({ spreadsheetId, ranges: collisionRanges, valueRenderOption: 'FORMULA' })).data;
			// Missing range responses are unknown, not proof that the target columns are empty.
			if (existing.valueRanges?.length !== collisionRanges.length) throw new Error('Incomplete collision inspection');
			assertMetadataColumnsEmpty(existing.valueRanges);
		}
		if (!apply) return { state: 'dryRun', operations };
		if (!operations) return { state: 'complete', operations };
		phase = 'apply';
		await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests } });
		if (planMetadataMigration(await read()).length) throw new Error('Migration incomplete');
		return { state: 'complete', operations };
	} catch {
		return { state: phase === 'inspect' ? 'refused' : 'reinspectionRequired', operations,
			message: phase === 'inspect' ? 'Could not prove metadata headers and target columns are safe. No writes attempted; inspect the workbook before rerunning.' : 'Migration outcome is uncertain. Keep the runtime metadata flag unchanged; inspect the workbook and rerun dry-run.' };
	}
}

async function main() {
	const apply = process.argv.includes('--apply');
	if (process.argv.slice(2).some(arg => arg !== '--apply')) throw new Error('Usage: node --env-file=.env scripts/migrate-sheet-metadata.mjs [--apply]');
	const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
	const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
	const spreadsheetId = process.env.GOOGLE_SHEET_ID?.trim();
	if (!email || !key || !spreadsheetId) throw new Error('Google Sheets credentials and workbook ID are required');
	const auth = new google.auth.JWT({ email, key, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
	const sheets = google.sheets({ version: 'v4', auth });
	const result = await migrateMetadataWorkbook(sheets, spreadsheetId, apply);
	console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', ...result, widths: Object.fromEntries(Object.entries(config.widths).map(([title, width]) => [title, width + 4])) }, null, 2));
	if (['refused', 'reinspectionRequired'].includes(result.state)) process.exitCode = 1;
	else if (!apply) console.log('No writes performed. Back up the workbook, verify downstream consumers, then use --apply against a disposable copy first.');
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => { console.error(error.message); process.exitCode = 1; });
