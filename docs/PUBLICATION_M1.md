# Integrazione M1 e pubblicazione GitHub Pages

24 ottobre 2026, Europe/Rome. L'utente ha autorizzato esplicitamente merge su `main`,
commit, push e aggiornamento del sito esistente. L'anteprima separata non è più il
percorso scelto; non è stata creata una repository di anteprima.

## Riferimenti

- Sito: https://iantomasi-nicola.github.io/engine/
- Pages: pubblicazione dalla radice di `main` (configurazione esistente conservata).
- Main precedente: `02f43a9289f9a014e6f3d74f89fe024f87c89178`.
- Tag di recupero: `restore/pre-m1-publish-2026-10-23`, creato prima dell'integrazione.
- M1 originale: `checkpoint/storage-shopping-m1-2026-10-23` (`cb90627`).
- Risultato integrato: `checkpoint/storage-shopping-m1-main-2026-10-24`.

Il commit remoto `02f43a9`, pur chiamato “Improve project documentation”, modifica
il sorgente applicativo. Il merge ne conserva navigazione, check-in, strumenti,
pianificazione e le altre modifiche non sovrapposte. Le modifiche scientifiche già
presenti in quel commit non sono un nuovo intervento M1 né un audit delle formule.

## Risoluzione e verifiche

La dispensa integra la ricerca per marca/alias e il raggruppamento per categoria
del main remoto con ricerca tollerante, ordinamenti persistenti e contabilità M1.
Le quantità della lista conservano la precisione M1.

Sono stati riprodotti e corretti due problemi del sorgente remoto prima del rilascio:
registrazioni di gestori `INP` prima dell'inizializzazione del registro, che impedivano
l'avvio, e completamento dell'animazione di una vecchia finestra che rimuoveva quella
nuova. Le animazioni sono conservate, limitando la pulizia alla finestra chiusa.

Comandi di verifica, sulla build esterna servita a `localhost:8017`:

```bash
node --test tests/inventory/domain.test.cjs
ENGINE_TEST_URL=http://localhost:8017 NODE_PATH=/workspace/engine-tools/node_modules \
  node tests/inventory/browser.cjs
ENGINE_TEST_URL=http://localhost:8017 NODE_PATH=/workspace/engine-tools/node_modules \
  node tests/inventory/release-integration.cjs
ENGINE_TEST_URL=http://localhost:8017 NODE_PATH=/workspace/engine-tools/node_modules \
  node tests/handover/smoke.cjs
```

Il test di integrazione verifica ricerca per marca/alias, categorie persistenti,
preferenza della sidebar dopo reload e protezione della finestra appena aperta.
I test usano dati sintetici, profili temporanei e nessun account reale.

Esito prima del push: build `202610240814`, 23 test di dominio, 51 controlli browser
su tre viewport, 3 controlli di integrazione e smoke locale/offline superati.
Il riproduttore `tests/handover/queue-isolation.cjs` è stato rieseguito: fallisce
ancora con il difetto preesistente `DATA-01`, distinto dai controlli superati.

Prima del push: build minificata, suite sopra, controllo diff e copia degli output
verificati `index.html`/`sw.js`. Dopo il push: verificare il commit di main, lo stato
del build Pages e la corrispondenza del contenuto HTTP con gli output inviati.
Un push riuscito da solo non prova che Pages abbia terminato la pubblicazione.

## Recupero e limiti

Per preparare un rollback usare un nuovo branch e il tag di recupero; conservare il
risultato integrato e ogni modifica successiva. Non forzare main né riscrivere la
cronologia. Gli output precedenti sono inclusi nel tag, anche se il sorgente remoto
precedente conteneva problemi che ne impedivano una nuova build funzionante.

Il recupero del codice non recupera i dati: seguire la procedura in
[M1_STORAGE_SHOPPING.md](M1_STORAGE_SHOPPING.md#backup-e-ritorno-alla-versione-precedente).
Il backup M1 viene verificato dal client prima delle nuove scritture inventario;
nessuna migrazione SQL o modifica diretta ai dati reali è parte di questo deploy.
Restano aperti `DATA-01`, restore generale e verifiche cloud multi-device.
