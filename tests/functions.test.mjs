// Szerver függvények tesztje Node alatt: D1 helyett node:sqlite, a külső szolgáltatások (GitHub, Stripe, Resend, Billingo) álcázva.
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { register } from "node:module";
// a Workers „cloudflare:sockets” modulja Node alatt: a teszt saját álcázott kapcsolatát adja
register("data:text/javascript," + encodeURIComponent(`export async function resolve(s, c, n) { if (s === "cloudflare:sockets") return { url: "data:text/javascript,export const connect = (...a) => globalThis.__smtpConnect(...a);", shortCircuit: true }; return n(s, c); }`));

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
const allMails = () => calls.filter(c => /^https:\/\/api\.resend\.com\/emails(\/batch)?$/.test(c.url)).flatMap(c => [].concat(JSON.parse(c.init.body)));
const mails = allMails();
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
const nl = allMails().filter(m => m.subject === "Decemberi megjelenések").at(-1);
assert.ok(allMails().some(m => m.to[0] === "fan@example.com" && /Sikeres feliratkozás/.test(m.subject)), "üdvözlő levél megerősítés után");
assert.match(nl.html, /unsubscribe=/); assert.match(nl.html, /<h2[^>]*>Hamarosan<\/h2>/);

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


// 13. ajándékcsomagolás, vásárlási limit, rendelés követés
catalog.settings.giftWrap = true; catalog.settings.giftWrapPrice = 990;
catalog.products[2].maxPerOrder = 1;
r = await call("functions/api/orders.js", "onRequestPost", req("/api/orders", { method: "POST", body: { items: [{ id: 3, qty: 2 }], customer, shipping: "home", pay: "cod" } }));
assert.equal(r.status, 409); assert.match(r.data.error, /legfeljebb 1 db/); assert.equal(r.data.left, 1);
r = await call("functions/api/orders.js", "onRequestPost", req("/api/orders", { method: "POST", body: { items: [{ id: 3, qty: 1 }], customer, shipping: "home", pay: "cod", gift: true, giftMessage: "Boldog karácsonyt!" } }));
assert.equal(r.status, 200, JSON.stringify(r.data)); assert.equal(r.data.total, 29990 + 2500 + 500 + 990); assert.ok(r.data.token.length >= 16);
const gid = r.data.id, gtok = r.data.token;
let rm = allMails().filter(m => /Rendelés visszaigazolás/.test(m.subject) && m.html.includes(gid)).at(-1);
assert.match(rm.html, /Ajándékcsomagolás/); assert.match(rm.html, /rendeles\?id=/);
r = await call("functions/api/order-status.js", "onRequestGet", req(`/api/order-status?id=${gid}&t=${gtok}`));
assert.equal(r.status, 200); assert.equal(r.data.order.status, "new"); assert.equal(r.data.order.gift, true); assert.equal(r.data.order.lines.length, 1); assert.equal(r.data.order.email, undefined);
r = await call("functions/api/order-status.js", "onRequestGet", req(`/api/order-status?id=${gid}&t=rossztokenrossztoken`));
assert.equal(r.status, 404);
r = await call("functions/api/order-status.js", "onRequestPost", req("/api/order-status", { method: "POST", body: { id: gid.toLowerCase(), email: "ELEK@example.com" } }));
assert.equal(r.status, 200);
r = await call("functions/api/order-status.js", "onRequestPost", req("/api/order-status", { method: "POST", body: { id: gid, email: "mas@example.com" } }));
assert.equal(r.status, 404);

// 14. kapcsolat űrlap → admin üzenetek
r = await call("functions/api/contact.js", "onRequestPost", req("/api/contact", { method: "POST", body: { name: "Kata", email: "kata@example.com", subject: "Előrendelés", message: "Mikor érkezik a következő ETB?" } }));
assert.equal(r.data.ok, true); assert.equal(r.data.mailed, true);
r = await call("functions/api/admin/[[path]].js", "onRequest", req("/api/admin/community", { headers: ADMIN }), { path: ["community"] });
assert.equal(r.data.messages.length, 1); assert.equal(r.data.messages[0].status, "new");
await call("functions/api/admin/[[path]].js", "onRequest", req(`/api/admin/messages/${r.data.messages[0].id}`, { method: "PATCH", body: { status: "done" }, headers: ADMIN }), { path: ["messages", String(r.data.messages[0].id)] });
r = await call("functions/api/admin/[[path]].js", "onRequest", req("/api/admin/summary", { headers: ADMIN }), { path: ["summary"] });
assert.equal(r.data.newMessages, 0); assert.ok(r.data.daily.length >= 1); assert.ok(r.data.top.length >= 1);

// Gmail SMTP: álcázott SMTP szerver
function fakeSmtp({ failAuth = false } = {}) {
  const log = [], mails = [], sessions = [];
  const make = () => {
    let enqueue, mode = "cmd", data = "";
    const readable = new ReadableStream({ start(c) { enqueue = t => c.enqueue(new TextEncoder().encode(t)); } });
    const say = t => setTimeout(() => enqueue(t), 0);
    say("220 smtp.gmail.com ESMTP ready\r\n");
    const writable = new WritableStream({ write(chunk) {
      const t = new TextDecoder().decode(chunk);
      if (mode === "data") { data += t; if (data.endsWith("\r\n.\r\n")) { mails.push(data); data = ""; mode = "cmd"; say("250 2.0.0 OK queued\r\n"); } return; }
      for (const line of t.split("\r\n").filter(Boolean)) {
        log.push(line);
        if (/^EHLO/.test(line)) say("250-smtp.gmail.com at your service\r\n250-AUTH LOGIN PLAIN XOAUTH2\r\n250 SMTPUTF8\r\n");
        else if (/^AUTH PLAIN/.test(line)) say(failAuth ? "535-5.7.8 Username and Password not accepted.\r\n535 5.7.8 BadCredentials\r\n" : "235 2.7.0 Accepted\r\n");
        else if (/^MAIL FROM/.test(line)) say("250 OK\r\n");
        else if (/^RCPT TO/.test(line)) say(/bad@/.test(line) ? "550 5.1.1 The email account does not exist\r\n" : "250 OK\r\n");
        else if (line === "DATA") { mode = "data"; say("354 Go ahead\r\n"); }
        else if (line === "RSET" || line === "QUIT") say(line === "RSET" ? "250 OK\r\n" : "221 bye\r\n");
      }
    } });
    return { readable, writable, close() {} };
  };
  return { log, mails, sessions, connect: (addr, opts) => { sessions.push({ addr, opts }); return make(); } };
}
const decodePart = (raw, type) => {
  const m = new RegExp(`Content-Type: ${type}; charset=UTF-8\\r\\nContent-Transfer-Encoding: base64\\r\\n\\r\\n([A-Za-z0-9+/=\\r\\n]+)`).exec(raw);
  return m ? Buffer.from(m[1].replace(/\r\n/g, ""), "base64").toString("utf8") : "";
};
{
  const { smtpSend, encodeHeader } = await imp("lib/smtp.js");
  const smtpEnv = { SMTP_USER: "infonscard@gmail.com", SMTP_PASS: "abcd efgh ijkl mnop" };
  let f = fakeSmtp();
  let r = await smtpSend(smtpEnv, "NS Card <infonscard@gmail.com>", [
    { to: "vevo@example.com", subject: "Rendelés visszaigazolás – NSC-1", html: "<p>Köszönjük!</p>", text: "Köszönjük!", replyTo: "infonscard@gmail.com" },
    { to: "bad@example.com", subject: "x", html: "<p>x</p>", text: "x" },
    { to: "Teszt Elek <masik@example.com>", subject: "Árvíztűrő tükörfúrógép ".repeat(4), html: "<p>.pont a sor elején</p>\n.\nvége", text: ".\nvége" }
  ], { connectFn: f.connect });
  assert.equal(r.sent, 2); assert.equal(r.results[1].ok, false); assert.match(r.results[1].error, /550/);
  assert.equal(f.sessions.length, 1); assert.deepEqual(f.sessions[0].addr, { hostname: "smtp.gmail.com", port: 465 }); assert.equal(f.sessions[0].opts.secureTransport, "on");
  assert.ok(f.log.includes(`AUTH PLAIN ${Buffer.from("\0infonscard@gmail.com\0abcdefghijklmnop").toString("base64")}`), "a szóközöket az alkalmazásjelszóból eltávolítja");
  assert.equal(f.log.filter(l => l === "MAIL FROM:<infonscard@gmail.com>").length, 3); assert.ok(f.log.includes("RSET")); assert.ok(f.log.includes("RCPT TO:<masik@example.com>"));
  assert.equal(f.mails.length, 2);
  assert.match(f.mails[0], /^From: NS Card <infonscard@gmail\.com>\r\nTo: <vevo@example\.com>\r\nReply-To: <infonscard@gmail\.com>\r\nSubject: =\?UTF-8\?B\?/);
  assert.equal(decodePart(f.mails[0], "text/html"), "<p>Köszönjük!</p>"); assert.equal(decodePart(f.mails[0], "text/plain"), "Köszönjük!");
  assert.match(f.mails[1], /To: =\?UTF-8\?B\?[^\r]+\?= <masik@example\.com>|To: Teszt Elek <masik@example\.com>/);
  assert.ok(!/\r\n\.\r\n[^]/.test(f.mails[1].slice(0, -5)), "pont-duplázás: a levél közepén nincs magányos pont sor");
  const subj = /Subject: ([^]*?)\r\n(?!\s)/.exec(f.mails[1])[1];
  assert.equal(subj.split(/\r\n /).map(w => Buffer.from(w.replace(/^=\?UTF-8\?B\?|\?=$/g, ""), "base64").toString("utf8")).join(""), "Árvíztűrő tükörfúrógép ".repeat(4));
  assert.equal(encodeHeader("NS Card"), "NS Card");
  // hibás alkalmazásjelszó: érthető hiba
  f = fakeSmtp({ failAuth: true });
  r = await smtpSend(smtpEnv, "NS Card <infonscard@gmail.com>", [{ to: "vevo@example.com", subject: "x", html: "x" }], { connectFn: f.connect });
  assert.equal(r.ok, false); assert.match(r.error, /alkalmazásjelszó/);

  // a webshop levelei Gmailen: rendelés → vásárló + bolt egy kapcsolaton, a feladó a Gmail cím
  f = fakeSmtp();
  const saved = { RESEND_API_KEY: env.RESEND_API_KEY };
  delete env.RESEND_API_KEY;
  Object.assign(env, smtpEnv, { __smtpConnect: f.connect });
  r = await call("functions/api/orders.js", "onRequestPost", req("/api/orders", { method: "POST", headers: { "CF-Connecting-IP": "5.5.5.5" }, body: { items: [{ id: 3, qty: 1 }], customer: { ...customer, email: "gmailes@example.com" }, shipping: "home", pay: "transfer" } }));
  assert.equal(r.status, 200, JSON.stringify(r.data)); assert.equal(r.data.emailed, true);
  assert.equal(f.sessions.length, 1); assert.equal(f.mails.length, 2);
  assert.ok(f.log.includes("RCPT TO:<gmailes@example.com>") && f.log.includes("RCPT TO:<bolt@example.com>"));
  const conf = decodePart(f.mails[0], "text/html"), confText = decodePart(f.mails[0], "text/plain");
  assert.match(conf, /Köszönjük a rendelést/); assert.match(conf, /Utalási adatok/); assert.match(conf, /Mi történik ezután\?/); assert.match(conf, /Rendelés követése/);
  assert.match(confText, /Utalási adatok/); assert.doesNotMatch(confText, /<td|<table/); assert.match(confText, /Rendelés követése \(https:\/\/nscard-webshop\.pages\.dev\/rendeles\?id=/);
  assert.match(decodePart(f.mails[1], "text/html"), /Új rendelés/); assert.match(f.mails[1], /Reply-To: <gmailes@example\.com>/);
  // próbalevél az adminból (adatbázis nélkül is)
  f = fakeSmtp(); env.__smtpConnect = f.connect;
  r = await call("functions/api/admin/[[path]].js", "onRequest", req("/api/admin/test-mail", { method: "POST", headers: ADMIN, body: { to: "bence@example.com" } }), { path: ["test-mail"] });
  assert.equal(r.status, 200, JSON.stringify(r.data)); assert.equal(r.data.from, "NS Card <infonscard@gmail.com>");
  assert.match(decodePart(f.mails[0], "text/html"), /A levelezés működik/);
  r = await call("functions/api/admin/[[path]].js", "onRequest", req("/api/admin/integrations", { headers: ADMIN }), { path: ["integrations"] });
  assert.equal(r.data.mailTransport, "gmail"); assert.equal(r.data.mailFrom, "NS Card <infonscard@gmail.com>"); assert.equal(r.data.adminEmail, "bolt@example.com");
  // hírlevél részletekben: aki megkapta, annak nem megy újra
  for (const [i, em] of ["h1@example.com", "h2@example.com", "h3@example.com"].entries()) await env.DB.prepare("INSERT INTO subscribers (email, token, confirmed, unsubscribed, created_at) VALUES (?, ?, 1, 0, ?)").bind(em, String(i).repeat(32), new Date().toISOString()).run().catch(e => { throw e; });
  f = fakeSmtp(); env.__smtpConnect = f.connect;
  const nl = { subject: "Új szett érkezik", body: "## Hamarosan\nElőrendelhető az új ETB." };
  r = await call("functions/api/admin/[[path]].js", "onRequest", req("/api/admin/newsletter", { method: "POST", headers: ADMIN, body: nl }), { path: ["newsletter"] });
  assert.equal(r.status, 200, JSON.stringify(r.data)); assert.ok(r.data.sent >= 3); assert.equal(r.data.left, 0);
  assert.match(f.mails[0], /List-Unsubscribe: <https:\/\/nscard-webshop\.pages\.dev\/api\/newsletter\?unsubscribe=/);
  r = await call("functions/api/admin/[[path]].js", "onRequest", req("/api/admin/newsletter", { method: "POST", headers: ADMIN, body: nl }), { path: ["newsletter"] });
  assert.equal(r.data.done, true);
  delete env.SMTP_USER; delete env.SMTP_PASS; delete env.__smtpConnect; Object.assign(env, saved);
}

// szerveres belépés és publikálás (ADMIN_PASSWORD + GITHUB_TOKEN a Cloudflare-ben)
{
  const L = "functions/api/admin-login.js", AD = "functions/api/admin/[[path]].js";
  r = await call(L, "onRequestGet", req("/api/admin-login"));
  assert.equal(r.data.configured, false);
  r = await call(L, "onRequestPost", req("/api/admin-login", { method: "POST", body: { user: "NSadmin", pass: "x" } }));
  assert.equal(r.status, 501); assert.equal(r.data.configured, false);
  Object.assign(env, { ADMIN_PASSWORD: "Nagyon-Eros-Jelszo-2026", ADMIN_USER: "NSadmin", GITHUB_TOKEN: "good-token-0123456789abcdef" });
  r = await call(L, "onRequestGet", req("/api/admin-login"));
  assert.deepEqual(r.data, { configured: true, github: true });
  r = await call(L, "onRequestPost", req("/api/admin-login", { method: "POST", body: { user: "NSadmin", pass: "rossz" } }));
  assert.equal(r.status, 401); assert.ok(!r.data.token);
  r = await call(L, "onRequestPost", req("/api/admin-login", { method: "POST", body: { user: "nsadmin", pass: "Nagyon-Eros-Jelszo-2026", remember: true } }));
  assert.equal(r.status, 200); assert.match(r.data.token, /^nsc1\./); assert.ok(r.data.exp > Date.now() + 29 * 864e5); assert.equal(r.data.github, true);
  const S = { Authorization: `Bearer ${r.data.token}` };
  r = await call(AD, "onRequest", req("/api/admin/summary", { headers: S }), { path: ["summary"] });
  assert.equal(r.status, 200);
  const forged = S.Authorization.slice(0, -3) + (S.Authorization.endsWith("AAA") ? "BBB" : "AAA");
  r = await call(AD, "onRequest", req("/api/admin/summary", { headers: { Authorization: forged } }), { path: ["summary"] });
  assert.equal(r.status, 401); assert.equal(r.data.relogin, true);
  r = await call(AD, "onRequest", req("/api/admin/integrations", { headers: S }), { path: ["integrations"] });
  assert.equal(r.data.adminAuth, true); assert.equal(r.data.github, true);
  // GitHub proxy: a szerver tokenjével, csak a katalógus mappájába és a beállított ágra
  r = await call(AD, "onRequest", req("/api/admin/github", { headers: S }), { path: ["github"] });
  assert.equal(r.status, 200); assert.equal(r.data.permissions.push, true);
  let last = calls.at(-1); assert.equal(last.url, "https://api.github.com/repos/o/r"); assert.equal(last.init.headers.Authorization, "Bearer good-token-0123456789abcdef");
  r = await call(AD, "onRequest", req("/api/admin/github/contents/public/store/catalog.json?ref=evil", { headers: S }), { path: ["github", "contents", "public", "store", "catalog.json"] });
  last = calls.at(-1); assert.equal(last.url, "https://api.github.com/repos/o/r/contents/public/store/catalog.json?ref=main");
  r = await call(AD, "onRequest", req("/api/admin/github/contents/public/store/images/1-a.webp", { method: "PUT", headers: S, body: { message: "Kép", content: "AAAA", branch: "evil", sha: "abc123" } }), { path: ["github", "contents", "public", "store", "images", "1-a.webp"] });
  assert.equal(r.status, 200); last = calls.at(-1);
  assert.equal(last.init.method, "PUT"); assert.deepEqual(JSON.parse(last.init.body), { message: "Kép", content: "AAAA", branch: "main", sha: "abc123" });
  const before = calls.length;
  for (const path of [["github", "contents", "functions", "api", "x.js"], ["github", "contents", "public", "store", "..", "..", "functions", "x.js"], ["github", "contents", "public", "index.html"]]) {
    r = await call(AD, "onRequest", req("/api/admin/" + path.join("/"), { method: "PUT", headers: S, body: { content: "AAAA" } }), { path });
    assert.equal(r.status, 403, path.join("/"));
  }
  r = await call(AD, "onRequest", req("/api/admin/github/pulls", { headers: S }), { path: ["github", "pulls"] });
  assert.equal(r.status, 400);
  assert.equal(calls.length, before, "tiltott útvonalon nem mehet ki kérés");
  // GitHub token nélkül érthető hiba
  delete env.GITHUB_TOKEN;
  r = await call(AD, "onRequest", req("/api/admin/github", { headers: S }), { path: ["github"] });
  assert.equal(r.status, 503); assert.equal(r.data.notoken, true);
  // próbálkozás-korlát IP-nként
  const bad = () => call(L, "onRequestPost", req("/api/admin-login", { method: "POST", headers: { "CF-Connecting-IP": "9.9.9.9" }, body: { user: "NSadmin", pass: "nem" } }));
  for (let i = 0; i < 10; i++) assert.equal((await bad()).status, 401);
  assert.equal((await bad()).status, 429);
  r = await call(L, "onRequestPost", req("/api/admin-login", { method: "POST", headers: { "CF-Connecting-IP": "9.9.9.9" }, body: { user: "NSadmin", pass: "Nagyon-Eros-Jelszo-2026" } }));
  assert.equal(r.status, 429);
  // jelszócsere után a régi munkamenet érvénytelen
  env.ADMIN_PASSWORD = "Masik-Jelszo-2027";
  r = await call(AD, "onRequest", req("/api/admin/summary", { headers: S }), { path: ["summary"] });
  assert.equal(r.status, 401);
  // a régi, GitHub tokenes admin is működik tovább
  r = await call(AD, "onRequest", req("/api/admin/summary", { headers: ADMIN }), { path: ["summary"] });
  assert.equal(r.status, 200);
  delete env.ADMIN_PASSWORD; delete env.ADMIN_USER;
}

// markdown: táblázat és GYIK a szerveroldali cikkben is
{
  const { mdToHtml } = await imp("lib/core.js");
  const h = mdToHtml("## Gyakori kérdések\n### Mi az ETB?\nEgy doboz.\n\n| Termék | Ár |\n|---|---|\n| Booster | **1990 Ft** |\n\n> **Tipp:** sleeve");
  assert.match(h, /<h2 id="gyakori-kerdesek">/); assert.match(h, /<table><thead><tr><th>Termék<\/th><th>Ár<\/th><\/tr><\/thead><tbody><tr><td>Booster<\/td><td><strong>1990 Ft<\/strong><\/td><\/tr><\/tbody><\/table>/);
  assert.doesNotMatch(h, /\|---/); assert.match(h, /<blockquote><strong>Tipp:<\/strong> sleeve<\/blockquote>/);
  assert.doesNotMatch(mdToHtml("| <script>x</script> |"), /<script>/);
}

console.log("OK – szerver függvények:", calls.length, "külső hívás álcázva");
