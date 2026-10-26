/* L211 / audit B (Fuel + Shopping + Foods): one test per defect. Synthetic data only; the numbers are worked out in the comment of each test. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let dir, app;
test.before(async () => { dir = H.build(H.tmp("l211-fuel-build")); });
test.afterEach(async () => { await app?.close(); app = null; });
const start = async (o = { withPlan: false, withPantry: true }, vp = H.VIEWPORTS.desktop) => { app = await H.startApp({ dir, seed: F.seed(o), viewport: vp }); return app.page; };

/* B2: the compensation of a treat (day.adj) belongs to the treat: when the treat leaves the plan, the compensation leaves every day it sat on. */
const TREAT = (center, strat) => `
  const T = ${center}; const days = []; for (let i = -1; i <= 8; i++) { const d = addDays(T, i); days.push(d); S.days[d] = { date: d, meals: { lunch: [newItem("food", "t-rice", 100)] } }; } DATA_V++;
  const base = Object.fromEntries(days.map(d => [d, targetsFor(d).kcal]));
  openCheat({ date: T, meal: "dinner" }); UI.sheet.draft.kcal = 1800; UI.sheet.draft.strategy = "${strat}"; ACT["ch-save"]();
  const adjs = () => Object.fromEntries(Object.entries(S.days).filter(([, v]) => v.adj).map(([d, v]) => [d, v.adj]));
  const tgt = () => Object.fromEntries(days.map(d => [d, targetsFor(d).kcal]));
  const withTreat = { adj: JSON.stringify(adjs()), tgt: JSON.stringify(tgt()) };
  const treat = getDay(T).meals.dinner.find(x => x.cheat);`;

test("2a. Clear the day removes the compensation of its treat from every day, and Undo brings it all back", async () => {
  const page = await start();
  /* a 1800 kcal dinner "paid back after": the day itself is raised (+) and the next 3 days lowered (-), all under the treat's id.
     Clear the day: no day keeps an adj and every target is the base one again. Undo: the same adj and targets as with the treat. */
  const r = await page.evaluate(`(() => { ${TREAT("addDays(todayISO(), 2)", "after")}
    const n = Object.keys(adjs()).length; ACT["day-menu"](); UI.sheet.items.find(i => i.label === "Clear the day").run();
    const cleared = { adj: Object.keys(adjs()).length, same: JSON.stringify(tgt()) === JSON.stringify(base) };
    ACT.undo(); return { n, cleared, back: JSON.stringify(adjs()) === withTreat.adj && JSON.stringify(tgt()) === withTreat.tgt, T, treat: !!getDay(T).meals.dinner }; })()`);
  assert.equal(r.n, 4); assert.deepEqual(r.cleared, { adj: 0, same: true }); assert.equal(r.back, true); assert.equal(r.treat, true);
  assert.deepEqual(app.errors, []);
});

test("2b. Clear the meal and removing the treat alone behave the same way (and Undo restores the compensated days)", async () => {
  const page = await start();
  const r = await page.evaluate(`(() => { ${TREAT("addDays(todayISO(), 2)", "after")}
    ACT["meal-menu"]({ dataset: { meal: "dinner" } }); UI.sheet.items.find(i => i.label === "Clear dinner").run();
    const a = [Object.keys(adjs()).length, JSON.stringify(tgt()) === JSON.stringify(base)]; ACT.undo(); a.push(JSON.stringify(adjs()) === withTreat.adj);
    removeItems(T, [getDay(T).meals.dinner.find(x => x.cheat)], { undo: "Removed" }); a.push(Object.keys(adjs()).length, JSON.stringify(tgt()) === JSON.stringify(base)); ACT.undo(); a.push(JSON.stringify(adjs()) === withTreat.adj && JSON.stringify(tgt()) === withTreat.tgt);
    return a; })()`);
  assert.deepEqual(r, [0, true, true, 0, true, true]);
  assert.deepEqual(app.errors, []);
});

test("2c. Clear the week: a treat on the last day compensates days of the next week, which are cleaned too and come back with Undo", async () => {
  const page = await start();
  const r = await page.evaluate(`(() => { ${TREAT("addDays(weekStartOf(todayISO()), 6)", "after")}
    const next = addDays(T, 1); const had = !!S.days[next].adj;
    ACT["pw-clear-week"](); UI.sheet.run();
    const a = [had, Object.keys(adjs()).length, targetsFor(next).kcal === base[next]]; ACT.undo(); a.push(JSON.stringify(adjs()) === withTreat.adj, targetsFor(next).kcal === JSON.parse(withTreat.tgt)[next]);
    return a; })()`);
  assert.deepEqual(r, [true, 0, true, true, true]);
  assert.deepEqual(app.errors, []);
});
