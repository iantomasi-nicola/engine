/* M14b group C, what people feel: sheets as dialogs (focus in, Tab kept inside, page behind inert, focus back), the toast that waits for hover and focus,
   reduced motion on the two smooth scrolls, 32 px hit areas, the selected calendar tab's contrast, the sync pill at 200% zoom. area11 #9, #13, #14, #15, #17, #18.

   Expected values (by hand):
   - hit area: a control 22 px high with an inset of -8 px on both sides is 38 px (>= 32); .chip.sm 30 + 12 = 42; .switch 31 + 4 = 35; week arrows 32 px wide.
   - contrast: WCAG ratio (L1 + .05) / (L2 + .05), L = .2126 R + .7152 G + .0722 B on linearised sRGB; the limit for 14 px text is 4.5. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let dir, app;
test.before(() => { dir = H.build(H.tmp("m14bc-ui")); });
test.afterEach(async () => { await app?.close(); app = null; });
const start = async (viewport = H.VIEWPORTS.desktop, extra = {}) => { app = await H.startApp({ dir, seed: F.seed({ withPantry: true }), viewport, ...extra }); return app.page; };

test("a sheet is a dialog: focus goes in, Tab and Shift+Tab stay inside, the page behind is inert, Escape returns the focus to the control that opened it", async () => {
  const page = await start();
  await page.evaluate(() => { UI.tab = "today"; render(); const b = document.querySelector("#main button[data-act]"); b.id = "opener"; b.focus(); openSheet("confirm", { title: "Sure?", text: "Check", yes: "Yes", run() {} }); });
  assert.equal(await page.evaluate(() => !!document.activeElement.closest("#sheet-root")), true, "focus starts inside the sheet");
  assert.equal(await page.evaluate(() => ["main", "side", "bnav"].every(id => document.getElementById(id).inert)), true, "the page behind is inert");
  for (let i = 0; i < 12; i++) { await page.keyboard.press("Tab"); assert.equal(await page.evaluate(() => !!document.activeElement.closest("#sheet-root")), true, "Tab " + i); }
  for (let i = 0; i < 12; i++) { await page.keyboard.press("Shift+Tab"); assert.equal(await page.evaluate(() => !!document.activeElement.closest("#sheet-root")), true, "Shift+Tab " + i); }
  await page.keyboard.press("Escape");
  assert.equal(await page.evaluate(() => document.activeElement.id), "opener");
  assert.equal(await page.evaluate(() => ["main", "side", "bnav"].some(id => document.getElementById(id).inert)), false, "nothing is inert after closing");
  assert.deepEqual(app.errors, []);
});

test("a sheet opened from another sheet keeps the page inert and gives the focus back when the chain closes", async () => {
  const page = await start();
  await page.evaluate(() => { UI.tab = "today"; render(); const b = document.querySelector("#main button[data-act]"); b.id = "opener"; b.focus(); openSheet("shopq", { keep: true }); openSheet("confirm", { title: "Inner", text: "x", yes: "Yes", run() {} }); });
  assert.equal(await page.evaluate(() => !!document.activeElement.closest("#sheet-root") && document.getElementById("main").inert), true);
  await page.evaluate(() => { closeSheet(); });
  assert.equal(await page.evaluate(() => document.getElementById("main").inert && !!document.activeElement.closest("#sheet-root")), true, "back in the parent sheet, still a dialog");
  await page.evaluate(() => { closeSheet(); });
  assert.deepEqual(await page.evaluate(() => [document.getElementById("main").inert, document.activeElement.id]), [false, "opener"]);
});

test("the toast waits while the pointer or the focus is on it, and an Undo toast stays ten seconds", async () => {
  const page = await start();
  await page.evaluate(() => { toast("Plain message"); });
  await page.hover("#toast .toast"); await page.waitForTimeout(3800);
  assert.equal(await page.evaluate(() => !!document.querySelector("#toast .toast")), true, "still there under the pointer");
  await page.mouse.move(5, 5); await page.waitForTimeout(3700);
  assert.equal(await page.evaluate(() => !!document.querySelector("#toast .toast")), false, "gone once the pointer left");
  assert.equal(await page.evaluate(() => { toast("Done", () => {}); return toast.ms; }), 10000);
});

test("the two smooth scrolls follow the system's reduced-motion setting", async () => {
  const page = await start();
  const run = async () => page.evaluate(async () => { document.body.insertAdjacentHTML("beforeend", '<div id="gear-set"></div>'); const seen = []; const o = Element.prototype.scrollIntoView; Element.prototype.scrollIntoView = function (a) { seen.push(a && a.behavior); }; ACT["gear-set"](); await new Promise(r => setTimeout(r, 400)); Element.prototype.scrollIntoView = o; return seen; });
  await page.emulateMedia({ reducedMotion: "reduce" }); assert.deepEqual((await run()).filter(Boolean), ["auto"]);
  await page.emulateMedia({ reducedMotion: "no-preference" }); assert.deepEqual((await run()).filter(Boolean), ["smooth"]);
});

/* the size of the area a pointer reaches: steps outward from the element's centre line while elementFromPoint still says it is this control */
const PROBE = () => {
  const eff = el => { const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, hit = (x, y) => { const e = document.elementFromPoint(x, y); return e && (e === el || el.contains(e)); };
    let u = 0, d = 0, l = 0, rr = 0; while (u < 30 && hit(cx, r.top - u - 1)) u++; while (d < 30 && hit(cx, r.bottom + d)) d++; while (l < 30 && hit(r.left - l - 1, cy)) l++; while (rr < 30 && hit(r.right + rr, cy)) rr++;
    return { w: Math.round(r.width + l + rr), h: Math.round(r.height + u + d) }; };
  const out = [];
  for (const sel of [".link", ".chip.sm", ".st-pill", ".pk-n", ".switch", ".add-tag button", "[data-act=pantry-sort]", ".chk", ".icon-btn.sm", ".week .nav"]) for (const el of document.querySelectorAll("#main " + sel)) { const r = el.getBoundingClientRect(); if (!r.width || r.bottom < 0 || r.top > innerHeight - 70 || !el.checkVisibility({ contentVisibilityAuto: true })) continue; const e = eff(el); if (e.w < 32 || e.h < 32) out.push(`${sel} ${el.dataset.act || ""} ${e.w}x${e.h}`); }
  return out;
};
test("small controls reach at least 32 px (links, small chips, pills, switches, week arrows) on the screens where they were found", async () => {
  const page = await start(H.VIEWPORTS.phone), bad = [];
  for (const [tab, extra] of [["plan"], ["shop"], ["pantry"], ["foods"], ["train", { trainSeg: "wk" }], ["progress", { progSeg: "overview" }], ["progress", { progSeg: "body" }], ["settings"]]) {
    await page.evaluate(([tab, extra]) => { Object.assign(UI, { tab, date: todayISO() }, extra || {}); render(); window.scrollTo(0, 0); }, [tab, extra]); await page.waitForTimeout(250);
    for (const y of [0, 700, 1500]) { await page.evaluate(y => window.scrollTo(0, y), y); bad.push(...(await page.evaluate(PROBE)).map(x => tab + ": " + x)); }
  }
  assert.deepEqual([...new Set(bad)], []);
});

test("the selected calendar tab reads at 4.5:1 or more, in the light and the dark theme", async () => {
  for (const scheme of ["light", "dark"]) {
    const page = await start(H.VIEWPORTS.phone); await page.emulateMedia({ colorScheme: scheme });
    await page.evaluate(() => { UI.tab = "train"; UI.trainSeg = "cal"; render(); }); await page.waitForTimeout(300);
    const ratio = await page.evaluate(() => {
      const b = document.querySelector('.subseg button[aria-selected="true"]'), cv = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
      const rgba = c => { cv.clearRect(0, 0, 1, 1); cv.fillStyle = "#000"; cv.fillStyle = c; cv.fillRect(0, 0, 1, 1); return [...cv.getImageData(0, 0, 1, 1).data]; };
      let bg = [0, 0, 0, 0]; const layers = []; for (let e = b; e; e = e.parentElement) layers.push(getComputedStyle(e).backgroundColor); layers.reverse();
      let base = [255, 255, 255]; for (const c of layers) { const [r, g, bl, a] = rgba(c); const al = a / 255; base = [r * al + base[0] * (1 - al), g * al + base[1] * (1 - al), bl * al + base[2] * (1 - al)]; }
      const fg = rgba(getComputedStyle(b).color), lum = ([r, g, bl]) => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(bl); };
      const L1 = lum(fg), L2 = lum(base); return (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05);
    });
    assert.ok(ratio >= 4.5, `${scheme}: ${ratio.toFixed(2)}`);
    await app.close(); app = null;
  }
});

test("at a 200% zoom (195 px) the sync pill is a dot beside the title, not a label on top of it", async () => {
  const page = await start({ width: 195, height: 640 });
  await page.evaluate(() => { UI.tab = "settings"; render(); }); await page.waitForTimeout(300);
  const r = await page.evaluate(() => { const p = document.querySelector("#main .sync").getBoundingClientRect(), t = document.querySelector("#main .top-title").getBoundingClientRect(); return { pill: Math.round(p.width), overlap: !(p.right <= t.left || p.left >= t.right || p.bottom <= t.top || p.top >= t.bottom), over: document.documentElement.scrollWidth > innerWidth }; });
  assert.deepEqual(r, { pill: r.pill, overlap: false, over: false }); assert.ok(r.pill < 36, "the pill is only a dot: " + r.pill);
  assert.deepEqual(await page.evaluate(() => { const s = document.querySelector("#main .sync > span"); return [Math.round(s.getBoundingClientRect().width), s.textContent.trim().length > 0]; }), [1, true], "the words stay for screen readers");
});
