import { error, redirect } from '@sveltejs/kit';
import { google } from 'googleapis';
import type { RequestHandler } from './$types';
import { cookieOptions, createSession, getAdminConfig, OAUTH_COOKIE, readOAuthState, SESSION_COOKIE, SESSION_SECONDS } from '../../../../lib/server/adminAuth';

/** Finish Google sign-in: verify the ID token, then allow only verified, allowlisted emails. */
export const GET: RequestHandler = async ({ url, cookies }) => {
	const config = getAdminConfig();
	if (!config) error(404, 'Lab Overview sign-in is not configured.');
	const saved = readOAuthState(cookies.get(OAUTH_COOKIE), url.searchParams.get('state'), config.secret);
	cookies.delete(OAUTH_COOKIE, { path: '/' });
	const code = url.searchParams.get('code');
	if (!saved || !code) redirect(303, '/insights?signin=expired');

	let email = '';
	let name = '';
	try {
		const client = new google.auth.OAuth2(config.clientId, config.clientSecret, `${url.origin}/auth/google/callback`);
		const { tokens } = await client.getToken({ code, codeVerifier: saved.verifier });
		if (!tokens.id_token) throw new Error('No ID token');
		const payload = (await client.verifyIdToken({ idToken: tokens.id_token, audience: config.clientId })).getPayload();
		if (!payload?.email || payload.email_verified !== true) throw new Error('Unverified email');
		email = payload.email.toLowerCase();
		name = payload.name || '';
	} catch (err) {
		// Never log tokens or emails.
		console.warn('Admin sign-in failed', { errorType: err instanceof Error ? err.name : 'UnknownError' });
		redirect(303, '/insights?signin=failed');
	}
	if (!config.admins.has(email)) redirect(303, '/insights?signin=denied');

	cookies.set(SESSION_COOKIE, createSession(email, name, config.secret), cookieOptions(SESSION_SECONDS));
	redirect(303, saved.returnTo);
};
