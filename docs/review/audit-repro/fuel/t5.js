const { run } = require("./lib");
run(async page => page.evaluate(`(() => {
 const T = todayISO(), out = {};
 for (let i=0;i<3;i++){ const d=addDays(T,i); S.days[d] = { date: d, meals: { lunch: [newItem("food","t-rice",800), newItem("food","t-chicken",200)] } }; } DATA_V++;
 UI.shopStart = T; S.shop.range = 7;
 const rows = () => shoppingRows(UI.shopStart, 7).map(r => [r.id, r.need, r.covered, r.buy, r.packs]);
 out.rows0 = rows();
 out.pan0 = JSON.stringify(S.shop.pantry);
 // set checked with price via the buy flow
 S.shop.checked = { "t-rice": { g: 2000, eur: 3.2 }, "t-chicken": true }; put("shop","",S.shop);
 const snap = JSON.stringify(S.shop);
 ACT["shop-done"]();
 out.afterDone = { pantry: S.shop.pantry, buys: S.shop.buys, prices: S.shop.prices, checked: S.shop.checked };
 // eat something from rice: 800 g of rice eaten today
 const it = getDay(T).meals.lunch[0]; UI.date = T; ACT["toggle-eaten"]({dataset:{meal:"lunch", id: it.id}});
 out.afterEat = S.shop.pantry["t-rice"].g;
 UI.lastTrip && undoTrip();
 out.afterUndo = { pantry: S.shop.pantry, buys: S.shop.buys, prices: S.shop.prices, checked: S.shop.checked, ok: JSON.stringify(S.shop)===snap };
 return out; })()`));
