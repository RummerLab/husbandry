import type { sheets_v4 } from 'googleapis';
import { createHash } from 'node:crypto';
import type { FullHusbandrySubmission } from '../types';

/**
 * Restricted audit log of the request that synced each submission (#54).
 * Lives in a SEPARATE workbook (GOOGLE_REQUEST_LOG_SHEET_ID) shared only with lab administrators,
 * never in the master sheet that lab members can view. Off when the ID is unset.
 * Never sent to the browser or analytics. Failures never affect the operational write.
 */
export const REQUEST_LOG_TAB = 'Request Log';
export const REQUEST_LOG_HEADERS = [
	'Submission ID',
	'Server Logged At (UTC)',
	'Client Submitted At (UTC)',
	'Record Date',
	'Initials',
	'Modules',
	'Client Device ID',
	'User ID',
	'IP Address',
	'Country',
	'Region',
	'City',
	'Latitude',
	'Longitude',
	'Timezone',
	'User Agent',
	'Browser Brands (sec-ch-ua)',
	'Platform (sec-ch-ua-platform)',
	'Mobile (sec-ch-ua-mobile)',
	'Accept-Language',
	'Vercel Request ID',
	'Deployment ID',
	'App Commit'
] as const;

export interface RequestContext {
	ip: string;
	country: string;
	region: string;
	city: string;
	latitude: string;
	longitude: string;
	timezone: string;
	userAgent: string;
	brands: string;
	platform: string;
	mobile: string;
	acceptLanguage: string;
	requestId: string;
	deploymentId: string;
	commit: string;
}

const MAX_CELL = 500;
const clean = (value: string | null | undefined): string => (value || '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, MAX_CELL);
const decoded = (value: string | null): string => {
	try { return clean(value ? decodeURIComponent(value) : ''); } catch { return clean(value); }
};

/**
 * Read what Vercel and the browser tell us about the request. The IP comes from the platform
 * (SvelteKit getClientAddress on Vercel), falling back to Vercel's own forwarded header.
 */
export function collectRequestContext(request: Request, clientAddress?: () => string, env: Record<string, string | undefined> = process.env): RequestContext {
	const h = request.headers;
	let ip = '';
	try { ip = clientAddress?.() || ''; } catch { /* not available outside the platform */ }
	if (!ip) ip = h.get('x-real-ip') || h.get('x-forwarded-for')?.split(',')[0] || '';
	return {
		ip: clean(ip),
		country: clean(h.get('x-vercel-ip-country')),
		region: clean(h.get('x-vercel-ip-country-region')),
		city: decoded(h.get('x-vercel-ip-city')),
		latitude: clean(h.get('x-vercel-ip-latitude')),
		longitude: clean(h.get('x-vercel-ip-longitude')),
		timezone: clean(h.get('x-vercel-ip-timezone')),
		userAgent: clean(h.get('user-agent')),
		brands: clean(h.get('sec-ch-ua')),
		platform: clean(h.get('sec-ch-ua-platform')),
		mobile: clean(h.get('sec-ch-ua-mobile')),
		acceptLanguage: clean(h.get('accept-language')),
		requestId: clean(h.get('x-vercel-id')),
		deploymentId: clean(env.VERCEL_DEPLOYMENT_ID),
		commit: clean(env.VERCEL_GIT_COMMIT_SHA).slice(0, 12)
	};
}

export function formatRequestLogRow(submission: FullHusbandrySubmission, context: RequestContext, loggedAt: string, userId = ''): string[] {
	return [
		submission.id,
		loggedAt,
		submission.submittedAt,
		submission.date,
		clean(submission.initials),
		submission.modulesSubmitted.join(', '),
		submission.clientDeviceId || '',
		clean(userId),
		context.ip,
		context.country,
		context.region,
		context.city,
		context.latitude,
		context.longitude,
		context.timezone,
		context.userAgent,
		context.brands,
		context.platform,
		context.mobile,
		context.acceptLanguage,
		context.requestId,
		context.deploymentId,
		context.commit
	];
}

/**
 * Append one row per submission. Idempotent by Submission ID: a retried sync (lost acknowledgement)
 * does not add a second row. All cells are written as plain strings, so nothing becomes a formula.
 */
export async function appendRequestLog(sheets: sheets_v4.Sheets, spreadsheetId: string, submission: FullHusbandrySubmission, context: RequestContext, now = new Date()): Promise<'logged' | 'duplicate'> {
	const quoted = `'${REQUEST_LOG_TAB}'`;
	// This receipt lives ONLY in the restricted workbook; it contains no request metadata.
	const receipt = `husbandry_log_${createHash('sha256').update(submission.id).digest('hex')}`;
	const metadata = async () => (await sheets.spreadsheets.get({ spreadsheetId, fields: 'sheets.properties(sheetId,title),namedRanges(namedRangeId)' })).data;
	const hasReceipt = (data: sheets_v4.Schema$Spreadsheet) => data.namedRanges?.some(range => range.namedRangeId === receipt) === true;
	const meta = await metadata();
	if (hasReceipt(meta)) return 'duplicate';
	const [header, ids] = (await sheets.spreadsheets.values.batchGet({ spreadsheetId, ranges: [`${quoted}!1:1`, `${quoted}!A2:A`] })).data.valueRanges || [];
	const labels = header?.values?.[0] || [];
	if (!REQUEST_LOG_HEADERS.every((label, i) => labels[i] === label)) {
		throw new Error('Request log headers missing or misplaced. Run scripts/setup-request-log.mjs first.');
	}
	if ((ids?.values || []).some(row => row[0] === submission.id)) return 'duplicate';
	const sheetId = meta.sheets?.find(s => s.properties?.title === REQUEST_LOG_TAB)?.properties?.sheetId;
	if (sheetId == null) throw new Error(`Missing tab: ${REQUEST_LOG_TAB}`);
	const values = formatRequestLogRow(submission, context, now.toISOString());
	try {
		await sheets.spreadsheets.batchUpdate({
			spreadsheetId,
			requestBody: { requests: [
				{ addNamedRange: { namedRange: { namedRangeId: receipt, name: receipt, range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 1 } } } },
				{ appendCells: { sheetId, fields: 'userEnteredValue', rows: [{ values: values.map(stringValue => ({ userEnteredValue: { stringValue } })) }] } }
			] }
		});
	} catch (error) {
		// A competing request or lost acknowledgement may already have committed the batch.
		if (!hasReceipt(await metadata())) throw error;
		return 'duplicate';
	}
	return 'logged';
}
