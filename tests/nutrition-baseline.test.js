/* Nutrition baseline (cae350d): numbers the audit in docs/NUTRITION_AUDIT.md relies on. Nothing here changes a formula.
   Reference values are recomputed independently in this file from the published equations (see docs/NUTRITION_SPEC.md §5).
   Tests marked KNOWN (<id>) pin a behaviour the audit proposes to change, after approval: they are updated on purpose with that change. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");

/* published equations (kcal/day; kg, cm, years) — independent of the app */
const ref = {
  mifflinRounded: (kg, cm, age, male) => 10 * kg + 6.25 * cm - 5 * age + (male ? 5 : -161),
  mifflinOriginal: (kg, cm, age, male) => 9.99 * kg + 6.25 * cm - 4.92 * age + 166 * (male ? 1 : 0) - 161,
  harrisBenedictMale: (kg, cm, age) => 66.4730 + 13.7516 * kg + 5.0033 * cm - 6.7550 * age,
  harrisBenedictFemale: (kg, cm, age) => 655.0955 + 9.5634 * kg + 1.8496 * cm - 4.6756 * age,
  tenHaafWeight: (kg, m, age, male) => 29.279 + 11.936 * kg + 587.728 * m - 8.129 * age + 191.027 * (male ? 1 : 0),
};
const near = (a, b, eps = 0.01) => assert.ok(Math.abs(a - b) <= eps, `${a} vs ${b}`);

test("reference equations reproduce the verified table (80 kg, 180 cm, 30 y male; 55 kg, 165 cm, 30 y female)", () => {
  near(ref.mifflinRounded(80, 180, 30, true), 1780); near(ref.mifflinOriginal(80, 180, 30, true), 1781.6);
  near(ref.harrisBenedictMale(80, 180, 30), 1864.545, 0.001); near(ref.harrisBenedictFemale(55, 165, 30), 1345.9985, 0.001);
  near(ref.tenHaafWeight(80, 1.8, 30, true), 1989.2264, 0.001);
  near(5 * 70 * 1, 350); near((5 - 1) * 70 * 1, 280);               // MET gross vs net
  near(1000 * 22.99 / (22.99 + 35.45), 393.4, 0.1);                   // sodium mg in 1 g of salt: "about 400"
});

let app;
test.before(async () => { app = await H.startApp({ dir: H.build(H.tmp("nutri-build")), seed: F.seed({ withPlan: false }) }); });
test.after(async () => { await app?.close(); });
const ev = (f, a) => app.page.evaluate(f, a);
const profile = (o = {}) => ev(o => { const t = todayISO(); Object.assign(FIT().profile, { sex: "Male", height: 180, startWeight: 80, bf: null, dob: addDays(t, -Math.round(30.4 * 365.25)) }, o); S.logm = {}; DATA_V++; return ageAt(t); }, o);

test("BMR: Mifflin-St Jeor in the app is the rounded form (1780 kcal for 80 kg, 180 cm, 30 y male)", async () => {
  assert.equal(await profile(), 30);
  const b = await ev(() => energyAt(todayISO()).bmr); near(b, 1780, 0.001);
});

test("D10 (F-01, done in m7b-bmr.test.js): Harris-Benedict in the app now uses the original 1918/1919 coefficients: no difference from the published equation", async () => {
  await profile(); const t = await ev(() => { FIT().energy.bmr = "Harris-Benedict"; DATA_V++; return energyAt(todayISO()).bmr; });
  near(t - ref.harrisBenedictMale(80, 180, 30), 0, 0.001);
  const f = await ev(() => { FIT().profile.sex = "Female"; FIT().profile.startWeight = 55; FIT().profile.height = 165; DATA_V++; return energyAt(todayISO()).bmr; });
  near(f - ref.harrisBenedictFemale(55, 165, 30), 0, 0.001);   // the book's -1.16 age term is NOT in the app
  await ev(() => { FIT().energy.bmr = "Mifflin-St Jeor"; });
});

test("D10 (F-01): the body-fat bonus of 27.5 kcal per point under 16 % (not part of the published equation) is counted only when its switch is on", async () => {
  await profile({ bf: 10 }); const r = await ev(() => { FIT().energy.bmr = "Harris-Benedict"; FIT().energy.hbBonusOn = "on"; DATA_V++; const withBonus = energyAt(todayISO()).bmr; FIT().energy.hbBonusOn = "off"; DATA_V++; const off = energyAt(todayISO()).bmr; FIT().profile.bf = 20; FIT().energy.hbBonusOn = "on"; DATA_V++; const none = energyAt(todayISO()).bmr; FIT().energy.bmr = "Mifflin-St Jeor"; FIT().energy.hbBonusOn = "off"; return { withBonus, off, none }; });
  near(r.withBonus - r.none, (16 - 10) * 27.5, 0.001); near(r.off, r.none, 0.001);
});

test("KNOWN (D9): with no date of birth the app silently computes with age 30 (and height 175 / weight 75 defaults)", async () => {
  const r = await ev(() => { const t = todayISO(); FIT().profile.dob = ""; return { age: ageAt(t), height: defaultFit().profile.height, startWeight: defaultFit().profile.startWeight }; });
  assert.deepEqual(r, { age: 30, height: 175, startWeight: 75 });
});

test("EAT (legacy basis, D5b off): a device kcal value is used as it is (no gross→net conversion), a planned session uses net MET (D7 context)", async () => {
  await profile();
  const r = await ev(() => { const t = todayISO(), kg = 80; FIT().energy.netKcal = "off"; DATA_V++;
    const dev = sessionKcal({ sport: "Running", min: 60, kcal: 600, src: "intervals", ext: "icu-a-1" }, t, kg);
    const met = sessionKcal({ sport: "Cycling", min: 60, int: "Moderate" }, t, kg);
    return { dev, metKcal: met.kcal, metHow: met.how, expectedNet: (7 * FIT().intMult.Moderate - 1) * kg };
  });
  assert.deepEqual(r.dev, { kcal: 600, how: "device" });
  near(r.metKcal, r.expectedNet, 1);            // net of the resting MET already counted in BMR
});

test("KNOWN (D8, legacy calibration only; v2 is steady: see m7b.test.js): calibration swings with ordinary weight noise: same person, same intake: the factor ranges over more than 0.15 and the daily target over more than 300 kcal", async () => {
  const run = sd => ev(sd => {
    let seed = 12345; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296, gauss = () => { let s = 0; for (let i = 0; i < 12; i++) s += rnd(); return s - 6; };
    const t = todayISO(), start = addDays(t, -60); S.logm = {}; FIT().energy.calMode = "legacy";
    for (let i = 0; i <= 60; i++) { const d = addDays(start, i), m = d.slice(0, 7); S.logm[m] = S.logm[m] || { days: {} }; S.logm[m].days[d] = { weight: +(80 + gauss() * sd).toFixed(1), kcal: 2343, p: 150, c: 250, f: 80 }; }
    FIT().trackStart = start; DATA_V++;
    const s = energySeries(), fs = [], tg = []; for (let i = 20; i <= 60; i++) { const r = s.rows[addDays(start, i)]; fs.push(r.factor); tg.push(r.target); }
    return { min: Math.min(...fs), max: Math.max(...fs), tmin: Math.min(...tg), tmax: Math.max(...tg) };
  }, sd);
  await profile(); const calm = await run(0), noisy = await run(0.4);
  assert.ok(calm.max - calm.min < 0.001, "no noise: stable");
  assert.ok(noisy.max - noisy.min > 0.15, `factor range ${noisy.min.toFixed(2)}-${noisy.max.toFixed(2)}`);
  assert.ok(noisy.tmax - noisy.tmin > 300, `target range ${Math.round(noisy.tmin)}-${Math.round(noisy.tmax)}`);
  await ev(() => { S.logm = {}; DATA_V++; });
});

test("KNOWN (D11): the minimum-carbohydrate setting is never applied and the target has no floor", async () => {
  await profile();
  const r = await ev(() => { const t = todayISO(), out = {}; const at = k => { FIT().phases = [{ start: addDays(t, -5), phase: "Cut", kcal: k }]; DATA_V++; const x = energyAt(t); return { target: Math.round(x.target), c: Math.round(x.c), cPerKg: +(x.c / x.trend).toFixed(2), cmin: +(x.cmin / x.trend).toFixed(2), macroKcal: Math.round(4 * x.p + 9 * x.f + 4 * x.c) }; };
    out.mild = at(-500); out.harsh = at(-1500); out.absurd = at(-2200); FIT().phases = [{ start: t, phase: "Maintenance", kcal: 0 }]; DATA_V++; return out; });
  assert.ok(r.mild.cPerKg < r.mild.cmin, "carbs fall below the configured minimum with no warning");
  assert.equal(r.harsh.c, 0); assert.ok(r.harsh.macroKcal > r.harsh.target, "protein + fat alone exceed the target");
  assert.ok(r.absurd.target < 200, "a 2200 kcal deficit is accepted: target " + r.absurd.target);
});

test("KNOWN (D12): a food with no salt value is stored as 0 g, indistinguishable from a real zero", async () => {
  const r = await ev(() => ({ blank: blankFood("x").per.salt }));
  assert.equal(r.blank, 0);
});
