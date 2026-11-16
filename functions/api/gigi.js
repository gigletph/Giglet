// Cloudflare Pages Function: /api/gigi
// POST = chat with Gigi (free Cloudflare Workers AI, no API key).  GET = health check.  GET ?test=1 = tests every model.
// Needs a Workers AI binding named "AI" (Pages > Settings > Bindings).
const MODELS = [
  "@cf/meta/llama-3.2-3b-instruct",
  "@cf/google/gemma-3-12b-it",
  "@cf/meta/llama-4-scout-17b-16e-instruct",
  "@cf/mistralai/mistral-small-3.1-24b-instruct",
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  "@cf/openai/gpt-oss-20b"
];
const pick = o => typeof o === "string" ? o : (o && (o.response || (o.choices && o.choices[0] && o.choices[0].message && o.choices[0].message.content) || (o.result && o.result.response))) || "";
let good = null; // remembers the model that worked
async function run(env, messages) {
  const order = good ? [good, ...MODELS.filter(m => m !== good)] : MODELS;
  let lastErr = "";
  for (const m of order) {
    try {
      const out = await env.AI.run(m, { messages, max_tokens: 220 });
      const t = String(pick(out)).trim();
      if (t) { good = m; return { text: t, model: m }; }
    } catch (e) { lastErr = m + ": " + (e && e.message || e); }
  }
  return { text: "", err: lastErr };
}
export async function onRequestGet({ request, env }) {
  const u = new URL(request.url);
  if (u.searchParams.get("test") && env.AI) {
    const results = [];
    for (const m of MODELS) { try { const o = await env.AI.run(m, { messages: [{ role: "user", content: "Say hi" }], max_tokens: 10 }); results.push({ model: m, ok: !!pick(o) }); } catch (e) { results.push({ model: m, ok: false, err: String(e && e.message || e).slice(0, 120) }); } }
    return Response.json({ hasAI: true, results });
  }
  return Response.json({ ok: true, hasAI: !!env.AI });
}
export async function onRequestPost({ request, env }) {
  if (!env.AI) return Response.json({ text: "", err: "no AI binding" }, { status: 503 });
  let b; try { b = await request.json(); } catch { return Response.json({ text: "" }, { status: 400 }); }
  const msgs = (b.messages || []).slice(-6).map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content || "").slice(0, 500) }));
  if (!msgs.length || msgs[msgs.length - 1].role !== "user") return Response.json({ text: "" }, { status: 400 });
  const system = `You are Gigi, the friendly frog assistant of Giglet, a student gig platform in South Cotabato, Philippines.
Reply in under 60 words, warm and encouraging, in the language the user writes in (English, Filipino, Bisaya or Ilonggo). Language setting: ${String(b.lang || "en").slice(0, 5)}.
Facts: Giglet charges employers P20 per completed gig and never deducts from student pay. Under 15 is not allowed. Ages 15-17 need verified guardian consent, light work only, max 8 hours, no night or hazardous work. 18+ follow adult rules. Employers pay students directly (cash, GCash, Maya, bank). Chats stay in-app; never share IDs or phone numbers. Features: Passport, badges, trust score, skills, check-in/out, calendar, map, payments tracking.
The user is a ${String(b.role || "visitor").slice(0, 20)}. Live gigs: ${(b.gigs || []).slice(0, 8).map(g => String(g).slice(0, 120)).join("; ")}.
Give no legal or tax advice (point to DOLE or BIR). If off-topic, answer briefly and steer back to Giglet.`;
  const r = await run(env, [{ role: "system", content: system }, ...msgs]);
  if (!r.text) return Response.json({ text: "", err: r.err }, { status: 502 });
  return Response.json({ text: r.text });
}
