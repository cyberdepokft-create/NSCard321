/* /api/admin/* – az admin felület szerver oldala. Azonosítás: az admin GitHub tokenje (Authorization: Bearer …),
 * amelynek írási joga van a bolt repójához. Cloudflare Access is védheti (Zero Trust → Access → /admin és /api/admin).
 *
 * GET    orders?status=&q=&limit=          rendelések listája
 * GET    orders/ID                         egy rendelés
 * PATCH  orders/ID {status, paid, tracking, carrier, note, notify}
 * POST   orders/ID/invoice                 számla (Számlázz.hu vagy Billingo)
 * GET    orders/ID/invoice.pdf             a számla PDF-je (Számlázz.hu)
 * POST   orders/ID/resend                  visszaigazolás újraküldése
 * GET    orders.csv | subscribers.csv      export
 * GET    summary                           számok a menühöz és az áttekintéshez
 * GET    stock?since=ISO                   eladott darabok a szinkron óta
 * GET    community                         feliratkozók, értesítők, vélemények
 * PATCH  reviews/ID {status, reply}  ·  DELETE reviews/ID
 * DELETE subscribers/EMAIL
 * POST   newsletter {subject, body, test}
 * POST   notify {ids:[…]}                  „újra kapható” levelek
 * GET    integrations                      beállított szolgáltatások állapota
 * GET    github                            a bolt repója (a szerver GITHUB_TOKEN-jével)
 * GET|PUT github/contents/PATH             katalógus és képek olvasása/írása – csak a katalógus mappájában
 */
import { json, readJson, loadCatalog, originOf, nowIso, clean, cleanText, validEmail, absUrl, remoteConfig, sha256Hex } from "../../../lib/core.js";
import { getDb, soldSince } from "../../../lib/db.js";
import { isAdmin, serverAuthReady } from "../../../lib/auth.js";
import { STATUS, CARRIERS, getOrder, rowToOrder, saveOrder, setStatus } from "../../../lib/orders.js";
import { sendMail, sendMany, sendBatch, BATCH_LIMIT, mailReady, mailTransport, fromOf, shopEmail, testEmail, shippedEmail, statusEmail, orderConfirmation, backInStockEmail, newsletterEmail } from "../../../lib/mail.js";
import { maybeInvoice } from "../../../lib/flow.js";
import { billingoReady, billingoBlocks } from "../../../lib/billingo.js";
import { szamlazzCheck, invoicePdf } from "../../../lib/szamlazz.js";
import { issueInvoice, invoiceProvider, PROVIDERS } from "../../../lib/invoicing.js";

const csvCell = v => { const s = String(v ?? ""); return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const csv = (rows, name) => new Response("﻿" + rows.map(r => r.map(csvCell).join(";")).join("\r\n"), {
  headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "no-store" }
});
const huDate = iso => {
  const d = new Date(iso);
  if (isNaN(d)) return "";
  try { return d.toLocaleString("hu-HU", { timeZone: "Europe/Budapest" }); } catch { return String(iso).replace("T", " ").slice(0, 16); }
};

function summaryOf(o) {
  const d = o.data || {};
  return {
    id: o.id, createdAt: o.createdAt, status: o.status, statusLabel: o.statusLabel, paid: o.paid, pay: o.pay, ship: o.ship,
    name: o.name, email: o.email, phone: o.phone, total: o.total, invoice: o.invoice, tracking: o.tracking, carrier: o.carrier,
    items: (d.lines || []).reduce((a, l) => a + l.qty, 0), preview: (d.lines || []).map(l => `${l.qty}× ${l.name}`).join(", ").slice(0, 160),
    preorder: !!d.preorder, gift: !!d.gift, method: d.methodLabel || "", locker: d.customer?.locker || "", city: d.customer?.city || ""
  };
}

async function listOrders(DB, u) {
  const status = u.searchParams.get("status") || "";
  const q = clean(u.searchParams.get("q"), 80);
  const limit = Math.min(500, Math.max(1, Number(u.searchParams.get("limit")) || 100));
  const where = [], args = [];
  if (status === "open") where.push("status IN ('new','paid','packed')");
  else if (STATUS[status]) { where.push("status = ?"); args.push(status); }
  if (q) { where.push("(id LIKE ? OR name LIKE ? OR email LIKE ? OR phone LIKE ?)"); const like = `%${q}%`; args.push(like, like, like, like); }
  const sql = `SELECT * FROM orders ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY created_at DESC LIMIT ?`;
  const { results } = await DB.prepare(sql).bind(...args, limit).all();
  return (results || []).map(rowToOrder);
}

/* Publikálás a szerveren keresztül: a GitHub token a Cloudflare titkai között van (GITHUB_TOKEN), a böngésző nem látja.
 * Csak a bolt repója, csak a beállított ág, és csak a katalógus mappája (pl. public/store/) írható – a szerver kódja nem. */
async function githubProxy(request, env, rest) {
  if (!env.GITHUB_TOKEN) return json({ error: "A GITHUB_TOKEN nincs beállítva a Cloudflare-ben (Settings → Variables and Secrets).", notoken: true }, 503);
  const cfg = await remoteConfig(request, env);
  const method = request.method;
  const base = `https://api.github.com/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}`;
  let target = "", body;
  if (!rest.length && method === "GET") target = base;
  else if (rest[0] === "contents" && rest.length > 1 && (method === "GET" || method === "PUT")) {
    const path = rest.slice(1).join("/");
    const dir = cfg.path.includes("/") ? cfg.path.slice(0, cfg.path.lastIndexOf("/") + 1) : "";
    if (!dir || !path.startsWith(dir) || path.split("/").some(s => !s || s === "." || s === "..") || !/^[\w./-]+$/.test(path)) return json({ error: "Ide az admin nem írhat." }, 403);
    target = `${base}/contents/${path.split("/").map(encodeURIComponent).join("/")}`;
    if (method === "GET") target += `?ref=${encodeURIComponent(cfg.branch)}`;
    else {
      const b = await readJson(request, 60 * 1024 * 1024);
      if (!b || typeof b.content !== "string" || !b.content) return json({ error: "Hiányzó tartalom." }, 400);
      body = JSON.stringify({ message: clean(b.message, 200) || "Admin módosítás", content: b.content, branch: cfg.branch, ...(b.sha ? { sha: clean(b.sha, 64) } : {}) });
    }
  } else return json({ error: "Nem támogatott művelet." }, 400);
  const res = await fetch(target, {
    method, body,
    headers: { Authorization: `Bearer ${env.GITHUB_TOKEN}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "nscard-webshop", ...(body ? { "Content-Type": "application/json" } : {}) }
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) return json({ error: "A Cloudflare-ben beállított GitHub token érvénytelen vagy lejárt. Készíts újat, és cseréld le a GITHUB_TOKEN értékét.", gh: 401 }, 502);
  if (res.status === 403) return json({ error: "A Cloudflare-ben beállított GitHub tokennek nincs írási joga (Contents: Read and write) ehhez a repóhoz.", gh: 403 }, 403);
  if (res.status === 404 && !rest.length) return json({ error: "A repó nem található, vagy a GitHub token nem fér hozzá (Repository access).", gh: 404 }, 404);
  return json(data, res.status);
}

export async function onRequest({ request, env, params }) {
  if (!(await isAdmin(request, env))) return json({ error: serverAuthReady(env) ? "Lejárt a belépés. Lépj be újra." : "Nincs jogosultság. Kösd össze a GitHubot az adminban (Publikálás menü).", relogin: serverAuthReady(env) }, 401);
  const method = request.method;
  const parts = [].concat(params.path || []).map(p => decodeURIComponent(p));
  const [head, id, action] = parts;
  const u = new URL(request.url);
  const base = originOf(request);
  if (head === "github") return githubProxy(request, env, parts.slice(1));

  if (head === "integrations" && method === "GET") {
    let billingo = { configured: billingoReady(env) };
    if (billingo.configured) {
      try { billingo.blocks = await billingoBlocks(env); billingo.ok = true; }
      catch (e) { billingo.ok = false; billingo.error = e.message; }
    }
    const szamlazz = await szamlazzCheck(env);
    const cat = await loadCatalog(request, env).catch(() => ({ settings: {} }));
    const provider = invoiceProvider(env, cat.settings || {});
    return json({
      db: !!env.DB, mail: mailReady(env), mailTransport: mailTransport(env), mailFrom: mailReady(env) ? fromOf(env, cat.settings || {}) : "", adminEmail: shopEmail(env, cat.settings || {}),
      adminAuth: serverAuthReady(env), github: !!env.GITHUB_TOKEN,
      stripe: !!env.STRIPE_SECRET_KEY, webhook: !!env.STRIPE_WEBHOOK_SECRET, billingo, szamlazz,
      invoice: { provider, label: PROVIDERS[provider] || "", ok: provider === "szamlazz" ? !!szamlazz.ok : provider === "billingo" ? !!billingo.ok : false }
    });
  }

  /* próbalevél a beállított levelezéssel (adatbázis nélkül is) */
  if (head === "test-mail" && method === "POST") {
    if (!mailReady(env)) return json({ error: "A levelezés még nincs beállítva (SMTP_USER + SMTP_PASS vagy RESEND_API_KEY)." }, 400);
    const b = await readJson(request, 2000) || {};
    const cat = await loadCatalog(request, env, { fresh: true }).catch(() => ({ settings: {} }));
    const s = cat.settings || {};
    const to = validEmail(String(b.to || "").trim()) ? String(b.to).trim() : shopEmail(env, s);
    if (!to) return json({ error: "Adj meg címzettet." }, 400);
    const r = await sendMail(env, s, { to, ...testEmail(s, base, env) });
    return r.ok ? json({ ok: true, to, from: fromOf(env, s) }) : json({ error: r.error || "A küldés nem sikerült." }, 502);
  }

  const DB = await getDb(env).catch(() => null);
  if (!DB) return json({ error: "Nincs adatbázis. Cloudflare → nscard-webshop → Settings → Bindings → D1 database, név: DB.", nodb: true }, 503);
  const catalog = await loadCatalog(request, env);
  const s = catalog.settings || {};

  if (head === "summary" && method === "GET") {
    const counts = {};
    const { results } = await DB.prepare("SELECT status, COUNT(*) AS n FROM orders GROUP BY status").all();
    for (const r of results || []) counts[r.status] = Number(r.n);
    const since = new Date(Date.now() - 30 * 864e5).toISOString();
    const rev = await DB.prepare("SELECT COUNT(*) AS n, COALESCE(SUM(total), 0) AS sum FROM orders WHERE created_at > ? AND status NOT IN ('cancelled','pending_payment')").bind(since).first();
    const today = new Date(Date.now() - 864e5).toISOString();
    const day = await DB.prepare("SELECT COUNT(*) AS n, COALESCE(SUM(total), 0) AS sum FROM orders WHERE created_at > ? AND status NOT IN ('cancelled','pending_payment')").bind(today).first();
    const pending = await DB.prepare("SELECT COUNT(*) AS n FROM reviews WHERE status = 'pending'").first();
    const subs = await DB.prepare("SELECT COUNT(*) AS n FROM subscribers WHERE confirmed = 1 AND unsubscribed = 0").first();
    const alerts = await DB.prepare("SELECT COUNT(*) AS n FROM stock_alerts WHERE notified_at IS NULL").first();
    const { results: recent } = await DB.prepare("SELECT * FROM orders ORDER BY created_at DESC LIMIT 6").all();
    const { results: daily } = await DB.prepare("SELECT substr(created_at, 1, 10) AS d, COUNT(*) AS n, COALESCE(SUM(total), 0) AS sum FROM orders WHERE created_at > ? AND status NOT IN ('cancelled','pending_payment') GROUP BY d ORDER BY d").bind(since).all();
    const { results: top } = await DB.prepare("SELECT oi.product_id AS id, SUM(oi.qty) AS qty FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE oi.created_at > ? AND oi.active = 1 AND o.status NOT IN ('cancelled','pending_payment') GROUP BY oi.product_id ORDER BY qty DESC LIMIT 5").bind(since).all();
    const msgs = await DB.prepare("SELECT COUNT(*) AS n FROM messages WHERE status = 'new'").first();
    return json({
      counts, open: (counts.new || 0) + (counts.paid || 0) + (counts.packed || 0),
      last30: { orders: Number(rev?.n) || 0, revenue: Number(rev?.sum) || 0 }, last24: { orders: Number(day?.n) || 0, revenue: Number(day?.sum) || 0 },
      pendingReviews: Number(pending?.n) || 0, subscribers: Number(subs?.n) || 0, alerts: Number(alerts?.n) || 0, newMessages: Number(msgs?.n) || 0,
      daily: (daily || []).map(r => ({ d: r.d, n: Number(r.n), sum: Number(r.sum) })), top: (top || []).map(r => ({ id: r.id, qty: Number(r.qty) })),
      recent: (recent || []).map(rowToOrder).map(summaryOf)
    });
  }

  if (head === "stock" && method === "GET") {
    return json({ sold: await soldSince(DB, u.searchParams.get("since") || ""), now: nowIso() });
  }

  if (head === "orders.csv" && method === "GET") {
    const list = await listOrders(DB, new URL(`${u.origin}/x?limit=500&status=${encodeURIComponent(u.searchParams.get("status") || "")}`));
    const rows = [["Rendelésszám", "Dátum", "Állapot", "Fizetve", "Fizetés", "Szállítás", "Név", "E-mail", "Telefon", "Cím / automata", "Tételek", "Részösszeg", "Kedvezmény", "Szállítási díj", "Utánvét díj", "Végösszeg", "Számla", "Csomagszám"]];
    for (const o of list) {
      const d = o.data, c = d.customer || {};
      rows.push([o.id, huDate(o.createdAt), o.statusLabel, o.paid ? "igen" : "nem", d.payLabel, d.methodLabel, o.name, o.email, o.phone,
        d.method === "locker" ? c.locker : d.method === "home" ? `${c.zip} ${c.city}, ${c.address}` : "személyes",
        (d.lines || []).map(l => `${l.qty}× ${l.name}`).join(" | "), d.subtotal, (d.discount || 0) + (d.packDiscount || 0), d.shipping, d.cod, d.total, o.invoice, o.tracking]);
    }
    return csv(rows, `nscard-rendelesek-${nowIso().slice(0, 10)}.csv`);
  }

  if (head === "orders" && !id && method === "GET") {
    const list = await listOrders(DB, u);
    return json({ orders: list.map(summaryOf), statuses: STATUS, carriers: Object.fromEntries(Object.entries(CARRIERS).map(([k, v]) => [k, v.label])) });
  }

  if (head === "orders" && id) {
    const o = await getOrder(DB, id);
    if (!o) return json({ error: "Nincs ilyen rendelés." }, 404);
    if (method === "GET" && !action) return json({ order: o, statuses: STATUS, carriers: Object.fromEntries(Object.entries(CARRIERS).map(([k, v]) => [k, v.label])) });

    if (method === "PATCH" && !action) {
      const b = await readJson(request) || {};
      const mails = [];
      if (typeof b.tracking === "string") o.tracking = clean(b.tracking, 300);
      if (typeof b.carrier === "string" && CARRIERS[b.carrier]) o.carrier = b.carrier;
      if (typeof b.note === "string") o.note = cleanText(b.note, 2000);
      let becamePaid = false;
      if (typeof b.paid === "boolean" && b.paid !== o.paid) {
        o.paid = b.paid;
        (o.data.history = o.data.history || []).push({ at: nowIso(), status: b.paid ? "fizetve jelölve" : "fizetés visszavonva", by: "admin" });
        becamePaid = b.paid;
      }
      await saveOrder(DB, o);
      if (b.status && STATUS[b.status] && b.status !== o.status) {
        await setStatus(DB, o, b.status, "admin");
        if (b.status === "paid") becamePaid = true;
        if (b.notify !== false) {
          if (b.status === "shipped") mails.push(shippedEmail(s, base, o));
          else if (["cancelled", "done", "packed", "paid"].includes(b.status)) mails.push(statusEmail(s, base, o, STATUS[b.status]));
        }
      }
      let mailed = 0, mailError = "";
      for (const m of mails) {
        const r = await sendMail(env, s, { to: o.email, ...m });
        if (r.ok) mailed++; else if (!r.skipped) mailError = r.error;
      }
      if (becamePaid) await maybeInvoice(DB, env, s, o);
      return json({ order: await getOrder(DB, o.id), mailed, mailError, mailReady: mailReady(env) });
    }

    if (method === "POST" && action === "invoice") {
      if (o.invoice) return json({ error: `Már van számla: ${o.invoice}` }, 409);
      try {
        const inv = await issueInvoice(env, o, s);
        o.invoice = inv.number;
        o.data.invoice = { ...inv, at: nowIso() };
        delete o.data.invoiceError;
        (o.data.history = o.data.history || []).push({ at: nowIso(), status: `számla: ${inv.number}`, by: "admin" });
        await saveOrder(DB, o);
        return json({ order: o, invoice: inv });
      } catch (e) {
        o.data.invoiceError = e.message;
        await saveOrder(DB, o);
        return json({ error: e.message }, 502);
      }
    }

    if (method === "GET" && action === "invoice.pdf") {
      if (!o.invoice) return json({ error: "Ehhez a rendeléshez még nincs számla." }, 404);
      if (o.data.invoice?.provider !== "szamlazz") return json({ error: "A PDF letöltés a Számlázz.hu számláknál érhető el. A Billingo számlát a Billingo felületén találod." }, 400);
      try {
        const pdf = await invoicePdf(env, o.invoice);
        return new Response(pdf, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="szamla-${String(o.invoice).replace(/[^\w.-]+/g, "_")}.pdf"`, "Cache-Control": "no-store" } });
      } catch (e) { return json({ error: e.message }, 502); }
    }

    if (method === "POST" && action === "resend") {
      if (!mailReady(env)) return json({ error: "Az e-mail küldés nincs beállítva (Gmail: SMTP_USER + SMTP_PASS)." }, 503);
      const r = await sendMail(env, s, { to: o.email, ...orderConfirmation(s, base, o) });
      if (!r.ok) return json({ error: r.error }, 502);
      o.data.emailed = { ...(o.data.emailed || {}), customer: nowIso() };
      await saveOrder(DB, o);
      return json({ ok: true });
    }
    return json({ error: "Ismeretlen művelet." }, 400);
  }

  if (head === "community" && method === "GET") {
    const { results: subs } = await DB.prepare("SELECT email, created_at, confirmed, unsubscribed, source FROM subscribers ORDER BY created_at DESC LIMIT 300").all();
    const stats = await DB.prepare("SELECT SUM(CASE WHEN confirmed = 1 AND unsubscribed = 0 THEN 1 ELSE 0 END) AS active, SUM(CASE WHEN confirmed = 0 THEN 1 ELSE 0 END) AS waiting, SUM(unsubscribed) AS gone FROM subscribers").first();
    const { results: alerts } = await DB.prepare("SELECT product_id AS id, COUNT(*) AS n, MAX(created_at) AS last FROM stock_alerts WHERE notified_at IS NULL GROUP BY product_id ORDER BY n DESC").all();
    const { results: reviews } = await DB.prepare("SELECT * FROM reviews ORDER BY CASE status WHEN 'pending' THEN 0 ELSE 1 END, created_at DESC LIMIT 200").all();
    const { results: messages } = await DB.prepare("SELECT * FROM messages ORDER BY CASE status WHEN 'new' THEN 0 ELSE 1 END, created_at DESC LIMIT 200").all();
    return json({
      subscribers: (subs || []).map(r => ({ email: r.email, createdAt: r.created_at, confirmed: !!r.confirmed, unsubscribed: !!r.unsubscribed, source: r.source || "" })),
      subStats: { active: Number(stats?.active) || 0, waiting: Number(stats?.waiting) || 0, gone: Number(stats?.gone) || 0 },
      alerts: (alerts || []).map(a => ({ id: a.id, count: a.n, last: a.last })),
      messages: (messages || []).map(m => ({ id: m.id, createdAt: m.created_at, name: m.name || "", email: m.email, subject: m.subject || "", body: m.body, productId: m.product_id || 0, status: m.status })),
      reviews: (reviews || []).map(r => ({ id: r.id, productId: r.product_id, name: r.name, rating: r.rating, title: r.title || "", body: r.body || "", email: r.email || "", orderId: r.order_id || "", verified: !!r.verified, status: r.status, createdAt: r.created_at, reply: r.reply || "" })),
      mail: mailReady(env)
    });
  }

  if (head === "subscribers.csv" && method === "GET") {
    const { results } = await DB.prepare("SELECT email, created_at, confirmed_at, source FROM subscribers WHERE confirmed = 1 AND unsubscribed = 0 ORDER BY created_at").all();
    return csv([["E-mail", "Feliratkozott", "Megerősítve", "Forrás"], ...(results || []).map(r => [r.email, huDate(r.created_at), huDate(r.confirmed_at), r.source || ""])], `nscard-hirlevel-${nowIso().slice(0, 10)}.csv`);
  }

  if (head === "subscribers" && id && method === "DELETE") {
    await DB.prepare("DELETE FROM subscribers WHERE email = ?").bind(String(id).toLowerCase()).run();
    return json({ ok: true });
  }

  if (head === "reviews" && id) {
    const rid = Number(id);
    if (method === "DELETE") { await DB.prepare("DELETE FROM reviews WHERE id = ?").bind(rid).run(); return json({ ok: true }); }
    if (method === "PATCH") {
      const b = await readJson(request) || {};
      if (["approved", "rejected", "pending"].includes(b.status)) await DB.prepare("UPDATE reviews SET status = ? WHERE id = ?").bind(b.status, rid).run();
      if (typeof b.reply === "string") await DB.prepare("UPDATE reviews SET reply = ? WHERE id = ?").bind(cleanText(b.reply, 1000) || null, rid).run();
      return json({ ok: true });
    }
  }

  if (head === "messages" && id) {
    const mid = Number(id);
    if (method === "DELETE") { await DB.prepare("DELETE FROM messages WHERE id = ?").bind(mid).run(); return json({ ok: true }); }
    if (method === "PATCH") {
      const b = await readJson(request) || {};
      if (["new", "read", "done"].includes(b.status)) await DB.prepare("UPDATE messages SET status = ? WHERE id = ?").bind(b.status, mid).run();
      return json({ ok: true });
    }
  }

  if (head === "newsletter" && method === "POST") {
    if (!mailReady(env)) return json({ error: "Az e-mail küldés nincs beállítva (Gmail: SMTP_USER + SMTP_PASS)." }, 503);
    const b = await readJson(request, 60000) || {};
    const subject = clean(b.subject, 140);
    const body = cleanText(b.body, 30000);
    if (!subject || body.length < 10) return json({ error: "Adj meg tárgyat és szöveget." }, 400);
    if (b.test) {
      if (!validEmail(b.test)) return json({ error: "A próba címzett e-mail címe hibás." }, 400);
      const m = newsletterEmail(s, base, { subject: `[Próba] ${subject}`, body }, "0".repeat(32));
      const r = await sendMail(env, s, { to: b.test, ...m });
      return r.ok ? json({ ok: true, sent: 1, test: true }) : json({ error: r.error }, 502);
    }
    /* egy hírlevél = tárgy + szöveg; aki már megkapta, annak nem megy újra – így a Gmail korlát miatt részletekben is küldhető */
    const campaign = (await sha256Hex(`${subject}\n${body}`)).slice(0, 24);
    const { results } = await DB.prepare("SELECT s.email, s.token FROM subscribers s WHERE s.confirmed = 1 AND s.unsubscribed = 0 AND NOT EXISTS (SELECT 1 FROM newsletter_sends n WHERE n.campaign = ? AND n.email = s.email)").bind(campaign).all();
    if (!results?.length) {
      const total = (await DB.prepare("SELECT COUNT(*) AS n FROM subscribers WHERE confirmed = 1 AND unsubscribed = 0").first())?.n || 0;
      return total ? json({ ok: true, sent: 0, left: 0, done: true }) : json({ error: "Még nincs megerősített feliratkozó." }, 400);
    }
    const msgs = results.map(r => ({ to: r.email, ...newsletterEmail(s, base, { subject, body }, r.token) }));
    const r = await sendMany(env, s, msgs.slice(0, BATCH_LIMIT));
    const ok = msgs.slice(0, BATCH_LIMIT).filter((m, i) => r.results[i]?.ok);
    if (ok.length) await DB.batch(ok.map(m => DB.prepare("INSERT OR IGNORE INTO newsletter_sends (campaign, email, sent_at) VALUES (?, ?, ?)").bind(campaign, m.to, nowIso())));
    const left = results.length - ok.length;
    return ok.length || !r.error ? json({ ok: true, sent: ok.length, left, error: r.error || "" }) : json({ error: r.error, sent: 0, left }, 502);
  }

  if (head === "notify" && method === "POST") {
    if (!mailReady(env)) return json({ ok: false, skipped: true, error: "Az e-mail küldés nincs beállítva." });
    const b = await readJson(request) || {};
    const fresh = await loadCatalog(request, env, { fresh: true });
    const sold = await soldSince(DB, fresh.settings?.stockSyncedAt);
    const ids = [...new Set((Array.isArray(b.ids) ? b.ids : []).map(Number).filter(Boolean))].slice(0, 50);
    let sent = 0;
    for (const pid of ids) {
      const p = fresh.products.find(x => Number(x.id) === pid && !x.hidden);
      const av = String(p?.availability || "").toLowerCase();
      if (!p || av === "coming_soon" || Number(p.stock) - (sold[pid] || 0) <= 0) continue;
      const { results } = await DB.prepare("SELECT id, email FROM stock_alerts WHERE product_id = ? AND notified_at IS NULL").bind(pid).all();
      if (!results?.length) continue;
      const img = absUrl(Array.isArray(p.images) ? p.images[0] : "", base);
      const m = backInStockEmail(fresh.settings || {}, base, p, img);
      const r = await sendBatch(env, fresh.settings || {}, results.map(x => ({ to: x.email, ...m })));
      if (r.sent) {
        await DB.batch(results.slice(0, r.sent).map(x => DB.prepare("UPDATE stock_alerts SET notified_at = ? WHERE id = ?").bind(nowIso(), x.id)));
        sent += r.sent;
      }
    }
    return json({ ok: true, sent });
  }

  return json({ error: "Ismeretlen admin végpont." }, 404);
}
