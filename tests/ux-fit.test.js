/* M4e: labels on buttons, segmented controls and chips are never cut off with «…» on a small phone. Synthetic data only. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let app;
test.afterEach(async () => { await app?.close(); app = null; });

for (const width of [360, 390]) {
  test(`no button, segment or chip label is truncated on ${width}px screens, on every main screen and editor`, async () => {
    app = await H.startApp({ dir: H.build(H.tmp("fit-build")), seed: F.seed({ withPantry: true }), viewport: { width, height: 800 } });
    const bad = await app.page.evaluate(async () => {
      const out = [], t = todayISO();
      const scan = where => { for (const el of document.querySelectorAll(".seg > *, .subseg > *, .chip, .chip-a, .btn, .td-nudge, .td-q, .lrow .end, .stat b")) {
        const cs = getComputedStyle(el); if (cs.display === "none" || el.offsetParent === null || !el.clientWidth) continue;
        if (el.scrollWidth > el.clientWidth + 1 && (cs.overflow !== "visible" || cs.textOverflow === "ellipsis") && !el.closest(".seg.many, .subseg, .chips.scroll")) out.push(where + " | " + (el.innerText || "").trim().slice(0, 30) + " | " + el.scrollWidth + ">" + el.clientWidth); } };
      const tabs = [["today"], ["plan"], ["foods"], ["shop"], ["pantry"], ["train", { trainSeg: "cal" }], ["train", { trainSeg: "wk" }], ["train", { trainSeg: "season" }], ["train", { trainSeg: "perf", perfSeg: "fitness" }], ["train", { trainSeg: "perf", perfSeg: "running" }], ["train", { trainSeg: "perf", perfSeg: "strength" }],
        ["progress", { progSeg: "overview" }], ["progress", { progSeg: "body" }], ["progress", { progSeg: "food", foodSeg: "intake" }], ["progress", { progSeg: "food", foodSeg: "energy" }], ["progress", { progSeg: "food", foodSeg: "habits" }], ["progress", { progSeg: "reports", repSeg: "week" }], ["progress", { progSeg: "journal", jrRange: "month" }], ["settings"]];
      for (const [tab, ex] of tabs) { Object.assign(UI, { tab, date: t }, ex || {}); render(); await new Promise(r => setTimeout(r, 40)); scan("tab " + tab + JSON.stringify(ex || {})); }
      const sheets = [["food", { draft: { id: "n1", name: "", unit: "g", per: { kcal: 0, p: 0, c: 0, f: 0, fib: 0 }, servings: [], source: "custom", meals: ["lunch"] }, isNew: true }], ["food", { draft: clone(S.foods["t-rice"]), isNew: false }], ["checkin", { date: t, live: true }], ["journal", { date: t, live: true }],
        ["pantry", { food: "t-rice", g: 300, exp: "", u: "base" }], ["shopq", { live: true }], ["qty", { kind: "food", ref: "t-rice", qty: 100, date: t, meal: "lunch", origMeal: "lunch" }], ["recipe", { draft: clone(S.recipes["t-bowl"]), isNew: false }], ["session", { list: "workouts", date: t, idx: null, draft: { sport: "Running", min: 30, km: 5, int: "Moderate" } }]];
      for (const [type, p] of sheets) { UI.tab = "today"; openSheet(type, p); await new Promise(r => setTimeout(r, 40)); document.querySelectorAll(".sheet details").forEach(d => { d.open = true; }); await new Promise(r => setTimeout(r, 30)); scan("sheet " + type); closeSheet(); }
      return [...new Set(out)];
    });
    assert.deepEqual(bad, []);
  });
}
