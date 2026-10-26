const H = require("/home/user/engine/tests/lib/harness"), F = require("/home/user/engine/tests/fixtures/synthetic");
const fs = require("fs"), path = require("path");
const dir = process.argv[2];
(async () => {
  const { chromium } = H.loadPlaywright(), srv = await H.serve(dir);
  const browser = await chromium.launch({ args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] });
  const ctx = await browser.newContext({ viewport: H.VIEWPORTS.phone, serviceWorkers: "block", permissions: ["camera"] });
  await ctx.addInitScript(([k, v]) => { localStorage.setItem("engine.localOnly", "true"); if (!sessionStorage.getItem("__s")) { localStorage.setItem(k, v); sessionStorage.setItem("__s", 1); } }, [H.LS_KEY, JSON.stringify(F.seed({ withPantry: true }))]);
  const p = await ctx.newPage(), errors = []; p.on("pageerror", e => errors.push(e.message));
  await ctx.route(u => !/127\.0\.0\.1|localhost/.test(new URL(u).hostname), r => r.abort());
  await p.goto(srv.url); await p.waitForFunction(() => typeof S !== "undefined" && S.settings); await p.waitForTimeout(600);
  const st = () => p.evaluate(() => JSON.stringify({ sheet: UI.sheet?.type ?? null, cam: !!document.getElementById("cam"), live: !!CAM.stream && CAM.stream.getTracks().some(t => t.readyState === "live"), i: NAV.i }));
  await p.evaluate(() => ACT["shopq-open"]()); await p.waitForTimeout(300);
  await p.evaluate(() => ACT["shop-scan"]()); await p.waitForTimeout(1500); console.log("camera open", await st());
  await p.focus("[data-act=cam-close]"); await p.keyboard.press("Tab"); console.log("tab from cam-close ->", await p.evaluate(() => [document.activeElement.closest("#cam") ? "in camera" : document.activeElement.closest("#sheet-root") ? "in hidden sheet" : "elsewhere", document.activeElement.outerHTML.slice(0, 80)]));
  await p.evaluate(() => document.querySelector("[data-act=cam-close]")?.click()); await p.waitForTimeout(400); console.log("after cam close", await st());
  console.log("errors", errors); await browser.close(); srv.close();
})();
