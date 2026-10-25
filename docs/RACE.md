# Race circuits (Train › Stats › Records › «Race circuits» e «Endurance Cup ranking»)

Richiesta del 25/10: gare di endurance calisthenics **Vulcano Fitness Endurance Cup** (livello Open). Strumento nel player live per percorrere un circuito a stazioni, con la voce che dice esercizio e ripetizioni appena si tocca «Done · next». Codice: `RACE_PRESETS`, `raceList/raceScript/raceSteps/raceTitle`, `raceSection`, `ACT["race-start"/"lv-step"/"lv-step-undo"]`, il tipo di task `race` in `expandTasks/liveTask/taskCues`, `raceLog`, `raceRank`, `raceSplits`; test in `tests/m11c.test.js` («M11i race»).

## Regolamento ufficiale (Endurance Cup, rev. 5 del 30/09/2026, PDF dell'utente)
- **Fire Set**: un unico circuito in **tre blocchi in successione**, **un solo time cap di 6:00 per tutto il set**; il cronometro parte all'inizio del blocco 1; **prima di partire si dichiara la categoria** e il cronometro si ferma alla fine del blocco dichiarato. Conta il tempo impiegato per quel blocco. Una sola volta per giornata di gara.
  - **Blocco 1 · Open** (6 stazioni, 50 rep): 5 Pull-up · 10 Dip · 5 Pull-up · 20 Push-up · 5 Dip · 5 Pull-up.
  - **Blocco 2 · Intermediate** (altre 6, 66 rep): 1 Muscle-up · 10 Bar Dip · 10 Pull-up · 15 Dip · 20 Push-up · 10 Pull-up.
  - **Blocco 3 · Pro** (altre 6, 42 rep, zavorrato): 1 Muscle-up +10 kg · 10 Dip +10 kg · 5 Pull-up +10 kg · 20 Push-up · 5 Pull-up · 1 Muscle-up.
  - **Women**: solo il blocco 1, con un proprio circuito di taglio.
  - **Cap scaduto prima della fine del blocco dichiarato** (§3.4): restare nella categoria dichiarata, classificati in fondo con 6:00.00, oppure scendere alla categoria dell'ultimo blocco completato mantenendo il tempo di quel blocco.
- **Classifica di tappa** = tempo del Fire Set + tempo del circuito di taglio della propria categoria; **a parità vince il miglior Fire Set**. Il **1° e 2°** di ogni categoria (non Women) ottengono una **Wild Card**: saltano il 1° taglio della finale. Il **Ranking** è il miglior Fire Set della stagione per categoria e decide l'ordine nel 1° taglio (chi è più in alto gareggia per ultimo).
- **Finale**: 1° taglio, 2° taglio (i Pro si dividono in Elite Superstar ed Elite) e battle 1 vs 1. I circuiti di taglio e di battle sono nel documento ufficiale dei circuiti, pubblicato a parte (qui c'è solo il taglio Open «Mix C.L.» dato dall'utente).
- Ripetizioni valide (§10), attrezzi (§11) e certificato medico agonistico (§8) non sono nell'app.

## Circuiti inclusi
- **Fire Set (Open)**, **(Intermediate)** e **(Pro)**: il circuito cumulativo fino al blocco dichiarato (6, 12, 18 stazioni; `blocks 6/12/18` nello script), cap 6:00.
- **Cut · Mix C.L.** (taglio Open, dato dall'utente): 5 Pull-up · 15 Push-up · 5 Pull-up · 15 Dip · 5 Pull-up · 15 Dip · 5 Pull-up (65 rep, 7 stazioni), limite 6:00 (nel ranking dell'utente un taglio a 6:00.00 = limite raggiunto).
- Ogni circuito dell'utente con le stazioni scritte nella descrizione (Settings › Training › Circuits: «5 Pull-up · 10 Dip · 1 Muscle-up +10 kg …») compare nello stesso elenco; «Your category» in Records sceglie Fire Set e taglio usati da Stage, ranking e piano di split.

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
Conto alla rovescia, poi la voce dice la prima stazione («Pull-up 5»). A ogni tocco su **Done · next** la voce dice subito la successiva (velocità 1,25×; «Ultimo: …» per l'ultima); **Undo** torna indietro e ripete la stazione. Sullo schermo: i circuiti dello stage affiancati (fatto con tempo / in corso / da fare), l'orologio con il limite, la stazione grande e **tutte le stazioni del circuito in compatto** (fatte con lo split, quella corrente, quelle da fare). Gli split (0,1 s) sono salvati; alla fine «Finito in …», il tempo va da solo in Records › Endurance circuits (il migliore del giorno resta) e il circuito viene creato in Settings se non c'è. Al limite di tempo l'orologio si ferma: per un circuito a più blocchi (Intermediate, Pro) la schermata offre **«Stay · 6:00.00»** (classificato ultimo) o **scendere** all'ultimo blocco finito con il suo tempo (registrati sotto il circuito giusto, es. «Fire Set (Open)»); per un blocco solo si salvano le stazioni fatte, senza tempo. Le stazioni zavorrate mostrano il carico e la voce lo dice.

## Ranking (Endurance Cup ranking)
Si incolla **la tabella di una tappa** così com'è sulla pagina del ranking (rank, #, nome, città, Fire Set, Taglio, Totale, anche su più righe); l'app legge atleta per atleta (il totale è controllato come somma dei due) e accetta anche una lista di soli tempi (uno per riga, solo Fire Set). Si possono aggiungere **più tappe**. Per ogni tappa: la posizione del tuo miglior Fire Set e del tuo miglior taglio (da Records › Endurance circuits) sul Fire Set, sul taglio e sul totale, la percentuale di risultati battuti, l'atleta del **posto che vuoi** («Place you want in a stage») con il distacco in secondi, e una tabella compatta (primi 3 + chi ti sta attorno + «You»). Con più tappe: la posizione del tuo totale su tutti i risultati insieme. Dall'ultimo Fire Set in race mode: secondi per ripetizione a ogni stazione, la più lenta e un **piano di split** scalato sul Fire Set dell'atleta del posto voluto. Nessuna soglia inventata nel confronto con la tabella; la riga «Trying Intermediate?» del box Advice è invece un'euristica dell'app (non del regolamento): proietta il blocco successivo al passo per ripetizione del tuo Fire Set (Open 50 rep, blocco 2 +66 = 116, blocco 3 +42 = 158) e dice «Worth a try» solo se la proiezione resta sotto l'85% del cap (`RACE_NEXT_FRAC`) e hai registrato abbastanza muscle-up stretti (`RACE_NEXT_MU`: 1 per Intermediate, 3 per Pro); altrimenti dice di quanti secondi accelerare o che il limite è il muscle-up. Pro è l'ultima categoria: nessun consiglio.

## Limiti
I circuiti di taglio delle altre categorie non sono noti: vanno scritti in Settings › Training. La tabella di tappa va incollata a mano (nessun accesso al sito). Il ranking è una tappa su cinque: aggiungerne altre aumenta il campione.
