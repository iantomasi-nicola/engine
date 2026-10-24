/* Characterisation tests of the domain functions as they behave at the baseline (cae350d).
   They run inside the real app (Chromium) on synthetic data. A test marked KNOWN pins a behaviour we plan to change:
   when its milestone lands, the test is updated on purpose, not silently. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let dir, app;
test.before(async () => { dir = H.build(H.tmp("domain-build")); app = await H.startApp({ dir, seed: F.seed() }); });
test.after(async () => { await app?.close(); });
const ev = (fn, arg) => app.page.evaluate(fn, arg);
const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} vs ${b}`);

test("app booted without script errors", () => assert.deepEqual(app.errors, []));

test("running: VDOT of a 20:00 5 km is about 49.8 and predictMin inverts it", async () => {
  const r = await ev(() => { const v = vdotOf(5, 20); return { v, back: predictMin(5, v), marathon: predictMin(42.195, v) }; });
  assert.ok(r.v > 49.5 && r.v < 50.1, "vdot " + r.v);
  close(r.back, 20, 0.05);
  assert.ok(r.marathon > 3 * 60 && r.marathon < 3.5 * 60, "marathon min " + r.marathon);
  assert.equal(await ev(() => vdotOf(5, 2)), null, "out of range time → null");
});

test("strength: e1RM of +20 kg x 5 at bodyweight 80 kg is (80+20)(1+5/30)-80", async () => {
  const v = await ev(() => e1rm({ date: todayISO(), kg: 20, reps: 5, rir: 0, bw: 80 }));
  close(v, 100 * (1 + 5 / 30) - 80);
  const withRir = await ev(() => e1rm({ date: todayISO(), kg: 20, reps: 5, rir: 2, bw: 80 }));
  assert.ok(withRir > v, "RIR raises the estimate");
});

test("energy: Mifflin BMR and the TDEE identity with no sessions and no watch", async () => {
  const r = await ev(() => { const d = todayISO(), x = energyAt(d), E = FIT().energy; return { x, E: { tef: E.tef, neat: E.neat, bmr: E.bmr }, age: ageAt(d) }; });
  assert.equal(r.E.bmr, "Mifflin-St Jeor");
  close(r.x.bmr, 10 * 80 + 6.25 * 180 - 5 * r.age + 5, 1e-6);
  assert.equal(r.x.eat, 0);
  close(r.x.neat, r.E.neat);
  close(r.x.tef, r.E.tef * (r.x.bmr + r.x.neat + r.x.eat), 1e-6);
  close(r.x.tdeeW, r.x.bmr + r.x.neat + r.x.eat + r.x.tef, 1e-6);
  close(r.x.tdee, r.x.tdeeW * r.x.factor, 1e-6);
});

test("recipes: totals are the sum of the foods, per serving divides by servings", async () => {
  const r = await ev(() => { const rec = getRecipe("t-bowl"); return { tot: recipeTotals(rec), per: recipePerServing(rec) }; });
  const kcal = 2 * 3.5 + 3 * 1.1 + 0.1 * 9; // 200 g rice, 300 g chicken, 10 g oil
  close(r.tot.kcal, 200 * 3.5 + 300 * 1.1 + 10 * 9, 1e-6);
  close(r.per.kcal, r.tot.kcal / 2, 1e-6);
  close(r.tot.p, 200 * 0.07 + 300 * 0.23, 1e-6);
  assert.ok(kcal > 0);
});

test("day totals: eatenOnly counts only ticked items", async () => {
  const r = await ev(() => { const d = todayISO(), day = clone(S.days[d]); const all = dayTotals(day), none = dayTotals(day, true); day.meals.d[0].eaten = true; return { all, none, one: dayTotals(day, true) }; });
  assert.equal(r.none.kcal, 0);
  close(r.one.kcal, 100 * 3.5);
  assert.ok(r.all.kcal > r.one.kcal);
});

test("shopping: need = planned recipes + foods, rounded up to whole packs (no pantry)", async () => {
  const r = await ev(() => Object.fromEntries(shoppingRows(todayISO(), 1).map(x => [x.id, { need: x.need, have: x.have, buy: x.buy, packs: x.packs, left: x.left }])));
  // today: the recipe (2 servings of a 2-serving recipe = 200 g rice, 300 g chicken, 10 g oil) + 100 g rice as a plain food
  assert.deepEqual(r["t-rice"], { need: 300, have: 0, buy: 300, packs: 1, left: 700 });
  assert.deepEqual(r["t-chicken"], { need: 300, have: 0, buy: 300, packs: 1, left: 100 });
  // 10 g of a 500 g pack is 2% of it: Math.ceil(buy / pack - 0.02) gives 0 packs, so a tiny need is "bought" as 0 packs (quirk, kept as is)
  assert.deepEqual(r["t-oil"], { need: 10, have: 0, buy: 10, packs: 0, left: 0 });
});

test("shopping: eaten items are not needed any more; a seven-day range adds up all days", async () => {
  const r = await ev(() => {
    const d = todayISO(), snap = clone(S.days[d]);
    S.days[d].meals.m[0].eaten = true; S.days[d].meals.d[0].eaten = true; DATA_V++;
    const eaten = shoppingRows(d, 1).length;
    S.days[d] = snap; DATA_V++;
    return { eaten, week: Object.fromEntries(shoppingRows(d, 7).map(x => [x.id, x.need])) };
  });
  assert.equal(r.eaten, 0);
  assert.deepEqual(r.week, { "t-rice": 7 * 300, "t-chicken": 7 * 300, "t-oil": 7 * 10 });
});

test("shopping: computing needs never changes the real pantry (projections are read-only)", async () => {
  const same = await ev(() => { S.shop.pantry["t-rice"] = { g: 150 }; const before = JSON.stringify([S.shop, S.days]); shoppingRows(todayISO(), 7); stockPlan(todayISO(), 14); shoppingRows(addDays(todayISO(), 3), 3); shopToBuy(); const ok = before === JSON.stringify([S.shop, S.days]); delete S.shop.pantry["t-rice"]; return ok; });
  assert.ok(same);
});

test("pantry stock not linked to the plan does not reduce the list: it is offered as free at home", async () => {
  const r = await ev(() => { S.shop.pantry["t-rice"] = { g: 150 }; DATA_V++; const row = shoppingRows(todayISO(), 1).find(x => x.id === "t-rice"); const out = { need: row.need, covered: row.covered, free: row.free, buy: row.buy }; delete S.shop.pantry["t-rice"]; DATA_V++; return out; });
  assert.deepEqual(r, { need: 300, covered: 0, free: 150, buy: 300 });
});

test("a plain food linked to the pantry is covered by it (earliest days first); an unlinked recipe is still bought in full", async () => {
  const r = await ev(() => {
    const d = todayISO(); S.shop.pantry["t-rice"] = { g: 150 }; S.days[d].meals.d[0].pan = true; DATA_V++;
    const row = shoppingRows(d, 1).find(x => x.id === "t-rice"), out = { need: row.need, covered: row.covered, free: row.free, buy: row.buy };
    delete S.shop.pantry["t-rice"]; delete S.days[d].meals.d[0].pan; DATA_V++; return out;
  });
  assert.deepEqual(r, { need: 300, covered: 100, free: 50, buy: 200 });
});

test("a food fully covered by the pantry has no row to buy but is listed as covered (B3)", async () => {
  const r = await ev(() => {
    const d = todayISO(); S.foods["t-pasta"] = { id: "t-pasta", name: "Test pasta", per: { kcal: 360, p: 12, c: 72, f: 2, fib: 3 }, unit: "g", pack: 500, cat: "pantry", role: "C", meals: ["m"], source: "custom", servings: [] };
    S.days[d].meals.s = [{ id: "it-pasta", kind: "food", ref: "t-pasta", qty: 100, eaten: false, pan: true }]; S.shop.pantry["t-pasta"] = { g: 500 }; DATA_V++;
    const out = { row: shoppingRows(d, 1).some(x => x.id === "t-pasta"), toBuy: shopToBuy().some(x => x.id === "t-pasta"), covered: shoppingCovered(d, 1).find(x => x.id === "t-pasta")?.covered };
    delete S.foods["t-pasta"]; delete S.days[d].meals.s; delete S.shop.pantry["t-pasta"]; DATA_V++; return out;
  });
  assert.deepEqual(r, { row: false, toBuy: false, covered: 100 });
});
