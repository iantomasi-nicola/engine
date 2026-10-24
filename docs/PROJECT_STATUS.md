# Stato del progetto

## Integrazione per main — 24 ottobre 2026

L'utente ha autorizzato merge, commit, push e pubblicazione sul sito Pages esistente.
L'integrazione preserva il commit remoto `02f43a9`, risolve la sovrapposizione sulla
dispensa e corregge due problemi di avvio/finestre emersi verificando quel sorgente.
Riferimenti, procedura di verifica remota e rollback in
[PUBLICATION_M1.md](PUBLICATION_M1.md). La sezione M1 sottostante descrive il checkpoint
prima dell'autorizzazione alla pubblicazione, quindi i suoi riferimenti “locali” sono storici.

## M1 Storage/Shopping — aggiornamento del 23 ottobre 2026

Implementazione sul branch `fix/storage-shopping-m1`, con checkpoint precedente
`restore/pre-storage-shopping-m1-2026-10-23` (`f88c1e0`). Il resoconto tecnico e il
rollback dati sono in [M1_STORAGE_SHOPPING.md](M1_STORAGE_SHOPPING.md).
Commit requisiti/perimetro: `5d62145`; implementazione, test e output: `f4c1c90`.

Introdotti dominio inventario puro, fabbisogno alimenti/ricette meno scorte,
ricevute di consumo, acquisti/annullamenti coerenti, quantità e prezzi espliciti,
ricerca/ordinamento e backup verificato prima delle transazioni locali inventario.
Compatibilità legacy conservativa; nessuna formula nutrizionale o integrazione nuova.

**Milestone completata e verificata localmente.** Checkpoint annotato
`checkpoint/storage-shopping-m1-2026-10-23`. Nessun dato reale o schema remoto
modificato; nessun push, deploy o merge. Le milestone successive non sono iniziate.

| Verifica finale eseguita | Esito | Limite |
| --- | --- | --- |
| Build minificata esterna, ID `202610232021` | Superata; `index.html` e `sw.js` copiati alla radice e confrontati | Timestamp, toolchain esterna; manifest identico, config preservato |
| `node --test tests/inventory/domain.test.cjs` | 23 superati, 0 falliti | Dominio puro su fixture |
| `tests/inventory/browser.cjs` sulla build | 51 superati, 0 falliti: 17 scenari × 3 viewport | Chromium, dati sintetici, richieste esterne bloccate |
| `tests/handover/smoke.cjs` sugli output finali alla radice | Superato | Avvio locale, peso/reload, 5 tab, service worker, offline, nessuna eccezione JS |
| Sintassi build e 5 script web | 6 controlli superati | Sintassi soltanto |
| `tests/handover/queue-isolation.cjs` | Fallito, exit 1: `DATA-01` confermato | Difetto preesistente, non mascherato né corretto in M1 |
| Diff whitespace | Superato | Non sostituisce i test di comportamento |

Prima delle correzioni i tre riproduttori browser sulla baseline hanno fallito come
atteso. La revisione ha inoltre riprodotto e corretto tre casi di ripristino delle
ricevute (consumo parziale dopo acquisto, legacy, scorta insufficiente). Le prove UI
coprono anche errore quota/backup, recupero mirato e reload, mancato accodamento cloud
dopo un errore e ricezione coerente di due documenti tramite adapter simulato.
Verificata anche la visualizzazione di `0.4×` confezioni per 200 g su una confezione da 500 g.

Non eseguiti: account/RLS Supabase reali, retry/conflitti multi-device, restore cloud,
Safari/iOS, dispositivi fisici e servizi esterni. I dettagli storici sotto non vanno
interpretati come test aggiuntivi dell'ultima build.

`DATA-01` resta riprodotto: il test coda invia il dato sintetico di A con UID di B.
`DATA-02` è mitigato per l'inventario e reso visibile da `saveLocal`, non risolto per
tutti i flussi legacy/shim. `DATA-03`, `PUSH-01`, toolchain/CI e test cloud reali
restano aperti. La suite M1 amplia `TEST-01` senza certificare il prodotto intero.

Raccomandazione: correggere l'isolamento account su intervento separato, poi verificare
restore generale e sync multi-device su ambiente dedicato prima di un nuovo rilascio.

## Rapporto storico della presa in carico

Data: 23 ottobre 2026 (Europe/Rome). Stato della presa in carico: analisi e preparazione
completate; runtime applicativo invariato in quella fase. Le evidenze sottostanti sono
storiche; per le mitigazioni M1 fa fede l'aggiornamento sopra.

## Provenienza e protezione

- Checkout `/workspace/engine`, branch iniziale `work`, stato pulito anche per file non tracciati.
- HEAD iniziale `cae350d409daa68d01f0031298d9de9eff3464c7`, uguale al riferimento locale
  `origin/main`; cronologia non shallow, 49 commit disponibili, datati 22 ottobre 2026.
- Nessun tag preesistente e nessuna release deducibile da tag.
- Ricerca nel checkout, nelle directory antenate accessibili e nei nomi file della
  cronologia locale: nessun `CLAUDE.md`, `.claude/` o `AGENTS.md` precedente trovato.
  Non sono stati rimossi o sostituiti file di istruzioni Claude. Il contratto runtime
  `claude.use()` e le sostituzioni del build sono stati preservati.
- Creato il tag annotato `restore/pre-codex-handover-2026-10-23` sulla baseline e il
  branch `chore/codex-handover-2026-10-23`. Nessun aggiornamento di `main`, push o deploy.
- Nessun dato reale, servizio remoto o schema modificato. Solo fixture e profili temporanei.

La ricerca locale non dimostra l'assenza di istruzioni su altri computer, in file ignorati
non trasferiti o in riferimenti remoti non disponibili. I messaggi storici che citano
test/audit non forniscono risultati riproducibili; non sono stati contati come test passati.

## Evidenze di validazione

| Verifica eseguita | Esito | Limite |
| --- | --- | --- |
| Build minificata dai sorgenti con toolchain documentata | Superata, exit 0, output esterno `engine-handover-site` | Non bit-riproducibile per timestamp e toolchain non versionata nel progetto |
| `node --check` su build e quattro script web principali | 5 controlli superati | Sintassi, non comportamento completo |
| Smoke Chromium sulla build appena generata | Superato | Profilo temporaneo, modalità locale |
| Smoke Chromium sui file tracciati alla radice | Superato | Stessi flussi locali, non verifica equivalenza completa col build |
| Regressione isolamento coda `tests/handover/queue-isolation.cjs` | Fallita, exit 1; difetto riprodotto | Client Supabase simulato, nessun test account remoto |
| Controllo whitespace del diff | Superato | Non sostituisce revisione semantica |

Ogni esecuzione smoke verifica login locale, inserimento di un peso sintetico `72.5`,
persistenza dopo reload, tab Train/Fuel/Progress/Settings/Today, service worker attivo,
ricarica offline e nessuna eccezione JavaScript non gestita. Si tratta di un singolo
scenario browser con più verifiche, non di una suite completa del dominio.

La baseline non contiene package manifest, lockfile, test runner, suite o workflow CI
versionati. Il precedente smoke di onboarding era esterno alla repository; è stato
adattato e versionato in `tests/handover/` durante questa fase.

Non eseguiti: login/sync su Supabase reale, isolamento RLS remoto, push/Deno, provider AI,
ICU, OCR/camera, GPS, export XLSX, restore completo, stress quota storage, Safari/iOS
e altri browser. Nessuna attestazione di audit completo di sicurezza o dipendenze.

## Problemi e rischi già presenti

| ID | Priorità e stato | Evidenza e impatto |
| --- | --- | --- |
| DATA-01 | Alta, riprodotto con mock | `source/web/shim.js`: `engine.q` è globale, senza UID negli elementi; `flushQ()` usa `E.uid`. Il test carica un elemento sintetico di A e connette B: l'upsert usa B e svuota la coda. Possibile contaminazione dei dati tra account sullo stesso browser. RLS non corregge questa attribuzione lato client. |
| DATA-02 | Alta, rilevato staticamente | `saveLocal()` in `source/engine.html` e `LS.set()` nello shim ignorano eccezioni storage. Un errore quota/accesso può lasciare l'interfaccia aggiornata senza persistenza durevole. Non simulato in questa fase. |
| DATA-03 | Alta, rilevato staticamente | `restorePoint()` cattura e ignora errori; `ACT['rs-go']` attende la funzione ma poi prosegue col restore. Un backup preventivo fallito non arresta le scritture. Nessun restore di dati reali eseguito. |
| TEST-01 | Alta, confermato dall'inventario | Assenza di suite storiche e CI versionate. Le verifiche introdotte qui coprono una piccola parte del prodotto. |
| BUILD-01 | Media, confermato | Dipendenze/versioni build e runtime non fissate nella repository. Lockfile presente soltanto nell'ambiente esterno; output con timestamp e sostituzioni testuali sensibili alla struttura sorgente. |
| PUSH-01 | Media, rilevato staticamente | `supabase/functions/engine-push/index.ts` aggiorna `sent_at` anche dopo errori transitori di invio; non si vede un claim atomico prima dell'elaborazione. Possibili notifiche perse o duplicate; da verificare con test isolati. |
| DOC-01 | Bassa, risolto in questa fase | Il README dichiarava i sorgenti fuori repository e subito dopo documentava `source/`. Indicazione corretta senza cambiare codice. |

Ulteriori aspetti da approfondire: conflitti tra documenti cloud scritti da più dispositivi,
provenienza/licenze/versioni degli asset vendor, chiavi nelle impostazioni e nei restore
point, invalidazione cache degli asset pesanti. Sono aree di verifica, non vulnerabilità
dimostrate da questa analisi.

## Stato del lavoro e riferimenti

- Documentazione: `AGENTS.md`, `CHANGELOG.md`, `docs/ARCHITECTURE.md`,
  `docs/DECISIONS.md`, `docs/DEVELOPMENT.md`, `docs/ROADMAP.md` e questo rapporto;
  README aggiornato con indice e build sicura.
- Verifiche: `tests/handover/smoke.cjs` e `tests/handover/queue-isolation.cjs`.
- Cronologia del passaggio di consegne: `git log --oneline restore/pre-codex-handover-2026-10-23..HEAD`.
  Gli hash risultanti sono riportati nel resoconto finale; questo documento evita riferimenti
  circolari al proprio commit.
- Prossima azione raccomandata: correggere `DATA-01` su branch dedicato, progettando
  prima backup e trattamento della coda legacy. Non attribuire automaticamente i dati
  senza proprietario al primo account che accede.

L'ambiente consente sviluppo e test locali. La presenza del difetto di isolamento e
delle verifiche cloud mancanti impedisce di dichiarare il prodotto completamente
validato per tutti i flussi o pronto per un nuovo rilascio senza ulteriori controlli.
