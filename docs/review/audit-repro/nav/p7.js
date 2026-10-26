const H = require("/home/user/engine/tests/lib/harness"), F = require("/home/user/engine/tests/fixtures/synthetic");
const dir = process.argv[2];
(async () => {
  const app = await H.startApp({ dir, seed: F.seed({ withPantry: true }), viewport: H.VIEWPORTS.phone }), p = app.page;
  await p.evaluate(() => { UI.tab = "plan"; UI.fuelTab = "plan"; render(); }); await p.waitForTimeout(400);
  const hgt = await p.evaluate(() => document.documentElement.scrollHeight);
  await p.evaluate(() => window.scrollTo(0, 700)); await p.waitForTimeout(200); const y0 = await p.evaluate(() => scrollY);
  await p.evaluate(() => ACT["tab"]({ dataset: { tab: "progress" } })); await p.waitForTimeout(400);
  await p.goBack(); await p.waitForTimeout(600);
  console.log("plan height", hgt, "scroll before", y0, "after Back", await p.evaluate(() => [UI.tab, scrollY, history.scrollRestoration]));
  // sheet scroll after Back from child
  await p.evaluate(() => ACT["shopq-open"]()); await p.waitForTimeout(300);
  const sh = await p.evaluate(() => { const b = document.querySelector(".sheet-b"); b.scrollTop = 200; return [b.scrollHeight, b.clientHeight, b.scrollTop]; });
  await p.evaluate(() => ACT["shop-buy"]({ dataset: { id: "t-chicken" } })); await p.waitForTimeout(300);
  await p.goBack(); await p.waitForTimeout(400);
  console.log("sheet scroll", sh, "after Back", await p.evaluate(() => [UI.sheet?.type, document.querySelector(".sheet-b").scrollTop]));
  // live player: Back during a running session
  console.log("errors", app.errors); await app.close();
})();
