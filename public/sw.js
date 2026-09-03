/**
 * BrandOps service worker.
 *
 * Its job is installability and a truthful offline state, not aggressive
 * caching. Chrome will not offer "Install app" without a service worker that
 * handles `fetch`, and the manifest at `/site.webmanifest` had been sitting
 * complete and unreferenced, so no device had ever been offered the install.
 *
 * The caching strategy is deliberately conservative, because BrandOps holds a
 * person's workspace and the worst failure here is showing stale state as if it
 * were current:
 *
 * - **Navigations: network first.** A cached shell is served only when the
 *   network fails, so a reachable server always wins.
 * - **Static build assets: cache first.** They are content-hashed by Vite, so a
 *   changed file has a changed URL and a stale hit is not possible.
 * - **Everything else: untouched.** API and gateway traffic never goes through
 *   the cache. Serving a cached answer for a workspace mutation would be the
 *   "success shown when persistence failed" case the directive forbids.
 */
const VERSION = 'brandops-v1';
const SHELL = ['/mobile.html', '/site.webmanifest', '/icons/192.png', '/icons/512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      // `addAll` rejects the whole install if any single entry 404s, which would
      // leave the app permanently uninstallable for a missing icon.
      .then((cache) => Promise.allSettled(SHELL.map((url) => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          void caches.open(VERSION).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() =>
          caches
            .match(request)
            .then((cached) => cached ?? caches.match('/mobile.html'))
            .then(
              (cached) =>
                cached ??
                new Response('BrandOps is offline and has nothing cached for this page yet.', {
                  status: 503,
                  headers: { 'Content-Type': 'text/plain' }
                })
            )
        )
    );
    return;
  }

  // Content-hashed build output only. Anything else goes straight to the network.
  const isBuildAsset =
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/chunks/') ||
    url.pathname.startsWith('/icons/');
  if (!isBuildAsset) return;

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ??
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            void caches.open(VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        })
    )
  );
});
