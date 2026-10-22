/* ================= intervals.icu, direct from the app (web version) =================
   Same merge rules as the sync script (bridge v2): pulls planned workouts, activities, wellness (sleep, HRV, resting HR, steps; never weight) and races,
   pushes Engine workouts, plan changes, check-ins and races. The result is applied as day/field patches,
   so edits made while it runs are kept. */
const ICU_API = "https://intervals.icu/api/v1";
async function icuSyncDirect() {
  const icu = clone(S.settings.intervals || {}), KEY = (icu.key || "").trim(), AID = (icu.aid || "").trim() || "0";
  if (!KEY) throw new Error("Add your intervals.icu API key first");
  const auth = "Basic " + btoa("API_KEY:" + KEY);
  async function req(path, method = "GET", body) {
    let r;
    try { r = await fetch(ICU_API + path, { method, headers: { Authorization: auth, Accept: "application/json", ...(body !== undefined ? { "Content-Type": "application/json" } : {}) }, body: body !== undefined ? JSON.stringify(body) : undefined }); }
    catch (e) { const x = new Error("intervals.icu can't be reached (offline?)"); x.fatal = true; throw x; }
    if (r.status === 401 || r.status === 403) { const x = new Error(`intervals.icu refused the key (${r.status})`); x.fatal = true; throw x; }
    if (!r.ok) { const x = new Error("HTTP " + r.status); x.status = r.status; throw x; }
    const t = await r.text(); return t ? JSON.parse(t) : null;
  }
  const FITs = FIT(), SPORTS = (FITs.sports || []).map(s => s.name).filter(Boolean);
  const SP = SPORTS.length ? SPORTS : ["Calisthenics", "Running", "Cycling", "Walking", "Other"];
  const RUN = FITs.runSport || SP.find(s => /run/i.test(s)) || "Running";
  const TODAY = todayISO(), iso = d => d, add = (d, n) => addDays(d, n);
  const r0_ = x => Math.round(x), r1_ = x => Math.round(x * 10) / 10;
  const find = rx => SP.find(n => new RegExp(rx, "i").test(n)) || null;
  function sport(t) { const s = String(t || "").toLowerCase();
    if (s.includes("run")) return RUN; if (/ride|bike|cycl|spin/.test(s)) return find("cycl|bike|ride") || "Cycling"; if (s.includes("swim")) return find("swim") || "Swimming";
    if (/walk|hike/.test(s)) return find("walk|hik") || "Walking"; if (/weight|strength|gym|calis|crossfit|hiit/.test(s)) return find("calis|strength|gym") || "Strength";
    if (s.includes("row")) return find("row") || "Rowing"; if (/football|soccer/.test(s)) return find("football|soccer") || "Football"; return find("^other$") || SP[0] || "Other"; }
  function intensity(name, desc, mins, load) { const t = `${name} ${desc}`.toLowerCase();
    if (load && mins) { const ph = load / (mins / 60); if (ph >= 78) return "Hard"; if (ph <= 50) return "Light"; }
    if (/vo2|interval|threshold|z4|z5|tempo run|race|hard|sweet ?spot|anaerob|max/.test(t)) return "Hard";
    if (/recovery|easy|z1|z2|endurance|base|aerobic|long run|lsd|mobility/.test(t)) return "Light"; return "Moderate"; }
  function stepTotals(desc) { let rep = 1, mins = 0, km = 0, hasT = false;
    for (const raw of String(desc || "").split(/\r?\n/)) { const l = raw.trim(); if (!l) { rep = 1; continue; }
      const m = l.match(/^(\d+)\s*x\b/i); if (m && !l.startsWith("-")) { rep = +m[1]; continue; } if (!l.startsWith("-")) continue;
      const d = l.match(/^-\s*(\d+(?:\.\d+)?)\s*km/i), t = l.match(/^-\s*(?:(\d+(?:\.\d+)?)h)?\s*(?:(\d+)m(?![a-z]))?\s*(?:(\d+)s)?/i);
      if (d) km += rep * +d[1]; else if (t && (t[1] || t[2] || t[3])) { hasT = true; mins += rep * ((+t[1] || 0) * 60 + (+t[2] || 0) + (+t[3] || 0) / 60); } }
    return [r0_(mins), hasT ? 0 : r1_(km), hasT]; }
  const cleanO = o => { const x = {}; for (const [k, v] of Object.entries(o)) if (!(v === null || v === undefined || v === "" || (Array.isArray(v) && !v.length))) x[k] = v; return x; };
  const J = v => JSON.stringify(v, Object.keys(v && typeof v === "object" ? flatKeys(v) : {}).sort());
  function flatKeys(v, acc = {}) { if (Array.isArray(v)) v.forEach(x => flatKeys(x, acc)); else if (v && typeof v === "object") for (const k of Object.keys(v)) { acc[k] = 1; flatKeys(v[k], acc); } return acc; }
  const same = (a, b) => J(a ?? null) === J(b ?? null);
  // working copy of the month docs
  const docs = {}, orig = {};
  for (const [mk, d] of Object.entries(S.logm || {})) { docs[mk] = { month: d.month || mk, days: clone(d.days || {}) }; orig[mk] = clone(docs[mk].days); }
  function day(date, create = true) { const mk = date.slice(0, 7); if (!docs[mk]) { if (!create) return null; docs[mk] = { month: mk, days: {} }; orig[mk] = {}; } if (!create) return docs[mk].days[date] || null; return docs[mk].days[date] = docs[mk].days[date] || {}; }
  function tidy(date) { const mk = date.slice(0, 7), d = docs[mk]?.days?.[date]; if (!d) return; for (const k of Object.keys(d)) if (d[k] === null || d[k] === "" || (Array.isArray(d[k]) && !d[k].length && k !== "planned")) delete d[k]; if (!Object.keys(d).length) delete docs[mk].days[date]; }
  const isIcuW = w => String(w?.ext || "").startsWith("icu-");
  const res = { planned: 0, acts: 0, well: 0, pushed: 0, sent_plan: 0, sent_well: 0, races: 0 };
  const PLAN_SRC = icu.planSource !== false, SINCE_LINK = icu.bridge?.since || TODAY, NO_PUSH = false;
  function itype(sp) { const s = sp || ""; if (/calis|strength|gym|weight|crossfit|hiit/i.test(s)) return "WeightTraining"; if (/run/i.test(s)) return "Run"; if (/cycl|bike|ride/i.test(s)) return "Ride"; if (/walk/i.test(s)) return "Walk"; if (/swim/i.test(s)) return "Swim"; if (/hike/i.test(s)) return "Hike"; return "Workout"; }
  // athlete
  const ath = await req(`/athlete/${AID}`) || {};
  const athlete = ath.name || [ath.firstname, ath.lastname].filter(Boolean).join(" ") || icu.athlete || "";
  // Engine -> intervals.icu: planned workouts added, edited or deleted here
  // strength: intervals.icu would read "- 6 Pull-up" as timed steps and get the length wrong, so the lines go as "•" text (Engine reads both)
  // and the duration is Engine's own, calibrated on your live sessions
  const strW = w => typeof isStrength === "function" && isStrength(w.sport);
  const evBody = (date, w) => { let desc = w.script || (w.min ? `- ${Math.trunc(w.min)}m${w.km ? ` ${w.km}km` : ""}` : ""); let min = w.min;
    if (strW(w) && w.script) { desc = desc.replace(/^(\s*)-\s+/gm, "$1• "); try { const g = workoutGist(w).min; if (g > 0) min = g; } catch (e) {} }
    const b = { category: "WORKOUT", start_date_local: `${date}T00:00:00`, type: itype(w.sport), name: w.note || w.sport || "Workout", description: desc }; if (min) b.moving_time = Math.trunc(min * 60); return b; };
  for (const mk of Object.keys(docs)) for (const [date, dd] of Object.entries(docs[mk].days)) {
    if (date < add(TODAY, -2)) continue;
    for (const ext of [...(dd.plannedDel || [])]) { try { await req(`/athlete/${AID}/events/${String(ext).slice(4)}`, "DELETE"); res.sent_plan++; } catch (e) { if (e.fatal) throw e; if (e.status !== 404) continue; } dd.plannedDel = (dd.plannedDel || []).filter(x => x !== ext); }
    if (!(dd.plannedDel || []).length) delete dd.plannedDel;
    for (const w of dd.planned || []) { try {
      if (w.pushNew && !w.ext) { const r = await req(`/athlete/${AID}/events`, "POST", evBody(date, w)); if (r && r.id != null) { w.ext = `icu-${r.id}`; w.src = "intervals"; } delete w.pushNew; res.sent_plan++; }
      else if (w.dirty && isIcuW(w)) { await req(`/athlete/${AID}/events/${String(w.ext).slice(4)}`, "PUT", evBody(date, w)); delete w.dirty; res.sent_plan++; }
    } catch (e) { if (e.fatal) throw e; } }
  }
  // planned workouts
  const a = add(TODAY, -7), bEnd = add(TODAY, 42);
  const ev = await req(`/athlete/${AID}/events?oldest=${a}&newest=${bEnd}&category=WORKOUT`) || [];
  const by = {};
  for (const e of ev) { if (!e || typeof e !== "object" || (e.category && e.category !== "WORKOUT")) continue;
    const date = String(e.start_date_local || e.start_date || "").slice(0, 10); if (!date) continue;
    const [sm, sk, hasT] = stepTotals(e.description);
    let mins = r0_((e.moving_time || e.workout_doc?.duration || 0) / 60) || sm || null;
    if (strW({ sport: sport(e.type || e.name) }) && e.description) { try { const g = workoutGist({ sport: sport(e.type || e.name), script: String(e.description) }).min; if (g > 0) mins = g; } catch (x) {} }
    const km = hasT ? null : (r1_((e.distance || e.workout_doc?.distance || 0) / 1000) || sk || null);
    (by[date] = by[date] || []).push(cleanO({ sport: sport(e.type || e.name), int: intensity(e.name || "", e.description || "", mins || 0, e.icu_training_load || 0), src: "intervals", ext: `icu-${e.id ?? date + e.name}`, min: mins, km: km && km > 0 ? km : null, note: (e.name || "").slice(0, 80) || null, script: String(e.description || "").trim().slice(0, 6000) || null, load: e.icu_training_load ? r0_(e.icu_training_load) : null })); }
  const covered = new Set(Object.values(by).flat().map(w => w.sport));
  for (let ds = a; ds <= bEnd; ds = add(ds, 1)) {
    const cur = (day(ds, false) || {}).planned, xs = by[ds] || [];
    const futureDup = ds >= TODAY && Array.isArray(cur) && cur.some(w => !isIcuW(w) && !w.pushNew && (PLAN_SRC || covered.has(w.sport)));
    if (xs.length || futureDup || (Array.isArray(cur) && cur.some(isIcuW))) {
      let spNew = new Set([...xs.map(w => w.sport), ...(ds >= TODAY ? covered : [])]); if (PLAN_SRC && ds >= TODAY) spNew = new Set(["*"]);
      const base = Array.isArray(cur) ? cur.filter(w => !isIcuW(w) && (w.pushNew || (!spNew.has("*") && !spNew.has(w.sport)))) : [];
      const nxt = [...base, ...xs], value = nxt.length ? nxt : null;
      if (!same(value, cur)) { const dd = day(ds); if (value === null) delete dd.planned; else dd.planned = value; res.planned += xs.length; tidy(ds); } } }
  // completed activities
  // seconds in each zone (heart rate, pace, power) as intervals.icu computed them
  const zt = a => { if (!Array.isArray(a) || !a.length) return null; const v = a.map(z => Math.round(+(typeof z === "object" && z ? z.secs : z) || 0)); return v.some(Boolean) ? v : null; };
  const acts = await req(`/athlete/${AID}/activities?oldest=${add(TODAY, -21)}&newest=${TODAY}`) || [];
  const groups = {};
  for (const x of acts) { if (!x || typeof x !== "object") continue; const date = String(x.start_date_local || x.start_date || "").slice(0, 10); if (!date || date > TODAY) continue;
    const mins = r0_((x.moving_time || x.elapsed_time || 0) / 60), km = x.distance ? r1_(x.distance / 1000) : null, sp = sport(x.type || x.name);
    if (mins < 8 && !(km && km >= 1)) continue;
    const w = cleanO({ sport: sp, min: mins || null, km: km && km > .2 ? km : null, hr: x.average_heartrate ? r0_(x.average_heartrate) : null, kcal: x.calories ? r0_(x.calories) : null, rpe: x.perceived_exertion || x.icu_rpe || null, int: intensity(x.name || "", "", mins, x.icu_training_load || 0), ext: `icu-a-${x.id}`, src: "intervals", note: (x.name || "").slice(0, 80) || null, _xid: x.external_id || null, gearN: (x.gear && typeof x.gear === "object" ? x.gear.name : null) || null, hrz: zt(x.icu_hr_zone_times), pz: zt(x.pace_zone_times || x.gap_zone_times), wz: zt(x.icu_zone_times), load: x.icu_training_load ? r0_(x.icu_training_load) : null, pev: x.paired_event_id ? `icu-${x.paired_event_id}` : null, _start: String(x.start_date_local || "").slice(0, 19) || null, _src: x.source || null });
    (groups[date + "|" + sp] = groups[date + "|" + sp] || []).push(w); }
  for (const [key, ws] of Object.entries(groups)) {
    const [date, sp] = key.split("|"), dd = day(date); let lst = clone(dd.workouts || []); const before = JSON.stringify(lst);
    const known = new Set(lst.flatMap(o => [o.ext, ...(o.exts || []), ...(o.dups || [])]).filter(Boolean)); let neu = [];
    const wss = Object.fromEntries((dd.wsess || []).map(x => [x.id, x]));
    const fill = (o, w, keys = ["kcal", "hr", "load", "pev", "km"]) => { const m = { ...o }; for (const k of keys) if ((m[k] == null || m[k] === "") && w[k] != null) m[k] = w[k]; return cleanO(m); };
    const man = ws.filter(w => w._src === "MANUAL"), dev = ws.filter(w => w._src !== "MANUAL");
    for (const m of (dev.length ? man : [])) { const dv = dev[0]; ws.splice(ws.indexOf(m), 1);
      if (m.note) { dv.note = m.note; dv._ren = true; } if (m.pev && !dv.pev) dv.pev = m.pev; dv._dup = [...(dv._dup || []), m.ext];
      const k = lst.findIndex(o => o.ext === m.ext); if (k >= 0 && lst[k].sid) lst[k] = { ...lst[k], ext: null }; else if (k >= 0) lst.splice(k, 1); }
    for (const w of ws) {
      const xid = w._xid, st = w._start || ""; const ren = w._ren, dup = w._dup; delete w._xid; delete w._start; delete w._src; delete w._ren; delete w._dup;
      if (dup) w.dups = dup; if (ren) lst = lst.map(o => o.ext === w.ext ? { ...o, note: w.note } : o);
      if (known.has(w.ext) || lst.some(o => o.ext === w.ext)) { lst = lst.map(o => o.ext === w.ext ? fill(o, o.sid ? { ...w, wmin: w.min } : w, ["kcal", "hr", "load", "pev", "km", "dups", "wmin", "gearN", "hrz", "pz", "wz"]) : o); continue; }
      let k = xid ? lst.findIndex(o => o.sid === xid) : -1;
      if (k < 0) for (let n = 0; n < lst.length; n++) { const o = lst[n]; if (!o.sid || o.ext || o.sport !== sp) continue;
        try { const A = new Date(st).getTime(), B = new Date(String(wss[o.sid]?.start || "")).getTime(); if (isFinite(A) && isFinite(B) && Math.abs(A - B) > 3 * 3600e3) continue; } catch (e) {} k = n; break; }
      if (k >= 0) { lst[k] = fill({ ...lst[k], ext: w.ext }, { ...w, wmin: w.min }, ["kcal", "hr", "load", "pev", "km", "wmin", "gearN", "hrz", "pz", "wz"]); known.add(w.ext); continue; }
      neu.push(w); }
    const loc = lst.map((o, i) => [o, i]).filter(([o]) => o.sport === sp && !o.ext && !o.sid).map(([, i]) => i);
    if (neu.length && loc.length) {
      if (loc.length === 1 && neu.length === 1) { const o = lst[loc[0]], w = neu[0], m = { ...o, ext: w.ext }; for (const k of ["kcal", "hr", "km", "rpe", "min", "int", "load", "pev", "gearN", "hrz", "pz", "wz"]) if (!m[k] && w[k] != null) m[k] = w[k]; lst[loc[0]] = cleanO(m); neu = []; }
      else { const o = lst[loc[0]], m = { ...o, exts: [...new Set([...(o.exts || []), ...neu.map(w => w.ext)])].sort() }; if (!m.kcal) m.kcal = neu.reduce((s, w) => s + (w.kcal || 0), 0) || null; if (!m.load) m.load = neu.reduce((s, w) => s + (w.load || 0), 0) || null; lst[loc[0]] = cleanO(m); neu = []; } }
    lst = [...lst, ...neu];
    if (JSON.stringify(lst) !== before) { dd.workouts = lst; res.acts++; } tidy(date); }
  // wellness (fills empty days only)
  const WELL = await req(`/athlete/${AID}/wellness?oldest=${add(TODAY, -21)}&newest=${TODAY}`) || [];
  for (const x of WELL) { if (!x || typeof x !== "object") continue; const date = String(x.id || x.date || "").slice(0, 10); if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const cur = day(date, false) || {}, ch = {}, rhr = x.restingHR ?? x.resting_hr, sl = x.sleepSecs ?? x.sleep_secs;
    // weight is never taken from intervals.icu: the scale number you type is the one that counts
    const st = x.steps; if (st > 0 && cur.steps !== Math.round(st)) ch.steps = Math.round(st); if (rhr > 20 && !((cur.rhr || 0) > 0)) ch.rhr = r0_(rhr); if (sl > 600 && !((cur.sleep || 0) > 0)) ch.sleep = r1_(sl / 3600);
    for (const k of ["ctl", "atl"]) { const v = x[k]; if (typeof v === "number" && r1_(v) !== cur[k]) ch[k] = r1_(v); }
    if (x.hrv > 5 && !((cur.hrv || 0) > 0)) ch.hrv = r0_(x.hrv);
    const bf = x.bodyFat; if (bf >= 3 && bf <= 60 && !((cur.bf || 0) > 0)) ch.bf = r1_(bf);
    if (Object.keys(ch).length) { Object.assign(day(date), ch); res.well++; } }
  // Engine -> intervals.icu: check-ins intervals.icu doesn't have
  if (!NO_PUSH && icu.pushWell !== false) { const remote = Object.fromEntries(WELL.filter(x => x && typeof x === "object").map(x => [String(x.id).slice(0, 10), x]));
    for (let k = 0; k < 15; k++) { const date = add(TODAY, -k); if (date < SINCE_LINK) continue; const dd = day(date, false) || {}, rx = remote[date] || {}, body = {};
      if ((dd.weight || 0) > 0 && !dd.estW && !rx.weight) body.weight = dd.weight; if ((dd.rhr || 0) > 0 && !rx.restingHR) body.restingHR = dd.rhr; if ((dd.hrv || 0) > 0 && !rx.hrv) body.hrv = dd.hrv;
      if ((dd.sleep || 0) > 0 && !rx.sleepSecs) body.sleepSecs = Math.trunc(dd.sleep * 3600); if ((dd.bf || 0) > 0 && !rx.bodyFat) body.bodyFat = dd.bf;
      if (Object.keys(body).length) { try { await req(`/athlete/${AID}/wellness/${date}`, "PUT", { id: date, ...body }); res.sent_well++; } catch (e) { if (e.fatal) throw e; } } } }
  // push finished Engine workouts (last 14 days)
  const stext = s => { const byEx = {}; for (const x of s.sets || []) (byEx[x.ex] = byEx[x.ex] || []).push(x);
    const lines = (s.emom || []).map(e => `${e.title}: ${e.done}/${e.of} min`);
    for (const [k, ss] of Object.entries(byEx)) lines.push(`${k}: ` + ss.map(x => { let p = (x.reps || []).join("-"); if (x.hold) p += " " + x.hold.join("-") + "s"; if (x.load) p += ` +${x.load}kg`; if (x.final && x.rir != null) p += ` (RIR ${x.rir})`; return p.trim(); }).join(" · "));
    for (const a2 of s.amrap || []) lines.push(`${a2.title} AMRAP ${a2.min}': ${a2.rounds}+${a2.partial}`);
    return lines.join("\n") + `\nRPE ${s.rpe}` + (s.note ? `\n${s.note}` : "") + "\n— logged with Engine"; };
  if (!NO_PUSH && icu.push !== false) for (let k = 0; k < 14; k++) { const date = add(TODAY, -k), dd = day(date, false); if (!dd) continue;
    for (const w of dd.workouts || []) {
      if (w.rpeDirty && String(w.ext || "").startsWith("icu-a-")) { try { await req(`/activity/${String(w.ext).slice(6)}`, "PUT", cleanO({ perceived_exertion: w.rpe, icu_rpe: w.rpe })); delete w.rpeDirty; res.pushed++; } catch (e) { if (e.fatal) throw e; } continue; }
      if (w.pushed || w.exts || w.sport === "Rest") continue; if (!w.sid && date < SINCE_LINK) continue;
      const s = (dd.wsess || []).find(x => x.id === w.sid) || {};
      if (isIcuW(w)) { if (w.sid && String(w.ext).startsWith("icu-a-") && Object.keys(s).length) { try { await req(`/activity/${String(w.ext).slice(6)}`, "PUT", cleanO({ name: s.name || w.note, description: stext(s), perceived_exertion: w.rpe, icu_rpe: w.rpe })); w.pushed = true; res.pushed++; } catch (e) { if (e.fatal) throw e; } } continue; }
      const startT = s.start ? new Date(s.start).getTime() : NaN, ended = isFinite(startT) ? startT + (w.min || 0) * 60e3 : null;
      if (date >= TODAY && (ended == null || Date.now() - ended < 3 * 3600e3)) continue;
      const hhmm = isFinite(startT) ? new Date(startT).toTimeString().slice(0, 5) + ":00" : "18:00:00";
      try { const r = await req(`/athlete/${AID}/activities/manual`, "POST", { name: s.name || w.note || w.sport, type: itype(w.sport), start_date_local: `${date}T${hhmm}`, moving_time: Math.trunc((w.min || 0) * 60), description: Object.keys(s).length ? stext(s) : "", perceived_exertion: w.rpe, external_id: w.sid || `engine-${date}-${w.sport}-${w.min}` });
        w.pushed = true; if (r && r.id) w.ext = `icu-a-${r.id}`; res.pushed++; } catch (e) { if (e.fatal) throw e; } } }
  // races
  const T0 = S.train || {}; let races = clone(T0.races || []), racesDel = clone(T0.racesDel || []); const beforeR = JSON.stringify({ r: races, d: racesDel });
  const raceBody = r => { const b = { category: `RACE_${(r.pri || "A").slice(0, 1)}`, start_date_local: `${r.date}T00:00:00`, type: itype(r.sport), name: r.name || "Race", description: [r.goal ? "Goal " + r.goal : "", r.notes || ""].filter(Boolean).join("\n") }; if (r.km) b.distance = Math.trunc(+r.km * 1000); return b; };
  for (const ext of [...racesDel]) { try { await req(`/athlete/${AID}/events/${String(ext).slice(4)}`, "DELETE"); } catch (e) { if (e.fatal) throw e; if (e.status !== 404) continue; } racesDel = racesDel.filter(x => x !== ext); }
  for (const r of races) { try { if (r.pushNew && !r.ext) { const o = await req(`/athlete/${AID}/events`, "POST", raceBody(r)); if (o && o.id != null) r.ext = `icu-${o.id}`; delete r.pushNew; res.sent_plan++; } else if (r.dirty && r.ext) { await req(`/athlete/${AID}/events/${String(r.ext).slice(4)}`, "PUT", raceBody(r)); delete r.dirty; res.sent_plan++; } } catch (e) { if (e.fatal) throw e; } }
  const allev = await req(`/athlete/${AID}/events?oldest=${add(TODAY, -180)}&newest=${add(TODAY, 365)}`) || [];
  let rev = allev.filter(e => e && String(e.category || "").startsWith("RACE")); const rdates = new Set(rev.map(e => String(e.start_date_local || "").slice(0, 10)));
  rev = [...rev, ...allev.filter(e => e && e.category === "WORKOUT" && /^\s*(gara|race)\b|\b(competizione|competition)\b/i.test(String(e.name || "")) && !rdates.has(String(e.start_date_local || "").slice(0, 10)))];
  for (const e of rev) { const date = String(e.start_date_local || "").slice(0, 10); if (!date) continue; const ext = `icu-${e.id}`, name = String(e.name || "Race");
    let km = e.distance ? r1_(e.distance / 1000) : null; if (!km) { const m = name.match(/(\d+(?:[.,]\d+)?)\s*km\b/i); km = m ? +m[1].replace(",", ".") : /half|mezza/i.test(name) ? 21.0975 : /marathon|maratona/i.test(name) ? 42.195 : null; }
    const g = (name + " " + (e.description || "")).match(/sub[- ]?(\d{1,2})(?::(\d{2}))?/i), goal = g ? `${g[1]}:${g[2] || "00"}` : null;
    const pri = String(e.category || "").startsWith("RACE") ? String(e.category).slice(5, 6) : "A";
    const remote = { name, date, sport: sport(e.type || name), km, pri: pri || "A", ext };
    let cur = races.find(r => r.ext === ext); if (!cur) { cur = races.find(r => !r.ext && r.date === date); if (cur) { cur.ext = ext; delete cur.pushNew; } }
    if (!cur) { races.push(cleanO({ id: `rc-${ext}`, ...remote, goal, notes: String(e.description || "").slice(0, 500) || null })); res.races++; }
    else if (!cur.dirty) { for (const [k, v] of Object.entries(remote)) if (v != null && cur[k] !== v) cur[k] = v; if (goal && !cur.goal) cur.goal = goal; } }
  const ids = new Set(rev.map(e => `icu-${e.id}`));
  races = races.filter(r => !(r.ext && !ids.has(r.ext) && (r.date || "") >= TODAY && !r.dirty));
  // apply: only the days and fields the sync changed
  let patches = 0;
  for (const mk of Object.keys(docs)) { const o = orig[mk] || {}, n = docs[mk].days;
    for (const d of new Set([...Object.keys(o), ...Object.keys(n)])) { const od = o[d] || {}, nd = n[d] || {}; const ch = [];
      for (const k of new Set([...Object.keys(od), ...Object.keys(nd)])) if (JSON.stringify(od[k] ?? null) !== JSON.stringify(nd[k] ?? null)) ch.push([k, nd[k] ?? null]);
      if (ch.length) { patches++; mutateLog(d, day => { for (const [k, v] of ch) { if (v === null) delete day[k]; else day[k] = v; } }); } } }
  if (JSON.stringify({ r: races, d: racesDel }) !== beforeR) { S.train = { ...S.train, races, racesDel }; put("train", "", S.train); }
  const sent = res.sent_plan + res.sent_well + res.pushed;
  const text = `${res.planned} planned · ${res.acts} activities · ${res.well} wellness days` + (sent ? ` · sent ${res.pushed} workouts, ${res.sent_plan} plan changes, ${res.sent_well} wellness days` : "");
  const ni = { ...(S.settings.intervals || {}), bridge: { last: new Date().toISOString(), since: SINCE_LINK, athlete, sent, res: text } };
  if (athlete) ni.athlete = athlete; for (const k of ["blocked", "err", "ok", "connectedAt", "auto", "last"]) delete ni[k];
  S.settings.intervals = ni; saveSettings();
  return { ...res, athlete, patches, text };
}
