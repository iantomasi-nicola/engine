# ENGINE — Specifica nutrizionale VERIFICATA per Claude Code

**Revisione scientifica:** 24 ottobre 2026 — **Fonte originale:** *Project Nutrition* (Project inVictus, 2015, PDF 356 pp.) — **Base codice:** GitHub `main` esaminato prima del rollback; lo stato dopo rollback è DA VERIFICARE.

**Uso:** allegare questo solo documento alla nuova sessione Claude Code. **Non procedere a modifiche automatiche di formule:** prima audit della versione ripristinata, proposta con fonti, verifica sperimentale, approvazione esplicita, test e rollback. Nessun manuale è una fonte di valori individuali "perfetti"; dove esiste, la misura diretta è preferibile a una formula predittiva.

## AVVISO SCIENTIFICO PRIORITARIO — rettifiche, formule esatte e gerarchia delle evidenze

### 1. Errori *accertati* nella stampa originale (non replicarli nel software)

| PDF *Project Nutrition* | Trascrizione fedele del testo | Controllo aritmetico/scientifico | Decisione per Engine |
|---|---|---|---|
| **p. 25–26** — Mifflin-St Jeor: uomo 80 kg, 180 cm, 30 anni | `10×80 + 6,25×180 − 5×30 + 5 = 1770 kcal` | La somma reale è **1780 kcal/die**: esempio stampato errato di 10 kcal | Test numerici; non copiare 1770 come expected value |
| **p. 26** — fattore attività: 80 kg e coefficiente 13 | `80×2,2×13 = 2430 kcal` | Il risultato corretto è **2288 kcal/die** | Separare formula originale da refuso dell'esempio |
| **p. 26** — Harris–Benedict donne | `655,1 + 9,563×kg + 1,850×cm − 1,16×età` | Coefficiente scientifico **−4,6756×età**, non −1,16 | La formula femminile del libro è **scorretta**; non implementarla |
| **p. 26** — Harris–Benedict uomini | `66,5 + 13,75×kg + 5,003×cm − 6,775×età` | Originale 1918/1919: **−6,7550×età** (non −6,775); gli altri coefficienti sono arrotondati | Versione originale certificata nelle formule sotto |
| **p. 25** — `kg×32–34` indicato «metabolismo basale» | 80 kg → 2560–2720 kcal | È una scorciatoia empirica del **fabbisogno giornaliero totale** in alcune condizioni, non misura RMR/BMR | Non usarla come BMR da sommare all'attività |
| **p. 26–27** — bonus per magrezza nella HB | +25–30 kcal per ogni punto % body fat sotto 16 | Modifica editoriale del libro, **non appartiene alla regressione validata HB** | Eliminare dal modello scientifico standard; non conservarla come default senza prova indipendente |
| **p. 27** — 7000 kcal/kg | Trattato come approssimazione per tessuto adiposo | **Non è relazione costante per prevedere il peso nel tempo:** acqua, glicogeno, FFM e adattamenti alterano il risultato | Evitare previsioni lineari deterministiche e auto-calibrazioni aggressive |

**Riferimento primario Harris–Benedict e confronto:** https://pmc.ncbi.nlm.nih.gov/articles/PMC6935811/ . **Riferimento primario Mifflin:** https://pubmed.ncbi.nlm.nih.gov/2305711/ .

### 2. Formule DI LETTERATURA in unità e coefficienti esatti (non sono tutte equivalenti)

Qui per *peso* si intendono **kg**, per *altezza* **cm** salvo diversa indicazione, per *età* anni. Output: **kcal/die**. Distinguere **RMR/REE** misurato a riposo da **BMR**, la cui misura impone condizioni ancora più restrittive. Le formule stimano dispendio a riposo, NON il TDEE.

**Mifflin-St Jeor, equazione originale 1990** — `REE = 9.99*kg + 6.25*cm - 4.92*età + 166*sesso - 161` con `sesso=1` per uomo, `0` per donna. Versione arrotondata, anch'essa prevista dagli autori: uomini `10*kg + 6.25*cm - 5*età + 5`; donne `10*kg + 6.25*cm - 5*età - 161`. Originale PubMed **PMID 2305711**: https://pubmed.ncbi.nlm.nih.gov/2305711/ . Engine usa la forma **arrotondata**, non l'originale non arrotondata.

**Harris–Benedict, originale 1918/1919** — uomini `66.4730 + 13.7516*kg + 5.0033*cm - 6.7550*età`; donne `655.0955 + 9.5634*kg + 1.8496*cm - 4.6756*età`. Fonte accademica: https://pmc.ncbi.nlm.nih.gov/articles/PMC6935811/ . Engine pre-rollback usa coefficienti arrotondati e **−6,775** uomo, con bonus body fat: **non è identico all'originale**. Non confondere con **Roza–Shizgal 1984 (HB rivista)**, che è una terza equazione distinta.

**Cunningham** — comunemente `RMR ≈ 500 + 22*FFM_kg`; richiede misura/stima di massa priva di grasso attendibile. Altre versioni di Cunningham pubblicate differiscono: indicare *anno e variante* e **non mescolarle**.

**Ten Haaf & Weijs, 2014, alternativa ben validata in atleti** — versione *peso/altezza/età*: `RMR = 29.279 + 11.936*kg + 587.728*altezza_m - 8.129*età + 191.027*sesso` (`uomo=1`, `donna=0`; **altezza in METRI**, non cm). Versione *FFM*: `RMR = 484.264 + 22.771*FFM_kg`. Fonte originale PubMed **PMID 25275434**: https://pubmed.ncbi.nlm.nih.gov/25275434/ ; riproduzione tabella con unità: https://pmc.ncbi.nlm.nih.gov/articles/PMC12101231/ . **Non convertire implicitamente altezza in cm nella formula Ten Haaf**: porterebbe a valori assurdi.

**De Lorenzo**, modello comparativo specifico per atleti: `RMR = -857 + 9*kg + 11.7*cm` (kcal/die). Fonte tabella di revisione: https://pmc.ncbi.nlm.nih.gov/articles/PMC12101231/ . Non preferirlo universalmente senza valutazione sulla popolazione interessata.

### 3. Quale scegliere per Engine, secondo PubMed?

- **Gold standard pratico della misura RMR in laboratorio:** calorimetria indiretta eseguita con protocollo standardizzato. **Per TDEE in condizioni di vita libera:** metodo dell'**acqua doppiamente marcata** (doubly labelled water, DLW) come riferimento di misura; nessuno dei due è disponibile dai semplici input della PWA. NON definire Ten Haaf un gold standard di misura: è una **stima validata**.
- Meta-analisi **O'Neill et al., *Sports Medicine* 2023**, **PMID 37632665**: 29 studi, 1430 atleti; tra le equazioni esaminate Ten Haaf è stata la più precisa: **80,2%** dei soggetti entro **±10%** dalla calorimetria indiretta, rispetto al **40,7–63,7%** per le altre equazioni incluse nell'analisi di precisione. Nessuna formula garantisce accuratezza individuale. https://pubmed.ncbi.nlm.nih.gov/37632665/ .
- Revisione **2023, PMID 37398968**: equazioni derivate nella popolazione generale spesso meno adeguate agli atleti; De Lorenzo e Ten Haaf mostrano accordo accettabile; generalizzabilità da studiare. https://pubmed.ncbi.nlm.nih.gov/37398968/ .
- **Proposta da sottoporre all'utente, NON cambiamento automatico:** aggiungere **Ten Haaf** come opzione e candidato default per adulto atleta ricreativo, conservare Mifflin come fallback/comparatore e Cunningham solo con FFM affidabile. Mostrare intervallo d'incertezza, ricalcolare su dataset sintetici, misurare differenze e confrontare con trend reali senza alterare i log storici.
- **Se dopo il rollback esiste già Ten Haaf o modello modificato, verificare prima di duplicarlo.** Evitare scegliere formula sulla base del suo valore numerico più alto o di una coincidenza con poche settimane di peso.

### 4. Revisioni operative alla proposta nutrizionale precedente

- **Proteine:** nel position stand ISSN **pubblicato online il 13 ottobre 2026**, **PMID 42867412**, il range `1.6–2.2 g/kg BW/die` è un riferimento per soggetti con allenamento di forza; `1.9–3.2 g/kg BW/die` è un range considerato per individui **magri e già allenati** in restrizione calorica. Non confonderlo con `2.3–3.1 g/kg FFM` di altre rassegne. Il range più alto **non è default** dell'app. https://pubmed.ncbi.nlm.nih.gov/42867412/ .
- **Carboidrati in corsa/endurance:** valori `30–60 g/h` o fino a `90 g/h` per attività lunghe restano riferimenti consolidati 2016, NON limiti biologici assoluti. La rassegna **Morton et al. 2026**, **PMID 41759826**, discute la possibilità di arrivare a `120 g/h` in atleti **allenati e adattati**, senza prove sufficienti per proporre indiscriminatamente 120–200 g/h. Non fare di `120 g/h` un target predefinito. https://pubmed.ncbi.nlm.nih.gov/41759826/ .
- **Calorie da dispositivi:** la validità di kcal stimata dai wearable è variabile; usare la semantica attiva/totale/lorda/netta e **non applicare una percentuale di "precisione" a un singolo allenamento**. Revisione/meta: https://pubmed.ncbi.nlm.nih.gov/30194221/ ; umbrella review 2024: https://pubmed.ncbi.nlm.nih.gov/39080098/ .
- **TEF 10%:** è un'approssimazione utile, non equazione precisa. Engine fa `TEF=0.1*(BMR+NEAT+EAT)`; la termogenesi alimentare è legata all'**energia introdotta e alla composizione del pasto**, non identica al 10% del dispendio pre-TEF. Non sostituire con `10% TDEE` senza gestire circolarità: definire esplicitamente modello e unit test per maintenance/cut/bulk.
- **Equazioni MET:** `MET * massa_kg * durata_ore` è stima **lorda**; se sommata a BMR includere solo la quota **incrementale** quando coerente con il riferimento usato. Evitare che smartwatch, stime MET e corse registrate descrivano tre volte lo stesso EAT.
- **EA e REDs:** IOC 2023 (**PMID 37752011**) non supporta una **soglia unica diagnostica** di energy availability applicata a tutti; nessun allarme automatico clinico da una media alimentare incompleta. https://pubmed.ncbi.nlm.nih.gov/37752011/ .
- **Dati alimentari:** differenziare `kcal` da etichetta, energia calcolata (Atwater), carboidrati disponibili vs totali secondo database, fibre, polioli, sale vs sodio; non forzare identità di cifre che derivano da sistemi di fattori o arrotondamenti diversi.

### 5. Casi di test numerici minimi da includere nella suite

| Caso | Input | Atteso |
|---|---|---|
| Mifflin, forma arrotondata, uomo | 80 kg, 180 cm, 30 anni | **1780 kcal/die** |
| Mifflin, forma originale, uomo | 80 kg, 180 cm, 30 anni | `9.99*80+6.25*180-4.92*30+166-161` = **1781,6 kcal/die** |
| HB originale, uomo | 80 kg, 180 cm, 30 anni | **1864,545 kcal/die** circa |
| HB originale, donna | 55 kg, 165 cm, 30 anni | **~1346,0 kcal/die** |
| Ten Haaf peso, uomo | 80 kg, 1,80 m, 30 anni | **~1989,2 kcal/die** |
| MET netto | 5 MET, 70 kg, 1 ora, resting≈1 MET | lordo ~350 kcal; incremento netto ~280 kcal |
| Sale/sodio | etichetta con 1,00 g sale | **400 mg sodio** circa; 1 mg non è 1 g |

**ATTENZIONE: verifica i risultati con un secondo calcolo indipendente prima di committare i test; l'importante è che ogni test riporti chiaramente la variante della formula, input, unità e riferimenti.**

---

## 0. Gerarchia delle fonti e limiti

1. **Libro di partenza:** *Project Nutrition*, Project inVictus, copyright 2015, 356 pagine nel PDF esaminato. Di seguito una **sintesi originale dei concetti pertinenti a Engine**, non una riproduzione del libro. I numeri di pagina si riferiscono al PDF, non necessariamente alla paginazione stampata.
2. **Codice esaminato:** `source/engine.html` e documentazione in `main` della repository `iantomasi-nicola/engine`, letti il 24/10/2026, **prima del rollback annunciato dall'utente**. Le osservazioni sono indizi per l'audit, NON bug confermati nella versione finale.
3. **Evidenze esterne aggiornate:** IOC REDs 2023, ACSM/AND/DC 2016, ISSN proteine 2017 e nuova position stand sulla perdita di peso 2026, EFSA, WHO. I riferimenti e link sono in fondo: Claude deve verificarli direttamente prima di cambiare formule.
4. **Priorità scientifica:** consenso e linee guida aggiornate per adulti sani e atleti > divulgazione del 2015. Segnalare controversie e condizioni di applicabilità. Non fornire diagnosi, né prescrizioni individuali cliniche; in caso di condizioni patologiche o indicatori di REDs occorre un professionista.
5. **Nessun valore è personalizzato per l'utente:** non impostare target senza dati attuali affidabili (peso, altezza, età, sesso, volume allenamento, preferenze, eventuali restrizioni). Non confondere dato assente con zero.

## 1. Le lezioni effettivamente utili del libro

- **Capitolo I, pp. 13–30:** importanza delle misure e dei trend, non della singola pesata. Il libro presenta bilancio calorico, metabolismo basale, spesa per digestione (ADS = TEF) e attività, diverse formule (MET, Mifflin-St Jeor, Harris-Benedict, fattori ponderali) e insiste nel **verificare empiricamente** la stima sul peso nel tempo. Propone come punto di partenza un deficit moderato intorno al 10–20% e un surplus moderato per aumentare massa. Le percentuali 70/10/20 sono descrizioni indicative, NON fattori fissi personali.
- **Capitolo III, pp. 47–122:** carboidrati come carburante importante in attività glicolitiche ed endurance; ruolo di qualità dei grassi e acidi grassi essenziali; fabbisogni proteici variabili per attività e bilancio energetico; critica del mito del massimo assorbimento di 30 g proteine per pasto. Idratazione ed elettroliti sono collegati a sudorazione, temperatura e dieta. Trattazione introduttiva dei micronutrienti (vitamine/minerali). Alcune affermazioni fisiologiche e dosaggi sono datati: **non copiarli come obblighi**.
- **Capitolo VI, pp. 213–240:** sostenibilità dell'alimentazione, spesa e qualità degli alimenti, verdure/frutta, varietà, etichette e ingredienti. A livello software: monitoraggio qualità alimentare accanto ai soli macro, suggerimenti pratici e ricette realistiche.
- **Capitolo VII, pp. 241–280:** distinzione fra attività di forza e aerobica, valore dell'allenamento contro resistenze, stima grezza dell'energia nella corsa ~0,9–1 kcal/kg/km e camminata ~0,4–0,5 kcal/kg/km, non validi universalmente. Nutrizione attorno al workout: la finestra post-allenamento non va presentata come evento tutto-o-niente; il totale giornaliero e la disponibilità di substrati contano molto. Whey: fonte proteica pratica, non automaticamente superiore a un'alimentazione adeguata.
- **Capitolo IX, pp. 317–342:** approccio individuale, calorie e macro da valutare su trend plurimensili, flessibilità della distribuzione fra giorni, carboidrati adattati all'allenamento, proteine maggiori nel cut per preservare massa magra, deficit non sempre lineare. Introduce periodi di pausa dietetica e variazioni graduali, ma **non autorizza un algoritmo che alzi/riduca le calorie ogni X giorni senza segnali reali**.

**Da NON trasformare in regole universali:** etichette somatotipo ectomorfo/mesomorfo/endomorfo, «minimo obbligatorio 4 g/kg carboidrati per tutti», grassi fino a 0,3 g/kg, assunzione idrica proporzionale rigidamente alle calorie, extra sodio/potassio automatico, acque/strategie di «reset metabolico», dieta chetogenica standard, integrazione di minerali a dosi prestabilite. Sono concetti contestuali, ipotesi o indicazioni datate da confrontare criticamente con evidenze successive.

## 2. Cosa c'è *nella versione della repository esaminata* — da riverificare dopo rollback

File principale: `source/engine.html`, funzioni cercate: `energySeries`, `energyAt`, `smartTargets`, `targetsFor`, `computeTargets`, `sessionKcal`, `learnedRates`, `logGet`, `dayTotals`, `intakeFor`, `goalState`, `weekBudget`.

### Stato osservato

- In modalità smart: `TDEE = BMR + NEAT + EAT + TEF`, quindi `TDEE_calibrato = TDEE_grezzo × factor`.
- BMR selezionabile: **Mifflin-St Jeor** (default), Harris-Benedict, Cunningham (se body fat disponibile, altrimenti fallback Mifflin), MET approssimato `kg × 24` (0,9 per sesso femminile).
- Harris-Benedict ha inoltre un **bonus additivo in kcal per ogni punto di body fat sotto una soglia** (`hbBonus`, `hbThr`) da validare: NON è parte della normale equazione storica.
- `EAT` somma le stime o misure delle sessioni `sessionsFor`/`sessionKcal`; per la corsa senza misura è possibile un fattore per km, per altri sport un MET o ritmo stimato appreso da sessioni storiche.
- `NEAT` usa dato smartwatch (`L.watch`) con opzione `watchMode=active|neat|total`; nei casi active/total sottrae le calorie dei workout (`watchView`) oppure anche il BMR. Se il risultato è sotto `minWatchNeat=150`, usa media dei sette valori precedenti oppure default `350`.
- `TEF` attualmente `0,1 × (BMR + NEAT + EAT)`, non derivato dall'energia effettivamente ingerita.
- Calibrazione: usa ultimi 14 giorni, richiede almeno 10 intake non stimati e 6 pesate, calcola un TDEE empirico dalla media energetica e dalla variazione di trend × `kcalPerKg=7000`, poi limita il moltiplicatore a `0,75–1,10`.
- Default di fase: **Cut** proteine 2,0 g/kg, grassi 0,8 g/kg e soglia carboidrati `cmin` 2,0 g/kg; **Bulk** 1,6/0,8/4,0; **Maintenance** 1,8/0,8/4,0. I carboidrati calcolati vengono tuttavia definiti come residuo calorico `max(0,(target − 4P − 9F)/4)`; auditare se `cmin` sia solo avviso o vincolo reale.
- Calorie bersaglio `target = tdee_calibrato + kcal_fase`. Una modalità non-smart usa invece `computeTargets` con macro di base per tipo di giornata, delta di intensità e ripartizione fra carboidrati/grassi. `targetsFor` può aggiungere compensazioni per cheat meal. Le due modalità vanno chiarite e testate.
- Le kcal degli alimenti derivano dai macro secondo `4P + 4C + 9F` in vari flussi: verificare differenze con valori etichetta, fibre, polioli, alcol, arrotondamenti e porzioni.
- Fitness include già vari sport e la corsa con kcal/km; **non presumere che una funzione richiesta manchi solo perché il backlog storico la elenca**.

### Punti d'audit prioritari (ipotesi, non diagnosi di bug)

| ID | Verifica richiesta | Rischio / test |
|---|---|---|
| EN-01 | Semantica del dato smartwatch: kcal **totali**, kcal **attive**, workout già incluso o escluso | Doppio conteggio o sottrazione duplicata; contratti reali per provider, test mock per ogni modalità |
| EN-02 | Classificazione EAT vs NEAT in giornate con più sessioni, workout programmati e registrati, dati duplicati/assenti | Un allenamento non deve apparire due volte; sessione pianificata non è consumo misurato |
| EN-03 | Stime da MET: differenza fra costo energetico **lordo** e **netto** sopra il riposo | Non sommare a BMR l'intero costo lordo senza considerare la quota di riposo |
| EN-04 | TEF: assunzione fissa 10% del dispendio pre-TEF e differenza rispetto a TEF legato all'introito reale | Evitare circolarità o bias in cut/bulk; stimare con intervallo d'incertezza |
| EN-05 | BMR (Mifflin, HB, Cunningham, MET), sesso, età, FFM assente, bonus HB | Confrontare con formule pubblicate, unità, input non validi e fallback; bonus HB opzionale solo se validato |
| EN-06 | Calibrazione TDEE 14d e 7000 kcal/kg, pesate non uniformi, variazioni glicogeno/acqua, gap nei dati | Evitare oscillazioni o correzioni implausibili; richiedere sufficiente qualità dati; mostrare affidabilità |
| EN-07 | Macro per fase: `cmin` applicato? Kcal e macro tornano? Delta attività rischia di passare da entrambe le modalità? | Non imporre target impossibili; in conflitto mostra avviso/range, non calorie negative |
| EN-08 | Check-in storico e stime alimentari, `intakeFor`, allenamenti, data/timezone | Calcolo deterministico e spiegabile; differenziare stimato/misurato e pianificato/consumato |
| EN-09 | Proiezioni peso, massa magra/grassa e ETA | Non inferire variazioni di FFM/FM da poche pesate; non spacciare equazione statica per certezza biologica |
| EN-10 | Compatibilità numerica del modello dopo rollback; vecchi record, export/import e offline/cloud | Nessuna migrazione senza backup, prove restore, controllo multi-account e consenso |

## 3. Architettura energetica consigliata: prima proposta, non modificare subito

### Identità dei componenti

- `RMR/BMR`: dispendio a riposo stimato; chiamarlo *RMR stimato* quando la formula è una predizione e non una misura clinica. Parametri espliciti (peso kg, altezza cm, età, sesso del modello, FFM se disponibile).
- `NEAT`: movimento quotidiano non classificato come allenamento: passeggiate, lavoro, faccende, spostamenti. Non deve includere EAT.
- `EAT`: costo **netto aggiuntivo** di allenamenti, quando si usa BMR separatamente; distinguere misura di dispositivo/algoritmo e valori lordi/netti.
- `TEF/ADS`: energia per digestione/assimilazione, con incertezza; usare impostazione documentata e non creare un ciclo autoreferenziale fra target e TDEE.
- `TDEE`: stima prima della calibrazione, calibrazione empirica e intervallo d'incertezza con provenienza delle componenti.
- `EA` (energy availability) distinto da TDEE: `(energia introdotta − energia esercizio) / kg FFM / giorno`. Da usare **solo come indicatore orientativo e non diagnosticante**; non impiegare una singola soglia fissa per classificare tutti gli atleti o generare ansia. IOC 2023 sottolinea forte eterogeneità.

### Criteri progettuali

1. Definire un unico contratto typed/documentato: `quantity`, `unit`, `value`, `source` (manual/device/estimated/plan), `grossOrNet`, `coverage`, `timestamp`, `confidence`, `version`.
2. Distinguere **giornata conclusa**, **oggi parziale** e **giornata futura**. Non trasformare un workout futuro in EAT *effettivo*; è un EAT *previsto*.
3. Priorità dati: misure attendibili con semantica nota > dati registrati > stime motivate > fallback; mai sommare due fonti alternative dello stesso workout.
4. Calibrazione graduale: privilegiare trend di 3–4 settimane quando utile e disponibili, testare baseline a 14 giorni come confronto; limitare peso dei dati inaffidabili, fluttuazioni idriche e cambiamenti recenti di carboidrati/sodio/allenamento. Evitare ricalibrazioni aggressive automatiche.
5. Interfaccia “Come calcolato”, disattivabile dalle Settings: `BMR + NEAT + EAT + TEF → TDEE → eventuale fattore empirico → target fase → P/F/C`, con fonti, ipotesi, affidabilità e spiegazione dei fallback.
6. Calcolare **i giorni storici usando dati coerenti con quelle date**, senza usare peso o formule future per alterare retroattivamente diete già consumate. Versionare gli algoritmi e tracciare la provenienza.
7. Nessuna prescrizione basata soltanto sull'output della formula: i numeri sono stime iniziali da validare con andamento reale, fame, energia, performance e recupero.

### Formule base da testare (non sempre prescrizioni)

- **Mifflin-St Jeor, VERSIONE ARROTONDATA:** uomo `10×kg + 6,25×cm − 5×anni + 5`; donna `10×kg + 6,25×cm − 5×anni − 161` (kcal/die). **Per formula esatta originale e Ten Haaf vedere AVVISO SCIENTIFICO PRIORITARIO sopra**.
- **Cunningham:** `500 + 22×FFM_kg` (kcal/die); richiede una stima credibile di FFM.
- **Costo corsa grezzo di partenza:** `~1 kcal × kg × km`, solo come ordine di grandezza; attenzione a costo netto vs lordo e calibrazione individuale (libro pp. 264–266).
- **Costo MET lordo:** `MET × kg × ore` circa kcal; **incremento netto** su riposo ~`(MET−1) × kg × ore`, quando applicabile. Non usare questa semplificazione come gold standard.
- **Kcal alimentari:** schema Atwater generale `4×P + 4×C + 9×F`, con eccezioni per fibre/polioli/alcol, fattori specifici e arrotondamenti etichetta. Memorizzare anche il dato dichiarato sull'etichetta e la qualità della fonte; non “correggerlo” automaticamente.
- **Sale ↔ sodio:** `1 g sale ≈ 400 mg sodio`, quindi `g sale ≈ g sodio × 2,5`; non confondere mg, g e volume.

## 4. Target per forza + endurance: range scientifici, non prescriptive defaults

### Energia e fasi

- **Maintenance:** obiettivo è stabilità del trend, energia per salute, vita quotidiana e allenamento; calibrare con dati realmente registrati.
- **Cut:** il libro suggerisce spesso un deficit moderato `10–20%`, non universale. Il position stand ISSN 2026 sottolinea individualizzazione e preservazione massa magra; come punto di discussione, in alcune condizioni atletiche si parla di ~`0,5–1,0% del peso/settimana`, spesso meno negli individui molto magri, ma **non è una velocità garantita o prescrizione generale**. Nessun target forzato se prestazione, benessere o salute ne risentono.
- **Bulk:** il libro suggerisce surplus indicativo `10–15%`; proporre intervalli più individualizzati e prudenti in base a livello, trend, performance e incremento di grasso, evitando l'automatismo.
- **Diet breaks/refeed:** opzionali, da valutare come strumenti di aderenza/fattibilità; non assumere un “reset metabolico” obbligatorio dopo 6–8 settimane, né promettere il ripristino di ormoni/metabolismo.
- **REDs/LEA:** con endurance + forza non ignorare cronica disponibilità energetica insufficiente. Eventuali avvisi devono essere prudenti e indirizzare a supporto clinico, non imporre una diagnosi.

### Proteine

- ISSN 2017: riferimento generale `1,4–2,0 g/kg/die` per molti praticanti attività sportiva, adattabile a obiettivo, volume e qualità della dieta.
- Per allenamento contro resistenze, ISSN pubblicato online il 13 ottobre 2026: frequentemente `1,6–2,2 g/kg BW/die`, con `1,9–3,2 g/kg BW/die` contemplati solo in soggetti magri, allenati e ipocalorici; la precedente ISSN 2017 cita `2,3–3,1 g/kg di FFM` in condizioni ipocaloriche particolari. **Non confondere g/kg peso con g/kg FFM.**
- Dose per occasione orientativa `0,25 g/kg` o `20–40 g` di proteine di buona qualità; distribuire i pasti è utile ma NON esiste un tetto assoluto di assorbimento di 30 g. L'aderenza e la quota giornaliera prevalgono.
- Whey solo se preferite/registrate e se opportuno rispetto a intolleranze e necessità effettiva; nessun suggerimento automatico di integratori per “riempire il macro”.

### Carboidrati

- Periodizzare in base a **durata, intensità, volume e prossima sessione**, non al solo nome dello sport. ACSM 2016: riferimento per lavoro lieve circa `3–5 g/kg/die`, moderato ~1h/die `5–7`, elevato 1–3h/die `6–10`, carichi estremi 4–5h/die `8–12`. **Sono guide per determinate condizioni, non soglie minime per ogni giorno**.
- Sessioni <45 minuti: generalmente non serve apporto durante; 45–75 minuti intensi: quantità piccole possono essere utili; 1–2,5h: indicativamente `30–60 g/h`; >2,5–3h: riferimento tradizionale **fino** a `90 g/h` se tollerato e allenato l'intestino; una review 2026 discute fino a `120 g/h` per specifici atleti allenati, non come target universale. Non proporre forzature gastrointestinali; considerare allenamenti intermittenti e disponibilità di cibo praticabile.
- Per doppia seduta o gara ravvicinata può essere utile una strategia post-esercizio più mirata; per normali intervalli fra allenamenti prevalgono fabbisogno complessivo e praticità.
- Evitare il requisito rigido del libro di `4 g/kg` come minimo per tutti, o di `+100–150 g` fissi nei giorni di allenamento.

### Grassi

- Non ridurre automaticamente i lipidi per far quadrare i carboidrati. Proteggere adeguatezza energetica e acidi grassi essenziali. Il libro cita `0,7–0,8 g/kg` come punto di partenza, ma i minimi estremi `0,3–0,4 g/kg` NON devono essere default proposti a un atleta.
- Come informazione di qualità: distinguere saturi/insaturi, fonti alimentari e bisogni complessivi. Se P + grassi adeguati + carboidrati per carico allenante rendono impossibile la quota energetica, mostrare il conflitto anziché forzare numeri.

### Distribuzione dei pasti

- Numero di pasti **flessibile** secondo preferenze e routine, senza obbligo universale 5–6 pasti. A livello di performance, la distribuzione delle proteine e l'alimentazione prima/durante/dopo sedute selezionate possono essere rilevanti; evitare timer e notifiche ansiogene.

## 5. Idratazione, sodio, potassio e micronutrienti

- Il libro (pp. 104–113) sottolinea importanza di idratazione e perdite con sudore; alcuni calcoli proposti sono troppo rigidi per il prodotto. **Non impostare litri = kcal o supplementi elettrolitici automatici**.
- Per allenamenti outdoor prolungati/caldi, considerare durata, temperatura, umidità, intensità, sudorazione misurata o stimata, possibilità di bere e risposta individuale. Un diario pre/post allenamento può aiutare a stimare perdita idrica, ma il peso perso non è una misura perfetta (cibo/liquidi/urina/metabolismo); evitare raccomandazioni che provochino eccessiva assunzione d'acqua o iponatriemia.
- **Sodio popolazione generale:** OMS (maggio 2026) indica meno di `2000 mg sodio/die` (~5 g sale) per adulti; EFSA 2019 considera `2,0 g sodio/die` sicuro e adeguato per adulti in generale. **Le perdite con sudore possono richiedere valutazioni specifiche**, ma non giustificano un target più alto automatizzato per tutti gli sportivi.
- **Potassio EFSA adulti:** assunzione adeguata `3500 mg/die`, orientamento per la dieta; non suggerire supplementazione automatica, specie in presenza di patologie renali o farmaci.
- **Fibre EFSA:** assunzione adeguata di riferimento `25 g/die` nell'adulto per funzione intestinale; adattare contesto e tolleranza, soprattutto in prossimità di gare/allenamenti lunghi.
- Tracciare, se valori attendibili: sodio/sale, fibre, potassio, calcio, ferro, vitamina D, magnesio e altri micronutrienti in base a database disponibili e DRV applicabili. Non trasformare “unknown” in `0 mg`; aggregare la **copertura del dato** (`x% degli alimenti con dato presente`) e mostrare gli indicatori solo con sufficiente copertura.
- Etichette UE spesso riportano **sale**, alcune fonti **sodio**; normalizzazione corretta obbligatoria. Dati Open Food Facts e foto AI possono essere incompleti e richiedere verifica.
- Gli alert devono essere non medicalizzanti: “dato incompleto”, “valore da verificare”, “possibile apporto non ottimale”; evitare diagnosi di carenze, anemia, disidratazione e REDs da semplici input alimentari.

## 6. Implicazioni per AI Meal Planner, Foods e Recipe Engine

1. L'AI deve **proporre ricette vere** con ingredienti, dosi, porzioni, tempi, metodi e preferenze; non combinazioni casuali per raggiungere 100% dei macro.
2. Richieste rigide: allergie e alimenti esclusi, sicurezza delle scorte, vincoli di disponibilità/quantità, calorie incompatibili con limiti fisici o piano approvato. Obiettivi morbidi: varietà, preferenze, spreco, costo e prossimità ai macro.
3. Un suggerimento **può essere accettabile senza raggiungere esattamente ogni macro**. Mostrare delta e trade-off; proporre alternative invece di integrare forzatamente whey/olio/dolci.
4. Preferenza `Svuota Storage`: considera consumo già programmato, disponibilità reale, scadenze, confezioni aperte e lotti, evitando doppio utilizzo di scorte; non alterare l'inventario reale prima del consumo registrato.
5. Food provenance: preferire elementi già in Foods, poi dati strutturati controllati, poi inserimento assistito; AI stima con etichetta “stimato” e controllo manuale. Non inferire micronutrienti numericamente da sole kcal o macro.
6. Ricette: macro aggregati in modo deterministico da ingredienti, scaling porzioni, costi, unità, varianti e dati mancanti. Cottura: non inventare conversioni fra alimento crudo/cotto, resa, densità g/ml e perdita d'acqua; usare fattori specifici solo se noti.
7. Da Foods e Meal Plan si deve poter **modificare quantità reale in dispensa**; mostrare distinta la quantità del pasto. Ogni modifica deve riflettersi in ricette, inventario previsto, Shopping List e costi, senza creare consumi effettivi fittizi.
8. Stima spesa alimentare separata dalla spesa di extra non-food; presentazione per settimana corrente da oggi, prossima settimana, prossimi X giorni, range personalizzato.
9. Migliorare qualità della dieta con varietà alimentare, frutta/verdure, legumi, cereali integrali e fibre dove compatibile; non introdurre un indice opaco che etichetti alimenti “buoni/cattivi” o penalizzi rigidamente scelte occasionali.

## 7. Test di accettazione obbligatori

**Energia (unit):** Mifflin (varie età/sessi), Cunningham FFM noto/ignoto, HB senza bonus, unità BMR; energia MET lorda/netta; fonte smartwatch active/total/NEAT; corsa solo km; nessuna sessione; due sessioni diverse; stessa sessione pianificata + registrata. Formula kcal e unità dei nutrienti.

**Calibrazione (property/integration):** peso stabile e calorie stabili; dati pochi/assenti; variazione repentina da carboidrati/sodio; settimane con interruzione pesate; transizione cut/maintenance; limiti ragionevoli e risultato riproducibile; modello precedente disponibile per confronto.

**Nutrienti:** proporzioni 100g→g usati; ricetta con 4 ingredienti e 2 porzioni; mezza confezione; alimento senza sodio noto; etichetta `sale` vs `sodium`; prodotti off con valori incomplete; mix crudo/cotto con conversione consentita solo se nota; rounding e calorie non perfettamente uguali al dato etichetta.

**Workflow:** sette giorni programmati, tre ricette condivise, consumo parziale, modifica scorta dal Meal Plan e da Foods, acquisto e annullamento, proiezione scorte future, shopping filtrata da oggi, integrazione extra non-food. Reload, offline, sync mock, isolamento di account e undo. Dati storici conservati.

**UX:** dettaglio espandibile «Come calcolato», fonti e confidenza, dati mancanti espliciti, smartphone/tablet/desktop, screenshot/overflow, operazione modificare scorta in pochi passaggi.

**Safety:** niente suggerimenti che costringano a restrizioni estreme, supplementazione elettrolitica automatica, diagnosi, target non raggiungibili; avvisi prudenziali quando volume allenante e introito energetico suggeriscono possibile incongruenza.

**Processo:** prima scrivere test sulla baseline per difetti sospetti; documentare quali riproducono errori, quali no. Non dichiarare fallito/confermato ciò che non è stato verificato.

## 8. Milestone scientifiche proposte (MoSCoW)

1. **Must — Audit senza modifiche:** inventario formule, sorgenti dati e contratti BMR/NEAT/EAT/TEF, confronto con libro e linee guida; mappa dei possibili doppioni; test baseline, proposta approvabile.
2. **Must — Correttezza calcoli:** separazione esercizio/attività, lordi/netti, calibrazione robusta, unità, provenienza e formule pure condivise, test e rollback.
3. **Should — Trasparenza nel Check-in:** opzione Settings «Mostra calcoli», spiegazione per componente, affidabilità e provenance; storico invariato salvo migrazioni versionate approvate.
4. **Should — Target sportivi flessibili:** proteine/carboidrati/grassi su range e vincoli documentati, giorni di training e rest, periodizzazione senza deficit/surplus arbitrari.
5. **Should — Micronutrienti e idratazione:** copertura dati, sale/sodio, fibre e avvisi non prescrittivi, senza falsi zero né supplementi automatici.
6. **Should — AI Meal Planner fondato su ricette:** vincoli, ricette realistiche, prezzi, Storage e preferenze; test di plausibilità/varietà.
7. **Could — Personalizzazione avanzata:** trend e apprendimento robusto individuale, simulazione scenari, intervalli di confidenza e report prospettici dopo sufficiente storico.

## 9. Istruzione di esecuzione per Claude Code

**NON IMPLEMENTARE SUBITO.** Dopo aver confermato con me l'HEAD ripristinato:

1. Riapri il codice: questa specifica fotografa solo il `main` pre-rollback del 24/10/2026.
2. Produci matrice «presente/verificato, presente ma fragile, mancante, non verificato» per ciascun requisito e per i rischi EN-01..EN-10.
3. Per ciascuna formula proposta, presenta **formula attuale → problema dimostrato o rischio → fonti → proposta → range/assunzioni → impatto sui dati storici → test → strategia rollback**.
4. Distingui: *dal libro 2015* / *linee guida attuali* / *scelta progettuale* / *ipotesi da verificare*.
5. Chiedi approvazione della milestone di audit e delle modifiche scientifiche prima di alterare algoritmo o database. Dopo approvazione, implementa con autonomia nel perimetro, mostrando avanzamento, test reali e rischi.

## 10. Bibliografia essenziale verificabile dall'agente

**Fonte fornita dall'utente:** Project inVictus, *Project Nutrition* (2015), in particolare PDF pp. 19–30, 47–78, 104–120, 213–240, 241–280, 317–342. Il documento che stai leggendo sintetizza questi concetti in modo sufficiente per impostare i requisiti software; per ogni conclusione medica/nutrizionale non direttamente coperta, consultare fonti scientifiche originali.

**Repository:** https://github.com/iantomasi-nicola/engine e `source/engine.html`, `docs/ARCHITECTURE.md`, `docs/PRODUCT_REQUIREMENTS.md`, `AGENTS.md` (controllare la versione ripristinata).

- International Olympic Committee, **REDs consensus statement**, 2023: https://bjsm.bmj.com/content/57/17/1073
- Thomas DT et al., **Nutrition and Athletic Performance**, ACSM/AND/DC, 2016: https://www.federvolley.it/sites/default/files/Settore%20Tecnico%20%2B%20Scuola%20%2B%20Antidoping/2016%20ACSM_Nutrition%20and%20Athletic%20Performance.pdf
- Jäger R et al., **ISSN Position Stand: Protein and Exercise**, 2017: https://pmc.ncbi.nlm.nih.gov/articles/PMC5477153/
- **ISSN Position Stand: Diets for Body Weight Reduction**, 2026: https://pubmed.ncbi.nlm.nih.gov/42867412/ (confrontare pubblicazione e testo definitivo).
- EFSA, **Dietary Reference Values**: https://www.efsa.europa.eu/en/topics/topic/dietary-reference-values
- EFSA, **Potassium adequate intake 3500 mg**, 2016: https://www.efsa.europa.eu/en/press/news/161025
- EFSA, **Dietary Reference Values for Sodium**, 2019: https://efsa.onlinelibrary.wiley.com/doi/10.2903/j.efsa.2019.5778
- WHO, **Sodium reduction**, maggio 2026: https://www.who.int/news-room/fact-sheets/detail/sodium-reduction
- EFSA, **Dietary Reference Values Summary** (inclusi riferimenti fibre): https://www.efsa.europa.eu/sites/default/files/2017_09_DRVs_summary_report.pdf

**Regola conclusiva:** una formula non è “gold standard” perché presente in un libro o in Engine. Deve essere appropriata al dato disponibile, chiaramente qualificata come stima e valutata empiricamente, senza perdere integrità dei dati o applicabilità pratica.


## 11. Fonti PubMed primarie e revisioni aggiunte (verificate 24/10/2026)

- **Mifflin et al., 1990** — PMID **2305711**; equazione originale e semplificata: https://pubmed.ncbi.nlm.nih.gov/2305711/ .
- **Ten Haaf & Weijs, 2014** — PMID **25275434**; formule in atleti: https://pubmed.ncbi.nlm.nih.gov/25275434/ .
- **O'Neill, Corish, Horner 2023, *Sports Medicine*** — PMID **37632665**; meta-analisi equazioni RMR in atleti: https://pubmed.ncbi.nlm.nih.gov/37632665/ .
- **Predicting resting energy expenditure among athletes, 2023** — PMID **37398968**: https://pubmed.ncbi.nlm.nih.gov/37398968/ .
- **ISSN Position Stand: Diets for Body Weight Reduction**, online **13/10/2026** — PMID **42867412**: https://pubmed.ncbi.nlm.nih.gov/42867412/ .
- **Morton et al., 2026, carbohydrate during endurance exercise** — PMID **41759826**: https://pubmed.ncbi.nlm.nih.gov/41759826/ .
- **IOC REDs 2023** — PMID **37752011**: https://pubmed.ncbi.nlm.nih.gov/37752011/ .
- **ISSN Protein and Exercise, 2017** — PMID **28642676**: https://pubmed.ncbi.nlm.nih.gov/28642676/ .
- **Activity monitors energy expenditure, meta-analysis** — PMID **30194221**: https://pubmed.ncbi.nlm.nih.gov/30194221/ .
- **Wearables, umbrella review 2024** — PMID **39080098**: https://pubmed.ncbi.nlm.nih.gov/39080098/ .
- **Harris–Benedict 1919 coefficients originali**, tabella di studi peer-reviewed: https://pmc.ncbi.nlm.nih.gov/articles/PMC6935811/ .

**Regola per l'agente:** i link PubMed e le tabelle riportano i coefficienti da IMPLEMENTARE (dopo approvazione), mentre gli errori del libro restano documentati **solo per ricostruzione storica e test negativi**. Non proclamare le formule predittive come misure gold standard.
