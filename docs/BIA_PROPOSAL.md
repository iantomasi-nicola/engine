# Proposta BIA per la bilancia Xiaomi S400 — L217 / L218 (M21)

**Stato: PROPOSTA, nessuna riga di `source/` è stata toccata.** Data: 27/10/2026. Regola 3 di `AGENTS.md`: nessun coefficiente entra nel codice prima dell'approvazione esplicita della singola formula da parte dell'utente, di una fonte primaria verificata e di un test numerico indipendente. Riferimenti interni: `docs/BODY_COMPOSITION.md` (`bfAt`, `leanEst`, L199), `docs/PRODUCT_REQUIREMENTS.md` (L217, L218), formato come `docs/NUTRITION_PROPOSAL_M7DE.md`.

**Come leggere «verificata».** **Sì** = formula o numero letto da me in questa sessione nel testo della fonte primaria disponibile (abstract PubMed via E-utilities, con PMID indicato). **Parziale** = letto solo in una fonte secondaria (articolo che cita la primaria, documentazione di un progetto open source). **NON VERIFICATO** = non letto: **non va usato come coefficiente**. I testi integrali degli editori (OUP/AJCN, Thieme, Wiley, Elsevier) rispondono 403 da questo ambiente: le formule sono quindi quelle riportate negli **abstract**, che per fortuna per Matias, Janssen e Kyle contengono l'equazione completa; per Sun 2003 no (vedi §3.3).

## Sintesi (leggere questa prima)

1. **Non esiste una equazione BIA validata per la S400.** Non ho trovato nessuno studio su PubMed sulla S400 (né sulla famiglia Xiaomi) e nessuna equazione pubblicata per bilance piede-piede a due frequenze con 250 kHz. Il progetto open source `bodymiscale` lo dice nel proprio codice («No peer-reviewed equation exists specifically for dual-frequency foot-to-foot scales», **Parziale**). Xiaomi dichiara r ≥ 0,93 con DXA in un rapporto della Beijing Sport University (n. BSU20220389), che non sono riuscito a trovare (**NON VERIFICATO**, marketing).
2. **Tutte le equazioni validate usano la resistenza R mano–piede a 50 kHz (spesso anche la reattanza Xc).** La S400 dà una sola impedenza per frequenza (modulo, in Ω), tra i due piedi, in piedi. Applicare queste equazioni è quindi un'**estrapolazione** fuori dal dispositivo, dalla postura e dal percorso di validazione. Bennett 2024 (PMID 39047869) mostra che R tra dispositivi diversi differisce fino al 24,6% e che le equazioni pubblicate danno differenze fino a 8,8 kg di FFM tra dispositivi.
3. **La scelta dell'equazione pesa più di qualunque altra cosa**: con gli stessi ingressi (180 cm, 78 kg, Z50 = 558 Ω) l'equazione per atleti dà 19,1 % di grasso, quella per popolazione generale 28,2 % (§5). Sono 9 punti di differenza; il numero «da bilancia» (21 %) e quello di Vitals (8 %) stanno in mezzo/fuori. **Senza i dati reali del proprietario e un riferimento (DXA) non si può dire quale sia giusta.**
4. **Raccomandazione.** (a) Salvare comunque i dati grezzi (Z50, Z250, battito, ora, condizioni) a ogni pesata: costa poco e serve a tutto il resto. (b) Come unica equazione candidata, **Matias 2021** (massa magra, atleti, riferimento a 4 compartimenti, ingressi: altezza, peso, R, sesso), **sperimentale, spenta di default**, con **taratura personale** su un riferimento (una DXA) che assorbe il bias costante dovuto a elettrodi/postura. (c) Mostrare sempre un **intervallo**, la **provenienza**, e il valore della bilancia e quello di Vitals **affiancati** con interruttore. (d) **Non** implementare massa muscolare scheletrica (Janssen), acqua/ECW/ICW, angolo di fase: ingressi non disponibili o metodo non validato per questo hardware (§3).
5. **Errore nel prompt di partenza:** il PMID 12663288 indicato per Sun et al. 2003 **non è** Sun: è un RCT su una bevanda fortificata in bambini della Tanzania (Ash et al., *AJCN* 2003;77:891). Sun et al. 2003 è **PMID 12540391**, doi 10.1093/ajcn/77.2.331 (verificato).

## Indice
- [1. Cosa misura la S400](#1-cosa-misura-la-s400)
- [2. Classifica delle equazioni](#2-classifica-delle-equazioni)
- [3. Schede delle equazioni](#3-schede-delle-equazioni)
- [4. Evidenza su bilance piede-piede e atleti](#4-evidenza-su-bilance-piede-piede-e-atleti)
- [5. Esempi numerici (vettori di test)](#5-esempi-numerici-vettori-di-test)
- [6. Protocollo di misura](#6-protocollo-di-misura)
- [7. Come presentare il numero](#7-come-presentare-il-numero)
- [8. Piano proposto e test](#8-piano-proposto-e-test)
- [9. Cosa chiedo di approvare](#9-cosa-chiedo-di-approvare)
- [10. Cosa NON ho potuto verificare](#10-cosa-non-ho-potuto-verificare)
- [11. Bibliografia (PMID e DOI)](#11-bibliografia-pmid-e-doi)

## 1. Cosa misura la S400

| Fatto | Fonte | Verificato |
|---|---|---|
| Bilancia a pedana, nessun elettrodo per le mani: la misura è **piede–piede** (percorso gambe + bacino; le braccia non entrano). La documentazione Xiaomi parla solo di «elettrodi di diametro maggiore»; **numero e disposizione degli elettrodi non dichiarati** (non so se 4 o 8, non so se la corrente passa per un piede e si misura sull'altro) | pagine Xiaomi/rivenditori via ricerca web; `bodymiscale` la classifica «foot-to-foot» | Parziale |
| Due frequenze: **50 kHz** (valore numericamente maggiore, ~558 Ω in esempio) e **250 kHz** (minore, ~503 Ω); una impedenza per frequenza, in Ω con risoluzione 0,1 Ω (14 bit ×10). **Non c'è** la scomposizione in R e Xc | documentazione ESPHome `xiaomi_body_scale` (decodifica del payload MiBeacon) | Parziale |
| A piedi nudi due pacchetti BLE (peso + battito + Z50, poi Z250); con i calzini arriva solo il primo | ESPHome | Parziale |
| Il modello di bilancia nel cloud Xiaomi compare come `yunmai.scales.ms103/104/107` o `xiaomi.scales.ms110` (famiglia S400/S400 Pro). **Le tre frequenze/versioni potrebbero non coincidere esattamente**: serve una prova con l'esemplare del proprietario | ESPHome | Parziale |
| Gli algoritmi del firmware (grasso, acqua, muscolo) sono stati ricavati per decompilazione da terzi (`bodymiscale`, issue #474): regressioni lineari non pubblicate, non validate; il grasso usa solo Z50. Il firmware **leviga** le impedenze con la misura precedente del profilo prima di mandarle all'app: il valore grezzo via BLE può quindi differire da quello usato dall'app | docstring di `bodymiscale/metrics/xiaomi_home.py` | Parziale |
| **Z (modulo) contro R (resistenza)**: Z = R / cos(φ), con φ = angolo di fase. Per φ = 4°, 6°, 8°, 10° il rapporto Z/R è 1,0024, 1,0055, 1,0098, 1,0154 (calcolo trigonometrico mio, non da letteratura). Quindi **sostituire R con Z50 per la sola differenza modulo/resistenza introduce ≤ ~1,5 %**; il vero problema è il percorso (piede–piede ≠ mano–piede), non Z contro R | calcolo | Sì (aritmetica) |
| Il percorso piede–piede dà impedenze di ordine di grandezza simile a mano–piede: 526 ± 56 Ω (elettrodi a pressione) contro 511 ± 59 Ω (gel sotto i piedi), r = 0,99, n = 9 (differenza sistematica +15 Ω); ma «H²/Z da solo correla **meno** con FFM e TBW nel piede–piede che nel braccio–gamba; con età, sesso e rapporto vita/fianchi gli errori diventano simili» | Nuñez 1997 (PMID 9107636), abstract | Sì |
| Principio generale: l'impedenza dipende da geometria e conduttività dei segmenti, non è proporzionale alla massa di ciascuno (le quote numeriche di gambe/tronco/braccia **non le ho lette**) | Foster & Lukaski 1996 (PMID 8780354), solo abstract generale | Parziale |

**Conseguenze.** (i) Il numero della S400 rappresenta soprattutto le **gambe**: in un atleta di corsa/calisthenics con gambe e braccia sviluppate in modo diverso, il rapporto tra impedenza e massa magra totale può discostarsi da quello della popolazione di validazione. (ii) L'uso di **Z250** non ha alcuna equazione validata: lo escludo dalle formule (al più un indicatore di tendenza, §9 D-BIA-9).

## 2. Classifica delle equazioni

Criteri: ingressi realmente disponibili (altezza, peso, età, sesso, **una** impedenza), popolazione (maschio, atleta), criterio di riferimento (DXA/4C), verifica della formula nel testo primario, errore dichiarato, limiti.

| # | Equazione | Esito | Motivo in una riga |
|---|---|---|---|
| 1 | **Matias 2021** — FFM, atleti, 4C (PMID 32770535) | **Candidata, sperimentale** | Formula completa nell'abstract (**Sì**); ingressi disponibili (H²/R, peso, sesso); atleti d'élite; riferimento a 4 compartimenti; validazione esterna su 50 uomini allenati con la forza vs DXA: bias −0,89 kg (Campa 2022, PMID 35810579). Ma R mano–piede supino/50 kHz, non piede–piede |
| 2 | **Taratura personale** (offset su un riferimento DXA) | **Raccomandata come complemento a 1** | Non è un'equazione: assorbe il bias costante di dispositivo/percorso. Non corregge una pendenza sbagliata (Saunders 1998 mostra che l'errore di idratazione sta nell'intercetta, §6) |
| 3 | Sun 2003 — FFM/TBW, popolazione generale, multicomponente (PMID 12540391) | **Solo confronto, e solo se la formula viene verificata** | Coefficienti letti solo in una fonte secondaria; popolazione generale (non atleti); con gli stessi ingressi differisce di ~7 kg di FFM dalla 1 (§5) |
| 4 | Matias 2016 — TBW atleti, deuterio (PMID 25886709) | Informativa, non ora | Formula completa (**Sì**), ma l'acqua non è una richiesta del proprietario ed ECW richiede Xc |
| 5 | Janssen 2000 — massa muscolare scheletrica (MRI) (PMID 10926627) | **Non raccomandata** | Formula completa (**Sì**), ma derivata con R mano–piede e MRI; su DXA sovrastima di 3,65 kg (Campa 2026, PMID 40903338); `bodymiscale` la applica su Z50 piede–piede senza validazione |
| 6 | Kyle 2001 (Ginevra) (PMID 11312069); Campa 2026 SMM (PMID 40903338) | **Non applicabili** | Richiedono la reattanza (e l'angolo di fase): la S400 non li fornisce |
| 7 | Equazioni piede–piede: Nuñez 1997, Jebb 2000 (PMID 9107636, 10743490), Jaffrin 2014 (PMID 24918180), equazioni «adulto/atleta» Tanita | **Giusta configurazione, coefficienti irraggiungibili o proprietari** | Non ho potuto leggere i coefficienti; quelle Tanita sono segrete |
| 8 | Formule del firmware S400 (decompilate) | **Non riprodurre** | Non validate, derivate da terzi, levigate con la misura precedente |

## 3. Schede delle equazioni

Notazione: H altezza in **cm**, W peso in kg, R (o Z50) in Ω, sesso = 1 maschio / 0 femmina, età in anni. Verificare sempre le unità (H in metri dà valori assurdi).

### 3.1 Matias 2021 — massa magra per atleti (candidata)
- **Fonte:** Matias CN, Campa F, Santos DA, Lukaski H, Sardinha LB, Silva AM. *Int J Sports Med* 2021;42(1):27-32. **PMID 32770535**, doi 10.1055/a-1179-6236.
- **Formula (abstract, verificata):** `FFM(kg) = −2,261 + 0,327·H²/R + 0,525·W + 5,462·sesso`, con H in cm, R in Ω.
- **Popolazione:** 142 atleti molto allenati («highly trained», di livello nazionale), 22,9 ± 5,0 anni, misurati in stagione agonistica; split casuale sviluppo n = 95 / validazione n = 47. Criterio: modello a 4 compartimenti. Dispositivo: bioimpedenziometro **sensibile alla fase, 50 kHz** (R e Xc misurati; la marca non è nell'abstract).
- **Errore dichiarato (abstract):** R² = 0,94 in validazione, limiti di concordanza «attorno al 10 % di variabilità», nessun trend, CCC alto. **SEE in kg non ottenuto** (testo integrale non raggiungibile).
- **Validazione esterna:** Campa et al., *Nutrition* 2022;102:111694, **PMID 35810579**: 50 uomini allenati con i pesi (30,9 ± 7,4 anni, BMI 25,3 ± 2,2), DXA come riferimento, tecnologia mano–piede 50 kHz: bias −0,89 kg (n.s.), nessun bias proporzionale, R² = 0,91; invece **−2,93 kg** (sottostima, p < 0,05) in 20 uomini della popolazione generale (BMI 22,8). Gli autori: equazioni per atleti e generalizzate «non sono intercambiabili».
- **Elettrodi/frequenza richiesti:** mano–piede, 50 kHz, **R** (non Z). **La S400 non lo soddisfa** (piede–piede, in piedi, Z). Uso proposto: Z50 al posto di R, dichiarato come estrapolazione.
- **Limiti d'uso:** atleti (media 22,9 ± 5,0 anni; fascia d'età esatta non letta); uomini e donne nel campione; non provata su bilance piede–piede; sensibile a R (±10 % di R → ∓1,9 kg di FFM nell'esempio A, §5).
- **Esempio numerico:** §5.
- **Raccomandazione:** unica candidata; **sperimentale**, spenta di default, con taratura personale e intervallo (§7).

### 3.2 Matias 2016 — acqua corporea totale per atleti (informativa)
- **Fonte:** Matias CN et al. *Clin Nutr* 2016;35(2):468-74. **PMID 25886709**, doi 10.1016/j.clnu.2015.03.013.
- **Formule (abstract, verificate):** `TBW(L) = 0,286 + 0,195·H²/R + 0,385·W + 5,086·sesso`; `ECW(L) = 1,579 + 0,055·H²/R + 0,127·W + 0,006·H²/Xc + 0,932·sesso` (**ECW richiede Xc: non applicabile**).
- **Popolazione:** 208 atleti molto allenati (21,3 ± 5,0 anni), n = 139 sviluppo / n = 69 validazione; TBW per diluizione di deuterio, ECW per bromuro; 50 kHz sensibile alla fase. R² validazione 0,91 (TBW), 0,70 (ECW), nessun bias medio.
- **Raccomandazione:** non implementare ora (richiesta non presente; l'acqua da BIA non rileva l'iperidratazione, vedi §6, Matthews 2019). Eventuale uso futuro: solo tendenza.

### 3.3 Sun et al. 2003 — popolazione generale (solo confronto)
- **Fonte:** Sun SS, Chumlea WC, Heymsfield SB, Lukaski HC, Schoeller D, Friedl K, Kuczmarski RJ, Flegal KM, Johnson CL, Hubbard VS. *Am J Clin Nutr* 2003;77(2):331-40. **PMID 12540391**, doi 10.1093/ajcn/77.2.331 (**non** 12663288).
- **Abstract (verificato):** 5 centri, n = 1829 (1474 bianchi, 355 neri), 12–94 anni; TBW per diluizione, FFM da modello multicompartimentale (densitometria + isotopi + DXA). Equazioni per sesso con **statura²/resistenza e peso**; TBW: R² = 0,84 (M) / 0,79 (F), RMSE 3,8 / 2,6 L; **FFM: R² = 0,90 (M) / 0,83 (F), RMSE 3,9 / 2,9 kg**, CV ≈ 6 %; sovrastima FFM nei maschi bianchi di 0,4 kg, sottostima nei neri di 2,1 kg. Dispositivo e configurazione (tetrapolare mano–piede 50 kHz) **non sono nell'abstract**: dato dal contesto, NON VERIFICATO.
- **Coefficienti: NON nell'abstract.** In una tabella secondaria (articolo PMC7230013 su bianchi/neri africani, che attribuisce la riga a NHANES III e cita Sun) compaiono:
  - `FFM_M = −10,678 + 0,262·W + 0,652·H²/R + 0,015·R` (e F: −9,529 + 0,168·W + 0,696·H²/R + 0,016·R). **Parziale.**
  - `TBW_M = 1,2 + 0,45·H²/R + 0,18·W` (F: 3,75 + 0,45·H²/R + 0,11·W), riportata nella stessa tabella con un «/0,73» ambiguo (probabile conversione in FFM). **Parziale, ambigua: non usare.**
- **Attenzione agli arrotondamenti:** con i coefficienti a due decimali (−10,68; 0,65; 0,26; **0,02**·R) l'esempio A dà 58,50 kg invece di 55,99 kg: 2,5 kg di differenza, quasi tutti dal termine in R. **Una formula citata a memoria o arrotondata non va nel codice.**
- **Limiti:** popolazione generale (BMI e adiposità medi più alti di un atleta); coefficienti del termine in R ottimizzati per R mano–piede.
- **Raccomandazione:** non implementare finché il testo primario non è letto. Se letto, usare al più come «secondo parere per popolazione generale» nell'intervallo, mai come valore principale.

### 3.4 Janssen 2000 — massa muscolare scheletrica (non raccomandata)
- **Fonte:** Janssen I, Heymsfield SB, Baumgartner RN, Ross R. *J Appl Physiol* 2000;89(2):465-71. **PMID 10926627**, doi 10.1152/jappl.2000.89.2.465.
- **Formula (abstract, verificata):** `SM(kg) = (H²/R)·0,401 + sesso·3,825 − età·0,071 + 5,102`, H in cm, R in Ω, sesso M = 1.
- **Popolazione:** 388 uomini e donne multietnici di 18–86 anni, due laboratori, riferimento **RM** (risonanza); R² 0,86, SEE 2,7 kg (9 %). Sottostima nei soggetti asiatici.
- **Problemi:** (a) derivata con R mano–piede; (b) la definizione di «massa muscolare scheletrica» è quella della RM, non quella di DXA (lean soft tissue) né quella delle bilance; (c) Campa 2026 (PMID 40903338, n = 353 adulti 18–82 anni, mano–piede 50 kHz vs DXA) trova che **Janssen sovrastima di 3,65 kg** (limiti di concordanza −0,1 a +8,0 kg); (d) `bodymiscale` la applica su Z50 piede–piede come «migliore approssimazione» (auto-dichiarata).
- **Raccomandazione:** **non implementare.** L'indice «muscolo» della bilancia resta quello del firmware, mostrato come tale se mai.

### 3.5 Equazioni che richiedono la reattanza (non applicabili)
- **Kyle 2001 (Ginevra)**, *Nutrition* 17(3):248-53, **PMID 11312069**, doi 10.1016/s0899-9007(00)00553-0: `FFM = −4,104 + 0,518·H²/R + 0,231·W + 0,130·Xc + 4,229·sesso` (**Sì**, abstract); n = 343 (202 M, 141 F), 20–94 anni, BMI 17,0–33,8; DXA Hologic; Xitron 4000B mano–piede; r = 0,986, **SEE 1,72 kg**. Contiene Xc: **non calcolabile** con la S400.
- **Campa 2026 SMM**: `SMM = −17,612 + 3,397·sesso + 0,037·H²/Xc + 3,509·PA − 0,052·età` (**Sì**, abstract), SEE 2,25 kg, R² 0,88, DXA: richiede Xc e angolo di fase.

### 3.6 Equazioni piede–piede (giusta configurazione, coefficienti non ottenuti)
- **Nuñez 1997** (PMID 9107636, abstract **Sì**): sistema leg-to-leg 50 kHz con elettrodi a pressione; regressione di FFM (n = 231, DXA/pesata idrostatica) e TBW (n = 144, deuterio) su H²/Z più età, sesso e rapporto vita/fianchi; prestazioni «simili» al braccio–gamba. **Coefficienti non letti.**
- **Jebb 2000** (PMID 10743490, abstract **Sì**): Tanita, n = 205 (104 M, 101 F), 16–78 anni, riferimento a 4C; equazione con **trasformazioni logaritmiche** di altezza, peso, impedenza, più sesso ed età; SD residua 4,8 % (M) e 3,3 % (F). Bias del grasso del Tanita: +0,8 kg (2 SD 7,9 kg). **Coefficienti non letti.**
- **Jaffrin 2014** (PMID 24918180, abstract **Sì**): FFM da R34 piede–piede (elettrodi plantari) contro mano–piede, equazioni da regressione su 170 soggetti e validate su 86, riferimento DXA; **coefficienti non letti** (testo non raggiungibile).
- Tanita «adulto» e «atleta»: **proprietarie**; usarle come benchmark non è possibile.
- **Raccomandazione:** se l'utente (o un'altra sessione con accesso ai PDF) fornisce il testo integrale di Nuñez 1997 e Jebb 2000, le valuto come alternativa più coerente con l'hardware. Fino ad allora: nessuna.

### 3.7 Angolo di fase e vettori BIVA
- PA = arctan(Xc/R) (Norman 2012, PMID 22698802). Servono R e Xc separati a 50 kHz. La S400 fornisce solo moduli a 50 e 250 kHz: **l'angolo di fase non è calcolabile** e non va approssimato dal rapporto Z250/Z50 (nessuna validazione trovata). **Non implementare.**

### 3.8 Dal FFM al grasso percentuale
`FM = W − FFM`, `BF% = 100·FM/W`. Se un'equazione dà TBW: `FFM = TBW/0,732` (idratazione della massa magra ≈ 0,73; Wang 1999, PMID 10232621, abstract **Sì**: «approximately 0.73»; il valore 0,732 è quello usato in Bennett 2024). L'errore del grasso percentuale è l'errore della massa magra diviso per il peso: SEE 2,6 kg su 78 kg ≈ 3,4 punti di BF. Gli atleti possono avere idratazione della FFM diversa (motivo dichiarato di Matias 2021).

## 4. Evidenza su bilance piede–piede e atleti

| Studio | Dispositivo/popolazione | Riferimento | Risultato (dall'abstract, **Sì**) |
|---|---|---|---|
| Nickerson 2019, PMID 30789577 | piede–piede 1 frequenza, 33 atleti NCAA D-I uomini | 3C (ADP + BIS) | FFM: SEE 2,64 kg, errore totale 2,64 kg, limiti ±5,15 kg, **nessun** bias proporzionale; BF%: SEE 2,79 %, errore totale 2,95 %, **limiti ±5,67 %**, **bias proporzionale** (r = −0,50): «non valido per stime individuali di BF%» |
| Nana 2022, PMID 35094958 | Tanita BC-313 piede–piede, 929 adulti | DXA iDXA | BF%: RMSE 5,6 (M) / 4,6 (F); CCC 0,66 (M) / 0,79 (F); non equivalente a ±2,5/±5 % |
| Jebb 2000, PMID 10743490 | Tanita, 205 adulti 16–78 anni | 4C | bias grasso +0,8 kg, 2 SD 7,9 kg |
| Dixon 2005, PMID 15705050 | Tanita TBF-300A, modo atleta, 25 lottatori NCAA D-III | pesata idrostatica | BF% medio 12,3 contro 14,5: **sottostima**; SEE 3,60 % |
| Swartz 2002, PMID 12144724 | Tanita TBF-305, 57 uomini 18–35 anni | pesata idrostatica | la scelta del «modo attività» cambia la stima; **errore individuale ampio** |
| Jaffrin 2005, PMID 15975489 | foot-to-foot Tefal, 60 volontari | DXA | FFM: differenza 1,98 ± 3,09 kg negli uomini (limiti troppo ampi per il singolo) |
| Campa 2022 (SR), PMID 35067750 | 42 studi su atleti | riferimenti | massa grassa «incoerente» con qualunque tecnologia BIA; FFM e acqua buoni con **mano–piede + equazioni per atleti**; con equazioni generalizzate sottostima FFM e liquidi |
| Oliver 2026 (SR), PMID 41718193 | 12 studi, adulti sani non atleti | 4C | bias BF% da −3,5 a +4,4; **limiti di concordanza tipici 15–20 punti**; FFM limiti spesso > ±6 kg: «non equivalenti» a livello individuale |
| Bennett 2024, PMID 39047869 | 73 atleti, tre dispositivi (supino tetrapolare/ottopolare, in piedi ottopolare) | 5C | R differisce tra dispositivi fino al 24,6 %; equazioni per atleti con i due dispositivi ottopolari (supino e in piedi): errore costante da −2,7 a −4,6 kg di FFM; nessuna differenza col tetrapolare supino |
| Dehghan & Merchant 2008, PMID 18778488 | rassegna | — | le equazioni valgono nelle popolazioni e condizioni in cui sono state validate, non altrove |
| Jebb 2007, PMID 17060926 | leg-to-leg, 58 donne in dimagrimento | 3C/4C | per le **variazioni** del grasso: bias 0,51 ± 3,26 kg (2 SD) nel calo, −0,25 ± 2,30 kg nella ripresa: **migliore del tetrapolare** |

**Lettura onesta.** (1) Le bilance piede–piede stimano ragionevolmente la **massa magra** di gruppo e **meno** il grasso percentuale individuale; (2) negli atleti l'errore dipende da quale equazione/modo si usa; (3) per **seguire le variazioni** nel tempo il metodo regge meglio che per il valore assoluto (Jebb 2007, ma su donne in sovrappeso, **non** su atleti); (4) nessuno di questi studi riguarda la S400.

## 5. Esempi numerici (vettori di test)

Valori sintetici (nessun dato reale). Calcolati con Python (`float`) e ricontrollati con `fractions.Fraction` (differenza < 1e-9). H in cm, R = Z50 in Ω, sesso maschio. `H²/R` e risultati con 3 decimali.

| | A: H 180, W 78, età 32, R 558 | B: H 175, W 70, età 28, R 620 | C: H 185, W 88, età 40, R 500 |
|---|---|---|---|
| H²/R | 58,065 | 49,395 | 68,450 |
| **Matias 2021 FFM** (kg) | **63,138** | **56,103** | **71,784** |
| → FM / BF% | 14,862 kg / **19,05 %** | 13,897 kg / **19,85 %** | 16,216 kg / **18,43 %** |
| Matias 2016 TBW (L) | 46,725 | 41,954 | 52,600 |
| Sun 2003 FFM, coeff. 3 decimali (**Parziale**) | 55,986 | 49,168 | 64,507 |
| → BF% (Sun) | 28,22 % | 29,76 % | 26,70 % |
| Sun con coeff. arrotondati (−10,68; 0,65; 0,26; 0,02) | 58,502 | 52,027 | 66,692 |
| Janssen SM (kg) | 29,939 | 26,746 | 33,535 |

Calcolo a mano del caso A (Matias): `H²/R = 32400/558 = 58,0645`; `0,327·58,0645 = 18,9871`; `−2,261 + 18,9871 = 16,7261`; `+ 0,525·78 = 40,95 → 57,6761`; `+ 5,462 = 63,1381`. Controllo di sensibilità: R ×0,9 → FFM 65,248; R ×1,1 → 61,412 (Δ ≈ ∓1,9 kg ≈ ∓2,4 punti di BF).

**Test negativi:** altezza in metri (1,80) → `H²/R` ≈ 0,0058 e FFM ≈ 44 kg (BF implausibile ≈ 43 %): il test deve verificare che la funzione rifiuti H < 100; sesso ≠ {0,1} rifiutato; R fuori da 200–1500 Ω rifiutato (soglie da approvare, non da letteratura).

**Cosa mostra la tabella.** Con ingressi identici le due equazioni divergono di ~7 kg di FFM (~9 punti di BF). Non è un errore: è il punto 3 della sintesi. Questi esempi non sono i valori del proprietario (Z50 = 558 Ω è il valore tipico citato in ESPHome); la decisione sull'equazione richiede i suoi dati reali.

## 6. Protocollo di misura

Evidenza **verificata** (abstract) sugli effetti su misure piede–piede/gamba–gamba e BIA in generale:

| Fattore | Effetto misurato | Fonte |
|---|---|---|
| Pasto | l'impedenza scende dopo un pasto standard, per 2–4 h, in modo cumulativo; il BF% calcolato varia di 8,8 (F) / 9,9 (M) punti tra il valore più alto e il più basso nelle 24 h (BIA classica, n = 18) | Slinde 2001, PMID 11566645 |
| Cibo/bevanda, piede–piede | dopo pasto o bevanda elettrolitica l'impedenza **sale** di poco; BF% mediana +~1 punto; gli autori: non serve il digiuno stretto «in contesto clinico» (n = 55) | Androutsos 2015, PMID 25158295 |
| 591 ml di acqua o bevanda | impedenza invariata (gamba–gamba), ma il **peso sale** e il BF% +0,5 punti per il peso in più | Dixon 2006, PMID 16234840 |
| 466 ml di soluzione isotonica | impedenza piede–piede invariata; l'acqua BIA non rileva l'iperidratazione | Matthews 2019, PMID 30998857 |
| Idratazione in atleti (BIA mano–piede) | −3 % del peso per disidratazione: BF% da 14,4 a 12,3 (−2,1 punti); dopo reidratazione 15,5; l'errore va nell'**intercetta**, non nella pendenza; «BIA non valida negli atleti per seguire gli effetti dell'allenamento» | Saunders 1998, PMID 9624647 |
| Esercizio prima della misura | ciclismo 30 min: BF% −0,3 (70 % FCmax) / −0,5 (85 %) con gamba–gamba; un allenamento di forza di 60 min non cambia gamba–gamba ma cambia il segmentale | Andreacci 2013, PMID 23611012; Dixon & Andreacci 2009, PMID 19855326 |
| Condizioni da standardizzare (rassegne) | elencano i fattori individuali e ambientali da standardizzare; **quali fattori e con che soglie non l'ho letto** (abstract generici) | Kushner 1996, PMID 8780358; Kyle 2004, PMID 15380917 |

**Protocollo proposto (cosa è verificato e cosa no):**
1. **Mattino**, stesso orario ±1 h, **dopo aver urinato**, prima di colazione, bevande e allenamento (motivato da Slinde, Saunders, Andreacci; **le soglie orarie esatte — digiuno ≥ 8 h, nessun esercizio nelle ultime 12 h, ecc. — sono pratica comune ma NON verificate qui**).
2. **A piedi nudi, pelle asciutta**, stessa posizione dei piedi, fermo, stessa bilancia; con i calzini non arriva la seconda frequenza (ESPHome, Parziale). La posizione dei piedi cambia la resistenza (Jaffrin 2014, abstract **Sì**).
3. Dopo allenamento duro, giornata di gara, viaggio, alcol, forte variazione di sale/carboidrati o malattia: segnare la pesata come «non standard».
4. La BIA va usata sulle **tendenze** (media mobile su 7–28 giorni, come già fa `leanEst`), non sul singolo valore.
5. Il peso mattutino è già nel peso di tendenza (7 giorni): la BIA non lo sostituisce.

## 7. Come presentare il numero

1. **Sempre con la provenienza:** «Engine (equazione per atleti, sperimentale)» · «Bilancia (firmware Xiaomi)» · «Vitals/intervals.icu» · «Digitato». Le tre fonti **affiancate** e un **interruttore** che dice quale alimenta `bfAt` (oggi: digitato, poi Vitals corretto con lo scarto medio; vedi `docs/BODY_COMPOSITION.md`). **Il default non cambia** finché l'utente non attiva la nuova fonte.
2. **Mai un numero secco:** intervallo e, dove c'è, la qualità. Proposta di banda iniziale **±5,7 punti di BF** per la singola misura (= limiti di concordanza di Nickerson 2019, la validazione più vicina: piede–piede, uomini atleti, 3C; vale per l'equazione proprietaria Tanita, **non** per Matias su S400). Dopo la taratura, sostituire con la deviazione standard dei residui personali. Per la media a 28 giorni vale la regola già in uso (n_eff, minimo 0,4 punti), che riduce il rumore casuale ma **non** il bias.
3. **Etichetta di confidenza:** «bassa» finché non esiste un riferimento personale (DXA), «media» dopo la taratura con una DXA e ≥ 10 misure standard, «alta» non si usa (la letteratura sul singolo individuo non la giustifica: Oliver 2026, Nickerson 2019).
4. **Una sola cifra decimale** nel grasso, nessun decimale nei kg di massa magra oltre il primo; niente grafico con tre curve dove una basta (vedi regola 7 di `AGENTS.md`).
5. **Divergenza tra fonti:** se Engine e bilancia differiscono più della banda, dirlo in una riga («le fonti non concordano: serve un riferimento»), senza scegliere in silenzio.
6. Il valore tarato mostra la data e il tipo del riferimento («tarato su DXA del …»).

## 8. Piano proposto e test

**M21-a — dati grezzi (sicura, nessuna formula).** Salvare per ogni pesata: Z50, Z250 (Ω), battito, peso, data/ora, flag «standard/non standard», nota libera. Mostrare solo la tendenza di Z50 e del rapporto Z250/Z50 come «dato grezzo». Serve a raccogliere ≥ 14 giorni di coppie per decidere l'equazione sui dati veri.

**M21-b — stima sperimentale.** Matias 2021 con Z50 al posto di R; FM e BF% derivati; banda e provenienza (§7); spenta di default; non alimenta `bfAt` finché non approvato.

**M21-c — taratura personale.** Riferimento esterno (DXA o altro) con data e massa magra misurata → offset additivo `FFM_tarato = FFM_eq + (FFM_rif − FFM_eq alla data)`; richiede ≥ 3 misure standard nei 7 giorni intorno alla DXA; si ricalcola a ogni nuovo riferimento. Il campo «fonte del riferimento» serve anche alle formule FFM del BMR (vedi `NUTRITION_PROPOSAL_M7DE.md` §4.2). **Limite dichiarato:** la DXA ha errore proprio e dipende dall'idratazione; un offset non corregge una pendenza sbagliata.

**Test (`tests/m21-bia.test.js`, quando approvato):** i vettori del §5 scritti a mano; Matias per due strade (forma diretta e `Fraction`) con differenza < 1e-9; rifiuto di H < 100, di sesso non binario, di R fuori range; BF% = (W−FFM)/W; offset di taratura (un caso numerico a mano); interruttore fonte `bfAt` (la fonte «Engine» non cambia nulla se spenta); i dati grezzi non cambiano il peso di tendenza; nessuna chiave Xiaomi nei test. Rollback: spegnere l'interruttore; i dati grezzi restano.

## 9. Cosa chiedo di approvare

Una per una (come in `NUTRITION_PROPOSAL_M7DE.md` §7). Ogni voce è indipendente.

1. **D-BIA-1 — dati grezzi (M21-a):** salvare Z50/Z250/battito/ora/flag a ogni pesata, senza formule.
2. **D-BIA-2 — equazione sperimentale:** approvare **Matias 2021** (§3.1) come unica formula di massa magra, spenta di default, con Z50 al posto di R. In alternativa: attendere i primi 14 giorni di dati (M21-a) e rivalutare, oppure fornire il PDF di Nuñez 1997 / Jebb 2000 per un'equazione piede–piede.
3. **D-BIA-3 — popolazione:** l'utente si considera «atleta» ai fini di Matias 2021? (Campa 2022: −0,89 kg in uomini allenati con i pesi, −2,93 kg nella popolazione generale.) Se no, nessuna equazione per atleti.
4. **D-BIA-4 — Sun 2003:** non implementare (raccomandato) oppure leggere il testo primario e usarla solo come secondo parere nell'intervallo.
5. **D-BIA-5 — taratura personale (M21-c):** campo «riferimento» (data, FFM, fonte) e offset additivo come in §8.
6. **D-BIA-6 — presentazione:** tre fonti affiancate con interruttore su `bfAt`; default invariato; banda iniziale ±5,7 punti BF (o altra); etichetta di confidenza «bassa/media».
7. **D-BIA-7 — protocollo:** mostrare le istruzioni del §6 come guida e il flag «standard/non standard»; **soglie orarie** (digiuno, tempo dall'allenamento) da decidere perché non verificate (suggerimento: nessuna esclusione automatica, solo un'avvertenza e peso ridotto nella media).
8. **D-BIA-8 — fuori perimetro:** non implementare massa muscolare scheletrica (Janssen), acqua/ECW/ICW, angolo di fase, né le formule del firmware. Riesaminabili se compare una equazione piede–piede validata.
9. **D-BIA-9 — Z250:** nessuna equazione. Facoltativo: mostrare il rapporto Z250/Z50 come tendenza «idratazione grezza», senza interpretazione (nessuna validazione trovata).
10. **D-BIA-10 — confine con lo spike (L217):** decifratura BLE e bind key restano fuori da questo documento (la bind key non entra mai in test né in cloud); questa proposta vale per i dati grezzi una volta ottenuti.

## 10. Cosa NON ho potuto verificare

- **Elettrodi della S400:** numero, disposizione e se è davvero un 4 o 8 elettrodi; nessun documento tecnico Xiaomi (solo marketing). Il rapporto BSU20220389 (r ≥ 0,93 con DXA) non è stato trovato.
- **Se la S400 del proprietario** (`yunmai.scales.ms104`) emette esattamente 50 e 250 kHz e con quale smoothing sul valore grezzo: fonte ESPHome/`bodymiscale` (secondarie).
- **Coefficienti di Sun 2003** nel testo primario (solo secondaria; termine in R 0,015 contro 0,02 arrotondato). Il testo integrale di Sun 2003, Matias 2021 (SEE in kg), Campa 2022 (n. di soggetti per gruppo letto solo dall'abstract), Nuñez 1997, Jebb 2000, Jaffrin 2014: non raggiungibili (403).
- **Marca e modello dell'impedenziometro** usato per Matias 2021 e se la postura è supina (è «sensibile alla fase, 50 kHz» nell'abstract; Bennett 2024 cita RJL/Akern per i riferimenti degli atleti).
- **Quali tre equazioni «generalizzate»** abbia confrontato Campa 2022 (non sono nell'abstract) e se includano Sun. Nota: la rassegna Campa 2022 (EJAP) parla di **sotto**stima della FFM con equazioni generalizzate, lo studio Campa 2022 (Nutrition) di **sopra**stima di 4,1–5,4 kg negli uomini allenati con i pesi: non ne ricavo una direzione.
- **Soglie orarie** del protocollo (digiuno, esercizio, vescica) dalle linee guida ESPEN/Kyle 2004: solo abstract.
- **La quota di impedenza dovuta a gambe/tronco/braccia** nel percorso piede–piede (Foster & Lukaski 1996: letto solo l'abstract generale).
- **Nessuno studio S400** su PubMed (ricerche per «Xiaomi», «smart scale», «consumer bioimpedance scale»: nulla di pertinente).
- **La sensibilità al ciclo mestruale** e altri fattori non applicano al proprietario (uomo): non esaminati.

## 11. Bibliografia (PMID e DOI)

- Sun SS et al. *Am J Clin Nutr* 2003;77(2):331-40. **PMID 12540391**. doi 10.1093/ajcn/77.2.331
- Kyle UG et al. *Nutrition* 2001;17(3):248-53. **PMID 11312069**. doi 10.1016/s0899-9007(00)00553-0
- Janssen I et al. *J Appl Physiol* 2000;89(2):465-71. **PMID 10926627**. doi 10.1152/jappl.2000.89.2.465 (equazione BIA); Janssen I et al. 2000;89(1):81-8. PMID 10904038 (massa muscolare con RM)
- Matias CN et al. *Int J Sports Med* 2021;42(1):27-32. **PMID 32770535**. doi 10.1055/a-1179-6236
- Matias CN et al. *Clin Nutr* 2016;35(2):468-74. **PMID 25886709**. doi 10.1016/j.clnu.2015.03.013
- Campa F et al. *Nutrition* 2022;102:111694. **PMID 35810579**. doi 10.1016/j.nut.2022.111694
- Campa F et al. *Eur J Appl Physiol* 2022;122(3):561-89. **PMID 35067750**. doi 10.1007/s00421-021-04879-y
- Campa F et al. *Nutr Metab Cardiovasc Dis* 2026;36(1):104281. **PMID 40903338**. doi 10.1016/j.numecd.2025.104281
- Nickerson BS, Snarr RL, Ryan GA. *J Strength Cond Res* 2019;33(12):3361-6. **PMID 30789577**. doi 10.1519/JSC.0000000000002999
- Nuñez C et al. *Med Sci Sports Exerc* 1997;29(4):524-31. **PMID 9107636**. doi 10.1097/00005768-199704000-00015
- Jebb SA et al. *Br J Nutr* 2000;83(2):115-22. **PMID 10743490**. doi 10.1017/s0007114500000155
- Jebb SA et al. *Int J Obes* 2007;31(5):756-62. **PMID 17060926**. doi 10.1038/sj.ijo.0803475
- Jaffrin MY et al. *Nutrition* 2005;21(7-8):815-24. **PMID 15975489** (Tefal Bodymaster). doi 10.1016/j.nut.2004.11.016; Jaffrin MY et al. *J Healthc Eng* 2014;5(2):123-44. **PMID 24918180**. doi 10.1260/2040-2295.5.2.123
- Nana A et al. *Obes Res Clin Pract* 2022;16(1):37-43. **PMID 35094958**. doi 10.1016/j.orcp.2021.12.006
- Dixon CB et al. *J Strength Cond Res* 2005;19(1):85-91. **PMID 15705050**. doi 10.1519/14053.1
- Swartz AM et al. *Br J Nutr* 2002;88(2):205-10. **PMID 12144724**. doi 10.1079/BJNBJN2002612
- Oliver CJ et al. *J Funct Morphol Kinesiol* 2026;11(1):65. **PMID 41718193**. doi 10.3390/jfmk11010065
- Bennett JP et al. *Clin Nutr ESPEN* 2024;63:540-50. **PMID 39047869**. doi 10.1016/j.clnesp.2024.07.009
- Dehghan M, Merchant AT. *Nutr J* 2008;7:26. **PMID 18778488**. doi 10.1186/1475-2891-7-26
- Foster KR, Lukaski HC. *Am J Clin Nutr* 1996;64(3 Suppl):388S-396S. **PMID 8780354**. doi 10.1093/ajcn/64.3.388S
- Kushner RF et al. *Am J Clin Nutr* 1996;64(3 Suppl):423S-427S. **PMID 8780358**. doi 10.1093/ajcn/64.3.423S
- Kyle UG et al. *Clin Nutr* 2004;23(5):1226-43 (**PMID 15380917**, doi 10.1016/j.clnu.2004.06.004) e 23(6):1430-53 (**PMID 15556267**, doi 10.1016/j.clnu.2004.09.012)
- Slinde F, Rossander-Hulthén L. *Am J Clin Nutr* 2001;74(4):474-8. **PMID 11566645**. doi 10.1093/ajcn/74.4.474
- Androutsos O et al. *J Hum Nutr Diet* 2015;28(2):165-71. **PMID 25158295**. doi 10.1111/jhn.12259
- Dixon CB et al. *Eur J Clin Nutr* 2006;60(1):142-6. **PMID 16234840**. doi 10.1038/sj.ejcn.1602282
- Dixon CB, Andreacci JL. *J Strength Cond Res* 2009;23(7):2025-32. **PMID 19855326**. doi 10.1519/JSC.0b013e3181b86735
- Andreacci JL et al. *Res Q Exerc Sport* 2013;84(1):88-95. **PMID 23611012**. doi 10.1080/02701367.2013.762314
- Matthews EL, Hosick PA. *Appl Physiol Nutr Metab* 2019;44(10):1116-20. **PMID 30998857**. doi 10.1139/apnm-2019-0106
- Saunders MJ et al. *Med Sci Sports Exerc* 1998;30(6):885-92. **PMID 9624647**. doi 10.1097/00005768-199806000-00017
- Wang Z et al. *Am J Clin Nutr* 1999;69(5):833-41. **PMID 10232621**. doi 10.1093/ajcn/69.5.833
- Norman K et al. *Clin Nutr* 2012;31(6):854-61. **PMID 22698802**. doi 10.1016/j.clnu.2012.05.008
- Fonti secondarie (Parziale): documentazione ESPHome `xiaomi_body_scale` (payload S400); repository `dckiller51/bodymiscale` (`metrics/impedance.py`, `metrics/xiaomi_home.py`, issue #474); tabella di equazioni in PMC7230013 (per i coefficienti di Sun/NHANES III).
