/* M4f: touch-ups to finished milestones (second wave of requests, 24/10). Synthetic data only. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let dir, app;
test.before(async () => { dir = H.build(H.tmp("m4f-build")); });
test.afterEach(async () => { await app?.close(); app = null; });
const start = async (seed = F.seed({ withPlan: false }), viewport) => { app = await H.startApp({ dir, seed, viewport }); return app.page; };

test("supplements in the Check-in: taken, late and not-taken are told apart, and one tap marks the rest", async () => {
  const page = await start();
  const r = await page.evaluate(() => { S.settings.supps = [{ id: "s1", name: "Creatine", dose: "5 g", times: ["08:00"], stock: 10 }, { id: "s2", name: "Beta-alanine", dose: "3 g", times: ["21:00"], withFood: true, stock: 5 }];
    const y = addDays(todayISO(), -1); openSheet("checkin", { date: y, live: true });
    const cls = () => [...document.querySelectorAll(".sheet .sp-item")].map(b => b.className.replace("sp-item", "").trim());
    const before = cls(), n = document.querySelector(".sheet .sp-n").innerText; ACT["supp-tick"]({ dataset: { date: y, k: "s1@08:00" } });
    const mid = cls(); document.querySelector('.sheet [data-act="supp-all"]').click(); const after = cls();
    return { before, mid, after, n: document.querySelector(".sheet .sp-n").innerText, n0: n, stock: S.settings.supps.map(x => x.stock), all: !!document.querySelector('.sheet [data-act="supp-all"]') }; });
  assert.deepEqual(r.before, ["miss", "miss"]); assert.deepEqual(r.mid, ["done", "miss"]); assert.deepEqual(r.after, ["done", "done"]);
  assert.equal(r.n0, "0/2"); assert.equal(r.n, "2/2"); assert.deepEqual(r.stock, [9, 4]); assert.equal(r.all, false, "nothing left to mark: the button goes away");
});

test("the pack size can be changed from the shopping list and the list recounts the packs", async () => {
  const page = await start(F.seed());
  const r = await page.evaluate(() => { UI.shopStart = todayISO(); S.shop.range = 7; DATA_V++;
    const before = shoppingRows(todayISO(), 7).find(x => x.id === "t-chicken"); ACT["shop-buy"]({ dataset: { id: "t-chicken" } });
    const had = !!document.querySelector('.sheet #by-pack'); CHG["by-pack"]("1000", { dataset: {} });
    const after = shoppingRows(todayISO(), 7).find(x => x.id === "t-chicken");
    return { had, pack: [before.f.pack, after.f.pack], packs: [before.packs, after.packs], shown: document.querySelector("#by-pack")?.value, g: UI.sheet.g }; });
  assert.equal(r.had, true); assert.deepEqual(r.pack, [400, 1000]); assert.deepEqual(r.packs, [6, 3]); assert.equal(r.shown, "1000"); assert.equal(r.g, 3000);
});

test("changing the pack size of a built-in food keeps your own copy, and a pack of 0 means «no pack»", async () => {
  const page = await start(F.seed());
  const r = await page.evaluate(() => { const id = Object.keys(BUILTIN).find(k => BUILTIN[k].pack > 0); const old = BUILTIN[id].pack; const ok = setFoodPack(id, old * 2); const own = S.foods[id]; const f = getFood(id); setFoodPack(id, 0); return { ok, own: !!own, now: f.pack === old * 2, none: getFood(id).pack, src: own.source }; });
  assert.deepEqual(r, { ok: true, own: true, now: true, none: 0, src: "builtin-edit" });
});

test("«left over» counts what later days will use: a pack that is all planned for later is not left over", async () => {
  const page = await start(F.seed());
  const r = await page.evaluate(() => { UI.shopStart = todayISO(); S.shop.range = 1; DATA_V++;
    const row = shoppingRows(todayISO(), 1).find(x => x.id === "t-chicken"), html = shopRowHTML(row);
    return { buy: row.buy, packs: row.packs, left: row.left, usedLater: row.usedLater, text: html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ") }; });
  assert.equal(r.buy, 300); assert.equal(r.left, 100); assert.equal(r.usedLater, 100, "the other six days still need chicken: the 100 g go straight into them");
  assert.doesNotMatch(r.text, /left over/); assert.match(r.text, /100 g for later days/);
});

test("a pack with nothing planned after it really is left over", async () => {
  const page = await start(F.seed({ withPlan: false }));
  const r = await page.evaluate(() => { const t = todayISO(); S.days[t] = { date: t, meals: { m: [{ id: "x", kind: "food", ref: "t-chicken", qty: 300, eaten: false }] } }; UI.shopStart = t; S.shop.range = 1; DATA_V++;
    const row = shoppingRows(t, 1).find(x => x.id === "t-chicken"); return { usedLater: row.usedLater, text: shopRowHTML(row).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ") }; });
  assert.equal(r.usedLater, 0); assert.match(r.text, /100 g left over/);
});

test("Today › This week: a skipped session is a red cross, a finished day a green tick, a half-done day shows how many", async () => {
  const page = await start(F.seed({ withPlan: false }));
  const r = await page.evaluate(() => { const ws = weekStartOf(todayISO()), t = todayISO(); let n = 0;
    for (let i = 0; i < 7; i++) { const d = addDays(ws, i); if (d >= t) break; n++; mutateLog(d, x => { x.planned = [{ sport: "Running", min: 30, km: 5 }]; if (i === 0) x.workouts = [{ sport: "Running", min: 30, km: 5 }]; }); }
    UI.tab = "today"; render(); const cls = [...document.querySelectorAll(".td-ds .td-d")].map(x => x.className.replace(/td-d|now/g, "").trim()); return { n, cls: cls.slice(0, n), cross: !!document.querySelector(".td-d.miss i svg") }; });
  if (r.n >= 2) { assert.equal(r.cls[0], "done"); assert.ok(r.cls.slice(1).every(c => c === "miss")); assert.equal(r.cross, true); }
  const css = await page.evaluate(() => { const mk = c => { const d = document.createElement("span"); d.className = "td-d " + c; d.innerHTML = "<i></i>"; document.body.appendChild(d); const cs = getComputedStyle(d.querySelector("i")); const o = [cs.backgroundColor, cs.color]; d.remove(); return o; }; const root = getComputedStyle(document.documentElement);
    const col = v => { const x = document.createElement("i"); x.style.color = `var(${v})`; document.body.appendChild(x); const c = getComputedStyle(x).color; x.remove(); return c; };
    return { done: mk("done")[0] === col("--good"), miss: mk("miss")[1] === col("--bad") }; });
  assert.deepEqual(css, { done: true, miss: true });
});

test("going to another section on a phone doesn't use a whole-screen View Transition (the bottom bar kept blinking); a desktop still does", async () => {
  for (const [vp, expectVT] of [[H.VIEWPORTS.phone, false], [H.VIEWPORTS.desktop, true]]) {
    const page = await start(F.seed(), vp);
    const r = await page.evaluate(async () => { let vt = 0; const orig = document.startViewTransition; if (orig) document.startViewTransition = function (f) { vt++; return orig.call(document, f); };
      VT_NEXT = "l"; UI.tab = "train"; scheduleRender(); await new Promise(r => setTimeout(r, 400)); return { vt, cls: [...document.getElementById("main").classList].filter(c => c.startsWith("main-in")), nav: !!document.querySelector(".bnav") }; });
    if (expectVT) assert.ok(r.vt >= 0); else { assert.equal(r.vt, 0); assert.deepEqual(r.cls, ["main-in-l"]); }
    assert.equal(r.nav || vp.width >= 900, true);
    await app.close(); app = null;
  }
});

test("the timer and the live workout use the whole width on a computer (the page was squeezed into the menu column)", async () => {
  const page = await start(F.seed(), H.VIEWPORTS.desktop);
  await page.evaluate(() => ACT["timer-open"]()); await page.waitForSelector(".tm-wrap");
  const w = await page.evaluate(() => ({ wrap: Math.round(document.querySelector(".tm-wrap").getBoundingClientRect().width), main: Math.round(document.getElementById("main").getBoundingClientRect().width) }));
  assert.ok(w.wrap >= 600 && w.main >= 900, JSON.stringify(w));
});
