import { getSyncPause, pauseSync } from './syncPause';
import { notifyDeviceQueueChanged } from './deviceEvents';
import { deliveryState, submissionOutcome } from './submissionOutcome';
import type { FullHusbandrySubmission, LocalHistoryItem } from './types';
const LEGACY = 'rummerlab_husbandry_local_history';
const PREFIX = 'rummerlab_submission_';
const DEVICE = 'rummerlab_device_id';
const INITIALS = 'rummerlab_user_initials';
export function getDeviceId(): string {
 if (typeof window === 'undefined') return 'server';
 let id = localStorage.getItem(DEVICE);
 if (!id) { id = `device_${crypto.randomUUID()}`; localStorage.setItem(DEVICE, id); }
 return id;
}
export function getSavedInitials(): string { return typeof window === 'undefined' ? '' : localStorage.getItem(INITIALS) || ''; }
export function setSavedInitials(initials: string): void { localStorage.setItem(INITIALS, initials); }
class DamagedLocalRecordError extends Error {}
function storedJSON(raw: string): unknown {
 try { return JSON.parse(raw); } catch { throw new DamagedLocalRecordError('Stored record is damaged. Keep this device data and contact the lab administrator.'); }
}
function parse(raw: string): LocalHistoryItem {
 const item = storedJSON(raw) as LocalHistoryItem;
 if (!item || typeof item.id !== 'string' || !item.payload || typeof item.payload !== 'object' || Array.isArray(item.payload) || typeof item.synced !== 'boolean' || typeof item.submittedAt !== 'string') throw new DamagedLocalRecordError('Stored record is damaged. Keep this device data and contact the lab administrator.');
 const modules = item.modules ?? item.payload.modulesSubmitted;
 if (!Array.isArray(modules) || !modules.every(module => typeof module === 'string')) throw new DamagedLocalRecordError('Stored record is damaged. Keep this device data and contact the lab administrator.');
 return item;
}
export function migrateLocalHistory(): 'notNeeded' | 'complete' {
 const raw = localStorage.getItem(LEGACY);
 if (!raw) return 'notNeeded';
 const items = storedJSON(raw);
 if (!Array.isArray(items)) throw new DamagedLocalRecordError('Stored history is damaged. Keep this device data and contact the lab administrator.');
 for (const value of items) {
  const item = parse(JSON.stringify(value));
  if (!localStorage.getItem(PREFIX + item.id)) localStorage.setItem(PREFIX + item.id, JSON.stringify(item));
 }
 // Remove the old copy only after every record has been persisted.
 localStorage.removeItem(LEGACY);
 return 'complete';
}
export type LocalHistoryInspection =
 | { state: 'readable'; records: LocalHistoryItem[] }
 | { state: 'damaged'; records: LocalHistoryItem[]; damagedCount: number; message: string }
 | { state: 'unavailable'; records: LocalHistoryItem[]; message: string };

/** Recovery inspection retains legacy migration, but never repairs/deletes damaged values or authorises sync. */
export function inspectLocalHistory(): LocalHistoryInspection {
 if (typeof window === 'undefined') return { state: 'readable', records: [] };
 try {
  let damagedCount = 0;
  try { migrateLocalHistory(); } catch (error) {
   if (!(error instanceof DamagedLocalRecordError)) throw error;
   damagedCount++; // The untouched legacy copy is one damaged storage entry.
  }
  const records: LocalHistoryItem[] = [];
  for (let i = 0; i < localStorage.length; i++) {
   const key = localStorage.key(i);
   if (!key?.startsWith(PREFIX)) continue;
   const raw = localStorage.getItem(key);
   if (raw === null) continue;
   try { records.push(parse(raw)); } catch (error) {
    if (!(error instanceof DamagedLocalRecordError)) throw error;
    damagedCount++;
   }
  }
  records.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  return damagedCount ? { state: 'damaged', records, damagedCount,
   message: `${damagedCount} stored ${damagedCount === 1 ? 'entry needs' : 'entries need'} administrator recovery. ${records.length} ${records.length === 1 ? 'record remains' : 'records remain'} readable in My Device History. Sync is paused; keep all device data.` } : { state: 'readable', records };
 } catch {
  return { state: 'unavailable', records: [], message: 'Device storage is unavailable. Keep this device data and contact the lab administrator. Sync status is unknown.' };
 }
}
export function getLocalHistory(): LocalHistoryItem[] {
 const inspection = inspectLocalHistory();
 if (inspection.state !== 'readable') throw new Error(inspection.message);
 return inspection.records;
}
export function saveLocalSubmission(item: LocalHistoryItem): void {
 migrateLocalHistory();
 // Independent keys prevent another tab's save from overwriting this queue.
 localStorage.setItem(PREFIX + item.id, JSON.stringify(item));
 notifyDeviceQueueChanged();
}
export function updateLocalHistorySyncStatus(id: string, synced: boolean, error?: string): void {
 const raw = localStorage.getItem(PREFIX + id);
 if (!raw) throw new Error('Pending record disappeared from this device');
 const item = parse(raw);
 if (item.synced && !synced) return;
 saveLocalSubmission({ ...item, synced, syncError: error });
}
let inFlight: Promise<{ syncedCount: number; errors: string[] }> | undefined;
export function isQueueSyncing(): boolean { return inFlight !== undefined; }
export function syncPendingSubmissions(): Promise<{ syncedCount: number; errors: string[] }> {
 if (inFlight) return inFlight;
 inFlight = drain().finally(() => { inFlight = undefined; notifyDeviceQueueChanged(); });
 notifyDeviceQueueChanged();
 return inFlight;
}
async function drain(): Promise<{ syncedCount: number; errors: string[] }> {
 const pause = getSyncPause();
 if (pause) return { syncedCount: 0, errors: [pause.message] };
 let syncedCount = 0;
 const errors: string[] = [];
 for (const item of getLocalHistory().filter(h => deliveryState(h) === 'pending')) {
  const sharedPause = getSyncPause();
  if (sharedPause) { errors.push(sharedPause.message); break; }
  try {
   const res = await fetch('/api/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item.payload), signal: AbortSignal.timeout(30000) });
   const info = { status: res.status, ok: res.ok, redirected: res.redirected, contentType: res.headers.get('content-type'), retryAfter: res.headers.get('retry-after') };
   // Transport holds do not need to consume an untrusted login/throttling body.
   const preliminary = submissionOutcome(info, null);
   const outcome = preliminary.kind === 'authentication' || preliminary.kind === 'cooldown'
    ? preliminary : submissionOutcome(info, await res.json().catch(() => null));
   if (outcome.kind === 'authentication' || outcome.kind === 'cooldown') {
    pauseSync(outcome.message, outcome.kind === 'cooldown' ? outcome.retryAfter : null, outcome.kind === 'authentication');
    updateLocalHistorySyncStatus(item.id, false, outcome.message);
    errors.push(outcome.message);
    break;
   }
   if (outcome.kind === 'needsReview') {
    const latestRaw = localStorage.getItem(PREFIX + item.id);
    if (latestRaw && !parse(latestRaw).synced) saveLocalSubmission({ ...parse(latestRaw), synced: false, syncBlocked: true, syncError: outcome.message });
    errors.push(outcome.message);
    continue;
   }
   if (outcome.kind === 'retry') throw new Error(outcome.message);
   updateLocalHistorySyncStatus(item.id, true);
   syncedCount++;
  } catch (error) {
   const message = error instanceof Error ? error.message : 'Sync failed';
   updateLocalHistorySyncStatus(item.id, false, message);
   errors.push(message);
  }
 }
 return { syncedCount, errors };
}
/** Durable boundary: never wait for delivery, and never reread after a successful write. */
export function persistNewSubmission(payload: FullHusbandrySubmission): LocalHistoryItem {
 migrateLocalHistory();
 const existing = localStorage.getItem(PREFIX + payload.id);
 if (existing) {
  const record = parse(existing);
  // An uncertain local write may be retried with the same identity, never different content.
  const comparable = (value: FullHusbandrySubmission) => JSON.stringify({ ...value, clientDeviceId: undefined });
  if (comparable(record.payload) !== comparable(payload)) throw new Error('Saved record identity already belongs to different answers. Keep this device data and contact the lab administrator.');
  return record;
 }
 // Capture only for a NEW record, before persistence. Never enrich queued replays.
 payload = { ...payload, clientDeviceId: payload.clientDeviceId ?? getDeviceId() };
 const item: LocalHistoryItem = { id: payload.id, submittedAt: payload.submittedAt, date: payload.date, initials: payload.initials, modules: payload.modulesSubmitted, synced: false, summary: payload.modulesSubmitted.join(', '), payload };
 // Fail before any network request or success message if persistence fails.
 saveLocalSubmission(item);
 return item;
}
/** Compatibility helper for callers that explicitly want to await a delivery attempt. */
export async function queueSubmission(payload: FullHusbandrySubmission, online: boolean): Promise<LocalHistoryItem> {
 const item = persistNewSubmission(payload);
 if (online) await syncPendingSubmissions();
 return parse(localStorage.getItem(PREFIX + item.id)!);
}
