/* M7b rest + M7c (formulas approved by the owner on 26/10): D7 one source per session, F-11 one list of algorithm versions, D3 «How it is calculated» in Settings.
   Synthetic data only; expected values worked out by hand here, not copied from the app.
   Profile: male, 180 cm, 80 kg (starting weight, no weigh-in), 30 y, Mifflin-St Jeor: BMR = 10*80 + 6.25*180 - 5*30 + 5 = 1780 kcal/day = 1.236111 kcal/min.
   Sensors: Running -> "Polar armband" (counts total kcal), Calisthenics -> "Amazfit (wrist)" (total).
   One day, three workouts (listed B, A, C):
     A  Running 50', 600 kcal from intervals.icu, start 09:00, device "Polar Verity Sense" -> net 600 - 1.236111*50 = 538.19 -> 538
     B  Running 48', 560 kcal from intervals.icu, start 09:02, device "Amazfit Balance"    -> net 560 - 1.236111*48 = 500.67 -> 501
     C  Calisthenics 60', 300 kcal typed by hand, start 18:00                                -> 300 as typed
   A and B overlap 48' (09:02-09:50), more than half of the shorter (24'): the same session. A is measured by the sensor chosen for running (Polar), so A counts and B gives 0.
     EAT with D7 = 538 + 0 + 300 = 838; every recording counted (switch off, or a day before oneFrom) = 538 + 501 + 300 = 1339.
   With the day's watch figure 1500 (active kcal, workouts included): NEAT = 1500 - workouts. With D7 1500 - (538 + 300) = 662; without 1500 - 1339 = 161 (>= 150, kept).
     TEF = 10 % of BMR + NEAT + EAT = 0.1 * 3280 = 328 in both cases, so the formulas total 3608 either way: the watch total holds the session once. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let app;
test.before(async () => { app = await H.startApp({ dir: H.build(H.tmp("m7c")), seed: F.seed({ withPlan: false }) }); });
test.after(async () => { await app?.close(); });
const ev = (f, a) => app.page.evaluate(f, a);

const day = (o = {}) => ev(o => {
  const t = todayISO(), D = o.today ? t : addDays(t, -1), m = D.slice(0, 7);
  Object.assign(FIT().profile, { sex: "Male", height: 180, startWeight: 80, bf: null, dob: addDays(t, -Math.round(30.4 * 365.25)) });
  Object.assign(FIT().energy, { bmr: "Mifflin-St Jeor", netKcal: "on", netFrom: "", oneSrc: "on", oneFrom: "", watchMode: "active", minWatchNeat: 150, calMode: "v2", calManual: null, calV2From: "", neat: 350 }, o.energy || {});
  if (o.oneFrom) FIT().energy.oneFrom = o.oneFrom === "D" ? D : addDays(t, 1);
  FIT().devices = [{ id: "zepp", name: "Amazfit (wrist)", kind: "wrist", kcal: "gross" }, { id: "polar", name: "Polar armband", kind: "strap", kcal: "gross" }]; FIT().sportDevice = { Running: "polar", Calisthenics: "zepp" };
  FIT().trackStart = addDays(t, -3); FIT().phases = [{ start: addDays(t, -3), phase: "Maintenance", kcal: 0 }]; FIT().usePattern = false;
  const A = { sport: "Running", min: 50, kcal: 600, src: "intervals", ext: "icu-a-1", startAt: "09:00", devn: "Polar Verity Sense", ...(o.A || {}) },
    B = { sport: "Running", min: 48, kcal: 560, src: "intervals", ext: "icu-a-2", startAt: "09:02", devn: "Amazfit Balance", ...(o.B || {}) }, C = { sport: "Calisthenics", min: 60, kcal: 300, startAt: "18:00" };
  for (const k of o.dropA || []) delete A[k]; for (const k of o.dropB || []) delete B[k];
  const E = { sport: "Running", min: 50, sid: "s1" }, list = o.list === "sid" ? [E, A, C] : [B, A, C];
  S.logm = { [m]: { month: m, days: { [D]: { workouts: list, ...(o.watch ? { watch: o.watch } : {}), ...(o.list === "sid" ? { wsess: [{ id: "s1", name: "Run", start: D + "T09:01:00" }] } : {}) } } } };
  DATA_V++; const r = energyAt(D);
  return { eat: r.eat, neat: r.neat, tdeeW: Math.round(r.tdeeW), kcals: r.kcals, hows: r.hows, learnB: realKcal(list[0], D) };
}, o);

/* ---------- D7: one session, one source ---------- */
test("D7: two recordings of one session count once, the one from the sport's sensor: EAT 538 + 0 + 300 = 838 (1339 when every recording counted)", async () => {
  const on = await day(), off = await day({ energy: { oneSrc: "off" } });
  assert.deepEqual([on.kcals, on.hows, on.eat], [[0, 538, 300], ["dup", "device", "logged"], 838]);
  assert.deepEqual([off.kcals, off.eat], [[501, 538, 300], 1339]);
});

test("D7: with the day's watch figure the second copy is not taken out twice: NEAT 1500 - 838 = 662 (161 without D7), formulas 3608 both ways", async () => {
  const on = await day({ watch: 1500 }), off = await day({ watch: 1500, energy: { oneSrc: "off" } });
  assert.deepEqual([on.neat, on.eat, on.tdeeW], [662, 838, 3608]);
  assert.deepEqual([off.neat, off.eat, off.tdeeW], [161, 1339, 3608]);
});

test("D7: the second copy teaches nothing (its learned kcal is 0; 501 with the switch off)", async () => {
  assert.equal((await day()).learnB, 0);
  assert.equal((await day({ energy: { oneSrc: "off" } })).learnB, 501);
});

test("D7: no proof, no merge: separate times, overlap under half (09:00-09:50 vs 09:30-10:18 = 20' < 24'), a missing start time, a different kind of sport", async () => {
  assert.equal((await day({ B: { startAt: "17:00" } })).eat, 1339);
  assert.equal((await day({ B: { startAt: "09:30" } })).eat, 1339);
  assert.equal((await day({ B: { startAt: "09:20" } })).eat, 838);          // 09:20-10:08: 30' overlap >= 24'
  assert.equal((await day({ dropB: ["startAt"] })).eat, 1339);
  assert.equal((await day({ B: { sport: "Cycling" } })).eat, 538 + 560 + 300);   // cycling has no sensor declared: 560 as reported
});

test("D7: a tie keeps the first recorded (no device names: B first, 501 + 0 + 300 = 801); an Engine session overlapping a device recording gives way to the measured one (538 + 300)", async () => {
  assert.deepEqual((await day({ dropA: ["devn"], dropB: ["devn"] })).kcals, [501, 0, 300]);
  const s = await day({ list: "sid" }); assert.deepEqual([s.kcals, s.eat], [[0, 538, 300], 838]);
});

test("D7: activation date and rollback: a day before energy.oneFrom counts every recording; from that day on, once", async () => {
  assert.equal((await day({ oneFrom: "future" })).eat, 1339);
  assert.equal((await day({ oneFrom: "D" })).eat, 838);
});

test("D7: the provenance of each session is recorded: sensor, its reported total, the resting energy taken out, where it came from, and where a copy is counted", async () => {
  await day();
  const p = await ev(() => { const D = addDays(todayISO(), -1), [B, A, C] = logGet(D).workouts, a = sessionSource(A, D, 80), b = sessionSource(B, D, 80), c = sessionSource(C, D, 80);
    return { a: [a.kcal, a.raw, a.rest, a.dev, a.basis, a.devn, a.from], b: [b.kcal, b.how, b.dup === A], c: [c.kcal, c.how, c.raw, c.from] }; });
  assert.deepEqual(p.a, [538, 600, 62, "Polar armband", "gross", "Polar Verity Sense", "intervals.icu"]);
  assert.deepEqual(p.b, [0, "dup", true]);
  assert.deepEqual(p.c, [300, "logged", null, "typed"]);
});

test("D7: every way a session's kcal can be made has a label in the Check-in (the trimmed one printed «undefined» before), and a copy says it is counted once", async () => {
  await day();
  const r = await ev(() => { const D = addDays(todayISO(), -1); return { miss: ["rest", "device", "logged", "watch", "load", "km", "hr", "own", "met", "none", "trimmed", "dup"].filter(k => typeof HOW_SHORT[k] !== "string"), row: sessRow(logGet(D).workouts[0], D, "x", "workouts", 0) }; });
  assert.deepEqual(r.miss, []);
  assert.match(r.row, /0 kcal · same session, counted once/); assert.ok(!/undefined/.test(r.row));
});

test("D7: the intervals.icu import keeps the start time, and merging two overlapping recordings into the session you logged takes the kcal once (600, not 1160)", async () => {
  const t = await ev(() => todayISO());
  const fake = acts => `(() => { window.fetch = async (u) => ({ ok: true, status: 200, text: async () => JSON.stringify(/\\/activities\\?/.test(u) ? ${JSON.stringify(acts)} : []) }); S.settings.intervals = { key: "TEST", aid: "0" }; })()`;
  const acts = [{ id: "p1", start_date_local: t + "T09:00:00", type: "Run", moving_time: 3000, calories: 600, device_name: "Polar Verity Sense" }, { id: "a1", start_date_local: t + "T09:02:00", type: "Run", moving_time: 2880, calories: 560, device_name: "Amazfit Balance" }];
  const run = (setup, local, one) => ev(async ([setup, local, one, today]) => { const m = today.slice(0, 7); S.logm = { [m]: { month: m, days: { [today]: { workouts: local ? [{ sport: "Running", min: 50 }] : [] } } } }; FIT().energy.oneSrc = one; FIT().energy.oneFrom = ""; DATA_V++;
    eval(setup); await icuSyncDirect(); return logGet(today).workouts.map(w => ({ kcal: w.kcal, exts: (w.exts || []).length, startAt: w.startAt || null })); }, [setup, local, one, t]);
  assert.deepEqual(await run(fake(acts), true, "on"), [{ kcal: 600, exts: 2, startAt: null }]);
  assert.deepEqual(await run(fake(acts), true, "off"), [{ kcal: 1160, exts: 2, startAt: null }]);
  assert.deepEqual((await run(fake(acts), false, "on")).map(w => w.startAt), ["09:00", "09:02"]);
});

/* ---------- F-11: one list of algorithm versions ---------- */
test("F-11: one registry lists every formula version with its switch and its first-day setting; the version stamp is the newest entry", async () => {
  const r = await ev(() => ({ keys: ALGO.map(a => [a.v, a.k, a.from]), v: ALGO_VERSION, starts: [...new Set(ALGO.map(a => a.start))], defaults: ALGO.map(a => defaultFit().energy[a.from]) }));
  assert.deepEqual(r.keys, [[1, "cal", "calV2From"], [2, "net", "netFrom"], [3, "hr", "hrFrom"], [4, "neat", "neatFrom"], [5, "bmr", "bmrAutoFrom"], [6, "nutr", "nutrFrom"], [7, "one", "oneFrom"]]);
  assert.equal(r.v, 7); assert.deepEqual(r.starts, ["2026-10-25"]); assert.deepEqual(r.defaults, ["", "", "", "", "", "", ""]);
});

test("F-11: old settings keep loading: a profile saved before an entry gets its constant start, dates already saved stay, a new profile starts from the first day, and loading twice changes nothing", async () => {
  const r = await ev(() => {
    const prev = { fit: { energy: { calV2From: "2026-10-25", netFrom: "2026-10-25", hrFrom: "2026-10-25", neatFrom: "2026-10-25", bmrAutoFrom: "2026-10-25", nutrFrom: "2026-10-25" } } };
    const a = normalizeSettings(prev).fit.energy, f = normalizeSettings(undefined).fit.energy, k = normalizeSettings({ fit: { energy: { oneFrom: "2026-11-02" } } }).fit.energy;
    const once = normalizeSettings({ fit: { energy: { bmr: "x" } } }), twice = normalizeSettings(JSON.parse(JSON.stringify(once)));
    return { a: [a.oneFrom, a.oneSrc, a.algoV, a.netFrom], f: [f.oneFrom, f.oneSrc, f.algoV], k: k.oneFrom, same: JSON.stringify(once.fit.energy) === JSON.stringify(twice.fit.energy) }; });
  assert.deepEqual(r.a, ["2026-10-25", "on", 7, "2026-10-25"]);
  assert.deepEqual(r.f, ["", "on", 7]);
  assert.equal(r.k, "2026-11-02"); assert.ok(r.same, "stable across a save and a load (nothing drifts on sync)");
});

test("F-11: the entries in force on a date follow the switches and the first days", async () => {
  const r = await ev(() => { const t = todayISO(), E = { ...FIT().energy, calMode: "v2", calManual: null, netKcal: "on", hrLearn: "on", neatMode: "on", bmr: "Auto", nutrCoverage: "on", oneSrc: "on" };
    for (const a of ALGO) E[a.from] = "";
    const all = algoAt(t, E).map(a => a.k); E.bmr = "Mifflin-St Jeor"; E.neatFrom = addDays(t, 3); E.oneSrc = "off"; const some = algoAt(t, E).map(a => a.k); return { all, some, later: algoAt(addDays(t, 3), E).map(a => a.k) }; });
  assert.deepEqual(r.all, ["cal", "net", "hr", "neat", "bmr", "nutr", "one"]);
  assert.deepEqual(r.some, ["cal", "net", "hr", "nutr"]);
  assert.deepEqual(r.later, ["cal", "net", "hr", "neat", "nutr"]);
});

/* ---------- D3: How it is calculated ---------- */
test("D3: off by default (a feature you switch on), then a Settings group that starts closed", async () => {
  await app.page.setViewportSize(H.VIEWPORTS.phone);
  const r = await ev(() => { delete S.settings.feat; UI.setOpen = {}; const off = { feat: FEAT("explain"), grp: VIEWS.settings().includes('data-grp="explain"'), sw: /aria-checked="false" data-act="feat-toggle" data-k="explain"/.test(featCard()) };
    S.settings.feat = { explain: true }; const html = VIEWS.settings(), m = html.match(/<details class="set-grp" data-grp="explain"[^>]*>/); return { off, on: FEAT("explain"), tag: m && m[0], others: FEAT("journal") }; });
  await app.page.setViewportSize(H.VIEWPORTS.desktop);
  assert.deepEqual(r.off, { feat: false, grp: false, sw: true });
  assert.equal(r.on, true); assert.equal(r.others, true, "the other features keep being on by default");
  assert.ok(r.tag && !/open/.test(r.tag), r.tag);
});

test("D3: the steps show the engine's own numbers, each once; the BMR formula written with today's inputs gives the BMR; a copy of a session says where it is counted", async () => {
  await day({ today: true });
  const r = await ev(() => { UI.fold = { explain: { ["Algorithm set v" + ALGO_VERSION]: true, "Where the data come from": true } }; const d = document.createElement("div"); d.innerHTML = explainHTML(); UI.fold = {}; const txt = [...d.querySelectorAll(".t,.s,.end,.flabel")].map(e => e.textContent).join(" | ").replace(/\s+/g, " "), x = energyAt(todayISO());
    const bmrLine = [...d.querySelectorAll(".lrow")].find(l => /Resting energy/.test(l.textContent)).querySelector(".s").textContent;
    const count = v => (txt.match(new RegExp("(?<![\\d,.])" + fmtN(v).replace(/,/g, ",") + "(?![\\d,.])", "g")) || []).length;
    return { counts: [x.bmr, x.neat, x.eat, x.tef, x.tdee].map(count), eat: x.eat, formula: bmrLine.split("·")[1].replace(/kg|cm|y|m\b/g, "").replace(/×/g, "*").replace(/−/g, "-"), bmr: x.bmr, dup: /same session as Running 50′ at 09:00: counted there, once/.test(txt), vers: d.querySelectorAll(".card.ex")[1].querySelectorAll(".lrow").length, pills: [...d.querySelectorAll(".card.ex")[1].querySelectorAll(".pill")].map(p => p.textContent) }; });
  assert.deepEqual(r.counts, [1, 1, 1, 1, 1], "BMR, NEAT, EAT, TEF and TDEE once each");
  assert.equal(r.eat, 838);
  assert.ok(Math.abs(Function(`return ${r.formula}`)() - r.bmr) < 0.5, `${r.formula} vs ${r.bmr}`);
  assert.ok(r.dup, "the copy row says where it is counted");
  assert.equal(r.vers, 7); assert.deepEqual(r.pills, ["In use", "In use", "In use", "In use", "Off", "In use", "In use"]);
});

test("D3: with the explanation open the app starts without errors and Settings shows it", async () => {
  await ev(() => { S.settings.feat = { explain: true }; UI.setOpen = { explain: true }; UI.setSel = "explain"; UI.tab = "settings"; render(); });
  const r = await ev(() => ({ pane: !!document.querySelector(".set-pane .card.ex"), h: document.querySelector(".set-pane-h h2")?.textContent }));
  assert.deepEqual(r, { pane: true, h: "How it is calculated" });
  assert.deepEqual(app.errors, []);
});
