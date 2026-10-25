# Proposta scientifica — nutrizione (SUPERATA da `NUTRITION_AUDIT.md`; conservata per storia)

> Questa bozza iniziale è stata sostituita dall'audit basato su `NUTRITION_SPEC.md`. Alcune ipotesi qui sotto (doppio conteggio NEAT/EAT in tutte le modalità, TEF applicato due volte) **non sono state confermate**: vedi l'audit.

Stato: **da approvare**. Non cambia il codice. Da integrare con il libro che l'utente allegherà; le fonti sotto sono quelle che intendo consultare, **da ricontrollare puntualmente prima di citare valori numerici** (qui non riporto soglie che non ho verificato).

## 1. Cosa fa oggi l'app (baseline `cae350d`)
- BMR: Mifflin-St Jeor (default), Harris-Benedict (con bonus a basso BF), "MET" (≈1 kcal/kg/h).
- NEAT: da orologio (modalità *active* = AEE − sessioni; *neat*; *total* = totale − BMR − sessioni), altrimenti media degli ultimi 7 giorni, altrimenti 350 kcal. Soglia minima 150 kcal per fidarsi dell'orologio.
- EAT: sessione per sessione, in ordine: kcal dispositivo → kcal/min apprese (carico intervals.icu) → km × kcal/km → FC (Keytel) → kcal/min apprese per intensità → MET netti (MET×moltiplicatore−1).
- TEF 10% di (BMR + NEAT + EAT). TDEE = somma; **fattore di calibrazione** (clamp) da assunzione reale e variazione del trend peso su 14 giorni (7000 kcal/kg).
- Macro per fase: proteine e grassi in g/kg del peso-trend, carboidrati a residuo; carb cycling opzionale.
- Micronutrienti/sodio/fibra e acqua tracciati; target idratazione minimo.

## 2. Problemi sospetti da verificare con test (non ancora riprodotti)
1. **Doppio conteggio NEAT/EAT**: in modalità *active* e *total*, sottrarre `watchView` (che preferisce kcal dispositivo → `raw.kcal`) è corretto solo se l'orologio e le sessioni usano la stessa definizione di kcal; con sessioni stimate da MET e orologio che conteggia lordo si può sottrarre troppo o troppo poco.
2. **TEF su EAT**: applicare il 10% anche all'EAT e poi (in `trainAdded`) di nuovo `(1+tef)` al target: coerente solo se non si somma due volte.
3. **MET netti vs lordi**: il codice sottrae 1 MET (corretto per non duplicare il BMR); ma le kcal "apprese" da dispositivo sono lorde: la miscela di sorgenti va resa omogenea.
4. **Calibrazione 7000 kcal/kg**: costante unica; il costo energetico reale del cambio di massa dipende dalla composizione (grasso ≈ 7.7 kcal/g, massa magra molto meno): va esposta come ipotesi.
5. **Proteine/grassi per kg di peso-trend** senza distinguere massa magra: per BF alto sovrastima.
6. **Idratazione/sodio**: mostrati ma non collegati a durata/intensità/clima dell'allenamento.

## 3. Proposta di revisione (in ordine di rischio crescente)
| # | Proposta | Alternative confrontate | Limiti |
|---|---|---|---|
| P1 | Rendere **trasparenti** i passaggi (vista opzionale in Settings): ogni termine con formula, input, valore | – | Nessun cambio numerico |
| P2 | Test di caratterizzazione per D2 prima di toccare qualunque formula | – | – |
| P3 | BMR: mantenere Mifflin come default; offrire Cunningham/Katch-McArdle solo con massa magra misurata e dichiarare l'incertezza della bioimpedenza; mostrare i valori affiancati senza dichiararne uno "migliore" | Mifflin, Harris-Benedict rivisto, Henry/Oxford, Cunningham | Le formule sono state derivate su popolazioni diverse da atleti ibridi; errori individuali tipici dell'ordine del 10% |
| P4 | NEAT: stima base da passi/attività con la calibrazione già esistente; separare definizione di AEE dell'orologio da EAT | Media mobile, passi×costo/passo, % del BMR | Il valore medio 7 gg reagisce lentamente |
| P5 | EAT: dichiarare la sorgente per sessione e usare un'unica base (lorda o netta) prima di sommare | MET (Compendium), FC, potenza, orologio | L'FC sovrastima a caldo/stress; il MET è medio di popolazione |
| P6 | Macro: proteine in g/kg (range da posizione ISSN/ACSM), carboidrati scalati sul carico del giorno (periodizzazione), grassi con minimo; considerare **disponibilità energetica** per segnalare deficit eccessivi con carichi elevati | Fisso g/kg vs % energia | Soglie da confermare con il libro; avvisi, non diagnosi |
| P7 | Idratazione/sodio durante sessioni lunghe: calcolo da durata/intensità/clima come *indicazione*, con incertezza e prudenza clinica (iponatriemia, ipertensione) | Linee guida ACSM, EFSA | Alta variabilità individuale (tasso di sudorazione): proporre test personale del sudore |
| P8 | Micronutrienti: riferimenti EFSA (DRV) con attenzione a ferro, vitamina D, calcio, sodio; niente numeri "ottimali" non supportati | EFSA, IOM | Dati OFF spesso incompleti: mostrare "dato mancante", non zero |

## 4. Fonti da consultare (da verificare prima di citare)
Mifflin et al. 1990; Harris-Benedict (revisione Roza & Shizgal 1984); Henry 2005; Cunningham 1980; Ainsworth et al., *Compendium of Physical Activities* 2011; Keytel et al. 2005; Levine (NEAT); ACSM/AND/DC *Nutrition and Athletic Performance* 2016; ISSN position stands su proteine (2017) e timing/carboidrati; Burke et al. 2011; Jeukendrup 2014 (carboidrati durante l'esercizio); Loucks et al. 2011 e consenso IOC sul RED-S 2018 (disponibilità energetica); ACSM 2007 (liquidi); EFSA Dietary Reference Values. **Il libro dell'utente ha priorità**: attendere l'allegato.

## 5. Criteri per approvare una modifica
Per ogni formula: fonte, ipotesi, popolazione, errore atteso, test deterministico, documentazione, interruttore di rollback e confronto prima/dopo sui dati sintetici. L'utente approva la proposta prima di qualsiasi cambio numerico.

## Carboidrati prima di una sessione (`preFuel`) — implementata il 25/10/2026 su richiesta, **formula da approvare**
**Fonte primaria:** Thomas DT, Erdman KA, Burke LM. Position of the Academy of Nutrition and Dietetics, Dietitians of Canada, and the American College of Sports Medicine: Nutrition and Athletic Performance. *Med Sci Sports Exerc* 2016;48(3):543-568 (anche *J Acad Nutr Diet* 2016;116(3):501-528, DOI 10.1016/j.jand.2015.12.006): prima di uno sforzo > 60 min, 1–4 g/kg di carboidrati 1–4 h prima, con tempi, quantità e alimenti adatti alla persona.
**Formula nel codice:** h = anticipo in ore limitato a 1–4; g/kg minimo = max(1, h − 1), massimo = min(4, h); grammi = g/kg × peso (arrotondati a 5 g); kcal = 4 × grammi. Sessione ≤ 60 min: nessuna quantità. I carboidrati dei pasti (pianificati o mangiati) tra 45 min e 4 h prima dell'inizio si sottraggono: se coprono il minimo si dice «covers it», altrimenti «add X–Y g».
**Cosa è scelta dell'app e non dalla fonte:** la progressione «circa 1 g/kg per ora di anticipo» dentro l'intervallo 1–4 g/kg (la fonte dà solo gli estremi); l'arrotondamento a 5 g; la finestra 45 min–4 h per contare i pasti. **Da verificare sul testo integrale:** «durante» resta 30–60 g/h per sessioni ≥ 75 min come già nell'app; i valori fino a 90 g/h oltre le 2,5 h **non** sono stati aggiunti perché non ho potuto leggerli sul testo (il sito del documento non era raggiungibile dalla sessione).
**Test numerico indipendente:** `tests/m11c.test.js` («pre-session fuel is calibrated»), calcolo a mano per 80 kg: 60 min → 80 g (320 kcal); 90 → 80–120 g; 120 → 80–160 g (320–640 kcal); 180 → 160–240 g; 240 → 240–320 g.
**Stato:** attivo; in attesa che l'utente approvi o corregga la formula (regola 3 di AGENTS.md).

