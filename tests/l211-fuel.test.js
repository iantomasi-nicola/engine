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
  const adjs = () => Object.fromEntries(Object.entries(S.days).filter(([, v]) => v.adj).sort(([a], [b]) => a < b ? -1 : 1).map(([d, v]) => [d, v.adj]));
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

/* B3: moving a treat (item, meal or whole day) keeps it a treat and moves its compensation with it; a copy is a plain quick-add that owns no compensation.
   Invariant used below: every key of every day.adj belongs to a cheat item that is still in the plan. */
const ORPH = `const orphans = () => { const ids = new Set(Object.values(S.days).flatMap(d => dayItems(d).filter(([, i]) => i.cheat).map(([, i]) => i.id))); return Object.values(S.days).flatMap(d => Object.keys(d.adj || {})).filter(k => !ids.has(k)); };`;

test("3a. Moving a meal with a treat to another day: still a treat with the same id, compensation re-planned around the new day, nothing orphaned, Undo restores", async () => {
  const page = await start();
  /* treat 1800 kcal at dinner of T = today+2, "after": adj on T (+) and T+1..T+3 (-). Move dinner to N = T+5: the treat is still cheat, adj sits on N and N+1..N+3, T has none; base targets of T..T+3 are back. */
  const r = await page.evaluate(`(() => { ${TREAT("addDays(todayISO(), 2)", "after")} ${ORPH}
    const N = addDays(T, 5), id = treat.id; moveMeal({ date: T, meal: "dinner" }, { date: N, meal: "dinner" }, false);
    const it = getDay(N).meals.dinner[0], adjDays = Object.keys(adjs());
    const out = { cheat: !!it.cheat, sameId: it.id === id, strategy: it.strategy, adjDays, orphans: orphans().length, oldBack: [T, addDays(T, 1), addDays(T, 2), addDays(T, 3)].every(d => targetsFor(d).kcal === base[d]) };
    ACT.undo(); out.undone = JSON.stringify(adjs()) === withTreat.adj && JSON.stringify(tgt()) === withTreat.tgt; out.back = !!getDay(T).meals.dinner; return Object.assign(out, { N, T }); })()`);
  assert.equal(r.cheat, true); assert.equal(r.sameId, true); assert.equal(r.strategy, "after"); assert.equal(r.orphans, 0);
  assert.deepEqual(r.adjDays, [0, 1, 2, 3].map(i => { const d = new Date(r.N + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + i); return d.toISOString().slice(0, 10); }));
  assert.equal(r.oldBack, true); assert.equal(r.undone, true); assert.equal(r.back, true);
  assert.deepEqual(app.errors, []);
});

test("3b. Moving the whole day with a treat (moveDay) and moving the single item (moveItem) keep the treat and its compensation together", async () => {
  const page = await start();
  const r = await page.evaluate(`(() => { ${TREAT("addDays(todayISO(), 2)", "after")} ${ORPH}
    const N = addDays(T, 5), id = treat.id; moveDay(T, N, false);
    const a = [getDay(N).meals.dinner.some(x => x.cheat && x.id === id), orphans().length, getDay(N).adj?.[id] > 0, !getDay(T).adj];
    ACT.undo(); a.push(JSON.stringify(adjs()) === withTreat.adj);
    moveItem({ date: T, meal: "dinner", id }, { date: N, meal: "dinner" }, false);
    a.push(getDay(N).meals.dinner.some(x => x.cheat && x.id === id), orphans().length, getDay(N).adj?.[id] > 0, !getDay(T).adj);
    ACT.undo(); a.push(JSON.stringify(adjs()) === withTreat.adj && JSON.stringify(tgt()) === withTreat.tgt);
    return a; })()`);
  assert.deepEqual(r, [true, 0, true, true, true, true, 0, true, true, true]);
  assert.deepEqual(app.errors, []);
});

test("3c. A copy of a treat (Duplicate, Copy meal) is a plain quick-add with the same calories, owns no compensation and leaves the original untouched", async () => {
  const page = await start();
  const r = await page.evaluate(`(() => { ${TREAT("addDays(todayISO(), 2)", "after")} ${ORPH}
    const id = treat.id, N = addDays(T, 5); moveItem({ date: T, meal: "dinner", id }, { date: T, meal: "dinner" }, true); moveMeal({ date: T, meal: "dinner" }, { date: N, meal: "dinner" }, true);
    const dup = getDay(T).meals.dinner.filter(x => x.id !== id), cp = getDay(N).meals.dinner;
    return { orig: getDay(T).meals.dinner.some(x => x.id === id && x.cheat), dups: dup.map(x => [!!x.cheat, x.m.kcal]), cps: cp.map(x => [!!x.cheat, x.m.kcal]), same: JSON.stringify(adjs()) === withTreat.adj, orphans: orphans().length }; })()`);
  assert.equal(r.orig, true); assert.equal(r.same, true); assert.equal(r.orphans, 0);
  assert.ok(r.dups.length >= 1 && r.dups.every(x => x[0] === false && x[1] === 1800)); assert.ok(r.cps.length >= 1 && r.cps.every(x => x[0] === false && x[1] === 1800));
  assert.deepEqual(app.errors, []);
});

test("4. The week table shows a meal that is off in Settings but holds foods, so the day's total is the sum of what is shown", async () => {
  const page = await start();
  /* rice 100 g (130 kcal in the fixture or whatever it is) in the switched-off snack and chicken in lunch: the row total equals the sum of the meal totals of the row, and the snack column exists */
  await page.evaluate(() => { const T = todayISO(); S.days[T] = { date: T, meals: { snack: [newItem("food", "t-rice", 300)], lunch: [newItem("food", "t-chicken", 100)] } }; DATA_V++;
    S.settings.meals.find(m => m.id === "snack").on = false; saveSettings(); UI.date = T; UI.tab = UI.fuelTab = "plan"; UI.planView = "week"; render(); });
  await page.waitForTimeout(400);
  const r = await page.evaluate(() => { const T = todayISO(), row = document.querySelector(".pw-dr.now"), num = s => +String(s).replace(/[^\d.]/g, "");
    return { cells: [...row.querySelectorAll(".pw-cell")].map(c => c.dataset.meal), head: num(row.querySelector(".pw-kcal b").textContent), sum: [...row.querySelectorAll(".pw-mt b")].reduce((a, b) => a + num(b.textContent), 0), total: Math.round(dayTotals(getDay(T)).kcal), th: [...document.querySelectorAll(".pw-th span")].map(x => x.textContent.trim()) }; });
  assert.ok(r.cells.includes("snack")); assert.equal(r.head, r.total); assert.equal(r.sum, r.total); assert.ok(r.th.some(x => /snack/i.test(x) && /off/i.test(x)), JSON.stringify(r.th));
  assert.deepEqual(app.errors, []);
});

test("5. Changing the amount of an item eaten more than 3 days ago leaves the pantry alone and keeps what it took, so un-eating gives back once", async () => {
  const page = await start();
  /* rice 500 g at home; an item eaten 5 days ago took 100 g (took {rice:100}). Edit 100 -> 50: stock stays 500, took stays 100 (it is what was taken then). Un-eat: +100 -> 600, once. */
  const r = await page.evaluate(`(() => { const T = todayISO(), P = addDays(T, -5), out = {};
    S.shop.pantry["t-rice"] = { g: 500 }; const it = { ...newItem("food", "t-rice", 100), eaten: true, took: { "t-rice": 100 } }; S.days[P] = { date: P, meals: { lunch: [it] } }; DATA_V++;
    openSheet("qty", { kind: "food", ref: "t-rice", qty: 50, date: P, meal: "lunch", origMeal: "lunch", itemId: it.id }); ACT["qty-save"]();
    out.g1 = S.shop.pantry["t-rice"].g; out.took = JSON.stringify(getDay(P).meals.lunch[0].took); out.qty = getDay(P).meals.lunch[0].qty;
    UI.date = P; ACT["toggle-eaten"]({ dataset: { meal: "lunch", id: it.id } }); out.g2 = S.shop.pantry["t-rice"].g; return out; })()`);
  assert.deepEqual(r, { g1: 500, took: '{"t-rice":100}', qty: 50, g2: 600 });
  /* a recent day still follows the new amount: eaten today 100 g (took 100, stock 400 after), edit to 60 -> stock 440, took 60 */
  const q = await page.evaluate(`(() => { const T = todayISO(); S.shop.pantry["t-rice"] = { g: 500 }; const it = newItem("food", "t-rice", 100); S.days[T] = { date: T, meals: { lunch: [it] } }; DATA_V++; UI.date = T;
    ACT["toggle-eaten"]({ dataset: { meal: "lunch", id: it.id } }); const a = S.shop.pantry["t-rice"].g;
    openSheet("qty", { kind: "food", ref: "t-rice", qty: 100, date: T, meal: "lunch", origMeal: "lunch", itemId: it.id }); $("#qty-in").value = "60"; ACT["qty-save"]();
    return [a, S.shop.pantry["t-rice"].g, JSON.stringify(getDay(T).meals.lunch[0].took)]; })()`);
  assert.deepEqual(q, [400, 440, '{"t-rice":60}']);
  assert.deepEqual(app.errors, []);
});
