const { run, H, F } = require("./lib");
(async () => {
  const seed = F.seed({ withPlan: true, withPantry: true });
  seed.foods["t-weird"] = { id:"t-weird", name:"Weird", per:{ kcal:"120,5", p:null, c:"abc", f:undefined, fib:"2" }, pack:"300", servings:"nope", unit:"g", cat:"pantry", role:"C", meals:["m"], source:"custom" };
  seed.recipes["r-weird"] = { id:"r-weird", name:"Weird recipe", servings:"0", ingredients:[null, {food:"t-weird", g:"150"}, {food:"t-rice", g:null}, "x"], meals:["m"], source:"custom" };
  const T = F.plus(0); seed.days[T].meals.m.push({ id:"w1", kind:"food", ref:"t-weird", qty:"abc", eaten:false }, {id:"w2", kind:"recipe", ref:"r-weird", qty:1, eaten:false});
  const app = await H.startApp({ dir: "/tmp/claude-0/-home-user-engine/6816350e-9d20-5f6c-bcb6-ee628e7104f5/scratchpad/build", seed, viewport: H.VIEWPORTS.phone });
  const page = app.page; const bad = [];
  for (const [tab, extra] of [["plan",{planView:"day"}],["plan",{planView:"week"}],["foods",{}],["shop",{}],["pantry",{}],["today",{}],["progress",{progSeg:"food",foodSeg:"intake"}]]) {
    await page.evaluate(([tab,extra]) => { Object.assign(UI, {tab, fuelTab: tab, date: todayISO()}, extra); render(); }, [tab, extra]); await page.waitForTimeout(200);
    const t = await page.evaluate(() => document.body.innerText); const m = t.match(/.{20}(NaN|undefined|null|\[object).{20}/g); if (m) bad.push([tab, JSON.stringify(extra), m.slice(0,3)]);
  }
  for (const [type,p] of [["food",{draft:"W", isNew:false}],["qty",{kind:"food",ref:"t-weird",qty:100,date:T,meal:"m"}],["qty",{kind:"recipe",ref:"r-weird",qty:1,date:T,meal:"m"}],["recipe",{draft:"R", isNew:false}]]) {
    await page.evaluate(([type,p]) => { if (p.draft==="W") p.draft = clone(S.foods["t-weird"]); if (p.draft==="R") p.draft = clone(S.recipes["r-weird"]); openSheet(type,p); }, [type,p]); await page.waitForTimeout(200);
    const t = await page.evaluate(() => (document.querySelector("#sheet-root")||document.body).innerText + [...document.querySelectorAll("#sheet-root input")].map(i=>i.value).join("|")); const m = t.match(/.{20}(NaN|undefined|null|\[object).{20}/g); if (m) bad.push([type, m.slice(0,3)]);
    await page.evaluate(() => closeSheet());
  }
  console.log(JSON.stringify(bad,null,1), app.errors);
  console.log(await page.evaluate(() => JSON.stringify({tot: dayTotals(getDay(todayISO())), w: itemMacros(getDay(todayISO()).meals.m.find(x=>x.id==="w1")), txt: document.querySelector(".fuel-sticky,.sticky")?.innerText})));
  await app.close();
})();
