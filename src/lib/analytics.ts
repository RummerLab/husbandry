export const GA_MEASUREMENT_ID = 'G-S1GQ36LLDK';
export const ANALYTICS_PREFERENCE_KEY = 'rummerlab_usage_analytics';
const PRODUCTION_HOST = 'husbandry.rummerlab.com';
type Preference = 'granted' | 'denied' | null;
type AnalyticsWindow = Window & {
	dataLayer?: unknown[][];
	gtag?: (...args: unknown[]) => void;
	doNotTrack?: string;
	'ga-disable-G-S1GQ36LLDK'?: boolean;
};

/** Client-only, opt-in page views. Never accepts submission or researcher data. */
export function createUsageAnalytics(host: Window, page: Document) {
	const target = host as AnalyticsWindow;
	let initialized = false;
	let preference: Preference = null;
	const privacyBlocked = () => host.navigator.doNotTrack === '1' || target.doNotTrack === '1' ||
		(host.navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;
	const readPreference = (): Preference => {
		try {
			const stored = host.localStorage.getItem(ANALYTICS_PREFERENCE_KEY);
			return stored === 'granted' || stored === 'denied' ? stored : null;
		} catch { return null; }
	};
	function apply() {
		const allowed = preference === 'granted' && !privacyBlocked() && host.location.hostname === PRODUCTION_HOST && host.location.protocol === 'https:';
		target['ga-disable-G-S1GQ36LLDK'] = !allowed;
		if (!allowed) {
			// Disable the property before removing its first-party cookies. No consent ping.
			for (const cookie of page.cookie.split(';')) {
				const name = cookie.trim().split('=')[0];
				if (name === '_ga' || name.startsWith('_ga_')) {
					for (const domain of ['', `; domain=${host.location.hostname}`, `; domain=.${host.location.hostname}`]) page.cookie = `${name}=; Max-Age=0; path=/${domain}; SameSite=Lax; Secure`;
				}
			}
			return;
		}
		if (initialized) return;
		initialized = true;
		target.dataLayer = target.dataLayer || [];
		// The Google tag expects an arguments object for each queued command.
		target.gtag = function (..._args: unknown[]) { target.dataLayer!.push(arguments as unknown as unknown[]); };
		const gtag = target.gtag;
		gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
		gtag('js', new Date());
		gtag('config', GA_MEASUREMENT_ID, {
			send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false,
			page_location: `https://${PRODUCTION_HOST}/`, page_referrer: '', page_title: 'RummerLab Husbandry'
		});
		gtag('event', 'page_view', {
			send_to: GA_MEASUREMENT_ID, page_location: `https://${PRODUCTION_HOST}/`, page_referrer: '', page_title: 'RummerLab Husbandry'
		});
		const script = page.createElement('script');
		script.async = true;
		script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
		script.referrerPolicy = 'no-referrer';
		// No await: offline/ad blockers cannot hold up forms or queue replay.
		script.onerror = () => { target['ga-disable-G-S1GQ36LLDK'] = true; };
		page.head.appendChild(script);
	}
	return {
		get preference() { return preference; },
		get blocked() { return privacyBlocked(); },
		start() { preference = readPreference(); try { apply(); } catch { target['ga-disable-G-S1GQ36LLDK'] = true; } },
		choose(allow: boolean): boolean {
			preference = allow ? 'granted' : 'denied';
			try { host.localStorage.setItem(ANALYTICS_PREFERENCE_KEY, preference); apply(); return true; }
			catch { preference = null; target['ga-disable-G-S1GQ36LLDK'] = true; return false; }
		}
	};
}
