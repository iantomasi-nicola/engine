# Consistency & Cleanup Report

Un report breve per milestone (regola permanente in `AGENTS.md`). Il più recente in alto.

## Scansione usata
Dal 24/10/2026 ogni revisione confronta il sorgente con la baseline (`git show cae350d:source/engine.html`): funzioni e `const` di primo livello senza altri riferimenti (anche in `source/web/*.js`), azioni `ACT[...]` senza `data-act` né chiamate, handler `INP`/`CHG` senza campo `data-in`/`data-chg`. Il confronto con la baseline separa il debito preesistente da quello introdotto. (Lo script è un'utilità locale di revisione; i risultati stanno qui.)

## M7a2 P0/P1 (24/10/2026)
**Verificato:** 90 test; un intervals.icu finto prova import, non-cancellazione e sola lettura; il confronto prima/dopo prova che target e figure in uso non cambiano.
**Eliminato:** nessun codice (aggiunta isolata); un ramo ridondante nel calcolo dei passi «presi in prestito» semplificato prima della consegna.
**Nota sullo strumento:** la scansione segnala `icuExtras` come «non usata» perché la usano degli spread (`...icuExtras(x)`): falso positivo, non codice morto.
**Aperto:** nomi dei campi API da confermare alla prima sincronizzazione reale; equazione per la bici da potenza; METs 2024; nessun test sui dati reali (servono un export anonimo).

## Errore mio da dichiarare: `tests/check-build.js` era vuoto (24/10/2026)
Durante M0 un comando `sed` ha cancellato per errore il corpo dello script: da allora `check-build` terminava con successo **senza controllare nulla**, quindi i «release-check verdi» dei commit di build di M1, M2 e UX non includevano davvero il confronto dei file. I file di root erano comunque generati dallo stesso sorgente un attimo prima di ogni commit; ho ripetuto ora il confronto vero (index.html, sw.js, manifest: identici al sorgente) e ripristinato lo script con una guardia: se non confronta tutti i file, esce con errore 2.

## M4 (24/10/2026)
**Verificato:** 78 test (6 nuovi per M4: allineamento icona su 3 viewport con misura geometrica, rail/drawer con dimensione delle icone e persistenza dopo reload, Check-in su giorno passato, obiettivo km con storico, classifica Top, luogo del meteo); screenshot telefono/tablet/desktop; console pulita.
**Trovato e corretto durante il lavoro:** il passaggio del rail a `body.side-rail` aveva reso le icone a larghezza zero (regola `.side-btn .ic` con `!important` solo per 600–1023): ora vale anche ≥1024 e c'è un test sulle dimensioni delle icone.
**Eliminato:** CSS `.shop-date` e le regole `:has(.shop-date)` (non più usate; classe condivisa `.date-pick`), regole del rail duplicate nei due media query, vecchio `.item-name` a blocco.
**Aggiornato:** `.item-name` (struttura icona + `.nm`), `ACT/CHG` registrati dopo i loro registri (tre volte il test ha intercettato il TDZ prima della consegna).
**Aperto:** `Foods › Top` mostra solo la base (le correlazioni e i trend stanno nel Journal K5–K8); il luogo del meteo da geolocalizzazione non ha il nome della città (nessun servizio di geocodifica inversa senza chiave: resta «Current location (lat, lon)»).

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

## M3 Spesa: extra e spesa per intervallo (24/10/2026)
**Verificato:** lista spesa (righe, badge, totali, copia lista), «Bought»/`shop-done` con extra e ricorrenti, scheda Spending, report settimanale (stessa somma), export Excel (foglio acquisti con colonna `Type`), sync dei dati `shop`; 97 test (7 nuovi in `tests/shop-extras-spend.test.js`), smoke su 3 viewport, nessun overflow orizzontale.

**Eliminato / unificato:** la somma della spesa era ripetuta (`spendStats` ×3 filtri, report settimanale, «Most spent on» a parte): ora una sola `spendIn(da, a)`; sostituito il blocco «Most spent on, last 30 days» dalle righe «By product» dell'intervallo scelto; le tre tessere fisse «this week/month/year» dal selettore d'intervallo.

**Aggiornato:** backlog (B5, B6), roadmap, README test (nuovo file), `fmtEur` mostra sempre i centesimi sotto i 100 € (prima `€14,0`).

**Compatibilità dati:** nessuna migrazione. Campi opzionali nuovi: `S.shop.xhist`, `extras[].rec/due/est`, `buys[].x/est`; i dati precedenti si leggono invariati (un acquisto senza `x` è alimentare, come prima).

**Aperto:** lo scanner segnala `spendRangeOf` come «senza riferimenti» (falso positivo: usata con lo spread `...spendRangeOf(`); i 3 vecchi punti di debito (`FA_DEF`, `cFinal`, `plPrefs`) restano per M14; gli acquisti con prezzo stimato (`est`, alimentari come extra) entrano nello speso come già prima, ma la scheda non li distingue: valutare un'etichetta «di cui stimato» (B6, rifinitura).

## M4b Daily Journal (24/10/2026)
**Verificato:** 20 test nuovi (`tests/journal.test.js`): un tap = un valore salvato, valori non validi rifiutati, giorni vuoti ≠ zero, migliori/peggiori, Spearman contro valori calcolati a mano (anche con ripetizioni), soglie dei pattern e formulazione, unione per campo e snapshot del server, backup→azzeramento→ripristino, nessuna duplicazione col Check-in, 3 viewport senza overflow, card serale, promemoria (una volta, solo a giorno vuoto), AI solo aggregati, interruttore Features; suite completa 117 test, smoke su 3 viewport; controllo visivo di sheet e vista su telefono e desktop.

**Riuso (nessun componente nuovo parallelo):** `dayNavHTML`/`INP["day-pick"]`, `seriesChart`, `segBar`/chip, `kpi`/`stat-grid`, `TODAY_CARDS`, `SETTINGS_CARDS`, `FEATS`, `notify`/`remMark`, `Sync.sample`, `exportSheets`. I dati stanno nel documento mensile del log: sync, backup JSON e isolamento per account restano quelli esistenti.

**Eliminato:** nulla da rimuovere (funzione nuova); nessun campo del Check-in ripetuto.

**Compatibilità dati:** campo opzionale `jr = {p,m,e,s,n,t}` nel giorno del log; i dati precedenti non cambiano; `S.settings.jr` (`rem`, `at`, `ai`) opzionale. Una versione vecchia dell'app ignora `jr` ma, riscrivendo il mese, può non conservarlo: usare un solo dispositivo aggiornato prima di compilare.

**Aperto / dichiarato:**
1. Il promemoria serale funziona solo con l'app aperta (come gli altri promemoria locali); con push attivo il server non lo conosce ancora.
2. L'unione per campo protegge il Journal, non gli altri campi del giorno: per quelli resta «l'ultimo documento vince» (limite preesistente del sync).
3. Le correlazioni sono associazioni su dati osservati: con molti confronti qualcuna può essere casuale (dichiarato in schermata).
4. `VIEWS.progress` ha ancora una definizione base non più raggiunta (sostituita più sotto): debito preesistente, da togliere in M14.

## M4c Feedback su M4/M4b (24/10/2026)
**Fatto:** tasto Check-in sempre presente e primo nella riga di Today (pallino se manca qualcosa); le integrazioni (`suppCard(data)`) stanno anche nel Check-in, per il giorno aperto; volti disegnati (SVG a tratto unico) al posto delle emoji in tutto il Journal; «Top» tolto da Foods e il suo contenuto trasformato nel report Habits in Progress › Nutrition (`foodHabits`, `habitsView`).

**Eliminato:** il filtro «Top» di Foods, `topFoodsHTML`, `ACT["top-days"]`/`UI.topDays` (sostituiti da `habitsView`/`ACT["hab-days"]`/`UI.habDays`); il pulsante condizionale «Check in/Weigh in» (assorbito dal tasto fisso); le emoji.

**Verificato:** 127 test; il vecchio test I2 (m4) riscritto sul nuovo posto; nessuna emoji nel Journal (regex `Extended_Pictographic` su sheet, card, vista e Check-in); 3 viewport.

**Aperto:** NEAT dai passi giorno per giorno (D18/P2): modifica di formula, in attesa di approvazione esplicita; oggi il NEAT dei giorni senza kcal dell'orologio è la media dei 7 giorni precedenti.

## M4d Una regola sola tra piano, dispensa e lista (24/10/2026)
**Problema:** spuntare «mangiato» un cibo non lo toglieva dalla dispensa se non era stato «collegato» con un interruttore per singolo cibo (`it.pan`): comportamento non intuitivo.

**Regola ora:** il piano *prenota* ciò che c'è in casa (da oggi, primo giorno prima); *mangiare* toglie dalla scorta ciò che c'era (e ripristina se si deseleziona); la *lista* mostra solo ciò che manca; *comprare* aggiunge. I giorni registrati da più di 3 giorni non toccano la scorta di oggi.

**Eliminato:** `linkFromPantry`, `panMigrate` (e `S.shop.panV`), `NEW_PAN` con i 4 wrapper di `newItem`/`quick-add`/`pick`/`qty-save`, il wrapper di `shop-done` che collegava, quello di `runPlanner`, `ACT["qty-pan"]` e l'interruttore «From the pantry» nella scheda quantità, `ACT["pan-use"]` e la barra «N at home already · Use them», `data-pan`, il CSS `.pan-use`; `panLinked` → `planReserved`.

**Aggiunto:** vasetto sul pasto coperto/mangiato dalla dispensa (`stockPlan().itemCov`), riquadro «How the pantry works» richiudibile (ricordato), «Stock on» richiudibile (ricordato), «Add something else» in cima alla lista della spesa.

**Compatibilità dati:** nessuna migrazione: `it.pan` resta nei dati, ignorato; un pasto mangiato con la vecchia versione senza `took` restituisce l'intera quantità se deselezionato. Effetto visibile: i piani esistenti ora prenotano subito la scorta per tutti i cibi presenti in dispensa (prima solo per quelli collegati): la lista si accorcia di conseguenza.

**Test:** 11 nuovi (`tests/stock-model.test.js`); riscritti i test che codificavano il vecchio collegamento (stock, domain, pantry, scenario, m4).

## M6 Sicurezza e integrazioni (24/10/2026)
**Verificato:** 33 test nuovi (`security`, `intervals-writes`, `off`, `recipe-scan`, `ux-fit`); suite completa 171 test; nessun codice morto nuovo (scanner invariato rispetto a prima: `icuExtras` e `spendRangeOf` restano falsi positivi da spread).

**Eliminato:** `OFF_UNREACHABLE` (latch) → `offDown/offFailed`; doppia definizione di `lookupAndAdd` (base + ridefinizione) → una sola; costante `NO_PUSH` mai vera in `icu-direct.js`; regola CSS `.seg>button{overflow:hidden;text-overflow:ellipsis}` che tagliava le etichette.

**Aggiornato:** `docs/SECURITY_AUDIT.md` (nuovo), backlog ENG-06/07, G5, A5, roadmap.

**Compatibilità dati:** nessuna migrazione; campo opzionale `incomplete` sui cibi OFF in bozza; ciò che era in coda per intervals.icu con «Plan from intervals.icu» spento resta in coda (non viene inviato né cancellato).

**Aperto:** S-1 (chiavi nel documento cloud) in attesa di decisione; SRI su xlsx; restringimento di `connect-src`.

## M4f Ritocchi alle milestone fatte (24/10/2026)
**Verificato:** `tests/neat-steps`, `food-price`, `m4f`, `stock-model` aggiornato, `ux-fit` (nessuna etichetta tagliata a 360 e 390 px); suite completa; controllo visivo su telefono e computer.

**Eliminato:** `pantryHowHTML` e il suo stato (rimosso su richiesta); `shopRowHTML` base (debito n. 5 del report M1/M2: restava una sola definizione); `suppCard` base (il wrapper a chip è ora l'unica definizione, la lista grande è `suppListHTML`); chip del periodo della spesa (ora segmenti); CSS `.supp-*`; la regola «Next 7 days» → «7 days».

**Regressione mia dichiarata:** il menu laterale a rail/full (M4) rendeva il Timer e l'allenamento dal vivo larghi 208 px sul computer (la colonna del menu). Corretto con una regola più specifica e test.

**Formula (L1):** `STEP_KCAL` = 0.5 kcal/kg/km, passo 0.415 × altezza (ACSM, fonte primaria ancora da riverificare: il Compendium non era raggiungibile); approvata dall'utente il 24/10 con base appresa ≥ 14 giorni; stessi coefficienti dello shadow.

**Aperto:** da confermare sul telefono reale il lampeggio della barra (rimossa la causa probabile); S-1 chiavi nel cloud; le richieste aggregate L12–L21 nelle milestone indicate.

## M5 Recipe Engine e Meal Plan settimanale (24/10/2026)
**Verificato:** `recipe-engine` (10), `meal-plan` (13), `food-filters` (6), `recipe-scan`; suite completa; controllo visivo di editor ricetta, vista settimana (tablet e desktop), filtri.

**Eliminato / unificato:** nessuna duplicazione nuova; il filtro «Top» era già stato tolto in M4c; `foodSearch` ha ora un solo punto per i filtri (usato da Foods e Add); `lookupAndAdd` una sola definizione (M6).

**Trappola evitata dai test:** `ACT.fflt` registrato prima di `const ACT` avrebbe azzerato l'app (TDZ): lo smoke/err test l'ha segnalato subito e la registrazione è stata spostata dopo il registro.

**Compatibilità dati:** campi opzionali `recipe.time`, `item.snap` (solo sui pasti mangiati di una ricetta modificata o cancellata); nessuna migrazione: i pasti già mangiati prima di questa versione vengono congelati alla prima modifica della ricetta (non prima).

**Aperto:** la vista settimana non è offerta sotto 820 px (telefono): il piano giornaliero resta l'unica vista; il trascinamento con il dito su tablet usa il menu dell'elemento; i valori dei Foods modificati restano retroattivi sullo storico (solo le ricette sono congelate).


## M3b Spesa: supermercati, prezzi, sostituzioni, scansione (24/10/2026)
**Verificato:** `stores` (8), `stores-swap` (8: sostituzione a grammi/calorie uguali, ricette con storico mangiato congelato, annulla, flusso dal foglio Buy, scansione con prodotto sconosciuto registrato, scansione per depennare, 3 viewport); suite completa; scansione codice morto (nessun elemento nuovo oltre ai falsi positivi noti `icuExtras`, `spendRangeOf`).

**Eliminato / unificato:** nessuna implementazione parallela: la sostituzione riusa `freezeRecipeUses`, `mutateDay`, `destPick` e il flusso scanner/`lookupAndAdd` già esistenti; i prezzi per negozio passano da `eurPerG` (un solo punto).

**Trappola evitata:** i nomi `sw-*` erano già dello scambio esercizi in allenamento (`ACT["sw-pick"]` ridefinito sovrascriveva l'altro): i nuovi handler sono `sf-*`. Sempre cercare il nome in `ACT`/`INP` prima di registrarlo.

**Compatibilità dati:** `S.shop.stores/store/pref`, `prices[id].st`, `buys[].sid/offer` opzionali; senza negozi l'app si comporta come prima.

**Aperto:** la sostituzione tocca i pasti non mangiati da oggi in poi (non i giorni passati, per scelta); «Replace» non cambia i prezzi del vecchio prodotto (restano nello storico acquisti).

## M3b ritocchi (24/10/2026): swipe, Today, sezione negozi compatta
**Verificato:** `shop-quick` (3: pulsante Shopping nella riga rapida di Today su 3 viewport, ordine Bought → scanner → copia, swipe sulla riga), `stores` aggiornato, `stores-swap`; screenshot su 390 px di Today, lista, foglio Store, foglio Buy e foglio Replace.

**Eliminato / unificato:** la barra di chip dei negozi (`storeBarHTML`, `.st-bar`, `.st-first`) sostituita da una pillola sulla riga del riepilogo (`storePillHTML`, `.st-pill`); la scelta e la gestione stanno nel foglio «Store» (prima solo gestione); il conteggio «N to buy» non è più duplicato nell'intestazione; il carrello nell'intestazione di Today è sostituito dal pulsante nella riga rapida; tolte due regole CSS morte `.td-nudges [data-act="shopq-open"]`.

**Bug trovato dai test:** lo swipe orizzontale su una riga della lista cambiava anche scheda (gesto globale di cambio tab): `.shop-row` aggiunto alle zone escluse. Una regola CSS tardiva (`.sq-top`) annullava il layout a colonna del riepilogo: resa più specifica.

**Aperto:** lo swipe esiste solo su touch (su desktop resta il pulsante Replace nel foglio Buy).

## M3b ritocchi 2 (24/10/2026): negozio come campo del food
**Verificato:** `stores-food` (7: migrazione Lidl una tantum con Annulla, conversione del vecchio «negozio abituale», più negozi per prodotto, scansione dentro il filtro negozio, food a mano, campo «Bought at» nell'editor, brand e lista a tutto schermo su 3 viewport con ritorno dal selettore negozio) e `stores` aggiornato; suite completa.

**Eliminato / unificato:** `S.shop.pref[foodId]` (un solo negozio) sostituito da `food.stores` (elenco; migrazione automatica `storesMigrate`, poi `pref` sparisce); un solo punto di scrittura (`setFoodStores`/`addFoodStore`), un solo punto di lettura (`foodStores`/`soldAt`); `storeBarHTML` già rimossa nel passo precedente. Nuova opzione `full` dei fogli (`.sheet.full`) usata dalla lista da Today.

**Compatibilità dati:** campo opzionale `food.stores`; gli id di negozi rimossi restano nel food ma vengono ignorati in lettura, così Annulla della rimozione ripristina tutto. La migrazione Lidl si esegue una sola volta per account (`S.shop.mig.lidl`), 4 s dopo l'avvio, solo sui food dell'utente senza negozio; se esiste già un negozio «Lidl» viene riusato. Rischio noto: su un dispositivo nuovo che sincronizza foods e impostazioni in momenti diversi la migrazione potrebbe girare prima che arrivi il flag dal cloud (in tal caso non fa danni: i food con negozio non vengono toccati).

**Aperto:** i food predefiniti (non aggiunti da te) restano «ovunque» finché non imposti un negozio.
