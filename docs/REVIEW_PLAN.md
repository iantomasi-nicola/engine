# Revisione integrale del progetto con gli agenti (milestone M14, richiesta del 26/10/2026)

**Obiettivo.** Una revisione sistematica dell'intera app dopo il redesign (M13d) e le formule (M7b): funzioni, bug, dati, sync/offline, animazioni e movimento ridotto, accessibilità, prestazioni, sicurezza e grafica, con agenti che lavorano in parallelo e producono un elenco di difetti **confermati con una riproduzione**, poi corretti a gruppi. Non si cancellano funzioni; ogni correzione ha il suo test.

**Quando.** Dopo M7b e M13d (le aree cambiano ancora) e prima di M15 (pulizia finale). Modelli e impegno: nessun `max`; niente modelli con crediti extra senza l'ok dell'utente.

## Fasi
1. **Preparazione (agente principale, Sonnet medium).** Aggiornare `docs/PRODUCT_REQUIREMENTS.md` e `docs/REQUIREMENTS_CHECK.md` (`docs-keeper`); suite e audit verdi (`test-runner`); inventario delle aree sotto.
2. **Audit in parallelo, sola lettura** (`area-auditor`, una istanza per area, Sonnet high; Opus high per le aree 5, 6 e 11). Ognuno scrive il suo elenco in `docs/review/<area>.md` fuori dal sorgente.
3. **Revisione di sintesi** (`code-guard` su tutta la repo, Opus high): duplicati, codice morto, wrapper fragili, regressioni rispetto alla baseline `cae350d`.
4. **Grafica e animazioni** (`design-reviewer`, Opus high) su tutte le schermate: 390/820/1440, chiaro e scuro, stati vuoti e pieni, movimento ridotto, sezioni chiuse di default.
5. **Triage** (agente principale + utente): ogni difetto GRAVE o MEDIO confermato entra nel backlog con ID (`R-n`), LIEVE e PLAUSIBILE in coda; le correzioni rischiose o di formule restano all'approvazione dell'utente.
6. **Correzioni** (`milestone-builder` in worktree, un gruppo per area, Sonnet high), test prima per ogni bug; poi `code-guard`, `test-runner`, `design-reviewer`, `docs-keeper`, `release-manager`.
7. **Verifica finale**: suite + audit chiaro e scuro, nuova passata `area-auditor` solo sulle aree con difetti GRAVI, `release-check`, rapporto in `docs/CLEANUP_REPORT.md`.

## Aree (un `area-auditor` ciascuna)
1. Fuel: Meals, piano settimanale, planner automatico, cheat/treat, sgarri, coach. 2. Foods, ricette, import ricetta (foto, testo, link), Open Food Facts, barcode. 3. Shopping, pantry, scontrino, prezzi, scadenze. 4. Train: calendario, Workouts, Programs, Season, trascinamento, copia/incolla, intervals.icu scritture. 5. **Live player e Tools**: tutti i tipi di blocco, timer, voce, audio, wake lock, ripresa dopo ricarica, Race circuits. 6. **Numeri energetici e nutrizionali** (TDEE, calibrazione, target, macro, batteria, sonno, massa magra, peso stimato) con ricalcolo indipendente. 7. Running: zone, VDOT, previsioni, analisi attività, score. 8. Forza e calisthenics: Records, Level, test day, Journal/DOMS, suggerimenti. 9. Progress e report (settimana, mese, all-time, PDF, export). 10. Settings, sync Supabase, backup/ripristino, migrazioni dei dati, esportazioni. 11. **PWA, offline, service worker, prestazioni** (bundle, `render()`, liste lunghe, avvio a freddo, memoria), sicurezza (chiavi, `esc()`, input esterni) e accessibilità. 12. Foto di progresso e cloud.

## Criteri di completamento
Nessun difetto GRAVE aperto; ogni difetto MEDIO corretto o motivato; nessuna animazione senza `prefers-reduced-motion`; avvio a freddo e `render()` misurati e documentati (P1); zero `pageerror` su tutti gli schermi e viewport; elenco completo in `docs/CLEANUP_REPORT.md`.
