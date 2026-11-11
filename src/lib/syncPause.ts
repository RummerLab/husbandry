import { notifyDeviceQueueChanged } from './deviceEvents';
import { retryDeadline } from './syncPolicy';

const KEY = 'rummerlab_sync_pause';
const AUTH_KEY = 'rummerlab_sync_auth_required';
export type Pause = { until: number; message: string; authentication?: boolean };

/** Independent keys keep authorisation from deleting another tab's cooldown. */
function readCooldown(): Pause | null {
	const raw = localStorage.getItem(KEY);
	if (!raw) return null;
	let pause: Pause | null = null;
	try {
		pause = JSON.parse(raw) as Pause;
	} catch { /* Discard malformed transport metadata, never submission data. */ }
	if (pause && typeof pause.message === 'string' && Number.isFinite(pause.until)) {
		// Upgrade conservatively: retain the deadline of an old combined pause.
		if (pause.authentication) {
			localStorage.setItem(AUTH_KEY, pause.message);
			localStorage.setItem(KEY, JSON.stringify({ until: pause.until, message: 'Sync paused. Records will retry automatically.' }));
		}
		if (pause.until > Date.now()) return { until: pause.until, message: pause.authentication ? 'Sync paused. Records will retry automatically.' : pause.message };
	}
	localStorage.removeItem(KEY); return null;
}
export function getSyncPause(): Pause | null {
	const cooldown = readCooldown();
	const authentication = localStorage.getItem(AUTH_KEY);
	return authentication ? { until: cooldown?.until ?? 0, message: authentication, authentication: true } : cooldown;
}
export function pauseSync(message: string, retryAfter: string | null, authentication = false): void {
	if (authentication) {
		localStorage.setItem(AUTH_KEY, message);
		notifyDeviceQueueChanged();
		return;
	}
	const until = retryDeadline(retryAfter, Date.now(), Math.floor(Math.random() * 3000));
	const previous = readCooldown();
	localStorage.setItem(KEY, JSON.stringify({ until: Math.max(until, previous?.until || 0), message }));
	notifyDeviceQueueChanged();
}
/** Call only after a server-authorized page load, never on a manual Sync click. */
export function resumeAuthenticatedSync(): void {
	readCooldown(); // Upgrade legacy auth before removing only its hold.
	localStorage.removeItem(AUTH_KEY);
	notifyDeviceQueueChanged();
}
