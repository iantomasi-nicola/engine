const { run } = require("./lib");
run(async page => page.evaluate(`(() => {
 const T = todayISO(), out = {};
 for (let i=0;i<3;i++){ const d=addDays(T,i); S.days[d] = { date: d, meals: { lunch: [newItem("food","t-rice",800)] } }; } DATA_V++;
 S.shop.pantry["t-rice"] = { g: 2400 }; put("shop","",S.shop);
 UI.shopStart = T; S.shop.range = 7;
 const rows = () => shoppingRows(UI.shopStart, 7).map(r => [r.id, r.need, r.covered, r.buy]);
 out.r0 = rows();
 const it = getDay(T).meals.lunch[0]; UI.date = T; ACT["toggle-eaten"]({dataset:{meal:"lunch", id: it.id}});
 out.r1 = rows(); out.pan = S.shop.pantry["t-rice"].g;
 // undo eaten
 ACT["toggle-eaten"]({dataset:{meal:"lunch", id: it.id}}); out.r2 = rows(); out.pan2 = S.shop.pantry["t-rice"].g;
 // planned item to eaten with 1 day old/ past day
 const P = addDays(T,-5); S.days[P] = { date: P, meals: { lunch: [newItem("food","t-rice",500)] } }; DATA_V++; UI.date = P;
 ACT["toggle-eaten"]({dataset:{meal:"lunch", id: S.days[P].meals.lunch[0].id}}); out.panPast = S.shop.pantry["t-rice"].g;
 // recipe item eaten: bowl qty 2 => rice 200g chicken 300 oil10 (servings 2)
 S.days[T].meals.dinner = [newItem("recipe","t-bowl",1)]; DATA_V++; S.shop.pantry["t-chicken"] = {g: 1000}; put("shop","",S.shop); UI.date=T;
 const rid = S.days[T].meals.dinner[0].id; ACT["toggle-eaten"]({dataset:{meal:"dinner", id: rid}});
 out.afterRecipe = [S.shop.pantry["t-rice"].g, S.shop.pantry["t-chicken"].g, S.shop.pantry["t-oil"]?.g];
 ACT["toggle-eaten"]({dataset:{meal:"dinner", id: rid}});
 out.afterRecipeBack = [S.shop.pantry["t-rice"].g, S.shop.pantry["t-chicken"].g];
 return out; })()`));
