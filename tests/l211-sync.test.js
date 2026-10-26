/* L211 section A (docs/review/AUDIT_2026-10-26.md): sync and restore defects found by the independent audit.
   Real shim.js against an in-memory Supabase shared by several browser contexts (tests/lib/fake-supabase.js). Synthetic data only, no network. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic"), FS = require("./lib/fake-supabase");
let dir, browser; const devs = [];
test.before(async () => { dir = H.build(H.tmp("l211-sync")); browser = await H.loadPlaywright().chromium.launch(); });
test.after(async () => { await browser?.close(); });
test.afterEach(async () => { for (const d of devs.splice(0)) await d.close(); });
const dev = async (srv, name, o = {}) => { const d = await FS.device(srv, name, { dir, browser, ...o }); devs.push(d); return d; };
const wait = ms => new Promise(r => setTimeout(r, ms));
const food = (id, name) => ({ id, name, brand: "", unit: "g", per: { kcal: 100, p: 10, c: 10, f: 1, fib: 0 }, servings: [], pack: 0, cat: "pantry", role: "P", meals: ["m"], source: "custom" });
const SETTINGS = dob => ({ onboarded: true, fit: { profile: { sex: "Male", dob, height: 180, startWeight: 80, bf: null, maxHr: null } } });
const reopen = async (d, n = 6000) => { await d.page.close(); await d.open(); await d.settle(n); await wait(1500); };

/* A1. First sign-in whose first load never finishes: the device's own data must survive the next opening, and reach the account.
   Hand-computed: the account holds settings + food t-a + weight (day -2: 80); the device holds food t-b + weight (day -1: 75).
   After the second opening, device and account must both hold t-a AND t-b, and both weights. */
test("A1 first sign-in, first load fails: the next opening keeps the device's data and merges it", async () => {
  const srv = FS.server();
  srv.set("u1", "settings", SETTINGS("1985-01-01")); srv.set("u1", "lib/foods/t-a", food("t-a", "Account food")); srv.set("u1", "body", { w: { [F.plus(-2)]: 80 }, m: {} });
  const seed = { settings: SETTINGS("1999-09-09"), foods: { "t-b": food("t-b", "Device food") }, recipes: {}, days: {}, body: { w: { [F.plus(-1)]: 75 }, m: {} } };
  const B = await dev(srv, "B", { seed, down: true }); await wait(1500);
  B.down = false; await reopen(B);
  const s = await B.page.evaluate(() => ({ foods: Object.keys(S.foods).sort(), w: S.body.w }));
  assert.deepEqual(s.foods, ["t-a", "t-b"]);
  assert.equal(s.w[F.plus(-1)], 75); assert.equal(s.w[F.plus(-2)], 80);
  assert.ok(srv.get("u1", "lib/foods/t-b"), "device food not uploaded");
  assert.equal(srv.get("u1", "body").w[F.plus(-1)], 75);
  assert.equal(await B.page.evaluate(() => localStorage.getItem("engine.union")), null, "the owed merge must be cleared once every kind answered");
  assert.deepEqual(B.errors, []);
});

/* A1b. Same, into an EMPTY account: the device's data must be uploaded, not wiped. */
test("A1b first sign-in into an empty account, first load fails: device data uploaded on the next opening", async () => {
  const srv = FS.server(), seed = F.seed({ withPlan: true });
  const B = await dev(srv, "B", { seed, down: true }); await wait(1500);
  B.down = false; await reopen(B);
  const n = await B.page.evaluate(() => Object.keys(S.foods).length);
  assert.ok(n > 0, "local foods wiped");
  assert.ok([...srv.rows("u1").keys()].some(p => p.startsWith("lib/foods/")), "nothing uploaded");
});

/* A2. A restore (or a device copy, or the account) with malformed INNER parts must never leave a blank page.
   Each case below is a part that is an object/array at the first level but wrong inside (the audit's e.js). */
const BAD = () => {
  const d0 = F.plus(0), d1 = F.plus(1), ym = d0.slice(0, 7);
  return {
    "settings.meals array of numbers": { settings: { meals: [1, 2], types: "x", schedule: "z", diet: 5, intensity: [3] } },
    "settings.fit not an object": { settings: { fit: "abc" } },
    "days.meals a string": { days: { [d0]: { date: d0, meals: "abc" } } },
    "days.meals items null/number": { days: { [d1]: { date: d1, meals: { m: [null, 5, { kind: "food", ref: "nope", qty: "x" }] } } } },
    "days.meals a list of strings": { days: { [d0]: { date: d0, meals: { m: "oops", d: [1] }, adj: "x" } } },
    "logm.workouts a string": { logm: { [ym]: { days: { [d0]: { workouts: "run", water: "lots", supp: 3, jr: "x" } } } } },
    "logm.workouts items": { logm: { [ym]: { days: { [d0]: { workouts: [null, 4, "r"], wsess: "x", caff: 5 } } } } },
    "body.w/m/photos": { body: { w: { [d0]: "heavy", zz: 70 }, m: [], photos: "p" } },
    "body.photos items": { body: { w: {}, m: {}, photos: [null, 3, { id: 5 }] } },
    "shop.pantry values": { shop: { pantry: { "t-rice": "lots", "t-oil": null }, extras: [null, 3], buys: {}, stores: "x", checked: [] } },
    "shop.buys items": { shop: { pantry: {}, extras: [], buys: [null, 4, "x"] } },
    "train lists of non-objects": { train: { races: [null, 1], tests: "x", pbs: [3], goals: "g", wk: "w" } },
  };
};
const TABS = ["today", "plan", "stats", "progress", "train", "settings", "shop", "pantry"];
const mainLen = p => p.evaluate(() => document.querySelector("#main")?.innerText.length || 0);
const drawAll = p => p.evaluate(t => { const fails = []; for (const tab of t) { try { UI.tab = tab; render(); const m = document.querySelector("#main"); if (/could.t be drawn/.test(m.innerText)) fails.push(tab + ": " + m.innerText.slice(0, 160)); } catch (e) { fails.push(tab + ": " + e.message); } } return fails; }, TABS);

for (const [name, part] of Object.entries(BAD())) test("A2 restore (Replace) of a file with " + name + ": every screen draws, also after a reload", async () => {
  const app = await H.startApp({ dir, seed: F.seed({ withPlan: true }) });
  try {
    await app.page.evaluate(async j => { restoreOpen({ app: "Engine", version: 3, ...j }, "file"); if (UI.sheet?.type === "restore") { UI.sheet.mode = "replace"; await ACT["rs-go"](); } }, part);
    await app.page.waitForTimeout(600);
    assert.deepEqual(await drawAll(app.page), [], "a screen throws after the restore");
    await app.reload();
    assert.ok(await mainLen(app.page) > 20, "blank page after the reload");
    assert.deepEqual(await drawAll(app.page), [], "a screen throws after the reload");
    assert.deepEqual(app.errors, []);
  } finally { await app.close(); }
});

for (const [name, part] of Object.entries(BAD())) test("A2 device copy with " + name + ": the app starts and every screen draws", async () => {
  const app = await H.startApp({ dir, seed: { ...F.seed({ withPlan: true }), ...part, settings: { ...F.seed({ withPlan: true }).settings, ...(part.settings || {}) } } });
  try {
    assert.ok(await mainLen(app.page) > 20, "blank page");
    assert.deepEqual(await drawAll(app.page), []);
    assert.deepEqual(app.errors, []);
  } finally { await app.close(); }
});

test("A2 a screen that still throws leaves an emergency way out (Restore points) instead of a blank page", async () => {
  const app = await H.startApp({ dir, seed: F.seed({ withPlan: true }) });
  try {
    app.allowRenderFailed();   // this test WANTS the emergency card
    await app.page.evaluate(() => { VIEWS.today = () => { throw new Error("boom"); }; UI.tab = "today"; render(); });
    const t = await app.page.evaluate(() => document.querySelector("#main").innerText);
    assert.match(t, /couldn.t be drawn/i);
    assert.ok(await app.page.locator('#main [data-act="bk-points"]').count() > 0, "no way to the restore points");
    await app.page.locator('#main [data-act="bk-points"]').click();
    assert.ok(await app.page.waitForFunction(() => UI.sheet?.type === "bkpoints", null, { timeout: 3000 }));
  } finally { await app.close(); }
});

test("A2 the account holds a malformed day / log / body: no page error, the app draws", async () => {
  const srv = FS.server(), d0 = F.plus(0), ym = d0.slice(0, 7);
  srv.set("u1", "settings", { onboarded: true, meals: [1, 2], types: "x" });
  srv.set("u1", "lib/days/" + d0, { date: d0, meals: "abc" });
  srv.set("u1", "lib/logm/" + ym, { days: { [d0]: { workouts: "run", water: "lots" } } });
  srv.set("u1", "body", { w: { [d0]: "heavy" }, m: [], photos: "p" });
  srv.set("u1", "shop", { pantry: { "t-rice": "lots" }, extras: [null, 3], buys: {} });
  const A = await dev(srv, "A"); await A.settle(); await wait(500);
  assert.deepEqual(await drawAll(A.page), []);
  assert.ok(await mainLen(A.page) > 20);
  assert.deepEqual(A.errors, []);
});
