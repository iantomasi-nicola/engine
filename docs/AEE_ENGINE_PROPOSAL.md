# Motore AEE automatico (NEAT + EAT) senza le kcal dell'orologio — analisi e proposta

Stato (24/10): **strategia approvata; P0 e P1 fatti** (import in sola lettura + modalità «in ombra»); **il motore in uso non è stato modificato**; P2–P3 aspettano il confronto sui tuoi dati e la tua approvazione. Richiesta dell'utente (24/10): stimare l'AEE in modo accurato e difendibile, eliminare il campo manuale «Watch kcal» dal Check-in, EAT da intervals.icu, NEAT dai passi. Collegato a `NUTRITION_AUDIT.md` (F-03, F-06, F-12) e ai requisiti D5, D7, D8, D17, D18.

## 1. Cosa fa oggi il codice (baseline `cae350d`, letto e in parte provato)

| Parte | Comportamento | Conseguenza per questa richiesta |
|---|---|---|
| `energySeries()` | `TDEE = (BMR + NEAT + EAT + TEF) × fattore`. NEAT: se c'è `L.watch` lo ricava dal valore dell'orologio (modalità *active/neat/total*), altrimenti **media dei 7 NEAT precedenti** (che possono essere già medie), altrimenti 350 | Senza il campo manuale il NEAT è una media che non vede i giorni di più o meno movimento. I passi non entrano nel calcolo |
| `sessionKcal()` | Catena **«vince il primo disponibile»**: kcal registrate/dispositivo → kcal orologio → regressione sul carico → km (corsa) → FC (Keytel × `hrCal` 0,794) → tasso appreso o MET netto | Nessun confronto tra stime indipendenti; le kcal importate sono considerate verità |
| `learnedRates()` | Impara kcal/min per sport e intensità **dalle sessioni con kcal reali** (dispositivo), poi le usa per le sessioni senza misura | Se le kcal importate sono **totali** (come dici per Zepp) il bias lordo si propaga anche alle stime apprese |
| Import intervals.icu | Legge le attività degli ultimi 21 giorni e salva: sport, minuti, km, FC media, kcal, RPE, carico. **Non salva** dislivello, potenza, cadenza, velocità, dispositivo. Passi: dal benessere, aggiornati se cambiano (ultimi 21 giorni) | Per stimare bene serve leggere più campi (sola lettura) |
| Lordo/netto | Il modello MET è **netto** (MET×fattore − 1). Le kcal dei dispositivi sono usate come EAT **così come sono** | Con kcal totali di Zepp si conta due volte il riposo della sessione: ≈1 kcal/kg/h (≈80 kcal per un'ora a 80 kg), già dentro il BMR |

Fatti forniti dall'utente: Amazfit registra le kcal **totali** dell'allenamento e le invia a intervals.icu; anche con la fascia Polar la corsa passa da Zepp (quindi stessa semantica, FC dalla fascia); i passi di Amazfit arrivano a intervals.icu ma **non in modo affidabile** (da qui: *passi mancanti ≠ zero*); esistono **molti giorni** passati con le kcal dell'orologio inserite (`L.watch`).

## 2. Le strategie confrontate

| | **A. Dal basso, per sport** (stima indipendente + kcal importate come confronto) | **B. Fiducia nel dispositivo** (kcal importate rese nette + passi) | **C. Dall'alto** (TDEE da bilancio energetico, nessun NEAT/EAT separato) |
|---|---|---|---|
| Idea | EAT con equazioni per sport (ACSM, Compendium 2024) da distanza, durata, dislivello, potenza, FC; NEAT da passi + base; le kcal di Zepp sono *una candidata* tra le altre | EAT = kcal importate − riposo (BMR/1440·minuti); NEAT da passi | TDEE = introito medio − variazione del trend peso × densità energetica |
| Accuratezza giornaliera | Buona per corsa/camminata/bici (costo energetico noto), media per forza/calisthenics (MET) | Limitata dall'algoritmo di Zepp: le revisioni sui wearable riportano errori medi **>30%** per le kcal (sintesi trovata, non il testo primario) | Non scende al singolo giorno né al singolo sport |
| Robustezza | Alta se i campi mancano (cade sul metodo successivo) | Dipende da un solo fornitore e dalla sincronizzazione | Alta sul lungo periodo, lenta (settimane), sensibile a errori di logging, acqua e glicogeno |
| Spiegabile | Sì, ogni numero ha formula e fonte | Parziale | Sì, ma come una media |
| Semplicità d'uso | Nessun inserimento | Nessun inserimento | Nessun inserimento |
| Rischi | Più codice e test; equazioni per sport da verificare sulle fonti | Bias lordo/netto e per dispositivo da stimare | Non risponde alla tua richiesta (separare NEAT ed EAT) |

**Proposta: A come motore giornaliero, B come candidata dentro A (non come verità), C come calibrazione lenta del solo totale.** È la combinazione che soddisfa insieme la tua lista: stima indipendente, confronto con le kcal importate, nessuna correzione percentuale arbitraria, e calibrazione senza confondere il TDEE con una misura del NEAT.

## 3. Come funzionerebbe

### EAT (per sessione, netto rispetto al riposo)
1. **Candidati** calcolati quando i dati lo permettono:
   - *Corsa/camminata:* equazioni metaboliche ACSM (costo orizzontale per metro, più componente della pendenza dal dislivello positivo); oggi il codice usa 1,0 kcal/kg/km, coerente con il costo netto della corsa. **Coefficienti da verificare sul testo prima dell'uso.**
   - *Bici:* lavoro meccanico dalla potenza diviso l'efficienza (intervallo di letteratura da verificare), meno il riposo.
   - *Nuoto (vasca/mare), calcio a 5, forza, calisthenics, altri:* MET del **2024 Adult Compendium of Physical Activities** per attività e intensità (esiste: *J Sport Health Sci* 13(1):6–12, 1.114 attività, 303 nuove, 176 aggiornate, adulti 19–59; i valori vanno letti dal sito ufficiale in implementazione), applicati alla durata attiva, NETTI (MET − 1).
   - *FC:* usata come indicatore di intensità e come candidata (Keytel) solo quando il sensore è affidabile per quello sport; mai come unico metodo in forza/calisthenics (movimento delle braccia, fascia o polso).
   - *kcal importate:* convertite in nette (`lordo − riposo`, secondo il tipo dichiarato in D5a: per Zepp «totale»).
2. **Scelta:** per ogni sport un ordine di affidabilità e **soglie di qualità** (dati presenti, durata plausibile, FC non anomala). Si usa il candidato più affidabile; se due candidati sono in disaccordo oltre la loro incertezza, si usa il migliore e si segnala. Nessuna media cieca e **nessuna percentuale fissa**.
3. **Bias personale per metodo, sport e sensore** (es. «Zepp netto vs stima indipendente per la corsa in fascia»): mediana robusta su molte sessioni, applicata **solo** con campione sufficiente e dispersione stabile, mostrata con n e intervallo. Prima di allora, nessuna correzione.
4. Uscita: `{kcal netto, metodo, candidati, incertezza, qualità}` per sessione.

### NEAT
- **Osservato:** passi del giorno da intervals.icu con **copertura**: se mancano non sono zero; si usa la mediana dei giorni validi simili, marcata «stimato».
- **Riconciliazione con gli allenamenti:** si tolgono i passi della sessione solo quando distanza o cadenza permettono una stima affidabile; altrimenti il giorno è «bassa confidenza» e non si fa una sottrazione arbitraria.
- **Costo netto del cammino:** `peso × distanza × costo per km` (ACSM/Compendium), con distanza = passi × falcata (dall'altezza, da confermare) e velocità se nota. Non sono coefficienti universali: partono dalla letteratura e si personalizzano dai tuoi dati.
- **Non rappresentato dai passi** (in piedi, faccende): componente **modellata separata**, con prior prudente e incertezza ampia, mostrata a parte da quella osservata.
- **Apprendimento senza inserimenti:** i **tanti** giorni passati con `L.watch` diventano un **banco di prova** (backtest) del modello NEAT+EAT; non una verità: anche l'AEE di Zepp ha un errore grande. L'àncora fisica resta il trend del peso.

### Calibrazione
- Un fattore **solo sul totale** (F-06 v2: regressione, finestra lunga, qualità dati, restringimento verso 1, limite settimanale), mostrato come tale, mai attribuito al NEAT. Gestisce logging, acqua, glicogeno, dati incompleti e adattamento.
- **Affidabilità visibile** per componente: fonte, formula, n dati, intervallo.

## 4. Piano a passi, senza rischi per i dati
1. **P0 – Importare più campi in sola lettura** (dislivello, potenza, cadenza, velocità, dispositivo, copertura passi) e conservarli: nessun numero cambia. Verifica che l'import non scriva nulla su intervals.icu (ENG-07). *Serve la tua approvazione perché tocca l'importazione.*
2. **P1 – Modalità «in ombra»:** il nuovo AEE viene calcolato accanto al vecchio, con confronto e backtest sui tuoi giorni con `L.watch`, in una pagina diagnostica. Il vecchio resta quello in uso.
3. **P2 – Tua approvazione sul confronto,** formula per formula; interruttore `neatMode/eatMode` e data di attivazione (D17): lo storico non cambia.
4. **P3 – Rimozione del campo «Watch kcal» dal Check-in** e dalla dipendenza obbligatoria del calcolo. **I dati `L.watch` esistenti non vengono cancellati**: restano leggibili per il backtest e per i giorni precedenti all'attivazione. Anche il campo «Watch kcal» dentro l'editor della singola sessione segue la stessa sorte.

## 5. Test previsti
Giornate senza allenamento, corsa (con e senza dislivello/cadenza), forza e calisthenics, attività multiple, passi mancanti e parziali, sensori diversi, workout duplicati da due fonti, kcal lorde vs nette, riconciliazione passi–attività, sessione di camminata con distanza, dati storici invariati, reload/offline/sync simulata, backup/ripristino prima dell'attivazione, confronto v1/v2 su dati sintetici e backtest sui tuoi dati (solo se mi dai un export; mai il progetto reale).

## 6. Rispetto alla tua specifica
Sono d'accordo su tutti i punti. Le differenze sono quattro, e vanno nel senso della prudenza:
1. **Prima in ombra, poi l'interruttore** (P1→P3), invece di sostituire in un colpo.
2. **I dati `L.watch` si conservano e si usano come banco di prova**, non si buttano.
3. **Le kcal di Zepp restano una candidata** (rese nette), non vengono scartate: dichiarare «totali» è già un'informazione preziosa.
4. **Il 2024 Compendium esiste ed è la fonte giusta** (verificato), ma i valori per attività e le equazioni ACSM vanno letti dalla fonte primaria al momento dell'implementazione: da qui non riesco a raggiungere né PubMed né il sito del Compendium.

## 7. Cosa chiedo di approvare
- La strategia (A con B dentro e C come calibrazione del totale).
- **P0** (importare altri campi in sola lettura) e **P1** (modalità in ombra), cioè nessuna modifica ai numeri che vedi.
- Rimandare P2–P3 al confronto sui tuoi dati.

## 8. Cosa è stato fatto (24/10)
- **P0:** l'import di intervals.icu salva in sola lettura dislivello (`elev`), velocità (`spd`), potenza (`pw`), cadenza (`cad`), FC massima (`hrmax`) e nome del dispositivo (`devn`), solo se presenti; non cancella mai valori già presi; i nomi dei campi API (`total_elevation_gain`, `average_speed`, `icu_average_watts`/`average_watts`, `average_cadence`, `max_heartrate`, `device_name`) sono quelli che conosco ma **non ho potuto confermarli sull'API reale da qui**: alla prima sincronizzazione appaiono solo se esistono. Un test con un intervals.icu finto verifica che un sync senza nulla in sospeso **legga soltanto** (nessun POST/PUT/DELETE).
- **P1:** `Progress › Nutrition › Energy › «AEE in the shadow»` (chiusa di default) confronta, per gli ultimi 7 giorni, NEAT, EAT e AEE «in uso → in ombra» e mostra il confronto con le tue kcal dell'orologio sui giorni passati (ogni giorno escluso da ciò che si impara). **Non entra in nessun target** (test).
  - **EAT:** candidati per sessione. Corsa/camminata: equazione ACSM da passo e dislivello (`VO2 = 0,2·v + 0,9·v·pendenza` corsa; `0,1·v + 1,8·v·pendenza` camminata; 5 kcal per litro), qualità alta con dislivello. Valore del sensore reso netto togliendo l'energia a riposo (se il sensore dichiara «attive» non si toglie nulla; «non so» = qualità bassa). FC (Keytel, solo se non è forza/calisthenics, netta). MET generico netto. Si sceglie il migliore disponibile e gli altri restano visibili.
  - **NEAT:** passi del giorno × costo netto della camminata (0,5 kcal/kg/km × falcata 0,415 × altezza). **Nei giorni con corsa o camminata i passi non vengono trasformati in NEAT** (già nell'allenamento): si usa il giorno tipico senza allenamento, con etichetta «bassa confidenza». Passi mancanti = sconosciuto, mai zero. La parte non misurata dai passi si impara dai tuoi giorni con kcal dell'orologio (mediana di orologio − passi, minimo 14 giorni, senza il giorno stesso nel backtest); prima è «non modellata» e non viene inventata.
- **Limiti dichiarati:** (1) i METs dei vari sport restano quelli già nel modello (non ho verificato valori 2024 del Compendium); nuoto, bici e calcio a 5 quindi usano il sensore o il MET generico; (2) la potenza non è ancora usata per la bici (equazione da verificare); (3) la falcata 0,415×altezza è un'approssimazione di letteratura da confermare sui tuoi dati; (4) non so ancora cosa conti davvero il «totale» di Zepp: l'impostazione per sensore (totali/attive) lo rende esplicito.
- **Non promesso:** nessuna cifra di accuratezza («precisissime») senza il confronto sui tuoi dati: il backtest mostra bias e scarto tipico, e il peso corporeo resta la verifica finale.

## 9. Inventario delle scritture verso intervals.icu (ENG-07)
Tutte partono da dati locali in attesa e da flag espliciti; senza di essi il sync legge soltanto (testato).
| Chiamata | Quando |
|---|---|
| `DELETE /events/<id>` | una sessione pianificata sincronizzata è stata cancellata in Engine; gara cancellata |
| `POST /events` | nuova sessione pianificata (`pushNew`) o nuova gara |
| `PUT /events/<id>` | sessione pianificata modificata in Engine (`dirty`) |
| `PUT /wellness/<data>` | peso, FC a riposo, HRV, sonno, body fat inseriti in Engine e assenti su intervals.icu (ultimi 15 giorni) |
| `PUT /activity/<id>` | RPE modificato in Engine; dettagli di una sessione di forza eseguita |
| `POST /activities/manual` | allenamento fatto in Engine (live) non ancora presente su intervals.icu |

## §10 P2 (parte NEAT) attivata — 24/10/2026
Approvata dall'utente («OKAY») la formula proposta: **giorno con passi e senza corsa/camminata, senza kcal d'orologio digitate: NEAT = costo dei passi + base appresa** (mediana, sui 90 giorni precedenti, di «NEAT d'orologio − costo dei passi» nei giorni con entrambi e senza corsa/camminata; servono ≥ 14 giorni). Costo dei passi = 0,5 kcal/kg/km × passo 0,415 × altezza (ACSM, camminata, netto del riposo). Il valore d'orologio digitato resta prioritario nel suo giorno. Giorni senza passi, con corsa/camminata o con base non apprendibile: comportamento precedente (media dei 7 giorni), ora dichiarato «(no steps for this day)». La base è **causale** (solo giorni precedenti), quindi un dato nuovo non cambia i giorni passati. In `energySeries` (`neatSrc: "steps"`); testato con numeri calcolati a parte (`tests/neat-steps.test.js`). Non cambiano: BMR, TEF, EAT, calibrazione.

Restano da fare (P2 resto e P3): togliere «Watch kcal» dal Check-in e dall'editor sessione, EAT con candidati al posto del valore del dispositivo — solo dopo il backtest sui dati reali e con approvazione esplicita.

