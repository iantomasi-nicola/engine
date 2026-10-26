const { run } = require("./lib");
run(async page => page.evaluate(`(() => {
 const T = todayISO(), out = {};
 for (let i=0;i<800;i++) S.foods["bulk"+i] = { id:"bulk"+i, name:"Bulk food "+i, brand:"", unit:"g", per:{kcal:100+i%50,p:5+i%20,c:10,f:2,fib:0}, servings:[], pack:500, cat:"pantry", role:["P","C","F"][i%3], meals:["m"], source:"custom" };
 for (let i=-365;i<30;i++){ const d=addDays(T,i); S.days[d] = { date: d, meals: { lunch: [newItem("food","bulk"+(i+400),150), newItem("food","t-chicken",200)], dinner:[newItem("food","bulk"+((i+500)%800),120)], m:[newItem("food","t-rice",100)] } }; }
 for (let i=0;i<300;i++) S.shop.pantry["bulk"+i] = {g: 1000};
 DATA_V++; UI.shopStart = T; S.shop.range = 14;
 let t0 = performance.now(); const n = 5; let L; for (let i=0;i<n;i++){ DATA_V++; L = homeSwaps("t-chicken"); } out.homeSwapsMs = (performance.now()-t0)/n; out.n = L.length;
 t0 = performance.now(); for (let i=0;i<n;i++){ DATA_V++; shoppingRows(T,14); } out.rowsMs = (performance.now()-t0)/n;
 t0 = performance.now(); for (let i=0;i<n;i++){ DATA_V++; stockPlan(T,14); } out.stockMs = (performance.now()-t0)/n;
 UI.tab = UI.fuelTab="shop"; t0 = performance.now(); render(); out.renderShopMs = performance.now()-t0;
 openSheet("buy",{id:"t-chicken"}); t0 = performance.now(); renderSheet(); out.buySheetMs = performance.now()-t0;
 return out; })()`));
