import { self } from '$app/service-worker';
import { immutable, assets } from '$app/manifest';
import { version } from '$app/env';
import { createOfflineCache } from '../lib/offlineCache';

const cache = createOfflineCache(caches, fetch, self.location.origin, version, [...immutable, ...assets].map(file => `/${file.path.replace(/^\//, '')}`));
self.addEventListener('install', event => { event.waitUntil(cache.install()); });
// Do not skipWaiting: an open form must not change versions underneath its user.
self.addEventListener('activate', event => { event.waitUntil(cache.activate().then(() => self.clients.claim())); });
self.addEventListener('fetch', event => {
	if (cache.handles(event.request)) event.respondWith(cache.respond(event.request));
});
