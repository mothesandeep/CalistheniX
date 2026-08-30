const CACHE_NAME = 'calisthenix-v7';
const STATIC_ASSETS = [
  './',
  './index.html',
  './css/variables.css',
  './css/base.css',
  './css/layout.css',
  './css/components/buttons.css',
  './css/components/cards.css',
  './css/components/forms.css',
  './css/components/toast.css',
  './css/components/nav.css',
  './css/components/modals.css',
  './css/components/home-dashboard.css',
  './css/components/workout-runner.css',
  './css/components/split-editor.css',
  './css/components/history.css',
  './css/components/progress-charts.css',
  './css/components/prs.css',
  './css/components/calendar.css',
  './css/components/settings.css',
  './js/core/constants.js',
  './js/core/utils.js',
  './js/core/audio.js',
  './js/core/storage.js',
  './js/core/state.js',
  './js/api.js',
  './js/components/exercise-animation.js',
  './js/components/muscle-map.js',
  './js/views/home.js',
  './js/views/workout-runner.js',
  './js/views/log-entry.js',
  './js/views/history-list.js',
  './js/views/progress-chart.js',
  './js/views/personal-records.js',
  './js/views/calendar.js',
  './js/views/split-manager.js',
  './js/views/settings.js',
  './js/router.js',
  './js/bootstrap.js',
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
