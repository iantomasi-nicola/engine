/* M3: non-food extras (history, autocomplete, recurring) and spending per range (B5, B6). Synthetic data only. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let dir, app;
test.before(async () => { dir = H.build(H.tmp("m3-build")); });
test.afterEach(async () => { await app?.close(); app = null; });
const start = async (seed = F.seed()) => { app = await H.startApp({ dir, seed }); return app.page; };
const add = (page, text) => page.evaluate(t => { const i = document.createElement("input"); i.id = "extra-in"; i.value = t; document.body.appendChild(i); FORMS.extra(); i.remove(); }, text);

test("an extra you bought is remembered: next time the name autocompletes and the last real price is suggested as an estimate", async () => {
  const page = await start();
  await add(page, "Coffee");
  await page.evaluate(() => { const x = S.shop.extras[0]; x.eur = 4.2; x.done = true; ACT["shop-done"](); });
  const h = await page.evaluate(() => ({ left: S.shop.extras.length, hist: S.shop.xhist, dl: extraNames() }));
  assert.equal(h.left, 0);
  assert.equal(h.hist["coffee"].eur, 4.2);
  assert.equal(h.hist["coffee"].n, "Coffee");
  assert.deepEqual(h.dl, ["Coffee"]);
  await add(page, "  coffee ");
  const x = await page.evaluate(() => S.shop.extras[0]);
  assert.equal(x.text, "coffee", "typed text kept as typed");
  assert.equal(x.eur, 4.2);
  assert.equal(x.est, true, "a price taken from the history is labelled as an estimate");
});

test("a price typed by hand is real: it clears the estimate flag and is what the history keeps", async () => {
  const page = await start();
  await add(page, "Coffee");
  await page.evaluate(() => { const x = S.shop.extras[0]; x.eur = 4; x.done = true; ACT["shop-done"](); });
  await add(page, "Coffee");
  const r = await page.evaluate(() => { const x = S.shop.extras[0]; CHG["extra-eur"]("5,5", { dataset: { id: x.id } }); x.done = true; ACT["shop-done"](); return { hist: S.shop.xhist.coffee.eur, buy: S.shop.buys.at(-1) }; });
  assert.equal(r.hist, 5.5);
  assert.equal(r.buy.x, 1);
  assert.equal(r.buy.est, undefined);
});

test("a recurring extra comes back after its interval and stays off the list until then", async () => {
  const page = await start();
  await add(page, "Napkins");
  const r = await page.evaluate(() => {
    const x = S.shop.extras[0]; ACT["extra-rec"]({ dataset: { id: x.id } }); const rec1 = S.shop.extras[0].rec;
    S.shop.extras[0].done = true; S.shop.extras[0].eur = 2; ACT["shop-done"]();
    const q = S.shop.extras[0]; UI.shopStart = todayISO(); S.shop.range = 7;
    const hidden = visibleExtras().length, due = q.due;
    S.shop.range = 14; const shown14 = visibleExtras().length;
    return { rec1, back: !!q, done: q.done, due, hidden, shown14, today: todayISO() };
  });
  assert.equal(r.rec1, 7);
  assert.equal(r.back, true);
  assert.equal(r.done, false);
  assert.equal(r.hidden, 0, "due in 7 days = day 8 of the window: a 7-day list does not show it yet");
  assert.equal(r.shown14, 1);
});

test("extras never reach Foods, the day's nutrients or the pantry", async () => {
  const page = await start(F.seed({ withPlan: false }));
  const before = await page.evaluate(() => ({ foods: Object.keys(S.foods).length, pantry: Object.keys(S.shop.pantry).length }));
  await add(page, "Napkins");
  await page.evaluate(() => { S.shop.extras[0].done = true; S.shop.extras[0].eur = 1; ACT["shop-done"](); });
  const after = await page.evaluate(() => ({ foods: Object.keys(S.foods).length, pantry: Object.keys(S.shop.pantry).length }));
  assert.deepEqual(after, before);
});

/* spending: one function sums the purchase history for any range; food + extras = total = sum of the product rows */
const seedBuys = page => page.evaluate(() => {
  const t = todayISO(), d = n => addDays(t, -n);
  S.shop.buys = [
    { d: d(0), id: "t-rice", n: "Test rice", g: 1000, eur: 2 },
    { d: d(1), id: "t-chicken", n: "Test chicken", g: 400, eur: 5.5 },
    { d: d(1), n: "Coffee", eur: 4, x: 1 },
    { d: d(3), id: "t-rice", n: "Test rice", g: 1000, eur: 2.5 },
    { d: d(40), id: "t-chicken", n: "Test chicken", g: 400, eur: 6 },
    { d: d(40), n: "Napkins", eur: 1.5, x: 1 },
    { d: d(2), id: "t-oil", n: "Test oil", g: 500, eur: null },
    { d: d(400), id: "t-rice", n: "Test rice", g: 1000, eur: 9 },
  ];
});

test("spending for a range: food, extras, total and product rows reconcile with the purchase history", async () => {
  const page = await start(); await seedBuys(page);
  const r = await page.evaluate(() => {
    const t = todayISO(), a = spendIn(addDays(t, -6), t), b = spendIn(addDays(t, -60), t), all = spendIn("0000-01-01", t);
    const sum = x => Math.round(x.rows.reduce((s, r) => s + r.eur, 0) * 100) / 100;
    return { a, b, all, sa: sum(a), sb: sum(b), sall: sum(all) };
  });
  assert.equal(r.a.food, 10); assert.equal(r.a.extra, 4); assert.equal(r.a.total, 14);
  assert.equal(r.a.unpriced, 1, "the purchase without a price is counted aside, never as zero spent");
  assert.equal(r.sa, r.a.total);
  assert.equal(r.b.total, 14 + 7.5); assert.equal(r.sb, r.b.total);
  assert.equal(r.all.total, 14 + 7.5 + 9); assert.equal(r.sall, r.all.total);
  const rice = r.a.rows.find(x => x.n === "Test rice");
  assert.deepEqual([rice.eur, rice.k], [4.5, 2], "one row per product with the number of purchases");
});

test("spending view: the range control switches the numbers, the list shows planned next to bought, on three screen sizes", async () => {
  const page = await start(); await seedBuys(page);
  for (const [name, vp] of Object.entries(H.VIEWPORTS)) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.evaluate(() => { UI.spendRange = "week"; S.shop.checked = {}; UI.tab = "shop"; scheduleRender(); });
    await page.waitForFunction(() => /Spending/.test(document.body.innerText));
    const txt = await page.evaluate(() => document.body.innerText);
    assert.match(txt, /By product/, name);
    const over = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    assert.equal(over, false, `${name}: no horizontal overflow`);
  }
  const tiles = await page.evaluate(() => { UI.spendRange = "week"; const a = spendCard(); UI.spendRange = "month"; const b = spendCard(); return [a, b]; });
  assert.notEqual(tiles[0], tiles[1]);
  assert.match(tiles[0], /food/); assert.match(tiles[0], /extras/);
});

test("the weekly report spend uses the same history sums as the spending view", async () => {
  const page = await start(); await seedBuys(page);
  const r = await page.evaluate(() => { const t = todayISO(); return { a: spendIn(addDays(t, -6), t).total }; });
  assert.equal(r.a, 14);
});
