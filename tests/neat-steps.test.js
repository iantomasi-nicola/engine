/* M7a2/P2 (formula approved by the user on 24/10): the NEAT of a day with steps = what the steps cost + a base learned from your own days with watch figure and steps.
   Independent numbers: net walking cost 0.5 kcal per kg per km, stride 0.415 x height (ACSM walking; see docs/AEE_ENGINE_PROPOSAL.md). Synthetic data only. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let dir, app;
test.before(async () => { dir = H.build(H.tmp("neat-build")); });
test.afterEach(async () => { await app?.close(); app = null; });
const start = async () => { app = await H.startApp({ dir, seed: F.seed({ withPlan: false }) }); return app.page; };
const KG = 80, HEIGHT = 180;                                                    // the synthetic profile
const stepCost = steps => 0.5 * KG * (steps * 0.415 * HEIGHT / 100 / 1000);    // kcal, computed here without the app's code
/* 20 days with a typed watch figure and steps (watch = steps cost + 300: the learned base must come out at 300), then the days under test */
const seed = (page, nTyped = 20) => page.evaluate(([n, kg]) => {
  const t = todayISO(); for (let i = 40; i > 40 - n; i--) { const d = addDays(t, -i), steps = 5000 + (i * 997) % 7000; const cost = 0.5 * kg * (steps * 0.415 * 180 / 100 / 1000);
    mutateLog(d, x => { x.weight = kg; x.steps = steps; x.watch = Math.round((cost + 300) * 100) / 100; }); }
  for (let i = 40 - n; i >= 1; i--) mutateLog(addDays(t, -i), x => { x.weight = kg; });
}, [nTyped, KG]);
const neatOf = (page, ago) => page.evaluate(a => { const r = energyAt(addDays(todayISO(), -a)); return { neat: r.neat, src: r.neatSrc }; }, ago);

test("a day with steps and no watch figure: NEAT = cost of the steps + the learned base (300)", async () => {
  const page = await start(); await seed(page);
  await page.evaluate(() => mutateLog(addDays(todayISO(), -5), x => { x.steps = 2000; }));
  const r = await neatOf(page, 5);
  assert.equal(r.src, "steps");
  assert.ok(Math.abs(r.neat - (stepCost(2000) + 300)) < 0.6, `${r.neat} vs ${stepCost(2000) + 300}`);
  await page.evaluate(() => mutateLog(addDays(todayISO(), -4), x => { x.steps = 14000; }));
  const hi = await neatOf(page, 4);
  assert.ok(Math.abs(hi.neat - (stepCost(14000) + 300)) < 0.6);
  assert.ok(hi.neat - r.neat > 300, "a stay-at-home day and a busy day are told apart (the 7-day average would not)");
});

test("the typed watch figure still wins on its own day", async () => {
  const page = await start(); await seed(page);
  await page.evaluate(() => mutateLog(addDays(todayISO(), -3), x => { x.steps = 2000; x.watch = 777; }));
  assert.deepEqual(await neatOf(page, 3), { neat: 777, src: "watch" });
});

test("without enough days to learn the base (fewer than 14) nothing changes: the 7-day average stands, as before", async () => {
  const page = await start(); await seed(page, 10);
  await page.evaluate(() => mutateLog(addDays(todayISO(), -5), x => { x.steps = 2000; }));
  const r = await neatOf(page, 5); assert.equal(r.src, "avg");
});

test("a day with no steps, and a day with a run or a walk, keep the current behaviour (average), labelled as an estimate", async () => {
  const page = await start(); await seed(page);
  await page.evaluate(() => { mutateLog(addDays(todayISO(), -5), x => { x.weight = 80; }); mutateLog(addDays(todayISO(), -4), x => { x.steps = 14000; x.workouts = [{ sport: FIT().runSport, min: 40, km: 7 }]; }); });
  assert.equal((await neatOf(page, 5)).src, "avg"); assert.equal((await neatOf(page, 4)).src, "avg");
});

test("the base is learned only from days before the one being computed: later data never changes an earlier day", async () => {
  const page = await start(); await seed(page);
  await page.evaluate(() => mutateLog(addDays(todayISO(), -5), x => { x.steps = 3000; }));
  const before = await neatOf(page, 5);
  await page.evaluate(() => { for (let i = 4; i >= 1; i--) mutateLog(addDays(todayISO(), -i), x => { x.steps = 4000; x.watch = 2500; }); });
  assert.deepEqual(await neatOf(page, 5), before);
});

test("NEAT is never negative and the figure feeds TDEE as before (BMR + NEAT + EAT + TEF)", async () => {
  const page = await start(); await seed(page);
  const r = await page.evaluate(() => { mutateLog(addDays(todayISO(), -5), x => { x.steps = 0.4; }); const e = energyAt(addDays(todayISO(), -5)); return { neat: e.neat, parts: e.bmr + e.neat + e.eat + e.tef, tdeeW: e.tdeeW }; });
  assert.ok(r.neat >= 0); assert.ok(Math.abs(r.parts - r.tdeeW) < 0.01);
});

test("the Check-in and the day's energy say where the NEAT comes from", async () => {
  const page = await start(); await seed(page);
  const r = await page.evaluate(() => { mutateLog(addDays(todayISO(), -5), x => { x.steps = 2000; }); openSheet("checkin", { date: addDays(todayISO(), -5), live: true }); const t = document.querySelector(".sheet").innerText; return { t, src: NEAT_SRC.steps }; });
  assert.match(r.t, /from your [\d,]+ steps/i); assert.doesNotMatch(r.t, /7-day average until/);
});
