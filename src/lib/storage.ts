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
function parse(raw: string): LocalHistoryItem {
 const item = JSON.parse(raw);
 if (!item || typeof item.id !== 'string' || !item.payload || typeof item.synced !== 'boolean') throw new Error('Stored record is damaged. Keep this device data and contact the lab administrator.');
 return item;
}
function migrate(): void {
 const raw = localStorage.getItem(LEGACY);
 if (!raw) return;
 const items = JSON.parse(raw);
 if (!Array.isArray(items)) throw new Error('Stored history is damaged. Keep this device data and contact the lab administrator.');
 for (const value of items) {
  const item = parse(JSON.stringify(value));
  if (!localStorage.getItem(PREFIX + item.id)) localStorage.setItem(PREFIX + item.id, JSON.stringify(item));
 }
 // Remove the old copy only after every record has been persisted.
 localStorage.removeItem(LEGACY);
}
export function getLocalHistory(): LocalHistoryItem[] {
 if (typeof window === 'undefined') return [];
 migrate();
 const result: LocalHistoryItem[] = [];
 for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key?.startsWith(PREFIX)) { const raw = localStorage.getItem(key); if (raw) result.push(parse(raw)); }
 }
 return result.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}
export function saveLocalSubmission(item: LocalHistoryItem): void {
 migrate();
 // Independent keys prevent another tab's save from overwriting this queue.
 localStorage.setItem(PREFIX + item.id, JSON.stringify(item));
}
export function updateLocalHistorySyncStatus(id: string, synced: boolean, error?: string): void {
 const raw = localStorage.getItem(PREFIX + id);
 if (!raw) throw new Error('Pending record disappeared from this device');
 const item = parse(raw);
 if (item.synced && !synced) return;
 saveLocalSubmission({ ...item, synced, syncError: error });
}
let inFlight: Promise<{ syncedCount: number; errors: string[] }> | undefined;
export function syncPendingSubmissions(): Promise<{ syncedCount: number; errors: string[] }> {
 if (inFlight) return inFlight;
 inFlight = drain().finally(() => { inFlight = undefined; });
 return inFlight;
}
async function drain(): Promise<{ syncedCount: number; errors: string[] }> {
 let syncedCount = 0;
 const errors: string[] = [];
 for (const item of getLocalHistory().filter(h => !h.synced)) {
  try {
   const res = await fetch('/api/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item.payload), signal: AbortSignal.timeout(30000) });
   const result = await res.json();
   if (!res.ok || !result.success || result.mode !== 'live') throw new Error(result.mode === 'mock' ? 'Mock mode: not written to Google Sheets. Record remains pending.' : result.error || 'Server rejected submission');
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
export async function queueSubmission(payload: FullHusbandrySubmission, online: boolean): Promise<LocalHistoryItem> {
 const item: LocalHistoryItem = { id: payload.id, submittedAt: payload.submittedAt, date: payload.date, initials: payload.initials, modules: payload.modulesSubmitted, synced: false, summary: payload.modulesSubmitted.join(', '), payload };
 // Fail before any network request or success message if persistence fails.
 saveLocalSubmission(item);
 if (online) await syncPendingSubmissions();
 return parse(localStorage.getItem(PREFIX + item.id)!);
}
