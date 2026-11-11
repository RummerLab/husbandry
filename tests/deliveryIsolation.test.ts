import { afterEach, expect, it, vi } from 'vitest';
import { appendSubmissionToSheets } from '../src/lib/server/sheets';
import { writeAtomicSubmission } from '../src/lib/server/atomicSubmission';
import { appendRequestLog } from '../src/lib/server/requestLog';
import type { FullHusbandrySubmission } from '../src/lib/types';

vi.mock('../src/lib/server/atomicSubmission', () => ({ writeAtomicSubmission: vi.fn(async () => ['Water Quality']) }));
vi.mock('../src/lib/server/requestLog', () => ({ appendRequestLog: vi.fn() }));
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); vi.clearAllMocks(); });

it('acknowledges an operational commit even when the separate restricted log fails', async () => {
	vi.stubEnv('VERCEL_ENV', 'production'); vi.stubEnv('NODE_ENV', 'production');
	vi.stubEnv('GOOGLE_SERVICE_ACCOUNT_EMAIL', 'synthetic@example.test'); vi.stubEnv('GOOGLE_PRIVATE_KEY', 'synthetic-non-key');
	vi.stubEnv('GOOGLE_SHEET_ID', 'synthetic-master'); vi.stubEnv('GOOGLE_REQUEST_LOG_SHEET_ID', 'synthetic-restricted');
	vi.mocked(appendRequestLog).mockRejectedValueOnce(new Error('Sensitive provider failure detail'));
	const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
	const payload = { id: 'sub_test', modulesSubmitted: ['waterQuality'] } as FullHusbandrySubmission;
	const context = {} as Parameters<typeof appendRequestLog>[3];
	expect(await appendSubmissionToSheets(payload, context)).toMatchObject({ mode: 'live', synced: true, tabsUpdated: ['Water Quality'] });
	expect(writeAtomicSubmission).toHaveBeenCalledTimes(1); expect(appendRequestLog).toHaveBeenCalledTimes(1);
	expect(vi.mocked(writeAtomicSubmission).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(appendRequestLog).mock.invocationCallOrder[0]);
	expect(JSON.stringify(warn.mock.calls)).not.toContain('Sensitive provider');
});
