/* POST /api/create-checkout-session – Stripe Checkout indítása.
 * Szükséges: STRIPE_SECRET_KEY (Cloudflare Secret). Az árakat, a kupont és a készletet a szerver a publikált katalógusból ellenőrzi.
 * Ha van adatbázis (DB), a rendelés „Fizetésre vár” állapotban azonnal létrejön és 45 percig foglalja a készletet. */
import { json, readJson, loadCatalog, originOf, absUrl, clientIp } from "../../lib/core.js";
import { getDb, rateLimit } from "../../lib/db.js";
import { priceOrder, sanitizeCustomer, validateCustomer, insertOrder, availableMap, saveOrder, setStatus } from "../../lib/orders.js";
import { stripe } from "../../lib/stripe.js";

export async function onRequestPost({ request, env }) {
  if (!env.STRIPE_SECRET_KEY) return json({ error: "A kártyás fizetés nincs beállítva (hiányzó STRIPE_SECRET_KEY)." }, 503);
  const body = await readJson(request);
  if (!body) return json({ error: "Hibás kérés." }, 400);
  const DB = await getDb(env).catch(() => null);
  if (DB && !(await rateLimit(DB, `card:${clientIp(request)}`, 12, 600))) return json({ error: "Túl sok próbálkozás. Próbáld újra néhány perc múlva." }, 429);

  const catalog = await loadCatalog(request, env, { fresh: true });
  const settings = catalog.settings || {};
  if (settings.payCard !== true) return json({ error: "A kártyás fizetés jelenleg nem elérhető." }, 403);
  const sold = DB ? await availableMap(DB, catalog) : {};
  const priced = priceOrder(catalog, { ...body, pay: "card" }, sold);
  if (!priced.ok) return json({ error: priced.error, productId: priced.productId, left: priced.left }, priced.status);
  const customer = sanitizeCustomer(body.customer, priced.method);
  if (DB) { const bad = validateCustomer(customer, priced.method); if (bad) return json({ error: bad }, 400); }

  const origin = originOf(request);
  const params = new URLSearchParams();
  priced.lines.forEach((l, i) => {
    params.append(`line_items[${i}][price_data][currency]`, "huf");
    params.append(`line_items[${i}][price_data][unit_amount]`, String(l.price * 100));
    params.append(`line_items[${i}][price_data][product_data][name]`, l.preorder ? `${l.name} (előrendelés)`.slice(0, 250) : l.name);
    const img = absUrl(l.image, origin);
    if (img) params.append(`line_items[${i}][price_data][product_data][images][0]`, img);
    params.append(`line_items[${i}][quantity]`, String(l.qty));
  });
  let n = priced.lines.length;
  if (priced.shipping > 0) {
    params.append(`line_items[${n}][price_data][currency]`, "huf");
    params.append(`line_items[${n}][price_data][unit_amount]`, String(priced.shipping * 100));
    params.append(`line_items[${n}][price_data][product_data][name]`, `Szállítás – ${priced.methodLabel.toLowerCase()}`);
    params.append(`line_items[${n}][quantity]`, "1");
    n++;
  }
  if (priced.giftFee > 0) {
    params.append(`line_items[${n}][price_data][currency]`, "huf");
    params.append(`line_items[${n}][price_data][unit_amount]`, String(priced.giftFee * 100));
    params.append(`line_items[${n}][price_data][product_data][name]`, "Ajándékcsomagolás");
    params.append(`line_items[${n}][quantity]`, "1");
    n++;
  }
  const off = priced.discount + (priced.packDiscount || 0);
  if (off > 0) {
    const label = [priced.discount > 0 ? `Kupon ${priced.coupon}` : "", priced.packDiscount ? "Csomag -5%" : ""].filter(Boolean).join(" + ");
    const cp = new URLSearchParams({ amount_off: String(off * 100), currency: "huf", duration: "once", max_redemptions: "1", name: label.slice(0, 40) });
    const cr = await stripe(env, "/coupons", { method: "POST", params: cp });
    if (!cr.ok || !cr.data.id) return json({ error: cr.data?.error?.message || "A kupon nem alkalmazható a kártyás fizetésnél." }, 502);
    params.append("discounts[0][coupon]", cr.data.id);
  }

  let order = null;
  if (DB) order = await insertOrder(DB, priced, customer, { status: "pending_payment" });

  params.append("mode", "payment");
  params.append("locale", "hu");
  params.append("submit_type", "pay");
  params.append("billing_address_collection", "auto");
  params.append("expires_at", String(Math.floor(Date.now() / 1000) + 31 * 60));
  params.append("custom_text[submit][message]", "A fizetés után e-mailben visszaigazoljuk a rendelést, és értesítünk a feladásról.");
  params.append("success_url", `${origin}/success?session_id={CHECKOUT_SESSION_ID}`);
  params.append("cancel_url", `${origin}/cancel${order ? `?order=${encodeURIComponent(order.id)}` : ""}`);
  if (customer.email) params.append("customer_email", customer.email);
  if (order) { params.append("client_reference_id", order.id); params.append("payment_intent_data[description]", `Rendelés ${order.id}`); }
  const meta = {
    order_id: order?.id || "", name: customer.name, phone: customer.phone, shipping: priced.methodLabel,
    address: priced.method === "locker" ? customer.locker : priced.method === "pickup" ? "" : `${customer.zip} ${customer.city}, ${customer.address}`,
    note: customer.note, coupon: priced.coupon, pack: priced.pack?.length ? `${priced.pack.join(",")} (-${priced.packDiscount} Ft)` : ""
  };
  for (const [k, v] of Object.entries(meta)) if (v) params.append(`metadata[${k}]`, String(v).slice(0, 480));

  const res = await stripe(env, "/checkout/sessions", { method: "POST", params });
  if (!res.ok) {
    if (order) { const o = { ...order, paid: false, email: customer.email, data: order.data }; try { await setStatus(DB, o, "cancelled", "rendszer"); } catch {} }
    return json({ error: res.data?.error?.message || "A fizetés indítása nem sikerült." }, 502);
  }
  if (order) {
    try { await DB.prepare("UPDATE orders SET stripe_session = ? WHERE id = ?").bind(res.data.id, order.id).run(); } catch {}
  }
  return json({ url: res.data.url, id: res.data.id, order: order?.id || "" });
}

export const onRequest = () => json({ error: "Csak POST kérés engedélyezett." }, 405);
