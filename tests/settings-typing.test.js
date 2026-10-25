/* Bug (owner, 26/10): typing the surname in Settings › Profile cut the first letter. Typing must keep every character in every Profile field. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let app;
test.before(async () => { app = await H.startApp({ dir: H.build(H.tmp("typing-build")), seed: F.seed({ withPlan: false }), viewport: H.VIEWPORTS.phone }); });
test.after(async () => { await app?.close(); });

test("typing a surname and a name in Settings › Profile keeps every letter, on the field and after the save", async () => {
  const p = app.page;
  await p.evaluate(() => { UI.tab = "settings"; UI.setSel = "tgt"; UI.setOpen = { ...(UI.setOpen || {}), tgt: true }; FIT().targetMode = "smart"; FIT().profile.name = ""; FIT().profile.surname = ""; scheduleRender(); });
  await p.waitForSelector("#fit-profile-surname", { state: "attached" }); await p.evaluate(() => { document.getElementById("fit-profile-surname").closest("details").open = true; });
  for (const [id, txt] of [["fit-profile-surname", "Rossi"], ["fit-profile-name", "Mario"]]) {
    await p.evaluate(id => document.getElementById(id).scrollIntoView({ block: "center" }), id);
    await p.click("#" + id); await p.keyboard.type(txt, { delay: 40 });
    assert.equal(await p.inputValue("#" + id), txt, id + " while typing");
    await p.evaluate(() => document.activeElement.blur()); await p.waitForTimeout(150);
    assert.equal(await p.evaluate(id => document.getElementById(id)?.value, id), txt, id + " after blur and re-render");
  }
  assert.deepEqual(await p.evaluate(() => [FIT().profile.surname, FIT().profile.name]), ["Rossi", "Mario"]);
  assert.deepEqual(app.errors, []);
});

test("a redraw while you type in a Profile field (a sync, a timer, the keyboard) does not reset the field: the first letters survive", async () => {
  const p = app.page;
  await p.evaluate(() => { UI.tab = "settings"; UI.setSel = "tgt"; UI.setOpen = { ...(UI.setOpen || {}), tgt: true }; FIT().targetMode = "smart"; FIT().profile.surname = ""; scheduleRender(); });
  await p.waitForSelector("#fit-profile-surname", { state: "attached" }); await p.evaluate(() => { document.getElementById("fit-profile-surname").closest("details").open = true; });
  await p.evaluate(() => document.getElementById("fit-profile-surname").scrollIntoView({ block: "center" }));
  await p.click("#fit-profile-surname"); await p.keyboard.type("R", { delay: 20 });
  await p.evaluate(() => { DATA_V++; render(); });                    // what a background sync or timer does
  await p.keyboard.type("ossi", { delay: 20 });
  assert.equal(await p.inputValue("#fit-profile-surname"), "Rossi", "no letter lost");
  await p.evaluate(() => document.activeElement.blur()); await p.waitForTimeout(150);
  assert.equal(await p.evaluate(() => FIT().profile.surname), "Rossi");
});

test("a text field in Settings (Name, Surname) has no unit padding: a 13-letter surname is fully visible on a phone, so its first letter is not scrolled out of the box", async () => {
  const p = app.page;
  await p.evaluate(() => { UI.tab = "settings"; UI.setSel = "tgt"; UI.setOpen = { ...(UI.setOpen || {}), tgt: true }; FIT().targetMode = "smart"; FIT().profile.surname = "Rossi-Bianchi"; scheduleRender(); });
  await p.waitForSelector("#fit-profile-surname", { state: "attached" }); await p.evaluate(() => { document.getElementById("fit-profile-surname").closest("details").open = true; });
  const m = await p.evaluate(() => { const e = document.getElementById("fit-profile-surname"), cs = getComputedStyle(e); return { w: e.clientWidth, sw: e.scrollWidth, pr: parseFloat(cs.paddingRight), pl: parseFloat(cs.paddingLeft) }; });
  assert.ok(m.pr <= 16, "right padding " + m.pr);          // 34 px was reserved for a unit that a text field does not have
  assert.ok(m.sw <= m.w, `text ${m.sw} px in a box of ${m.w} px`);
});
