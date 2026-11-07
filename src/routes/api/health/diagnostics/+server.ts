import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSheetsConfigStatus } from '../../../../lib/server/sheets';

import { sameSecret } from '../../../../lib/server/secrets';

export const GET: RequestHandler = async ({ request }) => {
	const token = process.env.HEALTH_DIAGNOSTICS_TOKEN || '';
	if (token.length < 32 || !sameSecret(request.headers.get('authorization') || '', `Bearer ${token}`)) {
		return json({ error: 'Unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
	}
	const status = getSheetsConfigStatus();

	const missing: string[] = [];
	if (!status.hasEmail) missing.push('GOOGLE_SERVICE_ACCOUNT_EMAIL');
	if (!status.hasKey) missing.push('GOOGLE_PRIVATE_KEY');
	if (!status.hasSheetId) missing.push('GOOGLE_SHEET_ID');

	return json({
		status: 'ok',
		appName: 'RummerLab Room 12 Husbandry App',
		targetDomain: 'husbandry.rummerlab.com',
		googleSheetsConfigured: status.configured,
		diagnostics: {
			hasServiceAccountEmail: status.hasEmail,
			hasPrivateKey: status.hasKey,
			hasSheetId: status.hasSheetId,
			missingVariables: missing
		},
		mode: status.configured ? 'production' : 'demo-local',
		message: status.configured
			? 'Google Sheets credentials detected and ready.'
			: `Running in demo mode. Missing variables in environment: ${missing.join(', ')}.`
	}, { headers: { 'Cache-Control': 'no-store' } });
};
