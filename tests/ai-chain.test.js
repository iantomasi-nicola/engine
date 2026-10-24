/* The AI is whatever the user set up in Settings, in that order; a service that fails, refuses its key or answers with something that is not what was asked passes the question to the next one.
   Independent of any host app. Network is a stub; synthetic data only. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let app;
test.afterEach(async () => { await app?.close(); app = null; });
const start = async () => { app = await H.startApp({ dir: H.build(H.tmp("aichain-build")), seed: F.seed() }); return app.page; };
const SETUP = `(() => { window.__hosts = []; window.__mode = {};
  const reply = c => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: c } }] }), text: async () => "" });
  window.fetch = async (u, o = {}) => { u = String(u); const host = u.replace("https://", "").split("/")[0]; if (/\\/models/.test(u)) return { ok: false, status: 500, json: async () => ({}), text: async () => "" };
    __hosts.push(host); const m = __mode[host] || "ok";
    if (m === "401") return { ok: false, status: 401, json: async () => ({ error: { message: "Incorrect API key" } }), text: async () => "" };
    if (m === "429") return { ok: false, status: 429, json: async () => ({ error: { message: "quota" } }), text: async () => "" };
    if (m === "prose") return reply("Sorry, I can't help with that."); if (m === "empty") return reply("");
    return reply('{"from":"' + host + '"}'); };
  S.settings.ai = { services: [{ id: "a", provider: "groq", key: "k1", model: "m1", on: true }, { id: "b", provider: "mistral", key: "k2", model: "m2", on: true }, { id: "c", provider: "cerebras", key: "k3", model: "m3", on: true }] }; })()`;
const run = async (page, modes, services) => page.evaluate(async ([modes, services]) => { Object.assign(__mode, modes); if (services) S.settings.ai.services = eval(services)(S.settings.ai.services); __hosts.length = 0; let out = null, err = null; try { out = await ENGINE.sample.json("give json"); } catch (e) { err = e.message; } return { out, err, hosts: [...__hosts] }; }, [modes, services]);

test("the first service in your order answers; the others are not asked", async () => {
  const page = await start(); await page.evaluate(SETUP);
  const r = await run(page, {}); assert.deepEqual(r.out, { from: "api.groq.com" }); assert.deepEqual(r.hosts, ["api.groq.com"]);
});

test("a service that is out of quota, refuses the key, answers in prose or answers nothing passes the question to the next one, in order", async () => {
  const page = await start(); await page.evaluate(SETUP);
  for (const bad of ["429", "401", "prose", "empty"]) {
    const r = await run(page, { "api.groq.com": bad, "api.mistral.ai": "ok" }); assert.deepEqual(r.out, { from: "api.mistral.ai" }, bad); assert.equal(r.hosts[0], "api.groq.com", bad); assert.equal(r.hosts.at(-1), "api.mistral.ai", bad);
  }
  const two = await run(page, { "api.groq.com": "prose", "api.mistral.ai": "401", "api.cerebras.ai": "ok" }); assert.deepEqual(two.out, { from: "api.cerebras.ai" }); assert.deepEqual([...new Set(two.hosts)], ["api.groq.com", "api.mistral.ai", "api.cerebras.ai"]);
});

test("a service you switched off is never asked, and when every service fails the error says so", async () => {
  const page = await start(); await page.evaluate(SETUP);
  const off = await run(page, { "api.groq.com": "ok" }, "sv => sv.map(x => x.id === 'a' ? { ...x, on: false } : x)"); assert.deepEqual(off.out, { from: "api.mistral.ai" }); assert.ok(!off.hosts.includes("api.groq.com"));
  const all = await run(page, { "api.groq.com": "429", "api.mistral.ai": "prose", "api.cerebras.ai": "empty" }, "sv => sv.map(x => ({ ...x, on: true }))"); assert.equal(all.out, null); assert.ok(all.err);
  const none = await run(page, {}, "() => []"); assert.equal(none.out, null); assert.match(none.err, /AI key/);
});

test("nothing in the app names a host app as the AI: the interface says «AI», and the AI is reached only through the services of Settings", async () => {
  const fs = require("fs"), path = require("path"); const src = fs.readFileSync(path.join(H.ROOT, "source", "engine.html"), "utf8");
  const shown = src.replace(/<meta name="claude:[^>]*>/, "").match(/[^\n]*\bClaude\b[^\n]*/g) || []; assert.deepEqual(shown, [], "no user-facing «Claude» left in the source");
});
