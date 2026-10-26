/* L211 section A, defect 9 and the suspicions around it (docs/review/AUDIT_2026-10-26.md): the restore point taken before a device is attached to an account,
   and the legacy queue. Synthetic data only. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic"), FS = require("./lib/fake-supabase");
let dir, browser; const devs = [];
test.before(async () => { dir = H.build(H.tmp("l211-claim")); browser = await H.loadPlaywright().chromium.launch(); });
test.after(async () => { await browser?.close(); });
test.afterEach(async () => { for (const d of devs.splice(0)) await d.close(); });
const dev = async (srv, name, o = {}) => { const d = await FS.device(srv, name, { dir, browser, ...o }); devs.push(d); return d; };
const wait = ms => new Promise(r => setTimeout(r, ms));

/* A9a. The device holds data of no account (and another account's copy is on it too, so signing in would clear it) and the browser cannot store a restore point (no IndexedDB): signing in to an account must not clear the device.
   Expected: the local foods are still there, nothing was uploaded, the app says why, and it stays "On this device". */
test("A9 no restore point could be saved: the device keeps its data, is not attached to the account, and says so", async () => {
  const srv = FS.server(); srv.set("u1", "settings", { onboarded: true });
  const A = await dev(srv, "A", { seed: F.seed({ withPlan: true }), local: { "engine.snap.uOther": "[]" }, init: () => { indexedDB.open = () => { throw new Error("no storage"); }; } });
  await wait(1500);
  const r = await A.page.evaluate(() => ({ foods: Object.keys(S.foods).length, db: !!Sync.db, state: Sync.state, toast: document.querySelector("#toast")?.textContent || "" }));
  assert.ok(r.foods > 0, "the device's foods were cleared");
  assert.equal(r.db, false); assert.equal(r.state, "local");
  assert.match(r.toast, /restore point/i, "the app did not say why");
  assert.deepEqual([...srv.rows("u1").keys()], ["settings"], "something was uploaded");
});

/* A9b. The points made before a sign-in are the way back from a wrong first sign-in: they are not rotated away by the daily ones (the last 14). */
test("A9 a «before sign-in» restore point survives the rotation of the daily ones", async () => {
  const A = await H.startApp({ dir, seed: F.seed({ withPlan: false }) }); devs.push(A);
  const r = await A.page.evaluate(async () => {
    await restorePoint("before sign-in (this device's data)");
    for (let i = 0; i < 17; i++) { await new Promise(r => setTimeout(r, 4)); await restorePoint("daily"); }
    const ks = await BKDB.keys("pts"), why = []; for (const k of ks) why.push((await BKDB.get("pts", k)).why);
    return { n: ks.length, before: why.filter(w => /^before sign-in/.test(w)).length, daily: why.filter(w => w === "daily").length };
  });
  assert.equal(r.before, 1); assert.equal(r.daily, 14);
});

/* A9c. The single queue of older versions belongs to the account that owns this device's data, not to whoever signs in first with no snapshot. */
test("A9 the legacy queue is not adopted by an account that does not own the device's data", async () => {
  const srv = FS.server(), legacy = [{ op: "set", path: "body", data: { w: { [F.plus(-1)]: 77 }, m: {} } }];
  const A = await dev(srv, "A", { uid: "uB", seed: F.seed({ withPlan: false }), local: { "engine.q": JSON.stringify(legacy), "engine.owner": "uA" } }); await A.settle(); await wait(1200);
  assert.equal(srv.get("uB", "body"), undefined, "account B received account A's queued weigh-in");
  assert.equal(await A.page.evaluate(() => localStorage.getItem("engine.q")), JSON.stringify(legacy), "the legacy queue was taken away from its owner");
});
