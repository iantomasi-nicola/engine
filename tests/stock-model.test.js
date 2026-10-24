/* M4d: one rule for plan ↔ pantry ↔ list. The plan sets aside what is at home (nothing to switch on), eating takes it off, the list shows only what is missing. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let dir, app;
test.before(async () => { dir = H.build(H.tmp("stockmodel-build")); });
test.afterEach(async () => { await app?.close(); app = null; });
const start = async (seed = F.seed({ withPantry: false }), viewport) => { app = await H.startApp({ dir, seed, viewport }); return app.page; };
/* the seed plans, every day: the 2-serving bowl at "m" (200 g rice, 300 g chicken, 10 g oil) and 100 g rice at "d". Nothing is marked "from the pantry" anywhere. */

test("ticking a food as eaten takes it off the pantry with no switch to turn on; un-ticking gives back exactly that", async () => {
  const page = await start();
  const r = await page.evaluate(() => {
    const d = todayISO(); S.shop.pantry["t-rice"] = { g: 250 }; DATA_V++; const stock = () => S.shop.pantry["t-rice"].g;
    mutateDay(d, day => { const x = day.meals.d[0]; x.eaten = true; pantryAdjust(x, 1, d); }); const eaten = stock();
    mutateDay(d, day => { const x = day.meals.d[0]; x.eaten = false; pantryAdjust(x, -1); });
    return { eaten, back: stock(), pan: S.days[d].meals.d[0].pan ?? null };
  });
  assert.deepEqual(r, { eaten: 150, back: 250, pan: null });
});

test("eating something that isn't at home changes nothing; a short stock only gives what it has", async () => {
  const page = await start();
  const r = await page.evaluate(() => {
    const d = todayISO(); mutateDay(d, day => { const x = day.meals.d[0]; x.eaten = true; pantryAdjust(x, 1, d); });
    const none = Object.keys(S.shop.pantry).length;
    S.shop.pantry["t-rice"] = { g: 30 }; mutateDay(d, day => { const x = day.meals.d[0]; pantryAdjust(x, 1, d); });
    return { none, left: S.shop.pantry["t-rice"].g };
  });
  assert.equal(r.none, 0, "no phantom stock is created");
  assert.equal(r.left, 0);
});

test("eating a recipe takes its ingredients that are at home, and gives the same back", async () => {
  const page = await start();
  const r = await page.evaluate(() => {
    const d = todayISO(); S.shop.pantry["t-rice"] = { g: 500 }; S.shop.pantry["t-chicken"] = { g: 100 }; DATA_V++;
    const get = () => [S.shop.pantry["t-rice"].g, S.shop.pantry["t-chicken"].g];
    mutateDay(d, day => { const x = day.meals.m[0]; x.eaten = true; pantryAdjust(x, 1, d); }); const eaten = get();
    mutateDay(d, day => { const x = day.meals.m[0]; x.eaten = false; pantryAdjust(x, -1); }); return { eaten, back: get() };
  });
  assert.deepEqual(r.eaten, [300, 0]); assert.deepEqual(r.back, [500, 100]);
});

test("a day logged long after the fact does not move today's stock", async () => {
  const page = await start();
  const r = await page.evaluate(() => {
    const old = addDays(todayISO(), -10); S.shop.pantry["t-rice"] = { g: 500 }; S.days[old] = { date: old, meals: { dinner: [{ id: "x", kind: "food", ref: "t-rice", qty: 100, eaten: false }] } };
    mutateDay(old, day => { const x = day.meals.dinner[0]; x.eaten = true; pantryAdjust(x, 1, old); }); const a = S.shop.pantry["t-rice"].g;
    const yest = addDays(todayISO(), -1); S.days[yest] = { date: yest, meals: { dinner: [{ id: "y", kind: "food", ref: "t-rice", qty: 100, eaten: false }] } };
    mutateDay(yest, day => { const x = day.meals.dinner[0]; x.eaten = true; pantryAdjust(x, 1, yest); }); return { a, b: S.shop.pantry["t-rice"].g };
  });
  assert.deepEqual(r, { a: 500, b: 400 });
});

test("the plan sets aside what is at home by itself, earliest day first; the list shows only what is missing", async () => {
  const page = await start();
  const r = await page.evaluate(() => {
    S.shop.pantry["t-rice"] = { g: 700 }; DATA_V++; const t = todayISO();
    const row = (from, n) => { const x = shoppingRows(addDays(t, from), n).find(y => y.id === "t-rice"); return x ? { need: x.need, covered: x.covered, buy: x.buy } : null; };
    return { today: row(0, 1), tomorrow: row(1, 1), week: row(0, 7) };
  });
  assert.deepEqual(r.today, null, "300 g needed today, 700 at home: nothing to buy");
  assert.equal(r.tomorrow, null, "tomorrow's 300 g are covered too (400 left after today)");
  assert.deepEqual(r.week, { need: 2100, covered: 700, buy: 1400 });
});

test("a planned item at home shows a jar, an eaten one that came from the pantry too; one that isn't at home shows none", async () => {
  const page = await start();
  const r = await page.evaluate(() => {
    const t = todayISO(); S.shop.pantry["t-rice"] = { g: 1000 }; DATA_V++; UI.tab = "plan"; UI.date = t;
    const dinner = S.days[t].meals.d[0], lunch = S.days[t].meals.m[0];
    const tag = (it, m) => /pan-tag/.test(itemRow(it, m));
    const out = { planned: tag(dinner, "d") }; delete S.shop.pantry["t-rice"]; DATA_V++; out.gone = tag(dinner, "d");
    S.shop.pantry["t-rice"] = { g: 1000 }; DATA_V++; mutateDay(t, day => { const x = day.meals.d[0]; x.eaten = true; pantryAdjust(x, 1, t); }); out.eaten = tag(S.days[t].meals.d[0], "d");
    return out;
  });
  assert.deepEqual(r, { planned: true, gone: false, eaten: true });
});

test("the old per-item switch is gone: no 'From the pantry' toggle, no 'Use them' button, no link action", async () => {
  const page = await start();
  const r = await page.evaluate(() => { S.shop.pantry["t-rice"] = { g: 100 }; DATA_V++; const d = todayISO(); const body = SHEETS.qty({ kind: "food", ref: "t-rice", qty: 100, date: d, meal: "d", origMeal: "d", itemId: S.days[d].meals.d[0].id }).body;
    UI.shopStart = d; return { qty: /qty-pan|From the pantry/.test(body), stock: /stock-box/.test(body), shop: /pan-use/.test(shopPanel(false).h), acts: ["qty-pan", "pan-use"].filter(k => ACT[k]), fn: typeof linkFromPantry }; });
  assert.deepEqual(r, { qty: false, stock: true, shop: false, acts: [], fn: "undefined" });
});

test("shopping list: «add something else» is the first thing, above the aisles", async () => {
  const page = await start();
  const order = await page.evaluate(() => { S.shop.extras = [{ id: "e1", text: "Napkins", done: false }]; DATA_V++; UI.shopStart = todayISO(); const d = document.createElement("div"); d.innerHTML = shopPanel(false).h; const l = d.querySelector(".shop-list"); return [...l.children].map(c => c.className.split(" ")[0]).slice(0, 3); });
  assert.equal(order[0], "sq-add"); assert.equal(order[1], "sq");
  const empty = await page.evaluate(() => { S.days = {}; S.shop.extras = []; DATA_V++; const d = document.createElement("div"); d.innerHTML = shopPanel(false).h; const a = d.querySelector(".sq-add"), n = d.querySelector(".note"); return !!a && !!n && !!(a.compareDocumentPosition(n) & Node.DOCUMENT_POSITION_FOLLOWING); });
  assert.equal(empty, true, "also when there is nothing else on the list: the form first, then the note");
});

test("«Stock on» can be closed and stays closed after a redraw", async () => {
  const page = await start();
  await page.evaluate(() => { S.shop.pantry["t-rice"] = { g: 700 }; DATA_V++; UI.tab = "pantry"; scheduleRender(); });
  await page.waitForSelector(".pa-forecast");
  const open = () => page.evaluate(() => !!document.querySelector(".pa-forecast .pa-frows"));
  assert.equal(await open(), true, "opens by itself when something runs down");
  await page.click('.pa-forecast [data-act="pa-fc-toggle"]'); await page.waitForTimeout(120);
  assert.equal(await open(), false);
  await page.evaluate(() => { DATA_V++; scheduleRender(); }); await page.waitForTimeout(100);
  assert.equal(await open(), false, "a redraw does not reopen it");
  assert.equal(await page.getAttribute('.pa-forecast [data-act="pa-fc-toggle"]', "aria-expanded"), "false");
  await page.click('.pa-forecast [data-act="pa-fc-toggle"]'); await page.waitForTimeout(120);
  assert.equal(await open(), true);
});

test("the Pantry has no how-it-works card; «Left on» lists every item, running out first, and can show them all", async () => {
  const page = await start();
  await page.evaluate(() => { for (let k = 0; k < 10; k++) { S.shop.pantry["x" + k] = { g: 100 }; S.foods["x" + k] = { id: "x" + k, name: "Unused thing " + k, unit: "g", per: { kcal: 1, p: 0, c: 0, f: 0, fib: 0 }, servings: [], source: "custom" }; } S.shop.pantry["t-rice"] = { g: 700 }; S.shop.pantry["t-oil"] = { g: 300 }; DATA_V++; UI.tab = "pantry"; scheduleRender(); });
  await page.waitForSelector(".pa-forecast");
  assert.equal(await page.evaluate(() => !!document.querySelector(".pa-how") && /How the pantry works/.test(document.body.innerText)), false);
  const f = await page.evaluate(() => { const F = pantryForecast(addDays(todayISO(), 6 - dow(todayISO()))); return { first: F.rows[0].f.name, states: F.rows.map(r => r.state), n: F.rows.length }; });
  assert.ok(["out", "low"].includes(f.states[0]), "the item that runs down comes first: " + f.states.join(","));
  assert.ok(f.states.lastIndexOf("idle") === f.states.length - 1 || !f.states.includes("idle"), "items the plan doesn't use come last");
  assert.equal(await page.evaluate(() => document.querySelectorAll(".pa-forecast .fc-row").length), 8, "eight to start with");
  await page.click('.pa-forecast [data-act="pa-fc-all"]'); await page.waitForTimeout(120);
  assert.equal(await page.evaluate(() => document.querySelectorAll(".pa-forecast .fc-row").length), f.n);
  assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll(".pa-forecast .chips button")].map(b => b.innerText.trim()).slice(0, 3)), ["This week", "Next week", "14 days"]);
});

test("what is left at the end of this week and next week: the stock after the planned meals, so a weekly shop can see what next week starts with", async () => {
  const page = await start();
  const r = await page.evaluate(() => { const t = todayISO(), sun = addDays(t, 6 - dow(t)); S.shop.pantry["t-rice"] = { g: 3000 }; DATA_V++;
    const a = pantryForecast(sun).rows.find(x => x.id === "t-rice"), b = pantryForecast(addDays(sun, 7)).rows.find(x => x.id === "t-rice");
    const days = n => Math.min(n, 7) * 300; const nThis = daysBetween(t, sun) + 1;
    return { thisWeek: [a.now, a.then, 3000 - Math.min(nThis, 7) * 300], nextWeek: [b.then], plannedDays: Object.keys(S.days).length }; });
  assert.equal(r.thisWeek[1], r.thisWeek[2]);   // 300 g of rice a day (bowl 200 + plain 100) until Sunday
  assert.ok(r.nextWeek[0] <= r.thisWeek[1]);
});

test("legacy: foods marked 'from the pantry' by the earlier version behave the same, and an item eaten then (no record) still gives back what it took", async () => {
  const page = await start();
  const r = await page.evaluate(() => { const d = todayISO(); S.shop.pantry["t-rice"] = { g: 50 }; const x = S.days[d].meals.d[0]; x.pan = true; x.eaten = true; mutateDay(d, day => { const y = day.meals.d[0]; pantryAdjust(y, -1); }); return S.shop.pantry["t-rice"].g; });
  assert.equal(r, 150);
});
