/* M3b (1): supermarkets — a price per store, offers that don't change the usual price, the list for the store you are in, spending by store. Synthetic data only. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let dir, app;
test.before(async () => { dir = H.build(H.tmp("stores-build")); });
test.afterEach(async () => { await app?.close(); app = null; });
const start = async viewport => { app = await H.startApp({ dir, seed: F.seed(), viewport }); return app.page; };
/* the seed plans 300 g of rice (pack 1000) and 300 g of chicken (pack 400) a day; a 1-day window: 1 pack of rice, 1 pack of chicken */
const win = page => page.evaluate(() => { UI.shopStart = todayISO(); S.shop.range = 1; S.shop.mode = "days"; DATA_V++; });

test("stores: add (no duplicates, any case), rename and delete; deleting one forgets where things were bought but keeps the usual prices", async () => {
  const page = await start();
  const r = await page.evaluate(() => { const a = storeAdd("  Esselunga "), a2 = storeAdd("esselunga"), b = storeAdd("Lidl"); S.shop.pref["t-rice"] = b; S.shop.prices = { "t-rice": { eur: 2, g: 1000, at: todayISO(), hist: [{ eur: 2, g: 1000, at: todayISO() }], st: { [b]: { eur: 1.8, g: 1000, at: todayISO(), hist: [{ eur: 1.8, g: 1000, at: todayISO() }] } } } };
    const names = storeList().map(x => x.name); storeRename(b, "Lidl Via Roma"); const renamed = storeName(b); S.shop.store = b; storeDel(b);
    return { same: a === a2, names, renamed, after: storeList().map(x => x.name), cur: curStore(), pref: S.shop.pref["t-rice"] ?? null, st: S.shop.prices["t-rice"].st?.[b] ?? null, usual: S.shop.prices["t-rice"].eur }; });
  assert.equal(r.same, true); assert.deepEqual(r.names, ["Esselunga", "Lidl"]); assert.equal(r.renamed, "Lidl Via Roma"); assert.deepEqual(r.after, ["Esselunga"]);
  assert.deepEqual([r.cur, r.pref, r.st, r.usual], [null, null, null, 2]);
});

test("the same product has a price at each store; the one you are in is used for the list, and any store falls back to the usual price", async () => {
  const page = await start(); await win(page);
  const r = await page.evaluate(() => { const a = storeAdd("A"), b = storeAdd("B"), t = todayISO();
    S.shop.prices = { "t-rice": { eur: 2.5, g: 1000, at: t, hist: [{ eur: 2.5, g: 1000, at: t }], st: { [a]: { eur: 2, g: 1000, at: t, hist: [{ eur: 2, g: 1000, at: t }] }, [b]: { eur: 3, g: 1000, at: t, hist: [{ eur: 3, g: 1000, at: t }] } } } }; DATA_V++;
    const k = s => Math.round(eurPerG("t-rice", s) * 1000 * 100) / 100; const cost = s => { S.shop.store = s; DATA_V++; return Math.round(rowCost(shoppingRows(todayISO(), 1).find(x => x.id === "t-rice")) * 100) / 100; };
    return { a: k(a), b: k(b), any: k(null), unknown: k("st-none"), costA: cost(a), costB: cost(b), costAny: cost(null) }; });
  assert.deepEqual(r, { a: 2, b: 3, any: 2.5, unknown: 2.5, costA: 2, costB: 3, costAny: 2.5 });
});

test("paying: the price is saved for the store you bought at and becomes the usual one; at an offer it is counted as spent but nothing else changes", async () => {
  const page = await start(); await win(page);
  const r = await page.evaluate(() => { const a = storeAdd("A"); S.shop.store = a; const t = todayISO();
    S.shop.prices = { "t-rice": { eur: 2, g: 1000, at: t, hist: [{ eur: 2, g: 1000, at: t }] } };
    S.shop.checked = { "t-rice": { g: 1000, eur: 2.4 }, "t-chicken": { g: 400, eur: 1.5, offer: true } }; DATA_V++; ACT["shop-done"]();
    const rp = S.shop.prices["t-rice"], cp = S.shop.prices["t-chicken"]; const b = S.shop.buys.slice(-2);
    return { riceStore: rp.st?.[a]?.eur, riceUsual: rp.eur, chickenPrice: cp ?? null, offer: b.find(x => x.id === "t-chicken").offer === true, sid: b.map(x => x.sid), pref: S.shop.pref["t-rice"] === a, spent: spendIn(t, t).total }; });
  assert.equal(r.riceStore, 2.4); assert.equal(r.riceUsual, 2.4); assert.equal(r.chickenPrice, null, "an offer price never becomes the usual price"); assert.equal(r.offer, true);
  assert.deepEqual(r.sid, [r.sid[0], r.sid[0]]); assert.equal(r.pref, true, "the store you buy it at becomes its usual store"); assert.equal(r.spent, 3.9);
});

test("the list for the store you are in: what you usually buy elsewhere moves to «At other stores», still on the list, with a button to buy it here instead", async () => {
  const page = await start(); await win(page);
  const r = await page.evaluate(() => { const a = storeAdd("A"), b = storeAdd("B"); S.shop.pref["t-rice"] = a; S.shop.pref["t-chicken"] = b; S.shop.store = a; DATA_V++;
    const h = shopPanel(false).h, d = document.createElement("div"); d.innerHTML = h; const here = [...d.querySelectorAll(".shop-list .shop-row .t")].map(x => x.innerText), other = [...d.querySelectorAll(".shop-other .shop-row .t")].map(x => x.innerText);
    const total = shopToBuy().length; ACT["shop-here"]({ dataset: { id: "t-chicken" } }); DATA_V++; const d2 = document.createElement("div"); d2.innerHTML = shopPanel(false).h;
    return { here, other, total, pref: S.shop.pref["t-chicken"] === a, hereAfter: [...d2.querySelectorAll(".shop-list .shop-row .t")].map(x => x.innerText).sort(), otherAfter: d2.querySelectorAll(".shop-other").length }; });
  assert.deepEqual(r.here.filter(x => /rice/.test(x)), ["Test rice"]); assert.deepEqual(r.other, ["Test chicken"]); assert.equal(r.total, 3); assert.ok(r.pref);
  assert.ok(r.hereAfter.includes("Test chicken") && r.hereAfter.includes("Test rice")); assert.equal(r.otherAfter, 0);
});

test("with no store chosen everything is on one list; the store bar only appears once there is a store, plus a way to add the first", async () => {
  const page = await start(); await win(page);
  const r = await page.evaluate(() => { const d0 = document.createElement("div"); d0.innerHTML = shopPanel(false).h; const first = { chips: d0.querySelectorAll('[data-act="store-pick"]').length, add: d0.querySelectorAll('[data-act="stores-open"]').length };
    storeAdd("A"); storeAdd("B"); const d1 = document.createElement("div"); d1.innerHTML = shopPanel(false).h; return { first, labels: [...d1.querySelectorAll('[data-act="store-pick"]')].map(b => b.innerText.trim()), other: d1.querySelectorAll(".shop-other").length }; });
  assert.deepEqual(r.first, { chips: 0, add: 1 }); assert.deepEqual(r.labels, ["All stores", "A", "B"]); assert.equal(r.other, 0);
});

test("spending by store: the totals per store add up to the total", async () => {
  const page = await start();
  const r = await page.evaluate(() => { const a = storeAdd("A"), b = storeAdd("B"), t = todayISO(); S.shop.buys = [{ d: t, id: "t-rice", n: "Test rice", g: 1000, eur: 2, sid: a }, { d: t, id: "t-chicken", n: "Test chicken", g: 400, eur: 5, sid: b }, { d: t, n: "Coffee", eur: 4, x: 1, sid: a }, { d: t, id: "t-oil", n: "Oil", g: 500, eur: 3 }];
    const s = spendIn(t, t); return { by: Object.fromEntries(Object.entries(s.byStore).map(([k, v]) => [storeName(k) || k, v])), total: s.total }; });
  assert.deepEqual(r.by, { A: 6, B: 5, "": 3 }); assert.equal(r.total, 14);
});

test("the Buy sheet asks where and whether it is an offer, and the store chips and the sheet fit a phone", async () => {
  const page = await start(H.VIEWPORTS.phone); await win(page);
  const r = await page.evaluate(() => { storeAdd("Esselunga"); storeAdd("Lidl"); UI.tab = "shop"; scheduleRender(); ACT["shop-buy"]({ dataset: { id: "t-rice" } }); const s = document.querySelector(".sheet");
    const labels = [...s.querySelectorAll('[data-act="by-store"], [data-act="by-offer"]')].map(b => b.innerText.trim()); return { labels, over: s.scrollWidth > s.clientWidth + 1 }; });
  assert.deepEqual(r.labels, ["Any store", "Esselunga", "Lidl", "Usual price", "On offer"]); assert.equal(r.over, false);
  await page.evaluate(() => closeSheet()); await page.waitForTimeout(100);
  const bar = await page.evaluate(() => { const b = document.querySelector(".st-bar"); return b ? { cut: [...b.querySelectorAll("button")].some(x => x.scrollWidth > x.clientWidth + 1), over: document.documentElement.scrollWidth > innerWidth } : null; });
  assert.deepEqual(bar, { cut: false, over: false });
});

test("choosing the store and the offer in the Buy sheet is what the finished trip uses", async () => {
  const page = await start(); await win(page);
  const r = await page.evaluate(() => { const a = storeAdd("A"), b = storeAdd("B"); ACT["shop-buy"]({ dataset: { id: "t-rice" } }); ACT["by-store"]({ dataset: { k: b } }); ACT["by-offer"]({ dataset: { k: "1" } }); UI.sheet.eur = "1.1"; ACT["by-ok"]();
    const c = S.shop.checked["t-rice"]; ACT["shop-done"](); const buy = S.shop.buys.at(-1); return { sid: c.sid === b, offer: c.offer === true, buy: [buy.sid === b, buy.offer, buy.eur], usual: S.shop.prices["t-rice"]?.eur ?? null }; });
  assert.deepEqual(r, { sid: true, offer: true, buy: [true, true, 1.1], usual: null });
});
