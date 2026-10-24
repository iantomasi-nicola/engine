/* M10a (L26): the page before a workout shows suggested changes (progression from your last session, a lighter day when you are tired, ideas from the AI); you tick the ones you want and Apply writes them into today's script; Undo puts it back. Synthetic data only. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let dir, app;
test.before(async () => { dir = H.build(H.tmp("sg-build")); });
test.afterEach(async () => { await app?.close(); app = null; });
const SCRIPT = "A1/A2 Pull + Push 4x\\n- 6 Pull-up +10kg\\n- 8 Dip\\n- 90s Rest\\n\\nCore 3x\\n- 30s Plank";
const start = async (viewport = H.VIEWPORTS.phone, extra = "") => { app = await H.startApp({ dir, seed: F.seed(), viewport });
  await app.page.evaluate(`(() => { const y = addDays(todayISO(), -3); mutateLog(y, x => { x.wsess = [{ id: "w1", name: "Pulls", min: 40, rpe: 7, sets: [
    { ex: "Pull-up", reps: [6], load: 10, round: 1 }, { ex: "Pull-up", reps: [6], load: 10, round: 2 }, { ex: "Pull-up", reps: [6], load: 10, round: 3, rir: 3, final: true }, { ex: "Pull-up", reps: [6], load: 10, round: 4, rir: 3, final: true },
    { ex: "Dip", reps: [8], round: 1 }, { ex: "Dip", reps: [8], round: 2 }, { ex: "Dip", reps: [8], round: 3 }, { ex: "Dip", reps: [8], round: 4, rir: 2, final: true }] }]; }); DATA_V++; ${extra}
    startWorkout({ script: "${SCRIPT}", name: "Pulls", sport: strengthSport(), date: todayISO() }); UI.tab = "live"; render(); })()`);
  await app.page.waitForTimeout(250); return app.page; };

test("editScript changes exactly what it is asked to and nothing else: a rep, a load (with and without one), a set count, an exercise; a line with two exercises keeps the other; no match = no change", async () => {
  const page = await start();
  const r = await page.evaluate(() => { const s = "A1/A2 Pull + Push 4x\n- 6 Pull-up +10kg\n- 8 Dip\n- 90s Rest\n\nCore 3x\n- 30s Plank\n\nFinisher 2x\n- 5 Pull-up + 10 Dip";
    return { reps: editScript(s, { type: "reps", name: "Dip", to: 9 }), load: editScript(s, { type: "load", name: "Pull-up", to: 12.5 }), bw: editScript(s, { type: "load", name: "Dip", to: 5 }), sets: editScript(s, { type: "sets", block: "Core", to: 2 }), all: editScript(s, { type: "sets_all", by: -1 }), swap: editScript(s, { type: "swap", name: "Plank", to: "Hollow hold" }), none: editScript(s, { type: "reps", name: "Squat", to: 5 }), same: editScript(s, { type: "reps", name: "Dip", to: 8 }) }; });
  assert.match(r.reps, /- 9 Dip/); assert.match(r.reps, /- 6 Pull-up \+10kg/); assert.match(r.load, /- 6 Pull-up \+12\.5kg/); assert.match(r.bw, /- 8 Dip \+5kg/); assert.match(r.sets, /Core 2x/); assert.match(r.sets, /Pull \+ Push 4x/);
  assert.match(r.all, /Push 3x/); assert.match(r.all, /Core 2x/); assert.match(r.all, /Finisher 2x/, "a block of two sets is left alone"); assert.match(r.swap, /- 30s Hollow hold/); assert.equal(r.none, null); assert.equal(r.same, null);
});

test("the page lists what your last session says: a load progression to tick, and the exercises that stay the same; nothing is ticked by itself and nothing changes before Apply", async () => {
  const page = await start();
  const r = await page.evaluate(() => { const L = LV(), B = sgBuild(L); return { items: B.items.map(i => [i.id, i.kind, i.from, i.to, i.edit.type]), same: B.same.map(i => i.name), script: L.script, rows: document.querySelectorAll(".sg-row").length, on: document.querySelectorAll('.sg-row[aria-pressed="true"]').length, old: document.querySelectorAll('[data-act="lv-adj"]').length, apply: document.querySelector('[data-act="sg-apply"]')?.disabled, text: document.querySelector(".lv-main").innerText.replace(/\s+/g, " ") }; });
  assert.deepEqual(r.items, [["p:pull up", "prog", "+10 kg", "+12 kg", "load"]]); assert.ok(r.same.includes("Dip")); assert.equal(r.rows, 1); assert.equal(r.on, 0); assert.equal(r.old, 0, "the old switches are gone"); assert.equal(r.apply, true); assert.match(r.text, /Staying the same · /); assert.match(r.text, /Pull-up/);
});

test("tick a suggestion and Apply: the script is rewritten, the preview shows it, Undo puts it back; two ticks apply together", async () => {
  const page = await start();
  const r = await page.evaluate(() => { const L = LV(), s0 = L.script; ACT["sg-toggle"]({ dataset: { id: "p:pull up" } }); const armed = !document.querySelector('[data-act="sg-apply"]').disabled || (render(), !document.querySelector('[data-act="sg-apply"]').disabled);
    ACT["sg-apply"](); render(); const L2 = LV(), after = L2.script, done = document.querySelector(".sg-done")?.innerText.replace(/\s+/g, " "), side = document.querySelector(".lv-side")?.innerText || "", tasks = L2.tasks.length;
    ACT["sg-undo"](); render(); return { armed, s0, after, done, side, undone: LV().script === s0, tasks, rows: document.querySelectorAll(".sg-row").length }; });
  assert.ok(r.armed); assert.match(r.after, /- 6 Pull-up \+12kg/); assert.match(r.done, /Written in: Pull-up/); assert.match(r.side, /12/); assert.equal(r.undone, true); assert.equal(r.rows, 1, "the suggestion is back after Undo");
});

test("a tired day: Low or Reduced readiness offers one «lighter day» change that takes one set off every block of three sets or more", async () => {
  const page = await start(H.VIEWPORTS.phone, `window.loadState = () => ({ ready: "yellow", sleepLast: 5.2 });`);
  const r = await page.evaluate(() => { const L = LV(), B = sgBuild(L), it = B.items.find(i => i.kind === "lighter"); ACT["sg-toggle"]({ dataset: { id: "lighter" } }); ACT["sg-apply"](); const sc = LV().script; return { has: !!it, why: it?.why, sc, chip: document.querySelector(".pv-ready")?.innerText || "", again: sgBuild(LV()).items.some(i => i.kind === "lighter") }; });
  assert.equal(r.has, true); assert.match(r.why, /reduced/i); assert.match(r.sc, /Push 3x/); assert.match(r.sc, /Core 2x/); assert.equal(r.again, false, "applied once, not offered again");
});

test("the AI can add ideas: only changes that really fit the script are shown, marked AI; without an AI service there is no button; a failure says so", async () => {
  const page = await start();
  assert.equal(await page.evaluate(() => !!document.querySelector('[data-act="sg-ai"]')), false);
  const r = await page.evaluate(async () => { Sync.sample = { json: async () => ({ changes: [{ change: "reps", exercise: "Dip", to: 10, why: "You had RIR 2 and 8 clean reps" }, { change: "swap", exercise: "Plank", to: "Hollow hold", why: "Easier on the wrists" }, { change: "load", exercise: "Squat", to: 80, why: "not in the script" }, { change: "sets", block: "Core", to: 2, why: "short on time" }] }) }; render();
    const had = !!document.querySelector('[data-act="sg-ai"]'); await ACT["sg-ai"](); render(); const L = LV(), items = sgBuild(L).items.filter(i => i.kind === "ai").map(i => [i.name, i.to]); const tags = document.querySelectorAll(".sg-tag").length;
    for (const i of sgBuild(L).items.filter(i => i.kind === "ai")) ACT["sg-toggle"]({ dataset: { id: i.id } }); ACT["sg-apply"](); const sc = LV().script;
    Sync.sample = { json: async () => { throw new Error("quota"); } }; await ACT["sg-ai"](); render(); return { had, items, tags, sc, err: !!LV().sg.err }; });
  assert.equal(r.had, true); assert.deepEqual(r.items, [["Dip", "10 reps"], ["Plank", "Hollow hold"], ["Core", "2 sets"]], "the Squat change does not fit and is dropped"); assert.ok(r.tags >= 3);
  assert.match(r.sc, /- 10 Dip/); assert.match(r.sc, /Hollow hold/); assert.match(r.sc, /Core 2x/); assert.equal(r.err, true);
});

test("the page fits the three screens and the live player still starts and shows the changed targets", async () => {
  for (const vp of Object.values(H.VIEWPORTS)) {
    const page = await start(vp);
    const r = await page.evaluate(() => { ACT["sg-toggle"]({ dataset: { id: "p:pull up" } }); render(); ACT["sg-apply"](); render(); const main = document.querySelector(".lv-main"), over = document.documentElement.scrollWidth > innerWidth || main.scrollWidth > main.clientWidth + 1; ACT["lv-begin"](); render(); return { over, target: liveTarget(LV().tasks.find(t => t.t === "set").exs[0]), phase: LV().phase }; });
    assert.equal(r.over, false, vp.width + "px"); assert.equal(r.phase, "run"); assert.match(r.target, /12/);
    await app.close(); app = null;
  }
});

test("the added weight is a setting (2 kg until you change it) and every load suggestion can be adjusted before it is applied: no plates of that size, add what you can", async () => {
  const page = await start();
  const r = await page.evaluate(() => { const to0 = sgBuild(LV()).items[0].edit.to, def = loadStep(); FIT().player = { ...(FIT().player || {}), loadStep: 2.5 }; const to1 = sgBuild(LV()).items[0].edit.to; FIT().player.loadStep = 2;
    ACT["sg-load"]({ dataset: { id: "p:pull up", d: "1" } }); const up = sgBuild(LV()).items[0].edit.to; ACT["sg-load"]({ dataset: { id: "p:pull up", d: "-1" } }); ACT["sg-load"]({ dataset: { id: "p:pull up", d: "-1" } }); const down = sgBuild(LV()).items[0].edit.to;
    CHG["sg-load"]("11", { dataset: { id: "p:pull up" } }); const typed = sgBuild(LV()).items[0].edit.to, ticked = LV().sg.on["p:pull up"]; ACT["sg-apply"](); render(); return { to0, def, to1, up, down, typed, ticked, sc: LV().script, input: !!document.querySelector('.sg-adj input') }; });
  assert.deepEqual([r.to0, r.def, r.to1], [12, 2, 12.5]); assert.deepEqual([r.up, r.down, r.typed], [14, 10, 11]); assert.equal(r.ticked, true); assert.match(r.sc, /- 6 Pull-up \+11kg/);
  const st = await page.evaluate(() => { const h = playerSettings(); return /Load progression/.test(h) && /id="fit-player-loadStep"/.test(h); });
  assert.equal(st, true, "the option is in Settings");
});

test("rings: too easy → lower the rings (strap longer), missed reps → raise them; the strap length in the script moves one notch and Apply writes it; with no length it is a tip with nothing to tick", async () => {
  const page = await start(H.VIEWPORTS.phone);
  const r = await page.evaluate(() => { const y = addDays(todayISO(), -2);
    mutateLog(y, x => { x.wsess = [{ id: "w2", name: "Rings", sets: [{ ex: "Ring row", reps: [8], round: 1 }, { ex: "Ring row", reps: [8], round: 2, rir: 3, final: true }, { ex: "Ring push-up", reps: [5], round: 1 }, { ex: "Ring push-up", reps: [4], round: 2, rir: 0, final: true }, { ex: "Dip", reps: [8], round: 1, ring: "50" }, { ex: "Dip", reps: [8], round: 2, rir: 3, final: true, ring: "50" }] }]; }); DATA_V++;
    ACT["lv-cancel"](); startWorkout({ script: "Rings 2x\n- 8 Ring row rings 45cm\n- 8 Ring push-up\n- 8 Dip", name: "Rings", sport: strengthSport(), date: todayISO() }); UI.tab = "live"; render();
    const B = sgBuild(LV()), rg = B.items.filter(i => i.kind === "ring"); const text = document.querySelector(".sg").innerText.replace(/\s+/g, " ");
    const row = rg.find(i => /row/i.test(i.name)), push = rg.find(i => /push/i.test(i.name)); ACT["sg-toggle"]({ dataset: { id: row.id } }); ACT["sg-apply"]();
    return { names: rg.map(i => i.name), row: [row.from, row.to, !!row.edit], push: [push.to, !!push.edit], dip: B.items.some(i => /dip/i.test(i.name) && i.kind === "ring"), sc: LV().script, boxes: document.querySelectorAll(".sg-row.tip").length, text }; });
  assert.deepEqual(r.names.sort(), ["Ring push-up", "Ring row"]); assert.equal(r.row[0], "strap 45 cm"); assert.match(r.row[1], /50 cm · lower the rings: harder/); assert.equal(r.row[2], true);
  assert.match(r.push[0], /Raise the rings: easier/); assert.equal(r.push[1], false, "no length known: a tip only"); assert.equal(r.dip, false, "dips don't depend on the ring height");
  assert.match(r.sc, /- 8 Ring row rings 50cm/); assert.match(r.sc, /- 8 Ring push-up\n/);
  const w = await page.evaluate(() => editScript("A 2x\n- 8 Ring row\n- 8 Dip", { type: "ring", name: "Ring row", n: 7, unit: "hole" })); assert.match(w, /- 8 Ring row rings 7 hole/);
});

test("the number on the Pantry tab says what it counts: amber for use-soon, red when something expired, with the words in its label, and it stays on the tab's line", async () => {
  const page = await start(H.VIEWPORTS.phone);
  const r = await page.evaluate(async () => { closeSheet(); UI.tab = "pantry"; S.shop.pantry["t-rice"] = { g: 100, exp: addDays(todayISO(), 1) }; DATA_V++; scheduleRender(); await new Promise(r => setTimeout(r, 200));
    const soon = document.querySelector(".subnav .tab-dot"), a = { cls: soon.className, label: soon.getAttribute("aria-label"), title: soon.closest("button").title };
    S.shop.pantry["t-chicken"] = { g: 100, exp: addDays(todayISO(), -2) }; DATA_V++; scheduleRender(); await new Promise(r => setTimeout(r, 200)); const both = document.querySelector(".subnav .tab-dot"); const btns = [...document.querySelectorAll(".subnav button")].map(b => b.getBoundingClientRect().height);
    return { a, both: { cls: both.className, label: both.getAttribute("aria-label"), n: both.innerText }, same: Math.max(...btns) - Math.min(...btns) < 2 }; });
  assert.deepEqual(r.a, { cls: "tab-dot soon", label: "1 to use soon", title: "1 to use soon" }); assert.deepEqual(r.both, { cls: "tab-dot", label: "1 expired · 1 to use soon", n: "2" }); assert.equal(r.same, true);
});
