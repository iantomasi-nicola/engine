const { run } = require("./lib");
run(async page => page.evaluate(`(() => {
 const T = todayISO(), Y = addDays(T,-1), N = addDays(T,1), out = {};
 S.days[Y] = { date:Y, meals:{ dinner:[{ id:"tr", kind:"quick", cheat:true, name:"Pizza", m:{kcal:900,p:0,c:0,f:0}, eaten:true }] } }; DATA_V++;
 UI.date = T; ACT["copy-from"]({dataset:{from:Y}}); out.copyFrom = [document.querySelector("#toast")?.textContent, !!S.days[T], dayItems(getDay(T)).length];
 // paste a treat-only meal
 S.days[T] = { date:T, meals:{ dinner:[{ id:"tr2", kind:"quick", cheat:true, name:"Cake", m:{kcal:400,p:0,c:0,f:0}, eaten:false }] } }; DATA_V++;
 copyToClip("meal", T, "dinner"); const before = JSON.stringify(getDay(N));
 const r = pasteClip(N, "snack"); out.paste = [r, document.querySelector("#toast")?.textContent, JSON.stringify(getDay(N))===before];
 return out; })()`));
