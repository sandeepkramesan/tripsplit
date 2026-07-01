// TripSplit Service Worker
// Cache name — bump version here whenever you update the app
const CACHE = 'tripsplit-v9';

// Files to pre-cache on install
const PRECACHE = [
  '/tripsplit/',
  '/tripsplit/index.html',
  '/tripsplit/manifest.json'
];

// External fonts — cache on first fetch
const FONT_CACHE = 'tripsplit-fonts-v1';

// ── Install: pre-cache app shell ──────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: delete old caches ───────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE && k !== FONT_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: cache-first for app shell + fonts ──────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Google Fonts — cache on first use, serve from cache after
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(FONT_CACHE).then(cache =>
        cache.match(event.request).then(cached => {
          if (cached) return cached;
          return fetch(event.request).then(response => {
            cache.put(event.request, response.clone());
            return response;
          });
        })
      )
    );
    return;
  }

  // App shell — cache first, fall back to network
  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          // Cache successful same-origin responses
          if (response && response.status === 200) {
            caches.open(CACHE).then(cache =>
              cache.put(event.request, response.clone())
            );
          }
          return response;
        }).catch(() => {
          // Offline fallback — serve index.html for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('/tripsplit/index.html');
          }
        });
      })
    );
    return;
  }

  // Everything else — network only
  event.respondWith(fetch(event.request));
});
