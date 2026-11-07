import type { sheets_v4 } from 'googleapis';
import config from './sheetMetadata.json';

export const METADATA_HEADERS = config.headers;
export const OPERATIONAL_WIDTHS: Record<string, number> = config.widths;
export const METADATA_RANGES = Object.keys(OPERATIONAL_WIDTHS).map(title => `'${title}'!1:1`);

export function assertMetadataHeaders(data: sheets_v4.Schema$Spreadsheet): void {
	for (const [title, width] of Object.entries(OPERATIONAL_WIDTHS)) {
		const sheet = data.sheets?.find(s => s.properties?.title === title);
		const values = sheet?.data?.[0]?.rowData?.[0]?.values || [];
		if (!METADATA_HEADERS.every((header, i) => values[width + i]?.userEnteredValue?.stringValue === header)) {
			throw new Error(`Metadata headers missing or misplaced in ${title}. Run the documented workbook migration first.`);
		}
	}
}
