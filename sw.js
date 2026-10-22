/* Engine service worker: opens instantly and works offline. App files: network first (always the newest
   version when online), heavy libraries and the label reader: cache first. */
const V = "engine-202610221024";
const CORE = ["./", "index.html", "config.js", "vendor/supabase.js", "manifest.webmanifest", "icons/icon-192.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(V).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const req = e.request, u = new URL(req.url);
  if (req.method !== "GET" || u.origin !== location.origin) return;
  const heavy = /\/(vendor|ocr|icons)\//.test(u.pathname);
  if (!heavy) { e.respondWith(fetch(req).then(r => { if (r.ok) { const c = r.clone(); caches.open(V).then(x => x.put(req, c)); } return r; }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match("index.html")))); return; }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(r => r || fetch(req).then(r2 => { if (r2.ok) { const c = r2.clone(); caches.open(V).then(x => x.put(req, c)); } return r2; })));
});
