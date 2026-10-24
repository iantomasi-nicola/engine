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

test("L18 check-ups: Reminders lists measurements, photos and the two tests (28/28/42/42 days, starting after the first one), the switches and intervals survive a reload", async () => {
  app = await H.startApp({ dir, seed: F.seed(), viewport: H.VIEWPORTS.phone });
  const r = await app.page.evaluate(() => { const L = checkList(), box = document.createElement("div"); box.innerHTML = checkPrefs();
    const rows = [...box.querySelectorAll(".ck-row")].map(e => e.textContent.replace(/\s+/g, " ").trim());
    ACT["ck-toggle"]({ dataset: { k: "photo" } }); CHG["ck-every"]("21", { dataset: { k: "meas" } }); CHG["ck-at"]("07:30");
    return { every: L.map(c => [c.k, c.every, c.on, c.next]), rows }; });
  assert.deepEqual(r.every, [["meas", 28, true, null], ["photo", 28, true, null], ["run", 42, true, null], ["cal", 42, true, null]]);
  assert.equal(r.rows.length, 4); assert.ok(r.rows.every(x => /Starts after the first one you log/.test(x)), r.rows.join(" | "));
  await app.reload();
  const after = await app.page.evaluate(() => ({ L: checkList().map(c => [c.k, c.every, c.on]), at: S.settings.reminders.checks.at, set: (UI.tab = "settings", render(), document.body.innerText.includes("check-ups")) }));
  assert.deepEqual(after.L, [["meas", 21, true], ["photo", 28, false], ["run", 42, true], ["cal", 42, true]]); assert.equal(after.at, "07:30");
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
  const r = await app.page.evaluate(() => { const t = todayISO(); mutateLog(t, d => { d.planned = [{ sport: "Running", min: 60, int: "Hard", note: "Intervals", at: "18:00" }, { sport: strengthSport(), min: 40, int: "Light", note: "Easy pulls", at: "20:00" }]; }); DATA_V++;
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
