const CACHE_NAME = "meganpos-v1";
// DO NOT cache "/" because its content changes on every build (chunk URLs)
const urlsToCache = [
  "/manifest.json",
  "/offline.html",
  // Add other truly static assets (e.g., fonts, icons) if needed
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Never cache Next.js build assets (they change every build)
  if (url.pathname.startsWith("/_next/")) {
    event.respondWith(fetch(event.request));
    return;
  }

  // For navigation requests (HTML pages), try network first, fallback to offline.html
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/offline.html'))
    );
    return;
  }

  // For other requests (manifest, icons, etc.), serve from cache if available
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});