// 급식 알레르기 알림 PWA - 서비스 워커

// Workbox 프리캐시 매니페스트 주입 지점 (vite-plugin-pwa 빌드 시 자동 채워짐)
// eslint-disable-next-line no-undef
const WB_MANIFEST = self.__WB_MANIFEST;

const CACHE_NAME = 'food-allergy-v1';
const APP_SHELL = ['/', '/index.html', '/offline.html'];

// 설치: 앱 셸 캐시
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// 활성화: 이전 캐시 정리
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 요청 처리: API는 네트워크 우선, 정적 파일은 캐시 우선
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.pathname.startsWith('/api/')) {
    // API: 네트워크 우선
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({ error: '오프라인 상태입니다.' }), {
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
    return;
  }

  // 정적 파일: 캐시 우선, 실패 시 오프라인 페이지
  event.respondWith(
    caches.match(event.request).then(
      (cached) =>
        cached ||
        fetch(event.request)
          .then((res) => {
            if (res.ok) {
              const clone = res.clone();
              caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
            }
            return res;
          })
          .catch(() => caches.match('/offline.html'))
    )
  );
});

// 푸시 알림 수신
self.addEventListener('push', (event) => {
  let data = { title: '급식 알림', body: '오늘 급식을 확인하세요.', icon: '/icons/icon-192.png', badge: '/icons/icon-72.png', data: { url: '/' } };

  if (event.data) {
    try {
      data = JSON.parse(event.data.text());
    } catch (e) {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/icons/icon-192.png',
      badge: data.badge || '/icons/icon-72.png',
      vibrate: [200, 100, 200],
      tag: 'food-allergy-alert',
      renotify: true,
      data: data.data || { url: '/' },
    })
  );
});

// 알림 클릭 시 앱 열기
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

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
    })
  );
});
