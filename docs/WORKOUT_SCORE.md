# Workout Score (M11e, 25/10/2026)

Punteggio da 1 a 100 per ogni allenamento registrato. **Regole proprie dell'app**, non un indice pubblicato né validato; calcolato solo dai dati registrati (nessun AI, nessun LLM), mai salvato (si ricalcola da `workoutScore(date, w)`: stessi dati, stesso risultato). Non modifica mai il piano.

## Forza e calisthenics
| Parte | Peso | Come |
|---|---|---|
| Completion | 35 | 60% serie fatte / pianificate + 40% ripetizioni fatte / pianificate (il piano — `plan: {u, r}` — è salvato con la sessione al momento del salvataggio). Senza piano la parte è esclusa. |
| Progress | 30 | Per ogni esercizio con una sessione precedente (ultimi 120 giorni): miglior serie ora / miglior serie la volta prima (e1RM con peso corporeo, funzione `e1rm`). 70 + (rapporto − 1) × 600, tra 35 e 100: stesso livello = 70, +5% = 100, −5% = 40. Media sugli esercizi. |
| Effort | 20 | RPE 7–9 = 100; 6 o 10 = 85; 5 = 70; ≤ 4 = 55. |
| Volume | 15 | Ripetizioni totali / media delle ultime 4 sessioni dello stesso allenamento: 0,85–1,2 = 100, sotto cala di 2 punti per punto percentuale (minimo 50), sopra cala di 0,5 (minimo 50 → 70 oltre). |

## Corsa e altri sport di resistenza
| Parte | Peso | Come |
|---|---|---|
| Execution | 40 | Minuti fatti / pianificati: 0,9–1,15 = 100; sotto 100 − (0,9 − q) × 150 (minimo 40); sopra 100 − (q − 1,15) × 80 (minimo 60). Senza tempo pianificato esclusa. |
| Intensity | 30 | FC media rispetto all'intento (pianificato o registrato). **Leggero**: ≤ tetto della Zona 2 = 100, poi −3 per bpm (minimo 30) — *una corsa facile che resta facile ha il massimo*. **Duro**: ≥ tetto Z3 − 5 = 100, poi −2,5 per bpm (minimo 40). **Moderato**: tra Z1 − 10 e Z3 + 5 = 100. Richiede le zone (soglia impostata o test). |
| Pacing | 20 | Variazione (CV) dei passi degli split: ≤ 4% = 100, 10% = 60, minimo 40. Servono ≥ 3 split; non giudicato per sessioni dure/intervalli. |
| Effort | 10 | RPE rispetto all'intento: leggero 1–4, moderato 5–7, duro 7–9 = 100; −20 per punto di scarto. |
Altri sport: solo Execution (40) ed Effort (10).

## Totale, testi, limiti
Le parti senza dati sono escluse e le altre contano di più; sotto 45 di peso disponibile non c'è punteggio. Etichette: ≥ 85 Excellent, ≥ 70 Solid, ≥ 55 Fair, altrimenti Off plan. Le frasi (cosa è andato bene, cosa correggere, suggerimenti) vengono da regole fisse per parte. **Non coperto**: cadenza, fasi di una corsa a intervalli, contesto (meteo, dislivello, sonno), confronto con le zone di potenza. **Soglie e pesi sono scelte dell'app, da tarare con i tuoi dati.**
Test: `tests/m11c.test.js` (M11e): casi costruiti a mano per forza e corsa, idempotenza, assenza di dati, scheda a schermo su 390/820/1440 px.

## Resistenza con analisi della registrazione (M11g, 25/10/2026) — più severa
Quando la sessione ha `an` (scaricata da intervals.icu, vedi `analyseStreams`) il punteggio usa dati ai secondi. Tutte le soglie sono **scelte dell'app**, interpolazione lineare tra i punti.
| Parte | Peso | Punti (valore → punti) |
|---|---|---|
| Execution | 20 | scarto dal piano su tempo (e km): 5% → 100, 10% → 85, 20% → 60, 35% → 35, 50% → 15 |
| Intensity (continua) | 30 | Leggero: % del tempo in Z1–2: 40 → 15, 60 → 40, 75 → 65, 85 → 85, 92 → 100. Moderato: % in Z2–4: 30 → 20, 50 → 50, 70 → 80, 85 → 100. Duro: % sopra Z2: 10 → 20, 30 → 50, 50 → 80, 65 → 100. Senza stream: FC media |
| Pacing | 25 | CV degli split dal 2° km (≥ 3 split giudicati): 2% → 100, 3,5 → 80, 5 → 60, 8 → 35, 12 → 10; se il dislivello supera 15 m/km il CV si divide per 1,5; secondo tempo più lento di p% oltre 1,5 → meno (p − 1,5) × 6 punti (max 40) |
| Heart drift | 15 | decoupling Pa:Hr (≥ 20 min, non per sessioni dure): 2% → 100, 5 → 75, 8 → 50, 12 → 25, 15 → 10 |
| Effort | 10 | RPE fuori dalla fascia dell'intento: −25 punti per punto |
**Ripetute** (≥ 2 «WORK» e almeno un «RECOVERY» da intervals.icu): Execution 20, Intensity 30 (FC media delle ripetute vs intento), **Reps 40** (CV delle velocità: 1,5% → 100, 3 → 80, 5 → 55, 8 → 30, 12 → 10, meno (calo − 3) × 6 punti se l'ultima è più lenta delle prime due), Effort 10. Il pacing continuo non si giudica.
Test: `tests/m11c.test.js` («severe endurance score»), valori calcolati a mano.

