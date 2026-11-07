import type { Handle } from '@sveltejs/kit/hooks';
import { checkLabAccess, isPublicRoute } from './lib/server/access';

export const handle: Handle = async ({ event, resolve }) => {
	const denied = await checkLabAccess(event.request);
	if (denied) return denied;
	const response = await resolve(event);
	if (!isPublicRoute(event.url.pathname)) {
		response.headers.set('Cache-Control', 'private, no-store');
		response.headers.append('Vary', 'Authorization');
	}
	return response;
};
