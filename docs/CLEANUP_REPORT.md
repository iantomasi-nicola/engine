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

