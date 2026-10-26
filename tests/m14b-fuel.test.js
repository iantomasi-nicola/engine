/* M14b group D (Fuel): Undo gives the pantry back, every way of removing foods returns the stock of what was eaten, copying a day leaves treats and eaten-out behind,
   habits skip deleted foods, a meal switched off still shows, and the Copy / Paste pair on meals and days (L188). Synthetic data only.
   Hand-computed values: pantry rice 150 g; two rice items of 100 g and 30 g, both eaten, take 130 g -> 20 g left; giving back the 100 g one alone -> 120 g. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let dir, app;
test.before(async () => { dir = H.build(H.tmp("m14b-fuel-build")); });
test.afterEach(async () => { await app?.close(); app = null; });
const start = async (vp = H.VIEWPORTS.desktop) => { app = await H.startApp({ dir, seed: F.seed({ withPlan: false, withPantry: true }), viewport: vp }); return app.page; };
/* today with two rice items (100 g + 30 g) in lunch, none eaten */
const SETUP = `const T = todayISO(); S.days[T] = { date: T, meals: { lunch: [newItem("food","t-rice",100), newItem("food","t-rice",30)] } }; DATA_V++; UI.date = T; const G = () => S.shop.pantry["t-rice"].g;`;

test("Undo of «All eaten» gives the pantry back, and Undo of «Mark all as not eaten» takes it again", async () => {
  const page = await start();
  const r = await page.evaluate(`(() => { ${SETUP}
    const a = [G()]; ACT["all-eaten"](); a.push(G()); ACT.undo(); a.push(G(), getDay(T).meals.lunch.every(x => !x.eaten));
    ACT["all-eaten"](); a.push(G()); ACT["day-menu"](); UI.sheet.items.find(i => i.label === "Mark all as not eaten").run(); a.push(G());
    ACT.undo(); a.push(G(), getDay(T).meals.lunch.every(x => x.eaten && x.took)); return a; })()`);
  assert.deepEqual(r, [150, 20, 150, true, 20, 150, 20, true]);
  assert.deepEqual(app.errors, []);
});

test("Clear the day, Clear a meal and removing one eaten item all give the stock of what was eaten back; Undo takes it again", async () => {
  const page = await start();
  const r = await page.evaluate(`(() => { ${SETUP} ACT["all-eaten"]();
    const a = [G()]; ACT["day-menu"](); UI.sheet.items.find(i => i.label === "Clear the day").run(); a.push(G(), dayItems(getDay(T)).length); ACT.undo(); a.push(G(), dayItems(getDay(T)).length);
    ACT["meal-menu"]({ dataset: { meal: "lunch" } }); UI.sheet.items.find(i => i.label === "Clear lunch").run(); a.push(G()); ACT.undo(); a.push(G());
    removeItems(T, [getDay(T).meals.lunch[0]], { undo: "x" }); a.push(G()); return a; })()`);
  assert.deepEqual(r, [20, 150, 0, 20, 2, 150, 20, 120]);
  assert.deepEqual(app.errors, []);
});

test("copying a day to another day leaves treats and eaten-out entries behind, and the copy is not eaten", async () => {
  const page = await start();
  const r = await page.evaluate(`(() => { ${SETUP} const N = addDays(T, 1);
    S.days[T].meals.dinner = [{ id: "tr", kind: "quick", cheat: true, name: "Treat", m: { kcal: 500, p: 0, c: 0, f: 0 }, eaten: false }, { id: "eo", kind: "quick", cheat: true, out: true, name: "Eaten out", m: { kcal: 900, p: 0, c: 0, f: 0 }, eaten: true }];
    S.days[T].meals.lunch[0].eaten = true; S.days[T].meals.lunch[0].took = { "t-rice": 100 }; DATA_V++;
    openSheet("copy", { scope: "day", targets: [N], mode: "add" }); ACT["cp-run"]();
    const d = getDay(N); return { lunch: d.meals.lunch.map(x => [x.qty, x.eaten, !!x.took]), dinner: (d.meals.dinner || []).length }; })()`);
  assert.deepEqual(r.lunch, [[100, false, false], [30, false, false]]);
  assert.equal(r.dinner, 0);
  assert.deepEqual(app.errors, []);
});

test("«Replace» in Copy this day to… keeps what was eaten on the target day", async () => {
  const page = await start();
  const r = await page.evaluate(`(() => { ${SETUP} const N = addDays(T, 1);
    S.days[N] = { date: N, meals: { lunch: [{ ...newItem("food","t-chicken",50), eaten: true }, newItem("food","t-oil",5)] } }; DATA_V++;
    openSheet("copy", { scope: "day", targets: [N], mode: "replace" }); ACT["cp-run"]();
    return getDay(N).meals.lunch.map(x => x.ref + ":" + x.qty); })()`);
  assert.deepEqual(r, ["t-chicken:50", "t-rice:100", "t-rice:30"]);
});

test("Undo of a treat whose day was changed brings the treat back to its first day", async () => {
  const page = await start();
  const r = await page.evaluate(`(() => { const T = todayISO(), d1 = addDays(T, 1), d2 = addDays(T, 2); S.days[d1] = { date: d1, meals: {} }; DATA_V++;
    openCheat({ date: d1, meal: "dinner" }); UI.sheet.draft.kcal = 100; UI.sheet.draft.strategy = "none"; ACT["ch-save"]();
    const id = getDay(d1).meals.dinner[0].id; openCheat({ date: d1, meal: "dinner", itemId: id }); UI.sheet.date = d2; ACT["ch-save"]();
    const moved = [(getDay(d1).meals.dinner || []).length, getDay(d2).meals.dinner.length]; ACT.undo();
    return { moved, after: [(getDay(d1).meals.dinner || []).length, (getDay(d2).meals.dinner || []).length] }; })()`);
  assert.deepEqual(r.moved, [0, 1]);
  assert.deepEqual(r.after, [1, 0]);
});

test("habits skip foods that no longer exist", async () => {
  const page = await start();
  const r = await page.evaluate(`(() => { const T = todayISO(), old = addDays(T, -7); S.days[old] = { date: old, meals: { lunch: [newItem("food","gone-food",100), newItem("food","t-rice",100)] } }; DATA_V++;
    return habitItems(T, "lunch").map(x => x.ref); })()`);
  assert.deepEqual(r, ["t-rice"]);
});

test("moving an item out of a meal that still has food keeps the dish name", async () => {
  const page = await start();
  const r = await page.evaluate(`(() => { ${SETUP} S.days[T].dish = { lunch: "Monday bowl" }; DATA_V++;
    moveItem({ date: T, meal: "lunch", id: S.days[T].meals.lunch[0].id }, { date: T, meal: "dinner" });
    const a = getDay(T).dish?.lunch; moveItem({ date: T, meal: "lunch", id: S.days[T].meals.lunch[0].id }, { date: T, meal: "dinner" }); return [a, getDay(T).dish?.lunch || null]; })()`);
  assert.deepEqual(r, ["Monday bowl", null]);
});

test("a meal switched off that still holds foods keeps showing in the day, flagged, and the toggle says so", async () => {
  const page = await start();
  const r = await page.evaluate(async () => { const T = todayISO(); S.days[T] = { date: T, meals: { snack: [newItem("food", "t-rice", 100)] } }; DATA_V++; UI.date = T; UI.tab = "plan"; UI.fuelTab = "plan";
    ACT["meal-toggle"]({ dataset: { id: "snack" } }); await new Promise(x => setTimeout(x, 200)); render(); await new Promise(x => setTimeout(x, 200));
    return { toast: document.querySelector("#toast")?.textContent || "", card: !!document.querySelector('.meal[data-meal-drop="snack"]'), add: !!document.querySelector('.add-row[data-meal="snack"]') }; });
  assert.match(r.toast, /Snacks is off: 1 food/);
  assert.equal(r.card, true); assert.equal(r.add, false);
});

test("the planner never takes a day that is already past", async () => {
  const page = await start();
  const r = await page.evaluate(`(() => { UI.date = addDays(todayISO(), -2); return plannerDates({ scope: "day" }).length + "/" + plannerDates({ scope: "week" }).every(d => d >= todayISO()); })()`);
  assert.equal(r, "0/true");
});

test("a tap on a library row of the week planner opens «Add to…» and puts the food in the chosen meal, with one Undo", async () => {
  const page = await start();
  await page.evaluate(async () => { UI.tab = UI.fuelTab = "plan"; UI.planView = "week"; UI.date = todayISO(); UI.pwLib = true; UI.pwSeg = "foods"; UI.pwQ = "Test chicken"; render(); await new Promise(x => setTimeout(x, 300)); });
  await page.click(".pw-lr[data-ref=t-chicken]");
  const t = await page.evaluate(() => { const s = UI.sheet; s.toDate = addDays(weekStartOf(todayISO()), 5); s.toMeal = "dinner"; ACT["pw-lib-go"](); return s.toDate; });
  assert.deepEqual(await page.evaluate(d => getDay(d).meals.dinner.map(x => x.ref), t), ["t-chicken"]);
  await page.evaluate(() => ACT.undo());
  assert.equal(await page.evaluate(d => (getDay(d).meals.dinner || []).length, t), 0);
  assert.deepEqual(app.errors, []);
});
