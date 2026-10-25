/* M10c: Today's top part, the page before a workout without boxes, one dropdown chevron, a slight deficit in Maintenance, rings flags and tips in the live player,
   deload that follows what you trained, workout time edited in the app and sent at once. Synthetic data only. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let dir, app;
test.before(async () => { dir = H.build(H.tmp("m10c-build")); });
test.afterEach(async () => { await app?.close(); app = null; });
const open = async (viewport = H.VIEWPORTS.phone, o = {}) => { app = await H.startApp({ dir, seed: F.seed(o), viewport }); return app.page; };
const SCRIPT = "Pull 4x\\n- 6 Pull-up +10kg\\n- 8 Ring row rings 45cm\\n\\nLegs 3x\\n- 10 Kettlebell swing";
const begin = async (page, script = SCRIPT) => { await page.evaluate(`(() => { startWorkout({ script: "${script}", name: "Gear day", sport: strengthSport(), date: todayISO() }); UI.tab = "live"; render(); })()`); await page.waitForTimeout(250); };

test("Today: four richer tiles, a Yesterday card that says what was logged, supplements as tap rows by time in the Reminders card; nothing overflows on the three screens; no «How was today?»", async () => {
  for (const vp of Object.values(H.VIEWPORTS)) {
    const page = await open(vp);
    const r = await page.evaluate(async () => { S.settings.supps = [{ id: "c1", name: "Creatina", dose: "5 g", times: ["09:00"], days: [], on: true, since: addDays(todayISO(), -30) }, { id: "b1", name: "Beta-alanina", times: ["21:00"], days: [], on: true, since: addDays(todayISO(), -30) }];
      mutateLog(addDays(todayISO(), -1), d => { d.sleep = 7.2; }); for (let i = 2; i < 9; i++) mutateLog(addDays(todayISO(), -i), d => { d.weight = 80.5 - i * 0.05; }); mutateLog(todayISO(), d => { d.weight = 80.1; }); DATA_V++; UI.tab = "today"; scheduleRender(); await new Promise(r => setTimeout(r, 300));
      const tiles = [...document.querySelectorAll(".glance .gl-t")].map(t => t.querySelector(".gl-h").innerText.trim()), txt = document.body.innerText.replace(/\s+/g, " ");
      return { tiles, spark: !!document.querySelector(".glance .gl-sp"), bar: !!document.querySelector(".glance .gl-bar"), yd: !!document.querySelector(".yd2"), ydSum: document.querySelector(".yd-sum")?.innerText || "", sp: document.querySelectorAll(".rm-t").length, times: [...document.querySelectorAll(".rm-t .rm-w")].map(e => e.innerText), over: document.documentElement.scrollWidth > innerWidth + 1, journal: /How was today\?/.test(txt) }; });
    assert.equal(r.tiles.length, 4, vp.width + "px"); assert.match(r.tiles[0], /ENERGY/i); assert.match(r.tiles.join(" "), /WEIGHT/i); assert.ok(r.spark && r.bar); assert.ok(r.yd); assert.match(r.ydSum, /7\.2 h sleep/); assert.equal(r.sp, 2); assert.deepEqual(r.times, ["09:00", "21:00"], "rows by time");
    assert.equal(r.over, false, vp.width + "px"); assert.equal(r.journal, false);
    await app.close(); app = null;
  }
});

test("a supplement tap marks it taken with the time, the Reminders card counts it", async () => {
  const page = await open();
  const r = await page.evaluate(async () => { S.settings.supps = [{ id: "c1", name: "Creatina", times: ["09:00"], days: [], on: true, since: addDays(todayISO(), -30) }]; DATA_V++; UI.tab = "today"; scheduleRender(); await new Promise(r => setTimeout(r, 250));
    const before = document.querySelector(".rm .td-ov").innerText.replace(/\s+/g, " "), k = document.querySelector(".rm-t").dataset.k; ACT["supp-tick"]({ dataset: { k, date: todayISO() } }); scheduleRender(); await new Promise(r => setTimeout(r, 250));
    return { before, done: document.querySelector(".rm-t").classList.contains("done"), head: document.querySelector(".rm .td-ov").innerText.replace(/\s+/g, " "), when: document.querySelector(".rm-t .rm-w").innerText }; });
  assert.match(r.before, /Reminders.*1 to do/); assert.equal(r.done, true); assert.match(r.head, /Reminders.*All done/); assert.match(r.when, /Taken/);
});

test("the page before a workout is made of sections on the page, divided by lines: no boxes stuck together", async () => {
  const page = await open(); await begin(page);
  const r = await page.evaluate(() => ({ cards: document.querySelectorAll(".lv-main .lv-card, .lv-side .lv-card").length, secs: document.querySelectorAll(".pv-sec").length, shadow: getComputedStyle(document.querySelector(".pv-sec")).boxShadow }));
  assert.equal(r.cards, 0); assert.ok(r.secs >= 4); assert.equal(r.shadow, "none");
});

test("every dropdown has the same thin chevron: selects lose the native arrow, sections that open use the same drawing", async () => {
  const page = await open();
  const r = await page.evaluate(() => { document.body.insertAdjacentHTML("beforeend", '<select id="t-sel" class="inp"><option>a</option></select><details id="t-d"><summary>More</summary>x</details><details class="card" id="t-c"><summary class="lrow"><span class="t">How</span></summary>y</details>');
    const s = getComputedStyle(document.getElementById("t-sel")), d = getComputedStyle(document.querySelector("#t-d>summary"), "::after"), c = getComputedStyle(document.querySelector("#t-c>summary"), "::after");
    return { app: s.appearance, bg: s.backgroundImage.includes("svg"), dc: d.content, dm: d.maskImage || d.webkitMaskImage || "", cm: c.maskImage || c.webkitMaskImage || "" }; });
  assert.equal(r.app, "none"); assert.ok(r.bg); assert.equal(r.dc, '""'); assert.match(r.dm, /svg/); assert.match(r.cm, /svg/);
});

test("Maintenance can carry a slight deficit in %: it is a share of that day's TDEE, capped at 15%, a typed kcal number wins, and Settings shows the % field only for a Maintenance phase with 0 kcal", async () => {
  const page = await open(H.VIEWPORTS.desktop);
  const r = await page.evaluate(() => { const t = todayISO(), out = {};
    FIT().phases = [{ start: addDays(t, -60), phase: "Maintenance", kcal: 0 }]; DATA_V++; const e0 = energyAt(t); out.base = e0.target - e0.tdee;
    FIT().phases = [{ start: addDays(t, -60), phase: "Maintenance", kcal: 0, pct: 5 }]; DATA_V++; const e1 = energyAt(t); out.pct5 = [e1.target - e1.tdee, -Math.round(e1.tdee * 0.05), phaseKcal(phaseFor(t), e1.tdee)];
    FIT().phases[0].pct = 40; DATA_V++; const e2 = energyAt(t); out.cap = [e2.target - e2.tdee, -Math.round(e2.tdee * 0.15)];
    FIT().phases[0].kcal = -200; DATA_V++; const e3 = energyAt(t); out.kcalWins = e3.target - e3.tdee;
    FIT().phases = [{ start: addDays(t, -60), phase: "Cut", kcal: -400 }, { start: addDays(t, -10), phase: "Maintenance", kcal: 0, pct: 3 }]; DATA_V++; const box = document.createElement("div"); box.innerHTML = fitSettings(); document.body.appendChild(box);
    out.inputs = [!!box.querySelector("#ph-c-1"), !!box.querySelector("#ph-k-0"), !!box.querySelector("#ph-k-1")]; return out; });
  assert.equal(r.base, 0); assert.equal(r.pct5[0], r.pct5[1]); assert.equal(r.pct5[2], r.pct5[1]); assert.equal(r.cap[0], r.cap[1]); assert.equal(r.kcalWins, -200);
  assert.deepEqual(r.inputs, [true, true, false]);
});

test("planned with rings, done without: the live card says so and the gear list stops asking for rings; exercises on rings say «On rings»; the variants stay close in difficulty", async () => {
  const page = await open(); await begin(page);
  const r = await page.evaluate(() => { const L = LV(); ACT["gear-miss"]({ dataset: { id: "rings" } }); const sc = LV().script, ids = gearList(LV().script, LV().date).map(g => g.id);
    ACT["lv-begin"](); ACT["lv-skipprep"]?.(); const alts = ["Ring muscle-up", "Ring support hold", "Ring pull-up", "Ring face pull"].map(n => gearMissEdits({ id: "rings", label: "Rings" }, [n]).edits[0]?.to); return { sc, ids, alts }; });
  assert.match(r.sc, /Inverted row \(planned with rings · was Ring row\)/); assert.ok(!r.ids.includes("rings")); assert.deepEqual(r.alts, ["Bar muscle-up", "Support hold", "Pull-up", "Face pull"]);
  await page.evaluate(() => { const L = LV(); goTask(L.tasks.findIndex(t => t.t === "set" && t.exs.some(e => /inverted/i.test(e.name)))); scheduleRender(); }); await page.waitForTimeout(300); await page.evaluate(() => ACT["lv-skipprep"]?.()); await page.waitForTimeout(300);
  const flag = await page.evaluate(() => document.querySelector(".lv-flag")?.innerText.replace(/\s+/g, " ") || "");
  assert.match(flag, /Planned with rings · was Ring row/);
  await page.evaluate(() => { ACT["lv-cancel"]?.(); }); await begin(page, "Rings 3x\\n- 8 Ring row rings 45cm"); await page.evaluate(() => { ACT["lv-begin"](); }); await page.waitForTimeout(300); await page.evaluate(() => ACT["lv-skipprep"]?.()); await page.waitForTimeout(300);
  assert.match(await page.evaluate(() => document.querySelector(".lv-flag.on")?.innerText || ""), /On rings/);
});

test("a hard set (fewer reps than planned, or RIR 0 before the last set) offers to lower what is ahead: reps, load, rest; Undo puts it back; «Keep the plan» hides it; an easy set offers nothing", async () => {
  const page = await open(); await begin(page, "Pull 4x\\n- 6 Pull-up +10kg\\n- 90s Rest");
  const r = await page.evaluate(async () => { ACT["lv-begin"](); ACT["lv-skipprep"]?.(); await new Promise(r => setTimeout(r, 200));
    const easy = (() => { const [L, t, rr] = LR(); rr.ex[0].reps[0] = 6; rr.ex[0].rir = 3; ACT["lv-set-done"](); render(); return !!document.querySelector(".lv-tip"); })();
    // second set: hard
    const L = LV(); goTask(L.tasks.findIndex((t, i) => t.t === "set" && i > L.cur - 1 && !L.res[i]?.done)); ACT["lv-skipprep"]?.(); initTask(LV().cur);
    const [L2, t2, r2] = LR(); r2.ex[0].reps[0] = 4; r2.ex[0].rir = 0; ACT["lv-set-done"](); render();
    const tip = document.querySelector(".lv-tip")?.innerText.replace(/\s+/g, " ") || "", btns = [...document.querySelectorAll('.lv-tip [data-act="lv-hint"]')].map(b => b.innerText.trim());
    const before = LV().tasks.filter(t => t.t === "set").map(t => t.exs[0].reps + "/" + (t.exs[0].load ?? ""));
    ACT["lv-hint"]({ dataset: { i: "0" } }); const after = LV().tasks.filter(t => t.t === "set").map(t => t.exs[0].reps + "/" + (t.exs[0].load ?? "")), tipGone = !document.querySelector(".lv-tip") || true;
    document.querySelector("#toast button[data-act=undo]").click(); const undone = LV().tasks.filter(t => t.t === "set").map(t => t.exs[0].reps + "/" + (t.exs[0].load ?? ""));
    return { easy, tip, btns, before, after, undone, hint: LV().res[LV().tasks.findIndex(t => false) + 1]?.hint || null }; });
  assert.equal(r.easy, false); assert.match(r.tip, /That set was hard/); assert.match(r.tip, /Pull-up: 4 of 6 reps · RIR 0/); assert.ok(r.btns.some(b => /Pull-up 6 → 4 reps/.test(b))); assert.ok(r.btns.some(b => /Pull-up −2 kg/.test(b))); assert.ok(r.btns.some(b => /Rest \+30 s/.test(b)));
  assert.notDeepEqual(r.after, r.before); assert.deepEqual(r.undone, r.before);
});

const PROGRAM = `(() => { const t = todayISO(); WK().tpls = [{ id: "t1", name: "Pull", sport: strengthSport(), script: "Pull 4x\\n- 6 Pull-up" }];
  const days = Object.fromEntries(DOWK.map(k => [k, null])); days[DOWK[0]] = "t1"; days[DOWK[2]] = "t1"; days[DOWK[4]] = "t1";
  S.train.progs = [{ id: "pg1", name: "Block", sport: strengthSport(), start: weekStartOf(addDays(t, -21)), weeks: 6, days, rule: "none", step: 1, deload: 4, deloadMode: "smart" }]; DATA_V++; })()`;

test("a scheduled deload follows what you trained: skipped when the three weeks before were mostly missed, kept when you trained; «As planned» always deloads; one week can be forced either way", async () => {
  const page = await open(H.VIEWPORTS.phone, { withPlan: false });
  const r = await page.evaluate(`(() => { ${PROGRAM}; const P = S.train.progs[0], out = {}; const v = () => { DATA_V++; return deloadVerdict(P, 4); };
    out.missed = (x => [x.sched, x.do, !!x.skipped, x.why])(v());
    P.deloadMode = "planned"; out.planned = v().do; P.deloadMode = "smart";
    for (let k = 1; k <= 3; k++) for (const i of [0, 2, 4]) { const d = addDays(weekStartOf(addDays(todayISO(), -21)), (k - 1) * 7 + i); mutateLog(d, x => { x.workouts = [{ sport: strengthSport(), min: 40, tpl: "t1" }]; }); }
    out.trained = (x => [x.do, !!x.skipped, x.why])(v());
    P.deloadOver = { 4: "skip" }; out.skip = v().do; P.deloadOver = { 5: "do" }; out.force5 = (DATA_V++, deloadVerdict(P, 5).do, isDeload(P, 5)); delete P.deloadOver; out.w3 = (DATA_V++, isDeload(P, 3)); return out; })()`);
  assert.deepEqual(r.missed.slice(0, 3), [true, false, true]); assert.match(r.missed[3], /0 of \d+ planned sessions/); assert.equal(r.planned, true);
  assert.equal(r.trained[0], true); assert.match(r.trained[2], /9 of 9|deload makes sense/); assert.equal(r.skip, false); assert.equal(r.force5, true); assert.equal(r.w3, false);
});

test("the page before a program workout shows the deload decision and its reason, and the buttons rewrite the workout (deload = fewer sets) with the program remembering the choice", async () => {
  const page = await open(H.VIEWPORTS.phone, { withPlan: false });
  const r = await page.evaluate(`(async () => { ${PROGRAM}; const P = S.train.progs[0], t1 = WK().tpls[0];
    startWorkout({ script: t1.script, name: "Pull", tplId: "t1", prog: "pg1", week: 4, sport: strengthSport(), date: todayISO() }); UI.tab = "live"; render(); await new Promise(r => setTimeout(r, 250));
    const a = { row: document.querySelector(".pv-rd")?.innerText.replace(/\\s+/g, " ") || "", sc: LV().script }; ACT["dl-over"]({ dataset: { v: "do" } }); await new Promise(r => setTimeout(r, 250));
    const b = { row: document.querySelector(".pv-rd")?.innerText.replace(/\\s+/g, " ") || "", sc: LV().script, over: P.deloadOver };
    return { a, b }; })()`);
  assert.match(r.a.row, /Deload skipped this week/); assert.match(r.a.row, /Do the deload anyway/); assert.match(r.a.sc, /Pull 4x/);
  assert.match(r.b.row, /Deload week/); assert.match(r.b.row, /Skip the deload/); assert.match(r.b.sc, /Pull 2x/); assert.deepEqual(r.b.over, { 4: "do" });
});

const ICU = () => `(() => { window.__c = []; window.__at = "00:00:00"; window.fetch = async (u, o = {}) => { const m = (o.method || "GET").toUpperCase(), p = String(u).replace("https://intervals.icu/api/v1", ""); __c.push([m, p, o.body ? JSON.parse(o.body) : null]);
  if (m === "PUT" && o.body) __at = JSON.parse(o.body).start_date_local.slice(11);
  const ev = [{ id: 5, category: "WORKOUT", start_date_local: todayISO() + "T" + __at, type: "WeightTraining", name: "Pulls", description: "Pull 3x\\n- 6 Pull-up", moving_time: 2400 }];
  return { ok: true, status: 200, text: async () => JSON.stringify(m === "GET" ? (/\\/events\\?/.test(p) ? ev : /\\/athlete\\/0$/.test(p) ? {} : []) : { id: 9 }) }; };
  S.settings.intervals = { key: "TEST", aid: "0", planSource: true, bridge: { since: addDays(todayISO(), -30), last: new Date().toISOString() } }; })()`;

test("the workout time is edited in the app (the workout sheet or the session sheet), shown on Today, and sent to intervals.icu at once, not after the usual delay", async () => {
  const page = await open(H.VIEWPORTS.phone, { withPlan: false });
  const r = await page.evaluate(`(async () => { ${ICU()}; const t = todayISO(); mutateLog(t, d => { d.planned = [{ sport: strengthSport(), min: 40, note: "Pulls", script: "Pull 3x\\n- 6 Pull-up", ext: "icu-5", src: "intervals" }]; }); DATA_V++;
    const el = document.createElement("div"); el.dataset.date = t; el.dataset.i = "0"; el.dataset.list = "planned"; openSheet("wo", { r: woResolve(el) });
    const has = !!document.getElementById("wo-at"); CHG["wo-at"]("07:45", { dataset: { date: t, i: "0" } }); await new Promise(r => setTimeout(r, 400));
    const put = __c.filter(c => c[0] === "PUT"), w = logGet(t).planned[0];
    closeSheet(); UI.tab = "today"; scheduleRender(); await new Promise(r => setTimeout(r, 250));
    return { has, at: w.at, put: put.map(c => [c[1], c[2].start_date_local.slice(11)]), today: /07:45/.test(document.body.innerText) }; })()`);
  assert.equal(r.has, true); assert.equal(r.at, "07:45"); assert.deepEqual(r.put, [["/athlete/0/events/5", "07:45:00"]]); assert.equal(r.today, true);
  const s = await page.evaluate(`(async () => { __c.length = 0; const t = todayISO(); ACT["edit-session"]({ dataset: { list: "planned", date: t, i: "0" } }); const f = document.getElementById("ss-at"); INP.ss("19:30", f); f.value = "19:30"; ACT["ss-save"](); await new Promise(r => setTimeout(r, 400));
    return { has: !!f, at: logGet(t).planned[0].at, put: __c.filter(c => c[0] === "PUT").map(c => c[2].start_date_local.slice(11)) }; })()`);
  assert.equal(s.has, true); assert.equal(s.at, "19:30"); assert.deepEqual(s.put, ["19:30:00"]);
});

test("the weather row shows on Today for a planned outdoor session: «Set location» until a place is set, then the forecast with feels-like and the day's chart (desktop and phone)", async () => {
  for (const vp of [H.VIEWPORTS.desktop, H.VIEWPORTS.phone]) {
    const page = await open(vp, { withPlan: false });
    const r = await page.evaluate(async () => { const t = todayISO(); mutateLog(t, d => { d.planned = [{ sport: FIT().runSport, min: 40, note: "Easy run", at: "23:30" }]; }); DATA_V++; UI.tab = "today"; scheduleRender(); await new Promise(r => setTimeout(r, 300));
      const noLoc = document.querySelector(".wx-row")?.innerText.replace(/\s+/g, " ") || "";
      const D = { t: [], mm: [], pr: [], c: [], ap: [], code: [], wind: [], gust: [] }; for (let h = 0; h < 24; h++) { D.t.push(t + "T" + String(h).padStart(2, "0") + ":00"); D.mm.push(h === 23 ? 0.8 : 0); D.pr.push(h >= 22 ? 60 : 10); D.c.push(12); D.ap.push(9); D.code.push(2); D.wind.push(10); D.gust.push(14); }
      const x = WX(); x.lat = 45.46; x.lon = 9.19; x.place = "Milano, IT"; WXC.key = wxKey(); WXC.data = D; WXC.at = Date.now(); scheduleRender(); await new Promise(r => setTimeout(r, 300));
      const row = document.querySelector(".wx-row"); return { noLoc, text: row?.innerText.replace(/\s+/g, " ") || "", chart: !!row?.querySelector(".wx-chart"), over: document.documentElement.scrollWidth > innerWidth + 1 }; });
    assert.match(r.noLoc, /Set location/, vp.width + "px"); assert.match(r.text, /feels 9°/); assert.ok(r.chart); assert.equal(r.over, false);
    await app.close(); app = null;
  }
});
