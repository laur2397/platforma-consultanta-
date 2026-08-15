/* Service worker — funcționare offline pentru EU Funds Command Center.
   Strategie (v3):
   - Cod aplicație + date (HTML/CSS/JS): NETWORK-FIRST — mereu proaspăt când ești
     online, fallback pe cache când ești offline. Așa actualizările apar imediat.
   - Iconițe / manifest: cache-first (nu se schimbă des).
   Bump CACHE_VERSION la orice schimbare pentru a purja cache-ul vechi. */

const CACHE_VERSION = "eufcc-v4";
const url = (p) => new URL(p, self.location).toString();

const SHELL = [
  "./",
  "index.html",
  "assets/styles.css",
  "assets/app.js",
  "assets/data.js",
  "manifest.webmanifest",
  "icons/favicon.svg",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/apple-touch-icon.png",
].map(url);

// resurse servite cache-first (rar se schimbă)
const CACHE_FIRST = /\/(icons\/|manifest\.webmanifest)/;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      // individual, ca un URL lipsă să nu anuleze tot precache-ul
      Promise.allSettled(SHELL.map((u) => cache.add(u)))
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const reqUrl = new URL(req.url);
  if (reqUrl.origin !== self.location.origin) return;

  // Iconițe / manifest: cache-first
  if (CACHE_FIRST.test(reqUrl.pathname)) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
            return res;
          })
      )
    );
    return;
  }

  // Restul (cod + date + navigări): network-first cu timeout + fallback pe cache.
  // Timeout-ul acoperă „lie-fi" (conectat dar blocat) — nu mai atârnă la infinit.
  event.respondWith(
    new Promise((resolve) => {
      let done = false;
      const finish = (r) => {
        if (done) return;
        done = true;
        resolve(r);
      };
      const timer = setTimeout(() => {
        caches.match(req).then((c) => c && finish(c));
      }, 4000);
      fetch(req)
        .then((res) => {
          clearTimeout(timer);
          if (res && res.status === 200 && res.type === "basic") {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
          }
          finish(res);
        })
        .catch(() => {
          clearTimeout(timer);
          caches
            .match(req)
            .then((c) => finish(c || caches.match(url("index.html"))));
        });
    })
  );
});
