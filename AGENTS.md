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
Test: `cd tests && npm run verify` (vedi `tests/README.md`). Prima di ogni commit che tocca `source/`: build in cartella temporanea, avvio in Chromium (Playwright è preinstallato) con rete esterna bloccata, **zero `pageerror`** e UI visibile sui tre viewport (390×844, 820×1180, 1440×900). Il rebuild dei file di root si fa solo a fine milestone, in un commit dedicato.

## Regole ingegneristiche (dal mandato dell'utente)
1. Una sola fonte di verità per Foods, Recipes, Meal Plan, Storage, Shopping: quantità, unità, prezzi, nutrienti. Scorta reale ≠ consumo pianificato ≠ consumo effettivo; le proiezioni non alterano mai la giacenza.
2. Ogni bug corretto: prima riprodotto, poi test di regressione.
3. Nessuna modifica algoritmica nutrizionale senza proposta scientifica approvata (`docs/NUTRITION_PROPOSAL.md`).
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
