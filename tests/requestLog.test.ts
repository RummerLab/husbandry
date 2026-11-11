import { expect, it, vi } from 'vitest';
import type { sheets_v4 } from 'googleapis';
import { appendRequestLog, collectRequestContext, formatRequestLogRow, REQUEST_LOG_HEADERS, REQUEST_LOG_TAB } from '../src/lib/server/requestLog';
// @ts-expect-error plain .mjs script without type declarations
import { HEADERS, TAB, planRequestLogSetup, readRequestLogSetup } from '../scripts/setup-request-log.mjs';
import type { FullHusbandrySubmission } from '../src/lib/types';

const submission: FullHusbandrySubmission = {
	id: 'sub_log_1', submittedAt: '2026-11-09T07:00:00.000Z', date: '2026-11-09', initials: 'TT',
	modulesSubmitted: ['waterQuality'], clientDeviceId: 'device_12345678-1234-1234-1234-123456789abc'
};
const request = new Request('https://husbandry.rummerlab.com/api/submit', {
	method: 'POST',
	headers: {
		'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)',
		'x-forwarded-for': '203.0.113.9, 10.0.0.1',
		'x-vercel-ip-country': 'AU', 'x-vercel-ip-country-region': 'QLD', 'x-vercel-ip-city': 'Townsville%20City',
		'x-vercel-ip-latitude': '-19.26', 'x-vercel-ip-longitude': '146.81', 'x-vercel-ip-timezone': 'Australia/Brisbane',
		'sec-ch-ua-platform': '"iOS"', 'sec-ch-ua-mobile': '?1', 'accept-language': 'en-AU,en;q=0.9', 'x-vercel-id': 'syd1::abc'
	}
});

it('collects IP, geo and browser details from the request', () => {
	const context = collectRequestContext(request, () => '198.51.100.7', { VERCEL_DEPLOYMENT_ID: 'dpl_123', VERCEL_GIT_COMMIT_SHA: 'abcdef1234567890' });
	expect(context).toMatchObject({ ip: '198.51.100.7', country: 'AU', region: 'QLD', city: 'Townsville City', timezone: 'Australia/Brisbane', platform: '"iOS"', mobile: '?1', requestId: 'syd1::abc', deploymentId: 'dpl_123', commit: 'abcdef123456' });
	expect(collectRequestContext(request, () => { throw new Error('no platform'); }, {}).ip).toBe('203.0.113.9');
	const long = collectRequestContext(new Request('https://x.test', { headers: { 'user-agent': 'a'.repeat(900) } }), undefined, {});
	expect(long.userAgent).toHaveLength(500);
});

it('formats one row matching the header order, with a blank User ID for now', () => {
	const row = formatRequestLogRow(submission, collectRequestContext(request, () => '198.51.100.7', {}), '2026-11-09T07:00:05.000Z');
	expect(row).toHaveLength(REQUEST_LOG_HEADERS.length);
	expect(row[REQUEST_LOG_HEADERS.indexOf('Submission ID')]).toBe('sub_log_1');
	expect(row[REQUEST_LOG_HEADERS.indexOf('Client Device ID')]).toBe(submission.clientDeviceId);
	expect(row[REQUEST_LOG_HEADERS.indexOf('User ID')]).toBe('');
	expect(row[REQUEST_LOG_HEADERS.indexOf('IP Address')]).toBe('198.51.100.7');
	expect(row[REQUEST_LOG_HEADERS.indexOf('Modules')]).toBe('waterQuality');
});

function fakeSheets(ids: string[], headers: string[] = [...REQUEST_LOG_HEADERS]) {
	const batchUpdate = vi.fn().mockResolvedValue({});
	const sheets = {
		spreadsheets: {
			values: { batchGet: vi.fn().mockResolvedValue({ data: { valueRanges: [{ values: [headers] }, { values: ids.map(id => [id]) }] } }) },
			get: vi.fn().mockResolvedValue({ data: { sheets: [{ properties: { sheetId: 7, title: REQUEST_LOG_TAB } }] } }),
			batchUpdate
		}
	} as unknown as sheets_v4.Sheets;
	return { sheets, batchUpdate };
}

it('appends once per submission and skips retries of the same Submission ID', async () => {
	const context = collectRequestContext(request, () => '198.51.100.7', {});
	const fresh = fakeSheets(['sub_other']);
	expect(await appendRequestLog(fresh.sheets, 'log', submission, context)).toBe('logged');
	const cells = fresh.batchUpdate.mock.calls[0][0].requestBody.requests[1].appendCells;
	expect(cells.sheetId).toBe(7);
	expect(cells.rows[0].values.every((v: { userEnteredValue: Record<string, unknown> }) => 'stringValue' in v.userEnteredValue)).toBe(true);
	const retry = fakeSheets(['sub_log_1']);
	expect(await appendRequestLog(retry.sheets, 'log', submission, context)).toBe('duplicate');
	expect(retry.batchUpdate).not.toHaveBeenCalled();
});

it('commits one restricted log row for competing retries and reconciles lost acknowledgements', async () => {
	const data: sheets_v4.Schema$Spreadsheet = { sheets: [{ properties: { sheetId: 7, title: REQUEST_LOG_TAB } }], namedRanges: [] };
	let rows = 0;
	let loseAcknowledgement = false;
	const batchUpdate = vi.fn(async ({ requestBody }: { requestBody: sheets_v4.Schema$BatchUpdateSpreadsheetRequest }) => {
		const receipt = requestBody.requests![0].addNamedRange!.namedRange!;
		if (data.namedRanges!.some(range => range.namedRangeId === receipt.namedRangeId)) throw new Error('Duplicate receipt: whole batch refused');
		data.namedRanges!.push(receipt);
		rows++;
		if (loseAcknowledgement) throw new Error('Acknowledgement lost');
		return {};
	});
	const sheets = { spreadsheets: {
		get: vi.fn(async () => ({ data: structuredClone(data) })),
		values: { batchGet: vi.fn(async () => ({ data: { valueRanges: [{ values: [[...REQUEST_LOG_HEADERS]] }, { values: [] }] } })) },
		batchUpdate
	} } as unknown as sheets_v4.Sheets;
	const context = collectRequestContext(request);
	const results = await Promise.all([appendRequestLog(sheets, 'log', submission, context), appendRequestLog(sheets, 'log', submission, context)]);
	expect(results.sort()).toEqual(['duplicate', 'logged']);
	expect(rows).toBe(1);
	expect(batchUpdate).toHaveBeenCalledTimes(2); // Both observed absence; the receipt protects the commit.
	expect(data.namedRanges![0].name).toMatch(/^husbandry_log_[a-f0-9]{64}$/);
	loseAcknowledgement = true;
	await expect(appendRequestLog(sheets, 'log', { ...submission, id: 'lost_ack' }, context)).resolves.toBe('duplicate');
	await appendRequestLog(sheets, 'log', { ...submission, id: 'lost_ack' }, context);
	expect(rows).toBe(2);
});

it('does not reinterpret a failed restricted-log header read as an empty tab', async () => {
	const get = vi.fn().mockResolvedValueOnce({ data: { sheets: [{ properties: { title: TAB, sheetId: 7 } }] } }).mockRejectedValueOnce(new Error('Read failed'));
	await expect(readRequestLogSetup({ spreadsheets: { get } }, 'log')).rejects.toThrow('Read failed');
	expect(() => planRequestLogSetup({ sheets: [{ properties: { title: TAB, sheetId: 7 } }] })).toThrow('header data was not read');
});

it('refuses to write when the log headers are missing or moved', async () => {
	const bad = fakeSheets([], ['Submission ID', 'Something else']);
	await expect(appendRequestLog(bad.sheets, 'log', submission, collectRequestContext(request))).rejects.toThrow('headers');
	expect(bad.batchUpdate).not.toHaveBeenCalled();
});

it('keeps the setup script in step with the server headers', () => {
	expect(TAB).toBe(REQUEST_LOG_TAB);
	expect(HEADERS).toEqual([...REQUEST_LOG_HEADERS]);
	expect(planRequestLogSetup({ sheets: [] })[0].addSheet.properties.title).toBe(REQUEST_LOG_TAB);
	const matching = { sheets: [{ properties: { sheetId: 1, title: TAB }, data: [{ rowData: [{ values: HEADERS.map((stringValue: string) => ({ userEnteredValue: { stringValue } })) }] }] }] };
	expect(planRequestLogSetup(matching)).toEqual([]);
	const other = { sheets: [{ properties: { sheetId: 1, title: TAB }, data: [{ rowData: [{ values: [{ userEnteredValue: { stringValue: 'Other' } }] }] }] }] };
	expect(() => planRequestLogSetup(other)).toThrow('different headers');
});
