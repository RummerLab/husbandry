import type { BeforeSendEvent } from '@vercel/speed-insights/sveltekit-next';

/**
 * Vercel Speed Insights reports Core Web Vitals per route. It is cookieless and keeps no device
 * identifier. Same privacy rules as page-view analytics: only origin + path, never /api/* or /login,
 * never form values, initials, device/submission IDs or sheet URLs.
 */
export function sanitizeSpeedInsightsEvent(event: BeforeSendEvent): BeforeSendEvent | null {
	if (event.type !== 'vital') return null;
	try {
		const url = new URL(event.url);
		if (url.pathname.startsWith('/api/') || url.pathname === '/login') return null;
		return { ...event, url: url.origin + url.pathname };
	} catch {
		return null;
	}
}

/** Only deployed HTTPS hosts serve /_vercel/speed-insights; skip dev and local previews. */
export function speedInsightsAllowed(location: Pick<Location, 'hostname' | 'protocol'>, dev: boolean): boolean {
	return !dev && location.protocol === 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
}
