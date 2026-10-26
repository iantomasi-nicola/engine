# Baseline Git e audit iniziale

Data audit: 2026-10-24. Metodo: lettura del codice di `cae350d`, build in cartelle temporanee fuori repo, avvio in Chromium (Playwright) con rete esterna bloccata a 390×844, 820×1180, 1440×900. **Nessun test funzionale a runtime oltre l'avvio**: dove non indicato altrimenti, "presente" significa "trovato nel codice", non "verificato".

## 1. Stato Git trovato
| Elemento | Valore |
|---|---|
| Branch di lavoro | `claude/adoring-pasteur-grk6ez` (locale e remoto, stesso commit) |
| HEAD locale = `origin/main` | `02f43a9` (23/10 22:07, autore Nicola Iantomasi) |
| Modifiche locali non committate | nessuna |
| Stash | nessuno |
| Storia | 50 commit; tutti tranne `02f43a9` sono di Claude |
| Documentazione preesistente | solo `README.md`. **Non esistono** `AGENTS.md`, `docs/PRODUCT_REQUIREMENTS.md`, `ROADMAP.md`, `ARCHITECTURE.md`, né test, né CI |

### Il commit `02f43a9` ("Improve project documentation")
- Messaggio fuorviante: non tocca documentazione. Cambia solo `source/engine.html` (+395/−88).
- Contiene: sidebar richiudibile, filtro "Top" in Foods, ricerca/ordinamento Pantry, `workoutScore`, obiettivo km settimanali, calcolatori (pace, 1RM), BMR Cunningham, sport "5-a-side football", DOMS nel readiness, mezze porzioni, whey nel bilanciamento, import ricetta da testo, intervallo date nel planner, "descrivi workout" con AI, navigazione giorno nel check-in.
- `index.html` **non** è stato ricostruito: il sito pubblicato corrisponde a `cae350d`.
- **L'app non parte**: build di HEAD → pagina bianca, `PAGEERR Cannot access 'INP' before initialization` + `ACT is not defined`. Causa: `INP.tc = …` (riga ~4484), `INP["rc-import-text"] = …` (~6016), `INP["pl-from"|"pl-to"] = …` (~6096) eseguiti prima di `const INP = {…}` (~6217). Dimostrato: dichiarando `const INP = {}` prima di `const UI` (solo in copia scratch) HEAD avvia senza errori.
- `cae350d` (build non minificata): avvia, nessun errore JS, UI renderizzata su tutti e tre i viewport (solo errore di rete atteso, richieste esterne bloccate).

### Altri riferimenti trovati sul remoto (non usati)
Un lavoro precedente, non fatto in questa sessione, esiste su altri riferimenti. **Non fa parte della baseline** (l'utente ha chiesto di considerare solo ciò che esiste fino a `cae350d`) e non va riusato senza richiesta esplicita.
| Riferimento | Commit | Contenuto |
|---|---|---|
| `origin/fix/storage-shopping-m1` e tag `checkpoint/storage-shopping-m1-2026-10-23` | `cb90627` | Milestone "Storage/Shopping M1" (23 test di dominio, 51 controlli browser) costruita sopra `02f43a9` |
| tag `checkpoint/storage-shopping-m1-main-2026-10-24` | `c9491a5` | M1 integrata con `main` (08:16 UTC del 24/10), con messaggio "repair startup regressions" |
| tag `restore/pre-m1-publish-2026-10-23` | `02f43a9` | "Remote main before authorized M1 merge and Pages publication" |
| `origin/claude/laughing-hawking-czrr98` | `cae350d` | Ultimo commit stabile |
`origin/main` risulta ancora a `02f43a9` (verificato con `git ls-remote` il 24/10).

### Baseline concordata
**`cae350d`**. Questo documento valuta solo ciò che esiste fino a quel commit. Le funzioni di `02f43a9` sono riportate come "Mancante (recuperabile da 02f43a9)" quando pertinente.
L'utente ha dichiarato il rollback fatto, ma `origin/main` è ancora `02f43a9`. Per non distruggere nulla, il branch di lavoro riporta la baseline con un **commit di revert** di `02f43a9` (albero identico a `cae350d`), senza force-push. `02f43a9` resta raggiungibile (`origin/main`, tag `restore/pre-m1-publish-2026-10-23`). Cosa fare di `origin/main` è decisione dell'utente.

## 2. Rischi bloccanti e trasversali
| ID | Rischio | Impatto | Mitigazione |
|---|---|---|---|
| R1 | Nessun test automatico, nessuna CI: la regressione di `02f43a9` è stata pubblicata come commit senza che nessuno avviasse l'app | Alto | M0: test di avvio + unit + e2e |
| R2 | Sorgente e artefatto di build in due file separati e committati a mano: possono divergere | Alto | M0: controllo di riproducibilità del build |
| R3 | Monolite di 12.6k righe in un solo `<script>` con TDZ, 37 wrapper di sheet, ~960 `!important` | Alto (ogni modifica può avere effetti lontani) | Test e2e per area prima di toccarla; niente refactoring ampio |
| R4 | Dominio frammentato: scorta (`S.shop.pantry[id].g`), lista spesa, piano, consumo (`it.eaten`) hanno logiche separate; `shoppingNeeds/shoppingRows` sono ridefinite tre volte nel file (righe ~9469, ~11681, ~11690, ~12474) e la scorta riduce la lista solo per i cibi del piano "collegati" (`pan`), mai per gli ingredienti delle ricette | Alto (causa di B1/B3/A4) | M1: modello unico con proiezione |
| R5 | Chiavi API (AI, intervals.icu, mappe) salvate nel documento `settings` su Supabase e incluse negli export (`o.keys`) | Medio-alto | Verificare cifratura/escludere dagli export; documentare; decisione utente |
| R6 | Scritture verso intervals.icu dal browser (sync bidirezionale automatica): rischio di modifiche remote indesiderate | Alto | Audit dedicato prima di toccare G5/F3; modalità dry-run |
| R7 | `OFF_UNREACHABLE` latch: un errore di rete disattiva OFF fino al reload | Medio | A5 |
| R8 | CSP con `connect-src https:` ampio (`'unsafe-inline'` per gli script: tolto in L211, ora hash per script) | Medio | Audit sicurezza finale |
| R9 | Nessun backup verificato end-to-end (esiste "backups: restore points" ma mai testato) | Alto prima di migrazioni dati | M0: test backup/restore su dati sintetici |
| R10 | Dati reali accessibili dal progetto Supabase configurato in `config.js` | Alto | Test solo con fixture locali, Supabase bloccato |

## 3. Matrice di copertura (baseline `cae350d`)
Legenda: **Parziale** = esiste ma non soddisfa il requisito; **Mancante**; **Buggato** (bug segnalato o evidente); **Non verificato** = presente nel codice ma non provato a runtime. Nessun requisito è "implementato/verificato" perché non esistono test.

### A. Foods, Pantry, Storage
| ID | Stato | Evidenza (codice `cae350d`) |
|---|---|---|
| A1 | Parziale | Quantità modificabile in Pantry (stepper, sheet, tap rapidi pack/pz/g); prodotto in dispensa gestito dall'editor Food; da Meal Plan solo "Add › Pantry" per prelevare. Nessun set esatto/±rapido da Foods e dal piano |
| A2 | Parziale | Confezione (`pack`), prezzo "ultimo pagato" per grammo, mediana ultimi 5 acquisti, prodotti sfusi a €/kg. Nessuna frazione (½, ¼, personalizzata) né prezzo per unità/confezione editabile direttamente |
| A3 | Parziale | Solo ordine per scadenza; nessuna ricerca/A–Z/filtri/preferenza (recuperabile da 02f43a9) |
| A4 | Mancante | Esiste "tenuto da parte per il piano" (`panLinked`) e "Not in the plan yet"; nessuna scorta a data futura X, nessuna previsione di esaurimento |
| A5 | Parziale | Barcode (ZXing) e ricerca per nome. Nessuna cache, nessuna attribuzione ODbL, latch `OFF_UNREACHABLE`, deduplicazione non verificata |
| A6 | Non verificato | Stima AI per codici non trovati e per cibi "homemade"; ricerca OFF inline con fallback AI. Da verificare: etichetta stima vs dato ufficiale, conferma prima del salvataggio |
| A7 | Mancante | Corsia/categoria dedotta da nome (IT/EN) e categorie OFF, deterministica; nessun comando AI di suggerimento |

### B. Shopping List e costi
| ID | Stato | Evidenza |
|---|---|---|
| B1 | **Buggato (riprodotto con test)** | La giacenza riduce la lista solo per i cibi del piano collegati alla dispensa (`pan`, assegnati ai giorni più vicini); non copre mai gli ingredienti delle ricette: con 150 g di riso a casa e una ricetta che ne usa 200 g, l'intera quantità resta "da comprare" (acquisto inutile). Test `KNOWN (B1)` in `tests/domain.test.js` |
| B2 | Parziale | Chip 1/3/7/14 giorni da `shopStart`; manca "questa settimana da oggi", "prossima settimana", intervallo personalizzato |
| B3 | Mancante (riprodotto) | Un cibo interamente coperto dalla dispensa non ha nemmeno una riga; nessun elenco richiudibile "coperti da scorta" con data di fine e pasti. Test `KNOWN (B3)` |
| B4 | Da fare (approvato) | Utente: la nota "Not in the plan yet" del Pantry va rimossa |
| B5 | Parziale | Extra a testo libero con prezzo opzionale, separati dai Foods (non toccano i nutrienti); nessuna cronologia/autocompletamento/ricorrenti |
| B6 | Parziale | Stima totale, budget settimanale, storico acquisti (`S.shop.buys`), report settimanale con spesa; manca costo medio settimanale per intervallo, dettaglio per prodotto, previsto vs effettuato, alimentare vs extra |

### C. Recipes e Meal Plan
| ID | Stato | Evidenza |
|---|---|---|
| C1 | Parziale | Ricette con ingredienti, porzioni, note, macro; scaling per porzione. Mancano istruzioni strutturate, tempi, costo ricetta |
| C2 | Parziale | "Salva pasto come ricetta", copia privata per un pasto. Nessun flusso guidato per ingrediente mancante senza perdere il lavoro |
| C3 | Parziale | "Foto o descrizione → pasto con i tuoi alimenti" (AI). Nessun import ricetta (testo/immagine/camera) con istruzioni e porzioni |
| C4 | Parziale | Vista giorno con drag & drop (touch+mouse), copia giorno/pasto, swipe tra giorni, undo. Nessuna vista settimanale desktop/tablet |
| C5 | Mancante | Nessuno scambio pranzo↔cena |
| C6 | Parziale | Tab Recent/Pantry/Starred/Recipes/All e filtro per ruolo; nessun filtro macro combinato/verdure con classificazione motivata |
| C7 | Parziale / Buggato (da riprodurre) | `balanceDay` ricalcola le quantità per raggiungere i macro: è proprio il comportamento da evitare. Coach giornaliero e "cook with what I have" esistono |
| C8 | Buggato (segnalato dall'utente) | Icona ricetta disallineata (`.item-name` era `display:block`). Fix tentato in 02f43a9, scartato |

### D. Nutrizione scientifica
| ID | Stato | Evidenza |
|---|---|---|
| D1 | Parziale | BMR Mifflin / Harris-Benedict / MET; NEAT da orologio o media 7 gg o default 350; EAT con MET netti (met·mult−1) e kcal/min apprese; TEF 10%; calibrazione su trend peso 14 gg; macro per fase; micronutrienti/sodio ("Pro nutrients"); acqua e caffeina. Nessuna revisione scientifica documentata |
| D2 | Non verificato | Rischio doppio conteggio NEAT/EAT nelle tre modalità orologio (active/neat/total) e nel TEF su EAT: da testare con casi sintetici |
| D3 | Parziale | "Progress › Energy" spiega BMR/NEAT/EAT/TEF; sheet energia nel check-in. Nessun interruttore in Settings per la vista formule |
| D4 | Parziale | Funzioni deterministiche; zero test, zero documentazione formale |

### E. AI Meal Planning
| ID | Stato | Evidenza |
|---|---|---|
| E1 | Parziale | Auto-plan: giorno o prossimi 7 giorni, "riempi" o "ricomincia"; manca intervallo X–Y e prossimi N giorni |
| E2 | Parziale | Planner algoritmico + opzione "piatti scelti dall'AI" |
| E3 | Parziale | Preferenza scorta/avanzi ("Offer leftovers first", "Add › Pantry"); nessuna modalità Svuota Storage con scadenze/confezioni aperte |
| E4 | Mancante | Nessuna strategia economica/normale/premium |
| E5 | Mancante | Solo euristica; nessun ottimizzatore con vincoli verificabili |

### F. Meteo e workout planning
| ID | Stato | Evidenza |
|---|---|---|
| F1 | Parziale | Open-Meteo, posizione da Settings (città o geolocalizzazione); "Set location" in card. Posizione corrente non mostrata chiaramente |
| F2 | Parziale | `wxBars`/`wxDry` indicano pioggia nell'intervallo; probabilità, intensità, vento, temperatura percepita, incertezza da valutare |
| F3 | Parziale | Import eventi con `start_date_local`; orario allenamento modificabile e sincronizzato: non verificato |
| F4 | Parziale | Schermata preview → run → review nel player; "How it will run" da confrontare con il requisito |

### G. Running, sport, Intervals.icu
| ID | Stato | Evidenza |
|---|---|---|
| G1 | Parziale | Daniels VDOT, zone Friel, previsioni e confronto con PB; nessuna incertezza né backtesting |
| G2 | Mancante (recuperabile da 02f43a9) | Grafico km settimanali presente; obiettivo e storico no |
| G3 | Parziale | Gare con countdown e risultati, mappe/tracce; nessun report split/FC/confronto |
| G4 | Parziale | Sport: Calisthenics, Running, Strength, Football, Cycling, Walking, Other + sport importati; mancano calcio a 5, nuoto piscina/mare con metriche proprie |
| G5 | Non verificato | Sync bidirezionale automatica; da auditare per scritture remote indesiderate (R6) |

### H. Forza, calisthenics, Workout Coach
| ID | Stato | Evidenza |
|---|---|---|
| H1 | Mancante | Esercizi come testo libero negli script; nessuna libreria con esercizi personalizzati |
| H2 | Parziale | Statistiche per esercizio/gruppo muscolare e circuiti; filtri 1/2/4/6/12 settimane da verificare |
| H3 | Parziale | e1RM = (BW+kg)·(1+(reps+RIR)/30)−BW (Epley con peso corporeo), test 1RM/3RM/5RM, ×BW; una sola formula, nessun intervallo d'incertezza |
| H4–H7 | Mancante | Nessun Workout Score (recuperabile in forma semplicistica da 02f43a9, da riprogettare); recap post-workout con consigli esiste |
| H8 | Parziale | Readiness da sonno/RHR/HRV e carico; nessun DOMS (in 02f43a9), nessuna domanda sulle gambe, nessuna predizione individuale |
| H9 | Parziale | Free workout + "cosa fare oggi" (no AI) da forma/fatica/carico; non suggerisce sessioni per sport/tempo, non salva nel piano senza avviare (da verificare) |
| H10 | Non verificato | "Import workout from a photo or a few words" (AI → testo intervals.icu) |

### I. Check-in, Analytics, Tools
| ID | Stato | Evidenza |
|---|---|---|
| I1 | Parziale | Check-in apribile per data (anche passata) dal calendario/Today; nessun selettore data nella sheet |
| I2 | Parziale | Report settimanale/mensile, aderenza, spesa; nessun report alimenti/ricette più usati (recuperabile da 02f43a9) |
| I3 | Mancante (recuperabile da 02f43a9) | Nessuna sezione calcolatori |
| I4 | Mancante | Fattibilità: i browser non espongono un sensore di prossimità utilizzabile da una PWA; alternative: DeviceMotion (accelerometro), camera. Da studiare in un spike |

### J. Redesign UX/UI
| ID | Stato | Evidenza |
|---|---|---|
| J1 | Mancante (recuperabile da 02f43a9) | Sidebar fissa su desktop |
| J2 | Parziale | Transizioni di pagina (View Transitions), `prefers-reduced-motion` rispettato in 7 punti |
| J3 | Non verificato | Nessuna scansione sistematica di overflow/overlap; nessuno screenshot di regressione |
| J4 | Parziale | Token Material 3 con colore seed; ~960 `!important` indicano override ad hoc |
| J5 | Non verificato | Nessun test responsive automatico |

## 4. Funzioni esistenti da preservare (inventario di non regressione)
Da `git log` e dal codice: Today dashboard; piano pasti con macro, planner automatico, carb cycling, ciclo pranzo/cena a coppie; Foods con barcode/OCR etichetta/OFF; Pantry con scadenze e promemoria; lista spesa unica con prezzi; eaten-out con foto; integrazione intervals.icu bidirezionale; Train (calendario, piano, workouts, fitness/fatica/forma, gare, stagione, periodizzazione); live workout (strength, calisthenics, EMOM/AMRAP/Tabata/For time, endurance a step, bici con potenza, voce); rotte GPX/TCX/FIT con mappa; story 1080×1920; progress (peso, foto, misure, obiettivi con previsione); sonno, acqua/caffeina, integratori con promemoria; backup/restore; export Excel; Web Push; temi Material 3; notifiche; AI opzionale con i propri provider; offline con service worker.
