/* L211 follow-up (code-guard): the fake Supabase answers updated_at the way PostgREST does (microseconds, "+00:00", trailing zeros trimmed) and compares it as a point in time, microsecond
   exact, so the conditional update of sendMerged (.eq("updated_at", <what the select returned>)) is tried against a row stamped by the SERVER, not only by the client.
   Hand-computed: the server stamps the account's body at 2026-10-26T13:00:00.123456+00:00 with the weigh-in of day -1 = 80 (and, in the next case, a different stamp for day -2 = 79);
   the device holds a stale copy and sends day -3 = 70. The merged document must hold all of them, written by an UPDATE (not an upsert), with the stamp moved forward. Synthetic data only, no network. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic"), FS = require("./lib/fake-supabase");
let dir, browser; const devs = [];
test.before(async () => { dir = H.build(H.tmp("l211-stamp")); browser = await H.loadPlaywright().chromium.launch(); });
test.after(async () => { await browser?.close(); });
test.afterEach(async () => { for (const d of devs.splice(0)) await d.close(); });
const dev = async (srv, name, o = {}) => { const d = await FS.device(srv, name, { dir, browser, ...o }); devs.push(d); return d; };
const wait = ms => new Promise(r => setTimeout(r, ms));

test("the fake server formats and compares timestamps like Postgres", async () => {
  assert.equal(FS.pgTime("2026-10-26T13:00:00.123Z"), "2026-10-26T13:00:00.123+00:00");
  assert.equal(FS.pgTime("2026-10-26T13:00:00.000Z"), "2026-10-26T13:00:00+00:00");
  assert.equal(FS.pgTime("2026-10-26T13:00:00.123456+00:00"), "2026-10-26T13:00:00.123456+00:00");
  assert.equal(FS.pgTime("2026-10-26T13:00:00.120000+00:00"), "2026-10-26T13:00:00.12+00:00");
  assert.equal(FS.pgTime("2026-10-26T15:00:00.5+02:00"), "2026-10-26T13:00:00.5+00:00");
  const srv = FS.server(), d = { uid: "u1", name: "x" }; srv.set("u1", "p", { a: 1 }, "2026-10-26T13:00:00.123456+00:00");
  const sel = await srv.handle(d, { op: "select", single: true, eq: { path: "p" } });
  assert.equal(sel.data.updated_at, "2026-10-26T13:00:00.123456+00:00");
  const upd = at => srv.handle(d, { op: "update", row: { data: { a: 2 }, updated_at: "2026-10-26T14:00:00Z" }, eq: { path: "p", updated_at: at } });
  assert.equal((await upd("2026-10-26T13:00:00.123Z")).data.length, 0, "a time cut to milliseconds is not the stamp of the row");
  assert.equal((await upd("2026-10-26T13:00:00.123457+00:00")).data.length, 0);
  assert.equal((await upd("2026-10-26T13:00:00.123456+00:00")).data.length, 1);
  assert.equal(srv.get("u1", "p").a, 2);
  assert.equal((await srv.handle(d, { op: "select", single: true, eq: { path: "p" } })).data.updated_at, "2026-10-26T14:00:00+00:00");
});

test("sendMerged updates a row the server stamped (microseconds) and keeps both changes", async () => {
  for (const stamp of ["2026-10-26T13:00:00.123456+00:00", "2026-10-26T13:00:00.5+00:00", "2026-10-26T13:00:00+00:00"]) {
    const srv = FS.server(), seed = F.seed({ withPlan: false }); seed.body = { w: {}, m: {} };
    const A = await dev(srv, "A", { seed }); await A.settle();
    srv.set("u1", "body", { w: { [F.plus(-1)]: 80 }, m: {} }, stamp);   // the account changed elsewhere; A has not heard of it
    const before = srv.log.length;
    await A.page.evaluate(d => put("body", "", { ...S.body, w: { ...S.body.w, [d]: 70 } }), F.plus(-3));
    await A.settle(8000); await wait(600);
    assert.deepEqual(srv.get("u1", "body").w, { [F.plus(-1)]: 80, [F.plus(-3)]: 70 }, stamp);
    assert.deepEqual(srv.log.slice(before).filter(x => x[2] === "body").map(x => x[1]), ["update"], "a conditional update, " + stamp);
    assert.ok(Date.parse(srv.rows("u1").get("body").ua) > Date.parse(stamp), "the stamp moves forward");
    assert.deepEqual(await A.page.evaluate(() => S.body.w), { [F.plus(-1)]: 80, [F.plus(-3)]: 70 });
    assert.deepEqual(A.errors, []);
    await A.close(); devs.splice(devs.indexOf(A), 1);
  }
});
