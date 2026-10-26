const { run } = require("./lib");
run(async page => page.evaluate(`(() => {
 const T = todayISO(), N = addDays(T,1);
 S.days[T] = { date: T, meals: { lunch: [newItem("food","t-rice",100)], dinner: [{ id: "tr", kind: "quick", cheat: true, name: "Treat", m: { kcal: 500, p: 0, c: 0, f: 0 }, eaten: false, strategy:"day" }] }, adj: {tr: -500} }; DATA_V++;
 const out = {};
 // meal copy of dinner to N
 moveMeal({date:T, meal:"dinner"}, {date:N, meal:"dinner"}, true);
 out.copyMeal = JSON.stringify(getDay(N).meals.dinner);
 out.adjN = JSON.stringify(getDay(N).adj);
 // item duplicate
 moveItem({date:T, meal:"dinner", id:"tr"}, {date:T, meal:"dinner"}, true);
 out.dup = JSON.stringify(getDay(T).meals.dinner);
 return out; })()`));
