const H = require("/home/user/engine/tests/lib/harness"), F = require("/home/user/engine/tests/fixtures/synthetic");
const dir = process.argv[2];
const where = p => p.evaluate(() => JSON.stringify({ tab: UI.tab, sheet: UI.sheet?.type ?? null, depth: navDepth(), dom: document.querySelector("#sheet-root .sheet")?.getAttribute("aria-label") ?? null, hl: history.length, i: NAV.i, st: NAV.stack.join(","), state: JSON.stringify(history.state), snaps: Object.keys(NAV.snaps).length }));
const back = async p => { await p.goBack().catch(() => {}); await p.waitForTimeout(300); };
const fwd = async p => { await p.goForward().catch(() => {}); await p.waitForTimeout(300); };
const go = async (p, fn, a) => { await p.evaluate(fn, a); await p.waitForTimeout(300); };
(async () => {
  const run = async (name, fn) => { const app = await H.startApp({ dir, seed: F.seed({ withPantry: true }), viewport: H.VIEWPORTS.phone }); const p = app.page; console.log("\n== " + name); try { await fn(p, app); } catch (e) { console.log("ERR", e.message); } console.log("errors:", app.errors); await app.close(); };
  await run("3-level chain + Back x3", async p => {
    await go(p, () => ACT["shopq-open"]()); await go(p, () => ACT["shop-buy"]({ dataset: { id: "t-chicken" } })); await go(p, () => ACT["by-edit"]());
    console.log(await where(p)); for (let k = 0; k < 4; k++) { await back(p); console.log("back", await where(p)); }
  });
  await run("closeToRoot from depth 3 then Back", async p => {
    await go(p, () => ACT["shopq-open"]()); await go(p, () => ACT["shop-buy"]({ dataset: { id: "t-chicken" } })); await go(p, () => ACT["by-edit"]());
    await go(p, () => closeToRoot()); console.log("after closeToRoot", await where(p));
    await back(p); console.log("back1", await where(p)); await back(p); console.log("back2", await where(p));
  });
  await run("open-close loop x30 (fast, same tick)", async p => {
    const h0 = await p.evaluate(() => history.length);
    for (let k = 0; k < 30; k++) await p.evaluate(() => { ACT["shopq-open"](); ACT["close-sheet"](); });
    await p.waitForTimeout(600); console.log("h0", h0, await where(p));
    for (let k = 0; k < 30; k++) { await p.evaluate(() => { ACT["shopq-open"](); }); await p.evaluate(() => ACT["close-sheet"]()); }
    await p.waitForTimeout(600); console.log("after loop2", await where(p));
    await back(p); console.log("back", await where(p));
  });
  await run("open/close faster than popstate: open A, close, open B immediately", async p => {
    await go(p, () => ACT["shopq-open"]());
    await p.evaluate(() => { ACT["close-sheet"](); ACT["shop-buy"]({ dataset: { id: "t-chicken" } }); }); await p.waitForTimeout(700);
    console.log(await where(p)); await back(p); console.log("back", await where(p)); await back(p); console.log("back2", await where(p));
  });
  await run("forward after in-app close", async p => {
    await go(p, () => ACT["shop-buy"]({ dataset: { id: "t-chicken" } })); await go(p, () => ACT["close-sheet"]());
    console.log(await where(p)); await fwd(p); console.log("fwd", await where(p));
  });
  await run("reload in the middle then Back", async (p, app) => {
    await go(p, () => ACT["tab"]({ dataset: { tab: "foods" } })); await go(p, () => ACT["shopq-open"]()); await go(p, () => ACT["shop-buy"]({ dataset: { id: "t-chicken" } }));
    console.log(await where(p)); await app.reload(); console.log("reloaded", await where(p));
    await go(p, () => ACT["tab"]({ dataset: { tab: "train" } })); await go(p, () => ACT["shopq-open"]()); console.log("new", await where(p));
    for (let k = 0; k < 5; k++) { await back(p); console.log("back", k, await where(p), p.url()); }
  });
  await run("Back while typing in a nested sheet", async p => {
    await go(p, () => ACT["shop-buy"]({ dataset: { id: "t-chicken" } })); await go(p, () => ACT["by-edit"]());
    const id = await p.evaluate(() => { const el = [...document.querySelectorAll("#sheet-root input, #sheet-root textarea")].find(x => x.id && x.type !== "checkbox" && x.dataset.chg !== undefined); el?.focus(); return el?.id; });
    console.log("focused", id, await where(p)); await back(p); console.log("back", await where(p));
    await p.evaluate(() => document.activeElement.blur()); await p.waitForTimeout(300); console.log("after blur", await where(p));
  });
  await run("Escape nested", async p => {
    await go(p, () => ACT["shop-buy"]({ dataset: { id: "t-chicken" } })); await go(p, () => ACT["by-edit"]());
    await p.keyboard.press("Escape"); await p.waitForTimeout(300); console.log("esc1", await where(p));
    await p.keyboard.press("Escape"); await p.waitForTimeout(300); console.log("esc2", await where(p));
    await back(p); console.log("back", await where(p));
  });
})();
