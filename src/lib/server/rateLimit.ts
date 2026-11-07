import { checkRateLimit } from '@vercel/firewall';
import { json } from '@sveltejs/kit';
import { createHash } from 'node:crypto';

type Scope = 'submit' | 'login';
/** Vercel-managed regional counters; no per-instance or client-device counters. */
export async function enforceRateLimit(request: Request, scope: Scope, verifiedIdentity?: string): Promise<Response | null> {
	const mode = process.env.RATE_LIMIT_MODE || (process.env.VERCEL === '1' ? 'enforce' : 'off');
	if (mode === 'off' && process.env.VERCEL !== '1') return null;
	if (!['log', 'enforce'].includes(mode)) return unavailable();
	try {
		const result = await checkRateLimit(`husbandry-${scope}`, {
			request, timeout: 1500,
			...(verifiedIdentity ? { rateLimitKey: createHash('sha256').update(verifiedIdentity).digest('hex') } : {})
		});
		if (result.error) {
			console.warn('Rate limit unavailable', { scope, reason: result.error });
			return mode === 'enforce' ? unavailable() : null;
		}
		if (result.rateLimited) {
			console.info('Rate limit reached', { scope, mode });
			if (mode === 'enforce') return json({ success: false, code: 'RATE_LIMITED', error: 'Too many requests. Your records remain queued; retry in one minute.' }, { status: 429, headers: { 'Retry-After': '60', 'Cache-Control': 'no-store' } });
		}
		return null;
	} catch {
		console.warn('Rate limit check failed', { scope });
		return mode === 'enforce' ? unavailable() : null;
	}
}
function unavailable() {
	return json({ success: false, code: 'RATE_LIMIT_UNAVAILABLE', error: 'Sync protection is temporarily unavailable. Your records remain queued.' }, { status: 503, headers: { 'Retry-After': '60', 'Cache-Control': 'no-store' } });
}
