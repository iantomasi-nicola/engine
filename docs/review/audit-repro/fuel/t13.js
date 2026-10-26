const { run } = require("./lib");
run(async page => page.evaluate(`(() => {
 const T = todayISO(), P = addDays(T,-5), out = {};
 S.shop.pantry["t-rice"] = { g: 500 };
 const it = { ...newItem("food","t-rice",100), eaten:true, took:{ "t-rice": 100 } };
 S.days[P] = { date:P, meals:{ lunch:[it] } }; DATA_V++;
 out.g0 = S.shop.pantry["t-rice"].g;
 openSheet("qty",{ kind:"food", ref:"t-rice", qty:50, date:P, meal:"lunch", origMeal:"lunch", itemId: it.id });
 ACT["qty-save"]();
 out.g1 = S.shop.pantry["t-rice"].g; out.took = JSON.stringify(getDay(P).meals.lunch[0].took); out.qty = getDay(P).meals.lunch[0].qty;
 UI.date = P; ACT["toggle-eaten"]({dataset:{meal:"lunch", id: it.id}});
 out.g2 = S.shop.pantry["t-rice"].g;
 return out; })()`));
