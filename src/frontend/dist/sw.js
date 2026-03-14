const CACHE_NAME = 'medorder-v3';
const SHELL = [
  '/',
  '/index.html',
];

// Install: cache the app shell immediately
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(SHELL);
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean old caches and take control
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // Skip cross-origin requests (ICP canister calls etc)
  if (url.origin !== self.location.origin) return;

  // Navigation requests: cache-first for offline, update cache in background
  if (e.request.mode === 'navigate') {
    e.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        // Try network first
        try {
          const networkResp = await fetch(e.request);
          // Cache the fresh response
          cache.put(e.request, networkResp.clone());
          return networkResp;
        } catch (_) {
          // Network failed - serve from cache (offline)
          const cached = await cache.match('/index.html') || await cache.match('/');
          if (cached) return cached;
          // Last resort fallback
          return new Response(
            '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MedOrder</title></head><body><script>window.location.reload();<\/script></body></html>',
            { headers: { 'Content-Type': 'text/html' } }
          );
        }
      })
    );
    return;
  }

  // Static assets (JS, CSS, images): cache-first, network fallback, cache update
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|webp)$/)
  ) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        const networkFetch = fetch(e.request).then((resp) => {
          if (resp.ok) {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
          }
          return resp;
        });
        return cached || networkFetch;
      })
    );
    return;
  }

  // Everything else: network first, cache fallback
  e.respondWith(
    fetch(e.request).then((resp) => {
      if (resp.ok) {
        const clone = resp.clone();
        caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
      }
      return resp;
    }).catch(() => caches.match(e.request))
  );
});
