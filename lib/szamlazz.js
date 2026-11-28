/* Számlázz.hu (Számla Agent) számlázás. Szükséges: SZAMLAZZ_AGENT_KEY (Cloudflare Secret).
 * Kulcs: Számlázz.hu → Vezérlőpult → Fiók hozzáférések → Számla Agent kulcsok (https://www.szamlazz.hu/szamla/?page=dashboard).
 * Egy XML fájlt küld multipart/form-data kérésben a https://www.szamlazz.hu/szamla/ címre; a számlaszám a válasz fejlécében jön.
 * Dokumentáció: https://docs.szamlazz.hu/hu/agent/ */
import { billingOf } from "./orders.js";

export const szamlazzReady = env => !!String(env?.SZAMLAZZ_AGENT_KEY || "").trim();
const AGENT_URL = "https://www.szamlazz.hu/szamla/";
const key = env => String(env.SZAMLAZZ_AGENT_KEY || "").trim();

/* ---------- XML segédek ---------- */
const esc = v => String(v ?? "")
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
const tag = (name, v) => `<${name}>${esc(v)}</${name}>`;
const opt = (name, v) => (v === "" || v === undefined || v === null ? "" : tag(name, v));
const pick = (xml, name) => {
  const m = String(xml || "").match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, "i"));
  return m ? m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim() : "";
};
const dec = v => { try { return decodeURIComponent(String(v || "").replace(/\+/g, " ")); } catch { return String(v || ""); } };
const num = n => String(Math.round(n * 100) / 100);

/* magyar idő szerinti nap (YYYY-MM-DD) */
export function huDay(offset = 0, now = Date.now()) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Budapest", year: "numeric", month: "2-digit", day: "2-digit" })
    .format(new Date(now + offset * 864e5));
}

const taxNo = t => {
  const d = String(t || "").replace(/\D/g, "");
  return d.length === 11 ? `${d.slice(0, 8)}-${d[8]}-${d.slice(9)}` : "";
};
const validEmail = e => /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(String(e || ""));
const prefixOf = s => (/^[A-Za-z0-9]{1,10}$/.test(String(s?.szamlazzPrefix || "").trim()) ? String(s.szamlazzPrefix).trim() : "");

/* Bruttó árból számolt tétel (a Számlázz.hu kerekítési szabálya szerint):
 * bruttó érték = egységár × db; áfa = bruttó / (100 + kulcs) × kulcs, egészre kerekítve; nettó = bruttó − áfa; nettó egységár = nettó / db. */
export function itemOf(name, grossUnit, qty = 1, vat = "27", id = "") {
  const q = Math.max(1, Math.round(Number(qty) || 1));
  const gross = Math.round((Number(grossUnit) || 0) * q);
  const rate = vat === "AAM" ? 0 : Number(vat) || 0;
  const afa = rate ? Math.round(gross / (100 + rate) * rate) : 0;
  const net = gross - afa;
  return { name: String(name || "Tétel").slice(0, 250), id: String(id || ""), qty: q, unit: Math.round(net / q * 100) / 100, vat: rate ? String(rate) : vat, net, afa, gross };
}

const PAY = { card: "Bankkártya", transfer: "Átutalás", cod: "Utánvét" };

export function invoiceItems(o, s = {}) {
  const d = o.data || {};
  const vat = s.vatRate === "AAM" ? "AAM" : "27";
  const items = (d.lines || []).map(l => itemOf(l.name, l.price, l.qty, vat, l.id));
  if (d.discount) items.push(itemOf(`Kedvezmény${d.coupon ? ` (${d.coupon})` : ""}`, -Math.abs(d.discount), 1, vat));
  if (d.packDiscount) items.push(itemOf("Csomagbontás kedvezmény (5%)", -Math.abs(d.packDiscount), 1, vat));
  if (d.shipping) items.push(itemOf(`Szállítás – ${String(d.methodLabel || "").toLowerCase()}`, d.shipping, 1, vat));
  if (d.cod) items.push(itemOf("Utánvételi díj", d.cod, 1, vat));
  if (d.giftFee) items.push(itemOf("Ajándékcsomagolás", d.giftFee, 1, vat));
  return items;
}

export function invoiceXml(env, o, s = {}, { electronic = true, send = true, now = Date.now() } = {}) {
  const d = o.data || {};
  const c = d.customer || {};
  const b = billingOf(c);
  const tax = taxNo(b.taxNumber);
  const paid = !!o.paid;
  const aam = s.vatRate === "AAM";
  const items = invoiceItems(o, s);
  const shopMail = validEmail(s.email) ? s.email : "";
  const note = [`Webshop rendelés: ${o.id}`, aam ? "Alanyi adómentes." : ""].filter(Boolean).join(" ");
  return `<?xml version="1.0" encoding="UTF-8"?>
<xmlszamla xmlns="http://www.szamlazz.hu/xmlszamla" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.szamlazz.hu/xmlszamla https://www.szamlazz.hu/szamla/docs/xsds/agent/xmlszamla.xsd">
  <beallitasok>${tag("szamlaagentkulcs", key(env))}${tag("eszamla", !!electronic)}${tag("szamlaLetoltes", false)}${tag("valaszVerzio", 1)}</beallitasok>
  <fejlec>${tag("keltDatum", huDay(0, now))}${tag("teljesitesDatum", huDay(0, now))}${tag("fizetesiHataridoDatum", huDay(paid || d.pay === "cod" ? 0 : 8, now))}${tag("fizmod", PAY[d.pay] || "Átutalás")}${tag("penznem", "HUF")}${tag("szamlaNyelve", "hu")}${tag("megjegyzes", note)}${tag("rendelesSzam", o.id)}${opt("szamlaszamElotag", prefixOf(s))}${tag("fizetve", paid)}</fejlec>
  <elado>${opt("emailReplyto", shopMail)}${tag("emailTargy", `Számla – ${s.shopName || "NS Card"} rendelés ${o.id}`)}</elado>
  <vevo>${tag("nev", b.name || c.name)}${tag("irsz", b.zip)}${tag("telepules", b.city)}${tag("cim", b.address)}${opt("email", validEmail(c.email) ? c.email : "")}${tag("sendEmail", !!(send && validEmail(c.email)))}${tag("adoalany", tax ? 1 : -1)}${opt("adoszam", tax)}${opt("telefonszam", c.phone)}</vevo>
  <tetelek>${items.map(i => `
    <tetel>${tag("megnevezes", i.name)}${opt("azonosito", i.id)}${tag("mennyiseg", i.qty)}${tag("mennyisegiEgyseg", "db")}${tag("nettoEgysegar", num(i.unit))}${tag("afakulcs", i.vat)}${tag("nettoErtek", i.net)}${tag("afaErtek", i.afa)}${tag("bruttoErtek", i.gross)}</tetel>`).join("")}
  </tetelek>
</xmlszamla>`;
}

/* ---------- hibák ---------- */
const HINTS = {
  3: "A Számla Agent kulcs érvénytelen vagy törölve lett. Készíts újat a Számlázz.hu Vezérlőpultján, és cseréld le a SZAMLAZZ_AGENT_KEY értékét a Cloudflare-ben.",
  54: "Az e-számla nincs engedélyezve a Számlázz.hu fiókban (a #free csomagban nem elérhető).",
  57: "A Számlázz.hu nem tudta beolvasni a számla adatait.",
  71: "Ehhez a rendelésszámhoz már van számla a Számlázz.hu-ban.",
  136: "A Számlázz.hu fiók most nem engedi a Számla Agent használatát (pl. lejárt előfizetés vagy rendezetlen díj). Lépj be a Számlázz.hu-ba böngészőből, és nézd meg a Szolgáltatáscsomagom menüt.",
  152: "Ehhez a rendelésszámhoz már van számla a Számlázz.hu-ban.",
  164: "A Számla Agent kulccsal lépj be, ne felhasználónévvel (a felhasználó több fiókhoz is hozzáfér).",
  491: "A Számlázz.hu fiók KATA-védelme nem enged adószámos (céges) vevőnek számlát kiállítani."
};
function agentError(code, msg) {
  const hint = HINTS[code] || "";
  const raw = String(msg || "").replace(/\s+/g, " ").trim().slice(0, 300);
  const text = hint ? `${hint}${raw && !hint.includes(raw) ? ` (Számlázz.hu ${code}: ${raw})` : ""}` : raw ? `Számlázz.hu hiba${code ? ` (${code})` : ""}: ${raw}` : `Számlázz.hu hiba${code ? ` (${code})` : ""}.`;
  const e = new Error(text); e.code = code || 0; e.agentMessage = raw; return e;
}

/* Egy Számla Agent hívás. A siker vagy hiba a szlahu_* fejlécekben, illetve a válasz törzsében érkezik. */
async function agent(field, xml) {
  const fd = new FormData();
  fd.append(field, new Blob([xml], { type: "text/xml" }), "request.xml");
  let res;
  try {
    res = await fetch(AGENT_URL, { method: "POST", body: fd, ...(typeof AbortSignal !== "undefined" && AbortSignal.timeout ? { signal: AbortSignal.timeout(25000) } : {}) });
  } catch {
    throw agentError(0, "A Számlázz.hu nem válaszolt. Próbáld újra pár perc múlva.");
  }
  const h = n => res.headers.get(n) || "";
  const bytes = new Uint8Array(await res.arrayBuffer().catch(() => new ArrayBuffer(0)));
  const isPdf = bytes.length > 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46; // %PDF
  const text = isPdf ? "" : new TextDecoder().decode(bytes);
  let code = Number(h("szlahu_error_code")) || 0;
  let msg = dec(h("szlahu_error"));
  if (!code && !msg) {
    if (/^\s*\[ERR\]/.test(text)) msg = text.replace(/^\s*\[ERR\]\s*/, "");
    else if (/<sikeres>\s*false\s*<\/sikeres>/i.test(text)) { code = Number(pick(text, "hibakod")) || 0; msg = pick(text, "hibauzenet"); }
  }
  if (code || msg) throw agentError(code, msg);
  if (!res.ok && !h("szlahu_szamlaszam")) throw agentError(0, `HTTP ${res.status}`);
  return { res, text, bytes, isPdf, header: n => dec(h(n)) };
}

/* ---------- számla kiállítása ---------- */
async function issue(env, o, s, opts) {
  const r = await agent("action-xmlagentxmlfile", invoiceXml(env, o, s, opts));
  const number = r.header("szlahu_szamlaszam") || (r.text.match(/xmlagentresponse=DONE;([^\s;]+)/) || [])[1] || pick(r.text, "szamlaszam");
  if (!number) throw agentError(0, "A válaszban nincs számlaszám.");
  const url = r.header("szlahu_vevoifiokurl") || pick(r.text, "vevoifiokurl");
  return { id: r.header("szlahu_id") || number, number, sent: !!opts.send, electronic: !!opts.electronic, ...(/^https:\/\//.test(url) ? { url } : {}) };
}

export async function createInvoice(env, o, s = {}) {
  if (!szamlazzReady(env)) throw new Error("A Számlázz.hu nincs bekötve (hiányzó SZAMLAZZ_AGENT_KEY).");
  const c = o.data?.customer || {};
  const b = billingOf(c);
  if (!b.zip || !b.city || !b.address) throw new Error("A rendelésnél nincs számlázási cím.");
  if (!(o.data?.lines || []).length) throw new Error("A rendelésben nincs tétel.");
  const opts = { electronic: s.invoiceElectronic !== false, send: s.invoiceSend !== false && validEmail(c.email) };
  try {
    return await issue(env, o, s, opts);
  } catch (e) {
    // a #free csomagban nincs e-számla: ilyenkor papír alapú számla készül (PDF-ben ugyanúgy kimegy a vásárlónak)
    if (e.code === 54 && opts.electronic) return { ...(await issue(env, o, s, { ...opts, electronic: false })), paper: true };
    throw e;
  }
}

/* ---------- PDF letöltés és kapcsolat ellenőrzés ---------- */
const pdfXml = (env, number) => `<?xml version="1.0" encoding="UTF-8"?>
<xmlszamlapdf xmlns="http://www.szamlazz.hu/xmlszamlapdf" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.szamlazz.hu/xmlszamlapdf https://www.szamlazz.hu/szamla/docs/xsds/agentpdf/xmlszamlapdf.xsd">
  ${tag("szamlaagentkulcs", key(env))}${tag("szamlaszam", number)}${tag("valaszVerzio", 1)}
</xmlszamlapdf>`;

export async function invoicePdf(env, number) {
  if (!szamlazzReady(env)) throw new Error("A Számlázz.hu nincs bekötve (hiányzó SZAMLAZZ_AGENT_KEY).");
  const r = await agent("action-szamla_agent_pdf", pdfXml(env, number));
  if (r.isPdf) return r.bytes;
  const b64 = pick(r.text, "pdf");
  if (b64) return Uint8Array.from(atob(b64.replace(/\s+/g, "")), ch => ch.charCodeAt(0));
  throw agentError(0, "A válaszban nincs PDF.");
}

/* A kulcs működik-e: egy nem létező számla PDF-jét kéri. „Ismeretlen számlaszám” (7) = a belépés rendben van. */
export async function szamlazzCheck(env) {
  if (!szamlazzReady(env)) return { configured: false };
  try {
    await agent("action-szamla_agent_pdf", pdfXml(env, "NSC-KAPCSOLAT-TESZT"));
    return { configured: true, ok: true };
  } catch (e) {
    if (e.code === 7 || /ismeretlen számlaszám|hiányzó adat/i.test(e.agentMessage || "")) return { configured: true, ok: true };
    return { configured: true, ok: false, error: e.message, code: e.code || 0 };
  }
}
