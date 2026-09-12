const CACHE_NAME = 'atmosvision-v2';
const offlineAssets = [
    '/',
    '/static/css/style.css',
    '/static/js/script.js',
    '/static/images/snow.jpg'
];

// Install Event: Save files to the device
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(offlineAssets);
            })
    );
});

// Fetch Event: Load from device if internet is down
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Return cached version if offline, otherwise fetch from internet
                return response || fetch(event.request);
            })
    );
});