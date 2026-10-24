# Backlog unico dei requisiti (MoSCoW)

Fonte: mandato dell'utente del 2026-10-24 (sezioni A–J) + requisiti tecnici emersi dall'audit (ENG). Non esistevano altri documenti di requisiti nella repo: l'inventario delle funzioni esistenti è in `BASELINE_AND_AUDIT.md §4`. Nessun requisito è stato rimosso: i rinviati stanno in "Won't (per ora)".

Stato misurato sulla baseline `cae350d` (dettagli ed evidenze in `BASELINE_AND_AUDIT.md §3`). Complessità: S ≤ ½ giornata · M ≈ 1–2 giorni · L ≈ 3–5 giorni · XL > 1 settimana. Milestone: vedi `ROADMAP.md`.

## ENG — Requisiti ingegneristici (nuovi, dall'audit)
| ID | Requisito | Pri | C | Dip | Stato | Criteri di accettazione |
|---|---|---|---|---|---|---|
| ENG-01 | Smoke test di avvio su 3 viewport (zero `pageerror`/errori console, UI visibile), eseguibile con un comando | Must | S | – | **Fatto** (`tests/smoke.js`; fallisce su `02f43a9`, passa su `cae350d`) | Fallisce sul build di `02f43a9`, passa su `cae350d` |
| ENG-02 | Test delle funzioni di dominio (energia, VDOT, e1RM, ricette, spesa, dispensa) su fixture sintetiche | Must | M | ENG-01 | **Base fatta** (12 test in `tests/domain.test.js`, eseguiti nell'app reale); da estendere per ogni milestone | Test verdi; i comportamenti da cambiare sono marcati `KNOWN (<id>)` |
| ENG-03 | Test e2e dello scenario 7 giorni (piano → modifica → scorte → consumo → acquisto → inventario/spesa/nutrienti), poi reload, offline, sync simulata | Must | L | ENG-01, M1 | **Fatto** (`tests/scenario.test.js`; offline = `navigator.onLine` falso, sync simulata con un `Sync.db` finto) | Scenario descritto in `ROADMAP.md §Scenario`, Supabase simulato in memoria |
| ENG-04 | Build riproducibile: verificare che `index.html`/`sw.js` di root derivino dal sorgente | Must | S | – | **Fatto** (`tests/check-build.js`; baseline identica byte per byte) | Script che ricostruisce e confronta (ignorando il timestamp di build) |
| ENG-05 | Backup/restore verificato su dati sintetici, migrazioni con versione dati | Must | M | ENG-02 | **Backup/restore verificato** (`tests/persistence.test.js`: reload, offline, export→wipe→restore, chiavi escluse); migrazioni con versione ancora da fare | Export→reset→import restituisce stato identico; migrazione con rollback |
| ENG-06 | Audit sicurezza: isolamento RLS, segreti (chiavi AI/intervals in `settings`/export), CSP, input esterni (OFF, GPX/FIT, AI) | Must | M | – | **Fatto (M6)**: `docs/SECURITY_AUDIT.md` + `tests/security.test.js`. Aperto S-1 (chiavi nel documento cloud): decisione dell'utente | Report con finding e fix; nessun segreto negli export di default |
| ENG-07 | Audit scritture verso intervals.icu (nessuna modifica remota non voluta) | Must | M | – | **Fatto (M6)**: inventario e confini con API simulata (`tests/intervals-writes.test.js`); corretto il bug «Plan from intervals.icu spento ma il piano partiva comunque» | Elenco di tutte le chiamate di scrittura; modalità di prova senza rete reale |
| ENG-08 | Guardia di ordinamento delle dichiarazioni (TDZ) | Should | S | ENG-01 | **Coperto dallo smoke test** (ogni TDZ all'avvio azzera l'app e fa fallire `smoke.js`); nessun lint statico | Lint che fallisce sulla causa di `02f43a9` |
| ENG-09 | Sistemazione finale della repository (richiesta dell'utente): struttura, documentazione, codice morto, dipendenze, script, artefatti di build, README | Should | M | tutte | Mancante | Checklist in `ROADMAP.md` M13 approvata dall'utente |

## A. Foods, Pantry e Storage
| ID | Requisito | Pri | C | Dip | Stato | Criteri di accettazione |
|---|---|---|---|---|---|---|
| A1 | Modifica quantità in dispensa da Foods, Meal Plan e Storage (esatta, ±rapido); mostra disponibilità, unità, prezzo, confezione | Must | M | M1 | **Fatto nel sorgente** (24/10): riquadro «At home» (− / quantità esatta / +, libero/prenotato, confezione, prezzo) nell'editor Food e nella scheda quantità del Meal Plan; «at home» nel sottotitolo delle liste Foods; sheet esatta con ritorno alla schermata di partenza e Undo; test `tests/pantry.test.js` | Stesso valore ovunque dopo ogni modifica e dopo reload; ≤2 tap per ±; test e2e |
| A2 | Prezzi/confezioni: €/kg, €/unità, €/confezione, quantità nominale, porzioni, ½ ¼ frazioni, valori esatti g/ml/unità | Must | M | M1 | **Fatto nel sorgente** (24/10): prezzo per kg/l, confezione o pezzo (nessuna conversione senza peso confezione/pezzo), ¼ ½ confezione e frazioni digitate (1/3, 1 1/2, 0,5) esatte, grammi esatti | Nessuna conversione arbitraria; round-trip esatto; test su arrotondamenti |
| A3 | Pantry: ricerca, A–Z/Z–A, filtri utili, preferenze persistenti | Should | S | – | **Fatto nel sorgente** (24/10): ricerca (nome, marca, nome italiano), ordine scadenza/A–Z/Z–A/categoria, filtri Use soon/Spare/Set aside, preferenze salvate nelle impostazioni | Preferenza sopravvive al reload; recuperabile da `02f43a9` previa verifica |
| A4 | Inventario predittivo a data X con pasti/ricette associati e data di esaurimento | Must | L | M1 | **Fatto nel sorgente** (24/10): scheda «Stock on <data>» nel Pantry (3/7/14 giorni o data): scorta oggi → alla data, giorno di esaurimento, pasti collegati; sola lettura | Proiezione non altera la giacenza; risultato coincide con simulazione giorno per giorno |
| A5 | Open Food Facts: ricerca, barcode, normalizzazione, porzioni, dati incompleti, dedup, errori, cache, attribuzione | Should | M | – | **Fatto (M6)**: pausa di 60 s al posto del blocco di sessione, cache con scadenza, prodotto senza valori da completare, attribuzione ODbL, `tests/off.test.js`; aggiunta anche la scansione da dentro una ricetta | Nessun latch permanente; cache con scadenza; attribuzione ODbL visibile; test con risposte simulate |
| A6 | Alimento mancante: ricerca esterna o stima AI, distinti da dati ufficiali, conferma prima di salvare | Should | M | A5 | Non verificato | Badge "stima"; nessun salvataggio senza conferma |
| A7 | Comando AI per suggerire/correggere la categoria dei nuovi Foods, senza ricategorizzare gli esistenti | Could | S | – | Mancante | Solo su richiesta; mai in massa |

## B. Shopping List e costi
| ID | Requisito | Pri | C | Dip | Stato | Criteri di accettazione |
|---|---|---|---|---|---|---|
| B1 | Correggere bug Storage ↔ Shopping (duplicati, acquisti inutili, quantità incoerenti) | Must | M | M1 | **Corretto nel sorgente** (24/10): ricette collegabili alla dispensa, stock prenotato giorno per giorno da oggi, mangiare/de-spuntare reversibile (`it.took`), niente duplicati dopo la spunta; test in `tests/stock.test.js` | Bug riprodotti con test prima del fix |
| B2 | Filtri rapidi: settimana da oggi, prossima settimana, prossimi X giorni, intervallo | Must | S | M1 | **Fatto nel sorgente** (24/10): This week (da oggi a domenica, giorni passati esclusi), Next week, Next 7 days, Custom da–a (24/10: tolti 1/3/14 giorni e la data iniziale su richiesta; una scelta precedente diventa un intervallo personalizzato); scelta persistente; test `tests/stock.test.js` | Fabbisogni ricalcolati; giorni passati esclusi; test di date a cavallo di mese/anno |
| B3 | Prodotti coperti dalle scorte in elenco richiudibile, con data di fine e pasti; coperture parziali | Must | M | M1, A4 | **Fatto nel sorgente** (24/10): elenco richiudibile "covered by what's at home" con quantità, parziale, data di esaurimento e pasti; test su telefono senza overflow | Totale acquisti = fabbisogno − scorta proiettata, mai negativo |
| B4 | Rimuovere la nota "Not in the plan yet" dal Pantry (decisione utente 24/10; la voce originale chiedeva sezioni comprimibili) | Should | S | – | **Fatto nel sorgente** (24/10, test `tests/pantry-ui.test.js`); non ancora nella build di root; l'azione "Plan meals" resta raggiungibile da un pulsante in testata | La nota non compare più; nessun altro elemento del Pantry cambia; test di regressione sul render |
| B5 | Extra non alimentari separati, cronologia, autocompletamento, ricorrenti; costi senza nutrienti | Should | M | – | **Fatto (M3)**: `S.shop.xhist` (nome → ultimo prezzo reale), autocompletamento, prezzo suggerito marcato «~» (stima), ricorrenza 7/14/30 giorni (torna dopo l'intervallo, nascosto finché non è nella finestra), mai in Foods/nutrienti/dispensa (`tests/shop-extras-spend.test.js`) | Nessun extra compare in Foods/nutrienti |
| B6 | Stima spesa per intervallo, media settimanale, dettaglio prodotto, previsto/effettuato/alimentare/extra | Should | M | M1 | **Fatto (M3)**: `spendIn(da, a)` unica somma sullo storico acquisti (settimana/mese/anno/90 giorni), alimentare ed extra separati, righe per prodotto (×n acquisti), acquisti senza prezzo contati a parte (mai 0), «ancora previsto in lista» come stima distinta dal speso; il report settimanale usa la stessa somma | Totali riconciliati con lo storico acquisti |

## C. Recipes e Meal Plan
| ID | Requisito | Pri | C | Dip | Stato | Criteri di accettazione |
|---|---|---|---|---|---|---|
| C1 | Recipe Engine: dosi, unità, porzioni, istruzioni, tempi, macro, costi, scaling | Must | L | M1 | **Fatto (M5a)**: scala ×½/×2/×3 con porzioni, tempo, metodo, costo a porzione (solo ingredienti con prezzo, marcato parziale), quantità in ½ pack / 1 pack con «= ¾ pack»; macro e costo dagli stessi Foods (`tests/recipe-engine.test.js`) | Macro e costo derivano dagli stessi Foods; scaling lineare testato |
| C2 | Creare/modificare ricette da Recipes e Meal Plan; ingrediente mancante con flusso guidato senza perdere il lavoro; storico coerente | Must | L | C1 | **Fatto (M5a)**: modificare o cancellare una ricetta lascia com'erano i pasti già mangiati (`it.snap`); ingrediente mancante: cerca, scansiona o crea senza perdere la bozza (M4e/M6); dal piano «Save as recipe» già presente | Modificare una ricetta non altera i pasti storici (snapshot) |
| C3 | Import ricetta da testo/immagine/camera con AI, associazione ai Foods, tutto modificabile prima del salvataggio | Should | L | C1, A6 | Parziale | Nessun salvataggio automatico; dati AI marcati |
| C4 | Meal Plan settimanale completo su desktop/tablet: panoramica, modifica diretta, drag & drop, copia, duplica, sposta, undo, alternative al trascinamento | Should | L | M5 | **Fatto (M5b)**: vista settimana su tablet e desktop (7 giorni × pasti, totale/target per giorno), tap per modificare, «+», menu dell'elemento (modifica quantità, sposta, copia, duplica, rimuovi), trascinamento con il mouse (Alt copia), undo per ogni azione; un elemento già mangiato non si sposta (`tests/meal-plan.test.js`) | Ogni azione ha alternativa a tap/tastiera e undo |
| C5 | Scambio pranzo↔cena con un'azione | Should | S | – | **Fatto (M5b)**: «Swap lunch and dinner» nel menu del giorno, con undo; il nome del pasto viaggia con il pasto | Ingredienti/dosi/ricette preservati; undo |
| C6 | Filtri in aggiunta Foods: P/C/F, combinazioni, verdure, in/fuori Storage, classificazioni motivate | Should | M | – | **Fatto (M5b)**: filtri Foods e Add: proteico/carboidrati/grassi per quota di energia (≥30 %/55 %/55 %) e quantità minima (8/15/10 g per 100 g; per porzione di ricetta 15/30/15 g), verdure da «Counts as», «At home»/«Not at home»; regole nel codice (`foodClass`) e testate ai limiti | Regole documentate (soglie % energia) e testate |
| C7 | Food Coach realistico: ricette/integrazioni coerenti, niente cibi casuali per chiudere i macro; whey se appropriata | Should | L | E5 | Parziale/Buggato | Nessun alimento fuori dalle preferenze/porzioni abituali; spiegazione di ogni suggerimento |
| C8 | Icona ricetta disallineata nel Meal Plan e problemi UI analoghi | Must | S | – | **Fatto** (24/10): icona e nome sulla stessa riga (flex), con barattolo dispensa, misurato su 3 viewport (era 3,5 px fuori asse) | Screenshot prima/dopo su 3 viewport |
| C9 | Editor Food più semplice e compatto (richieste 24/10, due passaggi): preferito come stella accanto al nome, un solo menu «Counts as» (scelto dai valori per un cibo nuovo), niente «Good for» né «Leave out of auto-plan» a schermo; scheda unica con macro, porzioni, confezione e corsia in vista e tre sezioni richiudibili (More nutrition, Price and stock, Details) che ricordano se erano aperte; i dati già salvati (pasti adatti, esclusione dal planner) restano e un cibo escluso ha il link «Include it again» | Should | S | – | **Fatto nel sorgente** (24/10; `tests/food-editor.test.js`) | Nessun dato perso; 3 viewport |
| C10 | Versione dell'app nelle Settings (Data) con «Check for updates» (richiesta 24/10) | Should | S | – | **Fatto nel sorgente** (`tests/version.test.js`) | Mostra data/ora UTC della build; il controllo scarica l'ultima e ricarica se più recente |

## D. Nutrizione scientifica (documento di riferimento: `NUTRITION_SPEC.md`; audit e proposte: `NUTRITION_AUDIT.md`, in attesa di approvazione; nessun algoritmo va modificato senza approvazione)
| ID | Requisito | Pri | C | Dip | Stato | Criteri di accettazione |
|---|---|---|---|---|---|---|
| D1 | Rivedere BMR, TDEE, NEAT, EAT, attività, macro, distribuzione, micronutrienti, sodio, idratazione, atleta ibrido | Must | XL | proposta approvata, libro dell'utente | Parziale | Ogni formula con fonte, ipotesi, limiti, test |
| D2 | Check-in: verificare NEAT/EAT senza doppi conteggi | Must | M | ENG-02 | Non verificato | Test sintetici per le 3 modalità orologio |
| D3 | Vista opzionale (Settings) con formule, valori e passaggi | Should | M | D1 | Parziale | Disattivabile; stessi numeri dell'algoritmo |
| D4 | Algoritmi deterministici, spiegabili, testati, documentati | Must | M | D1 | Parziale | Documento + test per ogni formula |
| D5 | **Dispositivo FC per sport** (richiesta 24/10): elenco dispositivi (es. Amazfit al polso, Polar armband), predefinito per sport (corsa → armband, calisthenics → smartwatch), campo sull'allenamento scelto prima o dopo (da intervals.icu se riconoscibile), con «kcal lorde/nette/non so». D5a = dati + interfaccia, nessun numero cambia; D5b = uso nel calcolo delle kcal | Should | M | D2, ENG-02 | Mancante | D5a: scelta in ≤2 tap, persistente, nessuna variazione delle kcal; D5b: calibrazione per dispositivo con n sessioni e dispersione, nessun doppio conteggio, interruttore (vedi `NUTRITION_AUDIT.md` F-03) |
| D6 | Contratto dei dati energetici: `{quantità, unità, valore, fonte, lordo/netto, copertura, confidenza, versione}` | Must | M | ENG-02 | Mancante | Una funzione pura per grandezza, provenienza visibile (F-09) |
| D7 | EAT: separare kcal lorde/nette dei dispositivi, conversione dichiarata, niente somma di fonti alternative della stessa sessione | Must | M | D5, D6 | Presente ma fragile [dimostrato] | Test lordo→netto, stessa sessione una sola volta (F-03) |
| D8 | Calibrazione TDEE robusta (finestra più lunga, regressione, qualità dati, restringimento verso 1, limite di variazione, affidabilità) | Must | L | D6, D17 | Fragile [dimostrato: fattore 0,87–1,10 e target ±190 kcal con rumore ordinario] | Property test; v1/v2 a confronto (F-06) |
| D9 | Profilo incompleto: nessun default silenzioso (età 30, altezza 175, peso 75) | Must | S | – | Difetto [dimostrato] | Avviso «provvisorio»; nessun NaN (F-02) |
| D10 | BMR: HB con coefficienti originali, bonus HB opzionale ed etichettato, Ten Haaf (limiti dichiarati), Cunningham solo con FFM misurata, confronto affiancato | Should | M | D9 | Parziale | Tabella numerica della specifica; default invariato (F-01) |
| D11 | Target macro a intervalli con vincoli verificabili: `cmin` come avviso, soglia energetica prudente, nessun target incoerente | Must | M | D1 | Difetto [dimostrato: target 110 kcal accettato] | I tre casi di F-07 diventano test corretti |
| D12 | Nutrienti: sconosciuto ≠ 0, copertura del dato, sale/sodio, avvisi non medicalizzanti | Should | M | D6 | Difetto [dimostrato per il sale] | Tabella sale/sodio, copertura parziale (F-09) |
| D13 | Carboidrati periodizzati sul carico e fueling durante l'esercizio come intervalli (120 g/h mai default) | Should | L | D11 | Mancante | Soglie documentate con fonti |
| D14 | Idratazione e sodio durante sforzi lunghi: indicazione prudente, non prescrittiva | Could | M | D13 | Mancante | Nessun supplemento automatico |
| D15 | Disponibilità energetica / REDs come indicatore orientativo, mai diagnosi | Could | M | D11 | Mancante | Testo prudente, rimando a un professionista |
| D16 | Suite numerica delle formule (tabella specifica §5) con calcolo indipendente | Must | S | – | **Fatto** (`tests/nutrition-baseline.test.js`) | Verde |
| D17 | Versioni degli algoritmi e data di attivazione: lo storico non cambia retroattivamente | Must | M | D6 | Mancante | Backup verificato, prova di ripristino (F-11) |
| D18 | **AEE senza digitare le kcal dell'orologio** (richiesta 24/10): AEE = EAT netto (da intervals.icu, corretto per dispositivo) + NEAT stimato dai passi fuori allenamento + base, con apprendimento dai dati passati e senza doppio conteggio | Should | L | D5, D7, D8, D17 | **P0 e P1 fatti** (24/10: campi in sola lettura e AEE in ombra con backtest, senza influenzare i target); P2–P3 (attivazione, rimozione di «Watch kcal») dopo il confronto sui dati reali e l'approvazione | Passi con e senza corsa, regressione su dati sintetici, provenienza, interruttore `neatMode` (F-12) |


## E. AI Meal Planning
| ID | Requisito | Pri | C | Dip | Stato | Criteri di accettazione |
|---|---|---|---|---|---|---|
| E1 | Piani da data X a Y e scorciatoie (settimana, prossima, N giorni, intervallo) | Should | M | B2 | Parziale | Stesso selettore di B2 |
| E2 | Pasti realistici: abitudini, preferenze, disponibilità, allenamenti, fabbisogni, varietà | Should | L | C1, E5 | Parziale | Metriche di varietà e vincoli verificabili |
| E3 | Modalità Svuota Storage (scadenze, confezioni aperte, minimo spreco/acquisti) | Should | L | A4, E5 | Parziale | Risparmio misurabile su fixture |
| E4 | Strategie spesa economica/normale/premium con prezzi reali o stime dichiarate | Could | M | B6 | Mancante | Prezzo reale vs stima etichettato |
| E5 | Motore di ottimizzazione con vincoli; l'AI propone e spiega, non inventa valori | Should | XL | C1, D1 | Mancante | Soluzione riproducibile con seed; vincoli verificati dopo la generazione |

## F. Meteo e workout planning
| ID | Requisito | Pri | C | Dip | Stato | Criteri di accettazione |
|---|---|---|---|---|---|---|
| F1 | Posizione meteo chiara, modificabile, geolocalizzazione consensuale | Should | S | – | **Fatto** (24/10): il luogo è sempre nella riga meteo, «Use my current location» con permesso e coordinate; cambio con la città | Nome luogo sempre visibile |
| F2 | Grafico meteo riprogettato: pioggia nell'intervallo di allenamento, probabilità, intensità, durata, vento, temperatura percepita, incertezza | Should | M | – | Parziale | Evidenzia intervallo; mai certezza assoluta |
| F3 | Orario allenamento da intervals.icu, modificabile con sync coerente | Could | M | ENG-07 | Parziale | Nessuna scrittura remota non voluta |
| F4 | "How it will run" migliorato (fasi, intervalli, recuperi, passo, zone, condizioni) | Could | M | F2 | Parziale | Confronto con script reale |

## G. Running, sport, Intervals.icu
| ID | Requisito | Pri | C | Dip | Stato | Criteri di accettazione |
|---|---|---|---|---|---|---|
| G1 | Running prediction validata con storico, incertezza, backtest | Could | L | ENG-02 | Parziale | Errore medio su dati reali sintetici/anonimi documentato |
| G2 | Obiettivo km settimanali con progresso e storico | Should | S | – | **Fatto** (24/10): card «Weekly running goal» in Train › Stats › Running, storico con l'obiettivo valido in ogni settimana, grafico con linea obiettivo | Persistente; storico settimane |
| G3 | Report gara: split, passo, FC, confronto con obiettivi/precedenti | Could | L | – | Parziale | Dati mancanti gestiti |
| G4 | Sport: calcio a 5, nuoto piscina/mare, camminata, Other, importati; metriche per sport | Should | M | – | Parziale | Unità e campi per sport; nessun NaN |
| G5 | Import/sync workout verificati senza modifiche remote indesiderate | Must | M | ENG-07 | **Fatto (M6)** (API simulata, vedi ENG-07) | Test con API simulata |

## H. Forza, calisthenics, Workout Coach
| ID | Requisito | Pri | C | Dip | Stato | Criteri di accettazione |
|---|---|---|---|---|---|---|
| H1 | Esercizi personalizzati in libreria, indipendenti dal workout | Should | M | – | Mancante | Compaiono nel parser degli script |
| H2 | Statistiche forza/endurance con filtri 1/2/4/6/12 settimane | Should | M | – | Parziale | Totali coerenti con i log |
| H3 | Predizione 1RM corpo libero/zavorra/palestra, BW vs carico | Should | M | ENG-02 | Parziale | Formule documentate e testate, incertezza |
| H4 | Workout Score 1–100 (forza, calisthenics endurance, running), deterministico | Could | XL | H5, ENG-02 | Mancante | Sottopunteggi riproducibili; nessun punteggio da LLM |
| H5 | Score running per fasi/passo/zone/cadenza/contesto; sessione facile non penalizzata | Could | L | H4 | Mancante | Test su sessioni facili/intervalli |
| H6 | Sottopunteggi, positivi, criticità, suggerimenti | Could | M | H4 | Mancante | Testo da regole |
| H7 | Ricalcolo valutazione dopo la registrazione | Could | S | H4 | Mancante | Idempotente |
| H8 | Recovery prediction individuale; domande nel check-in; incertezza | Could | L | D1, H4 | Parziale | Adattiva, mostra confidenza |
| H9 | Free Workout: suggerimenti per sport/carico/piano/recupero/tempo; salvare nel piano | Should | M | H8 | Parziale | Salvataggio senza avvio |
| H10 | Workout a parole → script strutturato modificabile e verificabile | Should | M | – | Non verificato | Parser valida prima del salvataggio |

## I. Check-in, Analytics, Tools
| ID | Requisito | Pri | C | Dip | Stato | Criteri di accettazione |
|---|---|---|---|---|---|---|
| I1 | Selettore data nel Check-in, modifica giorni passati, ricalcolo statistiche | Should | S | – | **Fatto** (24/10): Check-in con giorno precedente/successivo e selettore data; giorni passati modificabili | Ricalcolo coerente; test su 3 giorni |
| I2 | Report piatti/Foods/ricette più usati, frequenze, abitudini, costi | Should | M | – | **Fatto (M4c, rifatto)**: non più un filtro di Foods ma «Progress › Nutrition › Habits» (30/60/90 giorni): giorni contati, varietà, quota dei primi 5, frasi «What stands out» (pasti ripetuti, fonte principale di proteine, weekend vs settimana, costo al giorno, proteine per euro), per pasto, fonti di proteine e calorie, costo, più usati; dal mangiato o, se nulla è spuntato, dal piano | Numeri ricalcolati a mano nei test (`tests/ux-habits.test.js`) |
| I3 | Calcolatori sportivi (1RM, carichi fino a 10RM, ritmi…), formule e limiti | Could | M | – | Mancante (in `02f43a9`) | Più formule a confronto |
| I4 | Contatore push-up via sensore di prossimità | Won't (ora) | L | spike | Mancante | Spike: se non fattibile, alternativa (DeviceMotion/camera) |

## J. Redesign UX/UI
| ID | Requisito | Pri | C | Dip | Stato | Criteri di accettazione |
|---|---|---|---|---|---|---|
| J1 | Sidebar richiudibile desktop/tablet, preferenza persistente | Should | S | – | **Fatto** (24/10): menu laterale ↔ rail su tablet e desktop, scelta ricordata, bottom bar su telefono | Persistente; screenshot 3 viewport |
| J2 | Animazioni di sezione, movimento ridotto rispettato | Could | S | – | Parziale | Nessuna animazione con `prefers-reduced-motion` |
| J3 | Correzione sistematica di overlap, overflow, icone, testi tagliati, touch | Must | L | ENG-01 | Non verificato | Scansione automatica + screenshot; target touch ≥44px |
| J4 | Design system condiviso (colori, tipografia, spacing, componenti, grafici, stati) | Should | XL | J3 | Parziale | Token documentati; riduzione `!important` |
| J5 | Redesign progressivo verificato su telefono, tablet, desktop | Should | XL | J4 | Non verificato | Screenshot per milestone |
| J6 | Nuovo logo e nuove grafiche (icona dell'app e maskable, favicon, schermata iniziale, icone di sezione, illustrazioni degli stati vuoti, grafica delle story) coerenti con il design system (richiesta 24/10, dentro M13) | Should | L | J4 | Mancante | Set unico di asset in tutte le dimensioni, chiaro/scuro, verificato su telefono/tablet/desktop e come PWA installata |

## K. Daily Journal (richiesta 24/10 — approvata e fatta in M4b)
Riuso: i dati vivono nel documento del giorno (`S.logm[mese].days[data]`, campo `jr`), quindi sincronizzazione, backup, offline, esportazione Excel e isolamento tra account esistono già; navigazione di data del Check-in (I1), grafici a serie (`seriesChart`), griglia mensile del calendario di allenamento, sistema di funzioni AI opzionali (`AI_FEATS`), promemoria opzionali già presenti. Nessuna tabella nuova.
| ID | Requisito | Pri | C | Dip | Stato | Criteri di accettazione |
|---|---|---|---|---|---|---|
| K1 | Voci del giorno: produttività 1–5, umore (5 volti disegnati, nessuna emoji), energia 1–5, stress 1–5, nota di una frase; tutto facoltativo | Should | M | I1 | **Fatto (M4b)**: sheet `journal`, 4 righe da 5 tap + una frase (140 car.), salvataggio a ogni tap, tap su risposta scelta = cancella | Una schermata, un tap per voce, ≤10 s, salvataggio automatico a ogni tap, nessun campo obbligatorio |
| K2 | Giorni passati modificabili con la stessa navigazione di data del Check-in | Should | S | I1, K1 | **Fatto**: stesso selettore giorno del Check-in (`dayNavHTML`), non oltre oggi | Si compila ieri/qualsiasi giorno; ricalcolo dei riepiloghi |
| K3 | Accesso rapido a fine giornata: card in Today dopo una certa ora e scorciatoia dal Check-in; promemoria opzionale, spento di default | Should | S | K1 | **Fatto**: card su Today dalle 18 se il giorno è vuoto (sparisce appena compilato); promemoria serale spento di default, solo con l'app aperta come gli altri promemoria locali | Nessuna notifica invasiva; la card sparisce quando il giorno è compilato |
| K4 | Nessuna duplicazione con il Check-in: sonno, RHR, HRV, passi, acqua, DOMS, allenamenti, note restano nel Check-in; il Journal li legge e non li ripete | Must | S | K1 | **Fatto**: nessun campo duplicato; il Check-in ha solo il collegamento, il Journal mostra in sola lettura sonno/HRV/passi/allenamenti | Nessun campo duplicato; un solo punto di inserimento per dato |
| K5 | Recap settimanale, mensile, annuale: medie, trend, giorni migliori/peggiori, variazioni, copertura («12 giorni su 30») | Should | L | K1 | **Fatto**: Progress › Journal, settimana/mese/anno con navigazione, medie per voce con n giorni, differenza sul periodo precedente (solo con ≥3 giorni per parte), copertura «n di m giorni», migliori e giorni più duri | I giorni non compilati **non** sono zero e non entrano nelle medie; la copertura è sempre mostrata |
| K6 | Heatmap/calendario e grafici semplici (media mobile, barre per periodo) con componenti condivisi | Should | M | K5 | **Fatto**: calendario/settimana a celle con valore scritto + barra, riepilogo mensile dell'anno, grafico a linea (`seriesChart`) che salta i giorni vuoti | Leggibili su telefono, tablet, desktop; chiaro/scuro; accessibili (testo oltre al colore) |
| K7 | Correlazioni con sonno, allenamenti, recupero, attività fisica già registrati | Could | M | K5 | **Fatto**: Spearman, n≥14, |ρ|≥0.3, intervallo di Fisher che escluda 0, formulazione «tends to coincide», avviso sui confronti multipli | Solo con campione minimo e forza minima; formulazione «tende a coincidere», mai «causa»; ordinale (Spearman); intervallo di incertezza |
| K8 | Riepilogo AI facoltativo (spento di default), concreto e non giudicante, con suggerimenti pratici | Could | M | K5, K7 | **Fatto**: spento di default, richiede un servizio AI, riceve solo aggregati (mai le note), etichetta «Generated by AI» | Funzione disattivabile in Settings come le altre AI; l'AI riceve solo aggregati e non inventa numeri; etichetta «generato dall'AI» |
| K9 | Privacy ed esportazione: dati privati per account, modificabili, inclusi nel backup, nel Full backup JSON e nell'Excel (foglio «Journal») | Must | S | K1 | **Fatto**: nel documento del giorno → backup JSON, sync e isolamento per account invariati; foglio Excel «Journal» | Export→reset→import identico; test di isolamento |
| K10 | Giorni mancanti, modifiche successive e conflitti di sync gestiti | Must | S | K1 | **Fatto**: unione per campo con tempo di modifica (`jr.t`), cancellazione = modifica (valore null conservato), unione applicata agli snapshot del server e rispedita | Modifica da due dispositivi: vince l'ultima per campo; test con sync simulata |

## Debito tecnico e pulizia (regola permanente)
| ID | Voce | Stato |
|---|---|---|
| T1 | `FA_DEF`, `cFinal`, `plPrefs` definiti e mai usati (baseline) | Proposto per M14 |
| T2 | ≈34 wrapper di `SHEETS.*`/`VIEWS.*` che modificano l'HTML con regex (conteggio indicativo) | Ridurre quando si tocca la sezione |
| T3 | `shopRowHTML`: definizione base + ridefinizione successiva | Unificare con la lista spesa |
| T4 | Testi sorgente con «Claude» sostituiti in build con «AI» | Uniformare nel sorgente |
| T5 | ~960 `!important` nel CSS | J4 |

## Won't Have per ora (rinviati, non cancellati)
- I4 contatore push-up (dopo spike di fattibilità).
- E4 strategie di spesa premium/economica (dopo B6).
- G1 backtesting avanzato; G3 report gara completo (dopo H4).
- Riscrittura dell'architettura (framework, bundler): non richiesta; si valuta solo se i test mostrano che blocca i requisiti.

## L. Richieste del 24/10 (seconda ondata) — dove sono state messe
Regola dell'utente: ciò che riguarda milestone già fatte si fa subito (**M4f**); il resto si aggrega alle milestone non ancora fatte. Il redesign totale (M13) resta l'ultima milestone prima dei controlli finali (M14).

| ID | Richiesta | Milestone | Stato |
|---|---|---|---|
| L1 | NEAT giorno per giorno dai passi (formula approvata dall'utente il 24/10): giorni con passi e senza corsa/camminata = costo dei passi + base appresa (≥14 giorni con orologio e passi); altrimenti comportamento attuale, segnalato | M7a2/P2 (ora) | **Fatto (24/10)** `tests/neat-steps.test.js`: stesso risultato dei calcoli indipendenti; base appresa solo dai giorni precedenti; il valore digitato dell'orologio vince |
| L2 | Sezione prezzo/stock di «New food» più curata (screen) | M4f (ora) | **Fatto**: «Price paid» + «for 1 kg / 1 pack / 1 piece» a larghezza uguale e i tre prezzi calcolati dal vivo |
| L3 | Integratori nel Check-in: design e usabilità migliori | M4f (ora) | **Fatto**: lista a righe grandi (preso / in ritardo / non preso), «Mark all as taken», stock che segue |
| L4 | Togliere «How the pantry works» | M4f (ora) | **Fatto**: rimosso |
| L5 | «Stock on» gestito meglio; vedere cosa e quanto resta in magazzino per la settimana successiva (spesa settimanale con piano già fatto per la prossima) | M4f (ora) | **Fatto**: «Left on <data>» con Questa settimana / Prossima / 14 giorni, tutti gli articoli, quelli che finiscono prima, barra, «Show all» |
| L6 | Modificare la grandezza del pack dalla lista della spesa | M4f (ora) | **Fatto**: campo «Pack size in the shop» nella scheda del prodotto in lista (cambia il cibo ovunque) |
| L7 | Lista «prossima settimana»: «x g left over» non coerente (finiscono prima) — controlli di coerenza su tutta la catena piano ↔ scorta ↔ lista | M4f (ora) | **Fatto**: «left over» tiene conto dei giorni dopo la finestra («for later days»); stessa catena piano → scorta → lista verificata dai test |
| L8 | Design della lista della spesa (barre, chip, campo extra) | M4f (ora) | **Fatto**: selettore di periodo a segmenti, riepilogo su una riga, campo extra snello, gruppi e righe più ariosi |
| L9 | Today › This week: ✗ rosso e ✓ verde se salto l'allenamento | M4f (ora) | **Fatto**: ✓ verde, ✗ rosso, «n/m» ambra se a metà |
| L10 | «Grafica time» buggata nella vista PC | M4f (ora) se riproducibile | **Fatto**: riprodotto (Timer e allenamento dal vivo schiacciati in una colonna di 256 px sul computer: regressione del menu laterale di M4) e corretto |
| L11 | Passaggio tra pagine da smartphone: il menù scompare per un attimo | M4f (ora) | **Fatto**: su telefono niente più View Transition a schermo intero (faceva lampeggiare la barra in basso), dissolvenza leggera della sola pagina; da confermare sul telefono |
| L12 | Animazioni minimal e moderne in generale; valutare i gesti | M13 | Aggregata |
| L13 | Mezzo pack / un pack come quantità di un ingrediente di ricetta | M5a | **Fatto (24/10)** |
| L14 | «What can I cook»: scegliere pasto e data | M5b | **Fatto (24/10)**: selettore di giorno come nel Check-in, e quello che aggiungi finisce lì |
| L15 | Condivisione allenamento come story: usabilità, bug grafici da smartphone, testi compressi | M11 | Aggregata |
| L16 | Vitamine e minerali stimati con l'AI quando l'etichetta non li riporta; parte da rifare | M7e | Aggregata |
| L17 | Supermercati: cambiare un prodotto in lista e di conseguenza nel piano (se nuovo → Foods), sostituzione con scansione dal vivo; prezzo in offerta o aumento permanente; scansionare e depennare; prezzi diversi per supermercato; scelta del supermercato in lista (prodotti di un altro restano in lista) | **M3b** (nuova, dopo M3) | **Fatto** (24/10/2026): supermercati e prezzi per negozio (M3b-1); «Replace this product» dal foglio Buy con anteprima (pasti e ricette toccati), grammi uguali o calorie uguali, annulla con un tocco, prodotto nuovo via barcode/ricerca/Foods; scansione per depennare dalla lista (M3b-2) |
| L18 | Reminder impostabili per misure, foto e test di corsa (con il test da fare) per ricalcolare zone e ritmi | M11 | Aggregata |
| L19 | Consigli alimentari dettagliati pre-gara (per sport) e post-gara; strategia di gara dettagliata | M9 (Food Coach) / M11 | Aggregata |
| L20 | Segnalare i PB di corsa e calisthenics e metterli in automatico nei record | M11 | Aggregata |
| L21 | Modificare i macro scansionando l'etichetta | M8 | Aggregata |
| L22 | Avviso se il check-in giornaliero non è fatto, con «Skip today»; promemoria opzionale (spento di default) | M4f | **Fatto (24/10)**: card su Today finché c'è una pesata/% grasso/kcal digitate o un salto; il salto vale solo per quel giorno |
| L23 | «Left on» chiuso di default; selettore del periodo della spesa che non si sovrappone | M4f | **Fatto (24/10)** |
| L24 | Spesa: «Replace» anche con uno swipe sulla riga; «Bought» prima dello scanner; pulsante Shopping veloce nella riga rapida di Today | M3b (ritocco) | **Fatto (24/10)** |
| L25 | Sezione supermercati compatta (una sola riga con la pillola del negozio, scelta e gestione nel foglio «Store») e funzioni aggiunte coerenti col design | M3b (ritocco) | **Fatto (24/10)**; regola permanente in AGENTS.md |
| L26 | Pagina prima di avviare un allenamento rifatta (più smart, bella, usabile); allenamento del giorno con suggerimenti: progressione, meno ripetizioni/serie, cambio esercizio (anche con IA) e un tasto che applica le modifiche scelte tra quelle consigliate | M10 (pagina e applicazione) + M11 (logica di progressione dai dati) | Aggregata |
| L27 | Contaflessioni con sensore negli allenamenti live, disattivabile | M12 (con lo spike push-up I4) | Aggregata |
| L28 | Auto-plan: intervallo di date personalizzato (da X a Y) e nessuna sovrascrittura se un pasto ha già qualcosa | M9 | Aggregata |

