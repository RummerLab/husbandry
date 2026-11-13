import { expect, it } from 'vitest';
import { createEmptyForms } from '../src/lib/formDefaults';
import { getModuleIssues, weeklyFields } from '../src/lib/validation';
import { describeWaterQualityIssue, enteredInvalidIssues, sortWaterQualityIssues } from '../src/lib/waterQualityGuide';

const routine = { initials: 'TT', tempA: '26.3', tempB: '26.2', salinityA: '36', salinityB: '36', pHA: '8.2', pHB: '8.25', doA: '98', doB: 'N/A' };

it('requires every routine field, including pH and dissolved oxygen', () => {
	const fields = getModuleIssues('waterQuality', createEmptyForms('2026-11-09').waterQuality).map(issue => issue.field).sort();
	expect(fields).toEqual(['doA', 'doB', 'initials', 'pHA', 'pHB', 'salinityA', 'salinityB', 'tempA', 'tempB']);
	expect(getModuleIssues('waterQuality', { ...createEmptyForms('2026-11-09').waterQuality, ...routine })).toEqual([]);
});

it('requires every weekly field once weekly data is included', () => {
	const data = { ...createEmptyForms('2026-11-09').waterQuality, ...routine, isWeeklyCheck: true };
	expect(getModuleIssues('waterQuality', data).map(issue => issue.field)).toEqual(weeklyFields);
});

it('allows weekly chemistry on its own and still rejects an empty entry', () => {
	const chemistry = {
		...createEmptyForms('2026-11-09').waterQuality,
		initials: 'TT',
		isWeeklyCheck: true,
		routineIncluded: false,
		...Object.fromEntries(weeklyFields.map(f => [f, '0']))
	};
	expect(getModuleIssues('waterQuality', chemistry)).toEqual([]);
	expect(getModuleIssues('waterQuality', { ...chemistry, isWeeklyCheck: false }).map(issue => issue.field)).toEqual(['routineIncluded']);
	expect(describeWaterQualityIssue({ field: 'routineIncluded', message: '' })).toContain('at least one section');
});

it('flags typed-but-invalid values such as "98%" and explains how to correct them', () => {
	const data = { ...createEmptyForms('2026-11-09').waterQuality, ...routine, doA: '98%', pHB: '15', tempA: '' };
	const entered = enteredInvalidIssues(getModuleIssues('waterQuality', data), data);
	expect(entered.map(issue => issue.field)).toEqual(['pHB', 'doA']);
	expect(describeWaterQualityIssue(entered[1])).toBe('Dissolved oxygen (%), Side A: enter a number without % (e.g. 98), or N/A if not measured.');
	expect(describeWaterQualityIssue(entered[0])).toContain('0 to 14');
	expect(describeWaterQualityIssue({ field: 'tempA', message: '' })).toContain('Temperature (°C), Side A');
	expect(describeWaterQualityIssue({ field: 'weeklypHB', message: '' })).toContain('Weekly pH, Side B: enter a number from 0 to 14');
	expect(describeWaterQualityIssue({ field: 'initials', message: '' })).toBe('Analyst initials are required.');
});

it('lists issues in on-screen order', () => {
	const issues = getModuleIssues('waterQuality', createEmptyForms('2026-11-09').waterQuality);
	expect(sortWaterQualityIssues(issues).map(issue => issue.field)).toEqual(['initials', 'tempA', 'tempB', 'salinityA', 'salinityB', 'pHA', 'pHB', 'doA', 'doB']);
});
