// ----------------------------------------------------------------------------
// LehrlingsApp Service Worker
// Cache-First-Strategie für statische Assets, Network-First für alles andere.
// Der Service Worker aktualisiert sich automatisch (skipWaiting + clients.claim).
// ----------------------------------------------------------------------------

const CACHE_NAME = "lehrlingsapp-cache-v1";
const PRECACHE_URLS = ["/", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // API-/Supabase-Aufrufe: Network-First, kein Caching von dynamischen Daten
  if (
    url.hostname.includes("supabase.co") ||
    url.hostname.includes("anthropic.com")
  ) {
    event.respondWith(
      fetch(request).catch(
        () =>
          new Response(JSON.stringify({ offline: true }), {
            headers: { "Content-Type": "application/json" },
          }),
      ),
    );
    return;
  }

  // Statische Assets: Cache-First
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (response.ok && request.url.startsWith(self.location.origin)) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match("/"));
    }),
  );
});
