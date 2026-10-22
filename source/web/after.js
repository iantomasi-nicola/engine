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
    const acct = !E.cloud ? `<div class="faint" style="font-size:13px">Cloud sync isn't set up in this copy of the app: data stays on this device.</div>`
      : E.uid ? `<div class="row" style="justify-content:space-between;gap:8px;flex-wrap:wrap"><span><b>${esc(E.email || "Signed in")}</b><small class="faint" style="display:block;font-size:12.5px">Synced on every device where you sign in${E.pending() ? ` · ${E.pending()} change${E.pending() > 1 ? "s" : ""} waiting for the network` : ""}</small></span><button class="btn soft sm" data-act="eg-signout">Sign out</button></div>`
      : `<div class="row" style="justify-content:space-between;gap:8px;flex-wrap:wrap"><span><b>This device only</b><small class="faint" style="display:block;font-size:12.5px">Sign in to keep phone and computer in sync. What's here is uploaded the first time.</small></span><button class="btn primary sm" data-act="eg-signin">Sign in</button></div>`;
    return `<section class="card pad" style="display:flex;flex-direction:column;gap:10px"><span class="flabel">Account</span>${acct}
      <div class="row" style="gap:8px;flex-wrap:wrap"><label class="btn soft sm" style="cursor:pointer">${ic("download", "sm")}Restore a backup (.json)<input type="file" accept=".json,application/json" data-chg="eg-restore" hidden></label><button class="btn soft sm" data-act="export">${ic("download", "sm")}Download a backup</button></div>
      <div class="faint" style="font-size:12.5px">Moving from Engine on Claude: there, Settings → Full backup (JSON); here, Restore a backup.</div></section>
      ${aiCard()}`;
  }
  const origSettings = VIEWS.settings;
  VIEWS.settings = function () { const h = origSettings(); return h.replace('<div class="set-group">', '<div class="set-group">' + webCards()); };
  ACT["eg-signin"] = () => E.signIn();
  ACT["eg-signout"] = () => openSheet("confirm", { title: "Sign out?", text: "Your data stays in your account. This device keeps a copy until you sign in again.", yes: "Sign out", run: () => E.signOut() });
  /* ---- AI services: every key you have, open and closed models, tried in your order ---- */
  const AIV = { busy: {}, newPr: "gemini", chain: null };
  const OPEN = ["groq", "openrouter", "mistral", "huggingface", "cerebras", "custom"], CLOSED = ["gemini", "anthropic", "openai"];
  const svcs = () => { E.aiServices(); const a = S.settings.ai = S.settings.ai || {}; a.services = a.services || []; return a.services; };
  const svcById = id => svcs().find(x => x.id === id);
  function aiReady() { const on = E.aiServices().filter(x => x.on !== false); Sync.sample = on.length ? E.sample : null; Sync.sampleImages = on.some(x => E.svcCfg(x).vision !== false); }
  function aiCard() {
    const P = E.AI_PRESETS, list = svcs(), np = AIV.newPr, NP = P[np];
    const opt = k => `<option value="${k}" ${np === k ? "selected" : ""}>${P[k].label}${P[k].free ? " · free tier" : ""}</option>`;
    const row = (x, i) => { const p = P[x.provider] || P.custom, c = E.svcCfg(x), on = x.on !== false, busy = AIV.busy[x.id];
      return `<div class="ai-svc ${on ? "" : "off"}">
        <div class="ai-h"><span class="ai-n">${i + 1}</span><span class="ai-t"><b>${esc(p.label)}</b><small>${p.open ? "Open models" : "Closed models"}${c.vision === false ? " · text only" : " · reads photos"}${x.key ? " · key …" + esc(String(x.key).slice(-4)) : ""}</small></span>
          <button type="button" class="switch" role="switch" aria-checked="${on}" data-act="ai-on" data-id="${x.id}" aria-label="Use ${esc(p.label)}"></button></div>
        <div class="row ai-m"><label class="faint" for="ai-m-${x.id}">Model</label><input id="ai-m-${x.id}" class="inp" list="ai-ml-${x.id}" value="${esc(x.model || p.model || "")}" data-chg="ai-model" data-id="${x.id}" placeholder="model name"><datalist id="ai-ml-${x.id}">${(x.models || []).map(m => `<option value="${esc(m)}">`).join("")}</datalist></div>
        ${busy ? `<div class="result"><span class="spinner"></span><span>Checking ${esc(p.label)}…</span></div>` : x.check ? `<div class="note ${x.check.ok ? "" : "warn"}">${x.check.ok ? "✓ " : "✗ "}${esc(x.check.msg)}<small class="faint" style="display:block;font-size:12px">${esc(fmtDM(x.check.at.slice(0, 10)))} ${esc(x.check.at.slice(11, 16))}</small></div>` : ""}
        <div class="row ai-acts"><button class="icon-btn sm" data-act="ai-up" data-id="${x.id}" aria-label="Try earlier" ${i ? "" : "disabled"}>${ic("chevU", "sm")}</button><button class="icon-btn sm" data-act="ai-down" data-id="${x.id}" aria-label="Try later" ${i < list.length - 1 ? "" : "disabled"}>${ic("chevD", "sm")}</button><span style="flex:1"></span><button class="btn soft sm" data-act="ai-verify" data-id="${x.id}" ${busy ? "disabled" : ""}>${ic("check", "sm")}Verify</button><button class="btn text sm" data-act="ai-del" data-id="${x.id}" style="color:var(--bad)">Remove</button></div></div>`; };
    const lr = E.lastRun;
    return `<section class="card pad ai-card" style="display:flex;flex-direction:column;gap:12px"><span class="flabel">AI services</span>
      <div class="faint" style="font-size:13px">Add every key you have. Engine asks them in this order: if a model is busy, retired or fails, it tries the service's next model, then the next service. Used for label photos, meals you describe and restaurant meals. Without any key everything else works, labels included (read on this device).</div>
      ${list.length ? `<div class="ai-list">${list.map(row).join("")}</div>` : ""}
      ${list.length ? `<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><button class="btn tonal sm" data-act="ai-test" ${AIV.chain === "busy" ? "disabled" : ""}>${ic("play", "sm")}${AIV.chain === "busy" ? "Asking…" : "Test the chain"}</button><span class="faint" style="font-size:12.5px">${lr?.model ? `Last answer: ${esc((P[lr.provider]?.label || lr.provider) + " · " + lr.model)}` : ""}</span></div>${AIV.chain && AIV.chain !== "busy" ? `<div class="ns-log">${AIV.chain.map(t => `<div class="${/: ok$/.test(t) ? "" : "bad"}">${/: ok$/.test(t) ? "✓" : "✗"} ${esc(t)}</div>`).join("")}</div>` : ""}` : ""}
      <div class="ai-add"><span class="flabel">${list.length ? "Add another service" : "Add a service"}</span>
        <div class="grid2"><div class="field"><label for="ai-new-pr">Service</label><select id="ai-new-pr" class="inp" data-chg="ai-new-pr"><optgroup label="Open models">${OPEN.map(opt).join("")}</optgroup><optgroup label="Closed models">${CLOSED.map(opt).join("")}</optgroup></select></div>
          <div class="field"><label for="ai-new-model">Model <span class="faint">(optional)</span></label><input id="ai-new-model" class="inp" placeholder="${esc(NP.model || "model name")}" autocomplete="off"></div></div>
        ${NP.custom ? `<div class="field"><label for="ai-new-base">Address</label><input id="ai-new-base" class="inp" placeholder="https://…/v1" autocomplete="off" inputmode="url"></div>` : ""}
        <div class="row" style="gap:8px;flex-wrap:wrap"><input id="ai-new-key" class="inp" type="password" autocomplete="off" placeholder="API key${NP.custom ? " (empty if none)" : ""}" style="flex:1;min-width:180px"><button class="btn primary sm" data-act="ai-add">${ic("plus", "sm")}Verify and add</button></div>
        <div class="faint" style="font-size:12.5px">${esc(NP.url)}.${np === "gemini" ? " On the free tier Google may use what you send to improve its models." : ""}${NP.vision === false ? " Text only: photos go to the other services." : ""} Keys stay in your account and go only to that service.</div></div></section>`;
  }
  CHG["ai-new-pr"] = v => { AIV.newPr = v; scheduleRender(); };
  CHG["ai-model"] = (v, el) => { const x = svcById(el.dataset.id); if (!x) return; x.model = v.trim(); saveSettings(); };
  ACT["ai-on"] = (el) => { const x = svcById((el || {}).dataset?.id); if (!x) return; x.on = x.on === false; saveSettings(); aiReady(); scheduleRender(); };
  const mv = d => el => { const L = svcs(), i = L.findIndex(x => x.id === el?.dataset?.id), j = i + d; if (i < 0 || j < 0 || j >= L.length) return; [L[i], L[j]] = [L[j], L[i]]; saveSettings(); scheduleRender(); };
  ACT["ai-up"] = mv(-1); ACT["ai-down"] = mv(1);
  ACT["ai-del"] = el => { const id = el?.dataset?.id, x = svcById(id); if (!x) return; openSheet("confirm", { title: `Remove ${E.AI_PRESETS[x.provider]?.label || "this service"}?`, text: "Its key is deleted from your account. The other services keep working.", yes: "Remove", run: () => { S.settings.ai.services = svcs().filter(y => y.id !== id); saveSettings(); aiReady(); toast("Service removed"); scheduleRender(); } }); };
  /* check one service: the key is accepted, a model answers (switching model by itself if needed) */
  const why = (cfg, st, j) => { const m = String(j?.error?.message || j?.message || (typeof j?.error === "string" ? j.error : "") || ""), r = j?.error?.details?.find?.(d => d.reason)?.reason || j?.error?.status || j?.error?.type || "", G = cfg.provider === "gemini", L = E.AI_PRESETS[cfg.provider]?.label || "The service";
    if (st === 400 && /API_KEY_INVALID|API key not valid/i.test(m + r)) return "The key isn't valid: copy it again" + (G ? " from aistudio.google.com (Get API key)." : ".");
    if (st === 401) return "The key isn't valid or was revoked.";
    if (st === 402 || /credit balance|insufficient_quota|billing/i.test(m + r)) return `The key works but the account has no credit: ${L} needs a top-up (or use a free service).`;
    if (st === 403) return G && /SERVICE_DISABLED|has not been used|disabled/i.test(m + r) ? "The Generative Language API is off for this key's project: create the key from aistudio.google.com, or enable the API in Google Cloud." : /referer|referrer|HTTP_REFERRER/i.test(m + r) ? "The key is restricted to other websites: allow iantomasi-nicola.github.io in its restrictions, or remove them." : "This key isn't allowed to use the API (" + (r || st) + ")" + (m ? ": " + m.slice(0, 160) : ".");
    if ([500, 502, 503, 504, 529].includes(st)) return `The key works, but ${L} is overloaded right now (${st}). It's saved: the app retries and moves on to the next model or service by itself.`;
    if (st === 429) return "The key works but the quota is used up for now: the next service takes over until it resets.";
    if (st === 404) return "Model not found" + (m ? ": " + m.slice(0, 140) : ".");
    return st ? `Error ${st}${m ? ": " + m.slice(0, 140) : ""}` : "No answer from the service: check the address and the connection" + (m ? " (" + m.slice(0, 80) + ")" : ".");
  };
  async function aiVerify(x) {
    let cfg = E.svcCfg(x), models = [], listErr = "";
    try { models = await E.listModels(cfg); }
    catch (e) { if (e.status === 401 || (e.status === 400 && cfg.kind === "gemini") || e.status === 429) return { ok: false, msg: why(cfg, e.status, e.body) }; listErr = why(cfg, e.status || 0, e.body || { message: e.message }); }
    let note = "";
    if (models.length && cfg.model && !models.includes(cfg.model)) { const best = E.rankModels(cfg, models)[0]; if (best) { note = ` (“${cfg.model}” isn't available to this key)`; cfg = { ...cfg, model: best }; } }
    if (!cfg.model) { const best = E.rankModels(cfg, models)[0]; if (!best) return { ok: false, models, msg: listErr || "Type the model name to use." }; cfg = { ...cfg, model: best }; }
    const used = { ...cfg, models: models.length ? models : cfg.models }, t0 = performance.now();
    try { const j = await E.sample.json('Reply with {"ok": true, "kcal_100g_banana": number}', { onModel: m => { used.model = m; } }, used); const s = ((performance.now() - t0) / 1000).toFixed(1);
      return { ok: true, models, model: used.model, msg: `Works · ${used.model} answered in ${s} s (banana ${j?.kcal_100g_banana ?? "?"} kcal/100 g)${used.model !== cfg.model || note ? note + `, switched to ${used.model}` : ""}.` }; }
    catch (e) { const st = e?.status || 0; if ([500, 502, 503, 504, 529].includes(st)) return { ok: true, busy: true, models, msg: why(cfg, st, e.body) };
      return { ok: false, models, msg: (st ? why(cfg, st, e.body) : "The test request failed: " + String(e?.message || e).slice(0, 140)) + (listErr && listErr !== why(cfg, st, e.body) ? " · Model list: " + listErr : "") }; }
  }
  async function runVerify(x) {
    AIV.busy[x.id] = true; scheduleRender();
    let v; try { v = await aiVerify(x); } catch (e) { v = { ok: false, msg: String(e?.message || e) }; } finally { delete AIV.busy[x.id]; }
    const cur = svcById(x.id) || x; cur.check = { ok: v.ok, msg: v.msg, at: new Date().toISOString() };
    if (v.models?.length) cur.models = v.models.slice(0, 80); if (v.ok && v.model) cur.model = v.model;
    saveSettings(); aiReady(); scheduleRender(); return v;
  }
  ACT["ai-verify"] = el => { const x = svcById(el?.dataset?.id); if (x) runVerify(x); };
  ACT["ai-add"] = async () => { const pr = ($("#ai-new-pr")?.value || AIV.newPr), P = E.AI_PRESETS[pr], key = ($("#ai-new-key")?.value || "").trim(), model = ($("#ai-new-model")?.value || "").trim(), base = ($("#ai-new-base")?.value || "").trim().replace(/\/+$/, "");
    if (!key && !(P.custom && base)) { toast("Paste the key first."); return; }
    if (P.custom && !/^https?:\/\//.test(base)) { toast("Type the service address, e.g. https://api.together.xyz/v1"); return; }
    if (svcs().some(y => y.provider === pr && y.key === key && (!P.custom || y.base === base))) { toast("That key is already in the list."); return; }
    const x = { id: "s" + Date.now().toString(36), provider: pr, key, model: model || P.model || "", on: true, ...(P.custom ? { base } : {}) };
    svcs().push(x); saveSettings(); AIV.newPr = pr; scheduleRender();
    const v = await runVerify(x);
    if (v.ok) toast(`${P.label} added and working`);
    else { const y = svcById(x.id); if (y) y.on = false; saveSettings(); aiReady(); scheduleRender(); toast(`${P.label} added but switched off: ${v.msg.slice(0, 70)}`); } };
  ACT["ai-test"] = async () => { AIV.chain = "busy"; scheduleRender();
    try { const j = await E.sample.json('Reply with {"ok": true, "kcal_100g_banana": number}'); toast(`AI works · ${E.lastRun?.model || ""} · banana ${j?.kcal_100g_banana ?? "?"} kcal/100 g`); }
    catch (e) { toast("No service answered: " + String(e?.message || e).slice(0, 80)); }
    AIV.chain = (E.lastRun?.tried || []).slice(-12); scheduleRender(); };
  CHG["eg-restore"] = (v, el) => { const f = el.files?.[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { let j; try { j = JSON.parse(rd.result); } catch (e) { toast("That file isn't a backup."); return; }
    if (!j || (j.app !== "Fuel" && !j.settings)) { toast("That file isn't an Engine backup."); return; }
    openSheet("confirm", { title: "Restore this backup?", text: `From ${String(j.exported || "").slice(0, 10) || "a backup"}: settings, foods, recipes, plans, logs and training replace what's here.`, yes: "Restore", run: () => {
      const keepKey = S.settings?.intervals?.key, keepAi = S.settings?.ai;
      if (j.settings) { const s = normalizeSettings(j.settings); if (keepKey && !s.intervals?.key) s.intervals = { ...(s.intervals || {}), key: keepKey }; if (keepAi && !s.ai) s.ai = keepAi; put("settings", "", s); }
      for (const k of ["shop", "body", "train"]) if (j[k]) put(k, "", j[k]);
      let n = 0; for (const k of ["foods", "recipes", "days", "logm"]) for (const [id, v] of Object.entries(j[k] || {})) { put(k, id, v); n++; }
      toast(`Backup restored · ${n} items`); scheduleRender(); } }); }; rd.readAsText(f); };

  /* ---- AI ready if a key is saved (also when it was added on another device) ---- */
  setInterval(() => { const on = E.anyAI(); if (on !== !!Sync.sample) { aiReady(); scheduleRender(); } }, 3000);

  /* ---- styles for the cards above ---- */
  const st = document.createElement("style"); st.textContent = `.ai-list{display:flex;flex-direction:column;gap:10px}.ai-svc{border:1px solid var(--line);border-radius:16px;padding:12px;display:flex;flex-direction:column;gap:10px;background:var(--surface,transparent)}.ai-svc.off{opacity:.62}.ai-h{display:flex;align-items:center;gap:12px}.ai-n{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;background:var(--sec-c);color:var(--on-sec-c);font-weight:700;font-size:13px;flex:none}.ai-t{flex:1;min-width:0;display:flex;flex-direction:column}.ai-t small{color:var(--faint);font-size:12.5px}.ai-m{gap:10px;align-items:center;flex-wrap:nowrap}.ai-m .inp{flex:1;min-width:0}.ai-acts{gap:6px;align-items:center;flex-wrap:wrap}.ai-add{display:flex;flex-direction:column;gap:10px;border-top:1px solid var(--line);padding-top:12px}`; document.head.appendChild(st);

  /* ---- offline + installable ---- */
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  addEventListener("online", () => scheduleRender()); addEventListener("offline", () => scheduleRender());
})();
