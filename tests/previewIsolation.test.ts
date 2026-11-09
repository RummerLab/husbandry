import { afterEach, expect, it, vi } from 'vitest';
import { appendSubmissionToSheets, previewWritesBlocked } from '../src/lib/server/sheets';
import type { FullHusbandrySubmission } from '../src/lib/types';

afterEach(() => vi.unstubAllEnvs());
const submission = { id: 'sub_preview', submittedAt: '2026-11-09T00:00:00Z', date: '2026-11-09', initials: 'TT', modulesSubmitted: ['waterQuality'] } as FullHusbandrySubmission;

it('blocks live Sheets writes on Vercel Preview unless explicitly enabled', () => {
	vi.stubEnv('VERCEL_ENV', 'preview'); vi.stubEnv('PREVIEW_SHEETS_WRITES_ENABLED', '');
	expect(previewWritesBlocked()).toBe(true);
	vi.stubEnv('PREVIEW_SHEETS_WRITES_ENABLED', 'true');
	expect(previewWritesBlocked()).toBe(false);
	vi.stubEnv('VERCEL_ENV', 'production'); vi.stubEnv('PREVIEW_SHEETS_WRITES_ENABLED', '');
	expect(previewWritesBlocked()).toBe(false);
});

it('returns a mock acknowledgement on Preview even with full credentials, so nothing reaches a workbook', async () => {
	vi.stubEnv('VERCEL_ENV', 'preview');
	vi.stubEnv('GOOGLE_SERVICE_ACCOUNT_EMAIL', 'bot@example.iam.gserviceaccount.com');
	vi.stubEnv('GOOGLE_PRIVATE_KEY', 'not-a-real-key');
	vi.stubEnv('GOOGLE_SHEET_ID', 'production-sheet-id');
	const result = await appendSubmissionToSheets(submission);
	expect(result.mode).toBe('mock');
	expect(result.message).toContain('preview deployments do not write');
});

it('blocks live Sheets writes from a local dev server unless explicitly enabled (#68)', async () => {
	const { localDevWritesBlocked } = await import('../src/lib/server/sheets');
	vi.stubEnv('VERCEL_ENV', '');
	vi.stubEnv('NODE_ENV', 'development'); vi.stubEnv('LOCAL_SHEETS_WRITES_ENABLED', '');
	expect(localDevWritesBlocked()).toBe(true);
	vi.stubEnv('GOOGLE_SERVICE_ACCOUNT_EMAIL', 'bot@example.iam.gserviceaccount.com');
	vi.stubEnv('GOOGLE_PRIVATE_KEY', 'not-a-real-key');
	vi.stubEnv('GOOGLE_SHEET_ID', 'production-sheet-id');
	const result = await appendSubmissionToSheets(submission);
	expect(result.mode).toBe('mock');
	expect(result.message).toContain('local development does not write');
	vi.stubEnv('LOCAL_SHEETS_WRITES_ENABLED', 'true');
	expect(localDevWritesBlocked()).toBe(false);
	vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('LOCAL_SHEETS_WRITES_ENABLED', '');
	expect(localDevWritesBlocked()).toBe(false);
});
