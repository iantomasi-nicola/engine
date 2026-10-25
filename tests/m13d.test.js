/* M13d (graphic defects left by the design reviews; causes in docs/M13D_NOTES.md). Measured, on synthetic data. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let dir, app;
test.before(async () => { dir = H.build(H.tmp("m13d-build")); });
test.afterEach(async () => { await app?.close(); app = null; });
const start = async viewport => { app = await H.startApp({ dir, seed: F.seed({ withPlan: true }), viewport }); return app.page; };
const wide = { width: 1920, height: 1080 };

test("list views (Progress, Train except the calendar) stop at 1120 px on a 1920 px screen; Today and the calendar keep their wide layout", async () => {
  const page = await start(wide);
  const r = await page.evaluate(async () => { const out = {}; const w = async (tab, extra) => { Object.assign(UI, { tab, date: todayISO() }, extra || {}); render(); await new Promise(x => setTimeout(x, 120)); return Math.round(document.getElementById("main").getBoundingClientRect().width); };
    out.progress = await w("progress", { progSeg: "overview" }); out.records = await w("train", { trainSeg: "perf", perfSeg: "records" }); out.cal = await w("train", { trainSeg: "cal" }); out.today = await w("today"); return out; });
  assert.ok(r.progress <= 1120, "progress " + r.progress); assert.ok(r.records <= 1120, "records " + r.records);
  assert.ok(r.cal > 1120, "calendar " + r.cal); assert.ok(r.today > 1120, "today " + r.today);
  assert.deepEqual(app.errors, []);
});

test("the calorie ring shows whole percentages that add up to 100 and no kcal figure of its own; the Today energy tile with nothing eaten does not repeat the target; Day by day does not repeat the BMR", async () => {
  const page = await start(H.VIEWPORTS.phone);
  const r = await page.evaluate(() => { const sum = h => { const d = document.createElement("div"); d.innerHTML = h; return [...d.querySelectorAll(".mlabel b")].map(b => parseInt(b.textContent)).reduce((a, b) => a + b, 0); };
    // 33.4 / 33.3 / 33.3 % would round to 33 + 33 + 33 = 99, and 25 g C / 25 g P / 11.1 g F -> 100 / 100 / 100 kcal = 33.3 each
    const ring = [[25, 25, 11.11], [10, 10, 10], [50.5, 20.2, 30.3], [1, 1, 1]].map(([c, p, f]) => sum(splitDonut(p, c, f)));
    const html = splitDonut(25, 25, 11.11);
    const t = todayISO(); S.days[t] = { date: t, meals: {} }; DATA_V++; const g = document.createElement("div"); g.innerHTML = glanceHTML(); const tile = g.querySelector(".gl-t").innerText;
    UI.tab = "progress"; UI.progSeg = "food"; UI.foodSeg = "energy"; render(); const en = document.getElementById("main").innerText;
    return { ring, noText: !/<text/.test(html), tile, bmrRows: (en.match(/BMR [\d,]+ ·/g) || []).length }; });
  assert.deepEqual(r.ring, [100, 100, 100, 100]); assert.ok(r.noText);
  assert.match(r.tile, /0\s*kcal eaten/); assert.doesNotMatch(r.tile, /protein to go|kcal left/);
  assert.equal(r.bmrRows, 0, "no «BMR n ·» line per day");
});

test("Energy: Day by day starts at yesterday (today is the big number); the BMR formula in use is named in the heading and has no tile; the other tiles keep names and «%» in one piece", async () => {
  const page = await start(H.VIEWPORTS.phone);
  const r = await page.evaluate(() => { UI.tab = "progress"; UI.progSeg = "food"; UI.foodSeg = "energy"; render(); const m = document.getElementById("main");
    const heads = [...m.querySelectorAll(".section-h")], bmr = heads.find(h => /Basal/.test(h.textContent)), dd = heads.find(h => /Day by day/.test(h.textContent)), tbl = dd.nextElementSibling;
    const tiles = [...bmr.nextElementSibling.querySelectorAll(".stat")].map(s => s.querySelector("small").textContent), days = [...tbl.querySelectorAll("tbody tr td:first-child")].map(td => td.textContent);
    return { head: bmr.textContent, tiles, days, first: fmtDM(addDays(todayISO(), -1)), today: fmtDM(todayISO()) }; });
  assert.match(r.head, /Mifflin-St Jeor in use/);
  assert.equal(r.tiles.filter(t => /Mifflin/.test(t)).length, 0, "the formula in use has no tile"); assert.equal(r.tiles.length, 3);
  assert.equal(r.days[0], r.first); assert.ok(!r.days.includes(r.today), "today is not in Day by day"); assert.ok(r.days.length >= 1 && r.days.length <= 7);
  assert.ok(r.tiles.every(t => !/Harris-Benedict|Ten Haaf|Mifflin-St| %/.test(t)), JSON.stringify(r.tiles));
  assert.ok(r.tiles.some(t => /Harris‑Benedict/.test(t)));
  assert.deepEqual(app.errors, []);
});

test("Today on PC and 1920: one spacing (12 px) between the KPI tiles, between KPIs and the grid, between the columns and between the cards", async () => {
  for (const vp of [H.VIEWPORTS.desktop, wide]) {
    const page = await start(vp);
    const r = await page.evaluate(async () => { UI.tab = "today"; UI.date = todayISO(); render(); await new Promise(x => setTimeout(x, 300));
      const g = document.querySelector(".today-glance"), gr = document.querySelector(".today-grid"), a = g.getBoundingClientRect(), b = gr.getBoundingClientRect(), cc = [...gr.children].map(c => c.getBoundingClientRect()), gl = [...g.querySelectorAll(".glance > *")].map(x => x.getBoundingClientRect());
      const cards = [...gr.querySelectorAll(":scope > .tg-col")].flatMap(c => { const k = [...c.children].map(x => x.getBoundingClientRect()); return k.slice(1).map((r, i) => Math.round(r.top - k[i].bottom)); });
      return { toGrid: Math.round(b.top - a.bottom), gutter: Math.round(cc[1].left - cc[0].right), tiles: Math.round(gl[1].left - gl[0].right), cards }; });
    assert.deepEqual([r.toGrid, r.gutter, r.tiles, ...new Set(r.cards)], [12, 12, 12, 12], JSON.stringify(r));
    await app.close(); app = null;
  }
});

test("Overview: no «• -» pill when a value is missing; the two charts show an empty state instead of a flat line, and a chart when there is data; the logging streak is a tile of the intake grid", async () => {
  const page = await start(H.VIEWPORTS.phone);
  const r = await page.evaluate(() => { const box = h => { const d = document.createElement("div"); d.innerHTML = h; return d; };
    UI.tab = "progress"; UI.progSeg = "overview"; render(); const ov = document.getElementById("main"), pills = [...ov.querySelectorAll(".pill")].map(p => p.textContent), rows = [...ov.querySelectorAll(".lrow")].filter(l => /Rate of change/.test(l.textContent)).length;
    const empty = { change: /<svg/.test(changeChart()), bal: /<svg/.test(balanceChart()) };
    const t = todayISO(); for (let i = 0; i < 30; i++) { const d = addDays(t, -i), mk = d.slice(0, 7); S.logm[mk] = S.logm[mk] || { month: mk, days: {} }; S.logm[mk].days[d] = { weight: 80 + i * 0.1 }; } FIT().trackStart = addDays(t, -40); DATA_V++;
    const full = { change: /<svg/.test(changeChart()) };
    const st = box(VIEWS.stats(true)), g = st.querySelector(".stat-grid"), tiles = g ? [...g.querySelectorAll(".stat")].map(x => x.textContent) : [];
    return { pills, rows, empty, full, grid: g?.className, tiles, text: st.textContent }; });
  assert.ok(r.rows >= 1 && !r.pills.includes("-"), JSON.stringify(r.pills));
  assert.deepEqual(r.empty, { change: false, bal: false }); assert.equal(r.full.change, true);
  assert.match(r.grid, /four/); assert.equal(r.tiles.length, 4); assert.match(r.tiles[3], /logging streak/); assert.doesNotMatch(r.text, /Logging streak:/);
  assert.deepEqual(app.errors, []);
});
