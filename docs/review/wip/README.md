# Lavoro parziale di M14b (NON verificato, NON pubblicato) — 27/10

Patch dei builder fermati dal limite d'uso: `fix-<G>-commits.patch` (commit del ramo del worktree, da applicare con `git am`) e `fix-<G>-uncommitted.patch` (modifiche non committate, `git apply`), sopra il commit indicato da `git merge-base`.
- **A** sync (unione per chiave, flush a pagehide, isolamento per account, pillola, paginazione, S-1 chiavi locali): 9 su 11 test verdi alla fine del primo giro; aperti #1 (base di unione) e #3 (restore point).
- **C** PWA/ripristino/URL/accessibilità: in corso, la suite completa non era finita.
- **D** Fuel: undo con dispensa, copia giorno, ecc. + nuova funzione Copy/Paste (L188): in corso.
- **E** Shopping/Pantry + «Replace with something from home» (L189): nessun lavoro salvato (da rifare dalla specifica nel backlog e dal report `docs/review/area03-shopping.md`).
- **B** (numeri energetici) è già unito e pubblicato; **F** (Foods/ricette) non è mai partito.
Per riprendere: crea un ramo, applica la patch, esegui i test dei file toccati, poi suite completa, `code-guard`, `design-reviewer`. I report dei builder (`fix-A-report.md` ecc.) sono dentro le patch. Eliminare questa cartella quando il lavoro è unito.
