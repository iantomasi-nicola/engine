/* M4c: feedback after M4/M4b — Check-in always in reach and with the supplements, Foods without «Top», a food-habits report in Progress, no emoji in the Journal. Synthetic data only. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let dir, app;
test.before(async () => { dir = H.build(H.tmp("uxh-build")); });
test.afterEach(async () => { await app?.close(); app = null; });
const start = async (seed = F.seed(), viewport) => { app = await H.startApp({ dir, seed, viewport }); return app.page; };
const EMOJI = /\p{Extended_Pictographic}/u;
/* ten past days: 100 g rice at dinner every day, 150 g chicken at lunch on six of them, all ticked as eaten; prices make rice 0.20 € and chicken 2.25 € a use */
const eatTen = page => page.evaluate(() => {
  const t = todayISO(); S.shop.prices = { "t-rice": { eur: 2, g: 1000, at: t }, "t-chicken": { eur: 6, g: 400, at: t } };
  for (let i = 1; i <= 10; i++) { const d = addDays(t, -i); S.days[d] = { date: d, meals: { dinner: [{ id: "r" + i, kind: "food", ref: "t-rice", qty: 100, eaten: true }], lunch: i <= 6 ? [{ id: "c" + i, kind: "food", ref: "t-chicken", qty: 150, eaten: true }] : [] } }; }
  DATA_V++;
});

for (const [name, vp] of Object.entries(H.VIEWPORTS)) {
  test(`Today always shows the Check-in button, first in the row, even when everything is logged — ${name}`, async () => {
    const page = await start(F.seed(), vp);
    await page.evaluate(() => { mutateLog(todayISO(), x => { x.weight = 80; x.sleep = 7; x.hrv = 60; x.rhr = 50; }); scheduleRender(); });
    await page.waitForSelector(".td-nudges");
    const r = await page.evaluate(() => { const b = document.querySelector('.td-nudges [data-act="open-checkin"]'); const rc = b?.getBoundingClientRect(); return { has: !!b, first: b === document.querySelector(".td-nudges").firstElementChild, text: b?.innerText.trim(), visible: !!rc && rc.width > 40 && rc.height > 20 && rc.right <= innerWidth + 1 }; });
    assert.deepEqual(r, { has: true, first: true, text: "Check-in", visible: true });
  });
}

test("the Check-in holds the day's supplements: tick them there, for that day, and the stock follows", async () => {
  const page = await start();
  await page.evaluate(() => { S.settings.supps = [{ id: "s1", name: "Creatine", dose: "5 g", times: ["08:00"], stock: 10 }]; const d = addDays(todayISO(), -1); openSheet("checkin", { date: d, live: true }); });
  assert.equal(await page.evaluate(() => !!document.querySelector('.sheet [data-act="supp-tick"]')), true);
  await page.click('.sheet [data-act="supp-tick"]');
  const r = await page.evaluate(() => { const d = addDays(todayISO(), -1); return { taken: !!logGet(d).supp?.["s1@08:00"], today: !!logGet(todayISO())?.supp, stock: S.settings.supps[0].stock, pressed: document.querySelector('.sheet [data-act="supp-tick"]').getAttribute("aria-pressed") }; });
  assert.deepEqual(r, { taken: true, today: false, stock: 9, pressed: "true" });
  const none = await page.evaluate(() => { S.settings.supps = []; closeSheet(); openSheet("checkin", { date: todayISO(), live: true }); return !!document.querySelector('.sheet [data-act="supp-tick"], .sheet .supp-card'); });
  assert.equal(none, false, "no supplements set up: nothing to show");
});

test("Foods has no «Top» filter any more", async () => {
  const page = await start();
  await page.evaluate(() => { UI.tab = "foods"; scheduleRender(); });
  await page.waitForSelector("#foods-q");
  const labels = await page.evaluate(() => [...document.querySelectorAll('[aria-label="Filter"] button')].map(b => b.innerText.trim()));
  assert.ok(!labels.includes("Top") && labels.includes("Starred"), labels.join(","));
  assert.equal(await page.evaluate(() => typeof topFoodsHTML), "undefined");
});

test("food habits: counts, shares, cost and protein per euro match the hand-computed values", async () => {
  const page = await start(); await eatTen(page);
  const h = await page.evaluate(() => foodHabits(30));
  assert.equal(h.basis, "eaten"); assert.equal(h.days, 10);
  const rice = h.rows.find(r => r.ref === "t-rice"), chk = h.rows.find(r => r.ref === "t-chicken");
  assert.equal(rice.n, 10); assert.equal(chk.n, 6);
  assert.equal(Math.round(rice.kcal), 3500); assert.equal(Math.round(chk.kcal), 990);
  assert.ok(Math.abs(h.protein.find(x => x.ref === "t-chicken").share - 207 / 277) < 1e-9, "chicken gives 207 of 277 g protein");
  assert.equal(h.cost.total, 15.5); assert.equal(Math.round(h.cost.perDay * 100) / 100, 1.55);
  assert.deepEqual(h.byMeal.dinner.map(x => [x.ref, x.n]), [["t-rice", 10]]);
  assert.deepEqual(h.byMeal.lunch.map(x => [x.ref, x.n]), [["t-chicken", 6]]);
  assert.ok(Math.abs(h.pPerEur.find(x => x.ref === "t-rice").v - 35) < 1e-9);
  assert.ok(h.lines.length >= 2 && h.lines.every(l => typeof l === "string" && !/NaN|undefined/.test(l)));
  assert.ok(h.lines.some(l => /Dinner/i.test(l) && /every day|10 of 10/i.test(l)), "the repeated dinner is called out");
});

test("food habits with nothing eaten falls back to the plan and says so; with nothing at all it is empty, not NaN", async () => {
  const page = await start();
  const plan = await page.evaluate(() => { const h = foodHabits(30); return { basis: h.basis, days: h.days }; });
  assert.equal(plan.basis, "planned");
  const none = await page.evaluate(() => { S.days = {}; DATA_V++; const h = foodHabits(30); return { rows: h.rows.length, lines: h.lines.length, html: habitsView() }; });
  assert.equal(none.rows, 0); assert.doesNotMatch(none.html, /NaN|undefined/); assert.match(none.html, /No data yet/);
});

for (const [name, vp] of Object.entries(H.VIEWPORTS)) {
  test(`Progress › Nutrition › Habits shows the report and fits the screen — ${name}`, async () => {
    const page = await start(F.seed(), vp); await eatTen(page);
    await page.evaluate(() => { UI.tab = "progress"; UI.progSeg = "food"; UI.foodSeg = "habits"; scheduleRender(); });
    await page.waitForFunction(() => /By meal/.test(document.body.innerText));
    const t = await page.evaluate(() => document.body.innerText);
    assert.match(t, /Test rice/); assert.match(t, /Main sources/); assert.match(t, /Cost/); assert.doesNotMatch(t, /NaN|undefined|Infinity/);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false);
    await page.click('[data-act="hab-days"][data-n="90"]');
    assert.equal(await page.evaluate(() => UI.habDays), 90);
  });
}

test("the Journal uses drawn faces and words, no emoji, anywhere", async () => {
  const page = await start();
  await page.evaluate(() => { for (let i = 0; i < 12; i++) { const d = addDays(todayISO(), -i); jrSet(d, "m", 1 + i % 5); jrSet(d, "p", 3); jrSet(d, "e", 2 + i % 3); jrSet(d, "s", 2); } });
  const out = await page.evaluate(() => { const r = {}; openSheet("journal", { date: todayISO(), live: true }); r.sheet = document.querySelector(".sheet").innerHTML; closeSheet();
    r.card = journalCard(20) || (mutateLog(todayISO(), x => { x.jr = null; }), journalCard(20)); r.view = journalView(); r.ci = (openSheet("checkin", { date: todayISO(), live: true }), document.querySelector(".sheet").innerHTML); return r; });
  for (const [k, v] of Object.entries(out)) assert.doesNotMatch(v, EMOJI, k);
  assert.match(out.sheet, /<svg[^>]*jr-face/);
  const labels = await page.evaluate(() => { closeSheet(); openSheet("journal", { date: todayISO(), live: true }); return [...document.querySelectorAll('.sheet [data-act="jr-set"][data-k="m"]')].map(b => b.getAttribute("aria-label")); });
  assert.deepEqual(labels.map(l => l.split(", ")[1]), ["Awful", "Low", "Okay", "Good", "Great"]);
});
