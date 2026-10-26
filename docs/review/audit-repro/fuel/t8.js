const { run } = require("./lib");
run(async page => {
  await page.evaluate(`(() => { const T = todayISO(); S.days[T] = { date: T, meals: { snack: [newItem("food","t-rice",300)], lunch:[newItem("food","t-chicken",100)] } }; DATA_V++;
    S.settings.meals.find(m=>m.id==="snack").on = false; saveSettings(); UI.date=T; UI.tab=UI.fuelTab="plan"; UI.planView="week"; render(); })()`);
  await page.waitForTimeout(400);
  return await page.evaluate(() => { const T = todayISO(); const cells = [...document.querySelectorAll('.pw-cell[data-date="'+T+'"]')].map(c=>c.dataset.meal); const head = document.querySelector('.pw-dr.now .pw-kcal')?.textContent;
    return { cells, head, rice: [...document.querySelectorAll('.pw-nm')].map(x=>x.textContent) , total: dayTotals(getDay(T)).kcal}; });
});
