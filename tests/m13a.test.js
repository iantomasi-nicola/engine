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
  assert.equal(heads[0].open, "true"); assert.match(heads[0].s, /5k 21:00/);
  assert.ok(heads.slice(1).every(h => h.open === "false"), "the others are closed");
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
  await page.evaluate(() => { UI.recOpen = { "Endurance Cup ranking": true }; ACT["race-stage-add"](); RACE().stages[0].text = "1° #4 Alberto Bivona 0:52.51 1:19.64 2:12.15\n2° #7 Luca Rossi 0:55.00 1:20.00 2:15.00"; render(); });
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
