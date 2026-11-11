import { expect, it } from 'vitest';
import { createEmptyStepForms } from '../src/lib/shiftWorkflow';
import { getModuleIssues, lssAmChecks, NOT_MEASURED } from '../src/lib/validation';
import { transitionValidation, visibleModuleIssues } from '../src/lib/validationFeedback';
import { includeWeeklyMeasurements, toggleNotMeasured, toggleRoom6NotMeasured } from '../src/lib/waterQualityMeasurements';
import { formatWaterQualityRow, formatRoom6WaterQualityRow } from '../src/lib/server/rows';

it('keeps revealed welfare errors until corrected and hides them when the context changes', () => {
	const form = createEmptyStepForms('2026-11-11', 'TEST').lssAM;
	Object.assign(form, Object.fromEntries(lssAmChecks.map(key => [key, 'Y'])), { animalsChecked: 'N' });
	let state = transitionValidation('pristine', 'reveal');
	expect(visibleModuleIssues(state, getModuleIssues('lss', form), form).map(issue => issue.field)).toContain('concerns');
	form.concerns = 'Synthetic concern for transition test';
	state = transitionValidation(state, 'edit');
	expect(state).toBe('revealed');
	expect(visibleModuleIssues(state, getModuleIssues('lss', form), form)).toEqual([]);
	form.concerns = '';
	state = transitionValidation(state, 'changeContext');
	expect(visibleModuleIssues(state, getModuleIssues('lss', form), form)).toEqual([]);
	expect(getModuleIssues('lss', form).map(issue => issue.field)).toContain('concerns'); // Hidden is still invalid.
});

it('adds and removes conditional Room 6 ID and flow-note requirements during editing', () => {
	const forms = createEmptyStepForms('2026-11-11', 'TEST');
	const eggs = { ...forms.room6Eggs, candling: 'Y', windCount: '0', newCount: '0', embryoCount: '0', deadCount: '0' };
	expect(getModuleIssues('room6Eggs', eggs)).toEqual([]);
	eggs.deadCount = '1';
	expect(getModuleIssues('room6Eggs', eggs).map(issue => issue.field)).toEqual(['deadIds']);
	eggs.deadIds = 'SYNTHETIC-EGG';
	expect(getModuleIssues('room6Eggs', eggs)).toEqual([]);
	const lss = { ...forms.room6Lss, sumpWaterChange: 'None', sumpTopUp: 'None', biofilterFlowAir: 'Y', biofilterFlowWater: 'Y', tankFlowAir: 'Y', tankFlowWater: 'Y' };
	expect(getModuleIssues('room6Lss', lss)).toEqual([]);
	lss.tankFlowWater = 'N';
	expect(getModuleIssues('room6Lss', lss).map(issue => issue.field)).toEqual(['notes']);
	lss.notes = 'Synthetic follow-up noted';
	expect(getModuleIssues('room6Lss', lss)).toEqual([]);
});

it('retains weekly drafts through exclusion and keeps each side an explicit independent answer', () => {
	let form = createEmptyStepForms('2026-11-11', 'TEST').waterQuality;
	Object.assign(form, { tempA: '26', tempB: '26', salinityA: '36', salinityB: '36', doA: 'N/A', doB: '/', pHA: '8.2', pHB: '8.1', alkA: '116', po4B: '0' });
	form = includeWeeklyMeasurements(form, true);
	expect(getModuleIssues('waterQuality', form).length).toBeGreaterThan(0);
	form = toggleNotMeasured(form, 'pHB');
	expect(form.pHA).toBe('8.2'); expect(form.pHB).toBe(NOT_MEASURED);
	form = includeWeeklyMeasurements(form, false);
	expect(getModuleIssues('waterQuality', form)).toEqual([]);
	expect(formatWaterQualityRow(form).slice(10, 22)).toEqual(Array(12).fill(''));
	form = includeWeeklyMeasurements(form, true);
	expect(form.alkA).toBe('116'); expect(form.po4B).toBe('0');
	expect(getModuleIssues('waterQuality', { ...form, doA: NOT_MEASURED }).map(issue => issue.field)).toContain('doA');
	expect(() => toggleNotMeasured(form, 'tempA')).toThrow();
	let room6 = createEmptyStepForms('2026-11-11', 'TEST').room6WaterQuality;
	Object.assign(room6, { temp: '26', salinity: '36', pH: '8.1', dissolvedOxygen: '95', alk: '7', weeklypH: '8.1', nh3: '0', no2: '0', no3: '10', po4: '0.2' });
	room6 = toggleRoom6NotMeasured(room6, 'dissolvedOxygen');
	expect(room6.dissolvedOxygen).toBe(NOT_MEASURED);
	expect(getModuleIssues('room6WaterQuality', room6)).toEqual([]);
	expect(formatRoom6WaterQualityRow(room6)[5]).toBe('');
	expect(() => toggleRoom6NotMeasured(room6, 'temp')).toThrow();
	expect(() => toggleRoom6NotMeasured(room6, 'salinity')).toThrow();
});
