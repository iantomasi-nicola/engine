# Brief dell'utente del 27/10/2026 — algoritmo avanzato di composizione corporea e condivisione della misura (L220, L221)

Testo della richiesta, riassunto fedele (l'originale era in inglese). Regole che valgono su tutto: AGENTS.md (regola 3: formule solo con fonti PubMed e approvazione dell'utente, una per una), niente dati reali nei test, niente MAC/bind key/token nel repo.

## Obiettivo
Stimare la composizione corporea con la Xiaomi Body Composition Scale S400 (modello cloud `yunmai.scales.ms104`) nel modo **più accurato e scientificamente difendibile**, integrato in Engine, con condivisione elegante della misura del giorno (Story Instagram e testo). È un compito di **implementazione**, non solo una proposta.

## 1. Prima ispezionare e riusare
Analizzare l'intera repo: integrazione S400/Bluetooth esistente (`source/web/scale-live.html`), check-in e misure, profilo (altezza, età, sesso), storico peso, motori di calcolo, storage locale/sync/PWA offline, componenti UI, grafici, impostazioni, condivisione. **Riusare** campi e dati esistenti, nessun campo duplicato, nessun motore parallelo; mappare i campi, aggiungere solo l'indispensabile; preservare dati e architettura.

## 2. Obiettivo scientifico
La S400 dà peso (kg), impedenza a 50 kHz e 250 kHz (Ω), ora; il resto dal profilo e dallo storico. Esempio reale: 80,0 kg, 371 Ω (50 kHz), 326 Ω (250 kHz), 24 anni, maschio. Una misura precedente: ~21% in Xiaomi Home e ~9% in OpenVitals: **la discrepanza va indagata, non mediata**.
Fonti in ordine: studi PubMed e equazioni validate; equazioni piede-piede validate contro DXA/multicompartimentali; BIA multifrequenza; analisi del firmware/algoritmo Xiaomi; dataset NHANES con BIA/DXA; atleti e popolazioni attive; idratazione, variabilità e bias del dispositivo.
Per ogni modello documentare: equazione e coefficienti esatti, DOI/PMID, variabili e unità, geometria e frequenza, differenza tra resistenza/reattanza/impedenza, popolazione di sviluppo, riferimento, metodo di validazione, errore (anche individuale), compatibilità con la S400. **Non assumere che un'equazione mano-piede valga sulla S400.**
Confrontare dove fattibile: algoritmo nativo Xiaomi riprodotto; migliore equazione piede-piede validata; regressione multifrequenza; modello antropometrico dal profilo; modello ibrido (se i dati lo supportano); taratura personale con DXA. Verificare se i 250 kHz migliorano la predizione rispetto ai soli 50 kHz. Metriche: MAE e RMSE in punti percentuali di grasso, bias, Bland–Altman, calibrazione e sottogruppi, incertezza individuale, ripetibilità e stabilità longitudinale, generalizzazione a persone mai viste, **senza fuga di dati** (osservazioni ripetute della stessa persona raggruppate). Preferire modelli interpretabili se comparabili; scegliere l'errore più basso validato in modo indipendente. Se non esiste un dataset S400–DXA: implementare la migliore base difendibile e dichiarare che l'accuratezza sulla S400 **non è verificata**. Nessuna pretesa di precisione clinica o ±1%.

## 3. Personalizzazione
Taratura longitudinale individuale, rilevamento di impedenze anomale, controlli di coerenza, variabilità legata all'idratazione, filtro robusto delle anomalie temporanee, circonferenza vita opzionale, DXA di riferimento opzionali. Una sola DXA può correggere un bias individuale ma non prova l'accuratezza. Lo smoothing storico non cambia mai i dati registrati; distinguere sempre misure grezze, stime e trend. Mai inventare ciò che non si può dedurre.

## 4. Metriche
Dirette: peso, impedenza 50 kHz, 250 kHz. Derivate deterministiche: differenza e rapporto delle impedenze, variazione relativa, indice di impedenza su altezza. Stimate: grasso %, massa grassa (kg), massa magra (kg), FMI, FFMI, acqua totale (L e %) se difendibile, metabolismo a riposo con un'equazione adeguata. Muscolo scheletrico, ICW/ECW, grasso viscerale solo se c'è evidenza adeguata. **Mai inventare reattanza, angolo di fase, massa ossea.** Ogni metrica con versione del modello, metodo, unità e classe di affidabilità; niente decimali ingiustificati.

## 5. Condivisione della misura del giorno
Tasto **Share** discreto nel dettaglio della misura; flusso: apri la misura → Share → Story o Testo → anteprima → esporta. Veloce, offline dove la piattaforma lo permette, compatibile con browser Android e PWA installata.
- **Story**: PNG 1080×1920 (9:16), design minimale e premium coerente con Engine, aree sicure delle Story, leggibile su mobile. Contenuto se disponibile e affidabile: data, peso (metrica principale), grasso stimato, massa grassa e magra, acqua, variazione dalla misura precedente, trend 7 giorni, piccolo marchio Engine. Layout che si adatta alle metriche mancanti; anteprima; scelta delle metriche; condivisione nativa o download PNG; **non fingere la pubblicazione diretta su Instagram**.
- **Testo** (WhatsApp, Telegram…): riepilogo pulito, es. «📊 Engine — Daily Body Check / 📅 27/10/2026 / ⚖️ Weight / 📉 Body Fat / 💪 Fat-Free Mass / 💧 Body Water / 📈 trend / nota: i valori sono stime». Copia con un tocco, condivisione nativa, metriche opzionali, compatto, unità e localizzazione corrette, nessun valore vuoto/non valido, nessuna pretesa medica. Non esporre MAC, identificativi o dati di salute non selezionati.

## 6. Architettura
Una sola fonte di verità per i calcoli; riuso del profilo e delle misure; modelli versionati; stime storiche riproducibili; offline-first; persistenza coerente al reload; errori chiari; responsive e accessibile; nessuna dipendenza inutile; nessun codice morto o logica duplicata. Nutrizione, spesa energetica e tracking corporeo devono restare coerenti: se un algoritmo nuovo sostituisce una formula, verificare tutti i componenti dipendenti. Conservare i dati grezzi; non sovrascrivere stime vecchie senza tracciare la versione.

## 7. Test richiesti
Input reale S400 (80 kg, 371 Ω, 326 Ω); decodifica BLE e assegnazione delle frequenze; profilo incompleto; impedenze non valide; misure ripetute; anomalie di idratazione; coerenza delle stime; regressione su esempi pubblicati; calcolo offline; persistenza e reload; versioni storiche dell'algoritmo; taratura personale DXA; PNG della Story (risoluzione e layout); accuratezza del testo; visibilità delle metriche; metriche mancanti; ripieghi della condivisione nativa; compatibilità mobile/PWA. I valori mostrati e quelli esportati devono coincidere con lo stesso risultato centralizzato. Eseguire suite e build.

## 8. Esecuzione
Ramo dedicato, commit mirati, reversibile, nessuna riscrittura di componenti estranei. Se un'affermazione scientifica non è verificabile o manca un dataset, dichiarare il limite e implementare l'alternativa meglio supportata. Non fermarsi alle raccomandazioni quando si può implementare.
Sequenza: ispezionare → riuso → ricerca → valutare candidati → implementare il migliore difendibile → integrare nelle misure e nei cruscotti → personalizzazione/taratura → Story e testo → test e UI mobile → rimuovere il codice obsoleto.

## 9. Consegne
Implementazione funzionante; algoritmo scelto ed equazioni; fonti DOI/PMID; confronto con le alternative; risultati reali di validazione dove ci sono dati; stime reali per l'esempio S400; cruscotto integrato; export Story; export testo; test e risultati; file e commit modificati; incertezze residue e opportunità di taratura.

**Standard non negoziabile**: massima accuratezza individuale basata su evidenze con il minor errore possibile, non massima complessità. Mai confondere correlazione e accuratezza; mai presentare previsioni non validate come precisione clinica.

## Note di coordinamento (27/10)
- La ricerca già fatta è in `docs/BIA_PROPOSAL.md` (candidata unica Matias 2021, taratura su DXA, dati grezzi sempre salvati; nessuno studio PubMed sulla S400; nessuna equazione piede-piede a due frequenze validata): le decisioni D-BIA-1…10 restano all'utente.
- Il peso arriva ora **direttamente dalla bilancia** (L219): Open Vitals non si usa più per il sync del peso.
