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

test("L91: the smart estimate lives only in the cheat meal: no «Placeholder» in the meal menu or the Add sheet, one «Cheat meal» entry (empty meal too), write it + Enter estimates it, presets without an AI", async () => {
  app = await H.startApp({ dir, seed: F.seed(), viewport: H.VIEWPORTS.phone });
  const r = await app.page.evaluate(async () => { Sync.sample = { json: async () => ({ name: "Pizza and a beer", kcal: 1100, protein: 38, carbs: 130, fat: 42 }) }; const t = todayISO(), A = activeMeals(), m = A[A.length - 1].id; UI.tab = "plan"; UI.date = t; render();
    mutateDay(t, d => { delete d.meals[m]; }); ACT["meal-menu"]({ dataset: { meal: m } }); const menuTxt = document.querySelector(".sheet")?.innerText || "", cheatN = (menuTxt.match(/cheat meal/gi) || []).length;
    closeSheet(); openSheet("add", { date: t, meal: m }); const inAdd = !!document.querySelector('[data-act="open-ph"]') || /Placeholder/.test(document.querySelector(".sheet")?.innerText || ""); closeSheet();
    openCheat({ date: t, meal: m }); const sh = UI.sheet, title = document.querySelector(".sheet h3")?.innerText, focus = document.activeElement?.id, presets = !!document.querySelector('[data-act="ch-preset"]');
    sh.desc = "pizza and a beer at Mario's"; document.getElementById("ch-desc").dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })); await new Promise(r => setTimeout(r, 400));
    const est = [sh.draft.name, sh.draft.kcal]; ACT["ch-save"](); await new Promise(r => setTimeout(r, 300)); const it = (getDay(t).meals[m] || []).find(x => x.cheat);
    Sync.sample = null; openCheat({ date: t, meal: A[0].id }); const presetsNoAI = !!document.querySelector('[data-act="ch-preset"]'); closeSheet();
    return { placeholderInMenu: /Placeholder/.test(menuTxt), cheatN, inAdd, act: typeof ACT["open-ph"], title, focus, presets, est, it: it && [it.name, it.m.kcal, it.eaten, !!it.ph], presetsNoAI }; });
  assert.equal(r.placeholderInMenu, false); assert.equal(r.cheatN, 1, "one cheat meal entry, even on an empty meal"); assert.equal(r.inAdd, false); assert.equal(r.act, "undefined");
  assert.equal(r.title, "Plan a cheat meal"); assert.equal(r.focus, "ch-desc", "with an AI the cursor waits in the description"); assert.ok(r.presets, "presets stay next to the estimate");
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
