/* M14b group A: the sync engine (docs/review/area10-sync-backup.md #1-#9, #24; area11-pwa-security.md #3).
   Real shim.js against an in-memory Supabase shared by several browser contexts (tests/lib/fake-supabase.js). Synthetic data only, no network. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic"), FS = require("./lib/fake-supabase");
let dir, browser; const devs = [];
test.before(async () => { dir = H.build(H.tmp("m14b-sync")); browser = await H.loadPlaywright().chromium.launch(); });
test.after(async () => { await browser?.close(); });
test.afterEach(async () => { for (const d of devs.splice(0)) await d.close(); });
const dev = async (srv, name, o = {}) => { const d = await FS.device(srv, name, { dir, browser, ...o }); devs.push(d); return d; };
const wait = ms => new Promise(r => setTimeout(r, ms));
/* a past month, so the two days of a log document are in the same month whatever today is */
const YM = F.plus(-40).slice(0, 7), DX = YM + "-10", DY = YM + "-12";
const food = (id, name) => ({ id, name, brand: "", unit: "g", per: { kcal: 100, p: 10, c: 10, f: 1, fib: 0 }, servings: [], pack: 0, cat: "pantry", role: "P", meals: ["m"], source: "custom" });
const SETTINGS = dob => ({ onboarded: true, fit: { profile: { sex: "Male", dob, height: 180, startWeight: 80, bf: null, maxHr: null } } });

test("merge rules: per key, deletions kept, records by id, journal by time, key order ignored", async () => {
  const srv = FS.server(), A = await dev(srv, "A", { seed: F.seed({ withPlan: false }) });
  const r = await A.page.evaluate(() => {
    const M = (p, b, l, r) => ENGINE.merge(p, b, l, r);
    return {
      /* base a=1 b=2; this device removed b and added c; the server changed a to 5 and added d -> a=5 (server), c=3, d=4, no b */
      body: M("body", { w: { a: 1, b: 2 }, m: {} }, { w: { a: 1, c: 3 }, m: {} }, { w: { a: 5, b: 2, d: 4 }, m: {} }).w,
      /* records by id: this device added 2; the server removed 1 and added 3 -> [2, 3] (this device's order, then the server's new ones) */
      train: M("train", { tests: [{ id: 1, v: 1 }] }, { tests: [{ id: 1, v: 1 }, { id: 2, v: 2 }] }, { tests: [{ id: 3, v: 3 }] }).tests.map(x => x.id),
      /* both changed the same value: the edit being sent wins */
      clash: M("settings", { x: 1 }, { x: 2 }, { x: 3 }).x,
      /* the journal: per field the newest time (m from this device at 200, e from the server) */
      jr: M("lib/logm/2026-01", null, { days: { "2026-01-05": { jr: { m: 4, t: { m: 200 } } } } }, { days: { "2026-01-05": { water: 500, jr: { m: 2, e: 3, t: { m: 100, e: 150 } } } } }).days["2026-01-05"],
      same: ENGINE.merge("body", { w: { a: 1 } }, { w: { a: 1, b: 2 } }, { w: { b: 2, a: 1 } }).w
    };
  });
  assert.deepEqual(r.body, { a: 5, c: 3, d: 4 });
  assert.deepEqual(r.train, [2, 3]);
  assert.equal(r.clash, 2);
  assert.deepEqual([r.jr.water, r.jr.jr.m, r.jr.jr.e], [500, 4, 3]);
  assert.deepEqual(r.same, { a: 1, b: 2 });
  assert.deepEqual(A.errors, []);
});

test("#1 two devices: an offline device coming back does not wipe what the other one saved (body and log of the same month)", async () => {
  const srv = FS.server(), seed = F.seed({ withPlan: false }); seed.body = { w: { [F.plus(-5)]: 81 }, m: {} };
  const A = await dev(srv, "A", { seed }); await A.settle();
  const B = await dev(srv, "B"); await B.settle();
  assert.equal(await B.page.evaluate(d => S.body.w[d], F.plus(-5)), 81);
  A.down = true;
  await A.page.evaluate(([d0, d1, dx]) => { const w = { ...S.body.w, [d1]: 80.5 }; delete w[d0]; put("body", "", { ...S.body, w }); mutateLog(dx, d => { d.workouts = [{ sport: "Running", min: 40, km: 6, int: "Moderate" }]; }); }, [F.plus(-5), F.plus(-1), DX]);
  await B.page.evaluate(([d2, dy]) => { put("body", "", { ...S.body, w: { ...S.body.w, [d2]: 79.9 } }); mutateLog(dy, d => { d.water = 2000; }); }, [F.plus(-2), DY]);
  await B.settle(); await wait(500);
  A.down = false; await A.page.evaluate(() => dispatchEvent(new Event("online"))); await A.settle(8000); await wait(800);
  /* expected by hand: 81 on day -5 removed by A, 80.5 on day -1 from A, 79.9 on day -2 from B; the run on DX (A) and the water on DY (B) */
  const want = { [F.plus(-1)]: 80.5, [F.plus(-2)]: 79.9 };
  assert.deepEqual(srv.get("u1", "body").w, want);
  const lg = srv.get("u1", "lib/logm/" + YM).days;
  assert.deepEqual([lg[DX]?.workouts?.length, lg[DY]?.water], [1, 2000]);
  for (const d of [A, B]) {
    const s = await d.page.evaluate(([dx, dy]) => ({ w: S.body.w, run: logGet(dx)?.workouts?.length, water: logGet(dy)?.water }), [DX, DY]);
    assert.deepEqual(s, { w: want, run: 1, water: 2000 }, d.name);
  }
  assert.deepEqual([...A.errors, ...B.errors], []);
});

test("#2 an edit made just before the tab closes is kept and sent at the next opening", async () => {
  const srv = FS.server(), A = await dev(srv, "A", { seed: F.seed({ withPlan: false }) }); await A.settle();
  await A.page.evaluate(d => put("body", "", { ...S.body, w: { ...S.body.w, [d]: 70 } }), F.plus(-3)); await A.settle(); await wait(1500);
  /* pagehide: what is waiting is handed to the queue saved on the device at once */
  const q = await A.page.evaluate(d => { put("body", "", { ...S.body, w: { ...S.body.w, [d]: 71 } }); dispatchEvent(new Event("pagehide")); return JSON.parse(localStorage.getItem("engine.q.u1") || "[]").map(x => x.path); }, F.plus(-4));
  assert.ok(q.includes("body"), "queued at pagehide: " + q);
  await A.settle();
  /* a tab killed inside the 380 ms window, with no pagehide at all */
  await A.page.evaluate(d => put("body", "", { ...S.body, w: { ...S.body.w, [d]: 77.7 } }), F.plus(-1));
  await A.page.close();
  await A.open(); await A.settle(6000);
  assert.equal(await A.page.evaluate(d => S.body.w[d], F.plus(-1)), 77.7);
  assert.deepEqual(srv.get("u1", "body").w, { [F.plus(-3)]: 70, [F.plus(-4)]: 71, [F.plus(-1)]: 77.7 });
  assert.deepEqual(A.errors, []);
});

test("#3 first sign-in of a device with its own data into an account with data: both kept, restore point first", async () => {
  const srv = FS.server();
  srv.set("u1", "settings", SETTINGS("1985-01-01")); srv.set("u1", "lib/foods/t-a", food("t-a", "Account food")); srv.set("u1", "body", { w: { [F.plus(-2)]: 80 }, m: {} });
  const seed = { settings: { ...SETTINGS("1999-09-09"), intervals: { key: "SYNTH-ICU-B", aid: "0" }, mapKey: "SYNTH-MAP-B" }, foods: { "t-b": food("t-b", "Device food") }, recipes: {}, days: {}, body: { w: { [F.plus(-1)]: 75 }, m: {} } };
  const B = await dev(srv, "B", { seed }); await B.settle();
  await B.page.waitForFunction(() => __toasts.some(t => /merged/i.test(t)), null, { timeout: 5000 }).catch(() => {});
  const s = await B.page.evaluate(async () => { const ks = await BKDB.keys("pts"), why = []; for (const k of ks) why.push((await BKDB.get("pts", k))?.why); return { foods: Object.keys(S.foods).sort(), w: S.body.w, dob: S.settings.fit.profile.dob, key: S.settings.intervals?.key, why, toasts: __toasts }; });
  /* the device's own keys stay on the device (S-1): usable here, never uploaded */
  assert.equal(s.key, "SYNTH-ICU-B");
  assert.doesNotMatch(JSON.stringify([...srv.rows("u1")]), /SYNTH-/);
  /* expected: the union of foods and weighings; on a clash the account wins (its date of birth), this device's copy is in the restore point */
  assert.deepEqual(s.foods, ["t-a", "t-b"]);
  assert.deepEqual(s.w, { [F.plus(-2)]: 80, [F.plus(-1)]: 75 });
  assert.equal(s.dob, "1985-01-01");
  assert.ok(s.why.includes("before sign-in"), JSON.stringify(s.why));
  assert.ok(s.toasts.some(t => /merged/i.test(t)), JSON.stringify(s.toasts));
  assert.ok(srv.get("u1", "lib/foods/t-b"), "device food uploaded");
  assert.deepEqual(srv.get("u1", "body").w, { [F.plus(-2)]: 80, [F.plus(-1)]: 75 });
  assert.deepEqual(B.errors, []);
});

test("#4 another account on the same browser never receives the previous account's data, keys or queue", async () => {
  const srv = FS.server(), seed = F.seed({ withPlan: false });
  seed.settings.ai = { services: [{ id: "s1", provider: "gemini", key: "SYNTH-KEY-A", on: true }] }; seed.settings.intervals = { key: "SYNTH-ICU-A", athlete: "i1" };
  const legacyQ = [{ op: "set", path: "lib/foods/t-legacy", data: food("t-legacy", "Queued by A") }];
  const local = { "engine.snap.uA": JSON.stringify([["settings", seed.settings], ["lib/foods/t-rice", seed.foods["t-rice"]]]), "engine.q": JSON.stringify(legacyQ), "engine.owner": "uA" };
  const B = await dev(srv, "B", { uid: "uB", seed, local }); await B.settle(); await wait(800);
  const dump = JSON.stringify([...srv.rows("uB")]);
  assert.doesNotMatch(dump, /SYNTH-KEY-A|SYNTH-ICU-A|t-rice|t-legacy|Test chicken/);
  const s = await B.page.evaluate(() => ({ foods: Object.keys(S.foods), key: JSON.stringify(S.settings).includes("SYNTH"), snapA: !!localStorage.getItem("engine.snap.uA"), qB: localStorage.getItem("engine.q.uB"), owner: localStorage.getItem("engine.owner") }));
  assert.deepEqual(s.foods, []); assert.equal(s.key, false); assert.equal(s.snapA, true); assert.equal(s.owner, "uB");
  assert.doesNotMatch(String(s.qB), /t-legacy/);
  assert.deepEqual(B.errors, []);
});

test("#5 a restore-sized burst of writes saves the local copy once, stays fast, and all of it reaches the account", async () => {
  const srv = FS.server(), A = await dev(srv, "A", { seed: F.seed({ withPlan: false }) }); await A.settle();
  const r = await A.page.evaluate(() => {
    const n = {}, real = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { n[k] = (n[k] || 0) + 1; return real.call(this, k, v); };
    const t0 = performance.now();
    for (let i = 0; i < 1500; i++) put("foods", "bulk" + i, { id: "bulk" + i, name: "Bulk " + i, unit: "g", per: { kcal: 1, p: 0, c: 0, f: 0 }, servings: [], cat: "pantry", role: "C", meals: [], source: "custom" });
    const ms = performance.now() - t0;
    return new Promise(ok => setTimeout(() => { Storage.prototype.setItem = real; ok({ ms, local: n["fuelplanner.v1"] || 0 }); }, 50));
  });
  assert.equal(r.local, 1, "the local copy is written once for the whole burst");
  assert.ok(r.ms < 1500, `1500 writes took ${Math.round(r.ms)} ms`);
  await A.settle(30000);
  assert.equal([...srv.rows("u1").keys()].filter(p => p.startsWith("lib/foods/bulk")).length, 1500);
  assert.deepEqual(A.errors, []);
});

test("#6 a change the server refuses is set aside: the others still go, the user is told once", async () => {
  const srv = FS.server(), A = await dev(srv, "A", { seed: F.seed({ withPlan: false }) }); await A.settle();
  srv.reject = p => p === "body";
  await A.page.evaluate(([d, dx]) => { put("body", "", { ...S.body, w: { [d]: 72 } }); mutateLog(dx, x => { x.water = 1500; }); }, [F.plus(-1), DX]);
  await A.settle(6000); await wait(500);
  assert.equal(srv.get("u1", "lib/logm/" + YM)?.days?.[DX]?.water, 1500);
  const s = await A.page.evaluate(() => ({ pending: ENGINE.pending(), blocked: ENGINE.status().blocked, toasts: __toasts.filter(t => /couldn.t be saved/i.test(t)).length, pill: Sync.state }));
  assert.deepEqual(s, { pending: 0, blocked: 1, toasts: 1, pill: "synced" });
  assert.deepEqual(A.errors, []);
});

test("#7 the pill follows the real queue: Offline while waiting, Synced once sent, never Synced on an offline start", async () => {
  const srv = FS.server(), A = await dev(srv, "A", { seed: F.seed({ withPlan: false }) }); await A.settle(); await wait(500);
  assert.equal(await A.page.evaluate(() => Sync.state), "synced");
  A.down = true; await A.ctx.setOffline(true);
  await A.page.evaluate(d => put("body", "", { ...S.body, w: { [d]: 73 } }), F.plus(-1)); await wait(1500);
  assert.equal(await A.page.evaluate(() => Sync.state), "offline");
  A.down = false; await A.ctx.setOffline(false); await A.settle(8000); await wait(300);
  assert.deepEqual(await A.page.evaluate(() => [Sync.state, ENGINE.pending()]), ["synced", 0]);
  A.down = true; await A.page.reload(); await A.page.waitForFunction(() => typeof S !== "undefined" && Sync.ready); await wait(1200);
  assert.notEqual(await A.page.evaluate(() => Sync.state), "synced");
  assert.deepEqual(A.errors, []);
});

test("#8 a queue that can't be saved on the device is reported; the device copy keeps only the recent days", async () => {
  const srv = FS.server(), seed = F.seed({ withPlan: false }), old = F.plus(-400), recent = F.plus(-3);
  seed.days = { [old]: { date: old, meals: {} }, [recent]: { date: recent, meals: { m: [] }, note: "x" } };
  const A = await dev(srv, "A", { seed }); await A.settle(); await wait(1800);
  const snap = await A.page.evaluate(() => JSON.parse(localStorage.getItem("engine.snap.u1") || "[]").map(x => x[0]));
  assert.ok(snap.includes("lib/days/" + recent) && !snap.includes("lib/days/" + old), JSON.stringify(snap.filter(p => p.includes("days"))));
  assert.ok(srv.get("u1", "lib/days/" + old), "the old day is still in the account");
  A.down = true;
  const msgs = await A.page.evaluate(async d => { const real = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (/^engine\.q/.test(k)) throw new DOMException("full", "QuotaExceededError"); return real.call(this, k, v); };
    put("body", "", { ...S.body, w: { [d]: 74 } }); dispatchEvent(new Event("pagehide")); put("body", "", { ...S.body, w: { [d]: 75 } }); dispatchEvent(new Event("pagehide"));
    await new Promise(r => setTimeout(r, 300)); Storage.prototype.setItem = real; return __toasts.filter(t => /storage is full/i.test(t)); }, F.plus(-1));
  assert.equal(msgs.length, 1, JSON.stringify(msgs));
  assert.deepEqual(A.errors, []);
});

test("#9 every row is loaded when the server returns fewer than 1000 rows per page", async () => {
  const srv = FS.server({ maxRows: 300 });
  srv.set("u1", "settings", SETTINGS("1990-06-15")); for (let i = 0; i < 700; i++) srv.set("u1", "lib/foods/f" + String(i).padStart(4, "0"), food("f" + i, "Food " + i));
  const A = await dev(srv, "A"); await A.settle(); await wait(500);
  assert.equal(await A.page.evaluate(() => Object.keys(S.foods).length), 700);
  assert.deepEqual(A.errors, []);
});

test("#24 a device that missed live updates while asleep catches up when it comes back to the foreground", async () => {
  const srv = FS.server(), A = await dev(srv, "A", { seed: F.seed({ withPlan: false }) }); await A.settle();
  const B = await dev(srv, "B"); await B.settle();
  B.asleep = true;
  await A.page.evaluate(d => put("body", "", { ...S.body, w: { [d]: 69 } }), F.plus(-1)); await A.settle();
  await B.page.waitForFunction(() => Date.now() - (ENGINE.status().loadedAt || 0) > 10500, null, { timeout: 15000 }).catch(() => {});
  B.asleep = false; await B.page.evaluate(() => document.dispatchEvent(new Event("visibilitychange"))); await wait(1500);
  assert.equal(await B.page.evaluate(d => S.body.w[d], F.plus(-1)), 69);
  assert.deepEqual([...A.errors, ...B.errors], []);
});

/* S-1: API keys live in this device's key store (engine.keys) and in memory only */
const KEYED = () => ({ ...SETTINGS("1990-06-15"), intervals: { key: "SYNTH-ICU", aid: "0" }, mapKey: "SYNTH-MAP", ai: { key: "SYNTH-OLD", services: [{ id: "s1", provider: "gemini", key: "SYNTH-AI", on: true }] } });
test("S-1 keys stay on the device: not in the account, the device copy, the snapshot or a restore point, and still there after a reload", async () => {
  const srv = FS.server(), seed = F.seed({ withPlan: false }); seed.settings = KEYED();
  const A = await dev(srv, "A", { seed }); await A.settle(); await wait(1500);
  const r = await A.page.evaluate(async () => { await restorePoint("test"); const ks = (await BKDB.keys("pts")).sort(), pt = await BKDB.get("pts", ks[ks.length - 1]);
    return { local: localStorage.getItem("fuelplanner.v1"), snap: localStorage.getItem("engine.snap.u1"), q: localStorage.getItem("engine.q.u1") || "", point: JSON.stringify(pt), store: localStorage.getItem("engine.keys"), mem: [S.settings.intervals.key, S.settings.mapKey, S.settings.ai.services[0].key, S.settings.ai.key] }; });
  for (const k of ["local", "snap", "q", "point"]) assert.doesNotMatch(r[k], /SYNTH-/, k);
  assert.doesNotMatch(JSON.stringify([...srv.rows("u1")]), /SYNTH-/);
  assert.match(r.store, /SYNTH-ICU/); assert.deepEqual(r.mem, ["SYNTH-ICU", "SYNTH-MAP", "SYNTH-AI", "SYNTH-OLD"]);
  await A.page.reload(); await A.page.waitForFunction(() => typeof S !== "undefined" && Sync.ready); await A.settle(); await wait(400);
  assert.deepEqual(await A.page.evaluate(() => [S.settings.intervals.key, S.settings.mapKey, S.settings.ai.services[0].key]), ["SYNTH-ICU", "SYNTH-MAP", "SYNTH-AI"]);
  /* a backup asked with its keys still has them; the default one does not */
  assert.deepEqual(await A.page.evaluate(() => [/SYNTH-ICU/.test(JSON.stringify(backupData({ keys: true }))), /SYNTH-/.test(JSON.stringify(backupData()))]), [true, false]);
  assert.deepEqual(A.errors, []);
});

test("S-1 migration: keys already in the synced settings move to the device once and leave the account; another device sees them empty", async () => {
  const srv = FS.server(); srv.set("u1", "settings", KEYED());
  const A = await dev(srv, "A"); await A.settle(); await wait(1200);
  assert.deepEqual(await A.page.evaluate(() => [S.settings.intervals?.key, S.settings.mapKey, S.settings.ai?.services?.[0]?.key]), ["SYNTH-ICU", "SYNTH-MAP", "SYNTH-AI"]);
  assert.doesNotMatch(JSON.stringify(srv.get("u1", "settings")), /SYNTH-/);
  assert.equal(srv.get("u1", "settings").fit.profile.dob, "1990-06-15");
  const B = await dev(srv, "B"); await B.settle(); await wait(400);
  assert.deepEqual(await B.page.evaluate(() => [S.settings.intervals?.key || "", S.settings.mapKey || "", S.settings.ai?.services?.[0]?.key || "", S.settings.ai?.services?.length]), ["", "", "", 1]);
  assert.deepEqual([...A.errors, ...B.errors], []);
});

/* code-guard review of group A (26/10): four ways an unsent edit or a key could still be lost */
test("an edit still waiting in the debounce stays marked unsent when an earlier send of the same document is confirmed", async () => {
  const srv = FS.server(), A = await dev(srv, "A", { seed: F.seed({ withPlan: false }) }); await A.settle();
  const r = await A.page.evaluate(() => { Sync.dirty.add("body|"); Sync.pending.set("body|", 1); syncSent("body", clone(S.body), false); const kept = Sync.dirty.has("body|"); Sync.pending.delete("body|"); Sync.dirty.delete("body|"); return kept; });
  assert.equal(r, true);
});

test("signing in on a device whose data belongs to no account, while another account's copy is also there, saves a restore point before the device is cleared", async () => {
  const srv = FS.server(), seed = F.seed({ withPlan: false });
  const A = await dev(srv, "A", { seed }); await A.settle();
  /* this device's data belongs to no account (owner ""), and another account's copy is on it too */
  const r = await A.page.evaluate(async () => { Sync.owner = ""; localStorage.removeItem(OWNER_KEY); localStorage.setItem("engine.snap.other", "[]"); await new Promise(r => setTimeout(r, 300));
    const before = (await BKDB.keys("pts")).length, n = Object.keys(S.foods).length; claimLocal("u9"); await new Promise(r => setTimeout(r, 300));
    const ks = (await BKDB.keys("pts")).sort(), pt = ks.length > before ? await BKDB.get("pts", ks[ks.length - 1]) : null; return { n, after: Object.keys(S.foods).length, why: pt?.why || "", kept: Object.keys(pt?.data?.foods || {}).length }; });
  assert.ok(r.n > 0 && r.after === 0, "the device was cleared for the other account");
  assert.match(r.why, /sign-in/); assert.equal(r.kept, r.n, "the restore point holds the device's own data");
});

test("the queue of an older version is not deleted when the device can't save it under the account's name", async () => {
  const srv = FS.server(), legacy = [{ op: "set", path: "lib/foods/old1", data: food("old1", "Synthetic oats") }];
  const A = await dev(srv, "A", { down: true, seed: F.seed({ withPlan: false }), local: { "engine.q": JSON.stringify(legacy) },
    init: () => { const set = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (k === "engine.q.u1") throw new Error("QuotaExceededError"); return set.call(this, k, v); }; } });
  assert.match(await A.page.evaluate(() => localStorage.getItem("engine.q") || ""), /old1/);
});

test("a restore from a file without keys keeps every key of this device, AI services included", async () => {
  const srv = FS.server(), seed = F.seed({ withPlan: false }); seed.settings = KEYED();
  const A = await dev(srv, "A", { seed }); await A.settle(); await wait(800);
  const r = await A.page.evaluate(async () => { const j = backupData(); restoreOpen(j, "file"); const sh = S_(); sh.mode = "replace"; await ACT["rs-go"](); await new Promise(r => setTimeout(r, 300));
    return [S.settings.intervals?.key, S.settings.mapKey, S.settings.ai?.services?.[0]?.key, keyStore()["u1"]?.svc && Object.values(keyStore()["u1"].svc)[0]]; });
  assert.deepEqual(r, ["SYNTH-ICU", "SYNTH-MAP", "SYNTH-AI", "SYNTH-AI"]);
});

test("a settings change queued by an older version goes to the account without its keys", async () => {
  const srv = FS.server(), legacy = [{ op: "set", path: "settings", data: KEYED() }];
  const A = await dev(srv, "A", { seed: F.seed({ withPlan: false }), local: { "engine.q": JSON.stringify(legacy) } }); await A.settle(); await wait(800);
  assert.doesNotMatch(JSON.stringify([...srv.rows("u1")]), /SYNTH-/);
});
