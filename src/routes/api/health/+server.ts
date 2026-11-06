import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isGoogleSheetsConfigured } from '../../../lib/server/sheets';

export const GET: RequestHandler = async () => {
	const configured = isGoogleSheetsConfigured();
	return json({
		status: 'ok',
		appName: 'RummerLab Room 12 Husbandry App',
		targetDomain: 'husbandry.rummerlab.com',
		googleSheetsConfigured: configured,
		mode: configured ? 'production' : 'demo-local',
		message: configured
			? 'Google Sheets credentials detected.'
			: 'Running in demo mode. Add GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, and GOOGLE_SHEET_ID in Vercel or .env to sync with live sheets.'
	});
};
