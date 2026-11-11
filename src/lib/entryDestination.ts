import type { HomeTab } from './homeTab';
import { shifts, type Shift, type Room6Section } from './shiftWorkflow';

export type EntryDestination =
	| { kind: 'shift'; shift: Shift; step: number }
	| { kind: 'waterQuality' }
	| { kind: 'room6'; section: Room6Section }
	| { kind: 'history' };

/** Numeric positions enter state only through this bounds-checked constructor. */
export function shiftDestination(shift: Shift, step = 1): EntryDestination {
	if (!Number.isInteger(step) || step < 1 || step > shifts[shift].steps.length) throw new Error('Invalid workflow step');
	return { kind: 'shift', shift, step };
}
export function destinationForTab(tab: HomeTab, section: Room6Section = 'room6Eggs'): EntryDestination {
	if (tab === 'room6') return { kind: 'room6', section };
	if (tab === 'history' || tab === 'waterQuality') return { kind: tab };
	return shiftDestination(tab);
}
export function destinationTab(destination: EntryDestination): HomeTab {
	return destination.kind === 'shift' ? destination.shift : destination.kind;
}
