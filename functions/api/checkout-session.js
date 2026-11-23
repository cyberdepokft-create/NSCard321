/* Cloudflare Pages Function – Stripe fizetés állapotának lekérdezése a visszatérő oldalhoz. */
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
});

export async function onRequestGet({ request, env }) {
  if (!env.STRIPE_SECRET_KEY) return json({ error: "A kártyás fizetés nincs beállítva." }, 503);
  const id = new URL(request.url).searchParams.get("session_id") || "";
  if (!/^cs_[A-Za-z0-9_]+$/.test(id)) return json({ error: "Hibás azonosító." }, 400);
  const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` }
  });
  const s = await res.json();
  if (!res.ok) return json({ error: s?.error?.message || "Nem sikerült lekérdezni a fizetést." }, 502);
  return json({
    status: s.status,
    payment_status: s.payment_status,
    amount_total: Math.round((s.amount_total || 0) / 100),
    customer_name: s.customer_details?.name || s.metadata?.name || ""
  });
}
