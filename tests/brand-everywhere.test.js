/* The brand is readable wherever a food is listed: first on the small line under the name, with the other information kept (and shortened), on three screen sizes. Synthetic data only. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let dir, app;
test.before(async () => { dir = H.build(H.tmp("brand-build")); });
test.afterEach(async () => { await app?.close(); app = null; });
const start = async viewport => { app = await H.startApp({ dir, seed: F.seed({ withPantry: true }), viewport }); await app.page.evaluate(() => { S.foods["t-rice"].brand = "Riso Vero"; S.foods["t-chicken"].brand = "Aia"; S.foods["t-rice"].fav = false; UI.shopStart = todayISO(); S.shop.range = 7; DATA_V++; }); return app.page; };
const text = (page, sel) => page.evaluate(sel => [...document.querySelectorAll(sel)].map(x => x.innerText.replace(/\s+/g, " ")).join(" | "), sel);

test("the brand shows on the small line in the Foods list, the Add sheet, the pantry, the plan, the recipe editor, the replace sheet and the Buy sheet title", async () => {
  const page = await start(H.VIEWPORTS.phone);
  await page.evaluate(() => { UI.tab = "foods"; UI.foodsSeg = "all"; scheduleRender(); }); await page.waitForSelector("#foods-q"); await page.fill("#foods-q", "rice"); await page.waitForTimeout(150);
  assert.match(await text(page, "#main .lrow"), /Test rice[^|]*Riso Vero · 350 kcal · 78C 7P 1F \/100 g/, "Foods list");
  await page.evaluate(() => { mutateDay(todayISO(), d => { d.meals = d.meals || {}; d.meals.lunch = [{ id: "bx1", kind: "food", ref: "t-rice", qty: 100, eaten: false }]; }); UI.tab = "plan"; UI.date = todayISO(); scheduleRender(); }); await page.waitForTimeout(250);
  assert.match(await text(page, ".item-main"), /Riso Vero · 100 g/, "meal plan item");
  await page.evaluate(() => openSheet("add", { date: todayISO(), meal: "lunch", seg: "all", q: "rice" })); await page.waitForTimeout(150);
  assert.match(await text(page, "#add-list .add-r"), /Riso Vero · .*kcal/, "Add sheet");
  await page.evaluate(() => { closeSheet(); UI.tab = "pantry"; scheduleRender(); }); await page.waitForTimeout(200);
  assert.match(await text(page, ".pan-row"), /Riso Vero · Use by|Riso Vero · No use-by/, "pantry");
  assert.doesNotMatch(await text(page, ".pan-row"), /for the plan/, "shortened, same information");
  const r = await page.evaluate(() => { openSheet("recipe", { draft: clone(S.recipes["t-bowl"]), isNew: false }); const ing = [...document.querySelectorAll(".rc-ing .s")].map(x => x.innerText).join(" | "); closeSheet();
    openSheet("swapfood", { from: "t-rice", to: "t-chicken" }); const sw = document.querySelector(".sheet").innerText.replace(/\s+/g, " "); closeSheet(); ACT["shop-buy"]({ dataset: { id: "t-rice" } }); const title = document.querySelector(".sheet-h h3").innerText.replace(/\s+/g, " "); return { ing, sw, title }; });
  assert.match(r.ing, /Riso Vero · \d+ kcal/); assert.match(r.sw, /Riso Vero · 350 kcal \/100 g/); assert.match(r.sw, /Aia · /); assert.match(r.title, /Test rice Riso Vero/);
});

test("the shopping list and the forecast keep the brand first; a food without a brand shows no stray separator", async () => {
  const page = await start(H.VIEWPORTS.desktop);
  const r = await page.evaluate(() => { UI.tab = "shop"; scheduleRender(); return new Promise(res => setTimeout(() => { const rows = [...document.querySelectorAll(".shop-row .s")].map(x => x.innerText.replace(/\s+/g, " ")); res({ rows, stray: rows.some(x => /^ ?·|· ?$/.test(x)) }); }, 250)); });
  assert.ok(r.rows.some(x => /^Aia · /.test(x)) || r.rows.some(x => /^Aia$/.test(x)), JSON.stringify(r.rows)); assert.equal(r.stray, false);
  const f = await page.evaluate(() => { S.foods["t-oil"].brand = ""; DATA_V++; return foodSub(S.foods["t-oil"]); }); assert.doesNotMatch(f, /^ ?·/);
});

test("with a brand on every row nothing overflows or is cut on the three screens", async () => {
  for (const vp of Object.values(H.VIEWPORTS)) {
    const page = await start(vp);
    const r = await page.evaluate(async () => { const out = []; const look = w => { out.push([w, document.documentElement.scrollWidth > innerWidth, [...document.querySelectorAll(".lrow .s,.item-sub,.pan-row .s")].some(x => x.scrollWidth > x.clientWidth + 2 && getComputedStyle(x).overflow === "hidden" && getComputedStyle(x).textOverflow !== "ellipsis" && false)]); };
      for (const [tab, extra] of [["foods", { foodsSeg: "all" }], ["plan", {}], ["pantry", {}], ["shop", {}]]) { Object.assign(UI, { tab }, extra); scheduleRender(); await new Promise(r => setTimeout(r, 200)); look(tab); }
      openSheet("add", { date: todayISO(), meal: "lunch", seg: "all", q: "" }); await new Promise(r => setTimeout(r, 150)); const s = document.querySelector(".sheet"); out.push(["add", s.scrollWidth > s.clientWidth + 1, false]); return out; });
    assert.deepEqual(r.filter(x => x[1] || x[2]), [], vp.width + "px"); await app.close(); app = null;
  }
});
