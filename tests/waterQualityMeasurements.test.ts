import { expect, it } from 'vitest';
import { createEmptyForms } from '../src/lib/formDefaults';
import { measurementInputValue, NOT_MEASURED_DISPLAY, toggleNotMeasured, includeRoutineMeasurements } from '../src/lib/waterQualityMeasurements';
import { NOT_MEASURED, validateModule } from '../src/lib/validation';
import { formatWaterQualityRow } from '../src/lib/server/rows';

it('shows a short display label for Not measured without changing the stored value', () => {
	expect(measurementInputValue(NOT_MEASURED)).toBe(NOT_MEASURED_DISPLAY);
	expect(measurementInputValue('8.2')).toBe('8.2');
	expect(NOT_MEASURED_DISPLAY.length).toBeLessThan(NOT_MEASURED.length);
});

it.each(['pH', 'do', 'po4'] as const)('preserves %s A when only B was not measured', prefix => {
	const original = {
		...createEmptyForms('2026-11-11', 'AB').waterQuality,
		tempA: '26', tempB: '26', salinityA: '36', salinityB: '36',
		pHA: '8.2', pHB: '8.1', doA: '98', doB: '98', isWeeklyCheck: true,
		alkA: '116', alkB: '118', weeklypHA: '8.2', weeklypHB: '8.1',
		nh3A: '0', nh3B: '0', no2A: '0', no2B: '0', no3A: '20', no3B: '15', po4A: '1.5', po4B: ''
	};
	const data = toggleNotMeasured(original, `${prefix}B`);
	// Complete the unrelated missing field for the routine pH case.
	if (prefix !== 'po4') data.po4B = '1.8';
	expect(data[`${prefix}A`]).toBe(original[`${prefix}A`]);
	expect(data[`${prefix}B`]).toBe(NOT_MEASURED);
	expect(validateModule('waterQuality', data)).toEqual([]);
	const col = { pH: 4, do: 8, po4: 20 }[prefix];
	expect(formatWaterQualityRow(data).slice(col, col + 2)).toEqual([original[`${prefix}A`], '']);
	const cleared = toggleNotMeasured(data, `${prefix}B`);
	expect(cleared[`${prefix}A`]).toBe(original[`${prefix}A`]);
	expect(cleared[`${prefix}B`]).toBe('');
	expect(validateModule('waterQuality', cleared).join()).toContain(`${prefix}B`);
});

it('keeps temperature and salinity numeric-only', () => {
	const data = createEmptyForms('2026-11-11').waterQuality;
	expect(() => toggleNotMeasured(data, 'tempA')).toThrow();
	expect(() => toggleNotMeasured(data, 'salinityB')).toThrow();
});

it('rejects typed DO N/A and / answers: use the Not measured button instead', () => {
	const data = {
		...createEmptyForms('2026-11-11', 'AB').waterQuality,
		tempA: '26', tempB: '26', salinityA: '36', salinityB: '36', pHA: '8.2', pHB: '8.1', doA: '98', doB: NOT_MEASURED
	};
	expect(validateModule('waterQuality', data)).toEqual([]);
	expect(formatWaterQualityRow(data).slice(8, 10)).toEqual(['98', '']);
	for (const typed of ['N/A', '/', 'N/a']) expect(validateModule('waterQuality', { ...data, doA: typed }).join()).toContain('doA');
});

it('keeps routine draft answers when routine checks are excluded (#133)', () => {
	const data = { ...createEmptyForms('2026-11-11', 'AB').waterQuality, tempA: '26' };
	const excluded = includeRoutineMeasurements(data, false);
	expect(excluded.routineIncluded).toBe(false);
	expect(excluded.tempA).toBe('26');
	expect(includeRoutineMeasurements(excluded, true).routineIncluded).toBe(true);
});
