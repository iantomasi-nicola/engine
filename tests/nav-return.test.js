/* Coming back to where you were: the shopping list opened from Today stays the place you return to; finishing a shopping by mistake can be undone; aisles and pack sizes. Synthetic data only. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let dir, app;
test.before(async () => { dir = H.build(H.tmp("nav-build")); });
test.afterEach(async () => { await app?.close(); app = null; });
const start = async (viewport = H.VIEWPORTS.phone) => { app = await H.startApp({ dir, seed: F.seed({ withPantry: true }), viewport }); await app.page.evaluate(() => { UI.shopStart = todayISO(); S.shop.range = 7; DATA_V++; }); return app.page; };
const type = page => page.evaluate(() => UI.sheet?.type ?? null);

test("the shopping list opened from Today: a product's sheet, its editor and the store picker all come back to the list, and Done on a product puts it in the cart and returns to the list", async () => {
  const page = await start();
  await page.evaluate(() => ACT["shopq-open"]());
  await page.evaluate(() => ACT["shop-buy"]({ dataset: { id: "t-chicken" } })); assert.equal(await type(page), "buy");
  await page.evaluate(() => ACT["close-sheet"]()); assert.equal(await type(page), "shopq", "closing a product returns to the list");
  await page.evaluate(() => { ACT["shop-buy"]({ dataset: { id: "t-chicken" } }); ACT["by-edit"](); }); assert.equal(await type(page), "food");
  await page.evaluate(() => { S_().draft.brand = "Bird"; ACT["fd-save"](); }); assert.equal(await type(page), "buy", "saving the food comes back to the product"); 
  await page.evaluate(() => ACT["close-sheet"]()); assert.equal(await type(page), "shopq");
  await page.evaluate(() => ACT["stores-open"]()); assert.equal(await type(page), "stores"); await page.evaluate(() => ACT["stores-done"]()); assert.equal(await type(page), "shopq");
  const r = await page.evaluate(() => { ACT["shop-buy"]({ dataset: { id: "t-chicken" } }); ACT["by-ok"](); return { sheet: UI.sheet?.type, ticked: !!S.shop.checked["t-chicken"], row: !!document.querySelector('.sheet .shop-row.done[data-id="t-chicken"]') }; });
  assert.deepEqual(r, { sheet: "shopq", ticked: true, row: true });
  await page.evaluate(() => ACT["close-sheet"]()); assert.equal(await type(page), null, "from the list itself, closing leaves");
});

test("the list keeps its scroll position when you come back, and replacing a product returns straight to the list", async () => {
  const page = await start();
  await page.evaluate(() => { for (let i = 0; i < 25; i++) S.shop.extras.push({ id: "e" + i, text: "Extra " + i, done: false }); DATA_V++; ACT["shopq-open"](); });
  const y = await page.evaluate(() => { const b = document.querySelector(".sheet-b"); b.scrollTop = 200; return b.scrollTop; }); assert.ok(y > 0);
  await page.evaluate(() => { ACT["shop-buy"]({ dataset: { id: "t-rice" } }); ACT["close-sheet"](); });
  assert.equal(await page.evaluate(() => Math.round(document.querySelector(".sheet-b").scrollTop)), Math.round(y), "same place in the list");
  await page.evaluate(() => { S.foods["t-rice2"] = { id: "t-rice2", name: "Light rice", unit: "g", per: { kcal: 175, p: 4, c: 39, f: .5, fib: 0 }, servings: [], pack: 500, cat: "pantry", role: "C", meals: ["m", "d"], source: "custom" }; ACT["shop-buy"]({ dataset: { id: "t-rice" } }); ACT["by-swap"](); ACT["sf-pick"]({ dataset: { id: "t-rice2" } }); ACT["sf-do"](); });
  assert.equal(await type(page), "shopq");
});

test("opened from the Shopping tab (not a list sheet) closing a product still just closes it", async () => {
  const page = await start();
  await page.evaluate(() => { UI.tab = "shop"; scheduleRender(); ACT["shop-buy"]({ dataset: { id: "t-rice" } }); ACT["close-sheet"](); }); assert.equal(await type(page), null);
});

test("Finish shopping by mistake: the toast and a line on the list undo it, putting back the cart, the pantry and the history", async () => {
  const page = await start();
  const r = await page.evaluate(() => { const pan0 = JSON.stringify(S.shop.pantry), buys0 = (S.shop.buys || []).length; S.shop.checked = { "t-chicken": { g: 400, eur: 5 } }; DATA_V++; ACT["shop-done"]();
    const after = { chicken: S.shop.pantry["t-chicken"]?.g || 0, buys: S.shop.buys.length - buys0, ticked: Object.keys(S.shop.checked).length, line: !!document.querySelector('[data-act="trip-undo"]') || /moved to the pantry/.test(shopPanel(false).h) };
    toast.undo(); const back = { chicken: S.shop.pantry["t-chicken"]?.g || 0, buys: (S.shop.buys || []).length - buys0, ticked: Object.keys(S.shop.checked), pan: JSON.stringify(S.shop.pantry) === pan0 };
    ACT["shop-done"] && 0; return { after, back }; });
  assert.deepEqual(r.after, { chicken: 400, buys: 1, ticked: 0, line: true }); assert.deepEqual(r.back, { chicken: 0, buys: 0, ticked: ["t-chicken"], pan: true });
  const later = await page.evaluate(() => { ACT["shop-done"](); const had = /moved to the pantry/.test(shopPanel(false).h); ACT["trip-undo"](); return { had, ticked: Object.keys(S.shop.checked).length, gone: !/moved to the pantry/.test(shopPanel(false).h) }; });
  assert.deepEqual(later, { had: true, ticked: 1, gone: true });
});

test("a tick in the list can be taken back at any time: the product stays on the list under «Ticked today», and tapping its tick puts the pantry and the history back", async () => {
  const page = await start(); await page.evaluate(() => { UI.tab = "shop"; scheduleRender(); }); await page.waitForSelector('.shop-row[data-id="t-chicken"] .chk');
  const before = await page.evaluate(() => ({ pan: S.shop.pantry["t-chicken"]?.g || 0, buys: (S.shop.buys || []).length }));
  await page.click('.shop-row[data-id="t-chicken"] .chk'); await page.waitForSelector(".sq-got .shop-row");
  const mid = await page.evaluate(() => ({ pan: S.shop.pantry["t-chicken"]?.g || 0, buys: S.shop.buys.length, listed: [...document.querySelectorAll(".sq-got .t")].map(x => x.innerText), still: !!document.querySelector('.shop-list .shop-row[data-id="t-chicken"]') }));
  assert.ok(mid.pan > before.pan); assert.equal(mid.buys, before.buys + 1); assert.deepEqual(mid.listed, ["Test chicken"]); assert.equal(mid.still, false);
  await page.waitForTimeout(5500);   // long after the Undo toast is gone
  await page.click('.sq-got .chk'); await page.waitForSelector('.shop-list .shop-row[data-id="t-chicken"]');
  const after = await page.evaluate(() => ({ pan: S.shop.pantry["t-chicken"]?.g || 0, buys: (S.shop.buys || []).length, section: !!document.querySelector(".sq-got") }));
  assert.deepEqual(after, { pan: before.pan, buys: before.buys, section: false });
});

test("aisles: drinks that are not drinks (chickpeas, bread) go where their name says, a drink you chose or a real drink stays, and the name beats a broad Open Food Facts tag", async () => {
  const page = await start();
  const r = await page.evaluate(() => { const mk = (id, name, cat, o = {}) => ({ id, name, unit: "g", per: { kcal: 100, p: 5, c: 10, f: 2 }, servings: [], pack: 0, cat, role: "C", meals: ["m"], source: "off", ...o }); S.foods.a1 = mk("a1", "Ceci in scatola", "drinks"); S.foods.a2 = mk("a2", "Pane integrale", "drinks"); S.foods.a3 = mk("a3", "Cola zero", "drinks", { unit: "ml" }); S.foods.a4 = mk("a4", "Strange thing", "drinks", { catUser: true }); S.foods.a5 = mk("a5", "Mystery solid", "drinks");
    const n = catFix(); const c = id => S.foods[id].cat; return { n, a1: c("a1"), a2: c("a2"), a3: c("a3"), a4: c("a4"), a5: c("a5") }; });
  assert.deepEqual(r, { n: 3, a1: "pantry", a2: "bakery", a3: "drinks", a4: "drinks", a5: "pantry" });
});

test("the same food in another pack size is another product, not a duplicate; the same pack size still is", async () => {
  const page = await start();
  const r = await page.evaluate(() => { S.foods["t-rice"].pack = 1000; S.foods["t-rice"].brand = "Acme"; DATA_V++; const d = pack => ({ ...blankFood(), name: "Test rice", brand: "Acme", pack, per: { ...S.foods["t-rice"].per } }); const n = x => { const X = foodDupes(x); return X.name.length + X.values.length; };
    const v = pack => ({ ...d(pack), name: "Other name" }); return { same: n(d(1000)), other: n(d(500)), none: n(d(0)), vSame: n(v(1000)), vOther: n(v(500)) }; });
  assert.deepEqual(r, { same: 1, other: 0, none: 1, vSame: 1, vOther: 0 });
});
