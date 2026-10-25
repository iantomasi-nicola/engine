# HANDOFF — come riprendere il lavoro su Engine (aggiornato 25/10/2026)

Documento per un'altra IA (o persona) che continua da dove si è fermata la sessione precedente. Leggere insieme a `AGENTS.md` (regole permanenti), `docs/ROADMAP.md`, `docs/PRODUCT_REQUIREMENTS.md`, `docs/CLEANUP_REPORT.md`. Il prompt pronto da incollare è in `docs/NEXT_AI_PROMPT.md`. Lingua: **l'utente scrive in italiano → rispondere in italiano; i testi dell'interfaccia restano in inglese.**

## 1. Stato
- Branch di lavoro: `claude/admiring-noether-c3f97r` (altri branch `claude/adoring-pasteur-grk6ez`, `claude/laughing-hawking-czrr98` appartengono a sessioni parallele: **una sola sessione alla volta lavora su questa repo**, altrimenti i push su `main` si scontrano). Il sito pubblicato è `index.html` in root su GitHub Pages.
- **Pubblicazione: l'utente ha autorizzato la routine «commit → rebuild root → push del branch → push su `main`» a ogni gruppo di correzioni/funzioni**, con riepilogo in italiano delle funzioni pubblicate e di dove trovarle, e lo SHA di rollback (il commit precedente su `main`). Resta vietato force-push, reset, riscrittura della storia. Se `origin/main` ha commit nuovi: `git fetch origin main` e `git merge origin/main` (i conflitti stanno solo nei file generati: rigenerarli con la build).
- Milestone fatte: M1–M6, M8, M8b, M9, M10a–M10e, M11a–**M11j** (M11j: race circuits per la Vulcano Fitness Endurance Cup con voce per stazione e ranking, batteria in evidenza su Today, calcolatori 1RM/passo; vedi `docs/RACE.md`). Ultime (25/10): analisi dell'attività da intervals.icu, score severo, Lab, foto cloud con guida SQL, PDF recap (M11g/h); **Level duro con consigli, Energy battery, storico dei goal, foto numerose + reminder (M11i)**. Suite: `cd tests && npm run verify` (~400 test, ~3,5 min), tutta verde all'ultimo giro. Baseline storica: `cae350d` (vedi AGENTS.md; `02f43a9` è scartato).
- Da fare dall'utente (non risolvibile dal codice): eseguire **una volta** lo SQL del bucket foto nello SQL Editor di Supabase (bottone «Copy SQL» in Progress › Body › Progress photos); provare a mano le funzioni pubblicate e riferire.
- Non verificato dal vivo: endpoint `/activity/{id}/streams.json` e `/intervals` di intervals.icu (letti in modo difensivo), batteria energetica su dati reali, scontrino con AI reale.

## 2. Prossimi passi (in ordine suggerito; presentare cosa/perché/rischi prima di ogni milestone grande, per quelle piccole basta il messaggio dell'utente)
1. **M7b Nutrizione**: D19 (precisione TDEE: app ≈3000 vs Zepp 2750), **D20** (sottostima diversa per smartwatch al polso vs fascia cardio, correzione per dispositivo/sport *appresa* da peso e bilancio energetico; oggi `devPicker` registra il sensore per allenamento ma nessun numero cambia), D18 (AEE senza kcal dell'orologio), D7, D8, D11, D17, D5b. **Nessuna formula/coefficiente senza approvazione esplicita della singola formula** (`docs/NUTRITION_SPEC.md`, `docs/NUTRITION_AUDIT.md`). M7c/M7d/M7e e M9b idem.
2. M12 (calcolatori I3, sensore flessioni I4/L27), M13 (redesign totale: le altre pagine passano al modello di sezioni piatte, logo, animazioni, gesture), **M14 revisione critica** (usabilità, sicurezza, difetti, limiti; **verifica allineamenti grafici/design di tutte le schermate** su 390/820/1440 px; censimento percorsi di ritorno; metriche UX; migrazioni ENG-05; **ottimizzazione prestazioni app e sito P1**), M15 audit finale e pulizia repo (rimuovere FA_DEF/cFinal/plPrefs, `VIEWS.progress` base morto).
3. Resto di M11: recupero H8–H9 + suggerimenti Free Workout, esercizi personalizzati H1, G1/G3/G4, L19 (strategia gara: coefficienti pre/post gara da approvare).
4. Validare la batteria (`docs/BATTERY.md`) con dati reali dell'utente e tarare i pesi (HRV/FC/allenamento) **solo** con la sua approvazione; eventuale lettura dello stress/HRV diurno da intervals.icu se disponibile.
5. Aperti: S-1 (chiavi API nel documento di impostazioni cloud), backtest AEE su dati reali, conferma su telefono vero dello sfarfallio della barra in basso, convenzione del segno della fascia degli anelli, scontrino con AI reale (non provato), `icuExtras`/`spendRangeOf` senza riferimenti (noti).

## 3. Preferenze dell'utente da rispettare (emerse in sessione)
- Design **minimale, Material Design Google recente**: niente bordini/filetti colorati decorativi (rimosso l'outline/barra verde dalla cella «oggi» della Settimana), niente card appiccicate tra loro, sezioni piatte con `.section-h`, una sola freccia nei menu, icone allineate al testo (`.ic{vertical-align:-.25em}`), stesse righe ovunque (`woRow`), niente testo/numero duplicato nella stessa schermata. Ogni funzione nuova va **fusa** nel design esistente, non appoggiata; guardare sempre lo screenshot a 390 px.
- La Settimana (tablet/desktop) mostra **solo pasti**, mai allenamenti.
- Record automatici (PB) **mai scritti da soli**: suggerimento con «Add to records»/«No».
- AI solo dai servizi impostati in Settings, nell'ordine scelto, con failover; mai nominare l'app ospite.
- Notifiche supplementi: una sola per orario; orari ancorati ai pasti (`~b`, `~l+`…).
- Navigazione: «apro, modifico, torno indietro» deve riportare al punto di partenza (`keep`/`_ret`).
- Scontrino: cibi nuovi/non riconosciuti **non** si creano da soli (lista da fare a mano); l'abbinamento si impara (`S.shop.rcMap`).
- Mai dati reali né il progetto Supabase reale nei test. Nessun push/merge/deploy distruttivo senza autorizzazione; la pubblicazione su `main` segue la routine del punto 1.

## 3. Preferenze dell'utente da rispettare (emerse in sessione)
- Design **minimale, Material Design Google recente**: niente bordini/filetti colorati decorativi (rimosso l'outline/barra verde dalla cella «oggi» della Settimana), niente card appiccicate tra loro, sezioni piatte con `.section-h`, una sola freccia nei menu, icone allineate al testo (`.ic{vertical-align:-.25em}`), stesse righe ovunque (`woRow`), niente testo/numero duplicato nella stessa schermata. Ogni funzione nuova va **fusa** nel design esistente, non appoggiata; guardare sempre lo screenshot a 390 px.
- La Settimana (tablet/desktop) mostra **solo pasti**, mai allenamenti.
- Record automatici (PB) **mai scritti da soli**: suggerimento con «Add to records»/«No».
- AI solo dai servizi impostati in Settings, nell'ordine scelto, con failover; mai nominare l'app ospite.
- Notifiche supplementi: una sola per orario; orari ancorati ai pasti (`~b`, `~l+`…).
- Navigazione: «apro, modifico, torno indietro» deve riportare al punto di partenza (`keep`/`_ret`).
- Scontrino: cibi nuovi/non riconosciuti **non** si creano da soli (lista da fare a mano); l'abbinamento si impara (`S.shop.rcMap`).
- Mai dati reali né il progetto Supabase reale nei test. Nessun push/merge/deploy distruttivo senza autorizzazione; rebuild dei file di root e pubblicazione a fine milestone.

## 4. Procedura operativa
```
# una volta (fuori dalla repo)
mkdir -p $SCRATCH/nm && cd $SCRATCH/nm && npm i terser lightningcss
export ENGINE_NM=$SCRATCH/nm/node_modules
# sviluppo: modificare SOLO source/engine.html e source/web/*
cd tests && npm run verify            # smoke 3 viewport + tutti i test (~3 min; lanciare in background, scrivere su file di log)
node --test m12.test.js               # un singolo file
# rilascio (a fine milestone, su richiesta/autorizzazione)
NODE_MODULES=$ENGINE_NM node source/build-web.js     # rigenera index.html, sw.js, manifest nella root
node tests/check-build.js              # 3 «matches source»
git push -u origin claude/adoring-pasteur-grk6ez && git push origin claude/adoring-pasteur-grk6ez:main
```
- Dopo ogni aggiunta di handler eseguire un controllo di avvio senza `pageerror` (harness: `H.startApp(...)` e leggere `app.errors`).
- Non installare pacchetti dentro `tests/` (niente `npm i` lì): un Playwright locale diverso da quello del container fa fallire l'avvio di Chromium; terser/lightningcss vanno in `$ENGINE_NM`.
- Harness: `tests/lib/harness.js` (`H.build(H.tmp(..))`, `H.startApp({dir,seed,viewport})`, `H.VIEWPORTS`), fixture sintetiche `tests/fixtures/synthetic.js` (`F.seed({withPlan,withPantry})`). I temp dir si cancellano a fine processo (il disco si era riempito di centinaia di MB).
- Scansione codice morto: confronto con la baseline (funzioni/azioni/handler senza riferimenti), descritta in `docs/CLEANUP_REPORT.md`.
- Ogni bug: prima riprodotto con un test, poi corretto. Aggiornare `docs/PRODUCT_REQUIREMENTS.md` e `docs/ROADMAP.md` nello stesso commit, e aggiungere a fine milestone la sezione «Consistency & Cleanup Report» in `docs/CLEANUP_REPORT.md`.

## 5. Trappole tecniche (le più costose finora)
- Un solo `<script>` con `const` top-level: usare `ACT`/`INP`/`CHG`/`SHEETS`/`VIEWS`/`FORMS` **prima** della dichiarazione azzera l'app (TDZ). Registrare gli handler dopo la dichiarazione.
- **Dichiarazioni duplicate di funzione**: l'ultima vince in silenzio (es. due `icuKick`, `volumeHTML` ↔ rinominata `volWindowHTML`). Prima di aggiungere un nome: `grep -n 'function nome\|const nome' source/engine.html`.
- Wrapper: molte sheet/view sono avvolte più in basso (`const _ps = SHEETS.x; SHEETS.x = …`, `body.replace(regex)`): cercare `SHEETS.<nome>` in tutto il file prima di cambiare l'HTML di una sheet.
- ~960 `!important` nel CSS: verificare gli override a fondo file. `#toast{transform:none}` è necessario (un transform crea un containing block per l'elemento fixed).
- `OFF_UNREACHABLE` è un latch di sessione (Open Food Facts).
- `foodSearch` richiede che tutte le parole corrispondano: per testo di scontrino usare `rcCands` (prova anche le parole singole).
- Sync intervals.icu: unica definizione `icuKick(reason, mode, force, quiet)` → `icuRun(manual, force, quiet)`; `quiet` evita di nascondere il toast Undo.
- Il marcatore locale `engine.catfix` (valore "2") limita la correzione delle corsie a una volta per dispositivo; i test che vogliono rieseguirla lo cancellano.

## 6. Mappa dei dati e componenti (dove cercare)
- Stato: `S.settings` (supps con `times`, `mealTimes`, `fit.phases[].pct`, `wx`), `S.shop` (stores, prices, buys, rcTodo, rcMap, receipts), `S.train` (progs con `deloadMode`, `calis` con `auto`, `wsess` con `pb`/`rec`), giorni `getDay(date).meals[mealId][]` con item `{kind, ref, qty, cheat, ph, at, eaten}`.
- Componenti condivisi: `woRow(o)` (riga workout in Today/Workouts/Programs), `.section-h`/`.pv-sec`, `lrow`, `pillole`, `itemRow` (tag cheat), controlli periodici `checkList/checksDue/checksNotice` (Reminders › Check-ups, riga `.ck-due` di Today), `openCheat({date,meal})` (cheat meal con stima AI `Sync.sample.json`, unica voce «Cheat meal» del menu del pasto; nessun segnaposto separato), `SHEETS.receipt` + `rcRows/rcCands/rcKey/rcFoodFor`, Settimana: `VIEWS.week` + CSS `.wb*`.
- AI: `Sync.sample.json(prompt,{images})`, `AIF("feature")`, `AI_FEATS`.

## 7. Come lavorare meglio in collaborazione (suggerimenti)
- Una milestone alla volta, commit atomici, push frequenti sul branch; l'utente approva prima e riceve il report dopo (cosa pubblicato, SHA di rollback, cosa resta aperto, risposte alle domande).
- Raccogliere le richieste a lotti in `docs/PRODUCT_REQUIREMENTS.md` con ID (L/D/P) e collocarle subito in una milestone in `docs/ROADMAP.md`, così nulla va perso.
- Rispondere esplicitamente a ogni punto del messaggio dell'utente (fatto / dove sta in roadmap / cosa serve da lui).
- Lanciare le suite lunghe in background con log su file; non attendere con `sleep`.
- Prima di dichiarare «fatto»: test eseguiti davvero, screenshot a 390 px, nessun `pageerror`, documentazione aggiornata, problemi residui dichiarati.
