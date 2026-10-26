const H = require("/home/user/engine/tests/lib/harness"), F = require("/home/user/engine/tests/fixtures/synthetic");
const dir = process.argv[2];
const w = p => p.waitForTimeout(350);
(async () => {
  const app = await H.startApp({ dir, seed: F.seed({ withPantry: true }), viewport: H.VIEWPORTS.desktop }), p = app.page;
  await p.evaluate(() => ACT["tab"]({ dataset: { tab: "foods" } })); await w(p);
  await p.evaluate(() => ACT["edit-food"]({ dataset: { id: "t-oil" } })); await w(p);
  await p.evaluate(() => ACT["fd-del"]()); await w(p);
  console.log("deleted", await p.evaluate(() => JSON.stringify({ hidden: S.foods["t-oil"].hidden, sheet: UI.sheet?.type ?? null })));
  await p.goForward(); await w(p);
  console.log("fwd", await p.evaluate(() => JSON.stringify({ sheet: UI.sheet?.type ?? null, dom: document.querySelector("#sheet-root .sheet")?.getAttribute("aria-label") })));
  await p.evaluate(() => ACT["fd-save"]()); await w(p);
  console.log("after save", await p.evaluate(() => JSON.stringify({ hidden: S.foods["t-oil"].hidden, delAt: S.foods["t-oil"].delAt, sheet: UI.sheet?.type ?? null })));
  console.log("errors", app.errors); await app.close();
})();
