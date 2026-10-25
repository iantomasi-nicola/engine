/* Layout audit (permanent rule, AGENTS.md «Design impeccabile»): walks every screen on phone, tablet and PC with synthetic data and reports
   page overflow, text cut off, text drawn over other text, controls outside the screen and tap targets that are too small.
   Usage: node layout-audit.js [outdir] [--dark] [--strict]   (with an outdir it also saves one screenshot per screen and viewport; --dark runs in the dark theme; exit code 1 when something is found, with --strict also on design-lint warnings) */
const H = require("./lib/harness"), F = require("./fixtures/synthetic"), fs = require("fs"), path = require("path");
const OUT = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : null;
if (OUT) fs.mkdirSync(OUT, { recursive: true });
const VPS = { phone: H.VIEWPORTS.phone, tablet: H.VIEWPORTS.tablet, pc: H.VIEWPORTS.desktop, wide: { width: 1920, height: 1080 } };
const SCREENS = [
  ["today", "UI.tab='today'"], ["meals", "UI.tab='plan';UI.fuelTab='plan'"], ["foods", "UI.tab='foods';UI.fuelTab='foods'"], ["shop", "UI.tab='shop';UI.fuelTab='shop'"], ["pantry", "UI.tab='pantry';UI.fuelTab='pantry'"],
  ...["cal", "week", "wk", "fitness", "races", "running", "records"].map(k => ["train-" + k, `UI.tab='train';UI.trainSeg='${k}'`]),
  ...["overview", "energy", "training", "days", "nutrition", "body", "weeks", "lab", "level", "goals"].map(k => ["progress-" + k, `UI.tab='progress';UI.progSeg='${k}'`]),
  ["week", "UI.tab='week'"], ["timer", "UI.tab='timer'"],
  ...["look", "targets", "meals", "nutrition", "intervals", "live", "rem", "ai", "acct", "data", "feat"].map(k => ["settings-" + k, `UI.tab='settings';UI.setSel='${k}'`]),
];
const SHEETS_TO_OPEN = [
  ["sheet-cheat", "openCheat({date:todayISO(),meal:activeMeals()[0].id})"], ["sheet-battery", "openSheet('battery',{})"], ["records-open", "UI.tab='train';UI.trainSeg='perf';UI.perfSeg='records';UI.fold = { rec: {'Running personal bests':true,'Calisthenics tests':true,'Race circuits':true,'Endurance Cup ranking':true,'All results':true} };ACT['race-stage-add']()"], ["sheet-sleep", "openSheet('sleep',{})"], ["sheet-journal", "domsSet(todayISO(),'quads',2);openSheet('journal',{date:todayISO(),live:true})"], ["sheet-rcimp", "Sync.sample={json:async()=>({})};openSheet('rcimp',{})"], ["tools-timers", "UI.tab='timer';UI.toolSeg='timers'"], ["tools-calc", "UI.tab='timer';UI.toolSeg='calc';UI.toolOpen='rm';tcs('rm').w='100';tcs('rm').r='5'"], ["tools-plates", "UI.tab='timer';UI.toolSeg='calc';UI.toolOpen='plates';tcs('plates').t='142.5'"], ["sheet-race", "WK().live=null;startWorkout({script:raceScript(raceList()[0]),name:'Fire Set',sport:strengthSport(),date:todayISO()});UI.tab='live'"], ["sheet-ready-str-chart", "WK().live=null;startWorkout({script:'Pull 4x\\n- 5 Pull-up +10kg\\n- 8 Dip\\n\\nEMOM 10m\\n- 5 Push-up\\n\\nTabata 8x 20s/10s\\n- Burpee',name:'Mix',sport:strengthSport(),date:todayISO()});UI.tab='live'"], ["sheet-ready-stage", "WK().live=null;startWorkout({script:raceStageScript(),name:'Stage',sport:strengthSport(),date:todayISO()});UI.tab='live'"], ["sheet-wedit-race", "ACT['we-new']();ACT['we-race']({dataset:{i:'stage'}})"], ["sheet-story", "storyOpen(todayISO(),{sport:strengthSport(),min:40,note:'Pulls'},{min:40,name:'Pulls',sets:[{ex:'Pull-up',reps:[6,6],load:10}]})"],
  ["sheet-ready-str", "startWorkout({script:'Pull 3x\\n- 6 Pull-up\\n- 8 Ring row',name:'Gear day',sport:strengthSport(),date:todayISO()});UI.tab='live'"],
  ["sheet-ready-run", "WK().live=null;startWorkout({script:'Warm-up\\n- 10m Z1\\n\\nMain 3x\\n- 3m Z4\\n- 2m Z1',name:'Intervals',sport:'Running',date:todayISO()});UI.tab='live'"],
];
/* runs in the page: design lint, the things that look "storto" without breaking the layout: edges that almost line up, a row whose controls sit at different heights, cards of different height side by side, an icon off the text's axis, tiny text. Warnings: they do not fail the audit (use --strict to make them fail) */
const LINT = () => {
  const out = [], R = e => e.getBoundingClientRect(), name = e => (e.tagName.toLowerCase() + (e.className && typeof e.className === "string" ? "." + e.className.trim().split(/\s+/).slice(0, 2).join(".") : "")).slice(0, 50);
  const vis = e => { const s = getComputedStyle(e), r = R(e); if (s.visibility === "hidden" || s.display === "none" || +s.opacity <= 0.05 || r.width <= 0 || r.height <= 0) return false; const d = e.closest("details"); if (d && !d.open && !e.closest("summary")) return false; return true; };
  const root = document.querySelector(".sheet") || document.querySelector("main") || document.body, skip = "svg,canvas,.cv,.wb,.ph-strip,.td-ds,.toast,#toast,.bnav,.tnav,.dock,.lv-dock,.sheet-f,.sheet-h,.wc,.mini,.bt-svg,.chart";
  const all = [...root.querySelectorAll("*")].filter(e => vis(e) && !e.closest(skip));
  for (const p of all) { const kids = [...p.children].filter(c => vis(c) && !/^(svg|path|use|i|script|style)$/i.test(c.tagName)); if (kids.length < 2) continue;
    const cs = getComputedStyle(p), rects = kids.map(R);
    // 1. a column of siblings of the same kind whose left edges nearly, but not exactly, line up
    if (cs.display !== "inline" && !/flex|grid/.test(cs.display) || (/flex/.test(cs.display) && cs.flexDirection === "column")) { const by = {}; kids.forEach((c, i) => { const k = c.tagName + "." + (typeof c.className === "string" ? c.className.split(/\s+/)[0] : ""); (by[k] = by[k] || []).push(rects[i]); });
      for (const [k, rs] of Object.entries(by)) { if (rs.length < 2) continue; const ls = rs.map(r => r.left), mn = Math.min(...ls), mx = Math.max(...ls); if (mx - mn > 0.9 && mx - mn <= 8 && rs.every(r => r.width > 40)) out.push(`edges almost line up (${(mx - mn).toFixed(1)} px): ${k} in ${name(p)}`); } }
    // 2. one visual row: controls at different heights, cards of different height, icon off the text axis
    if (/flex|grid/.test(cs.display) && !(cs.flexDirection === "column" && cs.display.includes("flex"))) { const line = rects.map((r, i) => i).filter(i => Math.abs((rects[i].top + rects[i].bottom) / 2 - (rects[0].top + rects[0].bottom) / 2) < Math.max(rects[0].height, rects[i].height) * 0.6);
      if (line.length >= 2 && line.length === kids.length) { const ctl = line.filter(i => kids[i].matches("button,.btn,.chip,input,select,.icon-btn,.pill,[role=switch]")), hs = ctl.map(i => rects[i].height), cy = ctl.map(i => (rects[i].top + rects[i].bottom) / 2);
        if (ctl.length >= 2 && !/seg|chips|subseg/.test(p.className) && Math.max(...cy) - Math.min(...cy) > 2.5 && cs.alignItems !== "baseline") out.push(`row of controls not on one axis (${(Math.max(...cy) - Math.min(...cy)).toFixed(1)} px): ${name(p)}`);
        const cards = line.filter(i => kids[i].matches(".card,.gl-t,.stat,.kpi,.an-k,.td-card,.rec-sec,.type-card")), ch = cards.map(i => rects[i].height); if (cards.length >= 2 && Math.max(...ch) - Math.min(...ch) > 3 && cs.alignItems !== "start" && cs.alignItems !== "flex-start" && !/tg-col|today-grid/.test(p.className)) out.push(`cards of different height in a row (${Math.round(Math.min(...ch))}–${Math.round(Math.max(...ch))} px): ${name(p)}`); } }
  }
  for (const b of all.filter(e => e.matches("button,.btn,.chip,.pill,a.link"))) { const svg = b.querySelector(":scope > svg"), tx = [...b.childNodes].find(n => n.nodeType === 3 && n.textContent.trim()); if (!svg || !tx) continue;
    const rg = document.createRange(); rg.selectNodeContents(b); const tr = [...rg.getClientRects()].filter(r => r.width > 2 && r.height > 6 && Math.abs(r.width - R(svg).width) > 1), sr = R(svg); if (!tr.length) continue; const tcy = tr.reduce((a, r) => a + (r.top + r.bottom) / 2, 0) / tr.length, scy = (sr.top + sr.bottom) / 2;
    if (Math.abs(tcy - scy) > 2.2 && b.getBoundingClientRect().height < 60) out.push(`icon off the text axis (${Math.abs(tcy - scy).toFixed(1)} px): «${b.textContent.trim().slice(0, 22)}»`); }
  for (const e of all) { if (e.children.length || !e.textContent.trim()) continue; const fs = parseFloat(getComputedStyle(e).fontSize); if (fs < 10.5 && !e.closest("svg,.chart")) out.push(`tiny text (${fs}px): «${e.textContent.trim().slice(0, 24)}»`); }
  return [...new Set(out)];
};
/* runs in the page: returns the problems it finds in what is on screen now */
const CHECK = () => {
  const vw = innerWidth, out = [], R = e => e.getBoundingClientRect(), name = e => (e.tagName.toLowerCase() + (e.className && typeof e.className === "string" ? "." + e.className.trim().split(/\s+/).slice(0, 2).join(".") : "")).slice(0, 60);
  const vis = e => { const s = getComputedStyle(e), r = R(e); if (s.visibility === "hidden" || s.display === "none" || +s.opacity <= 0.05 || r.width <= 0 || r.height <= 0) return false; const d = e.closest("details"); if (d && !d.open && !e.closest("summary")) return false; return true; };
  const scrolls = e => { for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) { const o = getComputedStyle(a).overflowX; if ((o === "auto" || o === "scroll") && a.scrollWidth > a.clientWidth) return true; } return false; };
  if (document.documentElement.scrollWidth > vw + 1) out.push(`page scrolls sideways (${document.documentElement.scrollWidth} > ${vw})`);
  const root = document.querySelector(".sheet") || document.querySelector("main") || document.body;
  const all = [...root.querySelectorAll("*")].filter(vis);
  for (const e of all) { const r = R(e);
    if (r.right > vw + 1 && !scrolls(e)) out.push(`outside the screen: ${name(e)} (right ${Math.round(r.right)} > ${vw})`);
    const s = getComputedStyle(e), leaf = !e.children.length && e.textContent.trim();
    if (leaf && e.scrollWidth > e.clientWidth + 2 && s.overflowX !== "visible" && s.textOverflow !== "ellipsis" && !/^(INPUT|TEXTAREA|SELECT)$/.test(e.tagName)) out.push(`text cut: «${e.textContent.trim().slice(0, 30)}» in ${name(e)}`);
    if (e.matches("button:not(.link),.icon-btn,[role=switch]") && (r.width < 24 || r.height < 24) && !e.closest(".cv,.wb,.week,.ph-strip,.td-ds,.st-acc")) out.push(`small tap target: ${name(e)} (${Math.round(r.width)}×${Math.round(r.height)})`);
  }
  /* text over other text: two text leaves whose boxes cross by more than 3 px each way (not parent/child, not the same line of one element) */
  const T = all.filter(e => !e.children.length && e.textContent.trim() && !/^(svg|path|use|i)$/i.test(e.tagName) && !e.closest("svg,.cv,.wb,.ph-strip,canvas,.toast,#toast,.bnav,.tnav,.dock,.lv-dock,.sheet-f,.sheet-h"));
  const rects = T.map(e => R(e));
  for (let i = 0; i < T.length && out.length < 60; i++) for (let j = i + 1; j < T.length; j++) { const a = rects[i], b = rects[j], w = Math.min(a.right, b.right) - Math.max(a.left, b.left), h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    if (w > 4 && h > 4 && !T[i].contains(T[j]) && !T[j].contains(T[i])) out.push(`text overlaps text: «${T[i].textContent.trim().slice(0, 24)}» × «${T[j].textContent.trim().slice(0, 24)}»`); }
  return [...new Set(out)];
};
(async () => {
  const dir = H.build(H.tmp("layout-audit")); let bad = 0, warn = 0; const report = [], wreport = [], STRICT = process.argv.includes("--strict");
  for (const [vname, vp] of Object.entries(VPS)) {
    const app = await H.startApp({ dir, seed: process.env.AUDIT_EMPTY ? { settings: { onboarded: true } } : F.seed({ withPlan: true, withPantry: true }), viewport: vp }), p = app.page;
    if (process.argv.includes("--dark")) await p.emulateMedia({ colorScheme: "dark" });
    const run = async (label, js) => {
      await p.evaluate(`(()=>{ try { closeSheet() } catch(e){}; ${js}; render(); window.scrollTo(0,0) })()`); await p.waitForTimeout(450);
      const probs = await p.evaluate(CHECK), lint = await p.evaluate(LINT); if (lint.length) { warn += lint.length; wreport.push(`${label} @${vname}:\n   ` + lint.slice(0, 8).join("\n   ")); }
      if (OUT) await p.screenshot({ path: path.join(OUT, `${label}-${vname}.png`), fullPage: !label.startsWith("sheet") });
      if (probs.length) { bad += probs.length; report.push(`${label} @${vname}:\n   ` + probs.slice(0, 8).join("\n   ")); }
    };
    for (const [l, js] of SCREENS) await run(l, js);
    for (const [l, js] of SHEETS_TO_OPEN) await run(l, js);
    if (app.errors.length) { bad++; report.push(`page errors @${vname}: ${app.errors.join(" | ")}`); }
    await app.close();
  }
  console.log(report.length ? report.join("\n") : "layout audit: nothing found");
  if (wreport.length) console.log(`\ndesign lint (warnings: ${warn}):\n` + wreport.join("\n"));
  console.log(`${bad} problem${bad === 1 ? "" : "s"} in ${SCREENS.length + SHEETS_TO_OPEN.length} screens × ${Object.keys(VPS).length} viewports`);
  process.exit(bad || (STRICT && warn) ? 1 : 0);
})();
