// ============================================================
// The Pheasant Invitational — Service Worker
// Enables install-to-home-screen (PWA) + instant repeat loads.
//
// Caching strategy (deliberate):
//   • Live data (Apps Script proxy + Golf Genius) → NETWORK ONLY.
//     Never cached, so the leaderboard/pairings are always current.
//   • Navigations / HTML → NETWORK FIRST (fall back to cache offline),
//     so deploys show up immediately.
//   • Static assets (css / js / images / fonts) → STALE-WHILE-REVALIDATE
//     for instant loads that still refresh in the background.
// Bump CACHE_VERSION to force old caches to clear on next visit.
// ============================================================
var CACHE_VERSION = 'pheasant-v4';
var PRECACHE = [
  './',
  'index.html',
  'styles.css',
  'app.js',
  'copper-logo-nav.png',
  'app-icon-192.png',
  'app-icon-512.png',
  'apple-touch-icon.png',
  'favicon.ico',
  'manifest.json'
];

// Hosts whose responses must always be fresh (never served from cache).
function isLiveData(url) {
  return /script\.google\.com|golfgenius\.com/.test(url);
}

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(function (cache) {
      // Best-effort precache; don't fail install if one asset 404s.
      return Promise.allSettled(PRECACHE.map(function (u) { return cache.add(u); }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE_VERSION; })
                            .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;

  // Live tournament data → always hit the network, never cache.
  if (isLiveData(req.url)) {
    event.respondWith(fetch(req));
    return;
  }

  // HTML, CSS and JS → network first (always fresh), cache fallback offline.
  var isHTML = req.mode === 'navigate' ||
               (req.headers.get('accept') || '').indexOf('text/html') !== -1;
  var isCode = /\.(css|js)(\?|$)/i.test(req.url);
  if (isHTML || isCode) {
    event.respondWith(
      fetch(req).then(function (resp) {
        var copy = resp.clone();
        caches.open(CACHE_VERSION).then(function (c) { c.put(req, copy); });
        return resp;
      }).catch(function () {
        return caches.match(req).then(function (hit) {
          return hit || caches.match('index.html');
        });
      })
    );
    return;
  }

  // Everything else (assets) → stale-while-revalidate.
  event.respondWith(
    caches.match(req).then(function (hit) {
      var network = fetch(req).then(function (resp) {
        if (resp && resp.status === 200 && resp.type !== 'opaque') {
          var copy = resp.clone();
          caches.open(CACHE_VERSION).then(function (c) { c.put(req, copy); });
        }
        return resp;
      }).catch(function () { return hit; });
      return hit || network;
    })
  );
});
