/* Rendelés életút: visszaigazoló levelek, fizetés rögzítése, automatikus számla. */
import { nowIso } from "./core.js";
import { getOrder, saveOrder, setStatus } from "./orders.js";
import { sendMany, orderConfirmation, adminNotification, mailReady, shopEmail } from "./mail.js";
import { invoicingReady, issueInvoice } from "./invoicing.js";

/* Visszaigazolás a vásárlónak + értesítés a boltnak (mindkettő csak egyszer). */
export async function sendOrderMails(DB, env, s, base, o) {
  if (!mailReady(env)) return o;
  o.data.emailed = o.data.emailed || {};
  let changed = false;
  /* a vásárló és a bolt levele egy menetben (Gmailnél egy SMTP kapcsolaton) */
  const jobs = [];
  if (!o.data.emailed.customer) jobs.push(["customer", { to: o.email, ...orderConfirmation(s, base, o) }]);
  const adminTo = shopEmail(env, s);
  if (adminTo && !o.data.emailed.admin) jobs.push(["admin", { to: adminTo, ...adminNotification(s, base, o), replyTo: o.email }]);
  if (jobs.length) {
    const r = await sendMany(env, s, jobs.map(j => j[1]));
    jobs.forEach(([who], i) => {
      if (r.results[i]?.ok) { o.data.emailed[who] = nowIso(); changed = true; if (who === "customer") delete o.data.mailError; }
      else if (who === "customer") o.data.mailError = r.results[i]?.error || r.error;
    });
  }
  if (changed || o.data.mailError) await saveOrder(DB, o);
  return o;
}

export async function maybeInvoice(DB, env, s, o) {
  if (!s.invoiceAuto || !invoicingReady(env, s) || o.invoice) return o;
  try {
    const inv = await issueInvoice(env, o, s);
    o.invoice = inv.number;
    o.data.invoice = { ...inv, at: nowIso() };
    delete o.data.invoiceError;
    (o.data.history = o.data.history || []).push({ at: nowIso(), status: `számla: ${inv.number}`, by: "automatikus" });
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
