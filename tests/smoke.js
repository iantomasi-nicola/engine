/* Usage: node tests/smoke.js [git-ref]   (no ref = the working tree; a ref builds that commit instead)
   Startup smoke test: the app must boot and render on phone, tablet and desktop with no script errors.
   Exit code 1 on any failure. Screenshots go to $ENGINE_SHOTS (default: a temp folder, printed at the end). */
const fs = require("fs"), path = require("path"), H = require("./lib/harness");
(async () => {
  const ref = process.argv[2], dir = H.build(H.tmp("smoke-build"), ref ? { root: H.exportRef(ref) } : {}), shots = process.env.ENGINE_SHOTS || H.tmp("smoke-shots"); fs.mkdirSync(shots, { recursive: true });
  let failed = 0;
  for (const [name, vp] of Object.entries(H.VIEWPORTS)) {
    const app = await H.startApp({ dir, viewport: vp });
    const text = await app.page.evaluate(() => document.body.innerText.trim());
    const problems = [...app.errors];
    if (text.length < 40) problems.push("blank page (body text: " + text.length + " chars)");
    for (const tab of ["today", "train", "plan", "progress", "settings"]) {
      await app.page.evaluate(t => { UI.tab = t; scheduleRender(); }, tab).catch(e => problems.push(`tab ${tab}: ${e.message}`));
      await app.page.waitForTimeout(250);
      if ((await app.page.evaluate(() => document.body.innerText.trim().length)) < 40) problems.push(`tab ${tab} renders blank`);
    }
    await app.page.evaluate(() => { UI.tab = "today"; scheduleRender(); }); await app.page.waitForTimeout(250);
    await app.page.screenshot({ path: path.join(shots, `${name}.png`) });
    problems.push(...app.errors.filter(e => !problems.includes(e)));
    await app.close();
    console.log(`${problems.length ? "FAIL" : "ok  "} ${name} ${vp.width}x${vp.height}${problems.length ? "\n   " + [...new Set(problems)].join("\n   ") : ""}`);
    if (problems.length) failed++;
  }
  console.log("screenshots:", shots);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
