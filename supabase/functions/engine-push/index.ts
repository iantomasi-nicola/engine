// Engine push sender: every 5 minutes (pg_cron) sends the reminders that are due in push_queue.
// A reminder is skipped when it's no longer needed: the supplement was ticked, or enough water was logged.
// Secrets: VAPID_PUBLIC, VAPID_PRIVATE, VAPID_SUBJECT (mailto:you@example.com), CRON_SECRET.
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const env = (k: string) => Deno.env.get(k) ?? "";
webpush.setVapidDetails(env("VAPID_SUBJECT") || "mailto:engine@example.com", env("VAPID_PUBLIC"), env("VAPID_PRIVATE"));
const db = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });

async function stillNeeded(user: string, cond: Record<string, unknown> | null): Promise<boolean> {
  if (!cond || !cond.date) return true;
  const date = String(cond.date), { data } = await db.from("engine_docs").select("data").eq("user_id", user).eq("path", `lib/logm/${date.slice(0, 7)}`).maybeSingle();
  const day = (data?.data as any)?.days?.[date] ?? {};
  if (cond.supp && day.supp?.[String(cond.supp)]) return false;
  if (cond.water_lt != null && (+day.water || 0) >= +cond.water_lt) return false;
  return true;
}

/* constant-time comparison, so the secret can't be guessed from response times */
function safeEqual(a: string, b: string): boolean { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }

Deno.serve(async (req) => {
  // only the cron job knows the secret; with no secret set the function refuses everything
  const secret = env("CRON_SECRET"), got = req.headers.get("Authorization") ?? "";
  if (secret.length < 16 || !safeEqual(got, `Bearer ${secret}`)) return new Response("forbidden", { status: 403 });
  const now = new Date(), from = new Date(now.getTime() - 2 * 3600e3);
  const { data: due, error } = await db.from("push_queue").select("*").is("sent_at", null).lte("at", now.toISOString()).gte("at", from.toISOString()).limit(500);
  if (error) return new Response(error.message, { status: 500 });
  let sent = 0;
  const subsOf = new Map<string, any[]>();
  for (const q of due ?? []) {
    const ok = await stillNeeded(q.user_id, q.cond);
    if (ok) {
      if (!subsOf.has(q.user_id)) { const { data: s } = await db.from("push_subs").select("endpoint,sub").eq("user_id", q.user_id); subsOf.set(q.user_id, s ?? []); }
      const payload = JSON.stringify({ title: q.title, body: q.body, tag: q.tag, data: q.data ?? {} });
      for (const s of subsOf.get(q.user_id)!) {
        try { await webpush.sendNotification(s.sub, payload, { TTL: 3600 }); sent++; }
        catch (e: any) { if (e?.statusCode === 404 || e?.statusCode === 410) await db.from("push_subs").delete().eq("user_id", q.user_id).eq("endpoint", s.endpoint); }
      }
    }
    await db.from("push_queue").update({ sent_at: now.toISOString() }).eq("user_id", q.user_id).eq("key", q.key);
  }
  // keep the table small
  await db.from("push_queue").delete().lt("at", new Date(now.getTime() - 3 * 864e5).toISOString());
  return new Response(JSON.stringify({ due: due?.length ?? 0, sent }), { headers: { "Content-Type": "application/json" } });
});
