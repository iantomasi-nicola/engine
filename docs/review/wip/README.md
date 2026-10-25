# Lavoro parziale di M14b (NON verificato, NON pubblicato)

Patch dei tre builder (A sync, B numeri energetici, C PWA/ripristino/accessibilità), salvate il 27/10 per non perderle: i loro rami erano locali al container.
Applicare con `git am docs/review/wip/fix-X-*.patch` (A sopra `17fddb7`, B e C sopra `04e2a7a`; i file `*-uncommitted.patch` con `git apply`) in un branch separato, poi suite completa, `code-guard`, `design-reviewer`.
Stato per gruppo: vedi `docs/review/fix-A-report.md` (nel patch A) e i report di B e C dentro le rispettive patch (`docs/review/fix-B-report.md`, `fix-C-report.md`).
Aperti dichiarati dal builder A: #1 (base di unione dopo un invio senza unione) e #3 (restore point «before sign-in»). Domanda aperta per l'utente: le chiavi API locali di un dispositivo mai collegato possono entrare nell'account? (raccomandato: mai, vedi S-1).
Le patch NON fanno parte della build: eliminarle quando il lavoro è unito.
