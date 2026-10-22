# Notifications with the app closed

Engine shows reminders while it's open. To get them with the app closed too (supplements, water, pantry, the
Monday report), set this up once in your Supabase project. It's free on the Supabase free plan.

1. **Keys.** On your computer run `npx web-push generate-vapid-keys`. You get a public and a private key.
2. **Tables.** Supabase → SQL Editor: paste `supabase/push.sql`. First replace `YOUR-PROJECT` with your project id
   (the part before `.supabase.co` in `config.js`) and `YOUR-CRON-SECRET` with a long random password you make up (at least 16 characters, e.g. from `openssl rand -hex 24`).
   Then run it.
3. **Function.** Supabase → Edge Functions → Deploy a new function → name it `engine-push` and paste
   `supabase/functions/engine-push/index.ts`. Turn **off** "Verify JWT" for it (the cron secret protects it).
4. **Secrets.** Edge Functions → Secrets: add `VAPID_PUBLIC`, `VAPID_PRIVATE` (from step 1),
   `VAPID_SUBJECT` = `mailto:` + your email, `CRON_SECRET` = the password of step 2.
5. **App.** In `config.js` add the public key: `vapidPublicKey: "B..."`. Commit, then in the app:
   Settings → Reminders → *Also with the app closed*.

On iPhone, web notifications work only for the app added to the Home Screen (iOS 16.4 or later).
