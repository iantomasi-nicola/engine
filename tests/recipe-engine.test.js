/* M5a: the recipe engine — history that doesn't move when a recipe is edited, scaling, cost, time, half and whole packs. Synthetic data only. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let dir, app;
test.before(async () => { dir = H.build(H.tmp("recipe-build")); });
test.afterEach(async () => { await app?.close(); app = null; });
const start = async (seed = F.seed({ withPlan: false }), viewport) => { app = await H.startApp({ dir, seed, viewport }); return app.page; };
/* t-bowl: 2 servings = 200 g rice (3.5 kcal/g) + 300 g chicken (1.1) + 10 g oil (9) = 700 + 330 + 90 = 1120 kcal → 560 per serving */
const BOWL = 1120;
const withDays = page => page.evaluate(() => { const t = todayISO(), y = addDays(t, -2);
  S.days[y] = { date: y, meals: { lunch: [{ id: "e1", kind: "recipe", ref: "t-bowl", qty: 1, eaten: true }] } };
  S.days[addDays(t, 1)] = { date: addDays(t, 1), meals: { lunch: [{ id: "p1", kind: "recipe", ref: "t-bowl", qty: 1, eaten: false }] } }; DATA_V++; });
const editBowl = (page, fn) => page.evaluate(src => { openSheet("recipe", { isNew: false, draft: clone(S.recipes["t-bowl"]) }); eval(src); ACT["rc-save"]({ dataset: {} }); }, fn);

test("editing a recipe leaves the meals you already ate as they were; planned ones follow the new recipe", async () => {
  const page = await start(); await withDays(page);
  const before = await page.evaluate(() => { const t = todayISO(); return { eaten: Math.round(dayTotals(S.days[addDays(t, -2)], true).kcal), planned: Math.round(dayTotals(S.days[addDays(t, 1)]).kcal) }; });
  assert.deepEqual(before, { eaten: BOWL / 2, planned: BOWL / 2 });
  await editBowl(page, 'S_().draft.ingredients.find(i => i.food === "t-chicken").g = 600');
  const after = await page.evaluate(() => { const t = todayISO(); return { eaten: Math.round(dayTotals(S.days[addDays(t, -2)], true).kcal), planned: Math.round(dayTotals(S.days[addDays(t, 1)]).kcal), snap: !!S.days[addDays(t, -2)].meals.lunch[0].snap, plannedSnap: !!S.days[addDays(t, 1)].meals.lunch[0].snap }; });
  assert.equal(after.eaten, BOWL / 2, "the eaten day did not change");
  assert.equal(after.planned, (BOWL + 330) / 2, "the planned day uses the new recipe (300 g more chicken)");
  assert.deepEqual([after.snap, after.plannedSnap], [true, false]);
});

test("the eaten meal also keeps its nutrients and its name, even if the recipe is renamed or deleted", async () => {
  const page = await start(); await withDays(page);
  await editBowl(page, 'S_().draft.name = "Renamed bowl"; S_().draft.ingredients.find(i => i.food === "t-rice").g = 400');
  const r = await page.evaluate(() => { const t = todayISO(), it = S.days[addDays(t, -2)].meals.lunch[0]; const a = itemName(it); const nut = dayNut(addDays(t, -2), "eaten"); deleteRecipe("t-bowl"); return { name: a, kcal: Math.round(nut.kcal) }; });
  assert.equal(r.name, "Test bowl"); assert.equal(r.kcal, BOWL / 2);
  await page.waitForTimeout(100);
  const gone = await page.evaluate(() => { try { const t = todayISO(), it = S.days[addDays(t, -2)].meals.lunch[0]; return { kcal: Math.round(itemMacros(it).kcal), name: itemName(it) }; } catch (e) { return String(e); } });
  assert.deepEqual(gone, { kcal: BOWL / 2, name: "Test bowl" });
});

test("editing a recipe never moves the stock or changes what un-eating gives back", async () => {
  const page = await start(); await withDays(page);
  const r = await page.evaluate(() => { const t = todayISO(), d = addDays(t, -2); S.shop.pantry["t-rice"] = { g: 1000 }; mutateDay(d, day => { const x = day.meals.lunch[0]; x.eaten = false; }); mutateDay(d, day => { const x = day.meals.lunch[0]; x.eaten = true; pantryAdjust(x, 1, t); }); return S.shop.pantry["t-rice"].g; });
  assert.equal(r, 900);
  await editBowl(page, 'S_().draft.ingredients.find(i => i.food === "t-rice").g = 800');
  const back = await page.evaluate(() => { const d = addDays(todayISO(), -2), stock0 = S.shop.pantry["t-rice"].g; mutateDay(d, day => { const x = day.meals.lunch[0]; x.eaten = false; pantryAdjust(x, -1); }); return [stock0, S.shop.pantry["t-rice"].g]; });
  assert.deepEqual(back, [900, 1000], "100 g came off when it was eaten, 100 g go back — not 400");
});

test("scaling: ×2 and ×½ change the amounts and the servings together, so a serving stays the same", async () => {
  const page = await start();
  const r = await page.evaluate(() => { openSheet("recipe", { isNew: false, draft: clone(S.recipes["t-bowl"]) }); const per = () => { const d = S_().draft, t = recipeTotals({ ...d, ingredients: d.ingredients.map(i => ({ ...i, g: +i.g })) }); return Math.round(t.kcal / d.servings); };
    const a = per(); ACT["rc-scale"]({ dataset: { k: "2" } }); const d2 = S_().draft, b = per(), g2 = d2.ingredients.map(i => i.g), s2 = d2.servings; ACT["rc-scale"]({ dataset: { k: "0.5" } }); ACT["rc-scale"]({ dataset: { k: "0.5" } });
    const d3 = S_().draft; return { a, b, c: per(), g2, s2, s3: d3.servings, g3: d3.ingredients.map(i => i.g) }; });
  assert.deepEqual([r.a, r.b, r.c], [560, 560, 560]); assert.deepEqual(r.g2, [400, 600, 20]); assert.equal(r.s2, 4); assert.equal(r.s3, 1); assert.deepEqual(r.g3, [100, 150, 5], "×2 then ×½ twice: a quarter of the oil");
});

test("cost per serving from the prices you paid; ingredients without a price are left out and it says so", async () => {
  const page = await start();
  const r = await page.evaluate(() => { const t = todayISO(); S.shop.prices = { "t-rice": { eur: 2, g: 1000, at: t }, "t-chicken": { eur: 6, g: 400, at: t } }; DATA_V++;
    const c = recipeCost(S.recipes["t-bowl"]); S.shop.prices["t-oil"] = { eur: 5, g: 500, at: t }; DATA_V++; const d = recipeCost(S.recipes["t-bowl"]); delete S.shop.prices["t-rice"]; DATA_V++; const e = recipeCost(S.recipes["t-bowl"]); return { c, d, e }; });
  assert.ok(Math.abs(r.c.perServing - (200 * 0.002 + 300 * 0.015) / 2) < 1e-9, "(0.40 + 4.50) / 2 servings"); assert.equal(r.c.partial, true, "the oil has no price yet");
  assert.ok(Math.abs(r.d.perServing - (200 * 0.002 + 300 * 0.015 + 10 * 0.01) / 2) < 1e-9); assert.equal(r.d.partial, false);
  assert.equal(r.e.partial, true); assert.ok(Math.abs(r.e.perServing - (300 * 0.015 + 10 * 0.01) / 2) < 1e-9);
});

test("an ingredient can be set to ½ pack or a whole pack, and the editor says how many packs it is", async () => {
  const page = await start();
  const r = await page.evaluate(() => { openSheet("recipe", { isNew: false, draft: clone(S.recipes["t-bowl"]) }); const html0 = document.querySelector(".sheet").innerHTML;
    const chk = S_().draft.ingredients.findIndex(i => i.food === "t-chicken");           // the pack of chicken is 400 g
    ACT["rc-pack"]({ dataset: { i: String(chk), f: "0.5" } }); const half = S_().draft.ingredients[chk].g; const t1 = document.querySelector(".sheet").innerText;
    ACT["rc-pack"]({ dataset: { i: String(chk), f: "1" } }); const one = S_().draft.ingredients[chk].g; const t2 = document.querySelector(".sheet").innerText;
    const oil = S_().draft.ingredients.findIndex(i => i.food === "t-oil"); const oilChips = document.querySelectorAll(`.sheet [data-act="rc-pack"][data-i="${oil}"]`).length;
    return { half, one, t1: /½ pack/.test(t1), t2: /1 pack/.test(t2), chips: document.querySelectorAll('.sheet [data-act="rc-pack"]').length, oilChips }; });
  assert.deepEqual([r.half, r.one], [200, 400]); assert.equal(r.t1, true); assert.equal(r.t2, true); assert.ok(r.chips >= 4);
});

test("a recipe keeps its time and method, and the quantity sheet shows them", async () => {
  const page = await start();
  const r = await page.evaluate(() => { openSheet("recipe", { isNew: false, draft: clone(S.recipes["t-bowl"]) }); S_().draft.time = 25; S_().draft.note = "Cook the rice.\nGrill the chicken.\nMix."; ACT["rc-save"]({ dataset: {} });
    openSheet("qty", { kind: "recipe", ref: "t-bowl", qty: 1, date: todayISO(), meal: "lunch", origMeal: "lunch" }); const t = document.querySelector(".sheet").textContent; return { time: S.recipes["t-bowl"].time, shows: /25 min/.test(t), method: /Grill the chicken/.test(t) }; });
  assert.deepEqual(r, { time: 25, shows: true, method: true });
});

for (const [name, vp] of Object.entries(H.VIEWPORTS)) test(`the recipe editor with scale, cost, time and pack chips fits the screen — ${name}`, async () => {
  const page = await start(F.seed({ withPlan: false }), vp);
  await page.evaluate(() => { const t = todayISO(); S.shop.prices = { "t-rice": { eur: 2, g: 1000, at: t } }; DATA_V++; openSheet("recipe", { isNew: false, draft: clone(S.recipes["t-bowl"]) }); });
  const r = await page.evaluate(() => { const s = document.querySelector(".sheet"); const cut = [...s.querySelectorAll("button,.chip")].filter(x => x.offsetParent && x.scrollWidth > x.clientWidth + 1 && getComputedStyle(x).overflow !== "visible"); return { over: s.scrollWidth > s.clientWidth + 1 || document.documentElement.scrollWidth > innerWidth, cut: cut.map(x => x.innerText.trim()) }; });
  assert.deepEqual(r, { over: false, cut: [] });
});
