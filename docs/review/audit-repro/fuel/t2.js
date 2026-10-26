const { run } = require("./lib");
run(async page => page.evaluate(`(() => {
 const T = addDays(todayISO(),1), N = addDays(T,1), out = {};
 S.days[T] = { date: T, meals: { lunch: [newItem("food","t-rice",100)] } }; DATA_V++;
 const base = targetsFor(T).kcal; out.base = base;
 openCheat({ date: T, meal: "dinner" }); UI.sheet.draft.kcal = 600; UI.sheet.draft.strategy = "day"; ACT["ch-save"]();
 out.afterTreat = [targetsFor(T).kcal, JSON.stringify(getDay(T).adj), JSON.stringify(getDay(T).meals.dinner.map(x=>x.cheat))];
 // clear day
 ACT["day-menu"](); UI.sheet.items.find(i => i.label === "Clear the day").run();
 out.afterClear = [targetsFor(T).kcal, JSON.stringify(getDay(T).adj), dayItems(getDay(T)).length, !!S.days[T]];
 // second: treat then move meal
 S.days[T] = { date: T, meals: { lunch: [newItem("food","t-rice",100)] } }; DATA_V++; delete S.days[T].adj;
 openCheat({ date: T, meal: "dinner" }); UI.sheet.draft.kcal = 600; UI.sheet.draft.strategy = "day"; ACT["ch-save"]();
 moveMeal({date:T, meal:"dinner"}, {date:N, meal:"dinner"}, false);
 out.afterMove = [targetsFor(T).kcal, JSON.stringify(getDay(T).adj), JSON.stringify(getDay(N).meals.dinner.map(x=>!!x.cheat)), targetsFor(N).kcal, JSON.stringify(getDay(N).adj)];
 return out; })()`));
