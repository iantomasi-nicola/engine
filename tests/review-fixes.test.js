/* Code-review fixes: swap undo touches only what the swap changed, shop undo is all-or-nothing for the pantry, normalizeRecords respects F-09,
   no write while the live player renders, the push-up permission race, and restore replace keeps the shape of train/body/shop. Synthetic data only.
   Hand-computed values are in the comment of each test. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let dir, app;
test.before(async () => { dir = H.build(H.tmp("review-fixes-build")); });
test.afterEach(async () => { await app?.close(); app = null; });
const start = async (o = { withPlan: false }, vp = H.VIEWPORTS.phone) => { app = await H.startApp({ dir, seed: F.seed(o), viewport: vp }); return app.page; };
const begin = async page => {
  await page.evaluate(`(() => { startWorkout({ script: "Push 3x\\n- 10 Push-up\\n\\nPull 3x\\n- 6 Pull-up", name: "Push day", sport: strengthSport(), date: todayISO() }); UI.tab = "live"; render(); })()`); await page.waitForTimeout(200);
  await page.evaluate(() => { ACT["lv-begin"](); ACT["lv-skipprep"]?.(); }); await page.waitForTimeout(250);
};

test("1. Undo of a swap restores only the items it changed: a day added later survives, a meal ticked later keeps its food and its stock", async () => {
  const page = await start({ withPlan: true });
  /* plan: rice 100 g (uneaten) on today..+6; chicken stock 300 g. Swap rice -> chicken (same grams, no macro key): 7 items change.
     Then: a new day today+10 gets a meal; the item of today+1 is ticked (chicken 100 g eaten, stock 300 - 100 = 200); Undo.
     Expected: today+10 still there; today+1 item still chicken, eaten; the 6 other days have rice 100 again; stock stays 200. */
  const r = await page.evaluate(() => {
    S.shop.pantry = { "t-chicken": { g: 300 } }; DATA_V++;
    const t = todayISO(), d1 = addDays(t, 1), dN = addDays(t, 10);
    swapFood("t-rice", "t-chicken"); const undo = toast.undo;
    put("days", dN, { date: dN, meals: { m: [{ id: "new1", kind: "food", ref: "t-oil", qty: 10, eaten: false }] } });
    mutateDay(d1, d => { const it = dayItems(d).find(([, x]) => x.id === "it-rice-1")[1]; it.eaten = true; pantryAdjust(it, 1, d1); });
    const stock0 = S.shop.pantry["t-chicken"].g; undo();
    const it1 = dayItems(S.days[d1]).find(([, x]) => x.id === "it-rice-1")[1];
    const others = Object.entries(S.days).filter(([d]) => d !== d1 && d !== dN && d >= t).map(([, day]) => dayItems(day).find(([, x]) => x.id.startsWith("it-rice"))[1]);
    return { stock0, stock: S.shop.pantry["t-chicken"].g, newDay: !!S.days[dN], ref1: it1.ref, eaten1: !!it1.eaten, others: others.map(x => x.ref + ":" + x.qty) };
  });
  assert.equal(r.stock0, 200); assert.equal(r.stock, 200); assert.equal(r.newDay, true);
  assert.equal(r.ref1, "t-chicken"); assert.equal(r.eaten1, true);
  assert.deepEqual(r.others, Array(6).fill("t-rice:100"));
  assert.deepEqual(app.errors, []);
});

test("2a. Undo of Finish shopping after a meal ate from the bought food: the purchase and its pantry grams go together", async () => {
  const page = await start();
  /* rice 100 g at home; trip +500 -> 600; a meal eats 50 -> 550; Undo takes the trip's 500 away arithmetically -> 50 (the 50 g eaten stays eaten), buys 0 */
  const r = await page.evaluate(() => {
    S.shop.pantry = { "t-rice": { g: 100 } }; S.shop.checked = { "t-rice": { g: 500, eur: 5 } }; DATA_V++; ACT["shop-done"]();
    const after = S.shop.pantry["t-rice"].g; stockSet("t-rice", 550); undoTrip();
    return { after, rice: S.shop.pantry["t-rice"]?.g ?? null, buys: S.shop.buys.length };
  });
  assert.deepEqual(r, { after: 600, rice: 50, buys: 0 });
});

test("2b. Undo of a trip when the bought food was used up since: the pantry never goes negative and the entry goes away", async () => {
  const page = await start();
  /* nothing at home; trip +400 chicken; all 400 eaten (entry 0); Undo: 0 + (0 - 400) = -400 -> clamped to 0, entry removed (it was not there before) */
  const r = await page.evaluate(() => {
    S.shop.pantry = {}; S.shop.checked = { "t-chicken": { g: 400, eur: 4 } }; DATA_V++; ACT["shop-done"](); stockSet("t-chicken", 0); undoTrip();
    return { chicken: S.shop.pantry["t-chicken"] ?? null, buys: S.shop.buys.length };
  });
  assert.deepEqual(r, { chicken: null, buys: 0 });
});

test("2c. shopUndo on a list: an element changed after the action is replaced by the old one, never duplicated", async () => {
  const page = await start();
  const r = await page.evaluate(() => {
    const before = { extras: [{ id: "e1", text: "milk", done: false }] }, after = { extras: [{ id: "e1", text: "milk", done: true }] };
    S.shop.extras = [{ id: "e1", text: "milk", done: true, eur: 2 }, { id: "e2", text: "bread", done: false }];
    shopUndo(before, after); return S.shop.extras.map(x => x.id + ":" + x.done).sort();
  });
  assert.deepEqual(r, ["e1:false", "e2:false"]);
});

test("3. normalizeRecords: «5,5» becomes 5.5, an unknown value stays unknown (null ≠ 0), no field is invented, bad ingredients are counted", async () => {
  const page = await start();
  const r = await page.evaluate(() => {
    S.foods.x1 = { id: "x1", name: "A", per: { kcal: "5,5", p: null, c: "3", f: 2, fib: null, sug: "1,5" }, servings: "x", source: "custom" };
    S.foods.x2 = { id: "x2", name: "B", per: { kcal: 100 }, source: "custom" };
    S.foods.x3 = { id: "x3", name: "C", source: "custom" };
    S.recipes.r1 = { id: "r1", name: "R", servings: "2", source: "custom", ingredients: [{ food: "x1", g: "20,5" }, "bad", null, { g: 3 }] };
    const dropped = normalizeRecords(), x1 = S.foods.x1, x2 = S.foods.x2;
    return { dropped, per1: x1.per, serv: x1.servings, per2: Object.keys(x2.per), pack2: "pack" in x2, per3: S.foods.x3.per, ing: S.recipes.r1.ingredients, sv: S.recipes.r1.servings };
  });
  /* x1: kcal 5.5, p null (unknown), c 3, f 2, fib null, sug 1.5; servings "x" -> []; x2 keeps only kcal and gets no pack; x3 gets per {};
     recipe: 2 non-objects dropped and counted, the object without a food is kept (g 3), g "20,5" -> 20.5, servings "2" -> 2 */
  assert.deepEqual(r.per1, { kcal: 5.5, p: null, c: 3, f: 2, fib: null, sug: 1.5 }); assert.deepEqual(r.serv, []);
  assert.deepEqual(r.per2, ["kcal"]); assert.equal(r.pack2, false); assert.deepEqual(r.per3, {});
  assert.equal(r.dropped, 2); assert.deepEqual(r.ing, [{ food: "x1", g: 20.5 }, { g: 3 }]); assert.equal(r.sv, 2);
});

test("3b. screens show no NaN for a food with an unknown kcal or an ingredient without a food, and restore normalizes what it restores", async () => {
  const page = await start({ withPlan: false });
  const r = await page.evaluate(async () => {
    const t = todayISO();
    UI.sheet = { type: "restore", mode: "replace", parts: { foods: true, recipes: true, days: true }, j: { foods: { x4: { id: "x4", name: "Mystery", per: { kcal: null, p: "2,5" }, source: "custom" } },
      recipes: { r2: { id: "r2", name: "Odd", servings: 1, source: "custom", ingredients: [{ g: 5 }, 7] } }, days: { [t]: { date: t, meals: { m: [{ id: "q1", kind: "food", ref: "x4", qty: 100, eaten: true }] } } } } };
    await ACT["rs-go"]();
    const out = { p: S.foods.x4.per.p, kcal: S.foods.x4.per.kcal, ing: S.recipes.r2.ingredients.length, txt: [] };
    for (const tab of ["today", "foods", "recipes"]) { UI.tab = tab; render(); await new Promise(r => setTimeout(r, 200)); out.txt.push(document.body.innerText); }
    return out;
  });
  assert.equal(r.p, 2.5); assert.equal(r.kcal, null); assert.equal(r.ing, 1);
  for (const t of r.txt) assert.equal(/NaN|undefined/.test(t), false, t.match(/.{20}(NaN|undefined).{20}/s)?.[0]);
  assert.deepEqual(app.errors, []);
});

test("4. rendering the live player writes nothing: leaving the counted step restores the planned reps afterwards, not during render", async () => {
  const page = await start(); await begin(page);
  const r = await page.evaluate(async () => {
    const x = () => LV().res[0].ex[0]; ACT["lv-pc"]({ dataset: { x: "0" } }); const counting = x().reps[0];
    LV().cur = 1; VIEWS.live();   // a render with the step changed under the counter
    const inRender = x().reps[0], stopped = PCNT === null; await new Promise(r => setTimeout(r, 60));
    return { counting, inRender, stopped, later: x().reps[0] };
  });
  /* start: reps zeroed (0); the render itself leaves 0 (no write); the planned 10 is back right after, once */
  assert.deepEqual(r, { counting: 0, inRender: 0, stopped: true, later: 10 });
  assert.deepEqual(app.errors, []);
});

test("5. the motion permission answering after Stop, or after a new count began, does nothing", async () => {
  const page = await start(); await begin(page);
  await page.evaluate(() => { FIT().player.pushCount = "auto"; });
  const r = await page.evaluate(async () => {
    const waits = []; DeviceMotionEvent.requestPermission = () => new Promise(res => waits.push(res));
    const first = ACT["lv-pc"]({ dataset: { x: "0" } });   // permission pending
    ACT["lv-pc"]({ dataset: { x: "0" } });                 // Stop while pending
    const second = ACT["lv-pc"]({ dataset: { x: "0" } });  // a new count begins, pending too
    waits[0]("granted"); await first;
    const autoAfterFirst = PCNT.auto, ctAfterFirst = !!PCNT.ct;   // the late answer must not arm the new count
    waits[1]("granted"); await second;
    return { autoAfterFirst, ctAfterFirst, autoAfterSecond: PCNT.auto, toastTxt: document.querySelector("#toast")?.innerText || "" };
  });
  assert.deepEqual([r.autoAfterFirst, r.ctAfterFirst, r.autoAfterSecond], [false, false, true]);
  assert.doesNotMatch(r.toastTxt, /No motion sensor/);
  const stop = await page.evaluate(async () => {
    PCNT = null; let res; DeviceMotionEvent.requestPermission = () => new Promise(r => (res = r));
    const p = ACT["lv-pc"]({ dataset: { x: "0" } }); PCNT = null; res("denied"); await p; await new Promise(r => setTimeout(r, 50)); return document.querySelector("#toast")?.innerText || ""; });
  assert.doesNotMatch(stop, /No motion sensor/, "stopped while pending: silent");
  assert.deepEqual(app.errors, []);
});

test("6. restore (replace) of train/body/shop: nested parts of the wrong type fall back to the default shape", async () => {
  const page = await start();
  const r = await page.evaluate(async () => {
    UI.sheet = { type: "restore", mode: "replace", parts: { train: true, body: true, shop: true }, j: { shop: { pantry: [], checked: "x", extras: {}, range: 14 }, body: { w: [], m: 5 }, train: { tests: {}, pbs: "s", calis: [{ id: 1 }] } } };
    await ACT["rs-go"]();
    const k = o => Object.fromEntries(Object.entries(o).map(([a, v]) => [a, Array.isArray(v) ? "array" : typeof v]));
    return { shop: k(S.shop), body: k(S.body), train: k(S.train), calis: S.train.calis.length, range: S.shop.range };
  });
  assert.equal(r.shop.pantry, "object"); assert.equal(r.shop.checked, "object"); assert.equal(r.shop.extras, "array"); assert.equal(r.range, 14);
  assert.equal(r.body.w, "object"); assert.equal(r.body.m, "object");
  assert.equal(r.train.tests, "array"); assert.equal(r.train.pbs, "array"); assert.equal(r.calis, 1);
  assert.deepEqual(app.errors, []);
});
