import { google } from 'googleapis';
import type { FullHusbandrySubmission } from '../types';
import { writeAtomicSubmission } from './atomicSubmission';
import { appendRequestLog, type RequestContext } from './requestLog';

// Environment variables from runtime process.env (Vercel & Node)
function getEnv(name: string): string {
	if (typeof process !== 'undefined' && process.env && process.env[name]) {
		return process.env[name]!.trim();
	}
	return '';
}

export function getSheetsConfigStatus(): {
	configured: boolean;
	hasEmail: boolean;
	hasKey: boolean;
	hasSheetId: boolean;
	email: string;
	sheetId: string;
} {
	const email = getEnv('GOOGLE_SERVICE_ACCOUNT_EMAIL');
	const key = getEnv('GOOGLE_PRIVATE_KEY');
	const sheetId = getEnv('GOOGLE_SHEET_ID');

	return {
		configured: Boolean(email && key && sheetId),
		hasEmail: Boolean(email),
		hasKey: Boolean(key),
		hasSheetId: Boolean(sheetId),
		email: email ? `${email.substring(0, 8)}...` : '',
		sheetId: sheetId ? `${sheetId.substring(0, 6)}...` : ''
	};
}

/** True on Vercel Preview unless PREVIEW_SHEETS_WRITES_ENABLED=true (for a disposable workbook only). */
export function previewWritesBlocked(): boolean {
	return getEnv('VERCEL_ENV') === 'preview' && getEnv('PREVIEW_SHEETS_WRITES_ENABLED') !== 'true';
}

export function isGoogleSheetsConfigured(): boolean {
	const status = getSheetsConfigStatus();
	return status.configured;
}

function getSheetsClient() {
	const clientEmail = getEnv('GOOGLE_SERVICE_ACCOUNT_EMAIL');
	let privateKey = getEnv('GOOGLE_PRIVATE_KEY');

	if (!clientEmail || !privateKey) {
		throw new Error('Google Service Account credentials missing.');
	}

	// Format private key if escaped newlines were provided in env
	if (privateKey.includes('\\n')) {
		privateKey = privateKey.replace(/\\n/g, '\n');
	}

	const auth = new google.auth.JWT({
		email: clientEmail,
		key: privateKey,
		scopes: ['https://www.googleapis.com/auth/spreadsheets']
	});

	return google.sheets({ version: 'v4', auth });
}

export async function appendSubmissionToSheets(submission: FullHusbandrySubmission, requestContext?: RequestContext): Promise<{
	synced: boolean;
	mode: 'live' | 'mock';
	message: string;
	tabsUpdated: string[];
}> {
	// Preview deployments never write to a live workbook unless explicitly allowed (#59).
	// Use a disposable copy of the workbook for preview testing, never the production sheet.
	if (previewWritesBlocked()) {
		console.warn('[Google Sheets] Preview deployment: live writes disabled. Operating in mock mode.');
		return {
			synced: true,
			mode: 'mock',
			message: 'Mock sync: preview deployments do not write to Google Sheets (set PREVIEW_SHEETS_WRITES_ENABLED=true with a disposable workbook to test live writes).',
			tabsUpdated: submission.modulesSubmitted
		};
	}

	const status = getSheetsConfigStatus();
	if (!status.configured) {
		const missing: string[] = [];
		if (!status.hasEmail) missing.push('GOOGLE_SERVICE_ACCOUNT_EMAIL');
		if (!status.hasKey) missing.push('GOOGLE_PRIVATE_KEY');
		if (!status.hasSheetId) missing.push('GOOGLE_SHEET_ID');

		const logMsg = `[Google Sheets] Credentials missing: ${missing.join(', ')}. Operating in mock mode.`;
		console.warn(logMsg);

		return {
			synced: true,
			mode: 'mock',
			message: `Mock sync successful. Missing in environment: ${missing.join(', ')}.`,
			tabsUpdated: submission.modulesSubmitted
		};
	}

	const sheets = getSheetsClient();
	const spreadsheetId = getEnv('GOOGLE_SHEET_ID');
	const tabsUpdated = await writeAtomicSubmission(sheets, spreadsheetId, submission, { metadataColumns: getEnv('GOOGLE_SHEET_METADATA_ENABLED') === 'true' });

	// Restricted request log (#54): separate workbook, after the records are safely written.
	// Best effort: a log failure never fails the submission. Retries are deduplicated by Submission ID.
	const requestLogSheetId = getEnv('GOOGLE_REQUEST_LOG_SHEET_ID');
	if (requestLogSheetId && requestContext) {
		try {
			await appendRequestLog(sheets, requestLogSheetId, submission, requestContext);
		} catch (error) {
			// Never log IPs, user agents or payloads here.
			console.warn('Request log write failed', { errorType: error instanceof Error ? error.name : 'UnknownError' });
		}
	}

	return {
		synced: true,
		mode: 'live',
		message: `Successfully appended to Google Sheets (${tabsUpdated.join(', ')})`,
		tabsUpdated
	};
}
