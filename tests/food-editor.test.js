/* Food editor: favourite is a star by the name; the planner role is one simple choice (picked from the values for a new food);
   "Good for" and "Leave out of auto-plan" are gone from the screen, and nothing already saved is lost. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let app;
test.afterEach(async () => { await app?.close(); app = null; });
const start = async (vp) => { app = await H.startApp({ dir: H.build(H.tmp("fe-build")), seed: F.seed(), viewport: vp }); return app.page; };

test("the editor has a star by the name and one 'Counts as' choice; no Good-for chips, no Leave-out switch", async () => {
  const page = await start();
  const body = await page.evaluate(() => SHEETS.food({ draft: clone(S.foods["t-rice"]), isNew: false }).body);
  assert.match(body, /data-act="fd-toggle" data-k="fav"/); assert.match(body, /id="fd-role"/);
  for (const gone of ["Good for", "Planner role", "Leave out of auto-plan", "fd-meal", "Shows first and gets priority"]) assert.ok(!body.includes(gone), "still there: " + gone);
});

test("the star toggles the favourite and it is saved with the food", async () => {
  const page = await start();
  const r = await page.evaluate(() => { ACT["edit-food"]({ dataset: { id: "t-rice" } }); ACT["fd-toggle"]({ dataset: { k: "fav" } }); const on = S_().draft.fav; ACT["fd-save"](); return { on, saved: S.foods["t-rice"].fav }; });
  assert.deepEqual(r, { on: true, saved: true });
});

test("a new hand-made food gets its role and meals from its values; picking a role changes both", async () => {
  const page = await start();
  const r = await page.evaluate(() => {
    openSheet("food", { draft: { ...blankFood("Test chicken breast"), per: { kcal: 110, p: 23, c: 0, f: 2, fib: 0, sug: 0, sat: 0, salt: 0 } }, isNew: true });
    SHEETS.food(S_()); const auto = { role: S_().draft.role, meals: S_().draft.meals };
    CHG["fd-role"]("F"); const set = { role: S_().draft.role, meals: S_().draft.meals, flag: S_().draft._roleSet };
    SHEETS.food(S_());   // rendering again must not undo the choice
    return { auto, set, still: S_().draft.role };
  });
  assert.deepEqual(r.auto, { role: "P", meals: ["m"] }); assert.deepEqual(r.set, { role: "F", meals: ["m", "s"], flag: true }); assert.equal(r.still, "F");
});

test("nothing is lost: a food left out of auto-plan stays out, with a way back; roles and meals already saved are kept", async () => {
  const page = await start();
  const r = await page.evaluate(() => {
    S.foods["t-oil"].noPlan = true; S.foods["t-oil"].meals = ["b", "s"]; DATA_V++;
    const body = SHEETS.food({ draft: clone(S.foods["t-oil"]), isNew: false }).body;
    ACT["edit-food"]({ dataset: { id: "t-oil" } }); ACT["fd-toggle"]({ dataset: { k: "noPlan" } }); const back = S_().draft.noPlan; ACT["fd-save"]();
    return { note: /Include it again/.test(body), back, meals: S.foods["t-oil"].meals, noPlan: S.foods["t-oil"].noPlan, role: S.foods["t-oil"].role };
  });
  assert.equal(r.note, true); assert.equal(r.back, false); assert.deepEqual(r.meals, ["b", "s"]); assert.equal(r.noPlan, false); assert.equal(r.role, "F");
});

test("the editor fits a phone and a desktop without sideways scroll", async () => {
  for (const [n, vp] of [["phone", H.VIEWPORTS.phone], ["desktop", H.VIEWPORTS.desktop]]) {
    const page = await start(vp);
    const r = await page.evaluate(async () => { ACT["edit-food"]({ dataset: { id: "t-rice" } }); await new Promise(r => setTimeout(r, 400)); const a = document.querySelector("#fd-name").getBoundingClientRect(), b = document.querySelector("[data-k=fav]").getBoundingClientRect(); return { sw: document.documentElement.scrollWidth, iw: innerWidth, sameRow: Math.abs(a.top - b.top) < 12, starInside: b.right <= innerWidth }; });
    assert.ok(r.sw <= r.iw && r.sameRow && r.starInside, JSON.stringify(r) + " " + n);
    await page.screenshot({ path: require("path").join(process.env.ENGINE_SHOTS || require("os").tmpdir(), `food-editor-${n}.png`) });
    await app.close(); app = null;
  }
});

test("compact editor: macros, portions, pack and aisle are on the first screen; extras fold into three sections that stay as you left them", async () => {
  app = await H.startApp({ dir: H.build(H.tmp("fe2-build")), seed: F.seed(), viewport: H.VIEWPORTS.phone });
  const page = app.page;
  const r = await page.evaluate(async () => {
    ACT["edit-food"]({ dataset: { id: "t-rice" } }); await new Promise(r => setTimeout(r, 400));
    const vis = sel => { const e = document.querySelector(sel); if (!e) return null; const b = e.getBoundingClientRect(); return b.top >= 0 && b.bottom <= innerHeight; };
    const first = { kcal: vis("#fd-kcal"), carbs: vis("#fd-c"), pack: vis("#fd-pack"), aisle: vis("#fd-cat"), save: vis("[data-act=fd-save]") };
    const secs = [...document.querySelectorAll("details.fd-more")].map(d => [d.dataset.k, d.open]);
    document.querySelector('details[data-k="price"]').open = true; document.querySelector('details[data-k="price"]').dispatchEvent(new Event("toggle"));
    await new Promise(r => setTimeout(r, 50)); ACT["fd-unit"]({ dataset: { u: "ml" } }); await new Promise(r => setTimeout(r, 100));   // the sheet redraws
    return { first, secs, priceStillOpen: document.querySelector('details[data-k="price"]')?.open, moreStillClosed: !document.querySelector('details[data-k="more"]')?.open };
  });
  assert.deepEqual(r.first, { kcal: true, carbs: true, pack: true, aisle: true, save: true });
  assert.deepEqual(r.secs, [["more", false], ["price", false], ["details", false]]);
  assert.equal(r.priceStillOpen, true); assert.equal(r.moreStillClosed, true);
});

test("compact editor: typing a macro recalculates kcal when 'kcal from macros' is on; the hint explains it; saving keeps every field", async () => {
  const page = await start();
  const r = await page.evaluate(() => {
    openSheet("food", { draft: { ...blankFood("Test oats"), per: { kcal: 0, p: 13, c: 60, f: 7, fib: 10, sug: 1, sat: 1.2, salt: 0.01 } }, isNew: true });
    SHEETS.food(S_()); const auto = S_().draft.autoKcal, hint = fdCalcHTML(S_().draft);
    INP["fd-per"]("70", { dataset: { k: "c" } }); const kcal = S_().draft.per.kcal;
    ACT["fd-auto"](); const off = S_().draft.autoKcal; INP["fd-per"]("500", { dataset: { k: "kcal" } }); const warn = fdCalcHTML(S_().draft);
    S_().draft.servings = [{ l: "1 bowl", g: 40 }]; S_().draft.pack = "500"; ACT["fd-save"]();
    const f = Object.values(S.foods).find(x => x.name === "Test oats");
    return { auto, hint, kcal, off, warn, saved: f && { kcal: f.per.kcal, fib: f.per.fib, salt: f.per.salt, serv: f.servings, pack: f.pack } };
  });
  assert.equal(r.auto, true); assert.match(r.hint, /4 × protein/); assert.equal(r.kcal, 4 * 13 + 4 * 70 + 9 * 7 + 2 * 10);
  assert.equal(r.off, false); assert.match(r.warn, /Use \d+/);
  assert.deepEqual(r.saved, { kcal: 500, fib: 10, salt: 0.01, serv: [{ l: "1 bowl", g: 40 }], pack: 500 });
});
