/* NS Card – e-mailek a Resend szolgáltatáson keresztül (RESEND_API_KEY, MAIL_FROM környezeti változók).
 * Ha nincs beállítva, a küldés csendben kimarad – a rendelés ettől még létrejön. */
import { esc, fmtFt, mdToHtml } from "./core.js";
import { CARRIERS, trackingUrl, trackLink } from "./orders.js";

export const mailReady = env => !!env?.RESEND_API_KEY;
const fromOf = (env, s) => env.MAIL_FROM || `${s?.shopName || "NS Card"} <rendeles@nscard.hu>`;

export async function sendMail(env, s, { to, subject, html, text, replyTo, headers }) {
  if (!mailReady(env)) return { ok: false, skipped: true };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: fromOf(env, s), to: [].concat(to), subject, html, text, reply_to: replyTo || s?.email || undefined, headers })
    });
    const data = await res.json().catch(() => ({}));
    return res.ok ? { ok: true, id: data.id } : { ok: false, error: data?.message || `Resend hiba (${res.status})` };
  } catch (e) { return { ok: false, error: "Az e-mail szolgáltató nem érhető el." }; }
}

/* Több címzett, egyenként személyre szabott levéllel (max. 100 / kérés). */
export async function sendBatch(env, s, messages) {
  if (!mailReady(env)) return { ok: false, skipped: true, sent: 0 };
  let sent = 0, error = "";
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100).map(m => ({ from: fromOf(env, s), to: [m.to], subject: m.subject, html: m.html, text: m.text, reply_to: s?.email || undefined, headers: m.headers }));
    try {
      const res = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(chunk)
      });
      if (res.ok) sent += chunk.length; else { const d = await res.json().catch(() => ({})); error = d?.message || `Resend hiba (${res.status})`; break; }
    } catch { error = "Az e-mail szolgáltató nem érhető el."; break; }
  }
  return { ok: !error, sent, error };
}

/* ---------- sablonok ---------- */
const C = { ink: "#0b1530", gold: "#ffcb3d", text: "#1d2433", muted: "#5b6477", line: "#e6e9f0", bg: "#f3f5fa" };

export function layout(s, base, { title, preheader = "", body }) {
  const shop = esc(s?.shopName || "NS Card");
  const foot = [s?.companyName, s?.companyAddress].filter(Boolean).map(esc).join(" · ");
  return `<!doctype html><html lang="hu"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>
<body style="margin:0;background:${C.bg};font-family:Arial,Helvetica,sans-serif;color:${C.text}">
<span style="display:none;max-height:0;overflow:hidden">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:16px;overflow:hidden">
<tr><td style="background:${C.ink};padding:22px 28px"><a href="${esc(base)}/" style="color:#fff;text-decoration:none;font-size:22px;font-weight:bold;letter-spacing:.5px">${shop}<span style="color:${C.gold}">.</span></a></td></tr>
<tr><td style="padding:28px 28px 8px;font-size:15px;line-height:1.6">${body}</td></tr>
<tr><td style="padding:18px 28px 26px;font-size:12px;color:${C.muted};border-top:1px solid ${C.line}">
${s?.email ? `Kérdésed van? Írj nekünk: <a href="mailto:${esc(s.email)}" style="color:${C.muted}">${esc(s.email)}</a>${s?.phone ? ` · ${esc(s.phone)}` : ""}<br>` : ""}${foot}
</td></tr></table></td></tr></table></body></html>`;
}

const btn = (href, label) => `<p style="margin:22px 0"><a href="${esc(href)}" style="display:inline-block;background:${C.gold};color:${C.ink};font-weight:bold;text-decoration:none;padding:13px 22px;border-radius:999px">${esc(label)}</a></p>`;
const fmtDate = iso => {
  const d = new Date(iso);
  if (isNaN(d)) return "";
  try { return d.toLocaleDateString("hu-HU", { year: "numeric", month: "long", day: "numeric", timeZone: "Europe/Budapest" }); }
  catch { return String(iso).slice(0, 10); }
};

export function itemsTable(d) {
  const row = (a, b, strong = false) => `<tr><td style="padding:6px 0;color:${strong ? C.text : C.muted}">${a}</td><td align="right" style="padding:6px 0;white-space:nowrap">${strong ? `<strong>${b}</strong>` : b}</td></tr>`;
  const items = (d.lines || []).map(l => `<tr><td style="padding:10px 0;border-bottom:1px solid ${C.line}">${esc(l.name)}${l.preorder ? `<br><small style="color:${C.muted}">Előrendelés${l.releaseDate ? ` – megjelenés: ${esc(fmtDate(l.releaseDate))}` : ""}</small>` : ""}<br><small style="color:${C.muted}">${l.qty} db × ${fmtFt(l.price)}</small></td><td align="right" style="padding:10px 0;border-bottom:1px solid ${C.line};white-space:nowrap">${fmtFt(l.qty * l.price)}</td></tr>`).join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;margin:14px 0">${items}
${row("Részösszeg", fmtFt(d.subtotal))}
${d.discount ? row(`Kedvezmény (${esc(d.coupon)})`, `−${fmtFt(d.discount)}`) : ""}
${row(`Szállítás – ${esc(String(d.methodLabel || "").toLowerCase())}`, d.shipping ? fmtFt(d.shipping) : "ingyenes")}
${d.cod ? row("Utánvételi díj", fmtFt(d.cod)) : ""}
${d.giftFee ? row("Ajándékcsomagolás", fmtFt(d.giftFee)) : d.gift ? row("Ajándékcsomagolás", "ingyenes") : ""}
${row("Fizetendő", fmtFt(d.total), true)}</table>`;
}

export function deliveryText(d) {
  const c = d.customer || {};
  if (d.method === "pickup") return "Személyes átvétel – az időpontot e-mailben egyeztetjük.";
  if (d.method === "locker") return `Csomagautomata: ${esc(c.locker)}`;
  return `${esc(c.zip)} ${esc(c.city)}, ${esc(c.address)}`;
}

export function orderConfirmation(s, base, o) {
  const d = o.data;
  const c = d.customer || {};
  const payInfo = d.pay === "transfer"
    ? `<div style="background:${C.bg};border-radius:12px;padding:14px 16px;margin:16px 0"><strong>Utalási adatok</strong><br>${s.bankDetails ? esc(s.bankDetails).replace(/\n/g, "<br>") : "Az utalási adatokat külön levélben küldjük."}<br>Összeg: <strong>${fmtFt(d.total)}</strong><br>Közlemény: <strong>${esc(o.id)}</strong><br><small style="color:${C.muted}">A csomagot az összeg beérkezése után adjuk fel.</small></div>`
    : d.pay === "cod" ? `<p>Fizetés a csomag átvételekor: <strong>${fmtFt(d.total)}</strong>.</p>`
    : `<p>A kártyás fizetés sikeres volt, köszönjük!</p>`;
  const body = `<h1 style="font-size:22px;margin:0 0 8px">Köszönjük a rendelést, ${esc(String(c.name || "").split(" ").slice(-1)[0] || "")}!</h1>
<p style="margin:0 0 6px;color:${C.muted}">Rendelésszám: <strong style="color:${C.text}">${esc(o.id)}</strong></p>
${payInfo}
${itemsTable(d)}
<p><strong>Szállítás:</strong> ${deliveryText(d)}</p>
${d.preorder ? `<p style="color:${C.muted}">Az előrendelt termékeket a megjelenés után küldjük. Ha a rendelésben készleten lévő termék is van, azokat együtt adjuk fel, hacsak másként nem kéred.</p>` : ""}
${c.note ? `<p><strong>Megjegyzés:</strong> ${esc(c.note)}</p>` : ""}
${d.gift ? `<p><strong>Ajándékcsomagolás</strong>${d.giftMessage ? ` – üzenet a kártyán: „${esc(d.giftMessage)}”` : ""}</p>` : ""}
<p>A feladásról külön e-mailt küldünk a csomagkövetési számmal.</p>${btn(trackLink(base, o), "Rendelés állapota")}`;
  return {
    subject: `Rendelés visszaigazolás – ${o.id}`,
    html: layout(s, base, { title: `Rendelés ${o.id}`, preheader: `${fmtFt(d.total)} – ${d.payLabel}`, body }),
    text: `Köszönjük a rendelést! Rendelésszám: ${o.id}\nFizetendő: ${fmtFt(d.total)} (${d.payLabel})\n${(d.lines || []).map(l => `- ${l.name} × ${l.qty}`).join("\n")}\n${d.pay === "transfer" ? `\nUtalás: ${s.bankDetails || ""}\nKözlemény: ${o.id}\n` : ""}`
  };
}

export function adminNotification(s, base, o) {
  const d = o.data;
  const c = d.customer || {};
  const body = `<h1 style="font-size:20px;margin:0 0 6px">Új rendelés: ${esc(o.id)}</h1>
<p style="margin:0;color:${C.muted}">${esc(c.name)} · ${esc(c.email)} · ${esc(c.phone)}</p>
<p><strong>${esc(d.payLabel)}</strong> · ${esc(d.methodLabel)}</p>
${itemsTable(d)}
<p><strong>Szállítás:</strong> ${deliveryText(d)}</p>
${c.note ? `<p><strong>Megjegyzés:</strong> ${esc(c.note)}</p>` : ""}
${d.gift ? `<p><strong>🎁 Ajándékcsomagolás kérve</strong>${d.giftMessage ? ` – üzenet: „${esc(d.giftMessage)}”` : ""}</p>` : ""}
${btn(`${base}/admin#rendelesek`, "Megnyitás az adminban")}`;
  return { subject: `Új rendelés ${o.id} – ${fmtFt(d.total)}`, html: layout(s, base, { title: "Új rendelés", body }), text: `Új rendelés: ${o.id} – ${fmtFt(d.total)}` };
}

export function shippedEmail(s, base, o) {
  const url = trackingUrl(o.carrier, o.tracking);
  const carrier = CARRIERS[o.carrier]?.label || "";
  const body = `<h1 style="font-size:22px;margin:0 0 8px">Úton van a csomagod!</h1>
<p>A(z) <strong>${esc(o.id)}</strong> számú rendelésedet feladtuk${carrier && o.carrier !== "other" ? ` (${esc(carrier)})` : ""}.</p>
${o.tracking ? `<p>Csomagkövetési szám: <strong>${esc(o.tracking)}</strong></p>${url ? btn(url, "Csomag követése") : ""}` : ""}
<p><strong>Szállítás:</strong> ${deliveryText(o.data)}</p>
<p><a href="${esc(trackLink(base, o))}" style="color:${C.text}">A rendelés állapota a webshopban</a></p>
<p style="color:${C.muted}">Jó bontást kívánunk!</p>`;
  return { subject: `Feladtuk a rendelésed – ${o.id}`, html: layout(s, base, { title: "Feladtuk a csomagod", body }), text: `Feladtuk a(z) ${o.id} rendelést. ${o.tracking ? `Követés: ${o.tracking} ${url}` : ""}` };
}

export function statusEmail(s, base, o, label) {
  const body = `<h1 style="font-size:20px;margin:0 0 8px">Rendelésed állapota: ${esc(label)}</h1><p>Rendelésszám: <strong>${esc(o.id)}</strong></p>${o.status === "cancelled" ? "<p>Ha már fizettél, a visszatérítést elindítjuk, és néhány munkanapon belül megérkezik.</p>" : ""}`;
  return { subject: `${o.id}: ${label}`, html: layout(s, base, { title: label, body }), text: `${o.id}: ${label}` };
}

export function backInStockEmail(s, base, p, img) {
  const url = `${base}/product?id=${Number(p.id)}`;
  const body = `<h1 style="font-size:22px;margin:0 0 8px">Újra kapható!</h1>
${img ? `<p><img src="${esc(img)}" alt="" width="220" style="max-width:220px;height:auto;border-radius:12px"></p>` : ""}
<p><strong>${esc(p.name)}</strong> újra rendelhető – ${fmtFt(p.price)}.</p>
<p style="color:${C.muted}">Kevés darab érkezett, érdemes sietni.</p>${btn(url, "Megnézem")}
<p style="font-size:12px;color:${C.muted}">Ezt a levelet azért kaptad, mert értesítést kértél erről a termékről. Több levelet erről nem küldünk.</p>`;
  return { subject: `Újra kapható: ${p.name}`, html: layout(s, base, { title: "Újra kapható", body }), text: `${p.name} újra kapható: ${url}` };
}

export function confirmSubscribeEmail(s, base, token) {
  const url = `${base}/api/newsletter?confirm=${encodeURIComponent(token)}`;
  const body = `<h1 style="font-size:22px;margin:0 0 8px">Erősítsd meg a feliratkozást</h1>
<p>Egy kattintás, és elsőként értesítünk az új megjelenésekről, előrendelésekről és akciókról.</p>${btn(url, "Feliratkozás megerősítése")}
<p style="font-size:12px;color:${C.muted}">Ha nem te iratkoztál fel, hagyd figyelmen kívül ezt a levelet.</p>`;
  return { subject: `Erősítsd meg a feliratkozást – ${s?.shopName || "NS Card"}`, html: layout(s, base, { title: "Feliratkozás", body }), text: `Feliratkozás megerősítése: ${url}` };
}

export function newsletterEmail(s, base, { subject, body: md }, token) {
  const unsub = `${base}/api/newsletter?unsubscribe=${encodeURIComponent(token)}`;
  const body = `${mdToHtml(md, { imgStyle: "max-width:100%;height:auto;border-radius:12px" })}
<p style="font-size:12px;color:${C.muted};margin-top:28px">Nem szeretnél több levelet? <a href="${esc(unsub)}" style="color:${C.muted}">Leiratkozás</a></p>`;
  return {
    subject, html: layout(s, base, { title: subject, body }), text: `${String(md || "").replace(/[#*]/g, "")}\n\nLeiratkozás: ${unsub}`,
    headers: { "List-Unsubscribe": `<${unsub}>` }
  };
}

export function contactAdminEmail(s, base, m, productName) {
  const body = `<h1 style="font-size:20px;margin:0 0 8px">Új üzenet: ${esc(m.subject || "Kapcsolat")}</h1>
<p style="color:${C.muted};margin:0">${esc(m.name || "")} · <a href="mailto:${esc(m.email)}">${esc(m.email)}</a>${productName ? ` · ${esc(productName)}` : ""}</p>
<p style="white-space:pre-line">${esc(m.body)}</p>${btn(`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject || "Kérdésed"}`)}`, "Válasz")}`;
  return { subject: `Üzenet a webshopból: ${m.subject || m.name || m.email}`, html: layout(s, base, { title: "Új üzenet", body }), text: `${m.name} <${m.email}>\n\n${m.body}` };
}
export function contactAutoReply(s, base, m) {
  const body = `<h1 style="font-size:20px;margin:0 0 8px">Megkaptuk az üzeneted!</h1><p>Köszönjük, hogy írtál, ${esc(String(m.name || "").split(" ").slice(-1)[0] || "")}! Általában 1 munkanapon belül válaszolunk.</p><p style="color:${C.muted};white-space:pre-line">„${esc(m.body.slice(0, 600))}”</p>`;
  return { subject: `Megkaptuk az üzeneted – ${s?.shopName || "NS Card"}`, html: layout(s, base, { title: "Megkaptuk az üzeneted", body }), text: "Megkaptuk az üzeneted, hamarosan válaszolunk." };
}

export function reviewAdminEmail(s, base, r, productName) {
  const body = `<h1 style="font-size:20px;margin:0 0 8px">Új vélemény moderálásra</h1><p><strong>${esc(productName)}</strong> – ${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}</p><p>${esc(r.name)}: ${esc(r.body || r.title || "")}</p>${btn(`${base}/admin#kozosseg`, "Moderálás")}`;
  return { subject: `Új vélemény: ${productName}`, html: layout(s, base, { title: "Új vélemény", body }), text: `Új vélemény: ${productName}` };
}
