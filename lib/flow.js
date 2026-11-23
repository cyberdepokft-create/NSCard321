/* Rendelés életút: visszaigazoló levelek, fizetés rögzítése, automatikus számla. */
import { nowIso } from "./core.js";
import { getOrder, saveOrder, setStatus } from "./orders.js";
import { sendMail, orderConfirmation, adminNotification, mailReady } from "./mail.js";
import { billingoReady, createInvoice } from "./billingo.js";

/* Visszaigazolás a vásárlónak + értesítés a boltnak (mindkettő csak egyszer). */
export async function sendOrderMails(DB, env, s, base, o) {
  if (!mailReady(env)) return o;
  o.data.emailed = o.data.emailed || {};
  let changed = false;
  if (!o.data.emailed.customer) {
    const m = orderConfirmation(s, base, o);
    const r = await sendMail(env, s, { to: o.email, ...m });
    if (r.ok) { o.data.emailed.customer = nowIso(); changed = true; }
    else o.data.mailError = r.error;
  }
  const adminTo = env.ADMIN_EMAIL || s.email;
  if (adminTo && !o.data.emailed.admin) {
    const r = await sendMail(env, s, { to: adminTo, ...adminNotification(s, base, o), replyTo: o.email });
    if (r.ok) { o.data.emailed.admin = nowIso(); changed = true; }
  }
  if (changed || o.data.mailError) await saveOrder(DB, o);
  return o;
}

export async function maybeInvoice(DB, env, s, o) {
  if (!s.invoiceAuto || !billingoReady(env) || o.invoice) return o;
  try {
    const inv = await createInvoice(env, o, s);
    o.invoice = inv.number;
    o.data.invoice = { ...inv, at: nowIso() };
  } catch (e) {
    o.data.invoiceError = e.message;
  }
  await saveOrder(DB, o);
  return o;
}

/* Kártyás fizetés rögzítése (sikeres oldal és webhook is hívhatja – csak egyszer fut le). */
export async function markPaid(DB, env, s, base, orderId, info = {}) {
  const o = await getOrder(DB, orderId);
  if (!o) return null;
  if (o.paid) return o;
  const res = await DB.prepare("UPDATE orders SET paid = 1, updated_at = ? WHERE id = ? AND paid = 0").bind(nowIso(), o.id).run();
  if (!res?.meta?.changes) return getOrder(DB, orderId);
  o.paid = true;
  o.data.payment = { ...info, at: nowIso() };
  if (o.status === "cancelled") {
    // lejárt foglalás után mégis befizetett: visszaállítjuk
    await DB.prepare("UPDATE order_items SET active = 1 WHERE order_id = ?").bind(o.id).run();
  }
  await setStatus(DB, o, "paid", "Stripe");
  await sendOrderMails(DB, env, s, base, o);
  await maybeInvoice(DB, env, s, o);
  return o;
}
