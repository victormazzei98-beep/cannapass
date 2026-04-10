/* ═══════════════════════════════════════════
   CANNAPASS — Service Worker
   Offline caching, PWA installability,
   push notification display
   ═══════════════════════════════════════════ */

const CACHE_NAME = 'cannapass-v3';

// App shell — local files to cache on install
const APP_SHELL = [
  '/',
  '/index.html',
  '/css/variables.css',
  '/css/base.css',
  '/css/components.css',
  '/css/auth.css',
  '/css/layout.css',
  '/css/pages.css',
  '/js/config.js',
  '/js/icons.js',
  '/js/state.js',
  '/js/i18n.js',
  '/js/utils.js',
  '/js/auth.js',
  '/js/router.js',
  '/js/patient.js',
  '/js/agent.js',
  '/js/admin.js',
  '/js/notifications.js',
  '/manifest.json'
];

// CDN libraries to cache on first use
const CDN_HOSTS = [
  'cdn.jsdelivr.net',
  'cdnjs.cloudflare.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'unpkg.com'
];

// ─── Install: cache app shell (bypass HTTP cache) ───
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache =>
        Promise.all(
          APP_SHELL.map(url =>
            fetch(url, { cache: 'no-cache' })
              .then(resp => resp.ok ? cache.put(url, resp) : undefined)
              .catch(() => {}) // ignore failures for individual files
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

// ─── Activate: clean old caches ───
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ─── Fetch Strategy ───
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET and Supabase API calls
  if (event.request.method !== 'GET') return;
  if (url.hostname.includes('supabase.co')) return;
  if (url.hostname.includes('brasilapi.com.br')) return;

  // CDN resources: cache-first
  if (CDN_HOSTS.some(h => url.hostname.includes(h))) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // App shell: network-first with cache fallback
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// ─── Push Notification Display ───
self.addEventListener('push', (event) => {
  let data = { title: 'Cannapass', body: 'Nova notificação' };

  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body || '',
    icon: '/manifest-icon-192.png',
    badge: '/manifest-icon-192.png',
    tag: data.tag || 'cannapass-notification',
    data: { url: data.action_url || '/' },
    vibrate: [100, 50, 100]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Cannapass', options)
  );
});

// ─── Notification Click: open app ───
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      // Focus existing window if open
      for (const client of clients) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          if (url !== '/') client.navigate(url);
          return;
        }
      }
      // Open new window
      return self.clients.openWindow(url);
    })
  );
});
