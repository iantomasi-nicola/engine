const H = require("/home/user/engine/tests/lib/harness"), F = require("/home/user/engine/tests/fixtures/synthetic");
const fs = require("fs"), path = require("path"), http = require("http");
const dir = process.argv[2];
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".webmanifest": "application/json", ".png": "image/png", ".wasm": "application/wasm" };
function server(root) { const st = { down: false, hits: [] }, srv = http.createServer((q, r) => { if (st.down) { q.socket.destroy(); return; } st.hits.push(q.url); let p = path.join(root, decodeURIComponent(q.url.split("?")[0])); if (p.endsWith("/")) p += "index.html"; fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { "content-type": TYPES[path.extname(p)] || "application/octet-stream" }); r.end(d); }); });
  return new Promise(ok => srv.listen(0, "127.0.0.1", () => ok({ st, url: `http://localhost:${srv.address().port}/`, close: () => srv.close() }))); }
(async () => {
  const { chromium } = H.loadPlaywright(), srv = await server(dir), browser = await chromium.launch(), ctx = await browser.newContext({ serviceWorkers: "allow" }), errors = [];
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem("engine.localOnly", "true"); if (!sessionStorage.getItem("__seeded")) { localStorage.setItem(k, v); sessionStorage.setItem("__seeded", "1"); } } catch (e) {} window.__csp = []; document.addEventListener("securitypolicyviolation", e => window.__csp.push(e.violatedDirective + " " + e.blockedURI)); }, [H.LS_KEY, JSON.stringify(F.seed())]);
  await ctx.route(u => { const h = new URL(u).hostname; return h !== "localhost" && h !== "127.0.0.1"; }, r => r.abort());
  const page = await ctx.newPage(); page.on("pageerror", e => errors.push(e.message)); page.on("console", m => { if (m.type() === "error") errors.push("console " + m.text().slice(0, 200)); });
  const ready = () => page.waitForFunction(() => typeof S !== "undefined" && S.settings, null, { timeout: 20000 });
  await page.goto(srv.url + "index.html"); await ready(); await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  // CSP: OCR, xlsx, zxing
  const r = await page.evaluate(async () => { const o = {};
    try { const w = await ocrWorker(); const c = document.createElement("canvas"); c.width = 200; c.height = 60; const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, 200, 60); x.fillStyle = "#000"; x.font = "30px sans-serif"; x.fillText("ZUCCHERO 12", 5, 40); const res = await w.recognize(c); o.ocr = res.data.text.trim(); } catch (e) { o.ocr = "ERR " + (e && e.message || e); }
    try { await loadXlsx(); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([[1, 2]]), "a"); const out = XLSX.write(wb, { type: "array", bookType: "xlsx" }); const back = XLSX.read(out, { type: "array" }); o.xlsx = JSON.stringify(XLSX.utils.sheet_to_json(back.Sheets.a, { header: 1 })); } catch (e) { o.xlsx = "ERR " + e.message; }
    try { await loadScript(ZXING_SRC); o.zxing = typeof ZXing; } catch (e) { o.zxing = "ERR " + e.message; }
    try { await fetch("https://example.supabase.co/rest/v1/x"); } catch (e) { o.conn = String(e).slice(0, 60); }
    o.csp = window.__csp; return o; });
  console.log("CSP probe", JSON.stringify(r));
  // update: new build
  const v1 = await page.evaluate(() => BUILD()); const keys1 = await page.evaluate(async () => caches.keys());
  let html = fs.readFileSync(path.join(dir, "index.html"), "utf8"); const old = html.match(/engine-build" content="(\d{12})"/)[1], nv = String(+old + 1);
  fs.writeFileSync(path.join(dir, "index.html"), html.replace(old, nv)); let sw = fs.readFileSync(path.join(dir, "sw.js"), "utf8"); fs.writeFileSync(path.join(dir, "sw.js"), sw.replace("engine-" + old, "engine-" + nv));
  await page.reload(); await ready(); const v2 = await page.evaluate(() => BUILD());
  await page.waitForTimeout(1500); const keys2 = await page.evaluate(async () => caches.keys()); await page.reload(); await ready();
  await page.waitForTimeout(4000); const v3 = await page.evaluate(() => BUILD()); const sws = await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); return [r.active?.scriptURL, !!r.waiting, !!r.installing, (await (await fetch("sw.js",{cache:"no-store"})).text()).match(/engine-\d{12}/)[0]]; }); console.log("sws", sws); const keys3 = await page.evaluate(async () => caches.keys());
  console.log("update", { v1, keys1, v2, keys2, v3, keys3 });
  // offline: reload, deep link ?supp=, #report, pushup-test
  srv.st.down = true;
  for (const u of ["index.html", "", "?supp=x&d=2026-01-01", "index.html#plan", "pushup-test.html"]) { try { await page.goto(srv.url + u, { timeout: 15000 }); await page.waitForTimeout(1500); console.log("offline", JSON.stringify(u), await page.evaluate(() => [typeof S !== "undefined", document.title, location.href.slice(-30)])); } catch (e) { console.log("offline", u, "ERR", e.message.slice(0, 100)); } }
  console.log("errors", errors.slice(0, 10));
  await browser.close(); srv.close();
})();
