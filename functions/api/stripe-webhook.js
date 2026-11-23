/* POST /api/stripe-webhook – Stripe értesítések (STRIPE_WEBHOOK_SECRET szükséges).
 * Stripe → Developers → Webhooks → végpont: https://www.nscard.hu/api/stripe-webhook
 * Események: checkout.session.completed, checkout.session.async_payment_succeeded, checkout.session.expired */
import { json, loadCatalog, originOf } from "../../lib/core.js";
import { getDb } from "../../lib/db.js";
import { verifyStripeSignature } from "../../lib/stripe.js";
import { markPaid } from "../../lib/flow.js";
import { getOrder, setStatus } from "../../lib/orders.js";

export async function onRequestPost({ request, env }) {
  if (!env.STRIPE_WEBHOOK_SECRET) return json({ error: "A webhook nincs beállítva." }, 503);
  const payload = await request.text();
  const ok = await verifyStripeSignature(payload, request.headers.get("Stripe-Signature"), env.STRIPE_WEBHOOK_SECRET);
  if (!ok) return json({ error: "Érvénytelen aláírás." }, 400);
  let evt;
  try { evt = JSON.parse(payload); } catch { return json({ error: "Hibás kérés." }, 400); }
  const DB = await getDb(env).catch(() => null);
  if (!DB) return json({ received: true, stored: false });
  const s = evt?.data?.object || {};
  const orderId = s.metadata?.order_id || s.client_reference_id || "";
  if (!orderId) return json({ received: true });
  const catalog = await loadCatalog(request, env);
  if ((evt.type === "checkout.session.completed" && s.payment_status === "paid") || evt.type === "checkout.session.async_payment_succeeded") {
    await markPaid(DB, env, catalog.settings || {}, originOf(request), orderId, { stripeSession: s.id, amount: Math.round((s.amount_total || 0) / 100), via: "webhook" });
  } else if (evt.type === "checkout.session.expired" || evt.type === "checkout.session.async_payment_failed") {
    const o = await getOrder(DB, orderId);
    if (o && !o.paid && o.status === "pending_payment") await setStatus(DB, o, "cancelled", evt.type === "checkout.session.expired" ? "lejárt fizetés" : "sikertelen fizetés");
  }
  return json({ received: true });
}
