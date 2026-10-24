# Changelog

Le voci descrivono modifiche verificate nel repository; non attestano una pubblicazione.

## Integrazione per Pages — 2026-10-24

- Integrata M1 con gli aggiornamenti già presenti su main (`02f43a9`), conservando
  ricerca per marca/alias, categorie e navigazione; nessuna nuova milestone.
- Corretti registrazione anticipata dei gestori input e cancellazione di nuove finestre
  da parte dell'animazione precedente. Aggiunti controlli di regressione dell'integrazione.
- Autorizzati commit, push su main e deploy del sito esistente; procedura e riferimenti
  di recupero in `docs/PUBLICATION_M1.md`.

## Unreleased — M1 Storage/Shopping del 2026-10-23

- Fabbisogno unificato di alimenti/ricette meno scorte disponibili, copertura parziale,
  articoli coperti richiudibili, riserve precedenti ed esaurimento previsto.
- Consumo con ricevuta del prelievo reale; annullamenti di consumi/acquisti senza
  inventare scorte o cancellare acquisti successivi. Gestione conservativa dei dati legacy.
- Quantità precise, frazioni di confezione, unità coerenti, prezzi con riferimento
  esplicito; ricerca tollerante e ordinamento persistente della dispensa.
- Backup inventario verificato, versione additiva e transazioni locali con avvisi
  di errore; cloud accodato solo dopo il salvataggio locale riuscito.
- Test di dominio/browser, output statici rigenerati, requisiti originali, roadmap,
  architettura e procedura di rollback aggiornati. Vedere `docs/M1_STORAGE_SHOPPING.md`.
- Restano aperti isolamento account/coda, restore generale e verifiche cloud reali;
  nessun deploy, push, merge su main o avvio della milestone successiva.

## Unreleased — presa in carico del 2026-10-23

### Aggiunto

- Regole permanenti `AGENTS.md` per qualità, dati, test, branch, commit e rollback.
- Architettura, decisioni, roadmap, stato del progetto e guida di sviluppo/ripristino.
- Verifiche di handover: smoke browser locale e riproduttore del difetto di isolamento
  della coda offline. Il riproduttore resta intenzionalmente rosso sulla baseline.
- Tag annotato locale `restore/pre-codex-handover-2026-10-23` prima delle modifiche.

### Documentato

- Rischio confermato di attribuzione della coda al nuovo account; lacune di backup,
  persistenza, test e toolchain. Nessuna correzione applicativa in questa fase.
- Rettificata l'indicazione obsoleta del README sui sorgenti fuori repository.

## Cronologia precedente disponibile

La baseline contiene 49 commit, tutti datati 22 ottobre 2026 nel log Git disponibile.
Non sono presenti tag di release preesistenti. Queste tappe non assegnano versioni retroattive:

- `828bb72`: prima versione web.
- `cfe73bd`: aggiunta dei sorgenti leggibili accanto alla build.
- `42c5214`: rimozione di componenti di sync dell'epoca Claude e pulizia dichiarata dal commit.
- `0bde407`: foto di progresso e relativi flussi locali/cloud.
- `17e1d0b`: promemoria Web Push opzionali.
- `2703aac`: CSP e protezioni della funzione push.
- `cae350d`: spesa spuntata trasferita in dispensa con annullamento; baseline della presa in carico.

Le descrizioni storiche provengono dai commit e non equivalgono a test superati.
