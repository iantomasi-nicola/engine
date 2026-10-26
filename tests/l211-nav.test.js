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

/* ---- camera: a browser with a fake camera (no real device, no network) ---- */
const camApp = async () => {
  const { chromium } = H.loadPlaywright(), srv = await H.serve(dir), browser = await chromium.launch({ args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] });
  const ctx = await browser.newContext({ viewport: H.VIEWPORTS.phone, serviceWorkers: "block", permissions: ["camera"] }), errors = [];
  await ctx.addInitScript(([k, v]) => { localStorage.setItem("engine.localOnly", "true"); if (!sessionStorage.getItem("__s")) { localStorage.setItem(k, v); sessionStorage.setItem("__s", 1); } }, [H.LS_KEY, JSON.stringify(F.seed({ withPantry: true }))]);
  await ctx.route(u => !/127\.0\.0\.1|localhost/.test(new URL(u).hostname), r => r.abort());
  const page = await ctx.newPage(); page.on("pageerror", e => errors.push(e.message));
  await page.goto(srv.url); await page.waitForFunction(() => typeof S !== "undefined" && S.settings); await page.waitForTimeout(600);
  app = { page, errors, close: async () => { await browser.close(); srv.close(); } }; return page;
};
const cam = page => page.evaluate(() => ({ overlay: !!document.getElementById("cam"), live: !!CAM.stream && CAM.stream.getTracks().some(t => t.readyState === "live"), onCode: !!CAM.onCode, sheet: UI.sheet?.type ?? null }));
const camOn = async (page, opener) => { await go(page, opener); await page.waitForFunction(() => !!CAM.stream, null, { timeout: 8000 }); const c = await cam(page); assert.equal(c.overlay && c.live, true, "camera is on"); };

test("Back with the camera open turns it off and shows the sheet it was opened from", async () => {
  /* shopq > scan(+camera): one Back = shopq, camera overlay gone, no live track */
  const page = await camApp();
  await go(page, () => ACT["shopq-open"]()); await camOn(page, () => ACT["shop-scan"]());
  await back(page);
  assert.deepEqual(await cam(page), { overlay: false, live: false, onCode: false, sheet: "shopq" });
  assert.deepEqual(app.errors, []);
});

test("Back from the food editor's own barcode camera also turns it off and drops its handler", async () => {
  const page = await camApp();
  await go(page, () => ACT["tab"]({ dataset: { tab: "foods" } })); await go(page, () => ACT["edit-food"]({ dataset: { id: "t-oil" } }));
  await camOn(page, () => ACT["fd-scan"]());
  assert.equal((await cam(page)).onCode, true);
  await back(page);
  assert.deepEqual(await cam(page), { overlay: false, live: false, onCode: false, sheet: null });
});

test("a scanned product opened from the pantry add sheet: closing it returns to that sheet, not to the scan screen, and the camera is off", async () => {
  /* pantry-prod (prodadd) > pd-scan (scan+camera) > code of a food we have > pantry sheet; X = prodadd; the scan sheet is not a stop on the way back */
  const page = await camApp();
  await page.evaluate(() => { S.foods["t-chicken"].barcode = "8000000000017"; DATA_V++; });
  await go(page, () => ACT["pantry-prod"]()); await camOn(page, () => ACT["pd-scan"]());
  await page.evaluate(() => camHit("8000000000017")); await page.waitForFunction(() => UI.sheet?.type === "pantry", null, { timeout: 5000 }); await page.waitForTimeout(300);
  assert.deepEqual(await cam(page), { overlay: false, live: false, onCode: false, sheet: "pantry" });
  await go(page, () => ACT["close-sheet"]());
  assert.equal((await cam(page)).sheet, "prodadd", "back where the scan was started");
  await back(page); assert.equal((await cam(page)).sheet, null, "and one Back more leaves the add sheet");
});

test("scan started from Foods: Save to Foods or a closed editor leaves no scan screen underneath", async () => {
  const page = await camApp();
  await page.evaluate(() => { S.foods["t-chicken"].barcode = "8000000000017"; DATA_V++; });
  await go(page, () => ACT["tab"]({ dataset: { tab: "foods" } })); await camOn(page, () => ACT["open-scan"]());
  await page.evaluate(() => camHit("8000000000017")); await page.waitForFunction(() => UI.sheet?.type === "scan" && UI.sheet.stage === "found", null, { timeout: 5000 }); await page.waitForTimeout(300);
  await go(page, () => ACT["fnd-edit"]());
  assert.equal((await cam(page)).sheet, "food");
  await go(page, () => ACT["close-sheet"]());
  assert.deepEqual(await cam(page), { overlay: false, live: false, onCode: false, sheet: null });
});

test("after Swap is done, Back does not reopen the confirmation that was already carried out", async () => {
  /* shopq(1) > buy(2) > swapfood(3, confirm) > Swap = back to shopq(1). History must be [Today, shopq] again: one Back = the view, not the swap screen */
  const page = await start();
  await go(page, () => ACT["shopq-open"]()); await go(page, () => ACT["shop-buy"]({ dataset: { id: "t-rice" } })); await go(page, () => ACT["by-swap"]());
  await go(page, () => ACT["sf-pick"]({ dataset: { id: "t-oil" } }));
  await go(page, () => ACT["sf-do"]()); await page.waitForTimeout(300);
  assert.equal((await where(page)).sheet, "shopq");
  assert.equal(await page.evaluate(() => NAV.i), 1, "the history is back to two entries");
  await back(page); assert.equal((await where(page)).sheet, null, "Back leaves the list, it does not reopen the swap");
  assert.deepEqual(app.errors, []);
});
