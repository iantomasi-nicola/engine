# Prompt per una seconda IA che lavora in parallelo

Incolla il testo qui sotto come primo messaggio di una NUOVA sessione (cartella di lavoro = la repo `iantomasi-nicola/engine`). Per la prima IA vale `docs/NEXT_AI_PROMPT.md`.

```text
Lavori su "Engine" (PWA statica per un atleta ibrido), repo iantomasi-nicola/engine, INSIEME a un'altra IA già attiva. Rispondi sempre in italiano (l'interfaccia resta in inglese).

LEGGI PRIMA, in ordine: AGENTS.md, docs/PARALLEL_AI.md (come non pestarsi i piedi: OBBLIGATORIO), docs/HANDOFF.md, docs/ROADMAP.md, docs/PRODUCT_REQUIREMENTS.md, docs/CLEANUP_REPORT.md, docs/AGENTS_WORKFLOW.md.

PROCEDURA D'AVVIO
1. `git fetch origin` e crea il tuo ramo (quello assegnato dall'ambiente; mai lavorare su main né sul ramo dell'altra IA).
2. `scripts/claim.sh list`: guarda cosa è prenotato e da chi. Scegli una milestone ancora libera in aree DIVERSE da quelle prenotate (elenco e consiglio in docs/PARALLEL_AI.md e docs/HANDOFF.md §2) e prenotala: `scripts/claim.sh take <id> "<titolo>" <aree> 4 <ramo>`. Se rifiuta, scegline un'altra.
3. Setup (una volta, fuori dalla repo): mkdir -p $SCRATCH/nm && cd $SCRATCH/nm && npm i terser lightningcss; export ENGINE_NM=$SCRATCH/nm/node_modules in OGNI comando; mai `npm i` dentro tests/. Test: cd tests && npm run verify (in background, log su file); layout: node tests/layout-audit.js <outdir>.

REGOLE
- Limite d'uso: puoi fermarti in qualsiasi momento. Commit e PUSH del ramo a ogni passo (un ramo locale va perso), `scripts/claim.sh renew <id>` a ogni commit, e prima di finire `scripts/claim.sh release <id> "fatto / resta / dove sono i test"` + una riga in docs/HANDOFF.md §1. Meglio fermarsi prima che a metà.
- Funzioni aggiuntive: ogni richiesta nuova dell'utente va SUBITO in docs/PRODUCT_REQUIREMENTS.md (ID nuovo) e in una milestone ancora da fare in docs/ROADMAP.md, non solo in chat.
- Test prima di ogni fix; fixture sintetiche, mai dati reali né il Supabase reale; nessuna formula nutrizionale senza approvazione dell'utente; niente codice morto; design minimale, Material, 390/820/1440 chiaro e scuro; mai impegno max.
- Pubblicazione solo con scripts/ship.sh dopo suite verde, audit a 0 e revisione grafica, una pubblicazione alla volta (claim SHIP). Se origin/main ha commit nuovi: merge, rigenera i file di root, ritesta, riprova. Mai force-push né reset.
- Dopo ogni pubblicazione scrivi in italiano: cosa è pubblicato e DOVE provarlo a mano (menu/schermata/azione), SHA di rollback, cosa resta.
```
