// Számlázz.hu (Számla Agent) teszt Node alatt: D1 helyett node:sqlite, a Számlázz.hu és a GitHub álcázva.
// Futtatás: node tests/szamlazz.test.mjs
import { DatabaseSync } from "node:sqlite";
import assert from "node:assert/strict";
import { register } from "node:module";
// a Workers „cloudflare:sockets” modulja Node alatt (a levelező modul importálja; itt nincs levelezés beállítva)
register("data:text/javascript," + encodeURIComponent(`export async function resolve(s, c, n) { if (s === "cloudflare:sockets") return { url: "data:text/javascript,export const connect = () => { throw new Error('nincs SMTP'); };", shortCircuit: true }; return n(s, c); }`));

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
  updatedAt: "2026-11-28T10:00:00.000Z",
  settings: {
    shopName: "NS Card", email: "bolt@example.com", payCard: true, payTransfer: true, payCod: true, codFee: 500,
    shipHome: true, shippingHome: 2500, shipLocker: true, shippingLocker: 1990, freeShippingFrom: 0,
    coupons: [{ code: "NYAR10", type: "percent", value: 10, active: true, minOrder: 0 }],
    stockSyncedAt: "", vatRate: "27%", invoiceAuto: true, invoiceElectronic: true, invoiceSend: true, szamlazzPrefix: "NSC"
  },
  products: [
    { id: 1, name: "ETB <A> & B", category: "etb", price: 500, stock: 10, availability: "in_stock", images: [] },
    { id: 2, name: "Booster", category: "etb", price: 2490, stock: 10, availability: "in_stock", images: [] },
    { id: 3, name: "Tin C", category: "etb", price: 6990, stock: 10, availability: "in_stock", images: [] }
  ]
};

/* Számlázz.hu álca: a beküldött XML-t eltárolja; a viselkedést a `mode` állítja. */
const sent = [];
let mode = "ok";
let seq = 0;
globalThis.fetch = async (input, init = {}) => {
  const url = typeof input === "string" ? input : input.url;
  const j = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "Content-Type": "application/json" } });
  if (url.startsWith("https://raw.githubusercontent.com/")) return j(catalog);
  if (url.startsWith("https://api.github.com/repos/")) return init.headers.Authorization === "Bearer good-token-0123456789abcdef" ? j({ permissions: { push: true } }) : j({ message: "Bad" }, 401);
  if (url === "https://www.szamlazz.hu/szamla/") {
    assert.ok(init.body instanceof FormData, "multipart/form-data kérés");
    const [[field, file]] = [...init.body.entries()];
    const xml = await file.text();
    sent.push({ field, xml });
    const err = (code, msg) => new Response(`[ERR] ${msg}`, { status: 200, headers: { szlahu_error_code: String(code), szlahu_error: encodeURIComponent(msg) } });
    if (mode === "badkey") return err(3, "Sikertelen bejelentkezés.");
    if (field === "action-szamla_agent_pdf") {
      if (/NSC-KAPCSOLAT-TESZT/.test(xml)) return err(7, "Hiányzó adat: számla xml (ismeretlen számlaszám, rendelésszám vagy külső azonosító).");
      return new Response(new TextEncoder().encode("%PDF-1.4 teszt"), { headers: { "Content-Type": "application/pdf" } });
    }
    if (field === "action-xmlagentxmlfile") {
      if (mode === "noeinvoice" && /<eszamla>true<\/eszamla>/.test(xml)) return err(54, "E-számla készítés nincs engedélyezve.");
      const num = `${/<eszamla>true/.test(xml) ? "E-" : ""}NSC-2026-${++seq}`;
      return new Response(`xmlagentresponse=DONE;${num}`, { headers: { szlahu_szamlaszam: encodeURIComponent(num), szlahu_id: String(1000 + seq), szlahu_bruttovegosszeg: "0" } });
    }
  }
  throw new Error("Váratlan fetch: " + url);
};

const ASSETS = { fetch: async u => { const p = new URL(u).pathname; if (p === "/sync-config.json") return new Response(JSON.stringify({ owner: "o", repo: "r", branch: "main", path: "public/store/catalog.json" })); return new Response("nincs", { status: 404 }); } };
const env = { DB: new D1(), ASSETS, SZAMLAZZ_AGENT_KEY: "agent-kulcs-123" };
const req = (path, { method = "GET", body, headers = {} } = {}) => new Request(`https://nscard-webshop.pages.dev${path}`, { method, body: body ? JSON.stringify(body) : undefined, headers: { "Content-Type": "application/json", "CF-Connecting-IP": "1.2.3.4", ...headers } });
const ADMIN = { Authorization: "Bearer good-token-0123456789abcdef" };
const call = async (mod, fn, r, params = {}) => { const m = await imp(mod); const res = await m[fn]({ request: r, env, params }); const buf = new Uint8Array(await res.arrayBuffer()); const text = new TextDecoder().decode(buf); let data; try { data = JSON.parse(text); } catch { data = text; } return { status: res.status, data, headers: res.headers }; };
const tagOf = (xml, t) => (xml.match(new RegExp(`<${t}>([\\s\\S]*?)</${t}>`)) || [])[1];
const items = xml => [...xml.matchAll(/<tetel>([\s\S]*?)<\/tetel>/g)].map(m => Object.fromEntries(["megnevezes", "azonosito", "mennyiseg", "nettoEgysegar", "afakulcs", "nettoErtek", "afaErtek", "bruttoErtek"].map(k => [k, tagOf(m[1], k)])));

const sz = await imp("lib/szamlazz.js");

// 1. kerekítés: a Számlázz.hu dokumentáció példája (500 Ft × 3, 27%)
assert.deepEqual(sz.itemOf("x", 500, 3, "27"), { name: "x", id: "", qty: 3, unit: 393.67, vat: "27", net: 1181, afa: 319, gross: 1500 });
assert.deepEqual(sz.itemOf("x", -3998, 1, "27"), { name: "x", id: "", qty: 1, unit: -3148, vat: "27", net: -3148, afa: -850, gross: -3998 });
assert.deepEqual(sz.itemOf("x", 2490, 2, "AAM"), { name: "x", id: "", qty: 2, unit: 2490, vat: "AAM", net: 4980, afa: 0, gross: 4980 });
assert.match(sz.huDay(0, Date.parse("2026-11-28T23:30:00Z")), /^2026-11-29$/); // magyar idő szerint már másnap

const customer = { name: "Teszt Elek", email: "elek@example.com", phone: "+36301234567", zip: "1051", city: "Budapest", address: "Fő utca 1.", billing: { same: true, company: "Kártya Kft.", taxNumber: "12345678212" } };

// 2. integrációk: a kulcs működik (ismeretlen számlaszám = belépés rendben)
let r = await call("functions/api/admin/[[path]].js", "onRequest", req("/api/admin/integrations", { headers: ADMIN }), { path: ["integrations"] });
assert.equal(r.status, 200, JSON.stringify(r.data));
assert.equal(r.data.szamlazz.ok, true); assert.deepEqual(r.data.invoice, { provider: "szamlazz", label: "Számlázz.hu", ok: true });
assert.equal(sent.at(-1).field, "action-szamla_agent_pdf"); assert.match(sent.at(-1).xml, /<szamlaagentkulcs>agent-kulcs-123<\/szamlaagentkulcs>/);

// 3. átutalásos rendelés kuponnal → admin „Fizetve” → automatikus Számlázz.hu számla
r = await call("functions/api/orders.js", "onRequestPost", req("/api/orders", { method: "POST", body: { items: [{ id: 1, qty: 3 }, { id: 2, qty: 1 }], customer, shipping: "home", pay: "transfer", coupon: "nyar10" } }));
assert.equal(r.status, 200, JSON.stringify(r.data));
const o1 = r.data.id;
const total1 = r.data.total;
r = await call("functions/api/admin/[[path]].js", "onRequest", req(`/api/admin/orders/${o1}`, { method: "PATCH", body: { status: "paid", notify: false }, headers: ADMIN }), { path: ["orders", o1] });
assert.equal(r.status, 200, JSON.stringify(r.data));
assert.equal(r.data.order.invoice, "E-NSC-2026-1");
assert.equal(r.data.order.data.invoice.provider, "szamlazz"); assert.equal(r.data.order.data.invoice.sent, true); assert.equal(r.data.order.data.invoice.electronic, true);
let xml = sent.at(-1).xml;
assert.equal(sent.at(-1).field, "action-xmlagentxmlfile");
assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>\n<xmlszamla xmlns="http:\/\/www.szamlazz.hu\/xmlszamla"/);
assert.equal(tagOf(xml, "rendelesSzam"), o1); assert.equal(tagOf(xml, "fizetve"), "true"); assert.equal(tagOf(xml, "fizmod"), "Átutalás");
assert.equal(tagOf(xml, "szamlaszamElotag"), "NSC"); assert.equal(tagOf(xml, "eszamla"), "true"); assert.equal(tagOf(xml, "szamlaLetoltes"), "false");
assert.equal(tagOf(xml, "keltDatum"), tagOf(xml, "fizetesiHataridoDatum")); // fizetve → határidő ma
assert.equal(tagOf(xml, "nev"), "Kártya Kft."); assert.equal(tagOf(xml, "adoalany"), "1"); assert.equal(tagOf(xml, "adoszam"), "12345678-2-12");
assert.equal(tagOf(xml, "email"), "elek@example.com"); assert.equal(tagOf(xml, "sendEmail"), "true"); assert.equal(tagOf(xml, "emailReplyto"), "bolt@example.com");
let it = items(xml);
assert.equal(it[0].megnevezes, "ETB &lt;A&gt; &amp; B"); assert.equal(it[0].azonosito, "1");
assert.deepEqual([it[0].mennyiseg, it[0].nettoEgysegar, it[0].afakulcs, it[0].nettoErtek, it[0].afaErtek, it[0].bruttoErtek], ["3", "393.67", "27", "1181", "319", "1500"]);
assert.match(it[2].megnevezes, /^Kedvezmény \(NYAR10\)$/); assert.ok(Number(it[2].bruttoErtek) < 0);
assert.match(it[3].megnevezes, /^Szállítás – házhozszállítás$/);
for (const i of it) { // soronként: nettó + áfa = bruttó, és egész forint
  assert.equal(Number(i.nettoErtek) + Number(i.afaErtek), Number(i.bruttoErtek));
  assert.ok([i.nettoErtek, i.afaErtek, i.bruttoErtek].every(v => Number.isInteger(Number(v))));
  assert.ok(Math.abs(Number(i.nettoEgysegar) * Number(i.mennyiseg) - Number(i.nettoErtek)) < 0.05 * Number(i.mennyiseg));
}
assert.equal(it.reduce((a, i) => a + Number(i.bruttoErtek), 0), total1); // a számla végösszege = a rendelés végösszege
// már van számla → nem állít ki újat
r = await call("functions/api/admin/[[path]].js", "onRequest", req(`/api/admin/orders/${o1}/invoice`, { method: "POST", headers: ADMIN }), { path: ["orders", o1, "invoice"] });
assert.equal(r.status, 409);

// 4. PDF letöltés
r = await call("functions/api/admin/[[path]].js", "onRequest", req(`/api/admin/orders/${o1}/invoice.pdf`, { headers: ADMIN }), { path: ["orders", o1, "invoice.pdf"] });
assert.equal(r.status, 200); assert.equal(r.headers.get("content-type"), "application/pdf"); assert.match(String(r.data), /^%PDF/);
assert.match(r.headers.get("content-disposition"), /szamla-E-NSC-2026-1\.pdf/);
assert.equal(tagOf(sent.at(-1).xml, "szamlaszam"), "E-NSC-2026-1");

// 5. #free csomag: nincs e-számla (54) → papír alapú számla, kézi kiállítás, AAM, utánvét, magánszemély
catalog.settings.vatRate = "AAM";
catalog.settings.szamlazzPrefix = "rossz előtag!";
mode = "noeinvoice";
r = await call("functions/api/orders.js", "onRequestPost", req("/api/orders", { method: "POST", body: { items: [{ id: 2, qty: 2 }], customer: { ...customer, billing: { same: true } }, shipping: "home", pay: "cod" } }));
const o2 = r.data.id;
r = await call("functions/api/admin/[[path]].js", "onRequest", req(`/api/admin/orders/${o2}/invoice`, { method: "POST", headers: ADMIN }), { path: ["orders", o2, "invoice"] });
assert.equal(r.status, 200, JSON.stringify(r.data));
assert.equal(r.data.invoice.number, "NSC-2026-2"); assert.equal(r.data.invoice.paper, true); assert.equal(r.data.invoice.electronic, false);
xml = sent.at(-1).xml;
assert.equal(tagOf(xml, "eszamla"), "false"); assert.equal(tagOf(xml, "fizetve"), "false"); assert.equal(tagOf(xml, "fizmod"), "Utánvét");
assert.equal(tagOf(xml, "szamlaszamElotag"), undefined); // érvénytelen előtag kimarad
assert.equal(tagOf(xml, "nev"), "Teszt Elek"); assert.equal(tagOf(xml, "adoalany"), "-1"); assert.equal(tagOf(xml, "adoszam"), undefined);
assert.match(tagOf(xml, "megjegyzes"), /Alanyi adómentes/);
it = items(xml);
assert.ok(it.every(i => i.afakulcs === "AAM" && i.afaErtek === "0" && i.nettoErtek === i.bruttoErtek));
assert.equal(it.reduce((a, i) => a + Number(i.bruttoErtek), 0), 2490 * 2 + 2500 + 500);

// 6. hibás kulcs: érthető hibaüzenet a rendelésen, az integrációknál „hiba”
mode = "badkey";
r = await call("functions/api/orders.js", "onRequestPost", req("/api/orders", { method: "POST", body: { items: [{ id: 2, qty: 1 }], customer, shipping: "home", pay: "transfer" } }));
const o3 = r.data.id;
r = await call("functions/api/admin/[[path]].js", "onRequest", req(`/api/admin/orders/${o3}`, { method: "PATCH", body: { status: "paid", notify: false }, headers: ADMIN }), { path: ["orders", o3] });
assert.equal(r.status, 200); assert.equal(r.data.order.invoice, ""); assert.match(r.data.order.data.invoiceError, /Számla Agent kulcs érvénytelen/);
r = await call("functions/api/admin/[[path]].js", "onRequest", req("/api/admin/integrations", { headers: ADMIN }), { path: ["integrations"] });
assert.equal(r.data.szamlazz.ok, false); assert.equal(r.data.invoice.ok, false); assert.match(r.data.szamlazz.error, /SZAMLAZZ_AGENT_KEY/);
// újrapróbálás javított kulccsal: a hiba eltűnik
mode = "ok";
r = await call("functions/api/admin/[[path]].js", "onRequest", req(`/api/admin/orders/${o3}/invoice`, { method: "POST", headers: ADMIN }), { path: ["orders", o3, "invoice"] });
assert.equal(r.status, 200); assert.equal(r.data.order.data.invoiceError, undefined);

// 7/b. csomagbontás: a kihúzott 3 termék együtt 5% kedvezménnyel – a végösszegben és a számlán is
catalog.settings.vatRate = "27%";
r = await call("functions/api/orders.js", "onRequestPost", req("/api/orders", { method: "POST", body: { items: [{ id: 1, qty: 1 }, { id: 2, qty: 1 }, { id: 3, qty: 2 }], customer, shipping: "home", pay: "transfer", pack: [3, 1, 2] } }));
assert.equal(r.status, 200, JSON.stringify(r.data));
assert.equal(r.data.total, 500 + 2490 + 6990 * 2 - Math.round((500 + 2490 + 6990) * 0.05) + 2500); // a kedvezmény termékenként egy darabra jár
const o4 = r.data.id;
r = await call("functions/api/admin/[[path]].js", "onRequest", req(`/api/admin/orders/${o4}`, { method: "PATCH", body: { status: "paid", notify: false }, headers: ADMIN }), { path: ["orders", o4] });
assert.equal(r.data.order.data.packDiscount, 499); assert.deepEqual(r.data.order.data.pack, [3, 1, 2]);
it = items(sent.at(-1).xml);
assert.ok(it.some(i => i.megnevezes === "Csomagbontás kedvezmény (5%)" && i.bruttoErtek === "-499"));
assert.equal(it.reduce((a, i) => a + Number(i.bruttoErtek), 0), r.data.order.total);
// csak 2 egyezik, vagy ugyanaz a termék háromszor: nincs kedvezmény
r = await call("functions/api/orders.js", "onRequestPost", req("/api/orders", { method: "POST", body: { items: [{ id: 1, qty: 1 }, { id: 2, qty: 1 }], customer, shipping: "home", pay: "transfer", pack: [1, 2, 3] } }));
assert.equal(r.data.total, 500 + 2490 + 2500);
r = await call("functions/api/orders.js", "onRequestPost", req("/api/orders", { method: "POST", body: { items: [{ id: 1, qty: 3 }], customer, shipping: "home", pay: "transfer", pack: [1, 1, 1] } }));
assert.equal(r.data.total, 1500 + 2500);

// 7. választó: Billingo kiválasztva, de nincs kulcs → érthető hiba; kulcs nélkül automatikus = nincs számlázó
const inv = await imp("lib/invoicing.js");
assert.equal(inv.invoiceProvider({ SZAMLAZZ_AGENT_KEY: "x", BILLINGO_API_KEY: "y" }, {}), "szamlazz");
assert.equal(inv.invoiceProvider({ BILLINGO_API_KEY: "y" }, {}), "billingo");
assert.equal(inv.invoiceProvider({ SZAMLAZZ_AGENT_KEY: "x", BILLINGO_API_KEY: "y" }, { invoiceProvider: "billingo" }), "billingo");
assert.equal(inv.invoicingReady({}, {}), false);
await assert.rejects(inv.issueInvoice({ SZAMLAZZ_AGENT_KEY: "x" }, { data: {} }, { invoiceProvider: "billingo" }), /Billingo nincs bekötve/);

console.log(`OK – Számlázz.hu: ${sent.length} Számla Agent hívás álcázva`);
