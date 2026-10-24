# AGENTS.md — Engine

Istruzioni per chi riprende il lavoro (umano o sessione Claude Code). Leggere prima di toccare il codice.

## Cos'è
PWA statica per un atleta ibrido (nutrizione, running, calisthenics, forza). Nessun backend proprio: Supabase (tabella `engine_docs`, RLS) per la sync, intervals.icu e Open Food Facts chiamati direttamente dal browser, AI opzionale con chiave dell'utente.

## Baseline di riferimento
- **Baseline stabile = commit `cae350d`** ("Shopping: a ticked item goes straight to the pantry…"), confermata dall'utente.
- Il commit `02f43a9` ("Improve project documentation") **non è documentazione**: modifica 483 righe di `source/engine.html`, **non avvia l'app** (pagina bianca, `ReferenceError` su `INP`, vedi `docs/BASELINE_AND_AUDIT.md`) e l'utente lo scarta con un rollback. **Non considerare implementato nulla che esista solo in `02f43a9`.**
- Il sito pubblicato (`index.html` in root) corrisponde a `cae350d`, ma non va assunto corretto senza verifica.
- Sul branch di lavoro `02f43a9` è annullato con un commit di revert (nessun force-push). Altri branch/tag con lavoro precedente (`fix/storage-shopping-m1`, tag `checkpoint/*`) **non fanno parte della baseline**: non usarli senza richiesta esplicita.
- Il rollback di `origin/main` lo decide l'utente. Non eseguire reset, force-push, merge, push o deploy senza autorizzazione esplicita.

## Layout
- `source/engine.html`: l'app (HTML + CSS + un unico `<script>`, ~12.6k righe). **È il sorgente da modificare.**
- `source/web/`: runtime web (`shim.js` prima dell'app; `icu-direct.js`, `after.js` dopo; `sw.js`; manifest; config).
- `source/build-web.js`: assembla e minifica nei file di root (`index.html`, `sw.js`, `manifest.webmanifest`).
- Root (`index.html`, `sw.js`, …): **artefatti di build** serviti da GitHub Pages. Non modificarli a mano.
- `supabase/`: schema SQL, push, funzione `engine-push`.
- `vendor/`, `ocr/`: librerie e modello OCR (non toccare).

## Build e verifica locale
```
npm i terser lightningcss      # in una cartella fuori dalla repo
NODE_MODULES=<cartella>/node_modules node source/build-web.js <outdir> nomin   # build non minificata fuori repo
```
Test: `cd tests && npm run verify` (vedi `tests/README.md`). Prima di ogni commit che tocca `source/`: build in cartella temporanea, avvio in Chromium (Playwright è preinstallato) con rete esterna bloccata, **zero `pageerror`** e UI visibile sui tre viewport (390×844, 820×1180, 1440×900). Il rebuild dei file di root (e `npm run release-check`) si fa solo a fine milestone, in un commit dedicato, e la pubblicazione solo su richiesta: durante la milestone `check-build` segnala giustamente che la build di root è indietro rispetto al sorgente.

## Regole ingegneristiche (dal mandato dell'utente)
1. Una sola fonte di verità per Foods, Recipes, Meal Plan, Storage, Shopping: quantità, unità, prezzi, nutrienti. Scorta reale ≠ consumo pianificato ≠ consumo effettivo; le proiezioni non alterano mai la giacenza.
2. Ogni bug corretto: prima riprodotto, poi test di regressione.
3. Nessuna modifica algoritmica nutrizionale (BMR, NEAT, EAT, TEF, calibrazione, macro, nutrienti) senza approvazione esplicita della singola formula. Riferimento: `docs/NUTRITION_SPEC.md`; audit e proposte: `docs/NUTRITION_AUDIT.md`. Nessun coefficiente nel codice finché non è confermato su una fonte primaria e non passa un test numerico indipendente.
4. Test con fixture sintetiche; mai dati reali, mai il progetto Supabase reale.
5. Branch dedicati, commit atomici, milestone piccole e reversibili. Un commit non è un deploy.
6. L'utente approva ogni milestone prima che inizi (cosa, perché, benefici, complessità, rischi, criteri di completamento) e riceve un report dopo.
7. Non eliminare né nascondere funzionalità esistenti. Nessun requisito sparisce: stato in `docs/PRODUCT_REQUIREMENTS.md`.

## Trappole note del codice
- Un solo `<script>` con `const` top-level: **usare un `const` prima della sua dichiarazione (TDZ) azzera l'intera app** (causa di `02f43a9`: `INP.tc =`/`INP["…"] =` a riga ~4484/6016, `const INP` a ~6217). Gli handler (`ACT`, `INP`, `CHG`, `SHEETS`, `VIEWS`) vanno registrati dopo la loro dichiarazione.
- Molte sezioni "avvolgono" sheet/view precedenti (`const _ps = SHEETS.pantry; SHEETS.pantry = …`, `o.body.replace(regex, …)`): ~37 punti. Modificare l'HTML di una sheet può rompere la regex di un wrapper più in basso nel file. Cercare per `SHEETS.<nome>` in tutto il file prima di cambiarla.
- ~960 `!important` nel CSS: i fix di layout richiedono di verificare gli override a fondo file.
- `OFF_UNREACHABLE` è un latch di sessione: un solo errore di rete disattiva Open Food Facts fino al reload.

## Commit e push
Concordato con l'utente: commit atomici e push **frequenti** sul branch di lavoro (`git push -u origin <branch>`), mai su `main` e mai force-push senza autorizzazione. Il backlog (`docs/PRODUCT_REQUIREMENTS.md`) e la roadmap (`docs/ROADMAP.md`) con le cose implementate e da implementare si aggiornano **passo passo**, nello stesso commit della modifica; il resto della documentazione dopo. Rebuild dei file di root e pubblicazione solo su richiesta.

## Stato del lavoro
Vedi `docs/ROADMAP.md` (milestone e stato) e `docs/PRODUCT_REQUIREMENTS.md` (backlog con ID). Aggiornarli a fine di ogni milestone.

## Codebase Consistency & Cleanup (regola permanente, decisa dall'utente il 2026-10-24)
Vale per ogni modifica, passata e futura. L'obiettivo è che Engine resti coerente, pulito, aggiornato e senza codice morto, interfacce obsolete, duplicazioni o regressioni. Principio: **ogni modifica deve lasciare Engine almeno altrettanto coerente, manutenibile e affidabile di prima.**
1. **Dipendenze:** prima di toccare una funzione, individua tutto ciò che è collegato (logica, stato, modelli dati, storage, sync, API, UI, navigazione, impostazioni, test, documentazione) e verifica l'intero flusso, non solo il componente.
2. **Niente codice obsoleto:** quando sostituisci o rimuovi qualcosa, elimina funzioni, variabili, azioni `ACT`/`INP`/`CHG`, listener, CSS, pulsanti, menu, etichette, schermate e impostazioni diventati inutili; niente implementazioni parallele né fallback non più necessari; aggiorna riferimenti, test e documentazione. Tieni solo il legacy necessario per compatibilità, migrazioni o rollback e documentane lo scopo. **Non cancellare per sola impressione di inutilizzo:** controlla riferimenti dinamici (`data-act="…"`, registri di azioni, stringhe costruite), caricamenti condizionali, `source/web/*.js` e i dati precedenti.
3. **Coerenza funzionale e visiva:** stessi dati, logiche, terminologia, unità e componenti ovunque; controlla icone/testi disallineati, sovrapposizioni, overflow, layout mobile/tablet/desktop, animazioni e modali incoerenti, impostazioni che non producono effetti, informazioni duplicate o obsolete, funzioni non più raggiungibili. Riutilizza componenti e funzioni condivise.
4. **Test di regressione e integrazione:** verifica la funzione, le dipendenze e i flussi collegati; esegui `cd tests && npm run verify` (e `release-check` a fine milestone); controlla persistenza dopo reload, comportamento offline, console e warning; guarda smartphone, tablet e desktop. Ogni bug corretto ha un test scritto prima del fix. Un test non è «passato» se non è stato eseguito.
5. **Manutenzione continua:** piccole pulizie dentro ogni milestone, senza refactoring generali né modifiche a moduli non correlati; le anomalie fuori perimetro vanno nel backlog (`docs/PRODUCT_REQUIREMENTS.md`, sezione «Debito tecnico e pulizia»).
6. **Revisione delle modifiche precedenti:** confrontale con la baseline per trovare residui di vecchie implementazioni, UI obsolete, duplicazioni e incompatibilità. Le correzioni rischiose o estranee alla milestone si documentano e si propongono, non si applicano da sole. Strumento: lo script di scansione descritto in `docs/CLEANUP_REPORT.md` (funzioni, azioni e handler senza riferimenti, confronto con la baseline).
7. **Integrazione visiva delle funzioni nuove (richiesta dell'utente, 24/10/2026):** ogni funzione aggiunta va fusa nel design esistente, non appoggiata. Prima del commit: riusa componenti e pattern già presenti (pillole, righe `lrow`, piè di foglio con pulsanti, segmenti), niente righe o barre in più se un elemento compatto basta (es. una pillola al posto di una barra di chip), niente testo duplicato (lo stesso numero non compare due volte nella stessa schermata), gerarchia coerente con le schermate vicine; guarda lo screenshot su telefono (390 px) e controlla che la funzione nuova non sembri «attaccata».
8. **Navigazione e AI (richieste dell'utente, 24/10/2026):** (a) aprire una schermata da un'altra non deve far perdere il punto di partenza: le schede aperte dalla lista della spesa tornano alla lista (`keep`/`_ret` in `openSheet`/`closeSheet`); per ogni nuovo percorso verifica «apro, modifico, torno indietro» e dove sono. (b) L'AI è solo quella dei servizi impostati in Settings, nell'ordine scelto, con passaggio al successivo se uno fallisce o risponde fuori formato; nessun testo né codice nomina un'app ospite (`window.claude` è solo l'interfaccia del runtime).
9. **Definition of Done:** la nuova funzione opera; le precedenti funzionano; le dipendenze sono aggiornate; non restano elementi morti introdotti dalla modifica; l'interfaccia è coerente e verificata; i dati persistenti restano compatibili e integri; test e documentazione sono aggiornati; i problemi residui sono dichiarati. **A fine milestone si aggiunge un breve «Consistency & Cleanup Report»** (cosa verificato, eliminato, aggiornato, cosa resta aperto) in `docs/CLEANUP_REPORT.md`.

