/* L211 section A, defect 5 (docs/review/AUDIT_2026-10-26.md): sending a merged document must not lose a change another device made in the meantime.
   Real shim.js against an in-memory Supabase shared by several browser contexts (tests/lib/fake-supabase.js). Synthetic data only, no network. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic"), FS = require("./lib/fake-supabase");
let dir, browser; const devs = [];
test.before(async () => { dir = H.build(H.tmp("l211-send")); browser = await H.loadPlaywright().chromium.launch(); });
test.after(async () => { await browser?.close(); });
test.afterEach(async () => { for (const d of devs.splice(0)) await d.close(); });
const dev = async (srv, name, o = {}) => { const d = await FS.device(srv, name, { dir, browser, ...o }); devs.push(d); return d; };
const wait = ms => new Promise(r => setTimeout(r, ms));
/* every read and every write of a row takes 300 ms on the server, so two devices sending together are both between «read» and «write» at once */
const slow = srv => { const orig = srv.handle; srv.handle = async (dv, spec) => { if (["upsert", "insert", "update"].includes(spec.op) || (spec.op === "select" && spec.single)) await wait(300); return orig(dv, spec); }; return () => { srv.handle = orig; }; };

/* A5. Hand-computed: the account's body has no weigh-in. Both devices put one at the same moment (A: day -1 = 70, B: day -2 = 79).
   Expected on the server and on both devices: both weigh-ins. */
test("A5 two devices send the same document at the same moment: both changes kept", async () => {
  const srv = FS.server(), seed = F.seed({ withPlan: false }); seed.body = { w: {}, m: {} };
  const A = await dev(srv, "A", { seed }); await A.settle();
  const B = await dev(srv, "B"); await B.settle();
  const restore = slow(srv);
  await Promise.all([A.page.evaluate(d => put("body", "", { ...S.body, w: { ...S.body.w, [d]: 70 } }), F.plus(-1)), B.page.evaluate(d => put("body", "", { ...S.body, w: { ...S.body.w, [d]: 79 } }), F.plus(-2))]);
  await wait(3500); restore(); await A.settle(); await B.settle(); await wait(500);
  const want = { [F.plus(-1)]: 70, [F.plus(-2)]: 79 };
  assert.deepEqual(srv.get("u1", "body").w, want);
  assert.deepEqual(await A.page.evaluate(() => S.body.w), want);
  assert.deepEqual(await B.page.evaluate(() => S.body.w), want);
  assert.deepEqual([...A.errors, ...B.errors], []);
});

test("A5 two devices create the same document at the same moment (row missing): both changes kept", async () => {
  const srv = FS.server(), seed = F.seed({ withPlan: false });
  const A = await dev(srv, "A", { seed }); await A.settle();
  const B = await dev(srv, "B"); await B.settle();
  srv.rows("u1").delete("body"); await A.page.evaluate(() => { Sync.seen.body = null; }); await B.page.evaluate(() => { Sync.seen.body = null; });
  const restore = slow(srv);
  await Promise.all([A.page.evaluate(d => put("body", "", { w: { [d]: 70 }, m: {} }), F.plus(-1)), B.page.evaluate(d => put("body", "", { w: { [d]: 79 }, m: {} }), F.plus(-2))]);
  await wait(3500); restore(); await A.settle(); await B.settle(); await wait(500);
  assert.deepEqual(srv.get("u1", "body").w, { [F.plus(-1)]: 70, [F.plus(-2)]: 79 });
});
