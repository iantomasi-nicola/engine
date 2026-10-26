/* Design fixes, round 2: the phone day header keeps Copy/Paste in the day menu, the week cell icon order, singular «session», agenda days outside the month. Synthetic data only. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let dir, app;
test.before(async () => { dir = H.build(H.tmp("df2-build")); });
test.afterEach(async () => { await app?.close(); app = null; });
const start = async (vp, opt = {}) => { app = await H.startApp({ dir, seed: F.seed({ withPlan: false, withPantry: true, ...opt }), viewport: vp }); return app.page; };

/* phone (390): the header row has no Copy/Paste pair (the title would slide under «Today»); the day menu carries «Copy this day» and, with a day in the clipboard, «Paste here».
   820 and 1440 keep the pair in the header and the menu has neither. */
test("day header: below 600 px Copy this day / Paste here live in the day menu, wider screens keep the buttons", async () => {
  for (const [name, vp] of [["phone", H.VIEWPORTS.phone], ["tablet", H.VIEWPORTS.tablet], ["desktop", H.VIEWPORTS.desktop]]) {
    const page = await start(vp);
    const r = await page.evaluate(() => { const t = todayISO(), o = addDays(t, 1);
      mutateDay(t, d => { d.meals.lunch = [newItem("food", "t-rice", 100)]; }); UI.tab = UI.fuelTab = "plan"; UI.planView = "day"; UI.date = t; render();
      const btn = () => !!document.querySelector('.top-acts [data-act="day-copy"]'), a = [btn()];
      ACT["day-menu"](); a.push(UI.sheet.items.map(x => x.label)); closeSheet();
      copyToClip("day", t); UI.date = o; render(); ACT["day-menu"](); a.push(UI.sheet.items.map(x => x.label)); return a; });
    const narrow = name === "phone";
    assert.equal(r[0], !narrow, name + ": header pair");
    assert.equal(r[1].includes("Copy this day"), narrow, name + ": menu Copy this day: " + r[1].join("|"));
    assert.ok(!r[1].includes("Paste here"), name + ": nothing in the clipboard yet");
    assert.equal(r[2].includes("Paste here"), narrow, name + ": menu Paste here with a day in the clipboard: " + r[2].join("|"));
    assert.deepEqual(app.errors, []); await app.close(); app = null;
  }
});
test("day menu on the phone: Copy this day puts the day in the clipboard, Paste here pastes it", async () => {
  const page = await start(H.VIEWPORTS.phone);
  const r = await page.evaluate(() => { const t = todayISO(), o = addDays(t, 1);
    mutateDay(t, d => { d.meals.lunch = [newItem("food", "t-rice", 100)]; }); UI.tab = UI.fuelTab = "plan"; UI.planView = "day"; UI.date = t; render();
    ACT["day-menu"](); UI.sheet.items.find(i => i.label === "Copy this day").run(); UI.date = o; ACT["day-menu"](); UI.sheet.items.find(i => i.label === "Paste here").run();
    return dayItems(getDay(o)).length; });
  assert.equal(r, 1); assert.deepEqual(app.errors, []);
});

/* week cell: Copy and Paste are always the last two icons on the right. Full: lock, grip, +, ⋯, copy, paste. Empty: Usual, ⋯, copy, paste */
test("week cells: Copy and Paste are the last two controls, full and empty", async () => {
  const page = await start(H.VIEWPORTS.desktop);
  const r = await page.evaluate(() => { const t = todayISO(), W = addDays(weekStartOf(t), 1);
    mutateDay(W, d => { d.meals.lunch = [newItem("food", "t-rice", 100)]; d.lock = { lunch: true }; });
    UI.tab = UI.fuelTab = "plan"; UI.planView = "week"; UI.date = W; render();
    const kind = el => el.classList.contains("lk") ? "lock" : el.classList.contains("pw-mh") ? "grip" : el.dataset.act === "pw-add" ? "plus" : el.dataset.act === "pw-cm" ? "more" : el.dataset.act === "pw-usual" ? "usual" : el.dataset.act === "meal-copy" ? "copy" : el.dataset.act === "meal-paste" ? "paste" : "?";
    const full = [...document.querySelector(`.pw-cell[data-date="${W}"][data-meal="lunch"] .pw-ca`).children].map(kind);
    const vac = [...document.querySelectorAll(".pw-cell.vac .pw-ca")].map(c => [...c.children].map(kind));
    return { full, vac }; });
  assert.deepEqual(r.full, ["lock", "grip", "plus", "more", "copy", "paste"]);
  assert.ok(r.vac.length > 0);
  for (const v of r.vac) assert.ok(v.join() === "more,copy,paste" || v.join() === "usual,more,copy,paste", v.join());
  assert.deepEqual(app.errors, []);
});

/* calendar: «1 session», never «1 sessions»; the agenda dims days outside the month like the month grid */
test("calendar: singular session in the month line and the agenda week header; agenda days outside the month are .out", async () => {
  const page = await start(H.VIEWPORTS.phone);
  const r = await page.evaluate(() => { const t = parseISO(todayISO()); let k = -2, ms, me;
    for (; k > -9; k--) { const m0 = new Date(t.getFullYear(), t.getMonth() + k, 1); ms = isoOf(m0); me = isoOf(new Date(m0.getFullYear(), m0.getMonth() + 1, 0)); if (dow(ms) > 0 && dow(me) < 6) break; }
    const put = (d, o) => { const mk = d.slice(0, 7); S.logm[mk] = S.logm[mk] || { month: mk, days: {} }; S.logm[mk].days[d] = Object.assign(S.logm[mk].days[d] || {}, o); };
    put(ms, { workouts: [{ sport: FIT().runSport, min: 30, km: 5, int: "Hard" }] }); put(addDays(ms, -1), { workouts: [{ sport: FIT().runSport, min: 20, km: 3, int: "Hard" }] });
    DATA_V++; Object.assign(UI, { tab: "train", trainSeg: "cal", calView: "agenda", calOff: k, calSel: ms }); render();
    const num = e => e.querySelector(".cv-ad-d b").textContent;
    return { kpi: document.querySelector(".cv-kpi").textContent, wk: [...document.querySelectorAll(".cv-wk-h small")].map(e => e.textContent).join("|"), out: [...document.querySelectorAll(".cv-ad.out")].map(num), inn: [...document.querySelectorAll(".cv-ad:not(.out)")].map(num), ms, prev: String(+addDays(ms, -1).slice(8)) }; });
  assert.ok(/\b1 session(?!s)/.test(r.kpi), r.kpi); assert.ok(!/1 sessions/.test(r.kpi + r.wk), r.kpi + r.wk);
  assert.ok(r.out.includes(r.prev) && !r.inn.includes(r.prev), JSON.stringify(r));
  assert.ok(r.inn.includes(String(+r.ms.slice(8))), JSON.stringify(r));
  const m = await page.evaluate(() => { UI.calView = "month"; render(); return document.querySelector(".cv-kpi").textContent; });
  assert.ok(/\b1 session(?!s)/.test(m), m);
  assert.deepEqual(app.errors, []);
});
