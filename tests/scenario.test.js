/* ENG-03: the seven-day scenario end to end on synthetic data. Plan 7 days with recipes, change an ingredient, use the
   stock, record what was eaten, buy, and check inventory, list, spending-relevant quantities and nutrients; then repeat
   the checks after a reload, offline, and with a simulated account sync. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");

test("seven-day scenario: plan, edit a recipe, link the pantry, eat, buy, inventory and list stay consistent", async () => {
  const app = await H.startApp({ dir: H.build(H.tmp("scenario-build")), seed: F.seed() });
  const P = app.page, ev = (f, a) => P.evaluate(f, a);
  try {
    // the invariant checked after every step: per food, planned = covered by stock + still to buy; the real stock is not touched by reading
    const invariant = () => ev(() => {
      const t = todayISO(), rows = shoppingRows(t, 7), cov = shoppingCovered(t, 7), P_ = stockPlan(t, 7), bad = [];
      for (const id of Object.keys(P_.need)) { const buy = rows.find(r => r.id === id)?.buy ?? 0, c = cov.find(r => r.id === id)?.covered ?? 0; if (Math.abs(P_.need[id] - (buy + c)) > 1.01) bad.push([id, P_.need[id], buy, c]); }
      return bad;
    });

    // 1. pantry has 600 g rice; link the plan to it (what "Use what's at home" does)
    const linked = await ev(() => { S.shop.pantry["t-rice"] = { g: 600 }; DATA_V++; return linkFromPantry(todayISO(), 7); });
    assert.equal(linked, 4, "days 0 and 1: the bowl and the plain rice, until the 600 g are used up");
    assert.deepEqual(await invariant(), []);
    let r = await ev(() => Object.fromEntries(shoppingRows(todayISO(), 7).map(x => [x.id, [x.need, x.covered, x.buy]])));
    assert.deepEqual(r["t-rice"], [2100, 600, 1500]);
    assert.deepEqual(r["t-chicken"], [2100, 0, 2100]);

    // 2. edit an ingredient of the recipe: chicken 300 → 400 g; the list follows
    await ev(() => { const rec = clone(S.recipes["t-bowl"]); rec.ingredients.find(i => i.food === "t-chicken").g = 400; put("recipes", "t-bowl", rec); });
    r = await ev(() => Object.fromEntries(shoppingRows(todayISO(), 7).map(x => [x.id, x.need])));
    assert.equal(r["t-chicken"], 2800);
    assert.deepEqual(await invariant(), []);

    // 3. inventory at a future date, before eating anything
    assert.equal(await ev(() => stockOn(addDays(todayISO(), 0))["t-rice"]), 300);
    assert.equal(await ev(() => stockOn(addDays(todayISO(), 1))["t-rice"]), 0);

    // 4. eat day 0 (both meals): stock drops by what was linked, nutrients count only what was eaten
    const eaten = await ev(() => {
      const t = todayISO(); mutateDay(t, d => { for (const [, it] of dayItems(d)) { it.eaten = true; pantryAdjust(it, 1); } });
      const tot = dayTotals(S.days[t], true), planned = dayTotals(S.days[addDays(t, 1)]);
      return { stock: S.shop.pantry["t-rice"].g, kcal: Math.round(tot.kcal), plannedNextDay: Math.round(planned.kcal) };
    });
    assert.equal(eaten.stock, 300);
    assert.equal(eaten.kcal, 200 * 3.5 + 400 * 1.1 + 10 * 9 + 100 * 3.5, "recipe (after the edit) + 100 g rice");
    assert.equal(eaten.plannedNextDay, eaten.kcal);
    assert.deepEqual(await invariant(), []);
    r = await ev(() => Object.fromEntries(shoppingRows(todayISO(), 7).map(x => [x.id, [x.need, x.covered, x.buy]])));
    assert.deepEqual(r["t-rice"], [1800, 300, 1500], "today's meals are eaten: no longer needed; the buy quantity is unchanged");

    // 5. buy: ticking rice on the list puts it in the pantry and links the rest of the plan; it leaves the list
    const bought = await ev(() => {
      UI.shopStart = todayISO(); S.shop.range = 7; S.shop.mode = "days"; DATA_V++;
      ACT["shop-check"]({ dataset: { id: "t-rice" } });
      return { stock: S.shop.pantry["t-rice"].g, rice: shopToBuy().some(x => x.id === "t-rice"), chicken: shopToBuy().find(x => x.id === "t-chicken").buy };
    });
    assert.equal(bought.stock, 300 + 2000, "two 1000 g packs");
    assert.equal(bought.rice, false);
    assert.equal(bought.chicken, 2400);
    assert.deepEqual(await invariant(), []);
    assert.equal(await ev(() => stockOn(addDays(todayISO(), 6))["t-rice"]), 2300 - 300 - 5 * 300, "day 1 and days 2–6 linked");

    // 6. everything above survives a reload
    const before = await ev(() => JSON.stringify([S.days, S.shop, S.recipes]));
    await app.reload();
    assert.equal(await ev(() => JSON.stringify([S.days, S.shop, S.recipes])), before);
    assert.deepEqual(await invariant(), []);

    // 7. offline (navigator.onLine false; the local server stays reachable): eat day 1, reload, the stock is still right
    await ev(() => { Object.defineProperty(navigator, "onLine", { get: () => false, configurable: true }); window.dispatchEvent(new Event("offline")); });
    await ev(() => { mutateDay(addDays(todayISO(), 1), d => { for (const [, it] of dayItems(d)) { it.eaten = true; pantryAdjust(it, 1); } }); });
    await app.reload();
    assert.equal(await ev(() => S.shop.pantry["t-rice"].g), 2300 - 300);
    assert.deepEqual(await invariant(), []);

    // 8. simulated account sync: local changes are written as the right documents; a change from another device is applied
    const sync = await ev(async () => {
      const log = []; const ref = path => ({ set: async d => { log.push(["set", path, clone(d)]); }, delete: async () => { log.push(["delete", path]); }, collection: n => ({ doc: id => ref(path + "/" + n + "/" + id) }) });
      Sync.db = { doc: p => ref(p) }; Sync.base = "u1";
      mutateDay(addDays(todayISO(), 2), d => { for (const [, it] of dayItems(d)) { it.eaten = true; pantryAdjust(it, 1); } });
      await new Promise(r => setTimeout(r, 1200));
      const wrote = log.map(x => x[1]);
      const remote = clone(S.shop); remote.pantry["t-rice"].g = 111;
      applyDoc("shop", { exists: true, data: () => remote, metadata: { fromCache: false } });
      Sync.db = null;
      return { wrote, stock: S.shop.pantry["t-rice"].g, pending: Sync.pending.size };
    });
    assert.ok(sync.wrote.includes("u1/shop"), "the pantry change is written to the shop document");
    assert.ok(sync.wrote.some(p => p === "u1/lib/days/" + p.split("/").pop() && p.startsWith("u1/lib/days/")), "the eaten day is written");
    assert.equal(sync.stock, 111, "the other device's pantry arrives");
    assert.equal(sync.pending, 0);
    assert.deepEqual(await invariant(), []);
    assert.deepEqual(app.errors, []);
  } finally { await app.close(); }
});
