const { run } = require("./lib");
run(async (page) => {
  await page.evaluate(`(async () => {
    const evil = 'e1" autofocus onfocus="window.__x2=1" x="';
    const j = { app:"Engine", foods: { evil1: { id: evil, name:"Evil", per:{kcal:100,p:1,c:1,f:1}, unit:"g", servings:[], pack:500, cat:"pantry", role:"C", meals:["m"], source:"custom" } }, recipes: {}, days: {} };
    restoreOpen(j, "file"); const sh = UI.sheet; sh.parts = {settings:false, foods:true, days:false, logm:false, train:false, body:false, shop:false, photos:false}; 
    await ACT["rs-go"](); UI.tab="foods"; UI.fuelTab="foods"; render();
  })()`);
  await page.waitForTimeout(500);
  return await page.evaluate(() => ({ x: window.__x2 || 0, foods: Object.keys(S.foods) }));
});
