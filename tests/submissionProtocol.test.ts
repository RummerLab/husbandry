import { beforeEach, expect, it, vi } from 'vitest';
import { POST } from '../src/routes/api/submit/+server';
import { appendSubmissionToSheets } from '../src/lib/server/sheets';
import { SubmissionConflictError } from '../src/lib/server/submissionErrors';
import { createEmptyStepForms } from '../src/lib/shiftWorkflow';

vi.mock('../src/lib/server/rateLimit', () => ({ enforceRateLimit: vi.fn(async () => null) }));
vi.mock('../src/lib/server/sheets', () => ({ appendSubmissionToSheets: vi.fn() }));

beforeEach(() => vi.clearAllMocks());
const payload = {
	id: 'sub_protocol', date: '2026-11-11', submittedAt: '2026-11-11T00:00:00Z', initials: 'TEST', modulesSubmitted: ['waterQuality'],
	waterQuality: { ...createEmptyStepForms('2026-11-11', 'TEST').waterQuality, tempA: '26', tempB: '26', pHA: '8.2', pHB: '8.1', salinityA: '36', salinityB: '36', doA: '98', doB: 'N/A' }
};
function submit() {
	return POST({ request: new Request('https://lab.test/api/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }), getClientAddress: () => '192.0.2.1' } as Parameters<typeof POST>[0]);
}

it('returns a known identity conflict as retained needs-review 409', async () => {
	vi.mocked(appendSubmissionToSheets).mockRejectedValueOnce(new SubmissionConflictError());
	const response = await submit();
	expect(response.status).toBe(409);
	expect(response.headers.get('Cache-Control')).toBe('no-store');
	expect(await response.json()).toMatchObject({ success: false, code: 'SUBMISSION_CONFLICT' });
});

it('keeps an uncertain commit retryable and does not expose provider errors', async () => {
	vi.mocked(appendSubmissionToSheets).mockRejectedValueOnce(new Error('Sensitive provider request object'));
	const response = await submit();
	expect(response.status).toBe(503);
	expect(response.headers.get('Retry-After')).toBe('60');
	const body = await response.json();
	expect(body).toMatchObject({ success: false, code: 'SUBMISSION_FAILED' });
	expect(JSON.stringify(body)).not.toContain('Sensitive provider');
});
