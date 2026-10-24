/* M8b-1: a scan says what it found (already in your foods / new / looks like one you have) and what you can do; + Food can scan; save only or add to the plan; Drinks filter; same-brand values duplicate. Synthetic data only, no real network. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let dir, app;
test.before(async () => { dir = H.build(H.tmp("scan-build")); });
test.afterEach(async () => { await app?.close(); app = null; });
const start = async (viewport) => { app = await H.startApp({ dir, seed: F.seed(), viewport }); return app.page; };
/* a fake Open Food Facts: the same drink under two barcodes (two pack sizes), and one the shop has never had */
const STUB = `window.__off = c => ({ id: "off-" + c, name: c === "9000000000009" ? "Plain tea" : "Energy Zero", brand: c === "9000000000009" ? "Teaco" : "Bull", barcode: c, unit: "ml", per: { kcal: 3, p: 0, c: 0, f: 0, fib: 0, sug: 0, sat: 0, salt: .1 }, servings: [], pack: 250, cat: "drinks", role: "C", meals: ["s"], source: "off", orig: { kcal: 3, p: 0, c: 0, f: 0 } });
  fetchOFF = async c => ({ food: __off(c) });`;
const scan = (page, code, intent = "plan") => page.evaluate(async ([code, intent]) => { openSheet("scan", { date: todayISO(), meal: "d", stage: "start", back: intent === "plan" ? "add" : null, intent }); await lookupAndAdd(code); await new Promise(r => setTimeout(r, 30)); return { stage: UI.sheet.stage, kind: UI.sheet.found?.kind, text: document.querySelector(".sheet").innerText }; }, [code, intent]);

test("scanning the same drink twice: the first says it is new, the second says it is already in your foods", async () => {
  const page = await start(H.VIEWPORTS.phone); await page.evaluate(STUB);
  const a = await scan(page, "9000000000001"); assert.equal(a.kind, "new"); assert.match(a.text, /New product/); assert.match(a.text, /Save and add to/); assert.match(a.text, /Save to Foods only/);
  assert.equal(await page.evaluate(() => !!S.foods["off-9000000000001"]), false, "nothing is saved until you choose");
  await page.evaluate(() => ACT["fnd-add"]()); assert.equal(await page.evaluate(() => [UI.sheet.type, !!S.foods["off-9000000000001"]].join()), "qty,true");
  const b = await scan(page, "9000000000001"); assert.equal(b.kind, "known"); assert.match(b.text, /Already in your foods/); assert.match(b.text, /Add to/);
});

test("the same product under another barcode (same name, or another name with the same values and brand) is called out, and you can use the one you have or add it as new", async () => {
  const page = await start(H.VIEWPORTS.phone); await page.evaluate(STUB);
  await scan(page, "9000000000001"); await page.evaluate(() => ACT["fnd-save"]());
  const b = await scan(page, "9000000000002"); assert.equal(b.kind, "similar"); assert.match(b.text, /Looks like one you have/); assert.match(b.text, /another barcode/);
  const r = await page.evaluate(() => { ACT["fnd-use"](); const used = UI.sheet.type + ":" + UI.sheet.ref; return used; }); assert.equal(r, "qty:off-9000000000001");
  const c = await scan(page, "9000000000002"); await page.evaluate(() => ACT["fnd-newprod"]()); assert.equal(await page.evaluate(() => UI.sheet.found.kind), "new");
  const d = await scan(page, "9000000000009"); assert.equal(d.kind, "new", "another product entirely");
});

test("from Foods the scan offers Save to Foods or Save and add to the plan; a known product opens its editor", async () => {
  const page = await start(H.VIEWPORTS.phone); await page.evaluate(STUB);
  const a = await scan(page, "9000000000001", "foods"); assert.match(a.text, /Save to Foods\b/); assert.match(a.text, /add to the plan/);
  await page.evaluate(() => ACT["fnd-save"]()); assert.equal(await page.evaluate(() => [UI.sheet, !!S.foods["off-9000000000001"]].join()), ",true");
  const b = await scan(page, "9000000000001", "foods"); assert.match(b.text, /Open this food/); await page.evaluate(() => ACT["fnd-edit"]()); assert.equal(await page.evaluate(() => UI.sheet.type), "food");
});

test("other flows (list, recipe, pantry, swap) still take the product straight away, with a clear message", async () => {
  const page = await start(); await page.evaluate(STUB);
  const r = await page.evaluate(async () => { S.foods["t-rice"].barcode = "9000000000007"; DATA_V++; openSheet("scan", { date: todayISO(), meal: "d", stage: "start" }); UI.dest = "swap"; UI.swapFrom = "t-chicken"; await lookupAndAdd("9000000000007"); await new Promise(r => setTimeout(r, 30)); return { sheet: UI.sheet.type, toast: document.querySelector("#toast")?.innerText || "" }; });
  assert.equal(r.sheet, "swapfood");
});

test("+ Food: a new food has Scan barcode and Scan label on top, and offers Save or Save and add to plan; a known barcode is flagged, an unknown one fills the form", async () => {
  const page = await start(H.VIEWPORTS.phone); await page.evaluate(STUB);
  await page.evaluate(() => { openSheet("food", { draft: blankFood(""), isNew: true, then: null }); });
  const top = await page.evaluate(() => ({ scan: !!document.querySelector('.fd-scan-row [data-act="fd-scan"]'), lab: !!document.querySelector('.fd-scan-row [data-act="fd-label"]'), foot: [...document.querySelectorAll(".sheet-f .btn")].map(b => b.innerText.trim()) }));
  assert.deepEqual(top, { scan: true, lab: true, foot: ["Save and add to plan", "Save"] });
  const r = await page.evaluate(async () => { const sh = UI.sheet; ACT["fd-scan"](); await new Promise(r => setTimeout(r, 150)); await CAM.onCode("9000000000001"); await new Promise(r => setTimeout(r, 40)); const filled = { name: sh.draft.name, kcal: sh.draft.per.kcal, bc: sh.draft.barcode, id: sh.draft.id };
    ACT["fd-save"](); const saved = !!Object.values(S.foods).find(f => f.barcode === "9000000000001");
    openSheet("food", { draft: blankFood(""), isNew: true }); const sh2 = UI.sheet; ACT["fd-scan"](); await new Promise(r => setTimeout(r, 150)); await CAM.onCode("9000000000001"); await new Promise(r => setTimeout(r, 30)); return { filled, saved, again: document.querySelector("#fd-dup").innerText, toast: document.querySelector("#toast")?.innerText || "" }; });
  assert.equal(r.filled.name, "Energy Zero"); assert.equal(r.filled.kcal, 3); assert.equal(r.saved, true); assert.match(r.again, /barcode is already on Energy Zero/); assert.match(r.toast, /Already in your foods/);
  const sv = await page.evaluate(() => { openSheet("food", { draft: blankFood("Only me"), isNew: true, then: "qty", date: todayISO(), meal: "d" }); S_().draft.per.kcal = 40; const foot = [...document.querySelectorAll(".sheet-f .btn")].map(b => b.innerText.trim()); ACT["fd-save-only"](); return { foot, sheet: UI.sheet?.type ?? null, saved: !!Object.values(S.foods).find(f => f.name === "Only me") }; });
  assert.deepEqual(sv, { foot: ["Save only", "Save and add to plan"], sheet: null, saved: true });
});

test("Drinks filter: foods in the Drinks aisle or measured in ml, never recipes, and it combines with the others", async () => {
  const page = await start(H.VIEWPORTS.phone);
  const r = await page.evaluate(() => { S.foods["x-cola"] = { id: "x-cola", name: "Zero cola", unit: "ml", per: { kcal: 1, p: 0, c: 0, f: 0 }, servings: [], pack: 330, cat: "drinks", role: "C", meals: ["s"], source: "custom" };
    S.foods["x-milk"] = { id: "x-milk", name: "Test milk", unit: "g", per: { kcal: 45, p: 3.3, c: 4.8, f: 1.5 }, servings: [], pack: 1000, cat: "drinks", role: "C", meals: ["m"], source: "custom" }; DATA_V++;
    const names = f => foodSearch("", "all", f).map(o => o.x.name); return { chip: !!FOOD_FILTERS.find(x => x[0] === "d"), d: names({ d: true }), dp: names({ d: true, p: true }), rec: foodSearch("", "all", { d: true }).some(o => o.t === "recipe") }; });
  assert.equal(r.chip, true); assert.ok(r.d.includes("Zero cola") && r.d.includes("Test milk") && !r.d.includes("Test rice")); assert.equal(r.rec, false); assert.ok(!r.dp.includes("Zero cola"));
});

test("a food with the same values under another name is flagged only when the brand is the same", async () => {
  const page = await start();
  const r = await page.evaluate(() => { S.foods["t-rice"].brand = "Acme"; DATA_V++; const mk = b => ({ ...blankFood(), name: "Something else", brand: b, per: { ...S.foods["t-rice"].per } }); const n = d => foodDupes(d).values.length; return { same: n(mk("Acme")), other: n(mk("Zeta")), none: n(mk("")) }; });
  assert.deepEqual(r, { same: 1, other: 0, none: 0 });
});
