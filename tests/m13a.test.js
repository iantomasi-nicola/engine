/* M13a: typing in a sheet or a screen is never wiped by a redraw (a sync, a timer, another edit) before the field is left */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let dir, app;
test.before(async () => { dir = H.build(H.tmp("m13a-build")); });
test.afterEach(async () => { await app?.close(); app = null; });

test("check-in: a number typed in Weight survives redraws while the field is still focused, and is saved when you leave it", async () => {
  app = await H.startApp({ dir, seed: F.seed(), viewport: H.VIEWPORTS.phone });
  const page = app.page;
  await page.evaluate(() => { openSheet("checkin", { date: addDays(todayISO(), -1) }); });
  await page.waitForSelector("#ci-weight");
  await page.click("#ci-weight"); await page.keyboard.type("71.4");
  await page.evaluate(() => { renderSheet(); render(); });
  const v1 = await page.inputValue("#ci-weight");
  assert.equal(v1, "71.4", "the typed text is still there after a redraw");
  assert.equal(await page.evaluate(() => document.activeElement?.id), "ci-weight", "and the cursor is still in it");
  await page.keyboard.type("5");
  await page.evaluate(() => { renderSheet(); });
  assert.equal(await page.inputValue("#ci-weight"), "71.45");
  await page.keyboard.press("Tab");
  const saved = await page.evaluate(() => logGet(addDays(todayISO(), -1)).weight);
  assert.equal(saved, 71.45);
});

test("check-in: two fields typed one after the other keep both values even if a redraw lands between them", async () => {
  app = await H.startApp({ dir, seed: F.seed(), viewport: H.VIEWPORTS.phone });
  const page = app.page;
  await page.evaluate(() => { openSheet("checkin", { date: addDays(todayISO(), -1) }); });
  await page.waitForSelector("#ci-weight");
  await page.fill("#ci-weight", "70.2"); await page.fill("#ci-bf", "14.5");
  await page.evaluate(() => { renderSheet(); });
  assert.equal(await page.inputValue("#ci-bf"), "14.5");
  await page.keyboard.press("Tab");
  const L = await page.evaluate(() => logGet(addDays(todayISO(), -1)));
  assert.equal(L.weight, 70.2); assert.equal(L.bf, 14.5);
});

test("naps: «Start a nap» then «Wake up» logs the minutes between the two; a chip or a typed length + Enter adds one in a tap; each can be removed", async () => {
  app = await H.startApp({ dir, seed: F.seed(), viewport: H.VIEWPORTS.phone });
  const page = app.page;
  await page.evaluate(() => { openSheet("battery", {}); });
  await page.waitForSelector('[data-act="bt-nap-start"]');
  await page.evaluate(() => { ACT["bt-nap-start"](); });
  assert.equal(await page.evaluate(() => !!napOn()), true);
  assert.ok(await page.$('[data-act="bt-nap-stop"]'), "the sheet now offers Wake up");
  const tileTxt = await page.evaluate(() => { UI.sheet = null; document.querySelector("#sheet-root").innerHTML = ""; UI.tab = "today"; render(); return document.querySelector(".glance")?.innerText.replace(/\s+/g, " "); });
  assert.match(tileTxt, /Napping since \d\d:\d\d/);
  // pretend it started 25 minutes ago (the clock of the day must allow it: the test uses today's date only when the result stays today)
  await page.evaluate(() => { localStorage.setItem(NAP_KEY, String(Date.now() - 25 * 60000)); openSheet("battery", {}); });
  await page.evaluate(() => ACT["bt-nap-stop"]());
  const n1 = await page.evaluate(() => (logGet(todayISO()).naps || []).map(n => n.min));
  assert.ok(n1.length === 1 && n1[0] >= 24 && n1[0] <= 26, "about 25 min logged: " + n1);
  assert.equal(await page.evaluate(() => !!napOn()), false);
  await page.click('[data-act="bt-nap"][data-m="45"]');
  assert.deepEqual(await page.evaluate(() => (logGet(todayISO()).naps || []).map(n => n.min).sort((a, b) => a - b)), [n1[0], 45].sort((a, b) => a - b));
  await page.fill("#bt-m", "12"); await page.press("#bt-m", "Enter");
  const mins = await page.evaluate(() => (logGet(todayISO()).naps || []).map(n => n.min));
  assert.ok(mins.includes(12), "typed length added with Enter: " + mins);
  await page.click('[data-act="bt-nap-del"][data-i="0"]');
  assert.equal(await page.evaluate(() => (logGet(todayISO()).naps || []).length), mins.length - 1);
});

const seedRecords = `(() => { const T = S.train, t = todayISO(); T.pbs = [{ id: "pb1", date: addDays(t, -40), dist: "5k", sec: 1260 }]; T.topSets = [{ id: "ts1", date: addDays(t, -9), ex: "Weighted pull-up", kg: 20, reps: 5, rir: 1 }];
  T.circuitLog = [{ id: "cl1", date: addDays(t, -30), circuit: "Fire Set (Open)", sec: 205 }, { id: "cl2", date: addDays(t, -3), circuit: "Fire Set (Open)", sec: 198.4 }];
  T.calis = [{ id: "ca1", date: addDays(t, -20), ex: "Pull-up", test: "Max reps (BW)", val: 14 }]; put("train", "", T); DATA_V++; UI.tab = "train"; UI.trainSeg = "perf"; UI.perfSeg = "records"; render(); })()`;

test("Records: sections fold into one line with their headline; every kind of result can be opened, changed and deleted from All results (with Undo)", async () => {
  app = await H.startApp({ dir, seed: F.seed(), viewport: H.VIEWPORTS.phone });
  const page = app.page; await page.evaluate(seedRecords); await page.waitForSelector(".rec-sec");
  const heads = await page.evaluate(() => [...document.querySelectorAll(".rec-h")].map(b => ({ t: b.querySelector("b").innerText, s: b.querySelector("small")?.innerText || "", open: b.getAttribute("aria-expanded") })));
  assert.match(heads[0].s, /5k 21:00/); assert.ok(heads.every(h => h.open === "false"), "every section is closed until you open it");
  const names = heads.map(h => h.t); for (const n of ["Calisthenics tests", "Strength · top sets", "Endurance circuits", "Race circuits", "Endurance Cup ranking", "All results"]) assert.ok(names.includes(n), n);
  await page.click('.rec-h:has-text("All results")'); await page.waitForTimeout(250);
  const rows = await page.evaluate(() => [...document.querySelectorAll('[data-act="edit-result"]')].map(b => b.dataset.type + ":" + b.dataset.id));
  for (const k of ["pb:pb1", "top:ts1", "circuit:cl1", "circuit:cl2", "calis:ca1"]) assert.ok(rows.includes(k), "listed " + k + " in " + rows);
  await page.click('[data-act="edit-result"][data-type="circuit"][data-id="cl2"]');
  assert.equal(await page.inputValue("#rs-time"), "3:18", "the time is shown to be changed");
  await page.fill("#rs-time", "3:15"); await page.click('[data-act="rs-save"]');
  assert.equal(await page.evaluate(() => S.train.circuitLog.find(x => x.id === "cl2").sec), 195, "changed, not duplicated");
  assert.equal(await page.evaluate(() => S.train.circuitLog.length), 2);
  for (const [type, id, key] of [["pb", "pb1", "pbs"], ["top", "ts1", "topSets"], ["circuit", "cl1", "circuitLog"]]) {
    await page.click(`[data-act="edit-result"][data-type="${type}"][data-id="${id}"]`); await page.click('[data-act="rs-del"]');
    assert.equal(await page.evaluate(([k, i]) => S.train[k].some(x => x.id === i), [key, id]), false, "deleted " + id);
  }
  await page.evaluate(() => document.querySelector('#toast [data-act="undo"]')?.click());
  assert.equal(await page.evaluate(() => S.train.circuitLog.some(x => x.id === "cl1")), true, "Undo brings the last one back");
});

test("Race ranking: seasons keep their own stage tables and best times; a new season starts empty; Reset clears the tables and Undo restores them; the Fire Set time can be added from the card", async () => {
  app = await H.startApp({ dir, seed: F.seed(), viewport: H.VIEWPORTS.phone });
  const page = app.page; await page.evaluate(seedRecords);
  await page.evaluate(() => { UI.fold = { rec: { "Endurance Cup ranking": true } }; ACT["race-stage-add"](); RACE().stages[0].text = "1° #4 Alberto Bivona 0:52.51 1:19.64 2:12.15\n2° #7 Luca Rossi 0:55.00 1:20.00 2:15.00"; render(); });
  assert.equal(await page.evaluate(() => document.querySelectorAll(".rk-nm").length), 1);
  assert.match(await page.evaluate(() => document.querySelector(".rec-sec.open .rec-h small").innerText), /Fire Set 3:18/);
  await page.evaluate(() => ACT["race-season-new"]()); await page.waitForTimeout(200);
  assert.equal(await page.evaluate(() => document.querySelectorAll(".rk-nm").length), 0, "the new season has no stage");
  assert.match(await page.evaluate(() => document.querySelector(".rec-sec.open .rec-h small").innerText), /no Fire Set yet/, "and my old time does not count");
  assert.match(await page.evaluate(() => document.body.innerText), /No Fire Set time in this season yet/);
  await page.evaluate(() => { const first = RACE().seasons[0].id; ACT["race-season"]({ dataset: { id: first } }); }); await page.waitForTimeout(200);
  assert.equal(await page.evaluate(() => document.querySelectorAll(".rk-nm").length), 1, "the old season keeps its table");
  await page.evaluate(() => ACT["race-season-reset"]()); await page.waitForTimeout(100); assert.equal(await page.evaluate(() => RACE().stages.length), 0);
  await page.evaluate(() => document.querySelector('#toast [data-act="undo"]')?.click()); await page.waitForTimeout(100); assert.equal(await page.evaluate(() => RACE().stages.length), 1);
  await page.click('[data-act="open-result"][data-circuit="Fire Set (Open)"]');
  assert.equal(await page.inputValue("#rs-circuit").catch(() => null) ?? await page.evaluate(() => S_().draft.circuit), "Fire Set (Open)");
});

test("lean mass: trend weight × (1 − recent-weighted body fat), with its uncertainty, checked by hand", async () => {
  app = await H.startApp({ dir, seed: F.seed(), viewport: H.VIEWPORTS.phone });
  const r = await app.page.evaluate(() => { const t = todayISO();
    for (let i = 0; i <= 40; i++) mutateLog(addDays(t, -i), d => { d.weight = 80; d.bf = null; });
    mutateLog(t, d => { d.bf = 15; }); mutateLog(addDays(t, -10), d => { d.bf = 17; }); DATA_V++; const e = leanEst(t); return e; });
  // weights 1 and 0.5 → bf = (15 + 8.5)/1.5 = 15.6667; lean = 80 × 0.843333 = 67.4667; neff = 1.5²/1.25 = 1.8; se = 1.5/√1.8 = 1.118 points → 0.894 kg
  assert.ok(Math.abs(r.bf - 15.66667) < 1e-4, "bf " + r.bf); assert.ok(Math.abs(r.lean - 67.46667) < 1e-3, "lean " + r.lean); assert.ok(Math.abs(r.fat - 12.53333) < 1e-3); assert.ok(Math.abs(r.se - 0.8944) < 1e-3, "se " + r.se); assert.equal(r.n, 2);
});

test("lean mass alert: only in a cut, only when the loss is more than 0.5 kg, 1.5 × the uncertainty and a quarter of the weight lost", async () => {
  app = await H.startApp({ dir, seed: F.seed(), viewport: H.VIEWPORTS.phone });
  const r = await app.page.evaluate(() => { const t = todayISO(); if (!S.settings || !S.settings.fit) S.settings = normalizeSettings(S.settings);
    for (let i = 0; i <= 60; i++) mutateLog(addDays(t, -i), d => { d.bf = null; d.weight = i < 20 ? 80 : 82; });
    for (const [i, v] of [[0, 16.5], [10, 16.5], [28, 15], [38, 15]]) mutateLog(addDays(t, -i), d => { d.bf = v; }); DATA_V++;
    FIT().phases = [{ start: addDays(t, -90), phase: "Cut", kcal: -500 }]; saveSettings();
    const cut = leanAlert(t); FIT().phases = [{ start: addDays(t, -90), phase: "Maintenance", kcal: 0 }]; saveSettings(); const maint = leanAlert(t);
    return { cut: { dl: cut.dl, dw: cut.dw, share: cut.share, se: cut.se, bad: cut.bad }, maint: maint.bad }; });
  // now 80 kg × (1−.165) = 66.8, a month ago 82 × .85 = 69.7 → −2.9 kg; weight −2 → share 1.45; se = hypot(0.8944, 0.9168) = 1.281 → threshold 1.92 < 2.9
  assert.ok(Math.abs(r.cut.dl + 2.9) < 1e-6 || Math.abs(r.cut.dl + 2.9) < 0.02, "dl " + r.cut.dl); assert.ok(Math.abs(r.cut.dw + 2) < 0.05, "dw " + r.cut.dw); assert.ok(Math.abs(r.cut.se - 1.281) < 0.01, "se " + r.cut.se);
  assert.equal(r.cut.bad, true); assert.equal(r.maint, false, "no alert outside a cut");
});

test("sleep tonight: usual need + repayment of owed sleep (¼ h per hour, max 1 h), a nap takes off half its length, a very active day adds 15′; each part is listed", async () => {
  app = await H.startApp({ dir, seed: F.seed(), viewport: H.VIEWPORTS.phone });
  const r = await app.page.evaluate(() => { const t = todayISO(); if (!S.settings || !S.settings.fit) S.settings = normalizeSettings(S.settings); S.settings.sleep = { target: 7.5, wake: "07:00" };
    const set = (arr) => { for (let i = 0; i < 14; i++) mutateLog(addDays(t, -i), d => { d.sleep = arr[i] ?? null; d.steps = null; d.naps = null; d.nap = null; }); DATA_V++; };
    const o = {};
    set([6.5, 6.5, 7.5, 7.5, 7.5, 7.5, 7.5]); o.debt2 = sleepTonight(t);                       // owed 2 h → +0.5
    set([6, 6, 6, 6, 6, 6, 6]); o.debtMax = sleepTonight(t);                                  // owed 10.5 h → capped +1
    set([7.5, 7.5, 7.5, 7.5, 7.5, 7.5, 7.5]); mutateLog(t, d => { d.naps = [{ at: "14:00", min: 30 }]; }); DATA_V++; o.nap = sleepTonight(t);
    set([7.5, 7.5, 7.5, 7.5, 7.5, 7.5, 7.5]); for (let i = 1; i <= 14; i++) mutateLog(addDays(t, -i), d => { d.steps = 8000; }); mutateLog(t, d => { d.steps = 15000; }); DATA_V++; o.neat = sleepTonight(t);
    set([7.5, 7.5, 7.5, 7.5, 7.5, 7.5, 7.5]); o.base = sleepTonight(t); return o; });
  assert.equal(r.base.t, 7.5); assert.deepEqual(r.base.parts.map(x => x.k), ["base"]);
  assert.equal(r.debt2.t, 8); assert.deepEqual(r.debt2.parts.map(x => x.k), ["base", "debt"]);
  assert.equal(r.debtMax.t, 8.5);
  assert.equal(r.nap.t, 7.25);
  assert.equal(r.neat.t, 7.75); assert.equal(r.neat.parts.find(x => x.k === "neat").h, 0.25);
});

test("typing in a check-in field: the field itself is never replaced by a redraw (on a phone a replaced field closes the keyboard and drops characters); the redraw waits until you leave it", async () => {
  app = await H.startApp({ dir, seed: F.seed(), viewport: H.VIEWPORTS.phone });
  const page = app.page;
  await page.evaluate(() => { openSheet("checkin", { date: addDays(todayISO(), -1) }); });
  await page.waitForSelector("#ci-weight"); await page.click("#ci-weight");
  await page.evaluate(() => { window.__el = document.getElementById("ci-weight"); window.__tick = setInterval(() => { scheduleRender(); renderSheet(); }, 7); });
  await page.keyboard.type("71.45", { delay: 25 });
  const same = await page.evaluate(() => { clearInterval(window.__tick); return document.getElementById("ci-weight") === window.__el; });
  assert.equal(same, true, "the same input element is still on the page");
  assert.equal(await page.inputValue("#ci-weight"), "71.45");
  await page.keyboard.press("Tab"); await page.waitForTimeout(150);
  assert.equal(await page.evaluate(() => logGet(addDays(todayISO(), -1)).weight), 71.45, "saved when you leave");
  assert.equal(await page.evaluate(() => document.getElementById("ci-weight").value), "71.45", "and still shown after the redraw that waited");
});

const toolOpen = async (page, id) => { await page.evaluate(`UI.tab = "timer"; UI.toolSeg = "calc"; UI.toolOpen = "${id}"; scheduleRender()`); await page.waitForSelector(`#tc-out-${id}`); };
test("Tools: timers and calculators live in one place; the timer starts from there; the calculators are closed until opened", async () => {
  app = await H.startApp({ dir, seed: F.seed(), viewport: H.VIEWPORTS.phone });
  const page = app.page;
  await page.evaluate(() => ACT["timer-open"]()); await page.waitForSelector(".tm-modes");
  assert.match(await page.evaluate(() => document.querySelector(".top-title").innerText), /Tools/);
  assert.ok(await page.$('[data-act="tm-start"]'), "Start is on the page");
  await page.click('[data-act="tool-seg"][data-k="calc"]'); await page.waitForSelector(".tc-list");
  const heads = await page.evaluate(() => [...document.querySelectorAll(".tc-list .rec-h b")].map(b => b.innerText));
  assert.deepEqual(heads, ["1RM and loads", "Pace and race times", "Training paces", "Heart-rate zones", "Plates", "Warm-up sets", "Relative strength", "Fuel for a long session", "Sweat rate"]);
  assert.equal(await page.evaluate(() => document.querySelectorAll(".tc-list .rec-sec.open").length), 0);
  await page.click('[data-act="tool-seg"][data-k="timers"]'); await page.click('[data-act="tm-start"]'); await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => TMR.phase), "run"); assert.equal(await page.evaluate(() => UI.tab), "timer");
  assert.deepEqual(app.errors, []);
});
test("Tools: the calculators give the hand-computed numbers and copy them as text", async () => {
  app = await H.startApp({ dir, seed: F.seed(), viewport: H.VIEWPORTS.phone });
  const page = app.page; await page.evaluate(() => { if (!S.settings || !S.settings.fit) S.settings = normalizeSettings(S.settings); });
  const run = (id, vals) => page.evaluate(([i, v]) => { const c = CALCS.find(x => x.id === i); Object.assign(tcs(i), v); const R = c.out(calcState(c)); return R ? R.text : null; }, [id, vals]);
  // plates: 142.5 on a 20 kg bar = 61.25 a side = 2×25 + 10 + 1.25
  assert.match(await run("plates", { t: "142.5", bar: "20" }), /each side 2 × 25 \+ 1 × 10 \+ 1 × 1\.25$/);
  assert.match(await run("plates", { t: "142", bar: "20" }), /closest loadable: 140 kg/);
  assert.match(await run("plates", { t: "40", bar: "0" }), /on a belt: 1 × 25 \+ 1 × 15$/);
  // warm-up for 100 kg: 40×6, 60×4, 75×3, 90×1 and the empty bar
  assert.equal(await run("warm", { w: "100", bar: "20" }), "Warm-up for 100 kg\nEmpty bar: 20 kg × 10\n40%: 40 kg × 6\n60%: 60 kg × 4\n75%: 75 kg × 3\n90%: 90 kg × 1");
  // relative strength: (80+20)(1+5/30) − 80 = 36.67 kg = 45.8 % of body weight
  const rel = await run("rel", { b: "80", k: "20", r: "5", x: "pull" }); assert.match(rel, /1RM \+36\.7 kg \(46% of body weight/); assert.match(rel, /3 reps: \+26\.1 kg/); assert.match(rel, /8 reps: \+12\.1 kg/); assert.doesNotMatch(rel, /5 reps:/, "the typed reps are not listed again");
  // sweat: 70 → 69 kg, drank 500 ml in 60 min = 1.5 L/h, 1/70 = 1.4 % lost (one decimal)
  assert.match(await run("sweat", { a: "70", z: "69", d: "500", m: "60" }), /1\.5 L\/h over 60 min \(1\.4% of body mass lost\)/);
  // fuel: 2 h → 30–60 g/h, 90 g in all, 4 gels of 25 g
  const fuel = await run("fuel", { m: "120", g: "25" }); assert.match(fuel, /Carbs per hour: 30–60 g/); assert.match(fuel, /≈ 90 g \(4 gels of 25 g\)/);
  // 1RM: 100 kg × 5 → Epley 116.7, mean of six formulas close to it
  const rm = await run("rm", { w: "100", r: "5", b: "", f: "Epley" }); assert.match(rm, /^1RM \(mean of six formulas\): 11\d\.\d kg/);
  assert.match(await run("hrz", { l: "170", m: "190" }), /Z2 · Aerobic: 137–/);
  assert.match(await run("paces", { v: "50" }), /Threshold: \d:\d\d \/km/);
  assert.equal(await run("rel", { b: "80", k: "", r: "" }), null, "no result without the reps");
  await toolOpen(page, "plates"); await page.evaluate(() => { Object.assign(tcs("plates"), { t: "100", bar: "20" }); scheduleRender(); }); await page.waitForTimeout(150);
  await page.evaluate(() => { window.__copied = ""; navigator.clipboard.writeText = async t => { window.__copied = t; }; });
  await page.click('[data-act="tc-copy"][data-c="plates"]'); await page.waitForTimeout(100);
  assert.match(await page.evaluate(() => window.__copied), /^Plates\n100 kg on a 20 kg bar: each side 1 × 25 \+ 1 × 15\n— Engine$/);
});
test("Tools: «Use my data» fills the fields from the body weight, the last top set and the lactate test", async () => {
  app = await H.startApp({ dir, seed: F.seed(), viewport: H.VIEWPORTS.phone });
  const page = app.page; await page.evaluate(() => { if (!S.settings || !S.settings.fit) S.settings = normalizeSettings(S.settings); const t = todayISO(); for (let i = 0; i < 7; i++) mutateLog(addDays(t, -i), d => { d.weight = 80; }); S.train.topSets = [{ id: "a", date: addDays(t, -2), ex: "Weighted pull-up", kg: 20, reps: 5, rir: 1 }]; DATA_V++; });
  await toolOpen(page, "rel"); await page.click('[data-act="tc-fill"][data-c="rel"]'); await page.waitForTimeout(150);
  assert.equal(await page.inputValue("#tc-rel-b"), "80"); assert.equal(await page.inputValue("#tc-rel-k"), "20"); assert.equal(await page.inputValue("#tc-rel-r"), "5");
  assert.match(await page.evaluate(() => document.querySelector("#tc-out-rel").innerText), /46% of body weight/);
  await page.evaluate(() => { UI.toolOpen = "pace"; UI.toolRet = { tab: "train", trainSeg: "perf", perfSeg: "records" }; scheduleRender(); }); await page.waitForSelector("#tc-out-pace");
  await page.click('[data-act="tool-back"]'); await page.waitForTimeout(200);
  assert.equal(await page.evaluate(() => [UI.tab, UI.perfSeg].join()), "train,records", "back goes to where you came from");
});

test("DOMS and training feel in the Journal: tap an area to cycle light → moderate → strong → none; both merge field by field between devices", async () => {
  app = await H.startApp({ dir, seed: F.seed(), viewport: H.VIEWPORTS.phone });
  const page = app.page;
  const r = await page.evaluate(() => { const t = todayISO(); openSheet("journal", { date: t, live: true });
    const seq = []; for (let i = 0; i < 4; i++) { ACT["doms-set"]({ dataset: { k: "quads" } }); seq.push(JSON.stringify(domsOf(t))); }
    ACT["doms-set"]({ dataset: { k: "calves" } }); ACT["doms-set"]({ dataset: { k: "calves" } }); jrSet(t, "f", 4);
    const a = { jr: { f: 4, d: [["calves", 2]], t: { f: 100, d: 100 } } }, b = { jr: { f: 2, d: [["chest", 3]], t: { f: 200, d: 50 } } }, m = jrMergeDay(a, b);
    return { seq, now: domsOf(t), feel: jrOf(t).f, filled: jrFilled(t), merged: { f: m.f, d: m.d }, txt: document.querySelector(".sheet")?.innerText.replace(/\s+/g, " ") }; });
  assert.deepEqual(r.seq, ['[["quads",1]]', '[["quads",2]]', '[["quads",3]]', "[]"]);
  assert.deepEqual(r.now, [["calves", 2]]); assert.equal(r.feel, 4); assert.equal(r.filled, true);
  assert.deepEqual(r.merged, { f: 2, d: [["calves", 2]] }, "the newer feel wins, the newer DOMS list wins");
  assert.match(r.txt, /Training feel/); assert.match(r.txt, /Calves · moderate/); assert.match(r.txt, /Sore muscles \(DOMS\)/);
});
test("DOMS change the workout: moderately sore legs take one set off the leg blocks, strongly sore two, the pull block stays; a run says to keep it easy", async () => {
  app = await H.startApp({ dir, seed: F.seed(), viewport: H.VIEWPORTS.phone });
  const page = app.page;
  const r = await page.evaluate(() => { const t = todayISO(); if (!S.settings || !S.settings.fit) S.settings = normalizeSettings(S.settings);
    const script = ["Legs 4x", "- 8 Squat", "- 10 Lunge", "", "Pull 4x", "- 6 Pull-up +10kg"].join("\n");
    startWorkout({ script, name: "Mix", sport: strengthSport(), date: t }); const L = LV(), o = {};
    domsSet(t, "quads", 2); o.mod = sgBuild(L).items.filter(i => i.kind === "doms").map(i => [i.name, i.from, i.to]);
    domsSet(t, "quads", 3); o.strong = sgBuild(L).items.filter(i => i.kind === "doms").map(i => [i.name, i.to]);
    domsSet(t, "quads", 1); o.light = sgBuild(L).items.filter(i => i.kind === "doms").length;
    domsSet(t, "quads", 0); domsSet(t, "calves", 2); o.runNote = domsNote({ sport: FIT().runSport, min: 40 }, t); o.legNote = domsNote({ sport: strengthSport(), script }, t);
    domsSet(t, "calves", 0); domsSet(t, "core", 3); o.strNote = domsNote({ sport: strengthSport(), script }, t); domsSet(t, "core", 0); domsSet(t, "chest", 3); o.pushNote = domsNote({ sport: strengthSport(), script: "Push 3x\n- 10 Push-up\n- 8 Dip" }, t); o.pullNote = domsNote({ sport: strengthSport(), script }, t);
    return o; });
  assert.deepEqual(r.mod, [["Legs", "4 sets", "3 sets"]]); assert.deepEqual(r.strong, [["Legs", "2 sets"]]); assert.equal(r.light, 0, "light soreness changes nothing");
  assert.match(r.runNote, /calves sore: keep it easy/); assert.match(r.legNote, /calves sore: one set less on those blocks/);
  assert.equal(r.strNote, "", "core is not loaded by this script"); assert.equal(r.pullNote, "", "pull-ups do not load the chest");
  assert.match(r.pushNote, /chest strongly sore: swap or skip the work that loads them/);
});

test("weight estimate: the days without a weigh-in follow the energy balance and bend to the next weigh-in; after the last one it just continues (28 days at most)", async () => {
  app = await H.startApp({ dir, seed: F.seed(), viewport: H.VIEWPORTS.phone });
  const r = await app.page.evaluate(() => { const t = todayISO(); if (!S.settings || !S.settings.fit) S.settings = normalizeSettings(S.settings);
    for (let i = 0; i <= 40; i++) mutateLog(addDays(t, -i), d => { d.weight = null; });
    mutateLog(addDays(t, -10), d => { d.weight = 80; }); mutateLog(addDays(t, -6), d => { d.weight = 79.2; }); DATA_V++;
    const dk = () => -0.1, gap = weightFill(addDays(t, -9), addDays(t, -7), dk).map(x => [daysBetween(addDays(t, -10), x.d), x.kg]),
      after = weightFill(addDays(t, -5), t, dk).map(x => x.kg), far = weightFill(addDays(t, -9), t, dk).length;
    return { gap, after, far }; });
  // 80 − 0.1k at k = 1..3 is 79.9, 79.8, 79.7; at the next weigh-in (k = 4) the model says 79.6 and the scale 79.2: −0.4 spread as k/4 → 79.8, 79.6, 79.4
  assert.deepEqual(r.gap, [[1, 79.8], [2, 79.6], [3, 79.4]]);
  // after 79.2: −0.1 a day, 5 days of gap days from −5 to today (day −6 was the weigh-in): 79.1, 79.0, …
  assert.equal(r.after[0], 79.1); assert.equal(r.after[1], 79); assert.equal(r.after.length, 6);
  assert.equal(r.far, 3 + 6, "gap days plus days after the last weigh-in, none of the weigh-in days");
});

test("test day: the workout runs like any other; at the end the results are listed with what is on record, each can be switched off, the ones on go to Records › Calisthenics tests", async () => {
  app = await H.startApp({ dir, seed: F.seed(), viewport: H.VIEWPORTS.phone });
  const page = app.page;
  const r = await page.evaluate(() => { const t = todayISO(); if (!S.settings || !S.settings.fit) S.settings = normalizeSettings(S.settings);
    S.train.calis = [{ id: "old", date: addDays(t, -40), ex: "Pull-up", test: "Max reps (BW)", val: 12 }]; DATA_V++;
    ACT["test-start"](); const L = LV(), o = { name: L.name, tasks: L.tasks.filter(x => x.t === "set").length, isTest: isTestWo(L), plain: isTestWo({ name: "Pull day", script: "Pull 4x\n- 6 Pull-up" }) };
    L.tasks.forEach((tk, i) => { if (tk.t !== "set") return; L.res[i] = L.res[i] || {}; Object.assign(L.res[i], { done: true, ex: tk.exs.map(e => ({ reps: [e.max ? 14 : e.reps || 0], load: e.load || 0, hold: [], mini: 0 })) }); });
    const R = liveResults(L); o.cands = testCands(L, R).map(c => [c.ex, c.test, c.val, c.prev]);
    L.phase = "done"; UI.tab = "live"; render(); o.card = /Test results · add to Records/.test(document.body.innerText);
    ACT["lv-trec"]({ dataset: { k: "bw:push up" } }); ACT["lv-save"](); o.calis = (S.train.calis || []).filter(c => c.date === t).map(c => [c.ex, c.test, c.val]).sort(); return o; });
  assert.equal(r.name, "Test day · calisthenics"); assert.equal(r.tasks, 10); assert.equal(r.isTest, true); assert.equal(r.plain, false);
  assert.deepEqual(r.cands.sort(), [["Dip", "Max reps (BW)", 14, 0], ["Dip", "5RM (+kg)", 25, 0], ["Pull-up", "3RM (+kg)", 20, 0], ["Pull-up", "Max reps (BW)", 14, 12], ["Push-up", "Max reps (BW)", 14, 0]].sort());
  assert.equal(r.card, true);
  assert.deepEqual(r.calis, [["Dip", "5RM (+kg)", 25], ["Dip", "Max reps (BW)", 14], ["Pull-up", "3RM (+kg)", 20], ["Pull-up", "Max reps (BW)", 14]], "the push-up result was switched off");
});

test("reports: the weekly report has a Recovery and body card with sleep against need, naps, battery, training feel, sore days, lean mass and the Fire Set, and the copied text carries them", async () => {
  app = await H.startApp({ dir, seed: F.seed(), viewport: H.VIEWPORTS.phone });
  const page = app.page;
  const r = await page.evaluate(() => { const t = todayISO(); if (!S.settings || !S.settings.fit) S.settings = normalizeSettings(S.settings); S.settings.sleep = { target: 7.5, wake: "07:00" };
    const ws = weekStartOf(t), pw = addDays(ws, -7);   // last week: complete
    for (let i = 0; i < 7; i++) mutateLog(addDays(pw, i), d => { d.sleep = i < 2 ? 6 : 7.5; d.weight = 80; d.bf = i === 6 ? 16 : i === 0 ? 15 : null; if (i === 1) d.naps = [{ at: "14:00", min: 25 }]; });
    domsSet(addDays(pw, 2), "quads", 3); domsSet(addDays(pw, 3), "quads", 2); domsSet(addDays(pw, 3), "chest", 1); jrSet(addDays(pw, 2), "f", 4); jrSet(addDays(pw, 4), "f", 2);
    S.train.circuitLog = [{ id: "c", date: addDays(pw, 5), circuit: raceSel().fire.name, sec: 199.5 }]; DATA_V++;
    UI.tab = "progress"; UI.progSeg = "reports"; UI.repSeg = "week"; UI.dashSeg = "week"; UI.repOff = -1; render();
    const P = periodOf("week", -1), X = periodExtras(P, P.b);
    return { X: { sleep: X.sleep && [r1(X.sleep.avg), X.sleep.n, r1(X.sleep.owed), X.sleep.short], nap: X.nap, doms: X.doms, feel: X.feel, fire: X.fire && X.fire.best }, card: /Recovery and body/.test(document.body.innerText), text: reportText() }; });
  // 2 nights of 6 h and 5 of 7.5 h: mean 7.07; owed 2 × 1.5 = 3 h; both under 6.5 h
  assert.deepEqual(r.X.sleep, [7.1, 7, 3, 2]); assert.deepEqual(r.X.nap, { min: 25, n: 1 }); assert.deepEqual(r.X.doms, { days: 2, top: ["Quads", "Chest"] }); assert.equal(r.X.feel, 3); assert.equal(r.X.fire, 199.5);
  assert.equal(r.card, true); assert.match(r.text, /Sleep: 7\.1 h on 7 nights, need 7\.5 h, 3 h owed/); assert.match(r.text, /Sore days: 2 \(Quads, Chest\)/); assert.match(r.text, /Training feel: 3 \/ 5/); assert.ok(r.text.indexOf("Sore days") < r.text.indexOf("Next week:"), "before the tips for next week");
});

const LD = `<html><head><title>Pasta e ceci</title><script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"WebSite","name":"x"},{"@type":["Recipe"],"name":"Pasta e ceci","recipeYield":["4","4 servings"],"totalTime":"PT1H15M","recipeIngredient":["200 g pasta","1 can chickpeas (240 g)","2 tbsp olive oil"],"recipeInstructions":[{"@type":"HowToStep","text":"Sauté the garlic."},{"@type":"HowToSection","itemListElement":[{"@type":"HowToStep","text":"Add the chickpeas."},{"@type":"HowToStep","text":"Cook the pasta in it."}]}]}]}</script></head><body><p>ads</p></body></html>`;
test("recipe from a link: the structured recipe of the page is read, the AI turns the lines into grams and foods; a site that blocks the app, or has no recipe, says what to do", async () => {
  app = await H.startApp({ dir, seed: F.seed(), viewport: H.VIEWPORTS.phone });
  const page = app.page;
  const r = await page.evaluate(async html => { const o = {}; const P = recipeFromHTML(html); o.P = { name: P.name, servings: P.servings, time: P.time, ing: P.ingredients.length, steps: P.steps, text: P.text.split("\n").slice(0, 3) };
    o.plain = recipeFromHTML("<html><head><title>Blog</title></head><body><p>" + "Mix flour and water and bake it for an hour. ".repeat(5) + "</p></body></html>")?.structured; o.none = recipeFromHTML("<html><body>hi</body></html>");
    let prompt = ""; Sync.sample = { json: async p => { prompt = p; return { name: "Pasta e ceci", servings: 4, time_min: 75, ingredients: [{ name: "pasta", grams: 200, unit: "g", kcal: 350, protein: 12, carbs: 72, fat: 1.5, fiber: 3 }, { name: "olive oil", grams: 27, unit: "g", kcal: 884, protein: 0, carbs: 0, fat: 100, fiber: 0 }], steps: ["Sauté", "Cook"] }; } };
    ACT["rcimp-open"](); S_().url = "example.org/pasta"; let asked = "";
    window.fetch = async u => { asked = u; return { ok: true, text: async () => html }; }; await ACT["ri-link"](); await new Promise(r => setTimeout(r, 80));
    o.asked = asked; o.res = S_().res && [S_().res.name, S_().res.servings, S_().res.time, S_().res.rows.length]; o.inPrompt = /200 g pasta/.test(prompt) && /Servings: 4/.test(prompt);
    S_().res = null; S_().url = "blocked.example"; window.fetch = async () => { throw new TypeError("Failed to fetch"); }; await ACT["ri-link"](); o.err = S_().linkErr;
    window.fetch = async () => ({ ok: true, text: async () => "<html><body>hi</body></html>" }); S_().linkErr = ""; await ACT["ri-link"](); o.err2 = S_().linkErr; return o; }, LD);
  assert.deepEqual(r.P, { name: "Pasta e ceci", servings: 4, time: 75, ing: 3, steps: ["Sauté the garlic.", "Add the chickpeas.", "Cook the pasta in it."], text: ["Pasta e ceci", "Servings: 4", "Ingredients:"] });
  assert.equal(r.plain, false); assert.equal(r.none, null);
  assert.equal(r.asked, "https://example.org/pasta"); assert.deepEqual(r.res, ["Pasta e ceci", 4, 75, 2]); assert.equal(r.inPrompt, true);
  assert.match(r.err, /does not let the app read it/); assert.match(r.err2, /No recipe found/);
});
