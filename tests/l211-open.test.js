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
