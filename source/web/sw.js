/* Engine service worker: opens instantly and works offline.
   App files: network first with a short timeout (the newest version when online, the saved one when not).
   Libraries, the label reader and icons: kept in their own cache that survives updates. */
const V = "engine-__BUILD__", HEAVY = "engine-heavy-1";
const CORE = ["./", "index.html", "config.js", "vendor/supabase.js", "manifest.webmanifest", "icons/icon-192.png"];
const WARM = ["vendor/zxing.min.js", "vendor/tesseract.min.js", "ocr/worker.min.js", "ocr/core/tesseract-core-simd-lstm.wasm.js", "ocr/core/tesseract-core-lstm.wasm.js", "ocr/lang/ita.wasm"];
self.addEventListener("install", e => { e.waitUntil(caches.open(V).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V && k !== HEAVY).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
/* the page asks for this once it's idle: the barcode and label readers become available offline */
self.addEventListener("message", e => { if (e.data === "warm") e.waitUntil(caches.open(HEAVY).then(async c => { for (const u of WARM) { if (!(await c.match(u))) { try { const r = await fetch(u); if (r.ok) await c.put(u, r); } catch (x) {} } } })); });
const timeout = (p, ms) => new Promise((ok, no) => { const t = setTimeout(() => no(new Error("timeout")), ms); p.then(r => { clearTimeout(t); ok(r); }, x => { clearTimeout(t); no(x); }); });
self.addEventListener("fetch", e => {
  const req = e.request, u = new URL(req.url);
  if (req.method !== "GET" || u.origin !== location.origin) return;
  const heavy = /\/(vendor|ocr|icons)\//.test(u.pathname);
  if (heavy) {
    e.respondWith(caches.open(HEAVY).then(c => c.match(req, { ignoreSearch: true }).then(r => r || fetch(req).then(r2 => { if (r2.ok) c.put(req, r2.clone()); return r2; }))));
    return;
  }
  const net = fetch(req).then(r => { if (r.ok) { const c = r.clone(); caches.open(V).then(x => x.put(req, c)); } return r; });
  e.respondWith(timeout(net, req.mode === "navigate" ? 3500 : 6000).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || (req.mode === "navigate" ? caches.match("index.html") : net))));
});
/* push from the Engine function in your Supabase project (reminders with the app closed) */
self.addEventListener("push", e => {
  let m = {}; try { m = e.data ? e.data.json() : {}; } catch (x) { m = { title: "Engine", body: e.data ? e.data.text() : "" }; }
  const d = m.data || {}, o = { body: m.body || "", tag: m.tag || "engine", icon: "icons/icon-192.png", badge: "icons/icon-192.png", data: d, renotify: true, ...(d.k ? { actions: [{ action: "taken", title: "Taken" }] } : {}) };
  e.waitUntil(self.registration.showNotification(m.title || "Engine", o));
});
/* tapping a reminder: "Taken" ticks the supplement, otherwise the app opens where it matters */
self.addEventListener("notificationclick", e => {
  const n = e.notification, d = n.data || {}; n.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(cs => {
    const c = cs[0], msg = e.action === "taken" && d.k ? { type: "supp-taken", k: d.k, date: d.date } : d.tab ? { type: "open-tab", tab: d.tab } : null;
    if (c) { if (msg) c.postMessage(msg); return c.focus(); }
    const url = e.action === "taken" && d.k ? `./?supp=${encodeURIComponent(d.k)}&d=${d.date || ""}` : d.tab ? `./#${d.tab}` : "./";
    return self.clients.openWindow(url);
  }));
});
