/* Persistence, reload, offline and backup/restore on synthetic data. No network: the app never reaches Supabase here,
   so these cover the local path (localStorage) that every signed-out or offline session depends on. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let dir;
test.before(() => { dir = H.build(H.tmp("persist-build")); });

test("a plan change survives a reload", async () => {
  const app = await H.startApp({ dir, seed: F.seed() });
  try {
    await app.page.evaluate(() => { const d = todayISO(); mutateDay(d, day => { day.meals.s = [newItem("food", "t-rice", 55)]; }); });
    await app.reload();
    const r = await app.page.evaluate(() => S.days[todayISO()].meals.s?.[0]);
    assert.equal(r?.ref, "t-rice"); assert.equal(r?.qty, 55);
    assert.deepEqual(app.errors, []);
  } finally { await app.close(); }
});

test("offline: the app keeps working and saves locally; the change is there after a reload", async () => {
  const app = await H.startApp({ dir, seed: F.seed() });
  try {
    await app.ctx.setOffline(true);
    await app.page.evaluate(() => { S.shop.pantry["t-rice"] = { g: 321 }; put("shop", "", S.shop); });
    const stored = await app.page.evaluate(() => JSON.parse(localStorage.getItem(LS_KEY)).shop.pantry["t-rice"].g);
    assert.equal(stored, 321);
    await app.ctx.setOffline(false); await app.reload();
    assert.equal(await app.page.evaluate(() => S.shop.pantry["t-rice"].g), 321);
  } finally { await app.close(); }
});

test("backup: export → wipe → restore returns the same data", async () => {
  const app = await H.startApp({ dir, seed: F.seed({ withPantry: true }) });
  try {
    const before = await app.page.evaluate(() => { const j = JSON.parse(JSON.stringify(backupData())); window.__bk = j; return { foods: S.foods, recipes: S.recipes, days: S.days, shop: S.shop }; });
    await app.page.evaluate(() => { for (const k of ["foods", "recipes", "days"]) S[k] = {}; S.shop = { checked: {}, extras: [], pantry: {}, range: 7 }; saveLocal(); });
    assert.equal(await app.page.evaluate(() => Object.keys(S.days).length), 0);
    await app.page.evaluate(async () => { restoreOpen(window.__bk, "file"); await ACT["rs-go"](); });
    await app.page.waitForTimeout(300);
    const after = await app.page.evaluate(() => ({ foods: S.foods, recipes: S.recipes, days: S.days, shop: S.shop }));
    assert.deepEqual(after.foods, before.foods); assert.deepEqual(after.recipes, before.recipes);
    assert.deepEqual(after.days, before.days); assert.deepEqual(after.shop, before.shop);
    await app.reload();
    assert.deepEqual(await app.page.evaluate(() => S.days), before.days, "restored data also survives a reload");
  } finally { await app.close(); }
});

test("backup: API keys are left out of the file unless asked for", async () => {
  const seed = F.seed(); seed.settings.intervals = { key: "SECRET-INTERVALS", athlete: "i0" }; seed.settings.mapKey = "SECRET-MAP"; seed.settings.ai = { services: [{ name: "x", key: "SECRET-AI" }] };
  const app = await H.startApp({ dir, seed });
  try {
    const r = await app.page.evaluate(() => ({ plain: JSON.stringify(backupData()), withKeys: JSON.stringify(backupData({ keys: true })) }));
    for (const k of ["SECRET-INTERVALS", "SECRET-MAP", "SECRET-AI"]) { assert.ok(!r.plain.includes(k), k + " leaked into the default backup"); assert.ok(r.withKeys.includes(k), k + " missing when keys are requested"); }
  } finally { await app.close(); }
});
