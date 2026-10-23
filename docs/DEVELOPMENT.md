# Sviluppo, verifiche e rollback

## Ambiente verificato

Il 23 ottobre 2026 sono stati utilizzati Node `24.19.0`, Python `3.12.14`, Chromium
`154.0.8037.57`, Terser `5.51.2`, Lightning CSS `1.33.0` e Playwright `1.64.1`.
Queste versioni sono un riferimento verificato, non una matrice di compatibilità completa.

Nel cloud la toolchain è in `/workspace/engine-tools`, con manifest e lockfile esterni
alla repository. Se già presenti, reinstallare con `npm ci` e quel lockfile. Per un
nuovo ambiente senza tale directory, questa installazione blocca le dipendenze dirette
ma risolve da zero quelle transitive; la roadmap prevede un lockfile nel progetto:

```bash
mkdir -p /workspace/engine-tools
npm install --prefix /workspace/engine-tools \
  --cache /workspace/engine-tools/npm-cache --no-audit --no-fund --save-exact \
  terser@5.51.2 lightningcss@1.33.0 playwright@1.64.1
```

La cache dedicata evita di dipendere da una home scrivibile. Chromium deve essere
installato nel sistema; `CHROMIUM_PATH` consente di indicare un altro eseguibile.
Non disabilitare verifiche TLS o checksum durante l'installazione.

## Build e avvio locale

Dal checkout esistente:

```bash
cd /workspace/engine
git status --short --branch
NODE_MODULES=/workspace/engine-tools/node_modules \
  node source/build-web.js /workspace/engine-handover-site
python3 -m http.server 8011 --bind 127.0.0.1 \
  --directory /workspace/engine-handover-site
```

Eseguire il server in un terminale dedicato. Per le richieste interne e i test usare
`http://localhost:8011`, perché la registrazione del service worker su HTTP controlla
il nome `localhost`. Non creare link di anteprima localhost nell'interfaccia di onboarding.
I processi vanno riavviati dopo il ripristino dell'ambiente.

Non eseguire il build senza directory di output durante una semplice verifica: scrive
nei file tracciati alla radice. Non riutilizzare una directory di output con configurazione
personale senza controllarla: il build conserva un `config.js` già presente.

## Verifiche ripetibili

Con il server sopra attivo:

```bash
NODE_PATH=/workspace/engine-tools/node_modules node tests/handover/smoke.cjs
```

Lo smoke usa un profilo browser temporaneo e dati sintetici; blocca le richieste della
pagina fuori dall'origine locale. Verifica avvio locale, peso salvato e riletto dopo
reload, cinque tab, attivazione service worker, reload offline e assenza di eccezioni JS.
Il flag Chromium `--no-sandbox` è limitato a questo harness nell'ambiente cloud isolato.
Non usare il test per visitare siti arbitrari; l'URL deve avere hostname `localhost`.

Per controllare anche gli asset distribuiti alla radice, avviare un secondo server:

```bash
python3 -m http.server 8012 --bind 127.0.0.1 --directory /workspace/engine
```

In un altro terminale:

```bash
ENGINE_TEST_URL=http://localhost:8012 NODE_PATH=/workspace/engine-tools/node_modules \
  node tests/handover/smoke.cjs
```

Il seguente controllo esegue lo shim reale con storage e client Supabase simulati:

```bash
node tests/handover/queue-isolation.cjs
```

**Stato noto: fallisce sulla baseline (`DATA-01`, exit 1).** È una regressione che esprime
il comportamento sicuro atteso: la coda ereditata da un'altra sessione non deve essere
inviata con l'account attuale. Non invertirne l'asserzione e non nasconderne l'esito.
Non è una prova end-to-end di login/logout né usa il progetto remoto.

Per le verifiche sintattiche:

```bash
node --check source/build-web.js
node --check source/web/shim.js
node --check source/web/icu-direct.js
node --check source/web/after.js
node --check source/web/sw.js
git diff --check
```

Non esiste una suite storica versionata nella baseline; `tests/handover/` è stata
aggiunta durante la presa in carico. Lo smoke non sostituisce test di dominio,
integrazione cloud, migrazione o compatibilità mobile.

## Verifiche aggiunte da M1 Storage/Shopping

```bash
node --test tests/inventory/domain.test.cjs
NODE_MODULES=/workspace/engine-tools/node_modules \
  node source/build-web.js /workspace/engine-m1-site
python3 -m http.server 8014 --bind 127.0.0.1 --directory /workspace/engine-m1-site
```

Con il server attivo, in un altro terminale:

```bash
ENGINE_TEST_URL=http://localhost:8014 NODE_PATH=/workspace/engine-tools/node_modules \
  node tests/inventory/browser.cjs
ENGINE_TEST_URL=http://localhost:8014 NODE_PATH=/workspace/engine-tools/node_modules \
  node tests/handover/smoke.cjs
```

La suite inventario usa tre viewport Chromium, fixture sintetiche, reload offline,
errori storage e adapter cloud simulato. `ENGINE_SCREENSHOT_DIR` opzionale salva
screenshot in una directory esistente esterna al repository. `BASELINE=1` esegue solo
i tre riproduttori iniziali contro un server con la versione precedente: l'esito rosso
su quella versione è atteso, non è un comando di validazione della milestone.

Per aggiornare gli output versionati dopo verifica, copiare `index.html` e `sw.js`
dall'output testato; controllare separatamente il manifest e preservare `config.js`.
Backup, versione dati e rollback M1 sono descritti in
[M1_STORAGE_SHOPPING.md](M1_STORAGE_SHOPPING.md#backup-e-ritorno-alla-versione-precedente).

## Protezione dati e migrazioni future

Prima di una modifica ai dati reali, censire localStorage, IndexedDB, documenti cloud,
foto e coda offline interessati. Esportare copie in una destinazione protetta, verificare
contenuto e ripristino su un profilo/database isolato. Non registrare backup con segreti
o dati personali in Git. Per Postgres/Storage usare backup del progetto e degli oggetti
pertinenti: il JSON applicativo non copre automaticamente ogni risorsa.

Definire migrazione versionata, input supportati, precondizioni, controlli di integrità,
gestione di interruzioni e client offline, e procedura di ritorno. Se una migrazione
non è invertibile, il piano deve prevedere il recupero dalla copia verificata.
Non applicare SQL remoto o modificare dati persistenti reali senza il perimetro autorizzato.

## Punti di ripristino e commit

Baseline applicativa: `cae350d409daa68d01f0031298d9de9eff3464c7`.
Tag annotato: `restore/pre-codex-handover-2026-10-23`.
Branch di presa in carico: `chore/codex-handover-2026-10-23`.

Per ispezionare senza modificare il checkout:

```bash
git show --stat restore/pre-codex-handover-2026-10-23
git diff restore/pre-codex-handover-2026-10-23 HEAD
git log --oneline restore/pre-codex-handover-2026-10-23..HEAD
```

Per ripartire dalla baseline, dopo aver preservato eventuali modifiche locali, creare
un nuovo branch dal tag con `git switch -c recovery/<nome> restore/pre-codex-handover-2026-10-23`.
Questo lascia intatto il branch di lavoro. Per annullare cambiamenti condivisi, preparare
invece un branch di rollback e un `git revert` dei commit selezionati, dal più recente,
controllando diff e test prima del commit/pubblicazione. Non usare `reset --hard` o
`clean` come procedura ordinaria.

I tag e commit di questa fase sono locali, non pubblicati su GitHub. Un tag locale non
è una copia off-machine e non prova che una futura macchina lo ripristinerà. L'eventuale
push del branch/tag va autorizzato separatamente; nessun deploy o merge è implicito.
