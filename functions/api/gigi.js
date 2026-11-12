// Cloudflare Pages Function: POST /api/gigi
// Your Anthropic key lives in Cloudflare (Settings > Variables and secrets), never in the website code.
export async function onRequestPost({ request, env }) {
  if (!env.ANTHROPIC_API_KEY) return Response.json({ text: "" }, { status: 503 });
  let b; try { b = await request.json(); } catch { return Response.json({ text: "" }, { status: 400 }); }
  const msgs = (b.messages || []).slice(-6).map(m => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: String(m.content || "").slice(0, 500)
  }));
  if (!msgs.length || msgs[msgs.length - 1].role !== "user") return Response.json({ text: "" }, { status: 400 });
  const system = `You are Gigi, the friendly frog assistant of Giglet, a student gig platform in South Cotabato, Philippines.
Reply in under 70 words, warm and encouraging, in the language the user writes in (English, Filipino, Bisaya or Ilonggo). Language setting: ${String(b.lang || "en").slice(0, 5)}.
Facts: Giglet charges employers P20 per completed gig and never deducts from student pay. Under 15 is not allowed. Ages 15-17 need verified guardian consent, light work only, max 8 hours, no night or hazardous work. 18+ follow adult rules. Employers pay students directly (cash, GCash, Maya, bank). Chats stay in-app; never share IDs or phone numbers. Features: Passport, badges, trust score, skills, check-in/out, map.
The user is a ${String(b.role || "visitor").slice(0, 20)}. Live gigs: ${(b.gigs || []).slice(0, 8).map(g => String(g).slice(0, 120)).join("; ")}.
Give no legal advice (point to DOLE for legal questions). If off-topic, answer briefly and steer back to Giglet.`;
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: "claude-haiku-5-5", max_tokens: 300, system, messages: msgs })
  });
  if (!r.ok) return Response.json({ text: "" }, { status: 502 });
  const d = await r.json();
  return Response.json({ text: (d.content && d.content[0] && d.content[0].text) || "" });
}
