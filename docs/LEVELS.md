# Level (Progress › Level)

Dove ti trovi su una scala **fissa e dura**, e quando arrivi alla linea successiva. Non cambia nessuna formula nutrizionale.

## Scala
Starter < **Beginner** < **Novice** < **Intermediate** < **Advanced** < **Elite**. Le linee corrispondono alle bande percentili usate da Running Level e Strength Level (più veloci/forti di circa 5, 20, 50, 80, 95 % di chi registra risultati). La posizione è continua: 3,0 = linea Intermediate, 3,5 = metà strada verso Advanced («Intermediate → Advanced 50%»), oltre Elite continua fino a 5,99. I nomi intermedi compaiono da 15 % in su.

## Runner
Migliore risultato degli ultimi 365 giorni (gara, time trial, test, PB; 1,5–43 km) → tempo equivalente sui 5 km con l'equivalenza VDOT di Daniels (`vdotOf`, `predictMin`) → posizione sul logaritmo del tempo.
Linee 5K (Running Level, età 20): uomini 30:38 · 26:18 · 22:41 · 19:46 · 17:30; donne 37:03 · 31:48 · 27:19 · 23:38 · 20:42. **Nessuna correzione per età**: è la versione dura.

## Calistenico (media delle aree con dati)
- **Strength**: 1RM aggiunto al corpo (e1RM Epley su top set e test RM, peso corporeo alla data) in % del peso corporeo, trazione e dip zavorrati. Linee uomini: trazione 0 · 15 · 34 · 63 · 100 %; dip 3 · 25 · 50 · 85 · 125 %.
- **Endurance**: ripetizioni massime strette (test «Max reps»). Trazione 1 · 6 · 13 · 22 · 30; dip 3 · 10 · 20 · 31 · 43; piegamenti 10 · 19 · 31 · 46 · 63.
- **Skills**: tenute su scala logaritmica (handstand 5 · 15 · 30 · 60 · 120 s; L-sit 3 · 8 · 15 · 30 · 60 s), muscle-up (1 · 3 · 6 · 10 · 15 rep), front lever e planche per stadio (tuck = 2, advanced tuck = 3, straddle = 4, full = 5: lo stadio vale per intero a 15 s, proporzionale sotto).
- Donne: linee di forza e ripetizioni al 60 % di quelle degli uomini (convenzione dell'app).
- I tempi dei circuiti **non** sono valutati: nessuna scala esterna.

Le linee di forza e ripetizioni sono la mediana, per livello, di scale pubblicate (Strength Level, Symmetric Strength, Endura, FitnessVolt). **Affidabilità**: runner e forza media; skill bassa (nessuna scala autorevole), dichiarato nell'app.

## Tempo al livello successivo
Livello a fine di ciascuno degli ultimi 12 mesi (miglior risultato della finestra di 365 giorni a quella data) → retta ai minimi quadrati (livelli al mese) con errore standard (minimo 10 % della pendenza). Intervallo = distanza alla linea / (pendenza ± errore). Nessuna stima se: meno di 4 punti, meno di 90 giorni, pendenza < 0,01 livelli/mese, in calo, già Elite. Oltre 60 mesi: «più di 5 anni». Il progresso rallenta vicino al limite: è lo scenario migliore, e l'app lo dice.
