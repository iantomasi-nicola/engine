/* M17 / L206: the check-in tells, small and only when true, that the weight of the day came by itself from intervals.icu (with the body fat if that day has one).
   Needs a provenance: the import writes weightSrc "icu" on the days it fills; typing the weight (check-in, weigh-in) sets "man". Synthetic data; fetch is a stub.
   Hand values: yesterday weight 81.44 -> 81.4 icu + bodyFat 8 -> bfIcu 8: pill "Weight and body fat from intervals.icu"; the day before has weight only: "Weight from intervals.icu";
   a day with a typed weight (80) keeps weightSrc "man" and no pill; a day with only bodyFat has no pill (the weight did not come from there). */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let dir, app;
test.before(async () => { dir = H.build(H.tmp("m17ci-build")); });
test.afterEach(async () => { await app?.close(); app = null; });
const start = async viewport => { app = await H.startApp({ dir, seed: F.seed({ withPlan: false }), viewport }); return app.page; };
const SETUP = (remote = {}) => `(() => { const R = ${JSON.stringify(remote)};
  window.fetch = async (u, o = {}) => { const m = (o.method || "GET").toUpperCase(), p = String(u).replace("https://intervals.icu/api/v1", "");
    let body = []; if (m === "GET") { if (/\\/wellness\\?/.test(p)) body = R.wellness || []; else if (/\\/(activities|events)\\?/.test(p)) body = []; else body = {}; } else body = { id: 9000 };
    return { ok: true, status: 200, text: async () => JSON.stringify(body) }; };
  S.settings.intervals = { key: "TEST", aid: "0", pullWeight: true, bfMig: true, bridge: { since: addDays(todayISO(), -30), last: new Date().toISOString() } }; })()`;
const dayOf = (page, d) => page.evaluate(d => { const L = logGet(d) || {}; return { weight: L.weight ?? null, weightSrc: L.weightSrc ?? null, bfIcu: L.bfIcu ?? null }; }, d);
const pill = async (page, d) => {
  await page.evaluate(d => { if (UI.sheet) closeSheet(); openSheet("checkin", { date: d, live: true }); }, d);
  await page.waitForSelector(".sheet .ci-main");
  return page.evaluate(() => document.querySelector(".sheet .ci-src")?.innerText.replace(/\s+/g, " ").trim() ?? null);
};

test("the import marks the weight it fills as coming from intervals.icu, and only that", async () => {
  const page = await start();
  const [d1, d2, d3, d4] = await page.evaluate(() => [1, 2, 3, 4].map(i => addDays(todayISO(), -i)));
  await page.evaluate(d => { mutateLog(d, x => { x.weight = 80; x.weightSrc = "man"; }); }, d3);
  const remote = { wellness: [{ id: d1, weight: 81.44, bodyFat: 8 }, { id: d2, weight: 82 }, { id: d3, weight: 90 }, { id: d4, bodyFat: 8 }] };
  await page.evaluate(async s => { eval(s); await icuSyncDirect(); }, SETUP(remote));
  assert.deepEqual(await dayOf(page, d1), { weight: 81.4, weightSrc: "icu", bfIcu: 8 });
  assert.deepEqual(await dayOf(page, d2), { weight: 82, weightSrc: "icu", bfIcu: null });
  assert.deepEqual(await dayOf(page, d3), { weight: 80, weightSrc: "man", bfIcu: null }, "a typed weight is never overwritten nor re-marked");
  assert.deepEqual(await dayOf(page, d4), { weight: null, weightSrc: null, bfIcu: 8 }, "body fat alone gives no weight source");
  assert.deepEqual(app.errors, []);
});

test("the check-in shows a small marker for the day shown (not only today), only when the weight came from intervals.icu", async () => {
  const page = await start();
  const [d1, d2, d3, d4] = await page.evaluate(() => [1, 2, 3, 4].map(i => addDays(todayISO(), -i)));
  await page.evaluate(([a, b, c, e]) => {
    mutateLog(a, x => { x.weight = 81.4; x.weightSrc = "icu"; x.bfIcu = 8; }); mutateLog(b, x => { x.weight = 82; x.weightSrc = "icu"; });
    mutateLog(c, x => { x.weight = 80; x.weightSrc = "man"; x.bfIcu = 8; }); mutateLog(e, x => { x.bfIcu = 8; });
  }, [d1, d2, d3, d4]);
  assert.equal(await pill(page, d1), "Weight and body fat from intervals.icu");
  assert.equal(await pill(page, d2), "Weight from intervals.icu");
  assert.equal(await pill(page, d3), null, "typed weight: no marker");
  assert.equal(await pill(page, d4), null, "no weight: no marker");
  assert.deepEqual(app.errors, []);
});

test("typing the weight yourself removes the marker: the check-in field and the morning weigh-in set weightSrc to man", async () => {
  const page = await start();
  const d1 = await page.evaluate(() => addDays(todayISO(), -1));
  await page.evaluate(a => { mutateLog(a, x => { x.weight = 81.4; x.weightSrc = "icu"; x.bfIcu = 8; }); mutateLog(todayISO(), x => { x.weight = 79; x.weightSrc = "icu"; }); }, d1);
  assert.equal(await pill(page, d1), "Weight and body fat from intervals.icu");
  await page.fill("#ci-weight", "81.0"); await page.press("#ci-weight", "Tab");
  assert.deepEqual(await dayOf(page, d1), { weight: 81, weightSrc: "man", bfIcu: 8 });
  assert.equal(await page.evaluate(() => !!document.querySelector(".sheet .ci-src")), false, "the marker goes as soon as you type");
  await page.fill("#ci-weight", ""); await page.press("#ci-weight", "Tab");
  assert.equal((await dayOf(page, d1)).weightSrc, null, "emptied: no source either");
  await page.evaluate(() => { saveWeighIn("78.2", ""); });
  assert.deepEqual(await page.evaluate(() => { const L = logGet(todayISO()); return [L.weight, L.weightSrc]; }), [78.2, "man"]);
  assert.deepEqual(app.errors, []);
});

test("the marker fits on a phone: one line, inside the sheet, no horizontal scroll", async () => {
  const page = await start(H.VIEWPORTS.phone);
  const d1 = await page.evaluate(() => addDays(todayISO(), -1));
  await page.evaluate(d => { mutateLog(d, x => { x.weight = 81.4; x.weightSrc = "icu"; x.bfIcu = 8; }); }, d1);
  await pill(page, d1);
  const r = await page.evaluate(() => {
    const p = document.querySelector(".sheet .ci-src"), s = document.querySelector(".sheet").getBoundingClientRect(), b = p.getBoundingClientRect();
    return { h: Math.round(b.height), inside: b.left >= s.left && b.right <= s.right, scroll: document.documentElement.scrollWidth > innerWidth };
  });
  assert.ok(r.h <= 26, "one line: " + r.h); assert.equal(r.inside, true); assert.equal(r.scroll, false);
});
