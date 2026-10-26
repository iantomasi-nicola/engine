const H = require("/home/user/engine/tests/lib/harness"), F = require("/home/user/engine/tests/fixtures/synthetic");
const dir = process.argv[2];
const where = p => p.evaluate(() => JSON.stringify({ tab: UI.tab, sheet: UI.sheet?.type ?? null, depth: navDepth(), dom: document.querySelector("#sheet-root .sheet")?.getAttribute("aria-label") ?? null, hl: history.length, i: NAV.i, st: NAV.stack.join(","), state: history.state }));
(async () => {
  const app = await H.startApp({ dir, seed: F.seed({ withPantry: true }), viewport: H.VIEWPORTS.phone }), p = app.page;
  await p.evaluate(() => ACT["shopq-open"]()); await p.waitForTimeout(300);
  await p.evaluate(() => ACT["shop-buy"]({ dataset: { id: "t-chicken" } })); await p.waitForTimeout(300);
  await p.click("#by-pack"); await p.keyboard.type("750"); console.log("typing", await where(p));
  await p.keyboard.press("Escape"); await p.waitForTimeout(400); console.log("after Escape while typing", await where(p));
  await p.keyboard.press("Escape"); await p.waitForTimeout(400); console.log("esc2", await where(p)); await p.evaluate(() => document.activeElement.blur()); await p.waitForTimeout(400);
  console.log("after blur", await where(p), await p.evaluate(() => JSON.stringify({ chickenPack: S.foods["t-chicken"].pack })));
  console.log("errors", app.errors); await app.close();
})();
