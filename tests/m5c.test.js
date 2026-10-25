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
  assert.ok(r.l1.includes("Copy lunch") && r.l1.some(x => /Save as recipe/.test(x)) && r.l1.some(x => /Clear lunch/.test(x)) && !r.l1.some(x => /^Paste/.test(x)), r.l1.join("|"));
  assert.ok(r.l2.some(x => /^Paste lunch of /.test(x)), r.l2.join("|"));
  assert.ok(r.l3.includes("Copy this day") && r.l3.some(x => /^Paste lunch of /.test(x)));
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
