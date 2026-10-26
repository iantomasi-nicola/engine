const test = require("node:test"), assert = require("node:assert/strict");
const R = "/home/user/engine/tests/";
const H = require(R + "lib/harness"), F = require(R + "fixtures/synthetic"), FS = require(R + "lib/fake-supabase");
let dir, browser; const devs = [];
test.before(async () => { dir = process.env.BUILT; browser = await H.loadPlaywright().chromium.launch(); });
test.after(async () => { await browser?.close(); });
test.afterEach(async () => { for (const d of devs.splice(0)) await d.close(); });
const dev = async (srv, name, o = {}) => { const d = await FS.device(srv, name, { dir, browser, ...o }); devs.push(d); return d; };
const wait = ms => new Promise(r => setTimeout(r, ms));
const food = (id, name) => ({ id, name, brand: "", unit: "g", per: { kcal: 100, p: 10, c: 10, f: 1, fib: 0 }, servings: [], pack: 0, cat: "pantry", role: "P", meals: ["m"], source: "custom" });
const SETTINGS = dob => ({ onboarded: true, fit: { profile: { sex: "Male", dob, height: 180, startWeight: 80, bf: null, maxHr: null } } });
const YM = F.plus(-40).slice(0, 7), DX = YM + "-10";

test("T7 two devices each add a workout to the same day: both kept", async () => {
  const srv = FS.server(), A = await dev(srv, "A", { seed: F.seed({ withPlan: false }) }); await A.settle();
  const B = await dev(srv, "B"); await B.settle();
  A.down = true;
  await A.page.evaluate(dx => mutateLog(dx, d => { d.workouts = [...(d.workouts || []), wClean({ sport: "Running", min: 40, km: 6, int: "Moderate" })]; }), DX);
  await B.page.evaluate(dx => mutateLog(dx, d => { d.workouts = [...(d.workouts || []), wClean({ sport: "Strength", min: 50, int: "Hard" })]; }), DX);
  await B.settle(); await wait(400);
  A.down = false; await A.page.evaluate(() => dispatchEvent(new Event("online"))); await A.settle(8000); await wait(800);
  const w = srv.get("u1", "lib/logm/" + YM).days[DX].workouts; console.log("server workouts", JSON.stringify(w));
  assert.equal(w.length, 2);
});

test("T8 restore Replace of an older backup: weigh-ins and log days made after the backup", async () => {
  const srv = FS.server(), seed = F.seed({ withPlan: false }); seed.body = { w: { [F.plus(-10)]: 80 }, m: {} };
  const A = await dev(srv, "A", { seed }); await A.settle(); await wait(500);
  const r = await A.page.evaluate(async ([d1, d2, dx, dy]) => { mutateLog(dx, d => { d.water = 1000; }); await new Promise(r => setTimeout(r, 50));
    const j = JSON.parse(JSON.stringify(backupData()));
    put("body", "", { ...S.body, w: { ...S.body.w, [d2]: 78 } }); mutateLog(dy, d => { d.water = 2500; });
    restoreOpen(j, "file"); const sh = S_(); console.log(document.querySelector(".sheet")?.innerText.match(/Replace[^\n]*\n[^\n]*/)?.[0]); sh.mode = "replace"; await ACT["rs-go"](); await new Promise(r => setTimeout(r, 500));
    return { w: S.body.w, dy: logGet(dy)?.water ?? null, txt: "" }; }, [F.plus(-10), F.plus(-1), DX, YM + "-12"]);
  console.log("after replace", JSON.stringify(r));
  const txt = await A.page.evaluate(() => { restoreOpen(backupData(), "file"); return document.querySelector(".sheet").innerText; });
  console.log("TEXT:", txt.match(/Replace[\s\S]{0,90}/)?.[0]);
});

test("T9 migration from an older version: keys in the device copy and in the snapshot, no owner, legacy queue", async () => {
  const srv = FS.server(), seed = F.seed({ withPlan: false });
  seed.settings = { ...seed.settings, intervals: { key: "SYNTH-ICU", aid: "0" }, mapKey: "SYNTH-MAP", ai: { key: "SYNTH-OLDAI", provider: "gemini" } };
  srv.set("u1", "settings", seed.settings); srv.set("u1", "lib/foods/t-rice", seed.foods["t-rice"]);
  const legacy = [{ op: "set", path: "body", data: { w: { [F.plus(-1)]: 77 }, m: {} } }];
  const local = { "engine.snap.u1": JSON.stringify([["settings", seed.settings], ["lib/foods/t-rice", seed.foods["t-rice"]]]), "engine.q": JSON.stringify(legacy) };
  const A = await dev(srv, "A", { seed, local }); await A.settle(); await wait(2000);
  const s = await A.page.evaluate(() => ({ icu: S.settings.intervals?.key, map: S.settings.mapKey, ai: ENGINE.aiServices().map(x => x.key), store: localStorage.getItem("engine.keys"), owner: localStorage.getItem("engine.owner"), snap: /SYNTH/.test(localStorage.getItem("engine.snap.u1")), local: /SYNTH/.test(localStorage.getItem("fuelplanner.v1")) }));
  console.log("migr", JSON.stringify(s), "server", JSON.stringify(srv.get("u1", "settings").ai), JSON.stringify(srv.get("u1", "body")));
  assert.doesNotMatch(JSON.stringify([...srv.rows("u1")]), /SYNTH/);
  await A.page.reload(); await A.page.waitForFunction(() => typeof S !== "undefined" && Sync.ready); await A.settle(); await wait(500);
  console.log("after reload", JSON.stringify(await A.page.evaluate(() => [S.settings.intervals?.key, S.settings.mapKey, ENGINE.aiServices().map(x => x.key)])));
});

test("T10 A → B → A on one browser: no leak to B; A's unsent edits reach A", async () => {
  const srv = FS.server(), seed = F.seed({ withPlan: false }); seed.settings.intervals = { key: "SYNTH-ICU-A", aid: "0" };
  const A = await dev(srv, "A", { seed }); await A.settle(); await wait(1500);
  // A goes offline, edits, signs out (queue can't go), then B signs in on the same browser
  A.down = true; await A.page.evaluate(d => { put("body", "", { ...S.body, w: { [d]: 66 } }); put("foods", "t-off", { id: "t-off", name: "Offline A food", unit: "g", per: { kcal: 1, p: 0, c: 0, f: 0 }, servings: [], cat: "pantry", role: "C", meals: [], source: "custom" }); }, F.plus(-1));
  await wait(600);
  A.uid = "uB"; A.down = false; await A.page.close(); await A.open(); await A.settle(6000); await wait(1500);
  const b = await A.page.evaluate(() => ({ foods: Object.keys(S.foods), w: S.body.w, icu: S.settings.intervals?.key || "", owner: Sync.owner }));
  console.log("as B", JSON.stringify(b), "B rows", JSON.stringify([...srv.rows("uB").keys()]));
  assert.doesNotMatch(JSON.stringify([...srv.rows("uB")]), /SYNTH|t-off|Test rice/);
  A.uid = "u1"; await A.page.close(); await A.open(); await A.settle(6000); await wait(1500);
  const a = await A.page.evaluate(() => ({ foods: Object.keys(S.foods), w: S.body.w, icu: S.settings.intervals?.key || "" }));
  console.log("as A again", JSON.stringify(a), "u1 body", JSON.stringify(srv.get("u1", "body")), !!srv.get("u1", "lib/foods/t-off"));
  assert.equal(srv.get("u1", "body").w[F.plus(-1)], 66); assert.ok(srv.get("u1", "lib/foods/t-off")); assert.equal(a.icu, "SYNTH-ICU-A");
});

test("T11 first sign-in into an EMPTY account, first load fails, reopened online: device data uploaded", async () => {
  const srv = FS.server();
  const seed = F.seed({ withPlan: true });
  const B = await dev(srv, "B", { seed, down: true }); await wait(1500);
  await B.page.close(); B.down = false; await B.open(); await B.settle(6000); await wait(1500);
  const s = await B.page.evaluate(() => ({ foods: Object.keys(S.foods).length, days: Object.keys(S.days).length, onb: S.settings.onboarded }));
  console.log("empty account after", JSON.stringify(s), "server", [...srv.rows("u1").keys()].length);
  assert.ok(s.foods > 0, "local foods wiped");
});
