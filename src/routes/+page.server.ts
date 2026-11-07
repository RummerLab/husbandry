import { getMasterSpreadsheetUrl } from '../lib/server/spreadsheetLink';
import type { PageServerLoad } from './$types';

// Match the runtime process.env configuration used by the Sheets sync service.
export const load: PageServerLoad = () => ({
	masterSpreadsheetUrl: getMasterSpreadsheetUrl(
		process.env.PUBLIC_GOOGLE_SHEET_VIEW_URL,
		process.env.GOOGLE_SHEET_ID
	)
});
