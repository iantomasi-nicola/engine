/* M4: quick wins — recipe icon alignment (C8), collapsible sidebar (J1), Check-in date picker (I1),
   weekly running goal (G2), most-used foods (I2), weather place (F1). */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let app, dir;
test.before(() => { dir = H.build(H.tmp("m4-build")); });
test.afterEach(async () => { await app?.close(); app = null; });
const start = async (seed = F.seed(), vp) => { app = await H.startApp({ dir, seed, viewport: vp }); return app.page; };

test("C8: the recipe icon and the dish name sit on the same line in the Meal Plan (phone, tablet, desktop), also with the pantry jar", async () => {
  for (const [n, vp] of Object.entries(H.VIEWPORTS)) {
    const page = await start(F.seed(), vp);
    const r = await page.evaluate(async () => {
      const d = S.days[todayISO()]; d.meals = { lunch: d.meals.m, dinner: d.meals.d }; d.meals.lunch[0].pan = true; S.shop.pantry["t-rice"] = { g: 500 }; DATA_V++; UI.tab = "plan"; UI.fuelTab = "plan"; UI.date = todayISO(); scheduleRender(); await new Promise(r => setTimeout(r, 500));
      const out = [];
      for (const row of document.querySelectorAll(".item-name")) { const icons = row.querySelectorAll(".ic"); if (!icons.length) continue;
        const rng = document.createRange(); const txt = [...row.childNodes].reverse().find(x => x.nodeType === 3 ? x.textContent.trim() : x.classList?.contains("nm")); if (!txt) continue; rng.selectNodeContents(txt);
        const t = rng.getBoundingClientRect(), tc = t.top + t.height / 2; for (const i of icons) { const b = i.getBoundingClientRect(); out.push(Math.abs(b.top + b.height / 2 - tc)); } }
      return { n: out.length, worst: Math.max(0, ...out) };
    });
    assert.ok(r.n >= 2, `${n}: icons found ${r.n}`); assert.ok(r.worst <= 2.5, `${n}: icon is ${r.worst.toFixed(1)}px off the text line`);
    await app.close(); app = null;
  }
});

test("J1: the side menu collapses to a rail and expands again on tablet and desktop; the choice is remembered; phones keep the bottom bar", async () => {
  const state = () => app.page.evaluate(() => { const side = document.querySelector("#side"), b = side.getBoundingClientRect(), m = document.querySelector(".main").getBoundingClientRect();
    return { cls: [...document.body.classList].filter(c => c.startsWith("side-")), w: Math.round(b.width), mainLeft: Math.round(m.left), icon: Math.round(side.querySelector('.side-btn .ic').getBoundingClientRect().width), toggle: !!side.querySelector("[data-act=side-toggle]") && getComputedStyle(side.querySelector("[data-act=side-toggle]")).display !== "none", labels: [...side.querySelectorAll(".side-btn span")].some(x => x.offsetWidth > 0 && x.textContent.trim().length > 0 && !x.closest(".ic")) }; });
  const tap = async () => { await app.page.evaluate(() => ACT["side-toggle"]()); await app.page.waitForTimeout(450); };
  for (const [n, vp, first, second] of [["desktop", H.VIEWPORTS.desktop, "side-full", "side-rail"], ["tablet", H.VIEWPORTS.tablet, "side-rail", "side-full"]]) {
    await start(F.seed(), vp); const a = await state(); assert.deepEqual(a.cls, [first], n); assert.ok(a.toggle, n + " toggle");
    await tap(); const b = await state(); assert.deepEqual(b.cls, [second], n);
    assert.ok(b.mainLeft !== a.mainLeft || b.w !== a.w, n + " layout changes"); if (second === "side-rail") assert.equal(b.w, 80, n + " rail is 80 px");
    assert.equal(b.icon, second === "side-rail" ? 56 : 24, n + " icons keep their size");
    await app.reload(); const c = await state(); assert.deepEqual(c.cls, [second], n + " remembered after reload"); assert.deepEqual(app.errors, []);
    await tap(); const d = await state(); assert.deepEqual(d.cls, [first], n);
    await app.page.screenshot({ path: require("path").join(process.env.ENGINE_SHOTS || require("os").tmpdir(), `side-${n}.png`) });
    await app.close(); app = null;
  }
  await start(F.seed(), H.VIEWPORTS.phone); const p = await state(); assert.deepEqual(p.cls, []); assert.equal(p.toggle, false);
  assert.ok(await app.page.evaluate(() => getComputedStyle(document.querySelector("#bnav")).display !== "none"), "bottom bar on phones");
});
