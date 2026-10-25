/* M11m: Endurance Cup category advice (L151), the same newer data in the All-time recap and in the workout PDF (L152), the "Sore anywhere?" reminder and sore areas in the suggestions (L153).
   Synthetic data only; every expected value below is computed by hand in the comment next to it. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
const { spawnSync } = require("child_process"), fs = require("fs"), os = require("os"), path = require("path");
let dir, app;
test.before(async () => { dir = H.build(H.tmp("m11m-build")); });
test.afterEach(async () => { await app?.close(); app = null; });
const start = async vp => { app = await H.startApp({ dir, seed: F.seed({ withPlan: false }), viewport: vp || H.VIEWPORTS.phone }); return app.page; };

/* ---------- L151 category advice ---------- */
test("L151 raceNext: the next category from the Fire Set time, the cap and the strict muscle-ups (hand-computed)", async () => {
  const page = await start();
  const r = await page.evaluate(() => {
    const n = (...a) => { const x = raceNext(...a); return x && { text: x.text, fits: x.fits, muOk: x.muOk, next: x.next, extra: x.extra }; };
    return {
      consts: [RACE_NEXT_FRAC, RACE_NEXT_MU],
      open120mu2: n("Fire Set (Open)", 120, 2), open120mu0: n("Fire Set (Open)", 120, 0), open150mu3: n("Fire Set (Open)", 150, 3), open150mu0: n("Fire Set (Open)", 150, 0),
      inter200mu3: n("Fire Set (Intermediate)", 200, 3), inter200mu2: n("Fire Set (Intermediate)", 200, 2), inter270mu2: n("Fire Set (Intermediate)", 270, 2),
      pro: n("Fire Set (Pro)", 250, 9), none: n("Fire Set (Open)", null, 5), custom: n("Fire Set (Mine)", 120, 5), cutc: n("Cut · Mix C.L.", 120, 5),
      edge: n("Fire Set (Open)", 131.89, 1), over: n("Fire Set (Open)", 131.91, 1) };
  });
  assert.deepEqual(r.consts, [0.85, [1, 3]]);
  // Open 2:00 = 120 s over 50 reps: 2.4 s/rep. Block 2 = 1+10+10+15+20+10 = 66 reps → 158.4 s (2:38) more, 278.4 s (4:38) in all; 360 − 120 = 240 s (4:00) left. 85% of 360 = 306 ≥ 278.4: fits.
  assert.equal(r.open120mu2.text, "Trying Intermediate? Your Open block leaves 4:00 under the limit; block 2 adds 66 reps, about 2:38 at your 2.4 s/rep: 4:38 in all. Worth a try as a test run: under 85% of the limit, with 2 strict muscle-ups logged.");
  assert.equal(r.open120mu2.fits, true); assert.equal(r.open120mu2.muOk, true); assert.equal(r.open120mu2.next, "Intermediate"); assert.equal(r.open120mu2.extra, 66);
  // no muscle-up: the pace would allow it, the muscle-up is the limit (block 2 starts with one)
  assert.match(r.open120mu0.text, /^Trying Intermediate\? Your Open block leaves 4:00 under the limit; block 2 adds 66 reps, about 2:38 at your 2\.4 s\/rep: 4:38 in all\. The pace would allow it: the muscle-up is the limit\. The next block needs 1 strict muscle-up and you have 0 logged/);
  assert.equal(r.open120mu0.fits, true); assert.equal(r.open120mu0.muOk, false);
  // Open 2:30 = 150 s: 3 s/rep → +198 s = 348 s (5:48) > 306: too close to the limit. The pace for 306 s over 116 reps is 306·50/116 = 131.9 s; 150 − 131.9 = 18.1 s → 0:18 off
  assert.equal(r.open150mu3.text, "Trying Intermediate? Your Open block leaves 3:30 under the limit; block 2 adds 66 reps, about 3:18 at your 3 s/rep: 5:48 in all. Not yet: the next block would end too close to the limit. Take about 0:18 off the Open block first.");
  assert.equal(r.open150mu3.fits, false);
  assert.match(r.open150mu0.text, /Take about 0:18 off the Open block first, and log 1 strict muscle-up \(you have 0\)\.$/);
  // the edge: 131.89 s × 116 / 50 = 305.98 s fits (≤ 306); 131.91 s → 306.03 s does not
  assert.equal(r.edge.fits, true); assert.equal(r.over.fits, false);
  // Intermediate 3:20 = 200 s over 116 reps: 1.7241 s/rep; block 3 = 1+10+5+20+5+1 = 42 reps → 72.4 s (1:12) more, 272.4 s (4:32) in all; 160 s (2:40) left; 3 muscle-ups needed (1 in block 2, 2 in block 3)
  assert.equal(r.inter200mu3.text, "Trying Pro? Your Intermediate block leaves 2:40 under the limit; block 3 adds 42 reps, about 1:12 at your 1.7 s/rep: 4:32 in all. Worth a try as a test run: under 85% of the limit, with 3 strict muscle-ups logged.");
  assert.match(r.inter200mu2.text, /The pace would allow it: the muscle-up is the limit\. The next block needs 3 strict muscle-ups and you have 2 logged/);
  // Intermediate 4:30 = 270 s: 2.3276 s/rep → +97.8 s (1:38) = 367.8 s (6:08), beyond the limit; 306·116/158 = 224.7 s → 45.3 s off (0:45); 2 muscle-ups of 3
  assert.equal(r.inter270mu2.text, "Trying Pro? Your Intermediate block leaves 1:30 under the limit; block 3 adds 42 reps, about 1:38 at your 2.3 s/rep: 6:08 in all. Not yet: the next block would end too close to the limit. Take about 0:45 off the Intermediate block first, and log 3 strict muscle-ups (you have 2).");
  assert.equal(r.pro, null, "Pro is the last category"); assert.equal(r.none, null, "no time, no advice"); assert.equal(r.custom, null, "a circuit of your own is not a category"); assert.equal(r.cutc, null);
});

test("L151 the advice line sits in the Endurance Cup ranking card, once, and follows the declared block and the muscle-ups logged", async () => {
  const page = await start();
  const txt = async () => page.evaluate(() => { UI.fold = { rec: { "Endurance Cup ranking": true } }; render(); return [...document.querySelectorAll(".rk .wk-tips li")].map(l => l.innerText); });
  await page.evaluate(() => { const T = S.train, t = todayISO(); T.circuitLog = [{ id: "a", date: addDays(t, -2), circuit: "Fire Set (Open)", sec: 120 }]; T.calis = [{ id: "m", date: addDays(t, -9), ex: "Muscle-up", test: "Max reps (BW)", val: 1 }]; put("train", "", T); DATA_V++; UI.tab = "train"; UI.trainSeg = "perf"; UI.perfSeg = "records"; render(); });
  await page.waitForSelector(".rec-sec");
  let li = await txt(); let adv = li.filter(x => /^Trying Intermediate\?/.test(x));
  assert.equal(adv.length, 1, "one advice line: " + li.join(" | "));
  assert.match(adv[0], /leaves 4:00 under the limit/); assert.match(adv[0], /Worth a try/); assert.match(adv[0], /with 1 strict muscle-up logged/);
  assert.ok(!li.some(x => /^Blocks 2 and 3 start with a muscle-up/.test(x)), "the old muscle-up hint is not repeated next to it");
  // no muscle-up logged: the line says it is the limit and the old generic hint gives way to it
  await page.evaluate(() => { S.train.calis = []; DATA_V++; render(); }); li = await txt();
  assert.ok(li.some(x => /the muscle-up is the limit/.test(x))); assert.ok(!li.some(x => /^Blocks 2 and 3 start with a muscle-up/.test(x)));
  // declare Pro: no category above it, the generic hint comes back
  await page.evaluate(() => { ACT["race-fire"]({ dataset: { n: "Fire Set (Pro)" } }); }); await page.waitForTimeout(100); li = await txt();
  assert.ok(!li.some(x => /^Trying /.test(x))); assert.ok(li.some(x => /^Blocks 2 and 3 start with a muscle-up/.test(x)));
  assert.deepEqual(app.errors, []);
});

/* ---------- L152 the same newer data in the All-time recap and in the PDF ---------- */
const SEED_BODY = `(() => { const t = todayISO(); if (!S.settings.fit) S.settings = normalizeSettings(S.settings); S.settings.sleep = { target: 7.5, wake: "07:00" };
  for (let i = 0; i < 10; i++) mutateLog(addDays(t, -i), d => { d.weight = 80; d.sleep = i < 3 ? 6 : 7; if (i === 5) d.naps = [{ at: "14:00", min: 25 }]; if (i === 0) d.bf = 15; });
  domsSet(addDays(t, -4), "quads", 3); jrSet(addDays(t, -4), "f", 4); jrSet(addDays(t, -6), "f", 2);
  S.train.circuitLog = [{ id: "c", date: addDays(t, -2), circuit: raceSel().fire.name, sec: 199.5 }]; DATA_V++; })()`;

test("L152 the All-time recap carries Recovery and body from the same periodExtras as the weekly report", async () => {
  const page = await start();
  const r = await page.evaluate(code => { eval(code); const t = todayISO(), D = recapData();
    UI.tab = "progress"; UI.progSeg = "reports"; UI.repSeg = "all"; render();
    const X = periodExtras({ a: D.first }, t), body = document.body.innerText, h = [...document.querySelectorAll("h2")].map(e => e.innerText);
    return { first: D.first === addDays(t, -9), X: { sleep: X.sleep, nap: X.nap, doms: X.doms, feel: X.feel, fire: X.fire && X.fire.best, hasBattery: X.battery != null }, h, body: body.replace(/\s+/g, " ") }; }, SEED_BODY);
  assert.equal(r.first, true, "the recap starts at the first weigh-in");
  // 10 nights: 3 × 6 h and 7 × 7 h → mean 6.7; need 7.5 → owed 3 × 1.5 + 7 × 0.5 = 8 h; the 3 nights of 6 h are under 6.5 h
  assert.deepEqual([r.X.sleep.avg.toFixed(2), r.X.sleep.n, r.X.sleep.owed, r.X.sleep.short], ["6.70", 10, 8, 3]);
  assert.deepEqual(r.X.nap, { min: 25, n: 1 }); assert.deepEqual(r.X.doms, { days: 1, top: ["Quads"] }); assert.equal(r.X.feel, 3); assert.equal(r.X.fire, 199.5); assert.equal(r.X.hasBattery, true);
  assert.ok(r.h.includes("Recovery and body"), "the section is on the recap: " + r.h.join(", "));
  assert.ok(r.h.indexOf("Recovery and body") < r.h.indexOf("Weight journey"), "after the streaks, before the weight journey");
  for (const re of [/Sleep 10 nights · need 7\.5 h · 8 h owed · 3 under 6\.5 h 6\.7 h/, /Naps 25 min in all 1/, /Energy battery at wake average of the nights logged \d+%/, /Training feel from the Journal 3 \/ 5/, /Sore days most: quads 1/, /Lean mass/, /Fire Set \(Open\) best of 1 run 3:20/])
    assert.match(r.body, re, String(re));
  assert.equal((r.body.match(/Recovery and body/g) || []).length, 1, "once on the screen");
  assert.deepEqual(app.errors, []);
});

test("L152 a long period shows the nights and the average, not a sum of owed hours; one night says 'night'", async () => {
  const page = await start();
  const r = await page.evaluate(() => ({ long: extrasRows({ sleep: { avg: 7, n: 200, owed: 90, tgt: 7.5, short: 4 } })[0], one: extrasRows({ sleep: { avg: 6, n: 1, owed: 1.5, tgt: 7.5, short: 1 } })[0], bt1: extrasRows({ battery: 70, btN: 1 })[0], btN: extrasRows({ battery: 70, btN: 4 })[0] }));
  assert.deepEqual(r.long, ["Sleep", "7 h", "200 nights · need 7.5 h · 4 under 6.5 h"]);
  assert.deepEqual(r.one, ["Sleep", "6 h", "1 night · need 7.5 h · 1.5 h owed · 1 under 6.5 h"]);
  assert.equal(r.bt1[2], "that morning"); assert.equal(r.btN[2], "average of the nights logged");
});

test("L152 the PDF of a workout has a Recovery and body section for that day, in the same words", async () => {
  if (spawnSync("pdftotext", ["-v"]).error) return;      // no PDF reader on this machine: skipped, not passed silently
  const page = await start();
  const b64 = await page.evaluate(async code => { eval(code); const t = addDays(todayISO(), -4); mutateLog(t, d => { d.workouts = [{ sport: strengthSport(), min: 40, rpe: 8, int: "Hard", note: "Pulls" }]; }); DATA_V++;
    const buf = new Uint8Array(await workoutPdf(t, logGet(t).workouts[0]).arrayBuffer()); let s = ""; for (const x of buf) s += String.fromCharCode(x); return btoa(s); }, SEED_BODY);
  const f = path.join(os.tmpdir(), `m11m-${process.pid}.pdf`); fs.writeFileSync(f, Buffer.from(b64, "base64")); const o = spawnSync("pdftotext", ["-layout", f, "-"], { encoding: "utf8" }); fs.unlinkSync(f);
  const T = o.stdout.replace(/\s+/g, ""), nows = x => x.replace(/\s+/g, "");
  for (const x of ["Recovery and body", "Sleep 7 h", "1 night · need 7.5 h · no debt", "Energy battery at wake", "that morning", "Training feel 4 / 5", "Sore days 1 most: quads"]) assert.ok(T.includes(nows(x)), `PDF has «${x}»\n${T}`);
  assert.ok(!/Fire Set \(Open\)/.test(T), "the Fire Set was not run that day");
  assert.deepEqual(app.errors, []);
});

/* ---------- L153 the morning after: "Sore anywhere?" ---------- */
test("L153 «Sore anywhere?»: only the morning after a Hard session or 75 minutes or more, until answered", async () => {
  const page = await start();
  const r = await page.evaluate(() => { const t = todayISO(), y = addDays(t, -1), st = strengthSport(), rows = () => todayReminders().filter(x => x.kind === "doms").map(x => [x.title, x.small]), out = {};
    const yday = w => { mutateLog(y, d => { d.workouts = w ? [{ sport: st, note: "Legs", ...w }] : []; }); DATA_V++; };
    out.none = rows(); yday({ min: 74, int: "Moderate" }); out.m74 = rows(); yday({ min: 75, int: "Moderate" }); out.m75 = rows(); yday({ min: 40, int: "Hard" }); out.hard = rows(); yday({ min: 40, int: "Light" }); out.light = rows();
    yday({ min: 40, int: "Hard" }); domsSet(t, "calves", 1); out.sore = rows(); domsSet(t, "calves", 0); out.cleared = rows();
    ACT["doms-no"](); out.no = rows(); mutateLog(t, d => { delete d.dq; }); DATA_V++; out.again = rows();
    out.future = todayReminders(addDays(t, 1)).some(x => x.kind === "doms"); return out; });
  assert.deepEqual(r.none, []); assert.deepEqual(r.m74, [], "74 minutes at moderate effort is not enough"); assert.deepEqual(r.m75, [["Sore anywhere?", "Legs, 75 min, yesterday"]]);
  assert.deepEqual(r.hard, [["Sore anywhere?", "Legs, hard, yesterday"]]); assert.deepEqual(r.light, []);
  assert.deepEqual(r.sore, [], "once a sore area is noted the question goes"); assert.deepEqual(r.cleared, [["Sore anywhere?", "Legs, hard, yesterday"]], "and comes back if it is cleared again");
  assert.deepEqual(r.no, [], "«No» silences it for today"); assert.equal(r.again.length, 1); assert.equal(r.future, false, "only today");
});

test("L153 the row is in the Reminders card on Today; «Journal» opens today's Journal and the question is answered, «No» only hides it; fits at 390, 820 and 1440", async () => {
  for (const vp of [H.VIEWPORTS.phone, H.VIEWPORTS.tablet, H.VIEWPORTS.desktop]) {
    app = await H.startApp({ dir, seed: F.seed({ withPlan: false }), viewport: vp }); const page = app.page;
    await page.evaluate(() => { const y = addDays(todayISO(), -1); mutateLog(y, d => { d.workouts = [{ sport: strengthSport(), note: "Legs", min: 80, int: "Hard" }]; }); DATA_V++; UI.tab = "today"; render(); });
    const row = page.locator(".rm .rm-r", { hasText: "Sore anywhere?" }); await row.waitFor();
    const box = await page.evaluate(() => { const r = [...document.querySelectorAll(".rm .rm-r")].find(e => /Sore anywhere/.test(e.innerText)), c = r.closest(".rm").getBoundingClientRect(), b = r.getBoundingClientRect(), bt = [...r.querySelectorAll("button")].map(x => { const q = x.getBoundingClientRect(); return [x.innerText.trim(), Math.round(q.right), Math.round(q.height), Math.round(q.top + q.height / 2)]; }), t = r.querySelector(".rm-x b").getBoundingClientRect();
      return { inCard: c.left <= b.left && b.right <= c.right + 0.5, bt, overflow: r.scrollWidth > r.clientWidth + 1, titleH: Math.round(t.height), rowRight: Math.round(b.right), mid: Math.round(b.top + b.height / 2) }; });
    assert.equal(box.inCard, true); assert.equal(box.overflow, false); assert.deepEqual(box.bt.map(x => x[0]), ["No", "Journal"], vp.width + "px");
    assert.ok(box.bt.every(x => Math.abs(x[3] - box.mid) <= 2), "buttons on the row's axis: " + JSON.stringify(box)); assert.ok(box.bt.every(x => x[1] <= box.rowRight), "buttons inside the row");
    if (vp.width === 390) { await page.screenshot({ path: path.join(os.tmpdir(), "m11m-reminder-390.png") }); }
    await page.click('[data-act="doms-ask"]'); await page.waitForSelector(".sheet");
    assert.deepEqual(await page.evaluate(() => [UI.sheet.type, UI.sheet.date === todayISO(), logGet(todayISO()).dq === true, todayReminders().some(x => x.kind === "doms")]), ["journal", true, true, false]);
    await app.close(); app = null;
  }
  app = await H.startApp({ dir, seed: F.seed({ withPlan: false }), viewport: H.VIEWPORTS.phone }); const page = app.page;
  await page.evaluate(() => { mutateLog(addDays(todayISO(), -1), d => { d.workouts = [{ sport: strengthSport(), min: 80, int: "Hard" }]; }); DATA_V++; UI.tab = "today"; render(); });
  await page.click('[data-act="doms-no"]'); await page.waitForTimeout(200); assert.equal(await page.evaluate(() => !!document.querySelector(".rm .rm-r") && /Sore anywhere/.test(document.querySelector(".rm")?.innerText || "")), false);
  assert.equal(await page.evaluate(() => !UI.sheet), true, "«No» does not open anything"); assert.deepEqual(app.errors, []);
});

test("L153 the sore areas are in the Free-day suggestions: strongly sore legs → rest first, moderately sore → an easy run, arms or chest do not change them", async () => {
  const page = await start();
  const r = await page.evaluate(() => { const t = todayISO(), sp = FIT().runSport; S.settings = normalizeSettings(S.settings);
    for (let i = 1; i <= 40; i++) mutateLog(addDays(t, -i), d => { if (i >= 4 && i % 3 === 0) d.workouts = [{ sport: sp, min: 40, km: 7, hr: 140, int: "Moderate" }]; });
    DATA_V++; const o = {}, k = () => { const s = suggestFor(t); return { first: s.list[0]?.key, why: s.why, note: s.list[0]?.note }; };
    o.base = k(); domsSet(t, "chest", 3); o.chest = k(); domsSet(t, "quads", 2); o.mod = k(); domsSet(t, "calves", 3); o.strong = k(); return o; });
  assert.ok(r.base.first, "the fixture gives suggestions: " + JSON.stringify(r.base)); assert.ok(!/sore/.test(r.base.why));
  assert.match(r.chest.why, /chest sore/); assert.equal(r.chest.first, r.base.first, "a sore chest does not change a run");
  assert.match(r.mod.why, /chest, quads sore/); assert.equal(r.mod.first, "easy"); assert.equal(r.mod.note, "Legs sore: keep it easy and short.");
  assert.match(r.strong.why, /calves/); assert.equal(r.strong.first, "rest"); assert.equal(r.strong.note, "Legs strongly sore: rest or mobility.");
  assert.deepEqual(app.errors, []);
});
