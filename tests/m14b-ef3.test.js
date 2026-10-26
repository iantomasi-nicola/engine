/* M14b group F, second round: editor clamps, recipe validation, Esc in a Food sheet opened from a recipe, Foods list beyond 200 rows,
   records without per / ingredients. Synthetic data only. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let dir, app;
test.before(async () => { dir = H.build(H.tmp("m14b-ef3-build")); });
test.afterEach(async () => { await app?.close(); app = null; });
const start = async (seed = F.seed({ withPlan: false }), vp = H.VIEWPORTS.desktop) => { app = await H.startApp({ dir, seed, viewport: vp }); return app.page; };
const newFood = (per, extra = {}) => { ACT["new-food"]({ dataset: {} }); Object.assign(UI.sheet.draft, { name: "Probe", ...extra }); Object.assign(UI.sheet.draft.per, per); ACT["fd-save-only"](); return Object.values(S.foods).find(f => f.name === "Probe") || null; };

test("the food editor never saves negative numbers: kcal, protein and pack are at least 0", async () => {
  const page = await start();
  const r = await page.evaluate(`(${newFood})({ kcal: -100, p: -5, c: 10, f: 2 }, { pack: -50 })`);
  assert.ok(r); assert.equal(r.per.p, 0); assert.ok(r.per.kcal >= 0); assert.equal(r.pack, 0); assert.equal(r.per.c, 10);
});

test("the food editor refuses a number with letters («12abc») instead of guessing", async () => {
  const page = await start();
  const r = await page.evaluate(`(${newFood})({ kcal: 100, p: "12abc", c: 10, f: 2 })`);
  assert.equal(r, null);
});

test("a recipe whose ingredients all have 0 g is not saved, and neither is one with servings 0 or less", async () => {
  const page = await start();
  const r = await page.evaluate(() => {
    ACT["new-recipe"](); Object.assign(UI.sheet.draft, { name: "Empty bowl", servings: 2 }); UI.sheet.draft.ingredients.push({ food: "t-rice", g: 0 }, { food: "t-oil", g: "" }); ACT["rc-save"]({ dataset: {} });
    const a = Object.values(S.recipes).some(x => x.name === "Empty bowl");
    UI.sheet.draft.ingredients = [{ food: "t-rice", g: 100 }]; UI.sheet.draft.servings = "-3"; ACT["rc-save"]({ dataset: {} });
    const b = Object.values(S.recipes).some(x => x.name === "Empty bowl"); UI.sheet.draft.servings = 2; ACT["rc-save"]({ dataset: {} });
    return { a, b, c: Object.values(S.recipes).find(x => x.name === "Empty bowl")?.ingredients.length };
  });
  assert.deepEqual(r, { a: false, b: false, c: 1 });
});

test("Esc in the Food sheet opened from a recipe returns to the recipe and keeps the draft", async () => {
  const page = await start();
  await page.evaluate(() => { ACT["new-recipe"](); Object.assign(UI.sheet.draft, { name: "Keep me" }); UI.sheet.draft.ingredients.push({ food: "t-rice", g: 100 }); ACT["rc-new-food"](); });
  await page.keyboard.press("Escape"); await page.waitForTimeout(150);
  const r = await page.evaluate(() => ({ type: UI.sheet?.type, name: UI.sheet?.draft?.name, n: UI.sheet?.draft?.ingredients?.length }));
  assert.deepEqual(r, { type: "recipe", name: "Keep me", n: 1 });
});

test("the Foods list shows the first 200 rows and a button for more", async () => {
  const seed = F.seed({ withPlan: false });
  for (let i = 0; i < 250; i++) seed.foods["zz-" + i] = { id: "zz-" + i, name: "Zed food " + String(i).padStart(3, "0"), brand: "", unit: "g", per: { kcal: 100, p: 5, c: 10, f: 2, fib: 0 }, servings: [], pack: 0, cat: "pantry", role: "C", meals: ["m"], source: "custom" };
  const page = await start(seed);
  const r = await page.evaluate(async () => { UI.tab = "foods"; UI.fuelTab = "foods"; UI.foodsSeg = "mine"; DATA_V++; render(); await new Promise(x => setTimeout(x, 150));
    const rows = () => document.querySelectorAll('[data-act="edit-food"]').length, a = rows(), btn = document.querySelector('[data-act="foods-more"]'); btn.click(); await new Promise(x => setTimeout(x, 150)); return { a, b: rows(), still: !!document.querySelector('[data-act="foods-more"]') }; });
  assert.ok(r.a === 200 && r.b >= 250 && !r.still, JSON.stringify(r));
});

test("a food without per or a recipe without ingredients does not break Foods, Add or the recipe editor", async () => {
  const seed = F.seed({ withPlan: false }); seed.foods.bad = { id: "bad", name: "No per" }; seed.foods.bad2 = { id: "bad2", name: "Text per", per: { kcal: "5,5", p: "x" } }; seed.recipes.bad = { id: "bad", name: "No ingredients" };
  const page = await start(seed);
  const r = await page.evaluate(async () => { UI.tab = "foods"; UI.fuelTab = "foods"; UI.foodsSeg = "all"; DATA_V++; render(); await new Promise(x => setTimeout(x, 150)); const rows = document.querySelectorAll('[data-act="edit-food"],[data-act="edit-recipe"]').length; ACT["edit-recipe"]({ dataset: { id: "bad" } }); await new Promise(x => setTimeout(x, 100));
    return { rows, kcal: getFood("bad2").per.kcal, per: typeof getFood("bad").per.kcal, sheet: UI.sheet?.type, txt: document.querySelector("#foods-q") ? 1 : 0, nan: /NaN/.test(document.body.innerText) }; });
  assert.equal(r.kcal, 5.5); assert.equal(r.per, "undefined", "F-09: a missing value stays unknown, no 0 is invented"); assert.equal(r.sheet, "recipe"); assert.equal(r.nan, false); assert.deepEqual(app.errors, []);
});
