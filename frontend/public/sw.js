// Custom service worker
// eslint-disable-next-line no-undef
const WB_MANIFEST = self.__WB_MANIFEST;

const CACHE_NAME = 'food-allergy-v3';
const scopeUrl = new URL(self.registration.scope);
const scopePath = scopeUrl.pathname.endsWith('/')
  ? scopeUrl.pathname.slice(0, -1)
  : scopeUrl.pathname;
const baseUrl = scopePath ? `${scopePath}/` : '/';
const apiPrefix = scopePath ? `${scopePath}/api/` : '/api/';
const APP_SHELL = [baseUrl, `${baseUrl}index.html`, `${baseUrl}offline.html`];
const defaultIcon = `${baseUrl}seokam_logo_transparent_small.png`;
const defaultBadge = defaultIcon;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isAppShellRequest =
    event.request.mode === 'navigate' ||
    url.pathname === scopeUrl.pathname ||
    url.pathname === `${scopePath}/index.html`;

  if (url.pathname.startsWith(apiPrefix)) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({ error: '오프라인 상태입니다.' }), {
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
    return;
  }

  if (isAppShellRequest) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return res;
        })
        .catch(() =>
          caches.match(event.request).then(
            (cached) => cached || caches.match(`${baseUrl}offline.html`)
          )
        )
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(
      (cached) =>
        cached ||
        fetch(event.request)
          .then((res) => {
            if (res.ok) {
              const clone = res.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return res;
          })
          .catch(() => caches.match(`${baseUrl}offline.html`))
    )
  );
});

self.addEventListener('push', (event) => {
  let data = {
    title: '석암초 안전급식',
    body: '오늘 급식을 확인해 보세요.',
    icon: defaultIcon,
    badge: defaultBadge,
    data: { url: baseUrl },
  };

  if (event.data) {
    try {
      data = JSON.parse(event.data.text());
    } catch (error) {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || defaultIcon,
      badge: data.badge || defaultBadge,
      vibrate: [200, 100, 200],
      tag: 'food-allergy-alert',
      renotify: true,
      data: data.data || { url: baseUrl },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || baseUrl;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
      return undefined;
    })
  );
});
