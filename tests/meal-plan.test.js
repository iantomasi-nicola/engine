/* M5b: lunch ↔ dinner in one action, «What can I cook?» for any meal and day, and the weekly Meal Plan on tablet and desktop (overview, edit, move, copy, duplicate, drag, undo). Synthetic data only. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let dir, app;
test.before(async () => { dir = H.build(H.tmp("mplan-build")); });
test.afterEach(async () => { await app?.close(); app = null; });
const start = async viewport => { app = await H.startApp({ dir, seed: F.seed({ withPlan: false }), viewport }); return app.page; };
/* three real meals a day for the week of today: snack 60 g rice, lunch the bowl, dinner 150 g chicken */
const plan = page => page.evaluate(() => { const t = todayISO(), ws = weekStartOf(t); for (let i = 0; i < 7; i++) { const d = addDays(ws, i);
  S.days[d] = { date: d, meals: { snack: [{ id: "b" + i, kind: "food", ref: "t-rice", qty: 60, eaten: false }], lunch: [{ id: "l" + i, kind: "recipe", ref: "t-bowl", qty: 1, eaten: false }], dinner: [{ id: "d" + i, kind: "food", ref: "t-chicken", qty: 150, eaten: false }] } }; } DATA_V++; UI.date = t; });

test("lunch and dinner swap in one action: items, amounts and recipes travel with the meal; undo puts them back", async () => {
  const page = await start(); await plan(page);
  const r = await page.evaluate(() => { const t = todayISO(), ids = () => ({ l: S.days[t].meals.lunch.map(x => x.id), d: S.days[t].meals.dinner.map(x => x.id) });
    S.days[t].dish = { lunch: "Big bowl" }; const a = ids(); swapMeals(t, "lunch", "dinner"); const b = ids(), dish = S.days[t].dish; toast.undo(); const c = ids(); return { a, b, dish, c }; });
  assert.deepEqual(r.a, { l: ["l" + (await page.evaluate(() => dow(todayISO())))], d: ["d" + (await page.evaluate(() => dow(todayISO())))] });
  assert.deepEqual(r.b, { l: r.a.d, d: r.a.l });
  assert.deepEqual(r.dish, { dinner: "Big bowl" }, "a meal's own name moves with it"); assert.deepEqual(r.c, r.a, "undo");
});

test("the day menu offers «Swap lunch and dinner», and doing it twice is the same as not doing it", async () => {
  const page = await start(); await plan(page);
  const r = await page.evaluate(() => { const t = todayISO(); ACT["day-menu"]({ dataset: { date: t } }); const labels = UI.sheet.items.map(x => x.label); const k = labels.findIndex(l => /Swap lunch and dinner/.test(l));
    const before = JSON.stringify(S.days[t].meals); UI.sheet.items[k].run(); const mid = JSON.stringify(S.days[t].meals); swapMeals(t, "lunch", "dinner"); return { has: k >= 0, changed: before !== mid, same: before === JSON.stringify(S.days[t].meals) }; });
  assert.deepEqual(r, { has: true, changed: true, same: true });
});

test("«What can I cook?» can target another day and meal; what you add lands there", async () => {
  const page = await start(); await plan(page);
  const r = await page.evaluate(() => { const t = todayISO(), d = addDays(weekStartOf(t), 1); S.shop.pantry["t-rice"] = { g: 500 }; S.shop.pantry["t-chicken"] = { g: 400 }; S.shop.pantry["t-oil"] = { g: 100 }; DATA_V++;
    openSheet("cook", { meal: "dinner", date: d }); const html = document.querySelector(".sheet").innerHTML; const hasNav = /ck-go/.test(html), title = document.querySelector(".sheet-h").innerText;
    const n0 = (S.days[d].meals.dinner || []).length; ACT["ck-rec"]({ dataset: { id: "t-bowl" } }); const n1 = S.days[d].meals.dinner.length, today = S.days[t].meals.dinner.length; ACT["ck-go"]({ dataset: { date: addDays(t, 3) } }); return { hasNav, title, n: [n0, n1], today, d3: UI.sheet.date === addDays(t, 3) }; });
  assert.equal(r.hasNav, true); assert.deepEqual(r.n, [1, 2]); assert.equal(r.today, 1, "today was not touched"); assert.equal(r.d3, true);
});

test("the week view is a tablet and desktop thing: it is offered there and not on a phone", async () => {
  for (const [vp, want] of [[H.VIEWPORTS.phone, false], [H.VIEWPORTS.tablet, true], [H.VIEWPORTS.desktop, true]]) {
    const page = await start(vp); await plan(page); await page.evaluate(() => { UI.tab = "plan"; scheduleRender(); }); await page.waitForSelector(".plan-top");
    assert.equal(await page.evaluate(() => !!document.querySelector('[data-act="plan-view"][data-k="week"]')), want, `${vp.width}px`);
    await app.close(); app = null;
  }
});

test("the week view shows seven days by the meals, with each day's total against its target (seven columns on a wide window)", async () => {
  const page = await start({ width: 1920, height: 1080 }); await plan(page);
  await page.evaluate(() => { UI.tab = "plan"; UI.planView = "week"; scheduleRender(); }); await page.waitForSelector(".pw");
  const r = await page.evaluate(() => ({ days: document.querySelectorAll(".pw-day").length, rows: [...document.querySelectorAll(".pw-row")].map(x => x.dataset.meal), items: document.querySelectorAll(".pw-it").length, macDay: [...document.querySelectorAll(".pw-mac")].filter(x => /P \d+ · C \d+ · F \d+/.test(x.textContent)).length, macMeal: [...document.querySelectorAll(".pw-mt")].filter(x => /kcal.*P \d+ · C \d+ · F \d+/.test(x.textContent)).length, tot: document.querySelector(".pw-day .pw-kcal")?.innerText, over: document.documentElement.scrollWidth > innerWidth, mon: document.querySelector(".pw-day").dataset.date === weekStartOf(todayISO()) }));
  assert.equal(r.macDay, 7, "every day shows protein, carbs and fat"); assert.equal(r.macMeal, 21, "every filled meal shows its kcal and macros"); assert.equal(r.days, 7); assert.deepEqual(r.rows, ["lunch", "dinner", "snack"]); assert.equal(r.items, 21); assert.match(r.tot, /\d/); assert.equal(r.over, false); assert.equal(r.mon, true);
});

test("on a PC window too narrow for seven readable columns the week is one row per day, the meals side by side, with nothing cut off", async () => {
  const page = await start(H.VIEWPORTS.desktop); await plan(page);
  await page.evaluate(() => { UI.tab = "plan"; UI.planView = "week"; scheduleRender(); }); await page.waitForSelector(".pw");
  const r = await page.evaluate(() => { const cut = [...document.querySelectorAll(".pw-kcal")].filter(k => k.getBoundingClientRect().right > k.closest(".pw-day").getBoundingClientRect().right - 8).length;
    return { tall: !!document.querySelector(".pw.tall"), days: document.querySelectorAll(".pw-day").length, items: document.querySelectorAll(".pw-it").length, cut, over: document.documentElement.scrollWidth > innerWidth, side: document.querySelector(".pw-mn").scrollWidth > document.querySelector(".pw-mn").clientWidth }; });
  assert.equal(r.tall, true); assert.equal(r.days, 7); assert.equal(r.items, 21); assert.equal(r.cut, 0); assert.equal(r.over, false); assert.equal(r.side, false);
});

test("move, copy and duplicate from the item menu, each with undo; an eaten item can't be moved", async () => {
  const page = await start(H.VIEWPORTS.desktop); await plan(page);
  const r = await page.evaluate(() => { const ws = weekStartOf(todayISO()), a = ws, b = addDays(ws, 1), id = "d0", get = (d, m) => (S.days[d].meals[m] || []).map(x => x.id);
    const out = {}; moveItem({ date: a, meal: "dinner", id }, { date: b, meal: "lunch" }, false); out.move = [get(a, "dinner"), get(b, "lunch").includes(id)];
    toast.undo(); out.undo = [get(a, "dinner"), get(b, "lunch").includes(id)];
    moveItem({ date: a, meal: "dinner", id }, { date: b, meal: "dinner" }, true); out.copy = [get(a, "dinner").length, get(b, "dinner").length, new Set([...get(a, "dinner"), ...get(b, "dinner")]).size];
    moveItem({ date: a, meal: "dinner", id }, { date: a, meal: "dinner" }, true); out.dup = get(a, "dinner").length;
    mutateDay(a, d => { d.meals.snack[0].eaten = true; }); out.eaten = moveItem({ date: a, meal: "snack", id: "b0" }, { date: b, meal: "lunch" }, false); out.eatenStill = get(a, "snack"); return out; });
  assert.deepEqual(r.move, [[], true]); assert.deepEqual(r.undo, [["d0"], false]); assert.deepEqual(r.copy, [1, 2, 3], "the copy has a new id of its own");
  assert.equal(r.dup, 2); assert.equal(r.eaten, false); assert.deepEqual(r.eatenStill, ["b0"]);
});

test("drag an item to another day with the mouse; Alt copies instead of moving", async () => {
  const page = await start(H.VIEWPORTS.desktop); await plan(page);
  await page.evaluate(() => { UI.tab = "plan"; UI.planView = "week"; scheduleRender(); }); await page.waitForSelector(".pw-it");
  const ws = await page.evaluate(() => weekStartOf(todayISO())), b = await page.evaluate(w => addDays(w, 1), ws);
  await page.dragAndDrop(`.pw-it[data-item="d0"]`, `.pw-cell[data-date="${b}"][data-meal="dinner"]`);
  let r = await page.evaluate(([w, b]) => ({ a: (S.days[w].meals.dinner || []).map(x => x.id), b: S.days[b].meals.dinner.length }), [ws, b]); assert.deepEqual(r, { a: [], b: 2 });
  await page.waitForTimeout(150);
  assert.equal(await page.evaluate(() => document.querySelectorAll(".pw-it").length), 21, "the grid redrew with the item in its new place");
});

test("every week-view action has a tap alternative to dragging: the item menu lists move, copy, duplicate, edit and remove", async () => {
  const page = await start(H.VIEWPORTS.tablet); await plan(page);
  await page.evaluate(() => { UI.tab = "plan"; UI.planView = "week"; scheduleRender(); }); await page.waitForSelector(".pw-it");
  await page.click('.pw-it[data-item="d0"] [data-act="pw-item"]');
  const labels = await page.evaluate(() => [...document.querySelectorAll(".sheet button")].map(b => b.innerText.trim()).filter(Boolean));
  for (const w of ["Edit amount", "Move to", "Copy to", "Duplicate", "Remove"]) assert.ok(labels.some(l => l.includes(w)), w + " in " + labels.join("|"));
});

for (const [name, vp] of [["tablet", H.VIEWPORTS.tablet], ["desktop", H.VIEWPORTS.desktop]]) test(`the week view fits the screen — ${name}`, async () => {
  const page = await start(vp); await plan(page);
  await page.evaluate(() => { UI.tab = "plan"; UI.planView = "week"; scheduleRender(); }); await page.waitForSelector(".pw");
  const r = await page.evaluate(() => { const g = document.querySelector(".pw").getBoundingClientRect(); return { over: document.documentElement.scrollWidth > innerWidth, w: Math.round(g.width), inside: g.right <= innerWidth + 1 }; });
  assert.deepEqual([r.over, r.inside], [false, true]);
});

test("Auto-plan again: with every meal already planned a second run builds a new plan that avoids what each meal had; «Cook once, eat twice» is on the same sheet; saved weeks keep a named week and bring it back whole with an undo", async () => {
  const page = await start({ width: 1920, height: 1080 }); await plan(page);
  const r = await page.evaluate(async () => { UI.tab = "plan"; UI.planView = "week"; UI.date = todayISO(); render(); await new Promise(x => setTimeout(x, 100));
    const t = todayISO(), ws = weekStartOf(t), days = [...Array(7)].map((_, i) => addDays(ws, i)).filter(d => d >= t);
    const sig = () => days.map(d => dayItems(getDay(d)).map(([m, it]) => m + "|" + it.ref).sort().join(",")).join(";");
    const btn = !!document.querySelector('[data-act="pw-plan"]'), wtBtn = !!document.querySelector('[data-act="wt-open"]');
    ACT["pw-plan"](); const sh = UI.sheet, mode0 = plannerMode(sh, plannerPreview(plannerDates(sh), sh.mode)), pairsSwitch = !!document.querySelector('[data-act="pl-toggle"][data-k="pairs"]'), again = !!document.querySelector('[data-act="pl-mode"][data-k="again"]');
    const before = sig(); await runPlanner(); await new Promise(x => setTimeout(x, 200)); const after = sig();
    // saved weeks
    const sigAll = () => [...Array(7)].map((_, i) => dayItems(getDay(addDays(ws, i))).map(([m, it]) => m + "|" + it.ref).sort().join(",")).join(";"), keep = sigAll();
    openSheet("weektpl", { name: "" }); UI.sheet.name = "Cutting week"; ACT["wt-save"](); const saved = weekTpls().map(x => x.name), st = weekTplStats(weekTpls()[0]);
    ACT["pw-clear-week"](); ACT["confirm-yes"](); await new Promise(x => setTimeout(x, 100)); const cleared = [...Array(7)].reduce((a, _, i) => a + dayItems(getDay(addDays(ws, i))).length, 0);
    const tid = weekTpls()[0].id; const nextW = addDays(ws, 7); applyWeekTpl(tid, nextW, "replace"); const next = [...Array(7)].reduce((a, _, i) => a + dayItems(getDay(addDays(nextW, i))).length, 0);
    ACT["wt-del"]({ dataset: { id: tid } }); const gone = weekTpls().length;
    return { btn, wtBtn, mode0, pairsSwitch, again, changed: before !== after, saved, n: st.n, cleared, next, gone, keep: keep.length > 0 }; });
  assert.equal(r.btn, true); assert.equal(r.wtBtn, true); assert.equal(r.mode0, "again", "everything planned: the run is a new plan"); assert.equal(r.pairsSwitch, true); assert.equal(r.again, true); assert.equal(r.changed, true, "the second plan differs from the first");
  assert.deepEqual(r.saved, ["Cutting week"]); assert.ok(r.n > 0); assert.equal(r.cleared, 0); assert.ok(r.next > 0, "the saved week is brought back whole on another week"); assert.equal(r.gone, 0);
  assert.deepEqual(app.errors, []);
});

test("a locked meal stays exactly as it is when the week is planned again or a saved week is brought back; the lock shows in the day and the week and goes away with the meal", async () => {
  const page = await start({ width: 1920, height: 1080 }); await plan(page);
  const r = await page.evaluate(async () => { const t = todayISO(), ws = weekStartOf(t), d = t > ws ? t : ws, ids = m => dayItems(getDay(d)).filter(([x]) => x === m).map(([, it]) => it.ref + ":" + it.qty).join(",");
    UI.tab = "plan"; UI.planView = "week"; UI.date = d; render(); await new Promise(x => setTimeout(x, 100));
    const lunch0 = ids("lunch"); UI.date = d; ACT["meal-menu"]({ dataset: { meal: "lunch" } }); const labels = UI.sheet.items.map(i => i.label); const lockItem = UI.sheet.items.find(i => /^Lock/.test(i.label)); closeSheet(); lockItem.run();
    const locked = !!getDay(d).lock?.lunch; render(); await new Promise(x => setTimeout(x, 100)); const mark = document.querySelectorAll(".pw-mt .lk").length;
    ACT["meal-menu"]({ dataset: { meal: "lunch" } }); const l2 = UI.sheet.items.map(i => i.label); closeSheet();
    const sh = { scope: "range", from: d, to: d, mode: "replace", pantry: true }; UI.sheet = { type: "planner", ...sh }; await runPlanner(); await new Promise(x => setTimeout(x, 150));
    const lunch1 = ids("lunch"), dinner1 = ids("dinner");
    const tid = "wk-t"; S.settings.weekTpls = [{ id: tid, name: "T", saved: t, days: [...Array(7)].map(() => ({ meals: { lunch: [{ id: "z", kind: "food", ref: "t-oil", qty: 10, eaten: false }] } })) }];
    applyWeekTpl(tid, ws, "replace"); const lunch2 = ids("lunch");
    ACT["meal-menu"]({ dataset: { meal: "lunch" } }); const un = UI.sheet.items.find(i => /^Unlock/.test(i.label)); closeSheet(); un.run(); const unlocked = !getDay(d).lock;
    return { labels, locked, mark, l2, same: lunch1 === lunch0, same2: lunch2 === lunch0, dinnerChanged: dinner1 !== "", unlocked }; });
  assert.ok(r.labels.some(l => /^Lock/.test(l))); assert.equal(r.locked, true); assert.ok(r.mark >= 1); assert.ok(r.l2.some(l => /^Unlock/.test(l))); assert.ok(!r.l2.some(l => /Re-plan from scratch|Fill the rest/.test(l)), "no automation offered on a locked meal");
  assert.equal(r.same, true, "planned again: the locked meal is untouched"); assert.equal(r.same2, true, "saved week: the locked meal is untouched"); assert.equal(r.unlocked, true);
  assert.deepEqual(app.errors, []);
});
