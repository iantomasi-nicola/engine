const H = require("/home/user/engine/tests/lib/harness"), F = require("/home/user/engine/tests/fixtures/synthetic");
const dir = process.argv[2];
(async () => {
  const app = await H.startApp({ dir, seed: F.seed({ withPantry: true }), viewport: H.VIEWPORTS.phone }), p = app.page;
  await p.goto(app.url + "?a=shopq-open"); await p.waitForTimeout(1800);
  console.log("open", await p.evaluate(() => [UI.sheet?.type, location.search, history.length]));
  await p.evaluate(() => ACT["close-sheet"]()); await p.waitForTimeout(500);
  console.log("closed", await p.evaluate(() => [UI.sheet?.type, location.search]));
  await p.reload(); await p.waitForTimeout(1800);
  console.log("reload", await p.evaluate(() => [UI.sheet?.type, location.search]));
  await p.goto(app.url + "#report"); await p.waitForTimeout(1800);
  console.log("report", await p.evaluate(() => [UI.tab, UI.progSeg, location.hash, NAV.stack.join(",")]));
  await p.goBack(); await p.waitForTimeout(500); console.log("report back", await p.evaluate(() => [UI.tab, location.hash]), p.url());
  console.log("errors", app.errors); await app.close();
})();
