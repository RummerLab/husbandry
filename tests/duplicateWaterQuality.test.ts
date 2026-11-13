import { expect, it } from 'vitest';
import { brisbaneTime, waterQualityChemistrySavedOn, waterQualitySavedOn } from '../src/lib/recordRules';

const item = (id: string, date: string, modules: string[], submittedAt: string, waterQuality?: { isWeeklyCheck?: boolean; initials?: string }) => ({ id, submittedAt, payload: { date, modulesSubmitted: modules, waterQuality } });

it('finds the latest Water Quality record saved on this device for the date', () => {
	const history = [
		item('a', '2026-11-09', ['lss'], '2026-11-09T00:00:00Z'),
		item('b', '2026-11-09', ['waterQuality'], '2026-11-09T01:00:00Z'),
		item('c', '2026-11-09', ['lss', 'tanksEggs', 'feeds', 'waterQuality'], '2026-11-09T03:00:00Z'),
		item('d', '2026-11-08', ['waterQuality'], '2026-11-09T04:00:00Z')
	];
	expect(waterQualitySavedOn(history, '2026-11-09')?.id).toBe('c');
	expect(waterQualitySavedOn(history, '2026-11-08')?.id).toBe('d');
	expect(waterQualitySavedOn(history, '2026-11-10')).toBeUndefined();
	expect(waterQualitySavedOn([item('e', '2026-11-09', ['lss'], '2026-11-09T00:00:00Z')], '2026-11-09')).toBeUndefined();
});

it('finds weekly chemistry saved earlier the same day, whichever order the entries were saved in (#133)', () => {
	const chemistryFirst = [
		item('chem', '2026-11-12', ['waterQuality'], '2026-11-12T00:10:00Z', { isWeeklyCheck: true, initials: 'AB' }),
		item('routine', '2026-11-12', ['waterQuality'], '2026-11-12T02:30:00Z', { isWeeklyCheck: false, initials: 'CD' }),
		item('routine-only-yesterday', '2026-11-11', ['waterQuality'], '2026-11-11T02:30:00Z', { isWeeklyCheck: false, initials: 'CD' })
	];
	expect(waterQualitySavedOn(chemistryFirst, '2026-11-12')?.id).toBe('routine');
	expect(waterQualityChemistrySavedOn(chemistryFirst, '2026-11-12')?.id).toBe('chem');
	// Chemistry on another date, or no chemistry at all, never suppresses the action.
	expect(waterQualityChemistrySavedOn([chemistryFirst[1]], '2026-11-12')).toBeUndefined();
	expect(waterQualityChemistrySavedOn([chemistryFirst[2]], '2026-11-12')).toBeUndefined();
	// A combined routine + chemistry row counts too.
	expect(waterQualityChemistrySavedOn([item('both', '2026-11-12', ['waterQuality'], '2026-11-12T01:00:00Z', { isWeeklyCheck: true })], '2026-11-12')?.id).toBe('both');
});

it('shows save times in Room 12 local time', () => {
	expect(brisbaneTime('2026-11-09T00:30:00Z')).toMatch(/10:30/);
	expect(brisbaneTime('not a date')).toBe('');
});
