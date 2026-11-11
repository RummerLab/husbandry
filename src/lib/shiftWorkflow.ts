import type { FullHusbandrySubmission, LSSData, TanksEggsData, FeedsData, WaterQualityData } from './types';
import { createEmptyForms, createLSSPart } from './formDefaults';
import { validateModule, type Module } from './validation';

/** A step is one section of a shift entry. AM and PM LSS are separate halves of the same LSS module. */
export type Step = 'lssAM' | 'lssPM' | 'tanksEggs' | 'feeds' | 'waterQuality';
export type StepForms = { lssAM: LSSData; lssPM: LSSData; tanksEggs: TanksEggsData; feeds: FeedsData; waterQuality: WaterQualityData };

export const stepModule: Record<Step, Module> = { lssAM: 'lss', lssPM: 'lss', tanksEggs: 'tanksEggs', feeds: 'feeds', waterQuality: 'waterQuality' };
export const stepLabels: Record<Step, string> = { lssAM: 'AM LSS', lssPM: 'PM LSS', tanksEggs: 'Tanks + Eggs', feeds: 'Feeds', waterQuality: 'Water Quality' };

export const shifts = {
	morning: { label: 'AM: LSS + WQ', steps: ['lssAM', 'waterQuality'] },
	// PM LSS comes first so someone doing only the PM checks can save it without Eggs + Feeds.
	noon: { label: 'PM: LSS, Eggs + Feeds', steps: ['lssPM', 'tanksEggs', 'feeds'] }
} satisfies Record<string, { label: string; steps: Step[] }>;

export type Shift = keyof typeof shifts;

export function createEmptyStepForms(date: string, initials = ''): StepForms {
	const forms = createEmptyForms(date, initials);
	return { lssAM: createLSSPart('AM', date, initials), lssPM: createLSSPart('PM', date, initials), tanksEggs: forms.tanksEggs, feeds: forms.feeds, waterQuality: forms.waterQuality };
}

/** Fresh forms for the saved steps; unsaved steps keep their answers. */
export function resetSubmittedSteps(current: StepForms, submitted: Step[], date: string, initials: string): StepForms {
	const fresh = createEmptyStepForms(date, initials);
	return Object.fromEntries((Object.keys(current) as Step[]).map(step => [step, submitted.includes(step) ? fresh[step] : current[step]])) as StepForms;
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
	return {
		id: 'sub_' + crypto.randomUUID(),
		submittedAt: new Date().toISOString(),
		date,
		initials: initials || 'Lab Member',
		modulesSubmitted: modules,
		...Object.fromEntries(steps.map(step => [stepModule[step], forms[step]]))
	};
}
