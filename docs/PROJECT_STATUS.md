# Stato del progetto e verifica iniziale

Data: 23 ottobre 2026 (Europe/Rome). Stato della presa in carico: analisi e preparazione
completate; runtime applicativo invariato; difetti elencati sotto ancora aperti.

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
