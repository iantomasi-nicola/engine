/* M14b group C: links that write (?supp=), a document that is already broken, and restoring a backup.
   area11 #1, #2, #22, #24; area10 #10, #11, #14, #17, #18, #20. Synthetic data only.

   Expected values (by hand):
   - ?supp=s1&d=garbage and ?supp=s1&d=2026-13-45 and ?supp=nope&d=<today> write nothing; ?supp=s1&d=<today> ticks s1 once (positive control).
   - a document with logm["garbage"] / a day "2026-13-45" still renders Today, allLogDates() holds only real dates.
   - restore photos: 1x1 PNG data URL -> Blob image/png in IndexedDB; "https://x.test/a.png" and "data:text/html;base64,..." are not fetched and are counted:
     toast "Restored · 1 items · 2 photos skipped" (n = 1: the photo; no other part picked).
   - restore {settings:{}} in Replace leaves the profile as it is; {train:"abc", shop:[]} are refused and named.
   - Merge: current body.w = {D1:80}, file body.w = {D1:99, D2:81} -> {D1:80, D2:81}; races by id: current [r1], file [r1, r2] -> [r1, r2]. */
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("fs"), path = require("path"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let dir, app;
test.before(() => { dir = H.build(H.tmp("m14bc-build")); });
test.afterEach(async () => { await app?.close(); app = null; });
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const seedWith = extra => { const s = F.seed({ withPantry: true }); s.settings.supps = [{ id: "s1", name: "Vit D", dose: "1", times: ["08:00"] }]; return { ...s, ...extra }; };
const start = async (seed = seedWith()) => { app = await H.startApp({ dir, seed }); return app.page; };

test("?supp= with a date that is not a real day, or a supplement that does not exist, writes nothing and never blanks the page", async () => {
  const page = await start();
  for (const q of ["supp=s1&d=garbage", "supp=s1&d=2026-13-45", "supp=s1&d=2026-02-30", "supp=nope&d=" + F.plus(0), "supp=s1,nope&d=zz"]) {
    await page.goto(app.url + "?" + q); await page.waitForFunction(() => typeof S !== "undefined" && S.settings); await page.waitForTimeout(3300);
    const keys = await page.evaluate(() => Object.keys(S.logm));
    assert.ok(keys.every(k => /^\d{4}-\d{2}$/.test(k)), q + " wrote " + keys);
    assert.equal(await page.evaluate(() => Object.values(S.logm).some(m => Object.values(m.days || {}).some(d => d.supp && d.supp.nope)) ), false, q);
  }
  await page.goto(app.url); await page.waitForFunction(() => typeof S !== "undefined" && S.settings); await page.waitForTimeout(500);
  assert.ok((await page.evaluate(() => document.querySelector("#main").innerText.length)) > 50, "Today is not blank");
  assert.deepEqual(app.errors, []);
});

test("?supp= with a valid supplement and day still ticks it (positive control)", async () => {
  const page = await start(); const t = F.plus(0);
  await page.goto(app.url + "?supp=s1&d=" + t); await page.waitForFunction(() => typeof S !== "undefined" && S.settings); await page.waitForTimeout(3300);
  assert.equal(await page.evaluate(d => !!suppTaken(d, "s1"), t), true);
  assert.deepEqual(app.errors, []);
});

test("a document that already holds a non-date key still opens: Today renders and the series ignore the key", async () => {
  const t = F.plus(0), mk = t.slice(0, 7);
  const page = await start(seedWith({ logm: { garbage: { month: "garbage", days: { garbage: { supp: { s1: "08:00" }, weight: 70 } } }, [mk]: { month: mk, days: { "2026-13-45": { weight: 71 }, [t]: { weight: 80 } } } } }));
  assert.ok((await page.evaluate(() => document.querySelector("#main").innerText.length)) > 50, "Today is not blank");
  assert.deepEqual(await page.evaluate(() => allLogDates().filter(d => !/^\d{4}-\d{2}-\d{2}$/.test(d))), []);
  assert.deepEqual(await page.evaluate(() => { energySeries(); return 0; }), 0);
  assert.deepEqual(app.errors, []);
});

test("loadLocal repairs a stored document whose parts have the wrong type", async () => {
  const page = await start(seedWith({ train: "abc", shop: [], body: 5, foods: [], logm: "x", days: null, recipes: 7, queue: "q" }));
  const r = await page.evaluate(() => ({ train: Array.isArray(S.train.tests), shop: typeof S.shop.pantry === "object" && !Array.isArray(S.shop), body: typeof S.body.w === "object", foods: !Array.isArray(S.foods) && typeof S.foods === "object", logm: !Array.isArray(S.logm) && typeof S.logm === "object", recipes: typeof S.recipes === "object", main: document.querySelector("#main").innerText.length > 50 }));
  assert.deepEqual(r, { train: true, shop: true, body: true, foods: true, logm: true, recipes: true, main: true });
  assert.deepEqual(app.errors, []);
});

test("restoring photos: a data:image URL becomes a Blob without any fetch; other schemes are refused and counted", async () => {
  const page = await start();
  const r = await page.evaluate(async png => {
    restoreOpen({ app: "Engine", version: 3, photos: { p1: png, p2: "https://x.test/a.png", p3: "data:text/html;base64,PGI+eDwvYj4=" } }, "file"); UI.sheet.parts = { photos: true };
    await ACT["rs-go"](); await new Promise(r => setTimeout(r, 100));
    const b1 = await IDB.get("p1"), b2 = await IDB.get("p2"), b3 = await IDB.get("p3");
    return { t1: b1 && b1.type, size: b1 && b1.size, b2: !!b2, b3: !!b3, toast: document.querySelector("#toast").innerText };
  }, PNG);
  assert.equal(r.t1, "image/png"); assert.ok(r.size > 20); assert.equal(r.b2, false); assert.equal(r.b3, false);
  assert.match(r.toast, /Restored · 1 items · 2 photos skipped/);
  assert.deepEqual(app.errors, [], "no CSP violation: nothing was fetched");
});

test("restoring a file with parts of the wrong type refuses those parts, names them, and keeps the profile", async () => {
  const page = await start(); const before = await page.evaluate(() => JSON.stringify({ dob: S.settings.fit.profile.dob, on: S.settings.onboarded, tpls: Array.isArray(S.train.tests), pantry: Object.keys(S.shop.pantry) }));
  const r = await page.evaluate(async () => {
    restoreOpen({ app: "Engine", version: 3, settings: {}, train: "abc", shop: [], body: 5, logm: { "2026-01": 5, bad: { days: { x: 1 } } }, foods: { f1: 3 } }, "file");
    const note = document.querySelector(".sheet").innerText; Object.keys(UI.sheet.parts).forEach(k => UI.sheet.parts[k] = true);
    let threw = null; try { await ACT["rs-go"](); } catch (e) { threw = String(e); }
    return { threw, note, on: S.settings.onboarded, dob: S.settings.fit.profile.dob, trainOk: Array.isArray(S.train.tests), shopOk: !Array.isArray(S.shop) && typeof S.shop.pantry === "object", bodyOk: typeof S.body.w === "object", logm: Object.keys(S.logm), foods: Object.keys(S.foods), toast: document.querySelector("#toast").innerText };
  });
  assert.equal(r.threw, null); assert.match(r.note, /train/i); assert.match(r.note, /shop/i);
  assert.equal(r.on, true); assert.equal(r.dob, JSON.parse(before).dob); assert.equal(r.trainOk, true); assert.equal(r.shopOk, true); assert.equal(r.bodyOk, true);
  assert.ok(!r.logm.includes("bad") && !r.logm.includes("2026-01"), "malformed log months are dropped: " + r.logm);
  assert.ok(!r.foods.includes("f1"), "a food that is not an object is dropped");
  assert.deepEqual(app.errors, []);
});

test("restoring settings merges per field: a file with only some settings keeps the rest; the MapTiler key survives a backup without keys", async () => {
  const page = await start();
  const r = await page.evaluate(async () => {
    S.settings.mapKey = "MAP-KEY"; S.settings.intervals = { ...(S.settings.intervals || {}), key: "ICU-KEY", aid: "0" };
    restoreOpen({ app: "Engine", version: 3, settings: { weight: 71 } }, "file"); UI.sheet.parts = { settings: true }; await ACT["rs-go"]();
    return { w: S.settings.weight, dob: S.settings.fit.profile.dob, on: S.settings.onboarded, map: S.settings.mapKey, icu: S.settings.intervals?.key };
  });
  assert.equal(r.w, 71); assert.equal(r.dob, "1990-06-15"); assert.equal(r.on, true); assert.equal(r.map, "MAP-KEY"); assert.equal(r.icu, "ICU-KEY");
});

test("a backup from a newer version of Engine is refused with a clear message", async () => {
  const page = await start();
  const r = await page.evaluate(() => { const before = JSON.stringify(S.settings); restoreOpen({ app: "Engine", version: 99, settings: { weight: 1 } }, "file"); return { sheet: UI.sheet?.type || null, toast: document.querySelector("#toast").innerText, same: before === JSON.stringify(S.settings) }; });
  assert.equal(r.sheet, null); assert.match(r.toast, /newer version/i); assert.equal(r.same, true);
});

test("«Only add what's missing» brings back weigh-ins, measurements and races by date or id and changes nothing that is here", async () => {
  const page = await start();
  const r = await page.evaluate(async () => {
    S.body.w = { "2026-01-01": 80 }; S.body.m = { "2026-01-01": { waist: 90 } }; S.train.races = [{ id: "r1", name: "Mine", date: "2026-05-01" }]; S.train.goals = [];
    restoreOpen({ app: "Engine", version: 3, body: { w: { "2026-01-01": 99, "2026-01-02": 81 }, m: { "2026-01-01": { waist: 1 }, "2026-01-02": { waist: 89 } } }, train: { races: [{ id: "r1", name: "Theirs", date: "2026-05-01" }, { id: "r2", name: "Added", date: "2026-06-01" }], goals: [{ id: "g1", name: "G" }] } }, "file");
    UI.sheet.mode = "merge"; UI.sheet.parts = { body: true, train: true }; await ACT["rs-go"]();
    return { w: S.body.w, m: Object.keys(S.body.m).sort(), waist: S.body.m["2026-01-01"].waist, races: S.train.races.map(x => x.id + ":" + x.name), goals: S.train.goals.map(g => g.id) };
  });
  assert.deepEqual(r.w, { "2026-01-01": 80, "2026-01-02": 81 }); assert.deepEqual(r.m, ["2026-01-01", "2026-01-02"]); assert.equal(r.waist, 90);
  assert.deepEqual(r.races, ["r1:Mine", "r2:Added"]); assert.deepEqual(r.goals, ["g1"]);
  const again = await page.evaluate(async () => { restoreOpen({ app: "Engine", version: 3, train: { races: [{ id: "r1" }, { id: "r2" }] } }, "file"); UI.sheet.mode = "merge"; UI.sheet.parts = { train: true }; await ACT["rs-go"](); return S.train.races.length; });
  assert.equal(again, 2, "merging twice adds nothing twice");
});

test("the restore sheet says what Replace really does", async () => {
  const page = await start();
  const t = await page.evaluate(() => { restoreOpen({ app: "Engine", version: 3, settings: {}, foods: {} }, "file"); return document.querySelector(".sheet").innerText; });
  assert.doesNotMatch(t, /What you pick replaces what's here/);
  assert.match(t, /stay/i);
});

test("the old Fuel export handler is gone: one ACT.export, the backup save", () => {
  const src = fs.readFileSync(path.join(__dirname, "..", "source", "engine.html"), "utf8");
  assert.equal((src.match(/ACT\.export\s*=/g) || []).length, 1);
  assert.doesNotMatch(src, /fuel-backup-/);
});
