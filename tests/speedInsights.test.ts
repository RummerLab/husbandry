import { expect, it } from 'vitest';
import { sanitizeSpeedInsightsEvent, speedInsightsAllowed } from '../src/lib/speedInsights';

it('keeps only web-vital events reduced to origin and path', () => {
	expect(sanitizeSpeedInsightsEvent({ type: 'vital', url: 'https://husbandry.rummerlab.com/?date=2026-11-09#x', route: '/' }))
		.toEqual({ type: 'vital', url: 'https://husbandry.rummerlab.com/', route: '/' });
	expect(sanitizeSpeedInsightsEvent({ type: 'vital', url: 'https://husbandry.rummerlab.com/api/submit' })).toBeNull();
	expect(sanitizeSpeedInsightsEvent({ type: 'vital', url: 'https://husbandry.rummerlab.com/login' })).toBeNull();
	expect(sanitizeSpeedInsightsEvent({ type: 'vital', url: 'not a url' })).toBeNull();
	expect(sanitizeSpeedInsightsEvent({ type: 'other' as 'vital', url: 'https://husbandry.rummerlab.com/' })).toBeNull();
});

it('only runs on deployed HTTPS hosts', () => {
	expect(speedInsightsAllowed({ hostname: 'husbandry.rummerlab.com', protocol: 'https:' }, false)).toBe(true);
	expect(speedInsightsAllowed({ hostname: 'husbandry.rummerlab.com', protocol: 'https:' }, true)).toBe(false);
	expect(speedInsightsAllowed({ hostname: 'localhost', protocol: 'https:' }, false)).toBe(false);
	expect(speedInsightsAllowed({ hostname: 'husbandry.rummerlab.com', protocol: 'http:' }, false)).toBe(false);
});
