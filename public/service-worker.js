// ----------------------------------------------------------------------------
// LehrlingsApp Service Worker
//
// Network-First-Strategie für die App selbst (HTML/JS/CSS), damit Änderungen
// nach einem Deploy für alle Nutzer sofort ankommen, ohne dass jemand manuell
// den Cache leeren muss. Der Cache dient nur noch als Offline-Rückfalloption.
//
// Zusätzlich: Empfängt Web-Push-Nachrichten (z.B. Stundenzettel-Erinnerung am
// Monatsletzten) und zeigt sie als System-Benachrichtigung an, auch wenn die
// App gerade geschlossen ist.
//
// CACHE_VERSION MUSS bei jedem inhaltlichen Update erhöht werden, damit
// activate() den alten Cache zuverlässig wegwirft.
// ----------------------------------------------------------------------------

const CACHE_VERSION = "v2";
const CACHE_NAME = `lehrlingsapp-cache-${CACHE_VERSION}`;
const PRECACHE_URLS = ["/", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

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

  if (request.url.startsWith(self.location.origin)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached ?? caches.match("/"))),
    );
    return;
  }

  event.respondWith(fetch(request).catch(() => caches.match(request)));
});

// ----------------------------------------------------------------------------
// Web Push: eingehende Nachricht als Systembenachrichtigung anzeigen
// ----------------------------------------------------------------------------
self.addEventListener("push", (event) => {
  let data = {
    title: "LehrlingsApp",
    body: "Du hast eine neue Benachrichtigung.",
  };
  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch (err) {
    // Falls die Nutzlast kein JSON ist, Standardtext verwenden
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: data.url || "/" },
    }),
  );
});

// Klick auf die Benachrichtigung öffnet die App
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(url);
        }
      }),
  );
});
