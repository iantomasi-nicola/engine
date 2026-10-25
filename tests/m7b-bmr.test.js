/* M7b F-01 (formulas approved by the owner on 26/10): Harris-Benedict with the original 1918/1919 coefficients, the lean bonus as an option, Ten Haaf (weight) as a new BMR formula, and the side-by-side view.
   Synthetic data only. Expected values are worked out by hand in the comments, not copied from the app's output.
   Ten Haaf's coefficients are those of docs/NUTRITION_SPEC.md §5 (not checked against the paper's text in this environment). */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let app;
test.before(async () => { app = await H.startApp({ dir: H.build(H.tmp("m7b-bmr-build")), seed: F.seed({ withPlan: false }) }); });
test.after(async () => { await app?.close(); });
const ev = (f, a) => app.page.evaluate(f, a);
const near = (a, b, eps = 0.001) => assert.ok(Math.abs(a - b) <= eps, `${a} vs ${b}`);
/* a profile of the given age (years), sex, height (cm), weight (kg), body fat; no log, so the trend weight is the starting weight */
const profile = o => ev(o => { const t = todayISO(); Object.assign(FIT().profile, { sex: o.sex || "Male", height: o.h || 180, startWeight: o.kg || 80, bf: o.bf ?? null, dob: addDays(t, -Math.round(((o.age ?? 30) + 0.4) * 365.25)) });
  Object.assign(FIT().energy, { bmr: o.bmr || "Mifflin-St Jeor", hbBonusOn: o.bonus || "off" }); S.logm = {}; DATA_V++; return ageAt(t); }, o);
const bmrNow = () => ev(() => energyAt(todayISO()).bmr);

test("Harris-Benedict original, male 80 kg / 180 cm / 30 y: 66.4730 + 13.7516*80 + 5.0033*180 - 6.7550*30 = 66.473 + 1100.128 + 900.594 - 202.65 = 1864.545", async () => {
  assert.equal(await profile({ bmr: "Harris-Benedict" }), 30);
  near(await bmrNow(), 1864.545);
});

test("Harris-Benedict original, female 55 kg / 165 cm / 30 y: 655.0955 + 9.5634*55 + 1.8496*165 - 4.6756*30 = 655.0955 + 525.987 + 305.184 - 140.268 = 1345.9985", async () => {
  await profile({ bmr: "Harris-Benedict", sex: "Female", kg: 55, h: 165 });
  near(await bmrNow(), 1345.9985);
});

test("the lean bonus is off by default for a new profile and on for a profile saved before the switch existed (their numbers do not move)", async () => {
  const r = await ev(() => ({ fresh: normalizeSettings({}).fit.energy.hbBonusOn, old: normalizeSettings({ fit: { energy: { bmr: "Harris-Benedict" } } }).fit.energy.hbBonusOn, kept: normalizeSettings({ fit: { energy: { hbBonusOn: "off" } } }).fit.energy.hbBonusOn }));
  assert.deepEqual(r, { fresh: "off", old: "on", kept: "off" });
});

test("lean bonus on: 10 % body fat under the 16 % threshold adds (16 - 10) * 27.5 = 165 kcal to 1864.545; 20 % body fat adds nothing; switched off adds nothing", async () => {
  await profile({ bmr: "Harris-Benedict", bf: 10, bonus: "on" });
  near(await bmrNow(), 1864.545 + 165);
  await profile({ bmr: "Harris-Benedict", bf: 20, bonus: "on" });
  near(await bmrNow(), 1864.545);
  await profile({ bmr: "Harris-Benedict", bf: 10, bonus: "off" });
  near(await bmrNow(), 1864.545);
});

test("the bonus belongs to Harris-Benedict only: Mifflin with 10 % body fat and the bonus on stays 10*80 + 6.25*180 - 5*30 + 5 = 1780", async () => {
  await profile({ bmr: "Mifflin-St Jeor", bf: 10, bonus: "on" });
  near(await bmrNow(), 1780);
});

test("Ten Haaf (weight), male 80 kg / 1.80 m / 30 y: 29.279 + 11.936*80 + 587.728*1.8 - 8.129*30 + 191.027 = 29.279 + 954.88 + 1057.9104 - 243.87 + 191.027 = 1989.2264 (height in metres, not 180)", async () => {
  await profile({ bmr: "Ten Haaf (weight)" });
  near(await bmrNow(), 1989.2264);
});

test("Ten Haaf (weight), female 60 kg / 165 cm / 25 y: 29.279 + 716.16 + 587.728*1.65 - 203.225 = 29.279 + 716.16 + 969.7512 - 203.225 = 1511.9652 (no sex term)", async () => {
  await profile({ bmr: "Ten Haaf (weight)", sex: "Female", kg: 60, h: 165, age: 25 });
  near(await bmrNow(), 1511.9652);
});

test("Ten Haaf age term at the edges of its data and beyond (male 80 kg / 1.80 m): 18 y = 1989.2264 + 12*8.129 = 2086.7744; 35 y = 1989.2264 - 5*8.129 = 1948.5814; 36 y = 1940.4524; 60 y = 1989.2264 - 30*8.129 = 1745.3564", async () => {
  for (const [age, v] of [[18, 2086.7744], [35, 1948.5814], [36, 1940.4524], [60, 1745.3564]]) {
    assert.equal(await profile({ bmr: "Ten Haaf (weight)", age }), age);
    near(await bmrNow(), v);
  }
});

test("side by side: the formula in use is named in the heading (its number is the BMR in the legend) and the tiles show the OTHER formulas: Mifflin 1780, Harris-Benedict 1864.545 (no bonus in the tile), Katch-McArdle needs body fat; none is called better", async () => {
  await profile({ bmr: "Ten Haaf (weight)" });
  const r = await ev(() => { const d = document.createElement("div"); d.innerHTML = energyView(); const h = [...d.querySelectorAll(".section-h")].find(x => /Basal/.test(x.textContent)), sec = h.nextElementSibling;
    return { head: h.textContent, tiles: [...sec.querySelectorAll(".stat")].map(s => s.textContent), grid: sec.className, note: sec.nextElementSibling?.textContent || "" }; });
  assert.match(r.head, /Ten Haaf \(weight\) in use/);
  assert.equal(r.tiles.length, 3);
  assert.match(r.tiles[0].replace(/[\u2011\u00a0]/g, c => c === "\u2011" ? "-" : " "), /^1,780Mifflin-St Jeor$/);
  assert.match(r.tiles[1].replace(/\u2011/g, "-"), /^1,865Harris-Benedict \(1918\/1919\)$/);
  assert.match(r.tiles[2].replace(/\u00a0/g, " "), /^—Katch.McArdleneeds body fat %$/);
  assert.ok(!/better|best|recommended|in use/i.test(r.tiles.join(" ")));
  assert.ok(/tri/.test(r.grid));
});

test("side by side outside the age of the Ten Haaf data (60 y) the tile says so; the Harris-Benedict bonus in use is told once, as the number actually used (60 y: 1864.545 - 30*6.755 = 1661.895, plus 165 = 1826.895, shown as 1,827)", async () => {
  await profile({ bmr: "Harris-Benedict", age: 60, bf: 10, bonus: "on" });
  const r = await ev(() => { const d = document.createElement("div"); d.innerHTML = energyView(); const h = [...d.querySelectorAll(".section-h")].find(x => /Basal/.test(x.textContent)), sec = h.nextElementSibling;
    return { head: h.textContent, tiles: [...sec.querySelectorAll(".stat")].map(s => s.textContent), note: sec.nextElementSibling?.textContent || "" }; });
  assert.match(r.head, /Harris-Benedict in use/);
  assert.equal(r.tiles.length, 3);
  assert.match(r.tiles[2], /Ten.Haaf.\(weight\).*outside 18–35/);
  assert.match(r.note, /Used today: 1,827 kcal/); assert.match(r.note, /lean bonus of 165/);
});

test("Settings: the BMR select offers the three formulas plus MET, the bonus has its own switch labelled as not part of the published equation, and the Energy model fields stay in even rows", async () => {
  await profile({});
  const r = await ev(() => { const d = document.createElement("div"); d.innerHTML = fitSettings(); const sel = [...d.querySelector("#fit-energy-bmr").options].map(o => o.value);
    const lab = x => d.querySelector(`label[for="fit-energy-${x}"]`)?.textContent;
    const grids = [...d.querySelectorAll(".grid2")].filter(g => g.querySelector("#fit-energy-bmr") || g.querySelector("#fit-energy-hbBonusOn")).map(g => g.children.length);
    return { sel, on: lab("hbBonusOn"), grids, text: d.textContent }; });
  assert.deepEqual(r.sel, ["Auto", "Mifflin-St Jeor", "Harris-Benedict", "Ten Haaf (weight)", "Ten Haaf (FFM)", "MET"]);
  assert.equal(r.on, undefined, "the lean bonus switch shows only with Harris-Benedict");
  assert.ok(r.grids.every(n => n % 2 === 0), "odd grid " + r.grids);
  const hb = await ev(() => { FIT().energy.bmr = "Harris-Benedict"; FIT().energy.hbBonusOn = "off"; DATA_V++; const d = document.createElement("div"); d.innerHTML = fitSettings(); const off = d.querySelector('label[for="fit-energy-hbBonusOn"]')?.textContent, offFields = !!d.querySelector("#fit-energy-hbBonus");
    FIT().energy.hbBonusOn = "on"; DATA_V++; d.innerHTML = fitSettings(); const onFields = !!d.querySelector("#fit-energy-hbBonus") && !!d.querySelector("#fit-energy-hbThr"); FIT().energy.bmr = "Mifflin-St Jeor"; return { off, offFields, onFields, note: /not part of the published equation/.test(d.textContent) }; });
  assert.deepEqual(hb, { off: "Lean bonus", offFields: false, onFields: true, note: true });
  assert.doesNotMatch(r.text, /90 recreational athletes/, "the note shows only for Harris-Benedict and Ten Haaf");
  const th = await ev(() => { FIT().energy.bmr = "Ten Haaf (weight)"; DATA_V++; const d = document.createElement("div"); d.innerHTML = fitSettings(); FIT().energy.bmr = "Mifflin-St Jeor"; return d.textContent; });
  assert.match(th, /90 recreational athletes aged 18–35/);
});

test("changing the switch in Settings is saved and survives a reload", async () => {
  await profile({ bmr: "Harris-Benedict", bf: 10, bonus: "off" });
  await ev(() => { const el = document.createElement("select"); el.dataset.fit = "energy.hbBonusOn"; el.dataset.t = "text"; el.innerHTML = '<option value="on" selected>on</option>'; el.value = "on"; fitChange(el); });
  await app.page.reload(); await app.page.waitForFunction(() => typeof FIT === "function" && FIT());
  assert.equal(await ev(() => FIT().energy.hbBonusOn), "on");
});

/* Ten Haaf & Weijs 2014 (PMID 25275434), kJ/day: weight form 49.940 kg + 2459.053 m - 34.014 y + 799.257 (male) + 122.502; lean-mass form 95.272 FFM + 2026.161. 1 kcal = 4.184 kJ.
   80 kg, 1.80 m, 30 y male: (3995.2 + 4426.3 - 1020.42 + 799.257 + 122.502) / 4.184 = 8322.84 / 4.184 = 1989.2 kcal. 12 % body fat: FFM 70.4 kg -> (6706.9 + 2026.161) / 4.184 = 8733.06 / 4.184 = 2087.3 kcal. */
test("BMR «Ten Haaf (lean mass)» = (95.272 FFM + 2026.161) / 4.184 (2087.3 for 80 kg at 12 % fat), and falls back to the weight form without body fat", async () => {
  await profile({ bmr: "Ten Haaf (FFM)", bf: 12 }); near(await ev(() => energyAt(todayISO()).bmr), 2087.3, 0.1);
  await profile({ bmr: "Ten Haaf (FFM)" }); near(await ev(() => energyAt(todayISO()).bmr), 1989.2, 0.1);
});
test("BMR «Auto»: Ten Haaf (weight) from 18 to 35 years (1989.2 at 30), Mifflin outside (40 y: 800 + 1125 - 200 + 5 = 1730), and Mifflin before its start date", async () => {
  await ev(() => { FIT().energy.bmrAutoFrom = ""; });
  await profile({ bmr: "Auto" }); near(await ev(() => energyAt(todayISO()).bmr), 1989.2, 0.1);
  await ev(() => { const t = todayISO(); Object.assign(FIT().profile, { dob: addDays(t, -Math.round(40.4 * 365.25)) }); DATA_V++; }); near(await ev(() => energyAt(todayISO()).bmr), 1730, 0.1);
  await ev(() => { const t = todayISO(); Object.assign(FIT().profile, { dob: addDays(t, -Math.round(30.4 * 365.25)) }); FIT().energy.bmrAutoFrom = addDays(t, 5); DATA_V++; }); near(await ev(() => energyAt(todayISO()).bmr), 1780, 0.1);
  await ev(() => { FIT().energy.bmrAutoFrom = ""; FIT().energy.bmr = "Mifflin-St Jeor"; });
});
test("energy per kg of weight change by body fat (Hall 2008, PMID 17848938; Forbes partition p = FM / (FM + 10.4), 9400 kcal/kg fat, 1800 lean): 12 kg of fat = 5871.4, 30 kg = 7443.6; fixed mode and no body fat keep 7000", async () => {
  const r = await ev(() => ({ a: energyDensity(12), b: energyDensity(30), fixed: kcalPerKgFor(80, 15, { kcalPerKgMode: "fixed", kcalPerKg: 7000 }), none: kcalPerKgFor(80, null, { kcalPerKgMode: "auto", kcalPerKg: 7000 }), auto: kcalPerKgFor(80, 15, { kcalPerKgMode: "auto", kcalPerKg: 7000 }) }));
  near(r.a, 5871.4, 0.1); near(r.b, 7443.6, 0.1); assert.equal(r.fixed, 7000); assert.equal(r.none, 7000); near(r.auto, 5871.4, 0.1);   // 80 kg at 15 % = 12 kg of fat
});
test("net walking cost (Ludlow & Weyand 2016, PMID 26679617) for 1.8 m at 1.3 m/s: (3.85 + 5.97 * 1.69 / 1.8) = 9.45517 ml/kg/min over 12.8205 min per km at 5 kcal/l = 0.606101 kcal/kg/km; 80 kg and 2000 steps (1.494 km) = 72.44 kcal", async () => {
  const r = await ev(() => ({ k: walkKcalKgKm(1.8), c: STEP_KCAL(80, 2000, 180) }));
  near(r.k, 0.606101, 1e-5); near(r.c, 72.44, 0.01);
});
