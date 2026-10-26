/* L211 / audit B1 (XSS from ids inside data-* attributes). An id such as  e1" autofocus onfocus="window.__x=1" x="  that arrives through a backup, the device copy,
   or the account must (a) never be kept as a record key or id, and (b) if it still gets into memory some other way, never leave its attribute. Synthetic data only.
   Detector: any element that carries an attribute only the payload could have put there (onfocus, autofocus, onerror). */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let dir, app;
test.before(async () => { dir = H.build(H.tmp("l211-sec-build")); });
test.afterEach(async () => { await app?.close(); app = null; });
const start = async (o = { withPlan: false, withPantry: true }, vp = H.VIEWPORTS.desktop) => { app = await H.startApp({ dir, seed: F.seed(o), viewport: vp }); return app.page; };
const E = 'e1" autofocus onfocus="window.__x=1" x="';
const DET = "[onfocus],[onerror],[autofocus]";
const SCREENS = [["today"], ["plan", { planView: "day" }], ["plan", { planView: "week" }], ["foods", { foodsSeg: "mine" }], ["foods", { foodsSeg: "hidden" }], ["shop"], ["pantry"], ["settings"], ["train", { trainSeg: "cal" }], ["progress", { progSeg: "food", foodSeg: "intake" }]];

test("1. A backup whose food has a hostile key or id: the record is left out or its id repaired, and Foods shows no injected attribute", async () => {
  const page = await start();
  /* backup: key "evil1" with id = payload (kept, id repaired to "evil1"); key = payload (left out); key "ok1" normal (kept). Expected foods: ok1, evil1 (+ synthetic ones). */
  const r = await page.evaluate(async E => {
    const food = (id, n) => ({ id, name: n, per: { kcal: 100, p: 1, c: 1, f: 1 }, unit: "g", servings: [], pack: 500, cat: "pantry", role: "C", meals: ["m"], source: "custom" });
    const j = { app: "Engine", foods: { evil1: food(E, "Evil id"), [E]: food(E, "Evil key"), ok1: food("ok1", "Fine") }, recipes: {}, days: {} };
    restoreOpen(j, "file"); UI.sheet.parts = { settings: false, foods: true, days: false, logm: false, train: false, body: false, shop: false, photos: false };
    await ACT["rs-go"](); UI.tab = "foods"; UI.fuelTab = "foods"; UI.foodsSeg = "mine"; render(); await new Promise(r => setTimeout(r, 300));
    return { keys: Object.keys(S.foods).filter(k => /evil|ok1|e1/.test(k)), id: S.foods.evil1?.id, bad: document.querySelectorAll("[onfocus],[onerror],[autofocus]").length, x: window.__x || 0 };
  }, E);
  assert.deepEqual(r.keys.sort(), ["evil1", "ok1"]); assert.equal(r.id, "evil1"); assert.equal(r.bad, 0); assert.equal(r.x, 0);
  assert.deepEqual(app.errors, []);
});

test("2. Hostile ids inside a backup's days (item id, ref, meal key, adj key, took key), recipes (ingredient) and shop (pantry, checked, extras): none is kept", async () => {
  const page = await start();
  const r = await page.evaluate(async E => {
    const t = todayISO();
    const j = { app: "Engine",
      days: { [t]: { date: t, meals: { lunch: [{ id: E, kind: "food", ref: "t-rice", qty: 100 }, { id: "i2", kind: "food", ref: E, qty: 100 }, { id: "i3", kind: "food", ref: "t-rice", qty: 50, eaten: true, took: { [E]: 5, "t-rice": 50 } }], [E]: [{ id: "i4", kind: "food", ref: "t-rice", qty: 1 }] }, adj: { [E]: 100, i3: 5 } }, [E]: { date: E, meals: {} } },
      recipes: { r1: { id: "r1", name: "R", servings: 1, ingredients: [{ food: E, g: 10 }, { food: "t-rice", g: 20 }] } },
      shop: { pantry: { [E]: { g: 5 }, "t-rice": { g: 7 } }, checked: { [E]: true }, extras: [{ id: E, text: "x", done: false }], stores: [{ id: E, name: "S" }] } };
    restoreOpen(j, "file"); UI.sheet.parts = { settings: false, foods: true, days: true, logm: false, train: false, body: false, shop: true, photos: false };
    await ACT["rs-go"]();
    const d = S.days[t], s = JSON.stringify(S);
    return { dayKeys: Object.keys(S.days).filter(k => k.includes("e1")), meals: Object.keys(d.meals), lunch: d.meals.lunch.length, hostile: s.split("autofocus").length - 1,
      ing: S.recipes.r1.ingredients.map(x => x.food), pantry: Object.keys(S.shop.pantry), took: Object.keys(d.meals.lunch.find(x => x.eaten)?.took || {}) };
  }, E);
  /* expected: no day key with the payload; meals lunch only; lunch keeps i3 and the item whose id was hostile (id replaced) but not i2 (hostile ref) -> 2; no payload left anywhere in S;
     ingredient list only t-rice; pantry has t-rice and not the payload; took only t-rice */
  assert.deepEqual(r.dayKeys, []); assert.deepEqual(r.meals, ["lunch"]); assert.equal(r.lunch, 2); assert.equal(r.hostile, 0);
  assert.deepEqual(r.ing, ["t-rice"]); assert.ok(r.pantry.includes("t-rice")); assert.ok(!r.pantry.some(k => k.includes("e1"))); assert.deepEqual(r.took, ["t-rice"]);
  assert.deepEqual(app.errors, []);
});

test("3. The device copy and the account (applyCollection) get the same clean-up: a hostile id is not kept, a numeric string in a food is a number", async () => {
  const page = await start();
  const r = await page.evaluate(E => {
    const food = (id, kcal) => ({ id, name: "F", per: { kcal }, unit: "g", servings: [], pack: "300", cat: "pantry", role: "C", meals: ["m"], source: "custom" });
    localStorage.setItem(LS_KEY, JSON.stringify({ foods: { [E]: food(E, 1), good: food(E, 2) }, recipes: {}, days: {} })); loadLocal();
    const local = { keys: Object.keys(S.foods).filter(k => k === E || k === "good"), id: S.foods.good?.id };
    const docs = [{ id: E, data: () => food(E, 3) }, { id: "sync1", data: () => food("sync1", "4,5") }];
    Sync.known.foods = true; applyCollection("foods", { docs, metadata: { fromCache: false } });
    return { local, sync: Object.keys(S.foods).filter(k => k === E || k === "sync1"), kcal: S.foods.sync1?.per.kcal, pack: S.foods.sync1?.pack };
  }, E);
  /* loadLocal: payload key dropped, "good" kept with id repaired to "good". Sync: payload dropped, sync1 kept, "4,5" -> 4.5, pack "300" -> 300 */
  assert.deepEqual(r.local, { keys: ["good"], id: "good" }); assert.deepEqual(r.sync, ["sync1"]); assert.equal(r.kcal, 4.5); assert.equal(r.pack, 300);
});

test("4. Defence in depth: hostile ids already in memory (any path) never leave their attribute, on every screen and sheet, phone and desktop", async () => {
  for (const vp of [H.VIEWPORTS.phone, H.VIEWPORTS.desktop]) {
    const page = await start({ withPlan: false, withPantry: true }, vp);
    const base = await page.evaluate(sel => document.querySelectorAll(sel).length, DET);
    await page.evaluate(E => {
      const t = todayISO(), food = id => ({ id, name: "Evil food", brand: "", unit: "g", per: { kcal: 100, p: 1, c: 1, f: 1, fib: 0 }, servings: [], pack: 500, cat: "pantry", role: "C", meals: ["m"], source: "custom" });
      S.foods[E] = food(E); S.foods.ef = food(E); S.recipes[E] = { id: E, name: "Evil rec", servings: 1, meals: ["m"], source: "custom", ingredients: [{ food: E, g: 100 }] };
      S.days[t] = { date: t, meals: { lunch: [{ id: E, kind: "food", ref: E, qty: 100, eaten: false }, { id: "r1", kind: "recipe", ref: E, qty: 1, eaten: false }, { id: "q1", kind: "quick", cheat: true, name: "Treat", m: { kcal: 300, p: 0, c: 0, f: 0 } }], [E]: [{ id: "i9", kind: "food", ref: "t-rice", qty: 10 }] }, adj: { [E]: 50 } };
      S.shop.pantry[E] = { g: 300 }; S.shop.checked = { [E]: { g: 200 } }; S.shop.extras = [{ id: E, text: "x", done: false }]; S.shop.stores = [{ id: E, name: "Shop" }];
      S.settings.supps = [{ id: E, name: "Supp", dose: "1", times: ["08:00"] }]; S.queue = { [E]: { status: "pending", barcode: "1", food: E } };
      S.train.races = [{ id: E, name: "Race", date: addDays(t, 30), sport: "Running", km: 10, pri: "A" }]; DATA_V++;
    }, E);
    const bad = await page.evaluate(async ([screens, E, sel, base]) => {
      const out = [], look = w => { const n = document.querySelectorAll(sel).length - base; if (n > 0 || window.__x) out.push([w, n]); }, t = todayISO();
      for (const [tab, extra] of screens) { Object.assign(UI, { tab, fuelTab: tab, date: t }, extra || {}); render(); await new Promise(r => setTimeout(r, 40)); look("tab " + tab + JSON.stringify(extra || {})); }
      UI.shopStart = t; S.shop.range = 7; UI.tab = UI.fuelTab = "shop"; render(); await new Promise(r => setTimeout(r, 40)); look("shop");
      const sheets = [["pantry", { food: E, g: 300, exp: "", u: "base" }], ["food", { draft: clone(S.foods[E]), isNew: false }], ["food", { draft: clone(S.foods.ef), isNew: false }], ["buy", { id: E }], ["qty", { kind: "food", ref: E, qty: 100, date: t, meal: "lunch", origMeal: "lunch" }], ["swapfood", { from: E, to: "t-rice" }], ["recipe", { draft: clone(S.recipes[E]), isNew: false }]];
      for (const [type, p] of sheets) { try { UI.tab = "today"; openSheet(type, p); await new Promise(r => setTimeout(r, 40)); look("sheet " + type); closeSheet(); } catch (e) { out.push([type, String(e)]); } }
      return out;
    }, [SCREENS, E, DET, base]);
    assert.deepEqual(bad, [], vp.width + "px"); assert.deepEqual(app.errors, []);
    await app.close(); app = null;
  }
});
