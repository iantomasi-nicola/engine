/* L211 section A, defect 4 (docs/review/AUDIT_2026-10-26.md): lists of records without a unique id are merged across devices.
   Real shim.js against an in-memory Supabase shared by several browser contexts (tests/lib/fake-supabase.js). Synthetic data only, no network. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic"), FS = require("./lib/fake-supabase");
let dir, browser; const devs = [];
test.before(async () => { dir = H.build(H.tmp("l211-lists")); browser = await H.loadPlaywright().chromium.launch(); });
test.after(async () => { await browser?.close(); });
test.afterEach(async () => { for (const d of devs.splice(0)) await d.close(); });
const dev = async (srv, name, o = {}) => { const d = await FS.device(srv, name, { dir, browser, ...o }); devs.push(d); return d; };
const wait = ms => new Promise(r => setTimeout(r, ms));
/* a past month, so the days of a log document are in the same month whatever today is */
const YM = F.plus(-40).slice(0, 7), DX = YM + "-10";

/* A4. Lists of records without a unique id: workouts of a day (wid), purchases (bid; their id is the food) and deleted races (a set of strings). */
test("A4 two devices each add a workout to the same day: both kept, each with its own id", async () => {
  const srv = FS.server(), A = await dev(srv, "A", { seed: F.seed({ withPlan: false }) }); await A.settle();
  const B = await dev(srv, "B"); await B.settle();
  A.down = true;
  await A.page.evaluate(dx => mutateLog(dx, d => { d.workouts = [...(d.workouts || []), wClean({ sport: "Running", min: 40, km: 6, int: "Moderate" })]; }), DX);
  await B.page.evaluate(dx => mutateLog(dx, d => { d.workouts = [...(d.workouts || []), wClean({ sport: "Strength", min: 50, int: "Hard" })]; }), DX);
  await B.settle(); await wait(400);
  A.down = false; await A.page.evaluate(() => dispatchEvent(new Event("online"))); await A.settle(8000); await wait(800);
  const w = srv.get("u1", "lib/logm/" + YM).days[DX].workouts;
  assert.deepEqual(w.map(x => x.sport).sort(), ["Running", "Strength"]);
  assert.equal(new Set(w.map(x => x.wid)).size, 2, "every workout has its own id");
  assert.deepEqual([...A.errors, ...B.errors], []);
});

test("A4 merge rules: legacy workouts without an id, purchases, deleted races", async () => {
  const srv = FS.server(), A = await dev(srv, "A", { seed: F.seed({ withPlan: false }) });
  const r = await A.page.evaluate(([dx]) => {
    const W = (sport, min) => ({ sport, min, int: "Moderate" }), M = (p, b, l, r) => ENGINE.merge(p, b, l, r);
    const day = list => ({ days: { [dx]: { workouts: list } } });
    /* legacy day (no ids): base [Run, Bike]; this device removes Run; the account adds Swim -> [Bike, Swim] */
    const wo = M("lib/logm/" + dx.slice(0, 7), day([W("Run", 30), W("Bike", 60)]), day([W("Bike", 60)]), day([W("Run", 30), W("Bike", 60), W("Swim", 45)])).days[dx].workouts.map(x => x.sport);
    /* purchases: base [b1]; this device adds a second purchase of the SAME food; the account adds oil -> three purchases */
    const b1 = { d: "2026-10-01", id: "t-rice", n: "Rice", g: 1000, eur: 2 };
    const buys = M("shop", { buys: [b1] }, { buys: [b1, { d: "2026-10-20", id: "t-rice", n: "Rice", g: 1000, eur: 2.1 }] }, { buys: [b1, { d: "2026-10-21", id: "t-oil", n: "Oil", g: 500, eur: 5 }] }).buys.map(x => x.d + " " + x.id);
    /* deleted races are a set: base [a]; this device adds b, the account adds c -> a, b, c; and a removal by one side stays removed (base [a,b], this device drops b, account adds c -> a, c) */
    const rd = M("train", { racesDel: ["a"] }, { racesDel: ["a", "b"] }, { racesDel: ["a", "c"] }).racesDel;
    const rd2 = M("train", { racesDel: ["a", "b"] }, { racesDel: ["a"] }, { racesDel: ["a", "b", "c"] }).racesDel;
    return { wo, buys, rd, rd2 };
  }, [DX]);
  assert.deepEqual(r.wo.sort(), ["Bike", "Swim"]);
  assert.deepEqual(r.buys.sort(), ["2026-10-01 t-rice", "2026-10-20 t-rice", "2026-10-21 t-oil"]);
  assert.deepEqual(r.rd, ["a", "b", "c"]);
  assert.deepEqual(r.rd2, ["a", "c"]);
});

test("A4 a legacy day gets stable workout ids on load; a copy made in the same day gets its own id", async () => {
  const seed = F.seed({ withPlan: false });
  seed.logm = { [YM]: { month: YM, days: { [DX]: { workouts: [{ sport: "Run", min: 30, int: "Moderate" }, { sport: "Run", min: 30, int: "Moderate" }] } } } };
  const A = await H.startApp({ dir, seed }); devs.push(A);
  const a = await A.page.evaluate(dx => logGet(dx).workouts.map(x => x.wid), DX);
  assert.ok(a.every(x => typeof x === "string" && x) && new Set(a).size === 2, "two identical legacy workouts get two different ids: " + a);
  await A.page.evaluate(dx => mutateLog(dx, d => { d.workouts = [...d.workouts, { ...d.workouts[0] }]; }), DX);
  const b = await A.page.evaluate(dx => logGet(dx).workouts.map(x => x.wid), DX);
  assert.equal(new Set(b).size, 3, "the copy shares an id: " + b);
  assert.deepEqual(b.slice(0, 2), a, "existing ids stay");
});

test("A4 a purchase made on this device gets its own id, kept when edited", async () => {
  const A = await H.startApp({ dir, seed: F.seed({ withPlan: false }) }); devs.push(A);
  const r = await A.page.evaluate(() => { S.shop.buys = [{ d: "2026-10-01", id: "t-rice", n: "Rice", g: 1000, eur: 2 }, { d: "2026-10-01", id: "t-rice", n: "Rice", g: 1000, eur: 2 }]; put("shop", "", S.shop);
    const ids = S.shop.buys.map(b => b.bid); S.shop.buys[0].eur = 3; put("shop", "", S.shop); return { ids, after: S.shop.buys.map(b => b.bid) }; });
  assert.ok(r.ids.every(x => typeof x === "string" && x) && new Set(r.ids).size === 2);
  assert.deepEqual(r.after, r.ids);
});
