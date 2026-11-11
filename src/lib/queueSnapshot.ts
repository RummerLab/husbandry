import { DEVICE_QUEUE_CHANGED } from './deviceEvents';
import { getLocalHistory, isQueueSyncing } from './storage';
import { getSyncPause } from './syncPause';
import { deliveryState } from './submissionOutcome';
import type { LocalHistoryItem } from './types';

export type QueueSnapshot =
	| { kind: 'unavailable'; message: string }
	| { kind: 'ready'; records: LocalHistoryItem[]; pendingCount: number; reviewCount: number;
		status: 'upToDate' | 'pending' | 'syncing' | 'needsReview' | 'signInRequired' | 'cooldown';
		message: string; retryAt: number | null };

/** A read error is unknown, never an empty or successfully delivered queue. */
export function readQueueSnapshot(): QueueSnapshot {
	try {
		const records = getLocalHistory();
		const pendingCount = records.filter(record => deliveryState(record) !== 'synced').length;
		const reviewCount = records.filter(record => deliveryState(record) === 'needsReview').length;
		const pause = getSyncPause();
		const base = { kind: 'ready' as const, records, pendingCount, reviewCount, retryAt: pause?.until ? pause.until : null };
		if (!pendingCount) return { ...base, status: 'upToDate', message: 'All up to date!' };
		const counts = `${pendingCount} record(s) remain on this device.${reviewCount ? ` ${reviewCount} need administrator review and will not retry automatically.` : ''}`;
		if (pause?.authentication) return { ...base, status: 'signInRequired', message: `Sign in again to resume sync. ${counts}` };
		if (pause) return { ...base, status: 'cooldown', message: `Sync paused until ${new Date(pause.until).toLocaleTimeString()}. ${counts}` };
		if (isQueueSyncing()) return { ...base, status: 'syncing', message: `Syncing pending records. ${counts}` };
		return { ...base, status: reviewCount ? 'needsReview' : 'pending', message: counts };
	} catch {
		return { kind: 'unavailable', message: 'Device records are unavailable or damaged. Keep this device data and contact the lab administrator. Sync status is unknown.' };
	}
}

/** Refresh at each local mutation and on cross-tab writes. */
export function observeDeviceQueue(refresh: () => void): () => void {
	refresh();
	window.addEventListener(DEVICE_QUEUE_CHANGED, refresh);
	window.addEventListener('storage', refresh);
	return () => {
		window.removeEventListener(DEVICE_QUEUE_CHANGED, refresh);
		window.removeEventListener('storage', refresh);
	};
}
