/* Learning World — service worker
   Offline app shell: cache-first with stale-while-revalidate.
   The whole game (art, audio, code) lives in the single index.html,
   so caching the shell below makes the full game work with no signal
   after the first visit. All paths are relative to this file so the
   GitHub Pages subpath (/cute-learning-work/) resolves correctly. */

const CACHE_NAME = 'lw-v7';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => Promise.all(APP_SHELL.map((url) =>
        // Tolerate individual failures (e.g. an icon not uploaded yet):
        // one missing file must never block the offline shell.
        cache.add(url).catch(() => {})
      )))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((cached) => {
      // Always try the network in the background: a fresh copy updates
      // the cache for next time (stale-while-revalidate), and it is the
      // fallback when nothing is cached yet.
      const network = fetch(req).then((res) => {
        try {
          if (res && res.ok && new URL(req.url).origin === self.location.origin) {
            const copy = res.clone();
            caches.open(CACHE_NAME)
              .then((cache) => cache.put(req, copy))
              .catch(() => {});
          }
        } catch (e) {}
        return res;
      }).catch(() => cached);

      return cached || network;
    })
  );
});
