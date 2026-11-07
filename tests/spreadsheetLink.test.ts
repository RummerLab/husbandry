import { afterEach, describe, expect, it, vi } from 'vitest';
import { load } from '../src/routes/+page.server';
import { getMasterSpreadsheetUrl } from '../src/lib/server/spreadsheetLink';

describe('master spreadsheet link', () => {
	it('uses the configured Google Sheets URL, including its selected tab', () => {
		const url = 'https://docs.google.com/spreadsheets/d/view-sheet/preview#gid=42';
		expect(getMasterSpreadsheetUrl(` ${url} `, 'sync-sheet')).toBe(url);
	});

	it('falls back to the sync workbook in preview mode', () => {
		expect(getMasterSpreadsheetUrl('', ' sync-sheet_123 '))
			.toBe('https://docs.google.com/spreadsheets/d/sync-sheet_123/preview');
	});

	it.each([
		'https://docs.google.com/', 'not a URL', 'javascript:alert(1)',
		'http://docs.google.com/spreadsheets/d/sheet/edit',
		'https://docs.google.com.evil.example/spreadsheets/d/sheet/edit',
		'https://docs.google.com/document/d/sheet/edit',
		'https://user:password@docs.google.com/spreadsheets/d/sheet/edit'
	])('rejects an invalid override: %s', (url) => {
		expect(getMasterSpreadsheetUrl(url)).toBeNull();
		expect(getMasterSpreadsheetUrl(url, 'sync-sheet'))
			.toBe('https://docs.google.com/spreadsheets/d/sync-sheet/preview');
	});

	it('returns unavailable when no valid destination is configured', () => {
		expect(getMasterSpreadsheetUrl()).toBeNull();
		expect(getMasterSpreadsheetUrl('', '../bad/id')).toBeNull();
	});
});


describe('spreadsheet page data', () => {
	afterEach(() => vi.unstubAllEnvs());

	it('reads runtime configuration and returns only the resolved URL', async () => {
		vi.stubEnv('PUBLIC_GOOGLE_SHEET_VIEW_URL', '');
		vi.stubEnv('GOOGLE_SHEET_ID', 'runtime-sheet');
		vi.stubEnv('GOOGLE_PRIVATE_KEY', 'test-private-key');
		const event = {} as Parameters<typeof load>[0];
		expect(await load(event)).toEqual({
			masterSpreadsheetUrl: 'https://docs.google.com/spreadsheets/d/runtime-sheet/preview'
		});
		vi.stubEnv('PUBLIC_GOOGLE_SHEET_VIEW_URL', 'https://docs.google.com/spreadsheets/d/override/preview');
		expect(await load(event)).toEqual({
			masterSpreadsheetUrl: 'https://docs.google.com/spreadsheets/d/override/preview'
		});
		vi.stubEnv('PUBLIC_GOOGLE_SHEET_VIEW_URL', '');
		vi.stubEnv('GOOGLE_SHEET_ID', '');
		expect(await load(event)).toEqual({ masterSpreadsheetUrl: null });
	});
});
