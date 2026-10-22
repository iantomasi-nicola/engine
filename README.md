# Engine

Training and nutrition app for a hybrid athlete: meal planning with macros, shopping list, live workouts
(calisthenics, running, EMOM/AMRAP/Tabata/For time), timers, intervals.icu two-way sync, progress and reports.

It's a static web app: `index.html` plus a few assets, served by GitHub Pages. Installable on phone and computer
(Add to Home Screen / Install app), works offline.

## Data
- Signed in: stored in Supabase (`supabase/schema.sql`, one table, Row Level Security: each row readable only by its owner),
  synced live between devices. Edits made offline are queued and sent when the network is back.
- Not signed in: stored only in the browser of that device.
- `config.js` holds the Supabase project URL and the publishable key (public by design).

## Integrations
- intervals.icu: direct from the browser with your API key (Settings → intervals.icu → Sync now).
- Open Food Facts: barcode and name search.
- AI (optional): your own free key for Google Gemini, Groq or OpenRouter (Settings → AI).
- Nutrition labels are also read on the device (Tesseract, Italian model in `ocr/`).

## Build
The source of the app lives outside this repository; `index.html` here is the built, minified file.

## Source
`source/` keeps the readable source: `engine.html` (the app), `web/` (the web runtime: Supabase layer, direct
intervals.icu sync, settings for account and AI, service worker) and `build-web.js`, which minifies and assembles
the files at the root (needs `npm i terser lightningcss`; paths to node_modules at the top of the script).
