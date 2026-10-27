/* R4 (audit area 9, docs/review/area09-progress.md): defects of Progress, reports, charts and the Check-in input. Synthetic data only; the expected values are worked out by hand in each test. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let dir, app;
test.before(async () => { dir = H.build(H.tmp("r4-progress")); });
test.afterEach(async () => { await app?.close(); app = null; });
const start = async (seed = F.seed({ withPlan: false }), viewport = H.VIEWPORTS.phone) => { app = await H.startApp({ dir, seed, viewport }); return app.page; };
const dom = html => `(() => { const d = document.createElement("div"); d.innerHTML = ${JSON.stringify(html)}; return d; })()`;

/* GRAVE 1 -- a huge number in a Check-in field must not block the charts.
   Limits (plausible for one person in one day): kcal and watch 20 000, carbs/protein/fat 2 000 g, steps 100 000, sleep 24 h, nap 1 440 min, HRV 500 ms, resting HR 300 bpm.
   20 000 kcal typed -> saved; 20 001 -> refused (toast, nothing stored); 3e8 -> refused.
   kcalChart top 3e8 * 1.05: axisTicks(0, 3.15e8, 4, true) has raw 7.875e7 -> mantissa 7.875 -> step 10 * 1e7 = 1e8 -> ticks 0, 1e8, 2e8, 3e8 (4 lines, never millions of them). */
test("a value above the limit is refused at the Check-in field and not stored; one inside is stored", async () => {
  const page = await start();
  const r = await page.evaluate(() => {
    const d = todayISO(), el = k => ({ dataset: { k } }), get = k => (logGet(d) || {})[k];
    openSheet("checkin", { date: d, live: true });
    CHG.ci("20000", el("kcal")); const ok = get("kcal");
    CHG.ci("20001", el("kcal")); const kept = get("kcal");
    CHG.ci("300000000", el("p")); const p = get("p");
    CHG.ci("100000", el("steps")); const st = get("steps");
    CHG.ci("100001", el("steps")); const st2 = get("steps");
    CHG.ci("-5", el("c")); const c = get("c");
    CHG.ci("25", el("sleep")); const sl = get("sleep");
    CHG.ci("", el("kcal")); const cleared = get("kcal");
    return { ok, kept, p, st, st2, c, sl, cleared };
  });
  assert.deepEqual(r, { ok: 20000, kept: 20000, p: undefined, st: 100000, st2: 100000, c: undefined, sl: undefined, cleared: undefined });
  assert.deepEqual(app.errors, []);
});

test("stored numbers above the limit (a file, a sync, an old copy) are dropped on load; unlimited fields are kept", async () => {
  const page = await start();
  const r = await page.evaluate(() => cleanLogDay({ kcal: 3e8, p: "2e9", c: 150, steps: 1e12, rhr: 60, weight: 80, notes: "x", hrv: -1 }));
  assert.deepEqual(r, { c: 150, rhr: 60, weight: 80, notes: "x" });
});

test("kcalChart and proteinChart draw a fixed, small number of gridlines whatever the maximum", async () => {
  const page = await start();
  const r = await page.evaluate(() => {
    const T = { kcal: 2400, p: 150, c: 250, f: 70 };
    const rows = v => [0, 1, 2].map(i => ({ d: addDays(todayISO(), i - 2), T, has: true, tot: { kcal: i === 2 ? v : 2300, p: i === 2 ? v / 10 : 140, c: 0, f: 0 } }));
    const lines = html => (html.match(/class="gl"/g) || []).length;
    const out = {};
    for (const v of [2500, 300000, 3e8, 2e9]) { const t0 = performance.now(); const a = kcalChart(rows(v)), b = proteinChart(rows(v), 80); out[v] = { k: lines(a), p: lines(b), size: a.length + b.length, ms: performance.now() - t0 }; }
    out.normal = [...new DOMParser().parseFromString(kcalChart(rows(2500)), "text/html").querySelectorAll("svg text")].map(t => t.textContent).slice(0, 4);
    return out;
  });
  for (const v of [2500, 300000, 3e8, 2e9]) { assert.ok(r[v].k >= 3 && r[v].k <= 8, v + " kcal lines " + r[v].k); assert.ok(r[v].p >= 3 && r[v].p <= 8, v + " protein lines " + r[v].p); assert.ok(r[v].size < 40000 && r[v].ms < 200, v + " " + r[v].size + " bytes " + r[v].ms + " ms"); }
  // a normal day keeps the round labels it had: 0, 1k, 2k, 3k (top 2500 * 1.05 = 2625 -> step 500 -> max 3000 -> redrawn on 4 intervals as 0, 1k, 2k, 3k)
  assert.deepEqual(r.normal, ["0", "1k", "2k", "3k"]);
});

/* GRAVE 2 -- a weight goal ABOVE the current weight (bulk): the Goal card says direction and kg, with no kcal claim (no approved gain formula), never a negative number.
   Trend 80 kg (a flat 80 kg for 14 days), goal 85 kg in 60 days:
     kg to go = |80 - 85| = 5; the pace needed = 5 kg / (60 / 7 weeks) = 0.583 -> «0.6 kg/week»; the verdict names the date.
   Goal 75 kg (loss) keeps the card it had: «5 kg» «to go», «kcal needed». Goal 80.1 kg: inside 0.2 kg -> «Reached», «Goal already reached.» */
const goalCard = async (page, goal) => page.evaluate(g => {
  const t = todayISO(); for (let i = 0; i < 14; i++) mutateLog(addDays(t, -i), d => { d.weight = 80; });
  FIT().goal = { type: "weight", value: g.value, date: g.days ? addDays(t, g.days) : "", leanShare: 0.1 }; FIT().phases = [{ start: addDays(t, -30), phase: g.phase || "Maintenance", kcal: 0 }]; DATA_V++;
  const d = document.createElement("div"); d.innerHTML = overviewView(); const c = d.querySelector(".card.goal");
  const tx = e => e.innerHTML.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return { text: tx(c), kpis: [...c.querySelectorAll(".stat")].map(tx), date: addDays(t, g.days || 0), G: (({ dir, toLose, energy }) => ({ dir, toLose, energy }))(goalState()) };
}, goal);

test("goal above the current weight: «5 kg to gain», no kcal claim, no negative number, the pace needed for the date", async () => {
  const page = await start();
  const r = await goalCard(page, { value: 85, days: 60, phase: "Bulk" });
  assert.equal(r.G.dir, "gain"); assert.equal(r.G.energy, null);
  assert.match(r.kpis[0], /^5 kg to gain$/); assert.equal(r.kpis.length, 2);
  assert.ok(!/kcal needed|−|-\d|0k|no deficit|already reached/i.test(r.text), r.text);
  assert.match(r.text, /To gain 5 kg by [^.]+ you need about 0\.6 kg\/week\./);
  assert.deepEqual(app.errors, []);
});

test("goal below the current weight keeps its card; a goal inside 0.2 kg is reached", async () => {
  const page = await start();
  const lose = await goalCard(page, { value: 75, days: 60, phase: "Cut" });
  assert.equal(lose.G.dir, "lose"); assert.match(lose.kpis[0], /^5 kg to go/); assert.ok(lose.kpis.some(k => /kcal needed/.test(k)), lose.text); assert.equal(lose.kpis.length, 3);
  const done = await goalCard(page, { value: 80.1, days: 60 });
  assert.equal(done.G.dir, "reached"); assert.match(done.text, /Reached/); assert.match(done.text, /Goal already reached\./);
});

/* MEDIO 4 -- a phase name the app does not know (a backup or a sync from another version: «Recomp») counts as Maintenance everywhere; Overview, Reports and the weekly table still draw. */
test("an unknown phase name falls back to Maintenance in the weekly table, the coaching, Overview and Reports", async () => {
  const page = await start();
  const r = await page.evaluate(() => {
    const t = todayISO(); for (let i = 0; i < 30; i++) mutateLog(addDays(t, -i), d => { d.weight = 80 + (i % 3) * .1; d.kcal = 2300; d.p = 140; d.c = 250; d.f = 70; });
    FIT().phases = [{ start: addDays(t, -40), phase: "Recomp", kcal: 0 }]; DATA_V++;
    const out = { phase: phaseFor(t).phase, rows: weeklyTable().map(w => w.phase), coach: typeof coaching().summary };
    try { overviewView(); UI.dashSeg = "week"; UI.repOff = 0; reportsView(); out.draw = "ok"; } catch (e) { out.draw = e.message; }
    return out;
  });
  assert.equal(r.phase, "Maintenance"); assert.ok(r.rows.length >= 4 && r.rows.every(p => p === "Maintenance"), r.rows.join()); assert.equal(r.coach, "string");
  assert.equal(r.draw, "ok"); assert.deepEqual(app.errors, []);
});

/* MEDIO 5 (F-09, null is not 0) -- Nutrition > Intake on days where only the calories were typed: protein, carbs and fat are UNKNOWN, not 0.
   7 days with kcal 2300 and no macro -> avg kcal 2,300; g protein per kg «—» (not «0.0»); Carbs / Protein / Fat «—» (not «0 g»); no donut («100% Carbs» was a rounding artefact).
   Add 3 days with p 150, c 250, f 70 (2,300 kcal: 600 + 1000 + 630 = 2230): the averages come from those 3 days only (150 / 250 / 70), the donut returns: carbs 1000/2230 = 44.8 %, protein 26.9 %, fat 28.3 % -> 45 / 27 / 28. */
const statsText = async page => page.evaluate(() => { UI.statsRange = 7; UI.statsBasis = "eaten"; const d = document.createElement("div"); d.innerHTML = VIEWS.stats(true); return { text: d.innerHTML.replace(/<[^>]+>/g, " ").replace(/\s+/g, " "), donut: !!d.querySelector('svg[aria-label="Calorie split"]') }; });
test("Intake: days with only calories show unknown macros, no zeros and no donut; days with macros come back", async () => {
  const page = await start();
  await page.evaluate(() => { const t = todayISO(); for (let i = 0; i < 7; i++) mutateLog(addDays(t, -i), d => { d.kcal = 2300; }); });
  const a = await statsText(page);
  assert.match(a.text, /2,?300/); assert.ok(!/0\.0 /.test(a.text) && !/\b0 g\b/.test(a.text) && !/100%/.test(a.text), a.text); assert.equal(a.donut, false);
  assert.match(a.text, /— g protein per kg/);
  await page.evaluate(() => { const t = todayISO(); for (let i = 0; i < 3; i++) mutateLog(addDays(t, -i), d => { d.p = 150; d.c = 250; d.f = 70; }); });
  const b = await statsText(page);
  assert.equal(b.donut, true); assert.match(b.text, /45%.*Carbs|Carbs.*45%/); assert.match(b.text, /150 g/);
  assert.deepEqual(app.errors, []);
});

/* MEDIO 6 -- g protein per kg uses the trend weight, the same as the card under it, not S.settings.weight (stale: only the weigh-in sheet and onboarding update it).
   settings.weight 99, weigh-ins a flat 81.5 kg for 14 days -> trend 81.5; protein 150 g a day: 150 / 81.5 = 1.84 -> «1.8» (with 99 it was 1.5). */
test("Intake: g protein per kg is divided by the trend weight, like the card below", async () => {
  const page = await start();
  const r = await page.evaluate(() => {
    S.settings.weight = 99; const t = todayISO(); for (let i = 0; i < 14; i++) mutateLog(addDays(t, -i), d => { d.weight = 81.5; d.kcal = 2400; d.p = 150; d.c = 250; d.f = 70; });
    UI.statsRange = 7; UI.statsBasis = "eaten"; const d = document.createElement("div"); d.innerHTML = VIEWS.stats(true) + macroGkg();
    return { trend: trendNow(), stat: d.querySelector(".stat b").textContent === "—" ? "—" : [...d.querySelectorAll(".stat")].find(s => /protein per kg/.test(s.textContent)).querySelector("b").textContent, card: d.querySelector(".gkg").textContent.replace(/\s+/g, " ") };
  });
  assert.equal(r.trend, 81.5); assert.equal(r.stat, "1.8"); assert.match(r.card, /Protein[\d.]+ → 1\.8/);
});

/* MEDIO 10 -- the PMC chart with only FUTURE workouts logged (a wrong date, an import): fitness starts at the first workout up to today, so with none it says so instead of throwing.
   One workout tomorrow -> «Log a few sessions…»; add one 3 days ago -> the chart draws and today's row exists. */
test("pmcChart with only a future workout shows the empty note; with a past one it draws", async () => {
  const page = await start();
  const a = await page.evaluate(() => {
    const t = todayISO(); mutateLog(addDays(t, 1), d => { d.workouts = [{ sport: "Run", min: 40, km: 8 }]; }); DATA_V++;
    try { return { html: pmcChart(), now: fitnessNow() }; } catch (e) { return { err: e.message }; }
  });
  assert.equal(a.err, undefined); assert.match(a.html, /Log a few sessions/); assert.equal(a.now, null);
  const b = await page.evaluate(() => { const t = todayISO(); mutateLog(addDays(t, -3), d => { d.workouts = [{ sport: "Run", min: 40, km: 8 }]; }); DATA_V++;
    try { return { svg: pmcChart().includes("<svg"), ctl: fitnessNow().ctl > 0 }; } catch (e) { return { err: e.message }; } });
  assert.deepEqual(b, { svg: true, ctl: true });
});

/* MEDIO 11 -- the Journal AI summary belongs to the period it was made for: another month, another range or a request that ends after you moved on never shows under a different heading.
   Month, this month: summary «A» shown. Earlier (month -1): no summary, the button offers a new one. Back to this month: «A» again. A request started in month -1 that ends in month 0 is stored for month -1 only. */
test("Journal: the AI summary is shown only for the period it was made for", async () => {
  const page = await start();
  const r = await page.evaluate(async () => {
    S.settings.jr = { ...(S.settings.jr || {}), ai: true }; Sync.sample = async () => ({ text: "A" });
    for (const d of [todayISO(), jrPeriod("month", -1).a]) { jrSet(d, "m", 4); jrSet(d, "e", 3); jrSet(d, "p", 3); jrSet(d, "s", 2); }
    const has = () => { const d = document.createElement("div"); d.innerHTML = journalView(); return d.textContent.includes("Generated by AI") ? d.querySelector(".pill + div").textContent : ""; };
    UI.jrRange = "month"; UI.jrOff = 0; await ACT["jr-ai"](); const here = has();
    UI.jrOff = -1; const earlier = has();
    UI.jrOff = 0; const back = has();
    UI.jrRange = "week"; const week = has();
    UI.jrRange = "month"; UI.jrOff = -1; let late; Sync.sample = () => new Promise(ok => { late = ok; }); const p = ACT["jr-ai"](); UI.jrOff = 0; late({ text: "B" }); await p; const afterMove = has();
    UI.jrOff = -1; const where = has();
    return { here, earlier, back, week, afterMove, where };
  });
  assert.deepEqual(r, { here: "A", earlier: "", back: "A", week: "", afterMove: "A", where: "B" });
});
