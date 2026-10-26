/* L211 section A, defect 6 (docs/review/AUDIT_2026-10-26.md): «Replace» says «what the file has overwrites what's here; anything it lacks stays».
   It used to swap whole months of the daily log and whole documents (body, shop, training), so what was added after the backup was lost. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let dir; const apps = [];
test.before(() => { dir = H.build(H.tmp("l211-restore")); });
test.afterEach(async () => { for (const a of apps.splice(0)) await a.close(); });
const YM = F.plus(-40).slice(0, 7), DX = YM + "-10", DY = YM + "-12";

/* Hand-computed. At backup time: weigh-in day -10 = 80; log day DX water 1000; pantry rice 500 g; race r1 "Old". Afterwards: weigh-in day -1 = 78 added; log day DY water 2500 added;
   DX water changed to 3000; pantry rice changed to 100 g and oil 200 g added; race r2 "New" added; r1 renamed.
   After «Replace»: weigh-ins -10 and -1 (the file has -10 only); DX water 1000 (the file has it), DY water 2500 (the file lacks it);
   pantry rice 500 (the file has it), oil 200 (the file lacks it); races r1 "Old" (the file has it) and r2 "New". */
test("A6 Replace brings back what the file has and keeps what it lacks (log days, weigh-ins, pantry, races)", async () => {
  const seed = F.seed({ withPlan: false }); seed.body = { w: { [F.plus(-10)]: 80 }, m: {} };
  seed.logm = { [YM]: { month: YM, days: { [DX]: { water: 1000 } } } };
  seed.shop.pantry = { "t-rice": { g: 500 } }; seed.train = { tests: [], pbs: [], calis: [], circuitLog: [], topSets: [], races: [{ id: "r1", name: "Old", date: F.plus(30) }] };
  const app = await H.startApp({ dir, seed }); apps.push(app);
  const r = await app.page.evaluate(async ([d1, dx, dy]) => {
    const j = JSON.parse(JSON.stringify(backupData()));
    put("body", "", { ...S.body, w: { ...S.body.w, [d1]: 78 } });
    mutateLog(dx, d => { d.water = 3000; }); mutateLog(dy, d => { d.water = 2500; });
    S.shop.pantry["t-rice"] = { g: 100 }; S.shop.pantry["t-oil"] = { g: 200 }; put("shop", "", S.shop);
    S.train.races = [{ id: "r1", name: "Renamed", date: S.train.races[0].date }, { id: "r2", name: "New", date: S.train.races[0].date }]; put("train", "", S.train);
    restoreOpen(j, "file"); UI.sheet.mode = "replace"; await ACT["rs-go"](); await new Promise(r => setTimeout(r, 300));
    return { w: S.body.w, dx: logGet(dx)?.water, dy: logGet(dy)?.water, pantry: Object.fromEntries(Object.entries(S.shop.pantry).map(([k, v]) => [k, v.g])), races: S.train.races.map(x => x.id + ":" + x.name).sort() };
  }, [F.plus(-1), DX, DY]);
  assert.deepEqual(r.w, { [F.plus(-10)]: 80, [F.plus(-1)]: 78 });
  assert.equal(r.dx, 1000); assert.equal(r.dy, 2500);
  assert.deepEqual(r.pantry, { "t-rice": 500, "t-oil": 200 });
  assert.deepEqual(r.races, ["r1:Old", "r2:New"]);
  assert.deepEqual(app.errors, []);
});

test("A6 Replace into an empty device restores the file as it is", async () => {
  const src = F.seed({ withPlan: false }); src.body = { w: { [F.plus(-10)]: 80 }, m: {} }; src.logm = { [YM]: { month: YM, days: { [DX]: { water: 1000 } } } };
  const app = await H.startApp({ dir, seed: F.seed({ withPlan: false }) }); apps.push(app);
  const r = await app.page.evaluate(async j => { restoreOpen({ app: "Engine", version: 3, ...j }, "file"); UI.sheet.mode = "replace"; await ACT["rs-go"](); await new Promise(r => setTimeout(r, 300)); return { w: S.body.w, shop: S.shop, dx: Object.values(S.logm)[0]?.days }; }, { body: src.body, logm: src.logm, shop: { checked: {}, extras: [{ id: "e1", text: "Salt" }], pantry: { "t-rice": { g: 250 } }, range: 7, stores: [{ id: "st-lidl", name: "Lidl" }] } });
  assert.deepEqual(r.w, src.body.w); assert.deepEqual(Object.keys(r.dx), [DX]);
  assert.deepEqual(r.shop.extras, [{ id: "e1", text: "Salt" }]); assert.deepEqual(r.shop.stores, [{ id: "st-lidl", name: "Lidl" }]); assert.equal(r.shop.pantry["t-rice"].g, 250);
});
