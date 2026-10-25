/* M7b-2d F-02/D9: the "provisional" notice also names sex, height and starting weight when the user never set them.
   A field counts as set when it is in profile.set (filled by Settings › Profile and the setup), when it differs from the default,
   or (height and weight) when a weight has been logged. No energy number changes. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let app;
test.afterEach(async () => { await app?.close(); app = null; });
const start = async () => { app = await H.startApp({ dir: H.build(H.tmp("m7b-data")), seed: F.seed({ withPlan: false }) }); return app.page; };

test("D9: an untouched profile with no weight names sex, height and starting weight; nothing else changes", async () => {
  const page = await start();
  const r = await page.evaluate(() => {
    S.body.w = {}; S.logm = {}; Object.assign(FIT().profile, { sex: "Male", height: 175, startWeight: 75, dob: "" }); delete FIT().profile.set; DATA_V++;
    const bmr = energyAt(todayISO()).bmr;
    return { gaps: profileGaps(), note: profileNote(), bmr, nan: Number.isNaN(bmr) };
  });
  // hand-computed: four fields missing in this order
  assert.deepEqual(r.gaps, ["date of birth (age 30 is assumed)", "sex (Male is assumed)", "height (175 cm is assumed)", "starting weight (75 kg is assumed)"]);
  assert.match(r.note, /provisional/); assert.equal(r.nan, false);
});

test("D9: confirming a field in Settings removes only that field; a non-default value counts as set", async () => {
  const page = await start();
  const r = await page.evaluate(() => {
    S.body.w = {}; S.logm = {}; Object.assign(FIT().profile, { sex: "Male", height: 175, startWeight: 75, dob: "1990-01-01" }); delete FIT().profile.set; DATA_V++;
    const out = {}; const el = (path, value) => ({ dataset: { fit: path, t: path === "profile.sex" ? "text" : "num" }, value });
    fitChange(el("profile.height", "175")); out.h = profileGaps();
    fitChange(el("profile.sex", "Male")); out.hs = profileGaps();
    FIT().profile.startWeight = 82; out.w = profileGaps();
    fitChange(el("profile.name", "Ann")); out.name = FIT().profile.set;
    return out;
  });
  assert.deepEqual(r.h, ["sex (Male is assumed)", "starting weight (75 kg is assumed)"]);
  assert.deepEqual(r.hs, ["starting weight (75 kg is assumed)"]);
  assert.deepEqual(r.w, []);
  assert.deepEqual(r.name, ["height", "sex"]);
});

test("D9: a profile with a logged weight counts height and weight as set; a complete profile shows no notice", async () => {
  const page = await start();
  const r = await page.evaluate(() => {
    Object.assign(FIT().profile, { sex: "Male", height: 175, startWeight: 75, dob: "1990-01-01" }); delete FIT().profile.set; S.body.w = { [todayISO()]: 80 }; DATA_V++;
    const withWeight = profileGaps();
    S.body.w = {}; S.logm = {}; FIT().profile.set = ["sex", "height", "startWeight"]; DATA_V++;
    return { withWeight, complete: profileNote() };
  });
  assert.deepEqual(r.withWeight, ["sex (Male is assumed)"]);
  assert.equal(r.complete, "");
});

test("D9: finishing the setup confirms the starting weight", async () => {
  const page = await start();
  const r = await page.evaluate(() => {
    delete FIT().profile.set; startOnboard(); S_().w = 70; S_().meals = ["breakfast"]; ACT["ob-done"](); return FIT().profile.set;
  });
  assert.deepEqual(r, ["startWeight"]);
});
