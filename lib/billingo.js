/* Billingo (API v3) számlázás. Szükséges: BILLINGO_API_KEY (Cloudflare Secret).
 * Lépések: számlatömb kiválasztása → partner létrehozása → számla kiállítása → e-mail a vásárlónak. */
import { billingOf } from "./orders.js";

export const billingoReady = env => !!env?.BILLINGO_API_KEY;
const API = "https://api.billingo.hu/v3";

async function bg(env, path, init = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { "X-API-KEY": env.BILLINGO_API_KEY, Accept: "application/json", ...(init.body ? { "Content-Type": "application/json" } : {}) }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = Array.isArray(data?.errors) ? data.errors.map(e => e.message || e.field).filter(Boolean).join("; ") : "";
    const msg = res.status === 401 ? "A Billingo API kulcs érvénytelen." : res.status === 402 ? "A Billingo előfizetés nem engedi az API használatát."
      : (data?.error?.message || data?.message || detail || `Billingo hiba (${res.status})`);
    const e = new Error(msg); e.status = res.status; throw e;
  }
  return data;
}

export async function billingoBlocks(env) {
  const data = await bg(env, "/document-blocks?page=1&per_page=50");
  return (data?.data || []).map(b => ({ id: b.id, name: b.name, prefix: b.prefix, type: b.type }));
}

const PAY = { card: "online_bankcard", transfer: "wire_transfer", cod: "cash_on_delivery" };
const day = (offset = 0) => new Date(Date.now() + 60 * 60000 + offset * 864e5).toISOString().slice(0, 10);

export async function createInvoice(env, o, s) {
  if (!billingoReady(env)) throw new Error("A Billingo nincs beállítva (hiányzó BILLINGO_API_KEY).");
  const d = o.data;
  const c = d.customer || {};
  const b = billingOf(c);
  if (!b.zip || !b.city || !b.address) throw new Error("A rendelésnél nincs számlázási cím.");
  let blockId = Number(s.billingoBlockId) || 0;
  if (!blockId) {
    const blocks = await billingoBlocks(env);
    blockId = (blocks.find(x => x.type === "invoice") || blocks[0])?.id || 0;
    if (!blockId) throw new Error("A Billingo fiókban nincs számlatömb.");
  }
  const partner = await bg(env, "/partners", {
    method: "POST",
    body: JSON.stringify({
      name: b.name || c.name, address: { country_code: "HU", post_code: b.zip, city: b.city, address: b.address },
      emails: c.email ? [c.email] : [], phone: c.phone || undefined,
      taxcode: b.taxNumber || undefined, tax_type: b.taxNumber ? "HAS_TAX_NUMBER" : "NO_TAX_NUMBER"
    })
  });
  const vat = s.vatRate === "AAM" ? "AAM" : "27%";
  const item = (name, price, qty = 1) => ({ name: String(name).slice(0, 255), unit_price: price, unit_price_type: "gross", quantity: qty, unit: "db", vat });
  const items = (d.lines || []).map(l => item(l.name, l.price, l.qty));
  if (d.discount) items.push(item(`Kedvezmény (${d.coupon})`, -Math.abs(d.discount)));
  if (d.shipping) items.push(item(`Szállítás – ${String(d.methodLabel || "").toLowerCase()}`, d.shipping));
  if (d.cod) items.push(item("Utánvételi díj", d.cod));
  const paid = !!o.paid;
  const doc = await bg(env, "/documents", {
    method: "POST",
    body: JSON.stringify({
      partner_id: partner.id, block_id: blockId, type: "invoice",
      fulfillment_date: day(0), due_date: paid || d.pay === "cod" ? day(0) : day(8),
      payment_method: PAY[d.pay] || "wire_transfer", language: "hu", currency: "HUF",
      electronic: s.invoiceElectronic !== false, paid,
      items, comment: s.vatRate === "AAM" ? "Alanyi adómentes." : undefined,
      settings: { order_number: o.id, round: "one", ...(d.pay === "card" ? { online_payment: "no" } : {}) }
    })
  });
  let sent = false;
  if (s.invoiceSend !== false && c.email && doc?.id) {
    try { await bg(env, `/documents/${doc.id}/send`, { method: "POST", body: JSON.stringify({ emails: [c.email] }) }); sent = true; } catch {}
  }
  return { id: doc.id, number: doc.invoice_number || String(doc.id), sent };
}
