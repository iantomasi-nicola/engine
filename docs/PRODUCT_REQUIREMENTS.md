# Backlog unico dei requisiti (MoSCoW)

Fonte: mandato dell'utente del 2026-10-24 (sezioni A–J) + requisiti tecnici emersi dall'audit (ENG). Non esistevano altri documenti di requisiti nella repo: l'inventario delle funzioni esistenti è in `BASELINE_AND_AUDIT.md §4`. Nessun requisito è stato rimosso: i rinviati stanno in "Won't (per ora)".

Stato misurato sulla baseline `cae350d` (dettagli ed evidenze in `BASELINE_AND_AUDIT.md §3`). Complessità: S ≤ ½ giornata · M ≈ 1–2 giorni · L ≈ 3–5 giorni · XL > 1 settimana. Milestone: vedi `ROADMAP.md`.

## ENG — Requisiti ingegneristici (nuovi, dall'audit)
| ID | Requisito | Pri | C | Dip | Stato | Criteri di accettazione |
|---|---|---|---|---|---|---|
| ENG-01 | Smoke test di avvio su 3 viewport (zero `pageerror`/errori console, UI visibile), eseguibile con un comando | Must | S | – | **Fatto** (`tests/smoke.js`; fallisce su `02f43a9`, passa su `cae350d`) | Fallisce sul build di `02f43a9`, passa su `cae350d` |
| ENG-02 | Test delle funzioni di dominio (energia, VDOT, e1RM, ricette, spesa, dispensa) su fixture sintetiche | Must | M | ENG-01 | **Base fatta** (12 test in `tests/domain.test.js`, eseguiti nell'app reale); da estendere per ogni milestone | Test verdi; i comportamenti da cambiare sono marcati `KNOWN (<id>)` |
| ENG-03 | Test e2e dello scenario 7 giorni (piano → modifica → scorte → consumo → acquisto → inventario/spesa/nutrienti), poi reload, offline, sync simulata | Must | L | ENG-01, M1 | Mancante | Scenario descritto in `ROADMAP.md §Scenario`, Supabase simulato in memoria |
| ENG-04 | Build riproducibile: verificare che `index.html`/`sw.js` di root derivino dal sorgente | Must | S | – | **Fatto** (`tests/check-build.js`; baseline identica byte per byte) | Script che ricostruisce e confronta (ignorando il timestamp di build) |
| ENG-05 | Backup/restore verificato su dati sintetici, migrazioni con versione dati | Must | M | ENG-02 | **Backup/restore verificato** (`tests/persistence.test.js`: reload, offline, export→wipe→restore, chiavi escluse); migrazioni con versione ancora da fare | Export→reset→import restituisce stato identico; migrazione con rollback |
| ENG-06 | Audit sicurezza: isolamento RLS, segreti (chiavi AI/intervals in `settings`/export), CSP, input esterni (OFF, GPX/FIT, AI) | Must | M | – | Non verificato | Report con finding e fix; nessun segreto negli export di default |
| ENG-07 | Audit scritture verso intervals.icu (nessuna modifica remota non voluta) | Must | M | – | Non verificato | Elenco di tutte le chiamate di scrittura; modalità di prova senza rete reale |
| ENG-08 | Guardia di ordinamento delle dichiarazioni (TDZ) | Should | S | ENG-01 | **Coperto dallo smoke test** (ogni TDZ all'avvio azzera l'app e fa fallire `smoke.js`); nessun lint statico | Lint che fallisce sulla causa di `02f43a9` |
| ENG-09 | Sistemazione finale della repository (richiesta dell'utente): struttura, documentazione, codice morto, dipendenze, script, artefatti di build, README | Should | M | tutte | Mancante | Checklist in `ROADMAP.md` M13 approvata dall'utente |

## A. Foods, Pantry e Storage
| ID | Requisito | Pri | C | Dip | Stato | Criteri di accettazione |
|---|---|---|---|---|---|---|
| A1 | Modifica quantità in dispensa da Foods, Meal Plan e Storage (esatta, ±rapido); mostra disponibilità, unità, prezzo, confezione | Must | M | M1 | Parziale | Stesso valore ovunque dopo ogni modifica e dopo reload; ≤2 tap per ±; test e2e |
| A2 | Prezzi/confezioni: €/kg, €/unità, €/confezione, quantità nominale, porzioni, ½ ¼ frazioni, valori esatti g/ml/unità | Must | M | M1 | Parziale | Nessuna conversione arbitraria; round-trip esatto; test su arrotondamenti |
| A3 | Pantry: ricerca, A–Z/Z–A, filtri utili, preferenze persistenti | Should | S | – | Parziale (solo scadenza) | Preferenza sopravvive al reload; recuperabile da `02f43a9` previa verifica |
| A4 | Inventario predittivo a data X con pasti/ricette associati e data di esaurimento | Must | L | M1 | **Motore fatto** (`stockOn(data)`, `endsOn`); schermata in M2 | Proiezione non altera la giacenza; risultato coincide con simulazione giorno per giorno |
| A5 | Open Food Facts: ricerca, barcode, normalizzazione, porzioni, dati incompleti, dedup, errori, cache, attribuzione | Should | M | – | Parziale | Nessun latch permanente; cache con scadenza; attribuzione ODbL visibile; test con risposte simulate |
| A6 | Alimento mancante: ricerca esterna o stima AI, distinti da dati ufficiali, conferma prima di salvare | Should | M | A5 | Non verificato | Badge "stima"; nessun salvataggio senza conferma |
| A7 | Comando AI per suggerire/correggere la categoria dei nuovi Foods, senza ricategorizzare gli esistenti | Could | S | – | Mancante | Solo su richiesta; mai in massa |

## B. Shopping List e costi
| ID | Requisito | Pri | C | Dip | Stato | Criteri di accettazione |
|---|---|---|---|---|---|---|
| B1 | Correggere bug Storage ↔ Shopping (duplicati, acquisti inutili, quantità incoerenti) | Must | M | M1 | **Corretto nel sorgente** (24/10): ricette collegabili alla dispensa, stock prenotato giorno per giorno da oggi, mangiare/de-spuntare reversibile (`it.took`), niente duplicati dopo la spunta; test in `tests/stock.test.js` | Bug riprodotti con test prima del fix |
| B2 | Filtri rapidi: settimana da oggi, prossima settimana, prossimi X giorni, intervallo | Must | S | M1 | Parziale | Fabbisogni ricalcolati; giorni passati esclusi; test di date a cavallo di mese/anno |
| B3 | Prodotti coperti dalle scorte in elenco richiudibile, con data di fine e pasti; coperture parziali | Must | M | M1, A4 | **Motore fatto** (`shoppingCovered`: coperto, parziale, data di esaurimento, pasti); interfaccia in lavorazione | Totale acquisti = fabbisogno − scorta proiettata, mai negativo |
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
| C8 | Icona ricetta disallineata nel Meal Plan e problemi UI analoghi | Must | S | – | Buggato | Screenshot prima/dopo su 3 viewport |

## D. Nutrizione scientifica (richiede proposta approvata — `NUTRITION_PROPOSAL.md`)
| ID | Requisito | Pri | C | Dip | Stato | Criteri di accettazione |
|---|---|---|---|---|---|---|
| D1 | Rivedere BMR, TDEE, NEAT, EAT, attività, macro, distribuzione, micronutrienti, sodio, idratazione, atleta ibrido | Must | XL | proposta approvata, libro dell'utente | Parziale | Ogni formula con fonte, ipotesi, limiti, test |
| D2 | Check-in: verificare NEAT/EAT senza doppi conteggi | Must | M | ENG-02 | Non verificato | Test sintetici per le 3 modalità orologio |
| D3 | Vista opzionale (Settings) con formule, valori e passaggi | Should | M | D1 | Parziale | Disattivabile; stessi numeri dell'algoritmo |
| D4 | Algoritmi deterministici, spiegabili, testati, documentati | Must | M | D1 | Parziale | Documento + test per ogni formula |

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
| F1 | Posizione meteo chiara, modificabile, geolocalizzazione consensuale | Should | S | – | Parziale | Nome luogo sempre visibile |
| F2 | Grafico meteo riprogettato: pioggia nell'intervallo di allenamento, probabilità, intensità, durata, vento, temperatura percepita, incertezza | Should | M | – | Parziale | Evidenzia intervallo; mai certezza assoluta |
| F3 | Orario allenamento da intervals.icu, modificabile con sync coerente | Could | M | ENG-07 | Parziale | Nessuna scrittura remota non voluta |
| F4 | "How it will run" migliorato (fasi, intervalli, recuperi, passo, zone, condizioni) | Could | M | F2 | Parziale | Confronto con script reale |

## G. Running, sport, Intervals.icu
| ID | Requisito | Pri | C | Dip | Stato | Criteri di accettazione |
|---|---|---|---|---|---|---|
| G1 | Running prediction validata con storico, incertezza, backtest | Could | L | ENG-02 | Parziale | Errore medio su dati reali sintetici/anonimi documentato |
| G2 | Obiettivo km settimanali con progresso e storico | Should | S | – | Mancante (in `02f43a9`) | Persistente; storico settimane |
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
| I1 | Selettore data nel Check-in, modifica giorni passati, ricalcolo statistiche | Should | S | – | Parziale | Ricalcolo coerente; test su 3 giorni |
| I2 | Report piatti/Foods/ricette più usati, frequenze, abitudini, costi | Should | M | – | Parziale | Numeri riconciliati con il piano |
| I3 | Calcolatori sportivi (1RM, carichi fino a 10RM, ritmi…), formule e limiti | Could | M | – | Mancante (in `02f43a9`) | Più formule a confronto |
| I4 | Contatore push-up via sensore di prossimità | Won't (ora) | L | spike | Mancante | Spike: se non fattibile, alternativa (DeviceMotion/camera) |

## J. Redesign UX/UI
| ID | Requisito | Pri | C | Dip | Stato | Criteri di accettazione |
|---|---|---|---|---|---|---|
| J1 | Sidebar richiudibile desktop/tablet, preferenza persistente | Should | S | – | Mancante (in `02f43a9`) | Persistente; screenshot 3 viewport |
| J2 | Animazioni di sezione, movimento ridotto rispettato | Could | S | – | Parziale | Nessuna animazione con `prefers-reduced-motion` |
| J3 | Correzione sistematica di overlap, overflow, icone, testi tagliati, touch | Must | L | ENG-01 | Non verificato | Scansione automatica + screenshot; target touch ≥44px |
| J4 | Design system condiviso (colori, tipografia, spacing, componenti, grafici, stati) | Should | XL | J3 | Parziale | Token documentati; riduzione `!important` |
| J5 | Redesign progressivo verificato su telefono, tablet, desktop | Should | XL | J4 | Non verificato | Screenshot per milestone |

## Won't Have per ora (rinviati, non cancellati)
- I4 contatore push-up (dopo spike di fattibilità).
- E4 strategie di spesa premium/economica (dopo B6).
- G1 backtesting avanzato; G3 report gara completo (dopo H4).
- Riscrittura dell'architettura (framework, bundler): non richiesta; si valuta solo se i test mostrano che blocca i requisiti.
