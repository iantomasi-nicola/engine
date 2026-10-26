const { run } = require("./lib");
run(async page => page.evaluate(`(() => {
 const T = todayISO(), out = {};
 S.foods["t-tuna"] = { id:"t-tuna", name:"Test tuna", brand:"", unit:"g", per:{kcal:130,p:25,c:0,f:3,fib:0}, servings:[], pack:160, cat:"fish", role:"P", meals:["m","d"], source:"custom" };
 S.shop.pantry["t-tuna"] = { g: 560 };
 for (let i=0;i<3;i++){ const d=addDays(T,i); S.days[d] = { date: d, meals: { lunch: [newItem("food","t-chicken",200)] } }; }
 S.days[addDays(T,1)].meals.lunch[0].eaten = false;
 DATA_V++; UI.shopStart = T; S.shop.range = 7; put("shop","",S.shop);
 out.row = shoppingRows(T,7).map(r=>[r.id,r.need,r.covered,r.buy]);
 out.swaps = homeSwaps("t-chicken").map(x=>[x.food.id,x.qFrom,x.qTo]);
 const html = homeSwapHTML("t-chicken"); out.html = html.slice(0,200);
 const x = homeSwaps("t-chicken")[0];
 const pan0 = JSON.stringify(S.shop.pantry);
 ACT["home-swap"]({dataset:{id:"t-chicken", to:x.food.id}});
 out.after = Object.entries(S.days).map(([d,v])=>JSON.stringify(v.meals.lunch.map(i=>[i.ref,i.qty])));
 out.panSame = JSON.stringify(S.shop.pantry)===pan0;
 out.rowAfter = shoppingRows(T,7).map(r=>[r.id,r.need,r.covered,r.buy]);
 ACT.undo();
 out.undone = Object.entries(S.days).map(([d,v])=>JSON.stringify(v.meals.lunch.map(i=>[i.ref,i.qty])));
 return out; })()`));
