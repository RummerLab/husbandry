import type { FullHusbandrySubmission, LocalHistoryItem } from './types';

const STORAGE_KEY_HISTORY = 'rummerlab_husbandry_local_history';
const STORAGE_KEY_DEVICE = 'rummerlab_device_id';
const STORAGE_KEY_SAVED_INITIALS = 'rummerlab_user_initials';

export function getDeviceId(): string {
	if (typeof window === 'undefined') return 'server';
	let id = localStorage.getItem(STORAGE_KEY_DEVICE);
	if (!id) {
		id = 'device_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
		localStorage.setItem(STORAGE_KEY_DEVICE, id);
	}
	return id;
}

export function getSavedInitials(): string {
	if (typeof window === 'undefined') return '';
	return localStorage.getItem(STORAGE_KEY_SAVED_INITIALS) || '';
}

export function setSavedInitials(initials: string): void {
	if (typeof window === 'undefined') return;
	localStorage.setItem(STORAGE_KEY_SAVED_INITIALS, initials);
}

export function getLocalHistory(): LocalHistoryItem[] {
	if (typeof window === 'undefined') return [];
	try {
		const data = localStorage.getItem(STORAGE_KEY_HISTORY);
		return data ? JSON.parse(data) : [];
	} catch (err) {
		console.error('Failed to parse local history:', err);
		return [];
	}
}

export function saveLocalSubmission(item: LocalHistoryItem): void {
	if (typeof window === 'undefined') return;
	try {
		const history = getLocalHistory();
		// Prepend so latest appears first
		const updated = [item, ...history.filter(h => h.id !== item.id)];
		// Limit to last 100 on device
		localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updated.slice(0, 100)));
	} catch (err) {
		console.error('Failed to save to local history:', err);
	}
}

export function updateLocalHistorySyncStatus(id: string, synced: boolean, error?: string): void {
	if (typeof window === 'undefined') return;
	const history = getLocalHistory();
	const index = history.findIndex(h => h.id === id);
	if (index !== -1) {
		history[index].synced = synced;
		if (error) {
			history[index].syncError = error;
		} else {
			delete history[index].syncError;
		}
		localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
	}
}

export async function syncPendingSubmissions(): Promise<{ syncedCount: number; errors: string[] }> {
	const history = getLocalHistory();
	const pending = history.filter(h => !h.synced);
	let syncedCount = 0;
	const errors: string[] = [];

	for (const item of pending) {
		try {
			const res = await fetch('/api/submit', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(item.payload)
			});
			const result = await res.json();
			if (result.success) {
				updateLocalHistorySyncStatus(item.id, true);
				syncedCount++;
			} else {
				const errMsg = result.error || 'Server error';
				updateLocalHistorySyncStatus(item.id, false, errMsg);
				errors.push(`Item ${item.date}: ${errMsg}`);
			}
		} catch (err) {
			const errMsg = err instanceof Error ? err.message : 'Network error';
			updateLocalHistorySyncStatus(item.id, false, errMsg);
			errors.push(`Item ${item.date}: ${errMsg}`);
		}
	}

	return { syncedCount, errors };
}
