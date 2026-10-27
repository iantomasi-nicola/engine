/* Settings: every switch row has the switch first, on the left, with the text after it (Water and caffeine and Carb cycling had it on the right). Synthetic data only. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let app;
test.afterEach(async () => { await app?.close(); app = null; });

test("the switch comes first in every row of Water and caffeine and of Carb cycling", async () => {
  app = await H.startApp({ dir: H.build(H.tmp("swside-build")), seed: F.seed({ withPlan: false }), viewport: H.VIEWPORTS.phone });
  const r = await app.page.evaluate(() => { S.settings.hydra = { ...(S.settings.hydra || {}), on: true, caffOn: true }; S.settings.carbCycle = { ...(S.settings.carbCycle || {}), on: true };
    const out = {}; for (const [k, html] of [["water", hydraSettings()], ["carb", ccSettings()]]) { const box = document.createElement("div"); box.innerHTML = html;
      out[k] = [...box.querySelectorAll(".sw-row")].map(row => ({ first: row.firstElementChild?.classList.contains("switch"), spread: /space-between/.test(row.getAttribute("style") || "") })); }
    return out; });
  for (const k of ["water", "carb"]) { assert.ok(r[k].length >= 1, k + " has rows"); for (const row of r[k]) { assert.equal(row.first, true, k + ": switch first"); assert.equal(row.spread, false, k + ": not pushed to the far side"); } }
  assert.deepEqual(app.errors, []);
});
