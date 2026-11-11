import { describe, expect, it } from 'vitest';
import { canNavigate } from '../src/lib/recordRules';
import { createEmptyStepForms, createEntryPayload, resetSubmittedSteps, shifts, stepValid, type StepForms } from '../src/lib/shiftWorkflow';
import { lssAmChecks, lssPmChecks, NOT_MEASURED, validateModule, validateSubmission } from '../src/lib/validation';
import { formatLSSRow, formatWaterQualityRow } from '../src/lib/server/rows';
import { createEmptyForms } from '../src/lib/formDefaults';
import { missingDailyChecks } from '../src/lib/server/insights';
import { ROOM12_TANKS } from '../src/lib/tanksConfig';

const date = '2026-11-10';
function completeForms(): StepForms {
	const forms = createEmptyStepForms(date, 'AB');
	Object.assign(forms.lssAM, Object.fromEntries(lssAmChecks.map(key => [key, 'Y'])), { animalsChecked: 'Y' });
	Object.assign(forms.lssPM, Object.fromEntries(lssPmChecks.map(key => [key, 'N/A'])));
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

it.each(['morning', 'noon'] as const)('%s saves exactly its steps despite the other shift being unanswered', shift => {
	const forms = completeForms();
	const empty = createEmptyStepForms(date);
	const other = shift === 'morning' ? 'noon' : 'morning';
	for (const step of shifts[other].steps) Object.assign(forms, { [step]: empty[step] });
	const steps = shifts[shift].steps;
	const payload = createEntryPayload(steps, forms, date, 'AB');
	expect(validateSubmission(payload)).toEqual([]);
	expect(payload.modulesSubmitted).toHaveLength(steps.length);
	if (shift === 'morning') {
		expect(payload.tanksEggs).toBeUndefined();
		expect(payload.feeds).toBeUndefined();
		expect(payload.lss?.shiftPart).toBe('AM');
	} else {
		expect(payload.waterQuality).toBeUndefined();
		expect(payload.lss?.shiftPart).toBe('PM');
	}
	const reset = resetSubmittedSteps(forms, steps, date, 'AB');
	for (const step of shifts[other].steps) expect(reset[step]).toBe(forms[step]);
	for (const step of steps) expect(stepValid(step, reset)).toBe(false);
});

it.each(['morning', 'noon'] as const)('%s locks advancement and rejects any incomplete section', shift => {
	const forms = completeForms();
	const steps = shifts[shift].steps;
	expect(canNavigate(1, steps.length, steps.map(step => stepValid(step, forms)))).toBe(true);
	for (const step of steps) {
		const invalid = { ...forms, [step]: createEmptyStepForms(date)[step] };
		expect(() => createEntryPayload(steps, invalid, date, 'AB')).toThrow('Complete all required answers');
		if (step === steps[0]) expect(canNavigate(1, 2, steps.map(key => stepValid(key, invalid)))).toBe(false);
	}
});

describe('LSS shift halves', () => {
	it('keeps the daily welfare check and concerns required in AM LSS', () => {
		const forms = completeForms();
		expect(validateSubmission(createEntryPayload(['lssAM'], forms, date, 'AB'))).toEqual([]);
		forms.lssAM.animalsChecked = '';
		expect(() => createEntryPayload(['lssAM'], forms, date, 'AB')).toThrow();
		forms.lssAM.animalsChecked = 'N';
		expect(() => createEntryPayload(['lssAM'], forms, date, 'AB')).toThrow();
		forms.lssAM.concerns = 'Concern recorded for follow-up';
		expect(validateSubmission(createEntryPayload(['lssAM'], forms, date, 'AB'))).toEqual([]);
	});

	it('lets PM LSS be saved alone without AM initials or AM checks', () => {
		const forms = completeForms();
		forms.lssPM.pmInitials = 'CD';
		const payload = createEntryPayload(['lssPM'], forms, date, 'CD');
		expect(validateSubmission(payload)).toEqual([]);
		expect(payload.lss?.amInitials).toBe('');
	});

	it('requires PM initials and every PM item, and rejects answers from the other shift', () => {
		const forms = completeForms();
		forms.lssPM.pmInitials = '';
		expect(validateModule('lss', forms.lssPM).join()).toContain('pmInitials');
		forms.lssPM.pmInitials = 'CD';
		forms.lssPM.filterCleaned = '';
		expect(validateModule('lss', forms.lssPM).join()).toContain('filterCleaned');
		forms.lssPM.filterCleaned = 'Y';
		expect(validateModule('lss', { ...forms.lssPM, waterLevelsAM: 'Y' }).join()).toContain('other shift');
		expect(validateModule('lss', { ...forms.lssAM, filterCleaned: 'Y' }).join()).toContain('other shift');
		expect(validateModule('lss', { ...forms.lssAM, shiftPart: 'Night' }).join()).toContain('AM or PM');
	});

	it('writes blank cells for the other shift instead of default answers', () => {
		const forms = completeForms();
		const am = formatLSSRow(forms.lssAM);
		const pm = formatLSSRow({ ...forms.lssPM, pmInitials: 'CD' });
		expect(am).toHaveLength(21);
		expect(pm).toHaveLength(21);
		expect(am[2]).toBe(''); // PM initials
		expect(am[5]).toBe(''); // Filter cleaned (PM)
		expect(am[7]).toBe('Y'); // Water levels AM
		expect(am[8]).toBe(''); // Water levels PM
		expect(String(am[19])).toContain('All animals sighted & normal: Y');
		expect(pm[1]).toBe(''); // AM initials
		expect(pm[7]).toBe(''); // Water levels AM
		expect(pm[8]).toBe('N/A'); // Water levels PM
		expect(pm[19]).toBe(''); // No welfare answer on the PM row
	});

	it('does not count a PM-only row as the daily welfare check in Lab Overview', () => {
		const forms = completeForms();
		const pmRow = formatLSSRow({ ...forms.lssPM, pmInitials: 'CD' }).map(String);
		expect(missingDailyChecks([pmRow], date, 1)).toEqual([date]);
		expect(missingDailyChecks([formatLSSRow(forms.lssAM).map(String)], date, 1)).toEqual([]);
	});

	it('keeps pre-split records valid as before', () => {
		const legacy = { ...createEmptyForms(date, 'AB').lss, animalsChecked: 'Y' as const, ...Object.fromEntries([...lssAmChecks, ...lssPmChecks].map(key => [key, 'Y'])) };
		expect(validateModule('lss', legacy)).toEqual([]);
		expect(validateModule('lss', { ...legacy, waterLevelsPM: '' }).length).toBeGreaterThan(0);
	});
});

describe('Water Quality "Not measured"', () => {
	it('accepts Not measured for pH and weekly tests and exports blank cells', () => {
		const forms = completeForms();
		Object.assign(forms.waterQuality, {
			pHA: NOT_MEASURED, pHB: NOT_MEASURED, isWeeklyCheck: true,
			alkA: '116', alkB: '118', weeklypHA: NOT_MEASURED, weeklypHB: NOT_MEASURED, nh3A: '0', nh3B: '0',
			no2A: '0', no2B: '0', no3A: '20', no3B: '15', po4A: NOT_MEASURED, po4B: NOT_MEASURED
		});
		expect(validateModule('waterQuality', forms.waterQuality)).toEqual([]);
		const row = formatWaterQualityRow(forms.waterQuality);
		expect(row[4]).toBe(''); // pH A
		expect(row[10]).toBe('116'); // Alk A
		expect(row[12]).toBe(''); // weekly pH A
		expect(row[20]).toBe(''); // PO4 A
		expect(row).not.toContain(NOT_MEASURED);
	});

	it('still requires temperature and salinity readings and an answer for every other field', () => {
		const wq = completeForms().waterQuality;
		expect(validateModule('waterQuality', { ...wq, tempA: NOT_MEASURED }).join()).toContain('tempA');
		expect(validateModule('waterQuality', { ...wq, salinityB: NOT_MEASURED }).join()).toContain('salinityB');
		expect(validateModule('waterQuality', { ...wq, pHA: '' }).join()).toContain('pHA');
		expect(validateModule('waterQuality', { ...wq, isWeeklyCheck: true }).join()).toContain('po4A');
	});

	it('keeps standalone WQ valid without any daily shift answers', () => {
		const forms = createEmptyStepForms(date, 'AB');
		forms.waterQuality = completeForms().waterQuality;
		expect(validateSubmission(createEntryPayload(['waterQuality'], forms, date, 'AB'))).toEqual([]);
	});
});
