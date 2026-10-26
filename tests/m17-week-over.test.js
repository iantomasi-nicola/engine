/* M17 / L207: in the week view of the meal planner a day that goes over its target shows that value in red, not by colour alone.
   Threshold = the one the app already uses for its bars and rings: more than 8 % + 3 above the day's target (targetsFor), now one function (overTarget). kcal and each macro count by themselves.
   Hand values with rice (per 100 g: 350 kcal, 7 P, 78 C, 1 F) and T = the day's kcal target: A = 120 % of T in kcal (over by 0.2 T, shown as «+N»), its carbs are
   0.78 g per 3.5 kcal, so about 1.2 T * 0.223 g, over the carb target too; B = 105 % of T -> inside the tolerance, nothing red; C = 20 g of rice -> nothing. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let dir, app;
test.before(async () => { dir = H.build(H.tmp("m17wk-build")); });
test.afterEach(async () => { await app?.close(); app = null; });
const start = async viewport => { app = await H.startApp({ dir, seed: F.seed({ withPlan: false }), viewport }); return app.page; };
const setup = page => page.evaluate(async () => {
  const t = todayISO(), ws = weekStartOf(t), a = ws, b = addDays(ws, 1), c = addDays(ws, 2); UI.tab = UI.fuelTab = "plan"; UI.planView = "week"; UI.date = t;
  const put = (d, id, g) => { S.days[d] = { date: d, meals: { lunch: [{ id, kind: "food", ref: "t-rice", qty: g, eaten: false }] } }; };
  put(a, "A", Math.ceil(targetsFor(a).kcal / 3.5 * 1.2)); put(b, "B", Math.round(targetsFor(b).kcal / 3.5 * 1.05)); put(c, "C", 20);
  DATA_V++; render(); await new Promise(x => setTimeout(x, 150)); return { a, b, c };
});
const read = (page, d) => page.evaluate(d => {
  const row = document.querySelector(`.pw-day[data-date="${d}"]`), tot = dayTotals(getDay(d)), TT = targetsFor(d);
  return {
    barOver: row.querySelector(".pw-bar").classList.contains("over"), kcalOver: row.querySelector(".pw-kcal").classList.contains("over"), mcOver: [...row.querySelectorAll(".pw-mc")].map(x => x.classList.contains("over")),
    expKcal: tot.kcal > TT.kcal * 1.08 + 3, expMc: [[tot.c, TT.c], [tot.p, TT.p], [tot.f, TT.f]].map(([v, g]) => v > g * 1.08 + 3),
    sign: row.querySelector(".pw-kcal .pw-ov")?.textContent ?? null, signN: Math.round(tot.kcal - TT.kcal), macSigns: [...row.querySelectorAll(".pw-mc .pw-ov")].map(x => x.textContent),
    aria: row.getAttribute("aria-label"), kcalColor: getComputedStyle(row.querySelector(".pw-kcal b")).color
  };
}, d);

test("a day over its target: kcal and the macros that exceed it are red and carry a sign; a day inside the tolerance or below is untouched", async () => {
  const page = await start(H.VIEWPORTS.desktop); const { a, b, c } = await setup(page);
  const A = await read(page, a), B = await read(page, b), C = await read(page, c);
  assert.equal(A.expKcal, true, "fixture: A really is over"); assert.equal(A.barOver, true); assert.equal(A.kcalOver, true);
  assert.equal(A.sign, "+" + A.signN.toLocaleString("en-US"), "the sign says by how much"); assert.ok(A.signN > 0);
  assert.deepEqual(A.mcOver, A.expMc, "each macro on its own"); assert.ok(A.expMc[0], "fixture: carbs of A are over too");
  assert.equal(A.macSigns.length, A.expMc.filter(Boolean).length, "one sign per macro over");
  assert.match(A.aria, /over/i, "the day's accessible name says it is over"); assert.notEqual(A.kcalColor, C.kcalColor, "the number turns red");
  assert.equal(B.expKcal, false, "fixture: B is inside the tolerance"); assert.equal(B.barOver, false); assert.equal(B.kcalOver, false); assert.deepEqual(B.mcOver, B.expMc); assert.equal(B.sign, null);
  assert.equal(C.barOver, false); assert.deepEqual(C.mcOver, [false, false, false]); assert.doesNotMatch(C.aria, /over/i);
  assert.deepEqual(app.errors, []);
});

test("the red is the app's --bad token on the bar, the number and the macro bar; one predicate (overTarget) for the whole app", async () => {
  const page = await start(H.VIEWPORTS.desktop); const { a } = await setup(page);
  const r = await page.evaluate(d => {
    const row = document.querySelector(`.pw-day[data-date="${d}"]`), probe = document.createElement("i"); probe.style.color = "var(--bad)"; document.body.append(probe); const bad = getComputedStyle(probe).color; probe.remove();
    return { bad, bar: getComputedStyle(row.querySelector(".pw-bar.over > i")).backgroundColor, num: getComputedStyle(row.querySelector(".pw-kcal.over b")).color, mb: getComputedStyle(row.querySelector(".pw-mc.over .pw-mb > span")).backgroundColor,
      fn: typeof overTarget === "function" && overTarget(1084, 1000) === true && overTarget(1083, 1000) === false && overTarget(5, 0) === false };
  }, a);
  assert.equal(r.bar, r.bad); assert.equal(r.num, r.bad); assert.equal(r.mb, r.bad); assert.equal(r.fn, true);
});

test("tablet and desktop (the week view does not exist on a phone): the sign fits inside the day, nothing cut, no horizontal scroll", async () => {
  for (const vp of [H.VIEWPORTS.tablet, H.VIEWPORTS.desktop]) {
    const page = await start(vp); await setup(page);
    const r = await page.evaluate(() => {
      const bad = [...document.querySelectorAll(".pw-day .pw-ov")].filter(x => { const b = x.getBoundingClientRect(), p = x.closest(".pw-day").getBoundingClientRect(); return b.right > p.right - 2 || b.left < p.left; }).length;
      return { n: document.querySelectorAll(".pw-day .pw-ov").length, bad, scroll: document.documentElement.scrollWidth > innerWidth };
    });
    assert.ok(r.n >= 1, vp.width + ": signs exist"); assert.equal(r.bad, 0, vp.width + ": signs inside the day cell"); assert.equal(r.scroll, false, vp.width);
    await app.close(); app = null;
  }
});
