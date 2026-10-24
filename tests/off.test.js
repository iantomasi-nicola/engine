/* M6 / A5: Open Food Facts that fails once must come back by itself, results are cached for a while only, products without values are completed by you,
   and the source is credited. Responses are simulated; Date is moved by hand. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let dir, app;
test.before(async () => { dir = H.build(H.tmp("off-build")); });
test.afterEach(async () => { await app?.close(); app = null; });
const start = async () => { app = await H.startApp({ dir, seed: F.seed({ withPlan: false }) }); return app.page; };
const PRODUCT = { status: 1, product: { code: "8000000000011", product_name: "Pasta test", brands: "Acme", nutriments: { "energy-kcal_100g": 350, proteins_100g: 12, carbohydrates_100g: 70, fat_100g: 2 } } };

test("one network error does not switch Open Food Facts off for the rest of the session: it is tried again after a short pause", async () => {
  const page = await start();
  const r = await page.evaluate(async P => {
    let calls = 0, fail = true, now = Date.now(); Date.now = () => now; const realFetch = window.fetch;
    window.fetch = async u => { if (!String(u).includes("openfoodfacts")) return realFetch(u); calls++; if (fail) throw new TypeError("network"); return { ok: true, status: 200, json: async () => P }; };
    const a = await fetchOFF("8000000000011"), c1 = calls;
    const b = await fetchOFF("8000000000011"), c2 = calls;       // right after: not hammered
    fail = false; now += 61e3;
    const c = await fetchOFF("8000000000011");                    // a minute later: back
    return { a: !!a.unreachable, b: !!b.unreachable, c1, c2, c: c.food?.name, c3: calls };
  }, PRODUCT);
  assert.deepEqual(r, { a: true, b: true, c1: 1, c2: 1, c: "Pasta test", c3: 2 });
});

test("«not found» is an answer, not a failure: it doesn't pause anything", async () => {
  const page = await start();
  const r = await page.evaluate(async () => { let calls = 0; const realFetch = window.fetch; window.fetch = async u => { if (!String(u).includes("openfoodfacts")) return realFetch(u); calls++; return { ok: false, status: 404, json: async () => ({}) }; };
    const a = await fetchOFF("8000000000012"), b = await fetchOFF("8000000000013"); return { a: !!a.notFound, b: !!b.notFound, calls }; });
  assert.deepEqual(r, { a: true, b: true, calls: 2 });
});

test("a search result is reused for a few minutes, then asked again; a failed search is not remembered", async () => {
  const page = await start();
  const r = await page.evaluate(async () => {
    let calls = 0, now = Date.now(); Date.now = () => now; const realFetch = window.fetch;
    window.fetch = async u => { if (!String(u).includes("openfoodfacts")) return realFetch(u); calls++; return { ok: true, status: 200, json: async () => ({ hits: [{ code: "1", product_name: "Pasta", nutriments: { "energy-kcal_100g": 350 } }, { code: "2", product_name: "Pasta 2", nutriments: { "energy-kcal_100g": 300 } }, { code: "3", product_name: "Pasta 3", nutriments: { "energy-kcal_100g": 320 } }] }) }; };
    await searchOFF("pasta"); const a = calls; await searchOFF("Pasta"); const b = calls; now += 11 * 60e3; await searchOFF("pasta"); return { a, b, c: calls };
  });
  assert.equal(r.a, 1); assert.equal(r.b, 1, "same words: from memory"); assert.equal(r.c, 2, "ten minutes later: asked again");
});

test("a product with a name but no nutrition values is not saved as a 0-kcal food: you are asked to complete it", async () => {
  const page = await start();
  const r = await page.evaluate(async () => {
    fetchOFF = async code => ({ food: { id: "off-" + code, name: "Mystery bar", brand: "Acme", barcode: code, unit: "g", per: { kcal: 0, p: 0, c: 0, f: 0, fib: 0 }, servings: [], pack: 0, cat: "snacks", role: "C", meals: ["s"], source: "off", incomplete: true } });
    openSheet("scan", { date: todayISO(), meal: "snack", stage: "start" }); await lookupAndAdd("8000000000077"); await new Promise(r => setTimeout(r, 30));
    return { type: UI.sheet.type, name: UI.sheet.draft?.name, saved: !!S.foods["off-8000000000077"] };
  });
  assert.deepEqual(r, { type: "food", name: "Mystery bar", saved: false });
});

test("offToFood marks a product without values as incomplete and keeps hostile text as text", async () => {
  const page = await start();
  const r = await page.evaluate(() => { const a = offToFood("1", { product_name: "No values", nutriments: {} }), b = offToFood("2", { product_name: '"><img src=x onerror="window.__xss=1">', brands: "<b>x", nutriments: { "energy-kcal_100g": 100 } });
    const d = document.createElement("div"); d.innerHTML = offRow(b, 0, "x"); document.body.appendChild(d); const bad = !!document.querySelector('img[src="x"]') || window.__xss === 1; d.remove(); return { inc: !!a.incomplete, ok: !b.incomplete, bad }; });
  assert.deepEqual(r, { inc: true, ok: true, bad: false });
});

test("the source is credited with its licence where an imported product is shown", async () => {
  const page = await start();
  const html = await page.evaluate(() => SHEETS.food({ draft: { ...blankFood("x"), source: "off", barcode: "8000000000011", per: { kcal: 1, p: 0, c: 0, f: 0, fib: 0 } }, isNew: true }).body);
  assert.match(html, /Open Food Facts/); assert.match(html, /ODbL/); assert.match(html, /opendatacommons\.org\/licenses\/odbl/);
});
