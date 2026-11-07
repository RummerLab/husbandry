import { afterEach, expect, it, vi } from 'vitest';
import { readSubmissionBody, MAX_SUBMISSION_BYTES } from '../src/lib/server/requestBody';
import { validateSubmission } from '../src/lib/validation';
import { GET as health } from '../src/routes/api/health/+server';
import { POST } from '../src/routes/api/submit/+server';
import { appendSubmissionToSheets } from '../src/lib/server/sheets';
vi.mock('../src/lib/server/sheets', () => ({ appendSubmissionToSheets: vi.fn(), getSheetsConfigStatus: vi.fn() }));
afterEach(() => vi.restoreAllMocks());
const request = (body: string, type = 'application/json') => new Request('https://lab.test/api/submit', { method: 'POST', headers: { 'content-type': type }, body });
it('reads JSON while bounding declared and streamed bytes', async () => {
 expect(await readSubmissionBody(request('{"ok":true}'))).toEqual({ ok: true });
 const declared = request('{}'); declared.headers.set('content-length', String(MAX_SUBMISSION_BYTES + 1));
 await expect(readSubmissionBody(declared)).rejects.toMatchObject({ status: 413 });
 const cancel = vi.fn();
 const stream = new ReadableStream({ start(c) { c.enqueue(new Uint8Array(MAX_SUBMISSION_BYTES + 1)); }, cancel });
 const chunked = new Request('https://lab.test/api/submit', { method: 'POST', headers: { 'content-type': 'application/json' }, body: stream, duplex: 'half' } as RequestInit);
 await expect(readSubmissionBody(chunked)).rejects.toMatchObject({ status: 413 }); expect(cancel).toHaveBeenCalled();
});
it('rejects malformed input and unsupported media before Sheets', async () => {
 for (const [body, type, status] of [['{', 'application/json', 400], ['{}', 'text/plain', 415], ['{}', 'application/json', 422]] as const) {
  const response = await POST({ request: request(body, type) } as Parameters<typeof POST>[0]); expect(response.status).toBe(status);
 }
 expect(appendSubmissionToSheets).not.toHaveBeenCalled();
});
const payload = { id: 'sub_test', date: '2026-11-07', submittedAt: '2026-11-07T00:00:00Z', modulesSubmitted: ['waterQuality'], waterQuality: { date: '2026-11-07', initials: 'AB', isWeeklyCheck: false, tempA: '26', tempB: '26', pHA: '8', pHB: '8', salinityA: '36', salinityB: '36', doA: '/', doB: '/', notes: '' } };
it('accepts legacy fields without mutation, rejects bounded-field violations', () => {
 const legacy = structuredClone({ ...payload, futureField: { bounded: true } }); const before = JSON.stringify(legacy);
 expect(validateSubmission(legacy)).toEqual([]); expect(JSON.stringify(legacy)).toBe(before);
 expect(validateSubmission({ ...payload, clientDeviceId: {} })).toContain('Invalid client device ID');
 expect(validateSubmission({ ...payload, waterQuality: { ...payload.waterQuality, notes: 'a'.repeat(5001) } }).length).toBeGreaterThan(0);
 expect(validateSubmission({ ...payload, initials: 'a'.repeat(33) }).length).toBeGreaterThan(0);
});
it('does not return provider exceptions to clients', async () => {
 vi.mocked(appendSubmissionToSheets).mockRejectedValue(new Error('private provider detail'));
 const log = vi.spyOn(console, 'error').mockImplementation(() => {});
 const response = await POST({ request: request(JSON.stringify(payload)) } as Parameters<typeof POST>[0]);
 expect(response.status).toBe(503); const text = JSON.stringify(await response.json());
 expect(text).toContain('correlationId'); expect(text).not.toContain('private provider detail'); expect(JSON.stringify(log.mock.calls)).not.toContain('private provider detail');
});
it('keeps public health minimal', async () => { expect(await health().json()).toEqual({ status: 'ok', appName: 'RummerLab Room 12 Husbandry App' }); });
