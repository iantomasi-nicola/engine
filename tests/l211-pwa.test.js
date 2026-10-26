/* L211 (audit C.12, C.13): the installed app's caches and the offline fallback. Synthetic data only; the network is this test's own server.
   Expected values (by hand):
   - three cache names (engine-lib-, engine-ocr-, engine-icons-, 10 hex each). Changing one icon changes only the icons name; changing a file in vendor/ only the lib name; in ocr/ only the ocr name (so a new icon does not re-download the ~9 MB label reader).
   - the idle warm-up fetches ONE Tesseract core (the SIMD one where the browser can run it): headless Chromium supports SIMD, so the ocr cache holds tesseract-core-simd-lstm and not tesseract-core-lstm.
   - offline, a page that was never visited (pushup-test.html) is not answered with the app; the app's own address still is. */
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("fs"), path = require("path"), http = require("http"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
const names = dir => { const sw = fs.readFileSync(path.join(dir, "sw.js"), "utf8"); return { lib: sw.match(/engine-lib-[0-9a-f]{10}/)?.[0], ocr: sw.match(/engine-ocr-[0-9a-f]{10}/)?.[0], icons: sw.match(/engine-icons-[0-9a-f]{10}/)?.[0], sw }; };
const copyRepo = () => { const d = H.tmp("l211pwa-copy"); fs.cpSync(H.ROOT, d, { recursive: true, filter: s => !/[\\/](\.git|node_modules|\.claude)([\\/]|$)/.test(path.relative(H.ROOT, s)) && !/^tests[\\/]/.test(path.relative(H.ROOT, s)) }); return d; };

test("the heavy files are cached in three groups: a changed icon does not re-download the label reader", () => {
  const root = copyRepo(), a = names(H.build(H.tmp("l211pwa-a"), { root }));
  assert.ok(a.lib && a.ocr && a.icons, "three names: " + JSON.stringify([a.lib, a.ocr, a.icons]));
  assert.doesNotMatch(a.sw, /__[A-Z]+__/);
  const ico = path.join(root, "icons", "favicon-32.png"); fs.appendFileSync(ico, "x");
  const b = names(H.build(H.tmp("l211pwa-b"), { root }));
  assert.deepEqual([b.lib === a.lib, b.ocr === a.ocr, b.icons === a.icons], [true, true, false], "icon changed: only the icons cache is renamed");
  fs.appendFileSync(path.join(root, "vendor", "zxing.min.js"), "\n");
  const c = names(H.build(H.tmp("l211pwa-c"), { root }));
  assert.deepEqual([c.lib === b.lib, c.ocr === b.ocr, c.icons === b.icons], [false, true, true], "vendor changed: only the lib cache is renamed");
  fs.appendFileSync(path.join(root, "ocr", "worker.min.js"), "\n");
  const d = names(H.build(H.tmp("l211pwa-d"), { root }));
  assert.deepEqual([d.lib === c.lib, d.ocr === c.ocr, d.icons === c.icons], [true, false, true], "ocr changed: only the ocr cache is renamed");
});

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".webmanifest": "application/json", ".png": "image/png", ".wasm": "application/wasm" };
function server(root) {
  const st = { down: false }, srv = http.createServer((q, r) => {
    if (st.down) { q.socket.destroy(); return; }
    let p = path.join(root, decodeURIComponent(q.url.split("?")[0])); if (p.endsWith("/")) p += "index.html";
    fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { "content-type": TYPES[path.extname(p)] || "application/octet-stream" }); r.end(d); });
  });
  return new Promise(ok => srv.listen(0, "127.0.0.1", () => ok({ st, url: `http://localhost:${srv.address().port}/`, close: () => srv.close() })));
}
const open = async dir => {
  const { chromium } = H.loadPlaywright(), srv = await server(dir), browser = await chromium.launch(), ctx = await browser.newContext({ serviceWorkers: "allow" });
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem("engine.localOnly", "true"); if (!sessionStorage.getItem("__seeded")) { localStorage.setItem(k, v); sessionStorage.setItem("__seeded", "1"); } } catch (e) {} }, [H.LS_KEY, JSON.stringify(F.seed())]);
  await ctx.route(u => { const h = new URL(u).hostname; return h !== "localhost" && h !== "127.0.0.1"; }, r => r.abort());
  const page = await ctx.newPage(); return { srv, page, ctx, close: async () => { await browser.close(); srv.close(); } };
};
const ready = page => page.waitForFunction(() => typeof S !== "undefined" && S.settings, null, { timeout: 20000 });
const cacheMap = page => page.evaluate(async () => { const o = {}; for (const k of await caches.keys()) o[k] = (await (await caches.open(k)).keys()).map(r => new URL(r.url).pathname); return o; });

test("the idle warm-up fetches one Tesseract core, the one this browser can run", async () => {
  const dir = H.build(H.tmp("l211pwa-w")), t = await open(dir);
  try {
    await t.page.goto(t.srv.url + "index.html"); await ready(t.page); await t.page.evaluate(async () => { await navigator.serviceWorker.ready; });
    await t.page.reload(); await ready(t.page);
    let m = {}; for (let k = 0; k < 60; k++) { m = await cacheMap(t.page); if (Object.entries(m).filter(([n]) => /^engine-ocr-/.test(n)).flatMap(([, v]) => v).length >= 2) break; await t.page.waitForTimeout(500); }
    const ocr = Object.entries(m).filter(([k]) => /^engine-ocr-/.test(k)).flatMap(([, v]) => v);
    assert.ok(ocr.includes("/ocr/core/tesseract-core-simd-lstm.wasm.js"), JSON.stringify(ocr));
    assert.equal(ocr.includes("/ocr/core/tesseract-core-lstm.wasm.js"), false, "the other variant is not downloaded");
    assert.ok(Object.entries(m).filter(([k]) => /^engine-lib-/.test(k)).flatMap(([, v]) => v).includes("/vendor/zxing.min.js"));
  } finally { await t.close(); }
});

test("offline, a page that was never visited is not answered with the app, while the app's own address is", async () => {
  const dir = H.build(H.tmp("l211pwa-o")), t = await open(dir);
  try {
    await t.page.goto(t.srv.url + "index.html"); await ready(t.page); await t.page.evaluate(async () => { await navigator.serviceWorker.ready; });
    await t.page.reload(); await ready(t.page);
    t.srv.st.down = true;
    let isApp = null; try { await t.page.goto(t.srv.url + "pushup-test.html", { timeout: 15000 }); isApp = await t.page.evaluate(() => typeof S !== "undefined"); } catch (e) { isApp = false; }
    assert.equal(isApp, false, "the never-visited helper page does not turn into the app");
    const p2 = await t.ctx.newPage(); await p2.goto(t.srv.url, { timeout: 15000 }); await ready(p2);
    await p2.goto(t.srv.url + "index.html", { timeout: 15000 }); await ready(p2);
  } finally { await t.close(); }
});
