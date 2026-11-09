import type { PageServerLoad } from './$types';
import { getAdminConfig } from '../../lib/server/adminAuth';
import { buildOverview, lookerStudioCreateUrl, readMasterSheet, readTabIds, type Overview } from '../../lib/server/insights';
import { getReadonlyMasterSheet } from '../../lib/server/sheets';
import { getMasterSpreadsheetUrl } from '../../lib/server/spreadsheetLink';
import { room12Date } from '../../lib/recordRules';

// Short per-instance cache so several admins opening the page don't hit Sheets quota.
let cached: { at: number; overview: Overview; lookerCreateUrl: string } | null = null;
const CACHE_MS = 60_000;

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
	if (!locals.admin) return { signedIn: false as const, configured, message };

	const master = getReadonlyMasterSheet();
	const sheetUrl = getMasterSpreadsheetUrl(process.env.PUBLIC_GOOGLE_SHEET_VIEW_URL, process.env.GOOGLE_SHEET_ID);
	const lookerStudioUrl = process.env.LOOKER_STUDIO_URL?.startsWith('https://lookerstudio.google.com/') ? process.env.LOOKER_STUDIO_URL : null;
	const base = { signedIn: true as const, configured, message, admin: { email: locals.admin.email, name: locals.admin.name }, sheetUrl, lookerStudioUrl };
	if (!master) return { ...base, overview: null, lookerCreateUrl: '', error: 'The master spreadsheet is not configured for this deployment.' };
	try {
		const fresh = url.searchParams.has('refresh');
		if (!cached || fresh || Date.now() - cached.at > CACHE_MS) {
			const [data, tabs] = await Promise.all([readMasterSheet(master.sheets, master.spreadsheetId), readTabIds(master.sheets, master.spreadsheetId)]);
			cached = { at: Date.now(), overview: buildOverview(data, room12Date()), lookerCreateUrl: lookerStudioCreateUrl(master.spreadsheetId, tabs) };
		}
		return { ...base, overview: cached.overview, lookerCreateUrl: cached.lookerCreateUrl, loadedAt: new Date(cached.at).toISOString(), error: '' };
	} catch (err) {
		console.warn('Lab Overview read failed', { errorType: err instanceof Error ? err.name : 'UnknownError' });
		return { ...base, overview: null, lookerCreateUrl: '', error: 'Could not read the master spreadsheet. Try again shortly.' };
	}
};
