/** Same-tab writes do not emit a browser storage event. Never include record data here. */
export const DEVICE_QUEUE_CHANGED = 'rummerlab:queue-changed';
export function notifyDeviceQueueChanged(): void {
	if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
		window.dispatchEvent(new Event(DEVICE_QUEUE_CHANGED));
	}
}
