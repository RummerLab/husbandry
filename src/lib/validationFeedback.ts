import type { ModuleIssue } from './validation';
import { enteredInvalidIssues } from './waterQualityGuide';

export type ValidationFeedback = 'pristine' | 'revealed';
export type ValidationEvent = 'reveal' | 'edit' | 'changeContext';
/** Editing recomputes issues without hiding the remaining errors; a new context starts clean. */
export function transitionValidation(state: ValidationFeedback, event: ValidationEvent): ValidationFeedback {
	return event === 'reveal' ? 'revealed' : event === 'changeContext' ? 'pristine' : state;
}
export function visibleModuleIssues(state: ValidationFeedback, issues: ModuleIssue[], values: object, flagEntered = false): ModuleIssue[] {
	return state === 'revealed' ? issues : flagEntered ? enteredInvalidIssues(issues, values) : [];
}
