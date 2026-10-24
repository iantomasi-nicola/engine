# Roadmap tecnica

Aggiornamento 24 ottobre 2026: autorizzati merge M1 su main e pubblicazione Pages;
vedere [PUBLICATION_M1.md](PUBLICATION_M1.md). Nessuna milestone successiva avviata.

## Evoluzione prodotto — milestone autorizzata

La richiesta del 23 ottobre 2026 «Parti dalla milestone che risolve i problemi con
storage e lista della spesa e committa» autorizza **M1 — Integrità Storage/Shopping**.
`PRODUCT_REQUIREMENTS.md` conserva integralmente l'allegato originale; non era presente
nel checkout. Il suo elenco M0–M11 resta il backlog di prodotto, non un'autorizzazione
a implementare tutte le funzionalità. M0 è la presa in carico già conclusa.

**M1: completata e verificata localmente il 23 ottobre 2026.** Anticipa la riconciliazione
inventario di M4 perché necessaria alla correttezza di M1. Include §4.1–4.3 per gestione
inventario e quantità e §9.1/9.5 per
fabbisogno, acquisto, consumo e annullamento; corregge i prezzi nei flussi esistenti.
Non include nuove integrazioni OFF/AI, recipe engine, pianificazione, formule nutrizionali,
nuove analytics dei costi, extras riutilizzabili o filtri temporali di M4.

Esito: 23 test di dominio e 51 controlli browser superati (17 scenari su tre viewport),
build e smoke offline superati. Il riproduttore `DATA-01` resta fallente e fuori dal
perimetro M1; nessuna validazione cloud reale implicita. Dettagli e limiti in
[M1_STORAGE_SHOPPING.md](M1_STORAGE_SHOPPING.md) e [PROJECT_STATUS.md](PROJECT_STATUS.md).
Checkpoint locale: `checkpoint/storage-shopping-m1-2026-10-23`; versione precedente:
`restore/pre-storage-shopping-m1-2026-10-23`. Nessun merge, deploy o push.

### Criteri di accettazione M1

1. Una sola proiezione deterministica aggrega alimenti e ingredienti delle ricette,
   scala le porzioni e sottrae le scorte disponibili una volta sola, anche parziali.
2. Gli articoli coperti sono esclusi dagli acquisti e visibili in una sezione richiudibile;
   esaurimento previsto e riserve per piani precedenti sono espliciti.
3. Pianificare/modificare un pasto non riduce la giacenza reale. Il consumo effettivo
   registra quanto è stato realmente prelevato; annullamento/modifica non inventano scorte.
4. Acquisto rapido e carrello mantengono quantità, prezzi e metadati coerenti; annulla
   ripristina soltanto l'operazione pertinente e non cancella acquisti successivi.
5. Quantità e confezioni conservano precisione; niente conversioni g↔ml implicite.
   Frazioni di confezione e prezzi riferiti a quantità esplicite sono modificabili.
6. Ricerca e ordinamento A–Z/Z–A della dispensa con preferenze persistenti.
7. Stato persistente verificato dopo reload e offline; failure di salvataggio delle
   operazioni inventario visibile senza confermare una scrittura fallita.
8. Compatibilità con i dati esistenti, backup verificato prima delle nuove scritture
   inventario, strategia di rollback documentata e testata con fixture.
9. Test di dominio, flussi Foods → Recipes → Meal Plan → Storage → Shopping e smoke
   mobile/tablet/desktop. Integrazione cloud simulata; niente account reali nei test.
10. Commit descrittivi, output statici aggiornati, tag checkpoint locale a fine milestone.

### Milestone successive — non iniziate

M2 ricette/AI; M3 Meal Plan; M4 periodi, cost analytics ed extras; M5 audit scientifico
(formule subordinate a proposta approvata e libro quando disponibile); M6 ottimizzazione;
M7 meteo; M8 running/ICU; M9 forza; M10 report; M11 audit finale.
I rischi trasversali DATA-01/03 e PUSH-01 restano nel backlog tecnico sottostante;
M1 non dichiara risolti isolamento account o restore generale.

## Backlog tecnico della presa in carico

Stato al 23 ottobre 2026. Priorità proposte, non impegni di rilascio né autorizzazioni
ad applicare modifiche a produzione. Nessuna nuova funzionalità in questa presa in carico.

| Priorità | Intervento | Criterio di completamento |
| --- | --- | --- |
| P0 | Isolare dati/coda per account e definire cambio sessione (`DATA-01`) | Test A offline → logout → B: nessuna scrittura di A attribuita a B; migrazione della coda legacy con backup e gestione esplicita degli elementi senza proprietario |
| P1 | Rendere affidabile persistenza e backup (`DATA-02`, `DATA-03`) | Errori quota/IndexedDB visibili; restore fermato se il backup obbligatorio non è verificato; prova export/import inclusi foto e chiavi opzionali |
| P1 | Versionare toolchain e test essenziali (`BUILD-01`, `TEST-01`) | Manifest/lockfile, versione Node documentata, comando build e smoke ripetibili, CI su branch senza deploy automatico |
| P1 | Verificare sync e isolamento cloud | Ambiente Supabase di prova; RLS tra due account, retry, conflitti, cancellazioni Realtime e cambio account coperti; nessun dato reale |
| P2 | Affidabilità notifiche (`PUSH-01`) | Test errori transitori, retry e concorrenza; distinguere tentativo da consegna e prevenire doppie elaborazioni |
| P2 | Inventario dipendenze e superfici di sicurezza | Versioni/provenienza/licenze degli asset vendor, audit delle dipendenze, contratti dei provider e trattamento delle chiavi documentati |
| P2 | Riproducibilità degli output e cache | Identificatore build robusto, test aggiornamento service worker e configurazione, comportamento documentato per asset persistenti |
| P3 | Modularizzazione mirata | Solo dove richiesta da cambiamenti concreti, con test di equivalenza; nessuna riscrittura generale preventiva |

## Sequenza consigliata

1. Aprire un intervento dedicato all'isolamento della coda offline, mantenendo il tag iniziale.
2. Coprire salvataggio/backup/restore con errori simulati e dati sintetici prima di migrare formati.
3. Portare installazione e test sotto versionamento e CI, quindi ampliare la regressione
   su acquisti → dispensa → annulla, pasti, allenamento/timer e sincronizzazione.
4. Pianificare nuove funzionalità solo con criteri di accettazione e strategia di rollback.

## Completato nella presa in carico

- Ispezione architettura, cronologia, servizi e istruzioni disponibili.
- Baseline di ripristino e branch separato; documentazione e regole permanenti.
- Build e verifiche browser locali; riproduzione isolata del difetto `DATA-01`.

## Ancora da verificare

Il progetto remoto Supabase e le impostazioni GitHub Pages non sono stati ispezionati.
Push, provider AI, OCR/camera, GPS, Safari/iOS, export XLSX e concorrenza multi-device
richiedono verifiche specifiche; non sono coperti dallo smoke attuale.
