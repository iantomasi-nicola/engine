const H = require("/home/user/engine/tests/lib/harness"), F = require("/home/user/engine/tests/fixtures/synthetic");
(async () => { const app = await H.startApp({ dir: process.env.BUILT, seed: F.seed({ withPlan: false }) });
  const r = await app.page.evaluate(() => {
    const M = (p, b, l, r) => syncMerge(p, b, l, r, "l");
    const base = { buys: [{ d: "2026-10-01", id: "t-rice", n: "Rice", g: 1000, eur: 2 }] };
    const l = { buys: [...base.buys, { d: "2026-10-20", id: "t-rice", n: "Rice", g: 1000, eur: 2.1 }] };
    const rr = { buys: [...base.buys, { d: "2026-10-21", id: "t-oil", n: "Oil", g: 500, eur: 5 }] };
    const raceDel = M("train", { racesDel: ["a"] }, { racesDel: ["a", "b"] }, { racesDel: ["a", "c"] }).racesDel;
    return { buys: M("shop", base, l, rr).buys.map(x => x.d + " " + x.id), raceDel };
  });
  console.log(JSON.stringify(r)); console.log(app.errors); await app.close(); })();
