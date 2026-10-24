# Consistency & Cleanup Report

Un report breve per milestone (regola permanente in `AGENTS.md`). Il più recente in alto.

## Scansione usata
Dal 24/10/2026 ogni revisione confronta il sorgente con la baseline (`git show cae350d:source/engine.html`): funzioni e `const` di primo livello senza altri riferimenti (anche in `source/web/*.js`), azioni `ACT[...]` senza `data-act` né chiamate, handler `INP`/`CHG` senza campo `data-in`/`data-chg`. Il confronto con la baseline separa il debito preesistente da quello introdotto. (Lo script è un'utilità locale di revisione; i risultati stanno qui.)

## Fix: «17 foods moved to the right aisle» a ogni refresh (24/10/2026)
**Causa trovata (riprodotta con test):** da account, `Sync.ready` diventa vero appena parte la sottoscrizione, **prima** che arrivino i dati del server. Le pulizie una tantum (`catFix`, `binPurge`, `panMigrate`) giravano quindi sulla copia locale/in cache, anche se vecchia, rifacevano le stesse modifiche e le **scrivevano di nuovo** (rischio: sovrascrivere versioni più recenti degli stessi cibi). **Correzione:** `dataReady(...)` — le pulizie partono solo dopo la prima risposta *non da cache* per i documenti che toccano. In più, se la memoria del dispositivo è piena, ora lo si dice (prima `saveLocal` falliva in silenzio). **Non verificabile qui:** se sul tuo account le scritture non arrivano al server (coda bloccata), il messaggio può restare: in quel caso lo stato di sync in Settings lo mostra.

## M1 + M2 + UX + M7a + editor Food compatto (24/10/2026)
**Verificato:** i flussi collegati ai pasti, alla dispensa, alla lista spesa, al Foods, al Check-in e alle impostazioni; 69 test automatici (smoke su 3 viewport, dominio, persistenza/backup, scenario a 7 giorni con reload/offline/sync simulata, Pantry, editor Food, sensori FC, versione); screenshot su telefono, tablet e desktop per le schermate toccate; console senza errori.

**Eliminato:**
- le tre ridefinizioni a strati di `shoppingNeeds`/`shoppingRows` (ora una sola, basata su `stockPlan`) e `shoppingNeeds` stessa, non più usata;
- l'override di `pantryAdjust` (ora una funzione sola, reversibile);
- tre wrapper di `SHEETS.food` (barcode, «prezzo variabile», prezzo/scorta) assorbiti nella nuova scheda;
- azioni e controlli resi inutili: `ACT["fd-role"]`, `ACT["fd-meal"]`, `INP["shop-start"]`, i chip 1/3/14 giorni e la data iniziale della spesa, il toggle «Leave out of auto-plan», i chip «Good for» e «Planner role», la nota «Not in the plan yet»;
- `devName` (mai usata dall'app).

**Aggiornato:** `docs/ARCHITECTURE.md` (modello scorta, sensori FC), `PRODUCT_REQUIREMENTS.md`, `ROADMAP.md`, `AGENTS.md`, `tests/README.md`; test riscritti dove il comportamento è cambiato di proposito (KNOWN B1/B3 → comportamento corretto).

**Compatibilità dati:** nessuna migrazione. Campi nuovi opzionali: `it.took`, `S.shop.mode/cFrom/cTo`, `S.settings.pantryPrefs`, `fit.devices`, `fit.sportDevice`, `w.dev`, `S.shop.prices[id].manual`. Il flag `noPlan` e i pasti adatti (`meals`) dei cibi restano rispettati dal planner anche senza controllo a schermo (c'è «Include it again»). `it.took` assente (elementi mangiati prima) → ripristino con la quantità intera, come prima.

**Aperto / proposto (non applicato: fuori perimetro o rischioso):**
1. Debito preesistente nella baseline: `FA_DEF`, `cFinal`, `plPrefs` sono definiti e mai usati → rimozione in M14.
2. Persistono i wrapper di `SHEETS.*`/`VIEWS.*` in altre sezioni (≈34 punti, regex sull'HTML): da ridurre gradualmente quando si tocca quella sezione.
3. ~960 `!important` nel CSS: da ridurre con il design system (J4).
4. L'editor «Edit food» segnalava «Claude» nel testo sorgente: la build lo sostituisce con «AI»; da uniformare nel sorgente.
5. `shopRowHTML` ha una definizione base e una ridefinizione più sotto (preesistente): unificare quando si tocca la lista spesa.
6. I tag Git creati in locale non arrivano sul remoto da questo ambiente (l'invio dei tag non viene eseguito dal proxy): i punti di ripristino sono documentati con gli SHA nella roadmap.
