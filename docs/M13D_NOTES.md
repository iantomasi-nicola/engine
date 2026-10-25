# M13d — cause e correzioni proposte dei difetti grafici rimasti (26/10/2026)

Analisi di un `milestone-builder` interrotto per il limite d'uso: **nessun codice scritto**, ma ogni punto ha già la causa trovata (righe di `source/engine.html` a `c60c4b5`, cercare per nome se si sono spostate). Screenshot di partenza (solo chiaro, 13 schermate × 390/820/1440/1920): `/tmp/.../scratchpad/m13d/before/` (andati persi se il container è nuovo: rifarli). Elenco originale dei difetti: `docs/DESIGN_REPORT_1.md` («Seguito») e riga L157 di `docs/PRODUCT_REQUIREMENTS.md`.

| # | Difetto | Causa | Correzione proposta |
|---|---|---|---|
| 1 | Records e Progress a 1920 px si allargano fino a ~1600 px | `.main,.main.wide{max-width:1640px!important}` (≈ riga 2034) vale per ogni scheda; la classe di `#main` si assegna a riga ≈4271 | Nuova classe (es. `list`) per `progress` e per `train` escluso il calendario, `max-width:1120px` (è già la larghezza del contenuto a 1440). Settings è già a 980 (`set-2p`); gli assi dei grafici sono già limitati da `chartW` a 1040 |
| 2a | Today: 1.975 due volte | tile Energy in `glanceHTML` (≈15158) con 0 mangiato mostra «kcal left» = target; Fuel (≈9535) mostra «/ target» | Con 0 mangiato il tile mostra «0 kcal eaten» (**domanda aperta per l'utente: va bene questa frase?**); togliere anche «135 g protein to go» che ripete «/135 g» |
| 2b | Energy: BMR 1.750 tre volte; TDEE di oggi due volte | `energyView` (≈11337–11348): legenda, tile «in use», sottoriga di Day by day | Togliere il BMR dalla sottoriga di Day by day; nome della formula in uso nell'intestazione della sezione BMR, tile solo per le altre formule; far partire Day by day da ieri |
| 2c | Nutrition: 1.470 contro 1.467, percentuali che sommano 101% | `splitDonut` (≈4616) calcola il centro da 4C+4P+9F, il tile mostra la media delle kcal | Togliere il numero dal centro dell'anello; percentuali con arrotondamento a resto massimo (somma 100) |
| 3 | «Harris-Benedict» si spezza nel tile BMR su telefono, «%» a capo | tile `kpi` in `energyView` (≈11341) | U+2011 nel nome e spazio non separabile prima di «%» in «needs body fat %». **Stessa zona di F-01 (BMR opzionali): fare dopo il merge di F-01** |
| 4 | Today su PC/1920: 30 px tra KPI e griglia, 12 px tra le card | `.today-glance` e `.today-grid` (da misurare) | Una sola spaziatura |
| 5 | Train su PC: «Tap a day to see it below» ma il dettaglio è a destra; colonna destra vuota sotto «Today» | legenda del calendario | Testo per layout (o rimosso); riempire/nascondere la colonna |
| 6 | Pillole «• -» in Overview | `pill(i.st)` (≈4951) | Nascondere se il valore manca |
| 6 | «Logging streak» come testo isolato | ≈4554 | Quarto tile `kpi` nella `stat-grid` |
| 6 | Grafici vuoti a linea piatta | `changeChart`, `balanceChart` (≈4952) | Stato vuoto al posto della linea |
| 6 | Non ancora guardati | tacche non tonde sull'asse in Energy (2,379/2,333…), «Body weight» a mezza larghezza in Tools 1RM su telefono, riga backup che è una card solo in scuro, «Columns 6/6» da solo su una riga nei Personal bests (portarlo in `tbl-tools`), kg della lista formule in Tools 1RM non sulla colonna kg della tabella reps | da riprodurre prima |

Procedura: riprodurre → correggere nei componenti esistenti (lrow, kpi, foldView/foldOne, pillole) → `node tests/layout-audit.js <outdir>` e `--dark` a 0 → UNA revisione `design-reviewer` sulle schermate toccate → test in `tests/m13d.test.js` dove misurabile.
