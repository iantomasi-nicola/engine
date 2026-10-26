const test = require("node:test"), assert = require("node:assert/strict");
const R = "/home/user/engine/tests/";
const H = require(R + "lib/harness"), F = require(R + "fixtures/synthetic"), FS = require(R + "lib/fake-supabase");
let dir, browser; const devs = [];
test.before(async () => { dir = process.env.BUILT; browser = await H.loadPlaywright().chromium.launch(); });
test.after(async () => { await browser?.close(); });
test.afterEach(async () => { for (const d of devs.splice(0)) await d.close(); });
const dev = async (srv, name, o = {}) => { const d = await FS.device(srv, name, { dir, browser, ...o }); devs.push(d); return d; };
const wait = ms => new Promise(r => setTimeout(r, ms));
for (const touch of [false, true]) test("T9b old single AI key, touch=" + touch, async () => {
  const srv = FS.server(), seed = F.seed({ withPlan: false });
  seed.settings = { ...seed.settings, ai: { key: "SYNTH-OLDAI", provider: "gemini" } };
  srv.set("u1", "settings", seed.settings);
  const local = { "engine.snap.u1": JSON.stringify([["settings", seed.settings]]) };
  const A = await dev(srv, "A", { seed, local }); await A.settle(); await wait(2000);
  const dump = () => A.page.evaluate(() => ({ ai: JSON.stringify(S.settings.ai), store: localStorage.getItem("engine.keys"), any: ENGINE.anyAI() }));
  console.log("s1", JSON.stringify(await dump()));
  if (touch) { await A.page.evaluate(() => { ENGINE.aiServices(); S.settings.goal = S.settings.goal; saveSettings(); }); await A.settle(); await wait(1500); console.log("s1b", JSON.stringify(await dump()), JSON.stringify(srv.get("u1", "settings").ai)); }
  await A.page.reload(); await A.page.waitForFunction(() => typeof S !== "undefined" && Sync.ready); await A.settle(); await wait(1500);
  console.log("s2", JSON.stringify(await dump()));
});
