/* Inventory quantities are in each food's declared base unit (g or ml).
   Pure calculations shared by the browser and Node regression tests. */
(function (root) {
  "use strict";
  const copy = x => JSON.parse(JSON.stringify(x));
  const amount = x => +x > 0 && Number.isSafeInteger(Math.round(+x * 1000)) ? Math.round(+x * 1000) / 1000 : 0;
  const items = day => Object.values(day?.meals || {}).flat();
  function ingredients(item, recipe) {
    if (item.kind === "food") return { [item.ref]: amount(item.qty) };
    const out = {}, r = item.kind === "recipe" ? recipe(item.ref) : null;
    if (r) for (const i of r.ingredients || []) out[i.food] = amount((out[i.food] || 0) + amount(i.g) * amount(item.qty) / (amount(r.servings) || 1));
    return out;
  }
  function demand(days, start, end, recipe) {
    const out = {};
    for (const [date, day] of Object.entries(days || {})) if (date >= start && date <= end)
      for (const item of items(day)) if (!item.eaten)
        for (const [id, q] of Object.entries(ingredients(item, recipe))) out[id] = amount((out[id] || 0) + q);
    return out;
  }
  function rows({ days, pantry, start, end, today, food, recipe }) {
    const needed = demand(days, start, end, recipe), earlier = {};
    for (const [date, day] of Object.entries(days || {})) if (date >= today && date < start)
      for (const item of items(day)) if (!item.eaten)
        for (const [id, q] of Object.entries(ingredients(item, recipe))) earlier[id] = amount((earlier[id] || 0) + q);
    return Object.entries(needed).flatMap(([id, need]) => {
      const f = food(id); if (!f || !need) return [];
      const p = pantry?.[id], expired = !!(p?.exp && p.exp < today), have = amount(p?.g);
      const reserved = Math.min(have, earlier[id] || 0), available = expired ? 0 : amount(have - reserved);
      const covered = Math.min(need, available), buy = amount(need - covered), remaining = amount(available - covered);
      const pack = amount(p?.pk) || amount(f.pack);
      const variable = f.varPack ?? (f.cat === "produce" && !(f.countable && f.pack > 0 && f.pack <= 30));
      const packs = !variable && pack && buy ? Math.ceil((buy - 1e-9) / pack) : 0;
      return [{ id, f: { ...f, pack }, need, have, reserved, available, covered, free: available, buy, remaining,
        exhausted: available > 0 && remaining === 0, expired, packs, left: packs ? amount(packs * pack - buy) : 0,
        cat: f.cat || "other", vary: !!variable }];
    });
  }
  const basis = it => JSON.stringify([it.kind, it.ref, +it.qty]);
  /* Receipts record actual withdrawals, including zero when stock was insufficient.
     Legacy eaten items without receipts are not reversed: their original withdrawal is unknown. */
  function reconcile(before, after, pantry, recipe, today, restoreReceipts = false) {
    const stock = copy(pantry || {}), prev = new Map(items(before).map(it => [it.id, it])), next = new Map(items(after).map(it => [it.id, it]));
    const unchanged = (a, b) => a?.eaten && b?.eaten && basis(a) === basis(b);
    for (const [id, old] of prev) if (old.eaten && old.stockUsed && !unchanged(old, next.get(id)))
      for (const [fid, q] of Object.entries(old.stockUsed)) if (amount(q)) stock[fid] = { ...(stock[fid] || {}), g: amount(amount(stock[fid]?.g) + amount(q)) };
    for (const item of items(after)) {
      const old = prev.get(item.id);
      if (unchanged(old, item)) { if (old.stockUsed) item.stockUsed = copy(old.stockUsed); else delete item.stockUsed; continue; }
      const receipt = item.stockUsed;
      delete item.stockUsed;
      if (!item.eaten || item.kind === "quick") continue;
      // Historical consumption has no reliable inverse; editing it must not withdraw twice.
      if (restoreReceipts ? !receipt : old?.eaten && !old.stockUsed) continue;
      item.stockUsed = {};
      for (const [id, q] of Object.entries(restoreReceipts ? receipt : ingredients(item, recipe))) {
        const p = stock[id], usable = p && !(p.exp && p.exp < today) ? amount(p.g) : 0, taken = Math.min(q, usable);
        if (restoreReceipts && usable < q) throw new Error("Cannot restore the original consumption: stock has changed. Review the pantry first.");
        if (taken) { p.g = amount(usable - taken); item.stockUsed[id] = taken; }
      }
    }
    return stock;
  }
  function purchase(shop, entries, today, transactionId) {
    const out = copy(shop); out.pantry ||= {}; out.prices ||= {}; out.buys ||= []; out.checked ||= {};
    const receipt = { id: transactionId, lines: [] };
    for (const e of entries) {
      const g = amount(e.g); if (!g || !e.id) throw new Error("Enter an amount above zero.");
      if (e.eur != null && (!Number.isFinite(e.eur) || e.eur < 0)) throw new Error("Enter a valid price, or leave it empty.");
      const old = out.pantry[e.id] || {}, eur = e.eur == null ? null : Math.round(e.eur * 100) / 100;
      const line = { id: e.id, g, before: copy(old), priceBefore: copy(out.prices[e.id] || null) };
      out.pantry[e.id] = { ...old, g: amount(amount(old.g) + g) };
      if (eur != null && !e.est) {
        const p = out.prices[e.id];
        out.prices[e.id] = { g, eur, at: today, transactionId, hist: [...(p?.hist || (p ? [{ g: p.g, eur: p.eur, at: p.at }] : [])), { g, eur, at: today }].slice(-8) };
      }
      out.buys.push({ d: today, id: e.id, n: e.name, g, eur, est: !!e.est, transactionId });
      delete out.checked[e.id]; receipt.lines.push(line);
    }
    return { shop: out, receipt };
  }
  function undoPurchase(shop, receipt) {
    const out = copy(shop);
    if (!receipt.lines.every(l => (out.buys || []).some(b => b.transactionId === receipt.id && b.id === l.id))) throw new Error("This purchase has already been undone.");
    const sums = {};
    for (const l of receipt.lines) sums[l.id] = amount((sums[l.id] || 0) + l.g);
    for (const [id, g] of Object.entries(sums)) if (amount(out.pantry?.[id]?.g) + 1e-9 < g) throw new Error("Some of this purchase has been used. Undo the consumption first.");
    for (const [id, g] of Object.entries(sums)) out.pantry[id].g = amount(out.pantry[id].g - g);
    for (const l of receipt.lines) if (out.prices?.[l.id]?.transactionId === receipt.id) {
      if (l.priceBefore) out.prices[l.id] = copy(l.priceBefore); else delete out.prices[l.id];
    }
    out.buys = out.buys.filter(b => b.transactionId !== receipt.id);
    return out;
  }
  function parseQuantity(value) {
    const s = String(value ?? "").trim().replace(",", "."), parts = s.split("/");
    const decimal = /^\d+(?:\.\d+)?$/;
    if (!parts.every(p => decimal.test(p.trim())) || parts.length > 2) return NaN;
    const n = +parts[0], d = parts.length === 2 ? +parts[1] : 1;
    return d > 0 && Number.isFinite(n / d) ? n / d : NaN;
  }
  const api = { amount, ingredients, demand, rows, reconcile, purchase, undoPurchase, parseQuantity };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.EngineInventory = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
