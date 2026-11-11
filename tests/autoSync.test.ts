import { afterEach, expect, it, vi } from 'vitest';
import { resumeSyncAfterAuthorization } from '../src/lib/authSync';
import { startAutoSync } from '../src/lib/autoSync';
import { syncPendingSubmissions } from '../src/lib/storage';
vi.mock('../src/lib/authSync', () => ({ resumeSyncAfterAuthorization: vi.fn(async () => {}) }));
vi.mock('../src/lib/storage', () => ({ syncPendingSubmissions: vi.fn() }));
vi.mock('../src/lib/syncPause', () => ({ getSyncPause: vi.fn(() => null) }));
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.clearAllMocks(); });
it('drains on startup and reconnect, backs off, and stops on teardown', async () => {
	vi.useFakeTimers();
	const events = new EventTarget(); const network = { onLine: true };
	vi.stubGlobal('window', events); vi.stubGlobal('navigator', network);
	vi.mocked(syncPendingSubmissions).mockResolvedValue({ syncedCount: 0, errors: ['offline'] });
	const status = vi.fn(); const stop = startAutoSync(status, vi.fn());
	await vi.advanceTimersByTimeAsync(0); expect(syncPendingSubmissions).toHaveBeenCalledTimes(1);
	await vi.advanceTimersByTimeAsync(9999); expect(syncPendingSubmissions).toHaveBeenCalledTimes(1);
	await vi.advanceTimersByTimeAsync(1); expect(syncPendingSubmissions).toHaveBeenCalledTimes(2);
	network.onLine = false; events.dispatchEvent(new Event('offline')); expect(status).toHaveBeenLastCalledWith(false);
	network.onLine = true; events.dispatchEvent(new Event('online')); await vi.advanceTimersByTimeAsync(0); expect(syncPendingSubmissions).toHaveBeenCalledTimes(3);
	stop(); await vi.advanceTimersByTimeAsync(120000); events.dispatchEvent(new Event('online')); expect(syncPendingSubmissions).toHaveBeenCalledTimes(3);
});

it('keeps automatic retries running if checking authentication throws', async () => {
 vi.useFakeTimers(); vi.stubGlobal('window', new EventTarget()); vi.stubGlobal('navigator', { onLine: true });
 vi.mocked(resumeSyncAfterAuthorization).mockRejectedValueOnce(new Error('Storage unavailable'));
 const onError = vi.fn(); const stop = startAutoSync(vi.fn(), onError);
 await vi.advanceTimersByTimeAsync(0);
 expect(onError).toHaveBeenCalled();
 stop();
});

it('does not schedule or publish status after teardown during an in-flight drain', async () => {
	vi.useFakeTimers();
	vi.stubGlobal('window', new EventTarget()); vi.stubGlobal('navigator', { onLine: true });
	let finish!: (result: { syncedCount: number; errors: string[] }) => void;
	vi.mocked(syncPendingSubmissions).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
	const status = vi.fn();
	const stop = startAutoSync(status, vi.fn());
	await vi.advanceTimersByTimeAsync(0);
	stop();
	const calls = status.mock.calls.length;
	finish({ syncedCount: 1, errors: [] });
	await vi.advanceTimersByTimeAsync(120000);
	expect(status).toHaveBeenCalledTimes(calls);
	expect(syncPendingSubmissions).toHaveBeenCalledTimes(1);
});

it('coalesces reconnect storms while authorising and caps repeated-failure backoff', async () => {
	vi.useFakeTimers(); const events = new EventTarget();
	vi.stubGlobal('window', events); vi.stubGlobal('navigator', { onLine: true });
	let authorised!: () => void;
	vi.mocked(resumeSyncAfterAuthorization).mockImplementationOnce(() => new Promise(resolve => { authorised = resolve; }));
	vi.mocked(syncPendingSubmissions).mockResolvedValue({ syncedCount: 0, errors: ['Network unavailable'] });
	const stop = startAutoSync(vi.fn(), vi.fn());
	for (let i = 0; i < 20; i++) events.dispatchEvent(new Event('online'));
	expect(resumeSyncAfterAuthorization).toHaveBeenCalledTimes(1);
	expect(syncPendingSubmissions).not.toHaveBeenCalled();
	authorised(); await vi.advanceTimersByTimeAsync(0);
	for (const interval of [10000, 20000, 40000, 60000, 60000]) await vi.advanceTimersByTimeAsync(interval);
	expect(syncPendingSubmissions).toHaveBeenCalledTimes(6);
	stop();
});
