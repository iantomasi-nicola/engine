/* L211 section A, defect 3 (docs/review/AUDIT_2026-10-26.md): the meal plan is merged across devices.
   Real shim.js against an in-memory Supabase shared by several browser contexts (tests/lib/fake-supabase.js). Synthetic data only, no network. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic"), FS = require("./lib/fake-supabase");
let dir, browser; const devs = [];
test.before(async () => { dir = H.build(H.tmp("l211-merge")); browser = await H.loadPlaywright().chromium.launch(); });
test.after(async () => { await browser?.close(); });
test.afterEach(async () => { for (const d of devs.splice(0)) await d.close(); });
const dev = async (srv, name, o = {}) => { const d = await FS.device(srv, name, { dir, browser, ...o }); devs.push(d); return d; };
const wait = ms => new Promise(r => setTimeout(r, ms));
/* a past month, so the days of a log document are in the same month whatever today is */
const YM = F.plus(-40).slice(0, 7), DX = YM + "-10";

/* A3. Hand-computed: day D has item x (not eaten) in meal m and item y in meal d. Offline, A adds ia to m and ticks x eaten; meanwhile B adds ib to d and ticks y eaten.
   Expected on the server and on both devices: m = [x(eaten), ia], d = [y(eaten), ib]. */
test("A3 two devices edit the same planned day: both meals and both ticks kept", async () => {
  const srv = FS.server(), seed = F.seed({ withPlan: false }), d = F.plus(1);
  seed.days = { [d]: { date: d, meals: { m: [{ id: "x", kind: "food", ref: "t-rice", qty: 50, eaten: false }], d: [{ id: "y", kind: "food", ref: "t-chicken", qty: 100, eaten: false }] } } };
  const A = await dev(srv, "A", { seed }); await A.settle();
  const B = await dev(srv, "B"); await B.settle();
  A.down = true;
  await A.page.evaluate(d => { const x = clone(S.days[d]); x.meals.m = x.meals.m.map(i => ({ ...i, eaten: true })).concat([{ id: "ia", kind: "food", ref: "t-rice", qty: 80, eaten: false }]); put("days", d, x); }, d);
  await B.page.evaluate(d => { const x = clone(S.days[d]); x.meals.d = x.meals.d.map(i => ({ ...i, eaten: true })).concat([{ id: "ib", kind: "food", ref: "t-chicken", qty: 200, eaten: false }]); put("days", d, x); }, d);
  await B.settle(); await wait(400);
  A.down = false; await A.page.evaluate(() => dispatchEvent(new Event("online"))); await A.settle(8000); await wait(800);
  const want = { m: [["x", true], ["ia", false]], d: [["y", true], ["ib", false]] }, shape = day => Object.fromEntries(Object.entries(day.meals).map(([m, l]) => [m, l.map(i => [i.id, i.eaten])]));
  assert.deepEqual(shape(srv.get("u1", "lib/days/" + d)), want);
  await B.settle(); await wait(500);
  for (const x of [A, B]) assert.deepEqual(shape(await x.page.evaluate(d => S.days[d], d)), want, x.name);
  assert.deepEqual([...A.errors, ...B.errors], []);
});
