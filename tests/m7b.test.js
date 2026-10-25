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
  const t = todayISO(), start = addDays(t, -o.days); S.logm = {}; FIT().energy.calMode = o.mode; FIT().energy.calV2From = o.from == null ? "" : o.from === "future" ? addDays(t, 10) : o.from;
  let seed = 12345; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296, gauss = () => { let s = 0; for (let i = 0; i < 12; i++) s += rnd(); return s - 6; };
  FIT().trackStart = start; FIT().phases = [{ start, phase: "Maintenance", kcal: 0 }]; DATA_V++;
  const I = o.intake || Math.round(energyAt(addDays(start, 1)).tdeeW);
  for (let i = 0; i <= o.days; i++) { const d = addDays(start, i), m = d.slice(0, 7); S.logm[m] = S.logm[m] || { days: {} };
    const w = 80 + (o.slope || 0) * i + gauss() * (o.sd || 0), L = { kcal: o.noIntake && i % 2 ? 0 : I, p: 150, c: 250, f: 80 }; if (!(o.weighEvery && i % o.weighEvery)) L.weight = +w.toFixed(2); S.logm[m].days[d] = L; }
  DATA_V++; const s = energySeries(), rows = []; for (let i = 0; i <= o.days; i++) rows.push(s.rows[addDays(start, i)]);
  return { f: rows.map(r => r.factor), tg: rows.map(r => r.target), tdeeW: rows.map(r => r.tdeeW), rel: rows.map(r => r.calRel || null), I };
}, o);
const range = (a, from) => { const x = a.slice(from); return Math.max(...x) - Math.min(...x); };

test("v2 keeps the factor and the target steady under ordinary weight noise, where the legacy calibration swings (same person, same intake, 0.4 kg noise)", async () => {
  await profile();
  const legacy = await run({ days: 60, sd: 0.4, mode: "legacy" }), v2 = await run({ days: 60, sd: 0.4, mode: "v2" });
  assert.ok(range(legacy.f, 20) > 0.15, "legacy swing " + range(legacy.f, 20));
  assert.ok(range(v2.f, 20) < 0.08, "v2 factor range " + range(v2.f, 20));
  assert.ok(range(v2.tg, 20) < 200 && range(v2.tg, 20) < range(legacy.tg, 20) / 2, `v2 target range ${range(v2.tg, 20)} vs legacy ${range(legacy.tg, 20)}`);
});

test("v2 converges on the true factor: eating the modelled TDEE while the weight rises as if the real TDEE were 90 % of it gives a factor near 0.90", async () => {
  await profile();
  // I = T0 and the real TDEE is 0.9 T0, so the surplus is 0.1 T0 a day and the slope is 0.1 T0 / 7000 kg/day (T0 about 2300: 0.033 kg/day)
  const base = await run({ days: 10, mode: "v2" }); const slope = 0.1 * base.I / 7000;
  const r = await run({ days: 90, mode: "v2", slope, intake: base.I });
  const last = r.f[r.f.length - 1];
  assert.ok(Math.abs(last - 0.9) < 0.02, "factor " + last);   // the modelled TDEE rises about 0.4 % with the 3 kg gained, hence the tolerance
});

test("v2 moves the factor by at most calWeekKcal / 7 kcal a day (a step of 100 / 7 / TDEE, about 0.006)", async () => {
  await profile();
  const base = await run({ days: 10, mode: "v2" }), r = await run({ days: 90, mode: "v2", slope: 0.1 * base.I / 7000, intake: base.I });
  let worst = 0; for (let i = 1; i < r.f.length; i++) worst = Math.max(worst, Math.abs(r.f[i] - r.f[i - 1]) * r.tdeeW[i] * 7);
  assert.ok(worst <= 100 + 1e-6, "weekly kcal step " + worst);
  assert.ok(worst > 50, "the factor does move (" + worst + ")");
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
});

test("switching from legacy to v2 in the middle of a series moves the factor by no more than one step at the boundary", async () => {
  await profile();
  const t = await ev(() => todayISO()), d0 = await ev(() => addDays(todayISO(), -30));
  const base = await run({ days: 10, mode: "v2" }), r = await run({ days: 60, mode: "v2", from: d0, sd: 0.4, slope: 0.1 * base.I / 7000, intake: base.I });
  const i = 30;   // the day v2 starts: index 60 - 30
  let worst = 0; for (let k = i; k < i + 5; k++) worst = Math.max(worst, Math.abs(r.f[k] - r.f[k - 1]) * r.tdeeW[k] * 7);
  assert.ok(worst <= 100 + 1e-6, "weekly kcal step at the boundary " + worst);
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

test("the app starts without errors after these changes", async () => { assert.deepEqual(app.errors, []); });
