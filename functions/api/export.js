// GET /api/export?kind=gigs|applications|fees|users&key=YOUR_EXPORT_KEY  ->  CSV for Google Sheets (=IMPORTDATA)
const SB = "https://kdcxnozzmktpysyfhkdm.supabase.co", PK = "sb_publishable_7V_IujdoVK4nDwjXzQ_Krg_bizygA3Q";
export async function onRequestGet({ request }) {
  const u = new URL(request.url), kind = u.searchParams.get("kind") || "", key = u.searchParams.get("key") || "";
  const r = await fetch(SB + "/rest/v1/rpc/export_data", { method: "POST", headers: { apikey: PK, "content-type": "application/json" }, body: JSON.stringify({ p_kind: kind, p_key: key }) });
  if (!r.ok) return new Response("Not allowed", { status: 403 });
  const rows = await r.json();
  const q = v => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
  const cols = rows.length ? Object.keys(rows[0]) : ["no data"];
  const csv = [cols.map(q).join(","), ...rows.map(o => cols.map(c => q(o[c])).join(","))].join("\n");
  return new Response(csv, { headers: { "content-type": "text/csv; charset=utf-8", "cache-control": "no-store" } });
}
