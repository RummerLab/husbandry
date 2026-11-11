import type { PageServerLoad } from './$types';
import { getAdminConfig } from '../../lib/server/adminAuth';
import { buildOverview, lookerStudioCreateUrl, readMasterSheet, readTabIds } from '../../lib/server/insights';
import { getReadonlyMasterSheet } from '../../lib/server/sheets';
import { getMasterSpreadsheetUrl } from '../../lib/server/spreadsheetLink';
import { room12Date } from '../../lib/recordRules';

const SIGNIN_MESSAGES: Record<string, string> = {
	denied: 'That Google account is not on the Lab Overview list. Ask Jodie to add it.',
	failed: 'Google sign-in failed. Please try again.',
	expired: 'The sign-in link expired. Please try again.',
	signedout: 'You have signed out.'
};

export const load: PageServerLoad = async ({ locals, url, setHeaders }) => {
	setHeaders({ 'Cache-Control': 'private, no-store' });
	const configured = getAdminConfig() !== null;
	const message = SIGNIN_MESSAGES[url.searchParams.get('signin') || ''] || '';
	if (!locals.admin) return { state: configured ? 'signedOut' as const : 'unconfigured' as const, signedIn: false as const, configured, message };

	const master = getReadonlyMasterSheet();
	const sheetUrl = getMasterSpreadsheetUrl(process.env.PUBLIC_GOOGLE_SHEET_VIEW_URL, process.env.GOOGLE_SHEET_ID);
	const lookerStudioUrl = process.env.LOOKER_STUDIO_URL?.startsWith('https://lookerstudio.google.com/') ? process.env.LOOKER_STUDIO_URL : null;
	const base = { signedIn: true as const, configured, message, admin: { email: locals.admin.email, name: locals.admin.name }, sheetUrl, lookerStudioUrl };
	if (!master) return { ...base, state: 'sourceUnconfigured' as const, overview: null, lookerCreateUrl: '', error: 'The master spreadsheet is not configured for this deployment.' };
	try {
		// The approved exception permits a read per authorised request, never cross-request caching.
		const [data, tabs] = await Promise.all([readMasterSheet(master.sheets, master.spreadsheetId), readTabIds(master.sheets, master.spreadsheetId)]);
		return { ...base, state: 'loaded' as const, overview: buildOverview(data, room12Date()), lookerCreateUrl: lookerStudioCreateUrl(master.spreadsheetId, tabs), loadedAt: new Date().toISOString(), error: '' };
	} catch (err) {
		console.warn('Lab Overview read failed', { errorType: err instanceof Error ? err.name : 'UnknownError' });
		return { ...base, state: 'readFailed' as const, overview: null, lookerCreateUrl: '', error: 'Could not read the master spreadsheet. Try again shortly.' };
	}
};
