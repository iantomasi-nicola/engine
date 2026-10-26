/* M5c (owner's request 26/10): the weekly meal plan as fast as possible: copy/paste a day or a meal, drag whole meals and whole days (drag = move, Alt = copy),
   the meal menu in the week view (copy, paste, save as a recipe, clear), and typed foods that prefer what is at home. Synthetic data only. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let dir, app;
test.before(async () => { dir = H.build(H.tmp("m5c-build")); });
test.afterEach(async () => { await app?.close(); app = null; });
const start = async viewport => { app = await H.startApp({ dir, seed: F.seed({ withPlan: false }), viewport: viewport || H.VIEWPORTS.desktop }); return app.page; };
/* the week of today: snack 60 g rice, lunch the bowl, dinner 150 g chicken, on every day; Monday's lunch has a name of its own */
const plan = page => page.evaluate(() => { const t = todayISO(), ws = weekStartOf(t); for (let i = 0; i < 7; i++) { const d = addDays(ws, i);
  S.days[d] = { date: d, meals: { snack: [{ id: "b" + i, kind: "food", ref: "t-rice", qty: 60, eaten: false }], lunch: [{ id: "l" + i, kind: "recipe", ref: "t-bowl", qty: 1, eaten: false }], dinner: [{ id: "d" + i, kind: "food", ref: "t-chicken", qty: 150, eaten: false }] } }; } S.days[ws].dish = { lunch: "Monday bowl" }; DATA_V++; });

test("a whole meal moves or copies to another day: new ids on a copy, eaten items stay put, the name travels onto an empty meal, undo restores both days", async () => {
  const page = await start(); await plan(page);
  const r = await page.evaluate(() => { const ws = weekStartOf(todayISO()), a = ws, b = addDays(ws, 1), c = addDays(ws, 2);
    const before = JSON.stringify([S.days[a], S.days[b]]);
    S.days[b].meals.dinner = []; DATA_V++;                       // an empty dinner on Tuesday: the name has somewhere to land
    moveMeal({ date: a, meal: "lunch" }, { date: b, meal: "dinner" }, true);
    const copied = S.days[b].meals.dinner.map(x => x.ref), keptSrc = S.days[a].meals.lunch.length, newId = S.days[b].meals.dinner[0].id !== S.days[a].meals.lunch[0].id, dish = S.days[b].dish?.dinner;
    S.days[a].meals.snack[0].eaten = true; DATA_V++;
    moveMeal({ date: a, meal: "snack" }, { date: c, meal: "snack" }, false);   // eaten: nothing moves
    const eatenStays = S.days[a].meals.snack.length;
    moveMeal({ date: a, meal: "dinner" }, { date: c, meal: "lunch" }, false);
    const moved = { src: mealItemsOf(a, "dinner").length, dst: S.days[c].meals.lunch.map(x => x.ref) };
    toast.undo(); const back = mealItemsOf(a, "dinner").length === 1 && mealItemsOf(c, "lunch").length === 1;
    return { copied, keptSrc, newId, dish, eatenStays, moved, back }; });
  assert.deepEqual(r.copied, ["t-bowl"]); assert.equal(r.keptSrc, 1); assert.ok(r.newId); assert.equal(r.dish, "Monday bowl");
  assert.equal(r.eatenStays, 1); assert.deepEqual(r.moved, { src: 0, dst: ["t-bowl", "t-chicken"] }); assert.ok(r.back);
  assert.deepEqual(app.errors, []);
});

test("a whole day copies or moves onto another day; the clipboard pastes a day or a meal on as many places as you like, adding and never replacing", async () => {
  const page = await start(); await plan(page);
  const r = await page.evaluate(() => { const ws = weekStartOf(todayISO()), a = ws, b = addDays(ws, 3), c = addDays(ws, 4);
    S.days[b] = { date: b, meals: {} }; S.days[c] = { date: c, meals: { lunch: [{ id: "x", kind: "food", ref: "t-rice", qty: 80, eaten: false }] } }; DATA_V++;
    moveDay(a, b, true); const copiedDay = Object.fromEntries(Object.entries(S.days[b].meals).map(([m, v]) => [m, v.length])), srcIntact = Object.values(S.days[a].meals).every(v => v.length === 1);
    copyToClip("meal", a, "dinner"); pasteClip(c, "dinner"); pasteClip(c, "dinner");     // twice: adds twice
    const dinner2 = S.days[c].meals.dinner.map(x => x.ref + x.qty);
    copyToClip("day", a); pasteClip(c); const lunchC = S.days[c].meals.lunch.map(x => x.ref + ":" + x.qty);     // the day lands on top of what is there
    const dishC = S.days[c].dish?.lunch;
    moveDay(b, addDays(ws, 5), false); const movedAway = Object.values(S.days[b]?.meals || {}).every(v => v.length === 0);
    return { copiedDay, srcIntact, dinner2, lunchC, dishC, movedAway }; });
  assert.deepEqual(r.copiedDay, { snack: 1, lunch: 1, dinner: 1 }); assert.ok(r.srcIntact);
  assert.deepEqual(r.dinner2, ["t-chicken150", "t-chicken150"], "pasted twice: it adds twice");
  assert.deepEqual(r.lunchC, ["t-rice:80", "t-bowl:1"], "what was there stays, the pasted lunch is added");
  assert.equal(r.dishC, undefined, "the meal already had items: the pasted name is not applied"); assert.ok(r.movedAway);
});

test("the week view has a meal-menu button and a grip on every meal and a draggable header on every day; the button opens the meal menu with copy, paste (after a copy), save as recipe and clear", async () => {
  const page = await start(); await plan(page);
  const r = await page.evaluate(async () => { UI.tab = UI.fuelTab = "plan"; UI.planView = "week"; UI.date = todayISO(); render(); await new Promise(x => setTimeout(x, 100));
    const grips = document.querySelectorAll(".pw-mh[draggable=true]").length, heads = document.querySelectorAll(".pw-day[draggable=true]").length, cm = document.querySelectorAll('[data-act="pw-cm"]').length;
    const t = todayISO(); ACT["pw-cm"]({ dataset: { date: t, meal: "lunch" } }); const l1 = UI.sheet.items.map(x => x.label); closeSheet();
    copyToClip("meal", t, "lunch"); ACT["pw-cm"]({ dataset: { date: t, meal: "dinner" } }); const l2 = UI.sheet.items.map(x => x.label); closeSheet();
    ACT["day-menu"](); const l3 = UI.sheet.items.map(x => x.label);
    return { grips, heads, cm, l1, l2, l3 }; });
  assert.equal(r.grips, 21); assert.equal(r.heads, 7); assert.equal(r.cm, 21);     // 3 meals x 7 days
  assert.ok(r.l1.includes("Copy lunch to…") && r.l1.some(x => /Save as recipe/.test(x)) && r.l1.some(x => /Clear lunch/.test(x)) && !r.l1.some(x => /^Paste/.test(x)), r.l1.join("|"));
  assert.ok(!r.l2.some(x => /^(Paste|Copy lunch$)/.test(x)) && !r.l3.some(x => /^Paste|^Copy this day$/.test(x)), "copy and paste are buttons, not menu rows: " + r.l2.join("|"));
  assert.ok(r.l3.includes("Copy this day to…"));
  assert.deepEqual(app.errors, []);
});

test("typed foods prefer what is at home: with two rices the one in the pantry comes first, and it says «at home»", async () => {
  const page = await start();
  const r = await page.evaluate(() => { S.foods["z-rice-a"] = { id: "z-rice-a", name: "Zeta rice", unit: "g", per: { kcal: 350, p: 7, c: 78, f: 1, fib: 1 }, servings: [], pack: 500, cat: "pantry", role: "C", meals: ["lunch"], source: "custom" };
    S.foods["z-rice-b"] = { ...S.foods["z-rice-a"], id: "z-rice-b", name: "Zeta rice basmati" }; DATA_V++;
    const none = foodSearch("zeta rice", "all").map(x => x.x.id).filter(i => /^z-/.test(i)); S.shop.pantry["z-rice-b"] = { g: 400 }; DATA_V++;
    const home = foodSearch("zeta rice", "all").map(x => x.x.id).filter(i => /^z-/.test(i));
    openSheet("add", { date: todayISO(), meal: "lunch", seg: "recent", q: "zeta rice" }); const html = document.querySelector(".sheet").innerHTML;
    return { none, home, tag: /at home/.test(html) }; });
  assert.deepEqual(r.none, ["z-rice-a", "z-rice-b"], "no stock: the shorter name first"); assert.deepEqual(r.home, ["z-rice-b", "z-rice-a"], "in stock: it comes first"); assert.ok(r.tag);
});

/* Auto-complete (owner's request 26/10): every empty meal of the week gets what you usually have there: the same weekday and meal of the most recent previous week that has it (up to 8 weeks back),
   else the most common combination for that meal in the last 21 days. Filled meals, past days, treats and eaten flags are left alone; one undo for the whole fill. */
test("auto-complete fills only the empty meals from the same weekday of the latest earlier week, else the commonest recent combination, never past days, never treats; one undo", async () => {
  const page = await start();
  const r = await page.evaluate(() => { const t = todayISO(), ws = addDays(weekStartOf(t), 14), prev = addDays(ws, -7), prev2 = addDays(ws, -14);
    const it = (id, ref, qty, x) => ({ id, kind: "food", ref, qty, eaten: true, ...(x || {}) });
    // two weeks back: Monday lunch rice; last week: Monday lunch chicken (the latest wins), Monday dinner a treat, Tuesday snack rice x2 days (commonest)
    S.days[prev2] = { date: prev2, meals: { lunch: [it("p2", "t-rice", 80)] } };
    S.days[prev] = { date: prev, meals: { lunch: [it("p1", "t-chicken", 150)], dinner: [it("p3", "t-rice", 100, { cheat: true })] } };
    for (const k of [-3, -2, -1]) { const d = addDays(ws, k); S.days[d] = { date: d, meals: { snack: [it("s" + k, "t-rice", 60)] } }; }   // the days just before this week: a snack habit
    const tue = addDays(ws, 1); S.days[ws] = { date: ws, meals: { dinner: [it("mine", "t-chicken", 200, { eaten: false })] } };   // Monday dinner already planned: untouched
    DATA_V++;
    const n = autoCompleteDays([...Array(7)].map((_, i) => addDays(ws, i)));
    const mon = S.days[ws].meals, tu = S.days[tue]?.meals || {};
    const out = { n, monLunch: (mon.lunch || []).map(x => x.ref + x.qty + x.eaten), monDinner: (mon.dinner || []).map(x => x.id), tuSnack: (tu.snack || []).map(x => x.ref + x.qty), monSnack: (mon.snack || []).map(x => x.ref), tuLunch: (tu.lunch || []).length, treat: JSON.stringify(S.days[ws]).includes("cheat") };
    toast.undo(); out.undone = !S.days[ws].meals.lunch && S.days[ws].meals.dinner.length === 1;
    return out; });
  assert.deepEqual(r.monLunch, ["t-chicken150false"], "the latest earlier Monday lunch, as a plan (not eaten)");
  assert.deepEqual(r.monDinner, ["mine"], "an already planned meal is not touched");
  assert.deepEqual(r.tuSnack, ["t-rice60"], "no Tuesday history: the commonest snack of the last days");
  assert.ok(r.n >= 8, "filled " + r.n); assert.equal(r.treat, false, "a treat is never copied"); assert.ok(r.undone, "one undo restores the whole week");
  assert.deepEqual(app.errors, []);
});
test("the week view has one «Auto-plan week» button (habits or targets inside), a clipboard chip once something is copied, and a paste button in every cell then", async () => {
  const page = await start(); await plan(page);
  const r = await page.evaluate(async () => { UI.tab = UI.fuelTab = "plan"; UI.planView = "week"; UI.date = todayISO(); UI.mclip = null; render(); await new Promise(x => setTimeout(x, 100));
    const fill = !!document.querySelector('[data-act="pw-plan"]'), chip0 = !!document.querySelector(".pw-clip"), paste0 = document.querySelectorAll('[data-act="meal-paste"]:not([disabled])').length;
    copyToClip("meal", todayISO(), "lunch"); render(); await new Promise(x => setTimeout(x, 100));
    const chip1 = document.querySelector(".pw-clip")?.innerText || "", paste1 = document.querySelectorAll('[data-act="meal-paste"]:not([disabled])').length;
    ACT["mclip-clear"](); render(); await new Promise(x => setTimeout(x, 100)); return { fill, chip0, paste0, chip1, paste1, after: !!document.querySelector(".pw-clip") }; });
  assert.equal(r.fill, true); assert.equal(r.chip0, false); assert.equal(r.paste0, 0);
  assert.match(r.chip1, /lunch/i); assert.equal(r.paste1, 20);   // every cell but the one it was copied from assert.equal(r.after, false);
  assert.deepEqual(app.errors, []);
});

test("the foods and recipes library: closed by default, opens beside (or above) the week, searches, filters by tab, and a dropped row adds the item to that meal with an undo", async () => {
  const page = await start(); await plan(page);
  const r = await page.evaluate(async () => { UI.tab = UI.fuelTab = "plan"; UI.planView = "week"; UI.date = todayISO(); UI.pwLib = false; render(); await new Promise(x => setTimeout(x, 100));
    const closed = !document.querySelector(".pw-lib"); ACT["pw-lib"](); await new Promise(x => setTimeout(x, 150));
    const open = !!document.querySelector(".pw-lib"), rows0 = document.querySelectorAll(".pw-lr").length;
    INP["pw-lq"]("chicken"); const q = [...document.querySelectorAll(".pw-lr b")].map(b => b.textContent.trim());
    INP["pw-lq"](""); ACT["pw-seg"]({ dataset: { k: "recipes" } }); const rec = [...document.querySelectorAll(".pw-lr")].every(x => x.dataset.t === "recipe") && document.querySelectorAll(".pw-lr").length > 0;
    S.shop.pantry["t-rice"] = { g: 200 }; DATA_V++; ACT["pw-seg"]({ dataset: { k: "foods" } }); ACT["pw-home"](); const home = [...document.querySelectorAll(".pw-lr")].map(x => x.dataset.ref), homeOn = document.querySelector('[data-act="pw-home"]').getAttribute("aria-pressed");
    ACT["pw-seg"]({ dataset: { k: "recipes" } }); const homeRec = [...document.querySelectorAll(".pw-lr")].every(x => x.dataset.t === "recipe" && foodInPantry(getRecipe(x.dataset.ref), true)); ACT["pw-home"](); const homeOff = document.querySelector('[data-act="pw-home"]').getAttribute("aria-pressed"), allRec = document.querySelectorAll(".pw-lr").length;
    ACT["pw-seg"]({ dataset: { k: "foods" } });
    const t = addDays(weekStartOf(todayISO()), 2); const n0 = (S.days[t].meals.snack || []).length; dropLib({ t: "food", ref: "t-chicken", qty: 120 }, t, "snack"); const added = S.days[t].meals.snack.at(-1); const n1 = S.days[t].meals.snack.length;
    toast.undo(); const n2 = (S.days[t].meals.snack || []).length;
    return { closed, open, rows0, q, rec, home, homeOn, homeRec, homeOff, allRec, added: added && [added.kind, added.ref, added.qty, added.eaten], n: [n0, n1, n2] }; });
  assert.equal(r.closed, true); assert.equal(r.open, true); assert.ok(r.rows0 > 0);
  assert.ok(r.q.length > 0 && r.q.every(x => /chicken/i.test(x)), "search: " + r.q.join("|")); assert.ok(r.rec, "the Recipes tab shows recipes only");
  assert.ok(r.home.includes("t-rice"), "At home: " + r.home.join("|")); assert.equal(r.homeOn, "true"); assert.equal(r.homeOff, "false"); assert.ok(r.homeRec, "At home also filters the recipes tab"); assert.ok(r.allRec > 0); assert.deepEqual(r.added, ["food", "t-chicken", 120, false]); assert.deepEqual(r.n, [1, 2, 1]);
  assert.deepEqual(app.errors, []);
});

test("each filled day has its own copy and clear buttons and the week has «Clear week» (with a confirmation and an undo); an emptied day loses its copy and clear tools", async () => {
  const page = await start(); await plan(page);
  const r = await page.evaluate(async () => { UI.tab = UI.fuelTab = "plan"; UI.planView = "week"; UI.date = todayISO(); UI.mclip = null; render(); await new Promise(x => setTimeout(x, 100));
    const ws = weekStartOf(todayISO()), q = a => document.querySelectorAll(a).length, cnt = d => dayItems(getDay(d)).length;
    const tools = q('[data-act="day-copy"]:not([disabled])'), clears = q('[data-act="clear-day"]'), weekBtn = q('[data-act="pw-clear-week"]');
    ACT["day-copy"]({ dataset: { date: ws } }); const clip = UI.mclip?.scope;
    ACT["clear-day"]({ dataset: { date: addDays(ws, 1) } }); const afterDay = cnt(addDays(ws, 1)), others = cnt(ws);
    render(); await new Promise(x => setTimeout(x, 100)); const toolsAfter = q('[data-act="day-copy"]:not([disabled])');
    ACT["pw-clear-week"](); const sheet = UI.sheet?.type; ACT["confirm-yes"](); await new Promise(x => setTimeout(x, 100));
    const weekLeft = [...Array(7)].reduce((a, _, i) => a + cnt(addDays(ws, i)), 0);
    return { tools, clears, weekBtn, clip, afterDay, others, toolsAfter, sheet, weekLeft }; });
  assert.equal(r.tools, 7); assert.equal(r.clears, 7); assert.equal(r.weekBtn, 1); assert.equal(r.clip, "day"); assert.equal(r.afterDay, 0); assert.equal(r.others, 3); assert.equal(r.toolsAfter, 6, "the emptied day loses its tools");
  assert.equal(r.sheet, "confirm"); assert.equal(r.weekLeft, 0);
  assert.deepEqual(app.errors, []);
});

test("one Auto-plan sheet plans from your habits or from your targets: with habits it fills the gaps (or starts fresh) from what you usually have, with no calculation, and keeps what is locked", async () => {
  const page = await start(); await plan(page);
  const r = await page.evaluate(async () => { const t = todayISO(), ws = weekStartOf(t), d = addDays(t, 2);
    const first = () => dayItems(getDay(d)).map(([m, it]) => m + "|" + it.ref + ":" + it.qty).sort().join(",");
    for (let k = 1; k <= 3; k++) { const past = addDays(d, -7 * k); S.days[past] = { date: past, meals: { lunch: [{ id: "h" + k, kind: "food", ref: "t-rice", qty: 90, eaten: true }], dinner: [{ id: "g" + k, kind: "food", ref: "t-chicken", qty: 200, eaten: true }] } }; }
    S.days[d] = { date: d, meals: { lunch: [{ id: "keep", kind: "food", ref: "t-oil", qty: 10, eaten: false }], dinner: [{ id: "x", kind: "food", ref: "t-oil", qty: 5, eaten: false }] }, lock: { lunch: true } }; DATA_V++;
    UI.tab = UI.fuelTab = "plan"; UI.planView = "week"; UI.date = d; render(); await new Promise(x => setTimeout(x, 100));
    const buttons = [...document.querySelectorAll(".pw-acts [data-act]")].map(b => b.dataset.act);
    openSheet("planner", { scope: "range", from: d, to: d, mode: "replace", pantry: true, how: "habits" }); const sheetHow = !!document.querySelector('[data-act="pl-how"]'), noAgain = !document.querySelector('[data-act="pl-mode"][data-k="again"]'), noPairs = !document.querySelector('[data-act="pl-toggle"][data-k="pairs"]');
    await runPlanner(); await new Promise(x => setTimeout(x, 150)); const after = first();
    return { buttons, sheetHow, noAgain, noPairs, after, saved: S.settings.planPrefs?.how }; });
  assert.ok(r.buttons.includes("pw-plan")); assert.ok(!r.buttons.includes("pw-autofill")); assert.equal(r.sheetHow, true); assert.equal(r.noAgain, true); assert.equal(r.noPairs, true);
  assert.match(r.after, /lunch\|t-oil:10/, "the locked meal is untouched"); assert.match(r.after, /dinner\|t-chicken:200/, "dinner starts fresh from the habit"); assert.equal(r.saved, "habits");
  assert.deepEqual(app.errors, []);
});
