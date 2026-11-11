import { resumeSyncAfterAuthorization } from './authSync';
import { syncPendingSubmissions } from './storage';
import { getSyncPause } from './syncPause';
import { syncEligibility, nextBackoff, nextRetryDelay, INITIAL_RETRY_MS } from './syncPolicy';

/** Runs only while the page is mounted; the device queue survives closing it. */
export function startAutoSync(onStatus: (online: boolean) => void, onError: (error: unknown) => void): () => void {
	let phase: 'idle' | 'authorising' | 'draining' | 'stopped' = 'idle';
	const stopped = () => phase === 'stopped';
	let delay = INITIAL_RETRY_MS;
	let timer: ReturnType<typeof setTimeout>;
	const retry = async (verifyAccess = false) => {
		if (phase !== 'idle') return;
		phase = 'authorising';
		clearTimeout(timer);
		try {
			if (verifyAccess && navigator.onLine) {
				try { await resumeSyncAfterAuthorization(); } catch (error) { if (!stopped()) onError(error); }
			}
			if (stopped()) return;
			if (syncEligibility(navigator.onLine, getSyncPause(), Date.now()).kind === 'ready') {
				phase = 'draining';
				const result = await syncPendingSubmissions();
				delay = nextBackoff(delay, result.errors.length > 0);
			}
		} catch (error) { delay = nextBackoff(delay, true); if (!stopped()) onError(error); }
		if (!stopped()) {
			phase = 'idle';
			onStatus(navigator.onLine);
			let wait = delay;
			try { wait = nextRetryDelay(delay, syncEligibility(navigator.onLine, getSyncPause(), Date.now()), Date.now()); } catch { /* Retry storage reads with bounded backoff. */ }
			timer = setTimeout(() => { void retry(); }, wait);
		}
	};
	const online = () => { onStatus(true); void retry(true); };
	const offline = () => onStatus(false);
	window.addEventListener('online', online);
	window.addEventListener('offline', offline);
	onStatus(navigator.onLine);
	void retry(true);
	return () => { phase = 'stopped'; clearTimeout(timer); window.removeEventListener('online', online); window.removeEventListener('offline', offline); };
}
