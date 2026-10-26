const { H, F } = require("./lib");
(async () => {
  for (const vp of ["desktop","phone"]) {
  const seed = F.seed({ withPlan: true, withPantry: true });
  const app = await H.startApp({ dir: "/tmp/claude-0/-home-user-engine/6816350e-9d20-5f6c-bcb6-ee628e7104f5/scratchpad/build", seed, viewport: H.VIEWPORTS[vp] });
  const page = app.page; const res = {};
  await page.evaluate(() => { const T=todayISO(); S.days[T]={date:T,meals:{lunch:[newItem("food","t-rice",100),newItem("food","t-chicken",150)]},dish:{lunch:"Bowl"}}; DATA_V++; UI.tab=UI.fuelTab="plan"; UI.planView="day"; UI.date=T; render(); }); await page.waitForTimeout(300);
  const copies = await page.$$('[data-act="meal-copy"]');
  res.mealCopyBtns = copies.length; res.meals = await page.evaluate(() => S.settings.meals.map(m=>m.id+":"+m.on)); res.copyMeals = await page.$$eval("[data-act=meal-copy]", els=>els.map(e=>e.dataset.meal)); res.disabled0 = await page.$$eval('[data-act="meal-copy"]', els => els.map(e => e.disabled));
  res.pasteDisabledBefore = await page.$$eval('[data-act="meal-paste"]', els => els.map(e => e.disabled));
  // copy breakfast (first meal with items)
  await page.click('[data-act="meal-copy"][data-meal="lunch"]'); await page.waitForTimeout(200);
  res.pasteAfter = await page.$$eval('[data-act="meal-paste"]', els => els.map(e => [e.dataset.meal, e.disabled]));
  res.toast = await page.textContent("#toast");
  await page.click('[data-act="meal-paste"][data-meal="dinner"]'); await page.waitForTimeout(300);
  res.d = await page.evaluate(() => getDay(todayISO()).meals.dinner.map(x => [x.ref, x.qty, x.id].join(":")));
  res.ids = await page.evaluate(() => { const ids = Object.values(S.days).flatMap(d => Object.values(d.meals).flat().map(i => i.id)); return ids.length - new Set(ids).size; });
  // day copy/paste to tomorrow
  await page.evaluate(() => { UI.date = addDays(todayISO(), 1); render(); }); await page.waitForTimeout(200);
  res.dayCopyBtns = await page.$$eval('[data-act="day-copy"],[data-act="day-paste"]', els => els.map(e => [e.dataset.act, e.disabled, e.offsetParent !== null]));
  await app.page.screenshot({ path: `/tmp/claude-0/-home-user-engine/6816350e-9d20-5f6c-bcb6-ee628e7104f5/scratchpad/day-${vp}.png` });
  console.log(vp, JSON.stringify(res), app.errors);
  await app.close();
  }
})();
