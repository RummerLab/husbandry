/** Home-page workflow tabs that can be opened via `/?tab=`. */
export const HOME_TABS = ['morning', 'noon', 'waterQuality', 'history'] as const;
export type HomeTab = (typeof HOME_TABS)[number];

export function parseHomeTab(search: string): HomeTab | null {
	const tab = new URLSearchParams(search).get('tab');
	return HOME_TABS.includes(tab as HomeTab) ? (tab as HomeTab) : null;
}
