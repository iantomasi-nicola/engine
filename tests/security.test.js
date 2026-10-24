/* M6 / ENG-06: hostile text must stay text on every screen (foods and recipes from outside, imported workouts, AI replies, notes), keys stay out of backups,
   the stored data has no secrets of other kinds. Synthetic data only. */
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("fs"), path = require("path"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let app;
test.afterEach(async () => { await app?.close(); app = null; });
const start = async (viewport = H.VIEWPORTS.desktop) => { app = await H.startApp({ dir: H.build(H.tmp("sec-build")), seed: F.seed({ withPantry: true }), viewport }); return app.page; };

/* three ways a string can break out of HTML: a tag with an event handler, a script tag, and a quote that closes an attribute */
const PAY = `"><img src=x onerror="window.__xss=(window.__xss||0)+1"><script>window.__xss=(window.__xss||0)+1</script><b x="`;
const PLANT = () => `(() => { window.__xss = 0; const P = ${JSON.stringify(PAY)}, t = todayISO(), y = addDays(t, -1);
  S.foods["x-food"] = { id: "x-food", name: P, brand: P, unit: "g", per: { kcal: 100, p: 5, c: 10, f: 2, fib: 1 }, servings: [{ l: P, g: 50 }], pack: 500, cat: "pantry", role: "C", meals: ["lunch"], source: "custom", note: P };
  S.recipes["x-rec"] = { id: "x-rec", name: P, servings: 2, meals: ["lunch"], source: "custom", note: P, steps: [P], ingredients: [{ food: "x-food", g: 100 }] };
  S.days[t] = { date: t, dish: { lunch: P }, meals: { lunch: [{ id: "i1", kind: "food", ref: "x-food", qty: 100, eaten: true }, { id: "i2", kind: "recipe", ref: "x-rec", qty: 1, eaten: false }, { id: "i3", kind: "quick", name: P, m: { kcal: 100, p: 1, c: 1, f: 1 } }] } };
  S.shop.pantry["x-food"] = { g: 300 }; S.shop.extras = [{ id: "e1", text: P, done: false }]; S.shop.xhist = { x: { n: P, eur: 1, cnt: 1, last: t } }; S.shop.buys = [{ d: t, n: P, eur: 3, x: 1 }, { d: t, id: "x-food", n: P, g: 100, eur: 2 }];
  S.settings.supps = [{ id: "s1", name: P, dose: P, times: ["08:00"] }]; S.settings.meals[0].name = P; S.settings.fit.sports[0].name = P;
  S.queue = { q1: { status: "pending", barcode: P, food: "x-food" } };
  S.train.races = [{ id: "r1", name: P, date: addDays(t, 30), sport: "Running", km: 10, pri: "A", goal: P, notes: P }];
  S.train.tests = [{ id: "t1", date: y, kind: "Race", km: 10, sec: 3000, note: P }];
  mutateLog(y, x => { x.notes = P; x.workouts = [{ sport: "Running", min: 30, km: 5, note: P, devn: P }]; x.planned = [{ sport: "Running", min: 30, note: P, script: P }]; x.supp = {}; });
  mutateLog(t, x => { x.workouts = [{ sport: "Running", min: 30, km: 5, note: P }]; x.notes = P; });
  jrSet(t, "m", 3); jrNote(t, P); jrNote(y, P); DATA_V++; })()`;
const TABS = [["today"], ["plan"], ["foods"], ["shop"], ["pantry"], ["train", { trainSeg: "cal" }], ["train", { trainSeg: "wk" }], ["train", { trainSeg: "season" }], ["train", { trainSeg: "perf", perfSeg: "running" }], ["train", { trainSeg: "perf", perfSeg: "records" }],
  ["progress", { progSeg: "overview" }], ["progress", { progSeg: "body" }], ["progress", { progSeg: "food", foodSeg: "intake" }], ["progress", { progSeg: "food", foodSeg: "habits" }], ["progress", { progSeg: "reports", repSeg: "week" }], ["progress", { progSeg: "reports", repSeg: "hist", histSeg: "days" }], ["progress", { progSeg: "journal", jrRange: "month" }], ["settings"]];
const SHEETS_TO_OPEN = [["checkin", { date: "T", live: true }], ["journal", { date: "T", live: true }], ["checkin", { date: "Y", live: true }], ["journal", { date: "Y", live: true }], ["pantry", { food: "x-food", g: 300, exp: "", u: "base" }],
  ["food", { draft: "FOOD", isNew: false }], ["shopq", { live: true }], ["qty", { kind: "food", ref: "x-food", qty: 100, date: "T", meal: "lunch", origMeal: "lunch" }], ["qty", { kind: "recipe", ref: "x-rec", qty: 1, date: "T", meal: "lunch", origMeal: "lunch" }]];

test("hostile text in foods, recipes, plan, list, pantry, training, notes and the Journal never becomes markup on any screen (phone and desktop)", async () => {
  for (const vp of [H.VIEWPORTS.phone, H.VIEWPORTS.desktop]) {
    const page = await start(vp); await page.evaluate(PLANT());
    const base = await page.evaluate(() => document.querySelectorAll("script:not([src])").length);
    const control = await page.evaluate(async P => { const d = document.createElement("div"); d.innerHTML = P; document.body.appendChild(d); await new Promise(r => setTimeout(r, 50)); const seen = document.querySelectorAll("[onerror]").length > 0; d.remove(); window.__xss = 0; return seen; }, PAY);
    assert.equal(control, true, "the detector sees a real injection (positive control)");
    const bad = await page.evaluate(async ([tabs, sheets, base]) => {
      const out = [], look = where => { const n = document.querySelectorAll("[onerror],[onload],[onclick],[onfocus],script:not([src])").length - base, img = [...document.querySelectorAll('img[src="x"]')].length; if (window.__xss || n > 0 || img) out.push([where, window.__xss, n, img]); };
      const t = todayISO(), y = addDays(t, -1);
      for (const [tab, extra] of tabs) { Object.assign(UI, { tab, date: t }, extra || {}); render(); await new Promise(r => setTimeout(r, 30)); look("tab " + tab + " " + JSON.stringify(extra || {})); }
      for (const [type, p] of sheets) { const q = JSON.parse(JSON.stringify(p).replace('"T"', JSON.stringify(t)).replace('"Y"', JSON.stringify(y)).replace('"date":"T"', `"date":"${t}"`)); if (q.date === "T") q.date = t; if (q.date === "Y") q.date = y; if (q.draft === "FOOD") q.draft = clone(S.foods["x-food"]);
        UI.tab = "today"; openSheet(type, q); await new Promise(r => setTimeout(r, 30)); look("sheet " + type); closeSheet(); }
      return out;
    }, [TABS, SHEETS_TO_OPEN, base]);
    assert.deepEqual(bad, [], `${vp.width}px: ${JSON.stringify(bad)}`);
    await app.close(); app = null;
  }
});

test("an AI reply that contains markup is shown as text (nutrition coach and Journal summary)", async () => {
  const page = await start();
  await page.evaluate(PLANT());
  const r = await page.evaluate(async () => {
    Sync.sample = async () => ({ text: window.__P || `"><img src=x onerror="window.__xss=1">` }); S.settings.jr = { ai: true }; for (let i = 0; i < 4; i++) jrSet(addDays(todayISO(), -i), "m", 1 + i);
    UI.tab = "progress"; UI.progSeg = "journal"; UI.jrRange = "month"; render(); await ACT["jr-ai"](); await new Promise(r => setTimeout(r, 60));
    return { xss: window.__xss, imgs: document.querySelectorAll('img[src="x"]').length, shown: /Generated by AI/.test(document.body.innerText) };
  });
  assert.deepEqual(r, { xss: 0, imgs: 0, shown: true });
});

test("a backup file has no keys unless you ask for them, and what it holds is the user's own data only", async () => {
  const page = await start();
  const r = await page.evaluate(() => { S.settings.intervals = { key: "SECRET-ICU", aid: "0" }; S.settings.mapKey = "SECRET-MAP"; S.settings.ai = { services: [{ id: "a", name: "x", key: "SECRET-AI" }], key: "SECRET-OLD" };
    const plain = JSON.stringify(backupData()), withKeys = JSON.stringify(backupData({ keys: true })); return { plain: /SECRET/.test(plain), withKeys: ["SECRET-ICU", "SECRET-MAP", "SECRET-AI"].every(k => withKeys.includes(k)), json: /SECRET/.test(JSON.stringify(backupData(BKP()))) }; });
  assert.deepEqual(r, { plain: false, withKeys: true, json: false });
});

test("the page's content policy forbids plugins, foreign bases and foreign forms, and scripts come only from this site and the few listed libraries", async () => {
  const html = fs.readFileSync(path.join(H.ROOT, "source", "engine.html"), "utf8"), csp = (html.match(/Content-Security-Policy" content="([^"]*)"/) || [])[1] || "";
  for (const d of ["default-src 'self'", "object-src 'none'", "base-uri 'self'", "form-action 'self'"]) assert.ok(csp.includes(d), "missing " + d);
  const scripts = (csp.match(/script-src ([^;]*)/) || [])[1] || ""; assert.ok(!/\*|http:|data:/.test(scripts), scripts);
  assert.deepEqual(scripts.split(/\s+/).filter(x => /^https:/.test(x)).sort(), ["https://cdnjs.cloudflare.com"]);
});

test("every script loaded from another site is pinned to an exact version", async () => {
  const html = fs.readFileSync(path.join(H.ROOT, "source", "engine.html"), "utf8");
  const urls = [...html.matchAll(/https:\/\/(?:cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net)[^"'`\s)]*\.js/g)].map(m => m[0]);
  assert.ok(urls.length >= 2);
  for (const u of urls) assert.ok(/\/\d+\.\d+\.\d+[/.]|@\d+\.\d+\.\d+\//.test(u), "not pinned: " + u);
});

test("the database policies let a person read and write only their own rows (schema and push tables)", async () => {
  const sql = fs.readFileSync(path.join(H.ROOT, "supabase", "schema.sql"), "utf8") + fs.readFileSync(path.join(H.ROOT, "supabase", "push.sql"), "utf8");
  for (const t of ["engine_docs", "push_subs", "push_queue"]) assert.match(sql, new RegExp(`alter table public\\.${t} enable row level security`));
  const policies = [...sql.matchAll(/create policy[\s\S]*?;/g)].map(m => m[0]).filter(p => /public\.(engine_docs|push_subs|push_queue)/.test(p));
  assert.ok(policies.length >= 6);
  for (const p of policies) { assert.match(p, /auth\.uid\(\) = user_id/, p); assert.doesNotMatch(p, /\bto (anon|public)\b/, p); }
  const storage = [...sql.matchAll(/create policy[\s\S]*?;/g)].map(m => m[0]).filter(p => /storage\.objects/.test(p)); assert.ok(storage.length >= 4);
  for (const p of storage) assert.match(p, /storage\.foldername\(name\)\)\[1\] = auth\.uid\(\)::text/, p);
});

test("the push sender refuses anyone without the secret, and no secret key is in the app files", async () => {
  const fn = fs.readFileSync(path.join(H.ROOT, "supabase", "functions", "engine-push", "index.ts"), "utf8");
  assert.match(fn, /secret\.length < 16/); assert.match(fn, /status: 403/);
  for (const f of ["source/engine.html", "source/web/config.js", "source/web/icu-direct.js", "source/web/after.js", "source/web/shim.js"]) assert.doesNotMatch(fs.readFileSync(path.join(H.ROOT, f), "utf8"), /service_role|sb_secret_|PRIVATE KEY/, f);
});
