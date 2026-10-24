/* Pantry screen regressions. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");

test("B4: the Pantry no longer shows the 'Not in the plan yet' list, and planning from the pantry stays reachable", async () => {
  const app = await H.startApp({ dir: H.build(H.tmp("pantry-build")), seed: F.seed({ withPantry: true }) });
  try {
    // 150 g of rice at home, plan far away from it: the old note listed it
    await app.page.evaluate(() => { S.shop.pantry["t-oil"] = { g: 300 }; S.days = {}; DATA_V++; UI.tab = "pantry"; scheduleRender(); });
    await app.page.waitForTimeout(300);
    const r = await app.page.evaluate(() => ({ html: VIEWS.pantry(), text: document.body.innerText }));
    assert.ok(r.html.includes("Test rice") && r.html.includes("Test oil"), "pantry rows are still listed");
    assert.ok(!r.html.includes("Not in the plan yet") && !r.text.includes("Not in the plan yet"), "the list is gone");
    assert.ok(r.html.includes('data-act="plan-pantry"'), "the 'plan meals from the pantry' action is still there");
    assert.deepEqual(app.errors, []);
  } finally { await app.close(); }
});
