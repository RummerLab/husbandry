import type { FullHusbandrySubmission, LSSData, TanksEggsData, FeedsData, WaterQualityData, Room6EggChecksData, Room6WaterQualityData, Room6LssData, Room6AmmoniaData } from './types';
import { createEmptyForms, createLSSPart } from './formDefaults';
import { validateModule, type Module } from './validation';

/** A step is one section of a shift entry. AM and PM LSS are separate halves of the same LSS module. */
export type Step = 'lssAM' | 'lssPM' | 'tanksEggs' | 'feeds' | 'waterQuality' | 'room6Eggs' | 'room6WaterQuality' | 'room6Lss' | 'room6Ammonia';
export type Room6Section = Extract<Step, `room6${string}`>;
export type StepForms = {
	lssAM: LSSData; lssPM: LSSData; tanksEggs: TanksEggsData; feeds: FeedsData; waterQuality: WaterQualityData;
	room6Eggs: Room6EggChecksData; room6WaterQuality: Room6WaterQualityData; room6Lss: Room6LssData; room6Ammonia: Room6AmmoniaData;
};

export const stepModule: Record<Step, Module> = {
	lssAM: 'lss', lssPM: 'lss', tanksEggs: 'tanksEggs', feeds: 'feeds', waterQuality: 'waterQuality',
	room6Eggs: 'room6Eggs', room6WaterQuality: 'room6WaterQuality', room6Lss: 'room6Lss', room6Ammonia: 'room6Ammonia'
};
export const stepLabels: Record<Step, string> = {
	lssAM: 'AM LSS', lssPM: 'PM LSS', tanksEggs: 'Tanks + Eggs', feeds: 'Feeds', waterQuality: 'Water Quality',
	room6Eggs: 'Room 6 Egg Checks', room6WaterQuality: 'Room 6 Water Quality', room6Lss: 'Room 6 LSS', room6Ammonia: 'Room 6 Ammonia + Nitrite'
};

/** Room 6 sections (#99). Each is a standalone entry saved on its own: they happen at different times. */
export const ROOM6_SECTIONS: { step: Room6Section; label: string; hint: string }[] = [
	{ step: 'room6Eggs', label: '🥚 Egg Checks', hint: 'Candling, wind, new, developing and dead eggs, with IDs.' },
	{ step: 'room6WaterQuality', label: '💧 Water Quality', hint: 'Temperature, salinity and pH, plus DO and chemistry when tested.' },
	{ step: 'room6Lss', label: '🧽 LSS + Maintenance', hint: 'Tank cleans, sump, biofilter, flows and gutters.' },
	{ step: 'room6Ammonia', label: '🧪 Ammonia + Nitrite', hint: 'Quick timed check; save one each time you test.' }
];

export const shifts = {
	morning: { label: 'AM: LSS + WQ', steps: ['lssAM', 'waterQuality'] },
	// PM LSS comes first so someone doing only the PM checks can save it without Eggs + Feeds.
	noon: { label: 'PM: LSS, Eggs + Feeds', steps: ['lssPM', 'tanksEggs', 'feeds'] },
	// #78: off-days (Tue/Thu/Sat/Sun) need only the daily minimum. It reuses the AM LSS draft, so required
	// fields are identical to the AM shift; water quality is saved with it only when due.
	offDay: { label: 'Off-day check', steps: ['lssAM', 'waterQuality'] }
} satisfies Record<string, { label: string; steps: Step[] }>;

export type Shift = keyof typeof shifts;

export function createEmptyStepForms(date: string, initials = ''): StepForms {
	const forms = createEmptyForms(date, initials);
	return {
		lssAM: createLSSPart('AM', date, initials), lssPM: createLSSPart('PM', date, initials), tanksEggs: forms.tanksEggs, feeds: forms.feeds, waterQuality: forms.waterQuality,
		room6Eggs: forms.room6Eggs, room6WaterQuality: forms.room6WaterQuality, room6Lss: forms.room6Lss, room6Ammonia: forms.room6Ammonia
	};
}

/** Fresh forms for the saved steps; unsaved steps keep their answers. */
export function resetSubmittedSteps(current: StepForms, submitted: Step[], date: string, initials: string): StepForms {
	const fresh = createEmptyStepForms(date, initials);
	return Object.fromEntries((Object.keys(current) as Step[]).map(step => [step, submitted.includes(step) ? fresh[step] : current[step]])) as StepForms;
}

/**
 * Untouched drafts (identical to an empty form apart from the date) follow a completed shift's
 * rollover, so a tablet left open overnight cannot save the other shift under yesterday's date.
 * Drafts with any answer keep their own date.
 */
export function rollPristineDrafts(current: StepForms, date: string, initials: string): StepForms {
	const empty = createEmptyStepForms(date, initials);
	const same = (a: object, b: object) => JSON.stringify({ ...a, date }) === JSON.stringify({ ...b, date });
	return Object.fromEntries((Object.keys(current) as Step[]).map(step => [step, same(current[step], empty[step]) ? empty[step] : current[step]])) as StepForms;
}

export function stepValid(step: Step, forms: StepForms): boolean {
	return validateModule(stepModule[step], forms[step]).length === 0;
}

/** Only include completed, explicitly selected steps; never attach the other shift's drafts. */
export function createEntryPayload(steps: Step[], forms: StepForms, date: string, initials: string): FullHusbandrySubmission {
	const modules = steps.map(step => stepModule[step]);
	if (!steps.length || new Set(modules).size !== modules.length || steps.some(step => !stepValid(step, forms))) {
		throw new Error('Complete all required answers in the selected sections before saving.');
	}
	if (steps.some(step => forms[step].date !== date)) throw new Error('These sections have different record dates. Choose Date of Records to apply the intended date to this workflow before saving.');
	return {
		id: 'sub_' + crypto.randomUUID(),
		submittedAt: new Date().toISOString(),
		date,
		initials: initials || 'Lab Member',
		modulesSubmitted: modules,
		...Object.fromEntries(steps.map(step => [stepModule[step], forms[step]]))
	};
}
