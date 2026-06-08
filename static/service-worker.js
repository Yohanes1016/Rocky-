const CACHE_NAME = 'rocky-ai-v1';
const ASSETS = [
    '/',
    '/static/style.css',
    '/static/script.js',
    '/static/bot.png'
];

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
});

self.addEventListener('fetch', e => {
    e.respondWith(
        caches.match(e.request).then(res => res || fetch(e.request))
    );
});