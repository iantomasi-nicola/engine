/* L211 (navigation audit, section C): the history layer must never let the screen and the state disagree.
   Hand-computed expectations are in each test. Synthetic data only. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let dir, app;
test.before(async () => { dir = H.build(H.tmp("l211nav-build")); });
test.afterEach(async () => { await app?.close(); app = null; });
const start = async (viewport = H.VIEWPORTS.phone) => { app = await H.startApp({ dir, seed: F.seed({ withPantry: true }), viewport }); return app.page; };
const back = async page => { await page.goBack().catch(() => {}); await page.waitForTimeout(350); };
const go = async (page, fn, a) => { await page.evaluate(fn, a); await page.waitForTimeout(300); };
const where = page => page.evaluate(() => ({ tab: UI.tab, sheet: UI.sheet?.type ?? null, dom: document.querySelector("#sheet-root .sheet")?.getAttribute("aria-label") ?? null }));

test("Back while typing in a nested sheet: the screen shows the parent and nothing is written under the key «undefined»", async () => {
  /* shopq > buy(t-chicken) with the cursor in the pack field: Back = shopq on screen AND in the state; Done there cannot touch checked["undefined"] */
  const page = await start();
  await go(page, () => ACT["shopq-open"]()); await go(page, () => ACT["shop-buy"]({ dataset: { id: "t-chicken" } }));
  await page.click("#by-pack"); await page.keyboard.type("750");
  await back(page);
  const w = await where(page); assert.equal(w.sheet, "shopq"); assert.equal(await page.evaluate(() => !!document.querySelector("#by-pack")), false, "the child is gone from the screen");
  assert.equal(await page.evaluate(() => !!document.querySelector('[data-act="by-ok"]')), false, "no Done button of the child is left to press");
  await go(page, () => ACT["by-ok"]());   // even a stale Done must not write anything
  assert.equal(await page.evaluate(() => Object.keys(S.shop.checked || {}).includes("undefined")), false);
  assert.deepEqual(app.errors, []);
});

test("Escape while typing in a nested sheet returns to the parent on screen as well", async () => {
  const page = await start();
  await go(page, () => ACT["shopq-open"]()); await go(page, () => ACT["shop-buy"]({ dataset: { id: "t-chicken" } }));
  await page.click("#by-pack"); await page.keyboard.type("5"); await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => [UI.sheet?.type, !!document.querySelector("#by-pack")].join()), "shopq,false");
});
