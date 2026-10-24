/* Shared test harness: builds the app from source/ into a temp folder, serves it, drives it with Chromium.
   Nothing here touches the repository root, real data or the network (external hosts are blocked). */
const { spawnSync, execSync } = require("child_process"), fs = require("fs"), os = require("os"), path = require("path"), http = require("http");
const ROOT = path.resolve(__dirname, "../..");
const LS_KEY = "fuelplanner.v1";
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".webmanifest": "application/json", ".png": "image/png", ".wasm": "application/wasm" };
const VIEWPORTS = { phone: { width: 390, height: 844 }, tablet: { width: 820, height: 1180 }, desktop: { width: 1440, height: 900 } };

function findModules() {
  const cands = [process.env.ENGINE_NM, process.env.NODE_MODULES, path.join(ROOT, "tests/node_modules")].filter(Boolean);
  for (const c of cands) if (fs.existsSync(path.join(c, "terser")) && fs.existsSync(path.join(c, "lightningcss"))) return c;
  throw new Error("terser/lightningcss not found. Run `npm i terser lightningcss` in a folder and set ENGINE_NM=<folder>/node_modules (see tests/README.md).");
}
function loadPlaywright() {
  try { return require("playwright"); } catch (e) {}
  try { return require(path.join(execSync("npm root -g", { encoding: "utf8" }).trim(), "playwright")); } catch (e) {}
  throw new Error("playwright not found (npm i -g playwright, or set NODE_PATH).");
}
/* node source/build-web.js <out> [nomin]; returns the output folder */
function build(out, { min = false, root = ROOT } = {}) {
  const args = [path.join(root, "source/build-web.js"), out]; if (!min) args.push("nomin");
  const r = spawnSync("node", args, { cwd: root, env: { ...process.env, NODE_MODULES: findModules() }, encoding: "utf8" });
  if (r.status !== 0) throw new Error("build failed: " + (r.stderr || r.stdout));
  return out;
}
/* the tree of a git ref (e.g. a commit to compare against), exported to a temp folder */
function exportRef(ref) {
  const dir = tmp("ref"); execSync(`git archive ${JSON.stringify(ref)} | tar -x -C ${JSON.stringify(dir)}`, { cwd: ROOT, shell: "/bin/bash" }); return dir;
}
const TMPS = [];
/* every build goes to its own temp folder (about 13 MB): they are removed when the test file ends, otherwise a few hundred runs fill the disk */
const tmp = name => { const d = fs.mkdtempSync(path.join(os.tmpdir(), "engine-" + name + "-")); TMPS.push(d); return d; };
process.on("exit", () => { for (const d of TMPS) { try { fs.rmSync(d, { recursive: true, force: true }); } catch (e) {} } });
function serve(dir) {
  return new Promise(ok => {
    const srv = http.createServer((q, r) => {
      let p = path.join(dir, decodeURIComponent(q.url.split("?")[0])); if (p.endsWith("/")) p += "index.html";
      fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { "content-type": TYPES[path.extname(p)] || "application/octet-stream" }); r.end(d); });
    }).listen(0, "127.0.0.1", () => ok({ url: `http://127.0.0.1:${srv.address().port}/index.html`, close: () => srv.close() }));
  });
}
/* A running app. seed = object stored under the app's localStorage key before the first load (synthetic data only). */
async function startApp({ dir, seed = { settings: { onboarded: true } }, viewport = VIEWPORTS.desktop, offline = false } = {}) {
  const { chromium } = loadPlaywright();
  const srv = await serve(dir), browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport, serviceWorkers: "block" });
  /* "engine.localOnly" = the "Use on this device only" choice, so the sign-in screen does not cover the app */
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem("engine.localOnly", "true"); if (v && !sessionStorage.getItem("__seeded")) { localStorage.setItem(k, v); sessionStorage.setItem("__seeded", "1"); } } catch (e) {} }, [LS_KEY, seed ? JSON.stringify(seed) : ""]);
  const page = await ctx.newPage(), errors = [];
  page.on("pageerror", e => errors.push("pageerror: " + e.message));
  page.on("console", m => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push("console: " + m.text().slice(0, 200)); });
  /* external hosts never reached: no Supabase (real data), no intervals.icu, no OFF, no AI, no weather */
  await page.route(u => { const h = new URL(u).hostname; return h !== "127.0.0.1" && h !== "localhost"; }, r => r.abort());
  await page.goto(srv.url); await page.waitForFunction(() => typeof S !== "undefined" && S.settings, null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(600);
  if (offline) await ctx.setOffline(true);
  return { page, ctx, errors, url: srv.url, reload: async () => { await page.reload(); await page.waitForFunction(() => typeof S !== "undefined" && S.settings, null, { timeout: 15000 }); await page.waitForTimeout(400); },
    close: async () => { await browser.close(); srv.close(); } };
}
module.exports = { exportRef, ROOT, LS_KEY, VIEWPORTS, build, tmp, startApp, serve, loadPlaywright, findModules };
