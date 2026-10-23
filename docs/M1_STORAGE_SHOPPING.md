# M1 — Integrità Storage/Shopping

Milestone autorizzata il 23 ottobre 2026, branch `fix/storage-shopping-m1`.
Il perimetro e i criteri approvati sono in [ROADMAP.md](ROADMAP.md); i requisiti
originali sono conservati in [PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md).
Storage indica la dispensa alimentare. Nessuna milestone successiva è stata avviata.

## Comportamento implementato

| Operazione | Giacenza reale | Piano e lista della spesa |
| --- | --- | --- |
| Aggiungere/modificare un pasto pianificato | Invariata | Fabbisogno aggregato per alimento, incluse porzioni/ingredienti delle ricette |
| Mostrare un intervallo di spesa | Invariata | Fabbisogno meno scorte non scadute, prima riservate ai pasti precedenti da oggi; mai doppia sottrazione |
| Marcare un pasto mangiato | Sottrae solo quanto disponibile | Memorizza `stockUsed` con il prelievo effettivo; il pasto esce dal fabbisogno futuro |
| Annullare/modificare un consumo M1 | Restituisce il prelievo registrato, poi applica l'eventuale nuovo consumo | Non inventa quantità quando la scorta iniziale era insufficiente |
| Annullare la rimozione di un pasto consumato | Riapplica la ricevuta originale, senza aumentarla dopo nuovi acquisti | Blocca il ripristino se le scorte non consentono di riapplicare quella ricevuta |
| Spuntare direttamente un acquisto | Aggiunge la quantità acquistata | Registra acquisto con prezzo stimato; aggiorna subito la copertura |
| Preparare il carrello | Invariata fino a Finish | Quantità/prezzo effettivi modificabili; Finish registra una sola volta |
| Annullare un acquisto | Sottrae soltanto quel movimento | Conserva acquisti successivi; blocca l'annullamento se la giacenza non basta |
| Rimuovere dalla dispensa e annullare | Ripristina solo la quantità rimossa | Conserva eventuali acquisti e metadati aggiunti nel frattempo |

Gli articoli completamente coperti sono nella sezione richiudibile; copertura parziale,
riserve precedenti, scadenza ed esaurimento previsto sono visibili. Le confezioni
intere arrotondano sempre verso l'alto: 501 g con confezioni da 500 g richiedono 2 confezioni.
I prodotti sfusi mantengono la quantità necessaria.

Dispensa: ricerca tollerante a un errore di battitura, ordinamento scadenza/A–Z/Z–A e
preferenze persistenti. Quantità base con precisione di 0,001 g/ml; confezioni e pezzi
usano dimensioni esplicite, con frazioni come `1/2` e `1/3`. Conversioni solo nella
stessa dimensione; cucchiai per alimenti solidi richiedono un peso noto. Nessuna
conversione implicita g↔ml. I prezzi hanno una quantità di riferimento modificabile;
prezzo sconosciuto e prezzo zero sono distinti. Non sono cambiate formule nutrizionali.

## Architettura e compatibilità

`source/web/inventory.js` contiene il dominio puro, usato sia dal browser sia dai test
Node. Il build lo incorpora prima dello shim e dell'applicazione; non aggiunge servizi
o dipendenze runtime. `source/engine.html` mantiene UI, coordinamento e persistenza.

La transazione locale inventario raccoglie `shop` e `days`, verifica un backup, applica
la modifica e salva un unico snapshot `fuelplanner.v1` con rilettura. Solo dopo questo
successo accoda i documenti cloud. Un errore ripristina i due oggetti in memoria e
mostra un avviso persistente, senza accodare la modifica fallita. Gli annullamenti
rifiutati non mostrano una conferma di successo.

La prima scrittura inventario imposta `shop.inventoryV = 1`. Campi nuovi additivi:
`stockUsed` sugli elementi consumati, `transactionId` su acquisti/prezzi e preferenze
`shop.view`. Nessuna riscrittura massiva all'avvio, modifica SQL o migrazione remota.
Campi legacy e metadati dispensa sconosciuti restano conservati; i vecchi flag `pan`
non determinano più la copertura. Le operazioni pianificate copiate non ereditano
ricevute di consumo.

Un consumo storico senza `stockUsed` non ha un inverso verificabile: modificarlo,
rimuoverlo o smarcarlo non restituisce quantità ipotetiche né consuma due volte.
La scheda di modifica lo spiega. Un nuovo consumo successivo registra il proprio
prelievo. Eventuali scorte storicamente errate vanno corrette dopo verifica fisica.

## Backup e ritorno alla versione precedente

Prima della prima nuova operazione, il client crea
`engine.inventory.backup.v1.<uid>` oppure `engine.inventory.backup.v1.local`, con
`version`, `scope`, data, `shop` e `days`. La scrittura è riletta e confrontata; un
backup già presente viene validato e conservato. Backup assente/non verificabile
blocca l'operazione. È un checkpoint iniziale locale, non un backup periodico né una
copia esterna; può occupare spazio significativo con uno storico esteso.

- Codice precedente: tag annotato `restore/pre-storage-shopping-m1-2026-10-23`
  su `f88c1e0`, prima anche della registrazione dei requisiti M1.
- Checkpoint completato: tag annotato `checkpoint/storage-shopping-m1-2026-10-23`.
- Tutti i riferimenti sono locali; non è stato eseguito push, merge o deploy.

Procedura per il codice, con checkout pulito e dopo aver preservato eventuale lavoro:

```bash
git status --short --branch
git switch -c recovery/storage-shopping-m1 restore/pre-storage-shopping-m1-2026-10-23
```

Il branch M1 resta intatto. Per un rollback condiviso preferire un branch dedicato e
revert dei commit applicativi selezionati, verificando sorgenti e output insieme.
Non eseguire reset distruttivi. Il tag precedente contiene anche gli output precedenti.

Il ritorno del codice **non ripristina i dati**. Prima di usarlo sullo stesso profilo:

1. Salvare esternamente una copia dello stato corrente, del checkpoint inventario e
   degli altri dati applicativi; verificare account/origine, versione e contenuto.
2. Provare il recupero su un profilo isolato, senza sync e senza altre schede/dispositivi
   scriventi. Non usare contemporaneamente vecchio e nuovo client sul medesimo dataset.
3. Ripristinare soltanto `shop` e `days` dal checkpoint corrispondente dentro lo snapshot
   applicativo, conservando gli altri campi. Verificare salvataggio e reload prima di
   aprire la versione precedente. Questo riporta acquisti e piani al momento del backup:
   riconciliare separatamente le operazioni successive, senza perderne la copia.
4. Per dati sincronizzati serve un piano approvato per documenti remoti e coda offline;
   la sola copia locale può essere sovrascritta al prossimo sync. Non usare il restore
   generale come garanzia automatica: `DATA-03` rimane aperto.

Il test browser esercita il recupero mirato su fixture locale e verifica il reload.
Nessun backup/dato reale dell'utente è stato modificato o ripristinato durante lo sviluppo.

## Evidenze e criteri di accettazione

| Verifica | Evidenza |
| --- | --- |
| Riproduzione sulla baseline | 3 regressioni riprodotte: alimento già coperto ancora da comprare; ricetta non coperta parzialmente; annullamento che inventa scorta |
| Dominio | 23 test Node: copertura, ricette, riserve, scadenze, precisione, prelievi/ricevute, legacy, acquisti e annullamenti |
| Browser M1 | 51 controlli superati: 17 scenari su 390×844, 820×1180 e 1440×1000 |
| Integrazione | Carrello → dispensa → reload offline; pasti/ricette → consumi; adapter cloud simulato riceve giacenza e ricevuta coerenti |
| Errori e recupero | Quota snapshot, backup fallito, nessuna scrittura cloud dopo errore, recupero mirato e reload; annullamento rifiutato senza falsa conferma |
| Regressione generale | Smoke locale/offline e coda account, esiti distinti in PROJECT_STATUS.md |

Comandi ripetibili in [DEVELOPMENT.md](DEVELOPMENT.md). I criteri 1–6 sono coperti da
dominio/UI, 7–8 da reload/errori/recupero, 9 da tre viewport e integrazione simulata,
10 dai commit, output generati e tag locale. Le verifiche non attestano un rilascio.

## Limiti e problemi residui

- `DATA-01`: coda offline globale attribuita all'account corrente, riproduttore ancora
  fallente. Il nuovo backup per UID non risolve l'isolamento dello snapshot/coda generale.
- `DATA-02`: migliorati avvisi `saveLocal` e atomicità locale inventario; altre azioni
  legacy possono ancora lasciare stato in memoria dopo un fallimento. La persistenza
  dello shim non è stata riscritta. `DATA-03` e `PUSH-01` restano aperti.
- Il cloud scrive documenti separati, senza transazione distribuita né controllo dei
  conflitti multi-device. Retry, RLS, login reali e cancellazioni Realtime non certificati.
- Il modello mantiene una sola scorta/scadenza per alimento, non lotti distinti. Un
  acquisto conserva la scadenza esistente: una scorta scaduta resta esclusa finché
  l'utente verifica e aggiorna quantità/scadenza. Non si assume che tutto sia fresco.
- Undo acquisti controlla la quantità aggregata disponibile, non la provenienza dei
  singoli grammi; lo storico non è un registro per lotti. I prezzi stimati restano tali.
- Test in Chromium; nessuna prova su dispositivo fisico, Safari/iOS, servizi reali o
  ripristino cloud completo. Nessun intervento su recipe engine o flussi AI.

Raccomandazione successiva: intervento separato su `DATA-01`, seguito dal restore
generale e dalla matrice di test cloud, prima di un rilascio con account reali.
