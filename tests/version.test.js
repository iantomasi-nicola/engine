/* Settings shows which build is running and can fetch the newest one. */
const test = require("node:test"), assert = require("node:assert/strict"), H = require("./lib/harness"), F = require("./fixtures/synthetic");
let app;
test.afterEach(async () => { await app?.close(); app = null; });

test("Settings › Data shows the running build; the label is readable; a development build says so", async () => {
  app = await H.startApp({ dir: H.build(H.tmp("ver-build")), seed: F.seed({ withPlan: false }), viewport: H.VIEWPORTS.phone });
  const r = await app.page.evaluate(async () => { UI.setOpen = { data: true }; UI.tab = "settings"; scheduleRender(); await new Promise(r => setTimeout(r, 500));
    return { build: BUILD(), expected: buildLabel(BUILD()), label: document.querySelector("#app-version")?.textContent, dev: buildLabel(""), fmt: buildLabel("202610241035"), btn: !!document.querySelector("[data-act=check-update]"), sw: document.documentElement.scrollWidth <= innerWidth }; });
  assert.match(r.build, /^\d{12}$/); assert.equal(r.label, r.expected); assert.equal(r.fmt, "Build 2026-10-24 10:35 UTC"); assert.equal(r.dev, "Development build"); assert.ok(r.btn && r.sw);
});

test("Check for updates: newer build reloads, same build says so, no connection says so", async () => {
  app = await H.startApp({ dir: H.build(H.tmp("ver2-build")), seed: F.seed({ withPlan: false }) });
  const r = await app.page.evaluate(async () => {
    const msgs = [], realToast = toast, realFetch = window.fetch, cur = BUILD(); let reloads = 0;
    toast = m => msgs.push(m); reloadApp = () => reloads++;
    const page = b => () => Promise.resolve({ text: () => Promise.resolve(`<meta name="engine-build" content="${b}">`) });
    window.fetch = page("999912312359"); await ACT["check-update"](); await new Promise(r => setTimeout(r, 1000)); const newer = { msgs: [...msgs], reloads };
    msgs.length = 0; reloads = 0; window.fetch = page(cur); await ACT["check-update"](); const same = { msgs: [...msgs], reloads };
    msgs.length = 0; window.fetch = () => Promise.reject(new Error("offline")); await ACT["check-update"](); const off = { msgs: [...msgs], reloads };
    window.fetch = realFetch; toast = realToast; return { newer, same, off };
  });
  assert.equal(r.newer.reloads, 1); assert.match(r.newer.msgs[1], /New version/); assert.equal(r.same.reloads, 0); assert.match(r.same.msgs[1], /latest version/); assert.match(r.off.msgs[1], /Can't check/);
});
