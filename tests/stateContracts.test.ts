import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { persistNewSubmission, syncPendingSubmissions, saveLocalSubmission, getLocalHistory, migrateLocalHistory } from '../src/lib/storage';
import { readQueueSnapshot, observeDeviceQueue, snapshotTone } from '../src/lib/queueSnapshot';
import { pauseSync, getSyncPause, resumeAuthenticatedSync } from '../src/lib/syncPause';
import { prepareSave, completeSave, failSave, saveErrorMessage } from '../src/lib/saveState';
import { destinationForTab, destinationTab, shiftDestination, room6Destination, resolveInitialTab, destinationSteps, activeDestinationStep } from '../src/lib/entryDestination';
import { createEmptyStepForms, createEntryPayload, resetSubmittedSteps, rollPristineDrafts } from '../src/lib/shiftWorkflow';
import { getModuleIssues, NOT_MEASURED } from '../src/lib/validation';
import { visibleModuleIssues } from '../src/lib/validationFeedback';
import { measurementAnswer, toggleNotMeasured } from '../src/lib/waterQualityMeasurements';
import { formatWaterQualityRow } from '../src/lib/server/rows';
import { createSubmissionFeedback } from '../src/lib/submissionFeedback';
import type { FullHusbandrySubmission } from '../src/lib/types';

class MemoryStorage {
	data = new Map<string, string>();
	get length() { return this.data.size; }
	key(index: number) { return [...this.data.keys()][index] ?? null; }
	getItem(key: string) { return this.data.get(key) ?? null; }
	setItem(key: string, value: string) { this.data.set(key, value); }
	removeItem(key: string) { this.data.delete(key); }
}
const payload = (id = 'sub_state'): FullHusbandrySubmission => ({ id, submittedAt: '2026-11-11T00:00:00Z', date: '2026-11-11', initials: 'AB', modulesSubmitted: ['waterQuality'], waterQuality: {
	...createEmptyStepForms('2026-11-11', 'AB').waterQuality,
	tempA: '26', tempB: '26', salinityA: '36', salinityB: '36', pHA: '8.2', pHB: '8.1', doA: '98', doB: 'N/A'
} });
beforeEach(() => {
	vi.stubGlobal('window', new EventTarget());
	vi.stubGlobal('localStorage', new MemoryStorage());
	vi.stubGlobal('fetch', vi.fn());
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it('returns a durable receipt without waiting for a backlog, with one identity on local retry', async () => {
	persistNewSubmission(payload('backlog'));
	let finish!: (response: Response) => void;
	vi.mocked(fetch).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })).mockResolvedValue(new Response(JSON.stringify({ success: true, mode: 'live' })));
	const draining = syncPendingSubmissions();
	const current = payload('new_record');
	const record = persistNewSubmission(current);
	expect(record.synced).toBe(false);
	expect(getLocalHistory()).toHaveLength(2);
	expect(persistNewSubmission(current).id).toBe(record.id);
	expect(getLocalHistory()).toHaveLength(2);
	finish(new Response(JSON.stringify({ success: true, mode: 'live' })));
	await draining;
	await syncPendingSubmissions();
	expect(getLocalHistory().every(record => record.synced)).toBe(true);
});

it('reuses a failed attempt only while the answers are unchanged, and reconciles an uncertain write', () => {
	const first = payload();
	const failed = failSave({ kind: 'editing' }, first, new Error('Unknown storage result'));
	expect(failed).toMatchObject({ kind: 'failed', payload: first, message: expect.stringContaining('Keep this form open') });
	expect(failSave(completeSave(first.id), first, new Error('Later failure'))).toEqual({ kind: 'durable', id: first.id });
	expect(saveErrorMessage(failed, new Error('ignored'))).toBe(failed.kind === 'failed' ? failed.message : '');
	const durableMessage = saveErrorMessage(completeSave(first.id), new Error('Later failure'));
	expect(durableMessage).toContain(first.id);
	expect(durableMessage).toContain('Check My Device History');
	expect(durableMessage).not.toContain('Could not confirm saving');
	expect(prepareSave(failed, { ...first, id: 'other', submittedAt: '2026-11-11T01:00:00Z' }).payload).toBe(first);
	const changed = { ...first, id: 'new_observation', waterQuality: { ...first.waterQuality!, notes: 'New reading' } };
	expect(prepareSave(failed, changed).payload).toBe(changed);
	const originalWrite = localStorage.setItem.bind(localStorage);
	vi.spyOn(localStorage, 'setItem').mockImplementationOnce((key, value) => originalWrite(key, value)) // device ID
		.mockImplementationOnce((key, value) => { originalWrite(key, value); throw new Error('Uncertain write'); });
	expect(() => persistNewSubmission(first)).toThrow('Uncertain write');
	expect(persistNewSubmission(first).id).toBe(first.id);
	expect(getLocalHistory()).toHaveLength(1);
	expect(() => persistNewSubmission({ ...first, initials: 'Different' })).toThrow('different answers');
	expect(fetch).not.toHaveBeenCalled();
});

it('does not replace unrelated draft dates or answers during post-save rollover', () => {
	const yesterday = '2026-11-10';
	const forms = createEmptyStepForms(yesterday, 'AB');
	forms.room6Eggs.notes = 'Unsent egg observation';
	forms.lssPM.notes = 'Unsent evening notes';
	const next = resetSubmittedSteps(forms, ['lssAM', 'waterQuality'], '2026-11-11', 'AB');
	expect(next.lssAM.date).toBe('2026-11-11');
	expect(next.waterQuality.date).toBe('2026-11-11');
	expect(next.room6Eggs).toBe(forms.room6Eggs);
	expect(next.lssPM).toBe(forms.lssPM);
	expect(next.lssPM.date).toBe(yesterday);
	const mixed = { ...forms, waterQuality: payload().waterQuality! };
	expect(() => createEntryPayload(['waterQuality'], mixed, yesterday, 'AB')).toThrow('different record dates');
});

it('rolls only untouched drafts forward after a pair save, keeping drafts with answers on their date', () => {
	const yesterday = '2026-11-10';
	const forms = createEmptyStepForms(yesterday, 'AB');
	forms.lssPM.notes = 'Unsent evening notes';
	const next = rollPristineDrafts(forms, '2026-11-11', 'AB');
	expect(next.tanksEggs.date).toBe('2026-11-11');
	expect(next.feeds.date).toBe('2026-11-11');
	expect(next.room6Eggs.date).toBe('2026-11-11');
	expect(next.lssPM).toBe(forms.lssPM);
	expect(next.lssPM.date).toBe(yesterday);
});

it('maps tabs to bounded destinations while retaining existing shift validation locks', () => {
	for (const tab of ['morning', 'noon', 'offDay', 'waterQuality', 'room6', 'history'] as const) expect(destinationTab(destinationForTab(tab))).toBe(tab);
	expect(destinationForTab('room6')).toEqual({ kind: 'room6', section: 'room6Eggs' });
	expect(room6Destination('room6Ammonia')).toEqual({ kind: 'room6', section: 'room6Ammonia' });
	expect(() => room6Destination('invalid' as never)).toThrow('Invalid Room 6 section');
	expect(resolveInitialTab('', '2026-11-10')).toBe('offDay'); // Tuesday off-day
	expect(resolveInitialTab('', '2026-11-11')).toBe('morning'); // Wednesday routine day
	expect(resolveInitialTab('?tab=noon', '2026-11-10')).toBe('noon');
	expect(destinationSteps(destinationForTab('history'))).toEqual([]);
	expect(activeDestinationStep(destinationForTab('history'))).toBeNull();
	expect(destinationSteps(destinationForTab('waterQuality'))).toEqual(['waterQuality']);
	expect(activeDestinationStep(room6Destination('room6Lss'))).toBe('room6Lss');
	expect(activeDestinationStep(shiftDestination('noon', 2))).toBe('tanksEggs');
	expect(shiftDestination('noon', 3)).toEqual({ kind: 'shift', shift: 'noon', step: 3 });
	for (const step of [0, 4, 1.5, NaN]) expect(() => shiftDestination('noon', step)).toThrow();
});

it('never calls a blocked or unreadable queue up to date, and publishes same/cross-tab updates', async () => {
	const refresh = vi.fn();
	const stop = observeDeviceQueue(refresh);
	expect(snapshotTone(readQueueSnapshot())).toBe('good');
	const record = persistNewSubmission(payload());
	expect(snapshotTone(readQueueSnapshot())).toBe('warn');
	saveLocalSubmission({ ...record, syncBlocked: true, syncError: 'Needs review' });
	vi.mocked(fetch).mockResolvedValue(new Response('{}'));
	await syncPendingSubmissions();
	expect(fetch).not.toHaveBeenCalled();
	expect(readQueueSnapshot()).toMatchObject({ kind: 'ready', pendingCount: 1, reviewCount: 1, status: 'needsReview' });
	expect(snapshotTone(readQueueSnapshot())).toBe('bad');
	expect(readQueueSnapshot().message).not.toContain('All up to date');
	expect(createSubmissionFeedback({ synced: false, syncBlocked: true }, false).message).toContain('will not retry automatically');
	const calls = refresh.mock.calls.length;
	window.dispatchEvent(new Event('storage'));
	expect(refresh).toHaveBeenCalledTimes(calls + 1);
	stop();
	localStorage.setItem('rummerlab_submission_bad', '{broken');
	expect(readQueueSnapshot()).toMatchObject({ kind: 'unavailable' });
	expect(snapshotTone(readQueueSnapshot())).toBe('bad');
	expect(localStorage.getItem('rummerlab_submission_bad')).toBe('{broken');
});

it('keeps authentication and cooldown independent, including upgraded legacy pauses', () => {
	vi.useFakeTimers();
	vi.setSystemTime(new Date('2026-11-11T00:00:00Z'));
	pauseSync('Rate limited', '120');
	const deadline = getSyncPause()!.until;
	pauseSync('Sign in', null, true);
	expect(getSyncPause()).toMatchObject({ authentication: true, until: deadline });
	resumeAuthenticatedSync();
	expect(getSyncPause()).toMatchObject({ until: deadline, message: 'Rate limited' });
	vi.advanceTimersByTime(124000);
	expect(getSyncPause()).toBeNull();
	localStorage.setItem('rummerlab_sync_pause', JSON.stringify({ until: Date.now() + 60000, authentication: true, message: 'Old auth pause' }));
	expect(getSyncPause()?.authentication).toBe(true);
	resumeAuthenticatedSync();
	expect(getSyncPause()?.until).toBeGreaterThan(Date.now());
	vi.advanceTimersByTime(60001);
	expect(getSyncPause()).toBeNull();
});

it('retains known identity conflicts for review instead of retrying them', async () => {
	persistNewSubmission(payload());
	vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ error: 'Identity conflict' }), { status: 409 }));
	await syncPendingSubmissions();
	await syncPendingSubmissions();
	expect(fetch).toHaveBeenCalledTimes(1);
	expect(getLocalHistory()[0]).toMatchObject({ synced: false, syncBlocked: true });
});

it('migrates interrupted legacy copies without overwriting newer records or losing raw data', () => {
	const first = persistNewSubmission(payload('a'));
	const second = { ...first, id: 'b', payload: payload('b') };
	localStorage.setItem('rummerlab_husbandry_local_history', JSON.stringify([{ ...first, synced: true }, second]));
	const originalWrite = localStorage.setItem.bind(localStorage);
	vi.spyOn(localStorage, 'setItem').mockImplementationOnce(() => { throw new Error('Quota'); });
	expect(() => migrateLocalHistory()).toThrow('Quota');
	expect(localStorage.getItem('rummerlab_husbandry_local_history')).not.toBeNull();
	vi.mocked(localStorage.setItem).mockImplementation(originalWrite);
	expect(migrateLocalHistory()).toBe('complete');
	expect(getLocalHistory()).toHaveLength(2);
	expect(getLocalHistory().find(record => record.id === 'a')?.synced).toBe(false);
	expect(migrateLocalHistory()).toBe('notNeeded');
	localStorage.setItem('rummerlab_husbandry_local_history', JSON.stringify([first]));
	vi.spyOn(localStorage, 'removeItem').mockImplementationOnce(() => { throw new Error('Remove failed'); });
	expect(() => migrateLocalHistory()).toThrow('Remove failed');
	expect(localStorage.getItem('rummerlab_husbandry_local_history')).not.toBeNull();
	expect(migrateLocalHistory()).toBe('complete');
	expect(getLocalHistory()).toHaveLength(2);
});

it('keeps answer semantics separate from validation visibility and weekly inclusion', () => {
	let data = payload().waterQuality!;
	expect(measurementAnswer('')).toEqual({ kind: 'unanswered' });
	expect(measurementAnswer('98%')).toEqual({ kind: 'entered', value: '98%' });
	data = { ...data, pHA: '' };
	const missing = getModuleIssues('waterQuality', data);
	expect(visibleModuleIssues('pristine', missing, data, true)).toEqual([]);
	expect(visibleModuleIssues('revealed', missing, data)).toEqual(missing);
	data = toggleNotMeasured(data, 'pHA');
	expect(measurementAnswer(data.pHA)).toEqual({ kind: 'notMeasured' });
	expect(data.pHB).toBe('8.1');
	expect(getModuleIssues('waterQuality', data)).toEqual([]);
	data.alkA = '116';
	data.isWeeklyCheck = true;
	expect(getModuleIssues('waterQuality', data).length).toBeGreaterThan(0);
	data.isWeeklyCheck = false;
	expect(formatWaterQualityRow(data).slice(10, 22)).toEqual(Array(12).fill(''));
	data.isWeeklyCheck = true;
	expect(data.alkA).toBe('116');
	expect(NOT_MEASURED).toBe(data.pHA);
});
