/* L211 review finding 1: a screen that cannot be drawn used to show the emergency card («This screen couldn't be drawn») with no console error and no page error,
   so the "zero pageerror" gate and every test using the harness passed with a broken screen. Now the failure is logged with console.error, the card carries
   data-render-failed, and the harness (tests/lib/harness.js, tests/lib/fake-supabase.js) records it as an error unless the test opts out because it WANTS the card.
   Synthetic data only, no network. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic"), FS = require("./lib/fake-supabase");
let dir; test.before(() => { dir = H.build(H.tmp("l211-render")); });
const boom = p => p.evaluate(() => { VIEWS.today = () => { throw new Error("boom"); }; UI.tab = "today"; render(); });

test("a view that throws: console.error with the cause, and the card is marked", async () => {
  const app = await H.startApp({ dir, seed: F.seed({ withPlan: true }) }), seen = [];
  try {
    app.page.on("console", m => { if (m.type() === "error") seen.push(m.text()); });
    await boom(app.page); await app.page.waitForTimeout(200);
    assert.ok(seen.some(t => /boom/.test(t)), "no console.error with the cause: " + JSON.stringify(seen));
    assert.equal(await app.page.locator("#main [data-render-failed]").count(), 1, "the card has no marker");
    assert.doesNotMatch(await app.page.evaluate(() => document.querySelector("#main [data-render-failed]").innerText), /console|data-render/i, "the marker is not part of the card text");
  } finally { await app.close(); }
});

test("the harness records a failed render as an error, and a test that wants the card opts out", async () => {
  const a = await H.startApp({ dir, seed: F.seed({ withPlan: true }) });
  try { await boom(a.page); await a.page.waitForTimeout(300); assert.ok(a.errors.some(e => /render failed/.test(e)), "the harness did not notice: " + JSON.stringify(a.errors)); } finally { await a.close(); }
  const b = await H.startApp({ dir, seed: F.seed({ withPlan: true }) });
  try { b.allowRenderFailed(); await boom(b.page); await b.page.waitForTimeout(300); assert.deepEqual(b.errors, []); assert.equal(await b.page.locator("[data-render-failed]").count(), 1); } finally { await b.close(); }
});

test("the same for a device of the fake Supabase", async () => {
  const srv = FS.server(), d = await FS.device(srv, "A", { dir, seed: F.seed({ withPlan: true }) });
  try { await boom(d.page); await d.page.waitForTimeout(300); assert.ok(d.errors.some(e => /render failed/.test(e)), JSON.stringify(d.errors)); } finally { await d.close(); }
});

test("a healthy start leaves no marker and no error", async () => {
  const app = await H.startApp({ dir, seed: F.seed({ withPlan: true }) });
  try { for (const t of ["today", "plan", "train", "progress", "settings"]) { await app.page.evaluate(t => { UI.tab = t; render(); }, t); } assert.equal(await app.page.locator("[data-render-failed]").count(), 0); assert.deepEqual(app.errors, []); } finally { await app.close(); }
});
