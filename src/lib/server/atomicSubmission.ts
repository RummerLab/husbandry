import { assertMetadataHeaders, METADATA_RANGES } from './sheetMetadata';
import { createHash } from 'node:crypto';
import type { sheets_v4 } from 'googleapis';
import type { FullHusbandrySubmission } from '../types';
import { formatLSSRow, formatTanksEggsRow, formatFeedsRow, formatWaterQualityRow } from './rows';

const hash = (value: string) => createHash('sha256').update(value).digest('hex');
function cellValue(title: string, value: string | number, column: number, width: number): sheets_v4.Schema$ExtendedValue {
	// Keep measured quantities numeric for downstream spreadsheet calculations,
	// while identifiers and free-text notes must never be interpreted as formulas.
	const measured = (title === 'Feeds' || title === 'Water Quality') && column >= 2 && column < width - 1;
	if (typeof value === 'number') return { numberValue: value };
	if (measured && /^\d+(\.\d+)?$/.test(value.trim())) return { numberValue: Number(value) };
	return { stringValue: value };
}
function canonical(value: unknown): string {
	if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
	if (value && typeof value === 'object') return `{${Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
	return JSON.stringify(value);
}

export async function writeAtomicSubmission(sheets: sheets_v4.Sheets, spreadsheetId: string, submission: FullHusbandrySubmission, options: { metadataColumns?: boolean } = {}): Promise<string[]> {
	const rows: { title: string; values: (string | number)[] }[] = [];
	if (submission.modulesSubmitted.includes('lss') && submission.lss) rows.push({ title: 'LSS Checks', values: formatLSSRow(submission.lss) });
	if (submission.modulesSubmitted.includes('tanksEggs') && submission.tanksEggs) rows.push({ title: 'Tanks + Eggs', values: formatTanksEggsRow(submission.tanksEggs) });
	if (submission.modulesSubmitted.includes('feeds') && submission.feeds) rows.push({ title: 'Feeds', values: formatFeedsRow(submission.feeds) });
	if (submission.modulesSubmitted.includes('waterQuality') && submission.waterQuality) rows.push({ title: 'Water Quality', values: formatWaterQualityRow(submission.waterQuality) });
	if (!rows.length) throw new Error('No operational rows to write');
	const receiptId = `husbandry_${hash(submission.id)}`;
	const receiptName = `husbandry_${hash(canonical(submission))}`;
	const metadata = async () => (await sheets.spreadsheets.get({ spreadsheetId, fields: 'sheets.properties(sheetId,title),namedRanges(namedRangeId,name)' })).data;
	const checkReceipt = (data: sheets_v4.Schema$Spreadsheet): boolean => {
		const receipt = data.namedRanges?.find(r => r.namedRangeId === receiptId);
		if (!receipt) return false;
		if (receipt.name !== receiptName) throw new Error('Submission ID already used for different data');
		return true;
	};
	const data = await metadata();
	if (checkReceipt(data)) return rows.map(r => r.title);
	if (options.metadataColumns) {
		const headers = (await sheets.spreadsheets.get({ spreadsheetId, ranges: METADATA_RANGES, includeGridData: true, fields: 'sheets(properties(title),data(rowData(values(userEnteredValue))))' })).data;
		assertMetadataHeaders(headers);
	}
	// Server time belongs only to the first successful atomic write, not the receipt hash.
	const receivedAt = new Date().toISOString();
	const requests: sheets_v4.Schema$Request[] = rows.map(row => {
		const sheetId = data.sheets?.find(s => s.properties?.title === row.title)?.properties?.sheetId;
		if (sheetId == null) throw new Error(`Missing operational tab: ${row.title}`);
		const operationalWidth = row.values.length;
		const values = options.metadataColumns ? [...row.values, submission.id, submission.clientDeviceId || '', submission.submittedAt, receivedAt] : row.values;
		return { appendCells: { sheetId, fields: 'userEnteredValue', rows: [{ values: values.map((value, column) => ({ userEnteredValue: cellValue(row.title, value, column, operationalWidth) })) }] } };
	});
	requests.unshift({ addNamedRange: { namedRange: { namedRangeId: receiptId, name: receiptName, range: { sheetId: requests[0].appendCells!.sheetId!, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 1 } } } });
	try {
		// Duplicate receipt IDs reject the entire atomic batch, including replay.
		await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests } });
	} catch (error) {
		// Reconcile a lost acknowledgement or a competing successful request.
		if (!checkReceipt(await metadata())) throw error;
	}
	return rows.map(r => r.title);
}
