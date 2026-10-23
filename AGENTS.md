# Regole permanenti per gli agenti

Queste regole valgono per tutta la repository. Leggere anche `README.md`,
`docs/ARCHITECTURE.md`, `docs/PROJECT_STATUS.md` e i documenti pertinenti prima di lavorare.

## Metodo di lavoro

- Tradurre la richiesta in comportamento atteso, criteri di accettazione e verifiche.
  Procedere autonomamente con analisi, implementazione e correzioni nel perimetro richiesto.
- Chiedere chiarimenti solo quando una decisione irrisolta blocca lavoro utile o serve
  autorizzazione per operazioni protette. Comunicare risultati, limiti e problemi reali.
- Conservare eventuali `CLAUDE.md`, `.claude/` e altre istruzioni preesistenti;
  leggerle se presenti. Non cancellarle né sostituirle con questo file.
- Usare il checkout esistente: ogni task cloud è già isolato. Non creare worktree
  salvo richiesta esplicita. Non introdurre refactoring estranei al compito.

## Git, versionamento e rollback

- Prima di modificare file: controllare branch, HEAD, diff, file non tracciati e istruzioni.
  Non sovrascrivere, scartare, includere nei propri commit o nascondere in stash modifiche
  dell'utente senza comprenderne provenienza e autorizzazione.
- Non lavorare direttamente su `main`. Usare branch dedicati `feat/`, `fix/`, `chore/`
  o `docs/`; per modifiche importanti aprire un branch separato dalla base concordata.
- Prima di cambiamenti importanti creare un tag annotato `restore/<scopo>-<data>`
  su un commit noto. Un tag non protegge file non committati né dati dell'applicazione:
  preservare separatamente tali elementi prima di procedere.
- Commit atomici, descrittivi, con un solo scopo e file selezionati esplicitamente.
  Preferire `docs:`, `test:`, `fix:`, `feat:`, `chore:`. Verificare il diff staged.
- Non riscrivere la cronologia condivisa, forzare push, cancellare branch/tag, eseguire
  reset distruttivi, deploy o merge su main senza autorizzazione esplicita.
  Non pubblicare su remoto senza una richiesta che lo comprenda.
- Aggiornare `CHANGELOG.md` per modifiche rilevanti. Non inventare release già pubblicate.
  Quando sarà autorizzata una release, usare versionamento semantico e tag `vX.Y.Z`;
  il timestamp della build attuale identifica la cache, non una release semantica.
- Preferire rollback tramite commit inverso su un branch dedicato; analizzare dipendenze
  tra commit e proteggere il lavoro locale. Il rollback dei dati richiede una procedura
  distinta. Vedere `docs/DEVELOPMENT.md`.

## Qualità e architettura

- Modificare i sorgenti in `source/`; `index.html` e `sw.js` alla radice sono output
  versionati. Non correggere manualmente solo il minificato.
- Per verificare, compilare fuori dal checkout: il build senza argomento sovrascrive
  file tracciati. Rigenerare output di pubblicazione solo nel perimetro concordato.
- Conservare compatibilità offline, contratti di storage, identificativi e formati
  di import/export. Limitare il diff e mantenere coerenza con lo stile circostante.
- Gestire esplicitamente errori, input esterni e casi limite; non occultare errori
  per ottenere test verdi. Nessun aggiornamento massivo di dipendenze non richiesto.

## Sicurezza e dati

- Nessun segreto nei commit, log, screenshot, fixture o documenti. La publishable key
  Supabase è pubblica; service-role key, API key personali e VAPID privata non lo sono.
- Non usare account, chiavi, foto, backup o dati di produzione per test automatici.
  Usare profili browser temporanei, fixture sintetiche e servizi simulati.
- Le integrazioni possono scrivere automaticamente su servizi remoti: abilitarle
  in test solo con destinazioni di prova e autorizzazione adeguata.
- Prima di modificare dati persistenti o schemi: inventario dei dati e dei proprietari,
  backup verificato, prova di ripristino isolata, migrazione versionata con precondizioni,
  compatibilità vecchio/nuovo client, piano di ritorno e criteri di arresto.
  Non considerare sufficiente un messaggio UI di backup riuscito.
- Non cancellare storage, svuotare code, riassegnare dati tra account o applicare SQL
  a un progetto remoto durante una semplice verifica. Non disabilitare RLS, TLS,
  checksum o controlli di autenticazione per far funzionare un test.
- Verificare isolamento per account, escaping HTML, autorizzazione e minimizzazione
  dei dati quando si toccano autenticazione, sincronizzazione, AI o importazioni.

## Test e completamento

- Ogni nuova funzionalità deve avere test dei comportamenti principali e dei casi
  di errore pertinenti, oltre a un rollback praticabile. Riprodurre i bug prima di correggerli.
- Eseguire la build e le verifiche proporzionate alla modifica; per UI/persistenza
  verificare nel browser il risultato e il reload, non soltanto la presenza di elementi.
- Se si modifica la sincronizzazione: coprire offline/online, retry, account diversi,
  conflitti e cancellazioni. Per migrazioni: coprire upgrade e recupero su copie dei dati.
- Dichiarare distintamente verifiche superate, fallite, non eseguite e limitazioni.
  Non dichiarare successo per test mai eseguiti o con zero casi. Un difetto preesistente
  resta aperto finché una verifica pertinente dimostra la correzione.
- Prima del commit: diff, assenza di segreti/output accidentali, test pertinenti,
  `git diff --check`. Dopo: controllare stato Git e riferire gli hash.
- Registrare decisioni in `docs/DECISIONS.md`, priorità in `docs/ROADMAP.md`, evidenze
  e stato in `docs/PROJECT_STATUS.md`; aggiornare architettura quando cambia.
  La roadmap non autorizza automaticamente deploy, migrazioni o nuove funzionalità.
