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
      const num = s => { const m = /^([+−-])?([\d.,]+)(k)?$/.exec(s.trim()); if (!m) return NaN; const v = parseFloat(m[2].replace(/,/g, "")) * (m[3] ? 1000 : 1); return m[1] === "−" || m[1] === "-" ? -v : v; };
      const axis = html => { const d = document.createElement("div"); d.innerHTML = html; const out = [];
        for (const svg of d.querySelectorAll("svg.chart")) { const gl = [...svg.querySelectorAll("line.gl")].map(l => +l.getAttribute("y1")), tx = [...svg.querySelectorAll("text[text-anchor=end]")].filter(t => +t.getAttribute("x") < 60 && /^[+−-]?[\d.,]+k?$/.test(t.textContent.trim()));
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

/* Train › Calendar: below 1100 px nothing changes (totals in the line above the grid); from 1100 px the side column starts level with the grid, carries the day, its meals and the month's totals,
   ends close to the grid's bottom, and the totals are not shown twice */
test("Train calendar: side column fills the grid height on a PC, totals shown once, header on one line", async () => {
  const fill = () => { const t = todayISO(), M = activeMeals(), fl = allFoods().filter(f => f.per && f.per.kcal > 0); let n = 0;
    M.forEach((m, mi) => { const its = []; for (let k = 0; k < 1 + mi % 3; k++) its.push(newItem("food", fl[(n++ * 7) % fl.length].id, defaultQty(fl[(n * 7) % fl.length]))); mutateDay(t, day => { day.meals[m.id] = its; }); });
    for (let i = 0; i < 20; i++) { const d = addDays(t, -i), mk = d.slice(0, 7); S.logm[mk] = S.logm[mk] || { month: mk, days: {} }; S.logm[mk].days[d] = Object.assign(S.logm[mk].days[d] || {}, { workouts: [{ sport: FIT().runSport, min: 30 + (i % 7) * 8, km: 5 + (i % 5), int: "Hard" }] }); }
    DATA_V++; Object.assign(UI, { tab: "train", trainSeg: "cal", calView: "month", calOff: 0, calSel: t }); render(); };
  const measure = async page => { await page.evaluate(fill); await page.waitForTimeout(250);
    return page.evaluate(() => { const vis = el => !!el && getComputedStyle(el).display !== "none" && el.getBoundingClientRect().height > 0, box = s => document.querySelector(s)?.getBoundingClientRect(), g = box(".cv"), sd = box(".cv-side"), c = x => Math.round(x.top + x.height / 2);
      const head = [".cv-nav", ".cv-kpi .cv-tools", ".cv-top .subseg"].map(s => box(s)), counts = [...document.querySelectorAll(".cv-kpi .cv-mt")].filter(vis).length;
      return { gridTop: Math.round(g.top), sideTop: Math.round(sd.top), gridBottom: Math.round(g.bottom), sideBottom: Math.round(sd.bottom), month: vis(document.querySelector(".cv-month")), meals: vis(document.querySelector(".cv-meals")), counts, head: head.map(c), main: document.querySelector("#main").scrollWidth <= innerWidth }; }); };
  for (const vp of [H.VIEWPORTS.desktop, wide]) {
    const page = await start(vp), m = await measure(page);
    assert.equal(m.sideTop, m.gridTop, "side column level with the grid"); assert.ok(m.gridBottom - m.sideBottom < 60 && m.sideBottom - m.gridBottom < 60, `side ${m.sideBottom} vs grid ${m.gridBottom}`);
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
test("Tools calculators: fields on one grid, unit labels on one axis, 1RM output on one right axis", async () => {
  for (const vp of [H.VIEWPORTS.phone, H.VIEWPORTS.tablet, H.VIEWPORTS.desktop, wide]) {
    const page = await start(vp);
    const r = await page.evaluate(async () => { const out = [], ids = CALCS.map(c => c.id); UI.tc = { rm: { w: "100.5", r: "12", b: "80.5", f: "Epley" } };
      for (const id of ids) { Object.assign(UI, { tab: "timer", toolSeg: "calc", toolOpen: id }); TMR.phase = "setup"; render(); await new Promise(x => setTimeout(x, 60));
        const g = document.querySelector(".tc-f"), f = [...g.children].map(e => e.getBoundingClientRect()), inp = [...g.querySelectorAll(".field:not(.tc-w) .unit-inp")].map(u => { const e = u.querySelector(".inp"), i = e.getBoundingClientRect(), s = u.querySelector("span"); return { w: Math.round(i.width), over: e.scrollWidth > e.clientWidth, gap: s ? Math.round((i.right - s.getBoundingClientRect().right) * 10) / 10 : null }; });
        const rows = [...new Set(f.map(q => Math.round(q.top)))].length; out.push({ id, n: f.length, rows, widths: [...new Set(inp.map(i => i.w))], gaps: [...new Set(inp.map(i => i.gap).filter(x => x != null))], over: inp.some(i => i.over), right: Math.round(g.getBoundingClientRect().right) - Math.round(Math.max(...f.map(q => q.right))) }); }
      Object.assign(UI, { toolOpen: "rm" }); render(); await new Promise(x => setTimeout(x, 60));
      const edge = el => Math.round(el.getBoundingClientRect().right), one = [...document.querySelectorAll(".tc-one .end")].map(edge), reps = [...document.querySelectorAll(".tc-reps > div > b")].map(edge), top = document.querySelector(".tc-top .an-k:last-child b");
      return { out, one: [...new Set(one)], reps: [...new Set(reps)], topH: Math.round(top.getBoundingClientRect().height), topLine: parseFloat(getComputedStyle(top).lineHeight) }; });
    for (const c of r.out) { const want = vp.width >= 560 ? 1 : c.id === "plates" ? 2 : c.n > 3 ? Math.ceil(c.n / 2) : 1; assert.equal(c.rows, want, `${vp.width}px ${c.id}: ${c.rows} rows`); assert.equal(c.widths.length, 1, `${vp.width}px ${c.id} widths ${c.widths}`); assert.ok(c.gaps.length <= 1, `${vp.width}px ${c.id} unit axis ${c.gaps}`); assert.ok(!c.over, `${vp.width}px ${c.id} input cut`); assert.ok(c.right >= 0 && c.right < 2, `${vp.width}px ${c.id} grid not filled: ${c.right}`); }
    assert.equal(r.one.length, 1, "formula list on one right edge"); assert.equal(r.reps.length, 1, "reps table on one right edge"); assert.equal(r.one[0], r.reps[0], "list and table share the right axis");
    assert.ok(r.topH < r.topLine * 1.6, "range stays on one line: " + r.topH);
    assert.deepEqual(app.errors, []);
    await app.close(); app = null;
  }
});
