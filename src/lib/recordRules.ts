export function room12Date(now = new Date()): string {
	const parts = new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Brisbane', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
	const part = (name: string) => parts.find(p => p.type === name)!.value;
	return `${part('year')}-${part('month')}-${part('day')}`;
}

export function canNavigate(current: number, target: number, valid: boolean[]): boolean {
	return Number.isInteger(target) && target >= 1 && target <= valid.length &&
		(target <= current || valid.slice(0, target - 1).every(Boolean));
}

/**
 * Off days are Room 12 dates outside the Mon/Wed/Fri full routine. Animals must still be
 * checked and recorded every day under the animal ethics approval, so off days get a minimum daily check.
 */
export function isOffDay(date: string): boolean {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
	const day = new Date(`${date}T00:00:00Z`).getUTCDay();
	return Number.isFinite(day) && ![1, 3, 5].includes(day);
}

/**
 * Most recent Water Quality record saved on THIS device for the record date (#58).
 * Device-local only: other researchers' submissions are never sent to the browser.
 */
export function waterQualitySavedOn<T extends { submittedAt: string; payload: { date: string; modulesSubmitted: string[] } }>(history: T[], date: string): T | undefined {
	return history
		.filter(item => item.payload?.date === date && item.payload.modulesSubmitted?.includes('waterQuality'))
		.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0];
}

export function brisbaneTime(iso: string): string {
	const d = new Date(iso);
	return isNaN(d.getTime()) ? '' : new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Brisbane', hour: 'numeric', minute: '2-digit' }).format(d);
}
