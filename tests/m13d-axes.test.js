/* M13d, residual defects 1-3: round y-axis ticks on every chart, one grid for the calculator fields, the calendar's wide layout. Synthetic data only. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let dir, app;
test.before(async () => { dir = H.build(H.tmp("m13d-axes-build")); });
test.afterEach(async () => { await app?.close(); app = null; });
const start = async viewport => { app = await H.startApp({ dir, seed: F.seed({ withPlan: true }), viewport }); return app.page; };
const wide = { width: 1920, height: 1080 };

test("axisTicks: round values (1, 2, 5 x 10^k) inside the range, equally spaced, never repeated", async () => {
  const page = await start(H.VIEWPORTS.phone);
  const r = await page.evaluate(() => ({
    // 2241..2379, about 4 intervals: raw step 34.5 -> mantissa 3.45 -> 5 x 10 = 50; first multiple of 50 above 2241 is 2250, last below 2379 is 2350
    kcal: axisTicks(2241, 2379, 4),
    // 0..10 whole numbers: raw 2.5 -> mantissa 2.5 -> 2: 0,2,4,6,8,10
    ten: axisTicks(0, 10, 4, true),
    // 0..2.5 whole numbers: raw .625 -> .5, but whole numbers only -> step 1: 0,1,2
    small: axisTicks(0, 2.5, 4, true),
    // -0.5..0.5, 3 intervals: raw .333 -> mantissa 3.33 -> 5 x .1 = .5: -.5, 0, .5 (no float noise)
    sym: axisTicks(-0.5, 0.5, 3),
    // 0..1 in tenths: 0, .1, ... 1 with no 0.30000000000000004
    tenths: axisTicks(0, 1, 10),
    // 70.2..70.9: raw .175 -> mantissa 1.75 -> 2 x .1 = .2: 70.2, 70.4, 70.6, 70.8
    kg: axisTicks(70.2, 70.9, 4),
    flat: axisTicks(5, 5, 4), none: axisTicks(3.2, 3.8, 4, true) }));
  assert.deepEqual(r.kcal, [2250, 2300, 2350]); assert.deepEqual(r.ten, [0, 2, 4, 6, 8, 10]); assert.deepEqual(r.small, [0, 1, 2]);
  assert.deepEqual(r.sym, [-0.5, 0, 0.5]); assert.deepEqual(r.tenths, [0, .1, .2, .3, .4, .5, .6, .7, .8, .9, 1]); assert.deepEqual(r.kg, [70.2, 70.4, 70.6, 70.8]);
  assert.deepEqual(r.flat, [5]); assert.deepEqual(r.none, [3.2, 3.8]);
  assert.deepEqual(app.errors, []);
});

/* every chart: the y labels are whole steps, equally spaced on screen and in value, and none repeats */
test("Energy and the other charts: y labels are unique, equally spaced and round", async () => {
  for (const vp of [H.VIEWPORTS.phone, H.VIEWPORTS.desktop]) {
    const page = await start(vp);
    const r = await page.evaluate(() => {
      const num = s => { const m = /^([+−-])?([\d.,]+)(k)?(?: kg)?$/.exec(s.trim()); if (!m) return NaN; const v = parseFloat(m[2].replace(/,/g, "")) * (m[3] ? 1000 : 1); return m[1] === "−" || m[1] === "-" ? -v : v; };
      const axis = html => { const d = document.createElement("div"); d.innerHTML = html; const out = [];
        for (const svg of d.querySelectorAll("svg.chart")) { const gl = [...svg.querySelectorAll("line.gl")].map(l => +l.getAttribute("y1")), tx = [...svg.querySelectorAll("text[text-anchor=end]")].filter(t => +t.getAttribute("x") < 60 && /^[+−-]?[\d.,]+k?(?: kg)?$/.test(t.textContent.trim()));
          out.push(tx.map(t => ({ s: t.textContent.trim(), v: num(t.textContent), y: +t.getAttribute("y") })).concat([])); }
        return out; };
      const t = todayISO(), mk = t.slice(0, 7); S.logm[mk] = S.logm[mk] || { month: mk, days: {} };
      const series = [
        [[t, 2241], [addDays(t, -3), 2379]], [[t, 2310], [addDays(t, -3), 2310]], [[t, 70.2], [addDays(t, -3), 70.9]], [[t, 1], [addDays(t, -9), 4]], [[t, 12], [addDays(t, -9), 14]]];
      const sc = series.map(p => axis(seriesChart([{ name: "a", color: "red", pts: p }], { fmt: v => fmtN(r0(v)), l: 48, minPad: 50 }))[0]);
      const sc1 = axis(seriesChart([{ name: "a", color: "red", pts: series[2] }], { fmt: v => r1(v) }))[0];
      const sc2 = axis(seriesChart([{ name: "a", color: "red", pts: series[3] }], { fmt: v => v.toFixed(2), minPad: .02 }))[0];
      const sc3 = axis(seriesChart([{ name: "a", color: "red", pts: series[4] }], { half: true, h: 160, fmt: v => r0(v), minPad: 1, int: true }))[0];
      UI.tab = "progress"; UI.progSeg = "overview"; render();
      const ov = [...document.querySelectorAll("#main svg.chart")].map(s => axis(s.outerHTML)[0]);
      return { sc, sc1, sc2, sc3, ov };
    });
    const check = (name, ax) => { if (!ax || ax.length < 2) return; const vs = ax.map(a => a.v), labs = ax.map(a => a.s); assert.equal(new Set(labs).size, labs.length, name + " repeats " + JSON.stringify(labs));
      const d = vs[1] - vs[0]; vs.forEach((v, i) => i && assert.ok(Math.abs(v - vs[i - 1] - d) < 1e-6 * Math.max(1, Math.abs(d)), name + " not equally spaced " + JSON.stringify(labs)));
      const ys = ax.map(a => a.y), dy = ys[1] - ys[0]; ys.forEach((y, i) => i && assert.ok(Math.abs(y - ys[i - 1] - dy) < 0.6, name + " labels not on an even grid " + JSON.stringify(ys)));
      const m = Math.abs(d), p = Math.pow(10, Math.floor(Math.log10(m))), mant = Math.round(m / p * 1000) / 1000; assert.ok([1, 2, 5, 10].includes(mant), name + " step " + d + " is not 1, 2 or 5 x 10^k"); };
    r.sc.forEach((a, i) => { assert.ok(a && a.length >= 3 && a.length <= 6, "seriesChart " + i + ": " + JSON.stringify(a)); check("seriesChart " + i, a); });
    check("kg", r.sc1); check("ratio", r.sc2); check("reps", r.sc3); r.ov.forEach((a, i) => check("overview " + i, a));
    await app.close(); app = null;
  }
});

/* the calendar fixture: today's meals, a run on each of the last 30 days, a planned run every other day over the next 11 days; then Train > Calendar > Month with today open */
const calFill = () => { const t = todayISO(), M = activeMeals(), fl = allFoods().filter(f => f.per && f.per.kcal > 0); let n = 0;
  M.forEach((m, mi) => { const its = []; for (let k = 0; k < 1 + mi % 3; k++) its.push(newItem("food", fl[(n++ * 7) % fl.length].id, defaultQty(fl[(n * 7) % fl.length]))); mutateDay(t, day => { day.meals[m.id] = its; }); });
  const put = (d, o) => { const mk = d.slice(0, 7); S.logm[mk] = S.logm[mk] || { month: mk, days: {} }; S.logm[mk].days[d] = Object.assign(S.logm[mk].days[d] || {}, o); };
  for (let i = 0; i < 30; i++) put(addDays(t, -i), { workouts: [{ sport: FIT().runSport, min: 30 + (i % 7) * 8, km: 5 + (i % 5), int: "Hard" }] });
  for (let i = 1; i < 12; i += 2) put(addDays(t, i), { planned: [{ sport: FIT().runSport, min: 45, km: 8, int: "Moderate", note: "Easy run " + i }] });
  DATA_V++; Object.assign(UI, { tab: "train", trainSeg: "cal", calView: "month", calOff: 0, calSel: t }); render(); };

/* Train › Calendar: below 1100 px nothing changes (totals in the line above the grid); from 1100 px the side column starts level with the grid, carries the day, its meals and the month's totals,
   ends close to the grid's bottom, and the totals are not shown twice */
test("Train calendar: side column fills the grid height on a PC, totals shown once, header on one line", async () => {
  const measure = async page => { await page.evaluate(calFill); await page.waitForTimeout(250);
    return page.evaluate(() => { const vis = el => !!el && getComputedStyle(el).display !== "none" && el.getBoundingClientRect().height > 0, box = s => document.querySelector(s)?.getBoundingClientRect(), g = box(".cv"), sd = box(".cv-side"), c = x => Math.round(x.top + x.height / 2);
      const head = [".cv-nav", ".cv-kpi .cv-tools", ".cv-top .subseg"].map(s => box(s)), counts = [...document.querySelectorAll(".cv-kpi .cv-mt")].filter(vis).length;
      return { gridTop: Math.round(g.top), sideTop: Math.round(sd.top), gridBottom: Math.round(g.bottom), sideBottom: Math.round(sd.bottom), month: vis(document.querySelector(".cv-month")), meals: vis(document.querySelector(".cv-meals")), counts, head: head.map(c), main: document.querySelector("#main").scrollWidth <= innerWidth }; }); };
  for (const vp of [H.VIEWPORTS.desktop, wide]) {
    const page = await start(vp), m = await measure(page);
    assert.equal(m.sideTop, m.gridTop, "side column level with the grid");
    assert.ok(m.month && m.meals, "month card and meals shown"); assert.equal(m.counts, 0, "totals not repeated above the grid"); assert.ok(Math.max(...m.head) - Math.min(...m.head) <= 2, "header on one line " + m.head);
    assert.deepEqual(app.errors, []); await app.close(); app = null;
  }
  for (const vp of [H.VIEWPORTS.tablet, H.VIEWPORTS.phone]) {
    const page = await start(vp), m = await measure(page);
    assert.ok(!m.month && !m.meals && m.counts >= 3, "tablet and phone keep the line of totals: " + JSON.stringify(m)); assert.ok(m.main);
    await app.close(); app = null;
  }
});

/* every calculator (on a phone the plate list is a text field and takes a row of its own): the fields of a card sit on one grid (same width, same top in a row), every unit label on the same axis inside its field, and no field is cut */
test("Tools calculators: fields on one grid (the plate list on a row of its own), unit labels on one axis, 1RM output on one right axis", async () => {
  for (const vp of [H.VIEWPORTS.phone, H.VIEWPORTS.tablet, H.VIEWPORTS.desktop, wide]) {
    const page = await start(vp);
    const r = await page.evaluate(async () => { const out = [], ids = CALCS.map(c => c.id); UI.tc = { rm: { w: "100.5", r: "12", b: "80.5", f: "Epley" } };
      for (const id of ids) { Object.assign(UI, { tab: "timer", toolSeg: "calc", toolOpen: id }); TMR.phase = "setup"; render(); await new Promise(x => setTimeout(x, 60));
        const g = document.querySelector(".tc-f"), f = [...g.children].map(e => e.getBoundingClientRect()), inp = [...g.querySelectorAll(".field:not(.tc-w) .unit-inp")].map(u => { const e = u.querySelector(".inp"), i = e.getBoundingClientRect(), s = u.querySelector("span"); return { w: Math.round(i.width), over: e.scrollWidth > e.clientWidth, gap: s ? Math.round((i.right - s.getBoundingClientRect().right) * 10) / 10 : null }; });
        const rows = [...new Set(f.map(q => Math.round(q.top)))].length; out.push({ id, n: f.length, rows, widths: [...new Set(inp.map(i => i.w))], gaps: [...new Set(inp.map(i => i.gap).filter(x => x != null))], over: inp.some(i => i.over), right: Math.round(g.getBoundingClientRect().right) - Math.round(Math.max(...f.map(q => q.right))) }); }
      Object.assign(UI, { toolOpen: "rm" }); render(); await new Promise(x => setTimeout(x, 60));
      const edge = el => Math.round(el.getBoundingClientRect().right), one = [...document.querySelectorAll(".tc-one .end")].map(edge), reps = [...document.querySelectorAll(".tc-reps > div > b")].map(edge);
      return { out, one: [...new Set(one)], reps: [...new Set(reps)] }; });
    for (const c of r.out) { const want = c.id === "plates" ? 2 : vp.width >= 560 ? 1 : c.n > 3 ? Math.ceil(c.n / 2) : 1; assert.equal(c.rows, want, `${vp.width}px ${c.id}: ${c.rows} rows`); assert.equal(c.widths.length, 1, `${vp.width}px ${c.id} widths ${c.widths}`); assert.ok(c.gaps.length <= 1, `${vp.width}px ${c.id} unit axis ${c.gaps}`); assert.ok(!c.over, `${vp.width}px ${c.id} input cut`); assert.ok(c.right >= 0 && c.right < 2, `${vp.width}px ${c.id} grid not filled: ${c.right}`); }
    assert.equal(r.one.length, 1, "formula list on one right edge"); assert.equal(r.reps.length, 1, "reps table on one right edge"); assert.equal(r.one[0], r.reps[0], "list and table share the right axis");
    assert.deepEqual(app.errors, []);
    await app.close(); app = null;
  }
});

/* ===== Design review, second round (findings 1-16). Synthetic data only ===== */
const box = s => `(document.querySelector(${JSON.stringify(s)}) || document.body).getBoundingClientRect()`;

/* Calendar › Month on a PC: the legend and the note sit under the grid, in the grid's column; the side column is at most 100 px taller than that column (3 next sessions, the open day with its meals, the month), shows at most three next sessions,
   its three cards share one title style and one padding, and the rows of «Meals» and «Next sessions» have the same height */
test("Calendar month on a PC: legend and note under the grid, side column at most 100 px taller than it, one title style, one row height", async () => {
  for (const vp of [H.VIEWPORTS.desktop, wide]) {
    const page = await start(vp); await page.evaluate(calFill); await page.waitForTimeout(250);
    const m = await page.evaluate(() => { const R = s => document.querySelector(s)?.getBoundingClientRect(), cs = (s, p) => { const e = document.querySelector(s); return e ? getComputedStyle(e)[p] : null; }, h = s => Math.round(R(s).height);
      const rows = s => [...document.querySelectorAll(s)].map(e => Math.round(e.getBoundingClientRect().height));
      return { main: R(".cv-split > .cv-main"), grid: R(".cv-main > .cv"), leg: R(".cv-main > .cv-leg"), note: R(".cv-main > .cv-note"), side: R(".cv-side"), next: document.querySelectorAll(".cv-next .lrow").length, nextRows: rows(".cv-next .lrow"), mealRows: rows(".cv-meals .lrow"),
        title: ["font-size", "font-weight"].map(p => [cs(".cv-day-h b", p), cs(".cv-month > .flabel", p), cs(".cv-next > .flabel", p)]), pad: ["padding-left", "padding-right", "padding-top"].map(p => [cs(".cv-day", p), cs(".cv-month", p), cs(".cv-next", p)]) }; });
    assert.ok(m.main && m.leg && m.note, "legend and note live in the grid's column"); assert.ok(m.leg.top >= m.grid.bottom - 1 && m.note.top >= m.leg.bottom - 1, "grid, then legend, then note"); assert.ok(Math.abs(m.leg.left - m.grid.left) < 1);
    assert.ok(m.side.height <= m.main.height + 100, `side column ${Math.round(m.side.height)} px vs grid column ${Math.round(m.main.height)} px`);
    assert.ok(m.next >= 1 && m.next <= 3, "next sessions: " + m.next);
    for (const t of m.title) assert.equal(new Set(t).size, 1, "one title style " + JSON.stringify(m.title)); for (const p of m.pad) assert.equal(new Set(p).size, 1, "one padding " + JSON.stringify(m.pad));
    assert.ok(m.nextRows.length && m.mealRows.length && Math.max(...m.nextRows, ...m.mealRows) - Math.min(...m.nextRows, ...m.mealRows) <= 1, "rows of one height " + [...m.nextRows, ...m.mealRows]);
    assert.deepEqual(app.errors, []); await app.close(); app = null;
  }
  for (const vp of [H.VIEWPORTS.tablet, H.VIEWPORTS.phone]) {
    const page = await start(vp); await page.evaluate(calFill); await page.waitForTimeout(250);
    const m = await page.evaluate(() => { const R = s => document.querySelector(s).getBoundingClientRect(); return { grid: R(".cv"), day: R(".cv-day"), leg: R(".cv-leg"), note: R(".cv-note") }; });
    assert.ok(m.day.top >= m.grid.bottom - 1 && m.leg.top >= m.day.bottom - 1 && m.note.top >= m.leg.bottom - 1, "grid, the open day, legend, note: " + JSON.stringify(m));
    await app.close(); app = null;
  }
});

/* Calendar › Week: the same header row as Month (nav left, segment at the same place on the right, intervals.icu as a header link with an icon, no card), the day list capped at 900 px,
   «/ planned» only when it differs from the done figure. Week -2 is all past and done (planned = done: 7 runs); in week -1 one more session was planned and not done: 7 done / 8 planned */
test("Calendar week on a PC: header row like Month, list capped, «/ x» only when different", async () => {
  for (const vp of [H.VIEWPORTS.desktop, wide]) {
    const page = await start(vp); await page.evaluate(calFill); await page.waitForTimeout(250);
    const seg = () => page.evaluate(() => { const r = document.querySelector(".cv-head .subseg")?.getBoundingClientRect(); return r ? [Math.round(r.left), Math.round(r.right), Math.round(r.top)] : null; });
    const month = await seg();
    await page.evaluate(() => { const t = todayISO(), ws = addDays(weekStartOf(t), -7), d = addDays(ws, 2), mk = d.slice(0, 7); S.logm[mk].days[d].planned = [{ sport: "Swimming", min: 40 }]; DATA_V++; Object.assign(UI, { calView: "week", planWk: -2 }); render(); });
    await page.waitForTimeout(200);
    const all = await page.evaluate(() => ({ kpi: [...document.querySelectorAll(".stat-grid.four .stat")].map(e => e.textContent.replace(/\s+/g, " ").trim()), list: document.querySelector(".pl-week").getBoundingClientRect().width, bar: !!document.querySelector(".sync-bar"), chip: !!document.querySelector(".cv-head .chip-a svg"), nav: !!document.querySelector(".cv-head .cv-nav"), card: document.querySelector(".cv-head .card") != null }));
    const week = await seg();
    assert.ok(Math.abs(week[0] - month[0]) <= 1 && week[1] === month[1] && week[2] === month[2], "the segment does not move between Month and Week: " + week + " vs " + month); assert.ok(all.nav && all.chip && !all.bar && !all.card, "header row, icon link, no sync card " + JSON.stringify(all));
    assert.ok(all.list <= 900, "day list capped: " + all.list); assert.ok(all.kpi.length === 4 && all.kpi.every(t => !t.includes("/")), "all done: no «/ x» " + all.kpi);
    await page.evaluate(() => { Object.assign(UI, { planWk: -1 }); render(); }); await page.waitForTimeout(150);
    const diff = await page.evaluate(() => [...document.querySelectorAll(".stat-grid.four .stat")].map(e => e.textContent.replace(/\s+/g, " ").trim()));
    assert.ok(/7\s*\/\s*8/.test(diff[0]), "7 done / 8 planned: " + diff[0]);
    assert.deepEqual(app.errors, []); await app.close(); app = null;
  }
});

/* Calendar › Agenda: an empty week has no totals line (0h00 · 0 sessions), only «Nothing this week»; the date and the phase pill are 8 px apart */
test("Calendar agenda: empty weeks show no zero totals, date and phase pill 8 px apart", async () => {
  const page = await start(H.VIEWPORTS.phone); await page.evaluate(calFill);
  await page.evaluate(() => { Object.assign(UI, { calView: "agenda", calOff: 1 }); render(); }); await page.waitForTimeout(200);
  const r = await page.evaluate(() => [...document.querySelectorAll(".cv-wk")].map(w => ({ empty: !!w.querySelector(".cv-empty.pad"), small: w.querySelector(".cv-wk-h small")?.textContent || "", gap: getComputedStyle(w.querySelector(".cv-wk-h b")).columnGap })));
  assert.ok(r.some(w => w.empty), "the fixture has an empty week"); for (const w of r) { if (w.empty) assert.ok(!/session|load|0h00/.test(w.small), "no zero totals in an empty week: " + w.small); assert.equal(w.gap, "8px"); }
  const full = await page.evaluate(() => { Object.assign(UI, { calOff: 0 }); render(); return [...document.querySelectorAll(".cv-wk")].filter(w => !w.querySelector(".cv-empty.pad")).map(w => w.querySelector(".cv-wk-h small")?.textContent || ""); });
  assert.ok(full.length && full.every(t => /sessions/.test(t)), "weeks with sessions keep their totals: " + full);
});

/* the intervals.icu link of the header has an icon like Route and Import (no coloured dot) */
test("Calendar header: the intervals.icu link has an icon, not a dot", async () => {
  const page = await start(H.VIEWPORTS.desktop); await page.evaluate(calFill);
  const r = await page.evaluate(() => { const b = document.querySelector(".cv-tools .chip-a"); return b && { svg: !!b.querySelector("svg"), dot: !!b.querySelector(".dot"), text: b.textContent.trim() }; });
  assert.deepEqual(r, { svg: true, dot: false, text: "Connect intervals.icu" });
});

/* Tools › Calculators (findings 2-7). Hand-worked values for 1RM = 100 kg x 5 reps, body weight 0:
   Epley 100(1+5/30) = 116.667; Brzycki 3600/32 = 112.5; Lombardi 100 x 5^0.1 = 117.462; O'Conner 100(1+0.125) = 112.5; Mayhew 10000/(52.2+41.9e^-0.275) = 10000/84.026 = 119.01; Wathan 10000/(48.8+53.8e^-0.375) = 10000/85.776 = 116.58.
   Mean = 115.78; lowest 112.5 (Brzycki and O'Conner), highest 119.0 (Mayhew). Loads start at 2 reps: 1 rep is the mean itself.
   Pace 10 km in 45:30 (2730 s): per km 4:33, per mile 4:33 x 1.609344 = 7:19, 13.19 km/h; the 10K row would repeat the typed time and is left out, the 5K, half and marathon rows stay.
   Relative strength: body 80 kg, +25 kg x 5: the row «For 5 reps» would repeat the input, 3 and 8 stay. Sweat: 82 kg -> 81 kg in 60 min, drank 300 ml: loss 1.3 L/h, 1/82 = 1.2%; drink 60-80% of 1300 ml = 780-1040 ml (to 10 ml).  */
const calcOpen = async (page, id, st) => page.evaluate(async ([id, st]) => { UI.tc = { [id]: st }; Object.assign(UI, { tab: "timer", toolSeg: "calc", toolOpen: id }); TMR.phase = "setup"; render(); await new Promise(x => setTimeout(x, 80)); }, [id, st]);

test("Calculators: 1RM output keeps each number once; the formula picker is a select; loads start at two reps", async () => {
  const page = await start(H.VIEWPORTS.phone); await calcOpen(page, "rm", { w: "100", r: "5", b: "", f: "Epley" });
  const r = await page.evaluate(() => ({ tops: [...document.querySelectorAll(".tc-out > .an-k")].map(e => e.textContent.replace(/\s+/g, " ").trim()), list: [...document.querySelectorAll(".tc-one .lrow")].map(e => e.textContent.replace(/\s+/g, " ").trim()),
    first: document.querySelector(".tc-reps > div > span")?.textContent, sel: document.querySelector('select[data-chg="calc-f"]')?.value, chips: document.querySelectorAll('[data-act="calc-f"]').length }));
  assert.deepEqual(r.tops, ["115.8 kgmean of the six formulas"]); assert.equal(r.first, "2 reps"); assert.equal(r.sel, "Epley"); assert.equal(r.chips, 0);
  assert.equal(r.list.length, 6); assert.deepEqual(r.list.map(t => /lowest|highest/.exec(t)?.[0] || ""), ["", "lowest", "", "lowest", "highest", ""]);
  await page.selectOption('select[data-chg="calc-f"]', "Brzycki"); await page.waitForTimeout(150);
  const two = await page.evaluate(() => ({ sel: document.querySelector('select[data-chg="calc-f"]').value, kg: document.querySelector(".tc-reps > div > b")?.textContent }));
  // Brzycki loads from the mean 115.78 at 2 reps: 115.78 x (37 - 2) / 36 = 112.56
  assert.deepEqual(two, { sel: "Brzycki", kg: "112.6 kg" });
  assert.deepEqual(app.errors, []);
});

test("Calculators: Pace and Relative strength do not repeat the typed values; Sweat does not claim false precision", async () => {
  const page = await start(H.VIEWPORTS.phone);
  await calcOpen(page, "pace", { d: "10", t: "45:30" });
  let r = await page.evaluate(() => ({ rows: [...document.querySelectorAll(".tc-pr > div:not(.hd)")].map(e => e.firstElementChild.textContent), head: [...document.querySelector(".tc-pr .hd").children].map(e => e.tagName), ks: [...document.querySelectorAll(".tc-out .an-k")].map(e => e.querySelector("b").textContent) }));
  assert.deepEqual(r.rows, ["5K", "Half marathon", "Marathon"]); assert.deepEqual(r.head, ["SPAN", "SPAN", "SPAN"]); assert.deepEqual(r.ks, ["4:33", "7:19", "13.2"]);
  await calcOpen(page, "pace", { d: "8", t: "36:00" });
  r = await page.evaluate(() => ({ rows: [...document.querySelectorAll(".tc-pr > div:not(.hd)")].map(e => e.firstElementChild.textContent) })); assert.deepEqual(r.rows, ["5K", "10K", "Half marathon", "Marathon"]);
  await calcOpen(page, "rel", { b: "80", k: "25", r: "5", x: "pull" });
  r = await page.evaluate(() => [...document.querySelectorAll(".tc-out .lrow .t")].map(e => e.textContent)); assert.deepEqual(r.filter(t => /^For/.test(t)), ["For 3 reps", "For 8 reps"]);
  await calcOpen(page, "sweat", { a: "82", z: "81", d: "300", m: "60" });
  r = await page.evaluate(() => [...document.querySelectorAll(".tc-out .lrow")].map(e => e.textContent.replace(/\s+/g, " ").trim()));
  assert.ok(r.some(t => /To drink per hour.*780–1,?040 ml/.test(t)), r.join(" | ")); assert.ok(r.some(t => /Body mass lost.*1\.2%/.test(t)), r.join(" | "));
});

/* layout of the calculators: Pace figures on one grid (three equal columns, one text alignment), the distance table on its own columns (no wrapped name), the plate list at least 60% of the card
   wide on every screen and never cut, subtitles not cut (two lines at most), the shortcut chips on one row with the button */
test("Calculators layout: pace figures, pace table, plates field, subtitles and chip rows", async () => {
  for (const vp of [H.VIEWPORTS.phone, H.VIEWPORTS.tablet, wide]) {
    const page = await start(vp);
    await calcOpen(page, "pace", { d: "8", t: "36:00" });
    const p = await page.evaluate(() => { const ks = [...document.querySelectorAll(".tc-out .an-k")].map(e => e.getBoundingClientRect()), al = [...document.querySelectorAll(".tc-out .an-k")].map(e => getComputedStyle(e).textAlign), line = e => parseFloat(getComputedStyle(e).lineHeight);
      const names = [...document.querySelectorAll(".tc-pr > div > span:first-child")].map(e => e.getBoundingClientRect().height / line(e)); return { tops: new Set(ks.map(k => Math.round(k.top))).size, widths: new Set(ks.map(k => Math.round(k.width))).size, al: new Set(al).size, n: ks.length, names: Math.max(...names) }; });
    assert.deepEqual([p.n, p.tops, p.widths, p.al], [3, 1, 1, 1], `${vp.width}px pace figures ${JSON.stringify(p)}`); assert.ok(p.names < 1.5, `${vp.width}px a distance name wraps (${p.names} lines)`);
    await calcOpen(page, "plates", { t: "100", bar: "20", p: "25, 20, 15, 10, 5, 2.5, 1.25" });
    const pl = await page.evaluate(() => { const i = document.querySelector("#tc-plates-p"), g = document.querySelector(".tc-f").getBoundingClientRect(); return { w: i.getBoundingClientRect().width, g: g.width, cut: i.scrollWidth > i.clientWidth }; });
    assert.ok(pl.w >= pl.g * .6 && !pl.cut, `${vp.width}px plate list ${Math.round(pl.w)} of ${Math.round(pl.g)} px, cut ${pl.cut}`);
    if (vp.width < 560) {
      const sub = await page.evaluate(() => { UI.toolOpen = null; render(); return [...document.querySelectorAll(".tools .rec-h small")].map(s => [s.textContent.slice(0, 24), s.scrollHeight - s.clientHeight, Math.round(s.getBoundingClientRect().height / parseFloat(getComputedStyle(s).lineHeight))]); });
      assert.ok(sub.length >= 9, "nine calculators listed"); for (const [t, over, lines] of sub) { assert.ok(over <= 1, `subtitle cut: ${t}`); assert.ok(lines <= 2, `subtitle over two lines: ${t}`); }
      for (const id of ["plates", "rel", "fuel", "pace", "rm"]) { await calcOpen(page, id, {});
        const rowsOf = await page.evaluate(() => { const r = document.querySelector(".tc-acts"); if (!r) return null; const ks = [...r.children].map(e => { const q = e.getBoundingClientRect(); return q.top + q.height / 2; }); return { tops: Math.max(...ks) - Math.min(...ks), n: ks.length }; });
        assert.ok(rowsOf && rowsOf.tops < 2, `${id} actions on one row ${JSON.stringify(rowsOf)}`); }
    }
    assert.deepEqual(app.errors, []); await app.close(); app = null;
  }
});

/* Overview and Energy charts (findings 13-15). zeroRange(values, minPad): the axis includes 0, padding only on the side that has data (10% of the span, at least minPad), never an empty band.
   [-1.2, -0.3]: span 1.2, pad 0.12 -> [-1.32, 0]; [-1, 2]: span 3, pad 0.3 -> [-1.3, 2.3]; [0.4, 0.6]: 0..0.6, pad max(0.06, 0.1) = 0.1 -> [0, 0.7]; [0]: nothing to show -> [0, 0.1] */
test("zeroRange: the axis includes zero and pads only the side with data", async () => {
  const page = await start(H.VIEWPORTS.phone);
  const r = await page.evaluate(() => [zeroRange([-1.2, -0.3], .1), zeroRange([-1, 2], .1), zeroRange([.4, .6], .1), zeroRange([0], .1)]);
  const want = [[-1.32, 0], [-1.3, 2.3], [0, .7], [0, .1]]; r.forEach((a, i) => a.forEach((v, j) => assert.ok(Math.abs(v - want[i][j]) < 1e-9, `${i}: ${a} vs ${want[i]}`)));
});

/* 30 days, each expected -0.04 kg from intake (cumulative -1.2 at the end); trend weight 80 - 0.03 x (35 - days ago): 30 days ago 79.85, today 78.95, so the actual change ends at -0.90.
   Both lines are at or below zero: no positive tick, the top gridline is the zero, y labels carry «kg», three dates under the plot. Weekly balance: eight deficit weeks (-1000 to -3500): no «+» tick, zero on top */
test("Overview charts: change chart has dates, kg and no empty band; balance chart has no empty half; captions spaced like legends", async () => {
  for (const vp of [H.VIEWPORTS.phone, H.VIEWPORTS.desktop]) {
    const page = await start(vp);
    const r = await page.evaluate(() => { const t = todayISO(), rows = {}; for (let i = 0; i <= 35; i++) rows[addDays(t, -i)] = { estKg: -0.04, trend: 80 - 0.03 * (35 - i) };
      const _es = energySeries, _wt = weeklyTable, ws = weekStartOf(t); energySeries = () => ({ rows, start: addDays(t, -35) });
      const bal = [-3000, -2500, -1800, -2200, -1000, -3500, -2800, -1500]; weeklyTable = () => bal.map((b, i) => ({ ws: addDays(ws, -7 * (7 - i)), balance: b }));
      const ch = changeChart(), ba = balanceChart(); energySeries = _es; weeklyTable = _wt;
      const parse = html => { const d = document.createElement("div"); d.innerHTML = html; const svg = d.querySelector("svg.chart"), H = +svg.getAttribute("viewBox").split(" ")[3], tx = [...svg.querySelectorAll("text")].map(e => ({ s: e.textContent, x: +e.getAttribute("x"), y: +e.getAttribute("y"), a: e.getAttribute("text-anchor") }));
        return { axis: tx.filter(e => e.a === "end" && e.x < 60).map(e => e.s), dates: tx.filter(e => e.y > H - 14 && !/^[DMTWFS]$/.test(e.s)).map(e => e.s), grid: [...svg.querySelectorAll("line.gl")].map(l => +l.getAttribute("y1")), legend: d.querySelector(".legend")?.textContent.trim() || "", bareCaption: !!d.querySelector(":scope > .faint") }; };
      return { ch: parse(ch), ba: parse(ba) }; });
    assert.ok(r.ch.axis.length >= 3 && r.ch.axis.every(s => / kg$/.test(s)) && r.ch.axis.every(s => !/^\+/.test(s)), "change chart axis in kg, no positive tick: " + r.ch.axis);
    assert.equal(r.ch.dates.length, 3, "three dates under the change chart: " + r.ch.dates); assert.ok(Math.abs(Math.min(...r.ch.grid) - 10) < 1, "zero is the top gridline: " + r.ch.grid);
    assert.ok(r.ba.axis.length >= 3 && r.ba.axis.every(s => !/^\+/.test(s)), "balance axis has no positive tick: " + r.ba.axis); assert.ok(Math.abs(Math.min(...r.ba.grid) - 10) < 1, "zero is the top gridline: " + r.ba.grid);
    assert.ok(/Intake minus TDEE/.test(r.ba.legend) && !r.ba.bareCaption, "the caption is a legend row: " + JSON.stringify(r.ba));
    assert.deepEqual(app.errors, []); await app.close(); app = null;
  }
});

/* one day of data: one date under the plot (not «25 Oct25 Oct»); in Maintenance the target is the TDEE: one line, named «TDEE = target»; no day in the table: a line says so */
test("Energy: one date for one day, target = TDEE named once, empty day table says so", async () => {
  const page = await start(H.VIEWPORTS.phone);
  const r = await page.evaluate(() => { const t = todayISO(); FIT().trackStart = t; FIT().phases = [{ start: t, phase: "Maintenance", kcal: 0 }]; DATA_V++;
    const d = document.createElement("div"); d.innerHTML = energyView();
    const chart = [...d.querySelectorAll("svg.chart")].pop(), H = +chart.getAttribute("viewBox").split(" ")[3];
    return { dates: [...chart.querySelectorAll("text")].filter(e => +e.getAttribute("y") > H - 14).map(e => e.textContent), legend: [...d.querySelectorAll(".legend span")].map(e => e.textContent.trim()), text: d.textContent }; });
  assert.equal(r.dates.length, 1, "one date: " + r.dates); assert.ok(r.legend.includes("TDEE = target") && !r.legend.includes("Target") && !r.legend.includes("TDEE"), r.legend.join("|"));
  assert.ok(/No day yet/.test(r.text), "empty day-by-day table says so");
  const one = await page.evaluate(() => { const t = todayISO(), d = document.createElement("div"); d.innerHTML = seriesChart([{ name: "a", color: "red", pts: [[t, 2300]] }], { fmt: v => fmtN(r0(v)), minPad: 50 }); return [...d.querySelectorAll("svg.chart text")].filter(e => +e.getAttribute("y") > 170).length; });
  assert.equal(one, 1, "a single point: a single date");
});

/* Settings (findings 16): the Features group says its sentence once, the row of the new feature names its path like the others; How it is calculated: first card labelled, the other two
   fold away closed, no development codes; on a PC the box title and its cards share one left edge; Targets › Energy model: the twin switches sit side by side */
test("Settings: Features and How it is calculated read cleanly; one left edge on a PC; energy model switches paired", async () => {
  const page = await start(H.VIEWPORTS.desktop);
  const r = await page.evaluate(() => { const f = document.createElement("div"); f.innerHTML = featCard(); const row = [...f.querySelectorAll(".sw-row")].find(e => /How it is calculated/.test(e.textContent));
    S.settings.feat = { ...(S.settings.feat || {}), explain: true }; DATA_V++; const e = document.createElement("div"); e.innerHTML = explainHTML(); const closed = [...e.querySelectorAll(".rec-sec > .rec-h")].map(b => [b.textContent.replace(/\s+/g, " ").trim().slice(0, 26), b.getAttribute("aria-expanded")]);
    UI.fold = { explain: { ["Algorithm set v" + ALGO_VERSION]: true, "Where the data come from": true } }; const o = document.createElement("div"); o.innerHTML = explainHTML(); UI.fold = {};
    return { feat: f.textContent.replace(/\s+/g, " "), flabel: [...f.querySelectorAll(".flabel")].map(x => x.textContent), row: row?.querySelector("small").textContent, first: e.querySelector(".flabel")?.textContent, closed, opened: o.textContent.replace(/\s+/g, " "), nsec: e.querySelectorAll(".rec-sec").length }; });
  assert.ok(!/Switch off what you don't use/.test(r.feat) && !r.flabel.includes("Features") && /Nothing is deleted/.test(r.feat), "Features sentence once: " + r.feat.slice(0, 120));
  assert.equal(r.row, "Settings › How it is calculated: formulas, inputs and steps");
  assert.equal(r.first, "Today, step by step"); assert.equal(r.nsec, 2); assert.ok(r.closed.every(c => c[1] === "false"), "the two sections start closed " + JSON.stringify(r.closed));
  assert.ok(!/\b(F-\d\d|D\d+b?)\b/.test(r.opened), "no development codes"); assert.ok(/since 25 Oct|from the first day|starts/.test(r.opened));
  await page.evaluate(() => { Object.assign(UI, { tab: "settings", setSel: "feat", setOpen: { feat: true } }); render(); }); await page.waitForTimeout(250);
  const edges = await page.evaluate(() => [document.querySelector(".set-pane-h h2").getBoundingClientRect().left, document.querySelector(".set-pane .set-grp-in > .card").getBoundingClientRect().left]);
  assert.ok(Math.abs(edges[0] - edges[1]) < 1, "title and card on one left edge " + edges);
  await page.evaluate(() => { FIT().targetMode = "smart"; Object.assign(UI, { tab: "settings", setSel: "tgt", setOpen: { tgt: true }, setDet: { "Energy model": true } }); render(); }); await page.waitForTimeout(250);
  const pair = await page.evaluate(() => { const top = k => Math.round(document.querySelector(`[data-fit="energy.${k}"]`).getBoundingClientRect().top); return [[top("kcalPerKgMode"), top("minWatchNeat")], [top("oneSrc"), top("netKcal")]]; });
  assert.ok(pair[0][0] === pair[0][1] && pair[1][0] === pair[1][1] && pair[1][0] > pair[0][0], "kcal per kg beside min watch NEAT, one source beside net kcal: " + JSON.stringify(pair));
  assert.deepEqual(app.errors, []);
});
