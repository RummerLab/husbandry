import { parse } from 'basic-auth';
import { json } from '@sveltejs/kit';
import { sameSecret } from './secrets';
import { enforceRateLimit } from './rateLimit';

const publicAssets = new Set(['/robots.txt', '/humans.txt', '/llms.txt', '/manifest.webmanifest', '/favicon.svg', '/favicon.ico', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png', '/sw.js', '/service-worker.js']);
export function isPublicRoute(path: string): boolean {
	return path === '/api/health' || path === '/api/health/diagnostics' || publicAssets.has(path) || path.startsWith('/_app/immutable/');
}
/** Shared lab access, not proof of the individual researcher or device. */
export async function checkLabAccess(request: Request): Promise<Response | null> {
	const url = new URL(request.url);
	if (isPublicRoute(url.pathname)) return null; // Diagnostics has its own bearer-token gate.
	const enabled = process.env.LAB_ACCESS_ENABLED || 'false';
	if (enabled === 'false') return null; // Merging is separate from the administrator's rollout.
	if (enabled !== 'true') return json({ error: 'Invalid lab access configuration.' }, { status: 503 });
	const deployed = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
	const username = process.env.LAB_ACCESS_USERNAME || 'lab';
	const password = process.env.LAB_ACCESS_PASSWORD || '';
	if (deployed && process.env.RATE_LIMIT_MODE !== 'enforce') return json({ error: 'Enable submission/login rate protection before activating lab access.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
	if (password.length < 24 || Buffer.byteLength(password) > 4096 || username.includes(':') || username.length > 64 || !username) {
		return json({ error: 'Lab access is not configured. Contact the lab administrator.' }, { status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '60' } });
	}
	if (deployed && url.protocol !== 'https:') return json({ error: 'HTTPS is required.' }, { status: 403 });
	const header = request.headers.get('authorization') || '';
	const credentials = header.length <= 8192 ? parse(header) : undefined;
	const validName = sameSecret(credentials?.name || '', username);
	const validPassword = sameSecret(credentials?.pass || '', password);
	if (!validName || !validPassword) {
		const limited = await enforceRateLimit(request, 'login');
		if (limited) return limited;
		const headers: Record<string, string> = { 'Cache-Control': 'no-store', Vary: 'Authorization' };
		// Native browser challenge on navigation only; APIs return JSON, never redirects or login HTML.
		if (!url.pathname.startsWith('/api/')) headers['WWW-Authenticate'] = 'Basic realm="RummerLab Husbandry", charset="UTF-8"';
		return json({ success: false, code: 'AUTH_REQUIRED', error: 'Lab sign-in required. Your pending records remain on this device.' }, { status: 401, headers });
	}
	if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method) && request.headers.get('origin') !== url.origin) {
		return json({ success: false, code: 'INVALID_ORIGIN', error: 'Submit records from this site.' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
	}
	return null;
}
