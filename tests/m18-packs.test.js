/* M18 (L208–L210): one language for amounts in packs. Synthetic data only.
   Fixture (tests/fixtures/synthetic.js): every day, dinner = 100 g of Test rice and lunch = Test bowl × 2 servings
   (the recipe is 2 servings with 200 g rice, 300 g chicken, 10 g oil → per day 200 g rice, 300 g chicken, 10 g oil).
   Per day: rice 100 + 200 = 300 g, chicken 300 g, oil 10 g. Packs: rice 1000 g, chicken 400 g, oil 500 g. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let dir, app;
test.before(() => { dir = H.build(H.tmp("m18-build")); });
test.afterEach(async () => { await app?.close(); app = null; });
const start = async (seed = F.seed(), vp) => { app = await H.startApp({ dir, seed, viewport: vp }); return app.page; };
const txt = h => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

test("packWords: a pack amount reads in packs only near a simple fraction (±2 %)", async () => {
  const page = await start();
  const r = await page.evaluate(() => [[500, 1000], [1500, 1000], [2000, 1000], [250, 1000], [750, 1000], [333, 1000], [430, 1000], [995, 1000], [0, 1000], [500, 0], [400, 400]].map(([g, p]) => packWords(g, p)));
  // 500/1000 = 0.5 → ½; 1.5 → 1½ packs; 2 → 2 packs; 0.25 → ¼; 0.75 → ¾; 0.333 → ⅓; 0.43 → none; 0.995 → 1 (within 2 %); 0 and no pack → none; 400/400 = 1
  assert.deepEqual(r, ["½ pack", "1½ packs", "2 packs", "¼ pack", "¾ pack", "⅓ pack", "", "1 pack", "", "", "1 pack"]);
});

test("L208: each shopping row shows the real stock as one pill, in packs and exact grams, and no second 'from home' number", async () => {
  const page = await start();
  const r = await page.evaluate(() => {
    const t = todayISO(); S.shop.pantry = { "t-rice": { g: 500 }, "t-chicken": { g: 400, u: "pack" }, "t-oil": { g: 50 } }; DATA_V++;
    const rows = shoppingRows(t, 7), h = id => shopRowHTML(rows.find(x => x.id === id));
    return { rice: h("t-rice"), chicken: h("t-chicken"), oil: h("t-oil") };
  });
  // the row is narrow: the pill says «½ pack» (jar = at home) and carries «At home: ½ pack · 500 g» as its label
  // rice: 500 of a 1000 g pack = ½; the stock covers 500 g of the week (2100 g), the same number: no «from home» text
  assert.match(r.rice, /aria-label="At home: ½ pack · 500 g"/); assert.match(txt(r.rice), /^Test rice ½ pack /); assert.doesNotMatch(r.rice, /from home/);
  // chicken: 400 of a 400 g pack = 1
  assert.match(r.chicken, /aria-label="At home: 1 pack · 400 g"/); assert.match(txt(r.chicken), /^Test chicken 1 pack /);
  // oil: 50 of 500 = 0.1, no simple fraction → grams only; need 70 g, buy 20 g
  assert.match(r.oil, /aria-label="At home: 50 g"/); assert.match(txt(r.oil), /^Test oil 50 g /);
  assert.equal((r.rice.match(/class="pill home"/g) || []).length, 1);
});

test("L208: when earlier days use part of the stock, the row says how much of it is for these days", async () => {
  const page = await start();
  const r = await page.evaluate(() => {
    const t = todayISO(); S.shop.pantry = { "t-rice": { g: 800 } }; DATA_V++;
    const row = shoppingRows(addDays(t, 2), 3).find(x => x.id === "t-rice");
    return { covered: row.covered, buy: row.buy, html: shopRowHTML(row) };
  });
  // 800 g at home; today and tomorrow use 300 + 300 → 200 g left for day 3; window = 3 days × 300 = 900 g → covered 200, buy 700
  assert.equal(r.covered, 200); assert.equal(r.buy, 700);
  assert.match(r.html, /aria-label="At home: 800 g"/); assert.match(txt(r.html), /800 g 200 g of it for these days/);
});

test("L208: the Buy sheet shows the same pill once and nothing else at home; a food not on the list still shows its stock", async () => {
  const page = await start();
  const r = await page.evaluate(() => {
    S.shop.pantry = { "t-rice": { g: 500 }, "t-oil": { g: 180 } }; UI.shopStart = todayISO(); S.shop.range = 7; DATA_V++;
    const rice = SHEETS.buy({ id: "t-rice", g: 2000, eur: "" }).body, oil = SHEETS.buy({ id: "t-oil", g: 500, eur: "" }).body;
    return { rice, oil };
  });
  assert.match(txt(r.rice), /½ pack · 500 g at home/); assert.equal((r.rice.match(/at home/g) || []).length, 1);
  assert.match(txt(r.rice), /Planned: 2,100 g/);   // 7 days × 300 g
  assert.match(txt(r.oil), /180 g at home/);          // 70 g needed, 180 g at home: covered, not on the list; the sheet still says what is there
});

/* L209: the pantry sheet starts from packs. Rice pack 1000 g, chicken pack 400 g, oil pack 500 g. */
const sheetState = () => ({ u: S_().u, n: $("#pa-n")?.value, sel: $("select.pa-u")?.value, eq: ($("#pa-eq")?.textContent || "").trim(), chips: [...document.querySelectorAll('[data-act="pa-quick"]')].map(b => b.textContent.trim()) });
test("L209: a pack food opens in packs (½ in the field, the exact grams under it); an amount that is not a simple fraction opens in grams", async () => {
  const page = await start();
  const r = await page.evaluate(async st => { const S2 = eval(st), w = () => new Promise(r => setTimeout(r, 120));
    S.shop.pantry = { "t-rice": { g: 500 }, "t-chicken": { g: 437 } }; DATA_V++;
    ACT["pantry-edit"]({ dataset: { id: "t-rice" } }); await w(); const rice = S2();
    ACT["pantry-edit"]({ dataset: { id: "t-chicken" } }); await w(); const odd = S2();
    closeSheet(); openSheet("pantry", { q: "" }); ACT["pa-pick"]({ dataset: { id: "t-oil" } }); await w(); const fresh = S2();
    return { rice, odd, fresh }; }, `(${sheetState})`);
  // 500 / 1000 = ½ → packs; = 500 g exact under it; ¼ is offered because the pack is ≥ 500 g
  assert.deepEqual(r.rice, { u: "pack", n: "½", sel: "pack", eq: "= 500 g", chips: ["¼ pack", "½ pack", "1 pack", "2 packs", "3 packs"] });
  // 437 / 400 = 1.09 → not a simple fraction → grams; no pack words under it; no ¼ for a 400 g pack
  assert.deepEqual(r.odd, { u: "base", n: "437", sel: "base", eq: "", chips: ["½ pack", "1 pack", "2 packs", "3 packs"] });
  // a new oil entry starts at one whole pack (500 g)
  assert.equal(r.fresh.u, "pack"); assert.equal(r.fresh.n, "1"); assert.equal(r.fresh.eq, "= 500 g");
});

test("L209: − and + move by half a pack, «1½» and «½» can be typed, and the pantry stores exact grams", async () => {
  const page = await start();
  const r = await page.evaluate(async () => { const w = () => new Promise(r => setTimeout(r, 80)), step = d => ACT["pa-step"]({ dataset: { d } }), out = [];
    S.shop.pantry = { "t-rice": { g: 500 } }; DATA_V++; ACT["pantry-edit"]({ dataset: { id: "t-rice" } }); await w();
    step("1"); await w(); out.push($("#pa-n").value); step("1"); await w(); out.push($("#pa-n").value);
    step("-1"); step("-1"); step("-1"); await w(); out.push($("#pa-n").value);
    INP.pa("1½", { dataset: { k: "n" } }); const eq = $("#pa-eq").textContent.trim(); ACT["pa-save"](); const typed = clone(S.shop.pantry["t-rice"]);
    ACT["pantry-edit"]({ dataset: { id: "t-rice" } }); await w(); INP.pa("½", { dataset: { k: "n" } }); ACT["pa-save"](); const half = S.shop.pantry["t-rice"].g;
    return { out, eq, typed, half, list: VIEWS.pantry() }; });
  // ½ → 1 → 1½, then three steps down → 0 (never below)
  assert.deepEqual(r.out, ["1", "1½", "0"]);
  assert.equal(r.eq, "= 1,500 g");                 // updates while typing
  assert.deepEqual([r.typed.g, r.typed.u], [1500, "pack"]);  // 1.5 × 1000
  assert.equal(r.half, 500);
  assert.match(txt(r.list), /½ ?pack\b/); assert.doesNotMatch(txt(r.list), /0\.5 ?packs/);   // the Pantry list reads the same words
});

test("L209: every unit is still there, in the selector next to the amount; switching keeps the grams", async () => {
  const page = await start();
  const r = await page.evaluate(async () => { const w = () => new Promise(r => setTimeout(r, 80));
    S.shop.pantry = { "t-rice": { g: 1500, u: "pack" } }; DATA_V++; ACT["pantry-edit"]({ dataset: { id: "t-rice" } }); await w();
    const opts = [...document.querySelectorAll("select.pa-u option")].map(o => o.textContent);
    CHG["pa-unit"]("base"); await w(); const g = { n: $("#pa-n").value, eq: $("#pa-eq").textContent.trim() };
    CHG["pa-unit"]("kg"); await w(); const kg = { n: $("#pa-n").value, eq: $("#pa-eq").textContent.trim() };
    return { opts, g, kg, chipsRow: !!document.querySelector(".pa-units") }; });
  assert.deepEqual(r.opts, ["g", "kg", "ml", "l", "pieces", "packs", "tbsp", "tsp"]);
  assert.deepEqual(r.g, { n: "1500", eq: "= 1½ packs" });   // counted in grams: the packs are said under it
  assert.deepEqual(r.kg, { n: "1.5", eq: "= 1,500 g" });
  assert.equal(r.chipsRow, false);                          // the 8-chip «Counted in» row is gone
});

test("L209: the pantry sheet fits the phone: no chip outside the sheet, the amount row on one axis, no page error", async () => {
  const page = await start(F.seed(), H.VIEWPORTS.phone);
  const r = await page.evaluate(async () => { S.shop.pantry = { "t-rice": { g: 500 } }; DATA_V++; ACT["pantry-edit"]({ dataset: { id: "t-rice" } }); await new Promise(r => setTimeout(r, 300));
    const sh = document.querySelector(".sheet").getBoundingClientRect(), out = [...document.querySelectorAll(".sheet .chip, .sheet .step, .sheet select")].filter(e => e.getBoundingClientRect().right > sh.right + 0.5).length;
    const row = [...document.querySelector(".pa-amt").children].map(e => { const b = e.getBoundingClientRect(); return Math.round(b.top + b.height / 2); });
    return { out, axis: Math.max(...row) - Math.min(...row) }; });
  assert.equal(r.out, 0); assert.ok(r.axis <= 1, `amount row off axis by ${r.axis}px`);
  assert.deepEqual(app.errors, []);
});

test("L209: the At home box of the planner and of the food reads «½ pack», not «0.5 packs»", async () => {
  const page = await start();
  const r = await page.evaluate(() => { S.shop.pantry = { "t-rice": { g: 500 } }; DATA_V++; return stockBoxHTML("t-rice"); });
  assert.match(r, /½ pack/); assert.doesNotMatch(r, /0\.5 packs/);
});
