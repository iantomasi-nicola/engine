/* M7a2 / P1: the AEE in the shadow — an independent estimate beside the one in use. It never feeds a target (tested).
   Expected numbers are recomputed here from the textbook equations (ACSM walking/running, 5 kcal per litre of O2). */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let app;
test.afterEach(async () => { await app?.close(); app = null; });
const start = async () => { const seed = F.seed({ withPlan: false }); seed.settings.fit.profile = { sex: "Male", dob: "", height: 180, startWeight: 80, bf: null, maxHr: null }; app = await H.startApp({ dir: H.build(H.tmp("aee-build")), seed }); return app.page; };
const near = (a, b, eps) => assert.ok(Math.abs(a - b) <= eps, `${a} vs ${b}`);
const setup = `(() => { const t = todayISO(); FIT().profile.dob = addDays(t, -Math.round(30.4 * 365.25)); S.logm = {}; DATA_V++; })()`;
const day = (d, o) => `(() => { const m = "${d}".slice(0, 7); S.logm[m] = S.logm[m] || { days: {} }; S.logm[m].days["${d}"] = Object.assign(S.logm[m].days["${d}"] || {}, ${JSON.stringify(o)}); DATA_V++; })()`;

test("EAT candidates: running by the ACSM equation, the device value made net, the generic MET; the best available is chosen and the others kept", async () => {
  const page = await start();
  const r = await page.evaluate(([setup]) => { eval(setup); const t = todayISO(), kg = trendAt(t), rest = energyAt(t).bmr / 1440;
    const w = { sport: "Running", min: 50, km: 8, elev: 84.6, hr: 150, kcal: 620, src: "intervals", ext: "icu-a-1", int: "Moderate", dev: "polar" };
    const c = eatCandidates(w, t); return { kg, rest, c, chosen: c[0].m }; }, [setup]);
  const v = 8000 / 50, grade = 84.6 / 8000, vo2 = 0.2 * v + 0.9 * v * grade, acsm = vo2 * 80 * 50 / 1000 * 5;
  const by = m => r.c.find(x => x.m === m);
  assert.equal(r.chosen, "acsm"); near(by("acsm").kcal, acsm, 0.6); assert.equal(by("acsm").q, "high");
  near(by("device").kcal, 620 - r.rest * 50, 0.6); near(by("device").kcal, 620 - 1780 / 1440 * 50, 0.6);
  assert.ok(by("met") && by("hr"), "generic and heart-rate candidates are listed for comparison"); assert.ok(by("device").q === "medium");
});

test("EAT candidates: without distance a run falls back to the device value (net), a calisthenics session never trusts heart rate", async () => {
  const page = await start();
  const r = await page.evaluate(([setup]) => { eval(setup); const t = todayISO();
    return { run: eatCandidates({ sport: "Running", min: 40, kcal: 500, src: "intervals", ext: "icu-a-2", int: "Moderate" }, t).map(x => x.m), cal: eatCandidates({ sport: "Calisthenics", min: 45, hr: 120, kcal: 300, src: "intervals", ext: "icu-a-3", int: "Moderate" }, t).map(x => x.m), planned: eatCandidates({ sport: "Cycling", min: 60, int: "Moderate" }, t).map(x => x.m) }; }, [setup]);
  assert.deepEqual(r.run, ["device", "met"]);
  assert.equal(r.cal[0], "device"); assert.ok(!r.cal.includes("hr"), "wrist heart rate is not used for calisthenics");
  assert.deepEqual(r.planned, ["met"]);
});

test("a sensor that reports net calories is not reduced again; unknown is shown as low confidence", async () => {
  const page = await start();
  const r = await page.evaluate(([setup]) => { eval(setup); const t = todayISO(); devById("zepp").kcal = "net"; devById("polar").kcal = "unknown";
    const d = w => eatCandidates({ sport: "Cycling", min: 60, kcal: 400, src: "intervals", ext: "icu-a-4", ...w }, t).find(x => x.m === "device");
    return { net: d({ dev: "zepp" }), unknown: d({ dev: "polar" }) }; }, [setup]);
  assert.equal(r.net.kcal, 400); assert.equal(r.net.q, "medium"); assert.ok(r.unknown.kcal < 400); assert.equal(r.unknown.q, "low");
});

test("NEAT from steps: net walking cost 0.5 kcal per kg per km with a stride of 0.415 x height; missing steps are unknown, not zero", async () => {
  const page = await start(), t = new Date().toISOString().slice(0, 10);
  const r = await page.evaluate(async ([setup, d]) => { eval(setup); eval(`(() => { const m = "${d}".slice(0, 7); S.logm[m] = { days: { "${d}": { steps: 10000 } } }; DATA_V++; })()`);
    const a = aeeShadow(d), kg = trendAt(d), none = aeeShadow(addDays(d, -1)); return { a, kg, none }; }, [setup, t]);
  near(r.a.neat.observed, 0.5 * r.kg * 10000 * 0.415 * 1.8 / 1000, 0.5); near(r.a.neat.observed, 0.5 * 80 * 7.47, 0.6);
  assert.equal(r.a.neat.src, "steps"); assert.equal(r.none.neat.total, null); assert.equal(r.none.aee, null);
});

test("no double counting: on a day with a run the step count is not turned into NEAT; the typical no-workout day stands in, flagged", async () => {
  const page = await start(), t = new Date().toISOString().slice(0, 10);
  const r = await page.evaluate(async ([setup, d]) => { eval(setup);
    for (let i = 1; i <= 5; i++) eval(`(() => { const d = addDays("${d}", -${i}), m = d.slice(0, 7); S.logm[m] = S.logm[m] || { days: {} }; S.logm[m].days[d] = { steps: 8000 }; DATA_V++; })()`);
    eval(`(() => { const m = "${d}".slice(0, 7); S.logm[m] = S.logm[m] || { days: {} }; S.logm[m].days["${d}"] = { steps: 17000, workouts: [{ sport: "Running", min: 50, km: 8, kcal: 620, src: "intervals", ext: "icu-a-9", int: "Moderate" }] }; DATA_V++; })()`);
    const a = aeeShadow(d), plain = aeeShadow(addDays(d, -1)); return { a, plain }; }, [setup, t]);
  assert.equal(r.a.neat.src, "borrowed"); assert.equal(r.a.neat.q, "low"); near(r.a.neat.observed, r.plain.neat.observed, 0.01);
});

test("the non-step part of NEAT is learned from the days you typed your watch figure, only with enough days; before that it is 'not modelled' and says so", async () => {
  const page = await start(), t = new Date().toISOString().slice(0, 10);
  const r = await page.evaluate(async ([setup, d]) => { eval(setup);
    const few = neatBase(); // no history
    for (let i = 1; i <= 20; i++) eval(`(() => { const d = addDays("${d}", -${i}), m = d.slice(0, 7); S.logm[m] = S.logm[m] || { days: {} }; S.logm[m].days[d] = { steps: 9000, watch: 520, weight: 80 }; DATA_V++; })()`);
    const many = neatBase(), stepsPart = 0.5 * 80 * 9000 * 0.415 * 1.8 / 1000;
    return { few, many, stepsPart, shadow: aeeShadow(addDays(d, -1)).neat }; }, [setup, t]);
  assert.equal(r.few, null); assert.ok(r.many.kcal > 0 && r.many.n >= 14); near(r.many.kcal, 520 - r.stepsPart, 40);
  assert.equal(r.shadow.modelled, true);
});

test("the backtest compares the shadow with the figure in use on days that have both, and reports bias, spread and how many days", async () => {
  const page = await start(), t = new Date().toISOString().slice(0, 10);
  const r = await page.evaluate(async ([setup, d]) => { eval(setup);
    for (let i = 1; i <= 20; i++) eval(`(() => { const d = addDays("${d}", -${i}), m = d.slice(0, 7); S.logm[m] = S.logm[m] || { days: {} }; S.logm[m].days[d] = { steps: 6000 + ${i} * 100, watch: 450 + ${i} * 5, weight: 80 }; DATA_V++; })()`);
    return aeeBacktest(30); }, [setup, t]);
  assert.ok(r.n >= 10); assert.ok(isFinite(r.bias) && isFinite(r.mae) && r.mae >= Math.abs(r.bias) - 1e-9);
});

test("the shadow never feeds a target: figures and targets are identical before and after it is computed or its card is drawn", async () => {
  const page = await start(), t = new Date().toISOString().slice(0, 10);
  const r = await page.evaluate(async ([setup, d]) => { eval(setup);
    eval(`(() => { const m = "${d}".slice(0, 7); S.logm[m] = S.logm[m] || { days: {} }; S.logm[m].days["${d}"] = { steps: 9000, workouts: [{ sport: "Running", min: 40, km: 6, kcal: 450, src: "intervals", ext: "icu-a-5", int: "Moderate" }] }; DATA_V++; })()`);
    const pick = () => { const x = energyAt(d); return JSON.stringify([x.bmr, x.neat, x.eat, x.tef, x.tdee, x.target, targetsFor(d).kcal]); };
    const before = pick(); aeeShadow(d); aeeBacktest(30); const card = aeeShadowCard(); return { before, after: pick(), card: /not used for your targets/i.test(card) }; }, [setup, t]);
  assert.equal(r.after, r.before); assert.equal(r.card, true);
});

test("the shadow card opens in Progress > Energy and fits a phone", async () => {
  const page = await start(), t = new Date().toISOString().slice(0, 10);
  const r = await page.evaluate(async ([setup, d]) => { eval(setup);
    for (let i = 0; i <= 8; i++) eval(`(() => { const d = addDays("${d}", -${i}), m = d.slice(0, 7); S.logm[m] = S.logm[m] || { days: {} }; S.logm[m].days[d] = { steps: 7000 + ${i} * 300, watch: 480 + ${i} * 4, weight: 80, workouts: ${i % 3 === 0 ? `[{ sport: "Running", min: 40, km: 6, kcal: 450, src: "intervals", ext: "icu-a-${"${i}"}", int: "Moderate" }]` : "[]"} }; DATA_V++; })()`);
    UI.tab = "progress"; UI.progSeg = "energy"; UI.fold = { energy: { "AEE in the shadow": true } }; scheduleRender(); await new Promise(r => setTimeout(r, 500));
    const el = document.querySelector(".aee-shadow"); return { has: !!el, sw: document.documentElement.scrollWidth <= innerWidth, rows: el ? el.querySelectorAll("tbody tr").length : 0 }; }, [setup, t]);
  assert.ok(r.has && r.sw && r.rows >= 5, JSON.stringify(r)); assert.deepEqual(app.errors, []);
  await page.screenshot({ path: require("path").join(process.env.ENGINE_SHOTS || require("os").tmpdir(), "aee-shadow.png") });
});
