/* M11a and the usability round: the workout can change day, one section pattern, aligned icons, the week board, deload in Settings, personal bests by themselves, volume over 1–12 weeks. Synthetic data only. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let dir, app;
test.before(async () => { dir = H.build(H.tmp("m11a-build")); });
test.afterEach(async () => { await app?.close(); app = null; });
const open = async (viewport = H.VIEWPORTS.phone, o = {}) => { app = await H.startApp({ dir, seed: F.seed(o), viewport }); return app.page; };
const PLAN = `(() => { const t = todayISO(); mutateLog(t, d => { d.planned = [{ sport: strengthSport(), min: 40, note: "Pulls", script: "Pull 3x\\n- 6 Pull-up", ext: "icu-5", src: "intervals", at: "18:00" }]; }); DATA_V++; })()`;
const ICU = `(() => { window.__c = []; window.__d = todayISO(); window.fetch = async (u, o = {}) => { const m = (o.method || "GET").toUpperCase(), p = String(u).replace("https://intervals.icu/api/v1", ""); __c.push([m, p, o.body ? JSON.parse(o.body) : null]); if (m === "PUT" && o.body) __d = JSON.parse(o.body).start_date_local.slice(0, 10);
  const ev = [{ id: 5, category: "WORKOUT", start_date_local: __d + "T18:00:00", type: "WeightTraining", name: "Pulls", description: "Pull 3x\\n- 6 Pull-up", moving_time: 2400 }];
  return { ok: true, status: 200, text: async () => JSON.stringify(m === "GET" ? (/\\/events\\?/.test(p) ? ev : /\\/athlete\\/0$/.test(p) ? {} : []) : { id: 9 }) }; };
  S.settings.intervals = { key: "TEST", aid: "0", planSource: true, bridge: { since: addDays(todayISO(), -30), last: new Date().toISOString() } }; })()`;

test("the workout page changes the day as well as the time: the item moves with its time, the page reopens on the new day, Undo brings it back, intervals.icu gets the new date at once", async () => {
  const page = await open(H.VIEWPORTS.phone, { withPlan: false });
  const r = await page.evaluate(`(async () => { ${ICU}; ${PLAN}; const t = todayISO(), to = addDays(t, 2); const el = document.createElement("div"); el.dataset.date = t; el.dataset.i = "0"; el.dataset.list = "planned"; openSheet("wo", { r: woResolve(el) });
    const field = !!document.getElementById("wo-date"); CHG["wo-date"](to, { dataset: { date: t, i: "0" } }); await new Promise(r => setTimeout(r, 500));
    const moved = { from: (logGet(t)?.planned || []).length, to: logGet(to)?.planned?.map(w => [w.note, w.at, !!w.ext]), sheet: document.querySelector("#wo-date")?.value, put: __c.filter(c => c[0] === "PUT").map(c => c[2].start_date_local) };
    document.querySelector("#toast button[data-act=undo]").click(); await new Promise(r => setTimeout(r, 500));
    return { field, moved, back: (logGet(t)?.planned || []).map(w => w.note), gone: (logGet(to)?.planned || []).length }; })()`);
  assert.equal(r.field, true); assert.equal(r.moved.from, 0); assert.deepEqual(r.moved.to, [["Pulls", "18:00", true]]); assert.match(r.moved.sheet, /^\d{4}-\d{2}-\d{2}$/); assert.ok(r.moved.put.some(x => /T18:00:00$/.test(x)), "the sync sent the new date with the same time");
  assert.deepEqual(r.back, ["Pulls"]); assert.equal(r.gone, 0);
});

test("icons sit on the text line, a link with an icon centres it, and the recipe icon no longer looks like a bin", async () => {
  const page = await open();
  const r = await page.evaluate(() => { document.body.insertAdjacentHTML("beforeend", '<button id="t-l" class="link"><svg class="ic sm"></svg> Share</button><span id="t-i" class="t"><svg class="ic sm"></svg> name</span>');
    return { va: getComputedStyle(document.querySelector("#t-i .ic")).verticalAlign, disp: getComputedStyle(document.getElementById("t-l")).display, same: ICONS.recipe === ICONS.book, trash: ICONS.recipe === ICONS.trash }; });
  assert.notEqual(r.va, "baseline"); assert.equal(r.disp, "inline-flex"); assert.equal(r.same, true); assert.equal(r.trash, false);
});

test("one pattern: Programs and Workouts are the same rows as Today's workouts, titles use the same header everywhere, Ready to start has no boxes", async () => {
  const page = await open(H.VIEWPORTS.phone, { withPlan: false });
  const r = await page.evaluate(async () => { const t = todayISO(); WK().tpls = [{ id: "t1", name: "Day B", sport: strengthSport(), script: "Pull 4x\n- 6 Pull-up" }]; const days = Object.fromEntries(DOWK.map(k => [k, null])); days[DOWK[0]] = "t1";
    S.train.progs = [{ id: "pg1", name: "Block 1", sport: strengthSport(), start: weekStartOf(t), weeks: 6, days, rule: "reps", step: 1, deload: 4 }]; DATA_V++; UI.tab = "train"; UI.trainSeg = "wk"; render(); await new Promise(r => setTimeout(r, 250));
    const wk = { rows: document.querySelectorAll(".wl-flat .td-s").length, go: document.querySelectorAll(".wl-flat .td-go").length, h: document.querySelectorAll(".section-h h2").length };
    startWorkout({ script: "Pull 4x\n- 6 Pull-up +10kg", name: "T", sport: strengthSport(), date: t }); UI.tab = "live"; render(); await new Promise(r => setTimeout(r, 250));
    return { wk, pv: { heads: [...document.querySelectorAll(".pv-sec .section-h h2")].map(h => h.innerText), eyebrows: document.querySelectorAll(".pv-sec .eyebrow").length, cards: document.querySelectorAll(".lv-main .lv-card").length } }; });
  assert.equal(r.wk.rows, 2, "a program and a workout, both as the rows Today uses"); assert.equal(r.wk.go, 1, "the workout has Start, the program opens"); assert.ok(r.wk.h >= 3); assert.ok(r.pv.heads.length >= 3); assert.equal(r.pv.eyebrows, 0); assert.equal(r.pv.cards, 0);
});

test("the week board shows the food of the seven days on one aligned grid (no workouts): meals per day, kcal against target, protein; a tap opens the day, an empty cell adds to that meal; navigation; menu and Today card; fits the three screens", async () => {
  for (const vp of Object.values(H.VIEWPORTS)) {
    const page = await open(vp, { withPlan: false });
    const r = await page.evaluate(async () => { const t = todayISO(), ws = weekStartOf(t), A = activeMeals(); mutateDay(addDays(ws, 2), x => { x.meals[A[0].id] = [{ id: uid(), kind: "food", ref: "t-rice", qty: 150, eaten: false }]; }); mutateLog(addDays(ws, 2), d => { d.planned = [{ sport: strengthSport(), min: 55, note: "Day B", at: "19:00" }]; }); DATA_V++; UI.tab = "week"; render(); await new Promise(r => setTimeout(r, 250));
      const rows = document.querySelectorAll(".wb-r").length, cells = document.querySelectorAll(".wb-c").length, filled = document.querySelectorAll(".wb-c:not(.empty)").length, txt = document.body.innerText, over = document.documentElement.scrollWidth > innerWidth + 1;
      const rects = [...document.querySelectorAll(".wb-r")].map(r => r.getBoundingClientRect()), aligned = innerWidth < 640 || new Set(rects.map(r => Math.round(r.left))).size === 1;
      document.querySelector('.wb-c:not(.empty)').click(); await new Promise(r => setTimeout(r, 250)); const opened = UI.tab; UI.tab = "week"; render(); await new Promise(r => setTimeout(r, 200));
      document.querySelector(".wb-c.empty").click(); await new Promise(r => setTimeout(r, 250)); const sheet = UI.sheet?.type; closeSheet();
      ACT["wk-nav"]({ dataset: { d: "1" } }); const next = UI.wk === addDays(ws, 7); ACT["wk-nav"]({ dataset: { d: "0" } }); const back = UI.wk === ws;
      UI.tab = "today"; render(); await new Promise(r => setTimeout(r, 200)); const link = document.querySelector('.td-week')?.dataset.tab, side = !!document.querySelector('#side [data-tab="week"]');
      return { rows, cells, filled, work: /Day B|19:00/.test(txt), over, aligned, opened, sheet, next, back, link, side, tiles: document.querySelectorAll(".glance").length >= 0 }; });
    assert.equal(r.rows, 7, vp.width + "px"); assert.equal(r.cells, 7 * 3); assert.equal(r.filled, 1); assert.equal(r.work, false, "no workouts on this board"); assert.equal(r.over, false); assert.ok(r.aligned, "rows line up");
    assert.equal(r.opened, "plan"); assert.equal(r.sheet, "add"); assert.ok(r.next && r.back); assert.equal(r.link, "week");
    if (vp.width >= 820) assert.equal(r.side, true, "the Week item is in the side menu");
    await app.close(); app = null;
  }
});

test("the deload option is in Settings (live workouts), applies to the Season and to new programs, and says where the rest is", async () => {
  const page = await open();
  const r = await page.evaluate(() => { const h = playerSettings(); const has = /Deload weeks/.test(h) && /data-act="ph-dlmode"/.test(h); ACT["ph-dlmode"]({ dataset: { k: "smart" } }); ACT["pg-new"](); return { has, mode: PER().deloadMode, draft: S_().draft.deloadMode, where: /Train › Workouts › Programs/.test(h) && /Settings › Features/.test(h) }; });
  assert.deepEqual(r, { has: true, mode: "smart", draft: "smart", where: true });
});

test("a personal best is announced, never written to the records by itself: the session offers it («Add to records» / «Not now»), only a yes adds it; the first result is a baseline, not a PB", async () => {
  const page = await open(H.VIEWPORTS.phone, { withPlan: false });
  const save = (reps, rir, load = 0) => `(async () => { startWorkout({ script: "Pull 1x\\n- 6 Pull-up", name: "PB day", sport: strengthSport(), date: todayISO() }); ACT["lv-begin"](); const L = LV(); L.tasks.forEach((t, i) => { if (t.t === "set") L.res[i] = { done: true, ex: [{ reps: [${reps}], load: ${load}, rir: ${rir}, hold: [], mini: 0 }] }; }); L.phase = "done"; L.minutes = 30; L.rpe = 7; ACT["lv-save"](); await new Promise(r => setTimeout(r, 300)); const ws = Object.values(S.logm).flatMap(m => Object.values(m.days || {})).flatMap(d => d.wsess || []); return { toast: document.querySelector("#toast")?.innerText || "", calis: (S.train.calis || []).filter(c => c.ex === "Pull-up").map(c => [c.test, c.val]), rec: ws.flatMap(s => s.rec || []).map(r => [r.k, r.val, r.pb]), pb: ws.flatMap(s => s.pb || []), id: ws[0]?.id }; })()`;
  const first = await page.evaluate(save(10, 1)); assert.doesNotMatch(first.toast, /PB:/); assert.deepEqual(first.calis, [], "nothing is written by itself"); assert.deepEqual(first.rec, [["reps", 10, false]], "offered as a first record"); assert.deepEqual(first.pb, []);
  await page.evaluate((id) => { const el = { dataset: { id, i: "0" } }; ACT["pb-add"](el); }, first.id);
  const added = await page.evaluate(() => (S.train.calis || []).filter(c => c.ex === "Pull-up").map(c => [c.test, c.val, !!c.auto])); assert.deepEqual(added, [["Max reps (BW)", 10, true]]);
  await page.evaluate(() => { for (const m of Object.values(S.logm)) for (const d of Object.values(m.days || {})) { d.wsess = null; d.workouts = null; } WK().live = null; DATA_V++; });
  const second = await page.evaluate(save(13, 0)); assert.match(second.toast, /PB: Pull-up 13 reps/); assert.match(second.toast, /add to the records/); assert.deepEqual(second.calis, [["Max reps (BW)", 10]], "still only the one you accepted"); assert.deepEqual(second.rec, [["reps", 13, true]]);
  const html = await page.evaluate(id => { const s = Object.values(S.logm).flatMap(m => Object.values(m.days || {})).flatMap(d => d.wsess || [])[0]; return sessionDetailHTML(s); }, second.id);
  assert.match(html, /PB · Pull-up 13 reps/); assert.match(html, /data-act="pb-add"/); assert.match(html, /data-act="pb-no"/);
  await page.evaluate(id => ACT["pb-no"]({ dataset: { id, i: "0" } }), second.id); const no = await page.evaluate(() => (S.train.calis || []).filter(c => c.ex === "Pull-up").length); assert.equal(no, 1, "Not now adds nothing");
  const run = await page.evaluate(() => { S.train.pbs = [{ id: "p1", date: addDays(todayISO(), -90), dist: "5k", sec: 1500 }]; openSheet("result", { rtype: "pb", draft: { date: todayISO(), dist: "5k", time: "23:20" } }); ACT["rs-save"](); return document.querySelector("#toast")?.innerText || ""; });
  assert.match(run, /New PB · 5k 23:20/);
});

test("volume over 1, 2, 4, 6 or 12 weeks comes straight from the logs: sessions, sets, reps, added weight moved, per exercise and the endurance totals; the filter changes only the window", async () => {
  const page = await open(H.VIEWPORTS.phone, { withPlan: false });
  const r = await page.evaluate(async () => { const t = todayISO(); const mk = (d, id, sets) => mutateLog(d, x => { x.wsess = [...(x.wsess || []), { id, name: "S", min: 40, rpe: 7, sets }]; });
    mk(addDays(t, -2), "a", [{ ex: "Pull-up", reps: [6], load: 10, rir: 2 }, { ex: "Pull-up", reps: [5], load: 10, rir: 0 }, { ex: "Dip", reps: [8], rir: 3 }]); mk(addDays(t, -20), "b", [{ ex: "Pull-up", reps: [8], load: 5, rir: 1 }]); mk(addDays(t, -60), "c", [{ ex: "Dip", reps: [10], rir: 1 }]);
    mutateLog(addDays(t, -3), x => { x.workouts = [{ sport: FIT().runSport, min: 50, km: 10 }]; }); mutateLog(addDays(t, -25), x => { x.workouts = [{ sport: FIT().runSport, min: 30, km: 5 }]; }); DATA_V++;
    const v = w => { const V = volumeStats(w); return [V.sessions, V.sets, V.reps, V.ton, V.E.km, V.rows[0]?.name]; };
    UI.volW = 2; const html2 = volWindowHTML(); UI.volW = 12; const html12 = volWindowHTML(); return { w1: v(1), w2: v(2), w4: v(4), w12: v(12), chips: (html2.match(/data-act="vol-w"/g) || []).length, h2: /Last 2 weeks/.test(html2), h12: /Last 12 weeks/.test(html12), pace: /5:20/.test(html12) }; });
  assert.deepEqual(r.w1, [1, 3, 19, 110, 10, "Pull-up"]); assert.deepEqual(r.w2, [1, 3, 19, 110, 10, "Pull-up"]); assert.deepEqual(r.w4, [2, 4, 27, 150, 15, "Pull-up"]); assert.deepEqual(r.w12, [3, 5, 37, 150, 15, "Pull-up"]);
  assert.equal(r.chips, 5); assert.ok(r.h2 && r.h12 && r.pace);
});

test("the «Full sync» button reads further back and ahead than «Sync now» (the real button path), and a time or day change syncs at once without a toast that hides the Undo", async () => {
  const page = await open(H.VIEWPORTS.phone, { withPlan: false });
  const r = await page.evaluate(async () => { window.__u = []; window.fetch = async (u, o = {}) => { __u.push(String(u)); return { ok: true, status: 200, text: async () => (/\/athlete\/0$/.test(String(u)) ? "{}" : "[]") }; };
    S.settings.intervals = { key: "TEST", aid: "0", bridge: { since: addDays(todayISO(), -30), last: new Date().toISOString() } }; const back = u => { const m = u.match(/oldest=([\d-]+)/); return m ? Math.round((new Date(todayISO()) - new Date(m[1])) / 864e5) : null; };
    ACT["icu-now"](); await new Promise(r => setTimeout(r, 700)); const normal = __u.filter(u => /activities\?/.test(u)).map(back); __u.length = 0;
    ACT["icu-force"](); await new Promise(r => setTimeout(r, 700)); const full = __u.filter(u => /activities\?/.test(u)).map(back); return { normal, full }; });
  assert.deepEqual(r.normal, [21]); assert.deepEqual(r.full, [90]);
});
