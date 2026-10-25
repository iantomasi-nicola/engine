/* M8b-2: C3 recipe import (text or photo → review → made) and H10 workout from words, both with the AI answer stubbed. Nothing is saved before the user confirms. Synthetic data only. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let dir, app;
test.before(async () => { dir = H.build(H.tmp("aiimp-build")); });
test.afterEach(async () => { await app?.close(); app = null; });
const start = async viewport => { app = await H.startApp({ dir, seed: F.seed(), viewport }); return app.page; };
const REC = { name: "Riso e pollo", servings: 2, time_min: 25, ingredients: [{ name: "Test rice", grams: 200, unit: "g", kcal: 350, protein: 7, carbs: 78, fat: 1, fiber: 1 }, { name: "Test chicken", grams: 300, unit: "g", kcal: 110, protein: 23, carbs: 0, fat: 2, fiber: 0 }, { name: "Salsa misteriosa", grams: 50, unit: "g", kcal: 120, protein: 2, carbs: 10, fat: 8, fiber: 1 }], steps: ["Cuoci il riso", "Rosola il pollo", "Unisci"] };

test("recipe import: the AI answer is matched to your foods, an unknown ingredient is a new estimated food, and nothing is saved until you confirm", async () => {
  const page = await start(H.VIEWPORTS.phone);
  const r = await page.evaluate(async REC => { Sync.sample = { json: async () => REC }; ACT["new-recipe"](); const entry = !!document.querySelector('[data-act="rcimp-open"]'); ACT["rcimp-open"](); UI.sheet.desc = "ricetta incollata"; await ACT["ri-go"]();
    const R = UI.sheet.res, n0 = [Object.keys(S.foods).length, Object.keys(S.recipes).length];
    const rows = R.rows.map(x => [x.n, x.sel, x.g]); const text = document.querySelector(".sheet").innerText; return { entry, rows, text, n0, n1: [Object.keys(S.foods).length, Object.keys(S.recipes).length] }; }, REC);
  assert.equal(r.entry, true); assert.deepEqual(r.rows, [["Test rice", "t-rice", 200], ["Test chicken", "t-chicken", 300], ["Salsa misteriosa", "__new", 50]]); assert.deepEqual(r.n1, r.n0, "reading it saves nothing"); assert.match(r.text, /Nothing is saved yet/); assert.match(r.text, /an estimate you can edit/);
  const m = await page.evaluate(() => { const sh = UI.sheet; sh.res.rows[1].g = "250"; CHG["ri-sel"]("__skip", { dataset: { i: 1 } }); const nf = Object.keys(S.foods).length, rc0 = Object.keys(S.recipes).length; ACT["ri-make"](); const draft = UI.sheet.draft, made = Object.values(S.foods).filter(f => f.source === "ai");
    const out = { type: UI.sheet.type, ai: draft.ai, ings: draft.ingredients.map(i => [i.food, i.g]), note: draft.note, time: draft.time, servings: draft.servings, newFoods: Object.keys(S.foods).length - nf, madeName: made[0]?.name, recipes: Object.keys(S.recipes).length - rc0 };
    ACT["rc-save"]({ dataset: {} }); out.saved = Object.values(S.recipes).find(x => x.name === "Riso e pollo")?.ingredients.length; return out; });
  assert.equal(m.type, "recipe"); assert.equal(m.ai, true); assert.deepEqual(m.ings.map(x => x[1]), [200, 50]); assert.equal(m.ings[0][0], "t-rice"); assert.equal(m.newFoods, 1); assert.equal(m.madeName, "Salsa misteriosa");
  assert.equal(m.recipes, 0, "the recipe itself is saved only from its own Save"); assert.equal(m.saved, 2); assert.match(m.note, /Cuoci il riso/); assert.equal(m.time, 25);
});

test("recipe import: no ingredient left stays on the review; the entry is hidden without an AI service; the review fits the three screens", async () => {
  for (const vp of Object.values(H.VIEWPORTS)) {
    const page = await start(vp);
    const none = await page.evaluate(() => { ACT["new-recipe"](); return !!document.querySelector('[data-act="rcimp-open"]'); }); assert.equal(none, false, "no AI service: no import button");
    const r = await page.evaluate(async REC => { Sync.sample = { json: async () => REC }; ACT["new-recipe"](); ACT["rcimp-open"](); UI.sheet.desc = "x"; await ACT["ri-go"](); const s = document.querySelector(".sheet"), over = s.scrollWidth > s.clientWidth + 1;
      for (let i = 0; i < 3; i++) CHG["ri-sel"]("__skip", { dataset: { i } }); ACT["ri-make"](); return { over, stay: UI.sheet.type, toast: document.querySelector("#toast")?.innerText || "" }; }, REC);
    assert.deepEqual([r.over, r.stay], [false, "rcimp"], vp.width + "px"); assert.match(r.toast, /No ingredient left/);
    await app.close(); app = null;
  }
});

test("workout from words: the AI writes it, the steps are checked by the player's parser, you can edit it, and nothing is planned until you choose", async () => {
  const page = await start(H.VIEWPORTS.phone);
  const r = await page.evaluate(async () => { Sync.sample = { json: async () => ({ sport: "Running", name: "6x800", script: "Warmup\n- 15m Z2 Pace\n\nMain set 6x\n- 800mtr 3:50/km Pace\n- 90s Rest\n\nCooldown\n- 10m Z1 Pace", min: 60, km: 10, int: "Hard" }) }; const w0 = JSON.stringify(Object.keys(S.logm));
    ACT["wo-import"](); UI.sheet.desc = "15 min warm up, 6x800 at 3:50 with 90s rest, cool down"; await ACT["wi-go"](); const R = UI.sheet.res, text = document.querySelector(".sheet").innerText, name0 = R.name;
    INP["wi-r"]("6x800 edited", { dataset: { k: "name" } }); const same = JSON.stringify(Object.keys(S.logm)) === w0; ACT["wi-plan"](); return { name: name0, sport: R.sport, steps: /steps the player can run/.test(text), same, next: UI.sheet.type, script: /800mtr/.test(UI.sheet.draft.script) }; });
  assert.deepEqual(r, { name: "6x800", sport: "Running", steps: true, same: true, next: "session", script: true });
});

test("describe a workout in words: the entry is in the Free workout sheet and in the session editor, with or without an AI service (without one it says what to add), and from the editor the result is written into that workout", async () => {
  const page = await start(H.VIEWPORTS.phone);
  const no = await page.evaluate(() => { ACT["free-open"](); const link = !!document.querySelector('.sheet [data-act="wo-import"]'); ACT["wo-import"](); return { link, type: UI.sheet.type, note: /Add an AI service/.test(document.querySelector(".sheet").innerText) }; });
  assert.deepEqual(no, { link: true, type: "woimp", note: true });
  const r = await page.evaluate(async () => { closeSheet(); Sync.sample = { json: async () => ({ sport: "Running", name: "6x800", script: "Warmup\n- 15m Z2 Pace\n\nMain set 6x\n- 800mtr 3:50/km Pace\n- 90s Rest", min: 55, km: 9, int: "Hard" }) };
    openSheet("session", { list: "planned", pick: true, date: todayISO(), idx: null, draft: wClean({ sport: "Running", min: "", km: "", int: "Moderate", note: "", script: "" }), back: null }); const ed = UI.sheet; const link = !!document.querySelector('.sheet [data-act="wo-import-ss"]');
    ACT["wo-import-ss"](); UI.sheet.desc = "6x800 at 3:50"; await ACT["wi-go"](); const foot = [...document.querySelectorAll(".sheet-f .btn")].map(b => b.innerText.trim()); ACT["wi-use"]();
    return { link, foot, back: UI.sheet === ed, script: /800mtr/.test(ed.draft.script), min: ed.draft.min, note: ed.draft.note }; });
  assert.deepEqual(r, { link: true, foot: ["Cancel", "Use it in this workout"], back: true, script: true, min: 55, note: "6x800" });
});

test("AI workout from words: the text is cleaned (bullets, fences, 400m = metres, 6× = 6x), the duration comes from the steps rather than the model's guess, a reply with no steps is asked again once, and the assumptions are shown", async () => {
  const page = await start(H.VIEWPORTS.phone);
  const pure = await page.evaluate(() => ({
    a: woNormalize("```\nWarmup\n• 15m Z2 Pace\n\n\n\nMain set 6×\n- 400m 3:50/km Pace\n90s Rest\n```"),
    b: woNormalize("Main set\n- 20m Z2 Pace\n- 1,5km Z3 Pace"),
  }));
  // bullets -> "- ", fences gone, three blank lines -> one, 6× -> 6x, 400m (three digits: metres) -> 400mtr, a step line without "- " gets one; 20m stays minutes, 1,5km -> 1.5km
  assert.equal(pure.a, "Warmup\n- 15m Z2 Pace\n\nMain set 6x\n- 400mtr 3:50/km Pace\n- 90s Rest");
  assert.equal(pure.b, "Main set\n- 20m Z2 Pace\n- 1.5km Z3 Pace");
  const r = await page.evaluate(async () => { let calls = 0;
    Sync.sample = { json: async prompt => { calls++; return calls === 1 ? { sport: "Running", name: "Easy", script: "just run easily for an hour", min: 99, int: "Light" } : { sport: "Running", name: "Easy hour", script: "Main set\n- 40m Z2 Pace\n- 20m Z1 Pace", min: 99, int: "Light", notes: ["No pace given: Z2 assumed"] }; } };
    ACT["wo-import"](); UI.sheet.desc = "easy hour"; await ACT["wi-go"](); const R = UI.sheet.res, text = document.querySelector(".sheet").innerText; return { calls, script: R.script, min: R.min, notes: R.notes, shown: /Z2 assumed/.test(text) }; });
  assert.equal(r.calls, 2); assert.match(r.script, /40m Z2 Pace/);
  assert.equal(r.min, 60, "40 + 20 minutes from the steps, not the 99 of the model");
  assert.deepEqual(r.notes, ["No pace given: Z2 assumed"]); assert.ok(r.shown);
  assert.deepEqual(app.errors, []);
});
