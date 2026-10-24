# Architettura (baseline `cae350d`)

## Panoramica
- PWA statica, servita da GitHub Pages. Nessun framework né bundler: HTML+CSS+un `<script>` in `source/engine.html` (~12.6k righe), UI generata come stringhe HTML e inserita con `setHTML`; eventi delegati tramite `data-act` (→ `ACT[...]`), `data-in` (→ `INP[...]`), `data-chg` (→ `CHG[...]`), `data-form`.
- Build (`source/build-web.js`): sostituisce testi "Claude"→"AI", minifica CSS/JS (lightningcss, terser), antepone `source/web/shim.js` (layer Supabase), appende `icu-direct.js` e `after.js`, scrive `index.html`, `sw.js` (con id build), manifest. Gli artefatti sono committati nella root.
- Service worker: network-first con timeout, cache separata per `vendor/`, `ocr/`, `icons/`; push e notification click.
- CSP in `<meta>`: `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob: cdnjs`; `connect-src https: wss: localhost`.

## Dati
- Stato in memoria `S = {settings, foods, recipes, days, queue, logm, shop, body, train}`; salvataggio `put(kind,id,data)` → `localStorage["fuelplanner.v1"]` + coda verso Supabase (`engine_docs(user_id, path, data jsonb)` con RLS per proprietario, realtime). Debounce 380 ms, retry su `unavailable`, errore di quota segnalato.
- Documenti singoli: `settings`, `shop`, `body`, `train`. Collezioni: `foods`, `recipes`, `days` (un giorno = un documento), `logm` (log giornalieri raggruppati per mese).
- `S.shop` contiene: `pantry[id] = {g, exp, pw, pk, u}` (giacenza in grammi/ml/unità base), `checked`, `extras[]`, `prices[id] = {eur, g, hist[], at}`, `buys[]`, `range`.
- Piano: `S.days[date].meals[mealId] = [item]`, item `{id, kind: food|recipe|quick, ref, qty, eaten, …}`; fabbisogni calcolati da `shoppingNeeds(start, n)` (esclude `eaten` e `quick`).
- Cache calcoli: `memo()` invalidata con `DATA_V`.

## Domini e funzioni chiave
| Dominio | Funzioni | Note |
|---|---|---|
| Energia | `energySeries`, `sessionKcal`, `learnedRates`, `phaseFor` | BMR (Mifflin/HB/MET) + NEAT + EAT (MET netti, kcal/min apprese) + TEF, calibrato sul trend peso 14 gg |
| Running | `VDOT`, `racePredictions`, zone Friel, carico/fitness/fatica/forma | |
| Forza | `e1rm`, `calisTable`, `topSetTable`, script parser (sintassi tipo intervals.icu) | |
| Pasti | `dayTotals`, `balanceDay`, auto-planner, `recipePerServing` | `balanceDay` altera quantità per colpire i macro |
| Spesa/Dispensa | `stockPlan` (modello unico: scorta prenotata dai pasti collegati `it.pan`, giorno per giorno da oggi, ricette incluse; sola lettura), `shoppingRows`, `shoppingCovered`, `stockOn`, `pantryForecast`, `stockSet/stockAdd/undoStock`, `stockBoxHTML`, `priceSet/priceViews`, `pantryAdjust` (reversibile, `it.took`), `linkFromPantry`, `applyShopMode` (finestre della lista) | La scorta riduce la lista solo per i pasti collegati alla dispensa (scelta di prodotto) |
| Sensori FC | `devList`, `devOf` (sensore della sessione, altrimenti predefinito dello sport) | Solo dati: nessuna kcal cambia (M7a) |
| Integrazioni | intervals.icu (sync diretta bidirezionale), Open-Meteo, Open Food Facts, OCR Tesseract, ZXing, AI (Gemini/Groq/OpenRouter con chiave utente) | |

## Debito tecnico rilevante (vedi rischi R2–R10 in `BASELINE_AND_AUDIT.md`)
1. Unico scope con `const` top-level → rischio TDZ.
2. Pattern "wrapper": una sezione più in basso riassegna `SHEETS.x`/`VIEWS.x` e modifica la stringa HTML con `replace(regex)`.
3. Logiche duplicate: formule macro in più punti. (Le tre ridefinizioni di `shoppingNeeds/shoppingRows` sono state unificate in M1.)
4. Nessun test; stato di build non verificato automaticamente.

## Principi per l'evoluzione
- Introdurre un modulo di dominio unico per quantità/unità/prezzi/scorte e far chiamare quello da Foods, Recipes, Plan, Pantry, Shopping (M1), senza riscrivere il resto.
- Nuove funzioni = nuove sezioni commentate nel sorgente, con handler registrati dopo la dichiarazione del loro registro.
- Ogni modifica a una sheet: cercare tutti i wrapper (`grep -n "SHEETS.<nome>"`).
