import { expect, it } from 'vitest';
import { parseHomeTab } from '../src/lib/homeTab';

it('parses known home tabs from the query string', () => {
	expect(parseHomeTab('?tab=history')).toBe('history');
	expect(parseHomeTab('?tab=morning')).toBe('morning');
	expect(parseHomeTab('?tab=noon')).toBe('noon');
	expect(parseHomeTab('?tab=offDay')).toBe('offDay');
	expect(parseHomeTab('?tab=waterQuality')).toBe('waterQuality');
	expect(parseHomeTab('?tab=room6')).toBe('room6');
});

it('rejects unknown or missing tabs', () => {
	expect(parseHomeTab('')).toBeNull();
	expect(parseHomeTab('?tab=help')).toBeNull();
	expect(parseHomeTab('?other=history')).toBeNull();
});
