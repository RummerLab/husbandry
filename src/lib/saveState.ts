import type { FullHusbandrySubmission } from './types';

export type SaveState =
	| { kind: 'editing' }
	| { kind: 'persisting'; payload: FullHusbandrySubmission }
	| { kind: 'failed'; payload: FullHusbandrySubmission; message: string }
	| { kind: 'durable'; id: string };

/** Unchanged answers retry the same identity after an uncertain local storage result. */
export function prepareSave(state: SaveState, candidate: FullHusbandrySubmission): Extract<SaveState, { kind: 'persisting' }> {
	const content = (payload: FullHusbandrySubmission) => JSON.stringify({ ...payload, id: '', submittedAt: '', clientDeviceId: undefined });
	return { kind: 'persisting', payload: state.kind === 'failed' && content(state.payload) === content(candidate) ? state.payload : candidate };
}
export function completeSave(id: string): Extract<SaveState, { kind: 'durable' }> {
	return { kind: 'durable', id };
}
const errorDetail = (error: unknown) => error instanceof Error ? error.message : 'Storage unavailable';
export function failSave(state: SaveState, payload: FullHusbandrySubmission, error: unknown): SaveState {
	if (state.kind === 'durable') return state;
	return { kind: 'failed', payload, message: `Could not confirm saving. Keep this form open. ${errorDetail(error)}` };
}
/**
 * Banner text after a save attempt threw. A durable record must never be described as unsaved:
 * saving the same answers again would create a second record with a new ID.
 */
export function saveErrorMessage(state: SaveState, error: unknown): string {
	if (state.kind === 'failed') return state.message;
	if (state.kind === 'durable') return `Saved on this device (${state.id}), but the form could not be reset. Check My Device History before saving these answers again. ${errorDetail(error)}`;
	return `Could not confirm saving. Keep this form open. ${errorDetail(error)}`;
}
