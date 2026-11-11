/** Wire outcomes shared by the submission API and its durable device queue. */
export const PERMANENT_SUBMISSION_STATUSES = [400, 409, 413, 415, 422] as const;
export type DeliveryState = 'pending' | 'needsReview' | 'synced';
export function deliveryState(record: { synced: boolean; syncBlocked?: boolean }): DeliveryState {
	return record.synced ? 'synced' : record.syncBlocked ? 'needsReview' : 'pending';
}
