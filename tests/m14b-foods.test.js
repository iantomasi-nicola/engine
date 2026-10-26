/* M14b group F (first fix): the grams of an ingredient in the recipe editor can be changed (a second INP["rc-g"] of the receipt screen used to win). Synthetic data only. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let dir, app;
test.before(async () => { dir = H.build(H.tmp("m14b-foods-build")); });
test.afterEach(async () => { await app?.close(); app = null; });

test("typing the grams of an ingredient in the recipe editor updates the draft (no page error)", async () => {
  app = await H.startApp({ dir, seed: F.seed({ withPlan: false }), viewport: H.VIEWPORTS.desktop });
  const r = await app.page.evaluate(async () => { ACT["new-recipe"](); const sh = UI.sheet; sh.draft.ingredients.push({ food: "t-rice", g: 100 }); renderSheet(); await new Promise(x => setTimeout(x, 100));
    const inp = document.querySelector('[data-in="rc-g"]'); inp.value = "250"; inp.dispatchEvent(new Event("input", { bubbles: true })); await new Promise(x => setTimeout(x, 100));
    return { g: UI.sheet.draft.ingredients[0].g }; });
  assert.equal(+r.g, 250);
  assert.deepEqual(app.errors, []);
});

test("no INP, CHG or ACT key is defined twice (also inside object literals)", () => {
  const html = require("fs").readFileSync(require("path").join(__dirname, "../source/engine.html"), "utf8"), seen = new Map(), dups = [];
  for (const m of html.matchAll(/^\s*(?:(INP|CHG|ACT)\[\s*"([^"]+)"\s*\]\s*=|"([^"]+)"\s*:\s*\([a-z, ]*\)\s*=>)/gm)) { if (!m[1]) continue; const k = m[1] + "." + m[2]; if (seen.has(k)) dups.push(k); seen.set(k, 1); }
  assert.deepEqual(dups, []);
});

test("a second new food with the same barcode is added next to the first, not over it", async () => {
  app = await H.startApp({ dir, seed: F.seed({ withPlan: false }), viewport: H.VIEWPORTS.desktop });
  const r = await app.page.evaluate(async () => { const mk = name => { ACT["new-food"]({ dataset: {} }); const sh = UI.sheet; Object.assign(sh.draft, { name, barcode: "8000000000017", per: { kcal: 100, p: 5, c: 10, f: 2 } }); return sh; };
    mk("Alpha"); ACT["fd-save-only"](); await new Promise(x => setTimeout(x, 100));
    mk("Beta"); ACT["fd-save-only"](); ACT["fd-save-only"](); await new Promise(x => setTimeout(x, 100));
    return Object.values(S.foods || {}).filter(f => f.barcode === "8000000000017").map(f => f.name).sort(); });
  assert.deepEqual(r, ["Alpha", "Beta"]);
  assert.deepEqual(app.errors, []);
});
