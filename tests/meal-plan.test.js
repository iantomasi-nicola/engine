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
  const r = await page.evaluate(() => ({ days: document.querySelectorAll(".pw-day").length, rows: [...document.querySelectorAll(".pw-row")].map(x => x.dataset.meal), items: document.querySelectorAll(".pw-it").length, tot: document.querySelector(".pw-day .pw-kcal")?.innerText, over: document.documentElement.scrollWidth > innerWidth, mon: document.querySelector(".pw-day").dataset.date === weekStartOf(todayISO()) }));
  assert.equal(r.days, 7); assert.deepEqual(r.rows, ["lunch", "dinner", "snack"]); assert.equal(r.items, 21); assert.match(r.tot, /\d/); assert.equal(r.over, false); assert.equal(r.mon, true);
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
