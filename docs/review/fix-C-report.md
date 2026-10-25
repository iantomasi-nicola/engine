# M14b gruppo C — PWA, ripristino backup, URL, accessibilità (report)

Test scritti prima (falliscono sul sorgente di partenza, verificato su una copia di `HEAD`): `tests/m14b-c.test.js` (11), `tests/m14b-c-ui.test.js` (7), `tests/m14b-c-pwa.test.js` (7). Tutti verdi sul sorgente corrente. Ultimo stato della suite completa: NON eseguita (limite di utilizzo): vedi in fondo.

## Fatto
| Voce | Cosa | Test |
|---|---|---|
| area11 #1 | `isDay()`; `suppMark` rifiuta data non reale e supplemento inesistente (anche da notifica); `mutateLog` ignora date non valide; `allLogDates`/`weightsSeries` ignorano chiavi non-data; `loadLocal` ripara tipi e toglie mesi/giorni non validi (`cleanLogm`, `cleanColl`): un documento già rotto non dà più pagina bianca | m14b-c 1–4 |
| area11 #2, #22, area10 #14 | foto: `dataBlob()` decodifica solo `data:image/(jpeg\|png\|webp);base64,` senza fetch; altri schemi rifiutati e contati: «Restored · N items · M photos skipped» | m14b-c 5 |
| area10 #10 | `bkClean` valida il tipo di ogni parte (parti sbagliate escluse e nominate nel foglio), `rs-go` in try/catch con messaggio, settings fusi per campo (`{...attuali, ...file}`), replace di train/body/shop parte dai default (`DOC_DEFAULT`, condivisi con `loadLocal`) | m14b-c 6, 7 |
| area10 #11 | Merge: `fillIn()` aggiunge per data/id/valore pesate, misure, gare, obiettivi ecc. senza cambiare nulla di presente (idempotente); testo di Replace corretto («anything it lacks stays») | m14b-c 9, 10 |
| area10 #17 | `mapKey` conservata quando il file non ha chiavi | m14b-c 7 |
| area10 #18 | `BK_VERSION = 3`; un file con versione maggiore è rifiutato con messaggio | m14b-c 8 |
| area10 #20, area11 #24 | tolta la prima `ACT.export` (esportazione Fuel); `KNOWN` di registry.test.js svuotato | m14b-c 11, registry |
| area11 #4, #11 | sw.js: il ramo heavy cerca in tutte le cache; `favicon-32` e `apple-180` precaricati insieme a supabase.js e icon-192 | pwa 4 |
| area11 #5 | `requestIdleCallback(warm, { timeout: 8000 })` | pwa 4 |
| area11 #6 | cache heavy `engine-heavy-<sha1 10 car. di vendor/ocr/icons>` (build-web.js, deterministico); la vecchia viene cancellata all'activate | pwa 6 |
| area11 #7 | Google Fonts non bloccanti (`media="print" onload`, `<noscript>`), e cache `engine-fonts-1` nel SW (cache-first + rivalidazione) per averli offline | pwa 1, 2, 5 |
| area11 #10 | il SW non salva richieste con query | pwa 4 |
| area10 #13 | SheetJS 0.18.5 in `vendor/xlsx.full.min.js` (identico byte per byte al pacchetto npm), CSP senza cdnjs; security.test.js aggiornato; docs ARCHITECTURE/SECURITY_AUDIT aggiornati | pwa 3, security |
| area11 #16 | `<html lang="en">`, title/preconnect/font nell'`<head>` | pwa 1 |
| area11 #19 | build-web.js minifica tutti gli `<style>` prima dello script | pwa 7 |
| area11 #9 | sheet: `tabindex=-1` + focus iniziale sul dialogo, `inert` su main/side/bnav/fab, trap di Tab/Shift+Tab, focus restituito al controllo che l'ha aperto (anche con catena `_ret`) | ui 1, 2 |
| area11 #14 | area di tocco ≥ 32 px: `.link`, `.pk-n`, `.chk`, `.icon-btn.sm`, tag con «x», ordine Pantry via `::after` invisibile; `.chip.sm` e `.st-pill` portati a 32 px (dentro contenitori che tagliano), interruttori 52×32 (misura Material), frecce settimana 32 px | ui 5 |
| area11 #15 | tab selezionata del calendario con `--md-on-primary-container` (≥ 4,5:1 chiaro e scuro) | ui 6 |
| area11 #13 | `scrollMode()` rispetta `prefers-reduced-motion` nei due scorrimenti | ui 4 |
| area11 #17 (toast) | pausa su hover/focus, 10 s con Undo | ui 3 |
| area11 #18 | sotto 360 px la pillola di sync diventa un punto (testo solo per lettori di schermo), nessuna sovrapposizione al titolo | ui 7 |

## Non fatto / da decidere
- **defer su supabase.js (area11 #19)**: non sicuro, `shim.js` riga 6 legge `window.supabase` in modo sincrono (shim = gruppo A).
- **Rami morti di `flush()` (`unavailable`/`quota_exceeded`) e `revoked` di `subscribe()` (area10 #20)**: lasciati, fanno parte del motore di sync (gruppo A).
- area11 #12 (core OCR SIMD / rete cellulare), #20 (orientation del manifest), #21 (framing), #23 (animazioni sidebar): non richiesti.
- Scrittura delle foto del backup «a pezzi» (area10 #14, seconda parte): non richiesta.
- Il test `m14b-c-pwa` apre un vero service worker su `localhost`; la richiesta dei font passa dalle route di Playwright (nessun accesso reale a Google).

## Da verificare ancora (non fatto per esaurimento del limite)
- Suite completa `npm run verify`, `node layout-audit.js <outdir>` (0 problemi) e screenshot 390/820/1440 chiaro/scuro: **non eseguiti**. Visti solo screenshot a 195 px (Today, Settings, Plan). Attenzione ai test esistenti che cliccano dietro un foglio aperto (ora `inert`) o dipendono da 30 px dei chip/51 px degli interruttori.
- Eseguiti a parte, verdi: i 3 file nuovi. Il lotto `security, persistence, version, registry, sync-gating, m10d, nav-return, settings-typing` era in corso (log nello scratchpad `t1.log`).
- `check-build` resterà indietro (artefatti di root non ricostruiti, come da regola).
