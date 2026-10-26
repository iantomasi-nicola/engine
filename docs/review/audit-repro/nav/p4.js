const H = require("/home/user/engine/tests/lib/harness"), F = require("/home/user/engine/tests/fixtures/synthetic");
const dir = process.argv[2];
const where = p => p.evaluate(() => JSON.stringify({ tab: UI.tab, sheet: UI.sheet?.type ?? null, to: UI.sheet?.to, depth: navDepth(), dom: document.querySelector("#sheet-root .sheet")?.getAttribute("aria-label") ?? null, doBtn: !!document.querySelector('[data-act="sf-do"]'), i: NAV.i, st: NAV.stack.join(",") }));
const w = p => p.waitForTimeout(350);
(async () => {
  const app = await H.startApp({ dir, seed: F.seed({ withPantry: true }), viewport: H.VIEWPORTS.phone }), p = app.page;
  await p.evaluate(() => ACT["shopq-open"]()); await w(p);
  await p.evaluate(() => ACT["shop-buy"]({ dataset: { id: "t-rice" } })); await w(p);
  await p.evaluate(() => ACT["by-swap"]()); await w(p);
  await p.evaluate(() => { S_().to = "t-oil"; renderSheet(); }); await w(p); console.log("confirm step", await where(p));
  const plan0 = await p.evaluate(() => JSON.stringify(Object.values(S.days).map(d => d.meals.d?.map(x => x.ref))));
  await p.click('[data-act="sf-do"]'); await w(p); console.log("after swap", await where(p));
  const plan1 = await p.evaluate(() => JSON.stringify(Object.values(S.days).map(d => d.meals.d?.map(x => x.ref))));
  await p.goBack(); await w(p); console.log("Back", await where(p));
  await p.goBack(); await w(p); console.log("Back2", await where(p));
  console.log(plan0, "\n", plan1); console.log("errors", app.errors); await app.close();
})();
