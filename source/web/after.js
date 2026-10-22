/* ================= web version: direct intervals.icu sync, account, AI key, restore, offline ================= */
(function () {
  const E = window.ENGINE;
  /* ---- intervals.icu: Sync now talks to intervals.icu directly ---- */
  icuKick = async function (reason, mode = false) {
    if (!icuState().key) return;
    if (mode !== true) { scheduleRender(); return; }
    if (ICU_KICK_STATE === "sent") { toast("Sync already running"); return; }
    ICU_KICK_STATE = "sent"; scheduleRender(); if (UI.sheet) renderSheet();
    try { const r = await icuSyncDirect(); UI.syncstat = { at: new Date().toISOString(), ok: true, summary: r };
      toast(`intervals.icu synced · ${r.planned} planned, ${r.acts} activities, ${r.well} wellness${r.pushed || r.sent_plan || r.sent_well ? ` · sent ${r.pushed + r.sent_plan + r.sent_well}` : ""}`); }
    catch (e) { console.warn(e); UI.syncstat = { at: new Date().toISOString(), ok: false, error: String(e?.message || e) }; toast("Sync failed: " + String(e?.message || e).slice(0, 90)); }
    finally { ICU_KICK_STATE = ""; scheduleRender(); if (UI.sheet) renderSheet(); }
  };
  icuSettingsCard = function () {
    const s = icuState(), b = s.bridge, P = icuPending(), busy = ICU_KICK_STATE === "sent", F = icuFail();
    const sw = (act, on, label, sub) => `<label class="row sw-row"><button type="button" class="switch" role="switch" aria-checked="${on}" data-act="${act}" aria-label="${esc(label)}"></button><span>${label}${sub ? `<small class="faint" style="display:block;font-size:12.5px">${sub}</small>` : ""}</span></label>`;
    if (!s.key) return `<section class="card pad icu-card"><div><b style="font-size:16px">intervals.icu</b><div class="muted" style="font-size:13px">Your training calendar, synced both ways: planned workouts, activities, sleep, resting HR, HRV, weight and body fat.</div></div>
      <div class="row" style="gap:8px;flex-wrap:wrap"><input id="icu-key2" class="inp" type="password" autocomplete="off" placeholder="API key (intervals.icu → Settings → Developer)" style="flex:1;min-width:200px"><input id="icu-aid" class="inp" style="max-width:150px" placeholder="Athlete ID (i123456)" data-chg="icu-aid"><button class="btn primary" data-act="icu-save-key">Save</button></div>
      <div class="faint" style="font-size:12.5px">The key stays in your account. Sync runs when you tap it, straight from this app.</div></section>`;
    return `<section class="card pad icu-card">
      <div class="row" style="justify-content:space-between;gap:10px;align-items:flex-start"><div><b style="font-size:16px">intervals.icu</b><div class="muted" style="font-size:13px">${b ? `${esc(b.athlete || s.athlete || "Connected")} · ${s.aid ? esc(s.aid) + " · " : ""}${icuAgo()}` : "Key saved · tap Sync now"}</div></div><span class="status ${F ? "bad" : b ? "ok" : "warn"}">${F ? "Failed" : b ? "Synced" : "Pending"}</span></div>
      ${F ? `<div class="note warn">Last sync failed: ${esc(String(F.error || "unknown error"))}</div>` : b?.res ? `<div class="note">Last sync: ${esc(b.res)}</div>` : ""}
      <div class="row" style="gap:10px;flex-wrap:wrap;align-items:center"><button class="btn primary" data-act="icu-now" ${busy ? "disabled" : ""}>${ic("sync", "sm")}${busy ? "Syncing…" : "Sync now"}</button><span class="faint" style="font-size:13px">${P.n ? `${P.n} change${P.n > 1 ? "s" : ""} waiting to be sent` : "Everything is up to date"}</span></div>
      <div class="icu-what">${sw("icu-plansrc", icuPlanMode(), "Plan from intervals.icu", "Your calendar there is the plan. Workouts you add, edit or delete here go back to it.")}${sw("icu-push", s.push, "Send finished workouts", "Sets, RIR and RPE go into the activity description")}${sw("icu-pushwell", S.settings.intervals?.pushWell !== false, "Send check-in data", "Weight, body fat, sleep, resting HR and HRV, only on days intervals.icu has none")}</div>
      <details class="icu-acc"><summary>Account and import</summary>
        <div class="row" style="gap:8px;flex-wrap:wrap;align-items:center;margin-top:10px"><label for="icu-aid" class="faint" style="font-size:13px">Athlete ID</label><input id="icu-aid" class="inp" style="max-width:150px" value="${esc(s.aid || "")}" placeholder="i123456" data-chg="icu-aid"></div>
        <div class="row" style="gap:8px;flex-wrap:wrap;margin-top:8px"><input id="icu-key2" class="inp" type="password" autocomplete="off" placeholder="New API key" style="flex:1;min-width:180px"><button class="btn tonal sm" data-act="icu-save-key">Change key</button></div>
        <div class="row" style="gap:8px;flex-wrap:wrap;margin-top:8px"><button class="btn text sm" data-act="icu-open">Import files (CSV, .ics, JSON)</button><button class="btn text sm" data-act="icu-disc" style="color:var(--bad)">Disconnect</button></div></details></section>`;
  };
  icuFail = function () { const v = UI.syncstat; return v && !v.ok ? v : null; };
  ACT["icu-save-key"] = () => { const k = ($("#icu-key2")?.value || "").trim(); if (!k) { toast("Paste the API key first."); return; } icuSet({ key: k }); toast("Key saved · syncing…"); icuKick("new key", true); };

  /* ---- Settings: account, AI, backup ---- */
  function webCards() {
    const ai = S.settings.ai || {}, pr = ai.provider || "gemini", P = E.AI_PRESETS;
    const acct = !E.cloud ? `<div class="faint" style="font-size:13px">Cloud sync isn't set up in this copy of the app: data stays on this device.</div>`
      : E.uid ? `<div class="row" style="justify-content:space-between;gap:8px;flex-wrap:wrap"><span><b>${esc(E.email || "Signed in")}</b><small class="faint" style="display:block;font-size:12.5px">Synced on every device where you sign in${E.pending() ? ` · ${E.pending()} change${E.pending() > 1 ? "s" : ""} waiting for the network` : ""}</small></span><button class="btn soft sm" data-act="eg-signout">Sign out</button></div>`
      : `<div class="row" style="justify-content:space-between;gap:8px;flex-wrap:wrap"><span><b>This device only</b><small class="faint" style="display:block;font-size:12.5px">Sign in to keep phone and computer in sync. What's here is uploaded the first time.</small></span><button class="btn primary sm" data-act="eg-signin">Sign in</button></div>`;
    return `<section class="card pad" style="display:flex;flex-direction:column;gap:10px"><span class="flabel">Account</span>${acct}
      <div class="row" style="gap:8px;flex-wrap:wrap"><label class="btn soft sm" style="cursor:pointer">${ic("download", "sm")}Restore a backup (.json)<input type="file" accept=".json,application/json" data-chg="eg-restore" hidden></label><button class="btn soft sm" data-act="export">${ic("download", "sm")}Download a backup</button></div>
      <div class="faint" style="font-size:12.5px">Moving from Engine on Claude: there, Settings → Full backup (JSON); here, Restore a backup.</div></section>
      <section class="card pad" style="display:flex;flex-direction:column;gap:10px"><span class="flabel">AI (optional, free key)</span>
      <div class="faint" style="font-size:12.5px">Reads hard labels, estimates meals you describe and restaurant meals. Without a key everything else works, including the label reader on this device.</div>
      <div class="grid2"><div class="field"><label for="ai-pr">Service</label><select id="ai-pr" class="inp" data-chg="ai-pr">${Object.entries(P).map(([k, v]) => `<option value="${k}" ${pr === k ? "selected" : ""}>${v.label}</option>`).join("")}</select></div>
        <div class="field"><label for="ai-model">Model</label><input id="ai-model" class="inp" list="ai-models" value="${esc(ai.model || P[pr].model)}" data-chg="ai-model"><datalist id="ai-models">${(ai.models || []).map(m => `<option value="${esc(m)}">`).join("")}</datalist></div></div>
      <div class="row" style="gap:8px;flex-wrap:wrap"><input id="ai-key" class="inp" type="password" autocomplete="off" placeholder="${ai.key ? "Key saved · paste a new one to change" : "API key"}" style="flex:1;min-width:180px"><button class="btn primary sm" data-act="ai-save">${ai.key ? "Save" : "Verify and save"}</button>${ai.key ? `<button class="btn soft sm" data-act="ai-verify">${ic("check", "sm")}Verify key</button><button class="btn text sm" data-act="ai-del" style="color:var(--bad)">Remove</button>` : ""}</div>
      ${AIV.busy ? `<div class="note">Checking the key…</div>` : ai.check ? `<div class="note ${ai.check.ok ? "" : "warn"}">${ai.check.ok ? "✓ " : "✗ "}${esc(ai.check.msg)}<small class="faint" style="display:block;font-size:12px">${esc(fmtDM(ai.check.at.slice(0, 10)))} ${esc(ai.check.at.slice(11, 16))}</small></div>` : ""}
      <div class="faint" style="font-size:12.5px">${pr === "gemini" ? "Free key: aistudio.google.com → Get API key. On the free tier Google may use what you send to improve its models." : pr === "groq" ? "Free key: console.groq.com → API Keys." : "Free key: openrouter.ai → Keys (pick a model ending in :free)."}</div></section>`;
  }
  const origSettings = VIEWS.settings;
  VIEWS.settings = function () { const h = origSettings(); return h.replace('<div class="set-group">', '<div class="set-group">' + webCards()); };
  ACT["eg-signin"] = () => E.signIn();
  ACT["eg-signout"] = () => openSheet("confirm", { title: "Sign out?", text: "Your data stays in your account. This device keeps a copy until you sign in again.", yes: "Sign out", run: () => E.signOut() });
  CHG["ai-pr"] = v => { S.settings.ai = { ...(S.settings.ai || {}), provider: v, model: E.AI_PRESETS[v].model, base: E.AI_PRESETS[v].base }; saveSettings(); scheduleRender(); };
  CHG["ai-model"] = v => { S.settings.ai = { ...(S.settings.ai || {}), model: v.trim() }; saveSettings(); };
  /* key check: 1) the key is accepted, 2) the chosen model exists for it, 3) a real request answers */
  const AIV = { busy: false };
  async function aiVerify(cfg) {
    const P = E.AI_PRESETS[cfg.provider] || {}, base = cfg.base || P.base, model = cfg.model || P.model;
    const why = (st, j) => { const m = j?.error?.message || j?.error || ""; const r = j?.error?.details?.find?.(d => d.reason)?.reason || j?.error?.status || "";
      if (st === 400 && /API_KEY_INVALID|API key not valid/i.test(m + r)) return "The key isn't valid: copy it again from aistudio.google.com (Get API key).";
      if (st === 401) return "The key isn't valid or was revoked.";
      if (st === 403) return /SERVICE_DISABLED|has not been used|disabled/i.test(m + r) ? "The Generative Language API is off for this key's project: create the key from aistudio.google.com, or enable the API in Google Cloud." : /referer|referrer|HTTP_REFERRER/i.test(m + r) ? "The key is restricted to other websites: allow iantomasi-nicola.github.io in its restrictions, or remove them." : "This key isn't allowed to use the API (" + (r || st) + ").";
      if (st === 429) return "The key works but the free quota is used up for now: try again later (limits reset every minute and every day).";
      return `Error ${st}${m ? ": " + String(m).slice(0, 140) : ""}`; };
    let models = [];
    try {
      if (cfg.provider === "gemini") {
        try { models = await E.geminiModels(cfg.key); } catch (e) { if (e.status) return { ok: false, msg: why(e.status, e.body) }; throw e; }
      } else {
        const r = await fetch(base.replace(/\/$/, "") + "/models", { headers: { Authorization: "Bearer " + cfg.key } }); const j = await r.json().catch(() => ({}));
        if (!r.ok) return { ok: false, msg: why(r.status, j) };
        models = (j.data || []).map(m => m.id);
      }
    } catch (e) { return { ok: false, msg: "No answer from the service: check the connection and try again." }; }
    if (models.length && !models.includes(model)) {
      const best = cfg.provider === "gemini" ? E.bestGemini(models) : models.find(m => /:free$/.test(m)) || models[0];
      return { ok: false, models, suggest: best, msg: `The key is valid, but the model “${model}” isn't available to it. Try “${best}”.` };
    }
    const t0 = performance.now();
    try { const used = { ...cfg, model, base }; const j = await E.sample.json('Reply with {"ok": true, "kcal_100g_banana": number}', { onModel: m => { used.model = m; } }, used); const ms = Math.round(performance.now() - t0);
      if (used.model !== model) return { ok: true, models, model: used.model, msg: `Key valid · “${model}” is retired for new keys, using ${used.model}: answered in ${(ms / 1000).toFixed(1)} s. Label reading, meal descriptions and restaurant estimates are on.` };
      return { ok: true, models, msg: `Key valid · ${model} answered in ${(ms / 1000).toFixed(1)} s (banana ${j?.kcal_100g_banana ?? "?"} kcal/100 g). Label reading, meal descriptions and restaurant estimates are on.` }; }
    catch (e) { const st = e?.status || 0; return { ok: false, models, msg: st ? why(st, e.body) : "The key is valid but the test request failed: " + String(e?.message || e).slice(0, 140) }; }
  }
  async function runVerify(cfg, save) {
    AIV.busy = true; scheduleRender();
    let v; try { v = await aiVerify(cfg); } finally { AIV.busy = false; }
    const prev = S.settings.ai || {};
    if (v.suggest && !v.ok && save) { cfg = { ...cfg, model: v.suggest }; const v2 = await aiVerify(cfg); if (v2.ok) v = { ...v2, msg: v2.msg + ` (switched from “${prev.model || "default"}”)` }; }
    const check = { ok: v.ok, msg: v.msg, at: new Date().toISOString() };
    if (v.ok && v.model) cfg = { ...cfg, model: v.model };
    if (save && v.ok) { S.settings.ai = { ...prev, ...cfg, models: (v.models || []).slice(0, 60), check }; Sync.sample = E.sample; Sync.sampleImages = true; toast("AI key verified and saved"); }
    else if (save) { S.settings.ai = { ...prev, check }; toast("Key not saved: " + v.msg.slice(0, 80)); }
    else S.settings.ai = { ...prev, ...(v.ok && v.model ? { model: v.model } : {}), models: v.models?.length ? v.models.slice(0, 60) : prev.models, check };
    saveSettings(); scheduleRender();
  }
  ACT["ai-save"] = () => { const k = ($("#ai-key")?.value || "").trim(), a = S.settings.ai || {}; if (!k && !a.key) { toast("Paste the key first."); return; }
    const pr = a.provider || "gemini", model = ($("#ai-model")?.value || "").trim() || a.model || E.AI_PRESETS[pr].model;
    runVerify({ provider: pr, key: k || a.key, model, base: E.AI_PRESETS[pr].base }, true); };
  ACT["ai-verify"] = () => { const a = S.settings.ai || {}; if (!a.key) return; runVerify({ provider: a.provider || "gemini", key: a.key, model: a.model || E.AI_PRESETS[a.provider || "gemini"].model, base: a.base || E.AI_PRESETS[a.provider || "gemini"].base }, false); };
  ACT["ai-del"] = () => { const { key, ...rest } = S.settings.ai || {}; S.settings.ai = rest; saveSettings(); Sync.sample = null; Sync.sampleImages = false; toast("AI key removed"); scheduleRender(); };
  ACT["ai-test"] = async () => { toast("Asking the AI…"); try { const j = await E.sample.json('Reply with {"ok": true, "kcal_100g_banana": number}'); toast(`AI works · banana ${j.kcal_100g_banana} kcal/100 g`); } catch (e) { toast("AI error: " + String(e?.message || e).slice(0, 100)); } };
  CHG["eg-restore"] = (v, el) => { const f = el.files?.[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { let j; try { j = JSON.parse(rd.result); } catch (e) { toast("That file isn't a backup."); return; }
    if (!j || (j.app !== "Fuel" && !j.settings)) { toast("That file isn't an Engine backup."); return; }
    openSheet("confirm", { title: "Restore this backup?", text: `From ${String(j.exported || "").slice(0, 10) || "a backup"}: settings, foods, recipes, plans, logs and training replace what's here.`, yes: "Restore", run: () => {
      const keepKey = S.settings?.intervals?.key, keepAi = S.settings?.ai;
      if (j.settings) { const s = normalizeSettings(j.settings); if (keepKey && !s.intervals?.key) s.intervals = { ...(s.intervals || {}), key: keepKey }; if (keepAi && !s.ai) s.ai = keepAi; put("settings", "", s); }
      for (const k of ["shop", "body", "train"]) if (j[k]) put(k, "", j[k]);
      let n = 0; for (const k of ["foods", "recipes", "days", "logm"]) for (const [id, v] of Object.entries(j[k] || {})) { put(k, id, v); n++; }
      toast(`Backup restored · ${n} items`); scheduleRender(); } }); }; rd.readAsText(f); };

  /* ---- AI ready if a key is saved (also when it was added on another device) ---- */
  setInterval(() => { if (E.aiCfg() && !Sync.sample) { Sync.sample = E.sample; Sync.sampleImages = true; scheduleRender(); } }, 3000);

  /* ---- offline + installable ---- */
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  addEventListener("online", () => scheduleRender()); addEventListener("offline", () => scheduleRender());
})();
