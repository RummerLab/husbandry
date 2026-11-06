import { google } from 'googleapis';
import type { FullHusbandrySubmission } from '../types';
import { writeAtomicSubmission } from './atomicSubmission';

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

export async function appendSubmissionToSheets(submission: FullHusbandrySubmission): Promise<{
	synced: boolean;
	mode: 'live' | 'mock';
	message: string;
	tabsUpdated: string[];
}> {
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
	const tabsUpdated = await writeAtomicSubmission(sheets, spreadsheetId, submission);

	return {
		synced: true,
		mode: 'live',
		message: `Successfully appended to Google Sheets (${tabsUpdated.join(', ')})`,
		tabsUpdated
	};
}
