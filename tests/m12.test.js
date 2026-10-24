/* M11b: the aisle-fix toast shows once per device, one arrow in Settings, the receipt learns what the printed text is, a smart placeholder in a meal, workouts listed like Today's. Synthetic data only. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let dir, app;
test.before(async () => { dir = H.build(H.tmp("m12-build")); });
test.afterEach(async () => { await app?.close(); app = null; });
const open = async (viewport = H.VIEWPORTS.phone, o = {}) => { app = await H.startApp({ dir, seed: F.seed(o), viewport }); return app.page; };

test("the «foods moved to the right aisle» message comes once per device: the fix runs, a marker is kept here, and a reload with stale data from the server does not move or announce again", async () => {
  const page = await open();
  const r = await page.evaluate(() => { localStorage.removeItem("engine.catfix"); put("foods", "t-x", { id: "t-x", name: "Ceci in scatola", unit: "g", per: { kcal: 120, p: 7, c: 18, f: 2 }, pack: 400, cat: "drinks", role: "P", source: "custom" }); DATA_V++;
    CATFIX_DONE = false; document.querySelector("#toast").innerHTML = ""; afterRender(); const first = document.querySelector("#toast")?.innerText || "", marker = localStorage.getItem("engine.catfix");
    put("foods", "t-x", { ...S.foods["t-x"], cat: "drinks", catV: 0 }); CATFIX_DONE = false; document.querySelector("#toast").innerHTML = ""; afterRender(); return { first, marker, again: document.querySelector("#toast")?.innerText || "", cat: S.foods["t-x"].cat }; });
  assert.match(r.first, /moved to the right aisle/); assert.equal(r.marker, "2"); assert.equal(r.again, "", "no second announcement"); assert.equal(r.cat, "drinks", "stale copy left alone on a device that already ran the fix");
});

test("Settings groups and dropdowns show a single arrow", async () => {
  const page = await open();
  const r = await page.evaluate(async () => { UI.tab = "settings"; render(); await new Promise(r => setTimeout(r, 300)); const sums = [...document.querySelectorAll("details.set-grp > summary")]; return { n: sums.length, ics: sums.filter(s => getComputedStyle(s.querySelector(":scope > .ic")).display !== "none").length, after: sums.filter(s => getComputedStyle(s, "::after").content === '""').length }; });
  assert.ok(r.n >= 3); assert.equal(r.ics, 0, "the old icon is hidden"); assert.equal(r.after, r.n, "one drawn arrow per group");
});

test("workouts in Train › Workouts are the same row as Today's: same dot, title, facts line and Start pill; programs open from the same row", async () => {
  const page = await open(H.VIEWPORTS.phone, { withPlan: false });
  const r = await page.evaluate(async () => { const t = todayISO(); WK().tpls = [{ id: "t1", name: "Day B", sport: strengthSport(), script: "Pull 4x\n- 6 Pull-up" }]; mutateLog(t, d => { d.planned = [{ sport: strengthSport(), min: 40, note: "Pulls", tpl: "t1" }]; }); DATA_V++;
    UI.tab = "today"; render(); await new Promise(r => setTimeout(r, 250)); const today = document.querySelector(".td-s"), a = today ? [...today.querySelectorAll("*")].map(e => e.className).filter(Boolean).sort().join("|") : "";
    UI.tab = "train"; UI.trainSeg = "wk"; render(); await new Promise(r => setTimeout(r, 250)); const wl = document.querySelector(".wl-card .td-s"), b = wl ? [...wl.querySelectorAll("*")].map(e => e.className).filter(Boolean).sort().join("|") : "";
    return { a, b, startBtn: !!wl?.querySelector(".td-go"), editBtn: !!wl?.querySelector(".td-edit") }; });
  assert.ok(r.a && r.b); const A = new Set(r.a.split("|")), B = new Set(r.b.split("|")); for (const c of ["td-s-m", "td-s-b", "td-s-a", "td-go", "td-edit"]) { assert.ok(A.has(c), "today " + c); assert.ok(B.has(c), "workouts " + c); }
  assert.ok(r.startBtn && r.editBtn);
});

const REC = { store: "Lidl", total: 9.5, items: [{ name: "FUSILLI 500G BIO", qty: 1, weight_g: 500, price: 1.2 }, { name: "Test rice", qty: 1, price: 2.1 }] };
const readIt = (page, rec = REC) => page.evaluate(async R => { Sync.sample = { json: async () => R }; Sync.sampleImages = true; S.shop.stores = [{ id: "st-a", name: "Lidl" }]; put("foods", "t-pasta", { id: "t-pasta", name: "Pasta fusilli", brand: "Barilla", unit: "g", per: { kcal: 350, p: 12, c: 72, f: 1.5 }, pack: 500, cat: "pantry", role: "C", source: "custom" });
  ACT["receipt-open"](); const sh = UI.sheet; sh.photos = [new Blob(["x"])]; sh.urls = []; sh.store = "st-a"; await ACT["rc-go"](); return { rows: sh.res.rows.map(r => r.name), todo: sh.res.todo.map(t => [t.name, t.cands.map(c => c.name)]) }; }, rec);

test("the receipt learns: a printed line you match to a food (or create) is remembered, and the same text matches by itself on the next receipt, with its price kept per supermarket", async () => {
  const page = await open();
  const a = await readIt(page); assert.deepEqual(a.rows, ["Test rice"]); assert.equal(a.todo.length, 1); assert.match(a.todo[0][0], /FUSILLI/);
  const b = await page.evaluate(async () => { const sh = UI.sheet; const cand = sh.res.todo[0].cands.find(c => c.id === "t-pasta"); const has = !!document.querySelector('select[data-chg="rc-match"]'); if (cand) CHG["rc-match"]("t-pasta", { dataset: { i: "0" } }); const rows = sh.res.rows.map(r => [r.name, r.g, r.eur]); ACT["rc-load"](); await new Promise(r => setTimeout(r, 200)); return { has, cand: !!cand, rows, map: S.shop.rcMap, price: S.shop.prices["t-pasta"]?.st?.["st-a"]?.eur }; });
  assert.ok(b.has && b.cand); assert.deepEqual(b.rows[1], ["Pasta fusilli", 500, 1.2]); assert.equal(Object.values(b.map)[0], "t-pasta"); assert.equal(b.price, 1.2);
  const c = await page.evaluate(async R => { Sync.sample = { json: async () => R }; ACT["receipt-open"](); const sh = UI.sheet; sh.photos = [new Blob(["x"])]; sh.urls = []; await ACT["rc-go"](); return { rows: sh.res.rows.map(r => r.name), todo: sh.res.todo.length }; }, REC);
  assert.deepEqual(c.rows.sort(), ["Pasta fusilli", "Test rice"]); assert.equal(c.todo, 0);
  const d = await page.evaluate(async () => { S.shop.rcTodo = [{ id: "z1", name: "GELATO PISTACCHIO", brand: "", qty: 1, eur: 4.2, w: 500, bw: false, sid: "st-a", d: todayISO() }]; ACT["rc-new"]({ dataset: { id: "z1" } }); const sh = UI.sheet; sh.draft.name = "Gelato pistacchio"; sh.draft.per = { kcal: 220, p: 4, c: 24, f: 12 }; ACT["fd-save"](); await new Promise(r => setTimeout(r, 200)); const id = Object.values(S.shop.rcMap).find(v => v !== "t-pasta"); return { id, price: S.shop.prices[id]?.st?.["st-a"]?.eur, left: S.shop.rcTodo.length }; });
  assert.ok(d.id && d.price === 4.2 && d.left === 0);
});

test("a smart placeholder: from a meal (menu or the Add sheet) write what it is, press Enter, it is estimated like a cheat meal, added as a «Placeholder» that reserves the calories; without an AI the usual presets stay", async () => {
  const page = await open();
  const r = await page.evaluate(async () => { Sync.sample = { json: async () => ({ name: "Pizza and a beer", kcal: 1100, protein: 38, carbs: 130, fat: 42 }) }; const t = todayISO(), A = activeMeals(), m = A[A.length - 1].id; UI.tab = "plan"; UI.date = t; render();
    const menu = typeof ACT["open-ph"] === "function"; ACT["meal-menu"]({ dataset: { meal: m } }); const inMenu = /Placeholder/.test(document.querySelector(".sheet")?.innerText || ""); closeSheet(); openSheet("add", { date: t, meal: m }); const inAdd = !!document.querySelector('[data-act="open-ph"]'); ACT["open-ph"]();
    const sh = UI.sheet, title = document.querySelector(".sheet h3")?.innerText, hasDesc = !!document.getElementById("ch-desc"), presets = !!document.querySelector('[data-act="ch-preset"]'); sh.desc = "pizza and a beer at Mario's"; const e = new KeyboardEvent("keydown", { key: "Enter", bubbles: true }); document.getElementById("ch-desc").dispatchEvent(e); await new Promise(r => setTimeout(r, 400));
    const est = [sh.draft.name, sh.draft.kcal]; ACT["ch-save"](); await new Promise(r => setTimeout(r, 300)); const it = (getDay(t).meals[m] || []).find(x => x.ph);
    return { menu, inMenu, inAdd, title, hasDesc, presets, est, it: it && [it.name, it.m.kcal, it.eaten], tag: [...document.querySelectorAll(".cheat-tag")].some(e => /placeholder/i.test(e.textContent)) }; });
  assert.ok(r.menu && r.inMenu && r.inAdd); assert.equal(r.title, "Placeholder"); assert.ok(r.hasDesc); assert.equal(r.presets, false); assert.deepEqual(r.est, ["Pizza and a beer", 1100]); assert.deepEqual(r.it, ["Pizza and a beer", 1100, false]); assert.ok(r.tag);
  const none = await page.evaluate(() => { Sync.sample = null; closeSheet(); ACT["open-ph"] = ACT["open-ph"]; openCheat({ date: todayISO(), meal: activeMeals()[0].id, ph: true }); return !!document.querySelector('[data-act="ch-preset"]'); });
  assert.equal(none, true);
});
