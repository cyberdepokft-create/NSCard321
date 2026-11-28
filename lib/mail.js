/* NS Card – e-mailek.
 * Küldés: Gmail SMTP-n (SMTP_USER + SMTP_PASS alkalmazásjelszó, a feladó maga a Gmail cím), vagy a Resend
 * szolgáltatáson (RESEND_API_KEY, MAIL_FROM). Ha egyik sincs beállítva, a küldés csendben kimarad – a rendelés ettől még létrejön.
 * Minden levél HTML + sima szöveges változatban megy ki. */
import { esc, fmtFt, mdToHtml, absUrl } from "./core.js";
import { CARRIERS, trackingUrl, trackLink, billingOf } from "./orders.js";
import { smtpSend } from "./smtp.js";

export const smtpReady = env => !!(String(env?.SMTP_USER || "").trim() && String(env?.SMTP_PASS || "").trim());
export const mailReady = env => smtpReady(env) || !!env?.RESEND_API_KEY;
export const mailTransport = env => (smtpReady(env) ? (/gmail\.com$/i.test(env.SMTP_HOST || "smtp.gmail.com") ? "gmail" : "smtp") : env?.RESEND_API_KEY ? "resend" : "");

/* A feladó: Gmailnél mindig maga a Gmail cím (a Gmail mást nem enged), a név a bolt neve. */
export function fromOf(env, s) {
  const name = String(s?.shopName || "NS Card").replace(/[<>"\r\n]/g, "");
  if (smtpReady(env)) return `${name} <${String(env.SMTP_USER).trim()}>`;
  return env.MAIL_FROM || `${name} <rendeles@nscard.hu>`;
}
/* A bolt saját címe: a válaszok és az új rendelés értesítők ide mennek. */
export const shopEmail = (env, s) => String(env?.ADMIN_EMAIL || s?.email || (smtpReady(env) ? env.SMTP_USER : "") || "").trim();

/* HTML → olvasható sima szöveg (a levelek szöveges változatához) */
export function htmlToText(html) {
  return String(html || "")
    .replace(/<(style|head|title)[\s\S]*?<\/\1>/gi, "")
    .replace(/<!--notext-->[\s\S]*?<!--\/notext-->/g, "")
    .replace(/<span[^>]*display:none[\s\S]*?<\/span>/gi, "")
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (m, href, txt) => {
      const t = txt.replace(/<[^>]+>/g, "").trim();
      return /^mailto:/i.test(href) || !t || t === href ? t || href : `${t} (${href})`;
    })
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n• ")
    .replace(/<\/(p|div|h[1-6]|tr|table|ul|ol)>/gi, "\n")
    .replace(/<td[^>]*>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ").replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

async function resendSend(env, s, messages) {
  const results = [];
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100).map(m => ({ from: fromOf(env, s), to: [m.to], subject: m.subject, html: m.html, text: m.text, reply_to: m.replyTo || shopEmail(env, s) || undefined, headers: m.headers }));
    try {
      const single = chunk.length === 1;
      const res = await fetch(single ? "https://api.resend.com/emails" : "https://api.resend.com/emails/batch", {
        method: "POST",
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(single ? chunk[0] : chunk)
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) chunk.forEach((_, k) => results.push({ ok: true, id: single ? d.id : d?.data?.[k]?.id }));
      else { const error = d?.message || `Resend hiba (${res.status})`; chunk.forEach(() => results.push({ ok: false, error })); }
    } catch { chunk.forEach(() => results.push({ ok: false, error: "Az e-mail szolgáltató nem érhető el." })); }
  }
  return results;
}

/* Több levél egy menetben (Gmailnél egy SMTP kapcsolaton). Visszaad: { ok, sent, results, error } */
export async function sendMany(env, s, messages) {
  if (!mailReady(env)) return { ok: false, skipped: true, sent: 0, results: messages.map(() => ({ ok: false, skipped: true })) };
  const prepared = messages.map(m => ({ ...m, text: m.text || htmlToText(m.html), replyTo: m.replyTo || shopEmail(env, s) || undefined }));
  let results;
  if (smtpReady(env)) {
    try { results = (await smtpSend(env, fromOf(env, s), prepared)).results; }
    catch (e) { results = prepared.map(() => ({ ok: false, error: e.message || "Az SMTP küldés nem sikerült." })); }
  } else results = await resendSend(env, s, prepared);
  const sent = results.filter(r => r.ok).length;
  return { ok: sent === messages.length, sent, results, error: results.find(r => !r.ok)?.error || "" };
}

export async function sendMail(env, s, msg) {
  if (!mailReady(env)) return { ok: false, skipped: true };
  const r = await sendMany(env, s, [msg]);
  return r.results[0]?.ok ? { ok: true, id: r.results[0].id } : { ok: false, error: r.results[0]?.error || r.error };
}

/* Hírlevél és tömeges értesítő: Gmailnél egy kérésben legfeljebb 80 levél (a napi Gmail korlát kb. 500 címzett). */
export const BATCH_LIMIT = 80;
export async function sendBatch(env, s, messages) {
  if (!mailReady(env)) return { ok: false, skipped: true, sent: 0 };
  const list = smtpReady(env) ? messages.slice(0, BATCH_LIMIT) : messages;
  const r = await sendMany(env, s, list);
  return { ok: r.ok && list.length === messages.length, sent: r.sent, error: r.error || (list.length < messages.length ? `Egyszerre legfeljebb ${BATCH_LIMIT} levél megy ki; a többit küldd el újra később.` : ""), left: messages.length - list.length };
}

/* ---------- elemek ---------- */
const C = { ink: "#0b1530", ink2: "#16224a", gold: "#ffcb3d", text: "#1d2433", muted: "#5b6477", line: "#e6e9f0", bg: "#eef1f7", soft: "#f6f8fc", ok: "#1f9d55", warn: "#b7791f" };
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,Helvetica,sans-serif";
const h1 = t => `<h1 style="font-size:24px;line-height:1.25;margin:0 0 10px;color:${C.ink}">${t}</h1>`;
const h2 = t => `<h2 style="font-size:16px;margin:26px 0 10px;color:${C.ink}">${t}</h2>`;
const p = (t, style = "") => `<p style="margin:0 0 12px;${style}">${t}</p>`;
const muted = t => p(t, `color:${C.muted};font-size:13px`);
const firstName = n => esc(String(n || "").trim().split(/\s+/).slice(-1)[0] || "");
export const btn = (href, label, ghost = false) => `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0"><tr><td style="border-radius:999px;background:${ghost ? "#ffffff" : C.gold};${ghost ? `border:1px solid ${C.line};` : ""}"><a href="${esc(href)}" style="display:inline-block;padding:13px 24px;font-weight:bold;font-size:15px;color:${C.ink};text-decoration:none;border-radius:999px">${esc(label)}</a></td></tr></table>`;
const box = (html, tone = "soft") => {
  const border = tone === "ok" ? C.ok : tone === "warn" ? C.gold : C.line;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0"><tr><td style="background:${C.soft};border:1px solid ${C.line};border-left:4px solid ${border};border-radius:12px;padding:14px 16px;font-size:14px;line-height:1.6">${html}</td></tr></table>`;
};
const kv = rows => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;margin:8px 0 4px">${rows.filter(Boolean).map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:${C.muted};white-space:nowrap;vertical-align:top;width:1%">${k}</td><td style="padding:4px 0;vertical-align:top">${v}</td></tr>`).join("")}</table>`;
const fmtDate = (iso, withTime = false) => {
  const d = new Date(iso);
  if (isNaN(d)) return "";
  try { return d.toLocaleString("hu-HU", { year: "numeric", month: "long", day: "numeric", ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}), timeZone: "Europe/Budapest" }); }
  catch { return String(iso).slice(0, withTime ? 16 : 10).replace("T", " "); }
};

/* rendelés útja: Megrendelve → Fizetve → Feladva → Megérkezett */
function steps(current) {
  const names = ["Megrendelve", "Fizetve", "Feladva", "Megérkezett"];
  const cells = names.map((n, i) => {
    const done = i <= current;
    return `<td align="center" style="width:25%;padding:0 2px;font-size:12px;color:${done ? C.ink : C.muted}">
<div style="height:6px;border-radius:3px;background:${done ? C.gold : C.line};margin-bottom:8px"></div>${done ? "<strong>" : ""}${n}${done ? "</strong>" : ""}</td>`;
  }).join("");
  return `<!--notext--><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 8px"><tr>${cells}</tr></table><!--/notext-->`;
}

export function layout(s, base, { title, preheader = "", body, footerNote = "" }) {
  const shop = esc(s?.shopName || "NS Card");
  const logo = absUrl(s?.logo, base);
  const links = [
    `<a href="${esc(base)}/" style="color:${C.muted}">Webshop</a>`,
    `<a href="${esc(base)}/rendeles" style="color:${C.muted}">Rendelés követése</a>`,
    `<a href="${esc(base)}/blog" style="color:${C.muted}">Cikkek</a>`,
    s?.pages?.aszf ? `<a href="${esc(base)}/info?p=aszf" style="color:${C.muted}">ÁSZF</a>` : ""
  ].filter(Boolean).join(" &nbsp;·&nbsp; ");
  const company = [s?.companyName, s?.companyAddress, s?.taxNumber ? `Adószám: ${s.taxNumber}` : ""].filter(Boolean).map(esc).join(" · ");
  return `<!doctype html><html lang="hu"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:${C.bg};font-family:${FONT};color:${C.text};-webkit-text-size-adjust:100%">
<span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;max-height:0;max-width:0;overflow:hidden;mso-hide:all">${esc(preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px">
<tr><td style="background:${C.ink};border-radius:18px 18px 0 0;padding:22px 28px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td><a href="${esc(base)}/" style="color:#ffffff;text-decoration:none;font-size:22px;font-weight:bold;letter-spacing:.4px">${logo ? `<img src="${esc(logo)}" alt="${shop}" height="34" style="height:34px;width:auto;border:0;vertical-align:middle">` : `${shop}<span style="color:${C.gold}">.</span>`}</a></td>
<td align="right" style="color:#aab4d4;font-size:12px">Pokémon TCG webshop</td>
</tr></table></td></tr>
<tr><td style="background:#ffffff;padding:30px 28px 14px;font-size:15px;line-height:1.6">${body}</td></tr>
<tr><td style="background:#ffffff;border-radius:0 0 18px 18px;padding:0 28px 26px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${C.line}"><tr><td style="padding-top:16px;font-size:13px;line-height:1.6;color:${C.muted}">
${s?.email || s?.phone ? `Kérdésed van? ${s?.email ? `Írj nekünk: <a href="mailto:${esc(s.email)}" style="color:${C.ink}">${esc(s.email)}</a>` : ""}${s?.phone ? `${s?.email ? " · " : ""}Telefon: <a href="tel:${esc(String(s.phone).replace(/\s+/g, ""))}" style="color:${C.ink}">${esc(s.phone)}</a>` : ""}<br>` : ""}
<span style="font-size:12px">${links}</span></td></tr></table>
</td></tr>
<tr><td style="padding:16px 28px 0;font-size:11px;line-height:1.6;color:#8a93a8;text-align:center">${company ? `${company}<br>` : ""}${footerNote ? esc(footerNote) : ""}</td></tr>
</table></td></tr></table></body></html>`;
}

export function itemsTable(d, base = "") {
  const total = (a, b, strong = false) => `<tr><td colspan="2" style="padding:5px 0;color:${strong ? C.ink : C.muted};font-size:${strong ? 16 : 14}px">${strong ? `<strong>${a}</strong>` : a}</td><td align="right" style="padding:5px 0;white-space:nowrap;font-size:${strong ? 16 : 14}px">${strong ? `<strong>${b}</strong>` : b}</td></tr>`;
  const items = (d.lines || []).map(l => {
    const img = base ? absUrl(l.image, base) : "";
    return `<tr>
<td style="padding:12px 12px 12px 0;border-bottom:1px solid ${C.line};width:56px;vertical-align:top">${img ? `<img src="${esc(img)}" alt="" width="56" height="56" style="width:56px;height:56px;object-fit:contain;border-radius:10px;background:${C.soft};border:1px solid ${C.line};display:block">` : `<div style="width:56px;height:56px;border-radius:10px;background:${C.soft};border:1px solid ${C.line}"></div>`}</td>
<td style="padding:12px 0;border-bottom:1px solid ${C.line};vertical-align:top;font-size:14px"><strong>${esc(l.name)}</strong>${l.preorder ? `<br><span style="color:${C.warn};font-size:12px">Előrendelés${l.releaseDate ? ` – megjelenés: ${esc(fmtDate(l.releaseDate))}` : ""}</span>` : ""}<br><span style="color:${C.muted};font-size:13px">${l.qty} db × ${fmtFt(l.price)}</span></td>
<td align="right" style="padding:12px 0;border-bottom:1px solid ${C.line};white-space:nowrap;vertical-align:top;font-size:14px">${fmtFt(l.qty * l.price)}</td></tr>`;
  }).join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 6px">${items}
<tr><td colspan="3" style="height:8px"></td></tr>
${total("Részösszeg", fmtFt(d.subtotal))}
${d.discount ? total(`Kedvezmény (${esc(d.coupon)})`, `−${fmtFt(d.discount)}`) : ""}
${total(`Szállítás – ${esc(String(d.methodLabel || "").toLowerCase())}`, d.shipping ? fmtFt(d.shipping) : "ingyenes")}
${d.cod ? total("Utánvételi díj", fmtFt(d.cod)) : ""}
${d.giftFee ? total("Ajándékcsomagolás", fmtFt(d.giftFee)) : d.gift ? total("Ajándékcsomagolás", "ingyenes") : ""}
${total("Végösszeg", fmtFt(d.total), true)}</table>`;
}

export function deliveryText(d) {
  const c = d.customer || {};
  if (d.method === "pickup") return "Személyes átvétel – az időpontot e-mailben egyeztetjük.";
  if (d.method === "locker") return `Csomagautomata: ${esc(c.locker)}`;
  return `${esc(c.zip)} ${esc(c.city)}, ${esc(c.address)}`;
}
function addresses(d) {
  const c = d.customer || {};
  const b = billingOf(c);
  const bill = [b.company ? esc(b.company) : esc(b.name), b.taxNumber ? `Adószám: ${esc(b.taxNumber)}` : "", [b.zip, b.city].filter(Boolean).map(esc).join(" ") + (b.address ? `, ${esc(b.address)}` : "")].filter(Boolean).join("<br>");
  return kv([
    ["Átvétel", `${esc(c.name)}<br>${deliveryText(d)}${c.phone ? `<br>${esc(c.phone)}` : ""}`],
    bill ? ["Számlázás", bill] : null
  ]);
}
const progressOf = o => {
  if (o.status === "done") return 3;
  if (o.status === "shipped") return 2;
  return o.paid || o.status === "paid" || o.status === "packed" ? 1 : 0;
};

/* ---------- rendelés ---------- */
export function orderConfirmation(s, base, o) {
  const d = o.data;
  const c = d.customer || {};
  const payBox = d.pay === "transfer"
    ? box(`<strong style="color:${C.ink}">Utalási adatok</strong><br>${s.bankDetails ? esc(s.bankDetails).replace(/\n/g, "<br>") : "Az utalási adatokat külön levélben küldjük."}
<br>Összeg: <strong>${fmtFt(d.total)}</strong><br>Közlemény: <strong>${esc(o.id)}</strong>
<br><span style="color:${C.muted};font-size:13px">A rendelésszámot mindenképp írd a közleménybe. A csomagot az összeg beérkezése után adjuk fel, erről e-mailt küldünk.</span>`, "warn")
    : d.pay === "cod" ? box(`<strong style="color:${C.ink}">Fizetés átvételkor</strong><br>A csomag átvételekor fizetendő: <strong>${fmtFt(d.total)}</strong>.`)
    : box(`<strong style="color:${C.ok}">A kártyás fizetés sikeres volt.</strong> Köszönjük!`, "ok");
  const next = d.pay === "transfer"
    ? ["Elutalod a végösszeget a fenti adatokkal.", "Amint megérkezik, összekészítjük a csomagot.", "Feladáskor e-mailben küldjük a csomagkövetési számot."]
    : ["Összekészítjük a csomagodat.", "Feladáskor e-mailben küldjük a csomagkövetési számot.", d.method === "locker" ? "A csomagautomata e-mailben vagy SMS-ben küldi az átvételi kódot." : d.method === "pickup" ? "Az átvétel időpontját e-mailben egyeztetjük." : "A futár a megadott címre viszi a csomagot."];
  const body = `${h1(`Köszönjük a rendelést, ${firstName(c.name)}!`)}
${p("Megkaptuk a rendelésedet, és már dolgozunk rajta. Az összefoglalót alább találod.")}
${kv([["Rendelésszám", `<strong>${esc(o.id)}</strong>`], ["Dátum", esc(fmtDate(o.createdAt, true))], ["Fizetés", esc(d.payLabel)], ["Szállítás", esc(d.methodLabel)]])}
${steps(progressOf(o))}
${payBox}
${h2("A rendelésed")}
${itemsTable(d, base)}
${h2("Szállítás és számlázás")}
${addresses(d)}
${d.preorder ? box("<strong>Előrendelés</strong><br>Az előrendelt termékeket a megjelenés után küldjük. Ha a rendelésben készleten lévő termék is van, azokat együtt adjuk fel, hacsak másként nem kéred.", "warn") : ""}
${d.gift ? box(`<strong>Ajándékcsomagolás</strong>${d.giftMessage ? `<br>Üzenet a kártyán: „${esc(d.giftMessage)}”` : ""}<br><span style="color:${C.muted};font-size:13px">A csomagba tett lapon nem szerepel ár.</span>`) : ""}
${c.note ? p(`<strong>Megjegyzésed:</strong> ${esc(c.note)}`) : ""}
${h2("Mi történik ezután?")}
<ol style="margin:0 0 6px;padding-left:20px">${next.map(x => `<li style="margin:0 0 6px">${x}</li>`).join("")}</ol>
${btn(trackLink(base, o), "Rendelés követése")}
${muted("Ha valamit módosítanál, válaszolj erre a levélre a rendelésszámmal.")}`;
  return {
    subject: `Rendelés visszaigazolás – ${o.id}`,
    html: layout(s, base, { title: `Rendelés ${o.id}`, preheader: `${fmtFt(d.total)} · ${d.payLabel} · ${d.methodLabel}`, body, footerNote: `Ezt a levelet a(z) ${o.id} számú rendelésed miatt kaptad.` })
  };
}

export function adminNotification(s, base, o) {
  const d = o.data;
  const c = d.customer || {};
  const body = `${h1(`Új rendelés: ${esc(o.id)}`)}
${p(`<strong style="font-size:18px">${fmtFt(d.total)}</strong> &nbsp; ${esc(d.payLabel)} · ${esc(d.methodLabel)}${d.preorder ? ` · <span style="color:${C.warn}">előrendelés</span>` : ""}`)}
${d.pay === "transfer" ? box("Átutalásos rendelés: a feladás előtt várd meg az összeget, és az adminban jelöld fizetettnek.", "warn") : ""}
${d.gift ? box(`<strong>🎁 Ajándékcsomagolás kérve</strong>${d.giftMessage ? `<br>Üzenet: „${esc(d.giftMessage)}”` : ""}<br><span style="color:${C.muted};font-size:13px">A nyomtatott lapon ilyenkor nincs ár.</span>`, "warn") : ""}
${h2("Vásárló")}
${kv([["Név", esc(c.name)], ["E-mail", `<a href="mailto:${esc(c.email)}" style="color:${C.ink}">${esc(c.email)}</a>`], ["Telefon", c.phone ? `<a href="tel:${esc(String(c.phone).replace(/\s+/g, ""))}" style="color:${C.ink}">${esc(c.phone)}</a>` : "–"]])}
${addresses(d)}
${c.note ? box(`<strong>Megjegyzés:</strong> ${esc(c.note)}`) : ""}
${h2("Tételek")}
${itemsTable(d, base)}
${btn(`${base}/admin#rendelesek`, "Megnyitás az adminban")}`;
  return { subject: `Új rendelés ${o.id} – ${fmtFt(d.total)}${d.gift ? " – ajándék" : ""}`, html: layout(s, base, { title: "Új rendelés", preheader: `${c.name} · ${fmtFt(d.total)} · ${d.payLabel}`, body }) };
}

export function shippedEmail(s, base, o) {
  const d = o.data;
  const url = trackingUrl(o.carrier, o.tracking);
  const carrier = o.carrier && o.carrier !== "other" ? CARRIERS[o.carrier]?.label || "" : "";
  const howto = d.method === "locker"
    ? "Amikor a csomag megérkezik az automatába, a szolgáltató e-mailben vagy SMS-ben küldi az átvételi kódot."
    : d.method === "pickup" ? "Az átvétel időpontját e-mailben egyeztetjük."
    : `A futár általában 1–3 munkanapon belül érkezik.${d.pay === "cod" && !o.paid ? ` Átvételkor fizetendő: <strong>${fmtFt(d.total)}</strong>.` : ""}`;
  const body = `${h1("Úton van a csomagod!")}
${p(`A(z) <strong>${esc(o.id)}</strong> számú rendelésedet feladtuk${carrier ? ` (${esc(carrier)})` : ""}.`)}
${steps(2)}
${o.tracking ? box(`Csomagkövetési szám: <strong>${esc(o.tracking)}</strong>${carrier ? `<br>Szállító: ${esc(carrier)}` : ""}`) : ""}
${url ? btn(url, "Csomag követése") : ""}
${p(`<strong>Szállítás:</strong> ${deliveryText(d)}`)}
${p(howto)}
${h2("A csomagban")}
<ul style="margin:0 0 6px;padding-left:20px">${(d.lines || []).map(l => `<li>${esc(l.name)} × ${l.qty}</li>`).join("")}</ul>
${btn(trackLink(base, o), "Rendelés állapota a webshopban", true)}
${muted("Jó bontást kívánunk! Ha bármi gond van a csomaggal, válaszolj erre a levélre.")}`;
  return { subject: `Feladtuk a rendelésed – ${o.id}`, html: layout(s, base, { title: "Feladtuk a csomagod", preheader: o.tracking ? `Csomagkövetési szám: ${o.tracking}` : "A csomagod úton van hozzád.", body, footerNote: `Ezt a levelet a(z) ${o.id} számú rendelésed miatt kaptad.` }) };
}

/* állapotváltás: fizetve, csomagolva, teljesítve, lemondva */
export function statusEmail(s, base, o, label) {
  const d = o.data || {};
  const c = d.customer || {};
  let subject = `${o.id}: ${label}`, title = label, inner = "", pre = label;
  if (o.status === "paid") {
    subject = `Megérkezett a fizetés – ${o.id}`; title = "Megérkezett a fizetés"; pre = "Hamarosan feladjuk a csomagod.";
    inner = `${h1("Megérkezett a fizetés, köszönjük!")}${p(`A(z) <strong>${esc(o.id)}</strong> számú rendelésed összege (${fmtFt(d.total)}) megérkezett.`)}${steps(1)}${p(d.preorder ? "Az előrendelt termékeket a megjelenés után küldjük, erről e-mailt kapsz." : "Most összekészítjük a csomagodat, a feladáskor küldjük a csomagkövetési számot.")}`;
  } else if (o.status === "packed") {
    subject = `Összekészítettük a csomagod – ${o.id}`; title = "Csomagolva"; pre = "Hamarosan átadjuk a szállítónak.";
    inner = `${h1("Összekészítettük a csomagod")}${p(`A(z) <strong>${esc(o.id)}</strong> számú rendelésed becsomagolva vár a feladásra. Amint átadjuk a szállítónak, küldjük a csomagkövetési számot.`)}${steps(1)}`;
  } else if (o.status === "done") {
    subject = `Köszönjük a vásárlást! – ${o.id}`; title = "Köszönjük a vásárlást"; pre = "Hogy tetszik? Értékeld a termékeket.";
    const prods = (d.lines || []).filter(l => l.id).slice(0, 6);
    inner = `${h1(`Köszönjük, hogy nálunk vásároltál, ${firstName(c.name)}!`)}${p("Reméljük, minden rendben megérkezett, és jó lapok jöttek ki a csomagokból.")}${steps(3)}
${prods.length ? `${h2("Hogy tetszik? Értékeld egy kattintással")}${p("A véleményed sokat segít a többi gyűjtőnek.", `color:${C.muted};font-size:14px`)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${prods.map(l => `<tr><td style="padding:8px 0;border-bottom:1px solid ${C.line};font-size:14px">${esc(l.name)}</td><td align="right" style="padding:8px 0;border-bottom:1px solid ${C.line};white-space:nowrap"><a href="${esc(`${base}/product?id=${Number(l.id)}#velemenyek`)}" style="color:${C.ink};font-weight:bold">Értékelem ★</a></td></tr>`).join("")}</table>` : ""}
${p(`Gyűjtési tippeket és útmutatókat a <a href="${esc(base)}/blog" style="color:${C.ink}">cikkeink</a> között találsz.`, "margin-top:18px")}`;
  } else if (o.status === "cancelled") {
    subject = `Lemondott rendelés – ${o.id}`; title = "Lemondott rendelés"; pre = "A rendelésed lemondásra került.";
    inner = `${h1("A rendelésedet lemondtuk")}${p(`A(z) <strong>${esc(o.id)}</strong> számú rendelésed lemondásra került.`)}${o.paid ? box(`Mivel a rendelést már kifizetted, a visszatérítést elindítjuk: a ${fmtFt(d.total)} általában néhány munkanapon belül megérkezik ugyanarra a fizetési módra (kártya) vagy bankszámlára (átutalás).`, "warn") : ""}${p("Ha nem te kérted a lemondást, vagy kérdésed van, válaszolj erre a levélre, és segítünk.")}`;
  } else {
    inner = `${h1(`Rendelésed állapota: ${esc(label)}`)}${p(`Rendelésszám: <strong>${esc(o.id)}</strong>`)}`;
  }
  const body = `${inner}${o.status !== "cancelled" ? btn(trackLink(base, o), "Rendelés állapota") : ""}`;
  return { subject, html: layout(s, base, { title, preheader: pre, body, footerNote: `Ezt a levelet a(z) ${o.id} számú rendelésed miatt kaptad.` }) };
}

/* ---------- értesítők, hírlevél ---------- */
export function backInStockEmail(s, base, p_, img) {
  const url = `${base}/product?id=${Number(p_.id)}`;
  const body = `${h1("Újra kapható!")}
${p("Értesítést kértél erről a termékről – most újra rendelhető:")}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:14px 0;border:1px solid ${C.line};border-radius:14px"><tr>
${img ? `<td style="padding:14px;width:120px;vertical-align:top"><img src="${esc(img)}" alt="" width="120" style="width:120px;height:auto;border-radius:10px;display:block"></td>` : ""}
<td style="padding:14px;vertical-align:middle"><strong style="font-size:16px;color:${C.ink}">${esc(p_.name)}</strong><br><span style="font-size:18px;font-weight:bold">${fmtFt(p_.price)}</span></td></tr></table>
${btn(url, "Megnézem")}
${muted("Ezt a levelet azért kaptad, mert értesítést kértél erről a termékről. Erről a termékről több értesítőt nem küldünk.")}`;
  return { subject: `Újra kapható: ${p_.name}`, html: layout(s, base, { title: "Újra kapható", preheader: `${p_.name} – ${fmtFt(p_.price)}`, body }) };
}

export function confirmSubscribeEmail(s, base, token) {
  const url = `${base}/api/newsletter?confirm=${encodeURIComponent(token)}`;
  const body = `${h1("Erősítsd meg a feliratkozást")}
${p("Már csak egy kattintás, és feliratkoztál a hírlevelünkre. Ezekről írunk:")}
<ul style="margin:0 0 6px;padding-left:20px"><li>új szettek és megjelenési dátumok,</li><li>előrendelések indulása,</li><li>akciók és kuponok,</li><li>gyűjtési és játék útmutatók.</li></ul>
${btn(url, "Feliratkozás megerősítése")}
${muted(`Ha a gomb nem működik, másold be ezt a címet a böngésződbe:<br><a href="${esc(url)}" style="color:${C.muted};word-break:break-all">${esc(url)}</a>`)}
${muted("Ha nem te iratkoztál fel, hagyd figyelmen kívül ezt a levelet – megerősítés nélkül nem küldünk több levelet, és a címedet sem használjuk.")}`;
  return { subject: `Erősítsd meg a feliratkozást – ${s?.shopName || "NS Card"}`, html: layout(s, base, { title: "Feliratkozás", preheader: "Egy kattintás, és kész.", body, footerNote: "Ezt a levelet azért kaptad, mert valaki ezzel a címmel feliratkozott a hírlevelünkre." }) };
}

export function welcomeEmail(s, base, token) {
  const unsub = `${base}/api/newsletter?unsubscribe=${encodeURIComponent(token)}`;
  const body = `${h1("Sikeres feliratkozás – üdv a klubban!")}
${p("Köszönjük, hogy megerősítetted a feliratkozást. Mostantól elsőként szólunk az új megjelenésekről, az előrendelések indulásáról és az akciókról.")}
${box("<strong>Mire számíthatsz?</strong><br>Csak akkor írunk, ha tényleg van újdonság – általában havonta néhány levelet. Bármelyik levél alján egy kattintással leiratkozhatsz.")}
${h2("Addig is, nézz körül")}
<ul style="margin:0 0 6px;padding-left:20px">
<li><a href="${esc(base)}/products" style="color:${C.ink}">Termékek</a> – boosterek, ETB-k, tinek és single lapok</li>
<li><a href="${esc(base)}/products?pre=1" style="color:${C.ink}">Előrendelések</a> – foglald le a következő szett dobozát</li>
<li><a href="${esc(base)}/blog" style="color:${C.ink}">Cikkek</a> – vásárlási, tárolási és gyűjtési útmutatók</li></ul>
${btn(`${base}/`, "Irány a webshop")}
${muted(`Bármikor leiratkozhatsz: <a href="${esc(unsub)}" style="color:${C.muted}">leiratkozás</a>.`)}`;
  return { subject: `Sikeres feliratkozás – ${s?.shopName || "NS Card"}`, html: layout(s, base, { title: "Üdv a klubban", preheader: "Elsőként szólunk az újdonságokról.", body }), headers: { "List-Unsubscribe": `<${unsub}>` } };
}

export function newsletterEmail(s, base, { subject, body: md }, token) {
  const unsub = `${base}/api/newsletter?unsubscribe=${encodeURIComponent(token)}`;
  const body = `${mdToHtml(md, { imgStyle: "max-width:100%;height:auto;border-radius:12px" })}
${btn(`${base}/`, "Irány a webshop")}
${muted(`Nem szeretnél több levelet? <a href="${esc(unsub)}" style="color:${C.muted}">Leiratkozás egy kattintással</a>`)}`;
  const listUnsub = [`<${unsub}>`, s?.email ? `<mailto:${s.email}?subject=Leiratkozas>` : ""].filter(Boolean).join(", ");
  return {
    subject, html: layout(s, base, { title: subject, preheader: String(md || "").replace(/[#*>\[\]()|_-]/g, "").trim().slice(0, 110), body, footerNote: "Ezt a levelet azért kaptad, mert feliratkoztál a hírlevelünkre." }),
    headers: { "List-Unsubscribe": listUnsub }
  };
}

/* ---------- kapcsolat, vélemény, próba ---------- */
const refOf = m => (m?.id ? `#${m.id}` : "");
export function contactAdminEmail(s, base, m, productName) {
  const ref = refOf(m);
  const replySubject = `Re: ${m.subject || "Kérdésed az NS Cardnál"}${ref ? ` (${ref})` : ""}`;
  const body = `${h1(`Új üzenet${ref ? ` ${ref}` : ""}: ${esc(m.subject || "Kapcsolat")}`)}
${kv([["Feladó", `${esc(m.name || "–")} &lt;<a href="mailto:${esc(m.email)}" style="color:${C.ink}">${esc(m.email)}</a>&gt;`], productName ? ["Termék", esc(productName)] : null, ["Érkezett", esc(fmtDate(new Date().toISOString(), true))]])}
${box(`<div style="white-space:pre-line">${esc(m.body)}</div>`)}
${btn(`mailto:${m.email}?subject=${encodeURIComponent(replySubject)}`, "Válasz a vásárlónak")}
${muted("Erre a levélre a Válasz gombbal is felelhetsz: a válasz közvetlenül a vásárlóhoz megy. A vásárló automatikus visszaigazolást kapott.")}
${btn(`${base}/admin#kozosseg`, "Üzenetek az adminban", true)}`;
  return { subject: `${ref ? `[${ref}] ` : ""}Üzenet a webshopból: ${m.subject || m.name || m.email}`, html: layout(s, base, { title: "Új üzenet", preheader: String(m.body || "").slice(0, 110), body }) };
}
export function contactAutoReply(s, base, m) {
  const ref = refOf(m);
  const body = `${h1("Megkaptuk az üzeneted!")}
${p(`Kedves ${firstName(m.name) || "Vásárlónk"}! Köszönjük, hogy írtál nekünk. Az üzenetedet rögzítettük, és általában <strong>1 munkanapon belül</strong> válaszolunk erre az e-mail címre.`)}
${kv([ref ? ["Hivatkozási szám", `<strong>${esc(ref)}</strong>`] : null, m.subject ? ["Tárgy", esc(m.subject)] : null, ["Beküldve", esc(fmtDate(new Date().toISOString(), true))]])}
${box(`<span style="color:${C.muted};font-size:13px">Az üzeneted:</span><div style="white-space:pre-line;margin-top:4px">${esc(String(m.body || "").slice(0, 1500))}</div>`)}
${p("Ha valamit kihagytál – például egy rendelésszámot vagy egy fotót –, egyszerűen <strong>válaszolj erre a levélre</strong>, és hozzácsatoljuk az üzenetedhez.")}
${h2("Addig is hasznos lehet")}
<ul style="margin:0 0 6px;padding-left:20px">
<li style="margin-bottom:4px"><a href="${esc(base)}/rendeles" style="color:${C.ink}">Rendelés követése</a> – a rendelésszámmal és az e-mail címeddel</li>
<li style="margin-bottom:4px"><a href="${esc(base)}/blog/booster-etb-display-tin-melyiket-valaszd" style="color:${C.ink}">Booster, ETB, display vagy tin?</a> – melyiket válaszd</li>
<li style="margin-bottom:4px"><a href="${esc(base)}/blog/elorendeles-hogyan-mukodik" style="color:${C.ink}">Hogyan működik az előrendelés?</a></li>
<li><a href="${esc(base)}/blog" style="color:${C.ink}">Minden útmutató</a></li></ul>
${btn(`${base}/products`, "Termékek böngészése", true)}`;
  return { subject: `Megkaptuk az üzeneted${ref ? ` (${ref})` : ""} – ${s?.shopName || "NS Card"}`, html: layout(s, base, { title: "Megkaptuk az üzeneted", preheader: "Rögzítettük az üzeneted, hamarosan válaszolunk.", body, footerNote: "Ezt a levelet azért kaptad, mert üzenetet küldtél a webshop kapcsolat űrlapján." }) };
}

export function reviewAdminEmail(s, base, r, productName) {
  const body = `${h1("Új vélemény moderálásra")}
${p(`<strong>${esc(productName)}</strong><br><span style="color:${C.gold};font-size:18px">${"★".repeat(r.rating)}</span><span style="color:${C.line};font-size:18px">${"★".repeat(5 - r.rating)}</span>`)}
${box(`<strong>${esc(r.name)}</strong>${r.title ? ` – ${esc(r.title)}` : ""}<div style="white-space:pre-line;margin-top:4px">${esc(r.body || "")}</div>`)}
${btn(`${base}/admin#kozosseg`, "Moderálás az adminban")}`;
  return { subject: `Új vélemény: ${productName} (${r.rating}★)`, html: layout(s, base, { title: "Új vélemény", body }) };
}

export function testEmail(s, base, env) {
  const body = `${h1("A levelezés működik ✓")}
${p("Ez egy próbalevél az NS Card adminból. Ha megkaptad, a webshop levelei (rendelés visszaigazolás, feladás, értesítők, hírlevél) innen fognak menni.")}
${kv([["Feladó", esc(fromOf(env, s))], ["Válaszcím", esc(shopEmail(env, s) || "–")], ["Küldés módja", mailTransport(env) === "gmail" ? "Gmail (SMTP)" : mailTransport(env) === "smtp" ? "SMTP" : "Resend"], ["Időpont", esc(fmtDate(new Date().toISOString(), true))]])}
${muted("Tipp: ha a levél a Spam mappába került, jelöld „Nem spam”-nek, és vedd fel a feladót a névjegyeid közé.")}`;
  return { subject: `Próbalevél – ${s?.shopName || "NS Card"}`, html: layout(s, base, { title: "Próbalevél", preheader: "A webshop levelezése be van kötve.", body }) };
}
