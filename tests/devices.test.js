/* M7a (approved audit): which heart-rate sensor (wrist watch or armband) each workout used, with a default per sport;
   a notice when the profile is incomplete; where the NEAT figure comes from. None of this changes a number. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let app;
test.afterEach(async () => { await app?.close(); app = null; });
const start = async (seed = F.seed({ withPlan: false }), vp) => { app = await H.startApp({ dir: H.build(H.tmp("dev-build")), seed, viewport: vp }); return app.page; };

test("two sensors out of the box; running defaults to the armband, calisthenics to the watch; a workout's own choice wins", async () => {
  const page = await start();
  const r = await page.evaluate(() => ({ devices: FIT().devices.map(d => [d.id, d.kind, d.kcal]), run: devOf({ sport: "Running" }), cal: devOf({ sport: "Calisthenics" }), other: devOf({ sport: "Cycling" }), own: devOf({ sport: "Running", dev: "zepp" }), stale: devOf({ sport: "Running", dev: "gone" }) }));
  assert.deepEqual(r.devices, [["zepp", "wrist", "gross"], ["polar", "strap", "gross"]]);
  assert.deepEqual([r.run, r.cal, r.other, r.own, r.stale], ["polar", "zepp", null, "zepp", "polar"]);
});

test("the session editor offers the sensors with the sport's default pressed; the choice is saved with the workout", async () => {
  const page = await start();
  const r = await page.evaluate(() => {
    const t = todayISO(); openSheet("session", { list: "workouts", date: t, idx: null, draft: { sport: "Running", min: 40, km: 6, int: "Moderate" } });
    const html = SHEETS.session(S_()).body, pressed = [...html.matchAll(/data-act="ss-dev" data-id="(\w+)" aria-pressed="(true|false)"/g)].map(m => m.slice(1));
    ACT["ss-dev"]({ dataset: { id: "zepp" } }); const afterTap = devOf(S_().draft);
    ACT["ss-save"](); const w = logGet(t).workouts[0];
    return { pressed, afterTap, saved: w.dev, sport: w.sport };
  });
  assert.deepEqual(r.pressed, [["zepp", "false"], ["polar", "true"]]); assert.equal(r.afterTap, "zepp"); assert.equal(r.saved, "zepp");
});

test("a planned session can carry it too, and a rest day offers no sensor", async () => {
  const page = await start();
  const r = await page.evaluate(() => { openSheet("session", { list: "planned", date: addDays(todayISO(), 1), idx: null, draft: { sport: "Rest" } }); return { rest: /ss-dev/.test(SHEETS.session(S_()).body) }; });
  assert.equal(r.rest, false);
  const g = await page.evaluate(() => { openSheet("session", { list: "planned", date: addDays(todayISO(), 1), idx: null, draft: { sport: "Calisthenics", min: 30, int: "Moderate" } }); return /ss-dev/.test(SHEETS.session(S_()).body); });
  assert.equal(g, true);
});

test("settings: rename a sensor, say what its calories mean, change a sport's default, add and remove (with undo); it survives a reload", async () => {
  const page = await start();
  await page.evaluate(() => { CHG["dev-name"]("Amazfit GTR", { dataset: { id: "zepp" } }); CHG["dev-kcal"]("net", { dataset: { id: "zepp" } }); CHG["dev-sport"]("zepp", { dataset: { sport: "Running" } }); ACT["dev-add"](); });
  await app.reload();
  const r = await page.evaluate(() => ({ name: devById("zepp").name, kcal: devById("zepp").kcal, run: devOf({ sport: "Running" }), n: devList().length, html: devSettings() }));
  assert.deepEqual([r.name, r.kcal, r.run, r.n], ["Amazfit GTR", "net", "zepp", 3]);
  assert.match(r.html, /Default for each sport/); assert.match(r.html, /Heart-rate sensors/);
  const d = await page.evaluate(() => { const id = devList()[2].id; ACT["dev-del"]({ dataset: { id } }); return devList().length; });
  assert.equal(d, 2);
});

test("choosing sensors changes no energy number", async () => {
  const page = await start();
  const r = await page.evaluate(() => {
    const t = todayISO(); mutateLog(t, d => { d.workouts = [{ sport: "Running", min: 40, km: 6, hr: 150, int: "Moderate" }]; }); DATA_V++;
    const pick = () => { const x = energyAt(t); return [x.bmr, x.neat, x.eat, x.tef, x.tdee, x.target].map(v => Math.round(v * 1000) / 1000); };
    const before = pick();
    CHG["dev-sport"]("zepp", { dataset: { sport: "Running" } }); mutateLog(t, d => { d.workouts[0].dev = "polar"; }); DATA_V++;
    return { before, after: pick() };
  });
  assert.deepEqual(r.after, r.before);
});

test("the profile notice appears when the date of birth is missing and disappears when it is set; the number is unchanged", async () => {
  const page = await start();
  const r = await page.evaluate(() => {
    FIT().profile.dob = ""; DATA_V++; const noDob = { note: /provisional/.test(profileNote()), view: /provisional/.test(energyView()), bmr: energyAt(todayISO()).bmr, age: ageAt(todayISO()) };
    FIT().profile.dob = addDays(todayISO(), -Math.round(30 * 365.25) - 5); DATA_V++; return { noDob, withDob: { note: profileNote(), age: ageAt(todayISO()) } };
  });
  assert.equal(r.noDob.note, true); assert.equal(r.noDob.view, true); assert.equal(r.noDob.age, 30);
  assert.equal(r.withDob.note, ""); assert.equal(r.withDob.age, 30);
});

test("the NEAT source is named: default, average of the last days, or your watch", async () => {
  const page = await start();
  const r = await page.evaluate(() => {
    const t = todayISO(), out = {}; S.logm = {};
    FIT().trackStart = addDays(t, -5); DATA_V++; out.first = energyAt(addDays(t, -5)).neatSrc; out.second = energyAt(addDays(t, -4)).neatSrc;
    const m = addDays(t, -2).slice(0, 7); S.logm[m] = S.logm[m] || { days: {} }; S.logm[m].days[addDays(t, -2)] = { watch: 900, weight: 80 }; DATA_V++; out.watch = energyAt(addDays(t, -2)).neatSrc;
    return out;
  });
  assert.deepEqual(r, { first: "default", second: "avg", watch: "watch" });
});

test("the sensor settings and the editor chips fit a phone", async () => {
  const page = await start(F.seed({ withPlan: false }), H.VIEWPORTS.phone);
  const r = await page.evaluate(async () => { UI.setOpen = { live: true }; UI.tab = "settings"; scheduleRender(); await new Promise(r => setTimeout(r, 500)); return { sw: document.documentElement.scrollWidth, iw: innerWidth, has: !!document.querySelector("[data-chg=dev-sport]") }; });
  assert.ok(r.sw <= r.iw && r.has, JSON.stringify(r));
  await page.screenshot({ path: require("path").join(process.env.ENGINE_SHOTS || require("os").tmpdir(), "devices-phone.png") });
});
