# Roadmap tecnica

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
