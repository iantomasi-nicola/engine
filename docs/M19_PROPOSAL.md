# M19 · Spesa e Dispensa rifatte da capo: proposta di progetto (L212)

Stato: **proposta, da approvare prima del codice** (AGENTS.md regola 6). Nessuna riga di `source/` o `tests/` è stata toccata.
Base esaminata: `main` (build `202610261833`) + lettura di `origin/claude/m18-wip` (5be7ed8, non verificata) e `docs/review/AUDIT_2026-10-26.md`.
Prove: ho costruito l'app e guidato i percorsi con Playwright su dati sintetici (390 e 1440, chiaro); gli screenshot sono in
`/tmp/claude-0/-home-user-engine/479d3bb3-246a-5cfa-b0c3-5d742537a513/scratchpad/m19/shots/` (`shop-*`, `pantry-*`, `sh-*` = ogni foglio), gli script in `.../m19/shots.js` e `.../m19/flows.js`.
Ciò che segue e che è marcato **[verificato]** è stato riprodotto sull'app costruita; **[letto]** viene dal codice, non eseguito.

## 1. Problemi trovati (con passi e punto in cui si rompe il ritorno, regola 8a)

Mappa dei flussi di oggi (passi = tocchi dalla schermata di partenza, senza contare la digitazione):

| Flusso | Passi oggi | Dove finisci |
|---|---|---|
| Spunta una riga della lista | 1 (cerchio) | resta sulla lista; **va subito in dispensa** + toast Undo; riga sotto «Ticked today» |
| Quantità/prezzo diversi | riga → Buy → campi → «In the cart» = 3 + **Finish shopping** = 4 | lista; ma la dispensa cambia **solo al Finish** |
| Scansiona per spuntare (icona codice a barre) | 1 + scansione | lista; se il prodotto **non è in lista**: toast «isn't on your list», vicolo cieco |
| «Bought» → Scan → prodotto fuori lista | Bought, Scan, [camera], Buy → «In the cart» = 3, poi **X, X** per tornare = 5 | **sul foglio di scansione** (poi su «Bought something»), non sulla lista [verificato: catena `[prodadd, shopq]`/`[scan, prodadd]`] |
| Prodotto sconosciuto | Bought → Scan/Nuovo → editor cibo → salva → Buy → «In the cart» | catena di 3-4 fogli, stesso problema |
| Extra non-cibo | scrivi + Add (2); spunta; **Finish** | lista |
| Foto dello scontrino | icona camera → negozio → foto → Read → Load (5) | lista (chiude bene); righe non lette in una card a parte |
| «Use something from home» (L189) | riga → Buy → **apri la sezione chiusa** → scegli = 3 | lista (se il foglio radice è la lista) / pagina; solo 4 suggeriti, solo se il prodotto è pianificato da solo |
| Cambia prodotto (marca) | riga → Buy → Replace → cerca/scansiona → scegli → Replace = 5 | `closeToRoot`: chiude tutta la catena (audit C2: Indietro riapre la conferma) |
| Dispensa: aggiungi | Add → cerca → scegli → Save = 4 | **foglio «Add» vuoto**, non la pagina [verificato `[prodadd]`] |
| Dispensa: modifica | riga → foglio → Save = 3 | pagina (ok) |
| Dispensa: ± | 1 (passo 10/25/50 g a seconda della scorta) | pagina |
| Scaduto/da usare | card: «Thrown away» / «Still good» (silenzioso +2 giorni) / «Use it» | «Use it» **cambia scheda in Meals** e apre il foglio quantità: chiudendo sei in Meals, non nella Dispensa [verificato `tab: plan`], anche dalla card di Today |
| Esaurito / buttato | «Used up» solo nella casella «At home» del foglio quantità del planner; cestino nel foglio dispensa | — |
| Negozi/prezzi | pillola negozio → foglio; prezzo, offerta, prezzo per negozio dentro Buy | ok, ma sepolti nel foglio Buy |
| Quantità a confezioni (M18) | solo su ramo non verificato | — |

Difetti, in ordine di gravità:

1. **Scansione/«Bought»: il foglio di scansione resta sotto** (richiesta dell'utente). Causa: `destPick` apre `buy` *sopra* `scan`/`prodadd` (`openSheet` li ricorda come `_ret`) e «In the cart» fa `closeSheet()` che torna al foglio che era sotto. `UI.dest` è uno stato globale che si azzera e si reimposta dopo `openSheet` (`UI.dest = d` dopo `openSheet(...)` in 6 punti): fragile. Anche l'overlay `#cam` resta acceso con Indietro (audit C5). [verificato]
2. **Il ritorno cambia la pagina sotto.** Da Today → carrello (`shopq`) → «Bought» → scegli: `destPick` fa `UI.tab = UI.fuelTab = "shop"`, quindi chiudendo tutto sei su Shop, non su Today. [verificato `tab: shop`]. Stesso difetto di «Use it» (Meals).
3. **Due significati di «comprato».** Spunta = in dispensa subito; «In the cart» = solo segnato fino a «Finish». Con una dispensa che cambia a metà o dopo, l'utente non sa quanto ha «già a casa». [verificato: riso 150 → 150 dopo «In the cart» → 1150 dopo Finish]
4. **Add dispensa finisce su un foglio vuoto** (come sopra, un tocco in più e nessun segno che è fatto). [verificato]
5. Scansione per spuntare e scansione da «Bought» hanno regole diverse (vicolo cieco vs extra) e due punti d'ingresso.
6. **Il foglio Buy ha 8 blocchi sempre aperti** (riga «Planned: … for Test bowl Mon, Test bowl Tue, …» di 3 righe, quantità, prezzo, 3 chip, negozio, tipo di prezzo, dimensione del pacco con campo+chip+nota, ultimo prezzo, «home» chiuso): su 390 px si scorre per arrivare al tasto. Tre azioni (matita = modifica cibo, Replace, home) in tre posti diversi. [verificato, screenshot `sh-buy-*`]
7. **L189 invisibile** (sezione chiusa in fondo, solo suggeriti): L203 «non va bene» per questo.
8. **Intestazioni sovraccariche.** Shop: titolo + 4 icone (il «+» verde su telefono non dice «Bought») + segmento periodo a 4 + riga somma/negozio + campo extra: 4 righe di controlli prima della prima voce. Pantry: Cook, bacchetta (senza etichetta), Add, ricerca, 4 chip, segmento ordine a 4, card scadenze (~220 px), previsione: **la prima riga della lista inizia a ~650 px su 844**. [verificato, `pantry-phone.png`]
9. **PC 1440:** tutto largo ~1120 px; segmenti da 270 px, stepper a 800 px dal nome della riga; la lista non si legge. Viola «Schermi grandi» di AGENTS.md. [verificato]
10. Due editor della stessa scorta (casella «At home» del planner/cibo e foglio dispensa) e due steppers diversi (`.pan-q` in dispensa, `.pk-st` in spesa).
11. Dal codice [letto]: sezione «Add to pantry» di `SHEETS.pantry` senza cibo (`pa-q`, `pa-pick`) **non raggiungibile** (nessun `openSheet("pantry")` senza `food`); `shelf` in `destPick` calcolato e mai usato; ramo `&& false` nel wrapper del tick; 4 wrapper della stessa sheet pantry e 2 di `buy`.
12. Audit L211 su queste schermate: riga «0×» senza scorta, toast «€5 spent» ≠ card Spending, `spendStats` conta stime, `shop-done` ignora `checked` con g≤0, prezzo «0» scartato, `qty-save` gonfia la dispensa, Undo del tick ripristina l'intera voce (perde modifiche nei 10 s), Indietro con cursore nel campo scrive `checked["undefined"]` (C1).

## 2. Nuova architettura dell'informazione

**Regola unica, «un flusso torna dove è partito».** Ogni percorso (aggiungi, scansiona, sostituisci, usa da casa) è un *flusso* con un'origine esplicita (`flow.from` = id/tipo del foglio o pagina che lo ha aperto, **non** un oggetto condiviso: audit C3). Le azioni terminali (Bought, Save, Use, Replace) chiamano una sola `endFlow(toast+Undo)` che chiude tutta la catena fino all'origine. I fogli «scelta» (`prodadd`, `scan`) sono *transitori*: non sono mai bersaglio di ritorno (si sostituiscono, non si impilano). Nessuna azione cambia `UI.tab` come effetto collaterale. Sostituisce `UI.dest` globale e `closeToRoot`.

**Un solo «Add».** Il foglio `prodadd` è già condiviso; diventa l'unico ingresso: *cerca · scansiona · foto etichetta · nuovo · fatto in casa* (come oggi) con contesto `for: "bought" | "pantry"`. Una sola scansione per Shop: in lista → spunta; fuori lista ma cibo noto → foglio Buy precompilato (extra); codice sconosciuto → «Nuovo cibo» → Buy. Sempre di nuovo sulla lista.

**Shop (Fuel › Shop)**
- Intestazione: titolo + `[+ Add]` (ink) + icona Scan + `⋯` (foglio con `lrow`: Foto dello scontrino, Copia lista, Negozi, Spese). Su PC le icone hanno l'etichetta.
- Riga somma: «3 to buy · ≈ €34» + **due pillole** `st-pill` («This week ▾» → foglio Periodo con Custom e date, «All stores ▾» già esistente). Via il segmento a 4 (−56 px su telefono).
- Lista: stesso campo extra, stesse corsie; riga = cerchio · nome + sottotitolo con **pillola «½ pack · 500 g at home»** (L208, stessa fonte della dispensa) · stepper a pillola `.pk-st`.
- **Un solo gruppo «Bought today»** (oggi: «Ticked today» + «Bought, not on the list» + extra fatti), con Undo per riga.
- Chiusi di default: «At other stores», «Covered by what's at home», «Meals out», «Spending» (3 numeri nel sommario), card scontrino se ci sono righe.
- Il foglio carrello `shopq` (da Today/Meals) resta la **stessa componente** `shopPanel`, piè: `[Copy][Add][Done]`.

**Foglio Buy (snellito)**: riga sola «7 meals this week · ½ pack at home» (dettaglio in sezione chiusa); **controllo quantità unico** (stepper + chip a confezioni + equivalente esatto, M18); prezzo; sezioni **chiuse** «Store and offer» e «Pack size in the shop»; riga `lrow` visibile «Use something from home ›» (L203) e «Replace…»; piè `[Bought]`. Matita (modifica cibo) resta in testa.

**Pantry (Fuel › Pantry)**
- Intestazione: titolo + `[+ Add]`. «What can I cook?» e «Plan meals» in fondo alla lista (e nella colonna destra su PC), non in testa.
- Ricerca + **una pillola di ordinamento** «Expiry ▾» accanto (via il segmento a 4), chip filtro con contatore («Use soon 2»).
- Scaduti/da usare: **una riga d'avviso** «1 expired · 1 use soon · Review» che imposta il filtro «Use soon»; lì ogni riga mostra `Use it · Thrown away · Still good` (azioni oggi nella card). La card alta ~220 px sparisce.
- Riga = stessa anatomia della spesa (nome, sottotitolo, stepper `.pk-st` in confezioni/pezzi/g, parole di `packWords`).
- Previsione «Left on …» in coda, chiusa.
- Foglio dispensa: info cibo (1 riga), controllo quantità unico (L209), «Use by» + chip, sezioni chiuse «Units and pack size», «Remove» (**Used up** / **Thrown away**: spreco registrato con € come oggi); piè `[Save and add another]` (solo in aggiunta) `[Save]` → ritorno alla pagina.

**Larghezze** (regola «Schermi grandi»): 390 = colonna unica; 820 = colonna unica max 720 centrata; 1440 = due colonne, lista (max 680) a sinistra e colonna destra 320 px con «Today's trip», scontrino e Spending (Shop) o «Use soon» e previsione (Pantry). Fogli: finestra centrata 560 px come oggi.

### Schizzi (solo componenti esistenti: `fuelNav` segmento, `btn ink sm`, `icon-btn`, `st-pill`, `shop-row`/`lrow`, `.pk-st`, `chip`, piè del foglio)

Shop, telefono 390:
```
[ Meals | Foods | Shop | Pantry• ]        <- fuelNav
Shopping                [+ Add] [⌖] [⋯]   <- ink sm + icon-btn
26 Oct – 1 Nov
3 to buy · ≈ €34   (This week ▾)(All stores ▾)     <- 2 st-pill
┌ card ────────────────────────────────┐
│ [ Add something else        ] [+ Add]│
│ MEAT                                1│
│ ○ Test chicken        ( − 6× +  )    │  sottotitolo: pillola «½ pack · 300 g at home»
│ PANTRY                              1│
│ ○ Test rice           ( − 2× +  )    │
│ BOUGHT TODAY · 2                €12  │
│ ● Test milk            1 pack   ↶    │
└──────────────────────────────────────┘
▸ At other stores · 2   ▸ Covered by home · 2   ▸ Spending   (tutti chiusi)
```
Foglio Buy (390) e picker L203:
```
Test chicken                    ✎  ✕          Use from home · instead of Test rice  ✕
7 meals this week · ½ pack at home            [ Search pantry                    ]
[ − ]  6 packs ▾  [ + ]                       SUGGESTED
 chip: ½ pack · 1 pack · 2 packs              Test pasta   1,500 g at home      ›
 = 2,400 g · the plan needs 2,100 g           ALL AT HOME
Price paid [ 7.50 € ]                         Test oil     200 g                ›
▸ Store and offer      Lidl · usual price     [ + Not at home? Add it ]
▸ Pack size in the shop
Use something from home            ›          anteprima: 500 g rice → 430 g pasta
Replace…                           ›          foot: [Back] [Use from home]
foot: [ Bought ]
```
Pantry, telefono 390:
```
[ Meals | Foods | Shop | Pantry• ]
Pantry                          [+ Add]
4 items · worth €0,30
[🔍 Search pantry        ] (Expiry ▾)
(All)(Use soon 2)(Spare)(Set aside)
! 1 expired · 1 use soon          Review
┌ card ────────────────────────────────┐
│ Test oil  Expired 24 Oct       ( − 200 g + ) │
│ Test milk Use by tomorrow      ( − 1 pack + )│   <- in «Use soon»: Use it · Thrown away · Still good
└──────────────────────────────────────┘
▸ Left on Sun 1 Nov        [What can I cook?] [Plan meals]
```
PC 1440 (Shop; Pantry uguale con «Use soon»/previsione a destra):
```
Shopping                                   [+ Add] [Scan] [Receipt] [Copy] [Stores]
26 Oct – 1 Nov
┌ lista, max 680 px ─────────────────────┐  ┌ colonna 320 px ─────────────┐
│ 3 to buy · ≈ €34 (This week ▾)(All ▾)  │  │ Today's trip  5 · €23,40 ↶  │
│ righe come su telefono (stepper a      │  │ From the receipt · 2        │
│ 40 px dal nome, non a 800)             │  │ Spending: week · month · yr │
└────────────────────────────────────────┘  └─────────────────────────────┘
```

## 3. Flussi chiave, tocchi minimi, ogni flusso finisce dove è iniziato

| # | Flusso | Tocchi | Percorso e ritorno |
|---|---|---|---|
| F1 | Spunta riga | 1 | cerchio → riga in «Bought today» + Undo. Resta. |
| F2 | Spunta con quantità/prezzo | 2 | riga → Buy → [Bought] → **lista**, stessa posizione di scorrimento |
| F3 | Scansione in negozio | 1 (in lista) / 2 (fuori) / 3 (nuovo) | Scan → camera → (spunta + toast) · (Buy → Bought) · (Nuovo cibo → Buy → Bought) → **lista**; la camera si chiude *prima* del foglio |
| F4 | «Add» manuale | 3 | Add → cerca → scegli → Buy → Bought → lista (il foglio Add non resta) |
| F5 | Extra non-cibo | 2 | campo + Add (invariato) |
| F6 | Scontrino | 4 | ⋯ → Receipt → foto → Read → Load → lista |
| F7 | Usa da casa (L203) | 3 | riga → Buy → «Use from home» → scegli → [Use] → lista (riga sparita, un Undo) |
| F8 | Cambia prodotto | 4 | Buy → Replace → scegli → [Replace] → lista |
| F9 | Dispensa: aggiungi | 3 | Add → scegli → Save → **pagina**; «Save and add another» → torna al foglio Add |
| F10 | Dispensa: modifica | 2 | riga → Save → pagina; ± in 1 |
| F11 | «Use it» | 2 | Use soon → Use it → foglio quantità/pasto **sopra la Dispensa** (nessun cambio di scheda) → Save → Dispensa |
| F12 | Esaurito / buttato | 3 | riga → Remove ▸ → Used up / Thrown away → pagina + Undo |
| F13 | Fine spesa | 0 | non serve (se si approva Q1); resta «Today's trip · 5 · €23,40 · Undo trip» |

Regola di prova per ogni riga: stato prima = stato dopo (`UI.tab`, catena fogli, posizione di scorrimento, `#cam` assente), Indietro del browser dopo il flusso porta alla stessa origine (L202).

## 4. Che cosa si toglie o si fonde (nulla di funzionale perso)

| Oggi | Dove va |
|---|---|
| Segmento periodo a 4 | pillola «This week ▾» + foglio Periodo (Custom con date dentro) |
| Icone Bought / Scan / Receipt / Copy | `[+ Add]` + Scan + `⋯` (Receipt, Copy, Stores, Spending) |
| `shop-prod`, `pantry-prod`, `pdOpen`, `pd-scan`, `shop-scan` | un solo `add-open {for}` e una sola scansione (F3) |
| `UI.dest`, `UI.labelFor`, `UI.recipeSheet`, `closeToRoot` | `flow.from` + `endFlow`; la ricetta (`rc-scan`) usa lo stesso meccanismo |
| «In the cart» (stato `checked`) + «Finish shopping» + «Take out» + `by-out` | [Bought] = spunta con quantità/prezzo (Q1); «Take out» = untick in «Bought today»; dati vecchi `checked` letti e chiusi al primo avvio (migrazione, compatibilità sync) |
| «Ticked today» + «Bought, not on the list» | un gruppo «Bought today» |
| Card scadenze (Pantry e Today) | riga d'avviso + filtro «Use soon»; la card di Today resta, «Use it» non cambia scheda |
| Segmento ordinamento a 4 | pillola «Expiry ▾» + foglio con 4 `lrow` |
| Cook / Plan meals in testa | in coda alla lista / colonna destra su PC |
| Foglio Buy: 8 blocchi | 3 visibili + 2 sezioni chiuse + 2 `lrow` |
| `.pan-q` e `.pk-st` | uno stepper (`.pk-st`) |
| 8 chip «Counted in», fila a scorrimento, `paQuick` (M18) | controllo quantità unico (L209) |
| Casella «At home» del planner/cibo | solo lettura + «+ ½ pack» + «Open» (M18); un solo editor, il foglio dispensa |
| Sezione «Add to pantry» senza cibo (`pa-q`, `pa-pick`) | eliminata dopo verifica dei riferimenti dinamici (regola 2 «Niente codice obsoleto») |
| `shelf` in `destPick`, ramo `&& false` nel tick | eliminati |
| 4 wrapper di `SHEETS.pantry`, 2 di `buy` | fusi in un'unica definizione per foglio (prima fase di pulizia per fase) |

Restano: tutti i negozi/prezzi (per negozio, offerta, storico), spese e budget, extra ricorrenti, scontrino con AI, copia lista, forecast, filtri/ordine (salvati), Cook/Plan, costo/scorta, scadenze con spreco, «Still good».

## 5. Come si incastrano L203, L204, L205 e M18

- **M18 (L208–L210)** è assorbita in **P2**: il ramo `claude/m18-wip` (L208 pillola «at home», L209 foglio dispensa a confezioni) si **rebasa su `main`, si verifica** (suite, `design-reviewer` su 820/1440/scuro: manca, lo dice il suo stesso documento) e si pubblica *prima* della nuova IA, così il controllo quantità esiste già quando lo si mette nel foglio Buy. L210 (chip ½/1 pack nel planner) segue con le regole `boundsFor`. Le «idee per M19» di `PACK_QUANTITIES.md` (un solo controllo, stessa anatomia di riga, casella «At home» in sola lettura, sezioni chiuse in Buy, «Planned» riassunta) sono recepite qui: sezioni 2 e 4.
- **L203** (picker libero dalla dispensa) = **P5**: la riga «Use something from home ›» del foglio Buy apre un foglio *picker* con tutta la dispensa (ricerca, stessa lista della Pantry), gruppo «Suggested» in testa (stesso ruolo P/C/F, come L189), poi «All at home»; scelta → anteprima nello stesso foglio («500 g of rice → 430 g of pasta», un solo Undo) → [Use from home] → lista. Se l'alimento non è in dispensa: «Not at home? Add it» apre il flusso Add dispensa (F9) e **torna al picker** con l'alimento scelto (flusso annidato di 2 livelli, regola `flow.from`).
- **L204** (decisione (a): copia locale della ricetta nel piano) resta in M5d: riguarda il piano, non queste schermate. Il picker lo prevede: per un prodotto usato solo dentro una ricetta mostra «used in a recipe: those meals change after L204» e per ora sostituisce i soli pasti diretti (come L189). Nessun lavoro in M19 oltre al segnaposto.
- **L205** (sgarro + resto del pasto) è del planner: fuori da M19, nessuna dipendenza.
- **L211** (audit su Spesa/Dispensa) va in **P1**, test prima.

## 6. Fasi, test, rischi

Ogni fase si pubblica da sola, con riepilogo e SHA di rollback (AGENTS «Commit e push»). Complessità: S piccola, M media, L grande.

| Fase | Contenuto | Compl. | Pubblicabile da sola perché… |
|---|---|---|---|
| **P0** | Test rossi che riproducono 1, 2, 4, 5-ritorno (script `flows.js` portati nell'harness); `flow.from` + `endFlow` + scansione unica + camera chiusa prima del foglio + mai `UI.tab` come effetto; `xp-use` senza cambio scheda; C1 (blur prima di navigare) | M | nessun cambio di aspetto: solo il ritorno giusto |
| **P1** | Difetti L211 su Spesa/Dispensa (0×, toast/spese, `shop-done` g≤0, prezzo 0, Undo a delta, `qty-save`), codice morto di cui sopra | S–M | correzioni isolate, test prima |
| **P2** | M18: rebase e verifica L208/L209 (+L210) | M | funzione già scritta, da verificare |
| **P3** | Shop: intestazione `Add/Scan/⋯`, pillole periodo/negozio, «Bought today», Buy snellito con controllo unico, sezioni chiuse; **Q1** | L | schermata sola; Pantry invariata |
| **P4** | Pantry: intestazione, ordinamento a pillola, avviso + filtro «Use soon», riga unica, foglio con «Save and add another» / Used up / Thrown away | M | schermata sola |
| **P5** | L203 picker + «Add it» + anteprima | M | uso del flusso di P0 |
| **P6** | PC/tablet: due colonne a 1440, colonna 720 a 820 (facoltativa, Q5) | M | solo CSS/griglia |

**Piano di test** (regola 2 e 4): `tests/m19-flows.test.js` guidato da tabella (F1–F13 sezione 3) con fixture sintetiche: prima/dopo di `UI.tab`, catena fogli, scroll, `#cam`, Indietro (`history.back`), reload (persistenza), offline; test numerici su `packWords` e sul preview L203 (Σ(fabbisogno) = Σ(coperto) + Σ(da comprare), la scorta non cambia finché non si compra); migrazione di `checked` legacy; `layout-audit` con i nuovi fogli in `SHEETS_TO_OPEN` (picker, Periodo, ⋯) su 390/820/1440 e `--dark`, 0 problemi; `design-reviewer` prima di ogni commit visivo (regola 10); `code-guard` per TDZ e wrapper. Fuori dal test: OFF di rete e fotocamera reale (da provare a mano su telefono).

**Rischi**
- Wrapper a cascata (`SHEETS.pantry` ×4, `buy` ×2, `shop-check`, `scan`, `prodadd`): una regex su `o.body.replace` può rompersi cambiando l'HTML. Mitigazione: P0/P1 fondono i wrapper *prima* di cambiare l'HTML; `grep SHEETS.<nome>` a ogni passo (AGENTS «Trappole»).
- TDZ: `ACT`/`INP`/`CHG` registrati dopo la dichiarazione; `endFlow` va definito accanto a `closeSheet`, prima dei chiamanti.
- Dati: `S.shop.checked`, `buys`, `pantry[id].{u,pw,pk}` devono restare leggibili (sync tra dispositivi); la migrazione di `checked` è unilaterale e va provata con `fake-supabase`. L'unico id nei `data-*` va sempre `esc()` (audit XSS).
- `flow.from` dentro la cronologia `NAV`: salvare id e tipo, non l'oggetto (C3), altrimenti Indietro riapre fogli stantii.
- ~960 `!important`: le larghezze PC e le pillole richiedono di verificare gli override a fondo file.
- `OFF_UNREACHABLE` latch: una rete debole disattiva la ricerca prodotti fino al reload; il flusso «codice sconosciuto» deve dirlo e offrire «Nuovo cibo».
- M18 non verificata: P2 può chiedere correzioni; è per questo che precede P3.
- Cambio di abitudine (nessun «Finish»): comunicare nel riepilogo di pubblicazione, rollback indicato.

## 7. Domande per l'utente (max 5)

1. **«Comprato» ha un solo significato?** Oggi spunta = dispensa subito, «In the cart» = dopo «Finish shopping». *Raccomando*: tutto è comprato subito (con Undo e «Bought today»), niente «Finish»; il totale di oggi resta come «Today's trip».
2. **Scansione di un prodotto fuori lista.** *Raccomando*: apre Buy precompilato come extra (2 tocchi) invece del vicolo cieco di oggi; e dopo ogni scansione la lista torna in primo piano con il tasto Scan a portata di pollice per il prodotto successivo.
3. **Confezioni al primo posto?** Per i cibi con confezione nota (e non a peso variabile) quantità e stepper in «½ pack / 2 packs», grammi esatti sotto. *Raccomando*: sì, come da M18; i grammi restano scrivibili.
4. **«Used up» e «Thrown away» nel foglio dispensa** (oggi lo spreco si registra solo dalla card scadenze). *Raccomando*: sì, due voci in «Remove» con Undo; «Thrown away» alimenta la riga «Thrown away in the last 30 days».
5. **PC a due colonne** (lista + colonna destra) invece di una colonna larga. *Raccomando*: sì, ma come ultima fase (P6): le prime cinque fasi non lo richiedono.
