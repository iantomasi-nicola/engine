# M14b gruppo B — numeri energetici (area 6): report delle correzioni

Ramo `worktree-agent-a43f4aaa5cdc4914f` (base `04e2a7a`). Test nuovi: `tests/m14b-energy.test.js` (20 test, valori attesi calcolati a mano nei commenti). Prima del fix, sul sorgente `04e2a7a`: 19 su 20 rossi (resta verde solo l'avvio). Dopo: 20/20 verdi, avvio con `app.errors` vuoto.

Test dei file toccati, tutti verdi (212 + 62, anche dopo il cambio di data al 26/10): m14b-energy, m7b, m7b-bmr, m7b-data, m7c, nutrition-baseline, f09, neat-steps, domain, aee-shadow, intervals, m13a, m11c, scenario. Riallineati 9 test vecchi che fissavano il comportamento cambiato dalle voci approvate, con i nuovi valori calcolati a mano nei commenti: `m7b` D20 (276 → 260, 350 → 313, 285 → 267, per #4) e modalità total (2600 − 1780 − 600 → 2600 − 1780 − 526, per #3); `m7c` F-11 e D3 (registro ALGO con 10 voci); `neat-steps` (la nota del Check-in tiene il numero dei passi).

**Non eseguiti:** suite completa (`npm run verify`), `layout-audit`, screenshot 390/820/1440 e tema scuro, `design-reviewer`. Cambiano a vista solo testi (Check-in, Day deficit, Energy, Weeks, Goal) e la tessera Form («—»).

## Voci

| # | Stato | Cosa cambia | Numeri prima → dopo (fixture del test) |
|---|---|---|---|
| 1 | fatta | `heightCm()` unica (120–230 cm, altrimenti 175) in `bmrBy`, `STEP_KCAL`, cammino del shadow, testi Energy/«How it is calculated», riepilogo Profile; BMI, vita/altezza e scheda profilo usano `heightCm(true)` (niente altezza presunta). Il campo rifiuta valori fuori intervallo (toast, torna al valore salvato) | altezza vuota/0/1,8: BMR 605 → 1748,75; NEAT da passi 1,8 «cm» assurdo → 473,9 |
| 2 | fatta | Oggi, ramo con base appresa: passi proiettati a sera (`neatSrc` nuovo `stepsProj`, testi in `tdeeBasis`, `NEAT_SRC`, spiegazione) | 09:00, 1500 passi, mediana 8000: 354,3 → 605,5 |
| 3 | fatta | Modalità Total: la sessione si toglie netta del riposo come nell'EAT (D5b) | NEAT 420 → 494; BMR+NEAT+EAT = 2900 = totale orologio |
| 4 | fatta (approvata) | EAT da FC netto del riposo (`hrKcal`), stesso valore nell'AEE in ombra; interruttore `energy.hrNet`, data `hrNetFrom`, voce ALGO v8. **D20**: il rapporto appreso diventa (kcal reali nette + riposo)/Keytel, altrimenti un sensore con storico sarebbe nettato due volte (scelta mia, da confermare) | 60′ a 130 bpm, 80 kg: 557 → 482; sensore proprio (6 sessioni a 482 reali): resta 482 (col vecchio rapporto sarebbe 445) |
| 5 | fatta | `eatenFor` = `intakeFor` (il totale digitato nel Check-in vince, come dice il Check-in) | Day deficit −683 contro bilancio +17 → stesso numero |
| 6 | fatta, con una deviazione | «NEAT from steps = Off» spegne anche la base appresa. `neatFrom` NON la condiziona: la base appresa (M7a2) è precedente a D18 e i giorni prima della data cambierebbero | off: 455,1 → 600 (media 7 gg) |
| 7 | fatta | `seKeep` si azzera quando `calibV2` dà null (il fattore resta) | 40 gg dopo i dati: «Calibrated · 100% reliable» → «Calibrating…» |
| 8 | fatta | Ora di letto e `btHM` arrotondano i minuti totali | 22:58,8 «22:00» → «23:00»; btHM(22,995) «22:00» → «23:00» |
| 9 | fatta | Card Yesterday: `kc.kcal` | «NaN kcal eaten» → «2,200 kcal eaten» |
| 10 | fatta (approvata) | Età sul calendario (`lastBirthday`, 29/2 conta dal 1/3); BMR Auto: passaggio lineare in 14 giorni dopo il compleanno che cambia formula; interruttore `bmrRamp`, data `bmrRampFrom`, voce ALGO v9 | 1993-10-25 → 33 anni il 25/10/2026 (prima 32), 32 il 24/10. 36° compleanno: 1948,6 / 1940,5 / 1845,2 (g+7) / 1750 (g+14) invece del gradino 1948 → 1750 |
| 11 | fatta (approvata) | `kpkAt()` (Hall per grasso corporeo, `kcalPerKgFor`) per ETA, `estKg`, settimana, Day deficit, peso stimato, report di periodo, kpi Goal e testo Energy; data `kpkFrom`, voce ALGO v10; `kcalPerKgMode = fixed` resta il rollback. Calibrazione legacy lasciata con il valore fisso | BF 20 %, 80 kg: 7000 → 6406 kcal/kg; perdita/settimana 0,556 → 0,607 kg |
| 12 | fatta | L'ora entra nella chiave di `memo` (tutte le memo si rifanno una volta all'ora) | NEAT di oggi alle 21: 418,6 congelato → 186,8 |
| 13 | NON fatta (decisione) | Giorni passati col peso di oggi nei tassi MET/km: cambiare il tasso per kg è una formula | — |
| 14 | fatta | Check-in: «AEE − Workouts (valore sottratto) = NEAT»; l'EAT ancora pianificato in nota («N kcal of training still planned») | «1,200 − 944 = 574» → «1,200 − 700 = 500» |
| 15 | fatta | Etichette dal `neatSrc` e dalla fase: niente «(7-day)» con i passi, «maintenance/bulk set» al posto di «cut set», «formulas» al posto di «watch-based», testo Energy sul NEAT dai passi | testi |
| 16 | fatta | «Is the model right?» conta le pesate a parte | «now 28 and 0» → «… and 5» |
| 17 | fatta | Quota magra limitata 0–90 % (campo e `goalState`) | 100 %: ETA oggi → +7 giorni |
| 18 | fatta | Form «—» sotto CTL 10 (soglia di visualizzazione mia, da confermare) in Today, scheda Fitness, riassunto; zona null protetta | «−354 %» → «—» |
| 19 | fatta | `goalState` usa `leanEst()` quando ci sono letture | 45,98 / 45,86 → uguali |
| 20 | fatta | TEF e Default NEAT vuoti = predefinito (campo e `normalizeSettings`) | TEF vuoto 0 % → 10 % |
| 22 | fatta | «planned» = `phaseKcal` | Maintenance 5 %: ±0 → −117 |
| 23 | fatta | Una sola tendenza (`trendSimple`, memo per data) usata anche da `energySeries`: ora conta anche la pesata dell'onboarding (`S.body.w`) | onboarding 80 + 78: 78 → 79 in entrambe |
| 24 | NON fatta (decisione) | Storico riscritto quando cambiano formula/profilo | — |
| 25 | fatta | `weightsSeries` in memo (copia restituita) e `trendSimple` in memo per data | non misurato |

## Da finire (prossimo passo)
- Suite completa, `layout-audit`, screenshot 390/820/1440 e tema scuro (cambiano testi del Check-in, tessera Form, scheda Fitness), `design-reviewer`.
- `docs/CLEANUP_REPORT.md`, PRODUCT_REQUIREMENTS, ROADMAP (non toccati, come chiesto).
- Pulizia: `trendAt` ora è solo un alias di `trendSimple` (lasciato per non toccare 13 chiamate e i test che lo usano).

## Domande per l'utente
1. Data di attivazione delle voci v8–v10: uso `ALGO_START` (2026-10-25) per i profili esistenti; se la pubblicazione avviene più tardi i giorni intermedi vengono ricalcolati. Serve una data diversa?
2. D20 con FC netta: il rapporto appreso diventa (reale netto + riposo)/Keytel. Va bene?
3. Soglia CTL 10 per mostrare la forma in %.
4. #6: lasciare la base appresa fuori da `neatFrom` (per non riscrivere i giorni passati)?
5. #13 e #24: decisioni di formula aperte (tasso per kg del giorno; versionare formula/profilo per lo storico).
