/* M4: quick wins — recipe icon alignment (C8), collapsible sidebar (J1), Check-in date picker (I1),
   weekly running goal (G2), most-used foods (I2), weather place (F1). */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let app, dir;
test.before(() => { dir = H.build(H.tmp("m4-build")); });
test.afterEach(async () => { await app?.close(); app = null; });
const start = async (seed = F.seed(), vp) => { app = await H.startApp({ dir, seed, viewport: vp }); return app.page; };

test("C8: the recipe icon and the dish name sit on the same line in the Meal Plan (phone, tablet, desktop), also with the pantry jar", async () => {
  for (const [n, vp] of Object.entries(H.VIEWPORTS)) {
    const page = await start(F.seed(), vp);
    const r = await page.evaluate(async () => {
      const d = S.days[todayISO()]; d.meals = { lunch: d.meals.m, dinner: d.meals.d }; d.meals.lunch[0].pan = true; S.shop.pantry["t-rice"] = { g: 500 }; DATA_V++; UI.tab = "plan"; UI.fuelTab = "plan"; UI.date = todayISO(); scheduleRender(); await new Promise(r => setTimeout(r, 500));
      const out = [];
      for (const row of document.querySelectorAll(".item-name")) { const icons = row.querySelectorAll(".ic"); if (!icons.length) continue;
        const rng = document.createRange(); const txt = [...row.childNodes].reverse().find(x => x.nodeType === 3 ? x.textContent.trim() : x.classList?.contains("nm")); if (!txt) continue; rng.selectNodeContents(txt);
        const t = rng.getBoundingClientRect(), tc = t.top + t.height / 2; for (const i of icons) { const b = i.getBoundingClientRect(); out.push(Math.abs(b.top + b.height / 2 - tc)); } }
      return { n: out.length, worst: Math.max(0, ...out) };
    });
    assert.ok(r.n >= 2, `${n}: icons found ${r.n}`); assert.ok(r.worst <= 2.5, `${n}: icon is ${r.worst.toFixed(1)}px off the text line`);
    await app.close(); app = null;
  }
});

test("J1: the side menu collapses to a rail and expands again on tablet and desktop; the choice is remembered; phones keep the bottom bar", async () => {
  const state = () => app.page.evaluate(() => { const side = document.querySelector("#side"), b = side.getBoundingClientRect(), m = document.querySelector(".main").getBoundingClientRect();
    return { cls: [...document.body.classList].filter(c => c.startsWith("side-")), w: Math.round(b.width), mainLeft: Math.round(m.left), icon: Math.round(side.querySelector('.side-btn .ic').getBoundingClientRect().width), toggle: !!side.querySelector("[data-act=side-toggle]") && getComputedStyle(side.querySelector("[data-act=side-toggle]")).display !== "none", labels: [...side.querySelectorAll(".side-btn span")].some(x => x.offsetWidth > 0 && x.textContent.trim().length > 0 && !x.closest(".ic")) }; });
  const tap = async () => { await app.page.evaluate(() => ACT["side-toggle"]()); await app.page.waitForTimeout(450); };
  for (const [n, vp, first, second] of [["desktop", H.VIEWPORTS.desktop, "side-full", "side-rail"], ["tablet", H.VIEWPORTS.tablet, "side-rail", "side-full"]]) {
    await start(F.seed(), vp); const a = await state(); assert.deepEqual(a.cls, [first], n); assert.ok(a.toggle, n + " toggle");
    await tap(); const b = await state(); assert.deepEqual(b.cls, [second], n);
    assert.ok(b.mainLeft !== a.mainLeft || b.w !== a.w, n + " layout changes"); if (second === "side-rail") assert.equal(b.w, 80, n + " rail is 80 px");
    assert.equal(b.icon, second === "side-rail" ? 56 : 24, n + " icons keep their size");
    await app.reload(); const c = await state(); assert.deepEqual(c.cls, [second], n + " remembered after reload"); assert.deepEqual(app.errors, []);
    await tap(); const d = await state(); assert.deepEqual(d.cls, [first], n);
    await app.page.screenshot({ path: require("path").join(process.env.ENGINE_SHOTS || require("os").tmpdir(), `side-${n}.png`) });
    await app.close(); app = null;
  }
  await start(F.seed(), H.VIEWPORTS.phone); const p = await state(); assert.deepEqual(p.cls, []); assert.equal(p.toggle, false);
  assert.ok(await app.page.evaluate(() => getComputedStyle(document.querySelector("#bnav")).display !== "none"), "bottom bar on phones");
});

test("I1: the Check-in opens any day with previous / next / a date picker, edits a past day and the dependent figures follow", async () => {
  const page = await start(F.seed({ withPlan: false }), H.VIEWPORTS.phone);
  const r = await page.evaluate(async () => {
    const t = todayISO(), y = addDays(t, -3); openSheet("checkin", { date: t, live: true }); await new Promise(r => setTimeout(r, 300));
    const head = () => document.querySelector(".sheet-h .day-nav span")?.textContent;
    const today = head(); ACT["ci-go"]({ dataset: { date: addDays(t, -1) } }); await new Promise(r => setTimeout(r, 150)); const prev = head();
    const el = document.querySelector('input[data-in="day-pick"]'); el.value = y; el.dispatchEvent(new Event("input", { bubbles: true })); await new Promise(r => setTimeout(r, 150)); const picked = head(), sheetDate = S_().date;
    CHG.ci("81.5", { dataset: { k: "weight" } }); await new Promise(r => setTimeout(r, 100));
    const stored = logGet(y).weight, trend = energyAt(y).trend, other = logGet(t)?.weight ?? null;
    const sw = document.documentElement.scrollWidth <= innerWidth, hdrW = Math.round(document.querySelector(".sheet-h").getBoundingClientRect().width);
    return { today, prev, picked, sheetDate: sheetDate === y, stored, trendMoved: Math.abs(trend - 81.5) < 3, other, sw, hdrW };
  });
  assert.match(r.today, /Today/); assert.match(r.prev, /Log · Yesterday/); assert.match(r.picked, /Log ·/); assert.equal(r.sheetDate, true);
  assert.equal(r.stored, 81.5); assert.equal(r.other, null, "today is untouched"); assert.ok(r.sw);
  assert.deepEqual(app.errors, []);
  await page.screenshot({ path: require("path").join(process.env.ENGINE_SHOTS || require("os").tmpdir(), "checkin-nav.png") });
});

test("G2: weekly running goal — progress, history judged by the goal of each week, persistence, the chart shows it", async () => {
  const page = await start(F.seed({ withPlan: false }), H.VIEWPORTS.phone);
  const r = await page.evaluate(async () => {
    const t = todayISO(), ws = weekStartOf(t), run = (d, km) => { const m = d.slice(0, 7); S.logm[m] = S.logm[m] || { days: {} }; (S.logm[m].days[d] = S.logm[m].days[d] || {}).workouts = [{ sport: "Running", min: km * 6, km }]; };
    S.logm = {}; run(addDays(ws, -14), 20); run(addDays(ws, -7), 30); run(ws, 12); S.days = {}; DATA_V++;
    const none = { goal: kmGoalFor(ws), card: /Set a weekly distance/.test(kmGoalCard()) };
    CHG["km-goal"]("25"); const oldWeek = addDays(ws, -7);
    const a = { now: kmGoalFor(ws), prev: kmGoalFor(oldWeek), km: weekKm(ws) };
    S.settings.fit.run.kmGoals.unshift({ from: addDays(ws, -21), km: 28 }); S.settings.fit.run.kmGoals.sort((x, y) => x.from.localeCompare(y.from)); DATA_V++;   // an older goal of 28 km
    const hist = { w2: kmGoalFor(addDays(ws, -14)), w1: kmGoalFor(oldWeek), w0: kmGoalFor(ws) };
    CHG["km-goal"]("30"); const changed = { thisWeek: kmGoalFor(ws), history: S.settings.fit.run.kmGoals.length };    // same week: replaced, not stacked
    CHG["km-goal"]("0"); const off = { thisWeek: kmGoalFor(ws), lastWeek: kmGoalFor(oldWeek) };
    CHG["km-goal"]("25");
    const card = kmGoalCard(), chart = kmChart();
    UI.tab = "train"; UI.trainSeg = "running"; scheduleRender(); await new Promise(r => setTimeout(r, 500));
    return { none, a, hist, changed, off, card: { km: /12\.?\d* <\/b>|<b[^>]*>12</.test(card), goal: /\/ 25 km this week/.test(card), togo: /13 km to go/.test(card), reached: /Reached in/.test(card) }, chartGoal: (chart.match(/stroke-dasharray/g) || []).length, greenBars: (chart.match(/var\(--good\)/g) || []).length, sw: document.documentElement.scrollWidth <= innerWidth, shown: !!document.querySelector("#km-goal") };
  });
  assert.deepEqual(r.none, { goal: 0, card: true });
  assert.deepEqual(r.a, { now: 25, prev: 0, km: 12 }, "a new goal applies from this week; the past is not rewritten");
  assert.deepEqual(r.hist, { w2: 28, w1: 28, w0: 25 }, "each week has the goal that applied then");
  assert.deepEqual(r.changed, { thisWeek: 30, history: 2 }); assert.deepEqual(r.off, { thisWeek: 0, lastWeek: 28 });
  assert.deepEqual(r.card, { km: true, goal: true, togo: true, reached: true });
  assert.ok(r.chartGoal >= 3 && r.greenBars >= 1, `goal lines ${r.chartGoal}, green bars ${r.greenBars}`); assert.ok(r.sw && r.shown); assert.deepEqual(app.errors, []);
  await page.screenshot({ path: require("path").join(process.env.ENGINE_SHOTS || require("os").tmpdir(), "km-goal.png") });
  await app.reload(); assert.equal(await page.evaluate(() => kmGoalFor(weekStartOf(todayISO()))), 25);
});

test("I2: most-used foods and recipes — counts, amounts, meals, last use, cost per use; eaten counts, the plan stands in when nothing was ticked", async () => {
  const page = await start(F.seed({ withPlan: false }), H.VIEWPORTS.phone);
  const r = await page.evaluate(async () => {
    const t = todayISO(), bowl = (id, eaten) => ({ id, kind: "recipe", ref: "t-bowl", qty: 2, eaten }), rice = (id, eaten) => ({ id, kind: "food", ref: "t-rice", qty: 100, eaten });
    S.days = { [addDays(t, -3)]: { date: addDays(t, -3), meals: { lunch: [bowl("a", true)], dinner: [rice("b", true)] } }, [addDays(t, -2)]: { date: addDays(t, -2), meals: { lunch: [bowl("c", true)] } }, [addDays(t, -1)]: { date: addDays(t, -1), meals: { lunch: [bowl("d", false)] } }, [addDays(t, -90)]: { date: addDays(t, -90), meals: { lunch: [bowl("e", true)] } } };
    S.shop.prices = { "t-rice": { eur: 4.8, g: 1000, at: t, hist: [{ eur: 4.8, g: 1000, at: t }] } }; DATA_V++;
    const U = foodUsage(60), by = k => U.rows.find(x => x.key === k);
    const eaten = { basis: U.basis, bowl: by("recipe:t-bowl") && [by("recipe:t-bowl").n, by("recipe:t-bowl").meals], rice: by("food:t-rice") && [by("food:t-rice").n, by("food:t-rice").qty, by("food:t-rice").meals, Math.round(by("food:t-rice").cost * 100) / 100], bowlCost: [Math.round(by("recipe:t-bowl").cost * 100) / 100, by("recipe:t-bowl").partial], first: U.rows[0].key, lastBowl: by("recipe:t-bowl").last === addDays(t, -2) };
    const wide = foodUsage(120).rows.find(x => x.key === "recipe:t-bowl").n;
    for (const d of Object.values(S.days)) for (const [, it] of dayItems(d)) it.eaten = false; DATA_V++;
    const planned = { basis: foodUsage(60).basis, bowl: foodUsage(60).rows.find(x => x.key === "recipe:t-bowl").n };
    for (const d of Object.values(S.days)) for (const [, it] of dayItems(d)) it.eaten = d.date !== addDays(t, -1); DATA_V++;
    UI.tab = "foods"; UI.foodsSeg = "top"; scheduleRender(); await new Promise(r => setTimeout(r, 400));
    const html = document.querySelector("#main")?.innerText || "";
    return { eaten, wide, planned, html: html.slice(0, 600), sw: document.documentElement.scrollWidth <= innerWidth, seg: !!document.querySelector('[data-act="foods-seg"][data-seg="top"]') };
  });
  assert.equal(r.eaten.basis, "eaten"); assert.deepEqual(r.eaten.bowl, [2, { lunch: 2 }]); assert.deepEqual(r.eaten.rice, [1, 100, { dinner: 1 }, 0.48]);
  assert.deepEqual(r.eaten.bowlCost, [1.92, true], "cost counts the priced ingredient only and says so"); assert.equal(r.eaten.first, "recipe:t-bowl"); assert.equal(r.eaten.lastBowl, true);
  assert.equal(r.wide, 3, "a longer period includes older days"); assert.deepEqual(r.planned, { basis: "planned", bowl: 3 });
  assert.match(r.html, /Test bowl/); assert.match(r.html, /2×/); assert.ok(r.sw && r.seg); assert.deepEqual(app.errors, []);
  await page.screenshot({ path: require("path").join(process.env.ENGINE_SHOTS || require("os").tmpdir(), "top-foods.png") });
});

test("F1: the forecast says where it is for; 'Use my current location' asks, names the place with its coordinates, and the place can be changed", async () => {
  const page = await start(F.seed({ withPlan: false }), H.VIEWPORTS.phone);
  const r = await page.evaluate(async () => {
    const t = todayISO(); const run = [{ sport: "Running", min: 40, km: 6, int: "Moderate" }];
    const row = () => wxRow(t, run), none = /Set location/.test(row());
    navigator.geolocation.getCurrentPosition = ok => ok({ coords: { latitude: 45.4642, longitude: 9.19 } });
    const msgs = []; toast = m => msgs.push(m); window.fetch = () => Promise.reject(new Error("offline"));
    ACT["wx-locate"](); await new Promise(r => setTimeout(r, 200));
    const placeNow = WX().place, html = row(), sheet = SHEETS.wxloc().body;
    WX().place = "Milano, Lombardia, IT"; const city = wxPlaceShort();
    return { none, place: placeNow, short: /data-act="wx-place"[^>]*>Current location</.test(html), title: /title="Current location \(45\.46, 9\.19\)"/.test(html), sheet: /Current location \(45\.46, 9\.19\)/.test(sheet) && /Use my current location/.test(sheet) && /permission/.test(sheet), city };
  });
  assert.equal(r.none, true); assert.equal(r.place, "Current location (45.46, 9.19)"); assert.equal(r.short, true); assert.equal(r.title, true); assert.equal(r.sheet, true); assert.equal(r.city, "Milano");
});
