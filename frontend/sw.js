const CACHE_NAME = 'calisthenix-v6';
const STATIC_ASSETS = [
  './',
  './index.html',
  './css/base.css',
  './css/components.css',
  './css/layout.css',
  './css/variables.css',
  './js/api.js',
  './js/state.js',
  './js/views/home.js',
  './js/views/workout.js',
  './js/views/history.js',
  './js/views/progress.js',
  './js/views/prs.js',
  './js/views/split.js',
  './js/views/settings.js',
  './js/components/muscleMap.js',
  './js/components/exerciseAnimation.js',
  './js/router.js',
  './js/app.js',
  './manifest.json',
  './assets/icons/icon.svg',
  './assets/icons/icon-192.svg',
  './assets/icons/icon-512.svg',
  './assets/avatar.svg',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
  'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700;800&family=Outfit:wght@500;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('PWA Cache addAll non-blocking warning:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Bypass API requests to Flask backend
  if (url.port === '5001' ||
      url.pathname.startsWith('/exercises') ||
      url.pathname.startsWith('/logs') ||
      url.pathname.startsWith('/routines') ||
      url.pathname.startsWith('/splits') ||
      url.pathname.startsWith('/workouts') ||
      url.pathname.startsWith('/today') ||
      url.pathname.startsWith('/dashboard') ||
      url.pathname.startsWith('/export') ||
      url.pathname.startsWith('/import') ||
      url.pathname.startsWith('/workout_sessions') ||
      url.pathname.startsWith('/api')) {
    return;
  }

  // Network-First strategy with cache fallback
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});
