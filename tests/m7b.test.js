/* M7b-1 (formulas approved by the owner on 26/10): calibration v2 (F-06 / D8), energy warnings (F-07 / D11), algorithm version and activation date (F-11 / D17).
   Synthetic data only. Expected values are worked out by hand in the comments, not copied from the app's output. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let app;
test.before(async () => { app = await H.startApp({ dir: H.build(H.tmp("m7b-build")), seed: F.seed({ withPlan: false }) }); });
test.after(async () => { await app?.close(); });
const ev = (f, a) => app.page.evaluate(f, a);
const profile = () => ev(() => { const t = todayISO(); Object.assign(FIT().profile, { sex: "Male", height: 180, startWeight: 80, bf: null, dob: addDays(t, -Math.round(30.4 * 365.25)) }); S.logm = {}; DATA_V++; });
/* a log of N days ending today: weight(i) and a constant intake; mode picks the calibration, from = activation date of v2 ("" = from the first day) */
const run = (o) => ev(o => {
  const t = todayISO(), start = addDays(t, -o.days); S.logm = {}; FIT().energy.calMode = o.mode; FIT().energy.calManual = o.manual ?? null; FIT().energy.calV2From = o.from == null ? "" : o.from === "future" ? addDays(t, 10) : o.from;
  let seed = 12345; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296, gauss = () => { let s = 0; for (let i = 0; i < 12; i++) s += rnd(); return s - 6; };
  FIT().trackStart = start; FIT().phases = [{ start, phase: "Maintenance", kcal: 0 }]; DATA_V++;
  const I = o.intake || Math.round(energyAt(addDays(start, 1)).tdeeW);
  for (let i = 0; i <= o.days; i++) { const d = addDays(start, i), m = d.slice(0, 7); S.logm[m] = S.logm[m] || { days: {} };
    const w = 80 + (o.slope || 0) * i + gauss() * (o.sd || 0), L = { kcal: o.noIntake && i % 2 ? 0 : I, p: 150, c: 250, f: 80 }; if (!(o.weighEvery && i % o.weighEvery)) L.weight = +w.toFixed(2); S.logm[m].days[d] = L; }
  DATA_V++; const s = energySeries(), rows = []; for (let i = 0; i <= o.days; i++) rows.push(s.rows[addDays(start, i)]);
  return { se: rows.map(r => r.tdeeSE), f: rows.map(r => r.factor), tg: rows.map(r => r.target), tdeeW: rows.map(r => r.tdeeW), rel: rows.map(r => r.calRel || null), I };
}, o);
const range = (a, from) => { const x = a.slice(from); return Math.max(...x) - Math.min(...x); };

test("v2 keeps the factor and the target steady under ordinary weight noise, where the legacy calibration swings (same person, same intake, 0.4 kg noise)", async () => {
  await profile();
  const legacy = await run({ days: 60, sd: 0.4, mode: "legacy" }), v2 = await run({ days: 60, sd: 0.4, mode: "v2" });
  assert.ok(range(legacy.f, 20) > 0.15, "legacy swing " + range(legacy.f, 20));
  assert.ok(range(v2.f, 20) < 0.1 && range(v2.f, 20) < range(legacy.f, 20) * 0.6, "v2 factor range " + range(v2.f, 20));
  assert.ok(range(v2.tg, 20) < 200 && range(v2.tg, 20) < range(legacy.tg, 20) * 0.6, `v2 target range ${range(v2.tg, 20)} vs legacy ${range(legacy.tg, 20)}`);
});

test("v2 converges on the true factor: eating the modelled TDEE while the weight rises as if the real TDEE were 90 % of it gives a factor near 0.90", async () => {
  await profile();
  // I = T0 and the real TDEE is 0.9 T0, so the surplus is 0.1 T0 a day and the slope is 0.1 T0 / 7000 kg/day (T0 about 2300: 0.033 kg/day)
  const base = await run({ days: 10, mode: "v2" }); const slope = 0.1 * base.I / 7000;
  const r = await run({ days: 90, mode: "v2", slope, intake: base.I });
  const last = r.f[r.f.length - 1];
  assert.ok(Math.abs(last - 0.9) < 0.02, "factor " + last);   // the modelled TDEE rises about 0.4 % with the 3 kg gained, hence the tolerance
});

test("v2 moves the factor by at most calWeekKcal / 7 kcal a day, up to twice that with clean data (a step of 100 * (1 + w) / 7 / TDEE)", async () => {
  await profile();
  const base = await run({ days: 10, mode: "v2" }), r = await run({ days: 90, mode: "v2", slope: 0.1 * base.I / 7000, intake: base.I });
  let worst = 0; for (let i = 1; i < r.f.length; i++) worst = Math.max(worst, Math.abs(r.f[i] - r.f[i - 1]) * r.tdeeW[i] * 7);
  assert.ok(worst <= 200 + 1e-6, "weekly kcal step " + worst);
  assert.ok(worst > 150, "clean data: faster than the plain 100 (" + worst + ")");
});

test("v2 does nothing without enough data: under 21 days of log, under 8 weigh-ins, or intake typed on under 70 % of the days, the factor stays 1", async () => {
  await profile();
  const slope = 0.05;
  for (const o of [{ days: 15 }, { days: 40, weighEvery: 7 }, { days: 40, noIntake: true }]) {
    const r = await run({ ...o, mode: "v2", slope }); assert.ok(r.f.every(x => x === 1), JSON.stringify(o) + " -> " + range(r.f, 0));
    assert.ok(r.rel.every(x => x === null));
  }
});

test("the legacy calibration is still there and unchanged (calMode legacy), and v2 only starts on its activation date: days before it keep their legacy factor", async () => {
  await profile();
  const legacy = await run({ days: 60, sd: 0.4, mode: "legacy" }), mixed = await run({ days: 60, sd: 0.4, mode: "v2", from: "future" });
  // activation 10 days after today: every day up to today is legacy
  assert.deepEqual(mixed.f, legacy.f);
});

test("reliability is reported with the factor (high / medium / low) from the slope's uncertainty", async () => {
  await profile();
  const calm = await run({ days: 60, mode: "v2", sd: 0.05 }), noisy = await run({ days: 60, mode: "v2", sd: 1.5 });
  // slope error = sd / sqrt(Sxx), Sxx = n (n^2 - 1) / 12 = 28 * 783 / 12 = 1827 for 28 days: 0.05 kg gives u = 0.0012 * 7000 / 2300 = 0.004 (high); 1.5 kg gives u = 0.035 * 7000 / 2300 = 0.1 (low)
  assert.equal(calm.rel[calm.rel.length - 1], "high"); assert.equal(noisy.rel[noisy.rel.length - 1], "low");
});

test("energy warnings (F-07): carbs under the minimum, protein + fat beyond the target, target under the resting energy; nothing is corrected silently", async () => {
  await profile();
  const r = await ev(() => { const t = todayISO(), out = {}; FIT().energy.calMode = "v2"; S.logm = {};
    const at = (k, ph = "Cut") => { FIT().phases = [{ start: addDays(t, -5), phase: ph, kcal: k }]; DATA_V++; const x = energyAt(t); return { w: energyWarnings(x).map(w => w.id), target: Math.round(x.target), c: Math.round(x.c) }; };
    out.maint = (FIT().phases = [{ start: addDays(t, -5), phase: "Maintenance", kcal: 0 }], DATA_V++, energyWarnings(energyAt(t)).map(w => w.id));
    out.bulk = at(300, "Bulk").w;
    out.mild = at(-500); out.harsh = at(-1500); out.absurd = at(-2200); FIT().phases = [{ start: t, phase: "Maintenance", kcal: 0 }]; DATA_V++; return out; });
  // 80 kg, TDEE about 2310 (BMR 1780): maintenance: protein 144 g + fat 64 g = 1152 kcal, carbs (2310 - 1152) / 4 = 289 g = 3.6 g/kg, under the 4.0 minimum of that phase; bulk +300 -> 2610, protein 128 g + fat 64 g = 1088 kcal, carbs 380 g = 4.75 g/kg: none; -500 -> 1810 kcal, protein 160 g + fat 64 g = 1216 kcal, carbs 148 g = 1.86 g/kg < 2.0; -1500 -> 810 kcal (protein + fat 1216 > 810, and 810 < BMR 1780); -2200 -> 110 kcal
  assert.deepEqual(r.maint, ["carbs"]); assert.deepEqual(r.bulk, []);
  assert.deepEqual(r.mild.w, ["carbs"]);
  assert.deepEqual(r.harsh.w, ["conflict", "floor"]); assert.equal(r.harsh.c, 0);
  assert.deepEqual(r.absurd.w, ["conflict", "floor"]); assert.ok(r.absurd.target < 200);
});

test("algorithm version (F-11): a saved profile from before gets the fixed v2 start date (never today: a sync or a second device can't move it), kept dates stay, a new profile starts v2 from the first day", async () => {
  const r = await ev(() => {
    const a = normalizeSettings({ fit: { energy: { bmr: "Mifflin-St Jeor", calLo: 0.75 } } }).fit.energy, again = normalizeSettings(normalizeSettings({ fit: { energy: { calLo: 0.75 } } })).fit.energy,
      kept = normalizeSettings({ fit: { energy: { calV2From: "2026-01-01" } } }).fit.energy, fresh = normalizeSettings({}).fit.energy, noEnergy = normalizeSettings({ fit: { profile: { sex: "Male" } } }).fit.energy;
    return { a: a.calV2From, mode: a.calMode, again: again.calV2From, kept: kept.calV2From, fresh: fresh.calV2From, noEnergy: noEnergy.calV2From, warn: a.warn }; });
  assert.deepEqual(r, { a: "2026-10-25", mode: "v2", again: "2026-10-25", kept: "2026-01-01", fresh: "", noEnergy: "2026-10-25", warn: "on" });
  const n = await ev(() => { const a = normalizeSettings({ fit: { energy: { bmr: "x" } } }).fit.energy, f = normalizeSettings({}).fit.energy; return { a: [a.netKcal, a.netFrom, a.hrLearn, a.hrFrom], f: [f.netKcal, f.netFrom, f.hrLearn, f.hrFrom] }; });
  assert.deepEqual(n, { a: ["on", "2026-10-25", "on", "2026-10-25"], f: ["on", "", "on", ""] });
  const m = await ev(() => { const a = normalizeSettings({ fit: { energy: { bmr: "x" } } }).fit.energy, f = normalizeSettings({}).fit.energy; return { a: [a.neatMode, a.neatFrom, a.neatRefSteps], f: [f.neatMode, f.neatFrom, f.neatRefSteps] }; });
  assert.deepEqual(m, { a: ["on", "2026-10-25", 7000], f: ["on", "", 7000] });
});

test("switching from legacy to v2 in the middle of a series moves the factor by no more than one step at the boundary", async () => {
  await profile();
  const t = await ev(() => todayISO()), d0 = await ev(() => addDays(todayISO(), -30));
  const base = await run({ days: 10, mode: "v2" }), r = await run({ days: 60, mode: "v2", from: d0, sd: 0.4, slope: 0.1 * base.I / 7000, intake: base.I });
  const i = 30;   // the day v2 starts: index 60 - 30
  let worst = 0; for (let k = i; k < i + 5; k++) worst = Math.max(worst, Math.abs(r.f[k] - r.f[k - 1]) * r.tdeeW[k] * 7);
  assert.ok(worst <= 200 + 1e-6, "weekly kcal step at the boundary " + worst);
});

test("warnings can be switched off, and an empty weekly limit falls back to 100 kcal instead of freezing the factor", async () => {
  await profile();
  const r = await ev(() => { const t = todayISO(); FIT().phases = [{ start: addDays(t, -5), phase: "Cut", kcal: -1500 }]; DATA_V++; const on = energyWarnings(energyAt(t)).length; FIT().energy.warn = "off"; const off = energyWarnings(energyAt(t)).length; FIT().energy.warn = "on"; FIT().phases = [{ start: t, phase: "Maintenance", kcal: 0 }]; DATA_V++; return { on, off }; });
  assert.deepEqual(r, { on: 2, off: 0 });
  const base = await run({ days: 10, mode: "v2" });
  await ev(() => { FIT().energy.calWeekKcal = null; });
  const z = await run({ days: 90, mode: "v2", slope: 0.1 * base.I / 7000, intake: base.I }); await ev(() => { FIT().energy.calWeekKcal = 100; });
  assert.ok(Math.abs(z.f[z.f.length - 1] - 1) > 0.05, "the factor still moves with the limit emptied");
});

/* D5b (approved 26/10): the kcal a sensor reports are gross when its device says so; the energy model wants them net of resting energy, which the BMR already holds.
   80 kg, 180 cm, 30 y male: BMR 1780 kcal/day = 1.2361 kcal/min, so a 60-minute session of 600 kcal is 600 - 74.17 = 525.83 net (526). */
const sess = (extra = {}) => ({ sport: "Running", min: 60, kcal: 600, src: "intervals", ext: "icu-a-1", ...extra });
const kcalOf = (w, o = {}) => ev(([w, o]) => { const E = FIT().energy; Object.assign(E, { netKcal: "on", netFrom: "" }, o.energy || {}); if (o.devKcal) FIT().devices.find(x => x.id === (o.dev || "polar")).kcal = o.devKcal; DATA_V++; const r = sessionKcal(w, o.date || todayISO(), 80); FIT().devices.forEach(x => { x.kcal = "gross"; }); return r; }, [w, o]);

test("D5b: a device session whose sensor reports gross kcal counts net of resting energy (600 kcal in 60 min -> 526)", async () => {
  await profile();
  assert.deepEqual(await kcalOf(sess()), { kcal: 526, how: "device" });
});
test("D5b: net or unknown sensors, typed values, the off switch and days before the start date are used as they are", async () => {
  await profile();
  assert.equal((await kcalOf(sess(), { devKcal: "net" })).kcal, 600);
  assert.equal((await kcalOf(sess(), { devKcal: "unknown" })).kcal, 600);
  assert.equal((await kcalOf(sess({ src: undefined, ext: undefined }))).kcal, 600);          // typed by hand, not from a device
  assert.equal((await kcalOf(sess(), { energy: { netKcal: "off" } })).kcal, 600);
  assert.equal((await kcalOf(sess(), { energy: { netFrom: "2999-01-01" } })).kcal, 600);
  assert.equal((await kcalOf(sess(), { energy: { netFrom: "2000-01-01" } })).kcal, 526);
});
test("D5b: the rates learned from device sessions are net too, so a planned session is not counted twice (10 kcal/min gross -> 8.76 net)", async () => {
  await profile();
  const r = await ev(() => { const t = todayISO(); S.logm = {}; for (let i = 1; i <= 5; i++) { const d = addDays(t, -i), m = d.slice(0, 7); S.logm[m] = S.logm[m] || { days: {} }; S.logm[m].days[d] = { workouts: [{ sport: "Running", min: 60, kcal: 600, src: "intervals", ext: "icu-a-" + i, int: "Moderate" }] }; }
    const out = {}; for (const v of ["on", "off"]) { FIT().energy.netKcal = v; FIT().energy.netFrom = ""; DATA_V++; out[v] = learnedRates().Running.Moderate; } FIT().energy.netKcal = "on"; S.logm = {}; DATA_V++; return out; });
  near(r.off, 10, 0.001); near(r.on, 10 - 1780 / 1440, 0.01);   // each session is rounded to whole kcal (526), hence 0.01
});
function near(a, b, e) { assert.ok(Math.abs(a - b) <= e, `${a} vs ${b}`); }

/* D20 (approved 26/10): the heart-rate-to-kcal factor of each sensor, learned from your own sessions that have both a heart rate and a real kcal figure.
   Keytel, male 80 kg, 30 y, 150 bpm: (-55.0969 + 0.6309 * 150 + 0.1988 * 80 + 0.2017 * 30) / 4.184 = 14.6967 kcal/min, 881.80 in 60 min.
   8 sessions of 60 min and 440 kcal (sensor counts net): ratio 440 / 881.80 = 0.49898. Pulled toward the global 0.794 with a weight of 6 sessions: (8 * 0.49898 + 6 * 0.794) / 14 = 0.62542.
   A 30-minute session with heart rate and no kcal: 14.6967 * 0.62542 * 30 = 275.7 -> 276 on that sensor; 14.6967 * 0.794 * 30 = 350.1 -> 350 on a sensor without history. */
const hrSetup = n => ev(n => { const t = todayISO(); S.logm = {}; FIT().energy.hrLearn = "on"; FIT().energy.hrFrom = ""; FIT().devices.find(x => x.id === "zepp").kcal = "net"; FIT().devices.find(x => x.id === "polar").kcal = "net";
  for (let i = 1; i <= n; i++) { const d = addDays(t, -i), m = d.slice(0, 7); S.logm[m] = S.logm[m] || { days: {} }; S.logm[m].days[d] = { workouts: [{ sport: "Cycling", min: 60, hr: 150, kcal: 440, src: "intervals", ext: "icu-a-" + i, dev: "zepp" }] }; } DATA_V++; }, n);
const hrKcal = (dev, o = {}) => ev(([dev, o]) => { Object.assign(FIT().energy, o); DATA_V++; return sessionKcal({ sport: "Cycling", min: 30, hr: 150, dev }, todayISO(), 80); }, [dev, o]);
test("D20: a sensor with 6+ sessions of its own gets its learned heart-rate factor (0.625), a sensor without history keeps the global one (0.794)", async () => {
  await profile(); await hrSetup(8);
  assert.deepEqual(await hrKcal("zepp"), { kcal: 276, how: "hr" });
  assert.deepEqual(await hrKcal("polar"), { kcal: 350, how: "hr" });
});
test("D20: strength sessions do not teach the factor (6 cycling at 0.499 and 6 strength at 0.34 give (6 * 0.49898 + 6 * 0.794) / 12 = 0.6465 -> 285 kcal, not the 0.42 of a mixed median)", async () => {
  await profile(); await hrSetup(6);
  await ev(() => { const t = todayISO(); for (let i = 1; i <= 6; i++) { const d = addDays(t, -i - 10), m = d.slice(0, 7); S.logm[m] = S.logm[m] || { days: {} }; S.logm[m].days[d] = { workouts: [{ sport: "Strength training", min: 60, hr: 150, kcal: 300, src: "intervals", ext: "icu-s-" + i, dev: "zepp" }] }; } DATA_V++; });
  assert.equal((await hrKcal("zepp")).kcal, 285);
});
test("D20: fewer than 6 sessions, the switch off, and days before hrFrom leave the global factor in use", async () => {
  await profile(); await hrSetup(5);
  assert.equal((await hrKcal("zepp")).kcal, 350);
  await hrSetup(8);
  assert.equal((await hrKcal("zepp", { hrLearn: "off" })).kcal, 350);
  assert.equal((await hrKcal("zepp", { hrLearn: "on", hrFrom: "2999-01-01" })).kcal, 350);
  assert.equal((await hrKcal("zepp", { hrFrom: "" })).kcal, 276);
});

/* D18 (approved 26/10): NEAT from the steps when no watch figure taught the app your usual extra movement. The default NEAT (350 kcal) stands for a day of 7000 steps (an assumption, set in Settings);
   a step costs 0.606101 kcal/kg/km (Ludlow & Weyand 2016, 1.3 m/s, 1.8 m) at a stride of 0.415 x height. 80 kg, 180 cm: stride 0.747 m; 2000 steps = 1.494 km -> 48.4881 * 1.494 = 72.44 kcal; 7000 steps -> 253.53; 14000 -> 507.07.
   Base = 350 - 253.53 = 96.47: 2000 steps -> 168.91, 7000 -> 350, 14000 -> 603.54. */
const stepsDay = o => ev(o => { const t = todayISO(), d0 = addDays(t, -18); S.logm = {}; Object.assign(FIT().energy, { neatMode: "on", neatFrom: "", neatRefSteps: 7000, neat: 350, watchMode: "active" }, o.energy || {}); FIT().trackStart = d0; FIT().phases = [{ start: d0, phase: "Maintenance", kcal: 0 }];
  for (let i = 0; i <= 18; i++) { const d = addDays(d0, i), m = d.slice(0, 7); S.logm[m] = S.logm[m] || { days: {} }; const L = { steps: o.steps }; if (o.watch) L.watch = o.watch; if (o.walk && i === 17) L.workouts = [{ sport: "Walking", min: 30, km: 2 }]; S.logm[m].days[d] = L; }
  if (o.last != null) { const d = addDays(t, -1), m = d.slice(0, 7); S.logm[m].days[d].steps = o.last; delete S.logm[m].days[d].watch; }
  DATA_V++; const r = energyAt(addDays(t, -1)); return { neat: r.neat, src: r.neatSrc, bmr: r.bmr, tdeeW: r.tdeeW }; }, o);
test("D18: without any watch figure the NEAT follows the steps: 2000 steps -> 168.9, 7000 -> 350, 14000 -> 603.5 (and the TDEE of a 2000-step day is (1780 + 168.9) * 1.1 = 2143.8)", async () => {
  await profile();
  const a = await stepsDay({ steps: 2000 }), b = await stepsDay({ steps: 7000 }), c = await stepsDay({ steps: 14000 });
  near(a.neat, 168.91, 0.1); near(b.neat, 350, 0.1); near(c.neat, 603.54, 0.1); assert.equal(a.src, "stepsRef");
  near(a.tdeeW, (1780 + 168.91) * 1.1, 0.2);
});
test("D18: off switch, a start date in the future, a walk that day, or no steps leave the old NEAT (the 350 default); a base learned from your watch figures still wins (582.7 = 72.44 + 510.24)", async () => {
  await profile();
  assert.equal((await stepsDay({ steps: 2000, energy: { neatMode: "off" } })).neat, 350);
  assert.equal((await stepsDay({ steps: 2000, energy: { neatFrom: "2999-01-01" } })).neat, 350);
  assert.equal((await stepsDay({ steps: 2000, walk: true })).src, "avg");
  assert.equal((await stepsDay({ steps: 0 })).src, "avg");
  // 17 days with a watch figure of 800 and 8000 steps (STEP 289.76): base = 510.24; a last day of 2000 steps -> 72.44 + 510.24
  const w = await stepsDay({ steps: 8000, watch: 800, last: 2000 }); near(w.neat, 582.68, 0.1); assert.equal(w.src, "steps");
});
test("D18: today's steps are a projection: steps so far + the typical steps of the rest of the day (waking day 7-22 h); late evening or no history = the steps as they are", async () => {
  const r = await ev(() => ({ a: stepsProjected(2000, 10, 8000), b: stepsProjected(2000, 22, 8000), c: stepsProjected(2000, 10, null), d: stepsProjected(2000, 6, 8000), e: stepsProjected(2000, 15, 9000) }));
  assert.deepEqual([r.a, r.b, r.c, r.d], [8400, 2000, 2000, 10000]);
  near(r.e, 2000 + 9000 * (1 - 8 / 15), 1e-9);   // 15 h: (15 - 7) / 15 of the waking day has gone
});

/* The daily "active kcal" of a smartwatch leaves out resting energy, so the part of it that belongs to a workout is the workout's net figure: NEAT = daily active kcal - the session net of rest (same device, same basis).
   80 kg, 180 cm, 30 y male, BMR 1780 = 1.2361 kcal/min: a 60-minute Polar session of 600 kcal (gross) is 526 net; with 1000 active kcal that day, NEAT = 1000 - 526 = 474 (it was 400 when the gross 600 was taken off). */
const watchDay = o => ev(o => { const t = todayISO(), d = addDays(t, -1), m = d.slice(0, 7); S.logm = {}; Object.assign(FIT().energy, { watchMode: o.mode || "active", netKcal: o.net || "on", netFrom: "", neatMode: "on", minWatchNeat: 150 }); FIT().devices.find(x => x.id === "polar").kcal = o.dev || "gross"; FIT().trackStart = addDays(t, -3);
  S.logm[m] = S.logm[m] || { days: {} }; S.logm[m].days[d] = { watch: o.watch, workouts: [{ sport: "Running", min: 60, kcal: 600, src: "intervals", ext: "icu-a-1" }] }; DATA_V++; const r = energyAt(d); FIT().devices.find(x => x.id === "polar").kcal = "gross"; return { neat: r.neat, src: r.neatSrc, eat: r.eat }; }, o);
test("daily watch AEE: NEAT = active kcal minus the workout NET of rest when the sensor counts rest (1000 - 526 = 474), the gross value when it does not (net sensor, switch off), and total mode keeps BMR + gross", async () => {
  await profile();
  const a = await watchDay({ watch: 1000 }); assert.equal(a.neat, 474); assert.equal(a.src, "watch"); assert.equal(a.eat, 526);
  assert.equal((await watchDay({ watch: 1000, dev: "net" })).neat, 400);
  assert.equal((await watchDay({ watch: 1000, net: "off" })).neat, 400);
  assert.equal((await watchDay({ watch: 2600, mode: "total" })).neat, 2600 - 1780 - 600);   // total mode: the watch total holds the BMR and the gross session
});

test("calibration controls: a manual factor holds every day (0.9) and nothing is learned; Off keeps 1 whatever the data say", async () => {
  await profile();
  const base = await run({ days: 10, mode: "v2" }), drift = { days: 60, slope: 0.1 * base.I / 7000, intake: base.I };
  const man = await run({ ...drift, mode: "v2", manual: 0.9 }); assert.ok(man.f.every(x => x === 0.9)); assert.ok(man.se.every(x => x == null));
  const off = await run({ ...drift, mode: "off" }); assert.ok(off.f.every(x => x === 1));
  const auto = await run({ ...drift, mode: "v2" }); assert.ok(Math.abs(auto.f[auto.f.length - 1] - 0.9) < 0.02, "it learns by itself: " + auto.f[auto.f.length - 1]);
});
test("the TDEE comes with its statistical uncertainty (posterior sd = tau u / sqrt(tau^2 + u^2) of the factor, times the TDEE): about 62 kcal with 0.4 kg of daily weight noise, none without enough data", async () => {
  await profile();
  // 28 days, slope error = 0.4 / sqrt(1827) = 0.0094 kg/day, u = 0.0094 * 7000 / 2343 = 0.028; tau = 0.08: sd = 0.0022 / 0.0848 = 0.0264; * 2343 = 62
  const n = await run({ days: 60, sd: 0.4, mode: "v2" }); const se = n.se[n.se.length - 1]; assert.ok(se > 35 && se < 100, "se " + se);
  const few = await run({ days: 15, mode: "v2" }); assert.ok(few.se.every(x => x == null));
  const b = await ev(() => ({ a: tdeeBasis({ sess: { src: "logged", list: [{ sport: "Running" }] }, neatSrc: "stepsRef" }), b: tdeeBasis({ sess: { src: "dated", list: [{ sport: "Running" }] }, neatSrc: "stepsRefProj" }), c: tdeeBasis({ sess: { src: "none", list: [] }, neatSrc: "default" }) }));
  assert.deepEqual(b, { a: "training logged · full-day steps", b: "planned training · steps so far plus a typical rest of the day", c: "no training · the default NEAT" });
});

test("the app starts without errors after these changes", async () => { assert.deepEqual(app.errors, []); });
