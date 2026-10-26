/* Engine web runtime: gives the app the same services it had inside claude.ai
   (db, user, downloads, sample) using Supabase, the browser and an optional free AI key. */
(function () {
  const CFG = window.ENGINE_CONFIG || {};
  const LS = { get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }, del(k) { try { localStorage.removeItem(k); } catch (e) {} } };
  const sb = CFG.supabaseUrl && CFG.supabaseKey && window.supabase ? window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey, { auth: { persistSession: true, autoRefreshToken: true, storageKey: "engine-auth", detectSessionInUrl: true } }) : null;
  const E = window.ENGINE = { sb, LS, uid: null, email: null, mode: "local", cloud: !!sb };
  const T = "engine_docs";

  /* ---------- account ---------- */
  let authP = null;
  function css() { if (document.getElementById("eg-auth-css")) return; const s = document.createElement("style"); s.id = "eg-auth-css";
    s.textContent = `.eg-ov{position:fixed;inset:0;z-index:300;background:var(--bg,#f7f7f8);display:grid;place-items:center;padding:max(16px,env(safe-area-inset-left,0px));overflow:auto}
.eg-box{width:min(400px,100%);display:flex;flex-direction:column;gap:12px;background:var(--surface,#fff);border-radius:24px;padding:24px 20px;box-shadow:0 10px 40px rgba(0,0,0,.08);color:var(--ink,#18181b);font:15px/1.4 system-ui,-apple-system,sans-serif}
.eg-box h2{margin:0;font-size:24px}.eg-box p{margin:0;color:var(--muted,#47474d);font-size:14px}.eg-box input{height:46px;border-radius:12px;border:1px solid var(--line,#e4e4e7);padding:0 14px;font-size:16px;background:var(--surface-2,#eee);color:inherit}
.eg-box button{height:48px;border-radius:14px;font-size:15.5px;font-weight:600;border:0;cursor:pointer}.eg-p{background:var(--accent,#18181b);color:var(--accent-ink,#fff)}.eg-s{background:var(--surface-2,#eee);color:inherit}.eg-t{background:transparent;color:var(--muted,#47474d);height:auto!important;padding:6px}
.eg-err{color:var(--bad,#b3473b);font-size:13.5px;min-height:1em}.eg-ok{color:var(--good,#3f7d55);font-size:13.5px}`; document.head.appendChild(s); }
  E.loginScreen = function (opts = {}) {
    return new Promise(res => { css();
      const ov = document.createElement("div"); ov.className = "eg-ov";
      ov.innerHTML = `<form class="eg-box" autocomplete="on"><h2>Engine</h2><p>Sign in to keep your data in sync between phone and computer.</p>
        <input name="email" type="email" placeholder="Email" autocomplete="username" required><input name="pw" type="password" placeholder="Password (min 6 characters)" autocomplete="current-password" minlength="6" required>
        <div class="eg-err" role="alert"></div><button class="eg-p" type="submit" name="in">Sign in</button><button class="eg-s" type="button" data-k="up">Create account</button>
        ${opts.cancel ? `<button class="eg-t" type="button" data-k="cancel">Cancel</button>` : `<button class="eg-t" type="button" data-k="local">Use on this device only</button>`}</form>`;
      document.body.appendChild(ov);
      const f = ov.querySelector("form"), err = ov.querySelector(".eg-err"), val = () => ({ email: f.email.value.trim(), password: f.pw.value });
      const done = v => { ov.remove(); res(v); };
      f.addEventListener("submit", async e => { e.preventDefault(); err.className = "eg-err"; err.textContent = "Signing in…";
        const { data, error } = await sb.auth.signInWithPassword(val()); if (error) { err.textContent = /confirm/i.test(error.message) ? "Confirm your email first (check the inbox), then sign in." : error.message; return; } done(data.session); });
      ov.querySelector('[data-k="up"]').onclick = async () => { const v = val(); if (!v.email || v.password.length < 6) { err.textContent = "Email and a password of at least 6 characters."; return; }
        err.textContent = "Creating the account…"; const { data, error } = await sb.auth.signUp({ ...v, options: { emailRedirectTo: location.origin + location.pathname } });
        if (error) { err.textContent = error.message; return; } if (data.session) return done(data.session); err.className = "eg-ok"; err.textContent = "Account created: confirm it from the email we sent, then sign in here."; };
      const l = ov.querySelector('[data-k="local"]'); if (l) l.onclick = () => { LS.set("engine.localOnly", true); done(null); };
      const c = ov.querySelector('[data-k="cancel"]'); if (c) c.onclick = () => done(null);
    });
  };
  function auth() {
    if (authP) return authP;
    authP = (async () => {
      if (!sb) return null;
      let s = null, err = null; try { const r = await sb.auth.getSession(); s = r.data.session; err = r.error; } catch (e) { err = e; }
      // offline with an expired token: keep using the account saved on this device, it refreshes once back online
      if (!s && (err || !navigator.onLine)) { try { const st = JSON.parse(localStorage.getItem("engine-auth") || "null"), u = st?.user || st?.currentSession?.user; if (u?.id) s = { user: u }; } catch (e) {} }
      if (!s && !LS.get("engine.localOnly", false)) s = await E.loginScreen();
      if (s) { E.uid = s.user.id; E.email = s.user.email; E.mode = "cloud"; queue = loadQ(E.uid); qPaths = new Set(queue.map(q => q.path)); }
      return E.uid;
    })();
    return authP;
  }
  /* what is still waiting is sent first (a few seconds at most); what can't go stays in this account's own queue on this device */
  E.signOut = async () => { try { await Promise.race([flushQ(), new Promise(r => setTimeout(r, 4000))]); } catch (e) {} persistQ(); try { await sb?.auth.signOut(); } catch (e) {} LS.set("engine.localOnly", true); location.reload(); };
  E.signIn = async () => { const s = await E.loginScreen({ cancel: true }); if (s) { LS.del("engine.localOnly"); location.reload(); } };

  /* ---------- db: a small Firestore-like layer over one Supabase table, with an offline write queue ----------
     Each account has its own queue (engine.q.<uid>) and its own copy on this device (engine.snap.<uid>).
     A document the app can merge comes with the copy it was edited from (`base`): right before sending, it is merged
     with what the server holds now (E.merge, given by the app), so two devices that edited it both keep their changes. */
  let cache = new Map(), loaded = false, loadP = null, loading = false, chan = null, loadedAt = 0;
  const docL = new Map(), colL = new Map();
  let queue = [], qPaths = new Set();
  const st = { online: null, storageFull: false, lastError: "" };
  E.status = () => { let blocked = 0; for (const q of queue) if (q.bad) blocked++; return { online: st.online, pending: queue.length - blocked, blocked, storageFull: st.storageFull, lastError: st.lastError, loadedAt }; };
  const emit = () => { try { E.onStatus?.(E.status()); } catch (e) {} };
  const sent = (p, data, merged) => { try { E.onSent?.(p, data, merged); } catch (e) {} };
  const errText = e => String(e?.message || e || "").slice(0, 160);
  /* deep equality that ignores key order (the server's jsonb does not keep it) */
  const same = (a, b) => { if (a === b) return true; if (!a || !b || typeof a !== "object" || typeof b !== "object" || Array.isArray(a) !== Array.isArray(b)) return false;
    const ka = Object.keys(a); if (ka.length !== Object.keys(b).length) return false; for (const k of ka) if (!Object.prototype.hasOwnProperty.call(b, k) || !same(a[k], b[k])) return false; return true; };
  const snapKeys = () => { try { return Object.keys(localStorage).filter(k => k.startsWith("engine.snap.")); } catch (e) { return []; } };
  /* this account's queue; the single queue of older versions is taken over only when this device holds no other account's data.
     A change the server refused (bad) is tried again once in every session. */
  function loadQ(uid) {
    const own = LS.get("engine.q." + uid, null); if (Array.isArray(own)) return own.map(q => ({ ...q, bad: false }));
    const legacy = LS.get("engine.q", null), snaps = snapKeys();
    if (Array.isArray(legacy) && (snaps.includes("engine.snap." + uid) || !snaps.length)) { if (LS.set("engine.q." + uid, legacy)) LS.del("engine.q"); else legacyQ = true; return legacy; }
    return [];
  }
  let qT = 0, legacyQ = false;   // legacyQ: the older single queue is deleted only once this account's queue was saved
  function persistQ() { clearTimeout(qT); qT = 0; if (!E.uid) return;
    const ok = LS.set("engine.q." + E.uid, queue); if (ok && legacyQ) { LS.del("engine.q"); legacyQ = false; }
    if (ok === st.storageFull) { st.storageFull = !ok; emit(); } }
  const saveQ = () => { if (!qT) qT = setTimeout(persistQ, 250); };
  /* changes made on this device while it was signed out of account uid: kept in that account's queue for its next sign-in */
  E.stash = (uid, items) => { const k = "engine.q." + uid, q = LS.get(k, []), snap = new Map(LS.get("engine.snap." + uid, [])), out = q.filter(x => !items.some(y => y.path === x.path));
    for (const x of items) { const old = q.find(y => y.path === x.path); out.push(x.op === "del" ? { op: "del", path: x.path, data: null } : { op: "set", path: x.path, data: x.data, ...(x.mb ? { mb: true, base: old?.mb ? old.base : snap.get(x.path) } : {}) }); }
    return LS.set(k, out); };
  const rel = p => p.split("/").slice(3).join("/");
  const collOf = p => { const a = p.split("/"); return a.length > 1 ? a.slice(0, -1).join("/") : ""; };
  const snapDoc = (p, fc) => ({ id: p.split("/").pop(), exists: cache.has(p), data: () => cache.get(p), metadata: { fromCache: !!fc } });
  function test(d, w) { if (!w) return true; const [f, op, v] = w, x = d?.[f]; return op === ">=" ? x >= v : op === ">" ? x > v : op === "<=" ? x <= v : op === "<" ? x < v : op === "==" ? x === v : true; }
  const snapCol = (c, w, fc) => { const docs = []; for (const [p, d] of cache) if (collOf(p) === c && test(d, w)) docs.push({ id: p.split("/").pop(), data: () => d }); return { docs, size: docs.length, empty: !docs.length, metadata: { fromCache: !!fc } }; };
  function notify(p) { for (const cb of docL.get(p) || []) try { cb(snapDoc(p)); } catch (e) { console.warn(e); } const c = collOf(p); for (const l of colL.get(c) || []) try { l.cb(snapCol(c, l.w)); } catch (e) { console.warn(e); } }
  const errs = new Set(); const fail = e => { for (const f of errs) try { f(e); } catch (x) {} };
  /* a copy on this device: the app opens and works with no network, then catches up. Days older than the app reads (180) stay in the account only */
  const snapKey = () => "engine.snap." + E.uid;
  let snapT = 0; const saveSnap = () => { clearTimeout(snapT); snapT = setTimeout(() => { if (!E.uid || !loaded) return; const since = new Date(Date.now() - 182 * 864e5).toISOString().slice(0, 10);
    try { localStorage.setItem(snapKey(), JSON.stringify([...cache].filter(([p]) => !(p.startsWith("lib/days/") && p.slice(9) < since)))); } catch (e) {} }, 1200); };
  function apply(out, fromCache) {
    for (const q of queue) q.op === "del" ? out.delete(q.path) : out.set(q.path, q.data);
    cache = out; loaded = true;
    for (const p of docL.keys()) for (const cb of docL.get(p)) cb(snapDoc(p, fromCache));
    for (const [c, ls] of colL) for (const l of ls) l.cb(snapCol(c, l.w, fromCache));
  }
  /* pages by path (keyset): stable when rows change between two pages, and complete whatever page size the project allows */
  /* what changed while a full read was on its way (our sends, live updates): newer than the pages already read, so it wins over them */
  let during = null; const note = (p, d) => { if (during) during.set(p, d); };
  async function loadAll() {
    const out = new Map(), mine = during = new Map(); let last = null;
    for (;;) { let q = sb.from(T).select("path,data").order("path").limit(1000); if (last !== null) q = q.gt("path", last);
      const { data, error } = await q; if (error) throw error; if (!data?.length) break;
      for (const r of data) out.set(r.path, r.data); last = data[data.length - 1].path; }
    if (during === mine) during = null;
    for (const [p, d] of mine) d === undefined ? out.delete(p) : out.set(p, d);
    apply(out, false); loadedAt = Date.now(); st.online = true; saveSnap(); emit();
    live();
  }
  function ensureLoad() {
    if (loadP) return loadP;
    if (!loaded && E.uid) { try { const raw = localStorage.getItem(snapKey()); if (raw) apply(new Map(JSON.parse(raw)), true); } catch (e) {} }
    loading = true;
    loadP = loadAll().catch(e => { loadP = null; during = null; st.online = false; st.lastError = errText(e); emit(); if (!loaded) fail({ code: "unavailable", message: errText(e) }); setTimeout(ensureLoad, navigator.onLine ? 15000 : 30000); }).finally(() => { loading = false; });
    return loadP;
  }
  /* back in the foreground or online: read the account again (live updates missed while asleep are not replayed) */
  function refresh(force) { if (!E.uid || !sb || !loaded || loading || (!force && Date.now() - loadedAt < 10000)) return; loadP = null; ensureLoad(); }
  function live() {
    if (chan || !E.uid) return;
    chan = sb.channel("engine-" + E.uid).on("postgres_changes", { event: "*", schema: "public", table: T, filter: "user_id=eq." + E.uid }, p => {
      note(p.new?.path || p.old?.path, p.eventType === "DELETE" ? undefined : p.new?.data);
      if (qPaths.has(p.new?.path || p.old?.path)) return; // a change of ours not sent yet: it is merged with the server's copy when it goes
      if (p.eventType === "DELETE") { if (!p.old?.path || !cache.has(p.old.path)) return; cache.delete(p.old.path); notify(p.old.path); return; }
      const r = p.new; if (!r?.path) return; if (same(cache.get(r.path), r.data)) return; cache.set(r.path, r.data); notify(r.path); saveSnap();
    }).subscribe();
  }
  /* a refusal that a retry can't fix (too large, not allowed, invalid): the change is set aside and the rest goes on */
  const permanent = r => { const s = r?.status || 0; return s >= 400 && s < 500 && ![401, 408, 429].includes(s); };
  let flushing = false, retryT = 0;
  async function flushQ() {
    if (flushing || !E.uid || !sb) return; flushing = true;
    try {
      for (;;) {
        const q = queue.find(x => !x.bad); if (!q) break;
        let data = q.data, r = null;
        if (q.op === "del") r = await sb.from(T).delete().eq("user_id", E.uid).eq("path", q.path);
        else {
          if (q.mb && E.merge) { const g = await sb.from(T).select("data").eq("user_id", E.uid).eq("path", q.path).maybeSingle();
            if (g.error) r = g; else if (g.data && !same(g.data.data, q.base)) data = E.merge(q.path, q.base, q.data, g.data.data); }
          if (q.path === "settings" && E.noKeys) data = E.noKeys(data);   // an entry queued by an older version may still hold the keys (S-1)
          if (!r) r = await sb.from(T).upsert({ user_id: E.uid, path: q.path, data, updated_at: new Date().toISOString() });
        }
        if (r.error) { if (!permanent(r)) throw r.error; q.bad = true; st.lastError = errText(r.error) || "error " + r.status; saveQ(); emit(); continue; }
        st.online = true; note(q.path, q.op === "del" ? undefined : data);
        const i = queue.indexOf(q);   // -1: a newer edit of the same document replaced it meanwhile, and goes next
        if (i >= 0) { queue.splice(i, 1); qPaths.delete(q.path); if (data !== q.data) { cache.set(q.path, data); notify(q.path); saveSnap(); } sent(q.path, data, data !== q.data); }
        saveQ(); emit();
      }
    } catch (e) { st.online = false; st.lastError = errText(e); emit(); clearTimeout(retryT); retryT = setTimeout(flushQ, 8000); }
    finally { flushing = false; }
  }
  addEventListener("online", () => { st.online = null; emit(); flushQ(); refresh(true); });
  addEventListener("offline", () => { st.online = false; emit(); });
  addEventListener("pagehide", persistQ);
  document.addEventListener("visibilitychange", () => { if (document.hidden) persistQ(); else { flushQ(); refresh(); } });
  function write(p, op, data, opts) {
    const has = qPaths.has(p);
    if (op !== "del" && !has && cache.has(p) && same(cache.get(p), data)) { sent(p, data, false); return Promise.resolve(); }   // the account already has exactly this
    const old = has ? queue.find(q => q.path === p) : null, q = { op, path: p, data: op === "del" ? null : data };
    if (op !== "del" && opts && "base" in opts) { q.mb = true; q.base = old?.mb ? old.base : opts.base; }   // the oldest copy this edit started from
    if (op === "del") cache.delete(p); else cache.set(p, data);
    if (has) queue = queue.filter(x => x.path !== p);
    queue.push(q); qPaths.add(p); saveQ(); saveSnap(); emit(); flushQ(); return Promise.resolve();
  }
  function docRef(full) { const p = rel(full);
    return { id: p.split("/").pop(), path: full,
      onSnapshot(cb, err) { (docL.get(p) || docL.set(p, new Set()).get(p)).add(cb); if (err) errs.add(err); if (loaded) cb(snapDoc(p, !loadedAt)); else ensureLoad(); return () => docL.get(p)?.delete(cb); },
      async get() { await ensureLoad(); return snapDoc(p); },
      set(data, opts) { return write(p, "set", JSON.parse(JSON.stringify(data)), opts); },
      update(data) { return write(p, "set", { ...(cache.get(p) || {}), ...JSON.parse(JSON.stringify(data)) }); },
      delete() { return write(p, "del"); },
      collection(n) { return colRef(full + "/" + n); } }; }
  function colRef(full, w) { const c = rel(full);
    return { path: full, doc: id => docRef(full + "/" + id), where: (f, op, v) => colRef(full, [f, op, v]),
      onSnapshot(cb, err) { const l = { cb, w }; (colL.get(c) || colL.set(c, new Set()).get(c)).add(l); if (err) errs.add(err); if (loaded) cb(snapCol(c, w, !loadedAt)); else ensureLoad(); return () => colL.get(c)?.delete(l); },
      async get() { await ensureLoad(); return snapCol(c, w); } }; }
  const db = { doc: docRef, collection: p => colRef(p) };
  E.pending = () => E.status().pending;
  E.flush = flushQ; E.persist = persistQ;

  /* ---------- user ---------- */
  const user = { id: async () => E.uid, me: async () => ({ id: E.uid, name: E.email || "", email: E.email }), isOwner: () => true, canEdit: () => true, can: () => true, profiles: async () => ({}), search: async () => [] };

  /* ---------- downloads: a normal browser download ---------- */
  const downloads = { save: async ({ filename, data, mimeType }) => { const ext = (String(filename).match(/\.(\w+)$/) || [])[1]?.toLowerCase(), types = { json: "application/json", ics: "text/calendar", csv: "text/csv", png: "image/png", jpg: "image/jpeg", pdf: "application/pdf", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", py: "text/x-python" };
    const blob = data instanceof Blob ? data : new Blob([data], { type: mimeType || types[ext] || "text/plain" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename || "download"; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000); return { status: "saved" }; } };

  /* ---------- AI: every key you add (open and closed models), tried in your order; if a model fails, the next one ---------- */
  const AI_PRESETS = {
    gemini: { label: "Google Gemini", kind: "gemini", model: "gemini-flash-latest", url: "aistudio.google.com → Get API key", free: true, open: false },
    anthropic: { label: "Claude (Anthropic)", kind: "anthropic", base: "https://api.anthropic.com/v1", model: "claude-haiku-5-5", url: "console.anthropic.com → API keys", open: false },
    openai: { label: "OpenAI", kind: "openai", base: "https://api.openai.com/v1", model: "gpt-5-mini", url: "platform.openai.com → API keys", open: false },
    groq: { label: "Groq", kind: "openai", base: "https://api.groq.com/openai/v1", model: "meta-llama/llama-4-scout-17b-16e-instruct", url: "console.groq.com → API Keys", free: true, open: true },
    openrouter: { label: "OpenRouter", kind: "openai", base: "https://openrouter.ai/api/v1", model: "google/gemma-3-27b-it:free", url: "openrouter.ai → Keys (models ending in :free cost nothing)", free: true, open: true },
    mistral: { label: "Mistral", kind: "openai", base: "https://api.mistral.ai/v1", model: "mistral-small-latest", url: "console.mistral.ai → API keys", free: true, open: true },
    huggingface: { label: "Hugging Face", kind: "openai", base: "https://router.huggingface.co/v1", model: "google/gemma-3-27b-it", url: "huggingface.co → Settings → Access tokens", free: true, open: true },
    cerebras: { label: "Cerebras", kind: "openai", base: "https://api.cerebras.ai/v1", model: "llama-3.3-70b", url: "cloud.cerebras.ai → API keys", free: true, open: true, vision: false },
    custom: { label: "Other (OpenAI-compatible)", kind: "openai", base: "", model: "", url: "any service with an OpenAI-style /v1 address: Together, DeepInfra, Ollama, LM Studio…", open: true, custom: true }
  };
  E.AI_PRESETS = AI_PRESETS;
  const ST = () => (typeof S !== "undefined" && S.settings) || null;
  /* settings.ai = { services: [{ id, provider, key, model, on, models, check }] } (older single-key settings are migrated) */
  E.aiServices = () => { const st = ST(); if (!st) return []; const a = st.ai || {};
    if (!a.services && a.key) st.ai = { services: [{ id: "s1", provider: a.provider || "gemini", key: a.key, model: a.model, on: true, models: a.models, check: a.check }] };
    return (st.ai?.services || []).filter(s => s && (s.key || (s.provider === "custom" && s.base))); };
  E.anyAI = () => E.aiServices().some(s => s.on !== false);
  E.aiCfg = () => { const s = E.aiServices().find(x => x.on !== false); return s ? svcCfg(s) : null; };
  const svcCfg = s => { const P = AI_PRESETS[s.provider] || AI_PRESETS.gemini; return { id: s.id, provider: s.provider, kind: P.kind, key: s.key, model: s.model || P.model, base: s.base || P.base, models: s.models || [], vision: s.vision ?? P.vision }; };
  const b64 = blob => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(",")[1]); r.onerror = no; r.readAsDataURL(blob); });
  async function shrink(blob) { try { const bmp = await createImageBitmap(blob); const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height)); const c = document.createElement("canvas"); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k); c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height); return await new Promise(r => c.toBlob(r, "image/jpeg", .85)); } catch (e) { return blob; } }
  const err = (r, j, label) => { const e = new Error(j?.error?.message || j?.message || (typeof j?.error === "string" ? j.error : "") || `${label} error ${r.status}`); e.status = r.status; e.body = j; return e; };
  /* model lists and the best model of each family */
  E.listModels = async cfg => {
    if (cfg.kind === "gemini") { const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", { headers: { "x-goog-api-key": cfg.key } }); const j = await r.json().catch(() => ({})); if (!r.ok) throw err(r, j, "Gemini"); return (j.models || []).filter(m => (m.supportedGenerationMethods || []).includes("generateContent")).map(m => String(m.name).replace(/^models\//, "")); }
    if (cfg.kind === "anthropic") { const r = await fetch(cfg.base + "/models?limit=100", { headers: { "x-api-key": cfg.key, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" } }); const j = await r.json().catch(() => ({})); if (!r.ok) throw err(r, j, "Claude"); return (j.data || []).map(m => m.id); }
    const r = await fetch(cfg.base.replace(/\/$/, "") + "/models", { headers: { Authorization: "Bearer " + cfg.key } }); const j = await r.json().catch(() => ({})); if (!r.ok) throw err(r, j, "AI"); return (j.data || []).map(m => m.id);
  };
  E.geminiModels = key => E.listModels({ kind: "gemini", key });
  const ver = (m, re) => { const v = m.match(re); return v ? +v[1] : -1; };
  E.bestGemini = models => { const ok = models.filter(m => /^gemini-/.test(m) && !/lite|image|tts|live|audio|embed|exp|thinking|robotics|computer|native|aqa/.test(m)); if (ok.includes("gemini-flash-latest")) return "gemini-flash-latest"; const re = /^gemini-(\d+(?:\.\d+)?)-flash(?:-latest)?$/; const f = ok.filter(m => ver(m, re) >= 0).sort((a, b) => ver(b, re) - ver(a, re)); return f[0] || ok.find(m => /flash/.test(m)) || models.find(m => /flash-lite/.test(m)) || models[0] || null; };
  function rank(cfg, models) { // models worth trying, best first
    const bad = /embed|audio|tts|transcri|realtime|whisper|moderation|image-gen|dall|search|guard|instruct-vision-only|codestral|ocr$/i;
    let ms = models.filter(m => !bad.test(m));
    if (cfg.kind === "gemini") { const pick = []; const add = m => m && !pick.includes(m) && pick.push(m); add(E.bestGemini(ms)); ms.filter(m => /^gemini-[\d.]+-flash$/.test(m)).sort((a, b) => b.localeCompare(a)).forEach(add); ms.filter(m => /flash-lite/.test(m)).forEach(add); ms.filter(m => /^gemini-[\d.]+-pro$/.test(m)).forEach(add); return pick; }
    if (cfg.kind === "anthropic") return ms.sort((a, b) => (/haiku/.test(b) - /haiku/.test(a)) || (/sonnet/.test(b) - /sonnet/.test(a)) || b.localeCompare(a));
    if (cfg.provider === "openrouter") return ms.filter(m => /:free$/.test(m)).sort((a, b) => (/gemini|gemma|llama-4|qwen.*vl|mistral/i.test(b) - /gemini|gemma|llama-4|qwen.*vl|mistral/i.test(a)));
    if (cfg.provider === "groq") return ms.sort((a, b) => (/llama-4|vision|scout|maverick/i.test(b) - /llama-4|vision|scout|maverick/i.test(a)));
    if (cfg.provider === "openai") return ms.filter(m => /^(gpt|o\d)/.test(m)).sort((a, b) => (/mini/.test(b) - /mini/.test(a)) || b.localeCompare(a));
    if (cfg.provider === "mistral") return ms.sort((a, b) => (/small|medium|pixtral/.test(b) - /small|medium|pixtral/.test(a)));
    return ms;
  }
  async function call(cfg, msgs, imgs, json, signal) {
    const sys = json ? "Reply with only valid JSON, no prose, no code fences." : "";
    if (cfg.kind === "gemini") {
      const contents = msgs.map((m, i) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }, ...(i === msgs.length - 1 ? imgs.map(x => ({ inline_data: { mime_type: x.mime, data: x.data } })) : [])] }));
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cfg.model)}:generateContent`, { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": cfg.key }, body: JSON.stringify({ contents, ...(sys ? { systemInstruction: { parts: [{ text: sys }] } } : {}), generationConfig: { temperature: .2, ...(json ? { responseMimeType: "application/json" } : {}) } }), signal });
      const j = await r.json().catch(() => ({})); if (!r.ok) throw err(r, j, "Gemini");
      return (j.candidates?.[0]?.content?.parts || []).map(p => p.text || "").join("");
    }
    if (cfg.kind === "anthropic") {
      const m2 = msgs.map((m, i) => ({ role: m.role === "assistant" ? "assistant" : "user", content: i === msgs.length - 1 && imgs.length ? [...imgs.map(x => ({ type: "image", source: { type: "base64", media_type: x.mime, data: x.data } })), { type: "text", text: m.content }] : m.content }));
      const r = await fetch(cfg.base + "/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": cfg.key, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" }, body: JSON.stringify({ model: cfg.model, max_tokens: 1500, temperature: .2, ...(sys ? { system: sys } : {}), messages: m2 }), signal });
      const j = await r.json().catch(() => ({})); if (!r.ok) throw err(r, j, "Claude");
      return (j.content || []).map(c => c.text || "").join("");
    }
    const m2 = msgs.map((m, i) => ({ role: m.role, content: i === msgs.length - 1 && imgs.length ? [{ type: "text", text: m.content }, ...imgs.map(x => ({ type: "image_url", image_url: { url: `data:${x.mime};base64,${x.data}` } }))] : m.content }));
    const r = await fetch(cfg.base.replace(/\/$/, "") + "/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + cfg.key }, body: JSON.stringify({ model: cfg.model, messages: [...(sys ? [{ role: "system", content: sys }] : []), ...m2], ...(json && cfg.provider !== "openrouter" ? { response_format: { type: "json_object" } } : {}) }), signal });
    const j = await r.json().catch(() => ({})); if (!r.ok) throw err(r, j, AI_PRESETS[cfg.provider]?.label || "AI");
    return j.choices?.[0]?.message?.content || "";
  }
  const fatalKey = e => e?.status === 401 || (e?.status === 400 && /API_KEY_INVALID|api key not valid|invalid x-api-key|incorrect api key/i.test(String(e?.message))) || (e?.status === 403 && /credit|billing|permission/i.test(String(e?.message)));
  const wait = ms => new Promise(r => setTimeout(r, ms));
  /* the chain: each service in your order; inside it, its model, then the next good models */
  async function ask(input, opts = {}, json = false, over = null) {
    const msgs = typeof input === "string" ? [{ role: "user", content: input }] : input;
    const imgs = []; for (const f of opts.images || []) { const s = await shrink(f); imgs.push({ mime: s.type || "image/jpeg", data: await b64(s) }); }
    const chain = over ? [over] : E.aiServices().filter(s => s.on !== false).map(svcCfg);
    if (!chain.length) { const e = new Error("Add an AI key in Settings"); e.code = "not_granted"; throw e; }
    const tried = []; let last = null;
    for (const cfg of chain) {
      if (imgs.length && cfg.vision === false && !over) { tried.push(`${cfg.provider}: skipped (no photos)`); continue; }
      let models = [cfg.model]; let listed = false;
      for (let k = 0; k < models.length && k < 4; k++) {
        const c = { ...cfg, model: models[k] };
        for (let attempt = 0; attempt < 2; attempt++) {
          try { const text = await call(c, msgs, imgs, json, opts.signal);
            if (!String(text).trim()) throw Object.assign(new Error("empty answer"), { status: 0 });
            if (json) { const mm = text.match(/[\[{][\s\S]*[\]}]/); JSON.parse(mm ? mm[0] : text); }   // an answer that is not the JSON asked for counts as a failure: the next model, then the next service
            tried.push(`${c.provider}/${c.model}: ok`);
            if (k > 0 || cfg !== chain[0]) { try { opts.onModel?.(c.model, c.provider); } catch (x) {} if (!over && k > 0) remember(cfg.id, c.model); }
            E.lastRun = { provider: c.provider, model: c.model, tried };
            if (opts.onText) try { opts.onText({ text, delta: text }); } catch (x) {}
            return text; }
          catch (e) { if (e.name === "AbortError") throw e; last = e;
            if ([500, 502, 503, 504, 529].includes(e.status) && attempt === 0 && k === 0) { await wait(1000); continue; }
            tried.push(`${c.provider}/${c.model}: ${e.status || ""} ${String(e.message).slice(0, 60)}`); break; }
        }
        if (fatalKey(last)) break; // this key doesn't work: next service
        if (!listed) { listed = true; let hint = (String(last?.message).match(/use models\/([\w.-]+)/) || [])[1]; let ms = [];
          try { ms = rank(cfg, cfg.models?.length ? cfg.models : await E.listModels(cfg)); } catch (x) {}
          models = [...new Set([models[0], ...(hint ? [hint] : []), ...ms])]; }
      }
    }
    E.lastRun = { tried }; const e = last || new Error("No AI service answered"); e.tried = tried; throw e;
  }
  function remember(id, model) { const st = ST(); const s = st?.ai?.services?.find(x => x.id === id); if (s && s.model !== model) { s.model = model; try { saveSettings(); } catch (x) {} } }
  const sample = async (input, opts) => ({ text: await ask(input, opts), truncated: false });
  sample.json = async (input, opts, over) => { const t = await ask(input, opts, true, over); const m = t.match(/[\[{][\s\S]*[\]}]/); return JSON.parse(m ? m[0] : t); };
  sample.limits = async () => ({ images: true });
  E.sample = sample; E.svcCfg = svcCfg; E.rankModels = rank;

  /* ---------- the claude.use() entry point the app calls ---------- */
  window.claude = { use: async name => {
    if (name === "db") { const id = await auth(); if (!id) return null; ensureLoad(); flushQ(); return db; }
    if (name === "user") { const id = await auth(); return id ? user : null; }
    if (name === "downloads") return downloads;
    if (name === "sample") return E.anyAI() ? sample : null;
    return null;
  } };
})();
