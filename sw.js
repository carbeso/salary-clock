/**
 * 薪資時鐘 (Salary Clock) - PWA Service Worker
 * 提供離線秒開與靜態資源背景更新能力
 */

const CACHE_NAME = 'salary-clock-v1';

const STATIC_ASSETS = [
    './',
    './index.html',
    './manifest.webmanifest',
    './icons/icon.svg',
    './src/ui/styles.css',
    './src/ui/app.js',
    './src/ui/boss-key.js',
    './src/ui/pip-controller.js',
    './src/core/engine.js',
    './src/core/storage.js',
    './src/core/time-service.js',
    './src/utils/formatters.js'
];

// 安裝階段：預先快取靜態資源
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        }).then(() => self.skipWaiting())
    );
});

// 啟動階段：清理舊版本快取
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        }).then(() => self.clients.claim())
    );
});

// 請求攔截：Stale-While-Revalidate (優先從快取秒開，背景發起網路請求靜默更新)
self.addEventListener('fetch', (event) => {
    // 僅處理同源之 GET 請求
    if (event.request.method !== 'GET') return;
    const url = new URL(event.request.url);
    if (url.origin !== self.location.origin) return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return networkResponse;
            }).catch(() => {
                // 離線時若網路失敗直接依賴快取
                return cachedResponse;
            });

            return cachedResponse || fetchPromise;
        })
    );
});
