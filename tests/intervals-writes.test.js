/* M6 / ENG-07, G5: what Engine may write to intervals.icu, and when. No real network: fetch is a recording stub; synthetic data only. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let app;
test.afterEach(async () => { await app?.close(); app = null; });
const start = async () => { app = await H.startApp({ dir: H.build(H.tmp("icuw-build")), seed: F.seed({ withPlan: false }) }); return app.page; };

/* a fake intervals.icu. `remote` = what GET answers; `fail` = [method, regex, status] makes a write fail. Every call is recorded with its body. */
const SETUP = (remote = {}, fail = null, link = {}) => `(() => { window.__calls = []; const R = ${JSON.stringify(remote)}; const FAIL = ${JSON.stringify(fail)};
  window.fetch = async (u, o = {}) => { const m = (o.method || "GET").toUpperCase(), p = String(u).replace("https://intervals.icu/api/v1", ""); __calls.push([m, p, o.body ? JSON.parse(o.body) : null]);
    if (FAIL && m === FAIL[0] && new RegExp(FAIL[1]).test(p)) return { ok: false, status: FAIL[2], text: async () => "" };
    let body = [];
    if (m === "GET") { if (/\\/activities\\?/.test(p)) body = R.activities || []; else if (/\\/wellness\\?/.test(p)) body = R.wellness || []; else if (/\\/events\\?/.test(p)) body = R.events || []; else body = {}; }
    else body = { id: 9000 + __calls.length };
    return { ok: true, status: 200, text: async () => JSON.stringify(body) }; };
  S.settings.intervals = { key: "TEST", aid: "0", bridge: { since: addDays(todayISO(), -30), last: new Date().toISOString() }, ...${JSON.stringify(link)} }; })()`;
const writes = calls => calls.filter(([m]) => m !== "GET").map(([m, p, b]) => [m, p, b]);
const sync = (page, setup) => page.evaluate(async s => { eval(s); await icuSyncDirect(); return __calls; }, setup);

test("every write goes to one of five known endpoints and nowhere else", async () => {
  const page = await start();
  const calls = await page.evaluate(async s => {
    eval(s); const t = todayISO(), y = addDays(t, -1);
    mutateLog(t, x => { x.planned = [{ sport: "Running", min: 40, pushNew: true }, { sport: "Running", min: 30, ext: "icu-77", src: "intervals", dirty: true }]; x.plannedDel = ["icu-55"]; });
    mutateLog(y, x => { x.weight = 80; x.rhr = 50; x.workouts = [{ sport: "Running", min: 30, km: 5 }]; });
    S.train.races = [{ id: "r1", name: "10k", date: addDays(t, 30), sport: "Running", km: 10, pri: "A", pushNew: true }]; S.train.racesDel = ["icu-66"];
    await icuSyncDirect(); return __calls;
  }, SETUP());
  const ok = [/^\/athlete\/0\/events$/, /^\/athlete\/0\/events\/\d+$/, /^\/athlete\/0\/wellness\/\d{4}-\d{2}-\d{2}$/, /^\/athlete\/0\/activities\/manual$/, /^\/activity\/\d+$/];
  const w = writes(calls); assert.ok(w.length >= 5, "it did write: " + w.map(x => x[0] + " " + x[1]).join(", "));
  for (const [m, p] of w) assert.ok(ok.some(r => r.test(p)), `unexpected write ${m} ${p}`);
  assert.deepEqual(w.filter(([m]) => m === "DELETE").map(x => x[1]).sort(), ["/athlete/0/events/55", "/athlete/0/events/66"], "only the two deletions Engine had recorded");
});

test("nothing pending: no write; then a pending plan change goes once and the second sync is quiet", async () => {
  const page = await start();
  assert.deepEqual(writes(await sync(page, SETUP())), []);
  const first = await page.evaluate(async s => { eval(s); const t = todayISO(); mutateLog(t, x => { x.planned = [{ sport: "Running", min: 40, pushNew: true }]; }); await icuSyncDirect(); return __calls; }, SETUP());
  assert.deepEqual(writes(first).map(x => [x[0], x[1]]), [["POST", "/athlete/0/events"]]);
  assert.equal(writes(first)[0][2].category, "WORKOUT");
  const second = await sync(page, SETUP());
  assert.deepEqual(writes(second), [], "the new event got its id, the flag is gone: nothing more to send");
});

test("an edited event is a PUT to its own id; a deleted one a DELETE of its own id; other remote events are never touched", async () => {
  const page = await start();
  const remote = { events: [{ id: 77, category: "WORKOUT", start_date_local: "2099-01-01T00:00:00", name: "Mine remote" }, { id: 88, category: "WORKOUT", start_date_local: "2099-01-02T00:00:00", name: "Other" }] };
  const calls = await page.evaluate(async s => { eval(s); const t = todayISO(); mutateLog(t, x => { x.planned = [{ sport: "Running", min: 30, ext: "icu-77", src: "intervals", dirty: true }]; x.plannedDel = ["icu-55"]; }); await icuSyncDirect(); return __calls; }, SETUP(remote));
  assert.deepEqual(writes(calls).map(x => [x[0], x[1]]).sort(), [["DELETE", "/athlete/0/events/55"], ["PUT", "/athlete/0/events/77"]]);
});

test("«Plan from intervals.icu» off: plan changes and deletions are not sent, and none are queued", async () => {
  const page = await start();
  const r = await page.evaluate(async s => {
    eval(s); const t = todayISO();
    mutateLog(t, x => { x.planned = [{ id: "a", sport: "Running", min: 30, ext: "icu-77", src: "intervals" }]; });
    S.settings.intervals.planSource = false;
    writeSessionList({ date: t, list: "planned" }, [{ id: "a", sport: "Running", min: 45, ext: "icu-77", src: "intervals" }, { id: "b", sport: "Running", min: 20 }]);   // an edit and a new one
    writeSessionList({ date: t, list: "planned" }, [{ id: "b", sport: "Running", min: 20 }]);                                                                           // a removal
    const L = logGet(t); const queued = JSON.stringify([L.plannedDel || [], (L.planned || []).map(w => [!!w.pushNew, !!w.dirty])]);
    await icuSyncDirect(); return { queued, calls: __calls };
  }, SETUP());
  assert.equal(r.queued, '[[],[[false,false]]]');
  assert.deepEqual(writes(r.calls), []);
});

test("a flag left from before «Plan from intervals.icu» was switched off is held, not sent", async () => {
  const page = await start();
  const calls = await page.evaluate(async s => { eval(s); const t = todayISO(); mutateLog(t, x => { x.planned = [{ sport: "Running", min: 40, pushNew: true }, { sport: "Running", min: 30, ext: "icu-77", dirty: true }]; x.plannedDel = ["icu-55"]; });
    S.train.races = [{ id: "r1", name: "10k", date: addDays(t, 30), sport: "Running", km: 10, pri: "A", pushNew: true }]; S.train.racesDel = ["icu-66"]; await icuSyncDirect(); return __calls; }, SETUP({}, null, { planSource: false }));
  assert.deepEqual(writes(calls), []);
});

test("«Send finished workouts» off: no workout or RPE is sent; «check-ins» off: no wellness day is sent", async () => {
  const page = await start();
  const calls = await page.evaluate(async s => { eval(s); const y = addDays(todayISO(), -1);
    mutateLog(y, x => { x.weight = 80; x.rhr = 50; x.hrv = 60; x.workouts = [{ sport: "Running", min: 30, km: 5 }, { sport: "Running", min: 30, ext: "icu-a-5", rpe: 7, rpeDirty: true }]; }); await icuSyncDirect(); return __calls; }, SETUP({}, null, { push: false, pushWell: false }));
  assert.deepEqual(writes(calls), []);
});

test("a finished workout is created once (with an external id), not again on the next sync", async () => {
  const page = await start();
  const first = await page.evaluate(async s => { eval(s); const y = addDays(todayISO(), -1); mutateLog(y, x => { x.workouts = [{ sport: "Running", min: 30, km: 5 }]; }); await icuSyncDirect(); return __calls; }, SETUP());
  const w = writes(first); assert.equal(w.length, 1); assert.deepEqual([w[0][0], w[0][1]], ["POST", "/athlete/0/activities/manual"]); assert.ok(w[0][2].external_id);
  assert.deepEqual(writes(await sync(page, SETUP())), []);
});

test("check-in numbers fill only what intervals.icu lacks: a value already there is never overwritten", async () => {
  const page = await start(); const y = await page.evaluate(() => addDays(todayISO(), -1));
  const remote = { wellness: [{ id: y, restingHR: 48, sleepSecs: 7 * 3600 }] };
  const calls = await page.evaluate(async s => { eval(s); const d = addDays(todayISO(), -1); mutateLog(d, x => { x.weight = 80; x.rhr = 55; x.hrv = 62; x.sleep = 6.5; }); await icuSyncDirect(); return __calls; }, SETUP(remote));
  const w = writes(calls); assert.equal(w.length, 1); assert.equal(w[0][1], `/athlete/0/wellness/${y}`);
  assert.deepEqual(Object.keys(w[0][2]).sort(), ["hrv", "id", "weight"], "weight and HRV were missing there; resting HR and sleep were not touched");
});

test("a write that fails is kept to try again; a refused key stops everything", async () => {
  const page = await start();
  const r = await page.evaluate(async s => { eval(s); const t = todayISO(); mutateLog(t, x => { x.planned = [{ sport: "Running", min: 40, pushNew: true }]; });
    await icuSyncDirect(); const kept = !!logGet(t).planned[0].pushNew; return { kept }; }, SETUP({}, ["POST", "/events$", 500]));
  assert.equal(r.kept, true, "a server error keeps the flag: it is sent next time");
  const out = await page.evaluate(async s => { eval(s); const t = todayISO(); mutateLog(t, x => { x.planned = [{ sport: "Running", min: 40, pushNew: true }]; x.plannedDel = ["icu-55"]; });
    let err = null; try { await icuSyncDirect(); } catch (e) { err = e.message; } return { err, w: __calls.filter(c => c[0] !== "GET").length, still: !!logGet(t).planned[0].pushNew }; }, SETUP({}, ["GET", "/athlete/0$", 401]));
  assert.match(out.err, /refused the key/); assert.equal(out.w, 0); assert.equal(out.still, true);
});
