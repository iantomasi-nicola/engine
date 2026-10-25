# Fonti verificate su PubMed (26/10/2026)

Regola: nessun coefficiente senza fonte primaria **letta** o test indipendente. Questa tabella dice cosa è stato letto davvero (abstract da PubMed E-utilities, PMID indicato) e cosa **no**. L'accesso a PubMed richiede che l'ambiente consenta `eutils.ncbi.nlm.nih.gov` (Settings dell'ambiente › Network access); senza, le verifiche non sono ripetibili.

| Parametro nel codice | Fonte primaria letta | Esito |
|---|---|---|
| BMR Ten Haaf (peso): 49,940 kg + 2459,053 m − 34,014 anni + 799,257 (M) + 122,502 kJ/die; (massa magra): 95,272 FFM + 2026,161 kJ | Ten Haaf & Weijs 2014, PLoS One, **PMID 25275434** (90 atleti ricreativi 18–35 anni, calorimetria indiretta) | **Coefficienti confermati** (÷ 4,184 = quelli in kcal del codice). Risultato chiave: **Harris-Benedict, WHO, Schofield, Mifflin e Owen < 50% di previsioni entro il 10% negli atleti**; Cunningham e le due equazioni nuove vanno bene. Quindi per un atleta 18–35 la scelta giusta è «Auto» o Ten Haaf, non Mifflin |
| Costo del passo: (3,85 + 5,97 V²/Ht) ml O₂/kg/min, 5 kcal/L, V = 1,3 m/s | Ludlow & Weyand 2016, J Appl Physiol, **PMID 26679617** | **Equazione confermata**; l'equazione ACSM usata prima **sottostimava** quasi tutti i 127 valori (SEE 4,5 contro 1,13). Nel codice: 0,606 kcal/kg/km per 1,8 m (prima 0,5) |
| Velocità di cammino libero 1,3 m/s | CADENCE-Adults (Tudor-Locke), J Behav Nutr Phys Act 2019, **PMID 30654810**: ≥ 100 passi/min ≈ 3 MET | Euristica coerente, **non una misura della tua velocità** |
| Energia per kg di peso perso: partizione di Forbes, 9.400 kcal/kg di grasso, 1.800 kcal/kg magro, C = 10,4 kg | Hall 2008, Int J Obes, **PMID 17848938** (la regola dei 7.700 kcal/kg **sovrastima** per chi ha poco grasso, vale sopra ~30 kg di grasso) | **Struttura confermata**; le tre costanti **non sono nell'abstract**: verificate solo per coerenza (a 30 kg di grasso il modello dà 7.444 ≈ regola dei 7.700, come dice l'abstract). Con 12 kg di grasso: 5.871 kcal/kg, non 7.000 |
| TEF = 10% | Westerterp 2004, Nutr Metab, **PMID 15507147**: dieta mista 5–15% del dispendio, più alta con molte proteine | **Confermato come valore centrale**; non è proteino-dipendente nel codice |
| Le kcal di un orologio non sono affidabili | Shcherbina 2017, J Pers Med, **PMID 28538708**: nessun polso sotto il 20% di errore, peggio camminando e con BMI alto | **Confermato**: per questo la taratura sul peso reale (v2) resta l'ultima parola |
| Modello dinamico peso–energia | Hall 2011, Lancet, **PMID 21872751** | Letto l'abstract (tempi di risposta lenti, adiposità): nessun coefficiente usato |

## Non verificato (dichiarato)
- **Falcata = 0,415 × altezza**: approssimazione comune, nessuna fonte primaria letta.
- **«NEAT predefinito = giornata da 7.000 passi»**: ipotesi mia, nessuna fonte.
- **Costo della corsa 1,0 kcal/kg/km** e MET dei vari sport: non riverificati in questa sessione.
- **Cunningham (500 + 22 FFM)**: formula non letta, non implementata.
- **O'Neill 2023** (revisione sulle equazioni di BMR negli atleti): non riletta.
- **Peso della taratura (prior 0,08, ±100 kcal/settimana)**: scelte progettuali, non da letteratura.
