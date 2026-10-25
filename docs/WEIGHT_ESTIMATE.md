# Stima del peso nei giorni senza pesata (26/10/2026)

**Cosa fa.** Per i giorni senza pesata, `weightFill()` stima il peso partendo dall'ultima pesata reale e aggiungendo ogni giorno il bilancio energetico del giorno prima (introito − TDEE, in kg al tuo valore di kcal per kg; se non hai registrato cosa hai mangiato, il bilancio previsto dalla fase). Quando dopo un buco arriva una nuova pesata, le stime intermedie vengono **riallineate**: la differenza tra la stima e la bilancia si distribuisce sui giorni del buco in proporzione ai giorni trascorsi (retroattivamente, a ogni ridisegno). Dopo l'ultima pesata la stima prosegue al massimo per 28 giorni.

**Dove si vede.** Grafico «Body weight» (punti vuoti e linea tratteggiata, con la didascalia), riquadro «Weight trend» di Today (≈ kg, «last weigh-in N days ago» quando l'ultima pesata ha almeno 2 giorni), report settimanale e mensile («Weight estimated»).

**Cosa NON fa.** Il peso stimato non entra mai nel trend, nel TDEE, nella calibrazione, nei target o nelle esportazioni: è solo una visualizzazione. Acqua, sodio e glicogeno spostano la bilancia di 0,5–1 kg da un giorno all'altro e il modello non li vede: la stima è un ordine di grandezza, non una pesata.

**Test a mano** (`tests/m13a.test.js`): pesate 80 kg e 79,2 kg a 4 giorni di distanza, −0,1 kg al giorno dal bilancio: stime 79,9 / 79,8 / 79,7, il modello arriva a 79,6 contro 79,2 misurati (errore −0,4), riallineate 79,8 / 79,6 / 79,4; dopo l'ultima pesata 79,1, 79,0, …
