/* M3b (2): replace a product in the shopping list and, with it, in the meal plan (and recipes if you say so); scan a product to tick it off. Synthetic data only. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let dir, app;
test.before(async () => { dir = H.build(H.tmp("swap-build")); });
test.afterEach(async () => { await app?.close(); app = null; });
const start = async viewport => { app = await H.startApp({ dir, seed: F.seed(), viewport }); return app.page; };
/* seed: every day, 100 g rice at "d" and the bowl (200 g rice + 300 g chicken + 10 g oil, 2 servings) at "m". t-rice2 = a rice that has half the calories. */
const addRice2 = page => page.evaluate(() => { S.foods["t-rice2"] = { id: "t-rice2", name: "Light rice", unit: "g", per: { kcal: 175, p: 4, c: 39, f: .5, fib: 0 }, servings: [], pack: 500, cat: "pantry", role: "C", meals: ["m", "d"], source: "custom", barcode: "8000000000321" }; DATA_V++; });

test("swapping a product changes the planned meals from today on (same grams), never the eaten or past ones, and the recipes stay as they are", async () => {
  const page = await start(); await addRice2(page);
  const r = await page.evaluate(() => { const t = todayISO(), y = addDays(t, -1); S.days[y] = { date: y, meals: { d: [{ id: "py", kind: "food", ref: "t-rice", qty: 100, eaten: false }] } };
    mutateDay(t, d => { d.meals.d[0].eaten = true; }); DATA_V++;
    const res = swapFood("t-rice", "t-rice2", { recipes: false, kcal: false });
    const ref = (d, m) => S.days[d].meals[m].map(x => x.ref + ":" + x.qty); return { res, today: ref(t, "d"), tomorrow: ref(addDays(t, 1), "d"), past: ref(y, "d"), bowl: S.recipes["t-bowl"].ingredients.map(i => i.food) }; });
  assert.deepEqual(r.today, ["t-rice:100"]); assert.deepEqual(r.tomorrow, ["t-rice2:100"]); assert.deepEqual(r.past, ["t-rice:100"]);
  assert.equal(r.res.meals, 6, "the six future days"); assert.equal(r.res.recipes, 0); assert.deepEqual(r.bowl, ["t-rice", "t-chicken", "t-oil"]);
});

test("same calories: the amount is scaled so the meal keeps its energy", async () => {
  const page = await start(); await addRice2(page);
  const r = await page.evaluate(() => { const t = addDays(todayISO(), 1); const before = dayTotals(S.days[t]).kcal; swapFood("t-rice", "t-rice2", { recipes: false, kcal: true }); return { qty: S.days[t].meals.d[0].qty, before: Math.round(before), after: Math.round(dayTotals(S.days[t]).kcal) }; });
  assert.equal(r.qty, 200); assert.equal(r.after, r.before);
});

test("plan and recipes: the recipe uses the new product too, and the meals you already ate keep what they were", async () => {
  const page = await start(); await addRice2(page);
  const r = await page.evaluate(() => { const t = todayISO(), y = addDays(t, -2); S.days[y] = { date: y, meals: { m: [{ id: "e1", kind: "recipe", ref: "t-bowl", qty: 1, eaten: true }] } }; DATA_V++; const kcal0 = Math.round(dayTotals(S.days[y], true).kcal);
    const res = swapFood("t-rice", "t-rice2", { recipes: true, kcal: false }); return { res, bowl: S.recipes["t-bowl"].ingredients.map(i => i.food), eaten: Math.round(dayTotals(S.days[y], true).kcal) === kcal0, snap: !!S.days[y].meals.m[0].snap }; });
  assert.equal(r.res.recipes, 1); assert.deepEqual(r.bowl, ["t-rice2", "t-chicken", "t-oil"]); assert.equal(r.eaten, true); assert.equal(r.snap, true);
});

test("one tap undoes the whole swap: days, recipes and the list", async () => {
  const page = await start(); await addRice2(page);
  const r = await page.evaluate(() => { const snapD = JSON.stringify(S.days), snapR = JSON.stringify(S.recipes); UI.shopStart = todayISO(); S.shop.range = 7; DATA_V++; const l0 = shoppingRows(todayISO(), 7).map(x => x.id).sort().join();
    swapFood("t-rice", "t-rice2", { recipes: true, kcal: false }); const l1 = shoppingRows(todayISO(), 7).map(x => x.id).sort().join(); toast.undo(); DATA_V++; const l2 = shoppingRows(todayISO(), 7).map(x => x.id).sort().join();
    return { l0, l1, l2, days: snapD === JSON.stringify(S.days), recipes: snapR === JSON.stringify(S.recipes) }; });
  assert.ok(r.l0.includes("t-rice") && !r.l0.includes("t-rice2")); assert.ok(r.l1.includes("t-rice2") && !r.l1.includes("t-rice,")); assert.equal(r.l2, r.l0); assert.equal(r.days, true); assert.equal(r.recipes, true);
});

test("from the Buy sheet: Replace → search → the summary says how many meals and recipes it touches → Replace", async () => {
  const page = await start(H.VIEWPORTS.phone); await addRice2(page);
  await page.evaluate(() => { UI.shopStart = todayISO(); S.shop.range = 7; DATA_V++; ACT["shop-buy"]({ dataset: { id: "t-rice" } }); });
  assert.equal(await page.evaluate(() => !!document.querySelector('.sheet [data-act="by-swap"]')), true);
  await page.evaluate(() => ACT["by-swap"]()); await page.fill("#sf-q", "light"); await page.waitForSelector('.sheet [data-act="sf-pick"]');
  await page.click('.sheet [data-act="sf-pick"]'); await page.waitForTimeout(100);
  const t = await page.evaluate(() => document.querySelector(".sheet").innerText); assert.match(t, /7 planned meals/); assert.match(t, /1 recipe/);
  assert.equal(await page.evaluate(() => { const s = document.querySelector(".sheet"); return s.scrollWidth > s.clientWidth + 1; }), false);
  await page.click('.sheet [data-act="sf-do"]'); await page.waitForTimeout(100);
  assert.equal(await page.evaluate(() => S.days[addDays(todayISO(), 1)].meals.d[0].ref), "t-rice2");
});

test("scanning the new product finds it in your foods and goes straight to the summary; an unknown one is registered first", async () => {
  const page = await start(); await addRice2(page);
  const r = await page.evaluate(async () => { UI.shopStart = todayISO(); S.shop.range = 7; DATA_V++; ACT["shop-buy"]({ dataset: { id: "t-rice" } }); ACT["by-swap"](); ACT["sf-scan"](); await lookupAndAdd("8000000000321"); await new Promise(r => setTimeout(r, 30)); const a = { type: UI.sheet.type, to: UI.sheet.to };
    ACT["by-swap"] ? 0 : 0; UI.sheet = null; ACT["shop-buy"]({ dataset: { id: "t-chicken" } }); ACT["by-swap"](); ACT["sf-scan"](); fetchOFF = async () => ({ notFound: true }); await lookupAndAdd("8000000000777"); await new Promise(r => setTimeout(r, 30)); ACT["scan-manual"]();
    const d = S_().draft; d.name = "Brand X chicken"; d.per.kcal = 120; d.per.p = 22; ACT["fd-save"](); await new Promise(r => setTimeout(r, 30)); const f = Object.values(S.foods).find(x => x.barcode === "8000000000777"); return { a, b: { type: UI.sheet.type, from: UI.sheet.from, to: UI.sheet.to === f?.id, saved: f?.name } }; });
  assert.deepEqual(r.a, { type: "swapfood", to: "t-rice2" }); assert.deepEqual(r.b, { type: "swapfood", from: "t-chicken", to: true, saved: "Brand X chicken" });
});

test("scan to tick: a product on the list is ticked and goes to the pantry; one that isn't on the list is left alone with a message; ticking twice does nothing", async () => {
  const page = await start(); await addRice2(page);
  const r = await page.evaluate(async () => { S.foods["t-chicken"].barcode = "8000000000444"; UI.shopStart = todayISO(); S.shop.range = 7; DATA_V++;
    await ACT["shop-scan"](); await lookupAndAdd("8000000000444"); await new Promise(r => setTimeout(r, 30)); const a = { stock: S.shop.pantry["t-chicken"]?.g || 0, buys: (S.shop.buys || []).length, dest: UI.dest, sheet: UI.sheet?.type ?? null };
    await ACT["shop-scan"](); await lookupAndAdd("8000000000444"); await new Promise(r => setTimeout(r, 30)); const b = { stock: S.shop.pantry["t-chicken"]?.g || 0, buys: (S.shop.buys || []).length };
    await ACT["shop-scan"](); await lookupAndAdd("8000000000321"); await new Promise(r => setTimeout(r, 30)); const c = { stock: S.shop.pantry["t-rice2"]?.g || 0, msg: document.querySelector("#toast")?.innerText || "" };
    return { a, b, c }; });
  assert.ok(r.a.stock >= 400); assert.equal(r.a.buys, 1); assert.equal(r.a.dest, null); assert.equal(r.a.sheet, null); assert.deepEqual([r.b.stock, r.b.buys], [r.a.stock, 1]);
  assert.equal(r.c.stock, 0); assert.match(r.c.msg, /isn't on your list/);
});

test("the list has a Scan button, and the swap sheet fits all three screens", async () => {
  for (const vp of Object.values(H.VIEWPORTS)) {
    const page = await start(vp); await addRice2(page);
    await page.evaluate(() => { UI.tab = "shop"; UI.shopStart = todayISO(); S.shop.range = 7; scheduleRender(); }); await page.waitForSelector('[data-act="shop-scan"]');
    const r = await page.evaluate(() => { openSheet("swapfood", { from: "t-rice", to: "t-rice2" }); const s = document.querySelector(".sheet"); return { over: s.scrollWidth > s.clientWidth + 1 || document.documentElement.scrollWidth > innerWidth, cut: [...s.querySelectorAll("button")].some(x => x.scrollWidth > x.clientWidth + 1 && getComputedStyle(x).overflow !== "visible") }; });
    assert.deepEqual(r, { over: false, cut: false }, vp.width + "px"); await app.close(); app = null;
  }
});
