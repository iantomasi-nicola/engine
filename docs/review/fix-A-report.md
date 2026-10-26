# M14b gruppo A: motore di sync + S-1 (report)

Ramo: `worktree-agent-ab375f64a7b1360dd` (locale; il push lo fa il coordinatore). Base: `17fddb7`.
Test: `tests/m14b-sync.test.js` (14 test) con Supabase finto in memoria condiviso da più contesti Chromium (`tests/lib/fake-supabase.js`). Usa lo shim.js reale e dati sintetici, senza rete; i toast sono letti dall'elemento `#toast` fin dall'avvio. **Sul codice di partenza falliscono tutti gli 11 test dei difetti**: la riproduzione è confermata. I 2 test S-1 falliscono prima della modifica S-1.

Esito finale: vedi la sezione «Esecuzione» in fondo.

| Voce | Stato | Test | Note / rischio residuo |
|---|---|---|---|
| area10 #1 unione per chiave | fatto | «merge rules», «#1 two devices» | Unione a tre vie (`merge3`/`syncMerge`, `ENGINE.merge`). Regole: per chiave, record con id per id, `jr` del giorno per tempo (`jrMergeDay`), ordine delle chiavi ignorato (`deq`). Prima di inviare un documento unibile (settings, body, shop, train, mesi di logm), lo shim legge la copia del server e la unisce con la `base` da cui la modifica è partita (`Sync.seen`). Due cause chiuse: (a) dopo un invio senza unione la base ora diventa ciò che è stato inviato (`onSent` → `syncSent`), quindi una cancellazione offline non ricompare; (b) una lettura completa (`loadAll`) partita prima di un invio non riporta più indietro lo stato locale: ciò che è cambiato durante la lettura (invii e aggiornamenti live) vince sulle pagine già lette, quindi un'aggiunta offline non si perde. Rischio: tra lettura e scrittura non c'è compare-and-swap, la finestra è di un giro di rete. |
| #2 flush a pagehide, locale più recente | fatto | «#2» | `flushNow` su pagehide/visibilitychange più `ENGINE.persist()`. Outbox `engine.dirty` (chiavi non ancora confermate dall'account, legata all'uid), salvata nello stesso task della modifica: al riavvio la modifica locale non viene sostituita e parte con l'unione. |
| #3 primo accesso con dati locali | fatto | «#3» | Unione con l'account (sui conflitti vince l'account); i giorni più vecchi di 180 si inviano solo se mancano (`pushIfMissing`). Il restore point «before sign-in» si salva prima di applicare l'unione ed è verificato in IndexedDB. Prima risultava assente solo per una questione di tempi del test. Ora `restorePoint` restituisce l'esito e il toast lo dice: se il salvataggio fallisce l'utente lo vede. Le chiavi del dispositivo non entrano nell'account (verificato). |
| #4 + area11 #3 cambio account | fatto | «#4» | `engine.owner`, coda `engine.q.<uid>` (la vecchia `engine.q` è adottata solo se il dispositivo non ha dati di altri account), `claimLocal`. Un altro account riparte dai propri dati e non riceve nulla, chiavi comprese; le modifiche non inviate del primo passano nella sua coda (`ENGINE.stash`). Al sign-out ciò che aspetta parte prima (al massimo 4 s). Rischio: le foto in IndexedDB del primo account restano sul dispositivo. |
| #5 scritture in massa | fatto | «#5» (1500 put: copia locale scritta 1 volta, < 1,5 s) | `put` salva una volta per task (`saveSoon`, microtask). La coda dello shim si salva con debounce di 250 ms, più un salvataggio sincrono a pagehide. Lo shim non notifica più le scritture locali. Copre il ripristino senza toccare `rs-go`, quindi non serve una `putMany` separata. |
| #6 errore permanente | fatto | «#6» | Un 4xx (esclusi 401/408/429) mette da parte quella modifica: la coda prosegue, compare un solo toast e la modifica viene riprovata una volta per sessione. Non c'è ancora il conteggio in Settings › Account. |
| #7 pillola dalla coda | fatto | «#7» | `syncState()` legge `ENGINE.status()` e `Sync.pending`. All'avvio offline non mostra più «Synced»; dopo lo svuotamento della coda torna «Synced». |
| #8 LS pieno + snapshot ridotto | fatto | «#8» | Avviso unico se la coda non si salva. Lo snapshot esclude i giorni più vecchi di ~182. Il testo di `saveLocal` non dice più «kept in your account» quando si è offline. |
| #24 refresh | fatto | «#24» | `refresh()` al ritorno in primo piano (al massimo ogni 10 s) e quando torna la rete. |
| #9 paginazione | fatto | «#9» (server a 300 righe per pagina) | Keyset `.order("path").gt("path", last).limit(1000)` fino alla pagina vuota (+1 richiesta). |
| S-1 chiavi locali | fatto | «S-1 keys stay on the device», «S-1 migration» | Le chiavi (`intervals.key`, `mapKey`, `ai.key`, `ai.services[].key`; nessun altro token in settings, verificato con grep) restano in memoria in `S.settings`, perché tutto il codice le legge lì, e su disco solo in `engine.keys` (`{ uid o "": chiavi }`). Non finiscono nel documento settings sincronizzato, nella copia locale, nello snapshot, nella coda o nei restore point. Migrazione silenziosa: le chiavi trovate nella copia dell'account passano nell'area del dispositivo e vengono tolte dal documento; quelle di una vecchia copia locale passano all'area al primo salvataggio. Gli altri dispositivi vedono i campi vuoti. Il backup su file ha le chiavi solo se richiesto, come prima. Testi aggiornati: «The key stays on this device (add it on each device)». |

## Altro cambiato
- `onSnapshot` dello shim ora segnala come `fromCache` i dati presi dalla copia sul dispositivo: prima risultavano arrivati dal server. Le pulizie una tantum (`dataReady`) aspettano quindi davvero il server.
- Eliminati i rami morti di `flush()` (`unavailable`/`quota_exceeded`) e `revoked` di `subscribe()` (area10 #20), `Sync.inflight`, `Sync.retry` e `isPending`.

## Rischi residui
- **Nessun compare-and-swap**: tra la lettura del server e la scrittura resta una finestra di un giro di rete.
- **AI su un altro dispositivo**: un servizio AI senza chiave non ha un campo per reinserirla; si aggiunge di nuovo il servizio, e la voce senza chiave resta in elenco.
- **Ripristino e `mapKey`**: il ripristino di un restore point o di un file senza `mapKey` la toglie anche dal dispositivo (area10 #17: va aggiunta a `keepKey` in `rs-go`, gruppo ripristino).
- **Più schede aperte** sullo stesso dispositivo non sono state provate.

## Esecuzione
(compilata a fine verifica)
