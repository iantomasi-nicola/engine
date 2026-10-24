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
| ENG-06 | Audit sicurezza: isolamento RLS, segreti (chiavi AI/intervals in `settings`/export), CSP, input esterni (OFF, GPX/FIT, AI) | Must | M | – | Non verificato | Report con finding e fix; nessun segreto negli export di default |
| ENG-07 | Audit scritture verso intervals.icu (nessuna modifica remota non voluta) | Must | M | – | **Parziale** (24/10): inventario delle scritture verso intervals.icu in `AEE_ENGINE_PROPOSAL.md §9` e test «un sync senza nulla in sospeso legge soltanto»; resta l'audit dei casi con elementi in coda | Elenco di tutte le chiamate di scrittura; modalità di prova senza rete reale |
| ENG-08 | Guardia di ordinamento delle dichiarazioni (TDZ) | Should | S | ENG-01 | **Coperto dallo smoke test** (ogni TDZ all'avvio azzera l'app e fa fallire `smoke.js`); nessun lint statico | Lint che fallisce sulla causa di `02f43a9` |
| ENG-09 | Sistemazione finale della repository (richiesta dell'utente): struttura, documentazione, codice morto, dipendenze, script, artefatti di build, README | Should | M | tutte | Mancante | Checklist in `ROADMAP.md` M13 approvata dall'utente |

## A. Foods, Pantry e Storage
| ID | Requisito | Pri | C | Dip | Stato | Criteri di accettazione |
|---|---|---|---|---|---|---|
| A1 | Modifica quantità in dispensa da Foods, Meal Plan e Storage (esatta, ±rapido); mostra disponibilità, unità, prezzo, confezione | Must | M | M1 | **Fatto nel sorgente** (24/10): riquadro «At home» (− / quantità esatta / +, libero/prenotato, confezione, prezzo) nell'editor Food e nella scheda quantità del Meal Plan; «at home» nel sottotitolo delle liste Foods; sheet esatta con ritorno alla schermata di partenza e Undo; test `tests/pantry.test.js` | Stesso valore ovunque dopo ogni modifica e dopo reload; ≤2 tap per ±; test e2e |
| A2 | Prezzi/confezioni: €/kg, €/unità, €/confezione, quantità nominale, porzioni, ½ ¼ frazioni, valori esatti g/ml/unità | Must | M | M1 | **Fatto nel sorgente** (24/10): prezzo per kg/l, confezione o pezzo (nessuna conversione senza peso confezione/pezzo), ¼ ½ confezione e frazioni digitate (1/3, 1 1/2, 0,5) esatte, grammi esatti | Nessuna conversione arbitraria; round-trip esatto; test su arrotondamenti |
| A3 | Pantry: ricerca, A–Z/Z–A, filtri utili, preferenze persistenti | Should | S | – | **Fatto nel sorgente** (24/10): ricerca (nome, marca, nome italiano), ordine scadenza/A–Z/Z–A/categoria, filtri Use soon/Spare/Set aside, preferenze salvate nelle impostazioni | Preferenza sopravvive al reload; recuperabile da `02f43a9` previa verifica |
| A4 | Inventario predittivo a data X con pasti/ricette associati e data di esaurimento | Must | L | M1 | **Fatto nel sorgente** (24/10): scheda «Stock on <data>» nel Pantry (3/7/14 giorni o data): scorta oggi → alla data, giorno di esaurimento, pasti collegati; sola lettura | Proiezione non altera la giacenza; risultato coincide con simulazione giorno per giorno |
| A5 | Open Food Facts: ricerca, barcode, normalizzazione, porzioni, dati incompleti, dedup, errori, cache, attribuzione | Should | M | – | Parziale | Nessun latch permanente; cache con scadenza; attribuzione ODbL visibile; test con risposte simulate |
| A6 | Alimento mancante: ricerca esterna o stima AI, distinti da dati ufficiali, conferma prima di salvare | Should | M | A5 | Non verificato | Badge "stima"; nessun salvataggio senza conferma |
| A7 | Comando AI per suggerire/correggere la categoria dei nuovi Foods, senza ricategorizzare gli esistenti | Could | S | – | Mancante | Solo su richiesta; mai in massa |

## B. Shopping List e costi
| ID | Requisito | Pri | C | Dip | Stato | Criteri di accettazione |
|---|---|---|---|---|---|---|
| B1 | Correggere bug Storage ↔ Shopping (duplicati, acquisti inutili, quantità incoerenti) | Must | M | M1 | **Corretto nel sorgente** (24/10): ricette collegabili alla dispensa, stock prenotato giorno per giorno da oggi, mangiare/de-spuntare reversibile (`it.took`), niente duplicati dopo la spunta; test in `tests/stock.test.js` | Bug riprodotti con test prima del fix |
| B2 | Filtri rapidi: settimana da oggi, prossima settimana, prossimi X giorni, intervallo | Must | S | M1 | **Fatto nel sorgente** (24/10): This week (da oggi a domenica, giorni passati esclusi), Next week, Next 7 days, Custom da–a (24/10: tolti 1/3/14 giorni e la data iniziale su richiesta; una scelta precedente diventa un intervallo personalizzato); scelta persistente; test `tests/stock.test.js` | Fabbisogni ricalcolati; giorni passati esclusi; test di date a cavallo di mese/anno |
| B3 | Prodotti coperti dalle scorte in elenco richiudibile, con data di fine e pasti; coperture parziali | Must | M | M1, A4 | **Fatto nel sorgente** (24/10): elenco richiudibile "covered by what's at home" con quantità, parziale, data di esaurimento e pasti; test su telefono senza overflow | Totale acquisti = fabbisogno − scorta proiettata, mai negativo |
| B4 | Rimuovere la nota "Not in the plan yet" dal Pantry (decisione utente 24/10; la voce originale chiedeva sezioni comprimibili) | Should | S | – | **Fatto nel sorgente** (24/10, test `tests/pantry-ui.test.js`); non ancora nella build di root; l'azione "Plan meals" resta raggiungibile da un pulsante in testata | La nota non compare più; nessun altro elemento del Pantry cambia; test di regressione sul render |
| B5 | Extra non alimentari separati, cronologia, autocompletamento, ricorrenti; costi senza nutrienti | Should | M | – | Parziale | Nessun extra compare in Foods/nutrienti |
| B6 | Stima spesa per intervallo, media settimanale, dettaglio prodotto, previsto/effettuato/alimentare/extra | Should | M | M1 | Parziale | Totali riconciliati con lo storico acquisti |

## C. Recipes e Meal Plan
| ID | Requisito | Pri | C | Dip | Stato | Criteri di accettazione |
|---|---|---|---|---|---|---|
| C1 | Recipe Engine: dosi, unità, porzioni, istruzioni, tempi, macro, costi, scaling | Must | L | M1 | Parziale | Macro e costo derivano dagli stessi Foods; scaling lineare testato |
| C2 | Creare/modificare ricette da Recipes e Meal Plan; ingrediente mancante con flusso guidato senza perdere il lavoro; storico coerente | Must | L | C1 | Parziale | Modificare una ricetta non altera i pasti storici (snapshot) |
| C3 | Import ricetta da testo/immagine/camera con AI, associazione ai Foods, tutto modificabile prima del salvataggio | Should | L | C1, A6 | Parziale | Nessun salvataggio automatico; dati AI marcati |
| C4 | Meal Plan settimanale completo su desktop/tablet: panoramica, modifica diretta, drag & drop, copia, duplica, sposta, undo, alternative al trascinamento | Should | L | M5 | Parziale | Ogni azione ha alternativa a tap/tastiera e undo |
| C5 | Scambio pranzo↔cena con un'azione | Should | S | – | Mancante | Ingredienti/dosi/ricette preservati; undo |
| C6 | Filtri in aggiunta Foods: P/C/F, combinazioni, verdure, in/fuori Storage, classificazioni motivate | Should | M | – | Parziale | Regole documentate (soglie % energia) e testate |
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
| G5 | Import/sync workout verificati senza modifiche remote indesiderate | Must | M | ENG-07 | Non verificato | Test con API simulata |

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
| I2 | Report piatti/Foods/ricette più usati, frequenze, abitudini, costi | Should | M | – | **Fatto nella forma base** (24/10): Foods › Top (30/60/90 giorni): volte, quantità media, pasti, ultimo uso, costo a uso; dal mangiato, o dal piano se non c'è nulla di spuntato. Insight avanzati e trend: in M4b/M11 | Numeri riconciliati con il piano |
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

## K. Daily Journal (richiesta 24/10 — proposta, nessun codice finché non è approvata)
Riuso: i dati vivono nel documento del giorno (`S.logm[mese].days[data]`, campo `jr`), quindi sincronizzazione, backup, offline, esportazione Excel e isolamento tra account esistono già; navigazione di data del Check-in (I1), grafici a serie (`seriesChart`), griglia mensile del calendario di allenamento, sistema di funzioni AI opzionali (`AI_FEATS`), promemoria opzionali già presenti. Nessuna tabella nuova.
| ID | Requisito | Pri | C | Dip | Stato | Criteri di accettazione |
|---|---|---|---|---|---|---|
| K1 | Voci del giorno: produttività 1–5, umore (5 emoji), energia 1–5, stress 1–5, nota di una frase; tutto facoltativo | Should | M | I1 | Proposta | Una schermata, un tap per voce, ≤10 s, salvataggio automatico a ogni tap, nessun campo obbligatorio |
| K2 | Giorni passati modificabili con la stessa navigazione di data del Check-in | Should | S | I1, K1 | Proposta | Si compila ieri/qualsiasi giorno; ricalcolo dei riepiloghi |
| K3 | Accesso rapido a fine giornata: card in Today dopo una certa ora e scorciatoia dal Check-in; promemoria opzionale, spento di default | Should | S | K1 | Proposta | Nessuna notifica invasiva; la card sparisce quando il giorno è compilato |
| K4 | Nessuna duplicazione con il Check-in: sonno, RHR, HRV, passi, acqua, DOMS, allenamenti, note restano nel Check-in; il Journal li legge e non li ripete | Must | S | K1 | Proposta | Nessun campo duplicato; un solo punto di inserimento per dato |
| K5 | Recap settimanale, mensile, annuale: medie, trend, giorni migliori/peggiori, variazioni, copertura («12 giorni su 30») | Should | L | K1 | Proposta | I giorni non compilati **non** sono zero e non entrano nelle medie; la copertura è sempre mostrata |
| K6 | Heatmap/calendario e grafici semplici (media mobile, barre per periodo) con componenti condivisi | Should | M | K5 | Proposta | Leggibili su telefono, tablet, desktop; chiaro/scuro; accessibili (testo oltre al colore) |
| K7 | Correlazioni con sonno, allenamenti, recupero, attività fisica già registrati | Could | M | K5 | Proposta | Solo con campione minimo e forza minima; formulazione «tende a coincidere», mai «causa»; ordinale (Spearman); intervallo di incertezza |
| K8 | Riepilogo AI facoltativo (spento di default), concreto e non giudicante, con suggerimenti pratici | Could | M | K5, K7 | Proposta | Funzione disattivabile in Settings come le altre AI; l'AI riceve solo aggregati e non inventa numeri; etichetta «generato dall'AI» |
| K9 | Privacy ed esportazione: dati privati per account, modificabili, inclusi nel backup, nel Full backup JSON e nell'Excel (foglio «Journal») | Must | S | K1 | Proposta | Export→reset→import identico; test di isolamento |
| K10 | Giorni mancanti, modifiche successive e conflitti di sync gestiti | Must | S | K1 | Proposta | Modifica da due dispositivi: vince l'ultima per campo; test con sync simulata |

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
