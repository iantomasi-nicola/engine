/* F-09 / D12 (approved 26/10): an optional nutrient (fibre, sugars, saturated fat, salt) that is missing is UNKNOWN, not zero.
   Totals add only the known values and carry their coverage (share of the kcal whose food has the value); under 60 % the
   figure is shown as partial, with a note, never as a total. kcal, protein, carbs and fat stay mandatory. No formula changes.
   Switch: FIT().energy.nutrCoverage ("on"/"off") from FIT().energy.nutrFrom (profiles saved before it: ALGO_START; new profile: from the start).
   Synthetic foods, values worked out by hand:
     fA  "Fibre bar"     400 kcal /100 g, fibre 10, sugars 20, sat 5, salt 0.5
     fB  "Mystery pasta" 350 kcal /100 g, fibre / sugars / sat / salt unknown (null)
     fZ  "Zero salt"     100 kcal /100 g, fibre 0 and salt 0 typed by the user (known zeros)
   day 1: fA 100 g + fB 100 g   -> 750 kcal; fibre known 10 g on 400 kcal = 53.3 % -> 53 %, partial
   day 2: fA 200 g + fB 50 g    -> 975 kcal; fibre 20 g on 800 kcal = 82.1 %, shown with its target (29 g at 2200 kcal)
   day 3: fB 100 g              -> 350 kcal; salt coverage 0 % -> "—", never "0 g"
   day 4: fZ 100 g + fA 100 g   -> 500 kcal; fibre 10 g on 500 kcal = 100 %, salt 0.5 g (the typed zero is known and adds 0)
   Open Food Facts: sodium_100g 0.4 g -> salt 0.4 * 2.5 = 1 g; neither salt nor sodium -> null; fiber_100g 0 -> 0 (given). */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let app;
test.before(async () => { app = await H.startApp({ dir: H.build(H.tmp("f09")), seed: F.seed({ withPlan: false }) }); });
test.after(async () => { await app?.close(); });
const ev = (f, a) => app.page.evaluate(f, a);

const setup = () => ev(() => {
  const t = todayISO(), mk = (id, name, per) => ({ id, name, brand: "", unit: "g", per, servings: [], pack: 0, cat: "pantry", role: "C", meals: ["m"], source: "custom" });
  S.foods.fA = mk("fA", "Fibre bar", { kcal: 400, p: 10, c: 50, f: 15, fib: 10, sug: 20, sat: 5, salt: 0.5 });
  S.foods.fB = mk("fB", "Mystery pasta", { kcal: 350, p: 12, c: 70, f: 2, fib: null, sug: null, sat: null, salt: null });
  S.foods.fZ = mk("fZ", "Zero salt", { kcal: 100, p: 1, c: 20, f: 1, fib: 0, sug: 0, sat: 0, salt: 0 });
  const it = (id, ref, qty) => ({ id, kind: "food", ref, qty, eaten: true });
  const days = { 1: [["fA", 100], ["fB", 100]], 2: [["fA", 200], ["fB", 50]], 3: [["fB", 100]], 4: [["fZ", 100], ["fA", 100]] };
  for (const [n, list] of Object.entries(days)) { const d = addDays(t, -n); S.days[d] = { date: d, meals: { m: list.map(([ref, q], i) => it("x" + n + i, ref, q)) } }; }
  Object.assign(FIT().energy, { nutrCoverage: "on", nutrFrom: "" }); S.settings.pro = { on: true, micro: true }; DATA_V++;
  return Object.fromEntries([1, 2, 3, 4].map(n => [n, addDays(t, -n)]));
});
const noteText = (date, keys) => ev(([date, keys]) => { const d = document.createElement("div"); d.innerHTML = nutNote(dayNut(date, "eaten"), keys); return d.textContent; }, [date, keys]);
const rowsText = (date, on) => ev(([date, on]) => { const a = dayNut(date, "eaten"), T = nutTargets(2200), d = document.createElement("div"); d.innerHTML = nutRows(a, T, ["fib", "salt"], on); return [...d.querySelectorAll(".nut")].map(n => n.textContent.replace(/\s+/g, " ").trim()); }, [date, on]);

test("the switch: new profile on from the start, a profile saved before it stamped with ALGO_START, 'off' keeps the old zeros", async () => {
  const r = await ev(() => { const a = normalizeSettings(undefined).fit.energy, b = normalizeSettings({ fit: { energy: {} } }).fit.energy;
    FIT().energy.nutrCoverage = "on"; FIT().energy.nutrFrom = ""; const on = blankFood("x").per; FIT().energy.nutrCoverage = "off"; const off = blankFood("x").per; FIT().energy.nutrCoverage = "on";
    return { a: [a.nutrCoverage, a.nutrFrom], b: [b.nutrCoverage, b.nutrFrom, ALGO_START], on, off }; });
  assert.deepEqual(r.a, ["on", ""]);
  assert.deepEqual(r.b, ["on", "2026-10-25", "2026-10-25"]);
  assert.deepEqual(r.on, { kcal: 0, p: 0, c: 0, f: 0, fib: null, sug: null, sat: null, salt: null });
  assert.deepEqual(r.off, { kcal: 0, p: 0, c: 0, f: 0, fib: 0, sug: 0, sat: 0, salt: 0 });
});

test("a day adds only the known values and carries the coverage of each nutrient", async () => {
  const D = await setup();
  const r = await ev(d => { const a = dayNut(d[1], "eaten"), b = dayNut(d[4], "eaten"); return { kcal: a.kcal, fib: a.v.fib, covF: a.cov.fib, salt: a.v.salt, covS: a.cov.salt, kcal4: b.kcal, fib4: b.v.fib, cov4: b.cov.fib, salt4: b.v.salt }; }, D);
  assert.deepEqual(r, { kcal: 750, fib: 10, covF: 400, salt: 0.5, covS: 400, kcal4: 500, fib4: 10, cov4: 500, salt4: 0.5 });
});

test("under 60 % coverage the nutrient is a partial figure with a note and no target; from 60 % it is a total against its target", async () => {
  const D = await setup();
  const low = await rowsText(D[1], true), high = await rowsText(D[2], true);
  assert.match(low[0], /^Fibre · partial/); assert.match(low[0], /10 g/); assert.ok(!/\/ 29/.test(low[0]), low[0]);
  // the share is said once for all the partial figures of the card (fibre and salt have the same 400 of 750 kcal), not once per row
  assert.equal(await noteText(D[1], ["fib", "sug", "sat", "salt"]), "53% of the food has data for fibre, sugars, saturated fat and salt.");
  assert.match(high[0], /^Fibre/); assert.ok(!/partial/.test(high[0]), high[0]); assert.match(high[0], /20 \/ 29 g/); assert.equal(await noteText(D[2], ["fib", "salt"]), "");
});

test("nothing known is a dash, never '0 g'; a typed zero is a known zero", async () => {
  const D = await setup();
  const none = await rowsText(D[3], true), zero = await rowsText(D[4], true);
  assert.match(none[1], /^Salt\s*—/); assert.ok(!/partial|\b0 g/.test(none[1]), none[1]); assert.equal(await noteText(D[3], ["fib", "salt"]), "No food has data for fibre and salt.");
  assert.match(zero[1], /^Salt/); assert.ok(!/partial/.test(zero[1]), zero[1]); assert.match(zero[1], /0\.5 \/ ≤ 5 g/);
});

test("before the activation date, and with the switch off, the day looks as it did (a number with the small 'partial' tag)", async () => {
  const D = await setup();
  const old = await rowsText(D[1], false);
  assert.match(old[0], /Fibre · partial/); assert.match(old[0], /10 \/ 29 g/);
  const off = await ev(d => { FIT().energy.nutrFrom = addDays(todayISO(), 1); return [nutrCovOn(d), nutrCovOn(addDays(todayISO(), 2))]; }, D[1]);
  assert.deepEqual(off, [false, true]);
  await ev(() => { FIT().energy.nutrFrom = ""; });
});

test("the week and the report use the same rule: a total only with enough data", async () => {
  const D = await setup();
  const r = await ev(d => {
    // days with at least 400 kcal count: day 1 (750), day 2 (975), day 4 (500) = 2225 kcal; fibre known on 400 + 800 + 500 = 1700 kcal -> 76.4 %
    const w = weekNut(todayISO(), 7), cov = w.cov.fib / w.kcal, shown = nutShown(w, "fib", todayISO()), saltCov = w.cov.salt / w.kcal;
    FIT().energy.nutrCoverage = "off"; const legacyShown = nutShown(w, "fib", todayISO()); FIT().energy.nutrCoverage = "on";
    for (const k of Object.keys(S.days)) if (k !== d[1]) delete S.days[k];
    // only day 1: 400 of 750 kcal = 53.3 % -> not a total any more (but still shown the old way when the switch is off)
    const w1 = weekNut(todayISO(), 7), shown1 = nutShown(w1, "fib", todayISO()); FIT().energy.nutrCoverage = "off"; const legacy1 = nutShown(w1, "fib", todayISO()); FIT().energy.nutrCoverage = "on";
    return { days: w.days, cov: Math.round(cov * 1000) / 1000, saltCov: Math.round(saltCov * 1000) / 1000, shown, legacyShown, shown1, legacy1 }; }, D);
  assert.deepEqual(r, { days: 3, cov: 0.764, saltCov: 0.764, shown: true, legacyShown: true, shown1: false, legacy1: true });
});

test("the weekly report keeps fibre and salt out when the data is too thin", async () => {
  const D = await setup();
  const r = await ev(d => { const P = { kind: "week", label: "w", a: addDays(todayISO(), -6), b: todayISO() }, a = periodStats(P).fib;
    for (const k of Object.keys(S.days)) if (k !== d[1]) delete S.days[k];
    const b = periodStats(P).fib, c = periodStats(P).salt; FIT().energy.nutrCoverage = "off"; const e = periodStats(P).fib; FIT().energy.nutrCoverage = "on";
    return { a: !!a, b: b ?? null, c: c ?? null, e: !!e }; }, D);
  assert.deepEqual(r, { a: true, b: null, c: null, e: true });
});

test("Stats: the fibre average counts only days with enough data and says so; nothing known is a dash", async () => {
  const D = await setup();
  const r = await ev(d => { UI.statsRange = 7; UI.statsBasis = "eaten"; const el = document.createElement("div"); el.innerHTML = VIEWS.stats(true); const rows = [...el.querySelectorAll(".adh")].map(x => x.textContent.replace(/\s+/g, " ").trim()), note = el.textContent;
    // days with >= 60 %: day 2 (20 g) and day 4 (10 g) -> 15 g; day 1 (53 %) and day 3 (0 %) are left out
    const fib = rows.find(x => x.startsWith("Fibre"));
    for (const k of Object.keys(S.days)) if (k !== d[3]) delete S.days[k];
    const el2 = document.createElement("div"); el2.innerHTML = VIEWS.stats(true); const fib2 = [...el2.querySelectorAll(".adh")].map(x => x.textContent.replace(/\s+/g, " ").trim()).find(x => x.startsWith("Fibre"));
    return { fib, counted: /2 of 4 days/.test(note), fib2 }; }, D);
  assert.match(r.fib, /^Fibre\s*15 g/); assert.ok(r.counted, "the note names the days counted");
  assert.match(r.fib2, /^Fibre\s*—/);
});

test("a food saved with empty optional fields keeps them unknown; a typed 0 stays 0; opening a saved food and saving it does not turn unknown into 0", async () => {
  const r = await ev(() => {
    const open = d => { openSheet("food", { draft: d, isNew: true }); };
    const d1 = { ...blankFood("F09 empty"), per: { ...blankFood().per, kcal: 100, p: 1, c: 20, f: 1 } }; open(d1); S_().draft.per.salt = ""; ACT["fd-save"]();
    const a = Object.values(S.foods).find(f => f.name === "F09 empty").per;
    const d2 = { ...blankFood("F09 typed zero"), per: { ...blankFood().per, kcal: 100, p: 1, c: 20, f: 1, salt: "0", fib: "2,5" } }; open(d2); ACT["fd-save"]();
    const b = Object.values(S.foods).find(f => f.name === "F09 typed zero").per;
    S.foods.fOld = { id: "fOld", name: "F09 old", unit: "g", per: { kcal: 100, p: 1, c: 20, f: 1, fib: 0 }, servings: [], pack: 0, cat: "pantry", role: "C", meals: ["m"], source: "custom" };
    ACT["edit-food"]({ dataset: { id: "fOld" } }); const draft = clone(S_().draft.per); ACT["fd-save"]();
    return { a, b, draft, old: S.foods.fOld.per };
  });
  assert.deepEqual([r.a.fib, r.a.sug, r.a.sat, r.a.salt], [null, null, null, null]);
  assert.deepEqual([r.b.fib, r.b.salt, r.b.sug], [2.5, 0, null]);
  assert.deepEqual([r.draft.fib, r.draft.sug, r.draft.sat, r.draft.salt], [0, null, null, null]);
  assert.deepEqual([r.old.fib, r.old.sug, r.old.sat, r.old.salt], [0, null, null, null]);
});

test("Open Food Facts: salt from sodium (x 2.5), a missing nutrient is unknown, a given 0 is 0", async () => {
  const r = await ev(() => { const mk = n => offToFood("1", { product_name: "P", nutriments: { "energy-kcal_100g": 100, proteins_100g: 5, carbohydrates_100g: 10, fat_100g: 2, ...n } }).per;
    return { sod: mk({ sodium_100g: 0.4, "fiber_100g": 0 }), none: mk({}), salt: mk({ salt_100g: 1.2, sodium_100g: 9 }) }; });
  assert.deepEqual([r.sod.salt, r.sod.fib, r.sod.sug, r.sod.sat], [1, 0, null, null]);
  assert.deepEqual([r.none.salt, r.none.fib, r.none.sug, r.none.sat], [null, null, null, null]);
  assert.equal(r.salt.salt, 1.2);
  assert.deepEqual([r.none.kcal, r.none.p, r.none.c, r.none.f], [100, 5, 10, 2]);   // the mandatory four are untouched
});

test("label text and AI readings: a nutrient that is not on the label is unknown", async () => {
  const r = await ev(() => { const base = "Valori nutrizionali medi per 100 g\nEnergia 1500 kJ / 355 kcal\nGrassi 2,0 g\ndi cui acidi grassi saturi 0,5 g\nCarboidrati 70 g\ndi cui zuccheri 3 g\nProteine 12 g\n";
    const a = parseLabelText(base).per, b = parseLabelText(base + "Fibre 4,0 g\nSale 1,2 g\n").per, c = parseLabelText(base + "Sodio 0,4 g\n").per;
    return { a, b: [b.fib, b.salt], c: c.salt, ai: [optN(undefined), optN(null), optN(""), optN("x"), optN(0), optN("1,26"), optN(-2)] }; });
  assert.deepEqual([r.a.kcal, r.a.p, r.a.c, r.a.f, r.a.sug, r.a.sat], [355, 12, 70, 2, 3, 0.5]);
  assert.deepEqual([r.a.fib, r.a.salt], [null, null]);
  assert.deepEqual(r.b, [4, 1.2]); assert.equal(r.c, 1);
  assert.deepEqual(r.ai, [null, null, null, null, 0, 1.3, 0]);
});

test("the food editor says 'unknown' in an empty optional field and the app starts without errors", async () => {
  const html = await ev(() => SHEETS.food({ draft: { ...blankFood("Zed"), per: { ...blankFood().per, kcal: 10 } }, isNew: true }).body);
  assert.match(html, /id="fd-salt"[^>]*placeholder="unknown"/);
  assert.deepEqual(app.errors, []);
});
