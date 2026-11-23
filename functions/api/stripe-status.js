/* Cloudflare Pages Function – a Stripe beállítás állapota az adminnak (a kulcsot soha nem adja ki).
 * Válasz: { configured, mode: "test" | "live" | null, ok, account, error } */
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
});

export async function onRequestGet({ env }) {
  const key = String(env.STRIPE_SECRET_KEY || "");
  if (!key) return json({ configured: false, mode: null, ok: false });
  const mode = /^(sk|rk)_live_/.test(key) ? "live" : /^(sk|rk)_test_/.test(key) ? "test" : null;
  try {
    const res = await fetch("https://api.stripe.com/v1/balance", { headers: { Authorization: `Bearer ${key}` } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return json({ configured: true, mode, ok: false, error: data?.error?.message || `Stripe hiba (${res.status})` });
    const huf = (data.available || []).concat(data.pending || []).some(b => b.currency === "huf");
    return json({ configured: true, mode, ok: true, livemode: !!data.livemode, huf });
  } catch (e) {
    return json({ configured: true, mode, ok: false, error: "A Stripe nem érhető el." });
  }
}
