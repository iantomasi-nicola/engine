/* M14b group B: the energy numbers of docs/review/area06-energy.md (items 1-3, 5-9, 12, 14-20, 22, 23, 25). No formula changes: the same approved formulas, fed and shown consistently.
   Synthetic data only. Expected values worked out by hand here from the documents, not read from the app:
   Profile: male, 30 y, 80 kg, Mifflin-St Jeor (rounded form).
     BMR at 180 cm = 10*80 + 6.25*180 - 5*30 + 5 = 1780; at the assumed 175 cm = 800 + 1093.75 - 150 + 5 = 1748.75.
     Harris-Benedict 1918/1919 at 175 cm = 66.473 + 13.7516*80 + 5.0033*175 - 6.755*30 = 1839.5285; Ten Haaf (weight) at 1.75 m = 29.279 + 954.88 + 1028.524 - 243.87 + 191.027 = 1959.84.
   Walking (Ludlow-Weyand 2016 at 1.3 m/s, stride 0.415 x height): kcal/kg/km = (3.85 + 5.97*1.69/H) * (1000/78) * 0.005 -> 0.6061004 at 1.80 m, 0.6163663 at 1.75 m.
     cost(H, steps) = that * 80 kg * steps * 0.415 * H / 1000:
     1.75 m: 10000 steps 358.109, 6540 steps 234.203 -> NEAT from steps with the default 350 = 358.109 + (350 - 234.203) = 473.906.
     1.80 m: 8000 steps 289.764, 6540 steps 236.884 (default base 113.116), 4000 steps 144.882.
   Today's projection (D18): steps so far + median of the last 14 days * (1 - (hour - 7)/15). 1500 so far, median 8000:
     09:00 -> 1500 + 8000*13/15 = 8433.33 steps (cost 305.460); 21:00 -> 1500 + 8000/15 = 2033.33 (cost 73.650).
     learned base 300 at 09:00: 305.460 + 300 = 605.460 (before the fix 1500 steps only: 54.331 + 300 = 354.331).
     default base: 09:00 305.460 + 113.116 = 418.578; 21:00 73.650 + 113.116 = 186.766.
   Watch total mode, run 60' of 700 kcal from a sensor that counts gross: net = 700 - 1780/1440*60 = 625.83 -> 626 (D5b);
     NEAT = 2900 - 1780 - 626 = 494 (before: 2900 - 1780 - 700 = 420) and BMR + NEAT + EAT = 1780 + 494 + 626 = 2900, the watch total.
   Learned base from watch 600 at 8000 steps: 600 - 289.764 = 310.236; a 4000-step day = 144.882 + 310.236 = 455.118; switched off: the 7-day average 600.
   Goal: 80 kg -> 75 kg, Cut -500, lean share typed 100 % -> held at 90 %: perWeek = 500*7/7000/(1 - 0.9) = 5 kg, weeks = 5/5 = 1, ETA = today + 7 (before: Infinity, ETA today).
   Bedtime: need 7.5 h, two nights of 6.96 h -> owed 1.08 h -> +0.27 h (round(1.08*25)/100); 07:00 - 7.77 h - 0.25 h = 22.98 h = 22:58.8 -> 23:00 to 5 minutes (before: «22:00»).
   btHM: 22.995 h = 1379.7 min -> 23:00; 6.999 h = 419.94 min -> 07:00; 23.5 -> 23:30; 23.999 -> 00:00. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let app;
test.before(async () => {
  app = await H.startApp({ dir: H.build(H.tmp("m14b")), seed: F.seed({ withPlan: false }), viewport: H.VIEWPORTS.phone });
  await app.page.evaluate(() => {
    window.__put = (d, L) => { const m = d.slice(0, 7); S.logm[m] = S.logm[m] || { month: m, days: {} }; S.logm[m].days[d] = L; };
    window.__hour = h => { if (!window.__gh) window.__gh = Date.prototype.getHours; Date.prototype.getHours = h == null ? window.__gh : function () { return h; }; };
  });
});
test.after(async () => { await app?.close(); });
const ev = (f, a) => app.page.evaluate(f, a);
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg || ""} ${a} vs ${b}`);
const walk = h => (3.85 + 5.97 * 1.69 / h) * (1000 / 78) * 0.005, cost = (h, steps) => walk(h) * 80 * steps * 0.415 * h / 1000;
/* a clean profile: 30 y, 180 cm, 80 kg, Mifflin, default energy settings with every activation date cleared */
const reset = (o = {}) => ev(o => {
  window.__hour(null);
  const t = todayISO(), fit = FIT();
  Object.assign(fit.profile, { sex: "Male", height: 180, startWeight: 80, bf: null, dob: addDays(t, -Math.round(30.5 * 365.25)) });
  Object.assign(fit.energy, { bmr: "Mifflin-St Jeor", watchMode: "active", minWatchNeat: 150, neat: 350, tef: 0.1, neatMode: "on", neatFrom: "", neatRefSteps: 6540, netKcal: "on", netFrom: "", oneSrc: "on", oneFrom: "",
    hrLearn: "on", hrFrom: "", hrNet: "on", hrNetFrom: "", bmrRamp: "on", bmrRampFrom: "", kpkFrom: "", calMode: o.cal || "v2", calManual: null, calV2From: "", kcalPerKgMode: "fixed", kcalPerKg: 7000, bmrAutoFrom: "" });
  fit.targetMode = "smart"; fit.devices = []; fit.sportDevice = {}; fit.usePattern = false; fit.goal = { type: "weight", value: 0, date: "", leanShare: 0.1 };
  fit.trackStart = addDays(t, -(o.days || 40)); fit.phases = [{ start: fit.trackStart, phase: o.phase || "Maintenance", kcal: o.kcal || 0, ...(o.pct ? { pct: o.pct } : {}) }];
  S.logm = {}; S.days = {}; S.body.w = {}; S.settings.sleep = { target: 7.5, wake: "07:00" }; UI.sheet = null; DATA_V++;
}, o);

test("#1 height empty, 0 or in metres: one height (175 assumed) for BMR, steps and texts; the field refuses it", async () => {
  await reset();
  const r = await ev(() => {
    const t = todayISO(), out = {};
    for (let i = 1; i <= 40; i++) __put(addDays(t, -i), { weight: 80 });
    __put(addDays(t, -3), { weight: 80, steps: 10000 });
    for (const h of [null, 0, 1.8, 180]) { FIT().profile.height = h; DATA_V++; out[String(h)] = { bmr: energyAt(t).bmr, neat: energyAt(addDays(t, -3)).neat, src: energyAt(addDays(t, -3)).neatSrc }; }
    FIT().profile.height = null;
    FIT().energy.bmr = "Harris-Benedict"; DATA_V++; out.hb = energyAt(t).bmr;
    FIT().energy.bmr = "Ten Haaf (weight)"; DATA_V++; out.th = energyAt(t).bmr;
    FIT().energy.bmr = "Mifflin-St Jeor"; DATA_V++;
    UI.tab = "progress"; UI.progSeg = "food"; UI.foodSeg = "energy"; render(); out.text = document.querySelector("#main").innerText;
    FIT().profile.height = 180; const el = { dataset: { t: "num", fit: "profile.height" }, value: "1.8" }; fitChange(el); out.afterField = FIT().profile.height; out.fieldShows = el.value;
    const el2 = { dataset: { t: "num", fit: "profile.height" }, value: "182" }; fitChange(el2); out.accepted = FIT().profile.height;
    return out;
  });
  for (const h of ["null", "0", "1.8"]) { near(r[h].bmr, 1748.75, 1e-6, `BMR at height ${h}`); near(r[h].neat, cost(1.75, 10000) + 350 - cost(1.75, 6540), 0.01, `NEAT at height ${h}`); assert.equal(r[h].src, "stepsRef"); }
  near(r["180"].bmr, 1780, 1e-6); near(r.hb, 1839.5285, 1e-6); near(r.th, 1959.84, 1e-6);
  assert.match(r.text, /175 cm/); assert.match(r.text, /1,749/);
  assert.equal(r.afterField, 180, "a height in metres is refused"); assert.equal(r.fieldShows, "180", "the field goes back to the saved value");
  assert.equal(r.accepted, 182);
});

test("#2 today with the learned base: the steps are projected to the evening like the default branch (605 at 09:00, not 354)", async () => {
  await reset();
  const r = await ev(() => {
    const t = todayISO(); for (let i = 1; i <= 30; i++) { const s = 8000; __put(addDays(t, -i), { weight: 80, steps: s, watch: Math.round((0.6061004 * 80 * s * 0.415 * 1.8 / 1000 + 300) * 100) / 100 }); }
    __put(t, { steps: 1500 }); __hour(9); DATA_V++;
    const e = energyAt(t), y = energyAt(addDays(t, -1)); __hour(null);
    return { neat: e.neat, src: e.neatSrc, nx: e.nx, basis: tdeeBasis(e), y: y.neat, ysrc: y.neatSrc };
  });
  assert.equal(r.src, "stepsProj"); near(r.neat, cost(1.8, 1500 + 8000 * 13 / 15) + 300, 0.6); near(r.nx.steps, 8433.33, 0.01); assert.equal(r.nx.so, 1500);
  assert.match(r.basis, /steps so far/); assert.equal(r.ysrc, "watch");
});

test("#3 watch daily kcal = Total: the session is taken out net of rest, as in the EAT: BMR + NEAT + EAT = the watch total", async () => {
  await reset();
  const r = await ev(() => {
    const t = todayISO(), pd = addDays(t, -3); FIT().energy.watchMode = "total"; FIT().devices = [{ id: "polar", name: "Polar", kind: "strap", kcal: "gross" }];
    for (let i = 1; i <= 10; i++) __put(addDays(t, -i), { weight: 80 });
    __put(pd, { weight: 80, watch: 2900, workouts: [{ sport: "Running", min: 60, km: 10, kcal: 700, src: "intervals", ext: "icu-a-1", startAt: "07:00", dev: "polar" }] }); DATA_V++;
    const e = energyAt(pd); return { bmr: e.bmr, neat: e.neat, eat: e.eat, src: e.neatSrc, sub: e.nx.sub };
  });
  near(r.bmr, 1780, 1e-6); assert.equal(r.eat, 626); near(r.neat, 494, 1e-6); assert.equal(r.src, "watch"); assert.equal(r.sub, 626);
  near(r.bmr + r.neat + r.eat, 2900, 1e-6);
});

test("#5 one intake: a day with a typed total and ticked foods gives the same intake to the energy series, Day deficit, ring and week budget", async () => {
  await reset();
  const r = await ev(() => {
    const t = todayISO(), d2 = addDays(t, -2), d3 = addDays(t, -3); for (let i = 1; i <= 10; i++) __put(addDays(t, -i), { weight: 80 });
    __put(d2, { weight: 80, kcal: 2500, p: 150, c: 300, f: 80 });
    S.days[d2] = { date: d2, meals: { m: [{ id: "a", kind: "food", ref: "t-rice", qty: 500, eaten: true }] } };
    S.days[d3] = { date: d3, meals: { m: [{ id: "b", kind: "food", ref: "t-rice", qty: 500, eaten: true }] } }; DATA_V++;
    const D = dayDeficit(d2), e = energyAt(d2);
    return { series: e.intake.kcal, eaten: eatenFor(d2).kcal, manual: eatenFor(d2).manual, ddIntake: D.intake, ddProj: D.proj, balance: e.balance, food3: eatenFor(d3).kcal, series3: energyAt(d3).intake.kcal, src3: intakeFor(d3).src };
  });
  assert.equal(r.series, 2500); assert.equal(r.eaten, 2500, "the typed total wins everywhere, as the check-in says"); assert.equal(r.manual, true);
  assert.equal(r.ddIntake, 2500); near(r.ddProj, r.balance, 1e-9, "Day deficit = the balance of the same day");
  assert.equal(r.food3, 1750, "500 g of rice at 350 kcal/100 g"); assert.equal(r.series3, 1750); assert.equal(r.src3, "food");
});

test("#6 NEAT from steps = Off switches off the learned-base branch too (the 7-day average 600 instead of 455)", async () => {
  await reset();
  const r = await ev(() => {
    const t = todayISO(), pd = addDays(t, -5); for (let i = 8; i <= 30; i++) __put(addDays(t, -i), { weight: 80, steps: 8000, watch: 600 });
    __put(pd, { weight: 80, steps: 4000 }); DATA_V++;
    const on = energyAt(pd); FIT().energy.neatMode = "off"; DATA_V++; const off = energyAt(pd);
    FIT().energy.neatMode = "on"; FIT().energy.neatFrom = t; DATA_V++; const from = energyAt(pd); FIT().energy.neatFrom = ""; DATA_V++;
    return { on: [on.neat, on.neatSrc], off: [off.neat, off.neatSrc], from: [from.neat, from.neatSrc] };
  });
  near(r.on[0], cost(1.8, 4000) + 600 - cost(1.8, 8000), 0.01); assert.equal(r.on[1], "steps");
  near(r.off[0], 600, 1e-9); assert.equal(r.off[1], "avg");
  assert.equal(r.from[1], "steps", "the learned base predates neatFrom (M7a2): its days before that date stay as they were");
});

test("#7 calibration: the uncertainty is dropped when the data stop passing the gates (no «100% reliable» 40 days later)", async () => {
  await reset({ days: 90 });
  const r = await ev(() => {
    const t = todayISO(), st = addDays(t, -90); for (let i = 0; i < 50; i++) __put(addDays(st, i), { weight: +(80 - 0.02 * i).toFixed(2), kcal: 2300 }); DATA_V++;
    const s = energySeries(), had = s.order.some(d => s.rows[d].tdeeSE > 0), r = energyAt(t);
    return { had, se: r.tdeeSE, pct: r.calPct, status: calStatus(r), factor: r.factor };
  });
  assert.ok(r.had, "the uncertainty existed while the data passed"); assert.equal(r.se, null); assert.equal(r.pct, null);
  assert.doesNotMatch(r.status, /Calibrated/); assert.ok(r.factor > 0);
});

test("#8 bedtime rounded on the total minutes: 22:58.8 -> 23:00, not 22:00; btHM the same", async () => {
  await reset();
  const r = await ev(() => {
    const t = todayISO(); for (let i = 0; i < 7; i++) __put(addDays(t, -i), { sleep: i < 2 ? 6.96 : 7.5 }); DATA_V++;
    const s = sleepTonight(t); return { t: s.t, bed: s.bed, hm: [btHM(22.995), btHM(6.999), btHM(23.5), btHM(23.999), btHM(-0.5)] };
  });
  near(r.t, 7.77, 1e-9); assert.equal(r.bed, "23:00");
  assert.deepEqual(r.hm, ["23:00", "07:00", "23:30", "00:00", "23:30"]);
});

test("#9 Today › Yesterday card: «2,200 kcal eaten», never NaN", async () => {
  await reset();
  const html = await ev(() => {
    const t = todayISO(); for (const i of [3, 5, 8]) __put(addDays(t, -i), { weight: 80 }); for (let i = 2; i <= 8; i++) __put(addDays(t, -i), { ...(logGet(addDays(t, -i)) || {}), kcal: 2300 });
    __put(addDays(t, -1), { kcal: 2200 }); DATA_V++; return yesterdayCard();
  });
  assert.match(html, /2,200 kcal eaten/); assert.doesNotMatch(html, /NaN/);
});

test("#12 today's projection follows the clock: 419 at 09:00, 187 at 21:00 with no data change", async () => {
  await reset();
  const r = await ev(() => {
    const t = todayISO(); for (let i = 1; i <= 14; i++) __put(addDays(t, -i), { weight: 80, steps: 8000 }); __put(t, { steps: 1500 }); DATA_V++;
    __hour(9); const a = energyAt(t).neat; __hour(21); const b = energyAt(t).neat; __hour(null); return { a, b };
  });
  near(r.a, 418.578, 0.01); near(r.b, 186.766, 0.01);
});

test("#14 #15 check-in and Day deficit: the subtraction shown is the one made, labels follow the NEAT source and the phase", async () => {
  await reset();
  const r = await ev(() => {
    const t = todayISO(), pd = addDays(t, -2); for (let i = 1; i <= 10; i++) __put(addDays(t, -i), { weight: 80 });
    __put(t, { weight: 80, watch: 1200, workouts: [{ sport: "Running", min: 60, km: 10, kcal: 700, src: "intervals", ext: "icu-a-9", startAt: "07:00" }], planned: [{ sport: "Calisthenics", min: 60, int: "Moderate" }] });
    __put(pd, { weight: 80, steps: 9000 }); DATA_V++;
    const e = energyAt(t), out = { eat: e.eat, neat: e.neat, sub: e.nx.sub };
    openSheet("checkin", { date: t }); out.calc = document.querySelector("#sheet-root .ci-calc")?.innerText.replace(/\s+/g, " "); out.today = document.querySelector("#sheet-root").innerText; closeSheet();
    openSheet("checkin", { date: pd }); out.past = document.querySelector("#sheet-root").innerText; closeSheet();
    openSheet("checkin", { date: pd, energy: true }); out.pastE = document.querySelector("#sheet-root").innerText; closeSheet();
    out.dfc = deficitHTML(pd); out.weeks = weeksView(); out.energy = (() => { UI.tab = "progress"; UI.progSeg = "food"; UI.foodSeg = "energy"; render(); return document.querySelector("#main").innerText; })();
    return out;
  });
  assert.equal(r.sub, 700); near(r.neat, 500, 1e-9); assert.ok(r.eat > 700, "the planned session is in the EAT");
  assert.match(r.calc, /AEE 1,200 − Workouts 700 = NEAT 500/); assert.doesNotMatch(r.calc, new RegExp(r.eat.toLocaleString("en-US")));
  assert.match(r.today, /still planned/);
  assert.doesNotMatch(r.past, /7-day/); assert.doesNotMatch(r.past, /no steps for this day/); assert.match(r.past, /steps/);
  assert.doesNotMatch(r.pastE, /watch-based/); assert.doesNotMatch(r.dfc, /cut set/); assert.match(r.dfc, /maintenance set/);
  assert.doesNotMatch(r.weeks, /watch-based/); assert.match(r.energy, /otherwise from your steps/);
});

test("#16 #22 «Is the model right?»: weigh-ins counted even under 8; «planned» holds the Maintenance %", async () => {
  await reset({ pct: 5, cal: "off" });
  const r = await ev(() => {
    const t = todayISO(); for (let i = 1; i <= 28; i++) __put(addDays(t, -i), { kcal: 2300, ...([1, 6, 11, 16, 21].includes(i) ? { weight: 80 } : {}) }); DATA_V++;
    const few = modelCheck();
    for (let i = 1; i <= 28; i++) __put(addDays(t, -i), { kcal: 2300, weight: 80 }); DATA_V++;
    const M = modelCheck(); return { nW: few.nW, few: few.measured, plan: M.plan, tdee: energyAt(addDays(t, -1)).tdee };
  });
  /* no steps, no watch, no training: NEAT = the default 350 every day; TDEE = (1780 + 350) * 1.1 = 2343; Maintenance 5 % = -round(2343 * 0.05) = -117 */
  assert.equal(r.nW, 5); assert.equal(r.few, undefined);
  near(r.tdee, 2343, 1e-6); near(r.plan, -117, 1e-9);
});

test("#17 lean share held at 0-90 %: 100 % typed gives 90 %, a finite ETA one week away", async () => {
  await reset({ phase: "Cut", kcal: -500 });
  const r = await ev(() => {
    const t = todayISO(); for (let i = 0; i <= 10; i++) __put(addDays(t, -i), { weight: 80 });
    FIT().goal = { type: "weight", value: 75, date: "", leanShare: 0.1 }; const el = { dataset: { t: "pct", fit: "goal.leanShare" }, value: "100" }; fitChange(el); const stored = FIT().goal.leanShare;
    FIT().goal.leanShare = 1; DATA_V++; const g = goalState(); return { stored, perWeek: g.perWeek, weeks: g.weeks, eta: g.eta, want: addDays(t, 7) };
  });
  near(r.stored, 0.9, 1e-12); near(r.perWeek, 5, 1e-9); near(r.weeks, 1, 1e-9); assert.equal(r.eta, r.want);
});

test("#18 Form: «—» while fitness (CTL) is under 10, the percentage once it is built", async () => {
  await reset();
  const r = await ev(() => {
    const t = todayISO(); __put(addDays(t, -3), { workouts: [{ sport: "Running", min: 60, load: 150 }] }); DATA_V++;
    const a = fitnessNow(); UI.tab = "today"; render(); const tile = [...document.querySelectorAll("#main .gl-t")].find(x => x.querySelector("em")?.textContent === "Form")?.querySelector("b")?.innerText ?? "missing";
    for (let i = 4; i <= 90; i++) __put(addDays(t, -i), { workouts: [{ sport: "Running", min: 60, load: 80 }] }); DATA_V++;
    const b = fitnessNow(); return { ctlA: a.ctl, pctA: a.pct, zoneA: a.zone, tile, ctlB: b.ctl, pctB: b.pct, sumA: null };
  });
  assert.ok(r.ctlA < 10); assert.equal(r.pctA, null); assert.equal(r.zoneA, null); assert.equal(r.tile, "—");
  assert.ok(r.ctlB >= 10); assert.equal(typeof r.pctB, "number");
});

test("#19 goal and Lean mass card use the same body fat: the 28-day weighted mean", async () => {
  await reset();
  const r = await ev(() => {
    const t = todayISO(); for (let i = 0; i <= 12; i++) __put(addDays(t, -i), { weight: 80 }); __put(addDays(t, -10), { weight: 80, bf: 26.8 }); __put(addDays(t, -2), { weight: 80, bf: 26.2 });
    FIT().goal = { type: "bf", value: 15, date: "", leanShare: 0.1 }; DATA_V++;
    const g = goalState(), L = leanEst(); return { g: [g.bfNow, g.lean], L: [L.bf, L.lean] };
  });
  /* weights 0.5^(10/10) = 0.5 and 0.5^(2/10) = 0.870551: (26.8*0.5 + 26.2*0.870551) / 1.370551 = 26.41890 %; lean = 80 * (1 - 0.2641890) = 58.8649 kg */
  near(r.L[0], 26.41890, 1e-4); near(r.g[0], r.L[0], 1e-9); near(r.g[1], 58.8649, 1e-3); near(r.g[1], r.L[1], 1e-9);
});

test("#20 an emptied TEF or Default NEAT goes back to the default (10 %, 350), also for a profile saved empty", async () => {
  await reset();
  const r = await ev(() => {
    fitChange({ dataset: { t: "pct", fit: "energy.tef" }, value: "" }); fitChange({ dataset: { t: "num", fit: "energy.neat" }, value: " " });
    const typed = [FIT().energy.tef, FIT().energy.neat];
    const saved = normalizeSettings({ ...S.settings, fit: { ...FIT(), energy: { ...FIT().energy, tef: null, neat: null } } }).fit.energy;
    return { typed, saved: [saved.tef, saved.neat] };
  });
  assert.deepEqual(r.typed, [0.1, 350]); assert.deepEqual(r.saved, [0.1, 350]);
});

test("#23 #25 one trend weight (the setup's weigh-in counts in the energy series too); the weigh-in list is cached and returned as a copy", async () => {
  await reset({ days: 2 });
  const r = await ev(() => {
    const t = todayISO(); S.body.w[addDays(t, -3)] = 80; __put(addDays(t, -2), { weight: 78 }); DATA_V++;
    const a = weightsSeries(true); a.pop(); const b = weightsSeries(true);
    __put(addDays(t, -1), { weight: 77 }); DATA_V++; const c = weightsSeries(true);
    return { e: energyAt(addDays(t, -2)).trend, s: trendSimple(addDays(t, -2)), now: [energyAt(t).trend, trendNow()], b: b.length, c: c.length };
  });
  /* the week up to day -2 holds 80 (setup, day -3) and 78: 79; today 80, 78, 77 = 78.333 */
  near(r.e, 79, 1e-9); near(r.s, 79, 1e-9); near(r.now[0], 235 / 3, 1e-9); near(r.now[1], 235 / 3, 1e-9);
  assert.equal(r.b, 2, "popping a returned list does not touch the cache"); assert.equal(r.c, 3, "a new weigh-in invalidates it");
});

/* #4: Keytel, male 30 y, 80 kg, 130 bpm: (-55.0969 + 0.6309*130 + 0.1988*80 + 0.2017*30) / 4.184 = 11.681429 kcal/min; x 0.794 x 60' = 556.503 gross -> 557 (before);
   minus rest 1780/1440*60 = 74.167 -> 482.337 -> 482 net. Own sensor (D20) with 6 sessions of 482 real net kcal at 130 bpm: ratio (482 + 74.167) / (11.681429*60) = 0.793520,
   pulled toward 0.794 with the weight of 6 sessions: 0.793760 -> 11.681429*0.793760*60 - 74.167 = 482.17 -> 482 (learning net/gross as before would give 0.740851 -> 445). */
test("#4 heart-rate kcal net of rest as in D5b: 482 instead of 557; the shadow AEE says the same; switch and start date roll it back; an own sensor still gives its real kcal back", async () => {
  await reset();
  const r = await ev(() => {
    const t = todayISO(), pd = addDays(t, -3); for (let i = 1; i <= 12; i++) __put(addDays(t, -i), { weight: 80 });
    const ride = { sport: "Cycling", min: 60, hr: 130 }; __put(pd, { weight: 80, workouts: [{ ...ride }] }); DATA_V++;
    const on = energyAt(pd).eat, shadow = aeeShadow(pd).eat.items[0].pick;
    FIT().energy.hrNet = "off"; DATA_V++; const off = energyAt(pd).eat; FIT().energy.hrNet = "on"; FIT().energy.hrNetFrom = t; DATA_V++; const before = energyAt(pd).eat; FIT().energy.hrNetFrom = ""; DATA_V++;
    FIT().devices = [{ id: "zepp", name: "Watch", kind: "wrist", kcal: "net" }];
    for (let i = 5; i <= 10; i++) __put(addDays(t, -i), { weight: 80, workouts: [{ sport: "Cycling", min: 60, hr: 130, watch: 482, dev: "zepp" }] });
    __put(addDays(t, -2), { weight: 80, workouts: [{ ...ride, dev: "zepp" }] }); DATA_V++;
    return { on, shadow, off, before, own: energyAt(addDays(t, -2)).eat, f: hrCalLearned("zepp").f };
  });
  assert.equal(r.on, 482); assert.equal(r.shadow.m, "hr"); assert.equal(r.shadow.kcal, 482, "shadow and figure in use coincide");
  assert.equal(r.off, 557); assert.equal(r.before, 557);
  near(r.f, 0.793760, 1e-5); assert.equal(r.own, 482);
});

/* #10: Auto, male 80 kg 180 cm. Ten Haaf (weight) at 35 = 29.279 + 954.88 + 1057.9104 - 284.515 + 191.027 = 1948.5814; at 36 = 1940.4524; Mifflin at 36 = 800 + 1125 - 180 + 5 = 1750.
   36th birthday on day b: b-1 Ten Haaf 1948.58; b (day 0) 1940.45; b+7 halfway (1940.4524 + 1750) / 2 = 1845.2262; b+14 and after Mifflin 1750. Off: 1750 from day b (the old step). */
test("#10 age by the calendar; BMR Auto moves to the new formula over 14 days after the birthday, no step", async () => {
  await reset();
  const r = await ev(() => {
    const t = todayISO(), b = addDays(t, 2); for (let i = 1; i <= 7; i++) __put(addDays(t, -i), { weight: 80 });
    FIT().profile.dob = "1993-10-25"; const age = [ageAt("2026-10-25"), ageAt("2026-10-24")]; FIT().profile.dob = "2000-02-29"; const leap = [ageAt("2026-02-28"), ageAt("2026-03-01"), ageAt("2028-02-29")];
    FIT().profile.dob = (+b.slice(0, 4) - 36) + b.slice(4); FIT().energy.bmr = "Auto"; DATA_V++;
    const at = k => energyAt(addDays(b, k)).bmr, ramp = [-1, 0, 7, 14, 20].map(at), bf = energyAt(addDays(b, 7)).bmrF;
    FIT().energy.bmrRamp = "off"; DATA_V++; const off = at(0); FIT().energy.bmrRamp = "on"; FIT().energy.bmrRampFrom = addDays(b, 1); DATA_V++; const from = at(0);
    return { age, leap, ramp, bf, off, from };
  });
  assert.deepEqual(r.age, [33, 32]); assert.deepEqual(r.leap, [25, 26, 28]);
  near(r.ramp[0], 1948.5814, 1e-6); near(r.ramp[1], 1940.4524, 1e-6); near(r.ramp[2], 1845.2262, 1e-6); near(r.ramp[3], 1750, 1e-6); near(r.ramp[4], 1750, 1e-6);
  assert.equal(r.bf, "Mifflin-St Jeor"); near(r.off, 1750, 1e-6); near(r.from, 1750, 1e-6, "before bmrRampFrom the step stays");
});

/* #11: body fat 20 % of 80 kg = 16 kg fat; Forbes share 16 / 26.4 = 0.606061; Hall 0.606061*9400 + 0.393939*1800 = 6406.06 kcal/kg.
   Goal 75 kg, Cut -500, lean share 10 %: per week 3500 / 6406.06 / 0.9 = 0.607064 kg (with 7000: 0.555556). */
test("#11 one energy per kg (Hall by body fat) for ETA, estimated kg and the Day deficit; the Energy text says it", async () => {
  await reset({ phase: "Cut", kcal: -500 });
  const r = await ev(() => {
    const t = todayISO(), d = addDays(t, -2); FIT().profile.bf = 20; FIT().energy.kcalPerKgMode = "auto"; FIT().goal = { type: "weight", value: 75, date: "", leanShare: 0.1 };
    for (let i = 0; i <= 10; i++) __put(addDays(t, -i), { weight: 80 }); __put(d, { weight: 80, kcal: 1800 }); DATA_V++;
    const g = goalState(), e = energyAt(d), D = dayDeficit(d);
    UI.tab = "progress"; UI.progSeg = "food"; UI.foodSeg = "energy"; render(); const text = document.querySelector("#main").innerText;
    FIT().energy.kpkFrom = addDays(t, 1); DATA_V++; const old = goalState().perWeek; FIT().energy.kpkFrom = ""; FIT().profile.bf = null; DATA_V++;
    return { kpk: g.kpk, perWeek: g.perWeek, estKg: e.estKg, bal: e.balance, ddKg: D.kg, ddProj: D.proj, text, old };
  });
  near(r.kpk, 6406.0606, 1e-3); near(r.perWeek, 0.607064, 1e-5); near(r.estKg, r.bal / 6406.0606, 1e-6); near(r.ddKg, r.ddProj / 6406.0606, 1e-6);
  assert.match(r.text, /6,406 kcal per kg/); assert.doesNotMatch(r.text, /7,000 kcal per kg/);
  near(r.old, 3500 / 7000 / 0.9, 1e-9, "before kpkFrom the fixed 7000 stays");
});

test("the app starts with no page error", async () => { assert.deepEqual(app.errors, []); });
