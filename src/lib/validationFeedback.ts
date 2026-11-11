import type { ModuleIssue } from './validation';
import { enteredInvalidIssues } from './waterQualityGuide';

export type ValidationFeedback = 'pristine' | 'revealed';
export function visibleModuleIssues(state: ValidationFeedback, issues: ModuleIssue[], values: object, flagEntered = false): ModuleIssue[] {
	return state === 'revealed' ? issues : flagEntered ? enteredInvalidIssues(issues, values) : [];
}
