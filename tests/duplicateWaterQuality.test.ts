import { expect, it } from 'vitest';
import { brisbaneTime, waterQualitySavedOn } from '../src/lib/recordRules';

const item = (id: string, date: string, modules: string[], submittedAt: string) => ({ id, submittedAt, payload: { date, modulesSubmitted: modules } });

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

it('shows save times in Room 12 local time', () => {
	expect(brisbaneTime('2026-11-09T00:30:00Z')).toMatch(/10:30/);
	expect(brisbaneTime('not a date')).toBe('');
});
