# Recipe from a link (proxy)

Most recipe sites don't let a browser read them directly. Engine can ask a small function in **your** Supabase project to fetch the page for it. Without the function, «Recipe from a link» still works for the sites that allow it, and you can always paste the recipe text.

1. Supabase → **Edge Functions** → *Deploy a new function* → name it `recipe-proxy`.
2. Paste `supabase/functions/recipe-proxy/index.ts`. Leave **Verify JWT ON** (only signed-in Engine users can use it). No secrets are needed.
3. In Engine: Foods › Recipes › From a link. The first time a site blocks the browser, Engine uses the function automatically (you need to be signed in).

What it does: fetches only public `http/https` pages (no internal or private addresses, also after redirects), at most 2 MB and 8 seconds, HTML only, and returns the page text to the app. It stores nothing. The recipe is then read by the AI service you set in Settings, as before.
