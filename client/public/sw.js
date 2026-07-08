// Axle service worker — caches static assets for fast repeat loads.
// API calls always go to the network.
// IMPORTANT: bump CACHE_NAME whenever deploying to force old caches to clear.
const CACHE_NAME = "axle-shell-v2";
const SHELL_ASSETS = [
  "/manifest.webmanifest",
  "/favicon.ico",
  "/favicon.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_ASSETS).catch(() => undefined))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // Never cache API or auth requests; always go to the network.
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) {
    return;
  }

  // Static assets (JS, CSS, images, fonts): cache-first.
  const isStatic =
    url.pathname.startsWith("/assets/") ||
    url.pathname.startsWith("/icons/") ||
    /\.(?:js|css|png|jpg|jpeg|svg|webp|ico|woff2?)$/i.test(url.pathname);

  if (isStatic) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req)
          .then((res) => {
            if (res.ok) {
              const clone = res.clone();
              caches.open(CACHE_NAME).then((c) => c.put(req, clone));
            }
            return res;
          })
          .catch(() => cached);
      })
    );
    return;
  }

  // Document navigations: always go to the network.
  // Do NOT fall back to a cached shell — serving a stale index.html
  // after a new deployment would load old JS bundles and break the app.
  // If the network is unavailable, let the browser show its own offline page.
  if (req.mode === "navigate") {
    return; // Let the browser handle it natively (network only).
  }
});
