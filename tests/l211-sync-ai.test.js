/* L211 section A, defects 7 and 8 (docs/review/AUDIT_2026-10-26.md): the AI services and their keys across openings and devices (S-1: keys never leave the device).
   Synthetic keys only. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic"), FS = require("./lib/fake-supabase");
let dir, browser; const devs = [];
test.before(async () => { dir = H.build(H.tmp("l211-ai")); browser = await H.loadPlaywright().chromium.launch(); });
test.after(async () => { await browser?.close(); });
test.afterEach(async () => { for (const d of devs.splice(0)) await d.close(); });
const dev = async (srv, name, o = {}) => { const d = await FS.device(srv, name, { dir, browser, ...o }); devs.push(d); return d; };
const wait = ms => new Promise(r => setTimeout(r, ms));
const reload = async d => { await d.page.reload(); await d.page.waitForFunction(() => typeof S !== "undefined" && Sync.ready); await d.settle(); await wait(1200); };
const keys = p => p.evaluate(() => ENGINE.aiServices().map(x => x.id + ":" + x.key));

/* A7. A device copy of an older version holds ONE key (settings.ai = { key, provider }). It becomes service s1 once, and is still there on the second and third opening. */
test("A7 an old single AI key survives the second and third opening (local device)", async () => {
  const seed = F.seed({ withPlan: false }); seed.settings.ai = { key: "SYNTH-OLDAI", provider: "gemini" };
  const app = await H.startApp({ dir, seed }); devs.push(app);
  assert.deepEqual(await keys(app.page), ["s1:SYNTH-OLDAI"]);
  await app.reload(); assert.deepEqual(await keys(app.page), ["s1:SYNTH-OLDAI"], "lost at the second opening");
  await app.reload(); assert.deepEqual(await keys(app.page), ["s1:SYNTH-OLDAI"], "lost at the third opening");
  assert.equal(await app.page.evaluate(() => { saveLocal(); return /SYNTH/.test(localStorage.getItem("fuelplanner.v1")); }), false, "the key must stay out of the device copy");
});

test("A7 an old single AI key (device copy and account copy) survives the second opening with an account", async () => {
  const srv = FS.server(), seed = F.seed({ withPlan: false });
  seed.settings = { ...seed.settings, ai: { key: "SYNTH-OLDAI", provider: "gemini" } };
  srv.set("u1", "settings", seed.settings);
  const A = await dev(srv, "A", { seed, local: { "engine.snap.u1": JSON.stringify([["settings", seed.settings]]) } }); await A.settle(); await wait(1500);
  assert.deepEqual(await keys(A.page), ["s1:SYNTH-OLDAI"]);
  await reload(A); assert.deepEqual(await keys(A.page), ["s1:SYNTH-OLDAI"], "lost at the second opening");
  await reload(A); assert.deepEqual(await keys(A.page), ["s1:SYNTH-OLDAI"], "lost at the third opening");
  assert.doesNotMatch(JSON.stringify([...srv.rows("u1")]), /SYNTH/, "the key reached the account");
});

/* A8. Device A has a service with its key; device B sees the service (the list is synced) but not the key.
   B must say so, "Remove" on B hides it on B only, and a Verify result on A is not shown as a failure on B. */
test("A8 a service whose key is on another device: shown as such, Remove on B leaves A's service, check is per device", async () => {
  const srv = FS.server(), seed = F.seed({ withPlan: false }); seed.settings.ai = { services: [{ id: "s1", provider: "gemini", key: "SYNTH-AI", on: true, check: { ok: true, msg: "Works", at: new Date().toISOString() } }] };
  const A = await dev(srv, "A", { seed }); await A.settle(); await wait(800);
  const B = await dev(srv, "B"); await B.settle(); await wait(500);
  /* the account holds the service without key and without the check result */
  const acct = srv.get("u1", "settings").ai.services[0]; assert.equal(acct.key, undefined); assert.equal(acct.check, undefined, "the check result is per device, not in the account");
  /* B sees it, without a key: not usable, and the settings say where the key is */
  assert.deepEqual(await B.page.evaluate(() => ENGINE.aiServices().length), 0);
  const html = await B.page.evaluate(() => { UI.tab = "settings"; UI.setOpen = { ai: true }; UI.setSel = "ai"; render(); return document.querySelector("#main").textContent; });
  assert.match(html, /key on another device/i);
  /* Remove on B hides it on B only */
  await B.page.evaluate(() => { ACT["ai-del"]({ dataset: { id: "s1" } }); UI.sheet.run(); }); await B.settle(); await wait(800);
  assert.equal(srv.get("u1", "settings").ai.services.length, 1, "Remove on B deleted the service from the account");
  assert.deepEqual(await keys(A.page), ["s1:SYNTH-AI"]);
  assert.equal(await A.page.evaluate(() => S.settings.ai.services[0].check?.ok ?? null), true, "A lost its own check result");
  const after = await B.page.evaluate(() => { UI.tab = "settings"; UI.setOpen = { ai: true }; UI.setSel = "ai"; render(); return document.querySelector("#main").textContent; });
  assert.doesNotMatch(after, /key on another device/i, "the hidden service is still listed on B");
  /* ... and stays hidden on B after a reload */
  await reload(B);
  assert.doesNotMatch(await B.page.evaluate(() => { UI.tab = "settings"; UI.setOpen = { ai: true }; UI.setSel = "ai"; render(); return document.querySelector("#main").textContent; }), /key on another device/i);
  /* Remove on A (it has the key) removes the service for everybody */
  await A.page.evaluate(() => { ACT["ai-del"]({ dataset: { id: "s1" } }); UI.sheet.run(); }); await A.settle(); await wait(800);
  assert.equal(srv.get("u1", "settings").ai.services.length, 0);
});
