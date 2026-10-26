# Più IA sulla stessa repo (regola dell'utente, 27/10/2026)

Due (o più) sessioni possono lavorare insieme, su milestone diverse, senza pestarsi i piedi e **sopravvivendo al limite d'uso** (una IA può fermarsi in qualsiasi momento).

## Regole
1. **Prenota prima di lavorare**: `scripts/claim.sh take <id> "<titolo>" <aree> [ore] [ramo]`. Il registro è il file `CLAIMS.md` del ramo `coord` su origin (si legge con `scripts/claim.sh list`). Se un'altra prenotazione attiva ha una **area in comune** o la stessa id, il comando rifiuta: scegli un'altra milestone o aspetta. Aree: `fuel, shopping, foods, train, running, strength, progress, settings, sync, energy, pwa, design, docs, agents, tests, other`. Tutto `source/engine.html` è un file solo: due IA sulla stessa area si scontrano, su aree diverse quasi mai.
2. **Battito**: `scripts/claim.sh renew <id>` a ogni commit (o ogni ora). Una prenotazione scaduta (`scade` passato) è abbandonata: chi riprende legge la nota e il ramo indicato e continua da lì, senza rifare.
3. **Un ramo per IA e per milestone** (`ai-<nome>/<milestone>` o quello assegnato dall'ambiente), **spinto a ogni commit** (`git push -u origin <ramo>`): un ramo solo locale va perso se il container finisce. Mai lavorare dentro il ramo di un'altra IA e mai su `main`.
4. **Limite d'uso**: appena si avvicina, commit + push del ramo, `scripts/claim.sh release <id> "cosa è fatto / cosa resta / dove sono i test"` (o `renew` se si riprende presto) e una riga in `docs/HANDOFF.md` §1. Meglio fermarsi prima che a metà di una modifica.
5. **Pubblicare**: solo con `scripts/ship.sh` (suite verde, layout-audit a 0, revisione grafica sulle schermate toccate). Lo script si ferma se `origin/main` ha commit nuovi: `git fetch origin main && git merge origin/main`, rigenera i file di root (conflitti solo lì e in `docs/`), riesegui i test toccati e riprova. **Una sola pubblicazione alla volta**: prima di `ship.sh` esegui `scripts/claim.sh take SHIP "pubblicazione" other 1`, dopo `release SHIP`.
6. **Documenti condivisi** (`docs/PRODUCT_REQUIREMENTS.md`, `docs/ROADMAP.md`, `docs/HANDOFF.md`): modifiche piccole e commit separati; gli ID nuovi (L…/R…) si prendono dall'ultimo presente dopo un `git fetch` + merge di `origin/main`, per non duplicarli.
7. **Funzioni aggiuntive dell'utente**: ogni richiesta nuova dell'utente (anche a metà lavoro, anche in un altro messaggio) va **subito** in `docs/PRODUCT_REQUIREMENTS.md` con un ID e in una **milestone ancora da fare** in `docs/ROADMAP.md` (con «richiesta dell'utente, data»), poi si lavora secondo la milestone. Mai tenere una richiesta solo in chat. Questa regola vale per tutte le IA.
8. **Non toccare il lavoro prenotato da altri**: se ti serve una modifica in un'area prenotata, scrivila nel backlog (sezione «Per l'IA che tiene l'area X») e prosegui altrove.
9. Restano valide tutte le regole di `AGENTS.md` (test prima, niente codice morto, design su 390/820/1440, nessuna formula senza approvazione, mai `max`).

## Come dividere il lavoro (consiglio)
- IA 1: la serie M14b (correzioni dell'audit, aree `fuel, shopping, foods, sync, energy, pwa`).
- IA 2: milestone su aree diverse, es. `train, running, strength, progress` (M12 sensore flessioni e contaflessioni, M9b E2–E5, M11 H8–H9/G1/G3/G4/L19, audit M14b delle aree 4, 7, 8, 9) oppure `docs/agents` (M15 pulizia, README). Le milestone nutrizionali M7d/M7e (`energy`) le tiene una sola IA alla volta.
