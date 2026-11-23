/* NS Card – rendelések: árazás és ellenőrzés (szerver oldalon, a publikált katalógusból), mentés, állapotok. */
import { int, clean, cleanText, validEmail, availabilityOf, nowIso, randomToken } from "./core.js";
import { soldSince } from "./db.js";

export const STATUS = {
  new: "Új",
  pending_payment: "Fizetésre vár",
  paid: "Fizetve",
  packed: "Csomagolva",
  shipped: "Feladva",
  done: "Teljesítve",
  cancelled: "Lemondva"
};
export const PAY_LABEL = { card: "Bankkártya (Stripe)", transfer: "Banki átutalás", cod: "Utánvét" };
export const CARRIERS = {
  foxpost: { label: "Foxpost", url: c => `https://foxpost.hu/csomagkovetes/?code=${encodeURIComponent(c)}` },
  packeta: { label: "Packeta", url: c => `https://tracking.packeta.com/hu/?id=${encodeURIComponent(c)}` },
  gls: { label: "GLS", url: c => `https://gls-group.com/HU/hu/csomagkovetes?match=${encodeURIComponent(c)}` },
  mpl: { label: "MPL / Magyar Posta", url: c => `https://www.posta.hu/nyomkovetes/nyitooldal?searchvalue=${encodeURIComponent(c)}` },
  dpd: { label: "DPD", url: c => `https://tracking.dpd.de/status/hu_HU/parcel/${encodeURIComponent(c)}` },
  other: { label: "Egyéb", url: () => "" }
};
export function trackingUrl(carrier, code) {
  const c = String(code || "").trim();
  if (!c) return "";
  if (/^https:\/\//i.test(c)) return c;
  return (CARRIERS[carrier] || CARRIERS.other).url(c);
}

const err = (error, status = 409, extra = {}) => ({ ok: false, error, status, ...extra });

export function shippingMethods(s) {
  return {
    home: { on: s.shipHome !== false, price: int(s.shippingHome ?? 2500), label: "Házhozszállítás" },
    locker: { on: s.shipLocker !== false, price: int(s.shippingLocker ?? 2500), label: "Csomagautomata" },
    pickup: { on: !!s.shipPickup, price: int(s.shippingPickup), label: "Személyes átvétel" }
  };
}

export function sanitizeCustomer(raw, method) {
  const c = raw && typeof raw === "object" ? raw : {};
  const out = {
    name: clean(c.name, 120), email: clean(c.email, 200).toLowerCase(), phone: clean(c.phone, 40),
    zip: clean(c.zip, 8), city: clean(c.city, 80), address: clean(c.address, 200),
    locker: clean(c.locker, 240), lockerId: clean(c.lockerId, 40), lockerProvider: clean(c.lockerProvider, 30),
    note: cleanText(c.note, 1000)
  };
  const b = c.billing && typeof c.billing === "object" ? c.billing : {};
  out.billing = {
    same: method === "home" && b.same !== false,
    name: clean(b.name, 120), zip: clean(b.zip, 8), city: clean(b.city, 80), address: clean(b.address, 200),
    company: clean(b.company, 160), taxNumber: clean(b.taxNumber, 20)
  };
  if (method !== "locker") { out.locker = out.lockerId = out.lockerProvider = ""; }
  if (method !== "home") { out.zip = out.city = out.address = ""; }
  return out;
}

export function validateCustomer(c, method) {
  if (!c.name) return "Add meg a neved.";
  if (!validEmail(c.email)) return "Adj meg érvényes e-mail címet.";
  if (String(c.phone).replace(/\D/g, "").length < 8) return "Add meg a telefonszámod.";
  if (method === "home" && (!/^\d{4}$/.test(c.zip) || !c.city || !c.address)) return "Add meg a szállítási címet.";
  if (method === "locker" && !c.locker) return "Válaszd ki a csomagautomatát.";
  const b = c.billing;
  if (!b.same && (!/^\d{4}$/.test(b.zip) || !b.city || !b.address)) return "Add meg a számlázási címet.";
  if (b.taxNumber && !/^\d{8}-?\d-?\d{2}$/.test(b.taxNumber)) return "Az adószám formátuma: 12345678-1-12.";
  return "";
}

/* A számlázási adatok a vásárló adataiból (ha ugyanaz, mint a szállítási cím). */
export function billingOf(c) {
  const b = c.billing || {};
  if (b.same) return { name: b.company || c.name, zip: c.zip, city: c.city, address: c.address, company: b.company, taxNumber: b.taxNumber };
  return { name: b.company || b.name || c.name, zip: b.zip, city: b.city, address: b.address, company: b.company, taxNumber: b.taxNumber };
}

/* Tételek, kupon, szállítás és fizetés ellenőrzése. sold: a szinkron óta eladott darabok. */
export function priceOrder(catalog, body, sold = {}) {
  const products = Array.isArray(catalog?.products) ? catalog.products : [];
  const s = catalog?.settings || {};
  const items = Array.isArray(body?.items) ? body.items : [];
  if (!items.length || items.length > 50) return err("A kosár üres.", 400);
  const lines = [];
  const seen = new Set();
  let subtotal = 0;
  for (const raw of items) {
    const id = Number(raw?.id);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const qty = Math.max(1, Math.min(99, Math.round(Number(raw?.qty) || 0)));
    const p = products.find(x => Number(x.id) === id && !x.hidden);
    if (!p) return err("Az egyik termék már nem elérhető. Frissítsd az oldalt.", 409, { productId: id, left: 0 });
    const av = availabilityOf(p);
    if (av === "coming_soon") return err(`${p.name}: még nem rendelhető.`, 409, { productId: id, left: 0 });
    const left = Math.max(0, int(p.stock) - int(sold[id]));
    if (left < qty) return err(left ? `${p.name}: már csak ${left} db rendelhető.` : `${p.name}: sajnos közben elfogyott.`, 409, { productId: id, left });
    const price = int(p.price);
    subtotal += price * qty;
    const img = Array.isArray(p.images) ? String(p.images.find(x => !/^data:/.test(String(x))) || "") : "";
    lines.push({ id, name: String(p.name).slice(0, 250), qty, price, image: img, preorder: av === "preorder", releaseDate: String(p.releaseDate || "") });
  }
  if (!lines.length) return err("A kosár üres.", 400);

  const methods = shippingMethods(s);
  const method = methods[body?.shipping]?.on ? body.shipping : Object.keys(methods).find(k => methods[k].on) || "home";

  const code = String(body?.coupon || "").trim().toUpperCase();
  let coupon = null;
  if (code) {
    coupon = (Array.isArray(s.coupons) ? s.coupons : []).find(c => String(c?.code || "").toUpperCase() === code && c.active !== false) || null;
    if (!coupon) return err("A kuponkód nem érvényes. Távolítsd el, vagy próbálj másikat.", 409);
    if (Number(coupon.minOrder) > 0 && subtotal < Number(coupon.minOrder)) return err(`A(z) ${code} kupon csak ${Number(coupon.minOrder).toLocaleString("hu-HU")} Ft feletti rendelésnél használható.`, 409);
  }
  const discount = !coupon ? 0 : coupon.type === "percent" ? Math.round(subtotal * Math.min(90, Number(coupon.value) || 0) / 100)
    : coupon.type === "fixed" ? Math.min(subtotal, Math.round(Number(coupon.value) || 0)) : 0;
  const couponShip = coupon?.type === "ship" && method !== "pickup";
  const free = couponShip || (method !== "pickup" && Number(s.freeShippingFrom) > 0 && subtotal >= Number(s.freeShippingFrom));
  const shipping = free ? 0 : methods[method].price;

  const pays = { card: s.payCard === true, transfer: s.payTransfer !== false, cod: s.payCod !== false };
  const pay = String(body?.pay || "");
  if (!pays[pay]) return err("Ez a fizetési mód most nem érhető el. Válassz másikat.", 409);
  const cod = pay === "cod" ? int(s.codFee) : 0;
  const total = Math.max(0, subtotal - discount) + shipping + cod;

  return {
    ok: true, lines, subtotal, discount, coupon: coupon ? code : "", couponType: coupon?.type || "",
    shipping, cod, total, method, methodLabel: methods[method].label, pay, payLabel: PAY_LABEL[pay],
    preorder: lines.some(l => l.preorder)
  };
}

export function orderNumber() {
  const d = new Date(Date.now() + 60 * 60000); // magyar idő szerinti nap (közelítés)
  const pad = n => String(n).padStart(2, "0");
  const rnd = new Uint16Array(1);
  crypto.getRandomValues(rnd);
  return `NSC-${String(d.getUTCFullYear()).slice(2)}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}-${String(1000 + (rnd[0] % 9000))}`;
}

/* Rendelés mentése a tételekkel együtt (egy tranzakcióban). */
export async function insertOrder(DB, priced, customer, { status, stripeSession = "" } = {}) {
  const at = nowIso();
  const data = {
    lines: priced.lines, subtotal: priced.subtotal, discount: priced.discount, coupon: priced.coupon, couponType: priced.couponType,
    shipping: priced.shipping, cod: priced.cod, total: priced.total, method: priced.method, methodLabel: priced.methodLabel,
    pay: priced.pay, payLabel: priced.payLabel, preorder: priced.preorder, customer, token: randomToken(12),
    emailed: {}, history: [{ at, status, by: "vásárló" }]
  };
  for (let attempt = 0; attempt < 4; attempt++) {
    const id = orderNumber();
    try {
      await DB.batch([
        DB.prepare(`INSERT INTO orders (id, created_at, updated_at, status, pay, paid, ship, email, name, phone, total, data, stripe_session)
          VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)`)
          .bind(id, at, at, status, priced.pay, priced.method, customer.email, customer.name, customer.phone, priced.total, JSON.stringify(data), stripeSession || null),
        ...priced.lines.map(l => DB.prepare("INSERT INTO order_items (order_id, product_id, qty, created_at, active) VALUES (?, ?, ?, ?, 1)").bind(id, l.id, l.qty, at))
      ]);
      return { id, createdAt: at, status, data };
    } catch (e) {
      if (!/UNIQUE|constraint/i.test(String(e?.message || e))) throw e;
    }
  }
  throw new Error("Nem sikerült rendelésszámot kiosztani.");
}

export function rowToOrder(row) {
  if (!row) return null;
  let data = {};
  try { data = JSON.parse(row.data || "{}"); } catch {}
  return {
    id: row.id, createdAt: row.created_at, updatedAt: row.updated_at, status: row.status, statusLabel: STATUS[row.status] || row.status,
    pay: row.pay, paid: !!row.paid, ship: row.ship, email: row.email, name: row.name, phone: row.phone, total: row.total,
    stripeSession: row.stripe_session || "", invoice: row.invoice || "", tracking: row.tracking || "", carrier: row.carrier || "", note: row.note || "",
    data
  };
}

export async function getOrder(DB, id) {
  return rowToOrder(await DB.prepare("SELECT * FROM orders WHERE id = ?").bind(String(id)).first());
}

export async function saveOrder(DB, o) {
  o.updatedAt = nowIso();
  await DB.prepare("UPDATE orders SET status = ?, paid = ?, updated_at = ?, data = ?, invoice = ?, tracking = ?, carrier = ?, note = ?, stripe_session = ? WHERE id = ?")
    .bind(o.status, o.paid ? 1 : 0, o.updatedAt, JSON.stringify(o.data), o.invoice || null, o.tracking || null, o.carrier || null, o.note || null, o.stripeSession || null, o.id).run();
  return o;
}

/* Állapotváltás naplózva. A lemondás visszaadja a készletet, a visszaállítás újra lefoglalja. */
export async function setStatus(DB, o, status, by = "admin") {
  if (!STATUS[status] || o.status === status) return o;
  const was = o.status;
  o.status = status;
  (o.data.history = o.data.history || []).push({ at: nowIso(), status, by });
  if (status === "paid") o.paid = true;
  await saveOrder(DB, o);
  if (status === "cancelled") await DB.prepare("UPDATE order_items SET active = 0 WHERE order_id = ?").bind(o.id).run();
  else if (was === "cancelled") await DB.prepare("UPDATE order_items SET active = 1 WHERE order_id = ?").bind(o.id).run();
  return o;
}

/* Ennyi darab vehető még meg most (a katalógus készlete mínusz a szinkron óta eladott). */
export async function availableMap(DB, catalog) {
  return DB ? soldSince(DB, catalog?.settings?.stockSyncedAt) : {};
}
