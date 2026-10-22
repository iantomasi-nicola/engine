/* Engine web runtime: gives the app the same services it had inside claude.ai
   (db, user, downloads, sample) using Supabase, the browser and an optional free AI key. */
(function () {
  const CFG = window.ENGINE_CONFIG || {};
  const LS = { get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }, del(k) { try { localStorage.removeItem(k); } catch (e) {} } };
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
      let s = null; try { s = (await sb.auth.getSession()).data.session; } catch (e) {}
      if (!s && !LS.get("engine.localOnly", false)) s = await E.loginScreen();
      if (s) { E.uid = s.user.id; E.email = s.user.email; E.mode = "cloud"; }
      return E.uid;
    })();
    return authP;
  }
  E.signOut = async () => { try { await sb?.auth.signOut(); } catch (e) {} LS.set("engine.localOnly", true); location.reload(); };
  E.signIn = async () => { const s = await E.loginScreen({ cancel: true }); if (s) { LS.del("engine.localOnly"); location.reload(); } };

  /* ---------- db: a small Firestore-like layer over one Supabase table, with an offline write queue ---------- */
  let cache = new Map(), loaded = false, loadP = null, chan = null;
  const docL = new Map(), colL = new Map();
  let queue = LS.get("engine.q", []);
  const rel = p => p.split("/").slice(3).join("/");
  const collOf = p => { const a = p.split("/"); return a.length > 1 ? a.slice(0, -1).join("/") : ""; };
  const snapDoc = (p, fc) => ({ id: p.split("/").pop(), exists: cache.has(p), data: () => cache.get(p), metadata: { fromCache: !!fc } });
  function test(d, w) { if (!w) return true; const [f, op, v] = w, x = d?.[f]; return op === ">=" ? x >= v : op === ">" ? x > v : op === "<=" ? x <= v : op === "<" ? x < v : op === "==" ? x === v : true; }
  const snapCol = (c, w, fc) => { const docs = []; for (const [p, d] of cache) if (collOf(p) === c && test(d, w)) docs.push({ id: p.split("/").pop(), data: () => d }); return { docs, size: docs.length, empty: !docs.length, metadata: { fromCache: !!fc } }; };
  function notify(p) { for (const cb of docL.get(p) || []) try { cb(snapDoc(p)); } catch (e) { console.warn(e); } const c = collOf(p); for (const l of colL.get(c) || []) try { l.cb(snapCol(c, l.w)); } catch (e) { console.warn(e); } }
  const errs = new Set(); const fail = e => { for (const f of errs) try { f(e); } catch (x) {} };
  async function loadAll() {
    const out = new Map(); let from = 0;
    for (;;) { const { data, error } = await sb.from(T).select("path,data").range(from, from + 999); if (error) throw error; for (const r of data) out.set(r.path, r.data); if (data.length < 1000) break; from += 1000; }
    for (const q of queue) q.op === "del" ? out.delete(q.path) : out.set(q.path, q.data);
    cache = out; loaded = true;
    for (const p of docL.keys()) for (const cb of docL.get(p)) cb(snapDoc(p));
    for (const [c, ls] of colL) for (const l of ls) l.cb(snapCol(c, l.w));
    live();
  }
  function ensureLoad() { if (loadP) return loadP; loadP = loadAll().catch(e => { loadP = null; fail({ code: "unavailable", message: String(e?.message || e) }); setTimeout(ensureLoad, 15000); }); return loadP; }
  function live() {
    if (chan || !E.uid) return;
    chan = sb.channel("engine-" + E.uid).on("postgres_changes", { event: "*", schema: "public", table: T, filter: "user_id=eq." + E.uid }, p => {
      if (queue.some(q => q.path === (p.new?.path || p.old?.path))) return; // our own write still on its way
      if (p.eventType === "DELETE") { if (!p.old?.path || !cache.has(p.old.path)) return; cache.delete(p.old.path); notify(p.old.path); return; }
      const r = p.new; if (!r?.path) return; if (JSON.stringify(cache.get(r.path)) === JSON.stringify(r.data)) return; cache.set(r.path, r.data); notify(r.path);
    }).subscribe();
  }
  let flushing = false;
  async function flushQ() {
    if (flushing || !queue.length || !E.uid) return; flushing = true;
    try { while (queue.length) { const q = queue[0];
        const r = q.op === "del" ? await sb.from(T).delete().eq("user_id", E.uid).eq("path", q.path) : await sb.from(T).upsert({ user_id: E.uid, path: q.path, data: q.data, updated_at: new Date().toISOString() });
        if (r.error) throw r.error; queue.shift(); LS.set("engine.q", queue); } }
    catch (e) { fail({ code: "unavailable", message: String(e?.message || e) }); setTimeout(flushQ, 8000); }
    finally { flushing = false; }
  }
  addEventListener("online", () => { flushQ(); ensureLoad(); });
  function write(p, op, data) { if (op === "del") cache.delete(p); else cache.set(p, data); queue = queue.filter(q => q.path !== p); queue.push({ op, path: p, data: op === "del" ? null : data }); LS.set("engine.q", queue); notify(p); flushQ(); return Promise.resolve(); }
  function docRef(full) { const p = rel(full);
    return { id: p.split("/").pop(), path: full,
      onSnapshot(cb, err) { (docL.get(p) || docL.set(p, new Set()).get(p)).add(cb); if (err) errs.add(err); if (loaded) cb(snapDoc(p)); else ensureLoad(); return () => docL.get(p)?.delete(cb); },
      async get() { await ensureLoad(); return snapDoc(p); },
      set(data) { return write(p, "set", JSON.parse(JSON.stringify(data))); },
      update(data) { return write(p, "set", { ...(cache.get(p) || {}), ...JSON.parse(JSON.stringify(data)) }); },
      delete() { return write(p, "del"); },
      collection(n) { return colRef(full + "/" + n); } }; }
  function colRef(full, w) { const c = rel(full);
    return { path: full, doc: id => docRef(full + "/" + id), where: (f, op, v) => colRef(full, [f, op, v]),
      onSnapshot(cb, err) { const l = { cb, w }; (colL.get(c) || colL.set(c, new Set()).get(c)).add(l); if (err) errs.add(err); if (loaded) cb(snapCol(c, w)); else ensureLoad(); return () => colL.get(c)?.delete(l); },
      async get() { await ensureLoad(); return snapCol(c, w); } }; }
  const db = { doc: docRef, collection: p => colRef(p) };
  E.pending = () => queue.length;
  E.flush = flushQ;

  /* ---------- user ---------- */
  const user = { id: async () => E.uid, me: async () => ({ id: E.uid, name: E.email || "", email: E.email }), isOwner: () => true, canEdit: () => true, can: () => true, profiles: async () => ({}), search: async () => [] };

  /* ---------- downloads: a normal browser download ---------- */
  const downloads = { save: async ({ filename, data, mimeType }) => { const blob = data instanceof Blob ? data : new Blob([data], { type: mimeType || (/\.json$/i.test(filename) ? "application/json" : "text/plain") });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename || "download"; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000); return { status: "saved" }; } };

  /* ---------- sample: optional AI with your own free key (Gemini, or any OpenAI-compatible service such as Groq / OpenRouter) ---------- */
  const AI_PRESETS = { gemini: { label: "Google Gemini", model: "gemini-flash-latest" }, groq: { label: "Groq", base: "https://api.groq.com/openai/v1", model: "meta-llama/llama-4-scout-17b-16e-instruct" }, openrouter: { label: "OpenRouter", base: "https://openrouter.ai/api/v1", model: "google/gemini-2.0-flash-exp:free" } };
  E.AI_PRESETS = AI_PRESETS;
  E.aiCfg = () => { const a = (typeof S !== "undefined" && S.settings && S.settings.ai) || {}; return a.key ? { provider: a.provider || "gemini", key: a.key, model: a.model || AI_PRESETS[a.provider || "gemini"]?.model, base: a.base || AI_PRESETS[a.provider || "gemini"]?.base } : null; };
  const b64 = blob => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(",")[1]); r.onerror = no; r.readAsDataURL(blob); });
  async function shrink(blob) { try { const bmp = await createImageBitmap(blob); const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height)); const c = document.createElement("canvas"); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k); c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height); return await new Promise(r => c.toBlob(r, "image/jpeg", .85)); } catch (e) { return blob; } }
  /* Google retires models for new keys often: pick the best Flash model this key can use */
  E.bestGemini = function (models) {
    const ok = models.filter(m => /^gemini-/.test(m) && !/lite|image|tts|live|audio|embed|exp|thinking|robotics|computer|native|aqa/.test(m));
    if (ok.includes("gemini-flash-latest")) return "gemini-flash-latest";
    const ver = m => { const v = m.match(/^gemini-(\d+(?:\.\d+)?)-flash(?:-latest)?$/); return v ? +v[1] : -1; };
    const flash = ok.filter(m => ver(m) >= 0).sort((a, b) => ver(b) - ver(a) || a.length - b.length);
    return flash[0] || ok.find(m => /flash/.test(m)) || models.find(m => /flash-lite/.test(m)) || models[0] || null;
  };
  E.geminiModels = async key => { const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?pageSize=200&key=${encodeURIComponent(key)}`); const j = await r.json().catch(() => ({})); if (!r.ok) { const e = new Error(j?.error?.message || "HTTP " + r.status); e.status = r.status; e.body = j; throw e; } return (j.models || []).filter(m => (m.supportedGenerationMethods || []).includes("generateContent")).map(m => String(m.name).replace(/^models\//, "")); };
  const retired = e => (e?.status === 404 || e?.status === 400) && /no longer available|not found|is not supported|deprecated/i.test(String(e?.message || ""));
  async function ask(input, opts = {}, json = false, over = null, retry = true) {
    try { return await ask1(input, opts, json, over); }
    catch (e) {
      const cfg = over || E.aiCfg();
      if (!retry || !cfg || cfg.provider !== "gemini" || !retired(e)) throw e;
      let next = (String(e.message).match(/use models\/([\w.-]+)/) || [])[1];
      if (!next) { try { next = E.bestGemini(await E.geminiModels(cfg.key)); } catch (x) {} }
      if (!next || next === cfg.model) throw e;
      if (!over && typeof S !== "undefined" && S.settings?.ai) { S.settings.ai = { ...S.settings.ai, model: next }; try { saveSettings(); } catch (x) {} }
      try { opts.onModel?.(next); } catch (x) {}
      return ask(input, opts, json, { ...cfg, model: next }, false);
    }
  }
  async function ask1(input, opts = {}, json = false, over = null) {
    const cfg = over || E.aiCfg(); if (!cfg) { const e = new Error("Add an AI key in Settings"); e.code = "not_granted"; throw e; }
    const msgs = typeof input === "string" ? [{ role: "user", content: input }] : input;
    const imgs = []; for (const f of opts.images || []) { const s = await shrink(f); imgs.push({ mime: s.type || "image/jpeg", data: await b64(s) }); }
    const sys = json ? "Reply with only valid JSON, no prose, no code fences." : "";
    let text = "";
    if (cfg.provider === "gemini") {
      const contents = msgs.map((m, i) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }, ...(i === msgs.length - 1 ? imgs.map(x => ({ inline_data: { mime_type: x.mime, data: x.data } })) : [])] }));
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cfg.model)}:generateContent?key=${encodeURIComponent(cfg.key)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents, ...(sys ? { systemInstruction: { parts: [{ text: sys }] } } : {}), generationConfig: { temperature: .2, ...(json ? { responseMimeType: "application/json" } : {}) } }), signal: opts.signal });
      const j = await r.json().catch(() => ({})); if (!r.ok) { const e = new Error(j?.error?.message || "AI error " + r.status); e.code = r.status === 429 ? "rate_limited" : "error"; e.status = r.status; e.body = j; throw e; }
      text = (j.candidates?.[0]?.content?.parts || []).map(p => p.text || "").join("");
    } else {
      const m2 = msgs.map((m, i) => ({ role: m.role, content: i === msgs.length - 1 && imgs.length ? [{ type: "text", text: m.content }, ...imgs.map(x => ({ type: "image_url", image_url: { url: `data:${x.mime};base64,${x.data}` } }))] : m.content }));
      const r = await fetch(cfg.base.replace(/\/$/, "") + "/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + cfg.key }, body: JSON.stringify({ model: cfg.model, temperature: .2, messages: [...(sys ? [{ role: "system", content: sys }] : []), ...m2], ...(json ? { response_format: { type: "json_object" } } : {}) }), signal: opts.signal });
      const j = await r.json().catch(() => ({})); if (!r.ok) { const e = new Error(j?.error?.message || "AI error " + r.status); e.code = r.status === 429 ? "rate_limited" : "error"; e.status = r.status; e.body = j; throw e; }
      text = j.choices?.[0]?.message?.content || "";
    }
    if (opts.onText) try { opts.onText({ text, delta: text }); } catch (e) {}
    return text;
  }
  const sample = async (input, opts) => ({ text: await ask(input, opts), truncated: false });
  sample.json = async (input, opts, over) => { const t = await ask(input, opts, true, over); const m = t.match(/[\[{][\s\S]*[\]}]/); return JSON.parse(m ? m[0] : t); };
  sample.limits = async () => ({ images: true });
  E.sample = sample;

  /* ---------- the claude.use() entry point the app calls ---------- */
  window.claude = { use: async name => {
    if (name === "db") { const id = await auth(); if (!id) return null; ensureLoad(); flushQ(); return db; }
    if (name === "user") { const id = await auth(); return id ? user : null; }
    if (name === "downloads") return downloads;
    if (name === "sample") return E.aiCfg() ? sample : null;
    return null;
  } };
})();
