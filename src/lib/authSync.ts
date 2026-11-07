import { getSyncPause, resumeAuthenticatedSync } from './syncPause';

/** A cached offline shell cannot prove that the server still accepts credentials. */
export async function resumeSyncAfterAuthorization(): Promise<void> {
	try {
		if (!getSyncPause()?.authentication) return;
		const response = await fetch('/api/access', { cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(5000) });
		if (response.ok && (await response.json()).authorized === true) resumeAuthenticatedSync();
	} catch { /* Offline/expired access leaves the durable queue paused. */ }
}
