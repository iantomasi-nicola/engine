/* M3b (3): where a food is bought is a field of the food (several stores allowed); everything you had is Lidl once; scanning inside a store filter; brand on the list; the list from Today is full screen. Synthetic data only. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let dir, app;
test.before(async () => { dir = H.build(H.tmp("stfood-build")); });
test.afterEach(async () => { await app?.close(); app = null; });
const start = async (viewport, seed = F.seed()) => { app = await H.startApp({ dir, seed, viewport }); return app.page; };
const noMig = () => { const s = F.seed(); delete s.shop.mig; return s; };

test("once, every food you had is bought at Lidl: a food that already has a store is left alone, the toast undoes it, and it never runs twice", async () => {
  const page = await start(undefined, noMig());
  const r = await page.evaluate(() => { const a = storeAdd("Other"); setFoodStores("t-oil", [a]); const n0 = Object.keys(S.foods).length;
    storesMigrate(); const lidl = storeList().find(x => x.name === "Lidl")?.id; const st = id => foodStores(id).map(storeName).join(",");
    const after = { rice: st("t-rice"), chicken: st("t-chicken"), oil: st("t-oil"), flag: S.shop.mig?.lidl, n: Object.keys(S.foods).length === n0 };
    storesMigrate(); const again = storeList().filter(x => x.name === "Lidl").length; toast.undo(); const undone = { rice: st("t-rice"), flag: S.shop.mig?.lidl, oil: st("t-oil") };
    storesMigrate(); return { after, again, undone, still: st("t-rice") }; });
  assert.deepEqual(r.after, { rice: "Lidl", chicken: "Lidl", oil: "Other", flag: 1, n: true }); assert.equal(r.again, 1);
  assert.deepEqual(r.undone, { rice: "", flag: 1, oil: "Other" }); assert.equal(r.still, "", "after Undo it is not applied again");
});

test("the earlier «usual store» of a food becomes the food's own field", async () => {
  const page = await start(undefined, noMig());
  const r = await page.evaluate(() => { const a = storeAdd("A"); S.shop.pref = { "t-rice": a }; S.shop.mig = { lidl: 1 }; storesMigrate(); return { st: foodStores("t-rice").map(storeName), pref: S.shop.pref ?? null }; });
  assert.deepEqual(r, { st: ["A"], pref: null });
});

test("the same product can be bought at several stores: it is on the list of each, and not on the list of a store that doesn't have it", async () => {
  const page = await start();
  const r = await page.evaluate(() => { const a = storeAdd("A"), b = storeAdd("B"), c = storeAdd("C"); setFoodStores("t-rice", [a, b]); setFoodStores("t-chicken", [c]); const names = sid => { S.shop.store = sid; DATA_V++; const d = document.createElement("div"); d.innerHTML = shopPanel(false).h; return { here: [...d.querySelectorAll(".shop-row .t")].filter(x => !x.closest(".shop-other")).map(x => x.innerText).sort(), other: [...d.querySelectorAll(".shop-other .shop-row .t")].map(x => x.innerText).sort() }; };
    return { a: names(a), b: names(b), c: names(c) }; });
  assert.ok(r.a.here.includes("Test rice") && r.b.here.includes("Test rice") && !r.c.here.includes("Test rice")); assert.ok(r.c.other.includes("Test rice") && r.a.other.includes("Test chicken") && r.c.here.includes("Test chicken"));
});

test("scanning inside a store filter: a new product is bought at that store; a product you already have is not duplicated, that store is added to it", async () => {
  const page = await start();
  const r = await page.evaluate(async () => { const a = storeAdd("A"), b = storeAdd("B"); S.shop.store = b; UI.tab = "shop"; DATA_V++;
    S.foods["t-rice"].barcode = "8000000000111"; setFoodStores("t-rice", [a]); const n0 = Object.keys(S.foods).length;
    openSheet("scan", { date: UI.date, meal: "m", stage: "start" }); await lookupAndAdd("8000000000111"); const known = { n: Object.keys(S.foods).length === n0, st: foodStores("t-rice").map(storeName) };
    fetchOFF = async c => ({ food: { id: "bc-" + c, name: "New product", brand: "Brand Z", barcode: c, unit: "g", per: { kcal: 100, p: 5, c: 10, f: 2, fib: 0 }, servings: [], pack: 500, cat: "pantry", role: "C", meals: ["m"], source: "off" } });
    UI.sheet = null; openSheet("scan", { date: UI.date, meal: "m", stage: "start" }); await lookupAndAdd("8000000000999"); await new Promise(r => setTimeout(r, 30));
    return { known, fresh: foodStores("bc-8000000000999").map(storeName) }; });
  assert.deepEqual(r.known, { n: true, st: ["A", "B"] }); assert.deepEqual(r.fresh, ["B"]);
});

test("a food typed in by hand inside a store filter is bought at that store; with no filter it has no store", async () => {
  const page = await start();
  const r = await page.evaluate(() => { const a = storeAdd("A"); S.shop.store = a; openSheet("food", { draft: blankFood("Hand made"), isNew: true }); S_().draft.per.kcal = 100; ACT["fd-save"](); const x = Object.values(S.foods).find(f => f.name === "Hand made");
    S.shop.store = null; openSheet("food", { draft: blankFood("Hand made 2"), isNew: true }); S_().draft.per.kcal = 100; ACT["fd-save"](); const y = Object.values(S.foods).find(f => f.name === "Hand made 2"); return { x: x.stores, y: y.stores ?? null }; });
  assert.equal(r.x.length, 1); assert.equal(r.y, null);
});

test("the food editor has a «Bought at» field: pick several stores, add one on the spot, and it is saved with the food", async () => {
  const page = await start(H.VIEWPORTS.phone);
  await page.evaluate(() => { storeAdd("A"); openSheet("food", { draft: clone(S.foods["t-rice"]), isNew: false }); });
  const r = await page.evaluate(async () => { const ids = storeList().map(x => x.id); ACT["fd-store"]({ dataset: { id: ids[0] } }); ACT["fd-store-new"](); await new Promise(r => setTimeout(r, 60)); document.querySelector("#fd-st-in").value = "Lidl"; ACT["fd-store-add"](); ACT["fd-save"](); return foodStores("t-rice").map(storeName); });
  assert.deepEqual(r, ["A", "Lidl"]);
});

test("the brand is small on the list rows, and the list opened from Today takes the whole screen (and the store picker comes back to it)", async () => {
  for (const vp of Object.values(H.VIEWPORTS)) {
    const page = await start(vp); await page.evaluate(() => { S.foods["t-chicken"].brand = "Brand Q"; UI.shopStart = todayISO(); S.shop.range = 7; DATA_V++; scheduleRender(); });
    await page.waitForSelector('[data-act="shopq-open"]'); await page.click('.td-nudges [data-act="shopq-open"]'); await page.waitForSelector(".sheet.full");
    const r = await page.evaluate(() => { const s = { width: document.querySelector(".sheet").offsetWidth, height: document.querySelector(".sheet").offsetHeight }, row = [...document.querySelectorAll(".sheet .shop-row")].find(x => /chicken/i.test(x.innerText)); return { w: s.width, h: s.height, brand: /Brand Q/.test(row?.querySelector(".s")?.innerText || ""), over: document.querySelector(".sheet").scrollWidth > document.querySelector(".sheet").clientWidth + 1 }; });
    if (vp.width < 1024) { assert.equal(r.w, vp.width, vp.width + " wide"); assert.equal(r.h, vp.height, vp.width + " tall"); } else assert.ok(r.h > vp.height * .9 && r.w <= 720, "desktop panel");
    assert.equal(r.brand, true); assert.equal(r.over, false);
    await page.evaluate(() => { storeAdd("A"); DATA_V++; renderSheet(); }); await page.click(".sheet .st-pill"); await page.waitForSelector('.sheet [data-act="store-pick"]');
    await page.click('.sheet [data-act="store-pick"] >> nth=1'); await page.waitForTimeout(150);
    assert.equal(await page.evaluate(() => UI.sheet?.type), "shopq", "back on the list"); await app.close(); app = null;
  }
});
