/* M14b group E, second round: undo that restores only what the action changed, ids escaped, estimates not counted as spent,
   renewed stock without the old use-by, receipt line kept until saved, tap targets. Synthetic data only. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let dir, app;
test.before(async () => { dir = H.build(H.tmp("m14b-ef2-build")); });
test.afterEach(async () => { await app?.close(); app = null; });
const start = async (seed = F.seed({ withPlan: false }), vp = H.VIEWPORTS.desktop) => { app = await H.startApp({ dir, seed, viewport: vp }); return app.page; };

test("each pantry Undo restores its own item: «Used up» of rice after a + on oil", async () => {
  const page = await start();
  const r = await page.evaluate(() => {
    S.shop.pantry = { "t-rice": { g: 500 }, "t-oil": { g: 300 } }; DATA_V++;
    ACT["stock-zero"]({ dataset: { id: "t-rice" } }); const u1 = toast.undo;
    ACT["stock-step"]({ dataset: { id: "t-oil", d: "1" } }); const oil = S.shop.pantry["t-oil"].g;
    u1(); return { rice: S.shop.pantry["t-rice"]?.g, oil: S.shop.pantry["t-oil"].g, oilAfterStep: oil };
  });
  assert.equal(r.rice, 500); assert.equal(r.oil, r.oilAfterStep);
});

test("Undo of «Finish shopping» takes back only the shopping: a meal eaten afterwards keeps its stock change", async () => {
  const page = await start();
  const r = await page.evaluate(() => {
    S.shop.pantry = { "t-rice": { g: 900 } }; S.shop.checked = { "t-chicken": { g: 400, eur: 4 } }; DATA_V++; ACT["shop-done"]();
    const had = S.shop.pantry["t-chicken"]?.g, nb = S.shop.buys.length;
    stockSet("t-rice", 600); undoTrip();
    return { had, nb, rice: S.shop.pantry["t-rice"].g, chicken: S.shop.pantry["t-chicken"] ?? null, buys: S.shop.buys.length };
  });
  assert.deepEqual(r, { had: 400, nb: 1, rice: 600, chicken: null, buys: 0 });
});

test("Undo of the receipt takes back its rows only, a later pantry change stays", async () => {
  const page = await start();
  const r = await page.evaluate(() => {
    S.shop.pantry = { "t-rice": { g: 100 }, "t-oil": { g: 300 } }; DATA_V++;
    UI.sheet = { type: "receipt", res: { rows: [{ id: "t-chicken", g: 400, eur: 4 }], todo: [], total: 4 } }; ACT["rc-load"](); const u = toast.undo;
    stockSet("t-oil", 250); u();
    return { chicken: S.shop.pantry["t-chicken"] ?? null, oil: S.shop.pantry["t-oil"].g, rice: S.shop.pantry["t-rice"].g, buys: S.shop.buys.length };
  });
  assert.deepEqual(r, { chicken: null, oil: 250, rice: 100, buys: 0 });
});

test("an id with a quote cannot add an attribute to the pantry list", async () => {
  const page = await start();
  const r = await page.evaluate(async () => {
    const id = 'x" onfocus="window.__pwn=1" autofocus="'; S.foods[id] = { id, name: "Evil", brand: "", unit: "g", per: { kcal: 1, p: 0, c: 0, f: 0, fib: 0 }, servings: [], pack: 0, cat: "pantry", role: "C", meals: ["m"], source: "custom" };
    S.shop.pantry = { [id]: { g: 100 } }; UI.tab = "pantry"; UI.fuelTab = "pantry"; DATA_V++; render(); await new Promise(x => setTimeout(x, 100));
    return { attr: document.querySelectorAll("[onfocus]").length, rows: document.querySelectorAll(".pan-row").length };
  });
  assert.equal(r.attr, 0); assert.equal(r.rows, 1);
});

test("an estimated price is not money spent (history, week total and the Finish toast)", async () => {
  const page = await start();
  const r = await page.evaluate(() => {
    const t = todayISO(); S.shop.buys = [{ d: t, id: "t-oil", n: "Test oil", g: 500, eur: 4, est: true }, { d: t, id: "t-rice", n: "Test rice", g: 1000, eur: 2 }];
    const s = spendIn(addDays(t, -7), t); return { total: s.total, unpriced: s.unpriced };
  });
  assert.equal(r.total, 2); assert.equal(r.unpriced, 1);
});

test("a stock used up and bought again does not inherit the old use-by date", async () => {
  const page = await start();
  const r = await page.evaluate(() => { S.shop.pantry = { "t-rice": { g: 0, exp: addDays(todayISO(), -5) } }; stockAdd("t-rice", 1000); return S.shop.pantry["t-rice"]; });
  assert.equal(r.g, 1000); assert.ok(!r.exp);
});

test("a receipt line you start a new food for stays on the list until the food is saved; closing the sheet forgets the pending match", async () => {
  const page = await start();
  const r = await page.evaluate(() => {
    S.shop.rcTodo = [{ id: "rt1", name: "Mystery Cheese", qty: 1, eur: 3 }]; ACT["rcp-new"]({ dataset: { id: "rt1" } }); const during = UI.rcLearn ? "set" : "none"; closeSheet();
    return { during, after: UI.rcLearn, todo: S.shop.rcTodo.length };
  });
  assert.deepEqual(r, { during: "set", after: null, todo: 1 });
});

test("saving the new food removes its receipt line and maps the text to it", async () => {
  const page = await start();
  const r = await page.evaluate(() => {
    S.shop.rcTodo = [{ id: "rt1", name: "Mystery Cheese", qty: 1, eur: 3 }]; ACT["rcp-new"]({ dataset: { id: "rt1" } });
    Object.assign(UI.sheet.draft, { name: "Mystery Cheese", per: { kcal: 300, p: 20, c: 1, f: 24 } }); ACT["fd-save-only"]();
    return { todo: S.shop.rcTodo.length, mapped: Object.keys(S.shop.rcMap || {}).length };
  });
  assert.deepEqual(r, { todo: 0, mapped: 1 });
});

test("the tick and the pack buttons of a list row are at least 36 px", async () => {
  const page = await start(F.seed({ withPlan: true }), H.VIEWPORTS.phone);
  const r = await page.evaluate(async () => { UI.tab = "shop"; UI.fuelTab = "shop"; UI.shopStart = todayISO(); DATA_V++; render(); await new Promise(x => setTimeout(x, 150));
    const sz = s => [...document.querySelectorAll(s)].map(e => { const b = e.getBoundingClientRect(); return Math.round(Math.min(b.width, b.height)); });
    return { chk: sz(".shop-row .chk"), pk: sz(".shop-row .pk-st .icon-btn") }; });
  assert.ok(r.chk.length && r.chk.every(x => x >= 36), JSON.stringify(r)); assert.ok(r.pk.every(x => x >= 36), JSON.stringify(r));
});
