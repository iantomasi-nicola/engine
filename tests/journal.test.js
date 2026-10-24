/* M4b: Daily Journal (K1–K10). Synthetic data only. Entries live in the day's log document as jr = { p, m, e, s, n, t:{field: ms} }. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let dir, app;
test.before(async () => { dir = H.build(H.tmp("journal-build")); });
test.afterEach(async () => { await app?.close(); app = null; });
const start = async (seed = F.seed(), viewport) => { app = await H.startApp({ dir, seed, viewport }); return app.page; };
/* fill days: rows are [daysAgo, p, m, e, s] */
const fill = (page, rows) => page.evaluate(rows => { for (const [ago, p, m, e, s] of rows) { const d = addDays(todayISO(), -ago); jrSet(d, "p", p); jrSet(d, "m", m); jrSet(d, "e", e); jrSet(d, "s", s); } }, rows);

test("a tap saves the value at once in the day's log; tapping it again clears it; nothing else in the log changes (K1)", async () => {
  const page = await start();
  const r = await page.evaluate(() => {
    const d = todayISO(); mutateLog(d, x => { x.sleep = 7.5; x.notes = "keep"; });
    jrSet(d, "m", 4); const a = clone(logGet(d).jr);
    jrSet(d, "m", null); const b = clone(logGet(d).jr), L = logGet(d);
    return { a, b, sleep: L.sleep, notes: L.notes, stored: JSON.parse(localStorage.getItem(LS_KEY)).logm[d.slice(0, 7)].days[d].jr };
  });
  assert.equal(r.a.m, 4);
  assert.ok(r.a.t.m > 0, "each field carries its own edit time");
  assert.equal(r.b.m, null, "cleared, kept as a marker so another device's older value cannot come back");
  assert.equal(r.sleep, 7.5); assert.equal(r.notes, "keep");
  assert.equal(r.stored.m, null, "written to the device storage straight away (autosave)");
});

test("only 1–5 are accepted and the note is one short line", async () => {
  const page = await start();
  const r = await page.evaluate(() => { const d = todayISO(); jrSet(d, "p", 0); jrSet(d, "e", 6); jrSet(d, "s", "x"); jrSet(d, "m", 2.5); jrSet(d, "zz", 3); jrNote(d, "  " + "a".repeat(300) + "\n second line "); return { jr: logGet(d)?.jr || null }; });
  assert.ok(!r.jr.p && !r.jr.e && !r.jr.s && !r.jr.m && r.jr.zz === undefined);
  assert.equal(r.jr.n.length, 140);
  assert.ok(!/\n/.test(r.jr.n));
});

test("a day without entries is not zero: means, coverage and counts only use the days that were filled (K5)", async () => {
  const page = await start();
  await fill(page, [[1, 4, 5, 3, 2], [3, 2, 3, 3, 4], [5, 3, 4, 5, 3]]);
  await page.evaluate(() => jrSet(addDays(todayISO(), -2), "m", 1));
  const r = await page.evaluate(() => { const t = todayISO(); return jrStats(addDays(t, -9), t); });
  assert.equal(r.span, 10);
  assert.equal(r.filled, 4, "four days have at least one value");
  assert.equal(r.mean.m, (5 + 3 + 4 + 1) / 4);
  assert.equal(r.mean.p, (4 + 2 + 3) / 3, "a metric missing on a day is skipped, not counted as 0");
  assert.equal(r.n.p, 3);
  const none = await page.evaluate(() => { const t = todayISO(); return jrStats(addDays(t, -400), addDays(t, -380)); });
  assert.equal(none.filled, 0); assert.equal(none.mean.m, null); assert.equal(none.best, null);
});

test("best and hardest days: composite of the values present (stress counts the other way), needs three of the four", async () => {
  const page = await start();
  await fill(page, [[1, 5, 5, 5, 1], [2, 1, 1, 1, 5], [3, 3, 3, 3, 3]]);
  await page.evaluate(() => { const d = addDays(todayISO(), -4); jrSet(d, "m", 5); jrSet(d, "e", 5); });
  const r = await page.evaluate(() => { const t = todayISO(); const s = jrStats(addDays(t, -9), t); return { best: s.best.map(x => x.d), worst: s.worst.map(x => x.d), t }; });
  const ago = n => page.evaluate(n => addDays(todayISO(), -n), n);
  assert.equal(r.best[0], await ago(1));
  assert.equal(r.worst[0], await ago(2));
  assert.ok(!r.best.includes(await ago(4)) && !r.worst.includes(await ago(4)), "two values only: not ranked");
});

test("Spearman matches hand-computed values, ties included", async () => {
  const page = await start();
  const r = await page.evaluate(() => ({ a: jrSpearman([1, 2, 3, 4, 5, 6, 7, 8], [2, 1, 4, 3, 6, 5, 8, 7]), b: jrSpearman([1, 2, 2, 3], [1, 3, 2, 4]), c: jrSpearman([1, 2, 3], [5, 5, 5]), d: jrSpearman([1], [1]) }));
  assert.ok(Math.abs(r.a - (1 - 6 * 8 / (8 * 63))) < 1e-12);
  assert.ok(Math.abs(r.b - 4.5 / Math.sqrt(22.5)) < 1e-12);
  assert.equal(r.c, null, "a constant series has no correlation");
  assert.equal(r.d, null);
});

test("patterns need a minimum sample and strength, are labelled 'tends to coincide' and never say cause (K7)", async () => {
  const page = await start();
  const few = await page.evaluate(() => { for (let i = 1; i <= 10; i++) { const d = addDays(todayISO(), -i); jrSet(d, "m", 1 + i % 5); mutateLog(d, x => { x.sleep = 5 + i % 5; }); } const t = todayISO(); return jrCorr(addDays(t, -30), t); });
  assert.deepEqual(few.rows, []); assert.equal(few.n, 10); assert.ok(few.need > 10);
  const r = await page.evaluate(() => {
    for (let i = 1; i <= 30; i++) { const d = addDays(todayISO(), -i), v = 1 + i % 5; jrSet(d, "m", v); mutateLog(d, x => { x.sleep = 5 + v * .5 + (i % 3) * .01; x.steps = 8000 + ((i * 7) % 11) * 100; }); }
    const t = todayISO(); return jrCorr(addDays(t, -40), t);
  });
  const row = r.rows.find(x => x.a === "m" && x.b === "sleep");
  assert.ok(row && row.rho > .9 && row.n === 30 && row.ci[0] > .7 && row.ci[1] <= 1);
  assert.match(row.text, /tends to coincide/i); assert.doesNotMatch(row.text, /caus|because|due to|leads? to/i);
  assert.ok(!r.rows.some(x => x.b === "steps" && Math.abs(x.rho) < .3), "weak pairs are not shown");
});

test("two devices: each field keeps its newest edit; a clear is an edit (K10)", async () => {
  const page = await start();
  const r = await page.evaluate(() => {
    const local = { jr: { m: 4, p: 2, t: { m: 200, p: 50 } } }, remote = { jr: { m: 2, e: 3, p: null, t: { m: 100, e: 300, p: 60 } } };
    return { merged: jrMergeDay(local, remote), same: jrMergeDay({ jr: { m: 1, t: { m: 5 } } }, { jr: { m: 1, t: { m: 5 } } }) };
  });
  assert.deepEqual({ m: r.merged.m, e: r.merged.e, p: r.merged.p }, { m: 4, e: 3, p: null });
  assert.deepEqual(r.merged.t, { m: 200, e: 300, p: 60 });
  assert.equal(r.same.m, 1);
});

test("a snapshot from the server never drops a newer local field, and the merged day is pushed back", async () => {
  const page = await start();
  const r = await page.evaluate(() => {
    const d = todayISO(), mk = d.slice(0, 7); jrSet(d, "m", 5); const localT = logGet(d).jr.t.m;
    const remote = { month: mk, days: { [d]: { jr: { m: 2, e: 4, t: { m: localT - 1000, e: localT + 10 } } } } };
    applyCollection("logm", { docs: [{ id: mk, data: () => remote }], metadata: { fromCache: false } });
    const j = logGet(d).jr; return { m: j.m, e: j.e };
  });
  assert.deepEqual(r, { m: 5, e: 4 });
});

test("backup → wipe → restore keeps the journal identical (K9)", async () => {
  const page = await start();
  await fill(page, [[1, 4, 5, 3, 2], [2, 3, 2, 4, 5]]);
  const out = await page.evaluate(() => { jrNote(addDays(todayISO(), -1), "Long run day"); const j = JSON.stringify(allLogDates().map(d => [d, logGet(d).jr])); const b = JSON.stringify(Object.fromEntries(Object.entries(S.logm))); return { j, b }; });
  const back = await page.evaluate(async b => { S.logm = {}; saveLocal(); const doc = JSON.parse(b); for (const [mk, v] of Object.entries(doc)) put("logm", mk, v); return JSON.stringify(allLogDates().map(d => [d, logGet(d).jr])); }, out.b);
  assert.equal(back, out.j);
  const rows = await page.evaluate(() => journalRows());
  assert.equal(rows.length, 2);
  assert.deepEqual(Object.keys(rows[0]), ["Date", "Productivity", "Mood", "Energy", "Stress", "Note"]);
  assert.equal(rows.find(r => r.Note === "Long run day").Mood, 5);
});

test("the Check-in keeps its own data and only links to the Journal; the Journal reads from it and asks nothing twice (K4)", async () => {
  const page = await start();
  await page.evaluate(() => { mutateLog(todayISO(), x => { x.sleep = 7.2; x.steps = 9000; }); openSheet("checkin", { date: todayISO(), live: true }); });
  const ci = await page.evaluate(() => ({ jrInputs: document.querySelectorAll('.sheet [data-act="jr-set"]').length, link: !!document.querySelector('.sheet [data-act="jr-open"]') }));
  assert.equal(ci.jrInputs, 0); assert.equal(ci.link, true);
  await page.evaluate(() => { closeSheet(); openSheet("journal", { date: todayISO(), live: true }); });
  const jr = await page.evaluate(() => ({ fields: [...document.querySelectorAll(".sheet .sheet-b input, .sheet .sheet-b textarea")].map(i => i.id || i.dataset.chg), ctx: document.querySelector(".sheet")?.innerText || "" }));
  assert.deepEqual(jr.fields, ["jr-n"], "the note is the only text field: no sleep, steps or water here");
  assert.match(jr.ctx, /7\.2 h sleep/);
});

for (const [name, vp] of Object.entries(H.VIEWPORTS)) {
  test(`one screen, one tap per answer, fixes a past day, no overflow — ${name}`, async () => {
    const page = await start(F.seed(), vp);
    await page.evaluate(() => openSheet("journal", { date: todayISO(), live: true }));
    await page.waitForSelector('.sheet [data-act="jr-set"]');
    const rows = await page.evaluate(() => ["p", "m", "e", "s"].map(k => document.querySelectorAll(`.sheet [data-act="jr-set"][data-k="${k}"]`).length));
    assert.deepEqual(rows, [5, 5, 5, 5]);
    const emo = await page.evaluate(() => [...document.querySelectorAll('.sheet [data-act="jr-set"][data-k="m"]')].map(b => b.getAttribute("aria-label")));
    assert.ok(emo.every(l => l && l.length > 2), "each mood has a text name, not only a picture");
    await page.click('.sheet [data-act="jr-set"][data-k="m"][data-v="4"]');
    await page.click('.sheet [data-act="jr-set"][data-k="e"][data-v="2"]');
    const saved = await page.evaluate(() => { const j = logGet(todayISO()).jr; return [j.m, j.e, j.p ?? null, j.s ?? null]; });
    assert.deepEqual(saved, [4, 2, null, null], "two taps, two saved values, nothing else required");
    assert.equal(await page.getAttribute('.sheet [data-act="jr-set"][data-k="m"][data-v="4"]', "aria-pressed"), "true");
    await page.click('.sheet [data-act="jr-go"]');
    const d2 = await page.evaluate(() => UI.sheet.date), y = await page.evaluate(() => addDays(todayISO(), -1));
    assert.equal(d2, y, "the previous-day arrow opens yesterday");
    await page.click('.sheet [data-act="jr-set"][data-k="p"][data-v="5"]');
    assert.equal(await page.evaluate(d => logGet(d).jr.p, y), 5);
    const over = await page.evaluate(() => { const s = document.querySelector(".sheet"); return [document.documentElement.scrollWidth > document.documentElement.clientWidth, s ? s.scrollWidth > s.clientWidth + 1 : false]; });
    assert.deepEqual(over, [false, false]);
  });

  test(`Progress › Journal: coverage, averages, calendar and best days, the empty state, no NaN — ${name}`, async () => {
    const page = await start(F.seed(), vp);
    await page.evaluate(() => { UI.tab = "progress"; UI.progSeg = "journal"; scheduleRender(); });
    await page.waitForFunction(() => /Journal/.test(document.body.innerText));
    const empty = await page.evaluate(() => document.body.innerText);
    assert.match(empty, /0 of \d+ days/); assert.doesNotMatch(empty, /NaN|undefined|Infinity/);
    await fill(page, [[0, 4, 4, 3, 2], [1, 5, 5, 4, 1], [2, 2, 2, 2, 5], [4, 3, 3, 3, 3]]);
    for (const r of ["week", "month", "year"]) {
      await page.evaluate(r => { UI.jrRange = r; UI.jrOff = 0; scheduleRender(); }, r);
      await page.waitForTimeout(80);
      const t = await page.evaluate(() => document.querySelector("#app, main, body").innerText);
      assert.doesNotMatch(t, /NaN|undefined|Infinity/, r);
      assert.match(t, /\d+ of \d+ days/, r);
      assert.ok(await page.evaluate(() => document.querySelectorAll('[data-act="jr-open"]').length) > 0, r + ": days open the day's entry");
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false, `${r}: no horizontal overflow`);
    }
  });
}

test("the Today card shows after the evening hour while today is empty and goes away once something is filled (K3)", async () => {
  const page = await start();
  const r = await page.evaluate(() => { const a = journalCard(9), b = journalCard(19); jrSet(todayISO(), "m", 3); return { a, b: b.includes("jr-quick"), c: journalCard(19) }; });
  assert.equal(r.a, "", "not before the evening"); assert.equal(r.b, true); assert.equal(r.c, "", "filled: gone");
  const off = await page.evaluate(() => { S.settings.feat = { journal: false }; mutateLog(todayISO(), x => { x.jr = null; }); return journalCard(20); });
  assert.equal(off, "", "the feature switch hides it");
});

test("the reminder is off by default, only fires once, only when the day is empty and the time has come", async () => {
  const page = await start();
  const r = await page.evaluate(async () => {
    const sent = []; window.Notification = Object.assign(function () {}, { permission: "granted" }); notify = (t, b, tag) => sent.push(tag);
    S.settings.reminders = { on: true }; const d = todayISO();
    journalTick("21:30"); const off = sent.length;
    S.settings.jr = { rem: true, at: "21:00" };
    journalTick("20:00"); const early = sent.length;
    journalTick("21:30"); journalTick("21:31"); const once = sent.length;
    return { off, early, once, tag: sent[0], d };
  });
  assert.equal(r.off, 0); assert.equal(r.early, 0); assert.equal(r.once, 1); assert.equal(r.tag, "engine-journal");
  const skip = await page.evaluate(() => { const sent = []; notify = (t, b, tag) => sent.push(tag); localStorage.removeItem("engine.rem"); jrSet(todayISO(), "m", 4); journalTick("22:00"); return sent.length; });
  assert.equal(skip, 0, "already filled: no nudge");
});

test("the AI summary is off by default, needs an AI service, and only receives aggregates, never your notes (K8)", async () => {
  const page = await start();
  await fill(page, [[1, 4, 4, 3, 2], [2, 3, 3, 3, 3]]);
  const r = await page.evaluate(() => { jrNote(addDays(todayISO(), -1), "SECRET-NOTE private words"); const t = todayISO(), p = jrAiPrompt(addDays(t, -29), t); return { on: jrAiOn(), prompt: p }; });
  assert.equal(r.on, false);
  assert.doesNotMatch(r.prompt, /SECRET-NOTE|private words/);
  assert.match(r.prompt, /2 of 30 days|2 days/);
  assert.match(r.prompt, /correlation|causation|not/i);
});

test("switching the Journal off hides every entry point and keeps the data", async () => {
  const page = await start();
  await fill(page, [[1, 4, 4, 3, 2]]);
  const r = await page.evaluate(() => { ACT["feat-toggle"]({ dataset: { k: "journal" } }); UI.tab = "progress"; UI.progSeg = "journal"; scheduleRender(); return { on: FEAT("journal"), kept: !!logGet(addDays(todayISO(), -1)).jr, card: journalCard(20) }; });
  assert.equal(r.on, false); assert.equal(r.kept, true); assert.equal(r.card, "");
  const seg = await page.evaluate(() => { navFix(); return UI.progSeg; });
  assert.notEqual(seg, "journal");
});
