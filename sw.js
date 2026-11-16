/* Riddle Me Rika – offline support.
   Strategy: serve from cache right away, refresh the cache in the background
   (stale-while-revalidate). Bump CACHE_VERSION when you want every device to
   drop its old copy at once (e.g. after a big redesign). */
const CACHE_VERSION = 'rmr-v9';

const CORE = [
  './',
  './index.html',
  './style.css',
  './cards.css',
  './categories.js',
  './i18n.js',
  './game.js',
  './manifest.webmanifest',
  './assets/card-face.png',
  './assets/card-back.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Own files plus Google Fonts; everything else goes straight to the network.
  const cacheable = url.origin === self.location.origin ||
    url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!cacheable) return;

  event.respondWith(
    caches.open(CACHE_VERSION).then(async (cache) => {
      // Ignore ?day= / ?reset= so the page still opens offline.
      const isPage = url.origin === self.location.origin &&
        (url.pathname.endsWith('/') || url.pathname.endsWith('index.html'));
      const cached = await cache.match(req, { ignoreSearch: isPage });
      const network = fetch(req)
        .then((res) => {
          if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
