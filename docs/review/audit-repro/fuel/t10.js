const { run } = require("./lib");
run(async page => page.evaluate(`(() => {
 S.shop.extras = [{id:"e1",text:"Milk",done:true,eur:2,est:true},{id:"e2",text:"Bread",done:true,eur:3}]; put("shop","",S.shop);
 ACT["shop-done"]();
 const t = document.querySelector("#toast")?.textContent;
 const R = spendIn(addDays(todayISO(),-7), todayISO());
 return { toast: t, total: R.total, unpriced: R.unpriced, stats: JSON.stringify(spendStats()) }; })()`));
