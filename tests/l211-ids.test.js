/* L211 follow-up (code-guard): the id a legacy record (a workout or a purchase without wid/bid) gets must not depend on the order of its keys.
   Postgres jsonb stores the keys of an object by length, then bytes, so the account hands back {int, min, sport} for what a device wrote as {sport, min, int}.
   Hand-computed: one legacy workout {sport:"Run", min:30, int:"Moderate"} on the device and the same record in the account (keys in jsonb order) -> after the first sign-in merge
   there is ONE workout, on the device and in the account. Real shim.js against the in-memory Supabase (tests/lib/fake-supabase.js, which reorders keys like jsonb). Synthetic data only, no network. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic"), FS = require("./lib/fake-supabase");
let dir, browser; const devs = [];
test.before(async () => { dir = H.build(H.tmp("l211-ids")); browser = await H.loadPlaywright().chromium.launch(); });
test.after(async () => { await browser?.close(); });
test.afterEach(async () => { for (const d of devs.splice(0)) await d.close(); });
const dev = async (srv, name, o = {}) => { const d = await FS.device(srv, name, { dir, browser, ...o }); devs.push(d); return d; };
const YM = F.plus(-40).slice(0, 7), DX = YM + "-10";
const logDoc = w => ({ month: YM, days: { [DX]: { workouts: [w] } } });

test("the fake server reorders keys like jsonb (length, then bytes)", () => {
  const srv = FS.server(); srv.set("u1", "x", { sport: "Run", min: 30, int: "Moderate", nested: { zz: 1, b: 2, aaa: 3 } });
  assert.deepEqual(Object.keys(srv.get("u1", "x")), ["min", "int", "sport"].concat("nested").sort((a, b) => a.length - b.length || (a < b ? -1 : 1)));
  assert.deepEqual(Object.keys(srv.get("u1", "x").nested), ["b", "zz", "aaa"]);
});

test("the id of a legacy workout is the same whatever the order of its keys", async () => {
  const A = await H.startApp({ dir, seed: F.seed({ withPlan: false }) }); devs.push(A);
  const r = await A.page.evaluate(() => {
    const a = ensureKeys([{ sport: "Run", min: 30, int: "Moderate", x: { q: 1, p: 2 } }], "wid", false)[0].wid;
    const b = ensureKeys([{ x: { p: 2, q: 1 }, int: "Moderate", min: 30, sport: "Run" }], "wid", false)[0].wid;
    const c = ensureKeys([{ sport: "Run", min: 31, int: "Moderate", x: { q: 1, p: 2 } }], "wid", false)[0].wid;
    return { a, b, c };
  });
  assert.equal(r.a, r.b, "same record, different key order");
  assert.notEqual(r.a, r.c, "a different record keeps a different id");
});

test("a legacy workout on a device and the same one in the account (keys in jsonb order) merge into ONE workout", async () => {
  const srv = FS.server();
  srv.set("u1", "lib/logm/" + YM, logDoc({ sport: "Run", min: 30, int: "Moderate" }));
  const seed = F.seed({ withPlan: false }); seed.logm = { [YM]: logDoc({ sport: "Run", min: 30, int: "Moderate" }) };
  const A = await dev(srv, "A", { seed }); await A.settle(8000); await new Promise(r => setTimeout(r, 1200));
  const local = await A.page.evaluate(dx => logGet(dx).workouts.map(x => x.sport + " " + x.wid), DX);
  const acct = srv.get("u1", "lib/logm/" + YM).days[DX].workouts;
  assert.equal(local.length, 1, "the device now holds a duplicate: " + local);
  assert.equal(acct.length, 1, "the account now holds a duplicate: " + JSON.stringify(acct));
  assert.deepEqual(A.errors, []);
});
