/* =================================================================
   Mimshak Pak — service worker
   Keeps the site usable on a weak connection. Pages and data are
   served network-first so customers never see stale prices; static
   assets are served cache-first for speed.
   ================================================================= */
var VERSION = 'mpk-v1';
var SHELL = VERSION + '-shell';
var RUNTIME = VERSION + '-runtime';

/* Pages worth having available offline. */
var PRECACHE = [
  './',
  './index.html',
  './packaging-cost-calculator.html',
  './contact.html',
  './request-a-quote.html',
  './request-a-sample.html',
  './track-order.html',
  './services.html',
  './products.html',
  './assets/css/styles.css',
  './assets/css/calculator.css',
  './assets/js/main.js',
  './assets/js/quote-rates.js',
  './assets/js/quote-calc.js',
  './assets/js/reviews.js',
  './assets/img/logo.jpeg',
  './offline.html'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(SHELL)
      .then(function (c) {
        // Don't let one missing file abort the whole install.
        return Promise.all(PRECACHE.map(function (u) {
          return c.add(u).catch(function () {});
        }));
      })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== SHELL && k !== RUNTIME) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  var url = new URL(req.url);

  // Never touch anything off-site (maps, WhatsApp, fonts, GitHub API).
  if (url.origin !== self.location.origin) return;

  // Never cache the admin panel or its data — it must always be current.
  if (url.pathname.indexOf('admin') > -1) return;

  var isPage = req.mode === 'navigate' ||
               (req.headers.get('accept') || '').indexOf('text/html') > -1;

  if (isPage) {
    // Network first, so content and prices are never stale.
    e.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(RUNTIME).then(function (c) { c.put(req, copy); });
        return res;
      }).catch(function () {
        return caches.match(req).then(function (hit) {
          return hit || caches.match('./offline.html');
        });
      })
    );
    return;
  }

  // Static assets: cache first, refresh in the background.
  e.respondWith(
    caches.match(req).then(function (hit) {
      var net = fetch(req).then(function (res) {
        if (res && res.status === 200) {
          var copy = res.clone();
          caches.open(RUNTIME).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () { return hit; });
      return hit || net;
    })
  );
});
