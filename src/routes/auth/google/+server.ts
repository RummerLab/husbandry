import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { cookieOptions, createOAuthState, getAdminConfig, googleAuthUrl, OAUTH_COOKIE, OAUTH_SECONDS } from '../../../lib/server/adminAuth';

/** Start Google sign-in for named administrators (Lab Overview, #66). */
export const GET: RequestHandler = ({ url, cookies }) => {
	const config = getAdminConfig();
	if (!config) error(404, 'Lab Overview sign-in is not configured.');
	const { cookie, state, challenge } = createOAuthState(config.secret, url.searchParams.get('returnTo') || '/insights');
	cookies.set(OAUTH_COOKIE, cookie, cookieOptions(OAUTH_SECONDS));
	redirect(303, googleAuthUrl(config, `${url.origin}/auth/google/callback`, state, challenge), { external: ['https://accounts.google.com'] });
};
