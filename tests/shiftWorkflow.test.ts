import { expect, it } from 'vitest';
import { createEmptyForms, resetSubmittedForms } from '../src/lib/formDefaults';
import { canNavigate } from '../src/lib/recordRules';
import { createEntryPayload, shifts } from '../src/lib/shiftWorkflow';
import { lssChecks, validateModule, validateSubmission } from '../src/lib/validation';
import { ROOM12_TANKS } from '../src/lib/tanksConfig';

const date = '2026-11-10';
function completeForms() {
	const forms = createEmptyForms(date, 'AB');
	Object.assign(forms.lss, Object.fromEntries(lssChecks.map(key => [key, 'N/A'])), { animalsChecked: 'Y' });
	Object.assign(forms.waterQuality, { tempA: '26', tempB: '26', pHA: '8', pHB: '8', salinityA: '36', salinityB: '36', doA: '/', doB: '/' });
	Object.assign(forms.tanksEggs, {
		...Object.fromEntries(['103', '102', '116', '105', '117'].map(id => [`palpationHO${id}`, 'N/A'])),
		windEggs: '0', newEggs: '0', newEggTag: 'N/A', deadEggTag: 'N/A',
		newEmbryos: 'N', candling: 'N', foodRecordsEnteredPM: 'N', whatsappUpdateAM: 'N', whatsappUpdatePM: 'N'
	});
	forms.feeds.tanks = Object.fromEntries(ROOM12_TANKS.map(tank => [tank.id, {
		amountFed: '0', uneatenGrams: '0', meds: Object.fromEntries(tank.sharks.filter(shark => shark.medId).map(shark => [shark.medId!, 'N']))
	}]));
	return forms;
}

it.each(['morning', 'noon'] as const)('%s saves exactly its pair despite the other shift being unanswered', shift => {
	const forms = completeForms();
	const empty = createEmptyForms(date);
	const other = shift === 'morning' ? 'noon' : 'morning';
	for (const module of shifts[other].modules) Object.assign(forms, { [module]: empty[module] });
	const payload = createEntryPayload(shifts[shift].modules, forms, date, 'AB');
	expect(payload.modulesSubmitted).toEqual(shifts[shift].modules);
	expect(validateSubmission(payload)).toEqual([]);
	for (const module of shifts[other].modules) expect(payload).not.toHaveProperty(module);
	const reset = resetSubmittedForms(forms, payload.modulesSubmitted, date, 'AB');
	for (const module of shifts[other].modules) expect(reset[module]).toBe(forms[module]);
	for (const module of payload.modulesSubmitted) expect(validateModule(module, reset[module]).length).toBeGreaterThan(0);
});

it.each(['morning', 'noon'] as const)('%s locks advancement and rejects an incomplete first or second section', shift => {
	const forms = completeForms();
	const modules = shifts[shift].modules;
	expect(canNavigate(1, 2, modules.map(module => !validateModule(module, forms[module]).length))).toBe(true);
	for (const module of modules) {
		const invalid = { ...forms, [module]: createEmptyForms(date)[module] };
		expect(() => createEntryPayload(modules, invalid, date, 'AB')).toThrow('Complete all required answers');
		if (module === modules[0]) expect(canNavigate(1, 2, modules.map(key => !validateModule(key, invalid[key]).length))).toBe(false);
	}
});

it('keeps daily welfare and concerns required, but allows LSS alone when WQ is not due', () => {
	const forms = completeForms();
	forms.waterQuality = createEmptyForms(date).waterQuality;
	expect(validateSubmission(createEntryPayload(['lss'], forms, date, 'AB'))).toEqual([]);
	forms.lss.animalsChecked = '';
	expect(() => createEntryPayload(['lss'], forms, date, 'AB')).toThrow();
	forms.lss.animalsChecked = 'N';
	expect(() => createEntryPayload(['lss'], forms, date, 'AB')).toThrow();
	forms.lss.concerns = 'Concern recorded for follow-up';
	expect(validateSubmission(createEntryPayload(['lss'], forms, date, 'AB'))).toEqual([]);
});

it('keeps standalone WQ valid without any daily shift answers', () => {
	const forms = createEmptyForms(date, 'AB');
	forms.waterQuality = completeForms().waterQuality;
	expect(validateSubmission(createEntryPayload(['waterQuality'], forms, date, 'AB'))).toEqual([]);
});
