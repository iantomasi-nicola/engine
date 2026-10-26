/* M16 / L199: the body fat that reaches intervals.icu from Vitals (Open Health) is not reliable yet (scale ≈ 21 %, Vitals ≈ 8 %).
   It is kept apart in day.bfIcu and never in day.bf (only what you type); the number the app computes with is bfAt(date):
   typed > intervals.icu corrected by the mean gap to your own readings > nothing. Both steps can be switched off. Synthetic data; fetch is a stub. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let app;
test.afterEach(async () => { await app?.close(); app = null; });
const start = async () => { app = await H.startApp({ dir: H.build(H.tmp("m16bf-build")), seed: F.seed({ withPlan: false }) }); return app.page; };
const SETUP = (remote = {}, link = {}) => `(() => { window.__calls = []; const R = ${JSON.stringify(remote)};
  window.fetch = async (u, o = {}) => { const m = (o.method || "GET").toUpperCase(), p = String(u).replace("https://intervals.icu/api/v1", ""); __calls.push([m, p, o.body ? JSON.parse(o.body) : null]);
    let body = []; if (m === "GET") { if (/\\/wellness\\?/.test(p)) body = R.wellness || []; else if (/\\/(activities|events)\\?/.test(p)) body = []; else body = {}; } else body = { id: 9000 + __calls.length };
    return { ok: true, status: 200, text: async () => JSON.stringify(body) }; };
  S.settings.intervals = { key: "TEST", aid: "0", bridge: { since: addDays(todayISO(), -30), last: new Date().toISOString() }, ...${JSON.stringify(link)} }; })()`;
const dayOf = (page, d) => page.evaluate(d => { const L = logGet(d) || {}; return { bf: L.bf ?? null, bfIcu: L.bfIcu ?? null, bfSrc: L.bfSrc ?? null, bfPush: L.bfPush ?? null, at: bfAt(d) }; }, d);

test("the import keeps intervals.icu body fat apart from what you type", async () => {
  const page = await start();
  const [d1, d2, d3, d4] = await page.evaluate(() => [1, 2, 3, 4].map(i => addDays(todayISO(), -i)));
  await page.evaluate(([d]) => { mutateLog(d, x => { x.bf = 21; x.bfSrc = "man"; }); }, [d2]);
  const remote = { wellness: [{ id: d1, bodyFat: 8.04 }, { id: d2, bodyFat: 8.4 }, { id: d3, bodyFat: 2 }, { id: d4, bodyFat: 80 }] };
  await page.evaluate(async ([s]) => { eval(s); await icuSyncDirect(); }, [SETUP(remote, { bfMig: true })]);
  assert.deepEqual(await dayOf(page, d1), { bf: null, bfIcu: 8, bfSrc: null, bfPush: null, at: 20.6 }, "stored as bfIcu only; shown corrected by the gap to the typed reading of the other day (21 − 8.4)");
  assert.deepEqual((await dayOf(page, d2)), { bf: 21, bfIcu: 8.4, bfSrc: "man", bfPush: null, at: 21 }, "typed value kept, remote kept beside it");
  assert.equal((await dayOf(page, d3)).bfIcu, null, "implausible ignored");
  assert.equal((await dayOf(page, d4)).bfIcu, null, "implausible ignored");
  assert.deepEqual(app.errors, []);
});

test("bfAt: typed wins, otherwise intervals.icu plus the mean gap to your readings; both steps switch off", async () => {
  const page = await start();
  const r = await page.evaluate(() => {
    const t = todayISO(), d = i => addDays(t, -i), out = {};
    mutateLog(d(10), x => { x.bf = 21; x.bfSrc = "man"; x.bfIcu = 8; });          // gap +13
    mutateLog(d(8), x => { x.bf = 20; x.bfSrc = "man"; x.bfIcu = 8; });           // gap +12
    mutateLog(d(2), x => { x.bfIcu = 8.4; });                                     // only Vitals
    mutateLog(d(1), x => { x.bf = 19.5; x.bfSrc = "man"; });
    const gap = bfGap(); out.gap = [gap.n, Math.round(gap.gap * 10) / 10];
    S.settings.intervals = {}; out.cal = [bfAt(d(2)), bfAt(d(1)), bfAt(d(10)), bfAt(d(5))];
    S.settings.intervals = { bfCal: false }; out.raw = bfAt(d(2));
    S.settings.intervals = { pullBf: false }; out.off = [bfAt(d(2)), bfAt(d(1))];
    return out; });
  assert.equal(r.gap[0], 2); assert.ok(r.gap[1] > 12 && r.gap[1] < 13, "mean gap, recent pairs count more: " + r.gap[1]);
  assert.ok(r.cal[0] > 20.4 && r.cal[0] < 21.4, "8.4 + gap ≈ 21: " + r.cal[0]); assert.equal(r.cal[1], 19.5); assert.equal(r.cal[2], 21); assert.equal(r.cal[3], 0, "no data, no value");
  assert.equal(r.raw, 8.4, "calibration off: the raw value");
  assert.deepEqual(r.off, [0, 19.5], "source off: intervals.icu is ignored, what you typed stays");
  assert.deepEqual(app.errors, []);
});

test("lean mass and the energy model use the corrected body fat, not the raw one", async () => {
  const page = await start();
  const r = await page.evaluate(() => {
    const t = todayISO(), d = i => addDays(t, -i);
    for (const i of [20, 19, 18, 3, 2, 1, 0]) mutateLog(d(i), x => { x.weight = 80; });
    mutateLog(d(10), x => { x.bf = 21; x.bfSrc = "man"; x.bfIcu = 8; });
    for (const i of [3, 2, 1, 0]) mutateLog(d(i), x => { x.bfIcu = 8; });
    const E = leanEst(t); return { bf: E.bf, n: E.n }; });
  assert.ok(r.bf > 20.5 && r.bf < 21.5, "fat % ≈ 21 and not 8: " + r.bf);
  assert.deepEqual(app.errors, []);
});

test("old imported values are moved once; what you typed and what Engine sent are never taken for an import", async () => {
  const page = await start();
  const [d1, d2, d3] = await page.evaluate(() => [1, 2, 3].map(i => addDays(todayISO(), -i)));
  await page.evaluate(([a, b, c]) => { mutateLog(a, x => { x.bf = 8; }); mutateLog(b, x => { x.bf = 21; x.bfSrc = "man"; }); mutateLog(c, x => { x.bf = 20; x.bfPush = 20; }); }, [d1, d2, d3]);
  const remote = { wellness: [{ id: d1, bodyFat: 8 }, { id: d2, bodyFat: 21 }, { id: d3, bodyFat: 20 }] };
  await page.evaluate(async ([s]) => { eval(s); await icuSyncDirect(); }, [SETUP(remote, {})]);
  assert.deepEqual(await page.evaluate(([a]) => { const L = logGet(a); return { bf: L.bf ?? null, bfIcu: L.bfIcu ?? null }; }, [d1]), { bf: null, bfIcu: 8 }, "an old import moves to bfIcu");
  assert.equal((await dayOf(page, d2)).bf, 21, "typed kept"); assert.equal((await dayOf(page, d2)).bfIcu, 21, "mirrored beside it, typed untouched");
  assert.deepEqual(await dayOf(page, d3), { bf: 20, bfIcu: null, bfSrc: null, bfPush: 20, at: 20 }, "an echo of what Engine sent is not an import");
  assert.equal(await page.evaluate(() => S.settings.intervals.bfMig), true, "done once");
  assert.ok((await page.evaluate(() => __calls.some(c => /wellness\?/.test(c[1]) && /oldest=/.test(c[1])))), "the first run reads 90 days");
  // after the one-time pass a typed value that equals the remote stays typed
  await page.evaluate(async ([s, d]) => { eval(s); mutateLog(d, x => { x.bf = 8; }); await icuSyncDirect(); }, [SETUP(remote, { bfMig: true }), d1]);
  assert.equal((await dayOf(page, d1)).bf, 8, "second run leaves it alone");
  assert.deepEqual(app.errors, []);
});

test("a body fat you type is marked as yours and sent to intervals.icu once, and its echo does not skew the correction", async () => {
  const page = await start();
  const t = await page.evaluate(() => todayISO());
  await page.evaluate(() => { saveWeighIn("80", "21"); });
  assert.equal((await dayOf(page, t)).bfSrc, "man");
  await page.evaluate(async ([s]) => { eval(s); await icuSyncDirect(); }, [SETUP({ wellness: [] }, { bfMig: true })]);
  const sent = await page.evaluate(() => __calls.filter(c => c[0] === "PUT" && /wellness/.test(c[1])).map(c => c[2].bodyFat));
  assert.deepEqual(sent, [21]); assert.equal((await dayOf(page, t)).bfPush, 21);
  await page.evaluate(async ([s, d]) => { eval(s); await icuSyncDirect(); }, [SETUP({ wellness: [{ id: t, bodyFat: 21 }] }, { bfMig: true }), t]);
  assert.equal((await dayOf(page, t)).bfIcu, null, "the value that came back is ours, not a second reading");
  assert.deepEqual(app.errors, []);
});

test("Settings › intervals.icu: the two switches work and say why a value is not used", async () => {
  const page = await start();
  const r = await page.evaluate(() => {
    S.settings.intervals = { key: "TEST", aid: "0", bridge: { last: new Date().toISOString() } };
    const h1 = icuSettingsCard(); ACT["icu-pullbf"](); const a = S.settings.intervals.pullBf; ACT["icu-pullbf"](); const b = S.settings.intervals.pullBf;
    ACT["icu-bfcal"](); const c = S.settings.intervals.bfCal; return { h1, a, b, c }; });
  assert.match(r.h1, /Body fat from intervals\.icu/); assert.match(r.h1, /scale/i);
  assert.equal(r.a, false); assert.equal(r.b, true); assert.equal(r.c, false);
  assert.deepEqual(app.errors, []);
});

test("a body fat typed in the check-in is marked as yours, so it is never taken for an import; the moved value is kept in bfWas", async () => {
  const page = await start();
  const [d1, d2] = await page.evaluate(() => [1, 2].map(i => addDays(todayISO(), -i)));
  await page.evaluate(d => { openSheet("checkin", { date: d, live: true }); CHG.ci("21", { dataset: { k: "bf" } }); }, d1);
  assert.equal((await dayOf(page, d1)).bfSrc, "man");
  await page.evaluate(d => { CHG.ci("", { dataset: { k: "bf" } }); }, d1);
  assert.deepEqual(await dayOf(page, d1), { bf: null, bfIcu: null, bfSrc: null, bfPush: null, at: 0 }, "cleared: the marker goes with it");
  await page.evaluate(([d]) => { mutateLog(d, x => { x.bf = 8; }); }, [d2]);
  await page.evaluate(async ([s, d]) => { eval(s); await icuSyncDirect(); }, [SETUP({ wellness: [{ id: d2, bodyFat: 8 }] }, {}), d2]);
  assert.deepEqual(await page.evaluate(d => { const L = logGet(d); return { bf: L.bf ?? null, bfIcu: L.bfIcu, bfWas: L.bfWas }; }, d2), { bf: null, bfIcu: 8, bfWas: 8 });
  assert.deepEqual(app.errors, []);
});

test("the file import (JSON) keeps body fat in bfIcu; with the source switched off the sync still mirrors it but nothing uses it; the corrected value stays within 3–60", async () => {
  const page = await start();
  const [d1, d2] = await page.evaluate(() => [1, 2].map(i => addDays(todayISO(), -i)));
  const r = await page.evaluate(async ([s, d1, d2]) => { eval(s);
    const n = icuApplyWellness([{ id: d1, bodyFat: 9.04 }, { id: d2, bodyFat: 1 }]);
    const a = { n, d1: logGet(d1).bfIcu, d2: logGet(d2)?.bfIcu ?? null, bf: logGet(d1).bf ?? null };
    S.settings.intervals.pullBf = false; await icuSyncDirect(); const off = { mirrored: logGet(d1).bfIcu, at: bfAt(d1) };
    S.settings.intervals.pullBf = true; mutateLog(addDays(todayISO(), -6), x => { x.bf = 60; x.bfIcu = 3; x.bfSrc = "man"; }); mutateLog(d1, x => { x.bfIcu = 59; });
    return { a, off, top: bfAt(d1) }; }, [SETUP({ wellness: [{ id: d1, bodyFat: 9 }] }, { bfMig: true }), d1, d2]);
  assert.deepEqual(r.a, { n: 1, d1: 9, d2: null, bf: null });
  assert.deepEqual(r.off, { mirrored: 9, at: 0 });
  assert.equal(r.top, 60, "3 → 60 is a gap of +57: 59 + 57 is clamped to 60");
  assert.deepEqual(app.errors, []);
});
