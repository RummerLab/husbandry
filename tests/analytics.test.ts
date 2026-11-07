import { expect, it, vi } from 'vitest';
import { ANALYTICS_PREFERENCE_KEY, createUsageAnalytics, GA_MEASUREMENT_ID } from '../src/lib/analytics';
function harness(hostname = 'husbandry.rummerlab.com') {
 const entries = new Map<string, string>(); const scripts: Record<string, unknown>[] = [];
 const storage = { getItem: (key: string) => entries.get(key) ?? null, setItem: (key: string, value: string) => { entries.set(key, value); } };
 const host = { navigator: { doNotTrack: '0', globalPrivacyControl: false }, location: { hostname, protocol: 'https:', href: `https://${hostname}/?initials=AB&device_id=private#notes` }, localStorage: storage };
 const page = { cookie: '', createElement: vi.fn(() => ({})), head: { appendChild: vi.fn((script: Record<string, unknown>) => scripts.push(script)) } };
 const controller = createUsageAnalytics(host as unknown as Window, page as unknown as Document);
 return { host: host as typeof host & { dataLayer?: ArrayLike<unknown>[]; 'ga-disable-G-S1GQ36LLDK'?: boolean }, page, entries, scripts, controller };
}
it('loads nothing before consent or after declining', () => {
 const h = harness(); h.controller.start(); expect(h.scripts).toHaveLength(0);
 expect(h.controller.choose(false)).toBe(true); expect(h.scripts).toHaveLength(0); expect(h.host.dataLayer).toBeUndefined();
});
it('initializes once after consent and sends only a constant sanitized page view', () => {
 const h = harness(); h.controller.start(); h.controller.choose(true); h.controller.start(); h.controller.choose(true);
 expect(h.scripts).toHaveLength(1); expect(h.scripts[0]).toMatchObject({ async: true, referrerPolicy: 'no-referrer', src: `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}` });
 const commands = h.host.dataLayer!.map(args => Array.from(args));
 const events = commands.filter(args => args[0] === 'event'); expect(events).toHaveLength(1);
 expect(events[0]).toEqual(['event', 'page_view', { send_to: GA_MEASUREMENT_ID, page_location: 'https://husbandry.rummerlab.com/', page_referrer: '', page_title: 'RummerLab Husbandry' }]);
 expect(JSON.stringify(commands)).not.toContain('private'); expect(JSON.stringify(commands)).not.toContain('initials');
 expect(commands.find(args => args[0] === 'config')?.[2]).toMatchObject({ send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false });
});
it('honors stored consent but privacy signals and nonproduction hosts override it', () => {
 for (const privacy of ['dnt', 'gpc', 'preview']) {
  const h = harness(privacy === 'preview' ? 'preview.vercel.app' : undefined);
  h.entries.set(ANALYTICS_PREFERENCE_KEY, 'granted');
  if (privacy === 'dnt') h.host.navigator.doNotTrack = '1';
  if (privacy === 'gpc') h.host.navigator.globalPrivacyControl = true;
  h.controller.start(); expect(h.scripts).toHaveLength(0); expect(h.host['ga-disable-G-S1GQ36LLDK']).toBe(true);
 }
});
it('withdrawal immediately disables the property and does not enqueue further events', () => {
 const h = harness(); h.controller.choose(true); const count = h.host.dataLayer!.length;
 h.controller.choose(false); expect(h.host['ga-disable-G-S1GQ36LLDK']).toBe(true);
 expect(h.host.dataLayer).toHaveLength(count); expect(h.entries.get(ANALYTICS_PREFERENCE_KEY)).toBe('denied');
});
it('storage and script failures remain isolated', () => {
 const h = harness(); vi.spyOn(h.host.localStorage, 'setItem').mockImplementation(() => { throw new Error('storage unavailable'); });
 expect(h.controller.choose(true)).toBe(false); expect(h.scripts).toHaveLength(0);
 const network = harness(); network.controller.choose(true); expect(() => (network.scripts[0].onerror as () => void)()).not.toThrow();
 expect(network.host['ga-disable-G-S1GQ36LLDK']).toBe(true);
});
