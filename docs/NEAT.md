# Come l'app calcola il NEAT (e come tararlo con poco sforzo) — 26/10/2026

NEAT = dispendio totale − metabolismo basale − effetto termico del cibo − allenamento (definizione di Levine, PMID 14692603). Nell'app: `neat` di `energySeries`, per ogni giorno, con questa **catena di priorità** (la provenienza è mostrata in «Today's energy» e nel check-in):

1. **Orologio** (`neatSrc = "watch"`): se nel check-in hai digitato la AEE giornaliera dell'orologio (Settings › Energy model › «Watch daily kcal» dice che numero è: *Active*, *NEAT only* o *Total*). NEAT = AEE − la quota di allenamento **netta del riposo** (l'«active» non contiene il riposo; le kcal «Total» di una sessione sì). Si usa solo se ≥ «Min watch NEAT» (150).
2. **Passi con base appresa** (`"steps"`): se non c'è la AEE ma ci sono i passi **e** nei 90 giorni precedenti ci sono ≥ 14 giorni con AEE e passi (senza corsa o camminata): NEAT = costo dei passi di oggi + **base** = mediana di (NEAT dell'orologio − costo dei passi) di quei giorni. La base è il tuo movimento non misurato dai passi (postura, lavoro).
3. **Passi con riferimento** (`"stepsRef"`, nuovo): senza base appresa, il NEAT predefinito (350, modificabile) vale per una giornata da `neatRefSteps` passi (**6.540** = media degli adulti USA in NHANES 2005–06, Tudor-Locke 2009, PMID 19516163; prima era un mio 7.000); NEAT = costo dei passi di oggi + (350 − costo dei 7.000 passi). Oggi i passi sono una **proiezione** (`"stepsRefProj"`): passi finora + mediana degli ultimi 14 giorni × quota di giornata rimasta (7–22 h).
4. **Media recente** (`"avg"`): media dei NEAT degli ultimi 7 giorni (include valori già stimati: si auto-rinforza). **Predefinito** (`"default"`) se non c'è niente.

Costo dei passi: kg × km × k(altezza), con km = passi × 0,415 × altezza e k dall'equazione di Ludlow & Weyand 2016 (PMID 26679617) a 1,3 m/s: 0,606 kcal/kg/km a 1,8 m. Giorni con **corsa o camminata** non usano i passi (i passi dell'allenamento sarebbero contati due volte): restano su 1 o 4.

## Quanto è «ostico» tararlo
- La parte **ignota** del NEAT è la base (punto 2/3). Levine mostra che il NEAT varia molto tra persone: nessun valore di letteratura vale per te.
- **Modo a zero sforzo**: lascia tutto com'è e fai lavorare la **calibrazione sul peso** (Settings › Calibration): corregge l'errore sistematico di BMR + NEAT + allenamento insieme (fattore moltiplicativo).
- **Modo preciso**: digita la AEE dell'orologio per ~14 giorni (10 secondi al giorno): l'app impara la tua base (punto 2) e smette di usare l'ipotesi dei 7.000 passi.
- **Se sai già il tuo NEAT tipico**: cambia «Default NEAT» e «Default NEAT equals» (i passi di quella giornata tipica).
- Prima verifica con la prova del giorno di riposo: se l'orologio mostra poche centinaia = *Active*, oltre 2.000 = *Total*; se «Watch daily kcal» è sbagliato, il NEAT è sbagliato.
