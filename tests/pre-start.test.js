/* M10b: the page before a workout (gear forgotten → variant without it, ring strap in quarters), discarding an app recording without touching the plan, the menu order, the full intervals.icu sync. Synthetic data only. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let dir, app;
test.before(async () => { dir = H.build(H.tmp("ps-build")); });
test.afterEach(async () => { await app?.close(); app = null; });
const SCRIPT = "Pull 4x\\n- 6 Pull-up +10kg\\n- 8 Ring row rings 45cm\\n- 8 Ring push-up\\n\\nLegs 3x\\n- 10 Kettlebell swing\\n- 30s Plank";
const start = async (viewport = H.VIEWPORTS.phone) => { app = await H.startApp({ dir, seed: F.seed(), viewport });
  await app.page.evaluate(`(() => { startWorkout({ script: "${SCRIPT}", name: "Gear day", sport: strengthSport(), date: todayISO() }); UI.tab = "live"; render(); })()`);
  await app.page.waitForTimeout(250); return app.page; };

test("Fuel comes before Train in the bottom menu", async () => {
  app = await H.startApp({ dir, seed: F.seed(), viewport: H.VIEWPORTS.phone });
  const r = await app.page.evaluate(() => TABS.map(t => t[1]));
  assert.deepEqual(r.slice(0, 4), ["Today", "Fuel", "Train", "Progress"]);
});

test("forgot the rings: «Don't have it» swaps each ring exercise for its closest variant without them, the strap length goes, the rest stays, Undo restores", async () => {
  const page = await start();
  const r = await page.evaluate(() => { const L = LV(), ids = gearList(L.script, L.date).map(g => g.id), btns = [...document.querySelectorAll('[data-act="gear-miss"]')].map(b => b.dataset.id), s0 = L.script;
    ACT["gear-miss"]({ dataset: { id: "rings" } }); render(); const sc = LV().script, done = document.querySelector(".sg-done")?.innerText.replace(/\s+/g, " "), after = gearList(LV().script, LV().date).map(g => g.id);
    ACT["gear-miss"]({ dataset: { id: "kb" } }); const sc2 = LV().script;
    ACT["sg-undo"]?.(); return { ids, btns, s0, sc, sc2, done, after }; });
  assert.ok(r.ids.includes("rings") && r.ids.includes("kb")); assert.ok(r.btns.includes("rings") && r.btns.includes("kb"), "a button on every item that can be swapped");
  assert.match(r.sc, /- 8 Inverted row\n/); assert.doesNotMatch(r.sc, /rings/i); assert.match(r.sc, /- 8 Push-up\n/); assert.match(r.sc, /- 6 Pull-up \+10kg/, "what does not need rings is untouched");
  assert.match(r.done, /No rings/); assert.ok(!r.after.includes("rings"), "the rings are no longer on the list");
  assert.match(r.sc2, /Jump squat/); assert.match(r.sc2, /- 8 Inverted row/);
  const back = await page.evaluate(() => { ACT["gear-miss"]({ dataset: { id: "bands" } }); return LV().script; }); assert.ok(back);
});

test("the toast Undo of a gear swap puts the original script back", async () => {
  const page = await start();
  const r = await page.evaluate(() => { const s0 = LV().script; ACT["gear-miss"]({ dataset: { id: "rings" } }); const changed = LV().script !== s0; document.querySelector("#toast button[data-act=undo]").click(); return { changed, same: LV().script === s0, done: sgOn(LV()).done.length }; });
  assert.deepEqual(r, { changed: true, same: true, done: 0 });
});

test("the ring strap moves in quarters: the field has − / + (¼ at a time), the number is written without trailing zeros, and the progression step is a setting", async () => {
  const page = await start();
  const r = await page.evaluate(() => { ACT["lv-begin"](); const L = LV(); goTask(L.tasks.findIndex(t => t.t === "set" && /ring row/i.test(JSON.stringify(t)))); render(); const out = { fm: [fmtRing(45), fmtRing(45.25), fmtRing(44.5), fmtRing(7.74)], step: ringStep(), btns: (ringField({ ring: "45" }, 0, "").match(/data-act="lv-ring-step"/g) || []).length };
    const R = LR()[2], x = R.ex[0]; x.ring = "45"; ACT["lv-ring-step"]({ dataset: { x: "0", d: "1" } }); out.up = x.ring; ACT["lv-ring-step"]({ dataset: { x: "0", d: "-1" } }); ACT["lv-ring-step"]({ dataset: { x: "0", d: "-1" } }); out.down = x.ring; x.ring = "hole 7"; ACT["lv-ring-step"]({ dataset: { x: "0", d: "1" } }); out.hole = x.ring; return out; });
  assert.deepEqual(r.fm, ["45", "45.25", "44.5", "7.75"]); assert.equal(r.step, 1); assert.ok(r.btns >= 2);
  assert.equal(r.up, "45.25"); assert.equal(r.down, "44.75"); assert.equal(r.hole, "hole 7.25");
});

test("discard a recording made with the app: the sets and the result go, the plan item stays, Undo brings the recording back; a line with no recording has no discard button", async () => {
  app = await H.startApp({ dir, seed: F.seed({ withPlan: false }), viewport: H.VIEWPORTS.phone }); const page = app.page;
  const r = await page.evaluate(async () => { const t = todayISO(); mutateLog(t, d => { d.planned = [{ sport: strengthSport(), min: 40, note: "Pulls", script: "Pull 3x\n- 6 Pull-up" }]; d.wsess = [{ id: "s1", name: "Pulls", min: 38, rpe: 7, sets: [{ ex: "Pull-up", reps: [6], round: 1 }] }]; d.workouts = [{ sport: strengthSport(), min: 38, sid: "s1", note: "Pulls", rpe: 7, int: "Moderate" }]; });
    DATA_V++; const before = { w: logGet(t).workouts.length, p: logGet(t).planned.length };
    S.sheet = null; openSheet("wh", { date: t, id: "s1" }); const hasDel = !!document.querySelector('[data-act="wh-del"]'); ACT["wh-del"](); const title = document.querySelector(".sheet h2, .sheet-title, .sh-title")?.innerText || ""; ACT["confirm-yes"]();
    const after = logGet(t), mid = { w: after.workouts?.length || 0, s: (after.wsess || []).length, p: after.planned.length };
    const undo = document.querySelector("#toast button, .toast button"); undo?.click(); const back = logGet(t);
    return { before, hasDel, mid, restored: { w: back.workouts?.length || 0, s: (back.wsess || []).length, p: back.planned.length }, undo: !!undo }; });
  assert.deepEqual(r.before, { w: 1, p: 1 }); assert.equal(r.hasDel, true); assert.deepEqual(r.mid, { w: 0, s: 0, p: 1 }, "the plan stays"); assert.equal(r.undo, true); assert.deepEqual(r.restored, { w: 1, s: 1, p: 1 });
});

test("the workout sheet of a recorded session has its own «Discard this recording»", async () => {
  app = await H.startApp({ dir, seed: F.seed({ withPlan: false }), viewport: H.VIEWPORTS.phone }); const page = app.page;
  const r = await page.evaluate(() => { const t = todayISO(); mutateLog(t, d => { d.wsess = [{ id: "s2", name: "Pulls", min: 38, rpe: 7, sets: [{ ex: "Pull-up", reps: [6], round: 1 }] }]; d.workouts = [{ sport: strengthSport(), min: 38, sid: "s2", note: "Pulls", rpe: 7, int: "Moderate" }]; }); DATA_V++;
    const el = document.createElement("div"); el.dataset.date = t; el.dataset.i = "0"; const R = woResolve(el); openSheet("wo", { r: R }); const b = document.querySelector('[data-act="wo-discard"]'); ACT["wo-discard"](); ACT["confirm-yes"](); return { has: !!b, w: logGet(t)?.workouts?.length || 0, s: (logGet(t)?.wsess || []).length }; });
  assert.equal(r.has, true); assert.equal(r.w, 0); assert.equal(r.s, 0);
});

test("the intervals.icu «Full sync» button sits beside «Sync now» and reads further back and ahead than the normal sync", async () => {
  app = await H.startApp({ dir, seed: F.seed({ withPlan: false }), viewport: H.VIEWPORTS.phone }); const page = app.page;
  const r = await page.evaluate(async () => { window.__c = []; window.fetch = async (u, o = {}) => { __c.push(String(u).replace("https://intervals.icu/api/v1", "")); return { ok: true, status: 200, text: async () => (/\/athlete\/0$/.test(String(u)) ? "{}" : "[]") }; };
    S.settings.intervals = { key: "TEST", aid: "0", bridge: { since: addDays(todayISO(), -30), last: new Date().toISOString() } }; openSheet("icuset");
    const btn = !!document.querySelector('[data-act="icu-force"]'), now = !!document.querySelector('[data-act="icu-now"]');
    await icuSyncDirect(); const normal = __c.filter(x => /oldest/.test(x)); __c.length = 0; await icuSyncDirect({ force: true }); const full = __c.filter(x => /oldest/.test(x));
    const days = u => { const m = u.match(/oldest=([\d-]+)&newest=([\d-]+)/); return [Math.round((new Date(todayISO()) - new Date(m[1])) / 864e5), Math.round((new Date(m[2]) - new Date(todayISO())) / 864e5)]; };
    return { btn, now, normal: normal.map(u => [u.split("?")[0], ...days(u)]), full: full.map(u => [u.split("?")[0], ...days(u)]) }; });
  assert.ok(r.btn && r.now);
  const pick = (a, k) => a.find(x => x[0].endsWith(k)); assert.ok(pick(r.full, "activities")[1] > pick(r.normal, "activities")[1]); assert.ok(pick(r.full, "wellness")[1] > pick(r.normal, "wellness")[1]);
  const ev = a => a.filter(x => x[0].endsWith("events")).sort((p, q) => p[2] - q[2])[0]; assert.ok(r.full.find(x => x[0].endsWith("events") && x[2] > 42) || ev(r.full)[2] > ev(r.normal)[2]);
});

test("the page before a workout fits phone, tablet and desktop and says what it is: time, sets, blocks, the tune card and the workout with how you did last time", async () => {
  for (const vp of Object.values(H.VIEWPORTS)) {
    const page = await start(vp);
    const r = await page.evaluate(() => ({ tiles: document.querySelectorAll(".pv-tiles>div").length, over: document.documentElement.scrollWidth > innerWidth + 1, text: document.body.innerText.replace(/\s+/g, " "), rows: document.querySelectorAll(".pv-e2").length }));
    assert.equal(r.over, false, vp.width + "px"); assert.ok(r.tiles >= 3); assert.match(r.text, /Tune today's workout/); assert.match(r.text, /what to bring/); assert.ok(r.rows >= 4); assert.match(r.text, /First time: today is your baseline/);
    await app.close(); app = null;
  }
});

/* ---- M10b: weather at training time, the time from intervals.icu, how a run will go ---- */
const FORECAST = `(() => { const D = { t: [], mm: [], pr: [], c: [], ap: [], code: [], wind: [], gust: [] };
  for (const t of [todayISO(), addDays(todayISO(), 1)]) for (let h = 0; h < 24; h++) { D.t.push(t + "T" + String(h).padStart(2, "0") + ":00"); const wet = h >= 18 && h <= 19; D.mm.push(wet ? 1.6 : 0); D.pr.push(wet ? 75 : 10); D.c.push(14); D.ap.push(11); D.code.push(wet ? 61 : 2); D.wind.push(h === 18 ? 26 : 8); D.gust.push(h === 18 ? 48 : 12); }
  const x = WX(); x.lat = 45.46; x.lon = 9.19; x.place = "Milano, IT"; WXC.key = wxKey(); WXC.data = D; WXC.at = Date.now(); })()`;
const RUN = "Warmup\\n- 10m Z1\\n\\nMain set 3x\\n- 4m Z4\\n- 2m Z1\\n\\nCooldown\\n- 5m Z1";

test("the weather row says what to expect at your training time: feels-like, how likely the rain is, how heavy and for how long, the wind, a dry alternative, and draws the hours with your session shaded", async () => {
  app = await H.startApp({ dir, seed: F.seed({ withPlan: false }), viewport: H.VIEWPORTS.phone }); const page = app.page;
  const r = await page.evaluate(`(() => { ${FORECAST}; const run = [{ sport: FIT().runSport, min: 60, at: "18:00" }];
    const day = addDays(todayISO(), 1), wet = wxRow(day, run); const dry = (() => { run[0].at = "08:00"; return wxRow(day, run); })(); return { wet, dry, v: document.createElement("div") }; })()`);
  const txt = h => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  assert.match(r.wet, /value="18:00"/, "the time comes from the plan"); assert.match(txt(r.wet), /feels 11°/); assert.match(txt(r.wet), /Rain likely \(75%\)/); assert.match(txt(r.wet), /moderate, 1\.6 mm over about 1 h/); assert.match(txt(r.wet), /wind 26 km\/h, gusts 48/); assert.match(txt(r.wet), /Dry at/);
  assert.match(r.wet, /class="wx-chart"/); assert.match(r.wet, /class="wx-band"/); assert.match(txt(r.wet), /chance expected rain your session/);
  assert.match(txt(r.dry), /Dry/); assert.match(r.dry, /wx-band/, "the day's rain is still drawn so you can see where it falls, with the session shaded away from it"); assert.doesNotMatch(txt(r.dry), /Rain likely|Dry at/);
});

test("an outdoor session's time comes from intervals.icu (not midnight) and a change here goes back to it: Plan-from-intervals writes the new time, otherwise nothing is sent", async () => {
  app = await H.startApp({ dir, seed: F.seed({ withPlan: false }), viewport: H.VIEWPORTS.phone }); const page = app.page;
  const r = await page.evaluate(async () => { const t = todayISO(), calls = [];
    window.fetch = async (u, o = {}) => { const m = (o.method || "GET").toUpperCase(), p = String(u).replace("https://intervals.icu/api/v1", ""); calls.push([m, p, o.body ? JSON.parse(o.body) : null]);
      let b = []; if (m === "GET") { if (/\/events\?/.test(p)) b = [{ id: 501, category: "WORKOUT", start_date_local: t + "T07:30:00", type: "Run", name: "Easy run", moving_time: 2400 }, { id: 502, category: "WORKOUT", start_date_local: addDays(t, 1) + "T00:00:00", type: "Run", name: "All day", moving_time: 1800 }]; else if (!/\/activities\?|\/wellness\?/.test(p)) b = {}; } else b = { id: 900 };
      return { ok: true, status: 200, text: async () => JSON.stringify(b) }; };
    S.settings.intervals = { key: "TEST", aid: "0", planSource: true, bridge: { since: addDays(t, -30), last: new Date().toISOString() } };
    await icuSyncDirect(); const got = [logGet(t)?.planned?.[0]?.at, logGet(addDays(t, 1))?.planned?.[0]?.at];
    CHG["wx-at"]("19:15", { dataset: { date: t } }); const w = logGet(t).planned[0], local = { at: w.at, dirty: !!w.dirty, wxAt: logGet(t).wxAt || null };
    calls.length = 0; await icuSyncDirect(); const put = calls.find(c => c[0] === "PUT");
    S.settings.intervals.planSource = false; CHG["wx-at"]("06:00", { dataset: { date: t } }); const off = { at: logGet(t).planned[0].at, dirty: !!logGet(t).planned[0].dirty };
    return { got, local, put: put && [put[1], put[2].start_date_local], off }; });
  assert.deepEqual(r.got, ["07:30", undefined], "midnight means no time"); assert.deepEqual(r.local, { at: "19:15", dirty: true, wxAt: null });
  assert.deepEqual(r.put, ["/athlete/0/events/501", r.put[1]]); assert.match(r.put[1], /T19:15:00$/); assert.deepEqual(r.off, { at: "06:00", dirty: false });
});

test("how a run will go: intensity along the session, each phase with its repeats and the sum matching the script, the weather expected at that time; shown in the workout sheet and on the run's ready page", async () => {
  app = await H.startApp({ dir, seed: F.seed({ withPlan: false }), viewport: H.VIEWPORTS.phone }); const page = app.page;
  const r = await page.evaluate(`(() => { ${FORECAST}; const t = todayISO(); mutateLog(t, d => { d.planned = [{ sport: FIT().runSport, min: 33, note: "Intervals", script: "${RUN}", at: "18:00" }]; }); DATA_V++;
    const tasks = endTasks("${RUN}", FIT().runSport), html = runOverview(tasks, FIT().runSport, t, "18:00"), el = document.createElement("div"); el.dataset.date = t; el.dataset.i = "0"; el.dataset.list = "planned";
    openSheet("wo", { r: woResolve(el) }); const sheet = document.querySelector(".wo-pv"); const out = { html: html.replace(/<[^>]+>/g, " ").replace(/\\s+/g, " "), segs: (html.match(/<i class="z\\d"/g) || []).length, open: !!sheet?.open, inSheet: !!document.querySelector(".pr-ph"), gist: runGist("${RUN}").min, secs: tasks.reduce((a, t) => a + runSecs(t), 0) };
    closeSheet(); startWorkout({ script: "${RUN}", name: "Intervals", sport: FIT().runSport, date: t, planDate: t }); UI.tab = "live"; render(); out.page = !!document.querySelector(".lv-main .pr-ov"); out.over = document.documentElement.scrollWidth > innerWidth + 1; return out; })()`);
  assert.equal(r.gist * 60, r.secs, "the overview adds up to what the script says"); assert.match(r.html, /Warmup/); assert.match(r.html, /Main set · 3×/); assert.match(r.html, /4′ · Z4 \+ 2′ · Z1|4′.*Z4.*2′.*Z1/); assert.match(r.html, /Cooldown/); assert.match(r.html, /33′|33 min|33m/);
  assert.equal(r.segs >= 8 + 3, true, "one bar piece per step plus a marker per phase"); assert.match(r.html, /18:00 · 14° · feels 11°/); assert.equal(r.open && r.inSheet, true); assert.equal(r.page, true); assert.equal(r.over, false);
});
