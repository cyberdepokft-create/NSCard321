/* GET /api/checkout-session?session_id=… – a Stripe fizetés állapota a visszatérő oldalhoz. Sikeres fizetésnél rögzíti a rendelést. */
import { json, loadCatalog, originOf } from "../../lib/core.js";
import { getDb } from "../../lib/db.js";
import { stripe } from "../../lib/stripe.js";
import { markPaid } from "../../lib/flow.js";

export async function onRequestGet({ request, env }) {
  if (!env.STRIPE_SECRET_KEY) return json({ error: "A kártyás fizetés nincs beállítva." }, 503);
  const id = new URL(request.url).searchParams.get("session_id") || "";
  if (!/^cs_[A-Za-z0-9_]+$/.test(id)) return json({ error: "Hibás azonosító." }, 400);
  const res = await stripe(env, `/checkout/sessions/${encodeURIComponent(id)}?expand[]=line_items`);
  const s = res.data;
  if (!res.ok) return json({ error: s?.error?.message || "Nem sikerült lekérdezni a fizetést." }, 502);
  const orderId = s.metadata?.order_id || s.client_reference_id || "";
  let token = "";
  if (s.payment_status === "paid" && orderId) {
    try {
      const DB = await getDb(env);
      if (DB) {
        const catalog = await loadCatalog(request, env);
        const o = await markPaid(DB, env, catalog.settings || {}, originOf(request), orderId, { stripeSession: s.id, amount: Math.round((s.amount_total || 0) / 100), via: "visszatérés" });
        token = o?.data?.token || "";
      }
    } catch {}
  }
  return json({
    status: s.status,
    payment_status: s.payment_status,
    amount_total: Math.round((s.amount_total || 0) / 100),
    customer_name: s.customer_details?.name || s.metadata?.name || "",
    email: s.customer_details?.email || s.customer_email || "",
    shipping: s.metadata?.shipping || "",
    coupon: s.metadata?.coupon || "",
    discount: Math.round((s.total_details?.amount_discount || 0) / 100),
    items: (s.line_items?.data || []).map(li => ({ name: li.description, qty: li.quantity, total: Math.round((li.amount_total || 0) / 100) })),
    order: orderId || String(s.id || "").slice(-8).toUpperCase(),
    token
  });
}
