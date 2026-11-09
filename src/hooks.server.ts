import type { Handle } from '@sveltejs/kit/hooks';
import { checkLabAccess, isPublicRoute } from './lib/server/access';
import { getAdminConfig, readSession, SESSION_COOKIE } from './lib/server/adminAuth';

export const handle: Handle = async ({ event, resolve }) => {
	const denied = await checkLabAccess(event.request);
	if (denied) return denied;
	// Named-administrator session for the Lab Overview (#66); null for everyone else.
	event.locals.admin = readSession(event.cookies.get(SESSION_COOKIE), getAdminConfig());
	const response = await resolve(event);
	if (!isPublicRoute(event.url.pathname)) {
		response.headers.set('Cache-Control', 'private, no-store');
		response.headers.append('Vary', 'Authorization');
	}
	return response;
};
