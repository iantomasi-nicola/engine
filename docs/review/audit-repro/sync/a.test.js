const test = require("node:test"), assert = require("node:assert/strict");
const R = "/home/user/engine/tests/";
const H = require(R + "lib/harness"), F = require(R + "fixtures/synthetic"), FS = require(R + "lib/fake-supabase");
let dir, browser; const devs = [];
test.before(async () => { dir = process.env.BUILT || H.build(H.tmp("aud-sync")); browser = await H.loadPlaywright().chromium.launch(); });
test.after(async () => { await browser?.close(); });
test.afterEach(async () => { for (const d of devs.splice(0)) await d.close(); });
const dev = async (srv, name, o = {}) => { const d = await FS.device(srv, name, { dir, browser, ...o }); devs.push(d); return d; };
const wait = ms => new Promise(r => setTimeout(r, ms));
const food = (id, name) => ({ id, name, brand: "", unit: "g", per: { kcal: 100, p: 10, c: 10, f: 1, fib: 0 }, servings: [], pack: 0, cat: "pantry", role: "P", meals: ["m"], source: "custom" });
const SETTINGS = dob => ({ onboarded: true, fit: { profile: { sex: "Male", dob, height: 180, startWeight: 80, bf: null, maxHr: null } } });

test("T1 first sign-in whose first load fails: next opening (online) keeps the device's own data", async () => {
  const srv = FS.server();
  srv.set("u1", "settings", SETTINGS("1985-01-01")); srv.set("u1", "lib/foods/t-a", food("t-a", "Account food")); srv.set("u1", "body", { w: { [F.plus(-2)]: 80 }, m: {} });
  const seed = { settings: SETTINGS("1999-09-09"), foods: { "t-b": food("t-b", "Device food") }, recipes: {}, days: {}, body: { w: { [F.plus(-1)]: 75 }, m: {} } };
  const B = await dev(srv, "B", { seed, down: true }); await wait(1500);
  const before = await B.page.evaluate(() => ({ foods: Object.keys(S.foods), owner: localStorage.getItem("engine.owner"), union: Sync.union }));
  console.log("before", before);
  await B.page.close(); B.down = false; await B.open(); await B.settle(6000); await wait(1500);
  const s = await B.page.evaluate(async () => ({ foods: Object.keys(S.foods).sort(), w: S.body.w, pts: (await BKDB.keys("pts")).length, toasts: __toasts }));
  console.log("after", s, "server foods", [...srv.rows("u1").keys()]);
  assert.ok(s.foods.includes("t-b"), "device food lost: " + JSON.stringify(s.foods));
  assert.ok(s.w[F.plus(-1)] === 75, "device weight lost");
});

test("T2 two devices edit the same planned day (meal plan): both meals kept", async () => {
  const srv = FS.server(), seed = F.seed({ withPlan: false }), d = F.plus(1);
  seed.days = { [d]: { date: d, meals: { m: [], d: [] } } };
  const A = await dev(srv, "A", { seed }); await A.settle();
  const B = await dev(srv, "B"); await B.settle();
  A.down = true;
  await A.page.evaluate(d => { const x = clone(S.days[d]); x.meals.m = [{ id: "ia", kind: "food", ref: "t-rice", qty: 80, eaten: false }]; put("days", d, x); }, d);
  await B.page.evaluate(d => { const x = clone(S.days[d]); x.meals.d = [{ id: "ib", kind: "food", ref: "t-chicken", qty: 200, eaten: false }]; put("days", d, x); }, d);
  await B.settle(); await wait(400);
  A.down = false; await A.page.evaluate(() => dispatchEvent(new Event("online"))); await A.settle(8000); await wait(800);
  const sv = srv.get("u1", "lib/days/" + d);
  console.log("server day", JSON.stringify(sv.meals));
  assert.equal(sv.meals.m.length + sv.meals.d.length, 2, "one device's meal lost");
});

test("T3 edit killed inside the debounce, snapshot not on disk, other device changed the doc: other device's change kept", async () => {
  const srv = FS.server(), seed = F.seed({ withPlan: false }); seed.body = { w: { [F.plus(-5)]: 81 }, m: {} };
  const noSnap = () => { const set = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (/^engine\.snap\./.test(k)) throw new DOMException("full", "QuotaExceededError"); return set.call(this, k, v); }; };
  const A = await dev(srv, "A", { seed, init: noSnap }); await A.settle(); await wait(1500);
  const B = await dev(srv, "B"); await B.settle();
  await A.page.evaluate(d => put("body", "", { ...S.body, w: { ...S.body.w, [d]: 70 } }), F.plus(-1));
  await A.page.close();
  await B.page.evaluate(d => put("body", "", { ...S.body, w: { ...S.body.w, [d]: 79 } }), F.plus(-3)); await B.settle(); await wait(300);
  console.log("server after B", srv.get("u1", "body").w);
  await A.open(); await A.settle(6000); await wait(1000);
  const w = srv.get("u1", "body").w; console.log("server", w);
  assert.equal(w[F.plus(-1)], 70, "A edit lost"); assert.equal(w[F.plus(-3)], 79, "B edit lost");
});

test("T4 two devices send the same document at the same moment (select→upsert window): both changes kept", async () => {
  const srv = FS.server(), seed = F.seed({ withPlan: false }); seed.body = { w: {}, m: {} };
  const A = await dev(srv, "A", { seed }); await A.settle();
  const B = await dev(srv, "B"); await B.settle();
  const orig = srv.handle; srv.handle = async (dv, spec) => { if (spec.op === "upsert" || (spec.op === "select" && spec.single)) await wait(300); return orig(dv, spec); };
  await Promise.all([A.page.evaluate(d => put("body", "", { ...S.body, w: { ...S.body.w, [d]: 70 } }), F.plus(-1)), B.page.evaluate(d => put("body", "", { ...S.body, w: { ...S.body.w, [d]: 79 } }), F.plus(-2))]);
  await wait(3000); srv.handle = orig; await A.settle(); await B.settle(); await wait(500);
  const w = srv.get("u1", "body").w, a = await A.page.evaluate(() => S.body.w), b = await B.page.evaluate(() => S.body.w);
  console.log("server", w, "A", a, "B", b);
  assert.deepEqual(Object.keys(w).length, 2, "lost update on server");
});

test("T5 sign out, edit on this device, other device edits, sign in again: both kept", async () => {
  const srv = FS.server(), seed = F.seed({ withPlan: false }); seed.body = { w: { [F.plus(-5)]: 81 }, m: {} };
  const A = await dev(srv, "A", { seed }); await A.settle(); await wait(1500);
  const B = await dev(srv, "B"); await B.settle();
  await A.page.evaluate(() => { localStorage.setItem("engine.localOnly", "true"); }); A.uid = null;
  await A.page.close(); const p = await A.ctx.newPage(); await A.attach(p); await p.goto(A.url); await p.waitForFunction(() => typeof S !== "undefined" && Sync.ready);
  console.log("local mode", await p.evaluate(() => [!!Sync.db, Sync.owner, Object.keys(S.foods).length]));
  await p.evaluate(d => { put("body", "", { ...S.body, w: { ...S.body.w, [d]: 70 } }); put("foods", "t-new", { id: "t-new", name: "Local new", unit: "g", per: { kcal: 1, p: 0, c: 0, f: 0 }, servings: [], cat: "pantry", role: "C", meals: [], source: "custom" }); }, F.plus(-1));
  await wait(300);
  await B.page.evaluate(d => put("body", "", { ...S.body, w: { ...S.body.w, [d]: 79 } }), F.plus(-3)); await B.settle();
  await p.evaluate(() => localStorage.removeItem("engine.localOnly")); A.uid = "u1"; await p.close();
  await A.open(); await A.settle(6000); await wait(1200);
  const w = srv.get("u1", "body").w; console.log("server", w, srv.get("u1", "lib/foods/t-new") ? "food up" : "food missing");
  assert.equal(w[F.plus(-1)], 70); assert.equal(w[F.plus(-3)], 79); assert.ok(srv.get("u1", "lib/foods/t-new"));
});

test("T6 AI service without its key on device B: removing it there removes A's service too", async () => {
  const srv = FS.server(), seed = F.seed({ withPlan: false }); seed.settings.ai = { services: [{ id: "s1", provider: "gemini", key: "SYNTH-AI", on: true }] };
  const A = await dev(srv, "A", { seed }); await A.settle(); await wait(800);
  const B = await dev(srv, "B"); await B.settle(); await wait(500);
  const bs = await B.page.evaluate(() => ({ list: S.settings.ai?.services, any: ENGINE.anyAI() }));
  console.log("B sees", JSON.stringify(bs));
  await B.page.evaluate(() => { S.settings.ai.services = []; saveSettings(); }); await B.settle(); await wait(800);
  const a = await A.page.evaluate(() => ({ list: S.settings.ai?.services, any: ENGINE.anyAI() }));
  console.log("A after", JSON.stringify(a));
});
