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
export function failSave(state: SaveState, payload: FullHusbandrySubmission, error: unknown): SaveState {
	if (state.kind === 'durable') return state;
	const detail = error instanceof Error ? error.message : 'Storage unavailable';
	return { kind: 'failed', payload, message: `Could not confirm saving. Keep this form open. ${detail}` };
}
