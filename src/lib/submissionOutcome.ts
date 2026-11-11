/** Wire outcomes shared by the submission API and its durable device queue. */
export const PERMANENT_SUBMISSION_STATUSES = [400, 409, 413, 415, 422] as const;
export type DeliveryState = 'pending' | 'needsReview' | 'synced';
export function deliveryState(record: { synced: boolean; syncBlocked?: boolean }): DeliveryState {
	return record.synced ? 'synced' : record.syncBlocked ? 'needsReview' : 'pending';
}

export type SubmissionOutcome =
	| { kind: 'delivered' }
	| { kind: 'authentication'; message: string }
	| { kind: 'cooldown'; message: string; retryAfter: string | null }
	| { kind: 'needsReview'; message: string }
	| { kind: 'retry'; message: string };
export interface SubmissionResponseInfo {
	status: number; ok: boolean; redirected: boolean; contentType: string | null; retryAfter: string | null;
}

/** Pure HTTP/body contract. Neither connectivity nor mock success proves delivery. */
export function submissionOutcome(response: SubmissionResponseInfo, body: unknown): SubmissionOutcome {
	const loginPage = response.redirected || (response.ok && response.contentType?.toLowerCase().includes('text/html'));
	if (loginPage || response.status === 401 || response.status === 403) return { kind: 'authentication', message: 'Sign in again to sync. All records remain saved on this device.' };
	if (response.status === 429 || response.status === 503) return { kind: 'cooldown', retryAfter: response.retryAfter,
		message: response.status === 429 ? 'Sync paused by rate limit. Records will retry automatically.' : 'Sync temporarily unavailable. Records will retry automatically.' };
	const result = body && typeof body === 'object' ? body as Record<string, unknown> : {};
	const error = typeof result.error === 'string' ? result.error : null;
	if ((PERMANENT_SUBMISSION_STATUSES as readonly number[]).includes(response.status)) return { kind: 'needsReview', message: error || `Submission needs review (HTTP ${response.status}).` };
	if (response.ok && result.success === true && result.mode === 'live') return { kind: 'delivered' };
	return { kind: 'retry', message: result.mode === 'mock' ? 'Mock mode: not written to Google Sheets. Record remains pending.' : error || 'Server did not confirm delivery. Record remains pending.' };
}
