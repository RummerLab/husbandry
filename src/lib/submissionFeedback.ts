import type { LocalHistoryItem } from './types';

export function createSubmissionFeedback(record: Pick<LocalHistoryItem, 'synced' | 'syncError' | 'syncBlocked'>, submittedAll: boolean): { type: 'success' | 'pending'; message: string } {
	if (!record.synced && record.syncBlocked) return { type: 'pending', message: 'Saved on this device. Needs administrator review before sync; this record will not retry automatically. Keep this device data and check My Device History.' };
	return record.synced
		? { type: 'success', message: `Successfully submitted to Google Sheets. ${submittedAll ? 'Your submitted fields have' : 'Your submitted section has'} been cleared for the next record.` }
		: { type: 'pending', message: `Saved on this device. Pending sync to Google Sheets. ${record.syncError || 'It will retry when online.'} You can check this record in My Device History.` };
}
