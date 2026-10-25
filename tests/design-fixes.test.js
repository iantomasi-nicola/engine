/* Design review of 25 Oct (docs/ROADMAP.md, «Design review 1»): the two defects that change behaviour get a test first.
   Synthetic data only. Expected values: pills start on the 16 px gutter (the header's `.seg` padding used to beat `.seg.many`); the protein advice picks the same food at every render. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let dir, app;
test.before(async () => { dir = H.build(H.tmp("designfix-build")); });
test.afterEach(async () => { await app?.close(); app = null; });
const start = async (seed = F.seed({ withPlan: true, withPantry: true }), viewport) => { app = await H.startApp({ dir, seed, viewport }); return app.page; };

test("defect 4: the row of Progress pills starts on the page gutter and the active pill is fully in view", async () => {
  const page = await start(undefined, H.VIEWPORTS.phone);
  for (const seg of ["overview", "body", "nutrition", "weeks"]) {
    const r = await page.evaluate(seg => { UI.tab = "progress"; UI.progSeg = seg; render(); const g = document.querySelector("header.top .seg.many"), b = g.querySelector('[aria-pressed="true"]'), x = b.getBoundingClientRect(), t = document.querySelector(".top-title").getBoundingClientRect();
      return { left: x.left, right: x.right, title: t.left, vw: innerWidth, scrolls: g.scrollWidth > g.clientWidth }; }, seg);
    assert.ok(r.scrolls, `${seg}: the row scrolls sideways on a phone`);
    assert.ok(r.left >= 16 - 0.5, `${seg}: the active pill is not under the left fade (left ${r.left})`);
    assert.ok(r.right <= r.vw - 16 + 0.5, `${seg}: the active pill is not under the right fade (right ${r.right})`);
    if (seg === "overview") assert.ok(Math.abs(r.left - r.title) < 1, `the first pill lines up with the title (${r.left} vs ${r.title})`);
  }
  assert.equal(app.errors.length, 0);
});

test("defect 10: the protein advice proposes the same food at every render, whatever the variety setting", async () => {
  const page = await start();
  const r = await page.evaluate(() => { S.settings.variety = 3; const meal = activeMeals().find(m => m.kind === "s")?.id || activeMeals().slice(-1)[0].id, seen = new Set();
    for (let i = 0; i < 40; i++) { const pk = proteinPick(45, meal); seen.add(pk ? pk.food.id + "@" + pk.q : "none"); }
    const tips = new Set(); for (let i = 0; i < 12; i++) tips.add(coachInsights(todayISO()).filter(x => /protein short/.test(x.t)).map(x => x.d).join("|"));
    return { picks: [...seen], tips: [...tips] }; });
  assert.equal(r.picks.length, 1, "one food, one quantity: " + r.picks.join(", "));
  assert.notEqual(r.picks[0], "none");
  assert.equal(r.tips.length, 1, "the sentence on screen is the same too");
});
