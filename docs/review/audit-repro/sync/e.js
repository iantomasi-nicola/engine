const H = require("/home/user/engine/tests/lib/harness"), F = require("/home/user/engine/tests/fixtures/synthetic");
(async () => { const cases = {
   fit: { app: "Engine", version: 3, settings: { fit: "abc", types: "x", meals: [1, 2], schedule: "z", diet: 5 } },
   day: { app: "Engine", version: 3, days: { [F.plus(0)]: { date: F.plus(0), meals: "abc" }, [F.plus(1)]: { meals: { m: [null, 5, { kind: "food", ref: "nope", qty: "x" }] } } } },
   logm: { app: "Engine", version: 3, logm: { [F.plus(0).slice(0, 7)]: { days: { [F.plus(0)]: { workouts: "run", water: "lots", supp: 3, jr: "x" } } } } },
   body: { app: "Engine", version: 3, body: { w: { [F.plus(0)]: "heavy", "zz": 70 }, m: [] , photos: "p" } },
   shop: { app: "Engine", version: 3, shop: { pantry: { "t-rice": "lots" }, extras: [null, 3], buys: {} } },
 };
 for (const [k, j] of Object.entries(cases)) {
  const app = await H.startApp({ dir: process.env.BUILT, seed: F.seed({ withPlan: true }) });
  await app.page.evaluate(async j => { restoreOpen(j, "file"); const sh = S_(); if (!sh || UI.sheet?.type !== "restore") return; sh.mode = "replace"; await ACT["rs-go"](); }, j);
  await app.page.waitForTimeout(800);
  for (const tab of ["today", "plan", "stats", "progress", "train", "settings", "shop", "pantry"]) { await app.page.evaluate(t => { try { UI.tab = t; render(); } catch (e) { window.__e = (window.__e || []).concat(t + ": " + e.message); } }, tab); await app.page.waitForTimeout(150); }
  const e1 = await app.page.evaluate(() => window.__e || []);
  await app.reload(); await app.page.waitForTimeout(800);
  const len = await app.page.evaluate(() => document.querySelector("#main")?.innerText.length || 0);
  console.log(k, "renderErr", JSON.stringify(e1), "pageerrors", JSON.stringify(app.errors.slice(0, 4)), "main", len);
  await app.close(); }
})();
