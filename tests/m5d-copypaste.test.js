/* M5d / L188: Copy and Paste as two visible buttons on every meal and every day (planner week and day view); Paste is enabled only for the right kind of clipboard; one Undo. Synthetic data only. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let dir, app;
test.before(async () => { dir = H.build(H.tmp("m5d-build")); });
test.afterEach(async () => { await app?.close(); app = null; });
const start = async (vp = H.VIEWPORTS.desktop) => { app = await H.startApp({ dir, seed: F.seed({ withPlan: false, withPantry: true }), viewport: vp }); return app.page; };
const WEEK = `const T = todayISO(), W = addDays(weekStartOf(T), 3), V = addDays(weekStartOf(T), 4); S.days[W] = { date: W, meals: { lunch: [newItem("food","t-rice",100), newItem("food","t-oil",5)] }, dish: { lunch: "Rice day" } }; S.days[V] = { date: V, meals: {} }; DATA_V++;
  UI.tab = "plan"; UI.fuelTab = "plan"; UI.planView = "week"; UI.date = W; render();`;
test("week table: every meal and every day has Copy and Paste buttons, Paste enabled only for the right kind, and one Undo", async () => {
  const page = await start();
  await page.evaluate(`(() => { ${WEEK} })()`);
  const [W, V] = await page.evaluate(`[addDays(weekStartOf(todayISO()), 3), addDays(weekStartOf(todayISO()), 4)]`);
  const q = (a, d, m) => `[data-act="${a}"][data-date="${d}"]${m ? `[data-meal="${m}"]` : ""}`;
  await page.waitForSelector(q("meal-copy", W, "lunch"));
  assert.equal(await page.locator(q("meal-paste", V, "lunch")).isDisabled(), true, "nothing copied: Paste is off");
  assert.equal(await page.locator(q("day-paste", V)).isDisabled(), true);
  await page.click(q("meal-copy", W, "lunch"));
  assert.equal(await page.locator(q("meal-paste", V, "lunch")).isDisabled(), false, "a meal is in the clipboard");
  assert.equal(await page.locator(q("day-paste", V)).isDisabled(), true, "a meal does not paste on a day");
  await page.click(q("meal-paste", V, "dinner"));
  assert.deepEqual(await page.evaluate(v => [getDay(v).meals.dinner.map(x => x.qty), getDay(v).dish?.dinner], V), [[100, 5], "Rice day"]);
  await page.evaluate(() => ACT.undo());
  assert.equal(await page.evaluate(v => (getDay(v).meals.dinner || []).length, V), 0);
  await page.click(q("day-copy", W));
  assert.equal(await page.locator(q("meal-paste", V, "lunch")).isDisabled(), true, "a day does not paste on one meal");
  await page.click(q("day-paste", V));
  assert.deepEqual(await page.evaluate(v => getDay(v).meals.lunch.map(x => x.qty), V), [100, 5]);
  assert.deepEqual(app.errors, []);
});

test("day view: each meal card has Copy and Paste buttons and the day header has the same pair", async () => {
  const page = await start();
  const r = await page.evaluate(async () => { const T = todayISO(), N = addDays(T, 1); S.days[T] = { date: T, meals: { lunch: [newItem("food", "t-rice", 100)] } }; S.days[N] = { date: N, meals: {} }; DATA_V++; UI.tab = "plan"; UI.fuelTab = "plan"; UI.planView = "day"; UI.date = T; render(); await new Promise(x => setTimeout(x, 200));
    const out = [document.querySelector('.meal[data-meal-drop="lunch"] [data-act="meal-copy"]').disabled];
    document.querySelector('.meal[data-meal-drop="lunch"] [data-act="meal-copy"]').click(); UI.date = N; render(); await new Promise(x => setTimeout(x, 200));
    const p = document.querySelector('.meal[data-meal-drop="lunch"] [data-act="meal-paste"]'); out.push(p.disabled, document.querySelector('[data-act="day-paste"]').disabled);
    p.click(); out.push(getDay(N).meals.lunch.map(x => x.qty).join()); return out; });
  assert.deepEqual(r, [false, false, true, "100"]);
  assert.deepEqual(app.errors, []);
});
