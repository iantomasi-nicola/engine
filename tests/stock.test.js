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
