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
1. Debito preesistente nella baseline: `FA_DEF`, `cFinal`, `plPrefs` sono definiti e mai usati → rimozione in M15.
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

**Aperto:** lo scanner segnala `spendRangeOf` come «senza riferimenti» (falso positivo: usata con lo spread `...spendRangeOf(`); i 3 vecchi punti di debito (`FA_DEF`, `cFinal`, `plPrefs`) restano per M15; gli acquisti con prezzo stimato (`est`, alimentari come extra) entrano nello speso come già prima, ma la scheda non li distingue: valutare un'etichetta «di cui stimato» (B6, rifinitura).

## M4b Daily Journal (24/10/2026)
**Verificato:** 20 test nuovi (`tests/journal.test.js`): un tap = un valore salvato, valori non validi rifiutati, giorni vuoti ≠ zero, migliori/peggiori, Spearman contro valori calcolati a mano (anche con ripetizioni), soglie dei pattern e formulazione, unione per campo e snapshot del server, backup→azzeramento→ripristino, nessuna duplicazione col Check-in, 3 viewport senza overflow, card serale, promemoria (una volta, solo a giorno vuoto), AI solo aggregati, interruttore Features; suite completa 117 test, smoke su 3 viewport; controllo visivo di sheet e vista su telefono e desktop.

**Riuso (nessun componente nuovo parallelo):** `dayNavHTML`/`INP["day-pick"]`, `seriesChart`, `segBar`/chip, `kpi`/`stat-grid`, `TODAY_CARDS`, `SETTINGS_CARDS`, `FEATS`, `notify`/`remMark`, `Sync.sample`, `exportSheets`. I dati stanno nel documento mensile del log: sync, backup JSON e isolamento per account restano quelli esistenti.

**Eliminato:** nulla da rimuovere (funzione nuova); nessun campo del Check-in ripetuto.

**Compatibilità dati:** campo opzionale `jr = {p,m,e,s,n,t}` nel giorno del log; i dati precedenti non cambiano; `S.settings.jr` (`rem`, `at`, `ai`) opzionale. Una versione vecchia dell'app ignora `jr` ma, riscrivendo il mese, può non conservarlo: usare un solo dispositivo aggiornato prima di compilare.

**Aperto / dichiarato:**
1. Il promemoria serale funziona solo con l'app aperta (come gli altri promemoria locali); con push attivo il server non lo conosce ancora.
2. L'unione per campo protegge il Journal, non gli altri campi del giorno: per quelli resta «l'ultimo documento vince» (limite preesistente del sync).
3. Le correlazioni sono associazioni su dati osservati: con molti confronti qualcuna può essere casuale (dichiarato in schermata).
4. `VIEWS.progress` ha ancora una definizione base non più raggiunta (sostituita più sotto): debito preesistente, da togliere in M15.

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

## M8a Food: duplicati, «At home», etichetta, edit dalla lista (24/10/2026)
**Verificato:** `foods-m8a` (6: edit dalla lista con ritorno al foglio Buy, duplicati per nome/barcode/valori e marca diversa, avviso in tempo reale e doppio Save, «At home» su 3 viewport, etichetta nell'editor con le quattro uscite, suggerimento di corsia con l'AI); suite completa; scansione codice morto; screenshot a 390 px.

**Eliminato / unificato:** il vecchio testo di «At home» con prezzi duplicati (le tariffe stanno già nella sezione prezzo) sostituito dal blocco nuovo; i due punti di arrivo della lettura etichetta passano da `labelDone` (se l'editor di un food è aperto confronta e aggiorna quello, altrimenti crea un food nuovo come prima).

**Compatibilità dati:** nessun campo nuovo (la data di scadenza usa il campo `exp` già presente in `S.shop.pantry`).

**Aperto (M8b):** C3 import ricetta da testo/immagine con AI e H10 workout a parole; il confronto etichetta non sceglie riga per riga (si usa tutto o niente); il controllo dei duplicati non esamina i food che arrivano da Open Food Facts salvati senza passare dall'editor (hanno comunque il controllo del barcode in `lookupAndAdd`).

## M8b Scansioni chiare, import ricetta, flussi Food (24/10/2026)
**Verificato:** `scan-clarity` (7: doppio scan dello stesso prodotto, stesso prodotto con altro barcode, azioni da Foods, flussi diretti invariati, «+ Food» con scansione e doppio salvataggio, filtro Drinks, marca nei duplicati per valori), `ai-import` (3: import ricetta con risposta AI simulata, 3 viewport, workout a parole), `stores-food` e `foods-m8a` aggiornati; suite completa; scansione codice morto; screenshot a 390 px.

**Bug riprodotto prima del fix (doppia scansione):** un prodotto OFF completo veniva salvato e passato alla quantità senza dire se era nuovo o già presente, e un secondo barcode dello stesso prodotto non veniva mai segnalato (il controllo duplicati esisteva solo nell'editor). Ora ogni scansione dal piano o da Foods passa da un risultato esplicito (`foundHTML`, `found`) e il salvataggio avviene solo con una scelta.

**Eliminato / unificato:** il campo «aggiungi negozio» nell'editor del food (`fd-store-new`, `fd-store-add`, `INP["fd-st-in"]`, stato `stNew`): i negozi si gestiscono solo dal foglio Store della spesa; il caso «campo kcal azzerato dalle macro» dopo un riempimento da OFF è evitato con `autoKcal = false`.

**Compatibilità dati:** nessun campo nuovo obbligatorio (`recipe.ai` opzionale sulla bozza, non salvato come requisito).

**Aperto:** la corrispondenza degli ingredienti importati usa la ricerca esistente (soglia `RI_GOOD`), da tarare con ricette reali; l'AI nell'interfaccia viene mostrata come «AI» (sostituzione di testo esistente) mentre i tag dei Food dicono «Claude»: incoerenza di terminologia da sistemare nel redesign (M13).

## Ritocchi 24/10 (pack, AI, spunte, ritorno, categorie)
**Verificato:** `ai-chain` (4: ordine dei servizi, quota/chiave/prosa/vuoto → successivo, servizio spento, tutti falliti, nessun «Claude» nel sorgente), `nav-return` (7: ritorno alla lista da scheda prodotto/editor/negozi/sostituzione/«In the cart», scorrimento, nessun ritorno dal tab Shop, annulla di «Finish», spunta riprendibile, categorie, pack diversi), `scan-clarity` aggiornato (Drinks); suite completa.

**Bug riprodotti prima del fix:** (1) una risposta non JSON o vuota del primo servizio AI non passava al successivo (test rosso senza la modifica a `shim.js`); (2) la spunta nella lista (`shop-check`, baseline) mette subito in dispensa e la riga spariva, restava solo un Undo di 5 s; (3) il filtro Drinks includeva ogni alimento in ml (passata, olio).

**Eliminato / unificato:** i testi «Claude» nel sorgente (`engine.html`) e la riscrittura a build-time in `build-web.js` (ora inutile: restano solo le sostituzioni di Tesseract); `storesBack`/`back` degli Store sostituiti dal ritorno generico; funzioni `claudeLabel/Digits/Picks`, `handleLabelClaude`, azioni `lb-claude`/`ch-claude` rinominate in `ai*`.

**Compatibilità dati:** nuovo campo `buys[].tick` (opzionale); `catV: 2` sugli alimenti riparati; l'interfaccia di runtime `window.claude` resta (è il contratto con lo shim).

**Aperto:** il ritorno `keep`/`_ret` copre solo la lista da Today: gli altri percorsi (Add → qty, check-in → giornale, ecc.) hanno ritorni propri e vanno censiti in M14; «Ticked today» e l'annulla di «Finish» vivono solo nella sessione corrente per lo snapshot dell'annulla (la spunta, invece, si può sempre riprendere).

## M9a Auto-plan su intervallo, senza sovrascrivere (24/10/2026)
**Verificato:** `planner-range` (4: riempimento di un intervallo con pasti già scritti e mangiati intatti e messaggio, «Start fresh» con conteggio e eaten conservati, selettore Today/7 days/Next week/Custom con limiti — da oggi, massimo 31 giorni, da > a corretto — e piè di foglio, 3 viewport); suite completa.

**Eliminato / unificato:** il calcolo delle date duplicato in `runPlanner` e nel foglio sostituito da `plannerDates`; l'anteprima di cosa viene toccato (`plannerPreview`) è unica per foglio e messaggio finale.

**Compatibilità:** gli ingressi esistenti (`scope: "day"|"week"`) continuano a funzionare; nuovi `next` e `range` con `from`/`to`.

**Aperto:** E2–E5 e C7 (motore di ottimizzazione con vincoli, svuota storage, strategie di spesa, Food Coach) sono lavori grandi e a rischio alto: vanno proposti a parte con criteri di completamento; M9b (consigli alimentari pre/post gara, L19) è il prossimo passo.

## Marca ovunque, allenamento a parole, verifica requisiti (24/10/2026)
**Verificato:** `brand-everywhere` (3), `ai-import` esteso (workout a parole da Free workout e dall'editor), suite completa; screenshot a 390 px dell'inventario.

**Eliminato / unificato:** il wrapper di `SHEETS.freewo` (regex sul testo) è sostituito da un elemento della sheet di base; i due modi diversi di mettere la marca (testo in `foodSub`, prefisso nella riga Foods, solo nelle liste della spesa) passano da `brandOf`/`bdHTML`; testi accorciati senza perdere informazione («/100 g», «set aside»).

**Aperto:** la vista settimanale ha la marca nella riga piccola ma può andare a capo in colonne strette; verificare con dati reali.

## M10a Pagina prima dell'avvio con modifiche suggerite (24/10/2026)
**Verificato:** `preview-suggestions` (6: editScript su rep/carico/serie/cambio con riga a due esercizi e prima occorrenza, elenco delle modifiche e di ciò che resta uguale, Apply/Undo, giornata «lighter», idee dell'AI filtrate sullo script con errore gestito, 3 viewport e player con i nuovi target); suite completa.

**Bug trovato dai test mentre rifacevo la pagina:** `startWorkout` richiamava ancora `proposalsFor` (rimossa): l'app non partiva solo su quel percorso; il caricamento a freddo (`err.js`) non lo vede, i test sì.

**Eliminato / unificato:** il meccanismo a interruttori `L.adj`/`adjFor`/`proposalsFor`/`lv-adj`/`lv-adj-all`/`holdAdd` (cambiava solo i target nel player) è sostituito da modifiche allo script; il wrapper del richiamo dell'ultima seduta (regex sul vecchio titolo) è diventato `recapNote` dentro la pagina; la scheda «Bring» (gear) ora segue le modifiche suggerite.

**Compatibilità:** le sessioni dal vivo salvate con `adj`/`holdAdd` si leggono senza problemi (campi ignorati); nuovo `L.sg` nel documento dell'allenamento in corso.

**Aperto:** le modifiche di tenuta (hold) e gli schemi di ripetizioni (5-3-2) non producono modifiche automatiche (restano in «Staying the same»); la logica di progressione è quella esistente basata sul RIR dell'ultima serie: affinamenti in M11.

## M10a ritocchi: badge Pantry, peso regolabile, anelli (24/10/2026)
**Verificato:** `preview-suggestions` esteso (9 test: passo come impostazione, −/+ e valore scritto, anelli con e senza lunghezza, badge della scheda Pantry); suite completa.

**Eliminato / unificato:** `fuelNav` era definita due volte (la seconda, più in basso, sovrascriveva la prima senza dirlo): ora una sola, `const`; `loadStep` non dipende più dal carico (1,25/2,5 fissi) ma dall'impostazione.

**Compatibilità:** nuovo `settings.fit.player.loadStep` opzionale (default 2); `L.sg.over` solo nell'allenamento in corso.

**Aperto:** il verso «strap più lunga = anelli più bassi» è una convenzione (il campo si chiama «Ring length»): se la tua è l'altezza dal suolo, dimmelo e inverto il segno; il consiglio a parole resta valido in entrambi i casi.

## M10b Pagina «Ready to start», attrezzo, anelli a quarti, meteo, orario, «How it will run» (24/10/2026)
**Verificato:** nuovo `pre-start.test.js` (11 test): ordine del menù, «Don't have it» (anelli → Inverted row/Push-up, kettlebell → Jump squat, cintura → senza zavorra, Undo da toast), campo anelli a ¼, scarto della registrazione (piano intatto, Undo), «Full sync» (finestre più ampie), pagina su tre viewport, riga meteo (feels-like, probabilità, durata, vento, grafico con fascia), orario da intervals.icu (lettura, scrittura con «Plan from intervals.icu», nessuna scrittura con l'impostazione spenta), «How it will run» della corsa (somma = script, meteo atteso, nel foglio e nella pagina); `preview-suggestions` aggiornato al passo di default (1 unità); screenshot a 390/820/1440 px.

**Eliminato / unificato:** la scheda «what to bring» entra nella pagina (via il wrapper `gearInPreview` dalla pagina dell'allenamento, resta per la corsa); CSS `.pv-ready` della vecchia pagina; i due modi di cancellare una registrazione (`wh-del` e il nuovo) condividono `discardRecording`; il testo meteo è una sola funzione (`wxSay`) usata dalla riga e da «How it will run».

**Compatibilità:** `planned[].at` (HH:MM) opzionale: letto da `start_date_local` di intervals.icu, scritto solo con «Plan from intervals.icu»; `settings.wx` invariato; la cache meteo senza `ap` si riscarica da sola.

**Aperto:** la tabella degli attrezzi → varianti (`GEAR_ALT`) copre gli esercizi più comuni; per gli altri dice «no variant» e si cambia con Edit. Le corse senza zone/passo mostrano l'intensità come «non specificata».

## M10c Today alta, «Ready to start» piatta, chevron, deficit %, live, scarico, orario (24/10/2026)
**Verificato:** nuovo `m10c.test.js` (11 test): tessere, Yesterday e Supplements su tre viewport (nessun overflow), niente «How was today?», sezioni senza box, chevron su select/details, deficit % (percentuale del TDEE, tetto 15%, kcal prioritario, campo in Settings), avviso anelli e varianti, consiglio dopo una serie dura (applica/Undo), scarico intelligente (salta/forza) e riga nella pagina, orario modificabile con sync immediato (PUT con l'orario), riga meteo su desktop e telefono; `journal` e `ux-habits` aggiornati; screenshot a 360/390/1400 px.

**Eliminato / unificato:** `journalCard`, `ACT["jr-quick"]`, `JR_FROM_H` e il CSS della card; CSS vecchio di Yesterday/Supplements/chip (`.yd`, `.sp-chip`…); `suggestHTML` e il suo CSS (residuo della vecchia pagina); frecce native e simboli ▾/▴/+/– sostituiti da un solo chevron; la nota «planned with …» è letta dal live come avviso (non come nota libera).

**Compatibilità:** `settings.fit.phases[].pct` opzionale (solo Maintenance con kcal 0); `train.progs[].deloadMode` e `deloadOver` opzionali; `planned[].at` già introdotto in M10b; la nota `(planned with rings · was …)` resta nello script (letta anche da intervals.icu come testo).

**Aperto:** «live buggato»: ho sistemato ciò che ho riprodotto (superserie lunghe, tally tagliato, placeholder troncato, campo carico fuori dalla scheda); se vedi ancora testi coperti mandami uno screenshot della schermata. La riga meteo compare solo con una sessione outdoor pianificata e un luogo impostato (altrimenti «Set location»).

## M10d Notifica unica, orari legati ai pasti, toast, suoni, profilo, scarico Season, meteo (24/10/2026)
**Verificato:** nuovo `m10d.test.js` (9 test): orari «after lunch» che seguono gli orari dei pasti, una sola notifica locale / push / file calendario per più integratori allo stesso orario (e «Taken» li segna tutti), funzione server che scarta il gruppo solo se tutto preso, toast fermo a tutte le altezze di scroll sopra il dock, suoni (note ≤ 1 kHz con decadimento, passa-basso), messaggio profilo (≤ 14 righe, campi richiesti), scarico Season saltato/mantenuto, grafico meteo sempre presente e GPS una volta al giorno; screenshot a 390 px.

**Eliminato / unificato:** i tre punti dove si componeva la notifica di un integratore (locale, push, calendario) ora passano da `suppMessage` / `suppSlots`; l'inviluppo piatto dei suoni (sostegno fisso) sostituito da attacco e decadimento; il calcolo della costanza per lo scarico (`adherenceBefore`) è uno solo per programmi e Season.

**Compatibilità:** `settings.mealTimes`, `settings.supps[].times` può contenere `~b`, `~l+`… (i vecchi orari «HH:MM» restano validi); `settings.fit.profile.name/surname`; `train.period.deloadMode`; `settings.wx.gps/gpsDay`. La funzione `engine-push` va ridistribuita per i promemoria raggruppati (con quella vecchia funzionano ma vengono inviati anche se hai già segnato l'integratore).

**Aperto:** vista unica della settimana (L73) in M13; la posizione GPS resta «Current location (lat, lon)» perché un nome di città richiederebbe un servizio di geocoding inverso esterno.

## M10e Story senza scatti e scontrino da foto (24/10/2026)
**Verificato:** `m10e.test.js` (4 test): la story ridisegna l'immagine sul posto (stesso elemento, stesso scroll, campo di testo con cursore, chip aggiornati; il test fallisce sul codice precedente), scontrino con AI simulata (cibi noti in dispensa con quantità dal peso stampato o dal formato, prezzo per negozio, depennati dalla lista, nuovi cibi solo in elenco), Undo, scontrino già caricato, riga senza formato elencata invece di indovinata, bottone su tre schermi; screenshot a 390 px. Suite completa in background.

**Eliminato / unificato:** la riscrittura dell'intera scheda a ogni ridisegno della story (`renderSheet()` in `storyDraw`); il prezzo e il negozio dello scontrino usano le stesse strutture di «Finish shopping» (`S.shop.prices[id].st[sid]`, `buys`, `addFoodStore`).

**Compatibilità:** `S.shop.rcTodo` e `S.shop.receipts` opzionali; `buys[].receipt` e `tick` come per le spunte della lista (si annullano con la stessa spunta); funzione AI «receipt» tra i servizi attivabili in Settings › AI (serve un servizio che legga le immagini).

**Aperto:** lo scontrino richiede un AI con visione; un lettore OCR locale non è previsto (righe e prezzi non sarebbero affidabili); i cibi nuovi non vengono creati da soli, come richiesto.

## M11a Settimana unica, giorno dell'allenamento, sezioni coerenti, icone, scarico, PB, volume (24/10/2026)
**Verificato:** nuovo `m11a.test.js` (8 test): spostamento del giorno con Undo e sync immediato, icone allineate, un solo modello di sezione (Programs/Workouts senza box, «Ready to start» con la stessa intestazione), settimana su tre viewport (7 giorni, tap apre la scheda, navigazione, menu laterale, card di Today), scarico in Settings, PB automatici (primo risultato = riferimento, secondo = PB, PB di corsa), volume 1–12 settimane contro il calcolo a mano, «Full sync» dal pulsante; `pre-start` aggiornato; screenshot a 390/820/1400 px.

**Eliminato / unificato:** la seconda definizione di `icuKick` (che sovrascriveva la prima e ignorava «Full sync») è sparita: una sola, con `force` e `quiet`; `.eyebrow` nelle sezioni di «Ready to start» (ora `.section-h`); la card del diario in Today (M10c); un'altra `volumeHTML` già esistente (nome in conflitto) ha imposto `volWindowHTML` per la nuova.

**Compatibilità:** `wsess[].pb` e `calis[].auto` opzionali; `UI.wk` e `UI.volW` solo di sessione; i record automatici sono normali righe di `train.calis`.

**Aperto:** il modello di sezione piatto è applicato a «Ready to start» e a Train › Workouts; le altre pagine (Fuel, Progress, Today) vi passeranno in M13 con il resto del redesign. PB di corsa solo da gare/PB inseriti; i PB dalle attività importate arrivano con gli split (G3).

## M11b Corsie una volta, una freccia, riga workout unica, Settimana, scontrino che impara, segnaposto, PB da confermare (24/10/2026)
**Verificato:** `m12.test.js` (5 test: marcatore `engine.catfix`, una sola freccia nei gruppi di Settings, riga di Workouts con le stesse parti di quella di Today, scontrino che impara — abbinamento, `rcMap`, riconoscimento automatico al secondo scontrino, prezzo per supermercato, creazione dal foglio cibo —, segnaposto con stima AI, Invio e tag «Placeholder») e `m11a.test.js` aggiornato (Settimana solo pasti, PB come suggerimento). Screenshot a 360/390/820/1400 px della Settimana.

**Eliminato / unificato:** le righe di workout scritte a mano in Workouts e Programs (ora `woRow`, come Today); la scrittura automatica dei record di calisthenics in `lv-save` (sostituita dal suggerimento `pb-add`/`pb-no`); la vecchia griglia della Settimana con allenamenti e integratori; il doppio chevron in Settings (CSS).

**Compatibilità:** `S.shop.rcMap` opzionale; `items[].ph` opzionale (l'elemento è un normale cheat meal con tag); `wsess[].rec` opzionale; marcatore `engine.catfix` solo locale.

**Aperto:** la sottostima per dispositivo (D20) e le prestazioni (P1) sono pianificate in M7b e M14/M15; l'AI sullo scontrino non è provata su uno scontrino vero (richiede la tua chiave); l'abbinamento per parole singole può proporre cibi poco pertinenti (si sceglie a mano).

## M11c Promemoria, story e correzioni di design (24/10/2026)
**Verificato:** `tests/m11c.test.js` (12 test, scritti prima di ogni correzione e falliti sul codice di partenza): card di Today, «Ready to start» forza e corsa senza riquadri su 390 e 1440 px, larghezza del contenuto a 1440/1920/2560 px, giorno selezionato del calendario senza contorno, stima smart solo nel cheat meal (menu del pasto anche vuoto, foglio Add, Invio con AI, preset senza AI), pasto fuori che esce da lista e prenotazioni della dispensa con la riga «meals out», titolo Shopping intero a 390 px, campi orario ≥ 140 px, controlli periodici (default, persistenza dopo reload, scadenze, riga in Today, notifica il giorno della scadenza e ogni 7 giorni, coda push, file calendario), story senza `fillText` compressi né testo fuori dall'immagine e anteprima ferma. Suite completa e smoke sui tre viewport verdi; screenshot a 390/1440/1920/2560 px.

**Eliminato / unificato:** le due regole CSS che appiattivano le card di Today; la voce «Placeholder» del menu del pasto e del foglio Add, l'azione `open-ph` e la modalità `ph` del foglio cheat; la voce doppia «Make it a cheat meal» (ora una sola «Cheat meal», sempre presente); gli avvisi «Lactate retest due» / «Calisthenics retest due» di `loadState().alerts` e il loro testo nel Coach (sostituiti dalla riga «Check-ups due» di Today, senza doppioni); il contorno `.cv-d.sel::after`; le compressioni `maxWidth` del canvas della story; i limiti `max-width` di 1180/1380 px del contenuto oltre i 1440 px.

**Compatibilità:** gli elementi `items[].ph` già salvati restano validi (sono cheat meal) e si mostrano con il tag «Cheat»; `S.settings.reminders.checks` è opzionale (default 28/28 giorni, i test seguono `run.retest`); `run.retest` resta l'unica fonte dell'intervallo dei test.

**Aperto:** la compensazione dello sgarro ribilancia i giorni toccati verso il loro obiettivo e può aumentare le porzioni se il piano era sotto target (comportamento esistente, da rivedere in M7b); la striscia «This week» di Today ha ancora il cerchio con contorno sul giorno corrente (da valutare nella verifica di design di M14); su desktop la story resta in un foglio a una colonna (anteprima accanto alle opzioni da valutare in M13).

### Revisione del lavoro della sessione precedente (24/10/2026)
**Trovato e corretto (test scritto prima):** `movePlanned` dichiarata due volte (l'ultima vinceva in silenzio): trascinamento e «copia» della Settimana spostavano invece di copiare; ora la seconda si chiama `movePlannedTo`. `chartW()` limitava i grafici a 688 px mentre il contenitore è largo oltre 1000 px: testi degli assi ×1,6 su PC; etichette dell'asse X duplicate (intervallo di 1 giorno) o a contatto (grafici settimanali sul telefono). Collisione di classe CSS `.st-row` (usata da un'altra schermata) evitata rinominando le nuove in `sty-*`.
**Strumento:** `cd tests && node layout-audit.js [cartella]` percorre 36 schermate/fogli su 4 viewport (390, 820, 1440, 1920) e segnala overflow orizzontale, elementi fuori schermo, testo tagliato, testo sovrapposto, bersagli troppo piccoli; con una cartella salva gli screenshot. `AUDIT_EMPTY=1` usa un utente senza dati. Stato dopo le correzioni: 4 segnalazioni, tutte la stessa riga di sotto-menu che scorre di lato sul telefono (con fade ai bordi, voluta).
**Controllato senza difetti:** nessuna `const` duplicata; ogni `data-act` ha il suo gestore (`story-acc` è registrato in un ciclo); nessuna dichiarazione di funzione duplicata oltre a `movePlanned`.
**Aperto:** la riga di sotto-menu scorrevole mostra l'ultima voce tagliata dal fade (da valutare in M13: passare a un menu a due righe o a una lista); 19 funzioni «avvolte» da wrapper più in basso (rischio noto, da consolidare in M15).

## M11d Giornata più fluida (24/10/2026)
**Verificato:** `tests/m11c.test.js` (calorie scelte con un tocco e nome facoltativo, nome compilabile dopo, scorciatoie, righe e notifiche pre-allenamento con orario/anticipo/quali/messaggio/dove, notifica una sola volta, impostazioni dopo reload, sposta-saltato con regola dei giorni e Undo, etichette delle impostazioni intere sui tre formati), `tests/m10c.test.js` (card Reminders). Suite completa e `layout-audit.js` verdi; screenshot a 390/820/1440 px.
**Eliminato / unificato:** `suppCard()` e il CSS `.sp2-*` (assorbiti dalla card Reminders `.rm-*`); la riga «Check-ups due» in «Coming up» (ora in Reminders); il gancio provvisorio `extraReminders`; la nota «Next: … at …» (l'ora è su ogni riga); le righe «etichetta + controllo» della story diventate `.opt-row` generiche, usate anche in Settings.
**Compatibilità:** `S.settings.reminders.pre` opzionale (default 2 h, dure o lunghe, con quantità, Today + notifica); l'elemento `items[].ph` e il vecchio nome «Cheat meal» restano leggibili (ora mostrati come «Treat»); le scorciatoie vecchie «Weigh in» e «Timer» non sono più nel manifest ma i loro gestori `?a=` restano.
**Aperto:** le notifiche pre-allenamento con l'app chiusa richiedono le notifiche push configurate (come gli integratori); «Move to» propone solo giorni della settimana corrente.

### M11d, seconda parte (25/10/2026)
**Verificato:** `tests/m11c.test.js` (calcolo a mano per 80 kg del pre-allenamento con e senza pasti nella finestra, icone esistenti, guida all'installazione per browser). **Unificato:** tre testi diversi sul pre-allenamento (riga Reminders, nota della card, consiglio del coach) ora vengono da `preFuel()`; il consiglio del coach non ripete la parte «prima» quando il promemoria è acceso. **Corretto:** test `stock-model` che dipendeva dal giorno della settimana (falliva solo di domenica). **Aperto:** formula pre-allenamento da approvare; valori «durante» oltre 2,5 h da verificare sul testo.

## M11e Workout Score (25/10/2026)
**Verificato:** `tests/m11c.test.js` (3 test: forza con completamento/progresso/sforzo/volume e somma pesata, corsa facile non penalizzata vs dura, pacing e tempo, assenza di dati, idempotenza, sezione a schermo su 3 viewport senza testo tagliato, piano salvato con la sessione). Regole in `docs/WORKOUT_SCORE.md`.
**Aggiunto/unificato:** `workoutScore()` unico per forza, corsa e altri sport; `planSummary(L)` salvato in `wsess[].plan` (opzionale: le sessioni vecchie senza piano perdono solo la parte Completion); sezione `.sc` flat nella scheda dell'allenamento; punteggio nel messaggio di salvataggio. Nessun codice sostituito.
**Compatibilità:** `wsess[].plan` opzionale; nessun dato esistente cambia.
**Aperto:** pesi e soglie sono scelte dell'app, da tarare con dati reali; H5 completo (cadenza, intervalli per fase, contesto) e un colpo d'occhio nello storico (punteggio nelle righe) non fatti.

## M11f BMI, bilancio settimanale, foto (25/10/2026)
**Verificato:** `tests/m11c.test.js` (BMI con fasce e casi limite, totale settimanale = somma indipendente di assunzione − TDEE, navigazione tra settimane, nessuna etichetta del grafico che tocchi un'altra o esca dal grafico; sincronizzazione foto con un cloud simulato: caricamento tardivo, nessun doppio caricamento, errore «cartella non pronta», secondo dispositivo che scarica e conserva). **Trappola evitata dal test:** `ACT["wbal"]` registrato prima della dichiarazione di `ACT` (TDZ, avvio azzerato) → spostato dopo.
**Aggiunto:** `bmiOf/bmiHTML`, `weekBalance/weekBalanceHTML`, `photosSync/photosStatus/photosSyncHTML`. **Nessuna eliminazione.**
**Compatibilità:** `S.body.photos[].cloud` esistente; le foto senza `cloud` vengono caricate al primo avvio collegati.
**Aperto:** la cartella cloud `progress` e le sue policy devono esistere nel progetto Supabase (`supabase/schema.sql`); finché l'account non è collegato le foto restano locali.

### Guida all'installazione rimossa (25/10/2026)
Eliminati `installGuide`, `installCard`, `ACT["install-now"]`, i listener `beforeinstallprompt`/`appinstalled`, il CSS `.inst*`, la riga in Settings › Account e il suo test. Restano le scorciatoie dell'icona nel manifest.

## M11g Analisi attività, score severo, Lab (25/10/2026)
**Verificato:** `tests/m11c.test.js` — motore `analyseStreams` su corse sintetiche calcolate a mano (split, migliori sforzi, decoupling 3,39%, EF, battiti/km, sosta, dislivello); score severo con punti calcolati a mano (CV 5% = 60, collina = 82, secondo tempo +8% = −39, decoupling 8% = 50, ripetute regolari/calanti/irregolari); flusso intervals.icu con `fetch` simulato (una sola scarica, rifiuto spiegato e non ripetuto); Lab con monotonia/strain di Foster, pendenza del peso con R², aderenza, efficienza, migliori sforzi; sezioni a schermo sui tre viewport.
**Aggiunto:** `analyseStreams`, `icuRecording/icuAnalyse/anAttach`, `analysisSection`, ramo severo di `workoutScore`, `labData/labView`. **Eliminato:** guida all'installazione.
**Compatibilità:** `wsess[].an` opzionale (riassunto compatto, nessuno stream salvato); le sessioni senza `an` mantengono il calcolo precedente.
**Non verificato dal vivo:** i campi esatti di `/activity/{id}/intervals` di intervals.icu (letti in modo difensivo; senza ripetute l'analisi usa solo lo stream); lo stream `velocity_smooth`/`moving` (se rifiutato si riprova con i quattro tipi già usati per il percorso). **Aperto:** cadenza e potenza non analizzate (unità non uniformi tra dispositivi).

## M11h Level, PDF recap, foto cloud (25/10/2026)
**Verificato:** `tests/m11c.test.js` — posizione sulla scala con valori calcolati a mano (22:41 = linea Intermediate, 20:00 = 3,916, 10 km 41:30 ≈ 5K 20:00, donne, oltre Elite, sotto Beginner, 13 trazioni = 3, tenuta 30 s = 3), ingressi (finestra 365 giorni, solo trazione/dip zavorrati, stadi di front lever/planche), stima del tempo (pendenza 0,1015 livelli/mese, nessuna stima se piatto, in calo, breve o elite), schermata su telefono e PC (nessuno scroll laterale), utente vuoto; PDF (larghezze Helvetica, struttura, testo estratto); guida foto cloud. Screenshot 390/820/1440 guardati; `layout-audit` ora copre Lab e Level.
**Aggiunto:** `LV_*`, `lvPos/lvLabel/lvEq5Pos/lvRunner/lvCalis/lvEta/levelView`, segmento Progress › Level, `PHOTO_SQL/photoFolderErr`, `workoutPdf` e `ACT["wo-pdf"]`, `docs/LEVELS.md`. **Eliminato:** nulla (nessun codice sostituito).
**Aperto:** le scale di Skill (tenute, stadi di lever/planche) non hanno una fonte autorevole: etichettate come approssimative; le linee di forza e ripetizioni sono la mediana di scale pubblicate per gli uomini, donne al 60% (convenzione, non misura). Nessuna correzione per età nel runner (versione «dura»). Il bucket delle foto va creato dall'utente con lo SQL.

## M11i Livelli duri, batteria, goal, foto numerose (25/10/2026)
**Verificato:** `tests/m11c.test.js` — Level (posizioni e percentili calcolati a mano con linee più dure, ingressi con skill non registrate a 0, consigli spinta/tirata, lunga/corta, punto di forza); batteria (90,72 / 68,93 / 37,66 % con notti di 8 h, una notte da 5 h → 79,30, fisso a 5 h → 77,94, pisolino 30 min → 64,26, notte → 75,95 e 90,72, HRV −1,711 DS → −11,98, FC a riposo +6 → −4,8, fatica di ieri 3,62, rampa e proiezione dell'allenamento, schermate su telefono e PC); goal (data di raggiungimento persistente, per sport, tempo medio 54 giorni, il numero che scende non toglie il traguardo); foto (50 giorni a pagine, mesi, confronti rapidi, reminder mensile e frequenza). Screenshot 390/820/1440 guardati; `layout-audit` copre ora Lab, Level, Goals e il foglio della batteria.
**Aggiunto:** `lvPct`, `lvStage`, `lvInsights`, `LV_STR_KG`; `bt*`, `batteryCard`, `SHEETS.battery`, `ACT["bt-open"/"bt-nap"]`, campo `nap/napAt` del giorno, `FEATS.battery`; `goalReached/goalsSettle/goalStats/goalsSummary/goalHistory`; `ckEverySel`, `ppRemind`, `pp-more`, `pp-preset`. **Rinominato:** prefisso CSS `lv-` → `lvl-` nel Level (`lv-` resta del player live). **Sostituito:** il campo numerico dei giorni dei check-up con un menu di frequenze; il default delle foto passa da 28 a 30 giorni.
**Compatibilità:** `goals[].doneOn` opzionale (assente = calcolato come prima); `logm[].nap/napAt` opzionali; nessuna migrazione.
**Aperto:** batteria non validata su dati reali (solo un valore HRV/FC al mattino, nessuno stress diurno); linee di ripetizioni e skill del Level sono dell'app (nessuna tabella autorevole); il rapporto Strength Level è letto a 80 kg di riferimento; il PDF e l'analisi intervals.icu non provati dal vivo (milestone precedenti).

## M11j Race circuits, batteria in evidenza, calcolatori (25/10/2026)
**Verificato:** `tests/m11c.test.js` — race: preset → stazioni (6 e 7, 50 e 65 rep), clock e voce a ogni tocco, undo, split [12, 29, 11, 48, 12, 13] e tempo 125 s salvato come tempo del circuito, ranking (posizione 2 di 5, tempo del 2° posto, gap −5 s, piano di split ×130/125, s/rep per esercizio); calcolatori (sei formule di 100 kg × 5 calcolate a mano, media 115,79, pull-up zavorrata con peso corporeo, carichi per rep, passo 4:09/km, Riegel e VDOT); battery card nuova. Screenshot 390/820/1440 guardati; `layout-audit` copre foglio calcolatori e schermata race.
**Aggiunto:** `race*`, task `race`, `raceSection`, `ACT["lv-step"…]`, `calc*`, `SHEETS.calc`, prefissi CSS `rce-`/`rk-`. **Corretto:** collisione con la classe esistente `.rc` (scontrino): il race usa `.rce`. **Sostituito:** la riga compatta della batteria con l'anello (stesso `ACT["bt-open"]`).
**Aperto:** il PDF del ranking non è arrivato: nessuna soglia di qualificazione inventata; regolamento 2026-27 (fase zavorrata) non verificato; eventuale conteggio automatico delle ripetizioni (L27) non fatto.
**Corretto in più:** il sotto-menu di Train › Stats (Fitness, Running, Strength, Records, Gear) usciva di 16 px dal telefono a 390 px (4 rilievi del `layout-audit`): padding e corpo ridotti sotto i 430 px; l'audit ora dice «nothing found» (42 schermate × 4 viewport). Aggiunto il **Stage** (Fire Set + pausa saltabile + taglio) con la somma dei due tempi del giorno.

## M11k Anteprime grafiche per sport, race con riposo e ranking a tappe (25/10/2026)
**Verificato:** `tests/m11c.test.js` — grafico endurance (12 barre, Z4 più alta di Z1, Z1 25′ 63 % / Z4 15′ 38 % su 2400 s, assi ogni 10′), forza (righe per esercizio, 42 rep e 180 kg di carico aggiunto), blocchi (race, EMOM a 10 minuti, Tabata a 8 round, stazioni); race (limite 6′ per circuito, schermo con tutto il circuito, riposo scelto 8 min → 480 s, chip dell'editor, «Save as a workout» che aggiorna invece di duplicare); ranking con la **tabella reale della tappa dell'utente** (9 atleti letti, posizione 4ª sul Fire Set, 3ª sul taglio e sul totale con 58,0 + 90,0 s, il 2° posto a 2:15.99 con distacco di 12,01 s, due tappe insieme: 5° su 19, piano di split ×52,07/125). Screenshot 390/820/1440 guardati (anteprima corsa, forza, stage, schermo live).
**Aggiunto:** `woProfile/woSets/woBlocks/woChart`, `raceTable/raceCompare/raceAt/racePos`, `raceCells/raceStrip/raceStageCard`, `raceStageScript`, `ACT["we-race"/"race-save"/"race-stage-add"/"race-stage-del"]`; la riga «pr-bar» piatta dell'anteprima corsa è sostituita dal profilo a zone (stesso `runOverview`). **Eliminato:** `raceTimes/raceRank` (sostituiti dal lettore di tabelle), CSS `rce-nx/rce-dots`, la riga duplicata durata/km sotto il grafico. **Compatibilità:** `S.train.race.rank` (versione precedente) migra in una tappa.
**Aperto:** il Level non usa ancora il ranking; le anteprime non mostrano pace/bpm sull'asse (solo zone); nessun grafico per nuoto a vasche (usa il profilo a zone).

## Hotfix: nomi di azione registrati due volte (26/10/2026)
**Trovato:** `ACT["race-save"]` e `ACT["race-start"]` del modulo Race circuits (M11j) sostituivano in silenzio le azioni della gara in calendario (Salva / Avvia); e, già da M10e, `ACT["rc-new"]` e `ACT["rc-del"]` della lista scontrini sostituivano «+ Race» (Train › Season) e il pulsante che toglie un ingrediente dall'editor delle ricette. Nessun test li copriva.
**Corretto:** il modulo race usa `circ-start`/`circ-save`; gli scontrini usano `rcp-new`/`rcp-del`; rimosse 5 definizioni morte (`cal-view` e `rep-open` doppie, `fd-del`/`fd-unhide`/`fd-unhide-all` della versione prima del cestino). **Test:** regressione sulla gara in calendario (salva e avvia) e `tests/registry.test.js`, che fallisce se un nome ACT/CHG/INP è registrato due volte senza essere un wrapper. **Aperto:** `ACT.export` ha ancora due definizioni (la prima è codice morto sostituito da `bkSaveNow`), tollerata in `registry.test.js`.


## M11l Regolamento Fire Set rev. 5, pisolini, arm band, stima tempo, grafici (26/10/2026)
- **Verificato**: suite completa (smoke + tutti i `*.test.js`, compreso `registry.test.js`), `layout-audit.js` su 390/820/1440 («nothing found»), screenshot di Today, Ready to start, editor, foglio Race, batteria.
- **Eliminato/sostituito**: i grafici «una riga per esercizio» di forza/calistenica sono sostituiti da `woTimeline` (grafico nel tempo con una barra per serie; serie, EMOM, Tabata, AMRAP, race); `woChart` delega a `woProfile` (corsa a zone) o `woTimeline`. Il campo singolo `nap/napAt` è ancora letto (compatibilità) ma si scrive `naps[]`.
- **Aggiornato**: preset Fire Set da `RACE_BLK` (3 blocchi, cap unico), script `race … blocks 6/12/18`, azioni `lv-race-stay` / `lv-race-drop`; `estimateScript` ora usa `estimateRaw` (riposo implicito) × rapporto personale `caliCal`; `gearList(script,date,sport)` con attrezzatura fissa per sport.
- **Aperto**: circuiti di taglio delle altre categorie e finale (documento ufficiale dei circuiti non disponibile); anteprima/estimate non validati su dati reali; la batteria resta non validata su dati reali.

## M13a Today, Records, sonno, massa magra (26/10/2026)
- **Verificato**: suite completa; layout audit (aggiunte le schermate `records-open` e `sheet-sleep`); screenshot di Today, Records e foglio batteria su 390/820/1440; bug dei campi riprodotto prima del fix (`tests/m13a.test.js`).
- **Eliminato**: `batteryCard` e il suo CSS (`.bt-row`, `.bt-ring`, `.bt-m`, `.bt-eb`): la batteria è una tessera della riga in alto; la tessera Balance (duplicava la card Fuel) e la tessera gara (duplicava «Coming up») escono dalla riga in alto; l'azione `bt-nap-add` diventa il form `btnap`; il CSS a griglia di `.td-s`.
- **Aggiornato**: `woRow` (stessa riga in Today, Workouts e Programs); `RACE()` ora modifica l'oggetto salvato invece di copiarlo (le azioni che usavano due volte `RACE()` perdevano le scritture); `recFold` avvolge `trainRecords`; `REC_KEY` unifica modifica ed eliminazione di ogni risultato (prima solo corsa, calistenica e misure); `ACT["lean-open"]` registrato dopo la dichiarazione di `ACT` (il primo tentativo azzerava l'app: la trappola TDZ).
- **Aperto**: sezione Tools con timer e calcolatori; riduzione dei sottomenu di Progress; M7b (formule nutrizionali approvate); redesign delle altre schermate; il bisogno di sonno non è ancora stimato dai dati dell'utente; PDF/OCR dei ranking non letti (solo testo, CSV e pagina salvata).

## M13b Tools, Stats a sezioni, Progress più snello (26/10/2026)
- **Verificato**: suite completa e layout audit (aggiunte `tools-timers`, `tools-calc`, `tools-plates`), screenshot 390/1440; test numerici a mano per ogni calcolatore.
- **Eliminato**: `SHEETS.calc` e le azioni `calc-tab`, `calc-km`, `INP.calc` (il calcolatore a foglio è sostituito dalla pagina Tools, che riusa `calcRM`, `calcLoads`, `calcPace`, `calcOut`); `tmrSetup` (la pagina del timer è la scheda Timers di Tools); la vecchia `VIEWS.progress` morta (sovrascritta più avanti); `recFold`/`REC_SUM` come casi particolari: ora `foldView`/`foldOne`/`FOLD_SUM` per ogni scheda.
- **Aggiornato**: `navFix` porta le vecchie rotte (`goals`, `lab`, `level`) alle nuove sezioni; l'elenco di swipe di Progress; test su Lab/Level/obiettivo km/larghezza del timer; `RACE()` non copia più.
- **Aperto**: M7b (formule), test-workout → record, DOMS nel Journal e nei suggerimenti, stima del peso nei buchi, import ricetta da link, riscrittura dei report, redesign delle altre schermate; non so quale grafico «kcal x/y/z short» fosse buggato (ho sistemato la dentellatura di «Last 6 weeks»).

## M13c DOMS, test day, stima del peso, report, ricetta da link (26/10/2026)
- **Verificato**: suite completa e layout audit (aggiunti `sheet-journal`, `sheet-rcimp`); test numerici a mano per stima del peso e report; screenshot.
- **Aggiornato**: `JR_KEYS` con `f`, `JR_MERGE` (include `d`) in unione e firma del Journal; `sgBuild` (suggerimenti) con i blocchi doloranti; `kcalChart` (asse tondo, una legenda); `weightChart`; `reportsView`/`reportText` (scheda Recovery and body).
- **Eliminato**: la seconda definizione di `clean0` che avevo aggiunto (collideva); legenda duplicata di «Calories vs target».
- **Aperto**: M7b (formule); correzione per dispositivo da dati propri (D20b); la stima del sonno non impara dai dati; la ricetta da link non funziona sui siti senza CORS (serve una funzione Supabase come proxy: non fatto, richiede un'autorizzazione tua).

## M11m Categoria Endurance Cup, All-time e PDF con i dati nuovi, «Sore anywhere?» (26/10/2026)
- **Verificato**: `tests/m11m.test.js` (8 test, valori calcolati a mano: Open 2:00 → 4:38 in tutto, Open 2:30 → 5:48, Intermediate 3:20 → 4:32, Intermediate 4:30 → 6:08, soglie al limite 131,89/131,91 s; All-time con 10 notti; PDF letto con pdftotext; riga DOMS su 390/820/1440), suite completa, `layout-audit.js`, screenshot su 390/820/1440; costo di `periodExtras` su 1000 giorni circa 160 ms, memorizzato per versione dei dati.
- **Aggiornato**: `extrasHTML` ora legge `extrasRows` (un solo elenco di righe per report, All-time e PDF); il debito di sonno si mostra solo per periodi fino a 31 giorni; «night/nights» al singolare; `remindersCard` accetta un secondo tasto (`alt`, classe `.rm-b`); `suggestFor` legge i DOMS.
- **Eliminato**: nulla di morto introdotto; la riga generica «Blocks 2 and 3 start with a muscle-up…» non si ripete accanto al nuovo consiglio (compare solo se il consiglio non c'è).
- **Aperto**: soglie `RACE_NEXT_FRAC`/`RACE_NEXT_MU` sono euristiche dell'app da tarare con i tuoi dati; non esiste un PDF del report settimanale/mensile (creato solo il blocco nel PDF del workout, per il giorno); correlazione DOMS ↔ sessione del giorno prima nel Lab (L153) non fatta; il promemoria resta tutto il giorno finché non rispondi.

## Revisione grafica 1 (25/10/2026)
- **Verificato**: `tests/design-fixes.test.js` (scritto prima del fix: pillole sul margine di 16 px e consiglio proteine identico a ogni render), suite completa, `layout-audit.js` chiaro e scuro, screenshot 390/820/1440 prima e dopo.
- **Eliminato**: il secondo `scrollLeft` (centratura sbagliata) in `render`: resta un solo posto, il wrapper di `afterRender` che tiene la pillola attiva a 16 px dal bordo; il filetto tratteggiato di `.add-row`; l'anello «oggi» di `.td-d.now` e la lineetta di `.day-pill.today::after`; `.aee-shadow summary` (colonna con chevron fuori asse); la chip Check-in di Today quando la card Check-in è visibile (stessa azione due volte); la regola `@media (max-width:380px)` della barra azioni di Meals (assorbita).
- **Aggiornato**: `proteinPick` senza jitter casuale e con spareggio per nome; `tipHTML` condiviso da Coach (Meals) e «Coming up» (Today); righe `lrow` in `details.rk-paste` con chevron; `.rec-sec` tra i contenitori con card annidate tonali; stringhe di Progress › Energy e Days (nessun calcolo toccato); `trainCalendar` con colonna destra `cv-side` (giorno aperto + prossime sessioni, solo da 1100 px).
- **Aperto**: vedi T6 e T7 in `docs/PRODUCT_REQUIREMENTS.md`.

## M7b-1 Calibrazione v2 del TDEE, avvisi sui macro, data di attivazione (26/10/2026, pubblicata: `main` = `6de4659`, rollback `ecf46de`)
- **Verificato**: `tests/m7b.test.js` (11 test: stabilità con rumore contro il legacy, convergenza al fattore vero, passo massimo `calWeekKcal/7/TDEE`, soglie di qualità, legacy invariato, affidabilità, avvisi, data di attivazione e `ALGO_START`, passaggio legacy→v2 senza salti, interruttori, avvio senza errori); `tests/nutrition-baseline.test.js` (il test D8 ora fissa `calMode` legacy) e `tests/aee-shadow.test.js` adattati. Suite a 441 test al momento della pubblicazione. Correzioni grafiche della revisione 2 (difetti 1–7) pubblicate insieme.
- **Aggiornato**: `energySeries` (ramo v2/legacy, `calRel` nella riga del giorno), impostazioni `energy.*` (`calMode`, `calV2From`, `warn`, `calWin`, `calWinMin`, `calMinWeigh2`, `calMinCov`, `calPrior`, `calBand`, `calWeekKcal`) in Settings › Energy model, `smartStrip` (affidabilità e avvisi), testi di Progress › Energy e del TDEE per v2; correzioni grafiche 1–7 (`.en-leg`, `.adh` a 110 px, `.day-pill` selezionato verde, tabelle annidate tonali, piega AEE con `foldOne`, «Season settings» in card propria, «Save as a workout»).
- **Eliminato**: sostituito il `<details class="aee-shadow">` con `foldOne` (stesso pattern di Lab); il `grid-template-columns` inline duplicato di `.adh` in «Biggest calorie sources»; la variabile `ph` inutilizzata in `smartStrip`. Il ramo legacy della calibrazione resta per compatibilità e rollback (`calMode: "legacy"`).
- **Aperto**: il prior τ=0,08 è una scelta progettuale e 7000 kcal/kg un'ipotesi (fonti primarie irraggiungibili dal sandbox); la soglia energetica prudente e il blocco dei target incoerenti di F-07 non sono implementati (solo avvisi); non c'è un `algoVersion` generale (solo `calV2From`); `ALGO_START` è il 25/10/2026 (costante, non «oggi»): i profili esistenti usano il v2 da quel giorno e il legacy prima; il resto di M7b (D19, D20, D7, D18, F-01, F-02, F-09) è da fare; difetto 8 e minori della revisione grafica 2 in M13d (L157, T6). I due rami worktree dei lavori precedenti non esistono più: M7b-1 è stata rifatta da zero in questa sessione.

## M7b-2a D5b kcal nette del riposo per dispositivo (26/10/2026; pubblicata in `c60c4b5`, rollback `6de4659`)
- **Verificato**: `tests/m7b.test.js` (14 test: 3 nuovi di D5b, 600 kcal in 60 min → 526; base «net»/«unknown», valori digitati, interruttore spento e giorni prima di `netFrom` restano com'erano; tassi appresi netti, 10 kcal/min lordi → 8,76 netti) e `tests/intervals.test.js` aggiornato; `tests/nutrition-baseline.test.js` adattato; suite a 444 test. `grep` in `source/engine.html`: `netOfRest`, `bmrOf`, `energy.netKcal`, `energy.netFrom`, `ALGO_START` esistono.
- **Aggiornato**: `netOfRest` (nuova) usata da `sessionKcal`, `realKcal` e dal wrapper «trimmed»; `bmrOf` estratta da `energySeries` (numeri identici); `normalizeSettings` imposta `netFrom = ALGO_START` per i profili esistenti; Settings › Energy model («Sensor kcal net of rest», «…from»); nota in «What Engine learned from your watch».
- **Differenza voluta da documentare**: `eatCandidates` (AEE in ombra) ha la propria conversione indipendente e tratta anche «unknown» come lordo (qualità «low»), mentre `netOfRest` lascia «unknown» com'è. Non cambia alcun target (T8).
- **Eliminato**: la formula BMR duplicata dentro `energySeries` (ora `bmrOf`). Niente altro da rimuovere.
- **Aperto**: D19 (3000 contro 2750 Zepp): D5b ne spiega solo una parte (≈ riposo dentro le sessioni, 75–150 kcal per sessione); il resto non è spiegabile senza i dati reali dell'utente → D20 e confronto con il valore dell'orologio. Restano D20, D18 (`neatMode`), F-01, F-02/D9, F-09, D7, F-11 `algoVersion` generale (oggi solo date di attivazione).

## M7b-2c D20 fattore FC→kcal per dispositivo (26/10/2026)
- **Verificato**: `tests/m7b.test.js` (16 test, due nuovi per D20: fattore appreso 0,625 su 8 sessioni calcolato a mano, fattore globale con meno di 6 sessioni, interruttore spento, `hrFrom` futuro, migrazione).
- **Cambiato**: `hrCalLearned`/`hrCalFor` prima di `keytel`; il ramo `hr` di `sessionKcal` usa `hrCalFor(devOf(w), date)`; la migrazione delle date di attivazione in `normalizeSettings` è un ciclo su `calV2From`, `netFrom`, `hrFrom`; il testo di Settings › Heart-rate sensors diceva «Calories are not recalculated yet» (falso dopo D5b): aggiornato.
- **Eliminato**: nessun codice morto introdotto.
- **Aperto**: `eatCandidates` (AEE in ombra) continua a usare il fattore globale (è la stima indipendente); la correzione appresa «da peso e bilancio» (non solo da kcal di riferimento) non è fatta perché richiede dati reali; nessun moltiplicatore polso-contro-fascia dalla letteratura.

### M7b-2b · F-01 BMR (26/10)
- **Verificato**: `tests/m7b-bmr.test.js` (12 test, valori a mano nei commenti: HB 1864.545 e 1345.9985, Ten Haaf 1989.2264, bordi di età 18/35/36/60, bonus, migrazione, Settings, ricarica) e `nutrition-baseline.test.js` (i due test KNOWN D10 aggiornati di proposito); `layout-audit.js`: nessun problema.
- **Aggiornato**: `bmrOf` usa `hbOriginal`, `hbBonusKcal`, `tenHaafWeight`; `energyView` usa le stesse funzioni (4 tile affiancati; riga «Used today» solo con bonus o MET); `normalizeSettings` imposta `hbBonusOn` ("on" per i profili salvati prima).
- **Eliminato**: le formule HB arrotondate duplicate in `bmrOf` e `energyView`, il tile «used today» e il ramo Katch-McArdle irraggiungibile di `inUse`.
- **Aperto**: coefficienti Ten Haaf non verificati su un testo primario in questo ambiente; Cunningham/Ten Haaf-FFM; la scelta della formula cambia la serie passata (F-11).
## M7b-2d · F-02/D9 profilo incompleto (26/10)
- **Verificato**: `profileGaps` legge solo `profile.set`, i valori e i pesi registrati; nessun default cambiato, nessun calcolo energetico toccato (`energyAt().bmr` invariato nel test). Tutti i punti che scrivono sesso/altezza/peso: `fitChange` (Settings › Profile) e `ob-done` (setup); `profileNote` è usata da Check-in ed Energy.
- **Aggiornato**: `tests/devices.test.js` (il profilo «completo» ora conferma anche il sesso); nuovo `tests/m7b-data.test.js`.
- **Aperto**: F-09/D12 (null ≠ 0, copertura dei nutrienti, `settings.nutrCoverage`) non iniziata; audit di layout e screenshot non eseguiti per questo punto (cambia solo il testo di una nota esistente).
## M9b — Race plan (L19)
- Aggiunti `racePlan` (pura), `raceWeekKm`, `racePlanHTML`, `racePlanSum`, `racePlans`; agganciata in `trainRaces` (una sezione `foldOne("raceplan", …)` chiusa per gara; gara passata: solo «After» per 7 giorni). Nessun ACT/CHG nuovo, nessun CSS nuovo (righe `lrow`), nessuna dipendenza.
- Ipotesi dichiarate nel codice: fuelling <60 min nessuno, 60–150 min 30–60 g/h, oltre 60–90 g/h (mai 120); carboidrati dei 2 giorni prima 5–7 g/kg (7–10 da 90 min); colazione 1–2 g/kg; dopo gara proteine 0,25–0,4 g/kg, carboidrati 0,5–1,0 g/kg (1,0–1,2 da 90 min); taper −20–30% km (−40–50% da mezza); liquidi 400–800 ml/h da 60 min, sodio solo «prova il sudore», nessun numero. Non sono nuove formule nutrizionali dell'energia: sono intervalli di consiglio; da confermare dall'utente.
- Test: `tests/m9b.test.js` (4). Non eseguiti: suite intera, layout-audit, revisione grafica (limite di utilizzo).

## M7b-2e D18 NEAT dai passi (26/10/2026)
- **Verificato**: `tests/m7b.test.js` (3 test nuovi: 2.000/7.000/14.000 passi = 200,6/350/559,2 kcal calcolati a mano, interruttori e casi che restano sul vecchio calcolo, proiezione dei passi di oggi, migrazione).
- **Cambiato**: `neatFromSteps` e `stepsProjected` prima di `energySeries`; nuovo ramo nel calcolo del NEAT dopo la base appresa e prima della media; `NEAT_SRC` con due provenienze; due campi in Settings › Energy model (sempre righe pari).
- **Eliminato**: nessun codice morto introdotto.
- **Aperto**: la costante «7.000 passi = NEAT predefinito» è un'ipotesi (nessuna fonte primaria nel sandbox); `aeeShadow` (AEE in ombra) ha il proprio NEAT che richiede ancora la base appresa; i giorni con corsa o camminata non usano i passi (i passi dell'allenamento andrebbero sottratti: da fare con la cadenza); la media degli ultimi 7 NEAT include valori già stimati (si auto-rinforza, F-04).

## F-09 / D12 Sconosciuto ≠ 0 per i nutrienti opzionali e copertura del dato (26/10/2026)
- **Verificato**: nuovo `tests/f09.test.js` (12 test, valori calcolati a mano nel commento d'apertura: 750 kcal con fibra nota su 400 = 53%, 975 kcal con fibra su 800 = 82%, settimana 1700/2225 = 76,4%, sodio 0,4 g = 1 g di sale); aggiornato il test KNOWN (D12) di `nutrition-baseline.test.js`; passano anche food-editor, foods-m8a, off, recipe-scan, scan-clarity, ai-import, domain, stores-food, food-filters, meal-plan, m5c, recipe-engine, security, m7b, m7b-data; smoke a zero `pageerror`.
- **Cambiato**: `ZERO`/`addM` non portano più `fib` (l'unico lettore era Stats, ora usa `dayNut`); nuovi `NUTCOV_MIN`, `NUT_OPT`, `nutrCovOn`, `optN`, `nutCov`, `nutShown`; `nutRows`/`nutTips`/`nutCard` con la modalità «strict» (dopo `nutrFrom`); `blankFood`, `fd-save`, `offToFood`, `parseLabelText`, `aiLabel`, ricerca AI di un cibo, stima «homemade», cibo da descrizione/scontrino/ricetta AI scrivono `null` per il dato assente; Stats › fibra, `periodStats` (fibra/sale), prompt del coach AI, confronto etichetta (`labelcmp`) mostrano «—»; Settings › Nutrition extras con interruttore e data; stamp `nutrFrom` in `normalizeSettings`.
- **Eliminato**: `fib` dai totali `ZERO`/`addM`/`eatenFor`/quick add (due scritture `fib = 0`), il ramo `setFor("fib")` di Stats.
- **Corretto per strada**: la riga «Sodio» di un'etichetta letta con il reader locale veniva assegnata al sale senza ×2,5.
- **Aperto**: gli 0 già salvati (anche quelli messi da `blankFood`/OFF prima di F-09) non si distinguono da uno 0 vero e restano noti: serve una scelta dell'utente se marcarli «non verificati»; i valori tipici dei cibi integrati (`BUILTIN_MX`) restano trattati come noti; provenienza per sorgente e contratto D6 non fatti; il bersaglio della fibra in Stats (30 g) e quello di Nutrients (13 g/1000 kcal, ≥25 g) sono due costanti diverse; layout-audit completo e revisione grafica non eseguiti (richiesta di velocità: solo screenshot mirati).

## M13d parte 2 · difetti grafici rimasti (26/10/2026)
- **Verificato**: `tests/m13d.test.js` (7 test: Energy, spaziatura di Today a 1440 e 1920, Overview, Personal bests a 390 e 1440, riga backup in chiaro e scuro), `tests/m7b-bmr.test.js` (i due test dei tile BMR riscritti: ora il tile della formula in uso non c'è, il nome sta nell'intestazione), screenshot 390/1440/1920 prima e dopo.
- **Cambiato**: `energyView` (intestazione «Basal metabolism» con la formula in uso, tile `kpi` solo per le altre con `U+2011`/`U+00A0`, classe `.stat-grid.tri`, «Day by day» da ieri); wrapper `.today-wide` e unica spaziatura 12 px per `.glance`, `.today-grid`, `.tg-col`; `VIEWS.stats` (tile «logging streak»), `pill` nascosta se `-`, stati vuoti in `changeChart`/`balanceChart`; `tbl(..., { lead })` (azioni dentro `.tbl-tools`) usato dai Personal bests; `.bk-due` senza fondo.
- **Eliminato**: `L7` in `energyView`, `.stat.on` (nessun tile «in uso» evidenziato), la riga di testo «Logging streak», le regole `gap` duplicate di `.today-grid` a 840/1024/1180 px.
- **Aperto**: punto 4 (calendario di Train su PC): il testo era già «Tap a day to open it» e la colonna destra si riempie con «Next sessions» solo se ci sono sessioni pianificate; tacche d'asse non tonde in Energy, «Body weight» a mezza larghezza in Tools 1RM, kg della lista formule in Tools 1RM non sulla colonna della tabella: non toccati. Suite completa e audit di 52 schermate non eseguiti (richiesta di velocità); la riga backup che l'utente vedeva in Settings è quella di Today (`.bk-due`), in Settings non c'è.

## Planner settimanale rifatto (L184, 26/10/2026)
- **Verificato**: `tests/meal-plan.test.js` (27 test con `m5c.test.js`: tabella a 1440 senza tagli né scroll laterale, «+» sempre visibile, layout impilato a 820 px, «Usual» e riempimento del giorno con undo, nessuno strumento senza storico o su pasti bloccati e giorni passati, barra kcal «over» con la tolleranza del resto dell'app, barrette per macro); `layout-audit` mirato su 820/1440/1920, chiaro e scuro: 0 problemi; revisione `code-guard` e `design-reviewer`.
- **Cambiato**: `weekPlanView` (una riga per giorno, pasti affiancati, intestazione a barra unica), `pwStack`/`PW_DC`/`PW_CELL` (impila i pasti con poco spazio), blocco CSS `.pw*`, `autoCompleteDays` accetta `meals`, `ACT["pw-usual"]`/`["day-fill"]`.
- **Eliminato**: il layout a 7 colonne (`.pw.wide`, `.pw-row`, `.pw-m`, `.pw-corner`), `.pw.tall`, `pwTall`, `PW_COL`/`PW_LAB`/`PW_GAP`, la riga «Add/⋯» in fondo alla cella, la regola `body:has(.pw-lib) .fab` (assorbita da `body:has(.pw) .fab`). Il listener di resize resta, ora sull'impilamento.
- **Aperto**: nessuna scorciatoia da tastiera; una colonna molto stretta con 5+ pasti su tablet usa il layout impilato (alto).

## Consistency & Cleanup Report: M13d residuo (27/10/2026)
- **Verificato** (screenshot 390/820/1440/1920, chiaro e scuro, solo le schermate toccate; `tests/m13d-axes.test.js` 4/4, `m13d.test.js`, `m11c`, `m13a`, `food-filters`, `ux-fit` verdi, `smoke.js` ok, CHECK/LINT di `layout-audit.js` mirati: 0 problemi, 0 avvisi): Progress › Nutrition › Energy (grafico «Last 6 weeks»), Overview (Expected vs actual, Weekly balance), Tools › Calculators (tutti e nove), Train › Calendar (mese e agenda).
- **Cambiato**: `axisTicks`/`axisGrid` condivisi da 12 grafici (stessa regola 1·2·5×10^k, interi dove servono); `seriesChart` accetta `int`; i cicli `for (let v…)` e `mx * i / 4` per le tacche sono spariti. `.tc-f` a griglia con `--n`/`--nm` al posto di `auto-fit`; campo «Plates» a riga intera su telefono; «Reps» con unità; «Gel size · g carbs» diventa «Carbs per gel · g». Calendario: `calMonthCard`, `calMealRows`, `.cv-head`.
- **Eliminato**: la tabella reps con kg in colonna centrale (ora ultima colonna, stesso asse destro della lista formule e dell'intervallo), il testo troncato dei sottotitoli dei risultati.
- **Aperto**: pubblicazione e revisione `design-reviewer` non eseguite in questo giro; suite completa non lanciata (richiesta di velocità); con un mese senza sessioni né pasti la colonna destra del calendario resta più corta della griglia (nessun contenuto da aggiungere).

## M7b-3 + M7c · D7 una fonte per sessione, F-11 registro delle versioni, D3 «How it is calculated» (26/10/2026)
- **Verificato**: nuovo `tests/m7c.test.js` (15 test, valori calcolati a mano nel commento d'apertura: EAT 538 + 0 + 300 = 838 contro 1339, NEAT 1500 − 838 = 662 contro 161, formule 3608 in entrambi i casi; sovrapposizione 20′ < 24′ non unisce, 30′ sì; senza ora di inizio nessuna unione; import con due attività sovrapposte 600 invece di 1160); passano anche `m7b`, `m7b-bmr`, `m7b-data`, `intervals`, `aee-shadow`, `m13d`, `f09`, `nutrition-baseline`, `journal`, `neat-steps`, `devices`, `persistence`, `settings-typing`, `scenario` (129 test) e `smoke.js` sui tre viewport. Audit mirato CHECK/LINT (Settings › How it is calculated, Features, Energy model) a 390/820/1440, chiaro e scuro: 0 problemi, 0 avvisi; screenshot guardati.
- **Cambiato**: registro `ALGO`/`ALGO_VERSION`/`algoAt` accanto ad `ALGO_START`; `normalizeSettings` timbra le date dal registro e scrive `energy.algoV`; `bmrFormula` (la formula davvero usata) separata da `bmrOf`, usata da `energySeries` (`bmrF`) e da `energyView` (che prima ricalcolava «Auto» per conto suo e ignorava `bmrAutoFrom` e il ripiego di «Ten Haaf (FFM)» senza grasso); righe di `energySeries` con `age`, `bmrF`, `nx` (input del NEAT), `hows`; `watchView` salta le copie; wrapper finali di `sessionKcal`/`realKcal` (`dupOf`); `sessionSource`; `HOW_SHORT` unica mappa delle etichette (nel Check-in la sessione «trimmed» stampava «undefined»); `icuExtras` con `startAt`, liste `fill` di `icu-direct.js` con `startAt` (e `devn` nell'unione 1-a-1); somma delle kcal nell'unione di più attività con `oneSrcKcal` (entrambi i percorsi di import); `FEAT_OFF` per le funzioni spente di default; `explainHTML` + `bmrText`; interruttore «One source per session» nella casella vuota di Energy model.
- **Eliminato**: la lista fissa delle sei date in `normalizeSettings`, il calcolo duplicato della formula BMR in `energyView`, la mappa inline delle etichette in `sessRow`, la variabile inutilizzata di `featCard`.
- **Aperto**: (1) la data di D7 per i profili esistenti è `ALGO_START` (25/10), come le altre M7b: giorni dal 25/10 con due registrazioni sovrapposte cambiano; (2) `realKcal` preferisce `watch` a `kcal` mentre `sessionKcal` fa il contrario (un solo allenamento con entrambi i campi: nessun doppio conteggio, ma due fonti diverse per apprendimento ed EAT); (3) `devOf` non usa ancora il nome del dispositivo di intervals.icu (D5a), solo la scelta della copia che conta lo usa; (4) le registrazioni importate prima di questa versione non hanno `startAt` finché una sync non lo riempie (finestra della sync); (5) contratto D6 completo e prova di ripristino di F-11 non fatti; (6) suite completa e `design-reviewer` non eseguiti (li esegue la sessione principale prima di pubblicare).

## Consistency & Cleanup Report: M13d, terzo giro del design-reviewer (27/10/2026)
- **Verificato**: `tests/m13d-axes.test.js` (15 test, valori dei calcolatori calcolati a mano nel commento), `m13a`, `m7c`, `m13d`, `m11c`, `devices`, `m7b-bmr` verdi (140), `smoke.js` ok; screenshot 390/820/1440/1920, chiaro e scuro, con CHECK/LINT mirati (0 problemi). Il `CHECK`/`LINT` di `tests/layout-audit.js` ora ignora anche i `<details>` annidati chiusi (falsi «text overlaps» in Settings). Suite completa non lanciata (richiesta di velocità).
- **Cambiato**: `trainCalendar` (colonna `.cv-main` con griglia, legenda, nota), `trainWeek` (intestazione `.cv-head`, `calTools` condiviso con Month e Agenda, `.cv-wkv`), `icuChip` (icona), `calcLoads`/`calcPace`/`calcOut`/`calcCard`, `zeroRange` e `dateAxis` nuovi (usati da `changeChart`, `balanceChart`, `seriesChart`), `energyView`, `explainHTML` (due `foldOne` chiusi), `featCard`, riga Energy model.
- **Eliminato**: `icuSyncBar` e il CSS `.sync-bar`/`.sb-t` (stato ed errore di sincronizzazione stanno nel chip e nel foglio intervals.icu), il campo `ref` di `ALGO` (sigle F-/D- non più mostrate), `ACT["calc-f"]` (ora `CHG["calc-f"]`), le regole `.tc-top` e `.an-k:last-child` a destra, la riga «1 rep» dei carichi 1RM, la riga della distanza digitata in Pace.
- **Aperto**: a 1920 px la vista Week è una colonna di 900 px a sinistra (si può usare la colonna laterale come in Month); la colonna laterale del Month resta fino a circa 100 px più alta della colonna della griglia con dati reali; nessun pulsante «Today» per tornare alla settimana corrente.

## Consistency & Cleanup Report: M16 grasso corporeo da intervals.icu (L199) e pagina di prova bilancia (26/10/2026)
- **Verificato**: `tests/m16-bf-guard.test.js` (6 test: import separato, `bfAt` con interruttori, massa magra con il valore corretto, migrazione una tantum, eco di ciò che Engine invia, Settings), `pre-start` (la prima sincronizzazione legge 90 giorni, il test parte con `bfMig`), test su intervals/energia/massa magra verdi.
- **Cambiato**: `bfAt`/`bfGap` al posto delle letture dirette di `logGet(d).bf` in `energySeries`, `leanEst`, Progress › Body, report, obiettivi, foto, esportazione; l'import in `icu-direct.js` e `icuApplyWellness` scrive `bfIcu`; `saveWeighIn` marca `bfSrc`.
- **Eliminato**: `scale-test.html` (sorgente e copia in root), `tests/scale-test.test.js`, la riga di copia in `build-web.js` (il peso arriva da intervals.icu).
- **Aperto**: scarto costante (vedi L199); `ciDone` non conta più un grasso solo importato come check-in fatto; nei file di root la build va rigenerata alla pubblicazione.

## Consistency & Cleanup Report: M14b gruppo A, motore di sync + S-1 (26/10/2026)
- **Verificato**: `tests/m14b-sync.test.js` (14 test; Supabase finto in memoria con più dispositivi, `tests/lib/fake-supabase.js`; sul codice precedente i test dei difetti falliscono tutti), `sync-gating`, `persistence`, `journal`, `scenario`, `registry`, `security`, `smoke.js`. Dettaglio per voce in `docs/review/fix-A-report.md`.
- **Cambiato**: `shim.js` (coda e snapshot per uid, unione al momento dell'invio con `E.merge`, errori permanenti messi da parte, `E.status/onStatus/onSent/persist/stash`, paginazione keyset, rilettura a primo piano/online, `fromCache` corretto in `onSnapshot`), `put/flush/applyDoc/applyCollection/subscribe` e il boot (`claimLocal`), `saveLocal` (senza chiavi), `restorePoint` (senza chiavi, restituisce l'esito), chiavi API nell'area locale `engine.keys` (S-1, migrazione silenziosa), testi «la chiave resta su questo dispositivo».
- **Eliminato**: `Sync.inflight`, `Sync.retry`, `isPending`, i rami mai prodotti `unavailable`/`quota_exceeded` di `flush()` e `revoked` di `subscribe()`, la notifica delle scritture locali nello shim, la migrazione «tutto o niente» al primo accesso, la coda unica `engine.q` (adottata una volta dal suo account).
- **Aperto**: confronto e scrittura non atomici (nessun compare-and-swap sul server); foto IndexedDB di un altro account restano sul dispositivo; un servizio AI senza chiave su un altro dispositivo non ha un campo per reinserirla (si aggiunge di nuovo); il ripristino di un restore point toglie la `mapKey` (area10 #17, gruppo ripristino).

## Consistency & Cleanup Report: M14b gruppo D, Fuel (27/10/2026)
- **Verificato**: `tests/m14b-fuel.test.js` (9 test, tutti rossi sul sorgente di partenza e verdi dopo: dispensa e Undo, Clear, copia giorno, treat, abitudini, nome piatto, pasto spento, giorni passati), `meal-plan`, `planner-quick`, `planner-range`, `m5c` verdi (44 in tutto).
- **Cambiato**: tutti gli Undo del Fuel usano `undoDays(snap)` (giorni e giacenza), `mutateDay` accetta `opts.onUndo`; copie e incolla passano da `putClones`; `habitSrc` (con cache) sotto `habitItems`; `pwWhere` condiviso da «Copy/Move to…» e dal nuovo foglio `pwadd`.
- **Eliminato**: le tre copie del filtro «cibo esistente» e del blocco giorno/pasto dei fogli (ora `itemExists`, `pwWhere`), i cancellamenti diretti di `d.meals = {}` sostituiti da `removeItems`.
- **Aperto**: vedi R1c in `docs/PRODUCT_REQUIREMENTS.md`.

## Consistency & Cleanup Report: M5d, Copy e Paste a due tasti (L188, 27/10/2026)
- **Verificato**: `tests/m5d-copypaste.test.js` (settimana e vista giorno, tipo di appunti, Undo), `m5c` aggiornato, `meal-plan`, `planner-quick`, `planner-range`, `m14b-fuel` verdi (47), `smoke` ok, `layout-audit` (chiaro e scuro) senza problemi; screenshot 390/820/1440 chiari e scuri guardati (tasti allineati sullo stesso asse, Paste in accento solo se attivo).
- **Cambiato**: `clipBtns` (una sola coppia di tasti per pasto e giorno), icona `paste`, `pasteClip` più semplice (niente più incolla di un giorno su un solo pasto), `copyToClip` ridisegna la schermata, «Copy» del pannello laterale rinominato «Copy to…».
- **Eliminato**: `clipLabel`, le voci «Copy this day», «Copy <meal>» e «Paste … here» dei menu giorno e pasto, il tasto «Paste» con testo nella cella vuota.
- **Aperto**: i tasti del giorno nella tabella settimanale compaiono al passaggio del mouse (come cestino e «Fill»); nei pasti vuoti il Copy è visibile ma spento per tenere le colonne allineate.

## Consistency & Cleanup Report: M12 contaflessioni, nuoto in metri, sport di squadra (27/10/2026)
- **Verificato**: `tests/m12-pushups.test.js` 12/12, `m12`, `pre-start`, `preview-suggestions` (37 test verdi), `npm run smoke` sui tre viewport, `layout-audit` (0 problemi su 55 schermate x 4 viewport), screenshot del player con il contatore attivo su 390/820/1440 chiari e scuri.
- **Causa del run appeso**: Chromium recente espone `DeviceMotionEvent.requestPermission` e risponde «denied» senza un gesto: la pagina spike restava con «Mark the set» disabilitato, il click aspettava 30 s e il browser lasciato aperto impediva al processo di uscire. Test ora con permesso simulato, `try/finally` sul browser, timeout 5 s sulla pagina.
- **Cambiato**: `let PCNT` spostato prima di `VIEWS.live` (nessun rischio TDZ); `.pc-box` raggruppa tile, −1 e Stop alla stessa larghezza.
- **Eliminato**: nulla. Nessun coefficiente energetico aggiunto (MET di futsal/nuoto non presenti nel codice).
- **Aperto**: prova del sensore sul telefono e taratura delle soglie; MET di default per futsal e nuoto (serve fonte primaria e approvazione del proprietario); «10 reps» compare sopra e nello stepper Reps (preesistente).

## Consistency & Cleanup Report: L202 Indietro e chiusura alla schermata giusta (27/10/2026)
- **Fatto**: livello cronologia (`NAV`, `navSync`, `navPop`, `navRestore` vicino a `closeSheet`): `navSync()` gira a fine `render()`, `renderSheet()` e `closeSheet()`; `popstate` ripristina vista, segmento e catena di fogli. `openSheet` mette `_ret` a ogni foglio aperto da un foglio (prima solo catene `keep`), `keep:false` lo esclude; `ACT.tab` taglia la catena. I `history.replaceState(null…)` dei deep link (`?a=`, `?supp=`, `#report`) ora conservano `history.state`.
- **Verificato**: `tests/l202-back.test.js` (7, falliscono sul vecchio albero con `ENGINE_L202_REF=HEAD`), nav-return, shop-quick, pre-start, m13a, 15 file di test di fogli/liste/negozi/cibi (105 verdi), smoke 3 viewport.
- **Eliminato**: la condizione `keep || _ret` in `openSheet` (sostituita dalla regola generale).
- **Aperto**: posizione di scorrimento delle viste non ripristinata; dopo un reload le voci di cronologia precedenti non hanno istantanea (Indietro lì chiude solo l'eventuale foglio); suite completa non eseguita in questo ramo.

## Consistency & Cleanup Report: M14b gruppi E/F, «Use something from home» (L189) e correzioni di Foods/Spesa (ramo claude/m14b-ef)
- **Verificato**: `tests/m14b-ef.test.js` (11 test, scritti prima e rossi per il motivo giusto; valori calcolati a mano nei commenti), 115 test dei file shop-*, stock*, pantry*, stores*, food-*, foods-m8a, recipe-*, m14b-shop, m14b-foods verdi; layout-audit con la nuova schermata `sheet-buy-home`.
- **Cambiato**: `foodForItem` e `recipeTotals` leggono il record nascosto di un cibo cancellato; `binPurge` tiene (nascosto, `gone`) un cibo ancora usato (`foodUsed`); `priceSet` unisce storico e prezzi per negozio; `shop-done` conserva i campi della voce di dispensa; `shop-pk` scala il prezzo e conserva offerta/negozio; `shoppingRows` salta la riga entro il 2 % di una confezione coperta dalla scorta; `by-ok` non salva un prezzo non numerico; `swapFood` accetta `by`, `since`, `until`, `home`; `fold-tog` ridisegna il foglio aperto.
- **Eliminato**: la variabile `shelf` inutilizzata in `shop-done`.
- **Aperto**: undo condiviso `STOCK_UNDO`, undo di «Finish shopping» che ripristina l'intero `S.shop`, `esc()` sui `data-id`, prezzi stimati contati come spesi, clamp dell'editor Foods, validazione ricetta, import ricetta, catena AI, lista Foods oltre 200 righe (vedi `docs/review/area02-foods.md` e `area03-shopping.md`). Il 2 % di tolleranza fa sì che Σ(fabbisogno) differisca da Σ(coperto)+Σ(da comprare) al massimo del 2 % di una confezione.

## Consistency & Cleanup Report: M14b E, secondo giro (ramo claude/m14b-ef)
- **Verificato**: `tests/m14b-ef2.test.js` (9 test, 8 rossi prima), 103 test di spesa/dispensa/negozi/scontrino/prezzi verdi, `pantry.test.js` adattato al nuovo undo.
- **Cambiato**: `stockSet` restituisce il proprio undo (`stockUndoer`), `shopUndo(before, after)` per Finish/scontrino/rimozione negozio, `spendIn` e il toast di Finish escludono i prezzi `est`, `closeSheet` azzera `rcLearn`, `esc()` sui `data-id` delle viste Spesa/Dispensa/Foods, tap target 36 px.
- **Eliminato**: `STOCK_UNDO` e `undoStock`.
- **Aperto**: la migrazione Lidl (una tantum) ripristina ancora l'intero `S.shop`; `data-id` fuori da Foods/Spesa/Dispensa non hanno `esc()` (altri gruppi: validazione degli id in import/sync); `shop-buy` 28 px di altezza.

## Consistency & Cleanup Report: M14b F, secondo giro (ramo claude/m14b-ef)
- **Verificato**: `tests/m14b-ef3.test.js` (6 test, tutti rossi prima), 107 test di food-*, recipe-*, m14b-*, f09, off, ai-import, persistence, registry, nav-return, security verdi; layout-audit 0 problemi.
- **Cambiato**: `fd-save` (clamp e rifiuto del testo non numerico), `rc-save` (validazione dopo il filtro, porzioni), tasto Esc (usa `close-sheet`), `VIEWS.foods` (`UI.foodsMax`, `foods-more`), `loadLocal` chiama `normalizeRecords`.
- **Eliminato**: nulla.
- **Aperto**: `normalizeRecords` non copre i record che arrivano dalla sync (da chiamare in `applyCollection`, ramo sync); Esc in un editor con dati digitati scarta senza conferma.

## Consistency & Cleanup Report: correzioni dalla revisione del codice (ramo claude/review-fixes)
- **Verificato**: `tests/review-fixes.test.js` (9 test, 8 rossi su `11d8709`; 2b è la guardia del caso «consumato tutto»), m14b-ef/ef2/ef3, f09, m12-pushups, m14b-c, stock, stock-model, pantry, pantry-ui e `npm run smoke` verdi. Suite completa non lanciata qui.
- **Cambiato**: l'undo di `swapFood` rimette solo le voci toccate (e solo se ancora come le ha lasciate lo scambio), niente più cancellazione dei giorni nuovi; `shopUndo` sulla dispensa toglie aritmeticamente i grammi dell'azione se la voce è cambiata dopo (mai sotto 0), così lo storico acquisti e la giacenza restano coerenti; negli elenchi un elemento modificato dopo si trova per `id` (niente doppioni); `normalizeRecords` rispetta F-09 (null resta ignoto, nessun campo inventato, restituisce gli ingredienti scartati perché non oggetti) ed è chiamata dopo «Restore»; `docShape` (loadLocal e restore in sostituzione) riporta alla forma di default le parti annidate di tipo sbagliato; `VIEWS.live` non scrive più (`pcLeave` rimette le ripetizioni previste subito dopo il render); `lv-pc` ignora la risposta del permesso se nel frattempo il conteggio è finito o ne è iniziato un altro.
- **Aggiornato**: `m14b-ef3` (un cibo senza `per.kcal` ora resta senza, non 0).
- **Eliminato**: nulla.
- **Aperto**: `normalizeRecords` non copre ancora i record in arrivo dalla sync; una voce di dispensa cambiata dopo un acquisto e annullata perde eventuali campi diversi da `g` solo se era assente (usa i campi attuali); i campi non numerici di `shop`/`train` più in profondità del primo livello non sono validati.

## Design fixes, round 2 (claude/design-fixes-2)
Verified: 14 review defects (phone day header, Paste accent, week cell icon order, touch day tools in flow, Paste visible on hover devices, clipboard pill under the title, buy sheet home section without inner card, Reps/Load labels on PC, push-up counter setting, singular session and dimmed agenda days outside the month, switch row padding, `.train .lvl` scope, texts and icons of Copy to…, Foods «Show more»). Removed: dead 34 px/muted rule of `.meal-cp .icon-btn`, `foldOne` use in the home swap (own `.hm-*` markup). Open: none from this list. Tests: `tests/design-fixes-2.test.js`.

## Consistency & Cleanup Report: M17 (L206 sorgente del peso nel check-in, L207 settimana in rosso; ramo worktree-agent-a3b8a0b2ca1bff91e)
- **Verificato**: `tests/m17-checkin-source.test.js` (4) e `tests/m17-week-over.test.js` (3), scritti prima e rossi per il motivo giusto; `meal-plan`, `m16-weight-pull`, `m16-bf-guard` verdi; screenshot 390/820/1440 chiaro e scuro del check-in (pillola) e della settimana (rosso, «+N»). L'agente `design-reviewer` non era lanciabile da questa sessione: revisione fatta a mano sugli screenshot.
- **Cambiato**: `weightSrc` (`"icu"` dall'import in `source/web/icu-direct.js`, `"man"` da `CHG.ci`, `saveWeighIn` e dal peso di ieri); `.ci-src` nel check-in; `overTarget()` unica per `macroBar`, barre `fs-m` e settimana del planner; `.pw-ov` e varianti `.over` di `pw-kcal`/`pw-mc`.
- **Eliminato**: le due soglie duplicate `* 1.08 + 3` (ora `overTarget`); il colore ambra della barra kcal in sforamento nella settimana.
- **Aperto**: la soglia resta 8 % + 3 sul target (stessa delle barre dei macro di Today (l’anello kcal di Today usa ancora 3 %, non toccato)); se il proprietario vuole «ogni grammo oltre il target» si cambia solo `overTarget`. Il rosso dei macro in sforamento non si distingue dal colore proteine nel solo colore (c'è sempre il «+N g»).
