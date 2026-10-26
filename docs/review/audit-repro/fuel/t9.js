const { run } = require("./lib");
run(async page => {
  await page.evaluate(`(() => { for (let i=0;i<650;i++) S.foods["bulk"+i] = { id:"bulk"+i, name:"Bulk food "+i, brand:"", unit:"g", per:{kcal:100,p:5,c:10,f:2,fib:0}, servings:[], pack:500, cat:"pantry", role:"C", meals:["m"], source:"custom" }; DATA_V++; UI.tab=UI.fuelTab="foods"; UI.foodsSeg="mine"; render(); })()`);
  await page.waitForTimeout(500);
  const a = await page.evaluate(() => ({ rows: document.querySelectorAll(".lrow").length, more: document.querySelector('[data-act="foods-more"]')?.textContent }));
  await page.click('[data-act="foods-more"]'); await page.waitForTimeout(400);
  const b = await page.evaluate(() => ({ rows: document.querySelectorAll(".lrow").length, more: document.querySelector('[data-act="foods-more"]')?.textContent, scroll: scrollY }));
  const t = await page.evaluate(() => { const t0 = performance.now(); for (let i=0;i<5;i++) render(); return (performance.now()-t0)/5; });
  // search then clear
  await page.evaluate(() => INP["foods-q"]("Bulk food 6")); await page.waitForTimeout(300);
  const c = await page.evaluate(() => ({ rows: document.querySelectorAll(".lrow").length, max: UI.foodsMax }));
  return { a, b, renderMs: t, c };
});
