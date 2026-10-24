# Verifica dei requisiti — primo prompt e richieste in corso d'opera (24/10/2026)

Metodo: confronto riga per riga del **testo originale** del primo prompt (sezioni A–J, 1–7) e di tutti i messaggi successivi (letti dalla trascrizione della sessione) con `PRODUCT_REQUIREMENTS.md`, `ROADMAP.md` e i test. Stato: **Fatto** = implementato e con test eseguiti · **Parziale** = esiste una parte · **Da fare** = aggregato a una milestone · **Decisione** = serve una tua scelta. Nessun requisito risulta perso: ogni voce sotto ha un ID nel backlog e una milestone.

## 1. Primo prompt

| Sezione | Voci | Stato | Dove / quando |
|---|---|---|---|
| 1–2 Ruolo, MoSCoW, roadmap, backlog unico | tutte | Fatto | `PRODUCT_REQUIREMENTS.md`, `ROADMAP.md`, `BASELINE_AND_AUDIT.md` |
| 3 Principi: fonte unica, test realistici, UX misurabile, release sicure | tutte | Fatto (continuo) | 280 test; scenario a 7 giorni (`scenario.test.js`); rollback indicato a ogni pubblicazione. «UX misurabile» (clic/tap prima-dopo) è stata applicata a livello di singole schermate, **non** come tabella di metriche: da includere in M14 |
| A1 modifica Storage da più sezioni | | Fatto | M2/M4d, ritocchi M8a («At home») |
| A2 prezzi e confezioni (½, ¼, frazioni, g/ml/unità) | | Fatto | M2, M4f, M5a |
| A3 Pantry ricerca/ordine/filtri/preferenze | | Fatto | M2 |
| A4 inventario predittivo | | Fatto | M2, M4d («Left on», «Stock on») |
| A5 Open Food Facts | | Fatto | M6 + M8b (scansioni chiare) |
| A6 alimento mancante: ricerca esterna / stima AI con conferma | | Fatto | M8a/M8b |
| A7 categorie con AI su richiesta | | Fatto | M8a; correzione categorie sbagliate (Drinks) |
| B1–B6 spesa e costi | | Fatto | M1, M3, M4d, M4f, M3b |
| C1–C6, C8 Recipe Engine, import, settimana, scambio, filtri, icona | | Fatto | M4, M5a/b, M8b |
| C7 Food Coach realistico | | **Da fare** | M9 (E2–E5) |
| D1–D4, D6–D17 nutrizione scientifica | BMR/TDEE/NEAT/EAT, vista «Come calcolato», D13–D15 (carboidrati periodizzati, idratazione/sodio, EA/REDs) | **Da fare** (con la tua approvazione formula per formula) | M7b, M7c, M7d, M7e. Fatti: D16 (test di base), D5a (dispositivo per sport), D18 P0–P2 (AEE in ombra, NEAT dai passi attivo) |
| E1 piani da X a Y | | Fatto | M9a |
| E2–E5 pasti realistici, Svuota Storage, strategie di spesa, motore di ottimizzazione | | **Da fare** (XL, rischio alto: proposta a parte) | M9 |
| F1 posizione meteo | | Fatto | M4 |
| F2–F4 grafico meteo, orario da intervals.icu, «How it will run» | | **Da fare** | M10 |
| G1 running prediction validata | | Parziale | M11 |
| G2 obiettivo km settimanale | | Fatto | M4 |
| G3 report gara | | Parziale | M11 |
| G4 altri sport | | Parziale | M11/M12 |
| G5 import/sync intervals.icu senza modifiche indesiderate | | Fatto | M6 |
| H1–H9 forza, calisthenics, score, recovery, Free Workout | | **Da fare** | M11 (H1 esercizi personalizzati, H2–H3 statistiche e 1RM, H4–H7 score, H8 recovery, H9 Free Workout) |
| H10 workout a parole → script | | Fatto (già c'era, verificato in M8b) | **Dove si trova:** Today › «Free» › nel foglio «Free workout», sopra il campo dello script, **«Describe it or photo»**; e nell'editor di una seduta pianificata (Plan a workout / Train › calendario › +) accanto a «Workout»: lì il risultato viene scritto nella seduta che stai modificando («Use it in this workout»). Senza un servizio AI il collegamento c'è comunque e dice cosa aggiungere in Settings |
| I1 data nel Check-in | | Fatto | M4 |
| I2 report abitudini | | Fatto | M4c (Progress › Nutrition › Habits) |
| I3 calcolatori sportivi | | **Da fare** | M12 |
| I4 contatore push-up con sensore | | **Da fare** (spike di fattibilità) | M12 |
| J1 sidebar richiudibile | | Fatto | M4 |
| J2–J6 animazioni, correzioni sistematiche, design system, redesign, logo | | **Da fare** (ultima milestone prima degli audit) | M13 |
| 5 Qualità: riprodurre i bug prima, sicurezza, offline, backup | | Fatto (continuo) | M6; `security.test.js`, `persistence.test.js`; ENG-05 (migrazioni con versione dati) **ancora da fare** |
| 5 Audit generale finale + 3 viewport | | **Da fare** | M14 (revisione critica, nuova) e M15 (audit finale e repository) |
| 6–7 Collaborazione, matrice, roadmap, proposta nutrizione | | Fatto | documenti in `docs/` (NUTRITION_AUDIT, NUTRITION_SPEC, AEE_ENGINE_PROPOSAL, SECURITY_AUDIT, CLEANUP_REPORT) |

## 2. Richieste arrivate in corso d'opera

| Richiesta | Stato | Note |
|---|---|---|
| Documento nutrizione/«libro» come riferimento | Fatto (documentato) | `NUTRITION_SPEC.md`; le formule restano da approvare una a una |
| Dispositivo FC per sport (Amazfit/Polar), predefinito per sport | Fatto D5a / **D5b da fare** | D5b = uso nel calcolo kcal (M7b) |
| Filtri Foods «solo i necessari e utili» | Fatto | M4c/M5b; aggiunto «Drinks» su tua richiesta |
| M7a dati sicuri e D5a | Fatto | |
| Pubblicare `main` | Fatto a ogni milestone | ultimo: ba3bed4 |
| «17 foods moved to the right aisle» al refresh | Fatto | non riscrive più a ogni sincronizzazione (`sync-gating.test.js`) |
| Logo e grafiche insieme al redesign | **Da fare** | M13 (J6) |
| Role/planner/good for più semplice, preferiti con stella, leave-out rimosso | Fatto | M4c/C9 |
| AEE senza «Watch kcal» | **Parziale** | P0–P2 fatti (NEAT dai passi attivo); rimozione di «Watch kcal» (P3) e «P2 resto» **in attesa del confronto sui dati reali e della tua approvazione** |
| Top food fuori posto, emoji meno «trash», Check-in sempre raggiungibile con integrazione | Fatto | M4c |
| NEAT più preciso dai passi | Fatto | formula approvata da te |
| Daily Journal (K1–K10) | Fatto | M4b |
| Design di «New food», integratori nel Check-in, tolto «How the pantry works», «Stock on» richiudibile | Fatto | M4f |
| Stock della settimana successiva, pack modificabile dalla lista, controlli di coerenza «left over» | Fatto | M4d/M4f |
| ½ pack / 1 pack nelle ricette | Fatto | M5a |
| ✓/✗ nella settimana di Today | Fatto | M4f |
| Grafica «time» in vista PC | Fatto | M4f (L10) |
| **Reminder per misure, foto e test di corsa (con quale test fare)** | **Da fare** | L18 → M11 |
| **Animazioni minimal; gesture** | **Da fare** | L12 → M13; il flicker del menu su telefono è corretto ma **da confermare sul tuo telefono** |
| «What can I cook» con pasto e data | Fatto | M5b |
| **Share workout come story** (usabilità, testi compressi) | **Da fare** | L15 → M11 |
| **Vitamine e minerali stimati dall'AI, parte rifatta** | **Da fare** | L16 → M7e |
| Sostituzione prodotto in lista e piano, nuovo → Foods, scansione live | Fatto | M3b (+ swipe) |
| Offerta/prezzo permanente, scansione per depennare, prezzi per supermercato, scelta del negozio | Fatto | M3b |
| **Consigli pre/post gara e strategia di gara** | **Da fare** (servono coefficienti da approvare) | L19 → M9b/M11 |
| **PB automatici nei record (corsa, calisthenics)** | **Da fare** | L20 → M11 |
| Modifica macro da etichetta | Fatto | M8a |
| Check-in giornaliero con avviso e «Skip», «Left on» chiuso | Fatto | M4f |
| Replace con swipe, ordine Bought/scanner, tasto lista veloce in Today | Fatto | |
| **Pagina pre-avvio rifatta, progressioni/riduzioni/cambio esercizio (anche AI) con tasto «applica»** | **Da fare** | L26 → M10/M11 |
| **Contaflessioni con sensore nei live, disattivabile** | **Da fare** | L27 → M12 |
| Auto-plan custom da X a Y senza sovrascrivere | Fatto | M9a |
| Negozio come campo del food, tutto = Lidl, scansione nel filtro negozio, lista a tutto schermo con marca | Fatto | M3b ritocchi |
| Edit dalla lista, duplicati, «At home» più completo | Fatto | M8a |
| Scansioni chiare, «+ Food» con scan e salva/piano, Drinks, «Bought at» chiaro, stessi macro e stessa marca | Fatto | M8b |
| Pack diversi ≠ duplicato; AI dai servizi impostati con failover; spunta annullabile; ritorno alla lista; categorie | Fatto | ritocchi 24/10 |
| **Milestone di revisione critica (usabilità, sicurezza, progettazione, limiti)** | **Da fare** | M14 |
| **Marca visibile ovunque** (inventario, Foods, ricette, replace…) | **In corso (questa sessione)** | vedi sotto |

## 3. Cosa mancava o era incoerente (trovato da questa verifica)

1. `D5` risultava «Mancante» nel backlog pur essendo fatto D5a: **corretto**. `ENG-09` rimandava a «M13»: **corretto** (ora M15).
2. «UX misurabile» (clic/tap prima/dopo): applicata ma non misurata in tabella: **aggiunta a M14**.
3. ENG-05 (migrazioni con versione dei dati): ancora da fare; **associata a M14**.
4. Il censimento dei percorsi «apro-modifico-torno indietro» è fatto solo per la lista da Today: **M14**.
5. In sospeso con te: **S-1** (chiavi nel cloud), confronto sui dati reali per D18, conferma sul telefono del flicker del menu.

## 4. Riepilogo numerico
Backlog: 94 requisiti tecnici/funzionali + 43 richieste in corso d'opera (L1–L43). Fatti o verificati: tutti i blocchi A, B, C (tranne C7), E1, F1, G2, G5, I1, I2, J1, K1–K10, L1–L11, L13, L14, L17, L21–L25, L28–L37, L39–L43. Da fare: D (quasi tutto), E2–E5, C7, F2–F4, G1/G3/G4, H1–H9, I3, I4, J2–J6, L12, L15, L16, L18, L19, L20, L26, L27, L38.
