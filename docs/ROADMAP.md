# Roadmap

Regola: una milestone alla volta, approvata dall'utente prima di iniziare, branch dedicato, commit atomici, test, rollback descritto. Un commit non è un deploy; il rebuild dei file di root e la pubblicazione richiedono autorizzazione.

Stato (24/10): **M0, M1, M2, M7a e le semplificazioni UX sono fatte e pubblicate su `main`** (build 202610241056). **In corso (approvate): M4 e M7a2 (AEE P0/P1).** Proposta in attesa: **M4b Daily Journal.** Baseline `cae350d` (vedi `BASELINE_AND_AUDIT.md`).

## Ordine (dipendenze → impatto → rischio)
| Milestone | Contenuto (ID) | C | Rischio | Stato |
|---|---|---|---|---|
| **M0 Rete di sicurezza** | ENG-01, 02 (base), 04, 05, 08 | M | Basso | **Completata** (da `tests/`, report all'utente) |
| M1 Dominio unico scorte↔spesa↔piano | A4 (motore), B1, B2, B3, ENG-03 | L | Alto | **Fatta e pubblicata (24/10)** |
| M2 Storage ovunque, prezzi e confezioni | A1, A2, A3, A4 (schermata) | M | Medio | **Fatta e pubblicata (24/10)** |
| M3 Spesa: extra, costi, liste lunghe | B5, B6 (B4 fatto) | M | Basso | **Fatta (24/10)**, in revisione |
| **M4f Ritocchi alle milestone fatte** (richieste 24/10: L1–L11) | L1–L11 | M | Basso | **Fatta (24/10)**, in revisione |
| M3b Spesa: supermercati, prezzi, sostituzioni, scansione | L17 | L | Medio | **Fatta** (24/10/2026, in due passi) |
| M4 Quick win UI e check-in | C8, J1, I1, G2, I2, F1 | M | Basso | **Fatta (24/10), in revisione** |
| **M4b Daily Journal** (richiesta 24/10) | K1–K10 | L | Basso | **Fatta (24/10)**, in revisione |
| M5 Recipe Engine e Meal Plan settimanale | C1, C2, C4, C5, C6, L13, L14 | XL | Medio | **Fatta (24/10)** in due passi: M5a (ricette) e M5b (piano settimanale, scambio, cook, filtri); in revisione |
| M6 Sicurezza e integrazioni | ENG-06, ENG-07, A5, G5 | M | Medio | **Fatta (24/10)**, in revisione; S-1 (chiavi nel cloud) in attesa di decisione |
| M7a Nutrizione: base sicura (nessun numero cambia) | D16, D9, D6 (provenienza del NEAT), **D5a** sensori FC per sport | M | Basso | **Fatta e pubblicata (24/10)** |
| M7a2 AEE automatico — P0/P1 (importare altri campi in sola lettura, modalità in ombra) | D18 (vedi `AEE_ENGINE_PROPOSAL.md`) | L | Medio | **P0 e P1 fatti (24/10)**: import in sola lettura e AEE in ombra; nessun numero in uso cambia. P2–P3 in attesa del confronto sui dati reali |
| M7b Nutrizione: correttezza dei calcoli (cambia i numeri, una formula alla volta con approvazione) | D7, D8, D11, D17, **D5b**, **D18** (AEE senza kcal orologio) | XL | Alto | In attesa |
| M7c Nutrizione: trasparenza «Come calcolato» | D3 | M | Basso | In attesa |
| M7d Nutrizione: BMR e target flessibili | D10, D13 | L | Medio | In attesa |
| M7e Nutrizione: nutrienti, idratazione, EA | D12, D14, D15, **L16** | L | Medio | In attesa |
| M8 AI: stime, categorie, import ricette | A6, A7, C3, H10, **L21**, L30–L32 | L | Medio | **Fatta (24/10)** in due passi: M8a (A6, A7, L21, L30–L32) e M8b (C3 import ricetta con AI, H10 verificato, L33–L37) |
| M9 Pianificazione AI e Food Coach | E1–E5, C7, **L19** (consigli pre/post gara), **L28** (auto-plan su intervallo, senza sovrascrivere) | XL | Alto | **M9a fatta (24/10)**: L28, E1; restano M9b (L19 consigli pre/post gara) e E2–E5, C7 (motore di ottimizzazione, da proporre a parte) |
| M10 Meteo e preparazione workout | F2, F3, F4, **L26** (pagina pre-avvio, suggerimenti e tasto «applica») — **M10a fatta (24/10)**: L26; restano M10b F2–F4 (meteo, orario da intervals.icu, «How it will run») | M | Basso | – |
| M11 Forza/running: statistiche, score, recovery | H1–H9, G1, G3, G4, **L15, L18, L19** (strategia di gara), **L20**, **L26** (logica di progressione) | XL | Medio | – |
| M12 Calcolatori, sport, spike push-up | I3, I4 (spike), G4, **L27** (contaflessioni nel live, disattivabile) | M | Basso | – |
| **M13 Redesign totale** — ultima milestone prima dei controlli finali: design system, **nuovo logo e grafiche**, animazioni minimal, valutazione gesti | J2–J6, **L12** | XL | Medio | – |
| **M14 Revisione critica dell'app** (richiesta 24/10) — dopo il redesign (M13), prima dell'audit finale | Ricerca sistematica di criticità: **usabilità** (percorsi chiave su telefono/tablet/desktop, errori ricorrenti, funzioni nascoste o ridondanti, coerenza di testi e componenti), **sicurezza** (ripetizione di M6, chiavi S-1, dati nel cloud, CSP), **difetti di progettazione** (dipendenze tra moduli, wrapper fragili, TDZ, CSS con `!important`, stato duplicato), **limiti** (volumi di dati, prestazioni, offline, conflitti di sincronizzazione, accessibilità, browser). Esito: elenco ordinato per gravità con proposta per ciascuna voce, da approvare prima di correggere | M | Basso | – |
| **M15 Audit finale e sistemazione repository** | Audit funzionale/sicurezza/performance/codice morto/dipendenze/UI su 3 viewport; ENG-09 (struttura repo, README, documentazione, script, artefatti di build, pulizia) | M | Basso | – |

## Primi cinque interventi per valore/sforzo
1. **M0 — test di avvio + build riproducibile** (S/M): avrebbe impedito la pubblicazione di `02f43a9`; sblocca tutto il resto.
2. **C8 — icona ricetta disallineata + scansione UI analoga** (S): bug visibile, rischio nullo.
3. **B2 + B3 (parte UI) — filtri "questa settimana da oggi / prossima" e elenco "coperti da scorta"** (M): massimo valore quotidiano; la parte corretta dipende da M1.
4. **I1 — selettore data nel check-in** (S).
5. **J1 + G2 + A3 — sidebar richiudibile, km settimanali, ricerca/ordine Pantry** (S ciascuno; esistono in `02f43a9` e vanno ripresi dopo verifica, non incollati).

## M0 — Rete di sicurezza (approvata)
**Cosa cambia**: aggiunge una cartella `tests/` e script di sviluppo (nessuna modifica a `source/engine.html`, nessuna al comportamento dell'app).
- Script `tests/smoke.js`: build non minificata in cartella temporanea, avvio in Chromium con rete esterna bloccata a 390×844, 820×1180, 1440×900; fallisce con qualsiasi `pageerror`, errore console non di rete, o body vuoto; salva screenshot.
- Verifica di riproducibilità: ricostruisce da `source/` e confronta con `index.html`/`sw.js` di root (ignorando `engine-build`).
- Harness per unit test: carica le funzioni pure dallo script dell'app in un contesto `vm` con `localStorage` finto; primi test su energia, VDOT, e1RM, shopping/pantry (caratterizzazione dello stato attuale, anche dei difetti noti, marcati).
- Test backup/restore su dati sintetici (export → svuota → import → confronto).
- Lint minimo per usi prima della dichiarazione.
- Fixture sintetiche in `tests/fixtures/`.

**Perché**: oggi un'intera app può diventare una pagina bianca senza che nessun controllo lo rilevi (è successo con `02f43a9`).
**Benefici visibili**: nessuno per l'utente finale; riduce il rischio di ogni milestone successiva.
**Complessità**: M. **Rischio**: basso (solo file nuovi; dipendenze di sviluppo fuori dalla repo o in `devDependencies` isolate).
**Completamento**: (1) smoke fallisce su `02f43a9` e passa su `cae350d`; (2) controllo build segnala se `index.html` diverge dal sorgente; (3) ≥1 test verde per area (energia, running, 1RM, spesa/scorte); (4) backup/restore sintetico verde; (5) `README` di sviluppo con i comandi; (6) nessun file dell'app modificato.
**Rollback**: eliminare la cartella `tests/` e gli script; l'app è invariata.
**Non incluso**: correzione di bug, nuove funzioni, rebuild di root, deploy.

## Scenario di verifica end-to-end (ENG-03, da M1)
Fixture: profilo sintetico, 12 Foods con confezioni e prezzi, 4 ricette, Pantry con 3 scorte (una scaduta).
1. Pianifico 7 giorni con ricette. 2. Modifico ingredienti di una ricetta. 3. Segno pasti "dalla dispensa". 4. Registro consumi (alcuni pasti mangiati, uno saltato). 5. Acquisto prodotti (completo e parziale, con prezzo). 6. Controllo inventario a oggi e a data X, lista spesa per 4 intervalli (settimana da oggi, prossima, N giorni, custom), spesa €, nutrienti del giorno e della settimana.
Ripetere dopo: reload, modalità offline, sync simulata con conflitto (due dispositivi). Invarianti: la giacenza reale cambia solo per acquisti, consumi effettivi e correzioni manuali; le proiezioni non scrivono nulla; Σ(fabbisogno) = Σ(coperto da scorta) + Σ(da acquistare).

## Registro avanzamento
| Data | Passo | Commit |
|---|---|---|
| 2026-10-24 | Baseline `cae350d` ripristinata con revert di `02f43a9`; documentazione iniziale (AGENTS, audit, backlog, roadmap, architettura, bozza nutrizione) | vedi `git log` |
| 2026-10-24 | Approvato dall'utente: baseline, M0, rimozione della nota "Not in the plan yet" del Pantry (B4) | – |
| 2026-10-24 | M0: `tests/` con smoke 3 viewport, controllo build, 12 test di dominio, 4 di persistenza/backup (16 verdi); smoke fallisce su `02f43a9`; correzione dell'audit sul dominio spesa/dispensa (logica a strati, B1/B3 riprodotti) | vedi `git log` |
| 2026-10-24 | B4: rimossa la nota "Not in the plan yet" dal Pantry (azione "Plan meals" spostata in un pulsante in testata, per non perdere la funzione); smoke corretto (nascondeva il login sotto l'overlay) | vedi `git log` |
| 2026-10-24 | M1 passo 1: `pantryAdjust` reversibile (`it.took`): mangiare toglie solo ciò che la dispensa aveva, de-spuntare restituisce lo stesso; supporta ricette. Corretto un bug di stock fantasma (riprodotto da test prima del fix) | vedi `git log` |
| 2026-10-24 | M1 passo 2: modello unico `stockPlan` (scorta prenotata dai pasti collegati dal giorno di oggi in poi, ricette incluse), `shoppingRows/Covered/stockOn`; `linkFromPantry` e interruttore "From the pantry" anche per le ricette; i test KNOWN (B1/B3) diventano test del comportamento corretto (28 verdi) | vedi `git log` |
| 2026-10-24 | M1 passo 3: finestre della lista (This week da oggi, Next week, N giorni, Custom) persistenti; elenco richiudibile "covered by what's at home" con parziali, data di esaurimento e pasti; verificato su telefono (31 test verdi) | vedi `git log` |
| 2026-10-24 | M1 passo 4: scenario a 7 giorni (ENG-03) con invariante Σ pianificato = coperto + da comprare dopo ogni passo, reload, offline e sync simulata | vedi `git log` |
| 2026-10-24 | M1: build di root rigenerata sul branch (commit dedicato, `release-check` verde: 33 test + smoke + build identica al sorgente). Nessuna pubblicazione, `main` invariato | vedi `git log` |
| 2026-10-24 | Nutrizione: ricevuta e copiata `docs/NUTRITION_SPEC.md`; audit dettagliato `docs/NUTRITION_AUDIT.md` (fonti verificate/non verificate, matrice EN-01…10, F-01…F-12); suite di baseline `tests/nutrition-baseline.test.js` (9 test, fotografano i difetti dimostrati, nessuna formula modificata); nuovi requisiti D5–D18 (dispositivo FC per sport, AEE senza kcal orologio) | vedi `git log` |
| 2026-10-24 | M2: funzioni di scorta condivise (`stockSet/stockAdd/undoStock`, `stockBoxHTML`), riquadro «At home» in Foods e Meal Plan, prezzi per kg/confezione/pezzo, frazioni di confezione, Pantry con ricerca/filtri/ordine/preferenze e previsione a una data (51 test verdi, verificato su 3 viewport) | vedi `git log` |
| 2026-10-24 | UX: filtri della spesa ridotti a This week / Next week / Next 7 days / Custom; editor Food semplificato (stella, «Counts as», senza Good for e Leave out) — richieste dell'utente; 56 test verdi | vedi `git log` |
| 2026-10-24 | Pubblicazione: `main` allineato al branch di lavoro (df96e46; Pages «pages build and deployment» riuscito alle 10:35 UTC); punto di ripristino precedente = `02f43a9` (tag remoto `restore/pre-m1-publish-2026-10-23`) | df96e46 |
| 2026-10-24 | M7a fatta: sensori FC per sport (D5a), avviso profilo incompleto (D9), provenienza del NEAT (D6), nessun numero cambia; editor Food compatto; versione nelle Settings; regola permanente Consistency & Cleanup e primo report; proposta `AEE_ENGINE_PROPOSAL.md` | vedi `git log` |
| 2026-10-24 | Fix «17 foods moved to the right aisle»: pulizie una tantum solo dopo i dati del server; avviso se la memoria del dispositivo è piena | vedi `git log` |
| 2026-10-24 | Pubblicato `main` = 621da12 (build 202610241056): M0–M2, M7a, UX, editor Food compatto, versione nelle Settings | 621da12 |
| 2026-10-24 | M4: icona ricetta (C8), menu laterale a rail (J1), Check-in con selettore di giorno (I1), obiettivo km settimanali con storico (G2), Foods › Top (I2), luogo del meteo (F1); 3 trappole TDZ evitate dai test | vedi `git log` |
| 2026-10-24 | M7a2 P0/P1: campi intervals.icu in sola lettura, AEE «in ombra» con candidati per sessione, NEAT dai passi, backtest; il motore in uso è invariato | vedi `git log` |
| 2026-10-24 | M3: extra con cronologia, autocompletamento e ricorrenza (B5); spesa per intervallo con alimentare/extra, per prodotto e previsto vs speso (B6); importi sempre con i centesimi | vedi `git log` |
| 2026-10-24 | M4b Daily Journal: voci del giorno con salvataggio a ogni tap, card serale su Today, collegamento dal Check-in, Progress › Journal (recap, calendario, giorni migliori/duri, pattern non causali), unione per campo tra dispositivi, export; interruttore in Settings › Features | vedi `git log` |
| 2026-10-24 | M4c (feedback su M4/M4b): Check-in sempre in vista su Today, integrazioni nel Check-in, volti disegnati al posto delle emoji, «Top» tolto da Foods e sostituito dal report Habits in Progress | vedi `git log` |
| 2026-10-24 | M4d: una regola sola tra piano, dispensa e lista (il piano prenota ciò che c'è in casa, mangiare lo toglie, la lista mostra solo ciò che manca); via l'interruttore «From the pantry» per singolo cibo e «Use them»; vasetto sul piano; «Stock on» richiudibile; spiegazione nella Dispensa; «add extra» in cima alla lista | vedi `git log` |
| 2026-10-24 | M6: audit di sicurezza (`docs/SECURITY_AUDIT.md`), scritture verso intervals.icu verificate con API simulata e corretto il piano che partiva con l'interruttore spento, Open Food Facts senza blocco di sessione, scansione barcode dentro le ricette, etichette dei segmenti mai tagliate | vedi `git log` |
| 2026-10-24 | M4f: NEAT dai passi (formula approvata), editor «New food» con prezzo chiaro, integratori nel Check-in a righe, «Left on» per la settimana dopo, dimensione del pack dalla lista, «left over» coerente, lista della spesa ridisegnata, ✓/✗ nella settimana, Timer a tutta larghezza sul computer, transizioni leggere su telefono | vedi `git log` |
| 2026-10-24 | M5a: motore ricette (storico congelato, scala, tempo e metodo, costo, ½ pack); M5b: scambio pranzo↔cena, «What can I cook» per giorno e pasto, vista settimana (tablet/desktop) con sposta/copia/duplica/trascina/undo, filtri P/C/F/verdure/in casa; check-in giornaliero con «Skip» | vedi `git log` |

