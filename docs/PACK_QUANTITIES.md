# Quantità a confezioni (M18: L208, L209, L210)

Richiesta dell'utente del 26/10: vedere nella spesa quanto ho già a casa; inserire la dispensa a confezioni (intero, mezzo, più pacchi); mettere nel planner il pacco intero o mezzo. Progetto: **un solo linguaggio di quantità**, nessun controllo nuovo appoggiato.

## Il linguaggio
- **Parole a confezioni** (`packFrac`, `packWords`): una quantità si legge in confezioni solo quando è vicina (±2 %) a un multiplo semplice: ¼, ⅓, ½, ⅔, ¾ e interi con frazione fino a 10 («½ pack», «1½ packs», «2 packs»). Altrimenti si legge solo nell'unità esatta: niente «0.43 packs».
- **Le grammature restano esatte sotto**: la dispensa salva sempre grammi/ml (`S.shop.pantry[id].g`), il planner salva sempre grammi (`item.qty`); le confezioni sono solo un modo di leggere e di inserire.
- **Dimensione della confezione**: una sola fonte, `pantryUnits(f, p).pack` (il pacco del cibo, o quello scritto in dispensa se il cibo non ce l'ha). Prodotti a peso variabile (`varPack`, es. frutta e verdura) non parlano a confezioni.
- **Pezzi**: dove la dispensa conta a pezzi (`u = "pz"`), stessa regola con «3 pcs».

## Dove compare
| Punto | Prima | Dopo |
|---|---|---|
| **Spesa, riga** (L208) | «400 g from home» nel sottotitolo (quota coperta, non la scorta) | pillola discreta **«½ pack · 500 g at home»** = la scorta reale della dispensa (stessa fonte, nessun secondo conteggio); la quota coperta compare solo se è diversa dalla scorta (giorni prima della finestra), come «N g of it for these days» |
| **Foglio «Buy»** (L208) | «Planned: … · 500 g at home» (scorta + libero, non la scorta) | stessa pillola della riga nella riga «Planned» |
| **Foglio dispensa** (L209) | 8 chip «Counted in», fila di chip a scorrimento tagliata, campo «Amount at home» | lo **stesso stepper grande del planner** (`.qty`: − campo +) con l'unità scelta in un selettore accanto al campo; per i cibi a confezioni si apre **in confezioni** (passo ½ pack) e il campo accetta ½, 1½, 1/2; sotto, i chip **½ pack · 1 pack · 2 packs · 3 packs** (¼ solo per pacchi da 500 g in su) che vanno a capo, poi l'equivalente esatto («= 500 g», o «= ½ pack» se si conta in grammi) |
| **Box «At home»** (planner e cibo) | «0.5 packs · …» | «½ pack · …» (stesse parole) |
| **Lista dispensa** | «0.5 packs» | «½ pack» |
| **Planner, editor della quantità** (L210) | chip 50/100/150/200 g | stessi chip più **½ pack** e **1 pack** quando quella quantità è una porzione plausibile (al massimo il doppio della porzione più grande che il planner userebbe, `boundsFor`); i grammi restano il campo esatto; un chip di grammi uguale a un chip di pacco non si ripete |

## Regole rispettate
- Scorta ≠ consumo pianificato ≠ consumo effettivo: la pillola della spesa legge solo `S.shop.pantry`; nessuna proiezione scrive la scorta.
- Nessuna formula nutrizionale toccata: cambia solo come si legge e si inserisce una quantità.
- Nessuna funzione tolta: le unità della dispensa (g, kg, ml, l, cl, pezzi, pacchi, cucchiai) restano tutte nel selettore.

## Stato (26/10 sera)
L208 fatto; L209 fatto (manca la revisione `design-reviewer` su 820/1440 e scuro); L210 non iniziato (editor quantità del planner: chip ½ pack / 1 pack con la regola `boundsFor` sopra).

## Idee d'insieme per M19 (L212, riprogettazione di Spesa e Dispensa)
- Un solo «amount control» (stepper `.qty` + chip a confezioni + equivalente esatto sotto) per dispensa, planner, ricetta e foglio «Buy» («You're taking» oggi è un campo in grammi con chip «1 pack · 1,000 g»: diventerebbe lo stesso controllo in confezioni).
- La riga della spesa e la riga della dispensa con la stessa anatomia: nome, pillola «at home», quantità a destra nello stesso stepper a pillola (`.pk-st`).
- Il box «At home» del planner e il foglio dispensa sono due editor della stessa scorta: tenerne uno (il foglio) e lasciare nel box solo lettura + «+ ½ pack».
- Il foglio «Buy» ha molte sezioni sempre aperte (prezzo, negozio, dimensione del pacco): le meno usate in sezioni ripiegabili chiuse.
- La riga «Planned: … for d Tue, Test bowl Wed, …» è lunghissima: riassumerla («7 meals this week») con il dettaglio in una sezione chiusa.
