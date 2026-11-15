/* کاریزما نت - Service Worker (v6)
   هدف: بالا آمدن فوری اپ. صفحه از حافظهٔ گوشی لود می‌شود و در پس‌زمینه به‌روز می‌شود. */
const VER = 'kz-v6';
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png', '/favicon-48.png', '/favicon.ico'];
const CDN = /^https:\/\/(cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)\//;
const SKIP = /(google-analytics|googletagmanager|analytics\.google|doubleclick|mc\.yandex|yandex\.ru|yandex\.com)/;

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VER).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== VER).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function put(req, res) {
  if (res && (res.ok || res.type === 'opaque')) {
    const copy = res.clone();
    caches.open(VER).then(c => c.put(req, copy)).catch(() => {});
  }
  return res;
}

/* اول از کش جواب بده، همزمان در پس‌زمینه تازه‌اش کن */
function staleWhileRevalidate(req, opts) {
  return caches.match(req, opts).then(hit => {
    const net = fetch(req).then(res => put(req, res)).catch(() => null);
    return hit || net.then(r => r || Response.error());
  });
}

/* فونت‌ها و کتابخانه‌های بیرونی: بعد از اولین بار همیشه از کش */
function cacheFirst(req) {
  return caches.match(req).then(hit => hit || fetch(req).then(res => put(req, res)));
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (SKIP.test(url.hostname)) return;

  if (req.mode === 'navigate') {
    e.respondWith(
      caches.match(req, { ignoreSearch: true }).then(hit => {
        const net = fetch(req).then(res => put(req.url.split('#')[0].split('?')[0], res)).catch(() => null);
        if (hit) { e.waitUntil(net); return hit; }
        return net.then(r => r || caches.match('/index.html').then(x => x || caches.match('/')));
      })
    );
    return;
  }

  if (url.origin === location.origin) {
    e.respondWith(staleWhileRevalidate(req));
    return;
  }

  if (CDN.test(req.url)) {
    e.respondWith(cacheFirst(req));
  }
});
