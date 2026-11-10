import type { FullHusbandrySubmission } from './types';
import { validateModule, type Module } from './validation';

export const shifts = {
	morning: { label: 'LSS + WQ', modules: ['lss', 'waterQuality'] },
	noon: { label: 'Eggs + Feeds', modules: ['tanksEggs', 'feeds'] }
} satisfies Record<string, { label: string; modules: Module[] }>;

export type Shift = keyof typeof shifts;
export type Forms = Required<Pick<FullHusbandrySubmission, Module>>;

/** Only include completed, explicitly selected modules; never attach the other shift's drafts. */
export function createEntryPayload(modules: Module[], forms: Forms, date: string, initials: string): FullHusbandrySubmission {
	if (!modules.length || modules.some(module => validateModule(module, forms[module]).length)) {
		throw new Error('Complete all required answers in the selected sections before saving.');
	}
	return {
		id: 'sub_' + crypto.randomUUID(),
		submittedAt: new Date().toISOString(),
		date,
		initials: initials || 'Lab Member',
		modulesSubmitted: [...modules],
		...Object.fromEntries(modules.map(module => [module, forms[module]]))
	};
}
