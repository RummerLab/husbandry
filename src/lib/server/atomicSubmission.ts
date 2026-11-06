import { createHash } from 'node:crypto';
import type { sheets_v4 } from 'googleapis';
import type { FullHusbandrySubmission } from '../types';
import { formatLSSRow, formatTanksEggsRow, formatFeedsRow, formatWaterQualityRow } from './rows';

const hash = (value: string) => createHash('sha256').update(value).digest('hex');
function canonical(value: unknown): string {
	if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
	if (value && typeof value === 'object') return `{${Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
	return JSON.stringify(value);
}

export async function writeAtomicSubmission(sheets: sheets_v4.Sheets, spreadsheetId: string, submission: FullHusbandrySubmission): Promise<string[]> {
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
	const requests: sheets_v4.Schema$Request[] = rows.map(row => {
		const sheetId = data.sheets?.find(s => s.properties?.title === row.title)?.properties?.sheetId;
		if (sheetId == null) throw new Error(`Missing operational tab: ${row.title}`);
		return { appendCells: { sheetId, fields: 'userEnteredValue', rows: [{ values: row.values.map(value => ({ userEnteredValue: typeof value === 'number' ? { numberValue: value } : { stringValue: value } })) }] } };
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
