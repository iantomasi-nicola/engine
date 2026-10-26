# Audit di sicurezza e integrazioni (M6) — 24/10/2026

Perimetro: ENG-06 (sicurezza), ENG-07 e G5 (scritture verso intervals.icu), A5 (Open Food Facts). Metodo: lettura del codice, schema SQL e funzione push; poi test automatici su dati sintetici (`tests/security.test.js`, `tests/intervals-writes.test.js`, `tests/off.test.js`). Nessun dato reale, nessuna chiamata di rete reale, mai il progetto Supabase reale.

## Riepilogo

| # | Tema | Esito | Azione |
|---|---|---|---|
| S-1 | Chiavi (intervals.icu, AI, mappa) nel documento `settings` sincronizzato nel cloud | **Aperto: decisione dell'utente** | Proposta sotto |
| S-2 | Isolamento righe (RLS) su `engine_docs`, `push_subs`, `push_queue`, Storage `progress` | OK | Test sullo schema |
| S-3 | Testo ostile (cibi da fuori, nomi importati, note, risposte AI) mostrato come markup | OK su 18 schermate e 9 schede | Test con controllo positivo |
| S-4 | Backup/esportazione contengono chiavi | OK: escluse di default | Test |
| S-5 | CSP | Accettata con limiti noti | Documentata |
| S-6 | Script di terzi | OK: versioni fisse, host unico | Test |
| S-7 | Funzione `engine-push` | OK: rifiuta senza segreto (confronto a tempo costante) | Test |
| I-1 | **«Plan from intervals.icu» spento ma le modifiche al piano e le gare partivano comunque verso intervals.icu** | **Corretto** | Test scritto prima, rosso, poi verde |
| I-2 | Scritture verso intervals.icu: elenco completo e confini | OK | Test |
| O-1 | Un solo errore di rete disattivava Open Food Facts fino al ricaricamento | **Corretto** | Pausa di 60 s, poi riprova |
| O-2 | Cache di ricerca senza scadenza | **Corretto** | 10 minuti |
| O-3 | Prodotto con solo il nome salvato come cibo da 0 kcal | **Corretto** | Si apre l'editor da completare |
| O-4 | Attribuzione/licenza ODbL | **Aggiunta** | Nell'editor dei prodotti importati |

## S-1 Chiavi nel cloud (decisione necessaria)

`saveSettings()` scrive **tutto** `S.settings` nel documento `settings` su Supabase, comprese la chiave intervals.icu (`intervals.key`), le chiavi dei servizi AI (`ai.services[].key`) e la chiave MapTiler (`mapKey`). Sono protette dalla RLS (solo il proprietario le legge) ma sono in chiaro nel database. Vantaggio: su un secondo dispositivo funziona tutto senza reinserirle. Rischio: chi ottenesse accesso al database o all'account Supabase le leggerebbe; per intervals.icu la chiave consente anche di scrivere sul calendario.

Proposta (non applicata, cambia il comportamento tra dispositivi): le chiavi restano **solo su questo dispositivo** (archivio locale separato), fuori dal documento sincronizzato; interruttore «Condividi le chiavi tra i miei dispositivi» spento di default. Migrazione senza perdite: ogni dispositivo che ha già le chiavi le tiene; il cloud viene ripulito; un dispositivo nuovo le chiede una volta.

## I-1 Scritture verso intervals.icu (corretto)

Bug riprodotto con test: con «Plan from intervals.icu» **spento** (ma chiave collegata), `planDiff` continuava a marcare come da inviare i nuovi allenamenti pianificati, le modifiche e le cancellazioni, e `icuSyncDirect` li inviava (POST/PUT/DELETE su `/events`); lo stesso per le gare. Ora: nulla di ciò che riguarda il piano o le gare viene accodato né inviato finché l'interruttore è spento; ciò che era già in coda resta in attesa. Il testo dell'interruttore dice «workouts and races».

Inventario completo delle scritture (tutte con il proprio interruttore, tutte verificate con un'API simulata):

| Chiamata | Quando | Interruttore |
|---|---|---|
| `POST /athlete/{id}/events` | nuovo allenamento pianificato o gara creati qui | Plan from intervals.icu |
| `PUT /athlete/{id}/events/{id}` | modifica di un evento che arriva da intervals.icu | Plan from intervals.icu |
| `DELETE /athlete/{id}/events/{id}` | cancellato qui un evento che Engine aveva (solo gli id registrati) | Plan from intervals.icu |
| `PUT /athlete/{id}/wellness/{data}` | check-in degli ultimi 15 giorni **solo per i campi che intervals.icu non ha** (mai sovrascrive) | Check-in |
| `POST /athlete/{id}/activities/manual` | allenamento finito creato qui, una sola volta (`external_id`) | Send finished workouts |
| `PUT /activity/{id}` | RPE/descrizione di un'attività creata da Engine | Send finished workouts |

Verificato: sync senza nulla in sospeso = solo letture; un errore del server mantiene l'elemento in coda; un 401/403 ferma tutto; nessun evento remoto non registrato viene mai toccato; nessuna scrittura fuori da questi cinque percorsi.

Limite dichiarato: una cancellazione fatta in Engine di un evento che arrivava da intervals.icu **lo cancella anche là** (con «Plan from intervals.icu» acceso è il comportamento voluto: il calendario è lo stesso).

## O — Open Food Facts

- `OFF_UNREACHABLE` (latch di sessione) sostituito da una pausa di 60 secondi (`offDown/offFailed`): un errore non spegne più l'app fino al ricaricamento; un 404 «non trovato» non è un errore.
- Cache di ricerca con scadenza a 10 minuti (prima: per tutta la sessione); un errore non viene ricordato.
- `lookupAndAdd` aveva due definizioni (una ridefinita più sotto): ora una sola.
- Prodotto trovato con solo il nome (`incomplete`): non viene più salvato come cibo da 0 kcal; si apre l'editor con il nome per completare i valori dall'etichetta. In una ricetta, un prodotto completo viene aggiunto direttamente.
- Il testo del prodotto (nome, marca) resta testo anche con markup ostile.
- Attribuzione: «From Open Food Facts (ODbL)» con collegamento alla licenza.

## Sicurezza: note

- **S-3** Il test pianta un testo con `<img onerror>`, `<script>` e virgolette in cibi, ricette, piano, extra, scorte, integratori, pasti, coda barcode, gare, test, note, allenamenti, giornale e risposte AI; apre 18 schermate e 9 schede su telefono e desktop. Un controllo positivo prova che il rilevatore vede una vera iniezione.
- **S-5** (*script-src risolto in L211: la build mette l'hash di ogni script inline al posto di `'unsafe-inline'`, gli attributi evento inline sono stati tolti; resta `style-src 'unsafe-inline'` per i ~600 attributi `style`, non eseguono codice*) La CSP ha `connect-src https:` (servizi AI scelti dall'utente, intervals.icu, Open Food Facts, meteo, Supabase). Resta `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`. Possibile restringimento futuro: `connect-src` con elenco di host più un'eccezione per l'host del servizio AI scelto.
- **S-6** Nessuno script di terzi è caricato da altri host (M14b gruppo C): xlsx (SheetJS 0.18.5, Apache-2.0, identico byte per byte al pacchetto npm), tesseract, zxing e supabase sono nei file del sito (`vendor/`, il build riscrive l'indirizzo di tesseract) e la CSP non elenca più cdnjs.
- **Chiavi**: la chiave Supabase in `config.js` è la chiave pubblica «publishable»; la sicurezza dei dati poggia sulla RLS.
