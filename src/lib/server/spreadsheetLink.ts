/** Resolve only a Google spreadsheet URL; never fall back to the Docs homepage. */
export function getMasterSpreadsheetUrl(viewUrl = '', sheetId = ''): string | null {
	try {
		const url = new URL(viewUrl.trim());
		if (url.protocol === 'https:' && url.host === 'docs.google.com' &&
			!url.username && !url.password && /^\/spreadsheets\/d\/[A-Za-z0-9_-]+(?:\/|$)/.test(url.pathname)) {
			return url.href;
		}
	} catch {
		// An absent or invalid override can still use the sync destination.
	}

	const id = sheetId.trim();
	return /^[A-Za-z0-9_-]+$/.test(id)
		? `https://docs.google.com/spreadsheets/d/${id}/preview`
		: null;
}
