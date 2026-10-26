/* M5d, Shopping: L203 «Use something from home» rebuilt (a button opens the whole pantry, any food can be chosen, «Not at home? Add it» stays in the flow)
   and L204 (a product inside a planned recipe: only those planned meals change, through a local copy of the recipe on the item; the saved recipe never changes).
   Synthetic data only. Hand-computed values:
   L203 fixture: rice (C: kcal 350, p7 c78 f1) 500 g planned tomorrow, nothing at home. Pasta (C: p12 c65 f1.5) 1000 g at home: 500*78/65 = 600 g.
     Bread (C: p9 c50 f3) 1000 g: 500*78/50 = 780 g. Cereal (C: p8 c60 f2) only 100 g: 500*78/60 = 650 g, only 100 g free. Chicken (P: kcal 110, no carbs) 1000 g:
     no carbs to match, so the calories do: 500*350/110 = 1590.9 g (listed as 1591 g, the plan gets 1590.9).
     Suggested (same role, enough free): pasta, bread (closest macros first); then the rest by name: cereal, chicken.
   Cereal is picked: the plan gets 650 g, the stock covers 100 g, so cereal is to buy for 650 - 100 = 550 g and rice is gone.
   L204 fixture: pasta 2000 g at home. Tomorrow (t1): bowl x2 servings (the bowl has rice 200 g, chicken 300 g, oil 10 g for 2 servings) and 300 g rice as dinner.
     t2: bowl x1 serving. t3: bowl x2 already eaten. t8 (outside the 7 days): bowl x2. Yesterday: bowl x2. t2 dinner: a recipe without rice.
     Rice in the window = 200 (t1 bowl) + 300 (t1 dinner) + 100 (t2 bowl: 200 g * 1/2) = 600 g; eaten bowl on t3 does not count.
     Pasta = 600 * 78/65 = 720 g: the dinner becomes 360 g, the t1 bowl keeps 2 servings with pasta 240 g, the t2 bowl 1 serving: 240 * 1/2 = 120 g -> 360 + 240 + 120 = 720. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let dir, app;
test.before(async () => { dir = H.build(H.tmp("m5d-shop-build")); });
test.afterEach(async () => { await app?.close(); app = null; });
const start = async (seed = F.seed({ withPlan: false }), vp = H.VIEWPORTS.phone) => { app = await H.startApp({ dir, seed, viewport: vp }); return app.page; };
const wait = (page, ms = 150) => page.waitForTimeout(ms);
const FOODS = `const mk = (id, name, kcal, p, c, f, role) => ({ id, name, brand: "", unit: "g", per: { kcal, p, c, f, fib: 0 }, servings: [], pack: 0, cat: "pantry", role, meals: ["m", "d"], source: "custom" });
  S.foods["t-pasta"] = mk("t-pasta", "Test pasta", 355, 12, 65, 1.5, "C"); S.foods["t-bread"] = mk("t-bread", "Test bread", 280, 9, 50, 3, "C"); S.foods["t-cereal"] = mk("t-cereal", "Test cereal", 300, 8, 60, 2, "C");
  S.foods["t-oats"] = mk("t-oats", "Test oats", 370, 13, 60, 7, "C");`;
const L203 = async () => {
  const page = await start();
  await page.evaluate(new Function(`${FOODS}
    const t = addDays(todayISO(), 1); S.days[t] = { date: t, meals: { d: [{ id: "h1", kind: "food", ref: "t-rice", qty: 500, eaten: false }] } };
    S.shop.pantry = { "t-pasta": { g: 1000 }, "t-bread": { g: 1000 }, "t-cereal": { g: 100 }, "t-chicken": { g: 1000 } }; UI.shopStart = todayISO(); S.shop.range = 7; DATA_V++;`));
  return page;
};
const L204 = async () => {
  const page = await start();
  await page.evaluate(new Function(`${FOODS}
    S.recipes["t-plain"] = { id: "t-plain", name: "Plain", servings: 1, meals: ["d"], source: "custom", note: "", ingredients: [{ food: "t-chicken", g: 100 }] };
    const D = n => addDays(todayISO(), n), bowl = (id, qty, eaten) => ({ id, kind: "recipe", ref: "t-bowl", qty, eaten: !!eaten });
    S.days[D(-1)] = { date: D(-1), meals: { m: [bowl("b0", 2)] } };
    S.days[D(1)] = { date: D(1), meals: { m: [bowl("b1", 2)], d: [{ id: "r1", kind: "food", ref: "t-rice", qty: 300, eaten: false }] } };
    S.days[D(2)] = { date: D(2), meals: { m: [bowl("b2", 1)], d: [{ id: "p2", kind: "recipe", ref: "t-plain", qty: 1, eaten: false }] } };
    S.days[D(3)] = { date: D(3), meals: { m: [bowl("b3", 2, true)] } };
    S.days[D(8)] = { date: D(8), meals: { m: [bowl("b8", 2)] } };
    S.shop.pantry = { "t-pasta": { g: 2000 } }; UI.shopStart = todayISO(); S.shop.range = 7; DATA_V++;`));
  return page;
};

/* ---------- L203 ---------- */
test("L203: every pantry food is a candidate, the suggested ones (same role, enough free stock) first, with the grams they need", async () => {
  const page = await L203();
  const r = await page.evaluate(() => homeSwaps("t-rice").map(x => [x.food.id, x.qFrom, x.qTo, x.suggested, x.key]));
  assert.deepEqual(r, [["t-pasta", 500, 600, true, "c"], ["t-bread", 500, 780, true, "c"], ["t-cereal", 500, 650, false, "c"], ["t-chicken", 500, 1591, false, "kcal"]]);
});

test("L203: the buy sheet has a button (no fold of suggestions); it opens the pantry picker with every food and a search", async () => {
  const page = await L203();
  const r = await page.evaluate(async () => {
    ACT["shop-buy"]({ dataset: { id: "t-rice" } }); await new Promise(x => setTimeout(x, 120));
    const fold = !!document.querySelector('.sheet [data-act="fold-tog"][data-id="home"]'), btn = document.querySelector('.sheet [data-act="hm-open"]');
    btn.click(); await new Promise(x => setTimeout(x, 150));
    const type = UI.sheet.type, parent = UI.sheet._ret?.type, rows = [...document.querySelectorAll('.sheet [data-act="hm-pick"]')].map(b => b.dataset.id);
    INP["hm-q"]("chick"); await new Promise(x => setTimeout(x, 150));
    const found = [...document.querySelectorAll('.sheet [data-act="hm-pick"]')].map(b => b.dataset.id), add = !!document.querySelector('.sheet [data-act="hm-add"]');
    return { fold, type, parent, rows, found, add };
  });
  assert.deepEqual(r, { fold: false, type: "homepick", parent: "buy", rows: ["t-pasta", "t-bread", "t-cereal", "t-chicken"], found: ["t-chicken"], add: true });
  assert.deepEqual(app.errors, []);
});

test("L203: the pantry filters apply (Spare hides what the plan sets aside)", async () => {
  const page = await L203();
  const r = await page.evaluate(async () => {
    const t = addDays(todayISO(), 2); S.days[t] = { date: t, meals: { d: [{ id: "h2", kind: "food", ref: "t-pasta", qty: 990, eaten: false }] } }; DATA_V++;
    ACT["shop-buy"]({ dataset: { id: "t-rice" } }); ACT["hm-open"]({ dataset: { id: "t-rice" } }); ACT["hm-filter"]({ dataset: { k: "spare" } }); await new Promise(x => setTimeout(x, 120));
    return [...document.querySelectorAll('.sheet [data-act="hm-pick"]')].map(b => b.dataset.id);
  });
  /* pasta: 1000 at home, 990 planned -> 10 g spare (< 20 g): out of «Spare»; cereal 100 g and the others stay */
  assert.deepEqual(r, ["t-bread", "t-cereal", "t-chicken"]);
});

test("L203: choosing a food NOT among the suggested shows the grams and the shortfall; one tap swaps, the row goes, the stock is untouched, one Undo brings it back", async () => {
  const page = await L203();
  const r = await page.evaluate(async () => {
    const pan0 = JSON.stringify(S.shop.pantry), t = addDays(todayISO(), 1), ids = () => shoppingRows(todayISO(), 7).map(x => x.id + ":" + x.buy).join();
    ACT["shop-buy"]({ dataset: { id: "t-rice" } }); ACT["hm-open"]({ dataset: { id: "t-rice" } }); ACT["hm-pick"]({ dataset: { id: "t-cereal" } }); await new Promise(x => setTimeout(x, 120));
    const txt = document.querySelector(".sheet-b").textContent.replace(/\s+/g, " "), rows0 = ids();
    document.querySelector('.sheet [data-act="home-swap"]').click(); await new Promise(x => setTimeout(x, 150));
    const sheet = UI.sheet, item = S.days[t].meals.d[0], rows1 = ids(), pan = JSON.stringify(S.shop.pantry) === pan0, undo = typeof toast.undo;
    toast.undo(); DATA_V++;
    return { txt, rows0, sheet, ref: item.ref, qty: item.qty, rows1, pan, undo, back: ids(), refBack: S.days[t].meals.d[0].ref, qtyBack: S.days[t].meals.d[0].qty };
  });
  assert.match(r.txt, /500 g of Test rice/); assert.match(r.txt, /650 g/); assert.match(r.txt, /Only 100 g/);
  assert.equal(r.rows0, "t-rice:500"); assert.equal(r.sheet, null, "the whole flow closed: nothing was open before the buy sheet");
  assert.equal(r.ref, "t-cereal"); assert.equal(r.qty, 650); assert.equal(r.rows1, "t-cereal:550"); assert.equal(r.pan, true); assert.equal(r.undo, "function");
  assert.equal(r.back, "t-rice:500"); assert.equal(r.refBack, "t-rice"); assert.equal(r.qtyBack, 500);
  assert.deepEqual(app.errors, []);
});

test("L203: a food with no carbs is matched by calories (chicken for rice: 500 g * 350 / 110 = 1590.9 g)", async () => {
  const page = await L203();
  const r = await page.evaluate(() => { ACT["home-swap"]({ dataset: { id: "t-rice", to: "t-chicken" } }); return S.days[addDays(todayISO(), 1)].meals.d[0].qty; });
  assert.equal(r, 1590.9);
});

test("L203: «Not at home? Add it» adds the food to the pantry and returns to the picker with it chosen; closing steps back through the flow", async () => {
  const page = await L203();
  const r = await page.evaluate(async () => {
    const w = () => new Promise(x => setTimeout(x, 120));
    ACT["shop-buy"]({ dataset: { id: "t-rice" } }); ACT["hm-open"]({ dataset: { id: "t-rice" } }); await w();
    const add = document.querySelector('.sheet [data-act="hm-add"]'); add.click(); await w();
    const t1 = UI.sheet.type, dest = UI.dest;
    ACT["pd-pick"]({ dataset: { id: "t-oats" } }); await w(); const t2 = UI.sheet.type, f2 = UI.sheet.food;
    UI.sheet.g = 400; ACT["pa-save"](); await w();
    const sh = UI.sheet, txt = document.querySelector(".sheet-b").textContent.replace(/\s+/g, " ");
    const out = { t1, dest, t2, f2, type: sh.type, to: sh.to, parent: sh._ret?.type, stock: S.shop.pantry["t-oats"]?.g, txt };
    ACT["close-sheet"](); await w(); out.afterClose = UI.sheet.type; ACT["close-sheet"](); await w(); out.afterClose2 = UI.sheet;
    return out;
  });
  assert.equal(r.t1, "prodadd"); assert.equal(r.dest, "pantry"); assert.equal(r.t2, "pantry"); assert.equal(r.f2, "t-oats");
  assert.equal(r.type, "homepick"); assert.equal(r.to, "t-oats"); assert.equal(r.parent, "buy"); assert.equal(r.stock, 400);
  /* oats c60: 500 * 78 / 60 = 650 g, 400 g at home */
  assert.match(r.txt, /650 g/); assert.match(r.txt, /Only 400 g/);
  assert.equal(r.afterClose, "buy"); assert.equal(r.afterClose2, null);
  assert.deepEqual(app.errors, []);
});

test("Add dialog: cancelling the pantry sheet and picking again still goes to the pantry (the destination is kept by the sheet)", async () => {
  const page = await L203();
  const r = await page.evaluate(async () => {
    const w = () => new Promise(x => setTimeout(x, 100));
    ACT["pantry-prod"](); await w(); ACT["pd-pick"]({ dataset: { id: "t-oats" } }); await w(); ACT["close-sheet"](); await w();
    const back = UI.sheet.type; ACT["pd-pick"]({ dataset: { id: "t-bread" } }); await w();
    return { back, now: UI.sheet.type, food: UI.sheet.food };
  });
  assert.deepEqual(r, { back: "prodadd", now: "pantry", food: "t-bread" });
});

test("L203: the picker follows Back like every other step (Back from the picker shows the buy sheet again)", async () => {
  const page = await L203();
  await page.evaluate(() => { ACT["tab"]({ dataset: { tab: "shop" } }); }); await wait(page, 250);
  await page.evaluate(() => ACT["shop-buy"]({ dataset: { id: "t-rice" } })); await wait(page, 250);
  await page.evaluate(() => ACT["hm-open"]({ dataset: { id: "t-rice" } })); await wait(page, 250);
  assert.equal(await page.evaluate(() => UI.sheet.type), "homepick");
  await page.goBack().catch(() => {}); await wait(page, 300);
  assert.deepEqual(await page.evaluate(() => [UI.tab, UI.sheet?.type ?? null]), ["shop", "buy"]);
  await page.goBack().catch(() => {}); await wait(page, 300);
  assert.deepEqual(await page.evaluate(() => [UI.tab, UI.sheet?.type ?? null]), ["shop", null]);
  assert.deepEqual(app.errors, []);
});

test("L203: nothing is offered when the product is not on the list", async () => {
  const page = await start(F.seed({ withPlan: true }));
  const r = await page.evaluate(async () => { UI.shopStart = todayISO(); S.shop.pantry = { "t-rice": { g: 5000 } }; DATA_V++; ACT["shop-buy"]({ dataset: { id: "t-rice" } }); await new Promise(x => setTimeout(x, 120)); return [homeSwaps("t-rice").length, !!document.querySelector('.sheet [data-act="hm-open"]')]; });
  assert.deepEqual(r, [0, false]);
});

