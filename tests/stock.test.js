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

test("windows: this week starts today (past days left out), next week is Monday to Sunday, custom is exact", async () => {
  const page = await start();
  const r = await page.evaluate(() => {
    const t = todayISO(), out = {};
    // a planned meal yesterday must never count towards this week
    S.days[addDays(t, -1)] = { date: addDays(t, -1), meals: { m: [{ id: "old", kind: "food", ref: "t-rice", qty: 999, eaten: false }] } }; DATA_V++;
    S.shop.mode = "week"; applyShopMode(); out.week = [UI.shopStart, S.shop.range, shoppingRows(UI.shopStart, S.shop.range).find(x => x.id === "t-rice").need];
    S.shop.mode = "next"; applyShopMode(); out.next = [UI.shopStart, S.shop.range, dow(UI.shopStart)];
    S.shop.mode = "custom"; S.shop.cFrom = addDays(t, 1); S.shop.cTo = addDays(t, 3); applyShopMode(); out.custom = [UI.shopStart, S.shop.range, shoppingRows(UI.shopStart, S.shop.range).find(x => x.id === "t-rice").need];
    out.today = t; out.left = 7 - dow(t); return out;
  });
  assert.equal(r.week[0], r.today); assert.equal(r.week[1], r.left);
  assert.equal(r.week[2], 300 * Math.min(r.left, 7), "300 g rice per planned day from today to Sunday; yesterday's 999 g ignored");
  assert.equal(r.next[1], 7); assert.equal(r.next[2], 0, "next week starts on a Monday");
  assert.deepEqual([r.custom[1], r.custom[2]], [3, 900]);
});

test("the shopping panel shows the covered list, and the window chips (this week, next week, custom)", async () => {
  const page = await start();
  const html = await page.evaluate(() => { S.shop.pantry["t-rice"] = { g: 400 }; for (let i = 0; i < 7; i++) S.days[addDays(todayISO(), i)].meals.m[0].pan = true; S.shop.mode = "custom"; S.shop.cFrom = todayISO(); S.shop.cTo = addDays(todayISO(), 1); DATA_V++; applyShopMode(); return shopPanel(false).h; });
  for (const t of ["This week", "Next week", "Next 7 days", "Custom", "covered by what's at home", "from home", "runs out", "partly", 'id="shop-from"', 'id="shop-to"']) assert.ok(html.includes(t), "missing: " + t);
  assert.deepEqual(app.errors, []);
});

test("the covered list and chips render on a phone without overflow", async () => {
  app = await H.startApp({ dir, seed: F.seed(), viewport: H.VIEWPORTS.phone });
  const r = await app.page.evaluate(async () => {
    S.shop.pantry["t-rice"] = { g: 400 }; for (let i = 0; i < 7; i++) S.days[addDays(todayISO(), i)].meals.m[0].pan = true; S.shop.mode = "week"; DATA_V++;
    UI.tab = "shop"; scheduleRender(); await new Promise(r => setTimeout(r, 400));
    const box = document.querySelector(".shop-card")?.getBoundingClientRect();
    return { sw: document.documentElement.scrollWidth, iw: innerWidth, card: box && [Math.round(box.left), Math.round(box.right)], has: !!document.querySelector(".shop-covered") };
  });
  assert.equal(r.has, true); assert.ok(r.sw <= r.iw, `page scrolls sideways (${r.sw} > ${r.iw})`);
  assert.ok(r.card[1] <= r.iw);
  await app.page.screenshot({ path: require("path").join(process.env.ENGINE_SHOTS || require("os").tmpdir(), "shop-phone.png") });
});

test("compatibility: an item eaten before this version (pan, no 'took') still gives back its full amount when un-eaten", async () => {
  const page = await start(F.seed({ withPantry: false }));
  const g = await page.evaluate(() => { const d = todayISO(); S.shop.pantry["t-rice"] = { g: 50 }; S.days[d].meals.d[0].pan = true; S.days[d].meals.d[0].eaten = true; mutateDay(d, day => { const x = day.meals.d[0]; x.eaten = false; pantryAdjust(x, -1); }); return S.shop.pantry["t-rice"].g; });
  assert.equal(g, 150);
});

test("only four window chips remain; an older 1/3/14-day choice becomes a custom range, not a lost one", async () => {
  const page = await start();
  const r = await page.evaluate(() => {
    S.shop.mode = "days"; S.shop.range = 3; UI.shopStart = todayISO(); applyShopMode();
    const legacy = { mode: S.shop.mode, from: S.shop.cFrom === todayISO(), to: S.shop.cTo === addDays(todayISO(), 2), n: S.shop.range };
    const html = shopPanel(false).h, chips = (html.match(/class="chip sm"/g) || []).length;
    S.shop.mode = "days"; S.shop.range = 7; applyShopMode();
    return { legacy, chips, seven: [S.shop.mode, UI.shopStart === todayISO(), S.shop.range], noDateChip: !/shop-start/.test(html), noOld: !/1 d|3 d|14 d/.test(html) };
  });
  assert.deepEqual(r.legacy, { mode: "custom", from: true, to: true, n: 3 });
  assert.equal(r.chips, 4); assert.deepEqual(r.seven, ["days", true, 7]); assert.ok(r.noDateChip && r.noOld);
});
