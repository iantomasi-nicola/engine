# PRODUCT EVOLUTION — ROADMAP & IMPLEMENTATION

## 1. Missione

Agisci come Principal Software Architect, Full-Stack Engineer, UX/UI Designer, QA Lead e Product Engineer, con particolare attenzione a sistemi di nutrizione sportiva, endurance, forza, analytics e intelligenza artificiale.

Devi evolvere questa applicazione trasformandola in una piattaforma altamente integrata, affidabile, intuitiva e orientata a un atleta ibrido che combina running, calisthenics endurance e allenamento di forza.

L'utente lavora tramite vibe coding. Il tuo compito è gestire il lavoro tecnico end-to-end, senza richiedergli di intervenire direttamente nel codice.

Consulta `AGENTS.md`, la documentazione, le decisioni architetturali e la roadmap esistente prima di procedere.

**Regola fondamentale:** non implementare tutto in un'unica modifica. Analizza, progetta una roadmap, individua le dipendenze, sottoponi le decisioni importanti e implementa successivamente per milestone indipendenti, verificabili e reversibili.

## 2. Regole trasversali

Tutte le funzionalità devono:

- Essere realmente funzionanti e persistenti.
- Integrarsi con i moduli già presenti.
- Riutilizzare dati e servizi esistenti quando appropriato.
- Evitare duplicazioni, incoerenze e risultati casuali.
- Funzionare su smartphone, tablet e desktop.
- Avere stati di loading, errore, vuoto e successo comprensibili.
- Utilizzare unità di misura e convenzioni coerenti.
- Gestire correttamente date, timezone, arrotondamenti e precisione numerica.
- Rispettare permessi, privacy e integrità dei dati.
- Essere accompagnate da test proporzionati al rischio.
- Non peggiorare le funzionalità preesistenti.

Non introdurre un nuovo framework, database o servizio esterno senza una giustificazione tecnica.

Non inventare API, disponibilità di dati o capacità delle integrazioni.

Se una funzionalità è già implementata, valutane la qualità e correggi i gap anziché riscriverla automaticamente.

## 3. Weather e workout planning

### 3.1 Posizione corrente

- Mostra chiaramente la località utilizzata per le previsioni meteo.
- Permetti di cambiarla manualmente.
- Supporta, se disponibile, la geolocalizzazione con consenso esplicito.
- Prevedi una posizione salvata e un fallback sensato.
- Distingui luogo e timezone del workout, se diversi dalla posizione abituale.

### 3.2 Meteo leggibile e utile per allenarsi

Migliora radicalmente il grafico meteo.

Deve essere facile capire:

- Se è prevista pioggia.
- A quale ora.
- Con quale probabilità.
- Con quale intensità prevista, se disponibile.
- Quanto durerà la finestra meteorologica sfavorevole.
- Temperatura percepita, vento e altre condizioni utili per running e allenamento outdoor.

Mostra evidenziazioni sull'intervallo temporale effettivo dell'allenamento.

Integra, dove realmente disponibile, l'orario programmato del workout da Intervals.icu.

Distingui chiaramente previsioni, dati osservati e informazioni non disponibili. Non trasformare semplici probabilità in certezze.

### 3.3 Pre-start workout

Migliora la sezione che descrive come si svolgerà l'allenamento prima dell'inizio.

Mostra:

- Struttura e fasi.
- Durata prevista.
- Target di intensità.
- Passo o zone previste.
- Warm-up, intervalli e cooldown.
- Condizioni meteorologiche nell'orario previsto.
- Eventuali raccomandazioni contestuali.

Il risultato deve essere immediato da comprendere.

## 4. Foods, Pantry, Storage e Open Food Facts

### 4.1 Gestione Pantry

- Aggiungi una ricerca veloce, reattiva e tollerante a piccoli errori.
- Permetti ordinamento alfabetico A–Z e Z–A.
- Conserva filtri e ordinamenti quando appropriato.
- Migliora la navigazione nelle liste lunghe.

### 4.2 Quantità e prezzi nello Storage

Permetti di modificare:

- Quantità effettivamente disponibile.
- Unità di misura.
- Prezzo unitario o prezzo della confezione.
- Quantità nominale della confezione.
- Eventuali altri campi già supportati dal modello dati.

Gestisci conversioni tra grammi, millilitri, unità e porzioni soltanto quando esistono informazioni affidabili.

### 4.3 Quantità parziali

Deve essere possibile utilizzare facilmente:

- Metà confezione.
- Un quarto.
- Una frazione personalizzata.
- Una quantità esatta in grammi, millilitri o unità.

Esempio: utilizzare 1/2 confezione di un alimento in un pasto, mantenendo coerenti quantità usate, macros e disponibilità residua.

### 4.4 Ricerca nutrizionale intelligente

Quando un alimento non viene trovato nella ricerca di Foods o Meal Plan:

- Offri la possibilità di cercarlo o riconoscerlo con AI.
- Prova prima le fonti strutturate disponibili.
- Consenti una stima nutrizionale motivata se non esistono dati affidabili.
- Mostra chiaramente se i dati sono verificati, stimati o inseriti manualmente.
- Evita false precisioni e valori inventati.
- Consenti di controllare e correggere prima del salvataggio.
- Riutilizza alimenti esistenti, evitando duplicati.

### 4.5 Categorie alimentari

Aggiungi un comando AI per suggerire e correggere la categoria degli alimenti appena aggiunti.

Non ricategorizzare automaticamente tutto il database.

### 4.6 Integrazione Open Food Facts

Valuta e migliora l'intera integrazione:

- Ricerca per nome e codice a barre.
- Parsing degli alimenti.
- Unità e valori per 100 g/100 ml e per porzione.
- Gestione di dati incompleti.
- Normalizzazione dei campi.
- Deduplicazione.
- Attribuzione e requisiti di licenza.
- Cache e limiti delle API.
- Gestione degli errori e indisponibilità del servizio.

Non assumere che Open Food Facts contenga dati completi o accurati per ogni prodotto.

## 5. Recipe Management — Ricette complete

La gestione delle ricette deve essere una funzionalità centrale dell'applicazione, non un semplice raggruppamento superficiale di alimenti.

### 5.1 Creazione guidata

Permetti all'utente di creare una ricetta attraverso un'interfaccia estremamente semplice.

Una ricetta deve poter includere:

- Nome.
- Ingredienti.
- Quantità e unità.
- Numero di porzioni.
- Istruzioni di preparazione.
- Eventuali tempi di preparazione e cottura.
- Valori nutrizionali calcolati.
- Costo totale e costo per porzione.
- Eventuali tag e categorie.

Riutilizza gli alimenti già registrati. Se un ingrediente manca, crea un flusso rapido per aggiungerlo senza perdere la ricetta in lavorazione.

### 5.2 Modifica e riutilizzo

Le ricette devono poter essere:

- Create e modificate nella sezione Recipes.
- Create e modificate dal Meal Plan.
- Riutilizzate in più pasti.
- Ridimensionate automaticamente in base alle porzioni.
- Duplicate quando utile.
- Cercate, filtrate e ordinate.

Definisci una semantica chiara per le ricette salvate e quelle già utilizzate: modificare una ricetta non deve alterare retroattivamente i valori storici di pasti già consumati senza una scelta esplicita.

### 5.3 Importazione intelligente

Consenti importazione da:

- Testo incollato.
- Fotografia.
- Immagine caricata.
- Fotocamera, quando supportata.

L'AI deve estrarre ingredienti, dosi, porzioni e istruzioni.

Poi deve:

1. Cercare corrispondenze nel database Foods.
2. Riutilizzare gli alimenti esistenti.
3. Proporre nuovi alimenti solo quando necessario.
4. Evidenziare ingredienti ambigui.
5. Chiedere conferma dei dati realmente incerti.
6. Salvare una ricetta interamente modificabile.

Niente inserimenti silenziosi di ingredienti o valori nutrizionali inventati.

## 6. Meal Plan — Esperienza quotidiana e settimanale

### 6.1 Interfaccia desktop e tablet

Realizza una vista dedicata al Meal Plan settimanale.

Deve consentire di:

- Visualizzare tutta la settimana selezionata.
- Passare rapidamente da una settimana all'altra.
- Gestire i pasti di ogni giornata.
- Spostare pasti e ricette con drag and drop.
- Duplicare, copiare, scambiare e modificare pasti.
- Controllare totali e target nutrizionali.
- Visualizzare informazioni pertinenti senza sovraccarico.

Prevedi alternative accessibili al drag and drop e un sistema undo dove praticabile.

### 6.2 Swap dei pasti

Aggiungi una funzionalità semplice per scambiare il contenuto di pranzo e cena.

Lo swap deve preservare quantità, ricette, porzioni e coerenza del sistema.

### 6.3 Inserimento intelligente degli alimenti

Durante l'inserimento in un pasto, offri filtri rapidi per:

- Ricchi di proteine.
- Ricchi di carboidrati.
- Ricchi di grassi.
- Combinazioni di macronutrienti.
- Verdure.
- Alimenti presenti nello Storage.
- Alimenti non presenti nello Storage.

Evita classificazioni basate su criteri arbitrari: definisci soglie documentate e coerenti, modificabili se necessario.

### 6.4 Completamento dei macro

Migliora il comportamento del Coach.

Non deve aggiungere alimenti casuali solo per raggiungere esattamente i macronutrienti.

Deve privilegiare:

- Compatibilità con il pasto.
- Preferenze alimentari dell'utente.
- Ricette coerenti.
- Porzioni realistiche.
- Alimenti disponibili.
- Equilibrio complessivo della giornata.
- Semplicità di preparazione.

Se mancano proteine, può considerare anche le whey, se registrate e compatibili con le preferenze.

Il sistema deve poter concludere che un target è sufficientemente vicino senza forzare inserimenti illogici.

## 7. AI Meal Planning avanzato

### 7.1 Intervallo temporale

Permetti di generare piani alimentari per qualsiasi intervallo valido:

- Dal giorno X al giorno Y.
- Prossima settimana.
- Questa settimana.
- Prossimi 3 giorni.
- Intervallo personalizzato.

### 7.2 Pianificazione basata su vere ricette

La generazione deve utilizzare pasti realistici e ricette complete.

Non creare combinazioni casuali di alimenti con l'unico scopo di riempire i macro.

La pianificazione deve considerare:

- Target energetici e nutrizionali.
- Distribuzione giornaliera e settimanale.
- Giorni di allenamento e riposo.
- Preferenze, esclusioni e vincoli dichiarati.
- Inventario disponibile.
- Ricette esistenti.
- Budget.
- Ripetizioni e varietà.
- Tempi di preparazione.
- Quantità e confezioni disponibili.
- Fattibilità culinaria.

### 7.3 Modalità utilizzo prioritario Storage

Aggiungi un'opzione **Svuota Storage**.

Quando attiva, l'algoritmo deve privilegiare l'utilizzo degli alimenti già presenti, rispettando la qualità nutrizionale e la fattibilità dei pasti.

Considera, dove disponibili:

- Quantità.
- Scadenze.
- Confezioni già aperte.
- Consumo previsto.
- Disponibilità residua.
- Rischio di spreco.

Non sacrificare sicurezza alimentare o adeguatezza nutrizionale soltanto per consumare l'inventario.

### 7.4 Budget alimentare

Aggiungi tre strategie selezionabili:

- Economica.
- Normale.
- Premium.

Valuta come usare prezzi effettivi, costo delle porzioni, costo delle ricette e stime quando il prezzo manca.

Non assumere che premium significhi automaticamente nutrizionalmente migliore.

### 7.5 Motore di ottimizzazione

Progetta un algoritmo comprensibile e testabile.

Se opportuno, utilizza vincoli rigidi e obiettivi morbidi, distinguendo:

- Vincoli nutrizionali essenziali.
- Allergie e restrizioni.
- Disponibilità degli ingredienti.
- Target energetici.
- Distribuzione macro.
- Micronutrienti.
- Costo.
- Varietà.
- Preferenze.
- Sprechi.
- Realismo delle ricette.

Usa l'AI per generare, interpretare e proporre ricette, ma non affidare esclusivamente al modello linguistico i calcoli quantitativi.

Ogni piano deve essere verificato da logiche deterministiche prima del salvataggio.

Se un piano è incompatibile con i vincoli, segnala i compromessi invece di generare risultati apparentemente perfetti ma impossibili.

## 8. Nutrizione scientificamente fondata

Questa è una sezione ad alto impatto e deve essere gestita con particolare rigore.

### IMPORTANTE — PRIMA PROPONI, POI IMPLEMENTA

L'utente allegherà un libro di riferimento.

Non dichiarare di averlo analizzato finché non è effettivamente disponibile e leggibile.

Quando viene allegato:

1. Analizzane le sezioni pertinenti.
2. Confronta le informazioni con linee guida scientifiche autorevoli e aggiornate, quando accessibili.
3. Distingui evidenze consolidate, stime, raccomandazioni contestuali e punti controversi.
4. Identifica eventuali divergenze tra libro e linee guida.
5. Non introdurre automatismi clinici o prescrizioni personali non supportate.

Effettua un audit degli algoritmi già presenti, inclusi quelli per:

- Stima del metabolismo basale.
- Dispendio energetico totale.
- EAT e NEAT.
- Stima del fabbisogno.
- Deficit, mantenimento e surplus.
- Bilancio energetico.
- Target di proteine, carboidrati e grassi.
- Distribuzione dei macronutrienti.
- Timing nutrizionale in relazione agli allenamenti.
- Idratazione ed elettroliti.
- Fibre.
- Micronutrienti.
- Sodio e sale.
- Periodizzazione nutrizionale.
- Disponibilità energetica in relazione al carico di allenamento.
- Adattamento delle stime a dati longitudinali realmente raccolti.

Considera il contesto di un atleta ibrido: running, allenamento di forza, calisthenics e endurance.

Non esiste una singola formula gold standard universalmente superiore per tutti i casi. Confronta i metodi appropriati, esplicita assunzioni e limiti, e proponi formule o modelli supportati dalle evidenze.

Non trattare valori mancanti come zero e non inventare dati di composizione degli alimenti.

Prevedi controlli contro valori estremi e combinazioni potenzialmente inappropriate, senza presentare il software come sostituto di un professionista sanitario.

### Output richiesto prima dell'implementazione

Prepara un **Nutrition Algorithm Audit** con:

- Algoritmo attuale.
- Formula o logica usata.
- Problema identificato.
- Soluzione proposta.
- Fondamento scientifico e fonti verificabili.
- Precisione e limiti.
- Dati necessari.
- Impatto sull'applicazione.
- Priorità.
- Test necessari.
- Eventuali rischi di regressione.

**Non modificare le formule nutrizionali finché l'utente non avrà approvato la proposta.**

## 9. Shopping List e cost analytics

### 9.1 Interazione con Storage

La Shopping List deve calcolare il fabbisogno reale rispetto ai pasti pianificati.

Se lo Storage copre completamente la quantità necessaria, non mostrare quell'articolo nella lista principale degli acquisti.

Mostralo invece in una sezione richiudibile, per esempio **Già disponibile**.

Quando il piano consuma completamente un alimento, mostra una segnalazione chiara che indica che la disponibilità prevista si esaurirà.

Gestisci correttamente:

- Quantità parzialmente disponibili.
- Più pasti che utilizzano lo stesso ingrediente.
- Dosi delle ricette.
- Confezioni e arrotondamenti.
- Modifiche successive del Meal Plan.
- Consumo pianificato versus consumo effettivo.

Non sottrarre due volte gli alimenti e non scalare quantità reali soltanto perché un pasto è stato pianificato.

### 9.2 Filtri e periodi

Aggiungi filtri veloci:

- Questa settimana.
- Prossima settimana.
- Intervallo personalizzato.

### 9.3 Stima della spesa

Rendi evidente:

- Costo stimato del piano alimentare.
- Costo previsto degli acquisti ancora necessari.
- Costo per giornata.
- Costo per settimana.
- Media settimanale.
- Eventuale distinzione tra costo degli alimenti consumati e denaro da spendere effettivamente.

Identifica chiaramente prezzi mancanti o stimati.

### 9.4 Articoli extra

Consenti di aggiungere articoli non alimentari alla Shopping List.

Questi devono:

- Essere gestiti separatamente dai Foods.
- Avere eventualmente quantità e prezzi.
- Essere riutilizzabili nelle liste future.
- Contribuire a un totale di spesa separato.
- Non influenzare calorie, macro o micronutrienti.

### 9.5 Audit Storage e Shopping List

Esamina e correggi:

- Bug di sincronizzazione.
- Duplicazioni.
- Calcoli quantità incoerenti.
- Problemi di usabilità.
- Aggiornamenti non reattivi.
- Errori nelle transizioni tra pianificato, acquistato, disponibile e consumato.

Definisci una fonte di verità chiara per ogni stato.

## 10. Analytics delle abitudini alimentari

Implementa report che mostrino:

- Piatti e ricette più utilizzati.
- Alimenti più utilizzati.
- Frequenza d'uso.
- Evoluzione delle abitudini nel tempo.
- Ripetitività e varietà dei pasti.
- Distribuzione nutrizionale, quando i dati lo consentono.
- Eventuali tendenze nella spesa.

Ricava insight utili dalle abitudini effettivamente registrate.

Distingui sempre pasti pianificati e realmente consumati, se l'app ha questi stati.

Non dedurre comportamenti non supportati dai dati.

## 11. Running, Intervals.icu e analytics

### 11.1 Running Prediction

Analizza l'algoritmo attuale di previsione delle prestazioni.

Miglioralo utilizzando i dati realmente disponibili e metodi validati quando applicabili.

Considera, se sufficientemente supportati:

- Storico delle attività.
- Volume e progressione.
- Intensità.
- Prestazioni recenti.
- Tempi su distanze note.
- Qualità dei dati.
- Continuità degli allenamenti.
- Eventuali fattori di affaticamento misurabili.

Evita predizioni eccessivamente precise e mostra intervalli di incertezza quando appropriati.

### 11.2 Obiettivo settimanale chilometri

Aggiungi:

- Target km settimanale personalizzabile.
- Progressione verso il target.
- Media settimanale.
- Storico.
- Distinzione tra chilometri programmati e completati.
- Possibilità di disattivare il target.

### 11.3 Passi e NEAT

Integra il dato dei passi da Intervals.icu soltanto se disponibile attraverso le API o i dati accessibili.

Implementa:

- Visualizzazione passi giornalieri.
- Obiettivo passi giornaliero.
- Obiettivo NEAT giornaliero, con unità e metodo di stima espliciti.
- Entrambi gli obiettivi disattivabili.
- Medie settimanali e temporali.
- Trend e confronto con i target.
- Gestione dei giorni con dati mancanti.

Non equiparare automaticamente il numero di passi a una stima accurata del NEAT.

### 11.4 Report gare

Crea una sezione dedicata ai report delle competizioni.

Valuta i dati disponibili per includere:

- Nome e data.
- Disciplina e distanza.
- Risultato.
- Passo medio.
- Split.
- Frequenza cardiaca.
- Confronto con gli obiettivi.
- Confronto con prestazioni precedenti.
- Analisi del pacing.
- Eventuali record personali.
- Indicazioni per il miglioramento.

Non inventare split, condizioni ambientali o metriche non registrate.

## 12. Forza, calisthenics e workout analytics

### 12.1 Gestione esercizi

Permetti di creare esercizi personalizzati indipendentemente da un workout.

L'utente deve poterli aggiungere successivamente a una scheda oppure mantenerli semplicemente nella libreria.

Gestisci opportunamente:

- Nome e categoria.
- Attrezzatura.
- Tipologia di esercizio.
- Unità di misura.
- Ripetizioni, carichi, durata o altri parametri pertinenti.
- Storico prestazioni.
- Eventuali varianti.

### 12.2 Statistiche di forza

Aggiungi filtri temporali veloci:

- Ultima settimana.
- Ultime 2 settimane.
- Ultime 4 settimane.
- Ultime 6 settimane.
- Ultime 8 settimane.
- Ultime 12 settimane.

Produci statistiche coerenti con il tipo di esercizio, evitando confronti numericamente scorretti.

### 12.3 Workout Score 1–100

Implementa una valutazione dei workout di forza, calisthenics endurance e running.

Il sistema deve agire come un coach rigoroso, obiettivo ed equilibrato: premia ciò che è stato fatto bene e segnala con chiarezza ciò che è migliorabile.

Per forza ed endurance muscolare, considera:

- Aderenza alla scheda prevista.
- Serie e ripetizioni.
- Carichi.
- Intensità, RPE o RIR quando presenti.
- Qualità del completamento.
- Progressione.
- Sensazioni dichiarate.
- Contesto di affaticamento.
- Dati mancanti.

Per running, considera:

- Rispetto delle fasi previste.
- Passo.
- Zone di frequenza cardiaca, quando pertinenti.
- Cadenza/RPM quando presente.
- Durata e distanza.
- Ripetute e recuperi.
- Regolarità.
- Obiettivo specifico della sessione.
- Sensazioni e condizioni.

Non penalizzare automaticamente una sessione di recupero per essere lenta o poco intensa.

Distingui la qualità dell'esecuzione dall'effetto allenante previsto.

### 12.4 Scoring spiegabile

Il punteggio 1–100 deve essere:

- Riproducibile.
- Documentato.
- Motivato da sottopunteggi.
- Normalizzato per tipologia di workout.
- Capace di gestire dati mancanti.
- Non costruito su valutazioni casuali di un LLM.

L'AI può produrre spiegazioni e coaching, mentre il calcolo deve avere una base verificabile.

### 12.5 Valutazione retroattiva

Consenti di calcolare o ricalcolare lo score anche dopo il salvataggio di un workout.

Mostra:

- Punteggio complessivo.
- Sottopunteggi.
- Cosa è andato bene.
- Errori o deviazioni importanti.
- Consigli concreti.
- Possibili miglioramenti del workout successivo.

Preserva la tracciabilità dei ricalcoli quando cambiano dati o algoritmo.

## 13. Check-in storico

Permetti di:

- Selezionare la data dalla schermata Check-in.
- Visualizzare i check-in già registrati.
- Modificare quelli dei giorni precedenti.
- Salvare correttamente le correzioni.
- Aggiornare le statistiche dipendenti.

Gestisci date e timezone senza alterare accidentalmente il giorno di riferimento.

Non perdere i dati preesistenti.

## 14. UX e Responsive Design

### 14.1 Sidebar

Su desktop e tablet, il menu laterale deve essere richiudibile.

Mantieni un comportamento coerente e adattivo.

Valuta persistenza della preferenza, accessibilità e navigazione da tastiera.

### 14.2 Coerenza visiva

Correggi il disallineamento dell'icona ricetta nel Meal Plan.

Cerca sistematicamente problemi analoghi:

- Icone disallineate.
- Overflow.
- Grafici sovrapposti.
- Testi troncati impropriamente.
- Componenti che si coprono.
- Differenze di stile.
- Layout non adattivi.
- Controlli poco intuitivi.
- Problemi touch.
- Dialog e menu difficili da utilizzare.

Evita redesign gratuiti: conserva l'identità visiva esistente, migliorandone qualità e coerenza.

## 15. Audit finale del progetto

Dopo ogni milestone esegui test mirati.

Al termine dell'intera roadmap esegui anche un audit generale:

- Build.
- Typecheck.
- Lint.
- Unit test.
- Integration test.
- End-to-end dei flussi principali.
- Analisi delle dipendenze.
- Sicurezza delle API.
- Gestione errori.
- Codice morto.
- Duplicazioni.
- Incoerenze nei modelli dati.
- Accessibilità.
- Performance.
- Responsive design.
- Grafici e visualizzazioni.
- Sincronizzazione fra moduli.
- Assenza di regressioni.

Verifica almeno le tre principali classi di viewport: mobile, tablet e desktop, utilizzando test visuali o browser automation quando disponibili.

In particolare, verifica i flussi completi:

**Foods → Recipes → Meal Plan → Storage → Shopping List → Analytics**

e

**Intervals.icu → Workout Planning → Workout Execution → Check-in → Analytics → Prediction**

Segnala chiaramente ciò che non puoi testare nell'ambiente disponibile.

## 16. Roadmap e dipendenze

Prima di implementare, proponi una roadmap suddivisa in milestone, preferibilmente in questo ordine di dipendenza:

- M0 — Audit, baseline e test esistenti.
- M1 — Integrità Foods, Pantry, Storage e prezzi.
- M2 — Recipe Engine e importazione AI.
- M3 — Meal Plan e gestione settimanale.
- M4 — Shopping List, costi e riconciliazione inventario.
- M5 — Audit scientifico degli algoritmi nutrizionali.
- M6 — AI Meal Planning, ottimizzazione e budget.
- M7 — Weather, geolocalizzazione e pre-workout.
- M8 — Running, Intervals.icu, passi e prediction.
- M9 — Forza, esercizi, scoring e workout analytics.
- M10 — Report, check-in storico e insight.
- M11 — Audit UX, QA, regressioni e release finale.

Puoi proporre un ordine differente se emergono dipendenze più corrette dall'architettura reale.

## 17. Criteri di completamento per milestone

Ogni milestone deve essere autonoma quanto possibile e deve includere:

1. Funzionalità completate.
2. File e moduli interessati.
3. Modifiche a database e API.
4. Test eseguiti e relativi risultati.
5. Verifica dei flussi collegati.
6. Eventuali bug conosciuti.
7. Aggiornamento della documentazione.
8. Commit significativi.
9. Versione o tag stabile, quando appropriato.
10. Procedura di rollback del codice e dei dati.
11. Riepilogo comprensibile all'utente.

Non considerare completa una milestone soltanto perché il codice compila.

## 18. Output richiesto adesso

**Per il primo turno non iniziare la massiccia implementazione.**

Devi:

1. Esaminare la repository e gli eventuali audit esistenti.
2. Mappare le funzionalità richieste rispetto a quelle già presenti.
3. Individuare sovrapposizioni, lacune, incompatibilità e dipendenze.
4. Preparare la roadmap tecnica dettagliata.
5. Dare priorità ai bug e alla coerenza dei dati.
6. Stimare la complessità relativa di ogni milestone.
7. Descrivere la struttura del versionamento.
8. Presentare in anticipo la proposta di miglioramento degli algoritmi nutrizionali, specificando quali conclusioni dipendono dal libro non ancora allegato.
9. Suggerire eventuali miglioramenti importanti che non ho esplicitamente richiesto, distinguendoli dai requisiti originali.
10. Segnalare soltanto le decisioni di prodotto realmente necessarie.

Al termine proponi la prima milestone da implementare.

Aspetta la mia approvazione della roadmap e delle modifiche scientifiche prima di iniziare lo sviluppo delle relative funzionalità.

Dopo l'approvazione, lavora con autonomia entro i confini stabiliti: implementa, testa, correggi, documenta e crea commit senza chiedere conferma per ogni singola operazione tecnica.

L'obiettivo non è produrre più codice, ma **costruire un'applicazione migliore, coerente, scientificamente fondata, semplice da usare e sempre ripristinabile**.