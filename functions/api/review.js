// POST /api/review : AI second opinion on a flagged gig (free Cloudflare Workers AI). Used only from the admin Review queue.
const MODELS = ["@cf/meta/llama-3.2-3b-instruct", "@cf/google/gemma-3-12b-it", "@cf/meta/llama-4-scout-17b-16e-instruct", "@cf/meta/llama-3.3-70b-instruct-fp8-fast"];
const pick = o => typeof o === "string" ? o : (o && (o.response || (o.choices && o.choices[0] && o.choices[0].message && o.choices[0].message.content))) || "";
export async function onRequestPost({ request, env }) {
  if (!env.AI || request.headers.get("x-giglet") !== "1") return Response.json({ text: "" }, { status: 503 });
  const b = await request.json().catch(() => null);
  if (!b) return Response.json({ text: "" }, { status: 400 });
  const clip = (v, n) => String(v == null ? "" : v).slice(0, n);
  const prompt = `You help moderate a student part-time gig platform in the Philippines (students 15+; minors may only do light, non-hazardous daytime work).
Review this gig post. Reply in under 70 words with: RISK (low/medium/high), then the main reasons, then a recommendation (approve, ask employer to edit, or reject).
Title: ${clip(b.title, 120)}
Description: ${clip(b.description, 800)}
Requirements: ${clip(b.requirements, 300)}
Perks: ${clip(b.perks, 150)}
Pay: P${clip(b.rate, 6)} per hour for ${clip(b.hours, 4)} hours. Mode: ${clip(b.mode, 10)}.`;
  for (const m of MODELS) {
    try { const out = await env.AI.run(m, { messages: [{ role: "user", content: prompt }], max_tokens: 200 }); const t = String(pick(out)).trim(); if (t) return Response.json({ text: t }); } catch (e) {}
  }
  return Response.json({ text: "" }, { status: 502 });
}
