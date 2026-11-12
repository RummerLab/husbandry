import { describe, it, expect } from 'vitest';
import { room12Date, canNavigate, isOffDay } from '../src/lib/recordRules';
import { validateModule, validateSubmission, lssChecks, weeklyFields } from '../src/lib/validation';
import { formatLSSConcerns, formatLSSRow, formatTanksEggsRow, formatFeedsRow, formatWaterQualityRow } from '../src/lib/server/rows';
import { ROOM12_TANKS } from '../src/lib/tanksConfig';
import type { LSSData, TanksEggsData, FeedsData, WaterQualityData } from '../src/lib/types';

const water = { date: '2026-11-07', initials: 'AB', isWeeklyCheck: false, tempA: '26', tempB: '26', pHA: '8', pHB: '8', salinityA: '36', salinityB: '36', doA: '/', doB: '/', notes: 'test' };
describe('record integrity', () => {
	it.each(['2026-11-06T14:01:00Z', '2026-11-06T23:59:00Z', '2026-11-07T00:00:00Z'])('uses Brisbane date at %s', instant => expect(room12Date(new Date(instant))).toBe('2026-11-07'));
	it('blocks jumps over incomplete steps and permits going back', () => {
		expect(canNavigate(1, 4, [false, true, true, true])).toBe(false);
		expect(canNavigate(2, 4, [true, true, false, true])).toBe(false);
		expect(canNavigate(4, 1, [false, false, false, false])).toBe(true);
		expect(canNavigate(1, 4, [true, true, true, false])).toBe(true);
	});
	it.each(['lss', 'tanksEggs', 'feeds', 'waterQuality'] as const)('requires observations for %s', module => expect(validateModule(module, { date: water.date, initials: 'AB', amInitials: 'AB' }).length).toBeGreaterThan(0));
	it('validates weekly pH and rejects malformed numeric data', () => {
		expect(validateModule('waterQuality', water)).toEqual([]);
		expect(validateModule('waterQuality', { ...water, isWeeklyCheck: true })).not.toEqual([]);
		const weekly = { ...water, isWeeklyCheck: true, ...Object.fromEntries(weeklyFields.map(f => [f, '0'])) };
		expect(validateModule('waterQuality', weekly)).toEqual([]);
		expect(validateModule('waterQuality', { ...weekly, weeklypHA: '' })).not.toEqual([]);
		expect(validateModule('waterQuality', { ...water, tempA: 'NaN' })).not.toEqual([]);
	});
	it('rejects invalid envelopes without throwing', () => {
		for (const value of [null, [], { modulesSubmitted: 'feeds' }, { modulesSubmitted: ['bogus'] }, { modulesSubmitted: [null] }]) expect(validateSubmission(value).length).toBeGreaterThan(0);
		const payload = { id: 'sub_test', date: water.date, submittedAt: '2026-11-07T00:00:00Z', modulesSubmitted: ['waterQuality'], waterQuality: water };
		expect(validateSubmission(payload)).toEqual([]);
		expect(validateSubmission({ ...payload, date: '2026-11-08' })).not.toEqual([]);
	});
	it('requires explicit medication and uneaten feed', () => {
		const tanks = Object.fromEntries(ROOM12_TANKS.map(t => [t.id, { amountFed: '0', uneatenGrams: '0', meds: Object.fromEntries(t.sharks.map(s => [s.medId!, 'N'])) }]));
		expect(validateModule('feeds', { date: water.date, initials: 'AB', tanks })).toEqual([]);
		delete tanks.tank1.meds['103'];
		expect(validateModule('feeds', { date: water.date, initials: 'AB', tanks })).not.toEqual([]);
	});
});
describe('spreadsheet contracts', () => {
	it('keeps operational widths and final notes columns', () => {
		const lss = { date: water.date, amInitials: 'AB', notes: 'last', ...Object.fromEntries(lssChecks.map(f => [f, 'N'])) } as unknown as LSSData;
		const eggs = { date: water.date, initials: 'AB', moveQty: 'last' } as TanksEggsData;
		const feeds = { date: water.date, initials: 'AB', tanks: {}, notes: 'last' } as FeedsData;
		for (const [row, width, last] of [[formatLSSRow(lss), 21, 'last'], [formatTanksEggsRow(eggs), 21, 'last'], [formatFeedsRow(feeds), 84, 'last'], [formatWaterQualityRow(water), 23, 'test']] as const) {
			expect(row).toHaveLength(width); expect(row.at(-1)).toBe(last); expect(row[0]).toBe(water.date);
		}
	});
	it('leaves unperformed chemistry blank, retaining explicitly measured zero', () => {
		expect(formatWaterQualityRow({ ...water, nh3A: '5' }).slice(10, 22)).toEqual(Array(12).fill(''));
		const weekly = { ...water, isWeeklyCheck: true, ...Object.fromEntries(weeklyFields.map(f => [f, '0'])) } as WaterQualityData;
		expect(formatWaterQualityRow(weekly).slice(10, 22)).toEqual(Array(12).fill('0'));
	});
	it('records weekly chemistry on its own without routine readings (#133)', () => {
		const chemistry = { ...water, isWeeklyCheck: true, routineIncluded: false, ...Object.fromEntries(weeklyFields.map(f => [f, '0'])) } as WaterQualityData;
		expect(validateModule('waterQuality', chemistry)).toEqual([]);
		// Routine columns stay blank even when the draft still holds earlier answers.
		expect(formatWaterQualityRow({ ...chemistry, tempA: '26', doA: '/' }).slice(2, 10)).toEqual(Array(8).fill(''));
		expect(formatWaterQualityRow(chemistry).slice(10, 22)).toEqual(Array(12).fill('0'));
		// Pre-upgrade records without the flag keep the full routine contract.
		expect(validateModule('waterQuality', { ...water, routineIncluded: undefined })).toEqual([]);
	});
});
describe('daily animal welfare check', () => {
	const lss = { date: water.date, amInitials: 'AB', pmInitials: '', concerns: '', notes: '', ...Object.fromEntries(lssChecks.map(f => [f, 'N/A'])) } as unknown as LSSData;
	it('requires the animal check on new forms and concerns when it fails', () => {
		expect(validateModule('lss', { ...lss, animalsChecked: '' })).not.toEqual([]);
		expect(validateModule('lss', { ...lss, animalsChecked: 'Y' })).toEqual([]);
		expect(validateModule('lss', { ...lss, animalsChecked: 'N' })).not.toEqual([]);
		expect(validateModule('lss', { ...lss, animalsChecked: 'N', concerns: 'Redness on a shark in tank 3' })).toEqual([]);
		expect(validateModule('lss', { ...lss, animalsChecked: 'N/A' })).not.toEqual([]);
	});
	it('still accepts pre-upgrade queued records without the field', () => expect(validateModule('lss', lss)).toEqual([]));
	it('records the answer in the existing concerns column', () => {
		expect(formatLSSConcerns({ ...lss, animalsChecked: 'Y' })).toBe('All animals sighted & normal: Y');
		expect(formatLSSConcerns({ ...lss, animalsChecked: 'N', concerns: 'Redness in tank 3' })).toBe('All animals sighted & normal: N. Redness in tank 3');
		expect(formatLSSConcerns({ ...lss, concerns: 'legacy' })).toBe('legacy');
		expect(formatLSSRow({ ...lss, animalsChecked: 'Y' })).toHaveLength(21);
	});
	it.each([['2026-11-09', false], ['2026-11-10', true], ['2026-11-11', false], ['2026-11-13', false], ['2026-11-14', true], ['2026-11-15', true], ['bad', false]] as const)('treats %s as off day: %s', (date, expected) => expect(isOffDay(date)).toBe(expected));
});
