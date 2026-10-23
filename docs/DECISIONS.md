# Registro delle decisioni

## ADR-005 — Inventario deterministico e ricevute di consumo (2026-10-23, adottata)

**Contesto:** alimenti già presenti comparivano negli acquisti; ricette e scorte parziali
non erano riconciliate; annullare un consumo insufficiente poteva creare quantità.
La richiesta autorizza M1 Storage/Shopping e la riconciliazione necessaria di M4.

**Decisione:** estrarre solo il dominio inventario in un modulo puro, condiviso tra
app e test. Il piano riserva ma non consuma; la spesa sottrae disponibilità una volta;
`stockUsed` registra il prelievo reale. Acquisti con ID e annullamenti per differenza
preservano operazioni successive. Nessuna conversione massa/volume senza dati.

**Dati:** backup verificato di `shop`/`days` prima delle scritture M1, versione additiva
alla prima operazione, snapshot locale unico prima del cloud. Conservare campi storici;
non inferire rimborsi o nuovi prelievi per consumi legacy privi di ricevuta.

**Conseguenze:** nessuna migrazione massiva o nuova infrastruttura. Cloud multi-documento,
isolamento account e restore generale restano problemi separati. Compatibilità con un
vecchio client richiede un rollback dei dati verificato e assenza di scrittori concorrenti.
Dettagli, evidenze e procedura in [M1_STORAGE_SHOPPING.md](M1_STORAGE_SHOPPING.md).

## ADR-001 — Presa in carico conservativa (2026-10-23, adottata)

**Contesto:** app già sviluppata con Claude Code, richiesta di presa in carico senza
nuove funzionalità. Checkout iniziale pulito sul branch `work`, HEAD uguale a `origin/main`.

**Decisione:** tag annotato `restore/pre-codex-handover-2026-10-23` sulla baseline
`cae350d409daa68d01f0031298d9de9eff3464c7`; lavoro su
`chore/codex-handover-2026-10-23`. Conservare runtime e asset esistenti, aggiungere
governance, documentazione e verifiche isolate. Nessun deploy, merge o push.

**Conseguenza:** le anomalie emerse sono censite e riproducibili; le correzioni
applicative richiedono un successivo intervento mirato. Nessuna migrazione dati eseguita.

## ADR-002 — Conservare l'architettura attuale (2026-10-23, adottata)

**Decisione:** mantenere JavaScript vanilla e adattatore `claude.use()`; non migrare
a un framework e non separare il monolite durante il passaggio di consegne.

**Motivo:** l'accoppiamento globale e la mancanza di test storici rendono costoso un
refactoring generale. Prima costruire evidenza sui flussi critici e affrontare rischi dati.

## ADR-003 — Validazione separata dai dati reali (2026-10-23, adottata)

**Decisione:** build fuori dal checkout, browser temporanei, rete esterna bloccata nei
test UI, client Supabase simulato per la coda. Versionare le verifiche di presa in carico
senza introdurre dipendenze runtime nell'app. Distinguere test verdi da difetti riprodotti.

**Conseguenza:** nessuna certificazione implicita di RLS, push, account reali o sincronizzazione
in produzione. I test usano la toolchain esterna preparata nell'ambiente cloud.

## ADR-004 — Rollback codice e dati distinti (2026-10-23, adottata)

**Decisione:** tag/commit proteggono il codice; ogni futura migrazione necessita di backup
verificato e prova di ripristino dei dati interessati. Preferire commit inversi alla
riscrittura della cronologia. Deploy e operazioni distruttive richiedono autorizzazione.

**Conseguenza:** i punti automatici del browser non costituiscono da soli una garanzia
di recupero. I rischi di salvataggio silenzioso e cambio account hanno precedenza sulle feature.
