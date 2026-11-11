/** Home-page workflow tabs that can be opened via `/?tab=`. */
export const HOME_TABS = ['morning', 'noon', 'offDay', 'waterQuality', 'room6', 'history'] as const;
export type HomeTab = (typeof HOME_TABS)[number];

export function parseHomeTab(search: string): HomeTab | null {
	const tab = new URLSearchParams(search).get('tab');
	return HOME_TABS.includes(tab as HomeTab) ? (tab as HomeTab) : null;
}

export type RecordingRoom = 'room12' | 'room6';
export type Room12Tab = Exclude<HomeTab, 'room6' | 'history'>;

export function roomForTab(tab: HomeTab): RecordingRoom | null {
	return tab === 'room6' ? 'room6' : tab === 'history' ? null : 'room12';
}

/** Ignore rerenders against the old URL while SvelteKit's asynchronous shallow navigation is pending. */
export function createHomeTabObserver(initialSearch: string, apply: (tab: HomeTab) => void) {
	let previousSearch = initialSearch;
	return (search: string) => {
		if (search === previousSearch) return;
		previousSearch = search;
		const tab = parseHomeTab(search);
		if (tab) apply(tab);
	};
}

/** SvelteKit 3 keeps the full-navigation URL separate from the current shallow URL. */
export function homeTabUrl<T>(page: { url: T; shallow: { url: T } | null }): T {
	return page.shallow?.url ?? page.url;
}
