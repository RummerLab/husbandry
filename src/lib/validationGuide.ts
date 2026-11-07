import type { ModuleIssue } from './validation';
const SUMMARY = 'step-validation-summary';

/** Mark from the same structured issues used by the server, never inferred from CSS. */
export function markInvalidFields(root: HTMLElement, issues: ModuleIssue[]): void {
	const invalid = new Set(issues.map(issue => issue.field));
	for (const field of root.querySelectorAll<HTMLElement>('[data-field]')) {
		const marked = invalid.has(field.dataset.field || '');
		const descriptions = (field.getAttribute('aria-describedby') || '').split(/\s+/).filter(id => id && id !== SUMMARY);
		if (marked) { field.setAttribute('aria-invalid', 'true'); descriptions.push(SUMMARY); }
		else field.removeAttribute('aria-invalid');
		if (descriptions.length) field.setAttribute('aria-describedby', descriptions.join(' '));
		else field.removeAttribute('aria-describedby');
	}
}

export function focusFirstInvalidField(root: HTMLElement): void {
	const field = root.querySelector<HTMLElement>('[data-field][aria-invalid="true"]');
	if (!field) return;
	const target = field.matches('input, textarea, select, button') ? field : field.querySelector<HTMLElement>('button, input, textarea, select');
	target?.focus({ preventScroll: true });
	field.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}
