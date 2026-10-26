/* Settings › Reminders: the options fold away (closed), each with one line of state; the rows the other features add (weekly report, push) still sit inside their fold.
   The group was ~2240 px tall on a phone; closed folds keep it to about 1300. Synthetic data only. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let app;
test.afterEach(async () => { await app?.close(); app = null; });
const start = async () => { app = await H.startApp({ dir: H.build(H.tmp("remfold-build")), seed: F.seed({ withPlan: false }), viewport: H.VIEWPORTS.phone }); return app.page; };

test("the reminder options are three closed folds with a state line, and the report and push rows live inside the last one", async () => {
  const page = await start();
  const r = await page.evaluate(() => { const box = document.createElement("div"); box.innerHTML = reminderPrefs();
    const f = [...box.querySelectorAll("details.rem-f")];
    return { keys: f.map(d => d.dataset.k), open: f.map(d => d.open), subs: f.map(d => d.querySelector("summary small").textContent),
      reportInMore: !!box.querySelector('details[data-k="rem-more"] #rep-at'), pushInMore: !!box.querySelector('details[data-k="rem-more"] [data-act="push-toggle"]'), icsInMore: !!box.querySelector('details[data-k="rem-more"] [data-act="rem-ics"]'),
      masterOutside: !!box.querySelector('[data-act="rem-toggle"]') && !box.querySelector('details [data-act="rem-toggle"]') }; });
  assert.deepEqual(r.keys, ["rem-pre", "rem-ck", "rem-more"]); assert.deepEqual(r.open, [false, false, false], "closed by default");
  assert.match(r.subs[0], /^(Off|Remind me to eat · [\d.]+ h before · )/); assert.match(r.subs[1], /^\d of \d on · reminders at \d\d:\d\d$/);
  assert.ok(r.reportInMore && r.pushInMore && r.icsInMore && r.masterOutside);
  assert.deepEqual(app.errors, []);
});

test("an open fold stays open after a switch inside it redraws Settings", async () => {
  const page = await start();
  const r = await page.evaluate(async () => { UI.tab = "settings"; UI.setOpen = { rem: true }; UI.setDet = { "rem-pre": true }; scheduleRender(); await new Promise(x => setTimeout(x, 300));
    const d = () => document.querySelector('details[data-k="rem-pre"]'); const was = d().open; ACT["pre-set"]({ dataset: { k: "on", v: "true" } }); await new Promise(x => setTimeout(x, 300));
    return { was, now: d().open, lead: !!document.querySelector('details[data-k="rem-pre"] [data-k="lead"]') }; });
  assert.equal(r.was, true); assert.equal(r.now, true); assert.equal(r.lead, true, "the options of the switched-on reminder are inside the fold");
  assert.deepEqual(app.errors, []);
});
