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

## Reminders with the app closed
Optional Web Push through your own Supabase project: `supabase/push.sql`, the `supabase/functions/engine-push` function
and a public key in `config.js`. Steps in `supabase/PUSH.md`.

## Integrations
- intervals.icu: direct from the browser with your API key — it syncs by itself, both ways, when the app opens and after each change.
- Open Food Facts: barcode and name search.
- AI (optional): your own free key for Google Gemini, Groq or OpenRouter (Settings → AI).
- Nutrition labels are also read on the device (Tesseract, Italian model in `ocr/`).

## Build
The readable source is included in `source/`; `index.html` at the root is the built, minified file.

## Source
`source/` keeps the readable source: `engine.html` (the app), `web/` (the web runtime: Supabase layer, direct
intervals.icu sync, settings for account and AI, service worker) and `build-web.js`, which minifies and assembles
the files at the root: `npm i terser lightningcss` somewhere, then `NODE_MODULES=<that>/node_modules node source/build-web.js`.

For validation, pass an output directory outside the checkout to avoid overwriting tracked files:
`NODE_MODULES=<that>/node_modules node source/build-web.js /path/to/separate-output`.

## Engineering documentation

- [Agent rules](AGENTS.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Development, validation and rollback](docs/DEVELOPMENT.md)
- [Project status and known issues](docs/PROJECT_STATUS.md)
- [Roadmap](docs/ROADMAP.md)
- [Original product requirements](docs/PRODUCT_REQUIREMENTS.md)
- [M1 Storage/Shopping: behavior, validation and recovery](docs/M1_STORAGE_SHOPPING.md)
- [Decisions](docs/DECISIONS.md)
- [Changelog](CHANGELOG.md)
