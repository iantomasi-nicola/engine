# Race circuits (Train › Stats › Records › «Race circuits» e «Endurance Cup ranking»)

Richiesta del 25/10: gare di endurance calisthenics **Vulcano Fitness Endurance Cup** (livello Open). Strumento nel player live per percorrere un circuito a stazioni, con la voce che dice esercizio e ripetizioni appena si tocca «Done · next». Codice: `RACE_PRESETS`, `raceList/raceScript/raceSteps/raceTitle`, `raceSection`, `ACT["race-start"/"lv-step"/"lv-step-undo"]`, il tipo di task `race` in `expandTasks/liveTask/taskCues`, `raceLog`, `raceRank`, `raceSplits`; test in `tests/m11c.test.js` («M11i race»).

## Circuiti inclusi (dal messaggio dell'utente)
- **Fire Set (Open)**, limite 6′: 5 Pull-up · 10 Dip · 5 Pull-up · 20 Push-up · 5 Dip · 5 Pull-up (50 rep, 6 stazioni).
- **Cut · Mix C.L.** (fase di taglio): 5 Pull-up · 15 Push-up · 5 Pull-up · 15 Dip · 5 Pull-up · 15 Dip · 5 Pull-up (65 rep, 7 stazioni).
- Ogni circuito dell'utente con le stazioni scritte nella descrizione (Settings › Training › Circuits: «5 Pull-up · 10 Dip · …») compare nello stesso elenco.
- Nello script di un workout, un blocco con la parola `race` nel titolo diventa un circuito a stazioni: `Fire Set race 6 min` + righe `- 5 Pull-up`. Il tempo dopo `race` è il limite.

## Come funziona in gara
Conto alla rovescia, poi la voce dice la prima stazione («Pull-up 5»). A ogni tocco su **Done · next** la voce dice subito la successiva (a velocità 1,25×; «Ultimo: …» per l'ultima); **Undo** torna indietro e ripete la stazione. Gli split (0,1 s) sono salvati; alla fine «Finito in …», il tempo va da solo in Records › Endurance circuits (il migliore del giorno resta) e il circuito viene creato in Settings se non c'è. Al limite di tempo il blocco si ferma e si salvano le stazioni fatte.

## Ranking (Endurance Cup ranking)
Si incollano i tempi del ranking (uno per riga, il primo `m:ss(.d)` di ogni riga). L'app dà la **posizione** del tuo miglior Fire Set (a pari tempo vale il posto migliore), la percentuale di tempi battuti, il **tempo del posto che vuoi raggiungere** (campo «Places that go through») e il distacco; dall'ultimo Fire Set mostra i secondi per ripetizione a ogni stazione, la stazione più lenta e un **piano di split** scalato al tempo obiettivo. Non ci sono soglie inventate: se il ranking non è incollato non si dice nulla sul passare o meno.

## Cosa si sa del regolamento (pagine pubbliche, **non verificato sul regolamento 2026-27**)
Lette il 25/10/2026 su vulcanofitness.it e riminiwellness.com (non apribili dall'ambiente di sviluppo: sintesi da ricerca web): nelle tappe un tentativo di Fire Set con limite di 6′; la categoria dipende dal punto raggiunto (Open: prima parte del set fino al muscle-up escluso entro 6′; il set intero entro 6′ porta in Pro); poi il circuito di taglio della propria categoria; la classifica della tappa è la somma dei due circuiti; i primi 40 Pro vanno in Elite; la finale ha due fasi di taglio e un tabellone a eliminazione diretta (Elite Super Star, Elite, Intermediate). La stagione 2026-27 aggiunge una fase zavorrata al Fire Set. Il PDF allegato dall'utente non è arrivato alla sessione: serve incollare il ranking (o le soglie) per rispondere a «passo?» e «provo la categoria successiva?».
