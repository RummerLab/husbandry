import { google } from 'googleapis';
import { pathToFileURL } from 'node:url';

// Keep in sync with src/lib/server/room6Sheet.ts and src/lib/room6Config.ts (a test checks this).
const METADATA = ['Submission ID', 'Client Device ID', 'Client Submitted At (UTC)', 'Server Received At (UTC)'];

/** Legacy single-row Room 6 tab (#79). Kept so records already queued on devices can still be written. */
export const TAB = 'Room 6';
export const HEADERS = ['Date', 'Initials', 'All eggs sighted & normal', 'Dead eggs removed', 'Temp (°C)', 'Salinity (ppt)', 'pH', 'Water change', 'Concerns', 'Notes', ...METADATA];

const CLEAN = { siphon: 'Siphon', sandVac: 'Sand Vac', overflow: 'O/f', scrubWalls: 'Scrub walls', scrubPipes: 'Scrub Pipes', sandChange: 'Sand Change' };
const ALL = Object.keys(CLEAN);
const LSS_TANKS = [1, 2, 3, 4, 5, 6, 7].map(n => ({ name: `Tank ${n}`, tasks: ALL }))
	.concat([{ name: 'Tank 8 (eggs)', tasks: ['siphon', 'scrubWalls', 'scrubPipes'] }, { name: 'Tank 9', tasks: ALL }]);

/** Workbook-matching Room 6 tabs (#99), one per sheet of "Room 6 Records 2026". */
export const WORKBOOK_TABS = [
	{ tab: 'Room 6 Egg Checks', headers: ['Date', 'Initials', 'Candling completed', 'Wind eggs (how many)', 'Wind eggs (IDs)', 'New eggs (how many)', 'New eggs (IDs)', 'Embryos developed (how many)', 'Embryos developed (IDs)', 'Dead eggs (how many)', 'Dead eggs (IDs)', 'Notes', ...METADATA] },
	{ tab: 'Room 6 Water Quality', headers: ['Date', 'Initials', 'Temp (°C)', 'pH', 'Salinity (ppt)', 'DO%', 'Alk (dKH)', 'pH (weekly)', 'NH3 (ppm)', 'NO2 (ppm)', 'NO3 (ppm)', 'PO4 (ppm)', 'Notes', ...METADATA] },
	{ tab: 'Room 6 LSS', headers: ['Date', 'Initials', ...LSS_TANKS.flatMap(t => t.tasks.map(task => `${t.name}: ${CLEAN[task]}`)), 'Sump: Water Change', 'Sump: Top Up', 'Sump: Vac', 'Biofilter: Clean', 'Biofilter Flow: Air', 'Biofilter Flow: Water', 'Tank Flow: Air', 'Tank Flow: Water', 'Gutters: Vac', 'Gutters: Scrub', 'Notes', ...METADATA] },
	{ tab: 'Room 6 Ammonia + Nitrite', headers: ['Date', 'Time', 'Initials', 'Ammonia (ppm)', 'Nitrite (ppm)', 'Notes', ...METADATA] }
];
export const ALL_TABS = [{ tab: TAB, headers: HEADERS }, ...WORKBOOK_TABS];

/** Plan one tab: create it if missing, write headers only into an empty or matching header row. */
export function planTabSetup(data, tab, headers) {
	const sheet = data.sheets?.find(s => s.properties?.title === tab);
	if (!sheet) {
		return [{ addSheet: { properties: { title: tab, gridProperties: { frozenRowCount: 1, columnCount: headers.length } } } }];
	}
	if (!sheet.data) throw new Error(`'${tab}' header data was not read; refusing to plan changes`);
	const values = sheet.data[0]?.rowData?.[0]?.values || [];
	const current = values.map(v => v?.userEnteredValue?.stringValue ?? (v?.userEnteredValue ? '?' : ''));
	if (headers.every((label, i) => current[i] === label)) return [];
	if (current.some(Boolean)) throw new Error(`'${tab}' already has different headers; inspect manually`);
	const sheetId = sheet.properties.sheetId;
	return [
		{ updateSheetProperties: { properties: { sheetId, gridProperties: { frozenRowCount: 1, columnCount: Math.max(headers.length, sheet.properties.gridProperties?.columnCount || 0) } }, fields: 'gridProperties(frozenRowCount,columnCount)' } },
		{ updateCells: { start: { sheetId, rowIndex: 0, columnIndex: 0 }, rows: [{ values: headers.map(stringValue => ({ userEnteredValue: { stringValue }, userEnteredFormat: { textFormat: { bold: true } } })) }], fields: 'userEnteredValue,userEnteredFormat.textFormat.bold' } }
	];
}

/** Plan the legacy Room 6 tab. */
export function planRoom6Setup(data) {
	return planTabSetup(data, TAB, HEADERS);
}

/** Plan every Room 6 tab; any tab that cannot be safely planned stops the whole plan. */
export function planAllRoom6Setup(data, tabs = ALL_TABS) {
	return tabs.flatMap(({ tab, headers }) => planTabSetup(data, tab, headers));
}

/**
 * Establish which tabs exist before planning creation, then read header rows only for existing tabs.
 * Never turn a failed header read into empty headers.
 */
export async function readTabsSetup(sheets, spreadsheetId, tabs = ALL_TABS.map(t => t.tab)) {
	const metadata = (await sheets.spreadsheets.get({ spreadsheetId, fields: 'sheets(properties)' })).data;
	const existing = tabs.filter(tab => metadata.sheets?.some(sheet => sheet.properties?.title === tab));
	if (!existing.length) return metadata;
	return (await sheets.spreadsheets.get({ spreadsheetId, includeGridData: true, ranges: existing.map(tab => `'${tab}'!1:1`), fields: 'sheets(properties,data(rowData(values(userEnteredValue))))' })).data;
}

/** Read only the legacy Room 6 tab. */
export async function readRoom6Setup(sheets, spreadsheetId) {
	return readTabsSetup(sheets, spreadsheetId, [TAB]);
}

/** Restartable phases: inspect -> plan -> create -> reinspect -> initialise -> verify. */
export async function setupRoom6Workbook(sheets, spreadsheetId, apply = false) {
	const read = () => readTabsSetup(sheets, spreadsheetId);
	const initial = planAllRoom6Setup(await read());
	if (!apply) return { state: 'dryRun', operations: initial.length };
	if (!initial.length) return { state: 'complete', operations: 0 };
	await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: initial } });
	// A crash here leaves created tabs intact. A rerun plans only their missing headers.
	const headers = planAllRoom6Setup(await read());
	if (headers.length) await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: headers } });
	if (planAllRoom6Setup(await read()).length) throw new Error('Room 6 setup needs reinspection; rerun dry-run before applying again');
	return { state: 'complete', operations: initial.length + headers.length };
}

async function main() {
	const apply = process.argv.includes('--apply');
	if (process.argv.slice(2).some(arg => arg !== '--apply')) throw new Error('Usage: node --env-file=.env scripts/setup-room6.mjs [--apply]');
	const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
	const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
	const spreadsheetId = process.env.GOOGLE_SHEET_ID?.trim();
	if (!email || !key || !spreadsheetId) throw new Error('Service account credentials and GOOGLE_SHEET_ID are required');
	const sheets = google.sheets({ version: 'v4', auth: new google.auth.JWT({ email, key, scopes: ['https://www.googleapis.com/auth/spreadsheets'] }) });
	const result = await setupRoom6Workbook(sheets, spreadsheetId, apply);
	console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', ...result }, null, 2));
	console.log(apply ? 'Room 6 tabs ready.' : 'No writes performed. Re-run with --apply.');
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => { console.error(error.message); process.exitCode = 1; });
