/* M5b / C6: filters in Foods and in the Add sheet — protein, carb, fat, vegetables, at home or not — with rules written down and tested at their limits. Synthetic data only. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let dir, app;
test.before(async () => { dir = H.build(H.tmp("ffilt-build")); });
test.afterEach(async () => { await app?.close(); app = null; });
const start = async viewport => { app = await H.startApp({ dir, seed: F.seed({ withPlan: false }), viewport }); return app.page; };
const food = (id, name, per, extra = {}) => ({ id, name, unit: "g", per: { kcal: 4 * per.p + 4 * per.c + 9 * per.f, fib: 0, ...per }, servings: [], source: "custom", role: "X", cat: "pantry", ...extra });

test("the rules: a food is protein-, carb- or fat-rich by its share of the macro energy and a minimum amount per 100 g; the limits are inclusive", async () => {
  const page = await start();
  const r = await page.evaluate(() => { const mk = (p, c, f) => ({ per: { p, c, f, kcal: 4 * p + 4 * c + 9 * f } }), k = x => Object.entries(foodClass(x)).filter(([, v]) => v).map(([n]) => n).join("");
    return { // protein: 30% of energy and 8 g
      pAt: k(mk(12, 10, 8)), pLow: k(mk(10, 30, 4)), pFew: k(mk(7, 0, 2)),
      // carb: 55% and 15 g
      cAt: k(mk(0, 55, 0) /* 100% */), cMid: k(mk(5, 27.5, 7.8)), cFew: k(mk(0, 14, 0)),
      // fat: 55% and 10 g
      fAt: k(mk(0, 0, 12)), fFew: k(mk(0, 0, 9)),
      none: k(mk(5, 10, 3)) }; });
  assert.equal(r.pAt, "p", "12 g protein = 48 of 160 kcal: exactly 30 %, and the limit is inclusive"); assert.equal(r.cMid, "", "27.5 g carbs are 54.9 % of the energy: just under"); assert.ok(!r.pLow.includes("p"), "10 g protein but only 20% of the energy"); assert.equal(r.pLow, "c", "it is a carb-rich food"); assert.equal(r.pFew, "", "92%+ protein share but under 8 g");
  assert.equal(r.cAt, "c"); assert.equal(r.cFew, ""); assert.equal(r.fAt, "f"); assert.equal(r.fFew, ""); assert.equal(r.none, "");
});

test("a food can be in two groups (nuts are fat- and protein-rich); vegetables come from what you set the food to count as", async () => {
  const page = await start();
  const r = await page.evaluate(() => { const nuts = { per: { p: 20, c: 5, f: 50, kcal: 4 * 20 + 4 * 5 + 450 } }; const g = foodClass(nuts); const v = foodClass({ per: { p: 1, c: 3, f: 0, kcal: 16 }, role: "V" }); return { nuts: Object.entries(g).filter(([, x]) => x).map(([k]) => k).join(""), veg: v.v, notVeg: foodClass({ per: { p: 1, c: 3, f: 0, kcal: 16 }, role: "C" }).v }; });
  assert.equal(r.nuts, "f"); assert.equal(r.veg, true); assert.equal(r.notVeg, false);
});

test("filters combine (all chosen must hold) in Foods; «At home» and «Not at home» follow the pantry", async () => {
  const page = await start();
  const r = await page.evaluate(() => { S.foods.chk = { ...S.foods["t-chicken"], id: "chk", name: "Chicken B" }; S.foods.zuc = { id: "zuc", name: "Zucchini", unit: "g", per: { kcal: 17, p: 1.2, c: 3, f: .3, fib: 1 }, servings: [], source: "custom", role: "V", cat: "produce" };
    S.shop.pantry["t-chicken"] = { g: 400 }; S.shop.pantry["zuc"] = { g: 200 }; DATA_V++; const names = flt => foodSearch("", "all", flt).filter(x => x.t === "food").map(x => x.x.name);
    const p = names({ p: true }), pin = names({ p: true, in: true }), pout = names({ p: true, out: true }), v = names({ v: true }), vin = names({ v: true, in: true }), all = names({});
    return { pHas: p.includes("Test chicken") && p.includes("Chicken B") && !p.includes("Test rice"), pin: pin.includes("Test chicken") && !pin.includes("Chicken B"), pout: pout.includes("Chicken B") && !pout.includes("Test chicken"), v: v.includes("Zucchini") && !v.includes("Test chicken"), vin: vin.includes("Zucchini"), more: all.length > p.length }; });
  assert.deepEqual(r, { pHas: true, pin: true, pout: true, v: true, vin: true, more: true });
});

test("recipes are filtered by their serving: the bowl is carb- and protein-rich per serving, and «at home» needs every ingredient at home", async () => {
  const page = await start();
  const r = await page.evaluate(() => { const rec = flt => foodSearch("", "all", flt).filter(x => x.t === "recipe").map(x => x.x.id); const c = rec({ c: true }), none = rec({ v: true });
    S.shop.pantry["t-rice"] = { g: 500 }; S.shop.pantry["t-chicken"] = { g: 500 }; DATA_V++; const part = rec({ in: true }).includes("t-bowl"); S.shop.pantry["t-oil"] = { g: 50 }; DATA_V++; const full = rec({ in: true }).includes("t-bowl"), out = rec({ out: true }).includes("t-bowl"); return { c: c.includes("t-bowl"), noveg: !none.includes("t-bowl"), part, full, out }; });
  assert.deepEqual(r, { c: true, noveg: true, part: false, full: true, out: false });
});

test("the Foods tab and the Add sheet show the same filter chips; choosing one narrows the list and a second tap clears it", async () => {
  const page = await start(H.VIEWPORTS.phone);
  await page.evaluate(() => { S.shop.pantry["t-chicken"] = { g: 400 }; UI.tab = "foods"; UI.foodsSeg = "all"; DATA_V++; scheduleRender(); }); await page.waitForSelector("#foods-q");
  assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('[data-act="fflt"]')].map(b => b.innerText.trim())), ["High protein", "High carb", "High fat", "Vegetables", "Drinks", "At home", "Not at home"]);
  const n0 = await page.evaluate(() => document.querySelectorAll("#main .lrow").length); await page.click('[data-act="fflt"][data-k="in"]'); await page.waitForTimeout(150);
  const n1 = await page.evaluate(() => document.querySelectorAll("#main .lrow").length); assert.ok(n1 < n0 && n1 >= 1);
  await page.click('[data-act="fflt"][data-k="in"]'); await page.waitForTimeout(150); assert.equal(await page.evaluate(() => document.querySelectorAll("#main .lrow").length), n0);
  await page.evaluate(() => { openSheet("add", { date: todayISO(), meal: "lunch", seg: "all", q: "" }); });
  assert.equal(await page.evaluate(() => document.querySelectorAll('.sheet [data-act="fflt"]').length), 7);
  await page.click('.sheet [data-act="fflt"][data-k="p"]'); await page.waitForTimeout(150);
  const names = await page.evaluate(() => [...document.querySelectorAll("#add-list .lrow .t")].map(x => x.innerText)); assert.ok(names.some(n => /chicken/i.test(n)) && !names.some(n => /^Test rice/.test(n)));
});

test("«at home» and «not at home» are alternatives: choosing one clears the other", async () => {
  const page = await start();
  const r = await page.evaluate(() => { ACT.fflt({ dataset: { k: "in" } }); const a = { ...UI.foodFilt }; ACT.fflt({ dataset: { k: "out" } }); const b = { ...UI.foodFilt }; ACT.fflt({ dataset: { k: "p" } }); return { a, b, c: { ...UI.foodFilt } }; });
  assert.deepEqual(r.a, { in: true }); assert.deepEqual(r.b, { out: true }); assert.deepEqual(r.c, { out: true, p: true });
});
