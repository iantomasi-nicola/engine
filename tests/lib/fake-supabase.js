/* An in-memory Supabase for sync tests: one server shared by several browser contexts ("devices"), each running the real shim.js.
   Synthetic data only, no network: vendor/supabase.js is replaced by a stub that forwards every query to this Node process.
   The stub implements just what shim.js uses: auth.getSession/signOut, from(T).select/eq/is/gt/order/limit/range/maybeSingle, upsert, insert, update (a conditional one: .eq("updated_at", seen).select() answers the rows it changed), delete, channel. */
const H = require("./harness");
const STUB = `
window.supabase = { createClient: () => {
  const call = spec => window.__srv(spec);
  const q = (spec) => { const o = {
      select(cols) { spec.op = spec.op || "select"; spec.cols = cols; return o; },
      eq(k, v) { (spec.eq = spec.eq || {})[k] = v; return o; },
      is(k, v) { (spec.is = spec.is || {})[k] = v; return o; },
      gt(k, v) { spec.gt = [k, v]; return o; },
      order(k) { spec.order = k; return o; },
      limit(n) { spec.limit = n; return o; },
      range(a, b) { spec.range = [a, b]; return o; },
      maybeSingle() { spec.single = true; return o; },
      then(res, rej) { return call(spec).then(res, rej); } }; return o; };
  const from = () => ({ select: c => q({ op: "select" }).select(c), upsert: row => q({ op: "upsert", row }), insert: row => q({ op: "insert", row }), update: row => q({ op: "update", row }), delete: () => q({ op: "delete" }) });
  const user = () => ({ id: window.__fakeUid, email: window.__fakeUid + "@example.test" });
  const auth = { getSession: async () => ({ data: { session: window.__fakeUid ? { user: user() } : null }, error: null }), signOut: async () => ({ error: null }),
    signInWithPassword: async () => ({ data: { session: { user: user() } }, error: null }), signUp: async () => ({ data: {}, error: null }) };
  const chan = { on(t, o, cb) { window.__rt = cb; return chan; }, subscribe() { return chan; } };
  const storage = { from: () => ({ upload: async () => ({ error: { message: "no storage in tests" } }), download: async () => ({ error: { message: "no storage in tests" } }), remove: async () => ({}) }) };
  return { from, auth, storage, channel: () => chan, removeChannel() {} };
} };`;

/* the server: rows per user (data, and the updated_at the client wrote or the server stamped), kept in "heap" order (an update moves the row to the end, as PostgREST without ORDER BY can) */
/* timestamps as Postgres returns timestamptz through PostgREST: microseconds and +00:00, whatever notation the client wrote (…123Z or …123456+00:00); equality is by instant */
let tsSeq = 0;
const canonTs = x => { const m = /^(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d)(?:\.(\d+))?(?:Z|[+-]00:?00)$/.exec(String(x || "")); return m ? `${m[1]}.${(m[2] || "").padEnd(6, "0").slice(0, 6)}+00:00` : String(x || ""); };
const stampTs = () => canonTs(new Date().toISOString().slice(0, 23) + String(100 + (tsSeq++ % 900)) + "Z");
function server({ maxRows = 1000 } = {}) {
  const S = { users: new Map(), log: [], maxRows, devs: [], reject: null, onPage: null };
  S.rows = uid => S.users.get(uid) || S.users.set(uid, new Map()).get(uid);
  S.get = (uid, path) => { const r = S.rows(uid).get(path); return r ? JSON.parse(JSON.stringify(r.data)) : undefined; };
  S.set = (uid, path, data, ua) => { const T = S.rows(uid); T.delete(path); T.set(path, { data: JSON.parse(JSON.stringify(data)), at: Date.now(), ua: ua ? canonTs(ua) : stampTs() }); };
  const tell = (dev, row) => { for (const d of S.devs) if (d !== dev && d.uid === dev.uid && !d.down && !d.asleep) d.page.evaluate(r => window.__rt && window.__rt({ eventType: "UPDATE", new: r }), { path: row.path, data: row.data }).catch(() => {}); };
  S.handle = async (dev, spec) => {
    if (dev.down) return { data: null, error: { message: "TypeError: Failed to fetch" }, status: 0 };
    const uid = dev.uid, T = S.rows(uid);
    if (spec.op === "select") {
      if (spec.single) { const r = T.get(spec.eq?.path); return { data: r ? { data: JSON.parse(JSON.stringify(r.data)), updated_at: r.ua } : null, error: null, status: 200 }; }
      let list = [...T].map(([path, r]) => ({ path, data: JSON.parse(JSON.stringify(r.data)) }));
      if (spec.order) list.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
      if (spec.gt) list = list.filter(r => r[spec.gt[0]] > spec.gt[1]);
      if (spec.range) list = list.slice(spec.range[0], spec.range[1] + 1);
      if (spec.limit) list = list.slice(0, spec.limit);
      list = list.slice(0, S.maxRows);
      S.pages = (S.pages || 0) + 1; if (S.onPage) await S.onPage(S.pages);
      return { data: list, error: null, status: 200 };
    }
    if (spec.op === "upsert") {
      const row = spec.row; if (S.reject && S.reject(row.path)) return { data: null, error: { message: "Payload too large", code: "PGRST413" }, status: 413 };
      S.set(uid, row.path, row.data, row.updated_at); S.log.push([dev.name, "upsert", row.path]); tell(dev, row);
      return { data: null, error: null, status: 201 };
    }
    if (spec.op === "insert") {
      const row = spec.row; if (T.has(row.path)) return { data: null, error: { message: "duplicate key value violates unique constraint", code: "23505" }, status: 409 };
      if (S.reject && S.reject(row.path)) return { data: null, error: { message: "Payload too large", code: "PGRST413" }, status: 413 };
      S.set(uid, row.path, row.data, row.updated_at); S.log.push([dev.name, "insert", row.path]); tell(dev, row);
      return { data: null, error: null, status: 201 };
    }
    if (spec.op === "update") {
      const row = spec.row, path = spec.eq?.path, cur = T.get(path);
      if (!cur || ("updated_at" in (spec.eq || {}) && cur.ua !== canonTs(spec.eq.updated_at)) || (spec.is && "updated_at" in spec.is && cur.ua != null)) return { data: [], error: null, status: 200 };
      if (S.reject && S.reject(path)) return { data: null, error: { message: "Payload too large", code: "PGRST413" }, status: 413 };
      S.set(uid, path, row.data, row.updated_at); S.log.push([dev.name, "update", path]); tell(dev, { path, data: row.data });
      return { data: [{ path }], error: null, status: 200 };
    }
    if (spec.op === "delete") {
      const p = spec.eq?.path; T.delete(p); S.log.push([dev.name, "delete", p]);
      for (const d of S.devs) if (d !== dev && d.uid === uid && !d.down && !d.asleep) d.page.evaluate(r => window.__rt && window.__rt({ eventType: "DELETE", old: r }), { path: p }).catch(() => {});
      return { data: null, error: null, status: 204 };
    }
    return { data: null, error: null, status: 200 };
  };
  return S;
}

/* one device = one browser context with its own localStorage; signed in as uid (null = signed out) */
async function device(srv, name, { dir, uid = "u1", seed = null, local = null, viewport = H.VIEWPORTS.desktop, browser, down = false, init = null } = {}) {
  const { chromium } = H.loadPlaywright();
  const own = !browser; browser = browser || await chromium.launch();
  const http = await H.serve(dir), ctx = await browser.newContext({ viewport, serviceWorkers: "block" });
  const dev = { name, uid, down, asleep: false, errors: [], srv, ctx, url: http.url };
  /* seed = the app's localStorage file, local = any other keys, both written only on the very first load of this device */
  await ctx.addInitScript(([k, v, extra]) => { try { if (!localStorage.getItem("__dev")) { localStorage.setItem("__dev", "1"); if (v) localStorage.setItem(k, v); for (const [a, b] of Object.entries(extra || {})) localStorage.setItem(a, b); } } catch (e) {} }, [H.LS_KEY, seed ? JSON.stringify(seed) : "", local]);
  /* init = an extra script run before the app on every load (e.g. a storage that refuses one key) */
  if (init) await ctx.addInitScript(init);
  /* every toast from the first moment (boot included): read off the #toast element */
  await ctx.addInitScript(() => { window.__toasts = []; document.addEventListener("DOMContentLoaded", () => { const el = document.getElementById("toast"); if (el) new MutationObserver(() => { const t = el.querySelector(".toast span")?.textContent; if (t && __toasts[__toasts.length - 1] !== t) __toasts.push(t); }).observe(el, { childList: true, subtree: true }); }); });
  await ctx.route("**/vendor/supabase.js", r => r.fulfill({ contentType: "text/javascript", body: STUB }));
  await ctx.route(u => { const h = new URL(u).hostname; return h !== "127.0.0.1" && h !== "localhost"; }, r => r.abort());
  dev.attach = async page => {
    dev.page = page;
    page.on("pageerror", e => dev.errors.push("pageerror: " + e.message));
    page.on("console", m => { if (m.type() === "error" && !H.IGNORED_CONSOLE(m.text())) dev.errors.push("console: " + m.text().slice(0, 200)); });
    dev.guard = await H.guardRender(page, dev.errors, dev.guard); dev.allowRenderFailed = dev.guard.allow;
    await page.addInitScript(u => { window.__fakeUid = u; }, dev.uid);
    await page.exposeFunction("__srv", spec => srv.handle(dev, spec));
  };
  dev.open = async () => {
    const page = await ctx.newPage(); await dev.attach(page); await page.goto(http.url);
    await page.waitForFunction(() => typeof S !== "undefined" && S.settings && Sync.ready, null, { timeout: 20000 });
    return page;
  };
  /* waits until this device has nothing left to send and the server has answered */
  dev.settle = (ms = 4000) => dev.page.waitForFunction(() => Sync.pending.size === 0 && ENGINE.pending() === 0 && ENGINE.status().online === true, null, { timeout: ms }).catch(() => {});
  dev.close = async () => { await ctx.close().catch(() => {}); http.close(); if (own) await browser.close(); };
  srv.devs.push(dev);
  await dev.open();
  return dev;
}
module.exports = { server, device, STUB, canonTs };
