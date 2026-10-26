# Prompt per la prossima IA

Incolla il testo qui sotto come primo messaggio della nuova sessione (cartella di lavoro = la repo `engine`). Lo stato esatto si ricava dalla repo, non da questo prompt.

```text
Riprendi lo sviluppo di "Engine", PWA statica per un atleta ibrido (nutrizione, running, calisthenics, forza). Repo: iantomasi-nicola/engine, ramo di lavoro corrente claude/awesome-goldberg-ontswx (il nome del ramo può cambiare da sessione a sessione: usa quello indicato dall'ambiente) (si spinge anche su main con scripts/ship.sh). L'utente scrive in italiano: rispondi sempre in italiano; i testi dell'interfaccia restano in inglese.

LEGGI PRIMA, in ordine: AGENTS.md (regole permanenti), docs/HANDOFF.md (stato, procedura, trappole, prossimi passi con modello consigliato, preferenze), docs/ROADMAP.md, docs/PRODUCT_REQUIREMENTS.md, docs/CLEANUP_REPORT.md, docs/AGENTS_WORKFLOW.md; per M7b anche docs/NUTRITION_SPEC.md e docs/NUTRITION_AUDIT.md. Sorgente unico: source/engine.html; i file in root sono artefatti di build (non modificarli a mano).

STATO AGGIORNATO 26/10 sera: leggi PRIMA il punto «PROSSIMA IA, PARTI DA QUI» di docs/HANDOFF.md §1 (main = bbc135a; si parte da L203, poi Today dashboard L201 già approvata, poi audit M14b delle aree 4, 5, 7, 8, 9, 12); decisioni su sport e nutrizione solo da studi PubMed gold standard (AGENTS.md regola 3); lavori in parallelo con altre IA: docs/PARALLEL_AI.md (prenota con scripts/claim.sh) e ogni funzione aggiuntiva dell'utente va subito nel backlog e in una milestone restante. STATO (26/10/2026, sera, superato dal punto sopra): `main` = 43f788c (rollback c07a200), suite 551 test verdi. Dentro: planner settimanale rifatto come tabella compatta con «Usual» e riempimento del giorno (L184), M13d residuo (assi dei grafici, calcolatori, calendario Train su PC), terzo giro di revisione grafica, D7 una fonte per sessione, registro ALGO (F-11) e sezione «How it is calculated» (M7c). Dettagli, aperti e domande per l'utente: docs/HANDOFF.md §1. Processo: l'utente vuole POCHE pubblicazioni (una per gruppo grande), nessun audit completo a ogni passo, agenti milestone-builder in worktree paralleli (Sonnet high; Opus high per la nutrizione), design-reviewer una volta per gruppo, suite completa una volta prima di scripts/ship.sh; l'utente raggiunge il limite d'uso: pubblica subito ogni blocco verificato.

SETUP (una volta, fuori dalla repo): mkdir -p $SCRATCH/nm && cd $SCRATCH/nm && npm i terser lightningcss; ESPORTA ENGINE_NM=$SCRATCH/nm/node_modules NELLA SHELL DI OGNI COMANDO (altrimenti i test falliscono con "terser/lightningcss not found"). Mai "npm i" dentro tests/. Test: cd tests && npm run verify; layout: node tests/layout-audit.js <outdir> [--dark].

REGOLE CHE COSTANO CARO
1. Un const top-level usato prima della dichiarazione (TDZ) azzera l'app: ACT/INP/CHG/SHEETS/VIEWS/FORMS si registrano dopo la dichiarazione; dopo ogni modifica app.errors vuoto.
2. Nomi duplicati: l'ultima dichiarazione vince in silenzio; grep prima di aggiungere. Molte sheet sono avvolte piu' in basso (SHEETS.<nome>): cerca prima di cambiarne l'HTML.
3. Ogni bug: prima un test che lo riproduce. Fixture sintetiche, mai dati reali ne' il Supabase reale. Valori attesi dei test numerici calcolati a mano.
4. Formule nutrizionali: l'utente ha approvato quelle di NUTRITION_AUDIT ("le nuove formule te le approvo tutte"); ciascuna con fonte (le fonti primarie sono spesso irraggiungibili: dichiaralo), test numerico indipendente, interruttore di rollback e data di attivazione costante (mai "oggi" persistito: scorre a ogni sync). Nessun moltiplicatore polso-contro-fascia da letteratura: D20 si impara dai dati.
5. Non eliminare funzioni; niente codice morto introdotto da te. Campi data-chg: niente render() negli handler INP.
6. Le pieghe foldOne/foldView rendono il corpo solo se aperte (nei test imposta UI.fold); non modificare source/ mentre la suite gira (i test costruiscono dal sorgente).

DESIGN: minimale, Material Design recente; nessuna grafica storta su 390/820/1440, chiaro e scuro; ogni funzione nuova fusa nei componenti esistenti; sezioni ripiegabili chiuse.

COME LAVORI (velocita': l'utente trova il ritmo lento)
- Sviluppo: solo i file di test toccati (node --test file.test.js); suite completa UNA volta prima di ogni pubblicazione.
- UNA revisione grafica (design-reviewer) per gruppo di modifiche, solo sulle schermate toccate; mai in parallelo alla suite (falsi rossi per carico). code-guard e suite si' in parallelo.
- Usa gli agenti di .claude/agents/ come in docs/AGENTS_WORKFLOW.md (code-guard -> test-runner -> design-reviewer -> docs-keeper -> release-manager); per funzioni indipendenti milestone-builder in worktree paralleli (i rami dei worktree sono locali al container: spingili su origin o uniscili prima di chiudere). Le notifiche degli agenti arrivano da sole: niente polling con sleep.
- Pubblica blocchi piu' grandi con scripts/ship.sh "oggetto"; pubblica subito ogni blocco verificato (l'utente puo' raggiungere il limite d'uso in qualsiasi momento). Mai force-push, reset o riscrittura della storia.
- A OGNI pubblicazione scrivi in italiano: cosa e' stato pubblicato e DOVE provarlo a mano passo passo (menu/schermata/azione), SHA di rollback, cosa manca e perche'. Annuncia una novita' SOLO se e' provabile dal sito su GitHub Pages (gia' in main con i file di root ricostruiti); mai annunciare lavoro non pubblicato. Rispondi a ogni punto del messaggio dell'utente (fatto / dove / cosa manca).
- Aggiorna PRODUCT_REQUIREMENTS e ROADMAP nello stesso commit; a fine gruppo il "Consistency & Cleanup Report" in CLEANUP_REPORT; prima di fermarti aggiorna HANDOFF §1.

PROSSIMI PASSI (ordine e modello consigliato; mai impegno max, xhigh solo se davvero necessario e dichiarato; nessun modello con crediti extra senza l'ok dell'utente)
1. M14b revisione integrale a gruppi piccoli di 3-4 aree per volta con area-auditor (sicurezza, dati/sync/offline, nutrizione per prime; docs/REVIEW_PLAN.md), poi correzioni a gruppi con milestone-builder: Opus 5.5 high per le aree critiche, Sonnet 5.5 high per il resto.
2. M7d (BMR e target flessibili, D10 resto, D13) e M7e (micronutrienti con AI L16, idratazione D14, EA D15): le formule NUOVE vanno proposte e approvate dall'utente prima del codice (la sua approvazione «le nuove formule te le approvo tutte» copre solo quelle già in NUTRITION_AUDIT/L155): Opus 5.5 high.
3. M15 audit finale e pulizia repo (codice morto, README, script): Sonnet 5.5 medium, high per la revisione.
4. Piccoli aperti: calendario Week a 1920 px, pulsante «Today» nel Week, revisione grafica dopo il terzo giro. Altro su richiesta: M9b, M12, resto di M11, proxy ricetta da link (chiedere prima): Sonnet 5.5 high. Prima di una milestone grande presenta in breve cosa/perche'/rischi/criteri.
```
