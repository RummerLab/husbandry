import { expect, it, vi } from 'vitest';
import { aquiSVolumeMl, reviewStatus, LAST_REVIEWED, NEXT_REVIEW_DUE, ESCALATION_VIDEO } from '../src/lib/help/escalationGuide';
import { ESCALATION_TRANSCRIPT } from '../src/lib/help/escalationTranscript';
import { createOfflineCache } from '../src/lib/offlineCache';

it('matches the AQUI-S SOP worked examples (400 mg/L, 540 g/L stock)', () => {
	expect(aquiSVolumeMl(10)).toBe(7.4);
	expect(aquiSVolumeMl(50)).toBe(37);
	expect(aquiSVolumeMl(100)).toBe(74.1);
});

it('flags the guide once it passes its review date', () => {
	expect(reviewStatus(LAST_REVIEWED).overdue).toBe(false);
	expect(reviewStatus(NEXT_REVIEW_DUE).overdue).toBe(false);
	expect(reviewStatus('2027-11-11')).toEqual({ overdue: true, daysUntilDue: -1 });
	expect(Date.parse(NEXT_REVIEW_DUE)).toBeGreaterThan(Date.parse(LAST_REVIEWED));
});

it('links the vet video and keeps a complete, ordered transcript', () => {
	expect(ESCALATION_VIDEO.url).toMatch(/^https:\/\/www\.dropbox\.com\//);
	const starts = ESCALATION_TRANSCRIPT.map(c => c.start);
	expect(starts[0]).toBe('00:00');
	expect([...starts].sort()).toEqual(starts);
	expect(ESCALATION_TRANSCRIPT.every(c => c.paragraphs.length > 0)).toBe(true);
	const text = ESCALATION_TRANSCRIPT.flatMap(c => c.paragraphs.map(p => p.text)).join(' ');
	expect(text).toContain('AQUI-S');
	expect(text).not.toMatch(/\baqueous\b/);
});

it('serves the escalation guide offline once installed', async () => {
	const entries = new Map<string, Response>();
	const network = vi.fn<typeof fetch>().mockImplementation(async input => new Response(`network:${typeof input === 'string' ? input : (input as Request).url}`));
	const storage = {
		keys: async () => [], delete: async () => true,
		open: async () => ({
			addAll: async (requests: Request[]) => { for (const r of requests) entries.set(r.url, await network(r)); },
			match: async (r: RequestInfo) => entries.get(typeof r === 'string' ? r : r.url)?.clone(),
			put: async (r: RequestInfo, res: Response) => { entries.set(typeof r === 'string' ? r : r.url, res); }
		})
	} as unknown as CacheStorage;
	const origin = 'https://lab.test';
	const cache = createOfflineCache(storage, network, origin, 'a', []);
	await cache.install();
	network.mockRejectedValue(new Error('offline'));
	const nav = (path: string) => { const r = new Request(origin + path); Object.defineProperty(r, 'mode', { value: 'navigate' }); return r; };
	expect(await (await cache.respond(nav('/help'))).text()).toBe('network:https://lab.test/help');
	expect(await (await cache.respond(nav('/elsewhere'))).text()).toBe('network:https://lab.test/');
});
