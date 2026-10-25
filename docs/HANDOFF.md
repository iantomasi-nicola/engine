# HANDOFF — come riprendere il lavoro su Engine (aggiornato 26/10/2026)

Documento per un'altra IA (o persona) che continua da dove si è fermata la sessione precedente. Leggere insieme a `AGENTS.md` (regole permanenti), `docs/ROADMAP.md`, `docs/PRODUCT_REQUIREMENTS.md`, `docs/CLEANUP_REPORT.md`. Il prompt pronto da incollare è in `docs/NEXT_AI_PROMPT.md`. Lingua: **l'utente scrive in italiano → rispondere in italiano; i testi dell'interfaccia restano in inglese.**

## 1. Stato
- Branch di lavoro: `claude/admiring-noether-c3f97r` (altri branch `claude/adoring-pasteur-grk6ez`, `claude/laughing-hawking-czrr98` appartengono a sessioni parallele: **una sola sessione alla volta lavora su questa repo**, altrimenti i push su `main` si scontrano). Il sito pubblicato è `index.html` in root su GitHub Pages.
- **Pubblicazione: l'utente ha autorizzato la routine «commit → rebuild root → push del branch → push su `main`» a ogni gruppo di correzioni/funzioni**, con riepilogo in italiano delle funzioni pubblicate e di dove trovarle, e lo SHA di rollback (il commit precedente su `main`). Resta vietato force-push, reset, riscrittura della storia. Se `origin/main` ha commit nuovi: `git fetch origin main` e `git merge origin/main` (i conflitti stanno solo nei file generati: rigenerarli con la build).
- Milestone fatte: M1–M6, M8, M8b, M9, M10a–M10e, M11a–M11l, **M13a, M13b, M13c** (tutte pubblicate su `main`; ultimo `main` = vedi `git log -1 origin/main`; il commit che le precede è il rollback indicato nel riepilogo di ogni pubblicazione). In breve: regolamento Endurance Cup rev. 5 e ranking a stagioni (`docs/RACE.md`), batteria con pisolini e timer del pisolino (`docs/BATTERY.md`), stima del sonno (`docs/SLEEP.md`), massa magra con incertezza e avviso nel cut (`docs/BODY_COMPOSITION.md`), stima del peso nei buchi (`docs/WEIGHT_ESTIMATE.md`), Today ridisegnata, **Tools** (timer + 9 calcolatori con «Use my data» e «Copy as text»), Training › Stats a **sezioni chiuse** (`foldView`/`foldOne`), Progress con 4 schede (Goals dentro Overview, Lab dentro Nutrition › Energy, Level dentro Stats › Fitness), Records con «All results» (modifica/elimina di ogni risultato), DOMS e «Training feel» nel Journal con suggerimenti sui blocchi doloranti, Test day → Records, report con scheda «Recovery and body», ricetta da link. Suite: `cd tests && npm run verify` (**441 test** dopo M7b-1, ~4–5 min; l'ultimo giro completo verde è quello prima di M7b-1: da rieseguire sullo stato unito); `node layout-audit.js <outdir> [--dark] [--strict]` (0 problemi + «design lint» di avvisi). Baseline storica: `cae350d` (vedi AGENTS.md; `02f43a9` è scartato).
- **Lavoro in corso (aggiornare a ogni pausa)**: ramo di lavoro `claude/adoring-knuth-420kc0`. Il ramo grafico (report 1 del design-reviewer) è **già unito** (merge `1d20d51`). I due rami worktree dei lavori precedenti **non esistono più** nel container nuovo (`git worktree list` mostra solo il principale): **M7b si è ripreso da zero in questa sessione**. **M7b-1 FATTA il 26/10** (modifiche nel working tree, non ancora committate né pubblicate): calibrazione v2 del TDEE (`calibV2`, interruttore `energy.calMode`), avvisi sui macro (`energyWarnings`, `energy.warn`), data di attivazione `energy.calV2From` (costante `CAL_V2_START = "2026-10-25"` per i profili esistenti), formule approvate dall'utente; più le correzioni 1–7 del secondo giro del design-reviewer (L156). Dettagli in `docs/CLEANUP_REPORT.md` (sezione M7b-1) e `docs/NUTRITION_AUDIT.md` (nota di stato). **Prossimo passo**: suite completa, layout audit (anche `--dark`) e `design-reviewer` sullo stato attuale, poi commit e `scripts/ship.sh`; poi il resto di M7b.
- **Agenti** (`.claude/agents/`, flusso e costi in `docs/AGENTS_WORKFLOW.md`): `test-runner`, `code-guard`, `design-reviewer`, `area-auditor`, `milestone-builder`, `docs-keeper`, `release-manager`. Mai impegno `max`; niente modelli con crediti extra senza autorizzazione.
- **Agente di revisione grafica**: `.claude/agents/design-reviewer.md` (sola lettura, guarda gli screenshot reali su 390/820/1440, chiaro e scuro, e dice cosa è storto, duplicato o messo a caso). **Va lanciato prima di ogni commit che tocca la UI** (regola 10 di AGENTS.md) e di nuovo dopo le correzioni. Se il tuo ambiente non lo registra come tipo di agente, lancia un agente generico con quel file come istruzioni.
- Da fare dall'utente (non risolvibile dal codice): eseguire **una volta** lo SQL del bucket foto nello SQL Editor di Supabase (bottone «Copy SQL» in Progress › Body › Progress photos); provare a mano le funzioni pubblicate e riferire.
- Non verificato dal vivo: endpoint `/activity/{id}/streams.json` e `/intervals` di intervals.icu (letti in modo difensivo), batteria energetica su dati reali, scontrino con AI reale.

## 2. Prossimi passi e modello consigliato per ognuno (l'utente cambia modello con `/model`; livelli di impegno: low, medium, high; `xhigh` solo se davvero necessario e dichiarandolo, mai `max`: ordine dell'utente)
In ordine suggerito. Presentare cosa/perché/rischi prima di ogni milestone grande; per le piccole basta il messaggio dell'utente.

| # | Milestone | Cosa | Modello · impegno consigliato | Perché |
|---|---|---|---|---|
| 1 | **M7b Nutrizione, resto** (formule APPROVATE dall'utente il 26/10: «le nuove formule te le approvo tutte»; **M7b-1 FATTA il 26/10**: D8/F-06 calibrazione v2, F-07 avvisi, F-11 data di attivazione `calV2From`; non ancora pubblicata) | **Restano**: D19 precisione TDEE (app ≈3000 vs Zepp 2750), D5b kcal lorde→nette e per dispositivo, **D20 correzione per dispositivo appresa da peso e bilancio** (nessun moltiplicatore da letteratura: Shcherbina 2017 non dà un segno polso/fascia), D7, D18 AEE senza kcal orologio (`neatMode`), F-01 BMR (HB originale, Ten Haaf, bonus opzionale), F-02/D9 profilo incompleto, F-09 provenienza dei dati; eventuale `algoVersion` generale e soglia energetica prudente di F-07. Ogni formula con fonte, test numerico indipendente e interruttore di rollback | **Opus 5.5 · high**, poi revisione indipendente con `/code-review` a **high** (altro modello) | Cambia i numeri su cui poggia tutto; serve ricerca di fonti e rigore numerico. Le fonti primarie sono in buona parte irraggiungibili dal sandbox: dichiararlo |
| 2 | **M13d Redesign delle altre schermate** (Fuel, Train › Calendar/Workouts, Progress › Body/Reports, Settings, sheet; includere gli aperti della revisione 2: difetto 8 larghezza massima a 1920 px e i minori, L157) con l'agente `design-reviewer` a ogni giro | Premium e coerente su 390/820/1440, chiaro e scuro, sezioni piatte, niente cose appoggiate | **Opus 5.5 · high** | Giudizio visivo e coerenza, molti giri screenshot → correzione |
| 3 | **M7c–M7e** | trasparenza «Come calcolato», BMR opzionali, micronutrienti con AI (L16), idratazione | Opus 5.5 · high (le formule: come M7b) | Misto: UI + qualche formula da approvare |
| 4 | **M9b**, **M12** (sensore flessioni, contaflessioni), resto di **M11** (H8–H9, H1, G1/G3/G4, L19) | funzioni | Sonnet 5.5 · high | Funzioni medie ben delimitate |
| 5 | **Proxy per la ricetta da link** (funzione Supabase che legge la pagina) | richiede l'autorizzazione dell'utente a creare/deploy una funzione | Sonnet 5.5 · high | Piccolo, ma tocca il backend: chiedere prima |
| 6 | **M14 / M14b Revisione critica e integrale con agenti** (`docs/REVIEW_PLAN.md`: 12 aree con `area-auditor` in parallelo, poi `code-guard` e `design-reviewer`, poi correzioni a gruppi) (usabilità, sicurezza, difetti, prestazioni P1, percorsi di ritorno) | audit | **Opus 5.5 · high** (e `/security-review`) | Serve sguardo d'insieme e severità |
| 7 | **M15 Audit finale e pulizia repo** | codice morto (FA_DEF/cFinal/plPrefs, `VIEWS.train` base morta), README, script | Sonnet 5.5 · medium → high per la revisione | Lavoro metodico; il controllo finale con Fable |
| – | Documenti, correzioni piccole, ritocchi di testo | – | Sonnet 5.5 · low/medium | Costo minimo |

Aperti: S-1 (chiavi API nel documento di impostazioni cloud), backtest AEE su dati reali, validare la batteria e la stima del sonno sui dati veri dell'utente (tarare i pesi **solo** con la sua approvazione), conferma su telefono vero dello sfarfallio della barra in basso, convenzione del segno della fascia degli anelli, scontrino con AI reale, PDF/OCR dei ranking (oggi solo testo, CSV, pagina salvata), `icuExtras`/`spendRangeOf` senza riferimenti (noti).

## 3. Preferenze dell'utente da rispettare (emerse in sessione)
- **Grafica**: l'utente nota subito ciò che è «storto» o «messo a caso» (allineamenti quasi giusti, card di altezza diversa in una riga, icone fuori asse, testo che tocca un bordo, una funzione nuova «appoggiata»). Ogni funzione nuova si fonde nei componenti esistenti; **tutti i menu/sezioni ripiegabili partono chiusi**; niente numero ripetuto nella stessa schermata; anche il tema scuro. Today: tasti veloci sempre, promemoria subito visibili ma non invadenti.
- **Inserimento dati veloce** (un tocco, non tre passaggi) e **nessun carattere perso** mentre si scrive.
- **Ogni dato nuovo** (batteria, DOMS, sonno, massa magra, peso stimato, Fire Set…) va anche nei report e nei consigli, non solo nella propria schermata.
- Per ogni punto del messaggio dell'utente rispondere esplicitamente: fatto / dove trovarlo / cosa manca e perché.
- Design **minimale, Material Design Google recente**: niente bordini/filetti colorati decorativi (rimosso l'outline/barra verde dalla cella «oggi» della Settimana), niente card appiccicate tra loro, sezioni piatte con `.section-h`, una sola freccia nei menu, icone allineate al testo (`.ic{vertical-align:-.25em}`), stesse righe ovunque (`woRow`), niente testo/numero duplicato nella stessa schermata. Ogni funzione nuova va **fusa** nel design esistente, non appoggiata; guardare sempre lo screenshot a 390 px.
- La Settimana (tablet/desktop) mostra **solo pasti**, mai allenamenti.
- Record automatici (PB) **mai scritti da soli**: suggerimento con «Add to records»/«No».
- AI solo dai servizi impostati in Settings, nell'ordine scelto, con failover; mai nominare l'app ospite.
- Notifiche supplementi: una sola per orario; orari ancorati ai pasti (`~b`, `~l+`…).
- Navigazione: «apro, modifico, torno indietro» deve riportare al punto di partenza (`keep`/`_ret`).
- Scontrino: cibi nuovi/non riconosciuti **non** si creano da soli (lista da fare a mano); l'abbinamento si impara (`S.shop.rcMap`).
- Mai dati reali né il progetto Supabase reale nei test. Nessun push/merge/deploy distruttivo senza autorizzazione; la pubblicazione su `main` segue la routine del punto 1.

## 4. Procedura operativa
**Scorciatoia di pubblicazione**: `ENGINE_NM=<cartella>/node_modules scripts/ship.sh "oggetto"` (commit, rebuild di root con controllo che combaci, commit del rebuild, push del branch e di `main`, stampa lo SHA di rollback). Prima: suite verde, `node layout-audit.js <outdir>` a 0 problemi e **agente `design-reviewer`**. Per i comandi lunghi (suite, audit): lanciarli in background con log su file e interrogare il file; non attendere con `sleep` lunghi.
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

- **Campi che salvano all'uscita (`data-chg`)**: mentre hanno il focus la ridisegnata aspetta (`typingBusy`/`DEFER`); le bozze vivono in `DRAFT`. Non rimettere `render()` dentro un handler `INP` di un campo `data-chg`.
- **`RACE()` modifica l'oggetto salvato** (non lo copia): chiamarlo due volte nella stessa funzione era una fonte di scritture perse.
- **Sezioni ripiegabili**: `foldView(id, html)` spezza l'HTML ai `<div class="section-h"><h2>Titolo</h2>…</div>` e li chiude di default; `foldOne(id, titolo, riassunto, azioni, contenuto)` per una sola sezione; il titolo deve essere unico nella scheda; i riassunti stanno in `FOLD_SUM`. I test che vogliono il contenuto aperto impostano `UI.fold = { id: { "Titolo": true } }`.
- **Un `ACT[...] = ` messo prima della dichiarazione di `ACT` azzera l'app** (è successo di nuovo il 26/10 con `lean-open`): dopo ogni modifica `node` su `dbg7.js`-like o `H.startApp` e `app.errors` vuoto.

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
