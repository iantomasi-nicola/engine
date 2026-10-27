/* L214: the meal plan shows what each meal costs, the day total and the week total, from the SAME price per gram as Foods/Pantry/Shopping (eurPerG), never a second computation.
   A food with no price is «n/a» (null, never 0) and flags the total as partial; stock at home is shown as «from pantry» and is not part of the money to spend. Synthetic data only.
   Fixture by hand: prices rice €2/1000 g = 0.002 €/g, chicken €6/500 g = 0.012 €/g, oil: no price. Day D = tomorrow:
     lunch  = rice 100 g + chicken 200 g            -> 0.2 + 2.4 = 2.60
     dinner = oil 10 g (no price)                    -> n/a
     snack  = recipe t-bowl, 1 serving of 2 (rice 100 g, chicken 150 g, oil 5 g) -> 0.2 + 1.8 = 2.00 + n/a
     day    = 4.60, partial (2 lines without a price)
   With 150 g of rice at home: lunch takes 100 g, the bowl takes the other 50 g (earliest first, as the shopping list does):
     lunch 2.40 to spend + 0.20 from pantry; bowl 0.10 + 1.80 = 1.90 + 0.10 from pantry; day 4.30 to spend + 0.30 from pantry. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let dir, app;
test.before(async () => { dir = H.build(H.tmp("l214-build")); });
test.afterEach(async () => { await app?.close(); app = null; });
const start = async (vp = H.VIEWPORTS.phone, pantry = false) => { app = await H.startApp({ dir, seed: F.seed({ withPlan: false, withPantry: false }), viewport: vp }); const p = app.page;
  await p.evaluate(({ pantry }) => { const D = addDays(todayISO(), 1); S.shop.prices = { "t-rice": { eur: 2, g: 1000 }, "t-chicken": { eur: 6, g: 500 } }; S.shop.pantry = pantry ? { "t-rice": { g: 150 } } : {};
    S.days[D] = { date: D, meals: { lunch: [newItem("food", "t-rice", 100), newItem("food", "t-chicken", 200)], dinner: [newItem("food", "t-oil", 10)], snack: [newItem("recipe", "t-bowl", 1)] } }; DATA_V++; }, { pantry }); return p; };
const near = (a, b, m) => assert.ok(Math.abs(a - b) < 1e-9, `${m}: ${a} vs ${b}`);

test("meal and day cost from the shop price per gram; no price = n/a (never 0) and the total is partial", async () => {
  const p = await start();
  const r = await p.evaluate(() => { const D = addDays(todayISO(), 1), c = m => mealCost(D, m), d = dayCost(D); return { l: c("lunch"), n: c("dinner"), s: c("snack"), d, tl: costTxt(c("lunch")), tn: costTxt(c("dinner")), td: costTxt(d), none: costTxt(mealCost(D, "breakfast")) }; });
  near(r.l.eur, 2.6, "lunch"); assert.equal(r.l.na, 0);
  assert.equal(r.n.n, 0); assert.equal(r.n.na, 1); assert.equal(r.tn, "n/a", "a meal with no priced food says n/a, not €0");
  near(r.s.eur, 2.0, "recipe from its ingredients"); assert.equal(r.s.na, 1);
  near(r.d.eur, 4.6, "day"); assert.equal(r.d.na, 2);
  assert.equal(r.tl, "€2,60"); assert.equal(r.td, "€4,60 + n/a"); assert.equal(r.none, "", "an empty meal shows nothing");
  assert.deepEqual(app.errors, []);
});
test("stock at home is «from pantry» and is not added to the money to spend", async () => {
  const p = await start(H.VIEWPORTS.phone, true);
  const r = await p.evaluate(() => { const D = addDays(todayISO(), 1), c = m => mealCost(D, m); return { l: c("lunch"), s: c("snack"), d: dayCost(D), tl: costTxt(c("lunch")), td: costTxt(dayCost(D)) }; });
  near(r.l.eur, 2.4, "lunch to spend"); near(r.l.home, 0.2, "lunch from pantry");
  near(r.s.eur, 1.9, "bowl to spend"); near(r.s.home, 0.1, "bowl from pantry");
  near(r.d.eur, 4.3, "day to spend"); near(r.d.home, 0.3, "day from pantry");
  assert.equal(r.tl, "€2,40 · €0,20 from pantry"); assert.equal(r.td, "€4,30 + n/a · €0,30 from pantry");
  assert.deepEqual(app.errors, []);
});
test("a meal fully at home reads «from pantry» alone; an eaten item uses what it took from the pantry", async () => {
  const p = await start(H.VIEWPORTS.phone, true);
  const r = await p.evaluate(() => { const D = addDays(todayISO(), 1); S.shop.pantry["t-rice"].g = 1000; DATA_V++; const a = mealCost(D, "lunch");
    const T = todayISO(); S.days[T] = { date: T, meals: { lunch: [newItem("food", "t-rice", 100, { eaten: true, took: { "t-rice": 60 } })] } }; DATA_V++; const e = mealCost(T, "lunch"); return { a, ta: costTxt({ eur: 0, home: 0.3, n: 1, na: 0 }), e }; });
  near(r.a.eur, 2.4, "chicken is not at home"); near(r.a.home, 0.2, "all the rice is at home");
  assert.equal(r.ta, "€0,30 from pantry");
  near(r.e.eur, 0.08, "eaten: 40 g were bought"); near(r.e.home, 0.12, "eaten: 60 g came from the pantry");
  assert.deepEqual(app.errors, []);
});
test("one source with the shopping list: with no pack rounding the plan's money to spend = the list's estimate", async () => {
  const p = await start(H.VIEWPORTS.phone, true);
  const r = await p.evaluate(() => { for (const f of Object.values(S.foods)) f.pack = 0; const T = todayISO(), D = addDays(T, 1); S.days[D].meals.dinner = [newItem("food", "t-chicken", 100)]; S.days[D].meals.snack = []; DATA_V++;
    return { plan: planCost(T, 7), list: shopTotals(shoppingRows(T, 7)).est }; });
  near(r.plan.eur, r.list, "plan vs shopping list");
  assert.ok(r.list > 0);
});
test("a treat (no foods) counts as n/a, never as €0", async () => {
  const p = await start();
  const r = await p.evaluate(() => { const D = addDays(todayISO(), 1); mutateDay(D, x => { x.meals.lunch.push({ id: uid(), kind: "quick", cheat: true, name: "Pizza", m: { kcal: 800, p: 30, c: 90, f: 30 }, strategy: "none" }); }); return mealCost(D, "lunch"); });
  near(r.eur, 2.6, "foods only"); assert.equal(r.na, 1);
});
test("day view: each meal shows its price, the day total sits in the hero legend, and the numbers are not repeated", async () => {
  const p = await start();
  await p.evaluate(() => { const D = addDays(todayISO(), 1), D2 = dow(D) < 6 ? addDays(D, 1) : addDays(D, -1); S.days[D2] = { date: D2, meals: { lunch: [newItem("food", "t-rice", 500)] } }; DATA_V++;   // 500 g of rice = 1.00, the same week
    UI.tab = "plan"; UI.fuelTab = "plan"; UI.planView = "day"; UI.date = D; render(); });
  await p.waitForSelector(".meal-eur");
  const t = await p.evaluate(() => ({ meals: [...document.querySelectorAll(".meal .meal-eur")].map(e => e.textContent.trim()), day: document.querySelector(".hero .hero-eur")?.textContent.replace(/\s+/g, " ").trim() }));
  assert.deepEqual(t.meals, ["€2,60", "n/a", "€2,00 + n/a"]);
  assert.match(t.day, /€4,60 \+ n\/a/); assert.match(t.day, /week €5,60 \+ n\/a/, "the week = 4.60 + 1.00");
  assert.deepEqual(app.errors, []);
});
test("weekly planner (820+): a price in every meal cell with food, the day in its header and the week total under the title", async () => {
  const p = await start(H.VIEWPORTS.desktop, true);
  await p.evaluate(() => { UI.tab = "plan"; UI.fuelTab = "plan"; UI.planView = "week"; UI.date = addDays(todayISO(), 1); render(); });
  await p.waitForSelector(".pw-eur");
  const t = await p.evaluate(() => ({ cells: [...document.querySelectorAll(".pw-cell .pw-eur")].map(e => e.textContent.trim()), day: [...document.querySelectorAll(".pw-dh .pw-deur")].map(e => e.textContent.trim()), wk: document.querySelector(".pw-wk")?.textContent.replace(/\s+/g, " ").trim() }));
  assert.deepEqual(t.cells, ["€2,40 · €0,20", "n/a", "€1,90 + n/a · €0,10"]);
  assert.deepEqual(t.day, ["€4,30 + n/a · €0,30"]);
  assert.match(t.wk, /€4,30 \+ n\/a/);
  assert.deepEqual(await p.locator(".pw-cell .pan-eur").evaluateAll(els => els.map(e => e.getAttribute("aria-label"))), ["€0,20 from pantry", "€0,10 from pantry"], "the pantry part says what it is");
  assert.deepEqual(app.errors, []);
});
test("Today: the fuel card shows the day price when the day is planned and priced", async () => {
  const p = await start(H.VIEWPORTS.desktop);
  await p.evaluate(() => { const T = todayISO(); S.days[T] = { date: T, meals: { lunch: [newItem("food", "t-rice", 100)] } }; DATA_V++; UI.tab = "today"; render(); });
  await p.waitForSelector(".td-fuel .td-eur");
  assert.equal(await p.locator(".td-fuel .td-eur").innerText(), "€0,20");
  assert.deepEqual(app.errors, []);
});
