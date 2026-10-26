const { run } = require("./lib");
run(async page => page.evaluate(`(() => {
 const out = {};
 openSheet("food",{ draft: { ...blankFood("Erythritol"), per:{ kcal:"0", p:"0", c:"99", f:"0" } }, isNew:true, then:null });
 ACT["fd-save"](); const f = Object.values(S.foods).find(x=>x.name==="Erythritol"); out.kcal = f?.per.kcal; out.toast = document.querySelector("#toast")?.textContent;
 CHG["xp-days"]("0"); out.soon = S.settings.shopPrefs.soonDays;
 openSheet("food",{ draft: { ...blankFood("Negative"), per:{ kcal:"-5", p:"2", c:"3", f:"1" }, pack:"-100" }, isNew:true, then:null });
 ACT["fd-save"](); const g = Object.values(S.foods).find(x=>x.name==="Negative"); out.neg = g && [g.per.kcal, g.per.p, g.pack];
 return out; })()`));
