/* M14b group E (first fix): amounts in euro always show the cents and use one separator style. Synthetic data only. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let dir, app;
test.before(async () => { dir = H.build(H.tmp("m14b-shop-build")); });
test.afterEach(async () => { await app?.close(); app = null; });
test("fmtEur: always two decimals, a decimal comma, a dot for thousands, empty for no value", async () => {
  app = await H.startApp({ dir, seed: F.seed({ withPlan: false }), viewport: H.VIEWPORTS.desktop });
  const r = await app.page.evaluate(() => [12.3, 99.999, 123.456, 1234.5, 20, 0, null, 1234567.891].map(fmtEur));
  assert.deepEqual(r, ["€12,30", "€100,00", "€123,46", "€1.234,50", "€20,00", "€0,00", "", "€1.234.567,89"]);
  assert.deepEqual(app.errors, []);
});
