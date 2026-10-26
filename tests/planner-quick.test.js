/* Planner quick actions (owner's request 27/10): a recipe dragged from the library puts its ingredients in the meal (scaled by the servings), and the amount you
   last put a food in the plan with becomes the amount it is offered with next time. Synthetic data only. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let dir, app;
test.before(async () => { dir = H.build(H.tmp("pq-build")); });
test.afterEach(async () => { await app?.close(); app = null; });
const start = async () => { app = await H.startApp({ dir, seed: F.seed({ withPlan: false }), viewport: H.VIEWPORTS.desktop }); return app.page; };

test("dropping a recipe from the library puts its ingredients in the meal, scaled by the servings, with one undo", async () => {
  const page = await start();
  const r = await page.evaluate(() => { const t = addDays(weekStartOf(todayISO()), 3); S.days[t] = { date: t, meals: {} }; DATA_V++;
    const ok = dropLib({ t: "recipe", ref: "t-bowl", qty: 1 }, t, "lunch"), its = S.days[t].meals.lunch.map(x => [x.kind, x.ref, x.qty]);
    toast.undo(); const after = (getDay(t).meals.lunch || []).length;
    dropLib({ t: "recipe", ref: "t-bowl", qty: 2 }, t, "dinner"); const big = getDay(t).meals.dinner.map(x => [x.kind, x.ref, x.qty]);
    return { ok, its, after, big }; });
  assert.equal(r.ok, true);
  assert.deepEqual(r.its, [["food", "t-rice", 100], ["food", "t-chicken", 150], ["food", "t-oil", 5]]);   // 1 of 2 servings of 200 / 300 / 10 g
  assert.equal(r.after, 0, "one undo takes all the ingredients out");
  assert.deepEqual(r.big, [["food", "t-rice", 200], ["food", "t-chicken", 300], ["food", "t-oil", 10]]);
  assert.deepEqual(app.errors, []);
});

test("the dose a food was put in the plan with is remembered and offered next time (library, quick add, add sheet)", async () => {
  const page = await start();
  const r = await page.evaluate(() => { const t = addDays(weekStartOf(todayISO()), 2); S.days[t] = { date: t, meals: {} }; DATA_V++;
    const f = getFood("t-rice"), first = planQty(f);
    dropLib({ t: "food", ref: "t-rice", qty: 75 }, t, "snack");
    const after = planQty(f), lib = (UI.pwSeg = "foods", UI.pwQ = "Test rice", pwLibList().find(o => o.x.id === "t-rice")?.qty), saved = S.settings.doses["t-rice"];
    openSheet("qty", { kind: "food", ref: "t-chicken", qty: planQty(getFood("t-chicken")), date: t, meal: "lunch" }); $("#qty-in").value = "180"; ACT["qty-save"]();
    return { first, after, lib, saved, chicken: planQty(getFood("t-chicken")) }; });
  assert.equal(r.first, 100); assert.equal(r.after, 75); assert.equal(r.lib, 75); assert.equal(r.saved, 75); assert.equal(r.chicken, 180);
  assert.deepEqual(app.errors, []);
});

test("a real mouse drag of a recipe from the library onto a meal cell adds its ingredients (the drop used to be refused by the browser)", async () => {
  const page = await start();
  await page.evaluate(async () => { UI.tab = UI.fuelTab = "plan"; UI.planView = "week"; UI.date = todayISO(); UI.pwLib = true; UI.pwSeg = "recipes"; UI.pwQ = "Test bowl"; render(); await new Promise(x => setTimeout(x, 300)); });
  const t = await page.evaluate(() => addDays(weekStartOf(todayISO()), 4));
  await page.dragAndDrop(".pw-lr[data-ref=t-bowl]", `.pw-cell[data-date="${t}"][data-meal="lunch"]`);
  const got = await page.evaluate(d => (getDay(d).meals.lunch || []).map(x => [x.kind, x.ref, x.qty]), t);
  assert.deepEqual(got, [["food", "t-rice", 100], ["food", "t-chicken", 150], ["food", "t-oil", 5]]);
  const edit = await page.evaluate(d => { const it = getDay(d).meals.lunch[0]; openSheet("qty", { kind: "food", ref: it.ref, qty: it.qty, date: d, meal: "lunch", itemId: it.id, origMeal: "lunch" }); $("#qty-in").value = "5"; ACT["qty-save"](); return planQty(getFood("t-rice")); }, t);
  assert.equal(edit, 100, "editing an existing item does not change the remembered dose");
  assert.deepEqual(app.errors, []);
});

test("PC: a sidebar button and the W key open the weekly meal plan in one step; neither exists on a phone", async () => {
  const page = await start();
  const r = await page.evaluate(async () => { UI.tab = "today"; UI.planView = "day"; render(); await new Promise(x => setTimeout(x, 150));
    const has = !!document.querySelector('#side [data-act="go-week-plan"]'), before = document.querySelector('#side [aria-current=page]')?.innerText.trim();
    document.querySelector('#side [data-act="go-week-plan"]').click(); await new Promise(x => setTimeout(x, 250));
    const a = { tab: UI.tab, view: UI.planView, on: document.querySelector('#side [data-act="go-week-plan"]').getAttribute("aria-current"), fuelOn: !!document.querySelector('#side [data-tab="plan"][aria-current]'), grid: !!document.querySelector(".pw-mn") };
    UI.tab = "today"; UI.planView = "day"; render(); await new Promise(x => setTimeout(x, 150));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "w", bubbles: true })); await new Promise(x => setTimeout(x, 250));
    return { has, before, a, key: [UI.tab, UI.planView] }; });
  assert.equal(r.has, true); assert.equal(r.before, "Today");
  assert.deepEqual(r.a, { tab: "plan", view: "week", on: "page", fuelOn: false, grid: true }); assert.deepEqual(r.key, ["plan", "week"]);
  await app.close(); app = await H.startApp({ dir, seed: F.seed({ withPlan: false }), viewport: H.VIEWPORTS.phone });
  assert.equal(await app.page.evaluate(() => !!document.querySelector('[data-act="go-week-plan"]')), false);
  assert.deepEqual(app.errors, []);
});
