const CACHE = "kombin-v3";
const PRECACHE = [
  "./",
  "index.html",
  "style.css",
  "colors.js",
  "db.js",
  "camera.js",
  "app.js",
  "manifest.json",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-192-maskable.png",
  "icons/icon-512-maskable.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE).then(() => self.skipWaiting()))
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  try {
    if (e.request.method !== "GET") return;
    e.respondWith(
      caches.open(CACHE).then((c) =>
        c.match(e.request).then((hit) => {
          const net = fetch(e.request)
            .then((res) => {
              if (res.ok) c.put(e.request, res.clone());
              return res;
            })
            .catch(() => hit);
          return hit || net;
        })
      )
    );
  } catch (err) {
    return;
  }
});
