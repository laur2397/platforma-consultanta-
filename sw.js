/* Service worker — funcționare offline pentru EU Funds Command Center.
   Strategie:
   - App shell (HTML/CSS/JS/iconițe): cache-first (încărcare instantă, offline).
   - Stratul de date (assets/data.js): network-first (date proaspete când ești online,
     fallback pe cache când ești offline).
   Bump la CACHE_VERSION când schimbi codul aplicației ca să forțezi actualizarea. */

const CACHE_VERSION = "eufcc-v1";
const url = (p) => new URL(p, self.location).toString();

const SHELL = [
  "./",
  "index.html",
  "assets/styles.css",
  "assets/app.js",
  "manifest.webmanifest",
  "icons/favicon.svg",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/apple-touch-icon.png",
].map(url);

const DATA_URL = url("assets/data.js");

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      // datele se prind separat (network-first), aici doar shell-ul
      cache.addAll(SHELL).catch(() => {})
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const reqUrl = new URL(req.url);
  // doar resursele proprii (același origin + în scope)
  if (reqUrl.origin !== self.location.origin) return;

  // Datele: network-first cu fallback pe cache
  if (req.url === DATA_URL) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Restul (shell): cache-first cu revalidare în fundal
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === "basic") {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
