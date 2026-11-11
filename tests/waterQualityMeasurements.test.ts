import { expect, it } from 'vitest';
import { createEmptyForms } from '../src/lib/formDefaults';
import { toggleNotMeasured } from '../src/lib/waterQualityMeasurements';
import { NOT_MEASURED, validateModule } from '../src/lib/validation';
import { formatWaterQualityRow } from '../src/lib/server/rows';

it.each(['pH', 'po4'] as const)('preserves %s A when only B was not measured', prefix => {
	const original = {
		...createEmptyForms('2026-11-11', 'AB').waterQuality,
		tempA: '26', tempB: '26', salinityA: '36', salinityB: '36',
		pHA: '8.2', pHB: '8.1', doA: '98', doB: '98', isWeeklyCheck: true,
		alkA: '116', alkB: '118', weeklypHA: '8.2', weeklypHB: '8.1',
		nh3A: '0', nh3B: '0', no2A: '0', no2B: '0', no3A: '20', no3B: '15', po4A: '1.5', po4B: ''
	};
	const data = toggleNotMeasured(original, `${prefix}B`);
	// Complete the unrelated missing field for the routine pH case.
	if (prefix === 'pH') data.po4B = '1.8';
	expect(data[`${prefix}A`]).toBe(original[`${prefix}A`]);
	expect(data[`${prefix}B`]).toBe(NOT_MEASURED);
	expect(validateModule('waterQuality', data)).toEqual([]);
	const col = prefix === 'pH' ? 4 : 20;
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
