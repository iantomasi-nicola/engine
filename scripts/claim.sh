#!/bin/bash
# Registro condiviso delle milestone in lavorazione, per far lavorare PIU' IA sulla stessa repo senza pestarsi i piedi.
# Il registro è il file CLAIMS.md del ramo `coord` su origin (non tocca né main né il tuo ramo di lavoro).
# Scrittura atomica: si spinge un commit figlio dell'ultimo `coord`; se qualcuno ha scritto prima il push è rifiutato e si riprova.
#   scripts/claim.sh list                              elenco (attive e scadute)
#   scripts/claim.sh take <id> "<titolo>" <aree> [ore] [ramo]   prenota (default 4 h); rifiuta se un'altra prenotazione attiva ha la stessa id o un'area in comune
#   scripts/claim.sh renew <id> [ore]                  rinnova (fallo a ogni commit o ogni ora: «battito»)
#   scripts/claim.sh release <id> "<nota>"             rilascia a lavoro finito/pubblicato, con una nota (cosa resta)
# Aree (token separati da virgola): fuel,shopping,foods,train,running,strength,progress,settings,sync,energy,pwa,design,docs,agents,tests,other
# Una prenotazione scaduta (oltre `until`) si considera abbandonata: chi riprende legge la nota e il ramo indicato e continua da lì.
set -e
cd "$(dirname "$0")/.."
CMD="${1:-list}"; shift || true
ME="${CLAIM_OWNER:-$(git rev-parse --abbrev-ref HEAD)}"
export CMD ME ARGS_ID="${1:-}" ARGS_2="${2:-}" ARGS_3="${3:-}" ARGS_4="${4:-}" ARGS_5="${5:-}"
for try in 1 2 3 4 5 6; do
  git fetch -q origin coord 2>/dev/null && PARENT=$(git rev-parse FETCH_HEAD) || PARENT=""
  OLD=""; [ -n "$PARENT" ] && OLD=$(git show "$PARENT:CLAIMS.md" 2>/dev/null || true)
  export OLD
  OUT=$(python3 - <<'PY'
import os, sys, datetime, json
cmd, me, old = os.environ["CMD"], os.environ["ME"], os.environ.get("OLD", "")
a = [os.environ.get(f"ARGS_{k}", "") for k in ("ID", "2", "3", "4", "5")]
now = datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0)
fmt = lambda d: d.strftime("%Y-%m-%d %H:%MZ")
parse = lambda s: datetime.datetime.strptime(s, "%Y-%m-%d %H:%MZ").replace(tzinfo=datetime.timezone.utc)
HEAD = "# Prenotazioni delle milestone (non modificare a mano: scripts/claim.sh)\n\n| id | stato | titolo | aree | proprietario / ramo | preso | scade | nota |\n|---|---|---|---|---|---|---|---|\n"
rows = []
for l in old.splitlines():
    if l.startswith("|") and not l.startswith("| id ") and not l.startswith("|---"):
        c = [x.strip() for x in l.strip().strip("|").split("|")]
        if len(c) == 8: rows.append(c)
def active(r): return r[1] == "active" and parse(r[6]) > now
def render(rs): return HEAD + "".join("| " + " | ".join(r) + " |\n" for r in rs)
if cmd == "list":
    print("LIST"); print(render(rows) if rows else "(nessuna prenotazione)\n"); sys.exit(0)
rid = a[0]
if not rid: print("ERR manca l'id"); sys.exit(2)
mine = [r for r in rows if r[0] == rid]
if cmd == "take":
    title, areas, hours, branch = a[1], a[2], float(a[3] or 4), a[4] or me
    if not title or not areas: print("ERR uso: take <id> \"<titolo>\" <aree> [ore] [ramo]"); sys.exit(2)
    want = set(x.strip() for x in areas.split(",") if x.strip())
    for r in rows:
        if active(r) and r[0] != rid and want & set(x.strip() for x in r[3].split(",")):
            print(f"ERR conflitto: {r[0]} ({r[2]}) tiene già {sorted(want & set(x.strip() for x in r[3].split(',')))} fino a {r[6]}, ramo {r[4]}"); sys.exit(3)
    if mine and active(mine[0]) and mine[0][4].split()[0] != branch.split()[0]:
        print(f"ERR l'id {rid} è già prenotata da {mine[0][4]} fino a {mine[0][6]}"); sys.exit(3)
    rows = [r for r in rows if r[0] != rid] + [[rid, "active", title.replace("|", "/"), ",".join(sorted(want)), branch, fmt(now), fmt(now + datetime.timedelta(hours=hours)), (mine[0][7] if mine else "")]]
elif cmd == "renew":
    if not mine: print("ERR id sconosciuta"); sys.exit(2)
    h = float(a[1] or 4); mine[0][6] = fmt(now + datetime.timedelta(hours=h)); mine[0][1] = "active"
elif cmd == "release":
    if not mine: print("ERR id sconosciuta"); sys.exit(2)
    mine[0][1] = "released"; mine[0][6] = fmt(now); mine[0][7] = (a[1] or "").replace("|", "/")
else: print("ERR comando sconosciuto"); sys.exit(2)
print("NEW"); sys.stdout.write(render(rows))
PY
) || { echo "$OUT"; exit 1; }
  case "$OUT" in
    LIST*) echo "${OUT#LIST}"; exit 0;;
    ERR*) echo "$OUT"; exit 1;;
  esac
  NEWTXT="${OUT#NEW}"; NEWTXT="${NEWTXT#$'\n'}"
  BLOB=$(printf '%s\n' "$NEWTXT" | git hash-object -w --stdin)
  TREE=$(printf '100644 blob %s\tCLAIMS.md\n' "$BLOB" | git mktree)
  C=$(GIT_AUTHOR_NAME="${GIT_AUTHOR_NAME:-engine-claims}" GIT_AUTHOR_EMAIL="${GIT_AUTHOR_EMAIL:-claims@engine.invalid}" GIT_COMMITTER_NAME="${GIT_COMMITTER_NAME:-engine-claims}" GIT_COMMITTER_EMAIL="${GIT_COMMITTER_EMAIL:-claims@engine.invalid}" git commit-tree "$TREE" ${PARENT:+-p $PARENT} -m "claims: $CMD ${ARGS_ID}")
  if git push -q origin "$C:refs/heads/coord" 2>/dev/null; then echo "ok: $CMD $ARGS_ID"; printf '%s\n' "$NEWTXT"; exit 0; fi
  sleep $((try * 2))   # un'altra IA ha scritto prima: rilegge e riprova
done
echo "non sono riuscito a scrivere il registro dopo 6 tentativi"; exit 1
