/* M4e: ingredients added to a recipe by barcode; a product that isn't registered is registered on the way. Synthetic data only; Open Food Facts is a stub. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let dir, app;
test.before(async () => { dir = H.build(H.tmp("rscan-build")); });
test.afterEach(async () => { await app?.close(); app = null; });
const start = async viewport => { app = await H.startApp({ dir, seed: F.seed(), viewport }); return app.page; };
const openRecipe = page => page.evaluate(() => { openSheet("recipe", { isNew: true, draft: { id: "r-new", name: "Scan test", servings: 2, meals: ["m"], source: "custom", note: "", ingredients: [{ food: "t-rice", g: 100 }] } }); return true; });
const OFFOOD = `fetchOFF = async code => code === "8000000000011" ? { food: { id: "bc-8000000000011", name: "Scanned pasta", brand: "Acme", barcode: code, unit: "g", per: { kcal: 350, p: 12, c: 70, f: 2, fib: 3 }, servings: [], pack: 500, cat: "pantry", role: "C", meals: ["m"], source: "off" } } : { notFound: true };`;

test("the recipe editor has a scan button next to «Add an ingredient»", async () => {
  const page = await start(); await openRecipe(page);
  assert.equal(await page.evaluate(() => !!document.querySelector('.sheet [data-act="rc-scan"]')), true);
});

test("scanning a product that is on Open Food Facts registers it as a food and adds it to the recipe; what was typed is kept", async () => {
  const page = await start(); await openRecipe(page);
  const r = await page.evaluate(async src => { eval(src); S_().draft.name = "Typed name"; ACT["rc-scan"](); const scanning = UI.sheet.type;
    await lookupAndAdd("8000000000011"); await new Promise(r => setTimeout(r, 50));
    const sh = UI.sheet; return { scanning, type: sh.type, name: sh.draft.name, ings: sh.draft.ingredients.map(i => [i.food, i.g]), food: !!S.foods["bc-8000000000011"], dest: UI.dest }; }, OFFOOD);
  assert.equal(r.scanning, "scan"); assert.equal(r.type, "recipe"); assert.equal(r.name, "Typed name");
  assert.deepEqual(r.ings.map(x => x[0]), ["t-rice", "bc-8000000000011"]); assert.ok(r.ings[1][1] > 0);
  assert.equal(r.food, true, "registered in Foods"); assert.equal(r.dest, null);
});

test("a barcode already in your foods is added straight away, without asking Open Food Facts", async () => {
  const page = await start(); await openRecipe(page);
  const r = await page.evaluate(async () => { S.foods["t-rice"].barcode = "8000000000099"; let asked = 0; fetchOFF = async () => { asked++; return { notFound: true }; };
    ACT["rc-scan"](); await lookupAndAdd("8000000000099"); await new Promise(r => setTimeout(r, 30)); return { asked, ings: UI.sheet.draft.ingredients.map(i => i.food), type: UI.sheet.type }; });
  assert.deepEqual(r, { asked: 0, ings: ["t-rice", "t-rice"], type: "recipe" });
});

test("a product nobody knows: you type its values, it is saved in Foods with its barcode, and joins the recipe", async () => {
  const page = await start(); await openRecipe(page);
  const r = await page.evaluate(async src => { eval(src); S_().draft.name = "Keep me"; ACT["rc-scan"](); await lookupAndAdd("8000000000555"); await new Promise(r => setTimeout(r, 30));
    const stage = UI.sheet.stage; ACT["scan-manual"](); const d = S_().draft; d.name = "My secret sauce"; d.per.kcal = 120; d.per.c = 10; d.per.p = 2; d.per.f = 8; ACT["fd-save"](); await new Promise(r => setTimeout(r, 30));
    const f = Object.values(S.foods).find(x => x.barcode === "8000000000555"); return { stage, type: UI.sheet.type, name: UI.sheet.draft.name, last: UI.sheet.draft.ingredients.at(-1).food, f: f && [f.name, f.per.kcal], same: f && f.id === UI.sheet.draft.ingredients.at(-1).food }; }, OFFOOD);
  assert.equal(r.stage, "missing"); assert.equal(r.type, "recipe"); assert.equal(r.name, "Keep me"); assert.deepEqual(r.f, ["My secret sauce", 120]); assert.equal(r.same, true);
});

test("closing the scanner brings the recipe back as it was", async () => {
  const page = await start(); await openRecipe(page);
  const r = await page.evaluate(() => { S_().draft.name = "Half done"; S_().draft.ingredients.push({ food: "t-oil", g: 10 }); ACT["rc-scan"](); ACT["close-sheet"](); return { type: UI.sheet?.type, name: UI.sheet?.draft.name, n: UI.sheet?.draft.ingredients.length, dest: UI.dest }; });
  assert.deepEqual(r, { type: "recipe", name: "Half done", n: 2, dest: null });
});

test("searching for something that isn't in Foods offers to create it, and the new food joins the recipe", async () => {
  const page = await start(); await openRecipe(page);
  const r = await page.evaluate(async () => { S_().iq = "Zzyzx powder"; renderSheet(); const btn = document.querySelector('.sheet [data-act="rc-new-food"]'); const had = !!btn; ACT["rc-new-food"]({ dataset: {} });
    const d = S_().draft; d.name = "Zzyzx powder"; d.per.kcal = 300; ACT["fd-save"](); await new Promise(r => setTimeout(r, 30));
    return { had, type: UI.sheet.type, last: getFood(UI.sheet.draft.ingredients.at(-1).food)?.name }; });
  assert.deepEqual(r, { had: true, type: "recipe", last: "Zzyzx powder" });
});

for (const [name, vp] of Object.entries(H.VIEWPORTS)) test(`the recipe editor with the scan button fits the screen — ${name}`, async () => {
  const page = await start(vp); await openRecipe(page);
  assert.equal(await page.evaluate(() => { const s = document.querySelector(".sheet"); return s.scrollWidth <= s.clientWidth + 1 && document.documentElement.scrollWidth <= innerWidth; }), true);
});
