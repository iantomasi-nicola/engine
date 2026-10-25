#!/bin/bash
# Pubblicazione autorizzata dall'utente (AGENTS.md «Commit e push»): commit del sorgente, rebuild dei file di root (devono combaciare), commit del rebuild, push del branch e di main.
# Uso: ENGINE_NM=<cartella>/node_modules scripts/ship.sh "oggetto del commit" ["corpo"]
# Prima: cd tests && npm run verify (verde) e node layout-audit.js (0 problemi); il rollback è lo SHA stampato alla fine.
# Mai force-push, mai reset. Se origin/main ha commit nuovi lo script si ferma: fai il merge a mano.
set -e
cd "$(dirname "$0")/.."
: "${ENGINE_NM:?imposta ENGINE_NM=<cartella con terser e lightningcss>/node_modules}"
BR=$(git rev-parse --abbrev-ref HEAD); [ "$BR" != "main" ] || { echo "lavora su un branch, non su main"; exit 2; }
git add -A; if ! git diff --cached --quiet; then git commit -q -m "$1${2:+

$2}"; fi
git fetch -q origin main; N=$(git log --oneline HEAD..origin/main | wc -l); if [ "$N" != "0" ]; then echo "origin/main ha $N commit nuovi: fai il merge prima"; exit 2; fi
NODE_MODULES=$ENGINE_NM node source/build-web.js >/dev/null
M=$(node tests/check-build.js 2>&1 | grep -c "matches source"); [ "$M" = "3" ] || { echo "i file di root non combaciano ($M/3)"; exit 3; }
git add -A; if ! git diff --cached --quiet; then git commit -q -m "Rebuild root artefacts"; fi
PREV=$(git rev-parse --short origin/main)
git push -u origin "$BR" 2>&1 | tail -1
git push origin HEAD:main 2>&1 | tail -1
echo "main: $(git rev-parse --short HEAD)  rollback: $PREV"
