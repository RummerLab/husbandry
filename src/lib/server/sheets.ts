import { google } from 'googleapis';
import type { FullHusbandrySubmission } from '../types';
import { formatLSSRow, formatTanksEggsRow, formatFeedsRow, formatWaterQualityRow } from './rows';

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
	const tabsUpdated: string[] = [];

	// 1. LSS Checks
	if (submission.lss && submission.modulesSubmitted.includes('lss')) {
		const row = formatLSSRow(submission.lss);
		await sheets.spreadsheets.values.append({
			spreadsheetId,
			range: "'LSS Checks'!A:U",
			valueInputOption: 'USER_ENTERED',
			requestBody: { values: [row] }
		});
		tabsUpdated.push('LSS Checks');
	}

	// 2. Tanks + Eggs
	if (submission.tanksEggs && submission.modulesSubmitted.includes('tanksEggs')) {
		const row = formatTanksEggsRow(submission.tanksEggs);
		await sheets.spreadsheets.values.append({
			spreadsheetId,
			range: "'Tanks + Eggs'!A:U",
			valueInputOption: 'USER_ENTERED',
			requestBody: { values: [row] }
		});
		tabsUpdated.push('Tanks + Eggs');
	}

	// 3. Feeds
	if (submission.feeds && submission.modulesSubmitted.includes('feeds')) {
		const row = formatFeedsRow(submission.feeds);
		await sheets.spreadsheets.values.append({
			spreadsheetId,
			range: "'Feeds'!A:CF",
			valueInputOption: 'USER_ENTERED',
			requestBody: { values: [row] }
		});
		tabsUpdated.push('Feeds');
	}

	// 4. Water Quality
	if (submission.waterQuality && submission.modulesSubmitted.includes('waterQuality')) {
		const row = formatWaterQualityRow(submission.waterQuality);
		await sheets.spreadsheets.values.append({
			spreadsheetId,
			range: "'Water Quality'!A:W",
			valueInputOption: 'USER_ENTERED',
			requestBody: { values: [row] }
		});
		tabsUpdated.push('Water Quality');
	}

	return {
		synced: true,
		mode: 'live',
		message: `Successfully appended to Google Sheets (${tabsUpdated.join(', ')})`,
		tabsUpdated
	};
}
