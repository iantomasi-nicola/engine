/* intervals.icu import (read-only facts for the energy model) and what a sync is allowed to write remotely. No real network: fetch is a stub. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let app;
test.afterEach(async () => { await app?.close(); app = null; });
const start = async () => { app = await H.startApp({ dir: H.build(H.tmp("icu-build")), seed: F.seed({ withPlan: false }) }); return app.page; };

/* a fake intervals.icu: activities for today, nothing else; every call is recorded */
const fake = payload => `(() => { window.__calls = []; window.fetch = async (u, o = {}) => { const m = (o.method || "GET").toUpperCase(); __calls.push([m, String(u).replace("https://intervals.icu/api/v1", "")]);
  const body = /\\/activities\\?/.test(u) ? ${JSON.stringify(payload)} : []; return { ok: true, status: 200, text: async () => JSON.stringify(body) }; }; S.settings.intervals = { key: "TEST", aid: "0" }; })()`;

test("the import keeps climb, speed, power, cadence, max HR and the device name as facts; absent values are left out, not zero", async () => {
  const page = await start(), t = new Date().toISOString().slice(0, 10);
  const act = { id: "i1", start_date_local: t + "T07:00:00", type: "Run", name: "Easy run", moving_time: 3000, distance: 8000, average_heartrate: 150, max_heartrate: 171.4, calories: 620, total_elevation_gain: 84.6, average_speed: 2.6667, average_cadence: 84, device_name: "Amazfit GTR 4", icu_training_load: 55 };
  const r = await page.evaluate(async ([setup, today]) => {
    eval(setup); await icuSyncDirect();
    const w = logGet(today).workouts[0]; const kcal = sessionKcal(w, today);
    return { w, kcal, calls: __calls };
  }, [fake([act]), t]);
  assert.deepEqual([r.w.elev, r.w.spd, r.w.cad, r.w.hrmax, r.w.devn], [85, 2.67, 84, 171, "Amazfit GTR 4"]); assert.equal(r.w.pw, undefined);
  assert.equal(r.w.kcal, 620); assert.deepEqual(r.kcal, { kcal: 620, how: "device" }, "the energy figure is unchanged");
});

test("a later sync without those fields does not erase them, and an activity with none gets none", async () => {
  const page = await start(), t = new Date().toISOString().slice(0, 10);
  const a1 = { id: "i1", start_date_local: t + "T07:00:00", type: "Run", moving_time: 3000, distance: 8000, average_heartrate: 150, calories: 620, total_elevation_gain: 40, device_name: "Amazfit" };
  const a2 = { id: "i2", start_date_local: t + "T18:00:00", type: "WeightTraining", moving_time: 2400, average_heartrate: 110, calories: 250 };
  const r = await page.evaluate(async ([s1, s2, today]) => { eval(s1); await icuSyncDirect(); eval(s2); await icuSyncDirect(); return logGet(today).workouts.map(w => [w.sport, w.elev ?? null, w.devn ?? null, w.pw ?? null]); }, [fake([a1, a2]), fake([{ ...a1, total_elevation_gain: undefined, device_name: undefined }, a2]), t]);
  assert.deepEqual(r, [["Running", 40, "Amazfit", null], ["Calisthenics", null, null, null]]);
});

test("a sync with nothing pending locally only reads: no POST, PUT or DELETE to intervals.icu", async () => {
  const page = await start(), t = new Date().toISOString().slice(0, 10);
  const calls = await page.evaluate(async ([setup]) => { eval(setup); await icuSyncDirect(); return __calls; }, [fake([{ id: "i1", start_date_local: t + "T07:00:00", type: "Run", moving_time: 3000, distance: 8000 }]), t]);
  assert.ok(calls.length >= 3, "it did read"); assert.deepEqual(calls.filter(([m]) => m !== "GET"), []);
});
