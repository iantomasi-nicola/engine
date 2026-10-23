# Changelog

Le voci descrivono modifiche verificate nel repository; non attestano una pubblicazione.

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
