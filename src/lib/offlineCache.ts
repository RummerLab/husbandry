const PREFIX = 'rummerlab-shell-';
/** Navigations kept for offline use: the app shell and the escalation guide (#help). */
const OFFLINE_PAGES = ['/', '/help'];

export function createOfflineCache(storage: CacheStorage, network: typeof fetch, origin: string, version: string, files: string[]) {
	const name = PREFIX + version;
	const absolute = (path: string) => new URL(path, origin).href;
	const assets = new Set(files.filter(path => !path.endsWith('/sw.js')).map(absolute));
	const root = absolute('/');
	const pages = new Set(OFFLINE_PAGES.map(absolute));
	return {
		async install() {
			const cache = await storage.open(name);
			// Installation fails as a whole if the shell or a built dependency fails.
			await cache.addAll([...assets, ...pages].map(url => new Request(url, { cache: 'reload' })));
		},
		async activate() {
			await Promise.all((await storage.keys()).filter(key => (key.startsWith(PREFIX) || key === 'rummerlab-husbandry-v1') && key !== name).map(key => storage.delete(key)));
		},
		handles(request: Request) {
			const url = new URL(request.url);
			return request.method === 'GET' && url.origin === origin && !url.pathname.startsWith('/api/') && url.pathname !== '/login' &&
				// Lab-wide data and sign-in are always network-only (#66).
				!url.pathname.startsWith('/insights') && !url.pathname.startsWith('/auth/') &&
				(request.mode === 'navigate' || assets.has(url.href) || url.pathname.startsWith('/_app/immutable/'));
		},
		async respond(request: Request): Promise<Response> {
			const cache = await storage.open(name);
			if (request.mode === 'navigate') {
				const page = absolute(new URL(request.url).pathname);
				try {
					const response = await network(request, { signal: AbortSignal.timeout(5000) });
					if (response.ok && pages.has(page)) await cache.put(page, response.clone());
					if (response.ok || response.status < 500) return response;
				} catch { /* Fall through to the cached page, then the installed shell, when offline. */ }
				return (pages.has(page) && await cache.match(page)) || await cache.match(root) || new Response('Offline shell unavailable. Reconnect to load the app.', { status: 503 });
			}
			const cached = await cache.match(request);
			if (cached) return cached;
			const response = await network(request);
			if (response.ok) await cache.put(request, response.clone());
			return response;
		}
	};
}
