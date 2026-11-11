import { DEVICE_QUEUE_CHANGED } from './deviceEvents';
import { inspectLocalHistory, isQueueSyncing } from './storage';
import { getSyncPause } from './syncPause';
import { deliveryState } from './submissionOutcome';
import type { LocalHistoryItem } from './types';

export type QueueSnapshot =
	| { kind: 'unavailable'; message: string; records?: LocalHistoryItem[] }
	| { kind: 'ready'; records: LocalHistoryItem[]; pendingCount: number; reviewCount: number;
		status: 'upToDate' | 'pending' | 'syncing' | 'needsReview' | 'signInRequired' | 'cooldown';
		/** Record counts without the status prompt, for views that render the prompt as a link. */
		message: string; detail: string; retryAt: number | null };

export const SIGN_IN_PROMPT = 'Sign in again to resume sync';

export type QueueStatusTone = 'good' | 'warn' | 'bad';
export function snapshotTone(snapshot: QueueSnapshot): QueueStatusTone {
	if (snapshot.kind === 'unavailable' || snapshot.status === 'needsReview') return 'bad';
	return snapshot.status === 'upToDate' ? 'good' : 'warn';
}

/** A read error is unknown, never an empty or successfully delivered queue. */
export function readQueueSnapshot(): QueueSnapshot {
	try {
		const inspection = inspectLocalHistory();
		if (inspection.state !== 'readable') return { kind: 'unavailable', message: inspection.message, records: inspection.records };
		const records = inspection.records;
		const pendingCount = records.filter(record => deliveryState(record) !== 'synced').length;
		const reviewCount = records.filter(record => deliveryState(record) === 'needsReview').length;
		const pause = getSyncPause();
		const base = { kind: 'ready' as const, records, pendingCount, reviewCount, retryAt: pause?.until ? pause.until : null };
		if (!pendingCount) return { ...base, status: 'upToDate', message: 'All up to date!', detail: '' };
		const counts = `${pendingCount} record(s) remain on this device.${reviewCount ? ` ${reviewCount} need administrator review and will not retry automatically.` : ''}`;
		if (pause?.authentication) return { ...base, status: 'signInRequired', message: `${SIGN_IN_PROMPT}. ${counts}`, detail: counts };
		if (pause) return { ...base, status: 'cooldown', message: `Sync paused until ${new Date(pause.until).toLocaleTimeString()}. ${counts}`, detail: counts };
		if (isQueueSyncing()) return { ...base, status: 'syncing', message: `Syncing pending records. ${counts}`, detail: counts };
		return { ...base, status: reviewCount ? 'needsReview' : 'pending', message: counts, detail: counts };
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
