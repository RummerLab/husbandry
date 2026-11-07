import type { LocalHistoryItem } from './types';

export function createSubmissionFeedback(record: Pick<LocalHistoryItem, 'synced' | 'syncError'>, submittedAll: boolean): { type: 'success' | 'pending'; message: string } {
	return record.synced
		? { type: 'success', message: `Successfully submitted to Google Sheets. ${submittedAll ? 'Your submitted fields have' : 'Your submitted section has'} been cleared for the next record.` }
		: { type: 'pending', message: `Saved on this device. Pending sync to Google Sheets. ${record.syncError || 'It will retry when online.'} You can check this record in My Device History.` };
}
