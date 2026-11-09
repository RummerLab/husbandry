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
	await cache.install(); expect(network).toHaveBeenCalledTimes(3);
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
