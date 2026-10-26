/* M16 / L195: the body weight that reaches intervals.icu (from the scale through Zepp) is read into the check-in of days that have none.
   Fills empty days only: a weight typed in Engine is never overwritten. No real network: fetch is a stub; synthetic data only. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let app;
test.afterEach(async () => { await app?.close(); app = null; });
const start = async () => { app = await H.startApp({ dir: H.build(H.tmp("m16w-build")), seed: F.seed({ withPlan: false }) }); return app.page; };
const SETUP = (remote = {}, link = {}) => `(() => { window.__calls = []; const R = ${JSON.stringify(remote)};
  window.fetch = async (u, o = {}) => { const m = (o.method || "GET").toUpperCase(), p = String(u).replace("https://intervals.icu/api/v1", ""); __calls.push([m, p, o.body ? JSON.parse(o.body) : null]);
    let body = []; if (m === "GET") { if (/\\/wellness\\?/.test(p)) body = R.wellness || []; else if (/\\/(activities|events)\\?/.test(p)) body = []; else body = {}; } else body = { id: 9000 + __calls.length };
    return { ok: true, status: 200, text: async () => JSON.stringify(body) }; };
  S.settings.intervals = { key: "TEST", aid: "0", bridge: { since: addDays(todayISO(), -30), last: new Date().toISOString() }, ...${JSON.stringify(link)} }; })()`;

test("weight from intervals.icu fills the days with none, never overwrites a typed one, ignores nonsense, and can be switched off", async () => {
  const page = await start();
  const run = (remote, link) => page.evaluate(async ([s]) => { eval(s); const t = todayISO(), d1 = addDays(t, -1), d2 = addDays(t, -2), d3 = addDays(t, -3);
    mutateLog(d2, x => { x.weight = 80; });
    await icuSyncDirect(); return [d1, d2, d3].map(d => S.logm[d.slice(0, 7)]?.days?.[d]?.weight ?? null); }, [SETUP(remote, link)]);
  const days = await page.evaluate(() => [addDays(todayISO(), -1), addDays(todayISO(), -2), addDays(todayISO(), -3)]);
  const remote = { wellness: [{ id: days[0], weight: 81.44 }, { id: days[1], weight: 82.9 }, { id: days[2], weight: 5 }] };
  assert.deepEqual(await run(remote, {}), [81.4, 80, null], "filled / kept / implausible ignored");
  const off = await page.evaluate(async ([s, d]) => { eval(s); S.settings.intervals.pullWeight = false; mutateLog(d, x => { delete x.weight; }); await icuSyncDirect(); return S.logm[d.slice(0, 7)]?.days?.[d]?.weight ?? null; }, [SETUP(remote, { pullWeight: false }), days[0]]);
  assert.equal(off, null, "switched off: nothing is read");
  assert.deepEqual(app.errors, []);
});
