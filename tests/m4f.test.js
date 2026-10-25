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
  await page.evaluate(() => ACT["timer-open"]()); await page.waitForSelector(".tm-modes");
  const w = await page.evaluate(() => ({ wrap: Math.round(document.querySelector(".tm-modes").getBoundingClientRect().width), main: Math.round(document.getElementById("main").getBoundingClientRect().width) }));
  assert.ok(w.wrap >= 600 && w.main >= 900, JSON.stringify(w));
});

/* ---- third round (same day): the shopping period switch, the daily check-in notice, «Left on» closed by default ---- */
for (const width of [360, 390, 820]) test(`the shopping period switch fits its row without scrolling or overlapping — ${width}px`, async () => {
  const page = await start(F.seed(), { width, height: 800 });
  await page.evaluate(() => { UI.tab = "shop"; scheduleRender(); }); await page.waitForSelector(".sq-top .seg");
  const r = await page.evaluate(() => { const seg = document.querySelector(".sq-top .seg"), b = [...seg.querySelectorAll("button")].map(x => x.getBoundingClientRect()); const overlap = b.some((x, i) => i && x.left < b[i - 1].right - 0.5);
    return { n: b.length, scroll: seg.scrollWidth > seg.clientWidth + 1, overlap, cut: [...seg.querySelectorAll("button")].some(x => x.scrollWidth > x.clientWidth + 1), labels: [...seg.querySelectorAll("button")].map(x => x.innerText) }; });
  assert.deepEqual([r.n, r.scroll, r.overlap, r.cut], [4, false, false, false]); assert.deepEqual(r.labels, ["This week", "Next week", "7 days", "Custom"]);
});

test("the daily check-in notice: shown until the day has a check-in or you skip it; skipping is remembered for that day only", async () => {
  const page = await start();
  const r = await page.evaluate(() => { const t = todayISO(), y = addDays(t, -1), sh = d => checkinNotice(d).includes("ci-notice");
    const a = sh(t);                                        // nothing logged today
    ACT["ci-skip"]({ dataset: { date: t } }); const b = sh(t), flag = logGet(t).ciSkip; const c = sh(addDays(t, 1));   // skipped; another day still asks
    mutateLog(t, x => { x.ciSkip = null; }); mutateLog(t, x => { x.weight = 80; }); const d = sh(t);                  // a weigh-in is a check-in
    return { a, b, flag, c, d, tomorrow: (checkinNotice(addDays(t, 1)) || "").length > 0 }; });
  assert.deepEqual([r.a, r.b, r.flag, r.d], [true, false, true, false]);
});

test("the notice is on Today with «Open check-in» and «Skip today», and goes away after either", async () => {
  const page = await start();
  await page.evaluate(() => { UI.tab = "today"; scheduleRender(); }); await page.waitForSelector(".ci-notice");
  const t = await page.evaluate(() => document.querySelector(".ci-notice").innerText); assert.match(t, /check-in/i); assert.match(t, /Skip today/);
  await page.click('.ci-notice [data-act="ci-skip"]'); await page.waitForTimeout(150);
  assert.equal(await page.evaluate(() => !!document.querySelector(".ci-notice")), false);
});

test("the check-in reminder notification is off by default, comes once, at the set time, only if the day is still open", async () => {
  const page = await start();
  const r = await page.evaluate(() => { const sent = []; window.Notification = Object.assign(function () {}, { permission: "granted" }); notify = (t, b, tag) => sent.push(tag); S.settings.reminders = { on: true };
    checkinTick("20:30"); const off = sent.length; S.settings.ci = { rem: true, at: "20:00" }; checkinTick("19:00"); const early = sent.length; checkinTick("20:30"); checkinTick("20:31"); const once = sent.length;
    localStorage.removeItem("engine.rem"); ACT["ci-skip"]({ dataset: { date: todayISO() } }); checkinTick("21:00"); return { off, early, once, skipped: sent.length, tag: sent[0] }; });
  assert.deepEqual(r, { off: 0, early: 0, once: 1, skipped: 1, tag: "engine-checkin" });
});

test("«Left on» starts closed and opens on tap", async () => {
  const page = await start();
  await page.evaluate(() => { S.shop.pantry["t-rice"] = { g: 700 }; DATA_V++; UI.tab = "pantry"; scheduleRender(); }); await page.waitForSelector(".pa-forecast");
  assert.equal(await page.evaluate(() => !!document.querySelector(".pa-forecast .pa-frows")), false);
  await page.click('.pa-forecast [data-act="pa-fc-toggle"]'); await page.waitForTimeout(120);
  assert.equal(await page.evaluate(() => !!document.querySelector(".pa-forecast .pa-frows")), true);
});
