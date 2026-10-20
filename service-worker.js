const CACHE_NAME = "elis-panel-v50";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./locationFormat.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

// Instalacja – zapisujemy pliki w cache
self.addEventListener("install", (event) => {
  self.skipWaiting(); // <--- wymusza natychmiastową aktywację nowej wersji
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim()) // <--- aktywuje nową wersję od razu
  );
});


// Obsługa żądań – najpierw sieć (zawsze najnowsza wersja), cache tylko offline
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const isOwnAsset = request.method === "GET" && new URL(request.url).origin === self.location.origin;

  if (!isOwnAsset) return;

  event.respondWith(
    fetch(request, { cache: "no-cache" })
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request, { ignoreSearch: true }))
  );
});
