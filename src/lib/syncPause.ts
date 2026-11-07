const KEY = 'rummerlab_sync_pause';
type Pause = { until: number; message: string; authentication?: boolean };
export function getSyncPause(): Pause | null {
	const raw = localStorage.getItem(KEY);
	if (!raw) return null;
	try {
		const pause = JSON.parse(raw) as Pause;
		if (pause && typeof pause.message === 'string' && Number.isFinite(pause.until) && (pause.authentication || pause.until > Date.now())) return pause;
	} catch { /* A damaged cooldown is safe to discard; submission data is untouched. */ }
	localStorage.removeItem(KEY); return null;
}
export function pauseSync(message: string, retryAfter: string | null, authentication = false): void {
	const seconds = retryAfter !== null && /^\d+(?:\.\d+)?$/.test(retryAfter.trim()) ? Number(retryAfter) * 1000 : NaN;
	const date = retryAfter ? Date.parse(retryAfter) : NaN;
	const delay = Number.isFinite(seconds) ? seconds : Number.isFinite(date) ? date - Date.now() : 60000;
	const until = Date.now() + Math.max(1000, delay) + Math.floor(Math.random() * 3000);
	const previous = getSyncPause();
	localStorage.setItem(KEY, JSON.stringify({ until: Math.max(until, previous?.until || 0), message, authentication: authentication || previous?.authentication || false }));
}
/** Call only after a server-authorized page load, never on a manual Sync click. */
export function resumeAuthenticatedSync(): void {
	const pause = getSyncPause();
	if (pause?.authentication) localStorage.removeItem(KEY);
}
