/* M4f: the price section of the food editor — one price, «for 1 kg / 1 pack / 1 piece», and the other two prices worked out live. Synthetic data only. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let dir, app;
test.before(async () => { dir = H.build(H.tmp("fprice-build")); });
test.afterEach(async () => { await app?.close(); app = null; });
const start = async vp => { app = await H.startApp({ dir, seed: F.seed({ withPlan: false }), viewport: vp }); return app.page; };
const open = page => page.evaluate(() => { ACT["new-food"]({ dataset: {} }); const d = S_().draft; d.name = "Test cheese"; d.pack = 500; d.servings = [{ l: "1 scoop", g: 25 }]; UI.fdOpen = { price: true }; renderSheet(); });

test("a price per kg shows what it makes per pack and per piece, and a price per pack shows per kg — as you type", async () => {
  const page = await start(); await open(page);
  await page.fill("#fd-pv", "2,4");
  let t = await page.evaluate(() => [...document.querySelectorAll("#fd-eq > div")].map(d => d.innerText.replace(/\s+/g, " ")));
  assert.deepEqual(t, ["per kg €2,40", "per pack €1,20", "per piece –"].map(x => x));   // a scoop is not one piece of the product: no piece price
  await page.click('[data-act="price-unit"][data-k="pack"]'); await page.fill("#fd-pv", "1,2");
  t = await page.evaluate(() => [...document.querySelectorAll("#fd-eq > div")].map(d => d.innerText.replace(/\s+/g, " ")));
  assert.equal(t[0], "per kg €2,40"); assert.equal(t[1], "per pack €1,20");
});

test("the three choices read «1 kg · 1 pack · 1 piece» in full, in a row of equal width", async () => {
  const page = await start({ width: 360, height: 800 }); await open(page);
  const r = await page.evaluate(() => { const b = [...document.querySelectorAll('.fd-price .seg button')]; const w = b.map(x => Math.round(x.getBoundingClientRect().width)); return { labels: b.map(x => x.innerText), equal: Math.max(...w) - Math.min(...w) <= 2, cut: b.some(x => x.scrollWidth > x.clientWidth + 1) }; });
  assert.deepEqual(r, { labels: ["1 kg", "1 pack", "1 piece"], equal: true, cut: false });
});

test("a litre food says «per litre», and with no price typed nothing is shown but the hint", async () => {
  const page = await start(); await open(page);
  await page.evaluate(() => { S_().draft.unit = "ml"; renderSheet(); });
  assert.equal(await page.evaluate(() => document.querySelector("#fd-eq").innerText.trim()), "");
  await page.fill("#fd-pv", "1,5");
  assert.match(await page.evaluate(() => document.querySelector("#fd-eq").innerText), /per litre/);
  assert.match(await page.evaluate(() => [...document.querySelectorAll(".fd-price .seg button")].map(b => b.innerText).join()), /1 litre/);
});
