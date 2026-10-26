# Prenotazioni delle milestone (non modificare a mano: scripts/claim.sh)

| id | stato | titolo | aree | proprietario / ramo | preso | scade | nota |
|---|---|---|---|---|---|---|---|
| M14b-series | released | M14b correzioni (gruppi A-F) | energy,foods,fuel,pwa,shopping,sync | claude/dazzling-rubin-2nd61n | 2026-10-26 09:18Z | 2026-10-26 09:18Z | Sessione ferma per limite d'uso. Patch in docs/review/wip (A sync+S-1, C PWA, D Fuel). Da fare: E Shopping+Replace (L189), F Foods/ricette, Copy/Paste (L188). Vedi HANDOFF §1 del 27/10. |
| M16-bf | released | BF da intervals.icu: interruttore + calibrazione sulla bilancia | progress,settings,sync | claude/bf-icu-guard | 2026-10-26 12:59Z | 2026-10-26 13:21Z | Fatto e verificato sul ramo claude/bf-icu-guard (L199 + rimozione scale-test); non pubblicato. Vedi HANDOFF §1 del 26/10 sera per come pubblicare. |
| M14b-A | released | M14b gruppo A sync + S-1 | sync | claude/awesome-goldberg-ontswx | 2026-10-26 13:30Z | 2026-10-26 14:58Z | Pubblicato su main bbc135a |
| M14b-D | active | M14b gruppo D Fuel + Copy/Paste L188 | fuel | claude/awesome-goldberg-ontswx | 2026-10-26 13:31Z | 2026-10-26 16:54Z |  |
| M12 | released | M12 verifica contaflessioni | strength,train | claude/awesome-goldberg-ontswx | 2026-10-26 13:31Z | 2026-10-26 13:47Z | M12 verificata su claude/m12-verified 00c114a; da unire. Aperti: soglie sensore da tarare su telefono, MET futsal/nuoto da approvare |
| M14b-C | active | M14b gruppo C PWA + R2 | pwa,tests | claude/awesome-goldberg-ontswx | 2026-10-26 13:31Z | 2026-10-26 16:54Z |  |
| M14b-EF | active | M14b gruppi E Shopping+L189 e F Foods | foods,shopping | claude/m14b-ef | 2026-10-26 13:35Z | 2026-10-26 19:35Z |  |
| L202 | released | Indietro e chiusura tornano alla schermata giusta | other | claude/l202-back | 2026-10-26 13:42Z | 2026-10-26 14:43Z | Fatto e unito in claude/awesome-goldberg-ontswx; in pubblicazione |
| SHIP | released | pubblicazione M14b A-F, M12, L188, L189, L202 | other | claude/awesome-goldberg-ontswx | 2026-10-26 14:43Z | 2026-10-26 14:58Z | main = bbc135a, rollback 86f14f4 |
