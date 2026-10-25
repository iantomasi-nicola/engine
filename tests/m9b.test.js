/* M9b (L19): Race plan. racePlan is a pure function; expected values computed by hand. Synthetic data only. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let dir, app;
test.before(async () => { dir = H.build(H.tmp("m9b-build")); });
test.afterEach(async () => { await app?.close(); app = null; });

/* by hand, 70 kg:
   10 km in 50:00 (3000 s): dur 50 min < 60 -> no fuelling; carbs the 2 days before 5-7 g/kg = 350-490 g; breakfast 1-2 g/kg = 70-140 g;
     average pace 300 s/km, start 3-5 s/km slower = 303-305 s/km; post: protein 0.25-0.4 g/kg = 17.5->18 .. 28 g, carbs 0.5-1.0 g/kg = 35-70 g; 2 easy days; taper from 40 km a week: 20-30% less = 28-32 km.
   Half (21.0975 km) in 1:45:00 (6300 s): dur 105 min -> 30-60 g/h; carbs 90+ min -> 7-10 g/kg = 490-700 g; post carbs 1.0-1.2 g/kg = 70-84 g; 3 easy days; taper from 50 km: 40-50% less = 25-30 km.
   Marathon (42.195 km) in 3:45:00 (13500 s): dur 225 min > 150 -> 60-90 g/h, never 120. */
const P = o => ({ km: 10, sport: "Running", sec: 3000, kg: 70, weekKm: 40, ...o });

test("racePlan: 10 km in 50 minutes needs no fuelling during the race", () => {
  const r = app_racePlan(P({}));
  assert.equal(r.fuel.need, false); assert.equal(r.fuel.hi, 0);
  assert.deepEqual(r.pre.carbs.gkg, [5, 7]); assert.deepEqual(r.pre.carbs.g, [350, 490]);
  assert.deepEqual(r.day.breakfast.g, [70, 140]);
  assert.deepEqual(r.day.start.secKm, [303, 305]);
  assert.deepEqual(r.post.protein.g, [18, 28]); assert.deepEqual(r.post.carbs.g, [35, 70]);
  assert.equal(r.post.easyDays, 2); assert.deepEqual(r.pre.taper.km, [28, 32]);
});
test("racePlan: half marathon in 1:45 -> 30-60 g/h", () => {
  const r = app_racePlan(P({ km: 21.0975, sec: 6300, weekKm: 50 }));
  assert.deepEqual([r.fuel.lo, r.fuel.hi], [30, 60]); assert.deepEqual(r.pre.carbs.g, [490, 700]);
  assert.deepEqual(r.post.carbs.g, [70, 84]); assert.equal(r.post.easyDays, 3); assert.deepEqual(r.pre.taper.km, [25, 30]);
});
test("racePlan: marathon in 3:45 -> 60-90 g/h, never 120; no duration -> no numbers invented", () => {
  const r = app_racePlan(P({ km: 42.195, sec: 13500 }));
  assert.deepEqual([r.fuel.lo, r.fuel.hi], [60, 90]);
  for (const sec of [600, 3000, 6300, 13500, 40000]) assert.ok(app_racePlan(P({ sec })).fuel.hi <= 90);
  const n = app_racePlan(P({ sec: null, kg: null, weekKm: 0 }));
  assert.equal(n.fuel, null); assert.equal(n.pre.carbs.g, null); assert.equal(n.pre.taper, null);
});

let fn;
function app_racePlan(o) { return fn(o); }
test.before(async () => {
  const a = await H.startApp({ dir, seed: F.seed(), viewport: H.VIEWPORTS.phone });
  const src = await a.page.evaluate(() => racePlan.toString()); await a.close();
  fn = new Function(`${src}; return racePlan;`)();
});

test("Season › Races: a closed «Race plan» section per upcoming race, PRE / DAY / POST inside, no errors; past race: POST only for 7 days", async () => {
  const seed = F.seed();
  app = await H.startApp({ dir, seed, viewport: H.VIEWPORTS.phone });
  const r = await app.page.evaluate(() => { const t = todayISO();
    S.train.races = [{ id: "r1", name: "Test 10k", date: addDays(t, 10), sport: FIT().runSport, km: 10, pri: "A" }, { id: "r2", name: "Old half", date: addDays(t, -3), sport: FIT().runSport, km: 21.0975, pri: "B" }, { id: "r3", name: "Ancient", date: addDays(t, -30), sport: FIT().runSport, km: 10, pri: "B" }];
    UI.tab = "train"; UI.trainSeg = "season"; UI.fold = {}; render();
    const closed = [...document.querySelectorAll(".rec-h")].map(e => e.textContent).filter(x => /Race plan/.test(x));
    UI.fold = { raceplan: { [`Race plan · Test 10k · ${fmtDM(addDays(t, 10))}`]: true, [`Race plan · Old half · ${fmtDM(addDays(t, -3))}`]: true } }; render();
    const txt = [...document.querySelectorAll(".rec-b")].map(e => e.textContent).join("|");
    return { closed, txt }; });
  assert.equal(r.closed.length, 2, "two sections (the 30-days-old race has none)");
  assert.ok(/Test 10k/.test(r.closed.join()) && /Old half/.test(r.closed.join()) && !/Ancient/.test(r.closed.join()));
  assert.ok(/Before/.test(r.txt) && /Race day/.test(r.txt) && /After/.test(r.txt));
  assert.ok(!/120 g/.test(r.txt));
  assert.deepEqual(app.errors, []);
});
