# Roadmap

Regola: una milestone alla volta, approvata dall'utente prima di iniziare, branch dedicato, commit atomici, test, rollback descritto. Un commit non è un deploy; il rebuild dei file di root e la pubblicazione richiedono autorizzazione.

Stato: **M0 approvata (24/10), in corso.** Baseline `cae350d` (vedi `BASELINE_AND_AUDIT.md`).

## Ordine (dipendenze → impatto → rischio)
| Milestone | Contenuto (ID) | C | Rischio | Stato |
|---|---|---|---|---|
| **M0 Rete di sicurezza** | ENG-01, 02 (base), 04, 05, 08 | M | Basso | **Approvata, in corso** |
| M1 Dominio unico scorte↔spesa↔piano | A4 (motore), B1, B2, B3, ENG-03 | L | Alto | Da approvare |
| M2 Storage ovunque, prezzi e confezioni | A1, A2, A3 | M | Medio | – |
| M3 Spesa: extra, costi, liste lunghe | B4, B5, B6 | M | Basso | – |
| M4 Quick win UI e check-in | C8, J1, I1, G2, I2, F1 | M | Basso | – |
| M5 Recipe Engine e Meal Plan settimanale | C1, C2, C4, C5, C6 | XL | Medio | – |
| M6 Sicurezza e integrazioni | ENG-06, ENG-07, A5, G5 | M | Medio | – |
| M7 Nutrizione scientifica | D1–D4 (dopo approvazione proposta e libro) | XL | Alto | Proposta in `NUTRITION_PROPOSAL.md` |
| M8 AI: stime, categorie, import ricette | A6, A7, C3, H10 | L | Medio | – |
| M9 Pianificazione AI e Food Coach | E1–E5, C7 | XL | Alto | – |
| M10 Meteo e preparazione workout | F2, F3, F4 | M | Basso | – |
| M11 Forza/running: statistiche, score, recovery | H1–H9, G1, G3, G4 | XL | Medio | – |
| M12 Calcolatori, sport, spike push-up | I3, I4 (spike), G4 | M | Basso | – |
| M13 Design system e redesign progressivo (trasversale, per tranche) | J2–J5 | XL | Medio | – |
| **M14 Audit finale e sistemazione repository** | Audit funzionale/sicurezza/performance/codice morto/dipendenze/UI su 3 viewport; ENG-09 (struttura repo, README, documentazione, script, artefatti di build, pulizia) | M | Basso | – |

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
