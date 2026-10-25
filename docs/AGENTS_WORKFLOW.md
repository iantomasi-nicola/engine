# Agenti di lavoro: chi fa cosa, con quale modello (26/10/2026)

Gli agenti stanno in `.claude/agents/` (sono file della repo: ogni sessione li trova). Servono a **migliorare processo e risultato**: tolgono dal contesto principale le attese lunghe e le letture di log, danno un secondo sguardo indipendente e permettono lavori paralleli senza pestarsi i piedi.

**Regole di costo (richiesta dell'utente):** mai impegno `max`; `xhigh` solo se davvero necessario (ordine dell'utente: è costoso) e dichiarandone il motivo; di norma `medium` o `high`, `high` per formule nutrizionali e revisioni critiche. Niente modelli che richiedono crediti extra (Fable 5.1 chiede crediti d'uso a parte: usarlo solo se l'utente lo autorizza; altrimenti Opus 5.5 `high`). Haiku solo per lavoro meccanico di lettura e di esecuzione.

| Agente | Modello | Impegno | Quando | Scrive? |
|---|---|---|---|---|
| `test-runner` | Haiku | basso | Dopo ogni gruppo di modifiche: lancia `npm run verify` e `layout-audit` in background, legge i log, restituisce il verdetto compatto con i test falliti | No |
| `code-guard` | Sonnet 5.5 | high | Su ogni diff non banale **prima** dei test: TDZ, nomi duplicati, wrapper, codice morto, formule vietate, test-prima, documenti | No |
| `design-reviewer` | Opus 5.5 | high | Prima di ogni commit che cambia ciò che si vede, e dopo le correzioni: guarda gli screenshot reali su 390/820/1440, chiaro e scuro | No |
| `area-auditor` | Sonnet 5.5 (Opus per le aree critiche) | high | Revisione integrale (M14b): una istanza per area, in parallelo, sola lettura, difetti confermati con riproduzione, formato fisso | No |
| `milestone-builder` | Sonnet 5.5 (Opus per lavori ambigui) | high | Una milestone media e delimitata, in un worktree isolato, su un proprio ramo | Sì (suo ramo) |
| `docs-keeper` | Sonnet 5.5 | medium | Fine milestone e passaggi di consegne: allinea backlog, roadmap, cleanup, handoff, prompt; mappa le richieste dell'utente (fatto / milestone / lacuna) | Solo `docs/` |
| `release-manager` | Sonnet 5.5 | medium | Fine gruppo: unisce i rami degli agenti, controlla verde, esegue `scripts/ship.sh`, scrive il riepilogo in italiano con SHA di rollback | Sì (pubblica) |

## Flusso consigliato per un gruppo di modifiche
1. L'agente principale (o uno o più `milestone-builder`) implementa; i test si scrivono prima.
2. `code-guard` sul diff → correggere i GRAVE/MEDI.
3. `test-runner` (suite + audit, in background) e **in parallelo** `design-reviewer` sugli schermi toccati.
4. Correggere, ripetere 3 sui soli punti toccati.
5. `docs-keeper` → `release-manager`.

## Lavoro in parallelo (un solo file grande!)
- Più `milestone-builder` insieme **solo** se toccano parti diverse di `source/engine.html` (es. Endurance Cup contro report) e ognuno ha il proprio worktree (`isolation: worktree`). Mai due agenti nello stesso worktree.
- Gli agenti non pubblicano e non toccano `main`: i loro rami si uniscono nel ramo di lavoro con `git merge --no-ff`, poi suite e audit **sullo stato unito**, poi `release-manager`.
- La cartella `.claude/worktrees/` è ignorata da git.

## Quando NON usare un agente
Correzioni di poche righe, ritocchi di testo, domande di dominio all'utente: costano più dell'agente che le fa.

## Consigli per migliorare gli agenti (aggiornare qui)
- Dare sempre all'agente: percorso di `ENGINE_NM`, cartella dello scratchpad, ID del backlog, cosa NON fare (pubblicare, toccare `main`, `max`).
- Chiedere un formato di risposta fisso e corto (i report lunghi riempiono il contesto).
- Se un agente fallisce per limite o crediti: il lavoro salvato resta; rilanciare con un altro modello o riprendere con `SendMessage`.
