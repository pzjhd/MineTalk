/* ============================================
   Service Worker — MineTalk PWA
   ============================================ */

const CACHE_NAME = 'minetalk-v1';
const ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './js/storage.js',
  './js/game.js',
  './js/scenes.js',
  './js/api.js',
  './js/speech.js',
  './js/ui.js',
  './js/app.js',
  './manifest.json',
];

// Install: 缓存所有静态资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: 清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch: 缓存优先策略
self.addEventListener('fetch', (event) => {
  // 跳过API请求
  if (event.request.url.includes('api.deepseek.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      // 缓存命中，返回缓存
      if (cached) return cached;

      // 否则发起网络请求
      return fetch(event.request).then((response) => {
        // 只缓存成功的GET请求
        if (!response || response.status !== 200 || event.request.method !== 'GET') {
          return response;
        }

        // 克隆并缓存
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, clone);
        });

        return response;
      }).catch(() => {
        // 离线且无缓存：返回空
        return new Response('', { status: 408 });
      });
    })
  );
});
