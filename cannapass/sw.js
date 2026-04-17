/* ═══════════════════════════════════════════
   CANNAPASS — Service Worker
   Offline caching, PWA support
   ═══════════════════════════════════════════ */

const CACHE_NAME = 'cannapass-v1';

// Core app shell files to cache
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/variables.css',
  '/css/base.css',
  '/css/components.css',
  '/css/auth.css',
  '/css/layout.css',
  '/css/pages.css',
  '/js/config.js',
  '/js/icons.js',
  '/js/state.js',
  '/js/utils.js',
  '/js/auth.js',
  '/js/router.js',
  '/js/patient.js',
  '/js/agent.js',
  '/js/admin.js',
  '/js/notifications.js'
];

// CDN resources (cache with network fallback)
const CDN_CACHE = [
  'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Syne:wght@600;700;800&display=swap'
];

// ─── Install: cache app shell ───
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL).catch((err) => {
        console.warn('[SW] Some files failed to cache:', err);
      });
    })
  );
  self.skipWaiting();
});

// ─── Activate: clean old caches ───
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// ─── Fetch: Network-first for API, Cache-first for static ───
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Supabase API calls — always network, no cache
  if (url.hostname.includes('supabase.co') || url.hostname.includes('brasilapi.com.br')) {
    return;
  }

  // CDN resources — cache first, then network
  if (url.hostname.includes('cdn.jsdelivr.net') ||
      url.hostname.includes('cdnjs.cloudflare.com') ||
      url.hostname.includes('unpkg.com') ||
      url.hostname.includes('fonts.googleapis.com') ||
      url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // App shell — network first, cache fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          // Fallback to index.html for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
      })
  );
});
