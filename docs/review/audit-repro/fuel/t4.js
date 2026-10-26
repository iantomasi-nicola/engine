const { run } = require("./lib");
run(async page => page.evaluate(`(() => {
 const T = addDays(todayISO(),2), N = addDays(T,3), out = {};
 for (let i=-1;i<=8;i++){ const d=addDays(T,i); S.days[d] = { date: d, meals: { lunch: [newItem("food","t-rice",100)] } }; } DATA_V++;
 openCheat({ date: T, meal: "dinner" }); UI.sheet.draft.kcal = 1800; UI.sheet.draft.strategy = "after"; ACT["ch-save"]();
 const id = getDay(T).meals.dinner[0].id;
 const adjIds = () => Object.fromEntries(Object.entries(S.days).filter(([d,v])=>v.adj).map(([d,v])=>[d,Object.entries(v.adj).map(([k,x])=>(k===id?"OLD":k)+":"+x)]));
 out.before = adjIds();
 out.tgtT0 = targetsFor(addDays(T,1)).kcal;
 moveDay(T, N, false);
 out.after = adjIds(); out.tgtT1 = targetsFor(addDays(T,1)).kcal;
 out.moved = JSON.stringify(getDay(N).meals.dinner.map(x=>({cheat:!!x.cheat, id:x.id===id})));
 out.TitemsLeft = JSON.stringify(Object.keys(getDay(T).meals));
 return out; })()`));
