# Race circuits (Train › Stats › Records › «Race circuits» e «Endurance Cup ranking»)

Richiesta del 25/10: gare di endurance calisthenics **Vulcano Fitness Endurance Cup** (livello Open). Strumento nel player live per percorrere un circuito a stazioni, con la voce che dice esercizio e ripetizioni appena si tocca «Done · next». Codice: `RACE_PRESETS`, `raceList/raceScript/raceSteps/raceTitle`, `raceSection`, `ACT["race-start"/"lv-step"/"lv-step-undo"]`, il tipo di task `race` in `expandTasks/liveTask/taskCues`, `raceLog`, `raceRank`, `raceSplits`; test in `tests/m11c.test.js` («M11i race»).

## Circuiti inclusi (dal messaggio dell'utente)
- **Fire Set (Open)**, limite 6′: 5 Pull-up · 10 Dip · 5 Pull-up · 20 Push-up · 5 Dip · 5 Pull-up (50 rep, 6 stazioni).
- **Cut · Mix C.L.** (fase di taglio), limite 6′ **anche lui** (nel ranking dell'utente un taglio a 6:00.00 = limite raggiunto): 5 Pull-up · 15 Push-up · 5 Pull-up · 15 Dip · 5 Pull-up · 15 Dip · 5 Pull-up (65 rep, 7 stazioni).
- Ogni circuito dell'utente con le stazioni scritte nella descrizione (Settings › Training › Circuits: «5 Pull-up · 10 Dip · …») compare nello stesso elenco.

## Come si creano workout con i circuiti
1. **Dal Records › Race circuits**: «Save as a workout» (Stage, Fire Set, Cut) salva il workout in Train › Workouts (stesso nome = lo aggiorna); da lì si pianifica come ogni workout e si avvia dal live.
2. **Nell'editor** (Train › Workouts › New workout, e «Edit workout» nel live): chip «Add a race circuit» (Fire Set, Cut, Stage) che aggiunge il blocco allo script.
3. **A mano**, nello script: un blocco con `race` nel titolo, tempo dopo `race` = limite, una riga per stazione. Il riposo tra due circuiti è un blocco `- 5m Rest` (tra un circuito e l'altro si riposa quanto si vuole: «Rest between circuits» in Records, default 5 min, vale per il bottone Stage; per un workout salvato basta cambiare la riga nello script):
```
Fire Set (Open) race 6 min
- 5 Pull-up
- 10 Dip

- 8m Rest

Cut · Mix C.L. race 6 min
- 5 Pull-up
- 15 Push-up
```

## Come funziona in gara
Conto alla rovescia, poi la voce dice la prima stazione («Pull-up 5»). A ogni tocco su **Done · next** la voce dice subito la successiva (velocità 1,25×; «Ultimo: …» per l'ultima); **Undo** torna indietro e ripete la stazione. Sullo schermo: i circuiti dello stage affiancati (fatto con tempo / in corso / da fare), l'orologio con il limite, la stazione grande e **tutte le stazioni del circuito in compatto** (fatte con lo split, quella corrente, quelle da fare). Gli split (0,1 s) sono salvati; alla fine «Finito in …», il tempo va da solo in Records › Endurance circuits (il migliore del giorno resta) e il circuito viene creato in Settings se non c'è. Al limite di tempo il blocco si ferma e si salvano le stazioni fatte (nessun tempo).

## Ranking (Endurance Cup ranking)
Si incolla **la tabella di una tappa** così com'è sulla pagina del ranking (rank, #, nome, città, Fire Set, Taglio, Totale, anche su più righe); l'app legge atleta per atleta (il totale è controllato come somma dei due) e accetta anche una lista di soli tempi (uno per riga, solo Fire Set). Si possono aggiungere **più tappe**. Per ogni tappa: la posizione del tuo miglior Fire Set e del tuo miglior taglio (da Records › Endurance circuits) sul Fire Set, sul taglio e sul totale, la percentuale di risultati battuti, l'atleta del **posto che vuoi** («Place you want in a stage») con il distacco in secondi, e una tabella compatta (primi 3 + chi ti sta attorno + «You»). Con più tappe: la posizione del tuo totale su tutti i risultati insieme. Dall'ultimo Fire Set in race mode: secondi per ripetizione a ogni stazione, la più lenta e un **piano di split** scalato sul Fire Set dell'atleta del posto voluto. Nessuna soglia inventata.

## Cosa si sa del regolamento (pagine pubbliche, **non verificato sul regolamento 2026-27**)
Lette il 25/10/2026 su vulcanofitness.it e riminiwellness.com (non apribili dall'ambiente di sviluppo: sintesi da ricerca web): nelle tappe un tentativo di Fire Set con limite di 6′; la categoria dipende dal punto raggiunto (Open: prima parte del set fino al muscle-up escluso entro 6′; il set intero entro 6′ porta in Pro); poi il circuito di taglio della propria categoria; la classifica della tappa è la somma dei due circuiti (confermato dalla tabella dell'utente: Totale = Fire Set + Taglio); i primi 40 Pro vanno in Elite; la finale ha due fasi di taglio e un tabellone a eliminazione diretta. La stagione 2026-27 aggiunge una fase zavorrata al Fire Set. Dati della tappa dell'utente (una su cinque): vincitore 2:12.15 (Fire Set 0:52.51 = 1,05 s/rep su 50 rep, taglio 1:19.64 = 1,23 s/rep su 65).
