/* L205 (owner decision 26/10): planning a treat on a meal that already has foods ADDS the treat and asks whether to keep or remove the foods planned in that meal
   (two buttons, one Undo after the choice). Eaten foods and treats already in the meal are never touched. Synthetic data only.
   Fixture by hand: dinner of day T = [rice 100 g (planned), oil 5 g (planned), chicken 150 g (eaten)]; treat 800 kcal, strategy "none". */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let dir, app;
test.before(async () => { dir = H.build(H.tmp("l205-build")); });
test.afterEach(async () => { await app?.close(); app = null; });
const start = async (vp = H.VIEWPORTS.phone) => { app = await H.startApp({ dir, seed: F.seed({ withPlan: false }), viewport: vp }); return app.page; };
const SETUP = `(() => { const T = todayISO(); S.days[T] = { date: T, meals: { dinner: [newItem("food","t-rice",100), newItem("food","t-oil",5), newItem("food","t-chicken",150,{eaten:true})] }, dish: { dinner: "Rice night" } }; DATA_V++;
  UI.tab = "plan"; UI.fuelTab = "plan"; UI.planView = "day"; UI.date = T; render();
  openCheat({ date: T, meal: "dinner" }); Object.assign(UI.sheet.draft, { name: "Pizza", kcal: 800, p: 30, c: 90, f: 30, strategy: "none", auto: false }); return T; })()`;
const names = `(() => (getDay(todayISO()).meals.dinner || []).map(x => x.cheat ? "treat" : x.eaten ? "eaten:" + x.ref : x.ref).sort().join())()`;

test("a meal with planned foods: saving the treat asks first and changes nothing yet", async () => {
  const page = await start();
  await page.evaluate(SETUP);
  await page.evaluate(() => ACT["ch-save"]());
  assert.equal(await page.evaluate(names), "eaten:t-chicken,t-oil,t-rice", "nothing was removed or added before the answer");
  assert.equal(await page.locator('[data-act="ch-keep"]').count(), 2, "two buttons: keep / remove");
  assert.match(await page.locator(".sheet").innerText(), /2 foods/i);
  assert.equal(await page.evaluate(() => !!UI.sheet), true, "the sheet stays open");
  assert.deepEqual(app.errors, []);
});
test("Keep: the treat is added next to the foods; one Undo brings back the meal as it was", async () => {
  const page = await start();
  await page.evaluate(SETUP);
  await page.evaluate(() => ACT["ch-save"]());
  await page.click('[data-act="ch-keep"][data-v="1"]');
  assert.equal(await page.evaluate(names), "eaten:t-chicken,t-oil,t-rice,treat");
  assert.equal(await page.evaluate(() => getDay(todayISO()).dish?.dinner), "Rice night", "the dish name stays when the foods stay");
  assert.equal(await page.evaluate(() => !UI.sheet), true);
  await page.evaluate(() => ACT.undo());
  assert.equal(await page.evaluate(names), "eaten:t-chicken,t-oil,t-rice");
  assert.deepEqual(app.errors, []);
});
test("Remove: the planned foods go, the eaten one stays; Undo brings them back", async () => {
  const page = await start();
  await page.evaluate(SETUP);
  await page.evaluate(() => ACT["ch-save"]());
  await page.click('[data-act="ch-keep"][data-v="0"]');
  assert.equal(await page.evaluate(names), "eaten:t-chicken,treat");
  await page.evaluate(() => ACT.undo());
  assert.equal(await page.evaluate(names), "eaten:t-chicken,t-oil,t-rice");
  assert.deepEqual(app.errors, []);
});
test("no question when the meal has no planned foods (empty, or only eaten foods) and when editing a treat", async () => {
  const page = await start();
  const r = await page.evaluate(() => { const T = todayISO(); S.days[T] = { date: T, meals: { dinner: [newItem("food", "t-chicken", 150, { eaten: true })] } }; DATA_V++;
    openCheat({ date: T, meal: "dinner" }); Object.assign(UI.sheet.draft, { name: "Gelato", kcal: 300, p: 5, c: 40, f: 10, strategy: "none", auto: false }); ACT["ch-save"]();
    const out = [!UI.sheet, (getDay(T).meals.dinner || []).length];
    const id = getDay(T).meals.dinner.find(x => x.cheat).id; mutateDay(T, x => { x.meals.dinner.push(newItem("food", "t-rice", 100)); });
    openCheat({ date: T, meal: "dinner", itemId: id }); UI.sheet.draft.name = "Gelato 2"; ACT["ch-save"](); out.push(!UI.sheet, getDay(T).meals.dinner.length);
    return out; });
  assert.deepEqual(r, [true, 2, true, 3], "both saved straight away, nothing removed");
  assert.deepEqual(app.errors, []);
});
test("«Eaten out» (logged as eaten, L91) keeps its old behaviour: no question, the planned foods of that meal go", async () => {
  const page = await start();
  await page.evaluate(SETUP);
  await page.evaluate(() => { UI.sheet.out = true; ACT["ch-save"](); });
  assert.equal(await page.evaluate(names), "eaten:t-chicken,treat");
  assert.deepEqual(app.errors, []);
});
test("the question also holds at 820 and 1440 (the buttons are visible and inside the sheet)", async () => {
  for (const vp of [H.VIEWPORTS.tablet, H.VIEWPORTS.desktop]) {
    const page = await start(vp);
    await page.evaluate(SETUP); await page.evaluate(() => ACT["ch-save"]());
    const b = await page.locator('[data-act="ch-keep"]').evaluateAll(els => els.map(e => { const r = e.getBoundingClientRect(), s = e.closest(".sheet").getBoundingClientRect(); return r.width > 40 && r.left >= s.left && r.right <= s.right && r.bottom <= innerHeight; }));
    assert.deepEqual(b, [true, true]);
    await app.close(); app = null;
  }
});
