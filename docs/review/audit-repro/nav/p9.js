const H = require("/home/user/engine/tests/lib/harness"), F = require("/home/user/engine/tests/fixtures/synthetic");
const dir = process.argv[2];
(async () => {
  const app = await H.startApp({ dir, seed: F.seed({ withPantry: true }), viewport: H.VIEWPORTS.phone }), p = app.page;
  await p.evaluate(() => ACT["tab"]({ dataset: { tab: "progress" } })); await p.waitForTimeout(400);
  const hasChart = await p.evaluate(() => !!document.querySelector("main svg.chart"));
  if (!hasChart) await p.evaluate(() => { document.querySelector("#main").insertAdjacentHTML("beforeend", '<svg class="chart" viewBox="0 0 300 150" aria-label="Test chart" width="300" height="150"><rect width="300" height="150" fill="#ccc"/></svg>'); });
  await p.click("main svg.chart"); await p.waitForTimeout(300);
  console.log("real chart:", hasChart, "fs open", await p.evaluate(() => [!!document.querySelector(".chfs"), UI.tab]));
  await p.goBack(); await p.waitForTimeout(400);
  console.log("after Back", await p.evaluate(() => [!!document.querySelector(".chfs"), UI.tab, document.body.style.overflow]));
  console.log("errors", app.errors); await app.close();
})();
