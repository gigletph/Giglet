// POST /api/notify : called by your Supabase database (pg_net) whenever a notification is created.
// Sends the email through Brevo. Needs env: NOTIFY_SECRET, BREVO_API_KEY, MAIL_FROM (a sender you verified in Brevo). Optional: SITE_URL.
const esc = s => String(s || "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
export async function onRequestPost({ request, env }) {
  if (!env.NOTIFY_SECRET || request.headers.get("x-secret") !== env.NOTIFY_SECRET) return new Response("Unauthorized", { status: 401 });
  if (!env.BREVO_API_KEY || !env.MAIL_FROM) return new Response("Email is not configured", { status: 503 });
  const b = await request.json().catch(() => null);
  if (!b || !b.to || !b.body || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(b.to)) return new Response("Bad request", { status: 400 });
  const site = env.SITE_URL || new URL(request.url).origin;
  const html = `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;border:1px solid #c7d3c1;border-radius:14px;overflow:hidden">
<div style="background:#456B50;color:#fff;padding:14px 18px;font-size:20px;font-weight:bold">🐸 Giglet</div>
<div style="padding:18px"><p style="font-size:16px;color:#1f2b1d">${esc(b.body)}</p>
<p><a href="${esc(site)}/#notifications" style="display:inline-block;background:#F6C453;color:#1f2b1d;padding:10px 18px;border-radius:99px;text-decoration:none;font-weight:bold">Open Giglet</a></p>
<p style="font-size:12px;color:#586953">You get this because email alerts are on. Turn them off anytime in the Giglet menu.</p></div></div>`;
  const r = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": env.BREVO_API_KEY, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ sender: { name: "Giglet", email: env.MAIL_FROM }, to: [{ email: b.to }], subject: "Giglet: " + String(b.body).slice(0, 70), htmlContent: html })
  });
  return new Response(r.ok ? "sent" : "failed", { status: r.ok ? 200 : 502 });
}
