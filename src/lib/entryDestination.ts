import { parseHomeTab, type HomeTab } from './homeTab';
import { isOffDay } from './recordRules';
import { ROOM6_SECTIONS, shifts, type Shift, type Step, type Room6Section } from './shiftWorkflow';

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
export function room6Destination(section: Room6Section = 'room6Eggs'): EntryDestination {
	if (!ROOM6_SECTIONS.some(item => item.step === section)) throw new Error('Invalid Room 6 section');
	return { kind: 'room6', section };
}
export function resolveInitialTab(search: string, date: string): HomeTab {
	return parseHomeTab(search) ?? (isOffDay(date) ? 'offDay' : 'morning');
}
export function destinationForTab(tab: HomeTab, section: Room6Section = 'room6Eggs'): EntryDestination {
	if (tab === 'room6') return room6Destination(section);
	if (tab === 'history' || tab === 'waterQuality') return { kind: tab };
	return shiftDestination(tab);
}
export function destinationTab(destination: EntryDestination): HomeTab {
	return destination.kind === 'shift' ? destination.shift : destination.kind;
}
export function destinationSteps(destination: EntryDestination): Step[] {
	if (destination.kind === 'history') return [];
	if (destination.kind === 'waterQuality') return ['waterQuality'];
	if (destination.kind === 'room6') return [destination.section];
	return shifts[destination.shift].steps;
}
export function activeDestinationStep(destination: EntryDestination): Step | null {
	if (destination.kind === 'history') return null;
	if (destination.kind === 'waterQuality') return 'waterQuality';
	if (destination.kind === 'room6') return destination.section;
	return shifts[destination.shift].steps[destination.step - 1] ?? null;
}
