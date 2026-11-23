// Szerver függvények tesztje Node alatt: D1 helyett node:sqlite, a külső szolgáltatások (GitHub, Stripe, Resend, Billingo) álcázva.
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const ROOT = process.argv[2] || new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const imp = p => import(`${ROOT}/${p}`);

class Stmt {
  constructor(db, sql) { this.db = db; this.sql = sql; this.args = []; }
  bind(...a) { const s = new Stmt(this.db, this.sql); s.args = a.map(v => v === undefined ? null : typeof v === "boolean" ? (v ? 1 : 0) : v); return s; }
  _p() { return this.db.prepare(this.sql); }
  async first() { const r = this._p().get(...this.args); return r ? { ...r } : null; }
  async all() { return { results: this._p().all(...this.args).map(r => ({ ...r })) }; }
  async run() { const r = this._p().run(...this.args); return { meta: { changes: Number(r.changes) } }; }
}
class D1 {
  constructor() { this.db = new DatabaseSync(":memory:"); }
  prepare(sql) { return new Stmt(this.db, sql); }
  async batch(stmts) {
    this.db.exec("BEGIN");
    try { const out = []; for (const s of stmts) out.push(await s.run()); this.db.exec("COMMIT"); return out; }
    catch (e) { this.db.exec("ROLLBACK"); throw e; }
  }
}

const catalog = {
  updatedAt: "2026-11-23T10:00:00.000Z",
  settings: {
    shopName: "NS Card", email: "bolt@example.com", payCard: true, payTransfer: true, payCod: true, codFee: 500,
    shipHome: true, shippingHome: 2500, shipLocker: true, shippingLocker: 1990, freeShippingFrom: 30000,
    coupons: [{ code: "NYAR10", type: "percent", value: 10, active: true, minOrder: 0 }],
    stockSyncedAt: "", bankDetails: "Kedvezményezett: Teszt\nSzámlaszám: 11111111-22222222", vatRate: "AAM", invoiceAuto: true,
    categories: [{ value: "etb", label: "Elite Trainer Boxok" }],
    posts: [{ slug: "elso", title: "Első", date: "2026-11-20", body: "## Szia", published: true }]
  },
  products: [
    { id: 1, name: "ETB A", category: "etb", price: 19990, stock: 3, availability: "in_stock", images: ["img/a.webp"], ean: "1234567890123" },
    { id: 2, name: "Booster B", category: "etb", price: 2490, stock: 0, availability: "in_stock", images: [] },
    { id: 3, name: "Előrendelés C", category: "etb", price: 29990, stock: 5, availability: "preorder", releaseDate: "2026-12-12", images: [] },
    { id: 4, name: "Hamarosan D", category: "etb", price: 9990, stock: 5, availability: "coming_soon", images: [] }
  ]
};

const calls = [];
globalThis.fetch = async (input, init = {}) => {
  const url = typeof input === "string" ? input : input.url;
  calls.push({ url, init });
  const j = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "Content-Type": "application/json" } });
  if (url.startsWith("https://raw.githubusercontent.com/")) return j(catalog);
  if (url.startsWith("https://api.github.com/repos/")) return init.headers.Authorization === "Bearer good-token-0123456789abcdef" ? j({ permissions: { push: true } }) : j({ message: "Bad" }, 401);
  if (url === "https://api.resend.com/emails") return j({ id: "em_" + calls.length });
  if (url === "https://api.resend.com/emails/batch") return j({ data: [] });
  if (url.startsWith("https://api.stripe.com/v1/checkout/sessions/")) return j({ id: "cs_test_1", status: "complete", payment_status: "paid", amount_total: 2249000, metadata: { order_id: globalThis.__lastOrder }, line_items: { data: [] } });
  if (url === "https://api.stripe.com/v1/checkout/sessions") return j({ id: "cs_test_1", url: "https://checkout.stripe.com/x" });
  if (url === "https://api.stripe.com/v1/coupons") return j({ id: "co_1" });
  if (url.startsWith("https://api.billingo.hu/v3/document-blocks")) return j({ data: [{ id: 77, name: "Webshop", type: "invoice" }] });
  if (url === "https://api.billingo.hu/v3/partners") return j({ id: 5 });
  if (url === "https://api.billingo.hu/v3/documents") return j({ id: 900, invoice_number: "NSC-2026-1" });
  if (/billingo.*\/send$/.test(url)) return j({});
  throw new Error("Váratlan fetch: " + url);
};

const ASSETS = { fetch: async u => { const p = new URL(u).pathname; if (p === "/sync-config.json") return new Response(JSON.stringify({ owner: "o", repo: "r", branch: "main", path: "public/store/catalog.json" })); return new Response("nincs", { status: 404 }); } };
const env = { DB: new D1(), ASSETS, RESEND_API_KEY: "re_x", STRIPE_SECRET_KEY: "sk_test_x", STRIPE_WEBHOOK_SECRET: "whsec_test", BILLINGO_API_KEY: "bg_x" };
const req = (path, { method = "GET", body, headers = {} } = {}) => new Request(`https://nscard-webshop.pages.dev${path}`, { method, body: body ? JSON.stringify(body) : undefined, headers: { "Content-Type": "application/json", "CF-Connecting-IP": "1.2.3.4", ...headers } });
const ADMIN = { Authorization: "Bearer good-token-0123456789abcdef" };
const call = async (mod, fn, r, params = {}) => { const m = await imp(mod); const res = await m[fn]({ request: r, env, params }); const text = await res.text(); let data; try { data = JSON.parse(text); } catch { data = text; } return { status: res.status, data, headers: res.headers }; };

const customer = { name: "Teszt Elek", email: "elek@example.com", phone: "+36301234567", zip: "1051", city: "Budapest", address: "Fő utca 1.", billing: { same: true } };

// 1. élő adatok
let r = await call("functions/api/live.js", "onRequestGet", req("/api/live"));
assert.equal(r.status, 200); assert.equal(r.data.features.db, true); assert.deepEqual(r.data.sold, {});

// 2. átutalásos rendelés
r = await call("functions/api/orders.js", "onRequestPost", req("/api/orders", { method: "POST", body: { items: [{ id: 1, qty: 2 }], customer, shipping: "home", pay: "transfer", coupon: "nyar10" } }));
assert.equal(r.status, 200, JSON.stringify(r.data)); assert.match(r.data.id, /^NSC-\d{6}-\d{4}$/);
assert.equal(r.data.total, 19990 * 2 - 3998 + 0); // ingyenes szállítás 30 000 felett
assert.equal(r.data.emailed, true);
const o1 = r.data.id;
const mails = calls.filter(c => c.url === "https://api.resend.com/emails").map(c => JSON.parse(c.init.body));
assert.ok(mails.some(m => m.to[0] === "elek@example.com" && /Rendelés visszaigazolás/.test(m.subject) && /11111111-22222222/.test(m.html)));
assert.ok(mails.some(m => m.to[0] === "bolt@example.com" && /Új rendelés/.test(m.subject)));

// 3. készlet: 3 - 2 = 1 maradt
r = await call("functions/api/live.js", "onRequestGet", req("/api/live"));
assert.equal(r.data.sold[1], 2);
r = await call("functions/api/orders.js", "onRequestPost", req("/api/orders", { method: "POST", body: { items: [{ id: 1, qty: 2 }], customer, shipping: "home", pay: "cod" } }));
assert.equal(r.status, 409); assert.equal(r.data.left, 1);
// elfogyott és hamarosan termék
r = await call("functions/api/orders.js", "onRequestPost", req("/api/orders", { method: "POST", body: { items: [{ id: 2, qty: 1 }], customer, shipping: "home", pay: "cod" } }));
assert.equal(r.status, 409);
r = await call("functions/api/orders.js", "onRequestPost", req("/api/orders", { method: "POST", body: { items: [{ id: 4, qty: 1 }], customer, shipping: "home", pay: "cod" } }));
assert.equal(r.status, 409);
// csomagautomata cím nélkül
r = await call("functions/api/orders.js", "onRequestPost", req("/api/orders", { method: "POST", body: { items: [{ id: 3, qty: 1 }], customer: { ...customer, billing: { same: false } }, shipping: "locker", pay: "cod" } }));
assert.equal(r.status, 400);
// előrendelés automatába, külön számlázási címmel, utánvét díjjal
r = await call("functions/api/orders.js", "onRequestPost", req("/api/orders", { method: "POST", body: { items: [{ id: 3, qty: 1 }], customer: { ...customer, locker: "FOXPOST – Teszt automata", lockerId: "hu1", billing: { same: false, zip: "6720", city: "Szeged", address: "Kárász u. 1." } }, shipping: "locker", pay: "cod" } }));
assert.equal(r.status, 200, JSON.stringify(r.data)); assert.equal(r.data.total, 29990 + 1990 + 500); assert.equal(r.data.preorder, true);
const o2 = r.data.id;

// 4. admin jogosultság
r = await call("functions/api/admin/[[path]].js", "onRequest", req("/api/admin/orders", { headers: { Authorization: "Bearer bad-token-0123456789abcdef" } }), { path: ["orders"] });
assert.equal(r.status, 401);
r = await call("functions/api/admin/[[path]].js", "onRequest", req("/api/admin/orders", { headers: ADMIN }), { path: ["orders"] });
assert.equal(r.status, 200); assert.equal(r.data.orders.length, 2);
r = await call("functions/api/admin/[[path]].js", "onRequest", req("/api/admin/summary", { headers: ADMIN }), { path: ["summary"] });
assert.equal(r.data.open, 2); assert.equal(r.data.counts.new, 2);

// 5. fizetve + automatikus számla (Billingo, AAM)
r = await call("functions/api/admin/[[path]].js", "onRequest", req(`/api/admin/orders/${o1}`, { method: "PATCH", body: { status: "paid" }, headers: ADMIN }), { path: ["orders", o1] });
assert.equal(r.status, 200, JSON.stringify(r.data)); assert.equal(r.data.order.paid, true); assert.equal(r.data.order.invoice, "NSC-2026-1");
const doc = JSON.parse(calls.filter(c => c.url === "https://api.billingo.hu/v3/documents").at(-1).init.body);
assert.equal(doc.block_id, 77); assert.equal(doc.items[0].vat, "AAM"); assert.equal(doc.items[0].quantity, 2); assert.ok(doc.items.some(i => i.unit_price === -3998)); assert.equal(doc.paid, true);
// feladva + csomagszám → levél
r = await call("functions/api/admin/[[path]].js", "onRequest", req(`/api/admin/orders/${o1}`, { method: "PATCH", body: { status: "shipped", carrier: "foxpost", tracking: "CLFOX123" }, headers: ADMIN }), { path: ["orders", o1] });
assert.equal(r.data.mailed, 1);
assert.ok(JSON.parse(calls.filter(c => c.url === "https://api.resend.com/emails").at(-1).init.body).html.includes("foxpost.hu/csomagkovetes/?code=CLFOX123"));
// lemondás visszaadja a készletet
r = await call("functions/api/admin/[[path]].js", "onRequest", req(`/api/admin/orders/${o2}`, { method: "PATCH", body: { status: "cancelled", notify: false }, headers: ADMIN }), { path: ["orders", o2] });
r = await call("functions/api/live.js", "onRequestGet", req("/api/live"));
assert.equal(r.data.sold[3], undefined); assert.equal(r.data.sold[1], 2);
// készlet szinkron utáni lekérdezés
r = await call("functions/api/admin/[[path]].js", "onRequest", req(`/api/admin/stock?since=${encodeURIComponent(new Date(Date.now() + 1000).toISOString())}`, { headers: ADMIN }), { path: ["stock"] });
assert.deepEqual(r.data.sold, {});
// CSV
r = await call("functions/api/admin/[[path]].js", "onRequest", req("/api/admin/orders.csv", { headers: ADMIN }), { path: ["orders.csv"] });
assert.match(r.data, /Rendelésszám;Dátum/); assert.match(r.data, new RegExp(o1));

// 6. kártyás fizetés: függő rendelés → sikeres visszatérés
r = await call("functions/api/create-checkout-session.js", "onRequestPost", req("/api/create-checkout-session", { method: "POST", body: { items: [{ id: 3, qty: 1 }], customer, shipping: "home", coupon: "NYAR10" } }));
assert.equal(r.status, 200, JSON.stringify(r.data)); assert.ok(r.data.order);
globalThis.__lastOrder = r.data.order;
const sess = new URLSearchParams(calls.filter(c => c.url === "https://api.stripe.com/v1/checkout/sessions").at(-1).init.body);
assert.equal(sess.get("metadata[order_id]"), r.data.order); assert.ok(sess.get("expires_at")); assert.equal(sess.get("discounts[0][coupon]"), "co_1");
r = await call("functions/api/admin/[[path]].js", "onRequest", req(`/api/admin/orders/${globalThis.__lastOrder}`, { headers: ADMIN }), { path: ["orders", globalThis.__lastOrder] });
assert.equal(r.data.order.status, "pending_payment");
r = await call("functions/api/checkout-session.js", "onRequestGet", req("/api/checkout-session?session_id=cs_test_1"));
assert.equal(r.data.order, globalThis.__lastOrder);
r = await call("functions/api/admin/[[path]].js", "onRequest", req(`/api/admin/orders/${globalThis.__lastOrder}`, { headers: ADMIN }), { path: ["orders", globalThis.__lastOrder] });
assert.equal(r.data.order.status, "paid"); assert.equal(r.data.order.paid, true); assert.ok(r.data.order.data.emailed.customer);

// 7. webhook aláírás
const payload = JSON.stringify({ type: "checkout.session.expired", data: { object: { id: "cs_2", metadata: { order_id: "NSC-NONE" } } } });
r = await call("functions/api/stripe-webhook.js", "onRequestPost", new Request("https://x/api/stripe-webhook", { method: "POST", body: payload, headers: { "Stripe-Signature": "t=1,v1=00" } }));
assert.equal(r.status, 400);
const { createHmac } = await import("node:crypto");
const t = Math.floor(Date.now() / 1000);
const sig = createHmac("sha256", "whsec_test").update(`${t}.${payload}`).digest("hex");
r = await call("functions/api/stripe-webhook.js", "onRequestPost", new Request("https://x/api/stripe-webhook", { method: "POST", body: payload, headers: { "Stripe-Signature": `t=${t},v1=${sig}` } }));
assert.equal(r.status, 200); assert.equal(r.data.received, true);

// 8. hírlevél (dupla megerősítés) és leiratkozás
r = await call("functions/api/subscribe.js", "onRequestPost", req("/api/subscribe", { method: "POST", body: { email: "Fan@Example.com", consent: true, source: "home" } }));
assert.equal(r.data.confirm, true);
const tok = (await env.DB.prepare("SELECT token, confirmed FROM subscribers WHERE email = ?").bind("fan@example.com").first());
assert.equal(tok.confirmed, 0);
const conf = await (await imp("functions/api/newsletter.js")).onRequestGet({ request: req(`/api/newsletter?confirm=${tok.token}`), env });
assert.equal(conf.status, 302); assert.match(conf.headers.get("Location"), /hirlevel=ok/);
r = await call("functions/api/subscribe.js", "onRequestPost", req("/api/subscribe", { method: "POST", body: { email: "x@example.com" } }));
assert.equal(r.status, 400);
r = await call("functions/api/admin/[[path]].js", "onRequest", req("/api/admin/newsletter", { method: "POST", body: { subject: "Decemberi megjelenések", body: "## Hamarosan\nÚj ETB érkezik." }, headers: ADMIN }), { path: ["newsletter"] });
assert.equal(r.data.sent, 1);
const nl = JSON.parse(calls.filter(c => c.url === "https://api.resend.com/emails/batch").at(-1).init.body)[0];
assert.match(nl.html, /unsubscribe=/); assert.match(nl.html, /<h2>Hamarosan<\/h2>/);

// 9. újra kapható értesítő
r = await call("functions/api/notify.js", "onRequestPost", req("/api/notify", { method: "POST", body: { email: "varo@example.com", productId: 2 } }));
assert.equal(r.data.ok, true);
catalog.products[1].stock = 4;
r = await call("functions/api/admin/[[path]].js", "onRequest", req("/api/admin/notify", { method: "POST", body: { ids: [2] }, headers: ADMIN }), { path: ["notify"] });
assert.equal(r.data.sent, 1);
r = await call("functions/api/admin/[[path]].js", "onRequest", req("/api/admin/notify", { method: "POST", body: { ids: [2] }, headers: ADMIN }), { path: ["notify"] });
assert.equal(r.data.sent, 0);

// 10. vélemény: hitelesített vásárlás, moderálás
r = await call("functions/api/reviews.js", "onRequestPost", req("/api/reviews", { method: "POST", body: { productId: 1, rating: 5, name: "Elek", body: "Gyors szállítás, hibátlan doboz.", email: "elek@example.com", orderId: o1 } }));
assert.equal(r.data.verified, true);
r = await call("functions/api/reviews.js", "onRequestGet", req("/api/reviews?product=1"));
assert.equal(r.data.count, 0);
const rv = await env.DB.prepare("SELECT id FROM reviews").first();
await call("functions/api/admin/[[path]].js", "onRequest", req(`/api/admin/reviews/${rv.id}`, { method: "PATCH", body: { status: "approved", reply: "Köszönjük!" }, headers: ADMIN }), { path: ["reviews", String(rv.id)] });
r = await call("functions/api/reviews.js", "onRequestGet", req("/api/reviews?product=1"));
assert.equal(r.data.count, 1); assert.equal(r.data.avg, 5); assert.equal(r.data.reviews[0].reply, "Köszönjük!");
r = await call("functions/api/live.js", "onRequestGet", req("/api/live"));
assert.deepEqual(r.data.ratings[1], [5, 1]);
r = await call("functions/api/admin/[[path]].js", "onRequest", req("/api/admin/community", { headers: ADMIN }), { path: ["community"] });
assert.equal(r.data.subStats.active, 1); assert.equal(r.data.reviews.length, 1);

// 11. feedek
r = await call("functions/feeds/google.xml.js", "onRequestGet", req("/feeds/google.xml"));
assert.match(r.data, /<g:id>NSC-1<\/g:id>/); assert.match(r.data, /<g:availability>preorder<\/g:availability>/); assert.match(r.data, /<g:gtin>1234567890123<\/g:gtin>/);
r = await call("functions/feeds/arukereso.xml.js", "onRequestGet", req("/feeds/arukereso.xml"));
assert.match(r.data, /<identifier>NSC-1<\/identifier>/); assert.doesNotMatch(r.data, /Hamarosan D/);
r = await call("functions/feeds/argep.xml.js", "onRequestGet", req("/feeds/argep.xml"));
assert.match(r.data, /<termeklink>https:\/\/www.nscard.hu\/product\?id=1<\/termeklink>/);

// 12. adatbázis nélkül: tartalék
const env2 = { ...env, DB: undefined };
const m = await imp("functions/api/orders.js");
const res2 = await m.onRequestPost({ request: req("/api/orders", { method: "POST", body: { items: [{ id: 1, qty: 1 }], customer, pay: "cod" } }), env: env2 });
assert.equal(res2.status, 503); assert.equal((await res2.json()).fallback, true);

console.log("OK – szerver függvények:", calls.length, "külső hívás álcázva");
