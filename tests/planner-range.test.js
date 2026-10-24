/* M9a (L28, E1): Auto-plan on any range of days from today, and a meal that already has food is never touched when you fill the gaps. Synthetic data only. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let dir, app;
test.before(async () => { dir = H.build(H.tmp("plr-build")); });
test.afterEach(async () => { await app?.close(); app = null; });
const start = async (viewport = H.VIEWPORTS.phone) => { app = await H.startApp({ dir, seed: F.seed({ withPlan: false }), viewport }); return app.page; };
/* three days from tomorrow: day 1 has a lunch you wrote, day 2 has an eaten dinner, day 3 is empty */
const SETUP = `(() => { const t = todayISO(), d1 = addDays(t, 1), d2 = addDays(t, 2);
  S.days[d1] = { date: d1, meals: { lunch: [{ id: "mine1", kind: "food", ref: "t-rice", qty: 123, eaten: false }] }, dish: { lunch: "My own lunch" } };
  S.days[d2] = { date: d2, meals: { dinner: [{ id: "ate1", kind: "food", ref: "t-chicken", qty: 200, eaten: true }] } }; DATA_V++; })()`;
const same = `(a, b) => JSON.stringify(a) === JSON.stringify(b)`;

test("fill the gaps on a custom range: meals that already have food stay exactly as they are, empty ones are planned, and the message says how many were left", async () => {
  const page = await start(); await page.evaluate(SETUP);
  const r = await page.evaluate(async () => { const t = todayISO(), d1 = addDays(t, 1), d3 = addDays(t, 3), before = JSON.stringify([S.days[d1].meals.lunch, S.days[d1].dish, S.days[addDays(t, 2)].meals.dinner]);
    openSheet("planner", { scope: "range", from: d1, to: d3, mode: "fill", pantry: true }); const text = document.querySelector(".sheet").innerText; await runPlanner();
    const after = JSON.stringify([S.days[d1].meals.lunch, S.days[d1].dish, S.days[addDays(t, 2)].meals.dinner]); const planned = [d1, addDays(t, 2), d3].map(d => Object.keys(S.days[d].meals).filter(m => (S.days[d].meals[m] || []).length).sort().join(",")); return { text, kept: before === after, planned, toast: document.querySelector("#toast")?.innerText || "", day4: !!S.days[addDays(t, 4)]?.meals && Object.values(S.days[addDays(t, 4)].meals).some(x => x.length) }; });
  assert.ok(r.kept, "the lunch you wrote and the eaten dinner are untouched"); assert.match(r.text, /3 days/); assert.match(r.text, /meals? already/i); assert.ok(r.planned.every(x => x.split(",").length >= 2), "every day has several meals now: " + r.planned); assert.match(r.toast, /Planned 3 days/); assert.match(r.toast, /left as they were/); assert.equal(r.day4, false, "nothing outside the range");
});

test("start fresh says how many planned items it replaces, replaces them, and still keeps what you ate", async () => {
  const page = await start(); await page.evaluate(SETUP);
  const r = await page.evaluate(async () => { const t = todayISO(), d1 = addDays(t, 1), d2 = addDays(t, 2); openSheet("planner", { scope: "range", from: d1, to: d2, mode: "replace", pantry: true }); const text = document.querySelector(".sheet").innerText; await runPlanner();
    return { text, mine: S.days[d1].meals.lunch.some(x => x.id === "mine1"), ate: S.days[d2].meals.dinner.some(x => x.id === "ate1") }; });
  assert.match(r.text, /1 planned item will be replaced/); assert.equal(r.mine, false); assert.equal(r.ate, true);
});

test("the range selector: day, 7 days, next week and custom; custom starts today at the earliest, never runs more than a month, and the count follows", async () => {
  const page = await start();
  const r = await page.evaluate(() => { const t = todayISO(); const n = o => plannerDates({ ...o, mode: "fill" }).length, mon = addDays(weekStartOf(t), 7);
    return { day: n({ scope: "day" }), week: n({ scope: "week" }), weekPairs: n({ scope: "week", pairs: true }), nextFirst: plannerDates({ scope: "next" })[0] === mon, next: n({ scope: "next" }), range: n({ scope: "range", from: addDays(t, 2), to: addDays(t, 11) }), past: plannerDates({ scope: "range", from: addDays(t, -5), to: addDays(t, 1) })[0] === t, backwards: n({ scope: "range", from: addDays(t, 4), to: addDays(t, 1) }), cap: n({ scope: "range", from: t, to: addDays(t, 200) }) }; });
  assert.deepEqual(r, { day: 1, week: 7, weekPairs: 8, nextFirst: true, next: 7, range: 10, past: true, backwards: 1, cap: 31 });
  const ui = await page.evaluate(() => { openSheet("planner", { scope: "day", mode: "fill", pantry: true }); const labels = [...document.querySelectorAll('.sheet [data-act="pl-scope"]')].map(b => b.innerText.trim()); ACT["pl-scope"]({ dataset: { k: "range" } }); return { labels, inputs: document.querySelectorAll('.sheet input[type="date"]').length, foot: document.querySelector(".sheet-f .btn").innerText.trim() }; });
  assert.deepEqual(ui.labels.slice(1), ["7 days", "Next week", "Custom"]); assert.equal(ui.inputs, 2); assert.match(ui.foot, /Plan 7 days/);
});

test("the planner sheet fits the three screens, with the custom range open", async () => {
  for (const vp of Object.values(H.VIEWPORTS)) {
    const page = await start(vp); const r = await page.evaluate(() => { openSheet("planner", { scope: "range", from: todayISO(), to: addDays(todayISO(), 9), mode: "replace", pantry: true }); const s = document.querySelector(".sheet"); return { over: s.scrollWidth > s.clientWidth + 1 || document.documentElement.scrollWidth > innerWidth, cut: [...s.querySelectorAll(".seg button")].some(b => b.scrollWidth > b.clientWidth + 1) }; });
    assert.deepEqual(r, { over: false, cut: false }, vp.width + "px"); await app.close(); app = null;
  }
});
