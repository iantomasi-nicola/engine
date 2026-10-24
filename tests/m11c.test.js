/* M11c and the fixes before it: the workout card on Today stays a card, every «Ready to start» page has no boxes. Synthetic data only. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let dir, app;
test.before(async () => { dir = H.build(H.tmp("m11c-build")); });
test.afterEach(async () => { await app?.close(); app = null; });

test("Today keeps the workout as a card (only the pages before a workout lose their boxes)", async () => {
  app = await H.startApp({ dir, seed: F.seed(), viewport: H.VIEWPORTS.phone });
  const r = await app.page.evaluate(() => { UI.tab = "today"; render(); const c = document.querySelector(".td-card.td-train"), s = getComputedStyle(c); return { shadow: s.boxShadow, bg: s.backgroundColor }; });
  assert.notEqual(r.shadow, "none", "the training card has its elevation");
  assert.notEqual(r.bg, "rgba(0, 0, 0, 0)", "the training card has its surface");
  assert.deepEqual(app.errors, []);
});

for (const [name, sport, script] of [["strength", "strength", "Pull 3x\n- 6 Pull-up\n- 8 Ring push-up"], ["run", "Running", "Warm-up\n- 10m Z1\n\nMain 3x\n- 3m Z4\n- 2m Z1"]]) {
  test(`«Ready to start» (${name}) is flat: sections divided by a line, no card, no boxed tile`, async () => {
    for (const vp of [H.VIEWPORTS.phone, H.VIEWPORTS.desktop]) {
      app = await H.startApp({ dir, seed: F.seed(), viewport: vp });
      const r = await app.page.evaluate(([sport, script]) => { startWorkout({ script, name: "Flat day", sport: sport === "strength" ? strengthSport() : sport, date: todayISO() }); UI.tab = "live"; render();
        const boxed = el => { const s = getComputedStyle(el); return s.boxShadow !== "none" || !/rgba\(0, 0, 0, 0\)|transparent/.test(s.backgroundColor) || (parseFloat(s.borderTopWidth) > 0 && parseFloat(s.borderLeftWidth) > 0); };
        const title = document.querySelector(".top-title, .lv-h1")?.closest("body") ? [...document.querySelectorAll("*")].some(e => e.textContent === "Ready to start") : false;
        const boxes = [...document.querySelectorAll(".lv-main .lv-card, .lv-side .lv-card, .pv-tiles > div, .lv-main .pv-sec")].filter(boxed).map(e => e.className);
        return { title, auto: !!LV().auto, boxes }; }, [sport, script]);
      assert.ok(r.title, "the page is «Ready to start»"); assert.equal(r.auto, name === "run");
      assert.deepEqual(r.boxes, [], `no boxes at ${vp.width}px`);
      assert.deepEqual(app.errors, []); await app.close(); app = null;
    }
  });
}
