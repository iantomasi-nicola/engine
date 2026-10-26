# Proposte di formula per M7d / M7e — D10 (resto), D13, D14, D15, L16

**Stato: PROPOSTA, nessuna riga di `source/` è stata toccata.** Data: 26/10/2026. Ricerca fatta su PubMed (E-utilities `esearch`/`efetch`, abstract e, dove aperto, testo integrale PMC), più ricerca web per i testi non indicizzati. Regola 3 di `AGENTS.md`: nessun coefficiente entra nel codice prima dell'approvazione esplicita della singola formula, di una fonte primaria verificata e di un test numerico indipendente. Riferimenti interni: `docs/NUTRITION_SPEC.md`, `docs/NUTRITION_AUDIT.md` (F-01, F-07, F-09, F-10, F-11), `docs/NUTRITION_PROPOSAL.md` (`preFuel`, approvata il 25/10).

**Come leggere «verificata».** **Sì** = numero letto da me in questa sessione nel testo della fonte primaria (abstract PubMed o testo integrale), con il PMID indicato. **Parziale** = numero letto in una fonte secondaria peer-reviewed che cita la primaria, testo primario non raggiungibile (paywall, 403). **NON VERIFICATO** = non letto né nella primaria né in una secondaria affidabile: **non va proposto come coefficiente**.

## Indice
- [Tabella riassuntiva](#tabella-riassuntiva)
- [0. Cosa c'è già nel codice e incoerenze trovate](#0-cosa-ce-già-nel-codice-e-incoerenze-trovate)
- [1. D13 — Carboidrati periodizzati e fueling durante l'esercizio](#1-d13--carboidrati-periodizzati-e-fueling-durante-lesercizio)
- [2. D14 — Idratazione e sodio negli sforzi lunghi](#2-d14--idratazione-e-sodio-negli-sforzi-lunghi)
- [3. D15 — Disponibilità energetica (EA) / REDs come indicatore orientativo](#3-d15--disponibilità-energetica-ea--reds-come-indicatore-orientativo)
- [4. D10 (resto) — Cunningham, Ten Haaf FFM, De Lorenzo](#4-d10-resto--cunningham-ten-haaf-ffm-de-lorenzo)
- [5. L16 — Micronutrienti stimati con l'AI](#5-l16--micronutrienti-stimati-con-lai)
- [6. Interruttori, date di attivazione e registro `ALGO`](#6-interruttori-date-di-attivazione-e-registro-algo)
- [7. Cosa chiedo di approvare](#7-cosa-chiedo-di-approvare)
- [8. Bibliografia (PMID e DOI)](#8-bibliografia-pmid-e-doi)

## Tabella riassuntiva

| Voce | Fonte principale | Verificata | Rischio |
|---|---|---|---|
| D13 · fueling durante: <45 min niente; 45–75 min piccole quantità / risciacquo; 1–2,5 h 30–60 g/h; >2,5 h fino a 90 g/h | Burke 2011 (PMID 21660838), Jeukendrup 2014 (PMID 24791914), ACSM/AND/DC 2016 tramite Hartley 2022 (PMID 35239154) | **Sì** (30–60, ≤90, ~1 h piccole quantità nell'abstract di Burke); fasce 45–75 / 1–2,5 h **parziale** (secondaria) | Basso (solo indicazione) |
| D13 · 120 g/h mai default, solo testo | Morton 2026 (PMID 41759826) vs Plews 2026 (PMID 42258036) | **Sì** | Basso |
| D13 · g/kg/die per carico: 3–5 / 5–7 / 6–10 / 8–12 | ACSM/AND/DC 2016 (PMID 26891166) tramite tabella in PMID 31835538 | **Parziale** (secondaria PMC; primaria a pagamento) | Medio (cambia un target se reso attivo) |
| D13 · «fuel for the work required», train low | Impey 2018 (PMID 29453741), Podlogar 2022 (PMID 36173597) | **Sì** (concetto; nessun numero da implementare) | Basso |
| D14 · obiettivo: evitare perdita >2% del peso; tasso di sudore dal peso pre/post | ACSM 2007 (PMID 17277604) | **Sì** (abstract) | Basso |
| D14 · non bere più di quanto si suda (non aumentare di peso), bere secondo la sete | Hew-Butler 2015 (PMID 26102445 / 26227507) | **NON VERIFICATO** sul testo (abstract vuoto, testo a pagamento; solo comunicati stampa) | Medio (sicurezza: iponatriemia) |
| D14 · 0,4–0,8 L/h e sodio 20–30 mEq/L nelle bevande | ACSM 2007 testo integrale | **NON VERIFICATO** (oggi nel codice come 400–800 ml/h) | Medio |
| D14 · 300–600 mg/h di sodio (oggi nel calcolatore) | nessuna fonte trovata | **NON VERIFICATO** | Medio → togliere il numero fisso |
| D14 · sudore 0,5–2,0 L/h; Na⁺ sudore corpo intero ~10–70 mmol/L | Baker 2017 (PMID 28332116, testo PMC) | **Sì** | Basso (solo contesto) |
| D14 · endurance: 1,28 ± 0,57 L/h; 51,7 ± 27,8 mmol/h di Na⁺ | Barnes 2019 (PMID 31230518) | **Sì** (abstract) | Basso (solo contesto) |
| D15 · EA = (EI − EEE) / FFM, kcal/kg FFM/die | IOC REDs 2023 (PMID 37752011), Box 1 | **Sì** (testo integrale) | Medio |
| D15 · zone ≥45 / 30–45 / ≤30 kcal/kg FFM come guida, non diagnosi; maschi ~9–25 | IOC 2023 pp. 1078–1079; Loucks & Thuma 2003 (PMID 12519869) | **Sì** | **Alto** se mostrato come allarme → solo testo prudente |
| D15 · LEAF-Q (sens. 78%, spec. 90%), LEAM-Q (solo libido bassa discrimina) | Melin 2014 (PMID 24563388), Lundy 2022 (PMID 35565840) | **Sì** | Alto se usati come diagnosi → non implementare il punteggio |
| D10 · Ten Haaf peso e FFM (kJ) | Ten Haaf & Weijs 2014 (PMID 25275434, testo PMC) | **Sì** — chiude la riserva di F-01 | Basso (già nel codice) |
| D10 · Cunningham 1980: 500 + 22·LBM | PMID 7435418 | **Sì** | Medio (LBM stimata nei dati originali) |
| D10 · Cunningham 1991: 370 + 21,6·FFM (= «Katch-McArdle» nel codice) | PMID 1957828 | **Sì** | Basso |
| D10 · De Lorenzo 1999: −857 + 9,0·kg + 11,7·cm | PMID 10573663 | **Sì** | Medio (solo 51 uomini, ≥3 h/die) |
| D10 · O'Neill 2023: Ten Haaf 80,2% entro ±10% | PMID 37632665 | **Sì** (era «non confermato» in AUDIT §1) | — |
| L16 · valori di riferimento adulti EFSA (PRI/AI) | EFSA DRV Summary Report 2017 (doi 10.2903/sp.efsa.2017.e15121), EFSA 2015 Mg (PMID 42109801), EFSA 2019 Na (PMID 32626425) | **Sì** (tabelle 5, 7, 9, 11 del PDF) | Basso |
| L16 · UL: Ca 2500 mg; vit. D 100 µg; acido folico 1000 µg; ferro «safe level» 40 mg (non UL) | EFSA 2012 (PMID 42016128), 2023 (PMID 37560437), 2023 (PMID 37965303), 2024 (PMID 38868106) | **Sì** | Basso |
| L16 · UL magnesio 250 mg (solo integratori), vit. C/B12/K senza UL | SCF/EFSA | **NON VERIFICATO** | Basso (non implementare) |
| L16 · valori NIH (RDA USA) | NIH ODS | **NON VERIFICATO** (403 dal sandbox) | — |
| L16 · affidabilità delle stime AI per nutriente | Cao 2026 (PMID 42898137), O'Hara 2025 (PMID 40004936), Carrillo-Larco 2026 (PMID 42607839) | **Sì** (abstract) | Medio → etichetta «stimato», mai giudizi |

---

## 0. Cosa c'è già nel codice e incoerenze trovate

Lette in `source/engine.html` (nessuna modifica). Sono **difetti di coerenza** (regola Cleanup 3) da correggere dentro M7d/M7e dopo approvazione:

1. **Tre tabelle diverse per i carboidrati «durante»**:
   - `racePlan` (≈ riga 9611): `<60 min` niente, `≤150 min` 30–60 g/h, oltre 60–90 g/h;
   - calcolatore «Fuel for a long session» (≈ riga 14576): `<45` niente, `45–75` **0–30 g/h**, `75–150` 30–60, oltre 60–90;
   - `NUTRITION_PROPOSAL.md` (`preFuel`): «durante 30–60 g/h per sessioni ≥ 75 min».
   Le fonti (§1.2) danno 45–75 min «piccole quantità / risciacquo» **senza un numero**: lo «0–30 g/h» è una scelta dell'app, non dichiarata. Proposta: **una sola funzione pura** `fuelDuring()` usata dai tre punti.
2. **Calcolatore liquidi/sodio**: «400–800 ml» e «300–600 mg/h di sodio» sono citati a «Jeukendrup 2014; Thomas 2016», ma **in quegli abstract non ci sono**; «60–80% del sudore» (calcolatore Sweat rate) non ha fonte trovata. Tutti e tre **NON VERIFICATI** (§2).
3. **`nutTargets`** (≈ riga 10969) dice «LARN 2014 / EFSA» ma mescola fonti: ferro 18/10 mg, vit. C 85/105 mg, folato 400 µg sono valori LARN/USA, omega-3 1,6/1,1 g è l'AI USA dell'ALA; i valori EFSA verificati sono diversi (§5.2). LARN 2014 **non verificato** qui.
4. **«Katch-McArdle» = Cunningham 1991**: la vista affiancata usa `370 + 21,6 × massa magra`, che è l'equazione di Cunningham 1991 (PMID 1957828). Rinominare con la fonte PubMed (resta «Katch-McArdle» come alias).
5. **Commenti superati**: in `tenHaafWeight` il commento «coefficients … not checked against the paper's text» non è più vero (§4.1). In `NUTRITION_AUDIT.md` §1 il «80,2% non confermato» di O'Neill 2023 ora è verificato.

---

## 1. D13 — Carboidrati periodizzati e fueling durante l'esercizio

### 1.1 Fonti e numeri esatti
- **Burke LM, Hawley JA, Wong SH, Jeukendrup AE. Carbohydrates for training and competition. *J Sports Sci* 2011;29 Suppl 1:S17-27. PMID 21660838, doi 10.1080/02640414.2011.585473.** Abstract (verificato): negli sport ad alta intensità di ~1 h «small amounts of carbohydrate, including even mouth-rinsing, enhance performance»; «30-60 g·h⁻¹ is an appropriate target for sports of longer duration, events >2.5 h may benefit from higher intakes of up to 90 g·h⁻¹»; miscele di più carboidrati per assorbire a quei ritmi; l'effetto del «train low» sulla prestazione «is unclear». Limiti: rassegna narrativa (consenso IOC 2010), nessun g/kg/die nell'abstract.
- **Jeukendrup A. A step towards personalized sports nutrition: carbohydrate intake during exercise. *Sports Med* 2014;44 Suppl 1:S25-33. PMID 24791914, doi 10.1007/s40279-014-0148-z, PMC4008807.** Testo (verificato): ~1 h risciacquo o piccole quantità; ~60 g/h (singola fonte) per 2–3 h; ~90 g/h per l'ultra-endurance, solo con carboidrati a trasporto multiplo; «recommendations may need to be adjusted downward when the absolute exercise intensity is low»; «Carbohydrate intake advice is independent of body weight» (quindi **g/h, non g/kg/h**); Fig. 1 «for well trained athletes. Aspiring athletes may need to adjust these recommendations downwards». La Fig. 1 è un'immagine: le sue fasce orarie esatte **non le ho lette**. Limite: l'autore era dipendente del Gatorade Sports Science Institute (PepsiCo) e il supplemento era finanziato dal GSSI (dichiarato nell'articolo); raccomandazioni basate soprattutto su atleti allenati.
- **Thomas DT, Erdman KA, Burke LM. ACSM Joint Position Statement. Nutrition and Athletic Performance. *Med Sci Sports Exerc* 2016;48(3):543-68. PMID 26891166, doi 10.1249/MSS.0000000000000852** (anche *J Acad Nutr Diet* 116:501-528, PMID 26920240). Abstract senza numeri; testo integrale non raggiungibile (402/403). Numeri letti in **secondarie peer-reviewed PMC**:
  - Hartley C et al. *Sports Med* 2022;52:1833-62, PMID 35239154 (PMC9325805): l'ACSM distingue «brief exercise (< 45 min), sustained high-intensity exercise (i.e. 45–75 min) and endurance exercise (1–2.5 h)… small amounts of carbohydrates be ingested (including mouth rinsing)… during endurance exercise… 30–60 g … per hour»; 5–7 g/kg/die per ~1 h/die.
  - Tabella 2 di PMID 31835538 (*Nutrients* 2019;11:3017, PMC6950062), «adapted from Burke, Jeukendrup and the … ACSM guidelines»: leggero 3–5 g/kg/die; moderato (~1 h/die) 5–7; alto (1–3 h moderata-alta) 6–10; molto alto (>4–5 h) 8–12; estremo >12.
  - Morton 2026 (sotto) conferma che l'ACSM 2016 raccomanda «≤90 g/h … targeted to exercise that is >2.5–3 h».
- **Morton JP et al. From Metabolism to Medals… *J Nutr* 2026;156(5):101442. PMID 41759826, doi 10.1016/j.tjnut.2026.101442.** Abstract (verificato): 120–200 g/h «not yet substantiated»; il limite superiore «could increase from 90 to 120 g/h (at least for trained participants)».
- **Plews DJ et al. Fuelled or Fooled? *Sports Med* 2026;56(10):2367-88. PMID 42258036, doi 10.1007/s40279-026-02462-z.** Abstract/testo (verificato): letteratura «limited»; Podlogar: efficienza di ossidazione ~86% a 90 g/h → ~76% a 120 g/h; Smith et al.: beneficio previsto fino a ~78 g/h, relazione «flat between ~30 and 90 g·h⁻¹».
- **Impey SG et al. Fuel for the Work Required. *Sports Med* 2018;48(5):1031-48. PMID 29453741, doi 10.1007/s40279-018-0867-7.** Abstract (verificato): train low in ~30–50% delle sedute; adattamenti molecolari sì, prestazione migliorata solo nel 37% di 11 studi (63% nessun cambiamento). Nessun numero da implementare.
- **Podlogar T, Wallis GA. New Horizons… *Sports Med* 2022;52(Suppl 1):5-23. PMID 36173597, doi 10.1007/s40279-022-01757-1.** Abstract (verificato): il train low ha «limited utility for enhancing performance»; periodizzare sui requisiti della seduta; serve personalizzazione.

### 1.2 Formula proposta (implementabile)
**(a) Durante la seduta — `fuelDuring(min, int)`**, `min` = durata prevista, `int` ∈ {Easy, Moderate, Hard}:
```
min < 45                → { need: false, lo: 0, hi: 0, note: "non necessario" }
45 ≤ min < 75           → { need: "small", lo: null, hi: null, note: "piccole quantità o risciacquo (sedute intense)" }   // nessun numero: la fonte non lo dà
75 ≤ min ≤ 150          → { lo: 30, hi: 60 }
min > 150               → { lo: 30, hi: 90, upTo90: true }   // 60–90 solo con glucosio+fruttosio e intestino allenato
int === "Easy"          → hi = lo (si mostra il limite basso; Jeukendrup: ridurre a bassa intensità assoluta)
MAI hi > 90.  Il testo su 120 g/h compare solo come nota informativa, mai come valore.
grammi totali = [lo × min/60, hi × min/60], arrotondati a 5 g
```
Scelte dell'app (dichiarate, non dalla fonte): soglia 75 min tra «piccole quantità» e «30–60» (le fasce della fonte 45–75 e 1–2,5 h si sovrappongono tra 60 e 75); `lo` 30 anche oltre 2,5 h (Burke: «may benefit from higher intakes up to 90», non «almeno 60»); riduzione per «Easy».

**(b) Giornaliero per carico — `carbDayRange(minDay, hardMin)`** (g/kg/die × peso-trend):
```
minDay = minuti di allenamento del giorno (pianificati o fatti), hardMin = minuti a intensità moderata/alta
minDay ≥ 240                         → [8, 12]
minDay ≥ 90 e hardMin ≥ 60           → [6, 10]
minDay ≥ 60                          → [5, 7]     // ≈1 h/die, oppure sedute lunghe ma tutte facili
altrimenti (riposo, <60 min, abilità) → [3, 5]
(valutate in quest'ordine: la prima che vale)
g = [lo × kg, hi × kg]
```
Le soglie in minuti (60/90/240) sono una **traduzione dell'app** delle descrizioni «~1 h», «1–3 h», «>4–5 h»: da approvare come scelta progettuale. Il range **non sostituisce** il target: in D13a è solo mostrato accanto al target attuale con un avviso se il target esce dal range (stessa logica degli avvisi F-07, mai una correzione).

**(c) «Fuel for the work required»**: per ogni seduta la pillola mostra «seduta chiave → carboidrati alti prima e durante» o «seduta facile → nessuna esigenza in più». Nessun «train low» automatico, nessun suggerimento di digiuno.

### 1.3 Esempi calcolati a mano
| Profilo | Giorno | Range g/kg | Grammi/die | Durante |
|---|---|---|---|---|
| A · uomo 70 kg | 1 h corsa moderata | 5–7 | 350–490 g | 60 min: nessuna quantità («piccole quantità o risciacquo» solo se intensa) |
| A · uomo 70 kg | lungo 3 h (180 min) | 6–10 | 420–700 g | 30–90 g/h → 90–270 g; la parte 60–90 g/h solo con miscela provata in allenamento |
| B · uomo 85 kg | 2 h (calisthenics 60 + corsa intensa 60) | 6–10 | 510–850 g | corsa 60 min: piccole quantità; nessuna seduta >75 min |
| B · uomo 85 kg | 90 min corsa moderata | 6–10 | 510–850 g | 30–60 g/h → 45–90 g |
| C · donna 58 kg | riposo/mobilità | 3–5 | 174–290 g | — |
| C · donna 58 kg | 2 h 30 (150 min) tutta facile | 5–7 | 290–406 g | Easy: 30 g/h → 75 g |

Verifica: 70×5 = 350, 70×7 = 490, 70×6 = 420, 70×10 = 700; 85×6 = 510, 85×10 = 850, 58×3 = 174, 58×5 = 290, 58×7 = 406; 30×1,5 = 45, 60×1,5 = 90; 30×3 = 90, 90×3 = 270; 30×2,5 = 75.

### 1.4 UI (testo prudente)
- Card Fuel, riga sotto «Carbs»: pillola «Range for today's training 5–7 g/kg (350–490 g)» e, se fuori, la nota «Your target is below the usual range for this training. A general guide, not a prescription.» Nessun numero ripetuto se il target è già nel range.
- Pillola della seduta: «During: 30–60 g/h» / «Small amounts or a mouth rinse» / «Not needed». Per >150 min: «Up to 90 g/h with a glucose + fructose mix you have practised. Higher rates (up to 120 g/h) are being studied in trained athletes; not a default.»
- Race plan e calcolatore usano la stessa funzione (stesso testo).

### 1.5 Rollback, attivazione, test
- **Interruttori:** `energy.carbRange` `on|off` (D13a, solo vista) — nessuna data necessaria perché non cambia la serie energetica; `energy.carbFromLoad` `off|on` (D13b, opzionale: il target carbo di **simple mode** prende il punto medio del range; default `off`) con `energy.carbLoadFrom` = costante `ALGO_M7D_START`.
- **Test indipendente** (`tests/m7d-carbs.test.js`): tabella dei valori sopra scritta a mano (non calcolata con la funzione); confini 44/45/74/75/150/151 min; `hi` mai > 90 per ogni durata 0–600 min (property test); «Easy» → `hi === lo`; i tre punti d'uso (`racePlan`, calcolatore, pillola) restituiscono lo stesso intervallo per la stessa durata; nessun numero a 45–74 min.

---

## 2. D14 — Idratazione e sodio negli sforzi lunghi

### 2.1 Fonti e numeri esatti
- **Sawka MN et al. ACSM position stand. Exercise and fluid replacement. *Med Sci Sports Exerc* 2007;39(2):377-90. PMID 17277604, doi 10.1249/mss.0b013e31802ca597.** Abstract (verificato): obiettivo del bere durante l'esercizio «to prevent excessive (>2% body weight loss from water deficit) dehydration and excessive changes in electrolyte balance»; «considerable variability in sweating rates and sweat electrolyte content… customized fluid replacement programs are recommended»; «Individual sweat rates can be estimated by measuring body weight before and after exercise». **Testo integrale non raggiungibile**: 0,4–0,8 L/h e 20–30 mEq/L di sodio **NON VERIFICATI**.
- **Hew-Butler T et al. Statement of the Third International Exercise-Associated Hyponatremia Consensus Development Conference, Carlsbad 2015. *Clin J Sport Med* 2015;25(4):303-20. PMID 26102445, doi 10.1097/JSM.0000000000000221** (anche *Br J Sports Med* 2015;49(22):1432-46, PMID 26227507). Abstract vuoto su PubMed, testo a pagamento. «Bere secondo la sete» e «evitare di aumentare di peso durante lo sforzo» li trovo solo in comunicati stampa e in articoli che citano il consenso (es. PMID 28512433): **NON VERIFICATO sul testo**. Lo uso solo come **limite di sicurezza qualitativo**, non come coefficiente.
- **Baker LB. Sweating Rate and Sweat Sodium Concentration in Athletes. *Sports Med* 2017;47(Suppl 1):111-28. PMID 28332116, doi 10.1007/s40279-017-0691-5, PMC5371639.** Testo (verificato): metodo più semplice e accurato = variazione di massa corporea, con confondenti (perdite non da sudore, sudore nei vestiti); sudore corpo intero «typically ranges from approximately 0.5 to approximately 2.0 L/h», >3 L/h raro (~2%); Na⁺ locale ~10–90 mmol/L, corpo intero ~10–70 mmol/L. Limite: dati in gran parte GSSI (industria).
- **Barnes KA et al. Normative data for sweating rate, sweat sodium… *J Sports Sci* 2019;37(20):2356-66. PMID 31230518, doi 10.1080/02640414.2019.1633159.** Abstract (verificato), 1303 atleti: endurance 1,28 ± 0,57 L/h; perdita di Na⁺ 51,7 ± 27,8 mmol/h (= 1189 ± 639 mg/h, con 22,99 mg/mmol). Limite: cerotto locale normalizzato, dati GSSI.
- **McDermott BP et al. NATA Position Statement: Fluid Replacement for the Physically Active. *J Athl Train* 2017;52(9):877-95. PMID 28985128, doi 10.4085/1062-6050-52.9.02.** Abstract (verificato): rischi sia dell'ipoidratazione sia dell'iperidratazione e dell'iponatriemia; quantificare il tasso di sudore. Numeri del testo **non letti** (download non consentito dall'editore).

### 2.2 Formula proposta (solo con un test del sudore dell'utente)
Il calcolo parte **solo** da un test registrato (calcolatore «Sweat rate», già presente). Senza test: nessun numero, solo il testo.
```
SR (L/h) = (peso_prima − peso_dopo + bevuto_L) / ore          // ACSM 2007, Baker 2017; ipotesi: 1 kg ≈ 1 L
per una seduta di T ore e peso kg:
  minimo_L_h = max(0, SR·T − 0,02·kg) / T     // per restare entro il 2% di perdita (ACSM 2007, verificato)
  massimo_L_h = SR                            // non bere più di quanto si suda (EAH 2015, NON VERIFICATO sul testo: limite qualitativo)
sodio: nessun obiettivo. Se l'utente inserisce una [Na⁺] misurata (mmol/L): perdita_mg_h = SR × [Na⁺] × 22,99, mostrata come «perdita stimata», non come quantità da assumere.
```
Il «60–80% del sudore» attuale e i «300–600 mg/h» si tolgono come numeri (non hanno fonte) e restano come testo («drink to thirst», «sodium: test your sweat»). Non si elimina la funzione, si sostituisce un numero non verificato.

### 2.3 Esempi calcolati a mano
| Profilo | SR misurato | Seduta | Perdita se non beve | 2% del peso | Da bere (min–max) | Perdita Na⁺ (contesto, 10–70 mmol/L) |
|---|---|---|---|---|---|---|
| A · 70 kg | 1,0 L/h | 3 h | 3,0 L | 1,40 kg | (3,0 − 1,4)/3 = **0,53–1,0 L/h** | 1,0×10×22,99 = 230 – 1,0×70×22,99 = 1609 mg/h |
| B · 85 kg | 1,5 L/h | 2 h | 3,0 L | 1,70 kg | (3,0 − 1,7)/2 = **0,65–1,5 L/h** | 345–2414 mg/h |
| C · 58 kg | 0,6 L/h | 2,5 h | 1,5 L | 1,16 kg | (1,5 − 1,16)/2,5 = **0,14–0,6 L/h** | 138–966 mg/h |

La forbice del sodio (×7) mostra perché non si propone un numero fisso.

### 2.4 UI (testo prudente)
«From your sweat test (1.0 L/h, similar weather): about 0.5–1.0 L per hour keeps the loss under 2% of body weight. Don't drink more than you sweat: gaining weight during exercise is a warning sign. Drink to thirst. Sodium needs differ a lot between people; this is not advice for your health conditions.» Avviso fisso se il test è stato fatto con clima diverso. Nessun integratore suggerito (SPEC §7 Safety).

### 2.5 Rollback, attivazione, test
- `energy.hydraFromTest` `on|off` (solo vista, nessuna data). Il calcolatore resta.
- **Test** (`tests/m7e-hydra.test.js`): i tre profili sopra a mano; `minimo ≤ massimo` sempre; `minimo = 0` quando SR·T ≤ 2% del peso; nessun numero di sodio senza [Na⁺] inserita; nessun output senza test del sudore; il testo non contiene «mg/h» come obiettivo.

---

## 3. D15 — Disponibilità energetica (EA) / REDs come indicatore orientativo

### 3.1 Fonti e numeri esatti
- **Mountjoy M et al. 2023 IOC consensus statement on REDs. *Br J Sports Med* 2023;57(17):1073-97. PMID 37752011, doi 10.1136/bjsports-2023-106994.** Testo integrale letto (copia PDF dell'articolo):
  - Box 1: `EA = (EI − EEE) / FFM`, in kcal/kg FFM/die; LEA su un continuum da **adattabile** (benigno, reversibile) a **problematica** (prolungata e/o severa).
  - pp. 1078–1079: zone da studi su donne **sedentarie** (≥45 crescita; ~45 mantenimento; 30–45 calo di peso; ≤30 problemi di salute); «Although this concept was intended as a guide, rather than a diagnostic end-point… there are risks in setting a definitive clinical threshold of EA due to many moderating factors»; misura dell'EA in vita libera molto onerosa.
  - sezione sugli atleti maschi (stesso articolo): la soglia universale di 30 nelle donne «is debated»; nei maschi «appears to be lower (eg, ~9 to 25 kcal/kg FFM/day)».
  - Il modello aggiornato usa termini qualitativi «as an alternative to the previous focus on quantitative assessments with universally applied thresholds».
- **Stellingwerff T et al. IOC REDs CAT2. *Br J Sports Med* 2023;57(17):1109-18. PMID 37752002.** Abstract (verificato): «there is no singular validated diagnostic test»; diagnosi finale **del medico**.
- **Loucks AB, Thuma JR. LH pulsatility is disrupted at a threshold of energy availability… *J Clin Endocrinol Metab* 2003;88(1):297-311. PMID 12519869, doi 10.1210/jc.2002-020369.** Abstract (verificato): 29 donne **sedentarie**, 5 giorni, EA 45 vs 10/20/30 kcal/kg LBM/die; LH inalterato a 30, alterato sotto. Limite: breve, laboratorio, non atleti, non uomini.
- **Burke LM et al. Pitfalls of… Estimates of Energy Availability in Free-Living Athletes. *IJSNEM* 2018;28(4):350-63. PMID 30029584, doi 10.1123/ijsnem.2018-0142.** Abstract (verificato): «healthy» ~45; nessun protocollo universale per calcolare l'EA, errori residui in ogni componente.
- **Logue DM et al. LEA in Athletes 2020. *Nutrients* 2020;12(3):835. PMID 32245088, PMC7146210.** Testo (verificato): limiti dell'applicazione di <30 negli studi trasversali; i dati autoriferiti non trovano soglie chiare.
- **Melin A et al. LEAF-Q. *Br J Sports Med* 2014;48(7):540-5. PMID 24563388.** Abstract: 84 atlete 18–39 anni, sensibilità 78%, specificità 90%. **Lundy B et al. LEAM-Q. *Nutrients* 2022;14(9):1873. PMID 35565840.** Abstract: solo la libido bassa distingue casi e controlli.
- **O'Neill 2023 (PMID 37632665)**: «Caution is warranted when interpreting RMR ratio… as a proxy of energy availability from a single measurement».

### 3.2 Formula proposta (indicatore, mai diagnosi)
```
FFM = peso_trend × (1 − BF/100)      // solo con BF registrato negli ultimi 30 giorni; altrimenti nessun valore
EEE = somma dell'EAT netto delle sessioni FATTE del giorno (lo stesso numero del Check-in; si dichiara «netto»)
EA_giorno = (EI − EEE) / FFM          // EI = introito registrato, solo giorni con introito digitato
EA_7 = media degli EA_giorno degli ultimi 7 giorni, mostrata solo se ≥ 5 giorni hanno introito digitato e copertura (F-09) adeguata
fascia testuale (dalle zone IOC pp. 1078–1079, solo come guida): ≥45 «in line with maintenance»; 30–45 «reduced (common when losing weight)»; <30 «low»
```
Scelte dell'app: EEE **netto** (l'IOC non definisce lordo/netto; Burke 2018: protocollo non universale) — da approvare; media a 7 giorni; nessuna fascia diversa per sesso (l'IOC dice che negli uomini la soglia è più bassa e incerta: si mostra il testo, non un numero diverso).

### 3.3 Esempi calcolati a mano
| Profilo | BF | FFM | EI | EEE netto | EA | Testo |
|---|---|---|---|---|---|---|
| A · uomo 70 kg | 12% | 70×0,88 = 61,6 kg | 2900 | 600 | 2300/61,6 = **37,3** | reduced |
| B · uomo 85 kg | 15% | 85×0,85 = 72,25 kg | 3600 | 300 | 3300/72,25 = **45,7** | in line with maintenance |
| C · donna 58 kg | 22% | 58×0,78 = 45,24 kg | 1800 | 600 | 1200/45,24 = **26,5** | low |

### 3.4 UI (testo prudente)
- Posto: Settings › How it is calculated e una riga ripiegabile (chiusa) nel Check-in, **non** una card in evidenza, nessun colore rosso, nessuna notifica.
- Testo per la fascia «low» (sempre insieme): «Energy left after training was low this week (about 27 kcal per kg of lean mass). This is an estimate from what you logged, not a diagnosis; one week means little and the threshold differs a lot between people. If it stays low for weeks, or you notice tiredness, frequent injuries, changes in your period or low libido, talk to a sports doctor or dietitian.»
- Mai: «REDs», «disturbo», «carenza», punteggi LEAF-Q/LEAM-Q (sono strumenti di screening da usare con un professionista).

### 3.5 Rollback, attivazione, test
- `energy.eaShow` `off|on` (default **off**, scelta dell'utente); nessuna data perché non cambia target né serie.
- **Test** (`tests/m7e-ea.test.js`): i tre profili a mano; nessun valore senza BF o con <5 giorni di introito; giorno con sola introito stimato escluso; sessione pianificata non fatta non entra nell'EEE; stessa sessione con due fonti contata una volta (D7); il testo non contiene parole diagnostiche (lista vietata).

---

## 4. D10 (resto) — Cunningham, Ten Haaf FFM, De Lorenzo

### 4.1 Fonti e numeri esatti
- **ten Haaf T, Weijs PJ. Resting energy expenditure prediction in recreational athletes of 18-35 years… *PLoS One* 2014;9(10):e108460. PMID 25275434, doi 10.1371/journal.pone.0108460, PMC4183531.** Abstract (verificato): 90 atleti (53 M, 37 F), 9,1 ± 5,0 h/settimana, calorimetria indiretta, FFM con pletismografia ad aria (BodPod).
  - `REE(kJ/d) = 49,940·kg + 2459,053·altezza(m) − 34,014·età + 799,257·sesso(M=1) + 122,502`
  - `REE(kJ/d) = 95,272·FFM(kg) + 2026,161`
  - Divise per 4,184 danno esattamente i coefficienti della SPEC (11,936; 587,728; 8,129; 191,027; 29,279 e 22,771; 484,264), confermati anche dalla tabella 1 di PMID 40407480 (PMC12101231). **La riserva di F-01 è chiusa.**
  - Testo: accuratezza ±10% Cunningham M 84,9% / F 78,4%; peso M 83,0% / F 75,7%; FFM M 83,0% / F 72,3%; De Lorenzo M 77,4% / F 59,5% (bias opposto per sesso); Mifflin, HB, WHO, Schofield, Owen <50%. Limite: **studio di sviluppo, non di validazione** («the bias for the new equations approached zero» perché non è una cross-validazione); olandesi 18–35 anni.
- **Cunningham JJ. A reanalysis of the factors influencing basal metabolic rate in normal adults. *Am J Clin Nutr* 1980;33(11):2372-4. PMID 7435418, doi 10.1093/ajcn/33.11.2372.** Abstract: 223 soggetti dei dati Harris-Benedict 1919, `BMR(kcal/d) = 500 + 22·LBM`. Limite: LBM **stimata**, non misurata; 16 atleti esclusi (Ten Haaf, testo).
- **Cunningham JJ. Body composition as a determinant of energy expenditure… *Am J Clin Nutr* 1991;54(6):963-9. PMID 1957828, doi 10.1093/ajcn/54.6.963.** Abstract: `REE = 370 + 21,6·FFM`, spiega il 65–90% della varianza (è l'equazione chiamata «Katch-McArdle» nel codice).
- **De Lorenzo A et al. A new predictive equation to calculate resting metabolic rate in athletes. *J Sports Med Phys Fitness* 1999;39(3):213-9. PMID 10573663** (DOI non indicizzato). Abstract: 51 **uomini** (pallanuoto, judo, karate) ≥3 h/die; `RMR(kcal/d) = −857 + 9,0·kg + 11,7·cm`, R² 0,78, SEE 91 kcal/d; «For an individual… indirect calorimetry is recommended».
- **Mifflin MD et al. *Am J Clin Nutr* 1990;51(2):241-7. PMID 2305711, doi 10.1093/ajcn/51.2.241.** Abstract: 498 soggetti 19–78 anni (234 obesi), R² 0,71; anche `REE = 19,7·FFM + 413` (R² 0,64); HB 1919 sovrastima del 5%. In Ten Haaf, Mifflin (anche FFM) <50% accurato negli atleti (BMI medio dei soggetti di Mifflin ~27).
- **O'Neill JER et al. *Sports Med* 2023;53(12):2373-98. PMID 37632665, doi 10.1007/s40279-023-01896-z.** Abstract (verificato): Ten Haaf la più precisa, **80,2%** entro ±10% (altre 40,7–63,7%), I² 0% solo per Ten Haaf; Cunningham 1980, HB 1918, Cunningham 1991, De Lorenzo, Ten Haaf senza differenza media significativa; Mifflin significativamente diversa. «no single equation is guaranteed to be superior».
- **Martinho DV et al. *Biol Sport* 2023;40(3):787-804. PMID 37398968.** De Lorenzo e Ten Haaf accordo accettabile, validazioni indipendenti poche.

### 4.2 Formule proposte
| Nome in Settings | Formula (kcal/die) | Requisiti | Note |
|---|---|---|---|
| Ten Haaf (lean mass) — già presente | `(95,272·FFM + 2026,161)/4,184` | BF registrato | Oggi ricade su «peso» senza BF (ok). Proposta: usarla solo con BF misurato negli ultimi 30 giorni |
| Cunningham 1980 — nuova | `500 + 22·FFM` | BF registrato | Etichetta «LBM was estimated in the original data» |
| Cunningham 1991 (Katch-McArdle) — oggi solo nella vista affiancata | `370 + 21,6·FFM` | BF | Selezionabile solo se approvata |
| De Lorenzo — nuova, solo vista affiancata | `−857 + 9,0·kg + 11,7·cm` | — | «Derived on 51 male athletes training ≥3 h/day»; per le donne il valore si mostra barrato/assente (non derivata su donne) |

`FFM = peso_trend × (1 − BF/100)`. «Massa magra misurata» = BF con una data e una fonte (bilancia BIA, DXA, plicometria): il campo fonte non esiste ancora; proposta minima: BF entro 30 giorni, altrimenti la formula FFM non si usa e si torna alla versione a peso (come oggi). La BIA ha errori propri: lo si dice nella nota, non si corregge.

### 4.3 Esempi calcolati a mano (A uomo 70 kg 178 cm 30 a BF 12%; B uomo 85 kg 185 cm 30 a BF 15%; C donna 58 kg 165 cm 28 a BF 22%)
| | A (FFM 61,6) | B (FFM 72,25) | C (FFM 45,24) |
|---|---|---|---|
| Mifflin | 700 + 1112,5 − 150 + 5 = **1667,5** | 850 + 1156,25 − 150 + 5 = **1861,3** | 580 + 1031,25 − 140 − 161 = **1310,3** |
| Ten Haaf peso | 29,279 + 835,52 + 1046,156 − 243,87 + 191,027 = **1858,1** | **2078,3** | **1463,7** |
| Ten Haaf FFM | 484,264 + 22,771×61,6 = **1886,9** | **2129,5** | **1514,4** |
| Cunningham 1980 | 500 + 22×61,6 = **1855,2** | **2089,5** | **1495,3** |
| Cunningham 1991 | 370 + 21,6×61,6 = **1700,6** | **1930,6** | **1347,2** |
| De Lorenzo | −857 + 630 + 2082,6 = **1855,6** | **2072,5** | (1595,5 — non mostrato: solo uomini) |

Ricontrollati con un secondo calcolo (script nella cartella temporanea della sessione, non nella repo): Ten Haaf in kJ ÷ 4,184 coincide con la forma in kcal entro 0,1 kcal.

### 4.4 UI, rollback, attivazione, test
- Vista affiancata già esistente: aggiungere le righe con il requisito («needs body fat %», «male athletes only»), la fonte breve e lo spread; il default non cambia (Auto/Mifflin come oggi).
- **Interruttore/attivazione:** scegliere Cunningham 1980 cambia la serie BMR → nuova voce `ALGO` `{ k: "bmrffm", from: "bmrFfmFrom" }` con `bmrFfmFrom = ALGO_M7D_START` per i profili vecchi (i giorni prima restano con la formula precedente, come `bmrAutoFrom`). Rollback: rimettere `energy.bmr` al valore precedente.
- **Test** (`tests/m7d-bmr.test.js`): la tabella sopra (valori scritti a mano); Ten Haaf FFM per due strade (kJ/4,184 e coefficienti kcal) con differenza < 0,2 kcal; senza BF le formule FFM non vengono scelte; De Lorenzo assente per «Female»; altezza in metri solo per Ten Haaf (un test negativo con cm deve dare un valore assurdo > 100 000).

---

## 5. L16 — Micronutrienti stimati con l'AI

### 5.1 Quali micronutrienti
Gli stessi già presenti in `MICRO_KEYS` (nessun campo nuovo): potassio, calcio, ferro, magnesio, vitamina C, vitamina D, B12, folato, omega-3. Sodio/sale e fibra restano fuori dall'AI: in UE sono quasi sempre in etichetta (F-09 già li gestisce).

### 5.2 Valori di riferimento adulti (EFSA, verificati sul *DRV Summary Report* 2017, tabelle 5, 7, 9, 11 e 2)
| Nutriente | Uomo | Donna | Tipo | UL / limite | Oggi in `nutTargets` |
|---|---|---|---|---|---|
| Potassio | 3500 mg | 3500 mg | AI | — (non verificato) | 3500 ✔ |
| Calcio | 1000 mg (18–24 a) / 950 mg (≥25) | uguale | PRI | **2500 mg** (EFSA 2012, PMID 42016128) | 1000 |
| Ferro | 11 mg | 16 mg pre-menopausa / 11 post | PRI | nessun UL; **«safe level» 40 mg** (EFSA 2024, PMID 38868106) | 10 / 18 |
| Magnesio | 350 mg | 300 mg | AI (EFSA 2015, PMID 42109801) | 250 mg da integratori: NON VERIFICATO | 350 / 300 ✔ |
| Vitamina C | 110 mg | 95 mg | PRI | — (non verificato) | 105 / 85 |
| Vitamina D | 15 µg | 15 µg | AI (con sintesi cutanea minima) | **100 µg** (EFSA 2023, PMID 37560437) | 15 ✔ |
| B12 | 4,0 µg | 4,0 µg | AI | — | 4 ✔ |
| Folato | 330 µg DFE | 330 µg DFE | PRI | **1000 µg solo acido folico/integratori** (EFSA 2023, PMID 37965303) | 400 |
| Omega-3 | ALA 0,5 E%; EPA+DHA 250 mg | uguale | AI | — | 1,6 / 1,1 g (valore USA dell'ALA) |
| Sodio (per completezza) | 2,0 g | 2,0 g | «safe and adequate» (EFSA 2019, PMID 32626425) | — | sale 5 g ✔ |

NIH (RDA USA): **NON VERIFICATO** (sito 403 dal sandbox); se l'utente li vuole come alternativa, da verificare prima.
Proposta: una tabella unica `DRV_EFSA` con la fonte per riga; per il ferro femminile serve sapere pre/post-menopausa (nuovo campo, oppure 16 mg con la nota). UL usati **solo** per Ca e vit. D (cibi + integratori registrati); per il folato l'UL vale solo per acido folico, che l'app non distingue → nessun avviso; per il ferro «safe level», non UL → testo informativo.

### 5.3 Affidabilità delle stime AI (verificato sugli abstract)
- **Cao Y et al. *Front Nutr* 2026;13:1952757. PMID 42898137, doi 10.3389/fnut.2026.1952757.** 9 LLM, 299 alimenti × 3 ripetizioni contro la tabella cinese: accordo eccellente per energia, grassi, carboidrati, sodio, **vitamina C**; meno consistente per **vitamina A, zinco, ferro, potassio**; stabilità più bassa per la vitamina A; «Even when aggregate agreement was high, individual food estimates sometimes showed substantial error».
- **O'Hara C et al. *Nutrients* 2025;17(4):607. PMID 40004936.** Da foto: differenza >10% per 13 nutrienti su 16, sottostima di 11.
- **Carrillo-Larco RM et al. *J Nutr* 2026;156(10):101786. PMID 42607839.** Pasti peruviani: accordo ferro 15%, vit. A 19%, zinco 31%; «fall short of the precision required… consumer-facing applications».
- **Yan R et al. *Commun Med* 2025;5:458. PMID 41193610.** Agganciare il modello a una banca dati (RAG) riduce l'errore: argomento per preferire sempre una tabella (CREA/USDA) all'AI.
Nessuna fonte dà un «±x%» per nutriente applicabile a un singolo alimento: **non si propone un intervallo numerico** attorno alla stima.

### 5.4 Proposta (nessuna formula nutrizionale, solo provenienza)
1. Ordine delle fonti per ogni micronutriente di un alimento: etichetta/utente > valori tipici integrati (CREA/USDA, già presenti) > **stima AI** (solo se l'utente la chiede o la attiva) > sconosciuto (`null`, F-09). L'AI non sovrascrive mai un valore noto.
2. Prompt: valori per 100 g, `null` se non sa, nessun valore per alimenti fortificati/integratori senza etichetta; si usano i servizi AI di Settings nell'ordine scelto (regola 8b).
3. Salvataggio: `mx.src[k] = "ai"` per ogni valore stimato (campo opzionale, compatibile con i dati esistenti).
4. Totali: le stime AI contano nel totale ma la copertura si divide in «with data: x% · of which AI estimates: y%»; se y > 50% la cifra del giorno è «≈», nessun consiglio né giudizio («low iron») si basa su un totale con >50% di stime AI.
5. Livelli di fiducia **solo qualitativi** e citati: vit. C «AI estimates were close in studies»; ferro, potassio «less reliable in studies»; vit. D, B12, folato, magnesio, omega-3 «not checked in studies» (nessuna delle fonti lette li valuta separatamente nell'abstract).

### 5.5 UI, rollback, test
- Editor alimento, sezione «Vitamins and minerals» (chiusa): pulsante «Estimate missing with AI», valori con «≈» e la pillola «AI estimate»; un tap per accettarli o svuotarli. Card Nutrients: «≈» e la riga di copertura, nessun numero ripetuto.
- **Interruttori:** `energy.microAi` `off|on` (default off); `energy.drv` `efsa|legacy` per i riferimenti (`legacy` = i numeri di oggi), con `energy.drvFrom = ALGO_M7E_START` se si sceglie di cambiare i riferimenti (cambiano i giudizi dei giorni, non i dati).
- **Test** (`tests/m7e-micro.test.js`): risposta AI simulata (nessuna rete) → `src: "ai"`; un valore d'etichetta non viene sovrascritto; `null` resta sconosciuto; copertura con y% AI; nessun consiglio con >50% AI; riferimenti EFSA della tabella scritti a mano (es. ferro donna 16, vit. C uomo 110, folato 330); avviso UL solo per Ca > 2500 mg e vit. D > 100 µg; reload e offline mantengono `src`.

---

## 6. Interruttori, date di attivazione e registro `ALGO`

Stessa regola di F-11: data **costante nel codice**, mai «oggi» (sync o un secondo dispositivo la sposterebbero). Proposta: `ALGO_M7D_START` e `ALGO_M7E_START` = la data della pubblicazione di ciascuna milestone, scritta come stringa (per esempio `"2026-11-02"` se si pubblica quel giorno). I profili nuovi partono dal primo giorno (`from: ""`).

| Voce | Interruttore (default) | Data | Voce `ALGO` | Cambia la serie energetica? |
|---|---|---|---|---|
| D13a range carbo + avviso | `energy.carbRange` (on) | — | no (solo vista) | No |
| D13b target carbo dal carico (simple mode) | `energy.carbFromLoad` (off) | `carbLoadFrom` | sì, v11 | No (cambia il target carbo, non TDEE) |
| D13 fueling unico | — (sostituisce 3 tabelle) | — | no | No |
| D14 liquidi dal test | `energy.hydraFromTest` (on) | — | no | No |
| D15 EA | `energy.eaShow` (off) | — | no | No |
| D10 Cunningham/De Lorenzo | `energy.bmr` (invariato) | `bmrFfmFrom` | sì, v12 | Sì, solo se l'utente la sceglie |
| L16 stime AI | `energy.microAi` (off) | — | no | No |
| L16 riferimenti EFSA | `energy.drv` (`legacy`) | `drvFrom` | sì, v13 | No |

---

## 7. Cosa chiedo di approvare
1. **M7d-1 (sicura):** `fuelDuring` unica (§1.2a) con le scelte dichiarate (soglia 75 min, 30–90 oltre 2,5 h, riduzione Easy); range g/kg/die solo come vista e avviso (§1.2b, D13a).
2. **M7d-2:** soglie in minuti per il carico (60/90/240) e, opzionale, D13b.
3. **M7d-3:** Cunningham 1980 e De Lorenzo nella vista affiancata; Cunningham selezionabile; rinomina «Katch-McArdle» in «Cunningham 1991»; BF entro 30 giorni per le formule FFM.
4. **M7e-1:** D14 come in §2.2 e **togliere i numeri non verificati** (300–600 mg/h, 60–80%, 400–800 ml/h) lasciando il testo.
5. **M7e-2:** D15 spento di default, EEE netto, fasce testuali IOC.
6. **M7e-3:** L16 (provenienza «ai», copertura, nessun giudizio sopra 50% di stime) e riferimenti EFSA al posto della tabella mista (con `legacy` per tornare indietro).
7. Cosa resta **NON VERIFICATO** e quindi escluso: testo integrale ACSM 2007 (0,4–0,8 L/h, 20–30 mEq/L), testo del consenso EAH 2015, Fig. 1 di Jeukendrup 2014, valori NIH, UL di Mg/K/vit. C/B12, LARN 2014. Se l'utente può fornire i PDF, li verifico prima di usarli.

---

## 8. Bibliografia (PMID e DOI)
- Burke LM, Hawley JA, Wong SH, Jeukendrup AE. *J Sports Sci* 2011;29 Suppl 1:S17-27. PMID 21660838. doi 10.1080/02640414.2011.585473
- Jeukendrup A. *Sports Med* 2014;44 Suppl 1:S25-33. PMID 24791914. doi 10.1007/s40279-014-0148-z
- Thomas DT, Erdman KA, Burke LM. *Med Sci Sports Exerc* 2016;48(3):543-68. PMID 26891166. doi 10.1249/MSS.0000000000000852; *J Acad Nutr Diet* 2016;116(3):501-28. PMID 26920240. doi 10.1016/j.jand.2015.12.006
- Hartley C et al. *Sports Med* 2022;52(8):1833-62. PMID 35239154. doi 10.1007/s40279-022-01658-3 (secondaria per le fasce ACSM)
- *Nutrients* 2019;11:3017 (carboidrati e diabete tipo 1, tabella 2). PMID 31835538 (secondaria per i g/kg/die ACSM)
- Morton JP et al. *J Nutr* 2026;156(5):101442. PMID 41759826. doi 10.1016/j.tjnut.2026.101442
- Plews DJ et al. *Sports Med* 2026;56(10):2367-88. PMID 42258036. doi 10.1007/s40279-026-02462-z
- Impey SG et al. *Sports Med* 2018;48(5):1031-48. PMID 29453741. doi 10.1007/s40279-018-0867-7
- Podlogar T, Wallis GA. *Sports Med* 2022;52(Suppl 1):5-23. PMID 36173597. doi 10.1007/s40279-022-01757-1
- Kerksick CM et al. ISSN nutrient timing. *JISSN* 2017;14:33. PMID 28919842. doi 10.1186/s12970-017-0189-4 (8–12 g/kg/die per il massimo glicogeno)
- Sawka MN et al. ACSM 2007. *Med Sci Sports Exerc* 2007;39(2):377-90. PMID 17277604. doi 10.1249/mss.0b013e31802ca597
- Hew-Butler T et al. EAH 2015. *Clin J Sport Med* 2015;25(4):303-20. PMID 26102445. doi 10.1097/JSM.0000000000000221; *Br J Sports Med* 2015;49(22):1432-46. PMID 26227507. doi 10.1136/bjsports-2015-095004
- Baker LB. *Sports Med* 2017;47(Suppl 1):111-28. PMID 28332116. doi 10.1007/s40279-017-0691-5
- Barnes KA et al. *J Sports Sci* 2019;37(20):2356-66. PMID 31230518. doi 10.1080/02640414.2019.1633159
- McDermott BP et al. NATA. *J Athl Train* 2017;52(9):877-95. PMID 28985128. doi 10.4085/1062-6050-52.9.02
- Mountjoy M et al. IOC REDs 2023. *Br J Sports Med* 2023;57(17):1073-97. PMID 37752011. doi 10.1136/bjsports-2023-106994
- Stellingwerff T et al. IOC REDs CAT2. *Br J Sports Med* 2023;57(17):1109-18. PMID 37752002. doi 10.1136/bjsports-2023-106914
- Loucks AB, Thuma JR. *J Clin Endocrinol Metab* 2003;88(1):297-311. PMID 12519869. doi 10.1210/jc.2002-020369
- Loucks AB, Kiens B, Wright HH. *J Sports Sci* 2011;29 Suppl 1:S7-15. PMID 21793767. doi 10.1080/02640414.2011.588958
- Burke LM et al. *IJSNEM* 2018;28(4):350-63. PMID 30029584. doi 10.1123/ijsnem.2018-0142
- Logue DM et al. *Nutrients* 2020;12(3):835. PMID 32245088. doi 10.3390/nu12030835
- Melin A et al. *Br J Sports Med* 2014;48(7):540-5. PMID 24563388. doi 10.1136/bjsports-2013-093240
- Lundy B et al. *Nutrients* 2022;14(9):1873. PMID 35565840. doi 10.3390/nu14091873
- ten Haaf T, Weijs PJ. *PLoS One* 2014;9(10):e108460. PMID 25275434. doi 10.1371/journal.pone.0108460
- Cunningham JJ. *Am J Clin Nutr* 1980;33(11):2372-4. PMID 7435418. doi 10.1093/ajcn/33.11.2372
- Cunningham JJ. *Am J Clin Nutr* 1991;54(6):963-9. PMID 1957828. doi 10.1093/ajcn/54.6.963
- De Lorenzo A et al. *J Sports Med Phys Fitness* 1999;39(3):213-9. PMID 10573663
- Mifflin MD et al. *Am J Clin Nutr* 1990;51(2):241-7. PMID 2305711. doi 10.1093/ajcn/51.2.241
- O'Neill JER, Corish CA, Horner K. *Sports Med* 2023;53(12):2373-98. PMID 37632665. doi 10.1007/s40279-023-01896-z
- Martinho DV et al. *Biol Sport* 2023;40(3):787-804. PMID 37398968. doi 10.5114/biolsport.2023.119986
- *Methods Protoc* 2025;8(3):53 (tabella 1: De Lorenzo e Ten Haaf in kcal). PMID 40407480. doi 10.3390/mps8030053
- EFSA. Dietary Reference Values for nutrients — Summary report. 2017. doi 10.2903/sp.efsa.2017.e15121
- EFSA NDA. DRV sodium. *EFSA J* 2019;17(9):e05778. PMID 32626425. doi 10.2903/j.efsa.2019.5778
- EFSA NDA. DRV magnesium. *EFSA J* 2015;13(7):4186. PMID 42109801. doi 10.2903/j.efsa.2015.4186
- EFSA NDA. UL calcium. *EFSA J* 2012;10(7):2814. PMID 42016128. doi 10.2903/j.efsa.2012.2814
- EFSA NDA. UL vitamin D. *EFSA J* 2023;21(8):e08145. PMID 37560437. doi 10.2903/j.efsa.2023.8145
- EFSA NDA. UL folate. *EFSA J* 2023;21(11):e08353. PMID 37965303. doi 10.2903/j.efsa.2023.8353
- EFSA NDA. UL iron. *EFSA J* 2024;22(6):e8819. PMID 38868106. doi 10.2903/j.efsa.2024.8819
- Cao Y et al. *Front Nutr* 2026;13:1952757. PMID 42898137. doi 10.3389/fnut.2026.1952757
- O'Hara C et al. *Nutrients* 2025;17(4):607. PMID 40004936. doi 10.3390/nu17040607
- Carrillo-Larco RM et al. *J Nutr* 2026;156(10):101786. PMID 42607839. doi 10.1016/j.tjnut.2026.101786
- Yan R et al. *Commun Med* 2025;5(1):458. PMID 41193610. doi 10.1038/s43856-025-01159-0
