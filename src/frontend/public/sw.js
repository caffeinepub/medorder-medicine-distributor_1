const CACHE_NAME = 'medflow-v6';
const SHELL = ['/', '/index.html'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  if (e.request.mode === 'navigate') {
    e.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        try {
          const resp = await fetch(e.request);
          cache.put(e.request, resp.clone());
          return resp;
        } catch (_) {
          const cached = await cache.match('/index.html') || await cache.match('/');
          if (cached) return cached;
          return new Response(
            '<!DOCTYPE html><html lang="ur-PK"><head><meta charset="utf-8"><title>MedFlow</title></head><body><script>window.location.reload();<\/script></body></html>',
            { headers: { 'Content-Type': 'text/html' } }
          );
        }
      })
    );
    return;
  }

  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|webp)$/)) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        const networkFetch = fetch(e.request).then((resp) => {
          if (resp.ok) caches.open(CACHE_NAME).then((c) => c.put(e.request, resp.clone()));
          return resp;
        });
        return cached || networkFetch;
      })
    );
    return;
  }

  e.respondWith(
    fetch(e.request).then((resp) => {
      if (resp.ok) caches.open(CACHE_NAME).then((c) => c.put(e.request, resp.clone()));
      return resp;
    }).catch(() => caches.match(e.request))
  );
});

// Push Notifications
self.addEventListener('push', (e) => {
  const data = e.data ? e.data.json() : {};
  e.waitUntil(self.registration.showNotification(data.title || 'MedFlow', {
    body: data.body || 'New notification from MedFlow',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: data.url || '/'
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data || '/'));
});

// Background Sync -- sync offline orders when internet returns
self.addEventListener('sync', (e) => {
  if (e.tag === 'sync-orders') {
    e.waitUntil(
      clients.matchAll({ includeUncontrolled: true, type: 'window' }).then((all) => {
        all.forEach((client) => client.postMessage({ type: 'SYNC_OFFLINE_ORDERS' }));
      }).catch((err) => console.warn('[SW] sync failed:', err))
    );
  }
});

// Periodic Background Sync -- refresh data periodically
self.addEventListener('periodicsync', (e) => {
  if (e.tag === 'periodic-sync') {
    e.waitUntil(
      clients.matchAll({ includeUncontrolled: true, type: 'window' }).then((all) => {
        all.forEach((client) => client.postMessage({ type: 'PERIODIC_SYNC_REFRESH' }));
        return caches.open(CACHE_NAME).then((c) => c.addAll(SHELL));
      }).catch((err) => console.warn('[SW] periodicsync failed:', err))
    );
  }
});

// Background Fetch -- handle large background data transfers
self.addEventListener('backgroundfetchsuccess', (e) => {
  e.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        const records = await e.registration.matchAll();
        await Promise.all(records.map(async (record) => {
          const response = await record.responseReady;
          await cache.put(record.request, response);
        }));
        await e.updateUI({ title: 'MedFlow -- Download complete' });
      } catch (err) { console.warn('[SW] bgfetch success error:', err); }
    })()
  );
});

self.addEventListener('backgroundfetchfail', (e) => {
  e.waitUntil(e.updateUI({ title: 'MedFlow -- Download failed' }).catch(() => {}));
});

self.addEventListener('backgroundfetchclick', (e) => {
  e.waitUntil(clients.openWindow('/').catch(() => {}));
});

self.addEventListener('backgroundfetchabort', (e) => {
  console.warn('[SW] Background fetch aborted:', e.registration.id);
});
