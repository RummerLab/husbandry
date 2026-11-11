import { resumeSyncAfterAuthorization } from './authSync';
import { syncPendingSubmissions } from './storage';

/** Runs only while the page is mounted; the device queue survives closing it. */
export function startAutoSync(onStatus: (online: boolean) => void, onError: (error: unknown) => void): () => void {
	let phase: 'idle' | 'running' | 'stopped' = 'idle';
	const stopped = () => phase === 'stopped';
	let delay = 5000;
	let timer: ReturnType<typeof setTimeout>;
	const retry = async () => {
		if (phase !== 'idle') return;
		phase = 'running';
		clearTimeout(timer);
		try {
			if (navigator.onLine) {
				const result = await syncPendingSubmissions();
				delay = result.errors.length ? Math.min(delay * 2, 60000) : 5000;
			}
		} catch (error) { delay = Math.min(delay * 2, 60000); onError(error); }
		if (!stopped()) { phase = 'idle'; onStatus(navigator.onLine); timer = setTimeout(retry, delay); }
	};
	const resume = async () => {
		try { if (navigator.onLine) await resumeSyncAfterAuthorization(); }
		catch (error) { onError(error); }
		if (phase !== 'stopped') await retry();
	};
	const online = () => { onStatus(true); void resume(); };
	const offline = () => onStatus(false);
	window.addEventListener('online', online);
	window.addEventListener('offline', offline);
	onStatus(navigator.onLine);
	void resume();
	return () => { phase = 'stopped'; clearTimeout(timer); window.removeEventListener('online', online); window.removeEventListener('offline', offline); };
}
