const { run } = require("./lib");
run(async page => {
  await page.evaluate(`(() => { const T = todayISO(); S.days[T] = { date: T, meals: { lunch: [newItem("food","t-oil",8)] } }; S.shop.pantry = {}; DATA_V++; UI.shopStart=T; S.shop.range=7; UI.tab=UI.fuelTab="shop"; render(); })()`);
  await page.waitForTimeout(300);
  return await page.evaluate(() => ({ rows: shoppingRows(todayISO(),7).map(r=>[r.id,r.need,r.buy,r.packs]), dom: [...document.querySelectorAll(".shop-row")].map(e=>e.textContent.replace(/\s+/g," ").trim()) }));
});
