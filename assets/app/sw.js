/* UFIBER Guide service worker.
   The guide is one self-contained file, so caching it is enough to work
   with no connection at all — which is the point on a shop floor.
   The cache name carries the build, so a new version replaces the old one. */
const BUILD = 'ufiber-1.1.8';
const FILES = ['./ufiber-guide.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(BUILD).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()).catch(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith('ufiber-') && k !== BUILD).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;     // never touch anything off this site
  // Network first so an updated guide is picked up, cache when offline.
  e.respondWith(
    fetch(req).then((res) => {
      if (res && res.ok) { const copy = res.clone(); caches.open(BUILD).then((c) => c.put(req, copy)).catch(() => {}); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match('./ufiber-guide.html')))
  );
});
