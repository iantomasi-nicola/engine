/* L211 open items from the code review: (1) the id derived from a record's content must not depend on the order of its keys (Postgres jsonb reorders them),
   (2) the fake server stamps and compares updated_at like Postgres (microseconds, +00:00), so the conditional update is tested on a row the server marked. Synthetic data. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let app;
test.afterEach(async () => { await app?.close(); app = null; });
const start = async () => { app = await H.startApp({ dir: H.build(H.tmp("l211o-build")), seed: F.seed({ withPlan: false }) }); return app.page; };

test("a record that arrives without an id gets the same id whatever the order of its keys (and nested keys)", async () => {
  const page = await start();
  const r = await page.evaluate(() => {
    const a = [{ sport: "Run", min: 40, hr: { avg: 150, max: 171 }, note: "easy" }, { sport: "Run", min: 40, hr: { avg: 150, max: 171 }, note: "easy" }];
    const b = [{ note: "easy", hr: { max: 171, avg: 150 }, min: 40, sport: "Run" }, { hr: { avg: 150, max: 171 }, sport: "Run", note: "easy", min: 40 }];
    const ka = ensureKeys(a, "wid", false).map(x => x.wid), kb = ensureKeys(b, "wid", false).map(x => x.wid);
    return { ka, kb }; });
  assert.deepEqual(r.ka, r.kb, "same ids from reordered records");
  assert.equal(new Set(r.ka).size, 2, "identical records still get distinct ids (the second is renamed)");
  assert.deepEqual(app.errors, []);
});

test("the fake server stamps updated_at like Postgres and the conditional update works on a row it marked, whatever notation the client sends back", async () => {
  const FS = require("./lib/fake-supabase"), S = FS.server(), dev = { name: "A", uid: "u1" };
  await S.handle(dev, { op: "insert", row: { path: "lib/shop", data: { n: 1 } } });          // no updated_at: the server stamps it
  const seen = (await S.handle(dev, { op: "select", single: true, eq: { path: "lib/shop" } })).data.updated_at;
  assert.match(seen, /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{6}\+00:00$/, "microseconds and +00:00: " + seen);
  const asZ = seen.replace(/\d{3}\+00:00$/, "Z");                                               // the same instant at millisecond precision
  assert.equal((await S.handle(dev, { op: "update", row: { data: { n: 2 }, updated_at: "2026-10-26T12:00:00.000Z" }, eq: { path: "lib/shop", updated_at: "2026-01-01T00:00:00.000Z" } })).data.length, 0, "a stale version is refused");
  assert.equal((await S.handle(dev, { op: "update", row: { data: { n: 2 }, updated_at: "2026-10-26T12:00:00.000Z" }, eq: { path: "lib/shop", updated_at: seen } })).data.length, 1, "the exact value the server returned is accepted");
  assert.equal(S.get("u1", "lib/shop").n, 2);
  assert.equal(FS.canonTs(asZ).slice(0, 23), seen.slice(0, 23), "canonical form agrees on the instant");
});
