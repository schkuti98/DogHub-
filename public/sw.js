const CACHE_NAME = 'dogtrainer-static-v2';

const STATIC_ASSETS = [
   '/css/style.css',
   '/js/pwa.js',
   '/icons/icon-192.png',
   '/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
   event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
   );

   self.skipWaiting();
});

self.addEventListener('activate', (event) => {
   event.waitUntil(
      caches.keys().then((cacheNames) => Promise.all(
         cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName))
      ))
   );

   self.clients.claim();
});

self.addEventListener('fetch', (event) => {
   const request = event.request;
   const url = new URL(request.url);

   if (request.method !== 'GET' || url.origin !== self.location.origin) return;

   // Benutzer- und Trickdaten dürfen nicht offline aus dem Cache kommen.
   if (url.pathname.startsWith('/api/')) return;

   if (['style', 'script', 'image', 'font'].includes(request.destination)) {
      event.respondWith(
         caches.match(request).then((cachedResponse) => cachedResponse || fetch(request))
      );
   }
});
