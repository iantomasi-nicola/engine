const { run, F } = require("./lib");
const evil = 'e1" autofocus onfocus="window.__x1=1" x="';
run(async (page, app) => {
  await page.evaluate(`(() => {
    const evil = ${JSON.stringify(evil)};
    S.foods["evil"] = { id: evil, name: "Evil food", brand:"", unit:"g", per:{kcal:100,p:1,c:1,f:1,fib:0}, servings:[], pack:500, cat:"pantry", role:"C", meals:["m"], source:"custom" };
    S.shop.pantry["evil"] = {g: 300};
    S.shop.pantry[evil] = {g: 300};
    DATA_V++; UI.tab="foods"; UI.fuelTab="foods"; render();
  })()`);
  await page.waitForTimeout(300);
  const a = await page.evaluate(() => ({ foodsBtn: !!document.querySelector('[data-act="edit-food"][onfocus]'), x: window.__x1 || 0, html: document.querySelector('[data-act="edit-food"][data-id*="e1"]')?.outerHTML.slice(0,200) }));
  await page.evaluate(`(() => { UI.tab="shop"; UI.fuelTab="shop"; render(); })()`).catch(()=>{});
  await page.evaluate(`(() => { UI.tab="pantry"; UI.fuelTab="pantry"; render(); })()`).catch(()=>{});
  await page.waitForTimeout(300);
  const b = await page.evaluate(() => ({ x: window.__x1 || 0, n: document.querySelectorAll('[onfocus]').length }));
  return { a, b };
});
