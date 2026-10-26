// Engine recipe proxy: reads a recipe web page on the server, because most sites don't let a browser read them (CORS).
// Only signed-in Engine users can call it (Supabase checks the JWT). It returns the page HTML, nothing else.
// Guards: http/https only, no private or internal addresses (also after redirects), 8 s and 2 MB limits, HTML only.
// Deploy: Edge Functions → new function `recipe-proxy` (leave "Verify JWT" ON), paste this file. No secrets needed.
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const MAX_BYTES = 2 * 1024 * 1024, MAX_REDIRECTS = 3, TIMEOUT_MS = 8000;

const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

/* an address that must never be fetched: loopback, private, link-local (cloud metadata), CGNAT, multicast, unspecified, unique-local */
function blockedIp(ip: string): boolean {
  if (ip.includes(":")) {
    const x = ip.toLowerCase();
    if (x === "::" || x === "::1" || x.startsWith("fc") || x.startsWith("fd") || x.startsWith("fe8") || x.startsWith("fe9") || x.startsWith("fea") || x.startsWith("feb") || x.startsWith("ff")) return true;
    const m = x.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/); return m ? blockedIp(m[1]) : false;
  }
  const p = ip.split(".").map(Number); if (p.length !== 4 || p.some((n) => !(n >= 0 && n <= 255))) return true;
  const [a, b] = p;
  return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19)) || a >= 224;
}

async function safeUrl(raw: string): Promise<URL> {
  const u = new URL(raw);
  if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error("Only http and https addresses.");
  if (u.username || u.password) throw new Error("Addresses with a password are not accepted.");
  if (u.port && u.port !== "80" && u.port !== "443") throw new Error("Only the standard web ports.");
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (/^(localhost|.*\.local|.*\.internal|.*\.localhost)$/i.test(host)) throw new Error("That address is not public.");
  const ips: string[] = /^[\d.]+$|:/.test(host) ? [host] : [...await Deno.resolveDns(host, "A").catch(() => []), ...await Deno.resolveDns(host, "AAAA").catch(() => [])];
  if (!ips.length || ips.some(blockedIp)) throw new Error("That address is not public.");
  return u;
}

async function readLimited(r: Response): Promise<string> {
  const rd = r.body?.getReader(); if (!rd) return "";
  const chunks: Uint8Array[] = []; let n = 0;
  for (;;) { const { done, value } = await rd.read(); if (done) break; n += value.length; if (n > MAX_BYTES) { await rd.cancel(); throw new Error("The page is too large."); } chunks.push(value); }
  const all = new Uint8Array(n); let o = 0; for (const c of chunks) { all.set(c, o); o += c.length; }
  return new TextDecoder("utf-8", { fatal: false }).decode(all);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return reply({ error: "POST only" }, 405);
  let target = ""; try { target = String((await req.json())?.url ?? "").trim(); } catch { return reply({ error: "Send {\"url\": \"…\"}." }, 400); }
  if (!target || target.length > 2000) return reply({ error: "Missing or too long address." }, 400);
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    let u = await safeUrl(target), r: Response | null = null;
    for (let i = 0; i <= MAX_REDIRECTS; i++) {
      r = await fetch(u, { redirect: "manual", signal: ctl.signal, headers: { "User-Agent": "Mozilla/5.0 (compatible; EngineRecipeReader/1.0)", "Accept": "text/html,application/xhtml+xml", "Accept-Language": "en,it;q=0.8" } });
      const loc = r.headers.get("location");
      if (r.status >= 300 && r.status < 400 && loc) { await r.body?.cancel(); u = await safeUrl(new URL(loc, u).toString()); r = null; continue; }
      break;
    }
    if (!r) return reply({ error: "Too many redirects." }, 502);
    if (!r.ok) { await r.body?.cancel(); return reply({ error: "The site answered " + r.status + "." }, 502); }
    if (!/text\/html|application\/xhtml/i.test(r.headers.get("content-type") ?? "")) { await r.body?.cancel(); return reply({ error: "That address is not a web page." }, 415); }
    return reply({ html: await readLimited(r), url: u.toString() });
  } catch (e) {
    return reply({ error: (e as Error).name === "AbortError" ? "The site took too long." : (e as Error).message || "Could not read the page." }, 502);
  } finally { clearTimeout(timer); }
});
