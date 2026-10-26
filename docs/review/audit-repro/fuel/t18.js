const { run } = require("./lib");
run(async page => page.evaluate(`(async () => {
 const T = todayISO(), out = {}; const ws = weekStartOf(T);
 for (let i=0;i<7;i++){ const d=addDays(ws,i); S.days[d] = { date:d, meals:{ lunch:[newItem("food","t-rice",20)] } }; } DATA_V++;
 S.shop.pantry["t-rice"] = {g:150}; put("shop","",S.shop);
 UI.date = T; UI.date=T;
 const d0 = getDay(T).meals.lunch[0]; ACT["toggle-eaten"]({dataset:{meal:"lunch", id:d0.id}}); out.afterEat = S.shop.pantry["t-rice"].g;
 ACT["pw-clear-week"](); out.sheet = UI.sheet.type; UI.sheet.run(); out.afterClear = [S.shop.pantry["t-rice"].g, Object.values(S.days).reduce((a,d)=>a+dayItems(d).length,0)];
 ACT.undo(); out.afterUndo = [S.shop.pantry["t-rice"].g, Object.values(S.days).reduce((a,d)=>a+dayItems(d).length,0), getDay(T).meals.lunch[0].eaten, JSON.stringify(getDay(T).meals.lunch[0].took)];
 return out; })()`));
