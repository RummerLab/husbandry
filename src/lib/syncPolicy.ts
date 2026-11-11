import type { Pause } from './syncPause';

export type SyncEligibility = { kind: 'ready' } | { kind: 'offline' } | { kind: 'authentication' } | { kind: 'cooldown'; retryAt: number };
export function syncEligibility(online: boolean, pause: Pause | null, now: number): SyncEligibility {
	if (!online) return { kind: 'offline' };
	if (pause?.authentication) return { kind: 'authentication' };
	if (pause && pause.until > now) return { kind: 'cooldown', retryAt: pause.until };
	return { kind: 'ready' };
}
export const INITIAL_RETRY_MS = 5000;
export const MAX_RETRY_MS = 60000;
export function nextBackoff(previous: number, failed: boolean): number {
	return failed ? Math.min(previous * 2, MAX_RETRY_MS) : INITIAL_RETRY_MS;
}
export function nextRetryDelay(backoff: number, eligibility: SyncEligibility, now: number): number {
	// Browsers overflow timers above 2^31-1; recheck very long cooldowns at that boundary.
	return Math.min(2147483647, Math.max(backoff, eligibility.kind === 'cooldown' ? eligibility.retryAt - now : 0));
}
export function retryDeadline(retryAfter: string | null, now: number, jitter: number): number {
	const seconds = retryAfter !== null && /^\d+(?:\.\d+)?$/.test(retryAfter.trim()) ? Number(retryAfter) * 1000 : NaN;
	const date = retryAfter ? Date.parse(retryAfter) : NaN;
	const delay = Number.isFinite(seconds) ? seconds : Number.isFinite(date) ? date - now : 60000;
	return now + Math.max(1000, delay) + jitter;
}
