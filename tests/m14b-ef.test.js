/* M14b groups E and F: deleted foods keep history, priceSet merges, Finish keeps pantry units, pack stepper keeps price/offer/store,
   no ghost row, and L189 «Use something from home» (the picker of L203 is in m5d-shop). Synthetic data only. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let dir, app;
test.before(async () => { dir = H.build(H.tmp("m14b-ef-build")); });
test.afterEach(async () => { await app?.close(); app = null; });
const start = async (seed = F.seed({ withPlan: false }), vp = H.VIEWPORTS.desktop) => { app = await H.startApp({ dir, seed, viewport: vp }); return app.page; };

test("deleting a food keeps the kcal of the days and recipes that used it, also after the bin is emptied", async () => {
  const page = await start();
  const r = await page.evaluate(() => {
    const d = todayISO(); S.days[d] = { date: d, meals: { d: [{ id: "x1", kind: "food", ref: "t-rice", qty: 200, eaten: true }], m: [{ id: "x2", kind: "recipe", ref: "t-bowl", qty: 2, eaten: true }] } }; DATA_V++;
    const k0 = Math.round(dayTotals(S.days[d], true).kcal), rec0 = Math.round(recipeTotals(S.recipes["t-bowl"]).kcal);
    UI.sheet = { type: "food", draft: clone(S.foods["t-rice"]) }; ACT["fd-del"](); DATA_V++;
    const k1 = Math.round(dayTotals(S.days[d], true).kcal), rec1 = Math.round(recipeTotals(S.recipes["t-bowl"]).kcal);
    put("foods", "t-rice", { ...S.foods["t-rice"], delAt: addDays(todayISO(), -9) }); binPurge(); DATA_V++;
    const k2 = Math.round(dayTotals(S.days[d], true).kcal);
    return { k0, k1, k2, rec0, rec1, bin: hiddenFoods().some(f => f.id === "t-rice") };
  });
  /* 200 g rice = 700 kcal; the bowl (200 g rice 700 + 300 g chicken 330 + 10 g oil 90 = 1120 for 2 servings), 2 servings eaten = 1120 */
  assert.equal(r.k0, 700 + 1120); assert.equal(r.k1, r.k0); assert.equal(r.k2, r.k0); assert.equal(r.rec1, r.rec0); assert.equal(r.bin, false);
  assert.deepEqual(app.errors, []);
});

test("a deleted food nothing used is removed for good once the bin is emptied", async () => {
  const page = await start();
  const r = await page.evaluate(() => { put("foods", "u1", { id: "u1", name: "Unused", per: { kcal: 1, p: 0, c: 0, f: 0 }, hidden: true, delAt: addDays(todayISO(), -9) }); binPurge(); return !!S.foods.u1; });
  assert.equal(r, false);
});

test("typing a price in the food editor keeps the price history and the store prices", async () => {
  const page = await start();
  const r = await page.evaluate(() => {
    S.shop.prices = { "t-rice": { eur: 2, g: 1000, at: "2026-01-01", hist: [{ eur: 2, g: 1000, at: "2026-01-01" }], st: { s1: { eur: 1.8, g: 1000, at: "2026-01-01", hist: [{ eur: 1.8, g: 1000, at: "2026-01-01" }] } } } };
    const ok = priceSet("t-rice", 1.1, "kg"), p = S.shop.prices["t-rice"];
    return { ok, eur: p.eur, hist: p.hist.length, st: Object.keys(p.st || {}), manual: p.manual };
  });
  assert.deepEqual(r, { ok: true, eur: 1.1, hist: 2, st: ["s1"], manual: true });
});

test("Finish shopping keeps the pantry unit, piece weight and pack of what was already at home", async () => {
  const page = await start();
  const r = await page.evaluate(() => {
    S.shop.pantry["t-oil"] = { g: 200, u: "pack", pk: 500, pw: 15 }; S.shop.checked = { "t-oil": { g: 500, eur: 4 } }; DATA_V++; ACT["shop-done"]();
    const p = S.shop.pantry["t-oil"]; return { g: p.g, u: p.u, pk: p.pk, pw: p.pw };
  });
  assert.deepEqual(r, { g: 700, u: "pack", pk: 500, pw: 15 });
});

test("the pack stepper scales the typed price and keeps the offer and the store", async () => {
  const page = await start(F.seed({ withPlan: true }));
  const r = await page.evaluate(() => {
    UI.shopStart = todayISO(); S.shop.range = 7; DATA_V++;
    const id = shopToBuy()[0].id, f = getFood(id); S.shop.checked = { [id]: { g: f.pack, eur: 2, offer: true, sid: "s1" } }; ACT["shop-pk"]({ dataset: { id, d: "1" } });
    const c = S.shop.checked[id]; return { g: c.g / f.pack, eur: c.eur, offer: c.offer, sid: c.sid };
  });
  assert.deepEqual(r, { g: 2, eur: 4, offer: true, sid: "s1" });
});

test("a pack that covers the need within 2 % leaves no «0×» row", async () => {
  const page = await start();
  const r = await page.evaluate(() => {
    const d = todayISO(); S.days[d] = { date: d, meals: { d: [{ id: "g1", kind: "food", ref: "t-rice", qty: 1015, eaten: false }] } }; S.shop.pantry["t-rice"] = { g: 1000 }; DATA_V++;
    return shoppingRows(todayISO(), 7).map(x => x.id);
  });
  assert.deepEqual(r, []);
});

test("a price that is not a number is no price (not 0 euro)", async () => {
  const page = await start();
  const r = await page.evaluate(() => { openSheet("buy", { id: "t-oil", g: 500, eur: "abc" }); ACT["by-ok"](); return S.shop.checked["t-oil"].eur; });
  assert.equal(r, null);
});

/* L189. Rice (C: p7 c78 f1) 500 g planned tomorrow, nothing at home. Pasta (C: p12 c65 f1.5) 1000 g at home: 500*78/65 = 600 g.
   Bread (C: p9 c50 f3) 1000 g at home: 500*78/50 = 780 g. Cereal (C: c60) only 100 g at home: not enough, left out. Chicken (P) at home: other role, left out.
   Order by how close the per-100 g macros are to rice: pasta first, bread second. */
const L189 = async () => {
  const page = await start();
  await page.evaluate(() => {
    const mk = (id, name, kcal, p, c, f, role) => ({ id, name, brand: "", unit: "g", per: { kcal, p, c, f, fib: 0 }, servings: [], pack: 0, cat: "pantry", role, meals: ["m", "d"], source: "custom" });
    S.foods["t-pasta"] = mk("t-pasta", "Test pasta", 355, 12, 65, 1.5, "C"); S.foods["t-bread"] = mk("t-bread", "Test bread", 280, 9, 50, 3, "C"); S.foods["t-cereal"] = mk("t-cereal", "Test cereal", 300, 8, 60, 2, "C");
    const t = addDays(todayISO(), 1); S.days[t] = { date: t, meals: { d: [{ id: "h1", kind: "food", ref: "t-rice", qty: 500, eaten: false }] } };
    S.shop.pantry = { "t-pasta": { g: 1000 }, "t-bread": { g: 1000 }, "t-cereal": { g: 100 }, "t-chicken": { g: 1000 } }; UI.shopStart = todayISO(); S.shop.range = 7; DATA_V++;
  });
  return page;
};
test("L189: the suggested candidates are foods at home with free stock, same macro role, ordered by similarity, with the grams they need (L203: the others follow, see m5d-shop)", async () => {
  const page = await L189();
  const r = await page.evaluate(() => homeSwaps("t-rice").filter(x => x.suggested).map(x => [x.food.id, x.qFrom, x.qTo]));
  assert.deepEqual(r, [["t-pasta", 500, 600], ["t-bread", 500, 780]]);
});
test("L189: one tap swaps the plan, the row disappears, the stock is untouched, one Undo brings it all back", async () => {
  const page = await L189();
  const r = await page.evaluate(() => {
    const pan0 = JSON.stringify(S.shop.pantry), rows0 = shoppingRows(todayISO(), 7).map(x => x.id).join(), t = addDays(todayISO(), 1);
    ACT["home-swap"]({ dataset: { id: "t-rice", to: "t-pasta" } }); DATA_V++;
    const rows1 = shoppingRows(todayISO(), 7), cov = shoppingCovered(todayISO(), 7).find(x => x.id === "t-pasta"), item = S.days[t].meals.d[0];
    const mid = { rice: rows1.some(x => x.id === "t-rice"), pasta: rows1.some(x => x.id === "t-pasta"), cov: cov && cov.covered, ref: item.ref, qty: item.qty, pan: JSON.stringify(S.shop.pantry) === pan0, undo: typeof toast.undo };
    toast.undo(); DATA_V++;
    return { rows0, mid, back: shoppingRows(todayISO(), 7).map(x => x.id).join(), refBack: S.days[t].meals.d[0].ref, qtyBack: S.days[t].meals.d[0].qty };
  });
  assert.equal(r.rows0, "t-rice"); assert.deepEqual(r.mid, { rice: false, pasta: false, cov: 600, ref: "t-pasta", qty: 600, pan: true, undo: "function" });
  assert.equal(r.back, "t-rice"); assert.equal(r.refBack, "t-rice"); assert.equal(r.qtyBack, 500);
  assert.deepEqual(app.errors, []);
});
test("L189: nothing is offered when nothing at home fits", async () => {
  const page = await start(F.seed({ withPlan: true }));
  const r = await page.evaluate(() => { UI.shopStart = todayISO(); DATA_V++; return homeSwaps("t-rice").length; });
  assert.equal(r, 0);
});
