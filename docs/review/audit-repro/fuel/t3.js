const { run } = require("./lib");
run(async page => page.evaluate(`(() => {
 const T = addDays(todayISO(),2), out = {};
 for (let i=-1;i<=5;i++){ const d=addDays(T,i); S.days[d] = { date: d, meals: { lunch: [newItem("food","t-rice",100)] } }; } DATA_V++;
 const adjOf = () => Object.fromEntries(Object.entries(S.days).filter(([d,v])=>v.adj).map(([d,v])=>[d,v.adj]));
 out.t0 = targetsFor(T).kcal;
 openCheat({ date: T, meal: "dinner" }); UI.sheet.draft.kcal = 800; UI.sheet.draft.strategy = "after"; ACT["ch-save"]();
 out.adj1 = adjOf(); const id = getDay(T).meals.dinner[0].id;
 ACT["day-menu"](); UI.sheet.items.find(i => i.label === "Clear the day").run();
 out.adjAfterClear = adjOf();
 return out; })()`));
