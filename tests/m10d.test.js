/* M10d: one reminder per time for supplements (local, push, calendar), times tied to your meals, the undo toast that stays put, softer sounds,
   the profile message, deloads in the Season that follow your training, weather chart and daily GPS. Synthetic data only. */
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("node:fs"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let dir, app;
test.before(async () => { dir = H.build(H.tmp("m10d-build")); });
test.afterEach(async () => { await app?.close(); app = null; });
const open = async (viewport = H.VIEWPORTS.phone, o = {}) => { app = await H.startApp({ dir, seed: F.seed(o), viewport }); return app.page; };

test("a supplement can be tied to a meal («after lunch» = your lunch time + 30 min): changing your usual times moves it, the label says both", async () => {
  const page = await open();
  const r = await page.evaluate(() => { S.settings.supps = [{ id: "a", name: "Creatina", times: ["~l+"], days: [], on: true, since: addDays(todayISO(), -9) }, { id: "b", name: "Omega 3", times: ["~b", "21:00"], days: [], on: true, since: addDays(todayISO(), -9) }];
    const f = () => suppSlots(todayISO()).map(s => [s.x.name, s.t, suppShow(s)]); const a = f(); CHG["meal-time"]("14:00", { dataset: { k: "l" } }); const b = f();
    openSheet("supp", { draft: clone(S.settings.supps[0]) }); const opts = [...document.querySelectorAll('.sheet select[data-chg="supp-when"] option')].map(o => o.textContent);
    const box = document.createElement("div"); box.innerHTML = suppSettingsCard(); return { a, b, opts, inputs: box.querySelectorAll(".meal-t input").length, list: box.innerText.replace(/\s+/g, " ") }; });
  assert.deepEqual(r.a, [["Omega 3", "08:00", "At breakfast · 08:00"], ["Creatina", "13:30", "After lunch · 13:30"], ["Omega 3", "21:00", "21:00"]]);
  assert.deepEqual(r.b.map(x => x[1]), ["08:00", "14:30", "21:00"]); assert.ok(r.opts.includes("After lunch") && r.opts.includes("At a time")); assert.equal(r.inputs, 4); assert.match(r.list, /After lunch/);
});

test("everything due at the same time is ONE reminder: on the phone while the app is open, in the push queue, and in the calendar file; «Taken» ticks all of them", async () => {
  const page = await open();
  const r = await page.evaluate(async () => { const t = todayISO(), tm = addDays(t, 1); CHG["meal-time"]("23:00", { dataset: { k: "d" } });
    S.settings.supps = [{ id: "a", name: "Creatina", dose: "5 g", times: ["~d+"], days: [], on: true, since: addDays(t, -9) }, { id: "b", name: "Beta-alanina", times: ["23:30"], days: [], on: true, since: addDays(t, -9) }, { id: "c", name: "Vitamin D", withFood: true, times: ["07:00"], days: [], on: true, since: addDays(t, -9) }];
    S.settings.reminders = { on: true, push: true }; const plan = pushPlan().filter(x => x.key.startsWith("supp|" + tm)).map(x => [x.key, x.title, x.body, x.data.k, x.cond.supp]);
    const slots = suppSlots(t), g = slots.filter(s => s.t === "23:30"), m = suppMessage(g);
    window.__ics = ""; saveFile = async (n, txt) => { window.__ics = txt; return true; }; await ACT["rem-ics"](); const ev = (__ics.match(/BEGIN:VEVENT/g) || []).length, sum = [...__ics.matchAll(/SUMMARY:(.*)/g)].map(x => x[1]);
    // the notification action
    mutateLog(t, d => { d.supp = undefined; }); suppMark(t, g.map(s => s.k).join(",")); const taken = slots.filter(s => suppTaken(t, s.k)).map(s => s.x.name);
    return { plan, m, ev, sum, taken }; });
  assert.equal(r.plan.length, 2, "07:00 and 23:30 tomorrow: two reminders for three supplements"); const two = r.plan.find(x => x[0].endsWith("23:30"));
  assert.equal(two[1], "Supplements · 2"); assert.match(two[2], /Creatina · 5 g\nBeta-alanina/); assert.equal(two[3].split(",").length, 2); assert.equal(two[4].length, 2, "the server skips it only when both were taken");
  assert.equal(r.m.title, "Supplements · 2"); assert.equal(r.ev, 2); assert.ok(r.sum.some(x => /Supplements: (Creatina|Beta-alanina)\\?, (Beta-alanina|Creatina)/.test(x))); assert.deepEqual(r.taken.sort(), ["Beta-alanina", "Creatina"]);
});

test("the push function drops a grouped reminder only when every supplement in it was taken", () => {
  const src = fs.readFileSync(__dirname + "/../supabase/functions/engine-push/index.ts", "utf8");
  assert.match(src, /Array\.isArray\(cond\.supp\)/); assert.match(src, /ks\.every\(/);
});

test("the undo toast sits in the same place every time, above the live dock, and is never cut: no transform on its container, same spot at any scroll", async () => {
  const page = await open(H.VIEWPORTS.phone);
  await page.evaluate(() => { startWorkout({ script: "Pull 4x\n- 6 Pull-up +10kg\n- 8 Dip\n\nCore 3x\n- 30s Plank", name: "T", sport: strengthSport(), date: todayISO() }); UI.tab = "live"; render(); ACT["lv-begin"](); ACT["lv-skipprep"]?.(); });
  await page.waitForTimeout(300);
  const r = await page.evaluate(async () => { const out = [], tf = getComputedStyle(document.getElementById("toast")).transform;
    for (const y of [0, 400, 1200]) { window.scrollTo(0, y); toast("Set removed", () => {}); await new Promise(r => setTimeout(r, 120)); const b = document.querySelector(".toast").getBoundingClientRect(), d = document.querySelector(".lv-dock")?.getBoundingClientRect(); out.push([Math.round(b.bottom), Math.round(b.top), d ? Math.round(d.top) : null, innerHeight]); }
    return { tf, out }; });
  assert.equal(r.tf, "none"); assert.ok(Math.max(...r.out.map(x => x[0])) - Math.min(...r.out.map(x => x[0])) <= 2, "same height wherever the page is scrolled"); for (const [bottom, top, dock, h] of r.out) { assert.ok(top >= 0 && bottom <= h); if (dock) assert.ok(bottom <= dock + 1, "above the dock"); }
});

test("the sounds are soft notes, not beeps: nothing above 1 kHz, every cue starts gently and dies away, a low-pass sits in front of the speakers", async () => {
  const page = await open();
  const r = await page.evaluate(() => { audioOn(); const notes = Object.values(CUE_SND).flat(), lp = (() => { try { audioOut(); return !!AC.createBiquadFilter; } catch (e) { return false; } })(); return { max: Math.max(...notes.map(n => n[0])), maxD: Math.max(...notes.map(n => n[1])), keys: Object.keys(CUE_SND), lp, src: tone.toString() }; });
  assert.ok(r.max <= 1000, "highest note " + r.max); assert.ok(r.maxD <= 1); assert.deepEqual(r.keys.sort(), ["end", "go", "half", "rest", "round", "tick"]); assert.ok(r.lp);
  assert.match(r.src, /exponentialRampToValueAtTime\(\.0001, at \+ d\)/); assert.doesNotMatch(r.src, /setValueAtTime\(vol, at \+ Math\.max/, "no flat sustain");
});

test("your profile in one message: name, age, height, weight, sports, best bodyweight and weighted sets, running PBs, weekly km, steps, sleep; short enough to send", async () => {
  const page = await open(H.VIEWPORTS.phone);
  const r = await page.evaluate(() => { const t = todayISO(), f = FIT(); Object.assign(f.profile, { name: "Marco", surname: "Rossi", dob: (new Date().getFullYear() - 31) + "-01-01", height: 178 });
    S.train.calis = [{ date: addDays(t, -30), ex: "Pull-up", test: "Max reps (BW)", val: 14, bw: 78 }, { date: addDays(t, -10), ex: "Pull-up", test: "Max reps (BW)", val: 16, bw: 78 }, { date: addDays(t, -20), ex: "Dip", test: "Max reps (BW)", val: 25, bw: 78 }];
    S.train.topSets = [{ date: addDays(t, -12), ex: "Pull-up", kg: 30, reps: 3, rir: 1, bw: 78 }, { date: addDays(t, -5), ex: "Dip", kg: 40, reps: 5, rir: 2, bw: 78 }];
    S.train.tests = [{ id: "r1", kind: "Race", date: addDays(t, -40), km: 5, sec: 1290 }, { id: "r2", kind: "Race", date: addDays(t, -80), km: 10, sec: 2700 }];
    for (let i = 0; i < 56; i += 3) mutateLog(addDays(t, -i), d => { d.workouts = [{ sport: f.runSport, min: 40, km: 8 }]; d.steps = 9000 + i; d.sleep = 7.4; }); DATA_V++;
    const txt = profileSummary(); openSheet("profshare", {}); return { txt, lines: txt.split("\n").length, pre: document.querySelector(".prof-pre")?.innerText.length > 50, btns: [...document.querySelectorAll('.sheet [data-act]')].map(b => b.dataset.act) }; });
  assert.match(r.txt, /^Marco Rossi · 31 y · 178 cm/); assert.match(r.txt, /Sports:.*Running/); assert.match(r.txt, /Pull-up: 16 reps bodyweight · weighted \+30 kg × 3/); assert.match(r.txt, /Dip: 25 reps bodyweight · weighted \+40 kg × 5/);
  assert.match(r.txt, /PB 5k 21:30, 10k 45:00/); assert.match(r.txt, /km\/week \(last 8 weeks\)/); assert.match(r.txt, /steps\/day/); assert.match(r.txt, /7\.4 h sleep/);
  assert.ok(r.lines <= 14, r.lines + " lines"); assert.ok(r.pre); assert.ok(r.btns.includes("profile-copy") && r.btns.includes("profile-share"));
  const set = await page.evaluate(() => { const h = fitSettings(); return { name: /id="fit-profile-name"/.test(h), surname: /id="fit-profile-surname"/.test(h), share: /data-act="profile-open"/.test(h) }; });
  assert.deepEqual(set, { name: true, surname: true, share: true });
});

test("Season: a deload in the calendar is skipped when the three weeks before were mostly missed («Only if I've been training»), kept when you trained or when set «As planned»", async () => {
  const page = await open(H.VIEWPORTS.phone, { withPlan: false });
  const r = await page.evaluate(() => { const t = todayISO(), cur = weekStartOf(t), f = FIT(); S.train.races = []; f.usePattern = true; f.pattern = Object.fromEntries(DOWK.map((k, i) => [k, i % 2 === 0 ? [{ sport: f.runSport, min: 40, int: "Moderate" }] : []]));
    const P = PER(); P.cycle = 2; P.start = addDays(cur, -14); P.autoDeload = false; const run = () => { DATA_V++; const x = weekPhase(cur); return [x.ph, !!x.skipped, x.why]; };
    const out = { planned: run() }; P.deloadMode = "smart"; out.missed = run();
    for (let k = 1; k <= 3; k++) for (let i = 0; i < 7; i += 2) mutateLog(addDays(cur, -7 * k + i), d => { d.workouts = [{ sport: f.runSport, min: 40, km: 6 }]; });
    out.trained = run(); return out; });
  assert.equal(r.planned[0], "deload"); assert.equal(r.missed[0], "build"); assert.equal(r.missed[1], true); assert.match(r.missed[2], /deload skipped: you did 0 of \d+ planned sessions/); assert.equal(r.trained[0], "deload");
});

test("the weather row always draws the day (rain chance, expected rain, your session, today's range) and the position follows the GPS once a day when you let it", async () => {
  const page = await open(H.VIEWPORTS.phone, { withPlan: false });
  const r = await page.evaluate(async () => { const t = todayISO(); mutateLog(t, d => { d.planned = [{ sport: FIT().runSport, min: 40, note: "Easy", at: "23:30" }]; }); DATA_V++;
    const D = { t: [], mm: [], pr: [], c: [], ap: [], code: [], wind: [], gust: [] }; for (let h = 0; h < 24; h++) { D.t.push(t + "T" + String(h).padStart(2, "0") + ":00"); D.mm.push(0); D.pr.push(5); D.c.push(8 + h / 3); D.ap.push(7); D.code.push(2); D.wind.push(8); D.gust.push(10); }
    const x = WX(); x.lat = 45.46; x.lon = 9.19; x.place = "Milan"; WXC.key = wxKey(); WXC.data = D; WXC.at = Date.now(); const row = wxRow(t, [{ sport: FIT().runSport, min: 40, at: "23:30" }]);
    let calls = 0; Object.defineProperty(navigator, "geolocation", { configurable: true, value: { getCurrentPosition: ok => { calls++; ok({ coords: { latitude: 41.9, longitude: 12.5 } }); } } });
    x.gps = true; x.gpsDay = addDays(t, -1); wxAuto(); await new Promise(r => setTimeout(r, 200)); const first = [x.lat, x.lon, x.place, x.gpsDay === t, calls]; wxAuto(); await new Promise(r => setTimeout(r, 100));
    const off = (x.gps = false, x.gpsDay = null, wxAuto(), calls); const sw = !!wxSettings().match(/data-act="wx-gps"/);
    return { chart: /wx-chart/.test(row) && /wx-band/.test(row), range: /10–15° today/.test(row), first, again: calls, off, sw }; });
  assert.ok(r.chart && r.range); assert.deepEqual(r.first, [41.9, 12.5, "Current location (41.90, 12.50)", true, 1]); assert.equal(r.again, 1, "once a day"); assert.equal(r.off, 1, "off means off"); assert.ok(r.sw);
});

test("with the app open, two supplements due at the same minute make exactly one notification, and it is not repeated", async () => {
  const page = await open();
  const r = await page.evaluate(() => { const t = todayISO(), now = nowHM(), at = addMin(now, -5); const calls = [], only = (a, b, c, d) => { if (/^supp-/.test(c)) calls.push([a, b, c, d]); }; window.notify = only; notify = only;   // the weekly review (Mondays) and the check-ups are other reminders
    Object.defineProperty(Notification, "permission", { configurable: true, get: () => "granted" });
    S.settings.supps = [{ id: "a", name: "Creatina", times: [at], days: [], on: true, since: addDays(t, -9) }, { id: "b", name: "Beta-alanina", times: [at], days: [], on: true, since: addDays(t, -9) }];
    S.settings.reminders = { on: true }; localStorage.removeItem("engine.rem"); reminderTick(); const first = calls.length; reminderTick(); return { first, total: calls.length, call: calls[0] }; });
  if (/^00:0/.test(await page.evaluate(() => nowHM()))) return;   // five minutes before midnight rolls over to yesterday
  assert.equal(r.first, 1); assert.equal(r.total, 1); assert.equal(r.call[0], "Supplements · 2"); assert.equal(r.call[3].k.split(",").length, 2);
});
