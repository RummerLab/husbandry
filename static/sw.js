// Migration bridge for devices with the original cache-first /sw.js registered.
// New pages register SvelteKit's generated /service-worker.js automatically.
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => {
 event.waitUntil(caches.delete('rummerlab-husbandry-v1').then(() => self.clients.claim()));
});
// No fetch handler: the next navigation reaches the current application.
