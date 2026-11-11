import { expect, it } from 'vitest';
import { parseHomeTab, createHomeTabObserver, homeTabUrl, roomForTab, type HomeTab } from '../src/lib/homeTab';

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

it.each(['waterQuality', 'room6', 'morning', 'noon', 'offDay'] as const)('does not revert a click on %s while the old URL is still visible', target => {
	let visible: HomeTab = 'morning';
	const observe = createHomeTabObserver('?tab=morning', tab => visible = tab);
	visible = target; // immediate user selection, before asynchronous shallow navigation resolves
	observe('?tab=morning'); // a rerender must not restore the previous tab
	expect(visible).toBe(target);
	observe(`?tab=${target}`);
	expect(visible).toBe(target);
	observe('?tab=history'); // genuine URL navigation still changes the view
	expect(visible).toBe('history');
	observe(`?tab=${target}`); // Back navigation
	expect(visible).toBe(target);
});

it('keeps room context distinct from shared device history', () => {
	expect(roomForTab('room6')).toBe('room6');
	for (const tab of ['morning', 'noon', 'offDay', 'waterQuality'] as const) expect(roomForTab(tab)).toBe('room12');
	expect(roomForTab('history')).toBeNull();
});

it('uses the current shallow URL rather than the original page URL when switching back', () => {
	const original = new URL('https://example.test/?tab=morning');
	const shallow = new URL('https://example.test/?tab=waterQuality');
	expect(homeTabUrl({ url: original, shallow: null })).toBe(original);
	expect(homeTabUrl({ url: original, shallow: { url: shallow } })).toBe(shallow);
	// AM differs from the current shallow URL even though it matches the last full navigation.
	expect(homeTabUrl({ url: original, shallow: { url: shallow } }).searchParams.get('tab')).not.toBe('morning');
});
