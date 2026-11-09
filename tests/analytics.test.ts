import { expect, it, vi } from 'vitest';
import { LEGACY_PREFERENCE_KEY, sanitizeAnalyticsEvent, startPageViewAnalytics, VERCEL_ANALYTICS_SCRIPT } from '../src/lib/analytics';

function harness(hostname = 'husbandry.rummerlab.com', protocol = 'https:') {
	const entries = new Map<string, string>([[LEGACY_PREFERENCE_KEY, 'granted']]);
	const scripts: Record<string, unknown>[] = [];
	const cookies: string[] = [];
	const storage = { removeItem: vi.fn((key: string) => { entries.delete(key); }) };
	const host = { location: { hostname, protocol }, localStorage: storage } as Record<string, unknown> & { va?: (...args: unknown[]) => void; vaq?: unknown[][] };
	const page = {
		get cookie() { return '_ga=GA1.1.123; _ga_S1GQ36LLDK=GS1.1; theme=light'; },
		set cookie(value: string) { cookies.push(value); },
		querySelector: vi.fn(() => (scripts.length ? {} : null)),
		createElement: vi.fn(() => ({})),
		head: { appendChild: vi.fn((script: Record<string, unknown>) => scripts.push(script)) }
	};
	const start = (enabled = true) => startPageViewAnalytics(host as unknown as Window, page as unknown as Document, enabled);
	return { host, page, entries, scripts, cookies, start };
}

it('loads the cookieless Vercel script once, deferred and same-origin', () => {
	const h = harness();
	expect(h.start()).toBe(true);
	expect(h.start()).toBe(true);
	expect(h.scripts).toHaveLength(1);
	expect(h.scripts[0]).toMatchObject({ defer: true, src: VERCEL_ANALYTICS_SCRIPT });
	expect(h.host.vaq?.[0]).toEqual(['beforeSend', sanitizeAnalyticsEvent]);
});

it('sends only page views reduced to origin and path', () => {
	expect(sanitizeAnalyticsEvent({ type: 'pageview', url: 'https://husbandry.rummerlab.com/?initials=AB&device_id=private#notes' }))
		.toEqual({ type: 'pageview', url: 'https://husbandry.rummerlab.com/' });
	expect(sanitizeAnalyticsEvent({ type: 'event', url: 'https://husbandry.rummerlab.com/' })).toBeNull();
	expect(sanitizeAnalyticsEvent({ type: 'pageview', url: 'https://husbandry.rummerlab.com/login' })).toBeNull();
	expect(sanitizeAnalyticsEvent({ type: 'pageview', url: 'https://husbandry.rummerlab.com/api/submit' })).toBeNull();
	expect(sanitizeAnalyticsEvent({ type: 'pageview', url: 'not a url' })).toBeNull();
});

it('skips dev builds, local hosts and plain http', () => {
	const dev = harness();
	expect(dev.start(false)).toBe(false);
	expect(dev.scripts).toHaveLength(0);
	for (const h of [harness('localhost'), harness('127.0.0.1'), harness('example.test', 'http:')]) {
		expect(h.start(true)).toBe(false);
		expect(h.scripts).toHaveLength(0);
	}
});

it('clears the retired GA4 preference and _ga cookies without touching other cookies', () => {
	const h = harness();
	h.start(false);
	expect(h.entries.has(LEGACY_PREFERENCE_KEY)).toBe(false);
	expect(h.cookies.some(c => c.startsWith('_ga=;'))).toBe(true);
	expect(h.cookies.some(c => c.startsWith('_ga_S1GQ36LLDK=;'))).toBe(true);
	expect(h.cookies.some(c => c.startsWith('theme='))).toBe(false);
});

it('never throws, so analytics cannot block forms or queue replay', () => {
	const h = harness();
	h.page.head.appendChild.mockImplementation(() => { throw new Error('blocked'); });
	h.host.localStorage = { removeItem: () => { throw new Error('storage unavailable'); } };
	expect(() => h.start()).not.toThrow();
	expect(h.start()).toBe(false);
});
