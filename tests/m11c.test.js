/* M11c and the fixes before it: the workout card on Today stays a card, every «Ready to start» page has no boxes. Synthetic data only. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let dir, app;
test.before(async () => { dir = H.build(H.tmp("m11c-build")); });
test.afterEach(async () => { await app?.close(); app = null; });

test("Today keeps the workout as a card (only the pages before a workout lose their boxes)", async () => {
  app = await H.startApp({ dir, seed: F.seed(), viewport: H.VIEWPORTS.phone });
  const r = await app.page.evaluate(() => { UI.tab = "today"; render(); const c = document.querySelector(".td-card.td-train"), s = getComputedStyle(c); return { shadow: s.boxShadow, bg: s.backgroundColor }; });
  assert.notEqual(r.shadow, "none", "the training card has its elevation");
  assert.notEqual(r.bg, "rgba(0, 0, 0, 0)", "the training card has its surface");
  assert.deepEqual(app.errors, []);
});

for (const [name, sport, script] of [["strength", "strength", "Pull 3x\n- 6 Pull-up\n- 8 Ring push-up"], ["run", "Running", "Warm-up\n- 10m Z1\n\nMain 3x\n- 3m Z4\n- 2m Z1"]]) {
  test(`«Ready to start» (${name}) is flat: sections divided by a line, no card, no boxed tile`, async () => {
    for (const vp of [H.VIEWPORTS.phone, H.VIEWPORTS.desktop]) {
      app = await H.startApp({ dir, seed: F.seed(), viewport: vp });
      const r = await app.page.evaluate(([sport, script]) => { startWorkout({ script, name: "Flat day", sport: sport === "strength" ? strengthSport() : sport, date: todayISO() }); UI.tab = "live"; render();
        const boxed = el => { const s = getComputedStyle(el); return s.boxShadow !== "none" || !/rgba\(0, 0, 0, 0\)|transparent/.test(s.backgroundColor) || (parseFloat(s.borderTopWidth) > 0 && parseFloat(s.borderLeftWidth) > 0); };
        const title = document.querySelector(".top-title, .lv-h1")?.closest("body") ? [...document.querySelectorAll("*")].some(e => e.textContent === "Ready to start") : false;
        const boxes = [...document.querySelectorAll(".lv-main .lv-card, .lv-side .lv-card, .pv-tiles > div, .lv-main .pv-sec")].filter(boxed).map(e => e.className);
        return { title, auto: !!LV().auto, boxes }; }, [sport, script]);
      assert.ok(r.title, "the page is «Ready to start»"); assert.equal(r.auto, name === "run");
      assert.deepEqual(r.boxes, [], `no boxes at ${vp.width}px`);
      assert.deepEqual(app.errors, []); await app.close(); app = null;
    }
  });
}

test("big screens: the page fills the room next to the menu (1920 px), is centred beyond 1640 px (2560), the side columns grow, the selected calendar day has no outline", async () => {
  const out = {};
  for (const [w, h] of [[1440, 900], [1920, 1080], [2560, 1440]]) {
    app = await H.startApp({ dir, seed: F.seed(), viewport: { width: w, height: h } });
    out[w] = await app.page.evaluate(() => { const m = () => document.querySelector(".main").getBoundingClientRect(), side = document.querySelector(".side").getBoundingClientRect().right, r = {};
      for (const t of ["today", "fuel", "shop", "train", "settings"]) { UI.tab = t; if (FUEL_TABS.includes(t)) UI.fuelTab = t; render(); const b = m(); r[t] = { w: Math.round(b.width), l: Math.round(b.left - side), r: Math.round(innerWidth - b.right) }; }
      UI.tab = "fuel"; UI.fuelTab = "fuel"; render(); const pg = document.querySelector(".plan-grid"); r.side = pg ? Math.round(pg.lastElementChild.getBoundingClientRect().width) : null;
      UI.tab = "train"; render(); const sel = document.querySelector(".cv-d.sel"); r.outline = sel ? getComputedStyle(sel, "::after").display : "none"; return r; });
    assert.deepEqual(app.errors, []); await app.close(); app = null;
  }
  for (const t of ["today", "fuel", "shop", "train", "settings"]) {
    assert.ok(out[1920][t].r <= 24, `${t} reaches the right edge at 1920 (gap ${out[1920][t].r})`); assert.ok(out[1920][t].w >= 1580, `${t} is ${out[1920][t].w} px wide at 1920`);
    assert.equal(out[2560][t].w, 1640); assert.ok(Math.abs(out[2560][t].l - out[2560][t].r) <= 48, `${t} is centred at 2560`);
    assert.ok(out[1440][t].r <= 24, `${t} unchanged at 1440`);
  }
  assert.ok(out[1920].side > 420, `the Fuel side column grows (${out[1920].side})`);
  for (const w of [1440, 1920]) assert.equal(out[w].outline, "none");
});

test("L91: the smart estimate lives only in the cheat meal: no «Placeholder» in the meal menu or the Add sheet, one «Plan a treat» entry (empty meal too), write it + Enter estimates it, presets without an AI", async () => {
  app = await H.startApp({ dir, seed: F.seed(), viewport: H.VIEWPORTS.phone });
  const r = await app.page.evaluate(async () => { Sync.sample = { json: async () => ({ name: "Pizza and a beer", kcal: 1100, protein: 38, carbs: 130, fat: 42 }) }; const t = todayISO(), A = activeMeals(), m = A[A.length - 1].id; UI.tab = "plan"; UI.date = t; render();
    mutateDay(t, d => { delete d.meals[m]; }); ACT["meal-menu"]({ dataset: { meal: m } }); const menuTxt = document.querySelector(".sheet")?.innerText || "", cheatN = (menuTxt.match(/plan a treat/gi) || []).length;
    closeSheet(); openSheet("add", { date: t, meal: m }); const inAdd = !!document.querySelector('[data-act="open-ph"]') || /Placeholder/.test(document.querySelector(".sheet")?.innerText || ""); closeSheet();
    openCheat({ date: t, meal: m }); const sh = UI.sheet, title = document.querySelector(".sheet h3")?.innerText, presets = !!document.querySelector('[data-act="ch-preset"]');
    sh.desc = "pizza and a beer at Mario's"; document.getElementById("ch-desc").dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })); await new Promise(r => setTimeout(r, 400));
    const est = [sh.draft.name, sh.draft.kcal]; ACT["ch-save"](); await new Promise(r => setTimeout(r, 300)); const it = (getDay(t).meals[m] || []).find(x => x.cheat);
    Sync.sample = null; openCheat({ date: t, meal: A[0].id }); const presetsNoAI = !!document.querySelector('[data-act="ch-preset"]'); closeSheet();
    return { placeholderInMenu: /Placeholder/.test(menuTxt), cheatN, inAdd, act: typeof ACT["open-ph"], title, presets, est, it: it && [it.name, it.m.kcal, it.eaten, !!it.ph], presetsNoAI }; });
  assert.equal(r.placeholderInMenu, false); assert.equal(r.cheatN, 1, "one cheat meal entry, even on an empty meal"); assert.equal(r.inAdd, false); assert.equal(r.act, "undefined");
  assert.equal(r.title, "Plan a treat"); assert.ok(r.presets, "presets stay next to the estimate");
  assert.deepEqual(r.est, ["Pizza and a beer", 1100]); assert.deepEqual(r.it, ["Pizza and a beer", 1100, false, false]); assert.ok(r.presetsNoAI);
  assert.deepEqual(app.errors, []);
});

test("L91: a meal out puts nothing on the shopping list, reserves nothing in the pantry, and the list says so in one quiet line", async () => {
  app = await H.startApp({ dir, seed: F.seed({ withPlan: true, withPantry: true }), viewport: H.VIEWPORTS.phone });
  const r = await app.page.evaluate(() => { const t = addDays(todayISO(), 1), m = Object.keys(getDay(t).meals).find(k => (getDay(t).meals[k] || []).some(it => it.kind === "food"));
    const refs = (getDay(t).meals[m] || []).filter(it => it.kind === "food").map(it => it.ref), need = () => { const P = stockPlan(todayISO(), 7); return refs.reduce((a, id) => a + (P.need[id] || 0), 0); };
    const before = need();
    openCheat({ date: t, meal: m }); Object.assign(UI.sheet.draft, { name: "Sushi out", kcal: 900, p: 40, c: 100, f: 30, strategy: "none" }); UI.sheet.out = false; ACT["ch-save"]();
    const after = need(); UI.tab = "shop"; UI.fuelTab = "shop"; render();
    const line = document.querySelector(".shop-out")?.textContent.replace(/\s+/g, " ") || "";
    return { m: !!m, before, after, line }; });
  assert.ok(r.m && r.before > 0, "the fixture plans food for tomorrow"); assert.ok(r.after < r.before, `that meal's food left the list and the pantry booking (${r.before} → ${r.after})`);
  assert.match(r.line, /1 meal out/); assert.match(r.line, /nothing to buy/i); assert.match(r.line, /Sushi out/);
  assert.deepEqual(app.errors, []);
});

test("Shopping on the phone: the title and the dates are whole (not cut by the buttons next to them)", async () => {
  app = await H.startApp({ dir, seed: F.seed(), viewport: H.VIEWPORTS.phone });
  const r = await app.page.evaluate(() => { UI.tab = "shop"; UI.fuelTab = "shop"; render(); const t = document.querySelector(".top-title"), s = document.querySelector(".top-sub"), b = document.querySelector('[data-act="shop-prod"]');
    return { cut: t.scrollWidth > t.clientWidth + 1, subLines: Math.round(s.getBoundingClientRect().height / parseFloat(getComputedStyle(s).lineHeight)), label: b.getAttribute("aria-label") }; });
  assert.equal(r.cut, false, "«Shopping» is not cut"); assert.equal(r.subLines, 1, "the dates stay on one line"); assert.equal(r.label, "Bought");
  assert.deepEqual(app.errors, []);
});

test("L18 check-ups: Reminders lists measurements, photos and the two tests (28/30/42/42 days, starting after the first one), the switches and intervals survive a reload", async () => {
  app = await H.startApp({ dir, seed: F.seed(), viewport: H.VIEWPORTS.phone });
  const r = await app.page.evaluate(() => { const L = checkList(), box = document.createElement("div"); box.innerHTML = checkPrefs();
    const rows = [...box.querySelectorAll(".ck-row")].map(e => e.textContent.replace(/\s+/g, " ").trim());
    ACT["ck-toggle"]({ dataset: { k: "photo" } }); CHG["ck-every"]("21", { dataset: { k: "meas" } }); CHG["ck-at"]("07:30");
    return { every: L.map(c => [c.k, c.every, c.on, c.next]), rows }; });
  assert.deepEqual(r.every, [["meas", 28, true, null], ["photo", 30, true, null], ["run", 42, true, null], ["cal", 42, true, null]]);
  assert.equal(r.rows.length, 4); assert.ok(r.rows.every(x => /Starts after the first one you log/.test(x)), r.rows.join(" | "));
  await app.reload();
  const after = await app.page.evaluate(() => ({ L: checkList().map(c => [c.k, c.every, c.on]), at: S.settings.reminders.checks.at, set: (UI.tab = "settings", render(), document.body.innerText.includes("check-ups")) }));
  assert.deepEqual(after.L, [["meas", 21, true], ["photo", 30, false], ["run", 42, true], ["cal", 42, true]]); assert.equal(after.at, "07:30");
  assert.deepEqual(app.errors, []);
});

test("L18 check-ups: what is due shows on Today with the thing to do and a button; the message comes on the due day and weekly after; push queue and calendar file carry it", async () => {
  app = await H.startApp({ dir, seed: F.seed(), viewport: H.VIEWPORTS.phone });
  const r = await app.page.evaluate(async () => { const t = todayISO();
    S.body.m = { [addDays(t, -28)]: { waist: 80 } }; S.body.photos = [{ id: "p1", date: addDays(t, -10), pose: "front" }]; S.train.calis = [{ id: "c1", date: addDays(t, -45), ex: "Pull-up", test: "Max reps (BW)", val: 10 }];
    DATA_V++; UI.tab = "today"; render();
    const due = checksDue(t).map(c => c.k), txt = document.body.innerText, btn = !!document.querySelector('[data-act="open-result"][data-type="measure"]');
    const n0 = checksNotice(t), n3 = checksNotice(addDays(t, 3)), n7 = checksNotice(addDays(t, 7)), push = (() => { const m0 = S.body.m; S.body.m = { [addDays(t, -27)]: { waist: 80 } }; DATA_V++; const k = pushPlan().filter(x => x.key.startsWith("checks|")).map(x => x.key); S.body.m = m0; DATA_V++; return k; })();
    let sent = []; const _n = notify; notify = (title, body, tag) => { sent.push([title, tag]); }; checksTick(t, "23:59", {}); notify = _n;
    let ics = ""; const _s = saveFile; saveFile = async (n, txt) => { ics = txt; return true; }; await ACT["rem-ics"](); saveFile = _s;
    return { due, row: [...document.querySelectorAll(".rm .ck-due")].map(e => e.innerText.replace(/\s+/g, " ")), photo: /Progress photos/.test(document.querySelector(".rm")?.innerText || ""), btn, n0, n3, n7: n7?.title, push, sent, ics: (ics.match(/UID:engine-check-[a-z]+/g) || []).sort(), rr: /RRULE:FREQ=DAILY;INTERVAL=28/.test(ics) }; });
  assert.deepEqual(r.due, ["meas", "cal"]); assert.equal(r.row.length, 2, "one Reminders row per check-up on Today"); assert.match(r.row[0], /Measurements due/); assert.match(r.row[0], /Waist, hips/); assert.match(r.row[1], /Calisthenics test due/); assert.ok(!r.photo); assert.ok(r.btn, "a button opens the measurements");
  assert.equal(r.n0.title, "Measurements due", "only the one falling due today"); assert.equal(r.n3, null); assert.equal(r.n7, "Measurements due", "once a week after");
  assert.deepEqual(r.push, [`checks|${await app.page.evaluate(() => addDays(todayISO(), 1))}`], "the push queue carries the one falling due tomorrow"); assert.deepEqual(r.sent, [["Measurements due", "engine-checks"]]);
  assert.deepEqual(r.ics, ["UID:engine-check-cal", "UID:engine-check-meas", "UID:engine-check-photo"]); assert.ok(r.rr);
  assert.deepEqual(app.errors, []);
});

test("time fields are not cut (the AM/PM shows whole)", async () => {
  app = await H.startApp({ dir, seed: F.seed(), viewport: H.VIEWPORTS.phone });
  const r = await app.page.evaluate(() => { const box = document.createElement("div"); box.className = "main"; box.innerHTML = reminderPrefs(); document.body.appendChild(box);
    const L = [...box.querySelectorAll('input[type="time"]')].map(i => ({ id: i.id, w: Math.round(i.getBoundingClientRect().width) })); box.remove(); return L; });
  assert.ok(r.length >= 3); for (const x of r) assert.ok(x.w >= 140, `${x.id} is ${x.w} px`);
  assert.deepEqual(app.errors, []);
});

test("L15 story: no text is squeezed on the picture (long names end with «…», big numbers get smaller), and on the phone the preview stays in view while the options scroll", async () => {
  app = await H.startApp({ dir, seed: F.seed(), viewport: H.VIEWPORTS.phone });
  const r = await app.page.evaluate(async () => { const calls = [], P = CanvasRenderingContext2D.prototype, _f = P.fillText;
    P.fillText = function (t, x, y, mw) { calls.push({ t: String(t), mw, w: this.measureText(String(t)).width, xr: x + this.measureText(String(t)).width, W: this.canvas.width }); return _f.apply(this, arguments); };
    const d = todayISO();
    storyOpen(d, { sport: strengthSport(), min: 64, note: "Supercalifragilisticexpialidociouslylongworkoutname session" }, { min: 64, name: "Supercalifragilisticexpialidociouslylongworkoutname session", sets: [{ ex: "Archer push-up with a very long exercise name that never ends", reps: [8, 8, 8, 8, 8, 8], load: 22.5 }, { ex: "Ring dips", reps: [10, 9], load: 0 }] });
    const sh = UI.sheet; await storyCanvas(sh.data, null, "bg", { ...storyOpt(sh), size: "l" }); P.fillText = _f;
    const squeezed = calls.filter(c => c.mw != null && c.w > c.mw + 0.5).map(c => c.t), outside = calls.filter(c => c.xr > c.W + 1).map(c => c.t), cut = calls.filter(c => /…$/.test(c.t)).map(c => c.t);
    await new Promise(r => setTimeout(r, 900)); const pv = document.querySelector(".sheet .story-pv"), b = document.querySelector(".sheet-b"); b.scrollTop = b.scrollHeight; await new Promise(r => setTimeout(r, 100));
    const pr = pv.getBoundingClientRect(), br = b.getBoundingClientRect();
    return { squeezed, outside, cut, pvTop: Math.round(pr.top - br.top), pvH: Math.round(pr.height), vh: innerHeight }; });
  assert.deepEqual(r.squeezed, [], "no text drawn narrower than it is"); assert.deepEqual(r.outside, [], "nothing runs off the picture");
  assert.ok(r.cut.some(t => /^Archer push-up/.test(t)), "the long exercise name is shortened with «…»");
  assert.ok(r.pvTop >= -2 && r.pvTop <= 12, `the preview stays at the top while scrolling (${r.pvTop})`); assert.ok(r.pvH <= r.vh * 0.45, `the preview leaves room for the options (${r.pvH} of ${r.vh})`);
  assert.deepEqual(app.errors, []);
});

test("Ready to start, run and strength look the same: «What to bring» and «Countdown» as titled sections, the countdown value sits by its chevron, the workout text is not a card", async () => {
  for (const vp of [H.VIEWPORTS.phone, H.VIEWPORTS.tablet, H.VIEWPORTS.desktop]) {
    app = await H.startApp({ dir, seed: F.seed(), viewport: vp });
    const r = await app.page.evaluate(() => { const out = {};
      for (const [k, sp, sc] of [["run", "Running", "Warm-up\n- 10m Z1\n\nMain 3x\n- 3m Z4\n- 2m Z1"], ["str", strengthSport(), "Pull 3x\n- 6 Pull-up\n- 8 Ring row"]]) {
        WK().live = null; startWorkout({ script: sc, name: "Same", sport: sp, date: todayISO() }); UI.tab = "live"; render();
        const sum = document.querySelector(".pv-cd > summary"), b = sum?.querySelector("b"), ws = document.querySelector(".wo-script"), wss = ws && getComputedStyle(ws);
        out[k] = { heads: [...document.querySelectorAll(".lv-main .section-h h2")].map(h => h.textContent.trim()), cd: sum?.querySelector("span")?.textContent.trim(), gap: b ? Math.round(sum.getBoundingClientRect().right - b.getBoundingClientRect().right) : null,
          dupLabel: sum ? [...sum.parentElement.querySelectorAll(".prep-ch > span")].filter(e => e.offsetParent).length : null, script: ws ? [wss.borderTopWidth, wss.backgroundColor] : null }; }
      return out; });
    for (const k of ["run", "str"]) { assert.ok(r[k].heads.includes("What to bring"), `${k} ${vp.width}: ${r[k].heads}`); assert.equal(r[k].cd, "Countdown before timed sets"); assert.ok(r[k].gap <= 40, `${k} ${vp.width}: the value is ${r[k].gap} px from the right`); assert.equal(r[k].dupLabel, 0, "no second label inside"); }
    if (r.run.script) assert.deepEqual(r.run.script, ["0px", "rgba(0, 0, 0, 0)"], "the workout text is not boxed");
    assert.deepEqual(app.errors, []); await app.close(); app = null;
  }
});

test("L15 story sheet: titled sections, every control in a row starts and ends on the same edges, on phone, tablet and PC", async () => {
  for (const vp of [H.VIEWPORTS.phone, H.VIEWPORTS.tablet, H.VIEWPORTS.desktop]) {
    app = await H.startApp({ dir, seed: F.seed(), viewport: vp });
    const r = await app.page.evaluate(async () => { storyOpen(todayISO(), { sport: strengthSport(), min: 40, note: "Pulls" }, { min: 40, name: "Pulls", sets: [{ ex: "Pull-up", reps: [6, 6], load: 10 }] }); await new Promise(r => setTimeout(r, 900));
      const heads = [...document.querySelectorAll(".st-h")].map(h => h.textContent), segs = [...document.querySelectorAll(".opt-row .seg")].map(e => e.getBoundingClientRect()), b = document.querySelector(".sheet-b").getBoundingClientRect();
      const over = [...document.querySelectorAll(".sheet-b *")].filter(e => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX === "visible" && e.children.length === 0 && e.clientWidth > 0 && !/^(INPUT|IMG|CANVAS)$/.test(e.tagName)).map(e => e.className || e.tagName);
      return { heads, lefts: [...new Set(segs.map(s => Math.round(s.left)))], rights: [...new Set(segs.map(s => Math.round(s.right)))], inside: segs.every(s => s.right <= b.right + 1 && s.left >= b.left - 1), over }; });
    assert.deepEqual(r.heads, ["Background", "Words", "On the picture", "Style"]); assert.equal(r.lefts.length, 1, `${vp.width}: segments start on one edge ${r.lefts}`); assert.equal(r.rights.length, 1, `${vp.width}: and end on one edge ${r.rights}`);
    assert.ok(r.inside); assert.deepEqual(r.over, [], "no text is cut"); assert.deepEqual(app.errors, []); await app.close(); app = null;
  }
});

test("review: copying a planned workout to another day keeps the original (a second movePlanned used to turn every copy into a move)", async () => {
  app = await H.startApp({ dir, seed: F.seed(), viewport: H.VIEWPORTS.desktop });
  const r = await app.page.evaluate(() => { const t = todayISO(), n = addDays(t, 1); mutateLog(t, d => { d.planned = [{ sport: "Running", min: 30, note: "Easy" }]; }); DATA_V++;
    movePlanned(t, 0, n, true); const afterCopy = [plannedRaw(t).length, plannedRaw(n).length];
    movePlanned(t, 0, n); const afterMove = [plannedRaw(t).length, plannedRaw(n).length];
    return { afterCopy, afterMove, dups: (document.documentElement.outerHTML.match(/function movePlanned\(/g) || []).length }; });
  assert.deepEqual(r.afterCopy, [1, 1], "copy: the original stays"); assert.deepEqual(r.afterMove, [0, 2], "move: the original goes");
  assert.deepEqual(app.errors, []);
});

test("review: charts do not blow up on big screens (text stays near its drawn size) and a two-day chart has two date labels, not three", async () => {
  const sizes = {};
  for (const [w, h] of [[390, 844], [1440, 900], [1920, 1080]]) {
    app = await H.startApp({ dir, seed: F.seed(), viewport: { width: w, height: h } });
    sizes[w] = await app.page.evaluate(() => { const t = todayISO(), html = seriesChart([{ name: "A", color: "red", pts: [[addDays(t, -1), 2300], [t, 2310]] }]), box = document.createElement("div"); box.className = "main"; box.innerHTML = `<div class="card pad">${html}</div>`;
      document.querySelector("main, .main").appendChild(box); const svg = box.querySelector("svg.chart"), vb = svg.viewBox.baseVal, scale = svg.getBoundingClientRect().width / vb.width, xl = [...svg.querySelectorAll("text")].filter(x => /Oct|Nov|Sep|Dec|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug/.test(x.textContent)).map(x => x.textContent);
      box.remove(); return { scale: Math.round(scale * 100) / 100, xl }; });
    assert.deepEqual(app.errors, []); await app.close(); app = null;
  }
  for (const w of [390, 1440, 1920]) { assert.ok(sizes[w].scale <= 1.15, `${w}: the chart is drawn ×${sizes[w].scale}`); assert.equal(sizes[w].xl.length, 2, `${w}: date labels ${sizes[w].xl}`); }
});

test("M11d treat by calories: pick about how many kcal with one tap, the name is optional («Decide later»), it reserves the calories and the plan makes room; the name can be filled in later", async () => {
  app = await H.startApp({ dir, seed: F.seed(), viewport: H.VIEWPORTS.phone });
  const r = await app.page.evaluate(async () => { const t = addDays(todayISO(), 1), A = activeMeals(), m = A[A.length - 1].id; UI.tab = "plan"; UI.date = t; render();
    openCheat({ date: t, meal: m }); const sh = UI.sheet, chips = [...document.querySelectorAll('[data-act="ch-kcal"]')].map(b => +b.dataset.v), ph = document.getElementById("ch-name")?.placeholder, order = ["ch-kcal", "ch-name"].map(id => document.getElementById(id)?.compareDocumentPosition(document.getElementById("ch-name")) & 4 ? id : id);
    const kcalFirst = !!(document.getElementById("ch-kcal").compareDocumentPosition(document.getElementById("ch-name")) & Node.DOCUMENT_POSITION_FOLLOWING);
    const before = Math.round(dayTotals(getDay(t)).kcal); ACT["ch-kcal"]({ dataset: { v: "1000" } }); const d1 = { ...sh.draft }, pressed = document.querySelector('[data-act="ch-kcal"][aria-pressed="true"]')?.dataset.v;
    ACT["ch-kcal"]({ dataset: { v: "800" } }); const d2 = { ...sh.draft }; ACT["ch-save"](); await new Promise(r => setTimeout(r, 250));
    const it = (getDay(t).meals[m] || []).find(x => x.cheat); const tot = Math.round(dayTotals(getDay(t)).kcal);
    openCheat({ date: t, meal: m, itemId: it.id }); const label = document.querySelector('label[for="ch-name"]')?.innerText; UI.sheet.draft.name = "Gelato with friends"; ACT["ch-save"](); await new Promise(r => setTimeout(r, 250));
    const it2 = (getDay(t).meals[m] || []).find(x => x.cheat);
    return { chips, ph, kcalFirst, d1: [d1.kcal, d1.name, d1.p + d1.c + d1.f > 0], d2: [d2.kcal, d2.p, d2.c, d2.f], pressed, it: it && [it.name, it.m.kcal, it.eaten, it.id], label, it2: it2 && [it2.name, it2.m.kcal, it2.id === it.id] }; });
  assert.deepEqual(r.chips, [500, 800, 1000, 1200, 1500]); assert.equal(r.ph, "Decide later"); assert.ok(r.kcalFirst, "calories come before the name");
  assert.deepEqual(r.d1, [1000, "", true]); assert.equal(r.pressed, "1000"); assert.deepEqual(r.d2, [800, 30, 100, 31], "macros follow the calories (15/50/35)");
  assert.deepEqual(r.it.slice(0, 3), ["Treat", 800, false]); assert.match(r.label, /What was it/); assert.deepEqual(r.it2, ["Gelato with friends", 800, true]);
  assert.deepEqual(app.errors, []);
});

test("M11d app-icon shortcuts: Check-in, Add food, Free workout and Shopping list, each opens what its name says", async () => {
  const man = JSON.parse(require("fs").readFileSync(require("path").join(H.ROOT, "source/web/manifest.webmanifest"), "utf8"));
  assert.deepEqual(man.shortcuts.map(x => x.name), ["Check-in", "Add food", "Free workout", "Shopping list"]);
  const want = { "open-checkin": /checkin/i, "open-add": /add|food/i, "free-open": /free|workout/i, "shopq-open": /shopq|shopping/i };
  for (const x of man.shortcuts) { const a = new URL(x.url, "http://x/").searchParams.get("a"); assert.ok(want[a], `shortcut ${x.name} points to a known action (${a})`);
    app = await H.startApp({ dir, seed: F.seed(), viewport: H.VIEWPORTS.phone }); await app.page.goto(app.url + "?a=" + a); await app.page.waitForFunction(() => typeof S !== "undefined" && S.settings, null, { timeout: 15000 }); await app.page.waitForTimeout(1600);
    const r = await app.page.evaluate(() => ({ sheet: UI.sheet?.type || null, tab: UI.tab, title: document.querySelector(".sheet h3, .top-title")?.innerText || "" }));
    assert.ok(r.sheet || r.tab === "live", `${x.name} opens something (${JSON.stringify(r)})`); assert.match(`${r.sheet} ${r.title}`, want[a], `${x.name}: ${JSON.stringify(r)}`);
    assert.deepEqual(app.errors, []); await app.close(); app = null; }
});

const PRE_SEED = () => { const s = F.seed(); return s; };
test("M11d before a session: a Reminders row at the chosen lead time for hard or long sessions, with the usual carb amounts or just a nudge; easy sessions only when asked; gone once it starts or is done", async () => {
  app = await H.startApp({ dir, seed: PRE_SEED(), viewport: H.VIEWPORTS.phone });
  const r = await app.page.evaluate(() => { const t = todayISO(); mutateLog(t, d => { d.planned = [{ sport: "Running", min: 80, int: "Hard", note: "Intervals", at: "18:00" }, { sport: strengthSport(), min: 40, int: "Light", note: "Easy pulls", at: "20:00" }]; }); DATA_V++;
    const rows = (o, now = "12:00") => { S.settings.reminders = { ...(S.settings.reminders || {}), pre: o }; DATA_V++; return preSessionRows(t, now).map(x => [x.t, x.title, x.small]); };
    return { dflt: rows({}), l90: rows({ lead: 90 }), all: rows({ which: "all" }), nudge: rows({ detail: "nudge" }), off: rows({ on: false }), started: (rows({ which: "all" }), preSessionRows(t, "18:05").length), before: preSessionRows(t, "17:30").length, key: (rows({}), preSessionRows(t, "12:00").length), kg: Math.round(energyAt(t).trend || 80) }; });
  assert.equal(r.dflt.length, 1); assert.deepEqual(r.dflt[0].slice(0, 2), ["16:00", "Eat before Intervals"]); assert.match(r.dflt[0][2], /\d+–\d+ g carbs/); assert.match(r.dflt[0][2], /18:00/);
  assert.equal(r.l90[0][0], "16:30"); assert.equal(r.all.length, 2, "every session when asked"); assert.doesNotMatch(r.all[1][2], /g carbs/, "no amount invented for an easy session"); assert.doesNotMatch(r.nudge[0][2], /g carbs/);
  assert.equal(r.off.length, 0); assert.equal(r.started, 1, "only the 20:00 one is left after the 18:00 one has started"); assert.equal(r.before, 2); assert.equal(r.key, 1);
  assert.deepEqual(app.errors, []);
});

test("M11d before a session: notification at the lead time (in the push queue and from the open app, once), none when «Today only» or off; settings survive a reload", async () => {
  app = await H.startApp({ dir, seed: PRE_SEED(), viewport: H.VIEWPORTS.phone });
  const r = await app.page.evaluate(async () => { const t = todayISO(), n = addDays(t, 1); mutateLog(n, d => { d.planned = [{ sport: "Running", min: 90, int: "Moderate", note: "Long run", at: "09:00" }]; }); DATA_V++;
    const keys = o => { S.settings.reminders = { ...(S.settings.reminders || {}), pre: o }; DATA_V++; return pushPlan().filter(x => x.key.startsWith("pre|")).map(x => [x.key.split("|")[1], new Date(x.at).getHours() * 60 + new Date(x.at).getMinutes(), x.title, x.body]); };
    const both = keys({}), todayOnly = keys({ mode: "today" }), off = keys({ on: false });
    S.settings.reminders = { ...(S.settings.reminders || {}), on: true, pre: {} }; mutateLog(t, d => { d.planned = [{ sport: "Running", min: 90, int: "Hard", note: "Tempo", at: "23:59" }]; }); DATA_V++;
    const sent = []; const _n = notify; notify = (title, body, tag) => { sent.push([title, tag]); }; 
    preTick(t, "22:00"); preTick(t, "22:01"); notify = _n;
    ACT["pre-set"]({ dataset: { k: "lead", v: "180" } }); ACT["pre-set"]({ dataset: { k: "which", v: "all" } });
    return { both, todayOnly, off, sent, n: n }; });
  assert.equal(r.both.length, 1); assert.equal(r.both[0][1], 7 * 60, "09:00 minus the default 2 h"); assert.match(r.both[0][2], /Long run/); assert.equal(r.todayOnly.length, 0); assert.equal(r.off.length, 0);
  assert.deepEqual(r.sent, [["Eat before Tempo", "engine-pre"]], "sent once");
  await app.reload();
  const after = await app.page.evaluate(() => { UI.tab = "settings"; render(); return { pre: S.settings.reminders.pre, ui: !!(typeof prePrefs === "function" && prePrefs().includes("Before a session")) }; });
  assert.deepEqual(after.pre, { lead: 180, which: "all" }); assert.ok(after.ui); assert.deepEqual(app.errors, []);
});

test("M11d missed workout: Yesterday offers «Move to …» with the nearest free day (hard sessions keep a day away from other hard ones); one tap moves it, Undo brings it back", async () => {
  app = await H.startApp({ dir, seed: F.seed({ withPlan: false }), viewport: H.VIEWPORTS.phone });
  const r = await app.page.evaluate(async () => { const t = todayISO(), y = addDays(t, -1), D = n => addDays(t, n);
    const set = (d, l) => mutateLog(d, x => { x.planned = l; }); const plan = (d, w) => set(d, [w]);
    const hard = { sport: "Running", min: 60, int: "Hard", note: "Intervals" }, easy = { sport: "Running", min: 40, int: "Light", note: "Easy run" };
    plan(y, hard); DATA_V++; const free0 = freeDayFor(hard, y);                                     // nothing else planned: today
    plan(t, { ...hard, note: "Tempo" }); DATA_V++; const free1 = freeDayFor(hard, y);               // today taken, tomorrow touches a hard day: the day after
    const free2 = freeDayFor(easy, y);                                                                // an easy one may sit next to it: tomorrow
    plan(y, hard); DATA_V++; UI.tab = "today"; render(); await new Promise(r => setTimeout(r, 200));
    const btn = document.querySelector('[data-act="wo-move-free"]'), label = btn?.innerText.trim();
    btn.click(); await new Promise(r => setTimeout(r, 200)); const after = { y: plannedRaw(y).length, to: plannedRaw(free1).length };
    document.querySelector("#toast button[data-act=undo]")?.click(); await new Promise(r => setTimeout(r, 200)); const undone = { y: plannedRaw(y).length, to: plannedRaw(free1).length };
    return { free0: free0 === t, free1: free1 === D(2), free2: free2 === D(1), label, after, undone, dow: DOW[dow(D(2))] }; });
  assert.ok(r.free0 && r.free1 && r.free2, JSON.stringify(r)); assert.equal(r.label, `Move to ${r.dow}`); assert.deepEqual(r.after, { y: 0, to: 1 }); assert.deepEqual(r.undone, { y: 1, to: 0 });
  assert.deepEqual(app.errors, []);
});

test("M11d Settings › Reminders: the option rows keep their labels whole on phone, tablet and PC (no segment text over another)", async () => {
  for (const vp of [H.VIEWPORTS.phone, H.VIEWPORTS.tablet, H.VIEWPORTS.desktop]) {
    app = await H.startApp({ dir, seed: F.seed(), viewport: vp });
    const r = await app.page.evaluate(() => { const box = document.createElement("div"); box.className = "main"; box.innerHTML = prePrefs(); document.body.appendChild(box);
      const bad = [...box.querySelectorAll(".opt-row .seg button")].filter(b => b.scrollWidth > b.clientWidth + 1).map(b => b.textContent), rows = [...box.querySelectorAll(".opt-row")].map(r => [Math.round(r.querySelector(".seg").getBoundingClientRect().left), Math.round(r.querySelector(".seg").getBoundingClientRect().right)]);
      box.remove(); return { bad, lefts: [...new Set(rows.map(x => x[0]))].length, rights: [...new Set(rows.map(x => x[1]))].length }; });
    assert.deepEqual(r.bad, [], `${vp.width}: cut labels ${r.bad}`); assert.equal(r.lefts, 1); assert.equal(r.rights, 1); assert.deepEqual(app.errors, []); await app.close(); app = null;
  }
});

test("M11d pre-session fuel is calibrated (ACSM/AND/DC 2016: 1–4 g/kg carbohydrate 1–4 h before an effort over 60 min): hand-computed for 80 kg, kcal = 4 per g, tuned by the meals already planned in the window", async () => {
  app = await H.startApp({ dir, seed: F.seed({ withPlan: false }), viewport: H.VIEWPORTS.phone });
  const r = await app.page.evaluate(() => { const t = todayISO(), kg = Math.round(energyAt(t).trend);
    const w = (o = {}) => ({ sport: "Running", min: 90, int: "Hard", note: "Long", at: "18:00", ...o });
    const f = (lead, o) => preFuel(w(o), t, kg, lead);
    const out = { kg, l60: f(60), l90: f(90), l120: f(120), l180: f(180), l240: f(240), short: f(120, { min: 60 }), easyLong: f(120, { int: "Light", min: 100 }) };
    mutateLog(t, d => { d.workouts = []; });
    S.days[t] = { date: t, meals: { l: [{ id: "x1", kind: "food", ref: "t-rice", qty: 150, eaten: false }] } };  // 150 g rice = 117 g carbs at 13:00
    out.covers = preFuel(w({ at: "16:00" }), t, kg, 120);                                  // 180 min after lunch: counted, 117 >= 80
    S.days[t].meals.l[0].qty = 80;                                                          // 62.4 g carbs: partial
    out.partial = preFuel(w({ at: "16:00" }), t, kg, 120);
    out.far = preFuel(w({ at: "19:00" }), t, kg, 120);                                      // 6 h after lunch: not counted
    return out; });
  assert.equal(r.kg, 80);
  const g = x => x.amounts ? [x.g[0], x.g[1], x.kcal[0], x.kcal[1]] : null;
  assert.deepEqual(g(r.l60), [80, 80, 320, 320]); assert.deepEqual(g(r.l90), [80, 120, 320, 480]); assert.deepEqual(g(r.l120), [80, 160, 320, 640]); assert.deepEqual(g(r.l180), [160, 240, 640, 960]); assert.deepEqual(g(r.l240), [240, 320, 960, 1280]);
  assert.equal(r.short.amounts, false, "no amount invented for 60 min or less"); assert.match(r.short.text, /under an hour|light/i); assert.ok(r.easyLong.amounts, "a long easy one is still over 60 min");
  assert.match(r.l120.text, /80–160 g carbs \(≈ 320–640 kcal\)/); assert.match(r.l120.text, /30–60 g per hour/, "long: the during-exercise rate stays");
  assert.match(r.covers.text, /already has 117 g carbs/); assert.match(r.covers.text, /covers it/); assert.equal(r.covers.top, null);
  assert.deepEqual(r.partial.top, [20, 100]); assert.match(r.partial.text, /add 20–100 g carbs \(≈ 80–400 kcal\)/); assert.equal(r.far.covered, 0);
  assert.deepEqual(app.errors, []);
});

test("icons: every icon named in the code exists, and the treat uses its own icon, not the star", async () => {
  const src = require("fs").readFileSync(require("path").join(H.ROOT, "source/engine.html"), "utf8");
  app = await H.startApp({ dir, seed: F.seed(), viewport: H.VIEWPORTS.phone });
  const have = await app.page.evaluate(() => Object.keys(ICONS));
  const named = [...new Set([...src.matchAll(/\bic\("([a-zA-Z0-9-]+)"/g)].map(m => m[1].replace(/-f$/, "")).concat([...src.matchAll(/\bicon: "([a-zA-Z0-9-]+)"/g)].map(m => m[1])))];
  const missing = named.filter(n => !have.includes(n)); assert.deepEqual(missing, [], "icons named but not drawn");
  assert.ok(have.includes("treat")); assert.equal((src.match(/Plan a treat[^\n]{0,40}icon: "star"/g) || []).length, 0);
  assert.equal((src.match(/ic\("star"\)\}<span>Treat/g) || []).length, 0); assert.deepEqual(app.errors, []);
});

/* ---------- M11e: Workout Score (1-100), deterministic, from the logged data only ---------- */
const SC_SEED = () => { const s = F.seed({ withPlan: false }); return s; };
test("M11e score, strength: completion vs the plan, progress against last time, effort and volume; sub-scores add up by their weights; no data → no score", async () => {
  app = await H.startApp({ dir, seed: SC_SEED(), viewport: H.VIEWPORTS.phone });
  const r = await app.page.evaluate(() => { const t = todayISO(), p = addDays(t, -7), sp = strengthSport();
    const sets = (load, reps, n) => Array.from({ length: n }, (_, i) => ({ ex: "Pull-up", round: i + 1, rounds: n, reps: [reps], load, rir: 2 }));
    mutateLog(p, d => { d.wsess = [{ id: "s0", name: "Pulls", tplId: "tp", min: 40, rpe: 7, sets: sets(10, 6, 4), plan: { u: 4, r: 24 } }]; d.workouts = [{ sport: sp, min: 40, sid: "s0", note: "Pulls", rpe: 7, int: "Moderate", tpl: "tp" }]; });
    const mk = (id, load, reps, n, rpe, plan, min = 40) => { mutateLog(t, d => { d.wsess = [{ id, name: "Pulls", tplId: "tp", min, rpe, sets: sets(load, reps, n), plan }]; d.workouts = [{ sport: sp, min, sid: id, note: "Pulls", rpe, int: "Moderate", tpl: "tp" }]; }); DATA_V++; return workoutScore(t, logGet(t).workouts[0]); };
    const better = mk("s1", 12.5, 6, 4, 8, { u: 4, r: 24 });          // heavier, all done, RPE 8
    const same = mk("s2", 10, 6, 4, 8, { u: 4, r: 24 });                // same as last time
    const worse = mk("s3", 7.5, 5, 2, 10, { u: 4, r: 24 });             // lighter, half done, RPE 10
    const noPlan = mk("s4", 10, 6, 4, 7, null);
    const again = workoutScore(t, logGet(t).workouts[0]);
    mutateLog(addDays(t, -30), d => { d.workouts = [{ sport: sp, min: 30 }]; }); DATA_V++; const none = workoutScore(addDays(t, -30), logGet(addDays(t, -30)).workouts[0]);
    const sum = x => Math.round(x.parts.filter(p => p.pts != null).reduce((a, p) => a + p.w * p.pts, 0) / x.parts.filter(p => p.pts != null).reduce((a, p) => a + p.w, 0));
    const P = x => Object.fromEntries(x.parts.map(p => [p.k, p.pts == null ? null : Math.round(p.pts)]));
    return { better: [better.score, P(better), sum(better)], same: [same.score, P(same)], worse: [worse.score, P(worse)], noPlan: P(noPlan), idem: JSON.stringify(noPlan) === JSON.stringify(again), none, texts: { pos: better.pos, neg: worse.neg, tips: worse.tips } }; });
  assert.deepEqual(r.better[1].completion, 100); assert.equal(r.better[1].progress, 100, "+25% on the lift"); assert.equal(r.better[1].effort, 100); assert.equal(r.better[2], r.better[0], "the score is the weighted mean of the sub-scores");
  assert.equal(r.same[1].progress, 70, "holding last time's level is a solid 70"); assert.ok(r.better[0] > r.same[0] && r.same[0] > r.worse[0], `${r.better[0]} > ${r.same[0]} > ${r.worse[0]}`);
  assert.ok(r.worse[1].completion <= 55 && r.worse[1].effort <= 85 && r.worse[1].progress < 50, JSON.stringify(r.worse[1]));
  assert.equal(r.noPlan.completion, null, "no plan, no completion score; the others still count"); assert.ok(r.idem, "same data, same result"); assert.equal(r.none, null, "a bare log entry has nothing to judge");
  assert.ok(r.texts.pos.some(x => /Pull-up/.test(x)), JSON.stringify(r.texts.pos)); assert.ok(r.texts.neg.length >= 2 && r.texts.tips.length >= 1);
  assert.deepEqual(app.errors, []);
});

test("M11e score, running: an easy run that stayed easy is NOT penalised; the same run at hard effort is; pacing from the splits; a plan to compare for time", async () => {
  app = await H.startApp({ dir, seed: SC_SEED(), viewport: H.VIEWPORTS.phone });
  const r = await app.page.evaluate(() => { FIT().run.lthrManual = 170; DATA_V++; const t = todayISO(), z = runState().zones; const z1 = z[1].to, z3 = z[2].to;
    const run = (o, planned) => { mutateLog(t, d => { d.workouts = [{ sport: FIT().runSport, min: 45, km: 8, sid: "r1", note: "Easy run", ...o }]; d.planned = planned ? [{ sport: FIT().runSport, min: 45, int: "Light", note: "Easy run" }] : []; d.wsess = [{ id: "r1", name: "Easy run", min: o.min || 45, rpe: o.rpe || null, gps: { km: 8, sec: 2700, splits: o.splits || [] } }]; }); DATA_V++; return workoutScore(t, logGet(t).workouts[0]); };
    const even = Array.from({ length: 8 }, (_, i) => ({ km: i + 1, sec: 337 + (i % 2), len: 1 })), ragged = [300, 400, 330, 420, 310, 410, 300, 450].map((sec, i) => ({ km: i + 1, sec, len: 1 }));
    const easy = run({ hr: z1 - 8, rpe: 3, int: "Light", splits: even }, true), hard = run({ hr: z3 + 12, rpe: 9, int: "Hard", splits: even }, true), uneven = run({ hr: z1 - 8, rpe: 3, int: "Light", splits: ragged }, true), short = run({ hr: z1 - 8, rpe: 3, int: "Light", min: 20, splits: even }, true);
    const P = x => Object.fromEntries(x.parts.map(p => [p.k, p.pts == null ? null : Math.round(p.pts)]));
    return { easy: [easy.score, P(easy)], hard: [hard.score, P(hard)], uneven: P(uneven), short: P(short), easyPos: easy.pos, hardNeg: hard.neg }; });
  assert.ok(r.easy[0] >= 90, `an easy run kept easy scores ${r.easy[0]}`); assert.equal(r.easy[1].intensity, 100); assert.equal(r.easy[1].pacing, 100); assert.equal(r.easy[1].execution, 100);
  assert.ok(r.hard[0] < r.easy[0] - 15, `${r.hard[0]} vs ${r.easy[0]}`); assert.ok(r.hard[1].intensity < 60 && r.hard[1].effort <= 70, JSON.stringify(r.hard[1]));
  assert.ok(r.uneven.pacing < 80, "uneven splits lose points"); assert.ok(r.short.execution < 70, "20 of 45 planned minutes");
  assert.ok(r.easyPos.length >= 1 && r.hardNeg.some(x => /intensity|heart|easy/i.test(x)), JSON.stringify(r.hardNeg)); assert.deepEqual(app.errors, []);
});

test("M11e score on screen: the workout sheet of a logged session has a flat «Score» section (number, one row per sub-score, what went well, what to fix, how it is calculated) on phone, tablet and PC; a new session saves its plan and shows the score in the toast", async () => {
  for (const vp of [H.VIEWPORTS.phone, H.VIEWPORTS.tablet, H.VIEWPORTS.desktop]) {
    app = await H.startApp({ dir, seed: SC_SEED(), viewport: vp });
    const r = await app.page.evaluate(async () => { const t = todayISO(), sp = strengthSport();
      startWorkout({ script: "Pull 3x\n- 6 Pull-up +10kg\n- 8 Ring row", name: "Pulls", sport: sp, date: t }); ACT["lv-begin"](); const L = LV(); L.tasks.forEach((tk, i) => { if (tk.t === "set") { L.res[i] = L.res[i] || {}; } });
      return { plan: planSummary(L), sets: L.tasks.filter(x => x.t === "set").length }; });
    assert.ok(r.plan && r.plan.u === r.sets && r.plan.r === 3 * (6 + 8), JSON.stringify(r));
    const s = await app.page.evaluate(async () => { const t = todayISO(), sp = strengthSport();
      mutateLog(t, d => { d.wsess = [{ id: "z1", name: "Pulls", min: 40, rpe: 8, plan: { u: 4, r: 24 }, sets: [1, 2, 3, 4].map(i => ({ ex: "Pull-up", round: i, rounds: 4, reps: [6], load: 10, rir: 2 })) }]; d.workouts = [{ sport: sp, min: 40, sid: "z1", note: "Pulls", rpe: 8, int: "Hard" }]; }); DATA_V++; UI.tab = "today"; render();
      openSheet("wo", { r: woResolve({ dataset: { date: t, i: "0" } }) }); await new Promise(r => setTimeout(r, 300));
      const sec = document.querySelector(".sheet .sc"), cs = sec && getComputedStyle(sec);
      return { has: !!sec, n: +sec?.querySelector(".sc-n")?.textContent, rows: sec?.querySelectorAll(".sc-p").length, shadow: cs?.boxShadow, how: !!sec?.querySelector(".sc-how"), over: document.documentElement.scrollWidth > innerWidth + 1,
        cut: [...(sec?.querySelectorAll(".sc-pn, .sc-p small, .sc-t li") || [])].filter(e => e.scrollWidth > e.clientWidth + 1).length }; });
    assert.ok(s.has && s.n >= 60 && s.n <= 100, JSON.stringify(s)); assert.equal(s.rows, 4); assert.equal(s.shadow, "none", "flat, not a card"); assert.ok(s.how); assert.equal(s.over, false); assert.equal(s.cut, 0);
    assert.deepEqual(app.errors, []); await app.close(); app = null;
  }
});

/* ---------- M11f: BMI, this week's balance, photos on every device ---------- */
test("M11f BMI: kg / m² with the WHO bands, from the trend weight and your height, shown in Progress › Body with a note that it can't tell muscle from fat", async () => {
  app = await H.startApp({ dir, seed: F.seed({ withPlan: false }), viewport: H.VIEWPORTS.phone });
  const r = await app.page.evaluate(() => { const b = (kg, cm) => { const x = bmiOf(kg, cm); return [x.v, x.cat]; };
    UI.tab = "progress"; UI.progSeg = "body"; render(); const el = document.querySelector(".bmi");
    return { a: b(50, 175), n: b(80, 180), o: b(90, 180), ob: b(110, 175), edge: [bmiOf(18.5 * 1.7 ** 2, 170).cat, bmiOf(25 * 1.7 ** 2, 170).cat, bmiOf(30 * 1.7 ** 2, 170).cat], bad: bmiOf(0, 180), txt: el?.innerText.replace(/\s+/g, " ") || "" }; });
  assert.deepEqual(r.a, [16.3, "Underweight"]); assert.deepEqual(r.n, [24.7, "Normal weight"]); assert.deepEqual(r.o, [27.8, "Overweight"]); assert.deepEqual(r.ob, [35.9, "Obesity"]);
  assert.deepEqual(r.edge, ["Normal weight", "Overweight", "Obesity"], "18.5, 25 and 30 start their bands"); assert.equal(r.bad, null);
  assert.match(r.txt, /BMI/); assert.match(r.txt, /24\.7/); assert.match(r.txt, /Normal weight/); assert.match(r.txt, /muscle/i); assert.deepEqual(app.errors, []);
});

test("M11f this week's balance: total kcal deficit or surplus (intake − TDEE) over the days with food, a bar per day, kg equivalent, previous/next week; shown at the top of Progress › Overview", async () => {
  app = await H.startApp({ dir, seed: F.seed({ withPlan: false }), viewport: H.VIEWPORTS.phone });
  const r = await app.page.evaluate(() => { const t = todayISO(), ws = weekStartOf(t);
    for (let i = 0; i <= dow(t) && i < 3; i++) mutateLog(addDays(ws, i), d => { d.kcal = 1800 + i * 700; }); DATA_V++;
    const W = weekBalance(0), s = energySeries(), want = W.days.filter(x => x.bal != null).reduce((a, x) => a + (s.rows[x.d].intake.kcal - s.rows[x.d].tdee), 0);
    UI.tab = "progress"; UI.progSeg = "overview"; render(); const sec = document.querySelector(".wbal"), P = weekBalance(-1);
    return { n: W.n, total: W.total, want: Math.round(want), days: W.days.length, kg: W.kg, svg: !!sec?.querySelector("svg.chart"), label: sec?.querySelector("svg")?.getAttribute("aria-label"), txt: sec?.innerText.replace(/\s+/g, " "), first: document.querySelector(".main")?.innerHTML.indexOf("wbal") < document.querySelector(".main")?.innerHTML.indexOf("kpi"), prev: P.ws === addDays(ws, -7), bars: sec?.querySelectorAll("svg rect").length }; });
  assert.ok(r.n >= 1 && r.days === 7); assert.ok(Math.abs(r.total - r.want) <= 3, `${r.total} vs ${r.want}`); assert.ok(r.svg); assert.match(r.label, /balance/i); assert.match(r.txt, /deficit|surplus/); assert.match(r.txt, /kg/); assert.ok(r.prev); assert.ok(r.bars >= r.n);
  assert.ok(Math.abs(r.kg - r.total / 7000) < 0.01); assert.deepEqual(app.errors, []);
});

test("M11f photos on every device: photos taken before signing in or offline are uploaded later (once), a second device downloads and keeps them, the section says where they are and fixes itself with «Sync now»", async () => {
  app = await H.startApp({ dir, seed: F.seed({ withPlan: false }), viewport: H.VIEWPORTS.phone });
  const r = await app.page.evaluate(async () => { const t = todayISO(), store = new Map(), log = []; let fail = null;
    const sb = { storage: { from: () => ({ upload: async (p, b) => { log.push(p); if (fail) return { error: { message: fail } }; store.set(p, b); return { error: null }; }, download: async p => store.has(p) ? { data: store.get(p), error: null } : { data: null, error: { message: "not found" } }, remove: async ps => { ps.forEach(p => store.delete(p)); return { error: null }; } }) } };
    const blob = new Blob(["jpegdata"], { type: "image/jpeg" }); await IDB.put("ph-a", blob); await IDB.put("ph-b", blob);
    S.body.photos = [{ id: "ph-a", date: t, pose: "front" }, { id: "ph-b", date: t, pose: "side" }]; DATA_V++;
    const html = () => { UI.tab = "progress"; UI.progSeg = "body"; render(); return document.querySelector(".pp-sync")?.textContent.replace(/\s+/g, " ") || ""; };
    const out = { signedOut: html(), status0: photosStatus() };
    window.ENGINE.sb = sb; window.ENGINE.uid = "u1";
    fail = "Bucket not found"; await photosSync(); out.err = [html(), photosStatus().pending, PH_SYNC.err];
    fail = null; await photosSync(); out.up = [log.length, [...store.keys()].sort(), S.body.photos.map(p => p.cloud)];
    const n0 = log.length; await photosSync(); out.again = log.length - n0; out.synced = html();
    await IDB.del("ph-a"); delete PH_URL["ph-a"]; const b = await photoBlob(S.body.photos[0]); out.dl = [!!b, !!(await IDB.get("ph-a"))];
    return out; });
  assert.match(r.signedOut, /only on this device/i); assert.match(r.signedOut, /Sign in/); assert.equal(r.status0.signed, false); assert.equal(r.status0.pending, 2);
  assert.equal(r.err[1], 2); assert.match(r.err[0], /cloud folder/i); assert.match(r.err[0], /SQL Editor/); assert.match(r.err[0], /Copy the SQL/); assert.match(r.err[0], /Bucket not found/); assert.match(r.err[2], /Bucket not found/);
  assert.deepEqual(r.up[1], ["u1/ph-a.jpg", "u1/ph-b.jpg"]); assert.deepEqual(r.up[2], ["u1/ph-a.jpg", "u1/ph-b.jpg"]); assert.equal(r.again, 0, "nothing to upload twice"); assert.match(r.synced, /all your devices/i);
  assert.deepEqual(r.dl, [true, true], "the other device downloads it and keeps a copy"); assert.deepEqual(app.errors, []);
});

test("M11f balance chart: no value label touches a day letter or leaves the chart, even with a big deficit and a big surplus", async () => {
  for (const vp of [H.VIEWPORTS.phone, H.VIEWPORTS.desktop]) {
    app = await H.startApp({ dir, seed: F.seed({ withPlan: false }), viewport: vp });
    const r = await app.page.evaluate(() => { const t = todayISO(), ws = weekStartOf(t); for (let i = 0; i <= dow(t); i++) mutateLog(addDays(ws, i), d => { d.kcal = i % 2 ? 4200 : 900; }); DATA_V++; UI.tab = "progress"; UI.progSeg = "overview"; render();
      const svg = document.querySelector(".wbal svg"), box = svg.getBoundingClientRect(), T = [...svg.querySelectorAll("text")].map(e => ({ t: e.textContent, r: e.getBoundingClientRect() })), over = [];
      for (let i = 0; i < T.length; i++) for (let j = i + 1; j < T.length; j++) { const a = T[i].r, b = T[j].r; if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 2 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 2) over.push(T[i].t + "×" + T[j].t); }
      return { over, out: T.filter(x => x.r.top < box.top - 1 || x.r.bottom > box.bottom + 1 || x.r.left < box.left - 1 || x.r.right > box.right + 1).map(x => x.t) }; });
    assert.deepEqual(r.over, [], `${vp.width}: touching labels`); assert.deepEqual(r.out, [], `${vp.width}: labels outside the chart`); assert.deepEqual(app.errors, []); await app.close(); app = null;
  }
});

test("photos: opening Progress photos while signed in uploads what is still only on this device, without a tap", async () => {
  app = await H.startApp({ dir, seed: F.seed({ withPlan: false }), viewport: H.VIEWPORTS.phone });
  const r = await app.page.evaluate(async () => { const store = new Map(); await IDB.put("ph-z", new Blob(["x"], { type: "image/jpeg" })); S.body.photos = [{ id: "ph-z", date: todayISO(), pose: "back" }]; DATA_V++;
    window.ENGINE.sb = { storage: { from: () => ({ upload: async (p, b) => { store.set(p, b); return { error: null }; }, download: async () => ({ data: null }), remove: async () => ({}) }) } }; window.ENGINE.uid = "u9";
    UI.tab = "progress"; UI.progSeg = "body"; render(); await new Promise(r => setTimeout(r, 1200)); return { keys: [...store.keys()], cloud: S.body.photos[0].cloud, msg: document.querySelector(".pp-sync")?.innerText.replace(/\s+/g, " ") }; });
  assert.deepEqual(r.keys, ["u9/ph-z.jpg"]); assert.equal(r.cloud, "u9/ph-z.jpg"); assert.match(r.msg, /all your devices/i); assert.deepEqual(app.errors, []);
});

/* ---------- M11g: activity analysis from the second-by-second streams (hand-calculated synthetic runs) ---------- */
const STREAM = `(o => { const n = o.sec + 1, t = [], dist = [], hr = [], alt = [], moving = []; let d = 0, clock = 0;
  for (let i = 0; i < n; i++) { const pause = o.pause && i >= o.pause[0] && i < o.pause[0] + o.pause[1]; t.push(i); const v = pause ? 0 : (typeof o.v === "function" ? o.v(i) : o.v); if (i) d += v; dist.push(d); moving.push(!pause); hr.push(typeof o.hr === "function" ? o.hr(i) : o.hr); alt.push(o.alt ? o.alt(i) : 0); }
  return { time: t, distance: dist, heartrate: hr, altitude: alt, moving }; })`;
test("M11g analysis engine: km splits, best efforts, decoupling, efficiency, cardiac cost, stopped time, climb — all hand-calculated", async () => {
  app = await H.startApp({ dir, seed: SC_SEED(), viewport: H.VIEWPORTS.phone });
  const r = await app.page.evaluate(`(() => { const mk = ${STREAM};
    const st = mk({ sec: 3060, v: 10 / 3, hr: i => 140 + 10 * (i < 1500 ? i : i < 1560 ? 1500 : i - 60) / 3000, pause: [1500, 60], alt: i => 50 * i / 3060 });
    const a = analyseStreams({ time: st.time, dist: st.distance, hr: st.heartrate, alt: st.altitude, moving: st.moving }, { zones: null, bike: false });
    return { a, none: analyseStreams({ time: [0, 1, 2], dist: [0, 3, 6] }, {}) }; })()`);
  const a = r.a; assert.equal(r.none, null, "too short to analyse");
  assert.equal(a.sec, 3000, "moving time without the minute stopped"); assert.equal(a.el, 3060); assert.ok(Math.abs(a.m - 10000) < 4, `distance ${a.m}`);
  assert.equal(a.spl.length, 10); assert.ok(a.spl.every(s => Math.abs(s[0] - 300) <= 1), JSON.stringify(a.spl.map(s => s[0])));
  assert.ok(Math.abs(a.best.k1 - 300) <= 1 && Math.abs(a.best.k5 - 1500) <= 2 && Math.abs(a.best.k10 - 3000) <= 3 && Math.abs(a.best.m1 - 482.8) <= 1.5, JSON.stringify(a.best));
  assert.ok(Math.abs(a.hr - 145) <= 0.6, `avg HR ${a.hr}`); assert.ok(Math.abs(a.cost - 725) <= 4, `cardiac cost ${a.cost} beats/km`); assert.ok(Math.abs(a.ef - 200 / 145) <= 0.02, `EF ${a.ef}`);
  assert.ok(Math.abs(a.dec - 3.39) <= 0.25, `decoupling ${a.dec} (hand: 3.39 %)`); assert.ok(a.up >= 47 && a.up <= 50, `climb ${a.up}`); assert.equal(a.z, null, "no zones without a threshold");
  assert.deepEqual(app.errors, []);
});

test("M11g severe endurance score from the analysis: pacing from the km splits (CV, fade, hills), intensity from time in zone, cardiac drift, rep consistency for intervals — hand-computed points", async () => {
  app = await H.startApp({ dir, seed: SC_SEED(), viewport: H.VIEWPORTS.phone });
  const r = await app.page.evaluate(() => { FIT().run.lthrManual = 170; DATA_V++; const t = todayISO(), sp = FIT().runSport;
    const base = { v: 1, sec: 2400, el: 2400, m: 8000, hr: 135, hx: 150, up: 20, dn: 20, len: 1000, rem: null, best: {}, ef: 1.4, cost: 700, dec: 1.5, h: [300, 300], z: [1800, 600, 0, 0, 0, 0, 0], laps: null };
    const run = (an, o = {}, plan = { sport: sp, min: 40, int: "Light", note: "Easy run" }) => { mutateLog(t, d => { d.workouts = [{ sport: sp, min: o.min || 40, km: 8, hr: an.hr, rpe: o.rpe ?? 3, int: "Light", sid: "q1", note: "Easy run" }]; d.planned = plan ? [plan] : []; d.wsess = [{ id: "q1", name: "Easy run", min: o.min || 40, rpe: o.rpe ?? 3, an }]; }); DATA_V++; return workoutScore(t, logGet(t).workouts[0]); };
    const spl = c => [300, ...Array.from({ length: 7 }, (_, i) => c[i % c.length])].map(sec => [sec, 135, 3]);       // first split is the warm-up and not judged
    const P = x => Object.fromEntries(x.parts.map(p => [p.k, p.pts == null ? null : Math.round(p.pts)]));
    const steady = run({ ...base, spl: spl([300]) }), cv5 = run({ ...base, spl: spl([285, 315]) }), fade = run({ ...base, spl: spl([300]), h: [300, 324] }), hilly = run({ ...base, spl: spl([285, 315]), up: 300 });
    const wrongZone = run({ ...base, z: [200, 600, 1600, 0, 0, 0, 0], hr: 152 }), drift = run({ ...base, dec: 8 }), short = run({ ...base, spl: spl([300]).slice(0, 3) });
    const ints = (w, extra = {}) => ({ ...base, hr: 165, z: [300, 300, 300, 900, 600, 0, 0], laps: [["R", 300, 800, 120, 2.7], ...w.map(s => ["W", 240, Math.round(s * 240), 172, s]), ["R", 120, 300, 130, 2.5]], ...extra });
    const iv = (p, o) => { const x = run(ints(p), { rpe: 8, ...o }, { sport: sp, min: 40, int: "Hard", note: "Intervals" }); return x; };
    const evenI = iv([4.0, 4.0, 4.0, 4.0]), fadeI = iv([4.1, 4.0, 3.8, 3.6]), ragI = iv([4.4, 3.8, 4.4, 3.8]);
    return { steady: [steady.score, P(steady)], cv5: P(cv5), fade: P(fade), hilly: P(hilly), wrongZone: [wrongZone.score, P(wrongZone), wrongZone.neg], drift: P(drift), short: P(short), evenI: [evenI.score, P(evenI)], fadeI: P(fadeI), ragI: P(ragI) }; });
  assert.ok(r.steady[0] >= 95, JSON.stringify(r.steady)); assert.deepEqual([r.steady[1].pacing, r.steady[1].intensity, r.steady[1].cardiac, r.steady[1].execution], [100, 100, 100, 100]);
  assert.equal(r.cv5.pacing, 60, "a 5 % spread of the km splits is 60"); assert.equal(r.hilly.pacing, 82, "on a hilly run the same spread counts at two thirds (CV 4.98/1.5 = 3.32 %: 100 - 1.32/1.5 x 20)"); assert.equal(r.fade.pacing, 100 - Math.round((8 - 1.5) * 6), "an 8 % positive split loses (8 - 1.5) x 6 points");
  assert.equal(r.short.pacing, null, "fewer than 3 judged splits: not scored"); assert.ok(r.wrongZone[1].intensity <= 20 && r.wrongZone[0] < r.steady[0] - 20, JSON.stringify(r.wrongZone)); assert.ok(r.wrongZone[2].some(x => /intensity/i.test(x)));
  assert.equal(r.drift.cardiac, 50, "8 % decoupling is 50"); assert.ok(r.evenI[1].consistency >= 95 && r.fadeI.consistency < 70 && r.ragI.consistency < 60, JSON.stringify([r.evenI[1], r.fadeI, r.ragI]));
  assert.ok(r.evenI[1].pacing === undefined, "interval sessions are judged on their reps, not on steady pacing"); assert.deepEqual(app.errors, []);
});

test("M11g intervals.icu: opening a synced run downloads its whole recording once, analyses it (splits, best efforts, drift, zones, reps), saves it with the session and scores pacing; a refusal is explained and not retried", async () => {
  app = await H.startApp({ dir, seed: SC_SEED(), viewport: H.VIEWPORTS.phone });
  const r = await app.page.evaluate(async () => { FIT().run.lthrManual = 170; S.settings.intervals = { ...(S.settings.intervals || {}), key: "k-test", athlete: "i1" }; DATA_V++;
    const t = todayISO(), N = 2401, time = [], dist = [], hr = [], alt = []; for (let i = 0; i < N; i++) { time.push(i); dist.push(i * 3.3333); hr.push(130 + Math.round(i / 2400 * 8)); alt.push(i / 120); }
    const calls = []; const real = window.fetch; let refuse = false;
    window.fetch = async (url, o) => { url = String(url); calls.push([url.replace(/^.*api\/v1/, ""), o?.headers?.Authorization ? "auth" : ""]);
      if (/streams\.json/.test(url)) return refuse ? { ok: false, status: 404, json: async () => ({}) } : { ok: true, status: 200, json: async () => [{ type: "time", data: time }, { type: "distance", data: dist }, { type: "heartrate", data: hr }, { type: "altitude", data: alt }] };
      if (/\/intervals/.test(url)) return { ok: true, status: 200, json: async () => ({ icu_intervals: [] }) }; return real(url, o); };
    mutateLog(t, d => { d.workouts = [{ sport: FIT().runSport, min: 40, km: 8, hr: 144, rpe: 3, int: "Light", ext: "icu-a-777", src: "intervals", note: "Easy run" }]; d.planned = [{ sport: FIT().runSport, min: 40, int: "Light", note: "Easy run" }]; }); DATA_V++;
    UI.tab = "today"; render(); openSheet("wo", { r: woResolve({ dataset: { date: t, i: "0" } }) }); await new Promise(r => setTimeout(r, 1800));
    const sess = (logGet(t).wsess || []).find(x => x.id === logGet(t).workouts[0].sid), txt = document.querySelector(".sheet")?.innerText.replace(/\s+/g, " ") || "";
    const out = { calls: calls.map(c => c[0].split("?")[0]), auth: calls.every(c => c[1] === "auth" || !/streams/.test(c[0])), an: sess?.an && { km: sess.an.spl.length, sec: sess.an.sec, best: sess.an.best.k1, z: !!sess.an.z, dec: sess.an.dec }, hasAnalysis: !!document.querySelector(".sheet .an"), hasPacing: /Pacing/.test(txt), score: document.querySelector(".sheet .sc-n")?.textContent, body: /splits/i.test(txt) && /Best efforts/.test(txt) };
    closeSheet(); calls.length = 0; openSheet("wo", { r: woResolve({ dataset: { date: t, i: "0" } }) }); await new Promise(r => setTimeout(r, 700)); out.again = calls.length;
    // a second run that intervals.icu refuses
    refuse = true; mutateLog(addDays(t, -1), d => { d.workouts = [{ sport: FIT().runSport, min: 30, km: 5, hr: 140, ext: "icu-a-888", src: "intervals", note: "Other" }]; }); DATA_V++; const y = addDays(t, -1);
    closeSheet(); calls.length = 0; openSheet("wo", { r: woResolve({ dataset: { date: y, i: "0" } }) }); await new Promise(r => setTimeout(r, 900)); const m1 = document.querySelector(".sheet")?.innerText.replace(/\s+/g, " ") || ""; closeSheet(); openSheet("wo", { r: woResolve({ dataset: { date: y, i: "0" } }) }); await new Promise(r => setTimeout(r, 600));
    out.refused = [calls.filter(c => /streams/.test(c[0])).length, /doesn't share|Strava|analys/i.test(m1)]; window.fetch = real; return out; });
  assert.deepEqual(r.calls.filter(c => /streams/.test(c)).length, 1, JSON.stringify(r.calls)); assert.ok(r.auth); assert.ok(r.an && r.an.km === 7 && r.an.sec === 2400 && Math.abs(r.an.best - 300) <= 1 && r.an.z && r.an.dec != null, JSON.stringify(r.an));
  assert.ok(r.hasAnalysis && r.hasPacing && r.body, JSON.stringify([r.hasAnalysis, r.hasPacing, r.body])); assert.ok(+r.score >= 80, `score ${r.score}`); assert.equal(r.again, 0, "analysed once: nothing is downloaded again");
  assert.deepEqual(r.refused, [1, true], "a refusal is asked once and explained"); assert.deepEqual(app.errors, []);
});

/* ---------- M11g Lab: the numbers a nerd wants, from what is logged, each with a hand-checked formula ---------- */
test("M11g Lab numbers: Foster monotony and strain, intensity distribution, weight slope with R² and noise, calorie adherence, run efficiency trend, best efforts across runs — hand-computed", async () => {
  app = await H.startApp({ dir, seed: SC_SEED(), viewport: H.VIEWPORTS.phone });
  const r = await app.page.evaluate(() => { const t = todayISO(), sp = FIT().runSport, L = d => addDays(t, -d);
    const loads = [100, 200, 0, 300, 100, 200, 100]; loads.forEach((v, i) => { if (v) mutateLog(L(6 - i), d => { d.workouts = [{ sport: strengthSport(), min: v, rpe: 1, int: i === 1 ? "Hard" : i === 3 ? "Moderate" : "Light" }]; }); });
    for (let i = 0; i < 14; i++) mutateLog(L(13 - i), d => { d.weight = 80 - 0.05 * i; });                    // an exact line down 0.35 kg a week
    for (let i = 0; i < 10; i++) { const d = L(i + 10); mutateLog(d, x => { x.kcal = Math.round(targetsFor(d).kcal * (i < 7 ? 0.95 : 1.3)); }); }  // 7 days on target, 3 well above
    for (const [k, hr] of [[10, 140], [17, 140], [24, 140], [50, 143], [57, 143], [64, 143]]) mutateLog(L(k), d => { d.workouts = [...(d.workouts || []), { sport: sp, min: 48, km: 8, hr, int: "Light", rpe: 3 }]; });   // EF 1.190 now, 1.166 before
    mutateLog(L(12), d => { d.wsess = [{ id: "b1", name: "x", min: 40, an: { v: 1, sec: 2400, m: 8000, best: { k1: 290, k5: 1500 }, spl: [], h: [1, 1] } }]; d.workouts = [...(d.workouts || []), { sport: sp, min: 40, km: 8, sid: "b1" }]; });
    mutateLog(L(40), d => { d.wsess = [{ id: "b2", name: "y", min: 40, an: { v: 1, sec: 2400, m: 8000, best: { k1: 281, k5: 1530 }, spl: [], h: [1, 1] } }]; d.workouts = [{ sport: sp, min: 40, km: 8, sid: "b2" }]; });
    DATA_V++; return labData(); });
  const wk = r.load.now; assert.equal(wk.load, 1000); assert.ok(Math.abs(wk.mono - 1.464) < 0.005, `monotony ${wk.mono}`); assert.ok(Math.abs(wk.strain - 1464) < 6, `strain ${wk.strain}`);
  assert.deepEqual([r.dist.light, r.dist.mod, r.dist.hard], [644, 340, 200], "minutes by intensity over the last 28 days"); assert.equal(Math.round(r.dist.lightPct), 54);
  assert.ok(Math.abs(r.weight.perWeek - -0.35) < 0.005 && r.weight.r2 > 0.999 && r.weight.sd < 0.001 && r.weight.n === 14, JSON.stringify(r.weight));
  assert.equal(r.nutri.n, 10); assert.equal(r.nutri.adh, 70, "7 of 10 days within ±10 % of the target");
  assert.ok(r.ef.n1 === 3 && r.ef.n2 === 3 && Math.abs(r.ef.recent - 8000 / 48 / 140) < 0.001 && Math.abs(r.ef.d - ((8000 / 48 / 140) / (8000 / 48 / 143) - 1) * 100) < 0.01, JSON.stringify(r.ef));
  assert.equal(r.best.k1.sec, 281); assert.equal(r.best.k5.sec, 1500); assert.deepEqual(app.errors, []);
});

test("M11g Lab on screen: Progress › Lab has the sections, each says what it needs when data is missing, and nothing overflows on phone, tablet and PC", async () => {
  for (const vp of [H.VIEWPORTS.phone, H.VIEWPORTS.tablet, H.VIEWPORTS.desktop]) {
    app = await H.startApp({ dir, seed: SC_SEED(), viewport: vp });
    const r = await app.page.evaluate(() => { UI.tab = "progress"; UI.progSeg = "lab"; render(); const heads = [...document.querySelectorAll("main .section-h h2")].map(h => h.textContent), txt = document.querySelector("main").innerText;
      return { heads, needs: /needs|Needs/.test(txt), over: document.documentElement.scrollWidth > innerWidth + 1, tab: !!document.querySelector('[data-act="prog-seg"][data-k="lab"]') }; });
    assert.ok(r.tab); assert.deepEqual(r.heads.slice(0, 5), ["Training load", "Running", "Strength", "Body", "Food and recovery"]); assert.ok(r.needs, "empty sections say what they need"); assert.equal(r.over, false); assert.deepEqual(app.errors, []); await app.close(); app = null;
  }
});

test("photos: when the cloud folder is missing the section explains the fix in three steps, shows the real error, and «Copy the SQL» puts the folder setup on the clipboard", async () => {
  app = await H.startApp({ dir, seed: F.seed({ withPlan: false }), viewport: H.VIEWPORTS.phone });
  const r = await app.page.evaluate(async () => { await IDB.put("ph-q", new Blob(["x"], { type: "image/jpeg" })); S.body.photos = [{ id: "ph-q", date: todayISO(), pose: "front" }]; DATA_V++;
    window.ENGINE.sb = { storage: { from: () => ({ upload: async () => ({ error: { message: "new row violates row-level security policy" } }), download: async () => ({ data: null }) }) } }; window.ENGINE.uid = "u7"; await photosSync();
    UI.tab = "progress"; UI.progSeg = "body"; render(); let copied = ""; Object.defineProperty(navigator, "clipboard", { value: { writeText: async t => { copied = t; } }, configurable: true });
    const box = document.querySelector(".pp-sync"), txt = box?.innerText.replace(/\s+/g, " ") || ""; ACT["pp-sql"](); await new Promise(r => setTimeout(r, 200)); return { txt: box?.textContent.replace(/\s+/g, " "), btn: !!box?.querySelector('[data-act="pp-sql"]'), copied };
  });
  assert.match(r.txt, /not set up/); assert.match(r.txt, /SQL Editor/); assert.match(r.txt, /row-level security/); assert.ok(r.btn);
  assert.match(r.copied, /insert into storage\.buckets .*'progress'/); assert.equal((r.copied.match(/create policy/g) || []).length, 4); assert.deepEqual(app.errors, []);
});

/* ---------- PDF recap ---------- */
const { spawnSync } = require("child_process"), fs = require("fs"), os = require("os"), path = require("path");
const pdfText = (b64) => { const f = path.join(os.tmpdir(), `engine-pdf-${process.pid}-${Date.now()}.pdf`); fs.writeFileSync(f, Buffer.from(b64, "base64")); const r = spawnSync("pdftotext", ["-layout", f, "-"], { encoding: "utf8" }), info = spawnSync("pdfinfo", [f], { encoding: "utf8" }); fs.unlinkSync(f); return { ok: r.status === 0, text: r.stdout || "", err: r.stderr || "", pages: +((info.stdout || "").match(/Pages:\s+(\d+)/) || [])[1] || 0 }; };
test("PDF recap: a valid A4 PDF (opens in a real reader), real text with the score, parts, analysis, splits; a strength session lists its sets; every «PDF recap» button saves a .pdf", async () => {
  if (spawnSync("pdftotext", ["-v"]).error) return;      // no PDF reader on this machine: the check is skipped, not passed silently
  app = await H.startApp({ dir, seed: SC_SEED(), viewport: H.VIEWPORTS.phone });
  const r = await app.page.evaluate(async () => { FIT().run.lthrManual = 170; DATA_V++; const t = todayISO(), sp = FIT().runSport, st = strengthSport();
    const an = { v: 1, sec: 3012, el: 3140, m: 10020, hr: 152.4, hx: 171, up: 64, dn: 61, len: 1000, rem: [20, 6], best: { k1: 281, m1: 455.2, k5: 1471, k10: 3012 }, ef: 1.32, cost: 764, dec: 4.8, h: [300, 303], z: [220, 1300, 1100, 392, 0, 0, 0], spl: Array.from({ length: 10 }, (_, i) => [312 - i * 2, 141 + i * 2, 5]), laps: [["W", 240, 960, 172, 4], ["R", 120, 300, 130, 2.5], ["W", 240, 950, 173, 3.96]] };
    mutateLog(t, d => { d.workouts = [{ sport: sp, min: 50, km: 10, hr: 152, rpe: 6, int: "Moderate", sid: "r1", note: "Steady 10k – ré", ext: "icu-a-1" }, { sport: st, min: 40, rpe: 8, int: "Hard", sid: "s1", note: "Pulls" }]; d.planned = [{ sport: sp, min: 50, int: "Moderate", note: "Steady 10k – ré" }];
      d.wsess = [{ id: "r1", name: "Steady 10k", min: 50, rpe: 6, an, note: "Felt good (really)" }, { id: "s1", name: "Pulls", min: 40, rpe: 8, plan: { u: 4, r: 24 }, pb: ["Pull-up 8 reps"], sets: [1, 2, 3, 4].map(i => ({ ex: "Pull-up", round: i, rounds: 4, reps: [6], load: 10, rir: 2 })) }]; }); DATA_V++;
    const b64 = async blob => { const buf = new Uint8Array(await blob.arrayBuffer()); let s = ""; for (const x of buf) s += String.fromCharCode(x); return btoa(s); };
    const run = await b64(workoutPdf(t, logGet(t).workouts[0])), str = await b64(workoutPdf(t, logGet(t).workouts[1]));
    let saved = null; Sync.downloads = { save: async o => { saved = [o.filename, o.data.type, o.data.size]; return { status: "saved" }; } }; await ACT["wo-pdf"]({ dataset: { date: t, wi: "0" } });
    return { run, str, saved, w: pdfWidth("Hello", 10), latin: pdfLatin("a − b · c × d ≈ é “x” …") }; });
  const A = pdfText(r.run), B = pdfText(r.str);
  assert.ok(A.ok, A.err); assert.ok(A.pages >= 1); for (const x of ["ENGINE", "Steady 10k", "Score", "Execution", "Intensity", "Reps", "Analysis of the recording", "Best efforts", "Time in heart-rate zones", "Intervals", "splits", "4:41", "5:01 /km", "Felt good"]) assert.ok(A.text.includes(x), `run PDF has «${x}»`);
  assert.ok(B.ok, B.err); for (const x of ["Pulls", "Sets", "Pull-up", "6+6".slice(0, 1), "@ +10 kg", "RIR 2", "Personal bests", "Pull-up 8 reps", "Completion"]) assert.ok(B.text.includes(x), `strength PDF has «${x}»`);
  assert.equal(r.saved[0].startsWith("engine-"), true); assert.match(r.saved[0], /\.pdf$/); assert.equal(r.saved[1], "application/pdf"); assert.ok(r.saved[2] > 1500);
  assert.ok(Math.abs(r.w - 22.78) < 0.01, "text width from the font table"); assert.equal(r.latin, "a - b \xB7 c \xD7 d ~ \xE9 \x93x\x94 \x85"); assert.deepEqual(app.errors, []);
});

/* ---------- M11h Level: where you stand on a hard fixed scale, and when you reach the next one ---------- */
test("M11h level maths: position on the scale (times in log, reps and ratios linear), names between levels, sex, beyond elite, below beginner — hand-computed", async () => {
  app = await H.startApp({ dir, seed: SC_SEED(), viewport: H.VIEWPORTS.phone });
  const r = await app.page.evaluate(() => { const run = (km, mmss, sex = "Male") => { FIT().profile.sex = sex; const [m, s] = mmss.split(":").map(Number); return lvEq5Pos(km, m * 60 + s, sex); };
    const out = { i: run(5, "22:41"), a: run(5, "20:00"), e: run(5, "17:30"), under: run(5, "16:30"), low: run(5, "30:00"), f: run(5, "27:19", "Female"), fm: run(5, "27:19", "Male"), tenk: run(10, "41:30"),
      reps: [lvPos(13, LV_REPS.pull, "lin"), lvPos(18, LV_REPS.pull, "lin"), lvPos(0, LV_REPS.pull, "lin")], hold: lvPos(30, LV_HOLD.handstand, "log"), pct: [0, 0.5, 2, 2.5, 3, 5.4].map(lvPct), names: [1, 3.0, 3.1, 3.5, 3.9, 5.2, 0.4].map(p => lvLabel(p)) }; FIT().profile.sex = "Male"; return out; });
  const near = (a, b, t = 0.012) => Math.abs(a - b) <= t;
  /* hard setting: Running Level lines read one band up, so 22:41 (their median) is only the Novice line = 2.0 */
  assert.ok(near(r.i.p, 2.0, 0.004), `22:41 is the Novice line (${r.i.p})`); assert.ok(near(r.a.p, 2.915, 0.01), `20:00 → 2.915 = 2 + ln(1361/1200) / ln(1361/1186) (${r.a.p})`); assert.ok(near(r.e.p, 4.0, 0.004), "17:30 is the Advanced line");
  assert.ok(r.under.p > 4 && r.under.p < 5 && near(r.under.p, 4.481, 0.01), `16:30 → 4.481 (${r.under.p})`); assert.ok(r.low.p < 1 && near(r.low.p, 0.110, 0.01), `30:00 is below Beginner (${r.low.p})`);
  assert.ok(near(r.f.p, 2.0, 0.004), "women's scale: 27:19 is the Novice line"); assert.ok(r.fm.p < 1 && near(r.fm.p, 0.744, 0.01), `the same time on the men's scale is below Beginner (${r.fm.p})`);
  assert.ok(near(r.tenk.eq5, 1200, 12), `41:30 over 10 km is worth about a 20:00 5K (${r.tenk.eq5})`);
  assert.deepEqual(r.reps.map(x => Math.round(x * 1000) / 1000), [2.6, 3.429, 0]); assert.ok(near(r.hold, 2.585, 0.001), `handstand 30 s on 10/20/40/75/120 = ${r.hold}`);
  assert.deepEqual(r.pct, [0, 10, 50, 65, 80, 99], "the lines sit at the 20th, 50th, 80th, 95th and 99th percentile");
  assert.deepEqual(r.names, ["Beginner", "Intermediate", "Intermediate", "Intermediate → Advanced 50%", "Intermediate → Advanced 90%", "Elite", "Starter → Beginner 40%"]);
  assert.deepEqual(app.errors, []);
});

test("M11h level inputs: runner from the best result of the last year (any distance, 5K-equivalent); calisthenics Strength from weighted pull-up and dip 1RM as % of body weight, Endurance from max reps, Skills from holds and lever stages — each discipline averages what it has", async () => {
  app = await H.startApp({ dir, seed: SC_SEED(), viewport: H.VIEWPORTS.phone });
  const r = await app.page.evaluate(() => { const t = todayISO(), L = d => addDays(t, -d), bw = 80; S.body.w = { [L(300)]: bw, [L(30)]: bw, [t]: bw }; DATA_V++;
    S.train.tests = [{ id: "t1", date: L(40), kind: "Race", km: 10, sec: 41 * 60 + 30 }, { id: "t2", date: L(500), kind: "Race", km: 5, sec: 16 * 60 }];       // the 16:00 5K is older than a year: not counted
    S.train.topSets = [{ date: L(20), ex: "Weighted pull-up", kg: 30, reps: 5, rir: 0, bw }, { date: L(25), ex: "Dip", kg: 40, reps: 5, rir: 0, bw }, { date: L(30), ex: "Squat", kg: 100, reps: 5, rir: 0, bw }];
    S.train.calis = [{ id: "c1", date: L(15), ex: "Pull-up", test: "Max reps (BW)", val: 13, bw }, { id: "c2", date: L(15), ex: "Dip", test: "Max reps (BW)", val: 20, bw }, { id: "c3", date: L(10), ex: "Handstand", test: "Hold (s)", val: 30, bw },
      { id: "c4", date: L(10), ex: "Adv tuck front lever", test: "Hold (s)", val: 12, bw }, { id: "c5", date: L(10), ex: "Front lever", test: "Hold (s)", val: 6, bw }, { id: "c6", date: L(10), ex: "Straddle planche", test: "Hold (s)", val: 3, bw }, { id: "c7", date: L(500), ex: "Push-up", test: "Max reps (BW)", val: 60, bw }];
    const R = lvRunner(t), C = lvCalis(t), single = x => Math.round(x * 1000) / 1000;
    return { run: [single(R.p), Math.round(R.eq5), R.best.km, R.n], s: C.strength && { p: single(C.strength.p), m: C.strength.items.map(i => [i.k, single(i.p), Math.round(i.v * 10) / 10]) }, e: C.endurance && { p: single(C.endurance.p), m: C.endurance.items.map(i => [i.k, single(i.p)]) }, k: C.skills && { p: single(C.skills.p), m: C.skills.items.map(i => [i.k, single(i.p)]) }, all: single(C.overall) }; });
  assert.equal(r.run[2], 10); assert.equal(r.run[3], 1, "only the 10 km result counts"); assert.ok(Math.abs(r.run[1] - 1200) <= 12);
  const sp = r.s.m.find(m => m[0] === "pull"), sd = r.s.m.find(m => m[0] === "dip"); assert.deepEqual(r.s.m.length, 2, "squat is not a calisthenics lift here");
  assert.ok(Math.abs(sp[2] - 60.4) < 0.1 && Math.abs(sp[1] - 2.494) < 0.01, JSON.stringify(sp));                    // e1RM +48.33 kg = 60.4 % of 80 kg: 2 + (60.4 - 42.5) / (78.75 - 42.5)
  assert.ok(Math.abs(sd[2] - 75) < 0.1 && Math.abs(sd[1] - 2.286) < 0.01, JSON.stringify(sd)); assert.ok(Math.abs(r.s.p - (sp[1] + sd[1]) / 2) < 0.002);
  const ep = r.e.m.find(m => m[0] === "pull"), ed = r.e.m.find(m => m[0] === "dip"); assert.equal(ep[1], 2.6, "13 strict pull-ups are only between Novice and Intermediate"); assert.equal(ed[1], 2.5); assert.equal(r.e.m.length, 2, "a push-up record older than a year is not counted");
  const hs = r.k.m.find(m => m[0] === "handstand"), fl = r.k.m.find(m => m[0] === "frontlever"), pl = r.k.m.find(m => m[0] === "planche"), mu = r.k.m.find(m => m[0] === "muscleup"), ls = r.k.m.find(m => m[0] === "lsit");
  assert.ok(Math.abs(hs[1] - 2.585) < 0.001); assert.ok(Math.abs(fl[1] - 1.8) < 0.001, `adv tuck 12 s = 1 + (2 - 1) × 12/15 (${fl[1]})`); assert.ok(Math.abs(pl[1] - 2.3) < 0.001, "straddle planche 3 s = 2 + (3.5 - 2) × 3/15");
  assert.equal(mu[1], 0, "no muscle-up logged counts as 0"); assert.equal(ls[1], 0); assert.equal(r.k.m.length, 5); assert.ok(Math.abs(r.k.p - (2.585 + 1.8 + 2.3) / 5) < 0.002, `skills = mean of the five benchmarks (${r.k.p})`);
  assert.ok(Math.abs(r.all - (r.s.p + r.e.p + r.k.p) / 3) < 0.002); assert.ok(r.all < 3, "this athlete is not Intermediate"); assert.deepEqual(app.errors, []);
});

test("M11h insights: push vs pull, strength vs endurance, long vs short running, strong points, hand-built cases", async () => {
  app = await H.startApp({ dir, seed: SC_SEED(), viewport: H.VIEWPORTS.phone });
  const r = await app.page.evaluate(() => { const t = todayISO(), L = d => addDays(t, -d), bw = 80; S.body.w = { [L(300)]: bw, [t]: bw }; DATA_V++;
    S.train.tests = [{ id: "a", date: L(30), kind: "Race", km: 5, sec: 19 * 60 }, { id: "b", date: L(60), kind: "Race", km: 21.0975, sec: 2 * 3600 + 10 * 60 }];
    S.train.topSets = []; S.train.calis = [{ id: "c1", date: L(10), ex: "Push-up", test: "Max reps (BW)", val: 60, bw }, { id: "c2", date: L(10), ex: "Dip", test: "Max reps (BW)", val: 30, bw }, { id: "c3", date: L(10), ex: "Pull-up", test: "Max reps (BW)", val: 8, bw }];
    const R = lvRunner(t), C = lvCalis(t), I = lvInsights(R, C); return { I: I.map(i => i.k + ": " + i.t), ep: C.endurance.items.map(i => [i.k, Math.round(i.p * 1000) / 1000]), sp: R.by.short?.p, hp: R.by.half?.p }; });
  assert.deepEqual(r.ep.sort(), [["dip", 3.5], ["pull", 1.6], ["push", 3.5]].sort(), "dip 30 on 8/15/25/35/50 = 3.5, push-up 60 on 20/35/50/70/90 = 3.5, pull-up 8 on 5/10/15/22/30 = 1.6");
  assert.ok(r.I.some(x => /^work: You push better than you pull: push Intermediate → Advanced 50%, pull Beginner → Novice 60%/.test(x)), r.I.join("\n"));
  assert.ok(r.hp < r.sp - 0.4 && r.I.some(x => /^work: Your long race lags your short ones/.test(x)), `half marathon ${r.hp} vs 5K ${r.sp}: ${r.I.join(" | ")}`);
  assert.ok(r.I.some(x => /^good: Strong point: (Dip|Push-up) is Intermediate → Advanced 50%, 0\.6 levels above your overall/.test(x)), "3.5 against the overall mean of 2.87: " + r.I.join(" | ")); assert.deepEqual(app.errors, []);
});

test("M11h time to the next level: least-squares slope of the level over the last 12 months with its error; no promise when it is flat, short or going down", async () => {
  app = await H.startApp({ dir, seed: SC_SEED(), viewport: H.VIEWPORTS.phone });
  const r = await app.page.evaluate(() => { const t = todayISO(), pts = (a) => a.map((p, i) => ({ d: addDays(t, -(a.length - 1 - i) * 30), p }));
    return { up: lvEta(pts([2.0, 2.1, 2.2, 2.3, 2.4]), 2.4), flat: lvEta(pts([2.4, 2.4, 2.41, 2.4, 2.4]), 2.4), down: lvEta(pts([2.8, 2.6, 2.5, 2.4, 2.3]), 2.3), short: lvEta(pts([2.0, 2.2, 2.4]), 2.4), noisy: lvEta(pts([2.0, 2.5, 2.1, 2.6, 2.2, 2.7]), 2.7), elite: lvEta(pts([5.1, 5.2, 5.3, 5.4]), 5.4) }; });
  assert.ok(r.up && Math.abs(r.up.months - 5.9) < 0.15 && r.up.lo < r.up.months && r.up.hi > r.up.months && r.up.next === "Advanced" || r.up.next === "Intermediate", JSON.stringify(r.up));
  assert.equal(r.up.next, "Intermediate", "from 2.4 the next line is 3 = Intermediate"); assert.ok(Math.abs(r.up.slope - 0.1015) < 0.002);
  assert.equal(r.flat, null); assert.equal(r.down, null); assert.equal(r.short, null); assert.ok(r.noisy === null || r.noisy.hi > 2 * r.noisy.months || r.noisy.hi === Infinity, "a noisy history gives a wide range, not a precise date"); assert.equal(r.elite, null, "nothing above elite");
  assert.deepEqual(app.errors, []);
});

test("M11h Level screen: Progress › Level shows runner and the three calisthenics areas with the next line and the time estimate; empty user sees what is needed; no sideways scroll", async () => {
  for (const vp of [H.VIEWPORTS.phone, H.VIEWPORTS.desktop]) {
    app = await H.startApp({ dir, seed: SC_SEED(), viewport: vp });
    const r = await app.page.evaluate(() => { const t = todayISO(), L = d => addDays(t, -d), bw = 80; S.body.w = { [L(300)]: bw, [t]: bw }; DATA_V++;
      S.train.tests = [{ id: "a", date: L(300), kind: "Race", km: 10, sec: 46 * 60 }, { id: "b", date: L(150), kind: "Race", km: 10, sec: 44 * 60 }, { id: "c", date: L(20), kind: "Race", km: 10, sec: 41 * 60 + 30 }];
      S.train.topSets = [{ date: L(20), ex: "Weighted pull-up", kg: 30, reps: 5, rir: 0, bw }];
      S.train.calis = [{ id: "c1", date: L(15), ex: "Pull-up", test: "Max reps (BW)", val: 13, bw }, { id: "c3", date: L(10), ex: "Handstand", test: "Hold (s)", val: 30, bw }];
      UI.tab = "progress"; UI.progSeg = "level"; render(); const el = document.querySelector(".lab-wrap"); return { txt: el ? el.textContent : "", sw: document.documentElement.scrollWidth, vw: innerWidth }; });
    assert.ok(/Runner/.test(r.txt) && /Calisthenics/.test(r.txt) && /Strength/.test(r.txt) && /Endurance/.test(r.txt) && /Skills/.test(r.txt), r.txt.slice(0, 200));
    assert.ok(/5K equivalent/.test(r.txt) && /Intermediate is a 5K equivalent of/.test(r.txt), "runner: the next line is named with the time to reach it");
    assert.ok(/Weighted pull-up/.test(r.txt) && /Handstand/.test(r.txt) && /Pull-up/.test(r.txt)); assert.ok(r.sw <= r.vw + 1, `no sideways scroll (${r.sw} > ${r.vw})`);
    assert.ok(/pace of the last year/.test(r.txt), "a clear improvement over the year gives a time estimate");
    assert.deepEqual(app.errors, []); await app.close(); app = null;
  }
  app = await H.startApp({ dir, seed: { settings: { onboarded: true } }, viewport: H.VIEWPORTS.phone });
  const e = await app.page.evaluate(() => { UI.tab = "progress"; UI.progSeg = "level"; render(); return document.querySelector(".lab-wrap").textContent; });
  assert.ok(/Needs a race/.test(e) && /Needs a max-reps test/.test(e), e.slice(0, 200)); assert.deepEqual(app.errors, []);
});

/* ---------- M11h Goals page: history that does not forget, counts, by sport ---------- */
test("M11h goals: the day a goal is reached is kept for good (history, counts, average time, by sport) even if the number slips back", async () => {
  app = await H.startApp({ dir, seed: SC_SEED(), viewport: H.VIEWPORTS.phone });
  const r = await app.page.evaluate(() => { const t = todayISO(), L = d => addDays(t, -d), ca = (id, d, ex, test, val) => ({ id, date: d, ex, test, val, bw: 80 });
    mutateLog(L(40), day => { day.bf = 18; }); mutateLog(L(3), day => { day.bf = 14.5; });
    S.train.calis = [ca("a", L(80), "Pull-up", "Max reps (BW)", 8), ca("b", L(30), "Pull-up", "Max reps (BW)", 12), ca("c", L(50), "Handstand", "Hold (s)", 20), ca("d", L(5), "Handstand", "Hold (s)", 35), ca("e", L(5), "Dip", "Max reps (BW)", 10)];
    S.train.goals = [{ id: "g1", kind: "reps", ex: "Pull-up", target: 12, start: L(100), startVal: 6 }, { id: "g2", kind: "hold", ex: "Handstand", target: 30, start: L(60), startVal: 20 }, { id: "g3", kind: "reps", ex: "Dip", target: 30, start: L(10), startVal: 10 }, { id: "g4", kind: "bf", target: 15, start: L(40), startVal: 18 }];
    DATA_V++; const St = goalStats(), first = S.train.goals.map(g => g.doneOn || null);
    S.train.calis.push(ca("f", t, "Pull-up", "Max reps (BW)", 5)); DATA_V++;            // the number slips back: it stays reached
    const St2 = goalStats(); UI.tab = "progress"; UI.progSeg = "goals"; render(); const el = document.querySelector("main") || document.body;
    return { first, L1: L(30), L2: L(5), L4: L(3), n: [St.done.length, St.open, St.all], by: St.by.map(b => [b.name, b.done, b.total]), avg: St.avgDays, n2: [St2.done.length, St2.open], year: St.done.filter(x => x.on.slice(0, 4) === t.slice(0, 4)).length, txt: el.textContent, sw: document.documentElement.scrollWidth, vw: innerWidth, saved: JSON.stringify(S.train.goals).includes("doneOn") }; });
  assert.deepEqual(r.first, [r.L1, r.L2, null, r.L4], "g1 12 pull-ups on day −30, g2 handstand 35 s on day −5, g3 not yet, g4 body fat 14.5% on day −3");
  assert.deepEqual(r.n, [3, 1, 4]); assert.deepEqual(r.by, [["Calisthenics", 2, 3], ["Body", 1, 1]]); assert.ok(Math.abs(r.avg - 54) < 0.01, `average of 70, 55 and 37 days (${r.avg})`);
  assert.deepEqual(r.n2, [3, 1], "slipping back to 5 pull-ups does not un-reach the goal"); assert.ok(r.saved);
  assert.ok(/Reached/.test(r.txt) && /2 of 3/.test(r.txt) && /1 of 1/.test(r.txt) && /54 d/.test(r.txt) && /75%/.test(r.txt), r.txt.slice(0, 400)); assert.ok(r.sw <= r.vw + 1); assert.deepEqual(app.errors, []);
});

/* ---------- M11h many photos: paged and grouped by month, quick comparisons, the reminder next to them ---------- */
test("M11h photos: 50 days of photos show 6 at a time grouped by month, 12 more per tap, quick comparisons pick the right dates, the reminder (monthly by default) is switchable and its interval is a choice", async () => {
  app = await H.startApp({ dir, seed: SC_SEED(), viewport: H.VIEWPORTS.phone });
  const r = await app.page.evaluate(() => { const t = todayISO(); S.body.photos = []; for (let i = 0; i < 50; i++) for (const pose of ["front", "side", "back"]) S.body.photos.push({ id: `ph${i}${pose}`, date: addDays(t, -i * 8), pose });
    DATA_V++; UI.tab = "progress"; UI.progSeg = "body"; UI.ppShow = 0; render();
    const days = () => document.querySelectorAll(".pp-day").length, months = () => document.querySelectorAll(".pp-mo").length, o = { d0: days(), m0: months(), imgs: document.querySelectorAll(".pp-day img[data-ph]").length, more: document.querySelector(".pp-more")?.textContent };
    ACT["pp-more"](); render(); o.d1 = days(); ACT["pp-more"](); render(); o.d2 = days();
    UI.ppPose = "front"; ACT["pp-preset"]({ dataset: { k: "first" } }); o.first = [UI.ppCmp.a, UI.ppCmp.b]; ACT["pp-preset"]({ dataset: { k: "3m" } }); o.m3 = [UI.ppCmp.a, UI.ppCmp.b]; ACT["pp-preset"]({ dataset: { k: "1y" } }); o.y1 = [UI.ppCmp.a, UI.ppCmp.b];
    o.t = t; o.sel = [...document.querySelectorAll('.ck-sel')].map(e => e.value); o.rem = document.querySelector(".pp-rem")?.textContent.replace(/\s+/g, " ");
    CHG["ck-every"]("60", { dataset: { k: "photo" } }); o.after = checkList().find(c => c.k === "photo").every; ACT["ck-toggle"]({ dataset: { k: "photo" } }); o.on = checkList().find(c => c.k === "photo").on; return o; });
  assert.equal(r.d0, 6); assert.ok(r.m0 >= 2, "grouped by month once there are more than 8 days"); assert.equal(r.imgs, 18, "only the shown days load pictures: 6 days × 3 poses"); assert.match(r.more, /Show 12 older of 44/);
  assert.equal(r.d1, 18); assert.equal(r.d2, 30);
  const day = n => { const d = new Date(r.t + "T12:00:00"); d.setDate(d.getDate() - n); return d.toLocaleDateString("sv-SE"); };
  assert.deepEqual(r.first, [day(49 * 8), day(0)]); assert.deepEqual(r.m3, [day(88), day(0)], "91 days back: the day 88 is the closest set (11 × 8)"); assert.deepEqual(r.y1, [day(368), day(0)], "365 days back: the day 368 (46 × 8) is closest, 360 is 5 away and 368 is 3");
  assert.ok(/Next|Due|Starts/.test(r.rem), r.rem); assert.equal(r.after, 60); assert.equal(r.on, false); assert.deepEqual(app.errors, []);
});

/* ---------- M11h Energy battery: two-process sleep pressure + recovery adjustment − training fatigue; every number below was computed separately by hand ---------- */
const BT_SET = (extra = "") => `const t = todayISO(); S.settings.sleep = { target: 7.5, wake: "07:00" }; for (let i = -1; i <= 40; i++) mutateLog(addDays(t, -i), d => { d.sleep = 8; d.hrv = null; d.rhr = null; d.nap = null; d.napAt = null; d.workouts = []; d.planned = []; }); ${extra}; DATA_V++;`;
test("M11h battery maths: steady 8 h nights give 90.72 at wake, 68.93 at noon and 37.66 at bedtime; one short night, a month of 5 h nights and a nap follow the two-process model", async () => {
  app = await H.startApp({ dir, seed: SC_SEED(), viewport: H.VIEWPORTS.phone });
  const r = await app.page.evaluate(`(() => { ${BT_SET()}
    const e = (d = t) => { const c = btCtx(d); return [c.E(7), c.E(12), c.E(15), c.E(23)].map(x => Math.round(x * 100) / 100); }, steady = e(), night = [btCtx(t).E(27), btCtx(t).E(31)];
    mutateLog(t, d => { d.sleep = 5; }); DATA_V++; const one = btCtx(t).E(7);
    for (let i = -1; i <= 40; i++) mutateLog(addDays(t, -i), d => { d.sleep = 5; }); DATA_V++; const five = btCtx(t).E(7), fiveBed = btCtx(t).bed;
    for (let i = -1; i <= 40; i++) mutateLog(addDays(t, -i), d => { d.sleep = 8; }); mutateLog(t, d => { d.nap = 30; d.napAt = "14:00"; }); DATA_V++; const nap = e();
    return { steady, night, one, five, fiveBed, nap }; })()`);
  const near = (a, b, t = 0.02) => assert.ok(Math.abs(a - b) <= t, `${a} vs ${b}`);
  near(r.steady[0], 90.72); near(r.steady[1], 68.93); near(r.steady[3], 37.66); near(r.steady[2], 58.45, 0.02);
  near(r.night[0], 75.95, 0.02); near(r.night[1], 90.72, 0.02);   // asleep from 23:00: pressure 0.6234 × e^(−4/4.2) after 4 h, × e^(−8/4.2) after 8 h = the morning figure
  near(r.one, 79.30, 0.02);                                   // yesterday awake 19 h, then a 5 h night: S = 0.2070
  near(r.five, 77.94, 0.02); near(r.fiveBed, 26);              // fixed point of 5 h nights: S = 0.2206; bed = 07:00 + 24 − 5 = 02:00 → 26 h
  near(r.nap[2], 64.26, 0.02); near(r.nap[3], 41.40, 0.02);    // 30 min nap at 14:00: +5.8 at 15:00 and +3.7 at bedtime
  assert.ok(r.five < r.steady[0] - 12, "a month of short nights leaves you much less charged at wake"); assert.deepEqual(app.errors, []);
});
test("M11h battery adjustments: HRV against your own 28 days (7 points per SD), resting HR above usual (0.8 per bpm), yesterday's session wears off, today's session drains while it runs, a planned one is projected", async () => {
  app = await H.startApp({ dir, seed: SC_SEED(), viewport: H.VIEWPORTS.phone });
  const r = await app.page.evaluate(`(() => { ${BT_SET("for (let i = 1; i <= 28; i++) mutateLog(addDays(t, -i), d => { d.hrv = i % 2 ? 58 : 62; d.rhr = 50; }); mutateLog(t, d => { d.hrv = 56; d.rhr = 56; })")}
    const v = btVitals(t), c = btCtx(t), a = { z: v.z, aH: v.aH, aR: v.aR, wake: c.E(7) };
    mutateLog(t, d => { d.hrv = null; d.rhr = null; }); mutateLog(addDays(t, -1), d => { d.workouts = [{ sport: "Running", min: 60, rpe: 6, at: "17:00" }]; }); DATA_V++; const y = btCtx(t); a.fatY = y.fat(7); a.D = y.ses[0].D;
    mutateLog(addDays(t, -1), d => { d.workouts = []; }); mutateLog(t, d => { d.workouts = [{ sport: "Running", min: 60, rpe: 6, at: "08:00" }]; }); DATA_V++; const s = btCtx(t); a.ramp = [s.fat(8), s.fat(8.5), s.fat(9), s.fat(11)];
    mutateLog(t, d => { d.workouts = []; d.planned = [{ sport: "Running", min: 60, rpe: 6, at: "19:00" }]; }); DATA_V++; const p = btCtx(t); a.plan = [p.ses.length, p.ses[0]?.planned, p.fat(23), p.E(23)];
    return a; })()`);
  const near = (a, b, t = 0.02) => assert.ok(Math.abs(a - b) <= t, `${a} vs ${b}`);
  near(r.z, -1.711, 0.005); near(r.aH, -11.976, 0.02); near(r.aR, -4.8); near(r.wake, 73.94, 0.02);
  near(r.D, 21.60, 0.01); near(r.fatY, 3.62, 0.01);            // load 360 vs a usual session of 250: 35 × (1 − e^(−360/375)); 25 effective hours later (11 awake + 8 asleep × 2.5 + …) × e^(−25/14)
  near(r.ramp[0], 0, 0.001); near(r.ramp[1], 10.80, 0.01); near(r.ramp[2], 21.60, 0.01); near(r.ramp[3], 21.60 * Math.exp(-2 / 14), 0.01);
  assert.equal(r.plan[0], 1); assert.equal(r.plan[1], true); near(r.plan[2], 21.60 * Math.exp(-3 / 14), 0.01);        // planned 19:00–20:00, bedtime 23:00
  assert.deepEqual(app.errors, []);
});
test("M11h battery screen: the card on Today, the sheet with the day, what moves it and the last 7 days; 'I just napped' adds a nap; the feature switch hides the card; fits phone and PC", async () => {
  for (const vp of [H.VIEWPORTS.phone, H.VIEWPORTS.desktop]) {
    app = await H.startApp({ dir, seed: SC_SEED(), viewport: vp });
    const r = await app.page.evaluate(`(() => { ${BT_SET()} UI.tab = "today"; render(); const o = { card: !!document.querySelector(".bt"), txt: document.querySelector(".bt")?.textContent || "", sw: document.documentElement.scrollWidth, vw: innerWidth };
      ACT["bt-open"](); o.sheet = document.querySelector(".sheet")?.textContent || ""; ACT["bt-nap"]({ dataset: { m: "20" } }); o.nap = [logGet(t).nap, logGet(t).napAt]; ACT["bt-nap"]({ dataset: { m: "10" } }); o.nap2 = logGet(t).nap; ACT["bt-nap"]({ dataset: { m: "0" } }); o.nap3 = logGet(t).nap;
      closeSheet(); S.settings.feat = { ...(S.settings.feat || {}), battery: false }; render(); o.off = !!document.querySelector(".bt"); return o; })()`);
    assert.ok(r.card && /Energy battery/.test(r.txt) && /at bedtime/.test(r.txt), r.txt); assert.ok(/What moves it right now/.test(r.sheet) && /Charge at wake, last 7 days/.test(r.sheet) && /I just napped/.test(r.sheet) && /two-process model/.test(r.sheet));
    assert.equal(r.nap[0], 20); assert.match(r.nap[1], /^\d\d:\d\d$/); assert.equal(r.nap2, 30, "naps add up"); assert.ok(!(r.nap3 > 0), "Clear removes the nap"); assert.equal(r.off, false); assert.ok(r.sw <= r.vw + 1);
    assert.deepEqual(app.errors, []); await app.close(); app = null;
  }
});

/* ---------- M11i Race circuits: Fire Set and Cut for the Vulcano Fitness Endurance Cup, voice per station, splits, ranking ---------- */
test("M11i race: the presets parse into stations, the clock and the voice follow each tap, splits and the final time are kept and logged as a circuit time, undo works", async () => {
  app = await H.startApp({ dir, seed: SC_SEED(), viewport: H.VIEWPORTS.phone });
  const r = await app.page.evaluate(async () => { const said = []; speechSynthesis.speak = u => said.push(u.text); speechSynthesis.cancel = () => {};
    const fire = raceList()[0], cut = raceList()[1], tf = buildTasks(raceScript(fire))[0], tc = buildTasks(raceScript(cut))[0], o = { fire: [tf.t, tf.title, tf.cap, tf.steps.map(s => s.reps + " " + s.name)], cut: [tc.t, tc.title, tc.cap, tc.steps.reduce((a, s) => a + s.reps, 0), tc.steps.length] };
    startWorkout({ script: raceScript(fire), name: raceTitle(fire.name), sport: strengthSport(), date: todayISO() }); ACT["lv-begin"](); const L = LV(); o.tasks = L.tasks.map(t => t.t);
    L.clk = { start: nowMs(), acc: 0, paused: false }; UI.tab = "live"; render(); o.view0 = document.querySelector("main")?.textContent || document.body.textContent;
    const T = [12, 41, 52, 100, 112, 125], at = i => { L.clk.start = nowMs() - T[i] * 1000; };
    at(0); ACT["lv-step"](); at(1); ACT["lv-step"](); render(); o.mid = document.body.textContent; ACT["lv-step-undo"](); o.afterUndo = [L.res[0].rounds, L.res[0].splits.slice()]; at(1); ACT["lv-step"](); at(2); ACT["lv-step"](); at(3); ACT["lv-step"](); at(4); ACT["lv-step"](); at(5); ACT["lv-step"]();
    o.said = said.filter(x => x.trim()); o.res = [L.res[0].rounds, L.res[0].splits.slice(), L.res[0].done]; o.log = (S.train.circuitLog || []).filter(c => c.circuit === "Fire Set (Open)").map(c => c.sec); o.circ = FIT().circuits.find(c => c.name === "Fire Set (Open)")?.desc;
    return o; });
  assert.deepEqual(r.fire, ["race", "Fire Set (Open)", 360, ["5 Pull-up", "10 Dip", "5 Pull-up", "20 Push-up", "5 Dip", "5 Pull-up"]]); assert.deepEqual(r.cut, ["race", "Cut · Mix C.L.", 360, 65, 7], "each circuit has its own 6 minute limit");
  assert.deepEqual(r.tasks, ["race"]); assert.ok(/Station 1 of 6/.test(r.view0) && /Pull-up/.test(r.view0) && /10Dip/.test(r.view0) && /20Push-up/.test(r.view0), "the whole circuit is on screen: " + r.view0.slice(0, 300));
  assert.ok(/Station 3 of 6/.test(r.mid), "after two taps the third station is on screen"); assert.deepEqual(r.afterUndo, [1, [12]]);
  assert.deepEqual(r.res.slice(0, 2), [6, [12, 29, 11, 48, 12, 13]]); assert.equal(r.res[2], true);
  assert.deepEqual(r.said.slice(0, 5), ["Dip 10", "Pull-up 5", "Dip 10", "Pull-up 5", "Push-up 20"], "the voice names the next station and its reps right away (the undo repeats the one you are on)");
  assert.ok(r.said.includes("Ultimo: Pull-up 5") && r.said.some(x => /^Finito in 2 minuti e 5/.test(x)), r.said.join(" | "));
  assert.deepEqual(r.log, [125]); assert.equal(r.circ, "5 Pull-up · 10 Dip · 5 Pull-up · 20 Push-up · 5 Dip · 5 Pull-up"); assert.deepEqual(app.errors, []);
});
const RK_PASTE = ["Classifica di tappa · Fire Set + Taglio", "Atleta", "Fire Set", "Taglio", "Totale", "1°", "#4", "Alberto Bivona", "0:52.51", "1:19.64", "2:12.15", "2°", "#14", "Luigi Puccio", "Sciacca", "0:52.07", "1:23.92", "2:15.99", "3°", "#6", "Umberto Cerruto", "0:56.95", "1:35.89", "2:32.84", "4°", "#7", "Clemente Gugliotta", "1:02.27", "1:57.74", "3:00.01",
  "5°", "#5", "Giuseppe D'Antoni", "1:33.89", "1:34.01", "3:07.90", "6°", "#18", "Luca Merlo", "1:09.87", "2:33.36", "3:43.23", "7°", "#2", "Jacopo Lecardane", "1:12.69", "3:17.80", "4:30.49", "8°", "#3", "Giovanni Croce", "2:58.68", "4:47.96", "7:46.64", "9°", "#1", "Giuseppe Ricotta", "5:08.04", "6:00.00", "11:08.04"].join("\n");
test("M11i race ranking: the stage table pasted from the ranking page is read, your place on Fire Set, cut and total, the athlete at the place you want, several stages, split plan — hand-computed", async () => {
  app = await H.startApp({ dir, seed: SC_SEED(), viewport: H.VIEWPORTS.phone });
  const r = await app.page.evaluate((paste) => { const t = todayISO(), fn = "Fire Set (Open)", cn = "Cut · Mix C.L.";
    S.train.circuitLog = [{ id: "a", date: t, circuit: fn, sec: 58 }, { id: "b", date: addDays(t, -9), circuit: fn, sec: 61 }, { id: "c", date: t, circuit: cn, sec: 90 }];
    S.logm[addDays(t, -1)] = { ...(S.logm[addDays(t, -1)] || {}), wsess: [{ name: "Fire", other: [{ title: fn, kind: "fortime", race: true, sec: 125, rounds: 6, of: 6, cap: null, splits: [12, 29, 11, 48, 12, 13], stations: [[5, "Pull-up"], [10, "Dip"], [5, "Pull-up"], [20, "Push-up"], [5, "Dip"], [5, "Pull-up"]].map(([reps, n]) => ({ reps, name: n })) }] }] };
    const T = raceTable(paste), C = raceCompare(T, 58, 90), at = raceAt(T, 2), single = raceTable("1  Ana  2:00.5\n2  Bo  2:10\nnoise\n3 Cy 2:30"), one = raceTable("1° #4 Alberto Bivona 0:52.51 1:19.64 2:12.15\n2° #14 Luigi Puccio 0:52.07 1:23.92 2:15.99");
    const sp = raceSplits(fn, at.fire); S.train.race = { stages: [{ id: "s1", name: "Stage 1", text: paste }], places: "2", rest: 5 }; DATA_V++;
    UI.tab = "train"; UI.trainSeg = "perf"; UI.perfSeg = "records"; render(); const txt1 = document.body.textContent;
    S.train.race.stages.push({ id: "s2", name: "Stage 2", text: paste }); DATA_V++; render(); const txt2 = document.body.textContent, sw = document.documentElement.scrollWidth;
    return { n: T.length, first: T[0], second: T[1], last: T[8], C, at: [at.name, at.total], single: single.map(e => [e.name, e.fire, e.cut, e.total]), one: one.map(e => e.name), plan: sp.plan.map(x => Math.round(x.goal * 100) / 100), txt1, txt2, sw, vw: innerWidth }; }, RK_PASTE);
  assert.equal(r.n, 9); assert.deepEqual(r.first, { name: "Alberto Bivona", fire: 52.51, cut: 79.64, total: 132.15 }); assert.equal(r.second.name, "Luigi Puccio", "the city under the name is ignored"); assert.deepEqual(r.last, { name: "Giuseppe Ricotta", fire: 308.04, cut: 360, total: 668.04 }, "a cut of 6:00.00 is the time limit");
  assert.deepEqual(r.C.fire, { pos: 4, n: 10, faster: 60 }, "58.0 s: three Fire Sets are faster (52.51, 52.07, 56.95)"); assert.deepEqual(r.C.cut, { pos: 3, n: 10, faster: 70 }, "90.0 s: 79.64 and 83.92 are faster"); assert.deepEqual(r.C.total, { pos: 3, n: 10, faster: 70 }, "148.0 s: 132.15 and 135.99 are faster");
  assert.deepEqual(r.at, ["Luigi Puccio", 135.99]); assert.deepEqual(r.single, [["Ana", 120.5, null, null], ["Bo", 130, null, null], ["Cy", 150, null, null]]); assert.deepEqual(r.one, ["Alberto Bivona", "Luigi Puccio"], "rows on one line work too");
  assert.deepEqual(r.plan, [5, 12.08, 4.58, 19.99, 5, 5.42], "each split × 52.07 / 125");
  assert.ok(/Place 3 of 10 on the total/.test(r.txt1) && /Place 2 \(Luigi Puccio\) is 2:15\.99: you are 12 s slower/.test(r.txt1) && /Fire Set 4th · cut 3rd/.test(r.txt1) && /9 athletes read/.test(r.txt1), r.txt1.slice(0, 300));
  assert.ok(/Across the 2 stages: place 5 of 19/.test(r.txt2) && /faster than 74% of them/.test(r.txt2), r.txt2.slice(0, 300)); assert.ok(r.sw <= r.vw + 1); assert.deepEqual(app.errors, []);
});
test("M11i race stage: the Fire Set, a skippable rest and the cut circuit run as one workout; today's two times add up to the stage time", async () => {
  app = await H.startApp({ dir, seed: SC_SEED(), viewport: H.VIEWPORTS.phone });
  const r = await app.page.evaluate(() => { const L = raceList(); const ts = buildTasks(raceStageScript()).map(t => [t.t, t.title, t.dur || t.cap || null]);
    S.train.circuitLog = [{ id: "a", date: todayISO(), circuit: L[0].name, sec: 125 }, { id: "b", date: todayISO(), circuit: L[1].name, sec: 98 }, { id: "c", date: todayISO(), circuit: L[1].name, sec: 104 }]; DATA_V++;
    UI.tab = "train"; UI.trainSeg = "perf"; UI.perfSeg = "records"; render(); const txt = document.body.textContent; return { ts, stg: raceStageToday(), txt }; });
  assert.deepEqual(r.ts, [["race", "Fire Set (Open)", 360], ["rest", "Rest", 300], ["race", "Cut · Mix C.L.", 360]], "the rest between the two circuits is yours (5 min unless you set it)"); assert.deepEqual(r.stg, { a: 125, b: 98, sum: 223 }, "the better cut time of the day: 98 s");
  assert.ok(/Stage: Fire Set \+ Cut/.test(r.txt) && /today 2:05 \+ 1:38 = 3:43/.test(r.txt), r.txt.slice(0, 200)); assert.deepEqual(app.errors, []);
});
test("M11i race time limit: at the 6 minute limit the clock stops, the stations done are saved without a circuit time", async () => {
  app = await H.startApp({ dir, seed: SC_SEED(), viewport: H.VIEWPORTS.phone });
  const r = await app.page.evaluate(() => { speechSynthesis.speak = () => {}; const c = raceList()[0]; startWorkout({ script: raceScript(c), name: "Fire Set", sport: strengthSport(), date: todayISO() }); ACT["lv-begin"](); const L = LV();
    L.clk = { start: nowMs() - 100000, acc: 0, paused: false }; ACT["lv-step"](); ACT["lv-step"](); L.clk.start = nowMs() - 361000; liveTick(); const r0 = L.res[0], timeUp = [r0.timeUp, r0.capped, L.clk.paused];
    UI.tab = "live"; render(); const txt = document.body.textContent; ACT["lv-done"](); const R = liveResults(L).other[0];
    return { timeUp, txt, R: [R.kind, R.race, R.rounds, R.of, R.cap], logged: (S.train.circuitLog || []).filter(x => x.circuit === "Fire Set (Open)").length }; });
  assert.deepEqual(r.timeUp, [true, true, true]); assert.ok(/Save 2\/6 stations/.test(r.txt), r.txt.slice(0, 200)); assert.deepEqual(r.R, ["fortime", true, 2, 6, 360]); assert.equal(r.logged, 0, "an unfinished circuit has no time"); assert.deepEqual(app.errors, []);
});

/* ---------- M11i workout pictures: one for each kind of session; race circuits as workouts ---------- */
test("M11i workout pictures: endurance as zone bars with the time in each zone, strength as a block per set with the weight moved, blocks as a timeline with the stations of a race", async () => {
  app = await H.startApp({ dir, seed: SC_SEED(), viewport: H.VIEWPORTS.phone });
  const r = await app.page.evaluate(() => { const box = h => { const d = document.createElement("div"); d.innerHTML = h; return d; };
    const run = box(woProfile(endTasks("Warmup\n- 10m Z1\n\nMain 5x\n- 3m Z4\n- 2m Z1\n\nCooldown\n- 5m Z1", "Running"))), str = box(scriptPreview("Pull 3x\n- 6 Pull-up +10kg\n- 8 Dip")), blk = box(scriptPreview("Fire Set race 6 min\n- 5 Pull-up\n- 10 Dip\n\nEMOM 10m\n- 5 Pull-up\n\nTabata 8x 20s/10s\n- Burpee"));
    const h = c => +run.querySelector("rect." + c).getAttribute("height");
    return { n: run.querySelectorAll("rect").length, h4: h("z4"), h1: h("z1"), zones: [...run.querySelectorAll(".wc-z > div")].map(d => d.textContent.replace(/\s+/g, " ").trim()), ticks: [...run.querySelectorAll(".wc-x span")].map(x => x.textContent),
      sum: str.querySelector(".wc-sum").textContent, rows: [...str.querySelectorAll(".wc-r")].map(x => [x.querySelector(".wc-n").textContent, x.querySelectorAll(".wc-b i").length, [...x.querySelectorAll(".wc-b i")].map(i => i.textContent).join(",")]),
      tl: [...blk.querySelectorAll(".wc-tl span b")].map(x => x.textContent), cells: blk.querySelectorAll(".rce-l span").length, tb: [blk.querySelectorAll(".wc-tb i").length, blk.querySelectorAll(".wc-tb u").length], em: blk.querySelectorAll(".wc-em span").length, none: woChart([]) }; });
  assert.equal(r.n, 12, "warm-up, 5 × (hard, easy), cool-down"); assert.equal(r.h4, 88); assert.equal(r.h1, 22, "Z4 is drawn taller than Z1: 0.8 and 0.2 of 110"); assert.deepEqual(r.zones, ["Z125′63%", "Z415′38%"], "1500 s and 900 s of 2400 s");
  assert.deepEqual(r.ticks, ["0", "10′", "20′", "30′", "40′"], "2400 s: a tick every 10 minutes"); assert.match(r.sum, /42 reps · 180 kg of added load/);
  assert.deepEqual(r.rows, [["Pull-up", 3, "6,6,6"], ["Dip", 3, "8,8,8"]]); assert.deepEqual(r.tl, ["Fire Set", "EMOM", "Tabata"]); assert.equal(r.cells, 2); assert.deepEqual(r.tb, [8, 8]); assert.equal(r.em, 10); assert.equal(r.none, ""); assert.deepEqual(app.errors, []);
});
test("M11i race circuits as workouts: the editor adds Fire Set, Cut or a Stage with your rest, 'Save as a workout' makes them plannable and runnable, the rest between circuits is yours", async () => {
  app = await H.startApp({ dir, seed: SC_SEED(), viewport: H.VIEWPORTS.phone });
  const r = await app.page.evaluate(() => { ACT["we-new"](); const d = S_().draft; ACT["we-race"]({ dataset: { i: "0" } }); const one = d.script, nm = d.name; ACT["we-race"]({ dataset: { i: "1" } }); const two = parseScript(d.script).blocks.map(b => [b.kind, b.title]); closeSheet();
    S.train.race = { stages: [], places: "", rest: 8 }; DATA_V++; const st = buildTasks(raceStageScript()).map(t => [t.t, t.dur || t.cap]);
    ACT["race-save"]({ dataset: { i: "stage" } }); ACT["race-save"]({ dataset: { i: "0" } }); ACT["race-save"]({ dataset: { i: "0" } }); const tp = WK().tpls.filter(t => /Fire Set|Stage/.test(t.name)).map(t => [t.name, t.sport === strengthSport(), parseScript(t.script).blocks.map(b => b.kind).join("+")]);
    UI.tab = "train"; UI.trainSeg = "perf"; UI.perfSeg = "records"; render(); const txt = document.body.textContent; return { one, nm, two, st, tp, txt }; });
  assert.match(r.one, /^Fire Set \(Open\) race 6 min\n- 5 Pull-up\n- 10 Dip/); assert.equal(r.nm, "Fire Set (Open)"); assert.deepEqual(r.two, [["race", "Fire Set (Open) race 6 min"], ["race", "Cut · Mix C.L. race 6 min"]]);
  assert.deepEqual(r.st, [["race", 360], ["rest", 480], ["race", 360]], "8 minutes of rest as set"); assert.deepEqual(r.tp, [["Stage: Fire Set + Cut", true, "race+rest+race"], ["Fire Set (Open)", true, "race"]], "saving twice updates the same workout");
  assert.ok(/8 min rest, then Cut/.test(r.txt) && /Rest between circuits/.test(r.txt) && /Save as a workout/.test(r.txt)); assert.deepEqual(app.errors, []);
});
