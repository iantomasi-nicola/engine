/* Engine service worker: opens instantly and works offline.
   App files: network first with a short timeout (the newest version when online, the saved one when not).
   Libraries, the label reader and icons: each kept in its own cache, renamed by the build when a file of that group changes (the old one is then deleted), so a new icon does not download the label reader again.
   The fonts of Google Fonts: saved the first time, so the app has its type offline too. */
const V = "engine-202610270005", LIB = "engine-lib-7a6d919ff9", OCR = "engine-ocr-becf52da4d", ICO = "engine-icons-3ce539fbd9", FONTS = "engine-fonts-1";
const heavyCache = path => /(^|\/)ocr\//.test(path) ? OCR : /(^|\/)icons\//.test(path) ? ICO : LIB;
const CORE = ["./", "index.html", "config.js", "vendor/supabase.js", "manifest.webmanifest", "icons/icon-192.png", "icons/favicon-32.png", "icons/apple-180.png"];
/* only the Tesseract core this browser will run (the SIMD one where it can): the other variant is fetched on demand if ever needed */
const SIMD = (() => { try { return WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11])); } catch (x) { return false; } })();
const WARM = ["vendor/zxing.min.js", "vendor/tesseract.min.js", "ocr/worker.min.js", SIMD ? "ocr/core/tesseract-core-simd-lstm.wasm.js" : "ocr/core/tesseract-core-lstm.wasm.js", "ocr/lang/ita.wasm"];
self.addEventListener("install", e => { e.waitUntil(caches.open(V).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => ![V, LIB, OCR, ICO, FONTS].includes(k)).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
/* the page asks for this once it's idle: the barcode and label readers become available offline */
self.addEventListener("message", e => { if (e.data === "warm") e.waitUntil((async () => { for (const u of WARM) { const c = await caches.open(heavyCache(u)); if (!(await c.match(u))) { try { const r = await fetch(u); if (r.ok) await c.put(u, r); } catch (x) {} } } })()); });
const timeout = (p, ms) => new Promise((ok, no) => { const t = setTimeout(() => no(new Error("timeout")), ms); p.then(r => { clearTimeout(t); ok(r); }, x => { clearTimeout(t); no(x); }); });
self.addEventListener("fetch", e => {
  const req = e.request, u = new URL(req.url);
  if (req.method !== "GET") return;
  if (u.hostname === "fonts.googleapis.com" || u.hostname === "fonts.gstatic.com") {   // the stylesheet and the font files: saved once, then served from the device while the network is asked again
    e.respondWith(caches.open(FONTS).then(c => c.match(req).then(hit => { const net = fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; }); return hit ? (net.catch(() => {}), hit) : net; })));
    return;
  }
  if (u.origin !== location.origin) return;
  const heavy = /\/(vendor|ocr|icons)\//.test(u.pathname);
  if (heavy) {   // any cache can hold it: the app's own (supabase.js and the icons are fetched when the worker installs) or its group's
    e.respondWith(caches.match(req, { ignoreSearch: true }).then(r => r || fetch(req).then(r2 => { if (r2.ok) { const c = r2.clone(); caches.open(heavyCache(u.pathname)).then(x => x.put(req, c)); } return r2; })));
    return;
  }
  const net = fetch(req).then(r => { if (r.ok && !u.search) { const c = r.clone(); caches.open(V).then(x => x.put(req, c)); } return r; });   // no copy of a request with a query (?supp=, update checks): the cache would grow with every one
  e.respondWith(timeout(net, req.mode === "navigate" ? 3500 : 6000).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || (req.mode === "navigate" && /(\/|index\.html)$/.test(u.pathname) ? caches.match("index.html") : net))));
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
