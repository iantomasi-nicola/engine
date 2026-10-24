/* One-time clean-ups (aisle fix, bin purge, pantry link) must run on the account's data, not on a stale copy.
   Regression for "17 foods moved to the right aisle" appearing at every refresh. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let app, dir;
test.before(() => { dir = H.build(H.tmp("gate-build")); });
test.afterEach(async () => { await app?.close(); app = null; });

/* signed-in simulation: a fake account store that records writes; snapshots are delivered by hand */
const setup = async () => {
  const seed = F.seed({ withPlan: false });
  seed.foods["t-banana"] = { id: "t-banana", name: "Banana", per: { kcal: 89, p: 1, c: 23, f: 0, fib: 2 }, unit: "g", pack: 0, cat: "pantry", role: "R", meals: ["b", "s"], source: "custom", servings: [], catV: 1 };   // already seen at boot: the page starts as if signed out
  app = await H.startApp({ dir, seed });
  await app.page.evaluate(() => {
    window.__toasts = []; window.__writes = []; const realToast = toast; toast = (m, u) => { __toasts.push(String(m)); };
    const ref = path => ({ set: async d => { __writes.push(path); }, delete: async () => {}, collection: n => ({ doc: id => ref(path + "/" + n + "/" + id) }) });
    S.foods["t-banana"].cat = "pantry"; delete S.foods["t-banana"].catV;   // what a stale copy looks like
    Sync.db = { doc: p => ref(p) }; Sync.base = "u1"; Sync.ready = true; Sync.known = {}; Sync.fresh = {}; CATFIX_DONE = false;
  });
  return app.page;
};
const snap = (foods, fromCache) => `applyCollection("foods", { docs: ${JSON.stringify(Object.values(foods).map(f => f))}.map(f => ({ id: f.id, data: () => f })), metadata: { fromCache: ${fromCache} } })`;

test("a stale cached copy does not trigger the clean-up; the account's data (already fixed) means no message and no writes", async () => {
  const page = await setup();
  const r = await page.evaluate(async () => {
    const stale = clone(S.foods), fixed = clone(S.foods); fixed["t-banana"].cat = "produce"; fixed["t-banana"].catV = 1;
    applyCollection("foods", { docs: Object.values(stale).map(f => ({ id: f.id, data: () => f })), metadata: { fromCache: true } }); await new Promise(r => setTimeout(r, 150));
    const afterCache = { toasts: [...__toasts], writes: __writes.length };
    applyCollection("foods", { docs: Object.values(fixed).map(f => ({ id: f.id, data: () => f })), metadata: { fromCache: false } }); await new Promise(r => setTimeout(r, 600));
    return { afterCache, toasts: [...__toasts], writes: __writes.length, cat: S.foods["t-banana"].cat };
  });
  assert.deepEqual(r.afterCache, { toasts: [], writes: 0 });
  assert.deepEqual([r.toasts, r.writes, r.cat], [[], 0, "produce"]);
});

test("when the account really has the food in the wrong aisle, it is fixed once, with one message", async () => {
  const page = await setup();
  const r = await page.evaluate(async () => {
    const remote = clone(S.foods);
    applyCollection("foods", { docs: Object.values(remote).map(f => ({ id: f.id, data: () => f })), metadata: { fromCache: false } }); await new Promise(r => setTimeout(r, 700));
    return { toasts: [...__toasts], fixed: S.foods["t-banana"].cat, v: S.foods["t-banana"].catV, written: __writes.some(p => p.endsWith("foods/t-banana")) };
  });
  assert.deepEqual(r.toasts, ["1 food moved to the right aisle"]); assert.deepEqual([r.fixed, r.v, r.written], ["produce", 2, true]);
});

test("a full device is not silent: one message when the local copy cannot be saved", async () => {
  app = await H.startApp({ dir, seed: F.seed({ withPlan: false }) });
  const r = await app.page.evaluate(() => {
    const msgs = []; toast = m => msgs.push(String(m));
    const real = Storage.prototype.setItem; Storage.prototype.setItem = function () { throw new DOMException("full", "QuotaExceededError"); };
    saveLocal(); saveLocal(); Storage.prototype.setItem = real; return msgs;
  });
  assert.equal(r.length, 1); assert.match(r[0], /storage is full/i);
});
