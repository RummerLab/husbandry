export function room12Date(now = new Date()): string {
	const parts = new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Brisbane', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
	const part = (name: string) => parts.find(p => p.type === name)!.value;
	return `${part('year')}-${part('month')}-${part('day')}`;
}

export function canNavigate(current: number, target: number, valid: boolean[]): boolean {
	return Number.isInteger(target) && target >= 1 && target <= valid.length &&
		(target <= current || valid.slice(0, target - 1).every(Boolean));
}
