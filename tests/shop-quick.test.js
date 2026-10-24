/* Shopping touch-ups: a Shopping button in the quick row of Today, "Bought" before the scanner, swipe a list row to replace its product. Synthetic data only. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let dir, app;
test.before(async () => { dir = H.build(H.tmp("shopq-build")); });
test.afterEach(async () => { await app?.close(); app = null; });
const start = async (viewport, tab = "today") => { app = await H.startApp({ dir, seed: F.seed(), viewport }); await app.page.evaluate(t => { UI.tab = t; UI.shopStart = todayISO(); S.shop.range = 7; DATA_V++; scheduleRender(); }, tab); await app.page.waitForTimeout(150); return app.page; };

test("Today: a Shopping button sits in the quick row with the count, opens the quick list, and every tile fits on the three screens", async () => {
  for (const vp of Object.values(H.VIEWPORTS)) {
    const page = await start(vp);
    const r = await page.evaluate(() => { const row = document.querySelector(".td-nudges"), b = row.querySelector('[data-act="shopq-open"]'); const cut = [...row.children].some(x => x.scrollWidth > x.clientWidth + 1 && getComputedStyle(x).overflow !== "visible");
      return { has: !!b, inRow: row.contains(b), badge: +(b.querySelector(".badge")?.textContent || 0) > 0, header: !!document.querySelector(".td-top [data-act='shopq-open']"), cut, over: row.scrollWidth > row.clientWidth + 1, page: document.documentElement.scrollWidth > innerWidth }; });
    assert.deepEqual(r, { has: true, inRow: true, badge: true, header: false, cut: false, over: false, page: false }, vp.width + "px");
    await page.click('.td-nudges [data-act="shopq-open"]'); await page.waitForSelector(".sheet");
    assert.equal(await page.evaluate(() => UI.sheet?.type), "shopq"); await app.close(); app = null;
  }
});

test("Shopping header: Bought comes first, then the scanner, then copy", async () => {
  const page = await start(H.VIEWPORTS.phone, "shop");
  const acts = await page.evaluate(() => [...document.querySelectorAll(".top-row .row > button")].map(b => b.dataset.act));
  assert.deepEqual(acts, ["shop-prod", "shop-scan", "copy-list"]);
});

test("a swipe on a list row (a deliberate one) opens Replace for that product; a short one does nothing; a ticked row asks to untick first", async () => {
  const page = await start(H.VIEWPORTS.phone, "shop");
  const swipe = (id, dx) => page.evaluate(([id, dx]) => { const r = document.querySelector(`.shop-row[data-id="${id}"]`), b = r.getBoundingClientRect(), x = b.x + b.width / 2, y = b.y + b.height / 2, T = (cx, ty) => new Touch({ identifier: 1, target: r.querySelector(".shop-main"), clientX: cx, clientY: y });
    const f = (type, cx) => (r.querySelector(".shop-main")).dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true, touches: type === "touchend" ? [] : [T(cx)], changedTouches: [T(cx)] }));
    f("touchstart", x); for (let i = 1; i <= 8; i++) f("touchmove", x + dx * i / 8); f("touchend", x + dx); return new Promise(res => setTimeout(() => res({ sheet: UI.sheet?.type ?? null, from: UI.sheet?.from ?? null, still: !!document.querySelector(`.shop-row[data-id="${id}"]`) }), 400)); }, [id, dx]);
  const id = await page.evaluate(() => document.querySelector(".shop-row[data-id]").dataset.id);
  assert.deepEqual(await swipe(id, -40), { sheet: null, from: null, still: true });
  const go = await swipe(id, -260); assert.deepEqual([go.sheet, go.from], ["swapfood", id]);
  await page.evaluate(() => closeSheet()); await page.evaluate(id => { S.shop.checked = { [id]: { g: 100 } }; DATA_V++; scheduleRender(); }, id); await page.waitForSelector(`.shop-row.done[data-id="${id}"]`, { timeout: 3000 }).catch(async e => { throw new Error(JSON.stringify(await page.evaluate(() => [UI.tab, UI.sheet?.type, document.querySelectorAll(".shop-row").length, document.body.innerText.slice(0, 200)]))); });
  const r = await swipe(id, -260); assert.equal(r.sheet, null);
  assert.match(await page.evaluate(() => document.querySelector("#toast")?.innerText || ""), /Untick it first/);
});
