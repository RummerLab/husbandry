import { afterEach, expect, it, vi } from 'vitest';
import { startAutoSync } from '../src/lib/autoSync';
import { syncPendingSubmissions } from '../src/lib/storage';
vi.mock('../src/lib/authSync', () => ({ resumeSyncAfterAuthorization: vi.fn(async () => {}) }));
vi.mock('../src/lib/storage', () => ({ syncPendingSubmissions: vi.fn() }));
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
