/* M1: one model for stock, plan and shopping list (stockPlan, pantryAdjust, linkFromPantry, shopping windows). */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let dir, app;
test.before(async () => { dir = H.build(H.tmp("stock-build")); });
test.afterEach(async () => { await app?.close(); app = null; });
const start = async (seed = F.seed()) => { app = await H.startApp({ dir, seed }); return app.page; };

test("eating a pantry item takes off only what the pantry had; un-eating puts back exactly that (no phantom stock)", async () => {
  const page = await start(F.seed({ withPantry: false }));
  const r = await page.evaluate(() => {
    const d = todayISO(); S.shop.pantry["t-rice"] = { g: 30 }; S.days[d].meals.d[0].pan = true; DATA_V++;
    const it = () => S.days[d].meals.d[0], stock = () => S.shop.pantry["t-rice"].g;
    mutateDay(d, day => { const x = day.meals.d[0]; x.eaten = true; pantryAdjust(x, 1); }); const afterEat = stock();
    mutateDay(d, day => { const x = day.meals.d[0]; x.eaten = false; pantryAdjust(x, -1); }); const afterUndo = stock();
    return { afterEat, afterUndo, took: it().took ?? null };
  });
  assert.equal(r.afterEat, 0);
  assert.equal(r.afterUndo, 30, "the 100 g item could only take 30 g, so only 30 g come back");
  assert.equal(r.took, null);
});

test("eating a pantry-linked recipe takes its ingredients off the pantry and un-eating restores them", async () => {
  const page = await start(F.seed({ withPantry: false }));
  const r = await page.evaluate(() => {
    const d = todayISO(); S.shop.pantry["t-rice"] = { g: 500 }; S.shop.pantry["t-chicken"] = { g: 100 }; S.days[d].meals.m[0].pan = true; DATA_V++;
    const get = () => [S.shop.pantry["t-rice"].g, S.shop.pantry["t-chicken"].g];
    mutateDay(d, day => { const x = day.meals.m[0]; x.eaten = true; pantryAdjust(x, 1); }); const eaten = get();
    mutateDay(d, day => { const x = day.meals.m[0]; x.eaten = false; pantryAdjust(x, -1); }); return { eaten, back: get() };
  });
  assert.deepEqual(r.eaten, [300, 0], "200 g rice used, chicken limited to the 100 g at home");
  assert.deepEqual(r.back, [500, 100]);
});

test("an item that is not linked to the pantry never moves the stock", async () => {
  const page = await start(F.seed({ withPantry: false }));
  const g = await page.evaluate(() => { const d = todayISO(); S.shop.pantry["t-rice"] = { g: 500 }; mutateDay(d, day => { const x = day.meals.d[0]; x.eaten = true; pantryAdjust(x, 1); }); return S.shop.pantry["t-rice"].g; });
  assert.equal(g, 500);
});

/* helpers run in the page: the plan is 7 days; every day has the 2-serving bowl at "m" (200 g rice, 300 g chicken, 10 g oil) and 100 g rice at "d" */
const rows = (page, from, n) => page.evaluate(([f, n]) => Object.fromEntries(shoppingRows(addDays(todayISO(), f), n).map(x => [x.id, { need: x.need, covered: x.covered, buy: x.buy, packs: x.packs }])), [from, n]);

test("a recipe linked to the pantry is covered by the stock it finds there (partly when the stock is short)", async () => {
  const page = await start();
  await page.evaluate(() => { S.shop.pantry["t-rice"] = { g: 150 }; S.days[todayISO()].meals.m[0].pan = true; DATA_V++; });
  const r = await rows(page, 0, 1);
  assert.deepEqual(r["t-rice"], { need: 300, covered: 150, buy: 150, packs: 1 });
  assert.deepEqual(r["t-chicken"], { need: 300, covered: 0, buy: 300, packs: 1 });
});

test("stock is reserved day by day from today: a later week only sees what earlier linked meals leave", async () => {
  const page = await start();
  await page.evaluate(() => { S.shop.pantry["t-rice"] = { g: 300 }; for (let i = 0; i < 2; i++) S.days[addDays(todayISO(), i)].meals.m[0].pan = true; DATA_V++; });
  const today = await rows(page, 0, 1), tomorrow = await rows(page, 1, 1);
  assert.deepEqual(today["t-rice"], { need: 300, covered: 200, buy: 100, packs: 1 });   // 200 g recipe covered, 100 g plain food bought
  assert.deepEqual(tomorrow["t-rice"], { need: 300, covered: 100, buy: 200, packs: 1 }); // today's linked recipe took 200 of the 300 g first
});

test("stock reserved for the days before the window is not offered to the window", async () => {
  const page = await start();
  await page.evaluate(() => { S.shop.pantry["t-rice"] = { g: 200 }; S.days[todayISO()].meals.m[0].pan = true; DATA_V++; });
  const later = await rows(page, 3, 1);
  assert.equal(later["t-rice"].covered, 0, "the 200 g belong to today's meal");
});

test("a food fully covered by the pantry leaves the list and shows up in the covered list with the day it runs out", async () => {
  const page = await start();
  const r = await page.evaluate(() => {
    S.shop.pantry["t-rice"] = { g: 400 }; for (let i = 0; i < 7; i++) S.days[addDays(todayISO(), i)].meals.m[0].pan = true; DATA_V++;
    const cov = shoppingCovered(todayISO(), 2).find(x => x.id === "t-rice");
    return { day1Buy: shoppingRows(addDays(todayISO(), 1), 1).find(x => x.id === "t-rice")?.buy, covered: cov && { covered: cov.covered, buy: cov.buy, endsOn: cov.endsOn, uses: cov.uses.length, partial: cov.partial } };
  });
  assert.equal(r.day1Buy, 100, "recipe rice covered, the plain 100 g still to buy");
  assert.deepEqual(r.covered, { covered: 400, buy: 200, endsOn: await page.evaluate(() => addDays(todayISO(), 1)), uses: 2, partial: true });
});

test("a pantry item covering a whole window appears as fully covered (no row to buy)", async () => {
  const page = await start();
  const r = await page.evaluate(() => {
    S.shop.pantry["t-chicken"] = { g: 5000 }; for (let i = 0; i < 7; i++) S.days[addDays(todayISO(), i)].meals.m[0].pan = true; DATA_V++;
    const c = shoppingCovered(todayISO(), 7).find(x => x.id === "t-chicken");
    return { row: shoppingRows(todayISO(), 7).some(x => x.id === "t-chicken"), covered: c.covered, buy: c.buy, partial: c.partial, endsOn: c.endsOn };
  });
  assert.deepEqual(r, { row: false, covered: 2100, buy: 0, partial: false, endsOn: null });
});

test("ticking a bought food puts it in the pantry and links the plan, so it leaves the list (recipe ingredients too)", async () => {
  const page = await start();
  const r = await page.evaluate(() => {
    UI.shopStart = todayISO(); S.shop.range = 1; DATA_V++;
    const before = shopToBuy().find(x => x.id === "t-rice")?.buy;
    ACT["shop-check"]({ dataset: { id: "t-rice" } });
    return { before, after: shopToBuy().find(x => x.id === "t-rice")?.buy ?? 0, stock: S.shop.pantry["t-rice"].g, linked: dayItems(S.days[todayISO()]).filter(([, it]) => it.pan).length };
  });
  assert.equal(r.before, 300);
  assert.equal(r.after, 0, "no duplicate: what was just bought no longer asks to be bought");
  assert.equal(r.stock, 1000);
  assert.equal(r.linked, 2);
});

test("projections never change the real stock or the plan", async () => {
  const page = await start();
  const same = await page.evaluate(() => {
    S.shop.pantry["t-rice"] = { g: 400 }; S.days[todayISO()].meals.m[0].pan = true; DATA_V++;
    const snap = JSON.stringify([S.shop, S.days]); stockPlan(todayISO(), 7); shoppingRows(addDays(todayISO(), 2), 5); shoppingCovered(todayISO(), 7); stockOn(addDays(todayISO(), 3)); shopToBuy();
    return snap === JSON.stringify([S.shop, S.days]);
  });
  assert.ok(same);
});

test("stockOn(X): the stock left after the linked meals planned up to X (A4 engine)", async () => {
  const page = await start();
  const r = await page.evaluate(() => {
    S.shop.pantry["t-rice"] = { g: 1000 }; for (let i = 0; i < 7; i++) S.days[addDays(todayISO(), i)].meals.m[0].pan = true; DATA_V++;
    const t = todayISO(), at = d => stockOn(d)["t-rice"];
    return { yesterday: at(addDays(t, -1)), today: at(t), day2: at(addDays(t, 2)), day6: at(addDays(t, 6)) };
  });
  assert.deepEqual(r, { yesterday: 1000, today: 800, day2: 400, day6: 0 });
});
