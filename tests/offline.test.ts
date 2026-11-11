import { expect, it, vi } from 'vitest';
import { createOfflineCache } from '../src/lib/offlineCache';

function harness() {
	const stores = new Map<string, Map<string, Response>>();
	const key = (input: RequestInfo | URL) => typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
	const network = vi.fn<typeof fetch>().mockImplementation(async input => new Response(`network:${key(input)}`));
	const storage = {
		keys: async () => [...stores.keys()],
		delete: async (name: string) => stores.delete(name),
		open: async (name: string) => {
			if (!stores.has(name)) stores.set(name, new Map()); const entries = stores.get(name)!;
			return {
				addAll: async (requests: Request[]) => { const responses = await Promise.all(requests.map(r => network(r))); responses.forEach((r, i) => entries.set(requests[i].url, r)); },
				match: async (request: RequestInfo) => entries.get(key(request))?.clone(),
				put: async (request: RequestInfo, response: Response) => { entries.set(key(request), response); }
			};
		}
	} as unknown as CacheStorage;
	return { stores, storage, network };
}
const origin = 'https://lab.test';
const navigation = () => { const request = new Request(origin + '/'); Object.defineProperty(request, 'mode', { value: 'navigate' }); return request; };
it('installs all dependencies and boots offline without HTTP cache', async () => {
	const { storage, network } = harness();
	const cache = createOfflineCache(storage, network, origin, 'a', ['/_app/immutable/start.js', '/app.css', '/sw.js']);
	await cache.install(); expect(network).toHaveBeenCalledTimes(4); // 2 assets (sw.js excluded) + shell + /help
	network.mockRejectedValue(new Error('offline'));
	expect(await (await cache.respond(navigation())).text()).toContain('network:https://lab.test/');
	expect(await (await cache.respond(new Request(origin + '/_app/immutable/start.js'))).text()).toContain('start.js');
});
it('refreshes navigation and caches newly deployed immutable dependencies', async () => {
	const { storage, network } = harness(); const cache = createOfflineCache(storage, network, origin, 'a', []); await cache.install();
	network.mockResolvedValue(new Response('new shell')); await cache.respond(navigation());
	network.mockResolvedValue(new Response('new JS')); await cache.respond(new Request(origin + '/_app/immutable/new.js'));
	network.mockRejectedValue(new Error('offline'));
	expect(await (await cache.respond(navigation())).text()).toBe('new shell');
	expect(await (await cache.respond(new Request(origin + '/_app/immutable/new.js'))).text()).toBe('new JS');
});
it('cleans only app caches and bypasses APIs, mutations and third parties', async () => {
	const { storage } = harness(); await storage.open('rummerlab-shell-old'); await storage.open('rummerlab-husbandry-v1'); await storage.open('unrelated');
	const cache = createOfflineCache(storage, fetch, origin, 'new', []); await storage.open('rummerlab-shell-new'); await cache.activate();
	expect(await storage.keys()).toEqual(['unrelated', 'rummerlab-shell-new']);
	expect(cache.handles(new Request(origin + '/api/health'))).toBe(false);
	expect(cache.handles(new Request(origin + '/login'))).toBe(false);
	expect(cache.handles(new Request(origin + '/', { method: 'POST' }))).toBe(false);
	expect(cache.handles(new Request('https://other.test/a.js'))).toBe(false);
	// Vercel Web Analytics script and beacons go straight to the network, never the app cache.
	expect(cache.handles(new Request(origin + '/_vercel/insights/script.js'))).toBe(false);
	expect(cache.handles(new Request(origin + '/_vercel/insights/view', { method: 'POST', body: '{}' }))).toBe(false);
	expect(cache.handles(navigation())).toBe(true);
});

it('never replaces authentication responses with a cached shell', async () => {
	const { storage, network } = harness();
	const cache = createOfflineCache(storage, network, origin, 'auth', []);
	await cache.install();
	for (const status of [401, 403]) {
		network.mockResolvedValueOnce(new Response('Sign in required', { status }));
		const result = await cache.respond(navigation());
		expect(result.status).toBe(status);
		expect(await result.text()).toBe('Sign in required');
	}
});

it('keeps an installed version usable when a new precache fails', async () => {
	const { storage, network, stores } = harness();
	const old = createOfflineCache(storage, network, origin, 'old', ['/old.js']);
	await old.install();
	const before = [...stores.get('rummerlab-shell-old')!.keys()];
	network.mockRejectedValue(new Error('Dependency unavailable'));
	const next = createOfflineCache(storage, network, origin, 'new', ['/new.js']);
	await expect(next.install()).rejects.toThrow('Dependency unavailable');
	expect([...stores.get('rummerlab-shell-old')!.keys()]).toEqual(before);
	expect(await (await old.respond(navigation())).text()).toContain('network:https://lab.test/');
});

it('falls back for 5xx, offline help and deep links, and reports a genuinely missing shell', async () => {
	const { storage, network } = harness();
	const cache = createOfflineCache(storage, network, origin, 'fallback', []);
	await cache.install();
	network.mockResolvedValue(new Response('Unavailable', { status: 503 }));
	expect(await (await cache.respond(navigation())).text()).toContain('network:https://lab.test/');
	network.mockRejectedValue(new Error('Offline'));
	const nav = (path: string) => ({ url: origin + path, mode: 'navigate', method: 'GET' }) as Request;
	expect(await (await cache.respond(nav('/help#pathway'))).text()).toContain('/help');
	expect(await (await cache.respond(nav('/?tab=room6'))).text()).toContain('network:https://lab.test/');
	const empty = createOfflineCache(storage, network, origin, 'empty', []);
	expect((await empty.respond(navigation())).status).toBe(503);
});

it('excludes sensitive and telemetry paths even when offered as precache files or navigations', async () => {
	const { storage, network } = harness();
	const paths = ['/api/submit', '/login', '/auth/google', '/insights', '/_vercel/insights/script.js', '/_vercel/speed-insights/script.js', '/sw.js'];
	const cache = createOfflineCache(storage, network, origin, 'privacy', paths);
	await cache.install();
	expect(network).toHaveBeenCalledTimes(2); // Only the two offline pages.
	for (const path of paths) {
		expect(cache.handles(new Request(origin + path))).toBe(false);
		expect(cache.handles({ url: origin + path, method: 'GET', mode: 'navigate' } as Request)).toBe(false);
	}
});
