// ═══════════════════════════════════════════════════════════
//  MISAGI — Service Worker v1.0
//  Cachea el shell de la app para que sea instalable (PWA)
//  y funcione offline con el mensaje de "sin conexión".
// ═══════════════════════════════════════════════════════════

const CACHE_NAME = "misagi-asistencia-v1";

// Archivos que se cachean al instalar
const PRECACHE_URLS = [
  "./index.html",
  "./manifest.json"
];

// ── Instalación: precachea el shell ─────────────────────────
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
  // Activa el SW inmediatamente sin esperar a que se cierre la pestaña
  self.skipWaiting();
});

// ── Activación: elimina caches viejos ───────────────────────
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: Network-first para Firebase, Cache-first para shell ──
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  // Firebase y Google Fonts siempre van a la red (datos en tiempo real)
  if (
    url.hostname.includes("firebasejs") ||
    url.hostname.includes("googleapis") ||
    url.hostname.includes("firestore") ||
    url.hostname.includes("gstatic")
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Shell: Cache-first, fallback a red
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Solo cachea respuestas válidas del mismo origen
        if (
          response.status === 200 &&
          event.request.method === "GET" &&
          url.origin === self.location.origin
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Sin red y sin cache: devuelve la página principal del cache
        return caches.match("./index.html");
      });
    })
  );
});
