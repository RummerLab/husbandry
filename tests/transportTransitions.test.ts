import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { syncEligibility, nextBackoff, nextRetryDelay, retryDeadline } from '../src/lib/syncPolicy';
import { submissionOutcome, type SubmissionResponseInfo } from '../src/lib/submissionOutcome';

class MemoryStorage {
	data = new Map<string, string>();
	get length() { return this.data.size; }
	key(index: number) { return [...this.data.keys()][index] ?? null; }
	getItem(key: string) { return this.data.get(key) ?? null; }
	setItem(key: string, value: string) { this.data.set(key, value); }
	removeItem(key: string) { this.data.delete(key); }
}
beforeEach(() => { vi.stubGlobal('window', new EventTarget()); vi.stubGlobal('localStorage', new MemoryStorage()); vi.stubGlobal('fetch', vi.fn()); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.resetModules(); });
const payload = { id: 'sub_shared', date: '2026-11-11', submittedAt: '2026-11-11T00:00:00Z', initials: 'TEST', modulesSubmitted: ['waterQuality' as const] };

it.each([[429, 401], [429, 403], [503, 401], [503, 403]])('retains overlapping %i/%i holds from independently loaded tabs', async (limited, unauthorised) => {
	vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-11T00:00:00Z'));
	const tabA = await import('../src/lib/storage');
	vi.resetModules();
	const tabB = await import('../src/lib/storage');
	const authB = await import('../src/lib/authSync');
	const holds = await import('../src/lib/syncPause');
	tabA.persistNewSubmission(payload);
	const original = structuredClone(tabA.getLocalHistory()[0].payload);
	const responses: ((response: Response) => void)[] = [];
	vi.mocked(fetch).mockImplementation(() => new Promise(resolve => responses.push(resolve)));
	const first = tabA.syncPendingSubmissions();
	const second = tabB.syncPendingSubmissions();
	expect(responses).toHaveLength(2); // In-flight ownership is per context, not a false cross-tab lock.
	responses[0](new Response('{}', { status: limited, headers: { 'Retry-After': '120' } }));
	responses[1](new Response('{}', { status: unauthorised }));
	await Promise.all([first, second]);
	const deadline = holds.getSyncPause()!.until;
	expect(holds.getSyncPause()?.authentication).toBe(true);
	vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ authorized: true })));
	await authB.resumeSyncAfterAuthorization();
	expect(holds.getSyncPause()).toMatchObject({ until: deadline });
	expect(holds.getSyncPause()?.authentication).not.toBe(true);
	await tabA.syncPendingSubmissions(); await tabB.syncPendingSubmissions();
	expect(fetch).toHaveBeenCalledTimes(3); // Only the two old requests and access verification.
	vi.advanceTimersByTime(124000);
	vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ success: true, mode: 'live' })));
	await tabB.syncPendingSubmissions();
	expect(tabB.getLocalHistory()[0]).toMatchObject({ synced: true, payload: original });
});

it('retains the immutable record after its request times out', async () => {
	vi.useFakeTimers();
	const storage = await import('../src/lib/storage');
	storage.persistNewSubmission(payload);
	const original = structuredClone(storage.getLocalHistory()[0].payload);
	vi.spyOn(AbortSignal, 'timeout').mockImplementation(ms => {
		const controller = new AbortController();
		setTimeout(() => controller.abort(new Error('Request timed out')), ms);
		return controller.signal;
	});
	vi.mocked(fetch).mockImplementation((_url, init) => new Promise((_resolve, reject) => init!.signal!.addEventListener('abort', () => reject(init!.signal!.reason))));
	const syncing = storage.syncPendingSubmissions();
	await vi.advanceTimersByTimeAsync(30000);
	await syncing;
	expect(storage.getLocalHistory()[0]).toMatchObject({ synced: false, payload: original, syncError: 'Request timed out' });
});

it('selects eligibility and retry time without losing an independent cooldown', () => {
	const now = Date.parse('2026-11-11T00:00:00Z');
	const pause = { until: now + 120000, message: 'Wait' };
	expect(syncEligibility(false, pause, now).kind).toBe('offline');
	expect(syncEligibility(true, { ...pause, authentication: true }, now).kind).toBe('authentication');
	const cooldown = syncEligibility(true, pause, now);
	expect(nextRetryDelay(5000, cooldown, now)).toBe(120000);
	expect(syncEligibility(true, pause, pause.until).kind).toBe('ready');
	expect(nextBackoff(60000, true)).toBe(60000);
	expect(nextBackoff(60000, false)).toBe(5000);
	expect(retryDeadline('120', now, 17)).toBe(now + 120017);
	expect(retryDeadline('Wed, 11 Nov 2026 00:02:00 GMT', now, 0)).toBe(now + 120000);
	expect(retryDeadline(null, now, 0)).toBe(now + 60000);
});

it('classifies every wire outcome before choosing durable queue effects', () => {
	const response = (status: number): SubmissionResponseInfo => ({ status, ok: status >= 200 && status < 300, redirected: false, contentType: 'application/json', retryAfter: null });
	for (const status of [400, 409, 413, 415, 422]) expect(submissionOutcome(response(status), { error: { untrusted: 'object' } })).toMatchObject({ kind: 'needsReview', message: expect.any(String) });
	for (const status of [401, 403]) expect(submissionOutcome(response(status), null).kind).toBe('authentication');
	for (const status of [429, 503]) expect(submissionOutcome({ ...response(status), retryAfter: '120' }, null)).toMatchObject({ kind: 'cooldown', retryAfter: '120' });
	expect(submissionOutcome({ ...response(200), contentType: 'TEXT/HTML; charset=utf-8' }, null).kind).toBe('authentication');
	expect(submissionOutcome(response(200), { success: true, mode: 'live' }).kind).toBe('delivered');
	for (const body of [null, {}, { success: true, mode: 'mock' }, { success: 'true', mode: 'live' }]) expect(submissionOutcome(response(200), body).kind).toBe('retry');
	expect(submissionOutcome(response(500), { success: true, mode: 'live' }).kind).toBe('retry');
});
