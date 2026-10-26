/* M12: push-up counter in the live player (L27, switchable), the sensor spike page (I4) and the sport details (G4: metres for swimming, team sports, no NaN).
   Synthetic data only. The motion signal is a sine: a rep is one full cycle, so N cycles must give N reps (an exact count, no tolerance).
   Hand-computed expectations are in the comments of each test. */
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("fs"), path = require("path"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let dir, app;
test.before(async () => { dir = H.build(H.tmp("m12p-build")); });
test.afterEach(async () => { await app?.close(); app = null; });
const open = async (viewport = H.VIEWPORTS.phone, o = {}) => { app = await H.startApp({ dir, seed: F.seed(o), viewport }); return app.page; };
const SCRIPT = "Push 3x\\n- 10 Push-up\\n\\nPull 3x\\n- 6 Pull-up";
/* a started workout sitting on its first set (Push-up), countdown skipped */
const begin = async (page, script = SCRIPT) => {
  await page.evaluate(`(() => { startWorkout({ script: "${script}", name: "Push day", sport: strengthSport(), date: todayISO() }); UI.tab = "live"; render(); })()`); await page.waitForTimeout(200);
  await page.evaluate(() => { ACT["lv-begin"](); ACT["lv-skipprep"]?.(); }); await page.waitForTimeout(250);
};
/* feeds a motion signal through a fresh counter: z = 9.81 + amp·sin(2π f t) + noise, sampled at rate Hz for secs seconds (the noise is a seeded generator) */
const SIM = `(o) => { const c = repCounter(); let n = 0, s = o.seed || 1; const rnd = () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296 - 0.5;
  for (let i = 0; i < o.secs * o.rate; i++) { const t = i / o.rate + (o.t0 || 0); n += c.feed(t, 9.81 + (o.amp || 0) * Math.sin(2 * Math.PI * (o.f || 0) * t) + (o.noise || 0) * rnd()); } return n; }`;

test("counter: N full cycles of a body-sized motion give exactly N reps, at slow, normal and fast tempo", async () => {
  const page = await open();
  /* amplitude 1.5 m/s² (a 0.3 m push-up in 2 s moves the torso with about (2π/2)²·0.15 = 1.5 m/s²).
     0.5 Hz × 20 s = 10 cycles → 10; 0.25 Hz × 20 s = 5 cycles → 5; 1 Hz × 12 s = 12 cycles → 12 (the gap between reps is 1 s, longer than the 0.6 s minimum). */
  const r = await page.evaluate(`(async () => { const sim = ${SIM}; return { normal: sim({ f: 0.5, amp: 1.5, secs: 20, rate: 50 }), slow: sim({ f: 0.25, amp: 1.5, secs: 20, rate: 50 }), fast: sim({ f: 1, amp: 1.5, secs: 12, rate: 50 }),
    jitter: sim({ f: 0.5, amp: 1.5, secs: 20, rate: 30, noise: 0.3, seed: 7 }) }; })()`);
  assert.equal(r.normal, 10); assert.equal(r.slow, 5); assert.equal(r.fast, 12);
  /* with 0.3 m/s² of noise on top (peak ±0.15) the 10 cycles are still 10 */
  assert.equal(r.jitter, 10);
});

test("counter: a phone lying still, hand tremor and breathing-sized motion count nothing", async () => {
  const page = await open();
  /* still: constant 9.81 → 0. Noise ±0.2 m/s² (below the 0.6 floor) for 60 s → 0. A sine of amplitude 0.3 (half the floor) at 0.5 Hz for 60 s → 0 */
  const r = await page.evaluate(`(async () => { const sim = ${SIM}; return { still: sim({ secs: 60, rate: 50 }), noise: sim({ noise: 0.4, secs: 60, rate: 50, seed: 3 }), small: sim({ f: 0.5, amp: 0.3, secs: 60, rate: 50 }) }; })()`);
  assert.deepEqual(r, { still: 0, noise: 0, small: 0 });
});

test("counter: a pause between sets does not lose the next ones; a short burst faster than 0.6 s per rep is not double counted", async () => {
  const page = await open();
  /* 4 cycles at 0.5 Hz (8 s), 6 s still, 3 cycles at 0.5 Hz (6 s): the still part keeps the same counter → 4 + 3 = 7.
     2 Hz × 10 s = 20 cycles of 0.5 s: at most one rep per 0.6 s → no more than 1 + floor(10 / 0.6) = 17 reps, and never more than the 20 cycles */
  const r = await page.evaluate(`(async () => { const c = repCounter(); let n = 0;
    for (let i = 0; i < 8 * 50; i++) n += c.feed(i / 50, 9.81 + 1.5 * Math.sin(2 * Math.PI * 0.5 * i / 50));
    for (let i = 8 * 50; i < 14 * 50; i++) n += c.feed(i / 50, 9.81);
    for (let i = 14 * 50; i < 20 * 50; i++) n += c.feed(i / 50, 9.81 + 1.5 * Math.sin(2 * Math.PI * 0.5 * (i - 14 * 50) / 50));
    const sim = ${SIM}; return { n, fast: sim({ f: 2, amp: 1.5, secs: 10, rate: 50 }) }; })()`);
  assert.equal(r.n, 7); assert.ok(r.fast <= 17,"at most one rep per 0.6 s: " + r.fast);
});

test("setting: «Push-up counter» is Tap by default, can be Auto or Off, and an unknown value reads as Tap", async () => {
  const page = await open();
  const r = await page.evaluate(() => { const a = PLAYER().pushCount; FIT().player.pushCount = "off"; const b = PLAYER().pushCount; FIT().player.pushCount = "auto"; const c = PLAYER().pushCount; FIT().player.pushCount = "nonsense"; const d = PLAYER().pushCount; return [a, b, c, d]; });
  assert.deepEqual(r, ["tap", "off", "auto", "tap"]);
  const s = await page.evaluate(async () => { FIT().player.pushCount = "tap"; UI.tab = "settings"; UI.setDet = { "Workout player": true }; render(); await new Promise(r => setTimeout(r, 300));
    const sel = document.querySelector('select[data-fit="player.pushCount"]'); return { has: !!sel, opts: sel ? [...sel.options].map(o => o.value) : [], value: sel?.value }; });
  assert.ok(s.has, "the select is in Settings › Workout player"); assert.deepEqual(s.opts, ["tap", "auto", "off"]); assert.equal(s.value, "tap");
});

test("live: a Push-up set has a Count button, a Pull-up set does not; tapping counts from zero and Stop gives the number back to the Reps stepper (one number on screen at a time)", async () => {
  const page = await open(); await begin(page);
  const a = await page.evaluate(() => ({ btn: !!document.querySelector('[data-act="lv-pc"]'), name: document.querySelector(".lv-cur .lv-h")?.innerText, stepper: document.querySelectorAll(".lv-cur .lv-row .stp").length }));
  assert.match(a.name, /Push-up/); assert.ok(a.btn); assert.ok(a.stepper >= 1);
  await page.click('[data-act="lv-pc"]'); await page.waitForTimeout(150);
  const b = await page.evaluate(() => ({ tile: document.querySelector(".pc-tile b")?.innerText, reps: LV().res[LV().cur].ex[0].reps[0], steppersForReps: [...document.querySelectorAll(".lv-cur .lv-row")].filter(r => /Reps/.test(r.innerText) && r.querySelector(".stp")).length }));
  assert.equal(b.tile, "0", "starts from zero, not from the planned 10"); assert.equal(b.reps, 0); assert.equal(b.steppersForReps, 0, "the tile replaces the stepper: the count is not shown twice");
  for (let i = 0; i < 12; i++) await page.click(".pc-tile");
  await page.click('[data-act="lv-rep"][data-d="-1"]'); await page.waitForTimeout(150);   // one tapped too many: 12 − 1 = 11
  assert.equal(await page.evaluate(() => document.querySelector(".pc-tile b").innerText), "11");
  await page.click('[data-act="lv-pc"]'); await page.waitForTimeout(150);                 // Stop
  const c = await page.evaluate(() => ({ tile: !!document.querySelector(".pc-tile"), shown: document.querySelector(".lv-cur .lv-row .stp b")?.innerText, reps: LV().res[LV().cur].ex[0].reps[0], on: PCNT }));
  assert.equal(c.tile, false); assert.equal(c.shown, "11"); assert.equal(c.reps, 11); assert.equal(c.on, null);
  await page.click('[data-act="lv-set-done"]'); await page.waitForTimeout(200);
  assert.equal(await page.evaluate(() => LV().res[0].ex[0].reps[0]), 11, "the counted reps are what the set logs");
  assert.deepEqual(app.errors, []);
});

test("live: Stop with nothing counted keeps the planned reps; the counter stops by itself when the set is done or the workout is left", async () => {
  const page = await open(); await begin(page);
  await page.click('[data-act="lv-pc"]'); await page.waitForTimeout(100); await page.click('[data-act="lv-pc"]'); await page.waitForTimeout(100);
  assert.equal(await page.evaluate(() => LV().res[LV().cur].ex[0].reps[0]), 10, "nothing counted → the planned 10 stays");
  await page.click('[data-act="lv-pc"]'); await page.waitForTimeout(100); await page.click(".pc-tile");
  await page.click('[data-act="lv-set-done"]'); await page.waitForTimeout(250);
  assert.equal(await page.evaluate(() => PCNT), null, "finishing the set ends the count");
});

test("live: Off hides the button; a non push-up exercise never shows it", async () => {
  const page = await open(); await begin(page, "Pull 3x\\n- 6 Pull-up\\n\\nPush 3x\\n- 10 Push-up");
  assert.equal(await page.evaluate(() => !!document.querySelector('[data-act="lv-pc"]')), false, "Pull-up: no counter");
  await page.evaluate(() => { WK().live = null; saveWK(); FIT().player.pushCount = "off"; });
  await begin(page);
  assert.equal(await page.evaluate(() => !!document.querySelector('[data-act="lv-pc"]')), false, "Off: no counter on a Push-up either");
});

test("auto: with a motion sensor the reps are counted from the signal, and a tap still adds one the sensor missed", async () => {
  const page = await open(); await begin(page);
  await page.evaluate(() => { FIT().player.pushCount = "auto"; scheduleRender(); }); await page.waitForTimeout(150);
  await page.click('[data-act="lv-pc"]'); await page.waitForTimeout(200);
  assert.equal(await page.evaluate(() => PCNT.auto), true);
  assert.match(await page.evaluate(() => document.querySelector(".pc-tile small").innerText), /motion/i);
  /* 10 cycles of 0.5 Hz at 50 Hz = 500 events whose timeStamp and acceleration are set by hand → 10 reps */
  await page.evaluate(() => { for (let i = 0; i < 1000; i++) { const ev = new Event("devicemotion"), t = i / 50; Object.defineProperty(ev, "timeStamp", { value: t * 1000 }); ev.accelerationIncludingGravity = { x: 0, y: 0, z: 9.81 + 1.5 * Math.sin(2 * Math.PI * 0.5 * t) }; window.dispatchEvent(ev); } });
  await page.waitForTimeout(250);
  assert.equal(await page.evaluate(() => LV().res[LV().cur].ex[0].reps[0]), 10);
  await page.click(".pc-tile"); await page.waitForTimeout(100);
  assert.equal(await page.evaluate(() => LV().res[LV().cur].ex[0].reps[0]), 11);
  await page.click('[data-act="lv-pc"]'); await page.waitForTimeout(100);
  const after = await page.evaluate(() => { const before = LV().res[LV().cur].ex[0].reps[0]; for (let i = 0; i < 400; i++) { const ev = new Event("devicemotion"); Object.defineProperty(ev, "timeStamp", { value: 30000 + i * 20 }); ev.accelerationIncludingGravity = { x: 0, y: 0, z: 9.81 + 1.5 * Math.sin(2 * Math.PI * 0.5 * i / 50) }; window.dispatchEvent(ev); } return LV().res[LV().cur].ex[0].reps[0] - before; });
  assert.equal(after, 0, "after Stop the sensor is not listened to");
  assert.deepEqual(app.errors, []);
});

test("auto: no sensor, or permission refused, falls back to tap counting and says so", async () => {
  const page = await open(); await begin(page);
  await page.evaluate(() => { FIT().player.pushCount = "auto"; scheduleRender(); }); await page.waitForTimeout(150);
  await page.evaluate(() => { window.__dme = window.DeviceMotionEvent; window.DeviceMotionEvent = function () {}; window.DeviceMotionEvent.requestPermission = async () => "denied"; });
  await page.click('[data-act="lv-pc"]'); await page.waitForTimeout(250);
  const a = await page.evaluate(() => ({ auto: PCNT.auto, toast: document.querySelector("#toast")?.innerText || "", tile: !!document.querySelector(".pc-tile") }));
  assert.equal(a.auto, false); assert.match(a.toast, /tap/i); assert.ok(a.tile);
  await page.click(".pc-tile"); assert.equal(await page.evaluate(() => LV().res[LV().cur].ex[0].reps[0]), 1);
  await page.click('[data-act="lv-pc"]'); await page.waitForTimeout(100);
  await page.evaluate(() => { delete window.DeviceMotionEvent; });
  await page.click('[data-act="lv-pc"]'); await page.waitForTimeout(250);
  assert.equal(await page.evaluate(() => PCNT.auto), false, "no DeviceMotionEvent at all → tap");
  assert.deepEqual(app.errors, []);
});

test("spike page: lists what the browser offers, records labelled sets from raw motion samples and gives the log back as CSV (stubbed sensors, no real device)", async () => {
  const built = path.join(dir, "pushup-test.html"); assert.ok(fs.existsSync(built), "the build copies the page");
  const { chromium } = H.loadPlaywright(), br = await chromium.launch(), pg = await br.newPage(), errs = []; pg.on("pageerror", e => errs.push(String(e)));
  await pg.goto("file://" + built);
  const sup = await pg.textContent("#sup"); assert.match(sup, /Motion events/); assert.match(sup, /Proximity/);
  await pg.click("#go"); await pg.waitForTimeout(100);
  await pg.evaluate(() => { for (let i = 0; i < 100; i++) { const ev = new Event("devicemotion"); ev.accelerationIncludingGravity = { x: 0.1, y: 0.2, z: 9.8 + Math.sin(i / 8) }; ev.interval = 20; window.dispatchEvent(ev); } });
  await pg.fill("#reps", "10"); await pg.click("#mark"); await pg.waitForTimeout(100);
  const csv = await pg.inputValue("#log");
  const lines = csv.trim().split("\n"); assert.equal(lines[0], "t_ms,ax,ay,az,label");
  assert.ok(lines.length >= 101, "100 samples and the label row: " + lines.length); assert.match(lines[lines.length - 1], /,reps=10$/);
  assert.deepEqual(errs, []); await br.close();
});

test("sports: distance is metres for swimming and km elsewhere, in the label and in the Add workout sheet; the metres typed are stored as km", async () => {
  const page = await open();
  const r = await page.evaluate(() => ({ swim: sessionLabel({ sport: "Swimming", min: 45, km: 1.5, int: "Moderate" }), sw8: distText({ sport: "Swimming (pool)", km: 0.8 }), sea: distText({ sport: "Open-water swim", km: 2.25 }),
    foot: sessionLabel({ sport: "Football", min: 60, km: 0.8, int: "Hard" }), run: distText({ sport: "Running", km: 10.04 }), none: distText({ sport: "Swimming" }), zero: distText({ sport: "Running", km: 0 }) }));
  /* 1.5 km = 1500 m; 0.8 km = 800 m (0.8·1000 = 800.0000000000001 is rounded); 2.25 km = 2250 m; a football match keeps km (0.8 km); 10.04 km → 10.0 km */
  assert.equal(r.swim, "Swimming 45′ 1500 m · Moderate"); assert.equal(r.sw8, "800 m"); assert.equal(r.sea, "2250 m"); assert.equal(r.foot, "Football 60′ 0.8 km · Hard"); assert.equal(r.run, "10 km"); assert.equal(r.none, ""); assert.equal(r.zero, "");
  const s = await page.evaluate(async () => { FIT().sports.push({ name: "Swimming", met: 6 }); openSheet("session", { list: "workouts", date: todayISO(), idx: null, draft: { sport: "Swimming", min: "30", km: "1.5", int: "Moderate" }, back: null }); await new Promise(r => setTimeout(r, 250));
    const m = document.querySelector("#ss-m"), lab = document.querySelector('label[for="ss-m"]')?.innerText, km = document.querySelector("#ss-km");
    const before = m?.value; INP.ss("2000", { dataset: { k: "m" } }); const stored = UI.sheet.draft.km; return { has: !!m, lab, km: !!km, before, stored, est: document.querySelector("#ss-est")?.innerText || "" }; });
  assert.ok(s.has); assert.match(s.lab, /Metres/); assert.equal(s.km, false, "no Km field next to Metres"); assert.equal(s.before, "1500"); assert.equal(+s.stored, 2); assert.doesNotMatch(s.est, /NaN/);
  const t = await page.evaluate(async () => { INP.ss; ACT["ss-sport"]({ dataset: { k: "Running" } }); await new Promise(r => setTimeout(r, 150)); return { m: !!document.querySelector("#ss-m"), km: !!document.querySelector("#ss-km") }; });
  assert.deepEqual(t, { m: false, km: true }, "back to a run: Km again");
});

test("sports: futsal and other team sports, swimming and any sport imported without a row in the sport table never give NaN anywhere", async () => {
  const page = await open();
  const r = await page.evaluate(() => {
    const fit = FIT(), names = ["Futsal", "Swimming", "Open-water swim", "Padel", "Yoga", "Other", "Football", "Walking"], out = {};
    for (const sp of names) for (const w of [{ sport: sp, min: 60, int: "Moderate" }, { sport: sp, min: 45, km: 1.2, hr: 150, int: "Hard" }, { sport: sp, km: 2 }, { sport: sp, min: 30, kcal: 250 }, { sport: sp }]) {
      const k = sessionKcal(w, todayISO()), L = sessionLabel(w); (out[sp] = out[sp] || []).push([Number.isFinite(k.kcal), !/NaN|undefined|Infinity/.test(L), !/NaN|undefined|Infinity/.test(distText(w))]); }
    return { out, team: ["Futsal", "Calcio a 5", "Football", "Soccer (indoor)", "Running", "Swimming"].map(isTeamSport), swim: ["Swimming", "Open-water swim", "Nuoto", "Running", "Rowing"].map(isSwimSport),
      icu: [icuSport("Soccer"), icuSport("Swim"), icuSport("OpenWaterSwim")], icu2: (() => { fit.sports = [{ name: "Futsal", met: 7 }, { name: "Swimming (pool)", met: 6 }, { name: "Other", met: 5 }]; return [icuSport("Soccer"), icuSport("Swim"), icuSport("OpenWaterSwim"), icuSport("Yoga")]; })() };
  });
  for (const [sp, rows] of Object.entries(r.out)) for (const x of rows) assert.deepEqual(x, [true, true, true], sp);
  assert.deepEqual(r.team, [true, true, true, true, false, false]); assert.deepEqual(r.swim, [true, true, true, false, false]);
  assert.deepEqual(r.icu, ["Football", "Swimming", "Swimming"]);
  assert.deepEqual(r.icu2, ["Futsal", "Swimming (pool)", "Swimming (pool)", "Other"], "the imported sport lands on the team or swim sport the user named");
});
