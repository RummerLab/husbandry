/**
 * Cookieless page-view counting with Vercel Web Analytics, using Vercel's plain-HTML
 * integration (no npm package: @vercel/analytics does not list SvelteKit 3 as a peer).
 * Vercel sets no cookies and stores no device identifier, so there is no consent prompt.
 * Only page views are sent, reduced to origin + path. Never send form values, initials,
 * notes, device/submission IDs, credentials or sheet URLs.
 */
export const VERCEL_ANALYTICS_SCRIPT = '/_vercel/insights/script.js';
export const LEGACY_PREFERENCE_KEY = 'rummerlab_usage_analytics';
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

export type AnalyticsEvent = { type: string; url: string };
type AnalyticsWindow = Window & {
	va?: (...args: unknown[]) => void;
	vaq?: unknown[][];
};

/** Keep only the page itself: drop query strings, fragments and anything that is not a page view. */
export function sanitizeAnalyticsEvent(event: AnalyticsEvent): AnalyticsEvent | null {
	if (event.type !== 'pageview') return null;
	try {
		const url = new URL(event.url);
		if (url.pathname.startsWith('/api/') || url.pathname === '/login') return null;
		return { type: 'pageview', url: url.origin + url.pathname };
	} catch {
		return null;
	}
}

/** Remove the retired GA4 opt-in preference and any `_ga` cookies it set. */
function clearLegacyGoogleAnalytics(host: Window, page: Document) {
	try { host.localStorage.removeItem(LEGACY_PREFERENCE_KEY); } catch { /* storage unavailable */ }
	for (const cookie of page.cookie.split(';')) {
		const name = cookie.trim().split('=')[0];
		if (name === '_ga' || name.startsWith('_ga_')) {
			for (const domain of ['', `; domain=${host.location.hostname}`, `; domain=.${host.location.hostname}`]) {
				page.cookie = `${name}=; Max-Age=0; path=/${domain}; SameSite=Lax; Secure`;
			}
		}
	}
}

/** Fire-and-forget: never awaited and never throws, so it cannot block forms or offline sync. */
export function startPageViewAnalytics(host: Window, page: Document, enabled: boolean): boolean {
	try {
		clearLegacyGoogleAnalytics(host, page);
		// The script is only served by Vercel deployments; skip dev and local previews.
		if (!enabled || LOCAL_HOSTS.has(host.location.hostname) || host.location.protocol !== 'https:') return false;
		if (page.querySelector(`script[src="${VERCEL_ANALYTICS_SCRIPT}"]`)) return true;
		const target = host as AnalyticsWindow;
		target.va = target.va || function (...args: unknown[]) { (target.vaq = target.vaq || []).push(args); };
		target.va('beforeSend', sanitizeAnalyticsEvent);
		const script = page.createElement('script');
		script.defer = true;
		script.src = VERCEL_ANALYTICS_SCRIPT;
		page.head.appendChild(script);
		return true;
	} catch {
		return false;
	}
}
