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
