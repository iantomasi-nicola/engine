const H = require("/home/user/engine/tests/lib/harness"), F = require("/home/user/engine/tests/fixtures/synthetic");
const dir = process.argv[2];
(async () => {
  const app = await H.startApp({ dir, seed: F.seed({ withPantry: true }), viewport: H.VIEWPORTS.phone }), p = app.page;
  const w = () => p.evaluate(() => JSON.stringify({ tab: UI.tab, sheet: UI.sheet?.type ?? null, depth: navDepth(), i: NAV.i, st: NAV.stack.join(",") }));
  await p.evaluate(() => ACT["shopq-open"]()); await p.waitForTimeout(300);
  await p.evaluate(() => ACT["shop-buy"]({ dataset: { id: "t-chicken" } })); await p.waitForTimeout(300);
  await p.evaluate(() => ACT["tab"]({ dataset: { tab: "foods" } })); await p.waitForTimeout(400); console.log("tab from chain", await w());
  await p.goBack(); await p.waitForTimeout(400); console.log("Back", await w());
  // go-week-plan from a sheet (closeSheet then tab change)
  console.log("errors", app.errors); await app.close();
})();
