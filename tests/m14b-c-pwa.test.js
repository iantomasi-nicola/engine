/* M14b group C, the installed app: head of the page, fonts that never block the first paint, libraries served from this site, the service worker offline.
   area11 #4, #5, #6, #7, #10, #11, #13, #16, #19; area10 #13. Synthetic data only; the network is this test's own server (which can be switched off) and nothing else.

   Expected values (by hand):
   - after the first visit the app's own cache holds vendor/supabase.js and the icons; with the server down, fetching them and reloading still works (supabase defined).
   - ?query copies are not kept: after fetching index.html?a=1 and ?supp=x the cache has no key with a search part.
   - the heavy caches are named engine-lib-/engine-ocr-/engine-icons-<10 hex>, the same on two builds of the same files (tests/l211-pwa.test.js: independent per group); within 20 s of idle the label reader files are in them (requestIdleCallback with a timeout).
   - fonts: the sheet answers after 4 s, the first contentful paint stays under 2.5 s (blocking would make it >= 4 s). */
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("fs"), path = require("path"), http = require("http"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let dir, min;
test.before(() => { dir = H.build(H.tmp("m14bc-pwa")); });
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".webmanifest": "application/json", ".png": "image/png", ".wasm": "application/wasm" };
/* the app registers its worker only on https or on "localhost", so the server is addressed as localhost.
   A server that can be switched off: when down it drops the connection, as a phone with no signal does */
function server(root) {
  const st = { down: false, hits: [] }, srv = http.createServer((q, r) => {
    if (st.down) { q.socket.destroy(); return; }
    st.hits.push(q.url); let p = path.join(root, decodeURIComponent(q.url.split("?")[0])); if (p.endsWith("/")) p += "index.html";
    fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { "content-type": TYPES[path.extname(p)] || "application/octet-stream" }); r.end(d); });
  });
  return new Promise(ok => srv.listen(0, "127.0.0.1", () => ok({ st, url: `http://localhost:${srv.address().port}/`, close: () => srv.close() })));
}
const FONT_ROUTE = /fonts\.(googleapis|gstatic)\.com/;
async function open({ fonts = "fake", sw = "allow" } = {}) {
  const { chromium } = H.loadPlaywright(), srv = await server(dir), browser = await chromium.launch(), ctx = await browser.newContext({ serviceWorkers: sw }), errors = [];
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem("engine.localOnly", "true"); if (!sessionStorage.getItem("__seeded")) { localStorage.setItem(k, v); sessionStorage.setItem("__seeded", "1"); } } catch (e) {} }, [H.LS_KEY, JSON.stringify(F.seed())]);
  const fontHits = []; await ctx.route(FONT_ROUTE, async r => { fontHits.push(r.request().url()); if (fonts === "slow") await new Promise(x => setTimeout(x, 4000)); await r.fulfill({ status: 200, contentType: /gstatic/.test(r.request().url()) ? "font/woff2" : "text/css", headers: { "access-control-allow-origin": "*" }, body: /gstatic/.test(r.request().url()) ? "" : "/* fonts */" }); });
  await ctx.route(u => { const h = new URL(u).hostname; return h !== "localhost" && h !== "127.0.0.1" && !FONT_ROUTE.test(h); }, r => r.abort());
  const page = await ctx.newPage(); page.on("pageerror", e => errors.push(e.message));
  return { srv, browser, ctx, page, errors, fontHits, close: async () => { await browser.close(); srv.close(); } };
}
const cacheMap = page => page.evaluate(async () => { const o = {}; for (const k of await caches.keys()) o[k] = (await (await caches.open(k)).keys()).map(r => { const u = new URL(r.url); return u.host === location.host ? u.pathname + u.search : r.url; }); return o; });
const swReady = page => page.evaluate(async () => { const reg = await navigator.serviceWorker.ready; return !!reg.active; });

test("the head of the page: language, title and font links are in <head>, the font sheet is loaded without blocking", () => {
  const html = fs.readFileSync(path.join(dir, "index.html"), "utf8"), head = html.slice(0, html.indexOf("</head>")), body = html.slice(html.indexOf("</head>"));
  assert.match(html, /^<!doctype html><html lang="en">/i);
  assert.match(head, /<title>Engine<\/title>/); assert.match(head, /rel="preconnect" href="https:\/\/fonts\.googleapis\.com"/);
  assert.match(head, /<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^"]*" media="print" crossorigin>/); assert.doesNotMatch(head, /onload=/);   // no inline attribute: look-boot switches it to all (next test)
  assert.match(head, /<noscript><link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com/);
  assert.doesNotMatch(body.replace(/<script[\s\S]*?<\/script>/g, ""), /<title>|rel="preconnect"|<link rel="stylesheet" href="https:\/\/fonts/);
});

test("a slow font sheet does not delay the first paint", async () => {
  const t = await open({ fonts: "slow", sw: "block" });
  try {
    await t.page.goto(t.srv.url + "index.html"); await t.page.waitForFunction(() => performance.getEntriesByName("first-contentful-paint").length > 0, null, { timeout: 15000 });
    const fcp = await t.page.evaluate(() => performance.getEntriesByName("first-contentful-paint")[0].startTime);
    assert.ok(fcp < 2500, "first contentful paint " + Math.round(fcp) + " ms");
    await t.page.waitForTimeout(4600);
    assert.equal(await t.page.evaluate(() => [...document.querySelectorAll('link[rel=stylesheet]')].find(l => /fonts\.googleapis/.test(l.href)).media), "all", "the fonts apply once they arrive");
    assert.deepEqual(t.errors, []);
  } finally { await t.close(); }
});

test("Excel export loads SheetJS from this site: no foreign script host", async () => {
  const t = await open({ sw: "block" });
  try {
    await t.page.goto(t.srv.url + "index.html"); await t.page.waitForFunction(() => typeof S !== "undefined" && S.settings);
    assert.equal(await t.page.evaluate(async () => { await loadXlsx(); return typeof XLSX.utils.book_new; }), "function");
    assert.ok(t.srv.st.hits.some(u => u.startsWith("/vendor/xlsx.full.min.js")));
    assert.ok(fs.existsSync(path.join(dir, "vendor", "xlsx.full.min.js")));
    assert.deepEqual(t.errors, []);
  } finally { await t.close(); }
});

test("service worker: libraries and icons are there offline, nothing with a query is kept, the label readers are fetched when idle", async () => {
  const t = await open();
  try {
    await t.page.goto(t.srv.url + "index.html"); await t.page.waitForFunction(() => typeof S !== "undefined" && S.settings); assert.equal(await swReady(t.page), true);
    await t.page.reload(); await t.page.waitForFunction(() => typeof S !== "undefined" && S.settings); await t.page.waitForTimeout(500);
    const caches1 = await cacheMap(t.page), appCache = Object.keys(caches1).find(k => /^engine-\d{12}$/.test(k));
    assert.ok(appCache, "the app's own cache: " + Object.keys(caches1));
    for (const f of ["/vendor/supabase.js", "/icons/icon-192.png", "/icons/favicon-32.png", "/icons/apple-180.png"]) assert.ok(caches1[appCache].includes(f), f + " is cached when the worker installs");
    await t.page.evaluate(async () => { await fetch("index.html?a=1"); await fetch("index.html?supp=x"); await fetch("config.js?" + Date.now()); });
    const caches2 = await cacheMap(t.page);
    assert.deepEqual(Object.values(caches2).flat().filter(u => /^\//.test(u) && u.includes("?")), [], "no copy of a request with a query");
    /* the label readers arrive by themselves once the page is idle (requestIdleCallback with a timeout) */
    for (let k = 0; k < 50; k++) { const n = Object.entries(await cacheMap(t.page)).filter(([c]) => /^engine-(lib|ocr)-[0-9a-f]{10}$/.test(c)).flatMap(([, v]) => v).length; if (n >= 5) break; await t.page.waitForTimeout(500); }
    /* no signal */
    t.srv.st.down = true;
    const off = await t.page.evaluate(async () => { const o = {}; for (const u of ["vendor/supabase.js", "icons/icon-192.png", "vendor/zxing.min.js", "ocr/lang/ita.wasm"]) { try { o[u] = (await fetch(u)).ok; } catch (e) { o[u] = String(e); } } return o; });
    assert.deepEqual(off, { "vendor/supabase.js": true, "icons/icon-192.png": true, "vendor/zxing.min.js": true, "ocr/lang/ita.wasm": true });
    await t.page.reload(); await t.page.waitForFunction(() => typeof S !== "undefined" && S.settings, null, { timeout: 15000 });
    assert.equal(await t.page.evaluate(() => typeof supabase !== "undefined" && window.ENGINE.cloud !== undefined), true, "the cloud library is there offline");
    assert.deepEqual(t.errors, []);
  } finally { await t.close(); }
});

test("service worker: the font sheet and files are kept for offline", async () => {
  const t = await open();
  try {
    await t.page.goto(t.srv.url + "index.html"); await t.page.waitForFunction(() => typeof S !== "undefined" && S.settings); await swReady(t.page);
    await t.page.reload(); await t.page.waitForFunction(() => typeof S !== "undefined" && S.settings); await t.page.waitForTimeout(1200);
    const m = await cacheMap(t.page);
    assert.ok((m["engine-fonts-1"] || []).some(u => /fonts\.googleapis\.com\/css2/.test(u)), "the sheet is cached: " + JSON.stringify(m["engine-fonts-1"]));
    t.srv.st.down = true;
    assert.equal(await t.page.evaluate(async () => (await fetch(document.querySelector('link[href*="fonts.googleapis"]').href, { mode: "cors" })).ok), true);
  } finally { await t.close(); }
});

test("the heavy caches are named after their files, and the build replaces every placeholder", () => {
  const sw = fs.readFileSync(path.join(dir, "sw.js"), "utf8");
  assert.match(sw, /LIB = "engine-lib-[0-9a-f]{10}", OCR = "engine-ocr-[0-9a-f]{10}", ICO = "engine-icons-[0-9a-f]{10}"/); assert.doesNotMatch(sw, /__[A-Z]+__/);
  const again = H.build(H.tmp("m14bc-pwa2")), sw2 = fs.readFileSync(path.join(again, "sw.js"), "utf8");
  assert.equal(sw2.match(/LIB = .*ICO = "[^"]+"/)[0], sw.match(/LIB = .*ICO = "[^"]+"/)[0], "the same files give the same names");
});

test("the minified build minifies every style block", () => {
  min = H.build(H.tmp("m14bc-min"), { min: true });
  const html = fs.readFileSync(path.join(min, "index.html"), "utf8"), head = html.slice(0, html.indexOf("<script>"));
  assert.doesNotMatch(head, /\/\* Layout: mobile app shell|\/\* M14b-C:/, "comments of the second stylesheet are gone");
  assert.ok((head.match(/<style>/g) || []).length >= 2);
});
