# Level (Progress › Level) — impostazione «dura»

Dove ti trovi su una scala **fissa e severa**, cosa è sopra/sotto il tuo livello e quando arrivi alla linea successiva. Non cambia nessuna formula nutrizionale. Codice: `LV_*`, `lvPos`, `lvLabel`, `lvPct`, `lvRunner`, `lvCalis`, `lvStage`, `lvEta`, `lvInsights`, `levelView` in `source/engine.html`; test in `tests/m11c.test.js` (blocco «M11h»).

## Scala
Starter < **Beginner** < **Novice** < **Intermediate** < **Advanced** < **Elite**. Posizione continua: 3,0 = linea Intermediate, 3,5 = metà strada verso Advanced («Intermediate → Advanced 50%», i nomi intermedi da 15 %), oltre Elite fino a 5,99.

**Impostazione dura (richiesta 25/10: «12 trazioni pulite e nessun muscle-up non possono essere intermedio»).** Le scale pubblicate di Running Level e Strength Level usano i percentili 5 / 20 / 50 / 80 / 95 di chi registra risultati. Qui ogni livello richiede la **fascia successiva**: Beginner = meglio del 20 %, Novice = 50 %, Intermediate = 80 %, Advanced = 95 %, Elite = lo stesso passo ancora (≈ 99 %, estrapolazione geometrica: linea4² / linea3). `lvPct(p)` converte la posizione in percentile (0→0, 1→20, 2→50, 3→80, 4→95, 5→99).

## Runner
Miglior risultato degli ultimi 365 giorni (gara, time trial, test, PB; 1,5–43 km) → tempo equivalente sui 5 km con l'equivalenza VDOT di Daniels (`vdotOf`, `predictMin`) → posizione sul logaritmo del tempo.
Linee 5K (s): uomini 1578 · 1361 · 1186 · 1050 · 929 (26:18, 22:41, 19:46, 17:30, 15:29); donne 1908 · 1639 · 1418 · 1242 · 1088. Fonte: Running Level, età 20, **nessuna correzione per età**. Controllo indipendente: 15:29 al 5K ≈ 80 % age-graded WMA («classe nazionale»).
Consigli: lunga vs corta (soglia 0,4 livelli tra la migliore distanza ≤ 15 km e la migliore ≥ 15 km), efficienza aerobica del Lab (±2 % sulle 6 settimane precedenti), «registra una distanza diversa».

## Calistenico (media delle aree con dati)
- **Strength**: 1RM aggiunto al corpo (e1RM Epley su top set e test RM, peso corporeo alla data) in % del peso corporeo. Linee dalle tabelle Strength Level (kg di zavorra a 80 kg, **una fascia sopra**): trazione 8 · 34 · 63 · 93 · 137 kg, dip 25 · 50 · 85 · 125 · 184 kg → divise per 80 (`LV_STR`).
- **Endurance**: ripetizioni massime strette (test «Max reps»). **Linee proprie** (nessuna tabella autorevole; ancorate ai prerequisiti: 10 trazioni strette prima del muscle-up, FitnessVolt): trazioni 5 · 10 · 15 · 22 · 30; dip 8 · 15 · 25 · 35 · 50; piegamenti 20 · 35 · 50 · 70 · 90.
- **Skills**: handstand 10 · 20 · 40 · 75 · 120 s e L-sit 5 · 10 · 20 · 40 · 60 s (scala logaritmica); muscle-up stretto 1 · 3 · 5 · 10 · 15 rep; front lever per stadio (tuck 1, advanced tuck 2, straddle 3, full 4) e planche (tuck 1, advanced tuck 2, straddle 3,5, full 4,5): lo stadio vale per intero a 15 s, proporzionale sotto, l'ultimo prosegue oltre i 15 s. **Una skill mai registrata vale 0** (solo se almeno una skill è registrata): senza muscle-up non si arriva a Intermediate nelle Skills.
- Donne: linee di forza e ripetizioni al 60 % (convenzione dell'app, non una misura).
- I tempi dei circuiti **non** sono valutati: nessuna scala esterna.
- **Affidabilità**: runner e forza media; ripetizioni e skill bassa (linee dell'app), dichiarato in schermata.

## Consigli (complimenti e punti deboli, `lvInsights`)
Spinta vs tirata (≥ 0,4 livelli di differenza), forza vs endurance (≥ 0,5), skill indietro (≥ 0,7 sotto la migliore tra forza ed endurance), punto di forza (≥ 0,5 sopra il livello complessivo), «più forte del N % di chi registra» sulle voci con dati reali (Strength Level), top % complessivo da Advanced, skill non registrate.

## Tempo al livello successivo
Livello a fine di ciascuno degli ultimi 12 mesi (miglior risultato della finestra di 365 giorni a quella data) → retta ai minimi quadrati (livelli al mese) con errore standard (minimo 10 % della pendenza). Intervallo = distanza alla linea / (pendenza ± errore). Nessuna stima se: meno di 4 punti, meno di 90 giorni, pendenza < 0,01 livelli/mese, in calo, già Elite. Oltre 60 mesi: «più di 5 anni». Il progresso rallenta vicino al limite: è lo scenario migliore, e l'app lo dice.
