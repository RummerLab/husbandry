import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Named-administrator sign-in for the lab-wide Lab Overview (#66).
 * Google OAuth (authorization code + PKCE); only verified emails in INSIGHTS_ADMIN_EMAILS get a session.
 * This is NOT the shared lab gate (#42) and does not change the per-device view for everyone else.
 */
export const SESSION_COOKIE = 'husbandry_admin';
export const OAUTH_COOKIE = 'husbandry_oauth';
export const SESSION_SECONDS = 12 * 60 * 60;
export const OAUTH_SECONDS = 10 * 60;

export interface AdminConfig {
	clientId: string;
	clientSecret: string;
	secret: string;
	admins: Set<string>;
}

export function parseAdminEmails(value = ''): Set<string> {
	return new Set(value.split(/[\s,;]+/).map(email => email.trim().toLowerCase()).filter(email => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)));
}

/** Null (feature off) unless every setting is present and the signing secret is long enough. */
export function getAdminConfig(env: Record<string, string | undefined> = process.env): AdminConfig | null {
	const clientId = env.GOOGLE_OAUTH_CLIENT_ID?.trim() || '';
	const clientSecret = env.GOOGLE_OAUTH_CLIENT_SECRET?.trim() || '';
	const secret = env.AUTH_SECRET?.trim() || '';
	const admins = parseAdminEmails(env.INSIGHTS_ADMIN_EMAILS);
	if (!clientId || !clientSecret || secret.length < 32 || !admins.size) return null;
	return { clientId, clientSecret, secret, admins };
}

const b64 = (value: Buffer | string) => Buffer.from(value).toString('base64url');
const sign = (payload: string, secret: string) => createHmac('sha256', secret).update(payload).digest('base64url');
function sealed(payload: object, secret: string): string {
	const body = b64(JSON.stringify(payload));
	return `${body}.${sign(body, secret)}`;
}
function unseal<T>(value: string | undefined, secret: string): T | null {
	if (!value) return null;
	const [body, mac] = value.split('.');
	if (!body || !mac) return null;
	const expected = Buffer.from(sign(body, secret));
	const actual = Buffer.from(mac);
	if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
	try { return JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as T; } catch { return null; }
}

export interface AdminSession { email: string; name: string; exp: number }

export function createSession(email: string, name: string, secret: string, now = Date.now()): string {
	return sealed({ email: email.toLowerCase(), name: name.slice(0, 100), exp: Math.floor(now / 1000) + SESSION_SECONDS }, secret);
}

/** Valid only if signed, unexpired AND still on the allowlist (removing an email revokes access immediately). */
export function readSession(cookie: string | undefined, config: AdminConfig | null, now = Date.now()): AdminSession | null {
	if (!config) return null;
	const session = unseal<AdminSession>(cookie, config.secret);
	if (!session || typeof session.email !== 'string' || typeof session.exp !== 'number') return null;
	if (session.exp * 1000 <= now || !config.admins.has(session.email.toLowerCase())) return null;
	return session;
}

export interface OAuthState { state: string; verifier: string; returnTo: string; exp: number }

export function createOAuthState(secret: string, returnTo: string, now = Date.now()): { cookie: string; state: string; challenge: string } {
	const state = b64(randomBytes(24));
	const verifier = b64(randomBytes(48));
	const challenge = createHash('sha256').update(verifier).digest('base64url');
	const cookie = sealed({ state, verifier, returnTo: safeReturnTo(returnTo), exp: Math.floor(now / 1000) + OAUTH_SECONDS }, secret);
	return { cookie, state, challenge };
}

export function readOAuthState(cookie: string | undefined, state: string | null, secret: string, now = Date.now()): OAuthState | null {
	const saved = unseal<OAuthState>(cookie, secret);
	if (!saved || !state || saved.exp * 1000 <= now) return null;
	const a = Buffer.from(saved.state);
	const b = Buffer.from(state);
	return a.length === b.length && timingSafeEqual(a, b) ? saved : null;
}

/** Only same-site paths; never an absolute or protocol-relative URL (open redirect). */
export function safeReturnTo(value: string | null | undefined): string {
	return value && value.startsWith('/') && !value.startsWith('//') && !value.includes('\\') ? value : '/insights';
}

export function googleAuthUrl(config: AdminConfig, redirectUri: string, state: string, challenge: string): string {
	const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
	url.search = new URLSearchParams({
		client_id: config.clientId,
		redirect_uri: redirectUri,
		response_type: 'code',
		scope: 'openid email profile',
		state,
		code_challenge: challenge,
		code_challenge_method: 'S256',
		prompt: 'select_account'
	}).toString();
	return url.href;
}

export const cookieOptions = (maxAge: number) => ({ path: '/', httpOnly: true, secure: true, sameSite: 'lax' as const, maxAge });
