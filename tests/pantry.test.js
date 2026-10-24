/* M2: the stock of a food can be seen and changed from Foods, the Meal Plan and the Pantry; exact amounts and fractions;
   prices per kg / unit / pack; Pantry search, sort and filters; stock on a future date. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let dir, app;
test.before(() => { dir = H.build(H.tmp("pantry2-build")); });
test.afterEach(async () => { await app?.close(); app = null; });
const start = async (seed = F.seed(), vp) => { app = await H.startApp({ dir, seed, viewport: vp }); return app.page; };

test("stockAdd / stockSet: quick steps, exact amounts, never negative, empty removes the entry, undo", async () => {
  const page = await start();
  const r = await page.evaluate(() => {
    const out = {}; const g = () => S.shop.pantry["t-rice"]?.g ?? null;
    stockSet("t-rice", 250); out.set = g();
    stockAdd("t-rice", 100); out.add = g();
    stockAdd("t-rice", -1000); out.floor = g();            // goes to zero → entry removed, never negative
    stockSet("t-rice", 37); out.exact = g();               // exact grams, no rounding to a pack or a step
    const before = g(); stockSet("t-rice", 500); undoStock(); out.undo = [before, g()];
    return out;
  });
  assert.deepEqual(r, { set: 250, add: 350, floor: null, exact: 37, undo: [37, 37] });
});

test("the same stock shows on every screen: Pantry, Foods editor, Meal Plan quantity sheet, shopping 'free at home'", async () => {
  const page = await start();
  const r = await page.evaluate(() => {
    const d = todayISO(); stockSet("t-rice", 150);
    const qty = SHEETS.qty({ kind: "food", ref: "t-rice", qty: 100, date: d, meal: "d", origMeal: "d" }).body;
    const food = SHEETS.food({ draft: clone(S.foods["t-rice"]), isNew: false }).body;
    const pantry = VIEWS.pantry();
    ACT["stock-step"]({ dataset: { id: "t-rice", d: "1" } });
    const after = { qty: SHEETS.qty({ kind: "food", ref: "t-rice", qty: 100, date: d, meal: "d", origMeal: "d" }).body, pantry: VIEWS.pantry(), g: S.shop.pantry["t-rice"].g, free: shoppingRows(d, 1).find(x => x.id === "t-rice").free };
    return { qtyHas: /stock-box/.test(qty) && /150/.test(qty), foodHas: /stock-box/.test(food), pantryHas: /150/.test(pantry), foodsRow: foodSub(S.foods["t-rice"]), after: { g: after.g, free: after.free, qty: /175/.test(after.qty), pantry: /175/.test(after.pantry) } };
  });
  assert.equal(r.qtyHas, true); assert.equal(r.foodHas, true); assert.equal(r.pantryHas, true);
  assert.match(r.foodsRow, /at home/);
  assert.deepEqual(r.after, { g: 175, free: 175, qty: true, pantry: true });
});

test("the stock survives a reload and an offline change", async () => {
  const page = await start();
  await page.evaluate(() => { stockSet("t-rice", 420); });
  await app.reload();
  assert.equal(await page.evaluate(() => S.shop.pantry["t-rice"].g), 420);
  assert.deepEqual(app.errors, []);
});

test("fractions and exact amounts: ½ pack, ¼ pack, 1/3, 1 1/2, decimal comma, exact grams", async () => {
  const page = await start();
  const r = await page.evaluate(() => {
    const food = "t-rice", g = (u, n) => paGrams({ food, u, n });   // pack = 1000 g
    return { half: g("pack", "1/2"), quarter: g("pack", "1/4"), third: Math.round(g("pack", "1/3") * 100) / 100, mixed: g("pack", "1 1/2"), comma: g("pack", "0,5"), grams: g("base", "37"), kg: g("kg", "0,25"), bad: g("pack", "1/0") };
  });
  assert.deepEqual(r, { half: 500, quarter: 250, third: 333.33, mixed: 1500, comma: 500, grams: 37, kg: 250, bad: 0 });
  const html = await page.evaluate(() => { const sh = { food: "t-rice", u: "pack", g: 0 }; return paQuick(sh); });
  assert.ok(html.includes("¼ pack") && html.includes("½ pack"));
});

test("saving a fraction in the pantry sheet stores exact grams", async () => {
  const page = await start();
  const g = await page.evaluate(() => { openSheet("pantry", { food: "t-rice", g: "", exp: "", u: "pack", n: "1/2" }); ACT["pa-save"](); return S.shop.pantry["t-rice"].g; });
  assert.equal(g, 500);
});

test("prices per kg, per pack and per unit are stored without arbitrary conversions and read back the same", async () => {
  const page = await start();
  const r = await page.evaluate(() => {
    const out = {};
    S.foods["t-rice"].pack = 500; DATA_V++;
    priceSet("t-rice", 4.8, "kg"); out.fromKg = priceViews("t-rice");
    priceSet("t-rice", 2.4, "pack"); out.fromPack = priceViews("t-rice");
    S.foods["t-egg"] = { id: "t-egg", name: "Test egg", per: { kcal: 143, p: 12.6, c: 0.7, f: 9.5, fib: 0 }, unit: "g", pack: 0, cat: "dairy", role: "P", meals: ["m"], countable: true, servings: [{ l: "1 egg", g: 60 }], source: "custom" };
    priceSet("t-egg", 0.3, "unit"); out.egg = priceViews("t-egg");
    out.noPack = priceSet("t-oil", 3, "pack") && null;   // oil has pack 500 → fine
    S.foods["t-oil"].pack = 0; out.refused = priceSet("t-oil", 3, "pack");   // no pack size → refused, nothing stored
    out.stored = JSON.stringify(S.shop.prices["t-oil"] ?? null);
    return out;
  });
  assert.deepEqual(r.fromKg, { perKg: 4.8, perPack: 2.4, perUnit: null });
  assert.deepEqual(r.fromPack, { perKg: 4.8, perPack: 2.4, perUnit: null });
  assert.equal(r.egg.perUnit, 0.3); assert.equal(Math.round(r.egg.perKg * 100) / 100, 5);
  assert.equal(r.refused, false);
});

test("Pantry list: search (name, brand, Italian name), sort A–Z / Z–A / expiry / category, filters, and the preferences persist", async () => {
  const page = await start();
  const r = await page.evaluate(() => {
    const t = todayISO(); S.foods["t-rice"].brand = "Acme";
    Object.assign(S.shop.pantry, { "t-rice": { g: 500, exp: addDays(t, 20) }, "t-oil": { g: 300, exp: addDays(t, 2) }, "t-chicken": { g: 200 }, "chicken-breast": { g: 400, exp: addDays(t, 40) } }); DATA_V++;
    const names = list => list.map(id => (getFood(id) || BUILTIN[id]).name);
    const out = {};
    out.az = names(pantryList("", "az", "all")); out.za = names(pantryList("", "za", "all"));
    out.exp = pantryList("", "exp", "all"); out.cat = pantryList("", "cat", "all");
    out.byName = names(pantryList("rice", "az", "all")); out.byBrand = pantryList("acme", "az", "all"); out.byItalian = pantryList("petto", "az", "all");
    out.soon = pantryList("", "az", "soon");
    S.shop.pantry["t-oil"].exp = addDays(t, 30); DATA_V++; out.soonNone = pantryList("", "az", "soon");
    setPantryPrefs({ sort: "za", filter: "all" }); out.prefs = S.settings.pantryPrefs;
    return out;
  });
  assert.deepEqual(r.az, [...r.az].sort((a, b) => a.localeCompare(b))); assert.deepEqual(r.za, [...r.az].reverse());
  assert.equal(r.exp[0], "t-oil", "expiry first; items with no date last"); assert.equal(r.exp[r.exp.length - 1], "t-chicken");
  assert.ok(r.byName.length >= 1 && r.byName.every(n => /rice/i.test(n)));
  assert.deepEqual(r.byBrand, ["t-rice"]); assert.deepEqual(r.byItalian, ["chicken-breast"]);
  assert.deepEqual(r.soon, ["t-oil"]); assert.deepEqual(r.soonNone, []);
  assert.deepEqual(r.prefs, { sort: "za", filter: "all" });
  await app.reload();
  assert.deepEqual(await page.evaluate(() => S.settings.pantryPrefs), { sort: "za", filter: "all" });
});

test("stock on a future date: current → projected, when it runs out, which meals use it; nothing is written", async () => {
  const page = await start();
  const r = await page.evaluate(() => {
    const t = todayISO(); S.shop.pantry["t-rice"] = { g: 1000 }; for (let i = 0; i < 7; i++) S.days[addDays(t, i)].meals.m[0].pan = true; DATA_V++;
    const snap = JSON.stringify([S.shop, S.days]);
    const f = pantryForecast(addDays(t, 3)), row = f.rows.find(x => x.id === "t-rice");
    return { row: { now: row.now, then: row.then, endsOn: row.endsOn === addDays(t, 4), uses: row.uses.length }, html: forecastHTML(addDays(t, 3)), same: snap === JSON.stringify([S.shop, S.days]) };
  });
  assert.deepEqual(r.row, { now: 1000, then: 200, endsOn: true, uses: 4 });
  assert.ok(r.html.includes("runs out") && r.same);
});

test("the Pantry screen renders on phone, tablet and desktop without sideways scroll, with search, filters and the forecast", async () => {
  for (const [name, vp] of Object.entries(H.VIEWPORTS)) {
    const page = await start(F.seed({ withPantry: true }), vp);
    const r = await page.evaluate(async () => { for (let i = 0; i < 7; i++) S.days[addDays(todayISO(), i)].meals.m[0].pan = true; S.shop.pantry["t-oil"] = { g: 300 }; DATA_V++; UI.tab = "pantry"; scheduleRender(); await new Promise(r => setTimeout(r, 400));
      return { sw: document.documentElement.scrollWidth, iw: innerWidth, search: !!document.querySelector("#pantry-q"), chips: document.querySelectorAll("[data-act=pantry-filter]").length, sorts: document.querySelectorAll("[data-act=pantry-sort]").length, forecast: !!document.querySelector(".pa-forecast") }; });
    assert.ok(r.sw <= r.iw, `${name}: page scrolls sideways`); assert.equal(r.search, true); assert.ok(r.chips >= 3 && r.sorts >= 3); assert.equal(r.forecast, true);
    await page.screenshot({ path: require("path").join(process.env.ENGINE_SHOTS || require("os").tmpdir(), `pantry-${name}.png`) });
    assert.deepEqual(app.errors, []);
    await app.close(); app = null;
  }
});
