# Sonno: quanto dormire stanotte (26/10/2026)

Il numero «Tonight X h · in bed by HH:MM» (card Sleep di Today e foglio «Sleep and you») è una somma di termini. Ogni termine compare nel foglio con le sue ore. Codice: `sleepTonight()` in `source/engine.html`; test numerici indipendenti in `tests/m13a.test.js`.

| Termine | Valore | Base |
|---|---|---|
| Bisogno abituale | impostazione (default 7,5 h) | Il consenso AASM/SRS dice **almeno 7 h** per gli adulti (Watson et al. 2015, [PubMed 25979105](https://pubmed.ncbi.nlm.nih.gov/25979105/)). |
| Sonno arretrato | **¼ h per ora di debito**, al massimo +1 h a notte | 1 h di debito ha richiesto circa 4 notti per rientrare in uno studio di estensione del sonno (Kitamura et al. 2016, Sci Rep 6:35812; 15 uomini giovani: il rapporto è indicativo). Debito = somma sulle ultime 7 notti di max(0, bisogno − dormito), solo con almeno 3 notti registrate e più di 0,5 h. |
| Giorno di carico alto | +30′ se il carico supera 1,5 volte il solito, +15′ tra 1,2 e 1,5 | Direzione: Halson 2014 (Sports Med 44 S1:13, [PMC4008810](https://pmc.ncbi.nlm.nih.gov/articles/PMC4008810)); Mah et al. 2011 ([PubMed 21731144](https://pubmed.ncbi.nlm.nih.gov/21731144/): 10 h a letto migliorarono la prestazione di 11 cestisti, senza gruppo di controllo). **Le dimensioni sono dell'app**: gli studi non danno una dose. |
| Domani gara / sessione dura o lunga | +30′ / +15′ | Come sopra (dimensioni dell'app). |
| Prontezza bassa (HRV o FC a riposo) | +15′ | Segnale di fatica o malattia; dimensione dell'app. |
| Giornata molto attiva (NEAT) | +15′ se i passi sono almeno 10 000 e almeno 1,5 volte la media dei 14 giorni precedenti | Dimensione dell'app. |
| Pisolino oggi | −metà della durata, al massimo −30′ | Il pisolino conta nelle 24 h; dimensione dell'app. |

Il totale degli extra è limitato a +1,5 h; il risultato sta tra max(5, bisogno − 0,5) e 10 h. L'ora a letto è «sveglia − ore − 15′» (il quarto d'ora è il tempo per addormentarsi).

## Cosa non c'è (e perché)
- Nessuna correzione per età o cronotipo: servono dati che l'app non ha.
- Il bisogno abituale resta un'impostazione. Kitamura 2016 mostra che il bisogno ottimale varia da persona a persona: un valore stimato dai dati dell'utente (sonno dopo il quale HRV e FC sono nella norma) è un'idea per una milestone futura, da approvare.
- Le dimensioni dei termini di carico, gara, prontezza e NEAT sono scelte dell'app: se vuoi cambiarle o toglierle, ognuna è una riga di `sleepTonight()`.
