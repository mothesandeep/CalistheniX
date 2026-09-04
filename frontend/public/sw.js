const CACHE_NAME = 'calisthenix-v27';
const STATIC_ASSETS = [
  './',
  './index.html',
  './offline.html',
  './manifest.json',
  './assets/icons/icon.svg',
  './assets/icons/icon-192.svg',
  './assets/icons/icon-512.svg',
  './assets/avatar.svg',
  './assets/grip-guide.svg',
  './assets/movement-stages.svg',
  './assets/tempo-guide.svg',
  './assets/muscle-front.svg',
  './assets/muscle-back.svg',
  '../src/css/variables.css',
  '../src/css/base.css',
  '../src/css/layout.css',
  '../src/css/components/buttons.css',
  '../src/css/components/cards.css',
  '../src/css/components/forms.css',
  '../src/css/components/toast.css',
  '../src/css/components/nav.css',
  '../src/css/components/modals.css',
  '../src/css/components/home-dashboard.css',
  '../src/css/components/workout-runner.css',
  '../src/css/components/split-editor.css',
  '../src/css/components/history.css',
  '../src/css/components/progress-charts.css',
  '../src/css/components/prs.css',
  '../src/css/components/calendar.css',
  '../src/css/components/exercise-library.css',
  '../src/css/components/settings.css',
  '../src/js/utils/constants.js',
  '../src/js/utils/utils.js',
  '../src/js/utils/audio.js',
  '../src/js/utils/storage.js',
  '../src/js/state/state.js',
  '../src/js/api/client.js',
  '../src/js/components/exercise-animation.js',
  '../src/js/components/muscle-map.js',
  '../src/js/features/home.js',
  '../src/js/features/workout-runner.js',
  '../src/js/features/log-entry.js',
  '../src/js/features/history-list.js',
  '../src/js/features/progress-chart.js',
  '../src/js/features/personal-records.js',
  '../src/js/features/calendar.js',
  '../src/js/features/split-manager.js',
  '../src/js/features/exercise-library.js',
  '../src/js/features/settings.js',
  '../src/js/router.js',
  '../src/js/bootstrap.js',
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
        return caches.match(event.request).then(cachedResponse => {
          if (cachedResponse) return cachedResponse;
          if (event.request.mode === 'navigate') {
            return caches.match('./offline.html');
          }
          return new Response('Network unavailable', { status: 503, statusText: 'Service Unavailable' });
        });
      })
  );
});
