import { expect, it, vi } from 'vitest';
import { VET_CONTACTS, aquiSVolumeMl, reviewStatus, LAST_REVIEWED, NEXT_REVIEW_DUE, ESCALATION_VIDEO } from '../src/lib/help/escalationGuide';
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

it('gives each escalation contact a dialable Australian mobile matching its displayed number', () => {
	expect(VET_CONTACTS.length).toBeGreaterThanOrEqual(2);
	for (const c of VET_CONTACTS) {
		expect(c.tel).toMatch(/^\+614\d{8}$/);
		expect('+61' + c.phone.replace(/\s/g, '').slice(1)).toBe(c.tel);
	}
});

import { WATER_QUALITY_LIMITS, WATER_QUALITY_ROOMS } from '../src/lib/help/escalationGuide';

it('gives Room 12 and Room 6 their own water-quality actions for every limit', () => {
	expect(WATER_QUALITY_ROOMS.map(r => r.name)).toEqual(['Room 12', 'Room 6']);
	for (const room of WATER_QUALITY_ROOMS) {
		for (const l of WATER_QUALITY_LIMITS) expect(room.actions[l.key]).toBeTruthy();
		// Every retest wait in a room's steps matches that room's chart (Room 12: >3 h, Room 6: >2 h).
		const waits = Object.values(room.actions).join(' ').match(/more than (\d+) h/g) ?? [];
		expect(waits.length).toBeGreaterThan(0);
		expect(new Set(waits)).toEqual(new Set([`more than ${room.retestHours} h`]));
		// Chart doses bring pH to 8.2: 7.8 is +0.4, 7.6 is +0.6.
		expect(room.ph.at7_8).toBe(room.ph.gramsPerTenth * 4);
		expect(room.ph.at7_6).toBe(room.ph.gramsPerTenth * 6);
	}
	const [room12, room6] = WATER_QUALITY_ROOMS;
	expect(room12.actions.ammonia).toContain('coordinate a water change with MARFU');
	expect(room6.actions.ammonia).toContain('75% water change');
});
