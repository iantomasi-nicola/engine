/* L202: the Back button (phone gesture / browser) and closing a sheet return to the screen you came from, never to Home.
   Hand-computed expectations: every step is one history entry, so N steps need exactly N Back presses to return to the start.
   Today -> Fuel > Foods (1) -> product sheet (2) -> its editor on top (3): Back x1 = product, Back x2 = Foods, Back x3 = Today.
   Closing a sheet in the app steps the history back too, so one more Back does not reopen it. Synthetic data only.
   ENGINE_L202_REF=<git ref> runs the same file against an older tree (to see the tests fail before the fix). */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let dir, app;
test.before(async () => { dir = process.env.ENGINE_L202_REF ? H.build(H.tmp("l202-ref"), { root: H.exportRef(process.env.ENGINE_L202_REF) }) : H.build(H.tmp("l202-build")); });
test.afterEach(async () => { await app?.close(); app = null; });
const start = async () => { app = await H.startApp({ dir, seed: F.seed({ withPantry: true }), viewport: H.VIEWPORTS.phone }); return app.page; };
const where = page => page.evaluate(() => ({ tab: UI.tab, sheet: UI.sheet?.type ?? null, parent: UI.sheet?._ret?.type ?? null }));
const back = async page => { await page.goBack().catch(() => {}); await page.waitForTimeout(250); };
const go = async (page, fn) => { await page.evaluate(fn); await page.waitForTimeout(250); };
const foods = page => go(page, () => ACT["tab"]({ dataset: { tab: "foods" } }));
const buy = page => go(page, () => ACT["shop-buy"]({ dataset: { id: "t-chicken" } }));

test("Back closes the open sheet and the view underneath is the same", async () => {
  const page = await start(); await foods(page); await buy(page);
  assert.equal((await where(page)).sheet, "buy");
  await back(page); assert.deepEqual(await where(page), { tab: "foods", sheet: null, parent: null });
  assert.equal(await page.evaluate(() => document.querySelector("#sheet-root").innerHTML), "");
  assert.deepEqual(app.errors, []);
});

test("a sheet opened from a sheet: Back and the close button both return to the parent, then to the view", async () => {
  const page = await start(); await foods(page); await buy(page); await go(page, () => ACT["by-edit"]());
  assert.deepEqual(await where(page), { tab: "foods", sheet: "food", parent: "buy" });
  await back(page); assert.deepEqual(await where(page), { tab: "foods", sheet: "buy", parent: null });
  await back(page); assert.deepEqual(await where(page), { tab: "foods", sheet: null, parent: null });
  await buy(page); await go(page, () => ACT["by-edit"]());
  await go(page, () => ACT["close-sheet"]()); assert.equal((await where(page)).sheet, "buy", "close returns to the parent, not Home");
  await go(page, () => ACT["close-sheet"]()); assert.equal((await where(page)).sheet, null);
  await back(page); assert.equal((await where(page)).tab, "today", "closing in the app left no stale entry: the next Back leaves Foods");
});

test("Today > Foods > product: Back twice gives Foods then Today; Back on the first screen leaves the page instead of looping", async () => {
  const page = await start(); await foods(page); await buy(page);
  await back(page); assert.deepEqual(await where(page), { tab: "foods", sheet: null, parent: null });
  await back(page); assert.equal((await where(page)).tab, "today");
  await page.goBack().catch(() => {}); await page.waitForTimeout(400);
  assert.notEqual(page.url(), app.url + "#trap", "no extra entry was pushed at the root");
  assert.ok(page.url() === "about:blank" || page.url().startsWith(app.url), "left the app (blank) or stayed, never errored");
});

test("closing a sheet then switching view keeps Back in step", async () => {
  const page = await start(); await buy(page); await go(page, () => ACT["close-sheet"]());
  await foods(page);
  await back(page); assert.equal((await where(page)).tab, "today");
});

test("a tab switch from inside a sheet chain closes the whole chain", async () => {
  const page = await start(); await go(page, () => { ACT["shop-buy"]({ dataset: { id: "t-chicken" } }); ACT["by-edit"](); });
  await foods(page); assert.deepEqual(await where(page), { tab: "foods", sheet: null, parent: null });
});

test("sub-segment change is a step: Train > Plan then Back returns to the previous segment", async () => {
  const page = await start();
  await go(page, () => { ACT["tab"]({ dataset: { tab: "train" } }); });
  const s0 = await page.evaluate(() => UI.trainSeg);
  await go(page, () => { UI.trainSeg = "log"; scheduleRender(); });
  await back(page); assert.deepEqual(await page.evaluate(() => [UI.tab, UI.trainSeg]), ["train", s0]);
});

test("reload keeps working; deep links ?a= and #report still open their screen", async () => {
  const page = await start(); await foods(page); await app.reload();
  assert.equal(await app.page.evaluate(() => UI.sheet === null), true);
  await app.page.goto(app.url + "?a=shopq-open"); await app.page.waitForTimeout(1800);
  assert.equal((await where(app.page)).sheet, "shopq");
  await app.page.goto(app.url + "?x=1#report"); await app.page.waitForTimeout(1800);
  assert.deepEqual(await app.page.evaluate(() => [UI.tab, UI.progSeg]), ["progress", "reports"]);
  assert.deepEqual(app.errors, []);
});
