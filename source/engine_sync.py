#!/usr/bin/env python3
"""engine_sync.py: Engine <-> intervals.icu, both ways, on your own computer. No Claude needed.

  1. In Engine: intervals.icu card -> Sync without Claude -> Export  (saves engine-export.json, no API key inside)
  2. Run:       python3 engine_sync.py engine-export.json
                (first time it asks for your intervals.icu API key: Settings -> Developer settings on intervals.icu;
                 it can remember it in ~/.engine_icu_key, readable only by you. Or pass --key / set ICU_API_KEY.)
  3. In Engine: Sync without Claude -> choose the engine-import-....json file it wrote.

Only talks to https://intervals.icu/api/v1. Python 3.8+, standard library only.
The merge rules are the same as Engine's Claude sync (bridge v2, embedded below)."""
import argparse, datetime as dt, getpass, glob, json, os, subprocess, sys, tempfile

BRIDGE = r'''#!/usr/bin/env python3
"""Engine <-> intervals.icu bridge (stdlib only). v2: body fat both ways.
usage: bridge.py --settings settings.json --logm DIR --out DIR [--today YYYY-MM-DD] [--mock mock.json]
Reads the app's settings (API key, sports) and month log docs, pulls planned workouts, activities and
wellness from intervals.icu, merges them like the app does, pushes finished Engine workouts, and writes
every changed month doc to OUT/<YYYY-MM>.json plus OUT/_settings.json (the new `intervals` field).
Prints a JSON summary on the last line."""
import argparse, base64, datetime as dt, json, os, re, sys, urllib.request, urllib.error

ICU = "https://intervals.icu/api/v1"
ap = argparse.ArgumentParser()
ap.add_argument("--settings", required=True); ap.add_argument("--logm", required=True); ap.add_argument("--out", required=True)
ap.add_argument("--today"); ap.add_argument("--since"); ap.add_argument("--train"); ap.add_argument("--mock"); ap.add_argument("--no-push", action="store_true")
A = ap.parse_args()
os.makedirs(A.out, exist_ok=True)
S = json.load(open(A.settings)); S = S.get("data", S)
icu = S.get("intervals") or {}; KEY = (icu.get("key") or "").strip(); AID = (icu.get("aid") or "").strip() or "0"
FIT = S.get("fit") or {}; SPORTS = [s.get("name") for s in FIT.get("sports", [])] or ["Calisthenics", "Running", "Cycling", "Walking", "Other"]
RUN = (FIT.get("run") or {}).get("sport") or FIT.get("runSport") or next((s for s in SPORTS if re.search("run", s, re.I)), "Running")
TODAY = dt.date.fromisoformat(A.today) if A.today else dt.date.today()
SINCE = dt.date.fromisoformat(A.since) if A.since else None
iso = lambda d: d.isoformat()
add = lambda d, n: d + dt.timedelta(days=n)
MOCK = json.load(open(A.mock)) if A.mock else None

def req(path, method="GET", body=None):
    if MOCK is not None:
        if path.endswith(f"/athlete/{AID}"): return MOCK.get("athlete", {})
        for k, v in MOCK.items():
            if k != "athlete" and k in path and (method == "GET") == (not k.startswith("POST")): return v
        if method == "POST": return {"id": "mock"}
        return []
    if not KEY: raise SystemExit(json.dumps({"ok": False, "error": "no API key in Engine settings"}))
    r = urllib.request.Request(ICU + path, method=method, data=json.dumps(body).encode() if body is not None else None)
    r.add_header("Authorization", "Basic " + base64.b64encode(f"API_KEY:{KEY}".encode()).decode())
    r.add_header("Accept", "application/json"); r.add_header("User-Agent", "Mozilla/5.0 (Engine bridge)")
    if body is not None: r.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(r, timeout=30) as f: return json.loads(f.read().decode() or "null")
    except urllib.error.HTTPError as e:
        if e.code in (401, 403): raise SystemExit(json.dumps({"ok": False, "error": f"intervals.icu refused the key ({e.code})"}))
        raise

def r0(x): return int(round(x))
def r1(x): return round(x * 10) / 10
def find(rx): return next((n for n in SPORTS if re.search(rx, n, re.I)), None)
def sport(t):
    s = str(t or "").lower()
    if "run" in s: return RUN
    if re.search("ride|bike|cycl|spin", s): return find("cycl|bike|ride") or "Cycling"
    if "swim" in s: return find("swim") or "Swimming"
    if re.search("walk|hike", s): return find("walk|hik") or "Walking"
    if re.search("weight|strength|gym|calis|crossfit|hiit", s): return find("calis|strength|gym") or "Strength"
    if "row" in s: return find("row") or "Rowing"
    if re.search("football|soccer", s): return find("football|soccer") or "Football"
    return find("^other$") or (SPORTS[0] if SPORTS else "Other")
def intensity(name, desc, mins, load):
    t = f"{name} {desc}".lower()
    if load and mins:
        ph = load / (mins / 60)
        if ph >= 78: return "Hard"
        if ph <= 50: return "Light"
    if re.search(r"vo2|interval|threshold|z4|z5|tempo run|race|hard|sweet ?spot|anaerob|max", t): return "Hard"
    if re.search(r"recovery|easy|z1|z2|endurance|base|aerobic|long run|lsd|mobility", t): return "Light"
    return "Moderate"
def step_totals(desc):
    rep, mins, km, has_t = 1, 0.0, 0.0, False
    for raw in str(desc or "").splitlines():
        l = raw.strip()
        if not l: rep = 1; continue
        m = re.match(r"^(\d+)\s*x\b", l, re.I)
        if m and not l.startswith("-"): rep = int(m.group(1)); continue
        if not l.startswith("-"): continue
        d = re.match(r"^-\s*(\d+(?:\.\d+)?)\s*km", l, re.I)
        t = re.match(r"^-\s*(?:(\d+(?:\.\d+)?)h)?\s*(?:(\d+)m(?![a-z]))?\s*(?:(\d+)s)?", l, re.I)
        if d: km += rep * float(d.group(1))
        elif t and any(t.groups()): has_t = True; mins += rep * ((float(t.group(1) or 0)) * 60 + int(t.group(2) or 0) + int(t.group(3) or 0) / 60)
    return r0(mins), (r1(km) if not has_t else 0), has_t
def clean(o): return {k: v for k, v in o.items() if v not in (None, "", [])}

# ---- load month docs
docs, orig = {}, {}
for fn in os.listdir(A.logm):
    if fn.endswith(".json"):
        d = json.load(open(os.path.join(A.logm, fn))); d = d.get("data", d) if "days" not in d else d
        mk = fn[:-5]; docs[mk] = {"month": d.get("month", mk), "days": d.get("days", {}) or {}}; orig[mk] = json.dumps(docs[mk], sort_keys=True)
def day(date, create=True):
    mk = date[:7]
    if mk not in docs:
        if not create: return None
        docs[mk] = {"month": mk, "days": {}}; orig[mk] = None
    return docs[mk]["days"].setdefault(date, {}) if create else docs[mk]["days"].get(date)
def tidy(date):
    mk = date[:7]; d = docs.get(mk, {}).get("days", {}).get(date)
    if d is not None:
        for k in list(d):
            if d[k] in (None, "") or (isinstance(d[k], list) and not d[k] and k != "planned"): del d[k]
        if not d: del docs[mk]["days"][date]

is_icu = lambda w: str(w.get("ext", "")).startswith("icu-")
res = {"planned": 0, "acts": 0, "well": 0, "pushed": 0, "sent_plan": 0, "sent_well": 0}
PLAN_SRC = icu.get("planSource") is not False
SINCE_LINK = (icu.get("bridge") or {}).get("since") or iso(TODAY)
def itype(sp):
    s = sp or ""
    if re.search("calis|strength|gym|weight|crossfit|hiit", s, re.I): return "WeightTraining"
    if re.search("run", s, re.I): return "Run"
    if re.search("cycl|bike|ride", s, re.I): return "Ride"
    if re.search("walk", s, re.I): return "Walk"
    if re.search("swim", s, re.I): return "Swim"
    if re.search("hike", s, re.I): return "Hike"
    return "Workout"

# ---- athlete
ath = req(f"/athlete/{AID}") or {}
athlete = ath.get("name") or " ".join(x for x in [ath.get("firstname"), ath.get("lastname")] if x) or icu.get("athlete") or ""

# ---- Engine → intervals.icu: planned workouts you added, edited or deleted in Engine
def ev_body(date, w):
    desc = w.get("script") or ((f"- {int(w['min'])}m" + (f" {w['km']}km" if w.get("km") else "")) if w.get("min") else "")
    b = {"category": "WORKOUT", "start_date_local": f"{date}T00:00:00", "type": itype(w.get("sport")), "name": w.get("note") or w.get("sport") or "Workout", "description": desc}
    if w.get("min"): b["moving_time"] = int(w["min"] * 60)
    return b
for mk in list(docs):
    for date, dd in list(docs[mk]["days"].items()):
        if date < iso(add(TODAY, -2)): continue
        for ext in list(dd.get("plannedDel") or []):
            eid = str(ext)[4:]
            try: req(f"/athlete/{AID}/events/{eid}", "DELETE"); res["sent_plan"] += 1
            except urllib.error.HTTPError as e:
                if e.code != 404: continue
            dd["plannedDel"] = [x for x in dd.get("plannedDel") or [] if x != ext]
        if not dd.get("plannedDel"): dd.pop("plannedDel", None)
        for w in dd.get("planned") or []:
            try:
                if w.get("pushNew") and not w.get("ext"):
                    r = req(f"/athlete/{AID}/events", "POST", ev_body(date, w))
                    if isinstance(r, dict) and r.get("id") is not None: w["ext"] = f"icu-{r['id']}"; w["src"] = "intervals"
                    w.pop("pushNew", None); res["sent_plan"] += 1
                elif w.get("dirty") and is_icu(w):
                    req(f"/athlete/{AID}/events/{str(w['ext'])[4:]}", "PUT", ev_body(date, w)); w.pop("dirty", None); res["sent_plan"] += 1
            except urllib.error.HTTPError: pass

# ---- planned workouts
a, b = (SINCE or add(TODAY, -7)), add(TODAY, 42)
ev = req(f"/athlete/{AID}/events?oldest={iso(a)}&newest={iso(b)}&category=WORKOUT") or []
by = {}
for e in ev:
    if not isinstance(e, dict) or (e.get("category") and e["category"] != "WORKOUT"): continue
    date = str(e.get("start_date_local") or e.get("start_date") or "")[:10]
    if not date: continue
    sm, sk, has_t = step_totals(e.get("description"))
    mins = r0((e.get("moving_time") or (e.get("workout_doc") or {}).get("duration") or 0) / 60) or sm or None
    km = None if has_t else (r1(((e.get("distance") or (e.get("workout_doc") or {}).get("distance") or 0)) / 1000) or sk or None)
    w = clean({"sport": sport(e.get("type") or e.get("name")), "int": intensity(e.get("name") or "", e.get("description") or "", mins or 0, e.get("icu_training_load") or 0),
               "src": "intervals", "ext": f"icu-{e.get('id', date + str(e.get('name')))}", "min": mins, "km": km if km and km > 0 else None,
               "note": (e.get("name") or "")[:80] or None, "script": (str(e.get("description") or "").strip()[:6000]) or None, "load": r0(e["icu_training_load"]) if e.get("icu_training_load") else None})
    by.setdefault(date, []).append(w)
covered = {w["sport"] for xs in by.values() for w in xs}
d = a
while d <= b:
    ds = iso(d); cur = (day(ds, False) or {}).get("planned")
    xs = by.get(ds, [])
    future_dup = ds >= iso(TODAY) and isinstance(cur, list) and any(not is_icu(w) and not w.get("pushNew") and (PLAN_SRC or w.get("sport") in covered) for w in cur)
    if xs or future_dup or (isinstance(cur, list) and any(is_icu(w) for w in cur)):
        sp_new = {w["sport"] for w in xs} | (covered if ds >= iso(TODAY) else set())
        if PLAN_SRC and ds >= iso(TODAY): sp_new = {"*"}
        base = [w for w in (cur or []) if not is_icu(w) and (w.get("pushNew") or ("*" not in sp_new and w.get("sport") not in sp_new))] if isinstance(cur, list) else []
        nxt = base + xs
        value = nxt if nxt else None
        if json.dumps(value, sort_keys=True) != json.dumps(cur, sort_keys=True):
            dd = day(ds)
            if value is None: dd.pop("planned", None)
            else: dd["planned"] = value
            res["planned"] += len(xs); tidy(ds)
    d = add(d, 1)

# ---- completed activities (grouped per day and sport so daily totals you logged aren't doubled)
acts = req(f"/athlete/{AID}/activities?oldest={iso(SINCE or add(TODAY, -21))}&newest={iso(TODAY)}") or []
groups = {}
for x in acts:
    if not isinstance(x, dict): continue
    date = str(x.get("start_date_local") or x.get("start_date") or "")[:10]
    if not date or date > iso(TODAY): continue
    mins = r0((x.get("moving_time") or x.get("elapsed_time") or 0) / 60); km = r1(x["distance"] / 1000) if x.get("distance") else None; sp = sport(x.get("type") or x.get("name"))
    if mins < 8 and not (km and km >= 1): continue  # accidental recordings
    w = clean({"sport": sp, "min": mins or None, "km": km if km and km > 0.2 else None, "hr": r0(x["average_heartrate"]) if x.get("average_heartrate") else None,
               "kcal": r0(x["calories"]) if x.get("calories") else None, "rpe": x.get("perceived_exertion") or x.get("icu_rpe"),
               "int": intensity(x.get("name") or "", "", mins, x.get("icu_training_load") or 0), "ext": f"icu-a-{x.get('id')}", "src": "intervals", "note": (x.get("name") or "")[:80] or None, "_xid": x.get("external_id"),
               "load": r0(x["icu_training_load"]) if x.get("icu_training_load") else None, "pev": f"icu-{x['paired_event_id']}" if x.get("paired_event_id") else None, "_start": str(x.get("start_date_local") or "")[:19], "_src": x.get("source")})
    groups.setdefault((date, sp), []).append(w)
for (date, sp), ws in groups.items():
    dd = day(date); lst = list(dd.get("workouts") or []); before = json.dumps(lst, sort_keys=True)
    known = {e for o in lst for e in ([o.get("ext")] + (o.get("exts") or []) + (o.get("dups") or [])) if e}
    new = []
    wss = {x.get("id"): x for x in dd.get("wsess") or []}
    def fill(o, w, keys=("kcal", "hr", "load", "pev", "km")):
        m = dict(o)
        for k in keys:
            if m.get(k) in (None, "") and w.get(k) is not None: m[k] = w[k]
        return clean(m)
    # a session marked done by hand in intervals.icu and also recorded by the watch is one workout:
    # the watch gives the numbers, the manual entry its name and planned workout
    man = [w for w in ws if w.get("_src") == "MANUAL"]; dev = [w for w in ws if w.get("_src") != "MANUAL"]
    for m in (man if dev else []):
        dv = dev[0]; ws.remove(m)
        if m.get("note"): dv["note"] = m["note"]; dv["_ren"] = True
        if m.get("pev") and not dv.get("pev"): dv["pev"] = m["pev"]
        dv["_dup"] = (dv.get("_dup") or []) + [m["ext"]]
        k = next((n for n, o in enumerate(lst) if o.get("ext") == m["ext"]), -1)
        if k >= 0 and lst[k].get("sid"): lst[k] = {**lst[k], "ext": None}  # your Engine session takes the watch activity below
        elif k >= 0: lst.pop(k)
    for w in ws:
        xid = w.pop("_xid", None); st = w.pop("_start", ""); w.pop("_src", None); ren = w.pop("_ren", False); dup = w.pop("_dup", None)
        if dup: w["dups"] = dup
        if ren:
            lst = [{**o, "note": w["note"]} if o.get("ext") == w["ext"] else o for o in lst]
        if w["ext"] in known or any(o.get("ext") == w["ext"] for o in lst):  # already here: add what older syncs didn't store (load, paired event)
            lst = [fill(o, w, ("kcal", "hr", "load", "pev", "km", "dups")) if o.get("ext") == w["ext"] else o for o in lst]; continue
        k = next((n for n, o in enumerate(lst) if xid and o.get("sid") == xid), -1)
        if k < 0:  # a session you ran live in Engine and recorded on the watch: one workout, not two
            for n, o in enumerate(lst):
                if not o.get("sid") or o.get("ext") or o.get("sport") != sp: continue
                try:
                    a = dt.datetime.fromisoformat(st); b = dt.datetime.fromisoformat(str((wss.get(o["sid"]) or {}).get("start", "")).replace("Z", "+00:00")).astimezone().replace(tzinfo=None)
                    if abs((a - b).total_seconds()) > 3 * 3600: continue
                except Exception: pass
                k = n; break
        if k >= 0: lst[k] = fill({**lst[k], "ext": w["ext"]}, w); known.add(w["ext"]); continue
        new.append(w)
    loc = [n for n, o in enumerate(lst) if o.get("sport") == sp and not o.get("ext") and not o.get("sid")]
    if new and loc:
        tot_new = sum(w.get("min") or 0 for w in new); tot_loc = sum(lst[n].get("min") or 0 for n in loc)
        if len(loc) == 1 and len(new) == 1:
            o = lst[loc[0]]; w = new[0]; m = dict(o); m["ext"] = w["ext"]
            for k in ("kcal", "hr", "km", "rpe", "min", "int", "load", "pev"):
                if not m.get(k) and w.get(k) is not None: m[k] = w[k]
            lst[loc[0]] = clean(m); new = []
        else:  # your own entry for that sport and day wins: attach the activities to it
            o = lst[loc[0]]; m = dict(o); m["exts"] = sorted(set((o.get("exts") or []) + [w["ext"] for w in new]))
            if not m.get("kcal"): m["kcal"] = sum(w.get("kcal") or 0 for w in new) or None
            if not m.get("load"): m["load"] = sum(w.get("load") or 0 for w in new) or None
            lst[loc[0]] = clean(m); new = []
    lst += new
    if json.dumps(lst, sort_keys=True) != before: dd["workouts"] = lst; res["acts"] += 1
    tidy(date)

# ---- wellness (fills empty days only)
WELL = req(f"/athlete/{AID}/wellness?oldest={iso(SINCE or add(TODAY, -21))}&newest={iso(TODAY)}") or []
for x in WELL:
    if not isinstance(x, dict): continue
    date = str(x.get("id") or x.get("date") or "")[:10]
    if not re.match(r"^\d{4}-\d{2}-\d{2}$", date): continue
    cur = day(date, False) or {}; ch = {}
    wt, rhr, sl = x.get("weight"), x.get("restingHR", x.get("resting_hr")), x.get("sleepSecs", x.get("sleep_secs"))
    if wt and wt > 20 and not (cur.get("weight") or 0) > 0: ch["weight"] = r1(wt)
    if rhr and rhr > 20 and not (cur.get("rhr") or 0) > 0: ch["rhr"] = r0(rhr)
    if sl and sl > 600 and not (cur.get("sleep") or 0) > 0: ch["sleep"] = r1(sl / 3600)
    for k in ("ctl", "atl"):
        v = x.get(k)
        if isinstance(v, (int, float)) and r1(v) != cur.get(k): ch[k] = r1(v)
    hv = x.get("hrv")
    if hv and hv > 5 and not (cur.get("hrv") or 0) > 0: ch["hrv"] = r0(hv)
    bfv = x.get("bodyFat")
    if bfv and 3 <= bfv <= 60 and not (cur.get("bf") or 0) > 0: ch["bf"] = r1(bfv)
    if ch: day(date).update(ch); res["well"] += 1

# ---- Engine → intervals.icu: wellness you logged in Engine that intervals.icu doesn't have
if not A.no_push and icu.get("pushWell") is not False:
    remote = {str(x.get("id"))[:10]: x for x in (WELL or []) if isinstance(x, dict)}
    for k in range(0, 15):
        date = iso(add(TODAY, -k))
        if date < SINCE_LINK: continue
        dd = day(date, False) or {}; rx = remote.get(date, {}); body = {}
        if (dd.get("weight") or 0) > 0 and not dd.get("estW") and not rx.get("weight"): body["weight"] = dd["weight"]
        if (dd.get("rhr") or 0) > 0 and not rx.get("restingHR"): body["restingHR"] = dd["rhr"]
        if (dd.get("hrv") or 0) > 0 and not rx.get("hrv"): body["hrv"] = dd["hrv"]
        if (dd.get("sleep") or 0) > 0 and not rx.get("sleepSecs"): body["sleepSecs"] = int(dd["sleep"] * 3600)
        if (dd.get("bf") or 0) > 0 and not rx.get("bodyFat"): body["bodyFat"] = dd["bf"]
        if body:
            try: req(f"/athlete/{AID}/wellness/{date}", "PUT", {"id": date, **body}); res["sent_well"] += 1
            except urllib.error.HTTPError: pass

# ---- push finished Engine workouts (last 14 days) that intervals.icu doesn't have yet
def stext(s):
    by = {}
    for x in s.get("sets") or []: by.setdefault(x.get("ex"), []).append(x)
    lines = [f"{e.get('title')}: {e.get('done')}/{e.get('of')} min" for e in s.get("emom") or []]
    for k, ss in by.items():
        parts = []
        for x in ss:
            p = "-".join(str(v) for v in x.get("reps") or [])
            if x.get("hold"): p += " " + "-".join(str(v) for v in x["hold"]) + "s"
            if x.get("load"): p += f" +{x['load']}kg"
            if x.get("final") and x.get("rir") is not None: p += f" (RIR {x['rir']})"
            parts.append(p.strip())
        lines.append(f"{k}: " + " · ".join(parts))
    lines += [f"{a.get('title')} AMRAP {a.get('min')}': {a.get('rounds')}+{a.get('partial')}" for a in s.get("amrap") or []]
    return "\n".join(lines) + f"\nRPE {s.get('rpe')}" + (f"\n{s['note']}" if s.get("note") else "") + "\n— logged with Engine"
if not A.no_push and (icu.get("push") is not False):
    for k in range(0, 14):
        date = iso(add(TODAY, -k)); dd = day(date, False)
        if not dd: continue
        for w in dd.get("workouts") or []:
            if w.get("pushed") or w.get("exts") or w.get("sport") == "Rest": continue
            if not w.get("sid") and date < SINCE_LINK: continue
            s = next((x for x in dd.get("wsess") or [] if x.get("id") == w.get("sid")), {})
            if is_icu(w):
                if w.get("sid") and str(w["ext"]).startswith("icu-a-") and s:
                    try:
                        req(f"/activity/{str(w['ext'])[6:]}", "PUT", clean({"name": s.get("name") or w.get("note"), "description": stext(s), "perceived_exertion": w.get("rpe"), "icu_rpe": w.get("rpe")}))
                        w["pushed"] = True; res["pushed"] += 1
                    except urllib.error.HTTPError: pass
                continue
            try: ended = dt.datetime.fromisoformat(str(s.get("start", "")).replace("Z", "+00:00")) + dt.timedelta(minutes=(w.get("min") or 0))
            except Exception: ended = None
            if date >= iso(TODAY) and (ended is None or dt.datetime.now(dt.timezone.utc) - ended < dt.timedelta(hours=3)): continue  # give the watch time to upload first
            try: hhmm = dt.datetime.fromisoformat(str(s.get("start", "")).replace("Z", "+00:00")).astimezone().strftime("%H:%M:00")
            except Exception: hhmm = "18:00:00"
            r = req(f"/athlete/{AID}/activities/manual", "POST", {"name": s.get("name") or w.get("note") or w.get("sport"), "type": itype(w.get("sport")), "start_date_local": f"{date}T{hhmm}",
                    "moving_time": int((w.get("min") or 0) * 60), "description": stext(s) if s else "", "perceived_exertion": w.get("rpe"), "external_id": w.get("sid") or f"engine-{date}-{w.get('sport')}-{w.get('min')}"})
            w["pushed"] = True
            if isinstance(r, dict) and r.get("id"): w["ext"] = f"icu-a-{r['id']}"
            res["pushed"] += 1

# ---- races: intervals.icu RACE_A/B/C events (and workouts called "gara"/"race") <-> Engine races
TRAIN = None
if A.train and os.path.exists(A.train):
    TRAIN = json.load(open(A.train)); TRAIN = TRAIN.get("data", TRAIN) if "races" not in TRAIN and "data" in TRAIN else TRAIN
    races = [dict(r) for r in (TRAIN.get("races") or [])]; before_r = json.dumps({"r": races, "d": TRAIN.get("racesDel") or []}, sort_keys=True)
    res["races"] = 0
    def race_body(r):
        b = {"category": f"RACE_{(r.get('pri') or 'A')[:1]}", "start_date_local": f"{r['date']}T00:00:00", "type": itype(r.get("sport")), "name": r.get("name") or "Race",
             "description": "\n".join(x for x in [("Goal " + r["goal"]) if r.get("goal") else "", r.get("notes") or ""] if x)}
        if r.get("km"): b["distance"] = int(float(r["km"]) * 1000)
        return b
    if not A.no_push:
        for ext in list(TRAIN.get("racesDel") or []):
            try: req(f"/athlete/{AID}/events/{str(ext)[4:]}", "DELETE")
            except urllib.error.HTTPError as e:
                if e.code != 404: continue
            TRAIN["racesDel"] = [x for x in TRAIN.get("racesDel") or [] if x != ext]
        for r in races:
            try:
                if r.get("pushNew") and not r.get("ext"):
                    o = req(f"/athlete/{AID}/events", "POST", race_body(r))
                    if isinstance(o, dict) and o.get("id") is not None: r["ext"] = f"icu-{o['id']}"
                    r.pop("pushNew", None); res["sent_plan"] += 1
                elif r.get("dirty") and r.get("ext"):
                    req(f"/athlete/{AID}/events/{str(r['ext'])[4:]}", "PUT", race_body(r)); r.pop("dirty", None); res["sent_plan"] += 1
            except urllib.error.HTTPError: pass
    allev = req(f"/athlete/{AID}/events?oldest={iso(add(TODAY, -180))}&newest={iso(add(TODAY, 365))}") or []
    rev = [e for e in allev if isinstance(e, dict) and str(e.get("category", "")).startswith("RACE")]
    rdates = {str(e.get("start_date_local", ""))[:10] for e in rev}
    rev += [e for e in allev if isinstance(e, dict) and e.get("category") == "WORKOUT" and re.search(r"^\s*(gara|race)\b|\b(competizione|competition)\b", str(e.get("name", "")), re.I) and str(e.get("start_date_local", ""))[:10] not in rdates]
    for e in rev:
        date = str(e.get("start_date_local") or "")[:10]
        if not date: continue
        ext = f"icu-{e.get('id')}"; name = str(e.get("name") or "Race")
        km = r1(e["distance"] / 1000) if e.get("distance") else None
        if not km:
            m = re.search(r"(\d+(?:[.,]\d+)?)\s*km\b", name, re.I); km = float(m.group(1).replace(",", ".")) if m else (21.0975 if re.search(r"half|mezza", name, re.I) else 42.195 if re.search(r"marathon|maratona", name, re.I) else None)
        g = re.search(r"sub[- ]?(\d{1,2})(?::(\d{2}))?", name + " " + str(e.get("description") or ""), re.I)
        goal = f"{g.group(1)}:{g.group(2) or '00'}" if g else None
        pri = str(e.get("category", "RACE_A"))[5:6] if str(e.get("category", "")).startswith("RACE") else "A"
        remote = {"name": name, "date": date, "sport": sport(e.get("type") or name), "km": km, "pri": pri or "A", "ext": ext}
        cur = next((r for r in races if r.get("ext") == ext), None)
        if cur is None:
            cur = next((r for r in races if not r.get("ext") and r.get("date") == date), None)
            if cur is not None: cur["ext"] = ext; cur.pop("pushNew", None)
        if cur is None:
            races.append(clean({"id": f"rc-{ext}", **remote, "goal": goal, "notes": (str(e.get("description") or "")[:500]) or None})); res["races"] += 1
        elif not cur.get("dirty"):
            for k, v in remote.items():
                if v is not None and cur.get(k) != v: cur[k] = v
            if goal and not cur.get("goal"): cur["goal"] = goal
    ids = {f"icu-{e.get('id')}" for e in rev}
    races = [r for r in races if not (r.get("ext") and r["ext"] not in ids and r.get("date", "") >= iso(TODAY) and not r.get("dirty"))]
    after = {"races": races, "racesDel": TRAIN.get("racesDel") or []}
    if json.dumps({"r": races, "d": after["racesDel"]}, sort_keys=True) != before_r:
        json.dump(after, open(os.path.join(A.out, "_train.json"), "w"), ensure_ascii=False)

# ---- write changed docs
changed = []
for mk, doc in docs.items():
    if json.dumps(doc, sort_keys=True) != orig.get(mk):
        json.dump(doc, open(os.path.join(A.out, f"{mk}.json"), "w"), ensure_ascii=False); changed.append((mk, orig.get(mk) is None))
now = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
newicu = dict(icu); newicu["bridge"] = {"last": now, "since": SINCE_LINK, "athlete": athlete, "sent": res["sent_plan"] + res["sent_well"] + res["pushed"], "res": f"{res['planned']} planned · {res['acts']} activities · {res['well']} wellness days" + (f" · sent {res['pushed']} workouts, {res['sent_plan']} plan changes, {res['sent_well']} wellness days" if res["pushed"] or res["sent_plan"] or res["sent_well"] else "")}
if athlete: newicu["athlete"] = athlete
for k in ("blocked", "err", "ok", "connectedAt", "auto", "last"): newicu.pop(k, None)
json.dump({"intervals": newicu}, open(os.path.join(A.out, "_settings.json"), "w"), ensure_ascii=False)
print(json.dumps({"ok": True, "athlete": athlete, **res, "changed": [m for m, _ in changed], "new_docs": [m for m, n in changed if n], "train_changed": os.path.exists(os.path.join(A.out, "_train.json"))}))
'''

def find_export(p):
    if p: return p
    cands = []
    for d in [os.getcwd(), os.path.expanduser("~/Downloads")]:
        cands += glob.glob(os.path.join(d, "engine-export*.json"))
    if not cands: sys.exit("No engine-export.json found. Export it from Engine first, or pass its path.")
    return max(cands, key=os.path.getmtime)

def get_key(a):
    if a.key: return a.key.strip()
    if os.environ.get("ICU_API_KEY"): return os.environ["ICU_API_KEY"].strip()
    f = os.path.expanduser("~/.engine_icu_key")
    if os.path.exists(f): return open(f).read().strip()
    k = getpass.getpass("intervals.icu API key (hidden): ").strip()
    if not k: sys.exit("No key, nothing to do.")
    if input("Remember it on this computer (~/.engine_icu_key)? [y/N] ").strip().lower().startswith("y"):
        with open(f, "w") as fh: fh.write(k)
        os.chmod(f, 0o600)
    return k

def main():
    ap = argparse.ArgumentParser(description="Engine <-> intervals.icu sync without Claude")
    ap.add_argument("export", nargs="?", help="engine-export.json from Engine (default: newest in this folder or ~/Downloads)")
    ap.add_argument("--key", help="intervals.icu API key (else ICU_API_KEY, ~/.engine_icu_key, or a prompt)")
    ap.add_argument("--out", help="where to write the result (default: next to the export)")
    ap.add_argument("--no-push", action="store_true", help="only download, send nothing to intervals.icu")
    ap.add_argument("--mock", help=argparse.SUPPRESS)
    a = ap.parse_args()
    src = find_export(a.export); B = json.load(open(src, encoding="utf-8"))
    if B.get("kind") != "engine-export": sys.exit(f"{src} isn't an Engine export.")
    key = get_key(a)
    with tempfile.TemporaryDirectory() as d:
        st = {"intervals": {**(B["settings"].get("intervals") or {}), "key": key}, "fit": B["settings"].get("fit") or {}}
        json.dump(st, open(os.path.join(d, "settings.json"), "w"))
        json.dump(B.get("train") or {}, open(os.path.join(d, "train.json"), "w"))
        os.makedirs(os.path.join(d, "logm"))
        for mk, doc in (B.get("logm") or {}).items(): json.dump(doc, open(os.path.join(d, "logm", mk + ".json"), "w"))
        open(os.path.join(d, "bridge.py"), "w").write(BRIDGE)
        cmd = [sys.executable, os.path.join(d, "bridge.py"), "--settings", os.path.join(d, "settings.json"), "--train", os.path.join(d, "train.json"), "--logm", os.path.join(d, "logm"), "--out", os.path.join(d, "out")]
        if a.no_push: cmd.append("--no-push")
        if a.mock: cmd += ["--mock", os.path.abspath(a.mock)]
        p = subprocess.run(cmd, capture_output=True, text=True)
        last = (p.stdout.strip().splitlines() or [""])[-1]
        try: summ = json.loads(last)
        except Exception: sys.exit("Sync failed:\n" + (p.stderr.strip()[-1500:] or p.stdout.strip()[-1500:]).replace(key, "***"))
        if not summ.get("ok"): sys.exit("Sync failed: " + str(summ.get("error", "unknown error")).replace(key, "***"))
        patches = []
        for mk in summ.get("changed", []):
            old = ((B.get("logm") or {}).get(mk) or {}).get("days") or {}
            new = json.load(open(os.path.join(d, "out", mk + ".json"), encoding="utf-8")).get("days") or {}
            for day in sorted(set(old) | set(new)):
                o, n = old.get(day) or {}, new.get(day) or {}
                for k in sorted(set(o) | set(n)):
                    if json.dumps(o.get(k), sort_keys=True) != json.dumps(n.get(k), sort_keys=True):
                        patches.append({"d": day, "k": k, "v": n.get(k)})
        icu = json.load(open(os.path.join(d, "out", "_settings.json"), encoding="utf-8")).get("intervals") or {}
        icu.pop("key", None)
        tf = os.path.join(d, "out", "_train.json")
        train = json.load(open(tf, encoding="utf-8")) if os.path.exists(tf) else None
    res = {"kind": "engine-import", "v": 1, "at": dt.datetime.now(dt.timezone.utc).isoformat(), "base": B.get("at"), "summary": {**summ, "res": (icu.get("bridge") or {}).get("res")}, "patches": patches, "intervals": icu, "train": train}
    out = a.out or os.path.join(os.path.dirname(os.path.abspath(src)), "engine-import-" + dt.datetime.now().strftime("%Y%m%d-%H%M") + ".json")
    json.dump(res, open(out, "w", encoding="utf-8"), ensure_ascii=False)
    print(f"{summ.get('athlete') or 'intervals.icu'}: {summ.get('planned', 0)} planned, {summ.get('acts', 0)} activity days, {summ.get('well', 0)} wellness days in; "
          f"sent {summ.get('pushed', 0)} workouts, {summ.get('sent_plan', 0)} plan changes, {summ.get('sent_well', 0)} check-ins.")
    print(f"{len(patches)} changes -> {out}\nNow import that file in Engine (intervals.icu -> Sync without Claude).")

if __name__ == "__main__":
    main()
