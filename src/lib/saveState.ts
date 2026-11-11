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
