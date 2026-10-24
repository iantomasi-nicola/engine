/* M8a: edit a food from the shopping list, duplicate warnings, a faster "At home", update a food's values from its label, aisle suggestion. Synthetic data only. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let dir, app;
test.before(async () => { dir = H.build(H.tmp("m8a-build")); });
test.afterEach(async () => { await app?.close(); app = null; });
const start = async (viewport, withPantry = false) => { app = await H.startApp({ dir, seed: F.seed({ withPantry }), viewport }); return app.page; };
const openEd = (page, id = "t-rice") => page.evaluate(id => { openSheet("food", { draft: clone({ ...blankFood(), ...S.foods[id], per: { ...blankFood().per, ...S.foods[id].per } }), isNew: false }); }, id);

test("the Buy sheet has an edit button that opens the food, and Save or Close comes back to the Buy sheet", async () => {
  const page = await start(H.VIEWPORTS.phone);
  const r = await page.evaluate(() => { UI.shopStart = todayISO(); S.shop.range = 7; DATA_V++; ACT["shop-buy"]({ dataset: { id: "t-rice" } }); const btn = !!document.querySelector('.sheet-h [data-act="by-edit"]'); ACT["by-edit"]();
    const ed = UI.sheet.type; S_().draft.brand = "Riso X"; ACT["fd-save"](); const back = UI.sheet?.type, id = UI.sheet?.id, brand = S.foods["t-rice"].brand;
    ACT["by-edit"](); ACT["close-sheet"](); return { btn, ed, back, id, brand, closed: UI.sheet?.type }; });
  assert.deepEqual(r, { btn: true, ed: "food", back: "buy", id: "t-rice", brand: "Riso X", closed: "buy" });
});

test("duplicates: same name in any word order and accent, same barcode, another name with the same values; a different brand is not a duplicate", async () => {
  const page = await start();
  const r = await page.evaluate(() => { S.foods["t-rice"].barcode = "8001"; S.foods["t-rice"].brand = "Acme"; DATA_V++; const mk = o => ({ ...blankFood(), per: { kcal: 0, p: 0, c: 0, f: 0 }, ...o }); const names = x => [...x.name, ...x.values].map(f => f.name);
    const a = foodDupes(mk({ name: "rice  TEST" })), b = foodDupes(mk({ name: "Test rice", brand: "Other" })), c = foodDupes(mk({ name: "Zzz", barcode: "8001" })), d = foodDupes(mk({ name: "Rizo", unit: "g", per: { ...S.foods["t-rice"].per } })), e = foodDupes(mk({ name: "Empty" })), self = foodDupes({ ...S.foods["t-rice"] });
    return { a: names(a), b: names(b), c: c.barcode?.name, d: names(d), e: names(e), self: [self.name.length, self.values.length, !!self.barcode] }; });
  assert.deepEqual(r.a, ["Test rice"]); assert.deepEqual(r.b, ["Test rice"].filter(() => false).concat(r.b.filter(x => x !== "Test rice")), "another brand: not the same food by name"); assert.equal(r.c, "Test rice");
  assert.ok(r.d.includes("Test rice")); assert.deepEqual(r.e, []); assert.deepEqual(r.self, [0, 0, false]);
});

test("the editor shows the warning while you type, and saving a new duplicate asks for a second Save", async () => {
  const page = await start(H.VIEWPORTS.phone);
  await page.evaluate(() => openSheet("food", { draft: blankFood("Chicken test"), isNew: true })); await page.waitForSelector("#fd-name");
  await page.fill("#fd-name", "test chicken"); await page.waitForTimeout(100);
  assert.match(await page.evaluate(() => document.querySelector("#fd-dup").innerText), /Already in your foods: Test chicken/);
  const r = await page.evaluate(() => { const n0 = Object.keys(S.foods).length; S_().draft.per.kcal = 90; ACT["fd-save"](); const first = { n: Object.keys(S.foods).length === n0, sheet: UI.sheet?.type }; ACT["fd-save"](); return { first, n: Object.keys(S.foods).length - n0 }; });
  assert.deepEqual(r, { first: { n: true, sheet: "food" }, n: 1 });
  const ok = await page.evaluate(() => { openSheet("food", { draft: blankFood("Brand new thing"), isNew: true }); S_().draft.per.kcal = 55; const n0 = Object.keys(S.foods).length; ACT["fd-save"](); return Object.keys(S.foods).length - n0; });
  assert.equal(ok, 1, "a food that is not a duplicate saves at once");
  await page.evaluate(() => { openSheet("food", { draft: blankFood("Other"), isNew: true }); S_().draft.per = { kcal: 350, p: 7, c: 78, f: 1, fib: 0 }; renderSheet(); });
  assert.match(await page.evaluate(() => document.querySelector("#fd-dup").innerText), /Same values as Test rice/);
});

test("At home: add half a pack or a pack in one tap, Used up with Undo, a use-by date, and what is set aside; it fits the three screens", async () => {
  for (const vp of Object.values(H.VIEWPORTS)) {
    const page = await start(vp, true); await openEd(page);
    await page.evaluate(() => { UI.fdOpen = { price: true }; renderSheet(); });
    const chips = await page.evaluate(() => [...document.querySelectorAll(".sb-add [data-act]")].map(b => b.innerText.trim()));
    assert.deepEqual(chips, ["+ ½ pack", "+ 1 pack", "+ 2 packs", "Used up"], vp.width + "px");
    const r = await page.evaluate(() => { const g0 = S.shop.pantry["t-rice"].g; ACT["stock-add"]({ dataset: { id: "t-rice", g: 500 } }); const a = S.shop.pantry["t-rice"].g - g0;
      CHG["stock-exp"]("2030-01-02", { dataset: { id: "t-rice" } }); const exp = S.shop.pantry["t-rice"].exp, field = document.querySelector('.sb-exp input')?.value;
      ACT["stock-zero"]({ dataset: { id: "t-rice" } }); const zero = S.shop.pantry["t-rice"]?.g ?? 0; toast.undo(); const undone = S.shop.pantry["t-rice"]?.g;
      const box = document.querySelector(".stock-box"), over = box.scrollWidth > box.clientWidth + 1 || document.documentElement.scrollWidth > innerWidth;
      return { a, exp, field, zero, undone: undone === g0 + a, over, facts: box.querySelector(".sb-s")?.innerText || "" }; });
    assert.deepEqual([r.a, r.exp, r.field, r.zero, r.undone, r.over], [500, "2030-01-02", "2030-01-02", 0, true, false], vp.width + "px"); assert.match(r.facts, /pack/);
    await app.close(); app = null;
  }
});

const TABLE = "Energia 1580 kJ / 374 kcal\nGrassi 1,5 g\ndi cui saturi 0,3 g\nCarboidrati 72 g\nProteine 12 g\nSale 0,03 g";
test("Scan label inside a food's editor: shows what differs, «Use label values» updates the draft, «Keep mine» doesn't, Close comes back to the editor", async () => {
  const page = await start(H.VIEWPORTS.phone); await openEd(page);
  const r = await page.evaluate(() => { const ed = UI.sheet; ACT["fd-label"](); const a = { scan: UI.sheet.type, stage: UI.sheet.stage, for: UI.labelFor === ed };
    ACT["close-sheet"](); const back = UI.sheet === ed && !UI.labelFor;
    ACT["fd-label"](); labelFromText(`${"Energia 1580 kJ / 374 kcal\nGrassi 1,5 g\ndi cui saturi 0,3 g\nCarboidrati 72 g\nProteine 12 g\nSale 0,03 g"}`, UI.sheet, false); const cmp = { type: UI.sheet.type, text: document.querySelector(".sheet").innerText };
    ACT["lc-back"](); const kept = { sheet: UI.sheet === ed, p: S_().draft.per.p };
    ACT["fd-label"](); labelFromText("Energia 1580 kJ / 374 kcal\nGrassi 1,5 g\ndi cui saturi 0,3 g\nCarboidrati 72 g\nProteine 12 g\nSale 0,03 g", UI.sheet, false); ACT["lc-apply"]();
    const d = S_().draft; return { a, back, cmp, kept, applied: { kcal: d.per.kcal, p: d.per.p, c: d.per.c, f: d.per.f, sheet: UI.sheet === ed, name: d.name } }; });
  assert.deepEqual(r.a, { scan: "scan", stage: "label", for: true }); assert.equal(r.back, true); assert.equal(r.cmp.type, "labelcmp"); assert.match(r.cmp.text, /differ/); assert.match(r.cmp.text, /Protein/);
  assert.deepEqual(r.kept, { sheet: true, p: 7 }); assert.deepEqual(r.applied, { kcal: 374, p: 12, c: 72, f: 1.5, sheet: true, name: "Test rice" });
  const fresh = await page.evaluate(() => { closeSheet(); openSheet("scan", { stage: "label", labelOnly: true, date: UI.date, meal: "m" }); labelFromText("Energia 1580 kJ / 374 kcal\nGrassi 1,5 g\ndi cui saturi 0,3 g\nCarboidrati 72 g\nProteine 12 g\nSale 0,03 g", UI.sheet, false); return { type: UI.sheet.type, isNew: UI.sheet.isNew }; });
  assert.deepEqual(fresh, { type: "food", isNew: true });
});

test("the aisle can be suggested by the AI on request: a valid answer sets it, nonsense changes nothing", async () => {
  const page = await start(H.VIEWPORTS.phone);
  const r = await page.evaluate(async () => { Sync.sample = { json: async () => ({ category: "dairy" }) }; openSheet("food", { draft: blankFood("Greek yogurt"), isNew: true }); const has = !!document.querySelector('[data-act="fd-cat-ai"]');
    await ACT["fd-cat-ai"](); const a = S_().draft.cat; Sync.sample = { json: async () => ({ category: "nonsense" }) }; S_().draft.cat = "pantry"; await ACT["fd-cat-ai"](); return { has, a, b: S_().draft.cat }; });
  assert.deepEqual(r, { has: true, a: "dairy", b: "pantry" });
});
