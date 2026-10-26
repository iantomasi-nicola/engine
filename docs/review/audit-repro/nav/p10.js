const H = require("/home/user/engine/tests/lib/harness"), F = require("/home/user/engine/tests/fixtures/synthetic");
const dir = process.argv[2];
(async () => {
  const app = await H.startApp({ dir, seed: F.seed({ withPantry: true }), viewport: H.VIEWPORTS.phone }), p = app.page;
  const tabs = ["plan", "train", "progress"];
  const t0 = Date.now();
  for (let k = 0; k < 60; k++) { await p.evaluate(t => ACT["tab"]({ dataset: { tab: t } }), tabs[k % 3]); await p.waitForTimeout(60); }
  await p.waitForTimeout(500);
  console.log(await p.evaluate(() => ({ hl: history.length, stack: NAV.stack.length, snaps: Object.keys(NAV.snaps).length, i: NAV.i })));
  const perf = await p.evaluate(() => { const a = performance.now(); for (let i = 0; i < 1000; i++) navSync(); return performance.now() - a; }); console.log("1000 navSync ms", perf.toFixed(1));
  let n = 0; while (n < 80) { await p.goBack().catch(() => {}); await p.waitForTimeout(80); n++; if (!p.url().startsWith(app.url)) break; }
  console.log("Back presses to leave", n, p.url());
  console.log("errors", app.errors); await app.close();
})();
