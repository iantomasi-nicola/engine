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
