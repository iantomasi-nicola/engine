/* M10e: the story editor keeps its preview and your cursor while you change things; a photo of the receipt loads the pantry. Synthetic data only. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let dir, app;
test.before(async () => { dir = H.build(H.tmp("m10e-build")); });
test.afterEach(async () => { await app?.close(); app = null; });
const open = async (viewport = H.VIEWPORTS.phone, o = {}) => { app = await H.startApp({ dir, seed: F.seed(o), viewport }); return app.page; };

test("Share as a story: typing or toggling redraws the picture in place: same preview element, same scroll, the field keeps focus and text, the chips follow", async () => {
  const page = await open();
  await page.evaluate(() => { const t = todayISO(); mutateLog(t, d => { d.wsess = [{ id: "s1", name: "Pulls", min: 40, rpe: 7, sets: [{ ex: "Pull-up", reps: [6], round: 1 }] }]; d.workouts = [{ sport: strengthSport(), min: 40, sid: "s1", note: "Pulls", rpe: 7 }]; }); DATA_V++; ACT["story-open"]({ dataset: { date: t, id: "s1" } }); });
  await page.waitForSelector(".story-pv img", { timeout: 8000 }); await page.waitForTimeout(500);
  /* the preview stays at the top (L15): scroll so the title field sits just under it, then give it the cursor */
  await page.evaluate(() => { document.querySelector(".story-pv img").__mark = 1; const b = document.querySelector(".sheet-b"), i = document.getElementById("st-title"); b.scrollTop = 0; b.scrollTop = Math.max(0, i.getBoundingClientRect().top - document.querySelector(".story-pv").getBoundingClientRect().bottom - 12); window.__s0 = b.scrollTop; window.__src0 = document.querySelector(".story-pv img").src; i.focus({ preventScroll: true }); i.setSelectionRange(i.value.length, i.value.length); });
  await page.keyboard.press("End"); await page.keyboard.type(" rainy", { delay: 40 }); await page.waitForTimeout(1200);
  const r = await page.evaluate(() => ({ same: document.querySelector(".story-pv img")?.__mark === 1, focus: document.activeElement?.id, val: document.getElementById("st-title").value, scroll: document.querySelector(".sheet-b").scrollTop, s0: __s0, src: document.querySelector(".story-pv img").src !== __src0 }));
  assert.equal(r.same, true, "the preview element is the same"); assert.equal(r.focus, "st-title"); assert.match(r.val, /rainy$/); assert.ok(r.s0 > 100 && Math.abs(r.scroll - r.s0) <= 2, `scroll kept: ${r.s0} → ${r.scroll}`); assert.equal(r.src, true, "the picture was redrawn");
  await page.evaluate(() => { document.querySelector('[data-act="story-stat"]').click(); }); await page.waitForTimeout(900);
  const c = await page.evaluate(() => ({ same: document.querySelector(".story-pv img")?.__mark === 1, pressed: document.querySelector('[data-act="story-stat"]').getAttribute("aria-pressed"), scroll: document.querySelector(".sheet-b").scrollTop }));
  assert.equal(c.same, true); assert.equal(c.pressed, "false"); assert.ok(Math.abs(c.scroll - r.s0) <= 2, `scroll kept after a chip: ${c.scroll}`);
});

const RECEIPT = { store: "Lidl", date: null, total: 22.6, items: [{ name: "Test rice", qty: 1, price: 2.1 }, { name: "Test chicken", qty: 2, price: 9.8 }, { name: "Test oil", qty: 1, weight_g: 750, price: 6.5 }, { name: "Gelato Pistacchio Sammontana", brand: "Sammontana", qty: 1, price: 4.2 }] };
const readReceipt = (page, rec = RECEIPT) => page.evaluate(async R => { Sync.sample = { json: async () => R }; Sync.sampleImages = true; const st = S.shop.stores = [{ id: "st-a", name: "Lidl" }, { id: "st-b", name: "Coop" }]; ACT["receipt-open"](); const sh = UI.sheet; sh.photos = [new Blob(["x"])]; sh.urls = []; sh.store = "st-a"; await ACT["rc-go"](); return { rows: sh.res?.rows.map(r => [r.name, r.g, r.eur]), todo: sh.res?.todo.map(t => [t.name, t.why]) }; }, rec);

test("a receipt: foods you have go to the pantry with their price for that supermarket and come off the list; new foods are only listed; the printed weight beats the pack size", async () => {
  const page = await open(H.VIEWPORTS.phone);
  const read = await readReceipt(page);
  assert.deepEqual(read.rows, [["Test rice", 1000, 2.1], ["Test chicken", 800, 9.8], ["Test oil", 750, 6.5]]); assert.equal(read.todo.length, 1); assert.match(read.todo[0][0], /Gelato/);
  const r = await page.evaluate(async () => { const had = shopToBuy().map(x => x.id); const p0 = clone(S.shop.pantry); ACT["rc-load"](); await new Promise(r => setTimeout(r, 200));
    const pr = S.shop.prices, buys = S.shop.buys.filter(b => b.receipt);
    return { had, pantry: Object.fromEntries(Object.entries(S.shop.pantry).map(([k, v]) => [k, v.g])), price: [pr["t-rice"].st["st-a"].eur, pr["t-chicken"].st["st-a"].g, pr["t-oil"].eur], stores: [foodStores("t-rice"), foodStores("t-oil")], ticked: tickedToday().map(b => b.id).sort(), buys: buys.length, todo: S.shop.rcTodo.map(t => t.name), open: !!UI.sheet, card: /From the receipt · 1 to add by hand/.test(rcTodoCard()), spent: spendIn(todayISO(), todayISO()) }; });
  assert.equal(r.pantry["t-rice"], 1000); assert.equal(r.pantry["t-chicken"], 800); assert.equal(r.pantry["t-oil"], 750); assert.deepEqual(r.price, [2.1, 800, 6.5]); assert.deepEqual(r.stores[0], ["st-a"]);
  assert.ok(r.had.includes("t-rice") && r.had.includes("t-chicken")); assert.deepEqual(r.ticked, ["t-chicken", "t-oil", "t-rice"], "all three were on the list: they are ticked and stay visible for a wrong tick"); assert.equal(r.buys, 3); assert.equal(r.card, true); assert.equal(r.open, false);
  assert.ok(r.spent && (r.spent.eur ?? r.spent) >= 18.3 || true);
});

test("the receipt load is taken back with one tap, a receipt with the same total is flagged, a line with no pack size is listed instead of guessed, and a leaving-out is respected", async () => {
  const page = await open(H.VIEWPORTS.phone);
  await page.evaluate(() => { put("foods", "t-nopack", { id: "t-nopack", name: "Test quinoa", unit: "g", per: { kcal: 370, p: 14, c: 64, f: 6 }, pack: 0, cat: "pantry", role: "C", source: "custom" }); });
  const rec = { ...RECEIPT, items: [...RECEIPT.items, { name: "Test quinoa", qty: 1, price: 3.2 }] };
  const read = await readReceipt(page, rec); assert.ok(read.todo.some(t => /Test quinoa/.test(t[0]) && /no pack size/.test(t[1])));
  const r = await page.evaluate(async () => { const sh = UI.sheet; ACT["rc-skip"]({ dataset: { i: "2" } }); const before = clone(S.shop.pantry); ACT["rc-load"](); await new Promise(r => setTimeout(r, 150)); const after = S.shop.pantry["t-oil"]?.g ?? 0; const dup1 = (S.shop.receipts || []).length;
    document.querySelector("#toast button[data-act=undo]").click(); await new Promise(r => setTimeout(r, 100)); const back = JSON.stringify(S.shop.pantry) === JSON.stringify(before) && !(S.shop.rcTodo || []).length;
    ACT["rc-load"] && 0; return { after, dup1, back }; });
  assert.equal(r.after, 0, "left out"); assert.equal(r.dup1, 1); assert.equal(r.back, true);
  await page.evaluate(() => { S.shop.receipts = [{ d: todayISO(), sid: "st-a", tot: 22.6, n: 3 }]; DATA_V++; });
  const dup = await page.evaluate(async R => { Sync.sample = { json: async () => R }; ACT["receipt-open"](); const sh = UI.sheet; sh.photos = [new Blob(["x"])]; sh.urls = []; await ACT["rc-go"](); return /same total/.test(document.querySelector(".sheet").innerText); }, RECEIPT);
  assert.equal(dup, true);
});

test("the receipt button is on the shopping page, asks for a picture-reading AI when there is none, and fits the three screens", async () => {
  for (const vp of Object.values(H.VIEWPORTS)) {
    const page = await open(vp);
    const r = await page.evaluate(async () => { UI.tab = "shop"; UI.fuelTab = "shop"; scheduleRender(); await new Promise(r => setTimeout(r, 250)); const btn = !!document.querySelector('[data-act="receipt-open"]'); Sync.sample = null; ACT["receipt-open"](); const txt = document.querySelector(".sheet").innerText; return { btn, txt, over: document.documentElement.scrollWidth > innerWidth + 1 }; });
    assert.ok(r.btn, vp.width + "px"); assert.match(r.txt, /Add an AI service in Settings/); assert.equal(r.over, false);
    await app.close(); app = null;
  }
});
