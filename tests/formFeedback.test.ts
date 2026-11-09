import { afterEach, expect, it, vi } from 'vitest';
import { createEmptyForms, resetSubmittedForms } from '../src/lib/formDefaults';
import { createSubmissionFeedback } from '../src/lib/submissionFeedback';
import { getModuleIssues, validateModule, modules, lssChecks } from '../src/lib/validation';
import { markInvalidFields, focusFirstInvalidField } from '../src/lib/validationGuide';
afterEach(() => vi.unstubAllGlobals());
it('creates fresh unanswered forms and resets only submitted sections', () => {
 const original = createEmptyForms('2026-11-07', 'AB'); original.tanksEggs.observationsNotes = 'Keep unsent observations'; original.lss.notes = 'Submitted';
 const next = resetSubmittedForms(original, ['lss'], '2026-11-07', 'AB');
 expect(next.lss.notes).toBe(''); expect(next.lss.amInitials).toBe('AB'); expect(next.tanksEggs).toBe(original.tanksEggs); expect(next.tanksEggs.observationsNotes).toBe('Keep unsent observations');
 const fresh = resetSubmittedForms(original, [...modules], '2026-11-08', 'AB');
 expect(fresh.lss.date).toBe('2026-11-08'); expect(fresh.feeds.tanks).toEqual({}); expect(fresh.waterQuality.isWeeklyCheck).toBe(false);
 for (const module of modules) expect(validateModule(module, fresh[module]).length).toBeGreaterThan(0);
 expect(original.lss.notes).toBe('Submitted');
});
it('shows success only for confirmed live sync and distinct pending feedback otherwise', () => {
 expect(createSubmissionFeedback({ synced: true }, true)).toMatchObject({ type: 'success', message: expect.stringContaining('Successfully submitted') });
 for (const syncError of [undefined, 'offline', 'Mock mode', 'Server rejected']) {
  const result = createSubmissionFeedback({ synced: false, syncError }, false);
  expect(result.type).toBe('pending'); expect(result.message).toContain('Pending sync'); expect(result.message).not.toContain('Successfully submitted');
 }
});
it('structured issues match authoritative validation and point at individual fields', () => {
 const forms = createEmptyForms('2026-11-07');
 const issues = getModuleIssues('lss', forms.lss);
 expect(issues.map(issue => issue.message)).toEqual(validateModule('lss', forms.lss)); expect(issues[0].field).toBe('amInitials');
 forms.lss.amInitials = 'AB'; forms.lss.animalsChecked = 'Y'; for (const key of lssChecks) (forms.lss as unknown as Record<string,string>)[key] = 'N';
 expect(getModuleIssues('lss', forms.lss)).toEqual([]);
 expect(getModuleIssues('tanksEggs', forms.tanksEggs).some(issue => issue.field === 'newEggTag')).toBe(true);
 forms.feeds.tanks.tank1 = { amountFed:'0', uneatenGrams:'0', meds:{} };
 expect(getModuleIssues('feeds', forms.feeds).some(issue => issue.field === 'tanks.tank1.meds.107')).toBe(true);
});
it('clears corrected error highlights while retaining existing accessible descriptions', () => {
 const attributes = new Map([['aria-describedby', 'existing-help']]);
 const field = { dataset: { field: 'newEggTag' }, getAttribute: (key:string) => attributes.get(key), setAttribute: (key:string,value:string) => attributes.set(key,value), removeAttribute: (key:string) => attributes.delete(key) };
 const root = { querySelectorAll: () => [field] } as unknown as HTMLElement;
 markInvalidFields(root, [{ field: 'newEggTag', message: 'Required' }]); expect(attributes.get('aria-invalid')).toBe('true'); expect(attributes.get('aria-describedby')).toBe('existing-help step-validation-summary');
 markInvalidFields(root, []); expect(attributes.has('aria-invalid')).toBe(false); expect(attributes.get('aria-describedby')).toBe('existing-help');
});
it('focuses the first invalid radio choice and respects reduced motion', () => {
 const focus = vi.fn(); const scrollIntoView = vi.fn();
 const root = { querySelector: () => ({ matches: () => false, querySelector: () => ({ focus }), scrollIntoView }) } as unknown as HTMLElement;
 vi.stubGlobal('window', { matchMedia: () => ({ matches: true }) });
 focusFirstInvalidField(root); expect(focus).toHaveBeenCalledWith({ preventScroll: true }); expect(scrollIntoView).toHaveBeenCalledWith({ block:'center', behavior:'auto' });
});
