/* GET /api/reviews?product=ID | ?latest=6 – jóváhagyott vélemények; POST – új vélemény (moderálás után jelenik meg). */
import { json, readJson, clientIp, clean, cleanText, validEmail, nowIso, loadCatalog, originOf } from "../../lib/core.js";
import { getDb, rateLimit } from "../../lib/db.js";
import { sendMail, reviewAdminEmail } from "../../lib/mail.js";

const pub = r => ({ id: r.id, productId: r.product_id, name: r.name, rating: r.rating, title: r.title || "", body: r.body || "", verified: !!r.verified, date: r.created_at, reply: r.reply || "" });

export async function onRequestGet({ request, env }) {
  const DB = await getDb(env).catch(() => null);
  if (!DB) return json({ reviews: [], avg: 0, count: 0 }, 200, { "Cache-Control": "public, max-age=60" });
  const u = new URL(request.url);
  const id = Number(u.searchParams.get("product"));
  if (id) {
    const { results } = await DB.prepare("SELECT * FROM reviews WHERE product_id = ? AND status = 'approved' ORDER BY created_at DESC LIMIT 60").bind(id).all();
    const list = (results || []).map(pub);
    const avg = list.length ? Math.round(list.reduce((a, r) => a + r.rating, 0) / list.length * 10) / 10 : 0;
    return json({ reviews: list, avg, count: list.length }, 200, { "Cache-Control": "public, max-age=30" });
  }
  const n = Math.min(12, Math.max(1, Number(u.searchParams.get("latest")) || 6));
  const { results } = await DB.prepare("SELECT * FROM reviews WHERE status = 'approved' AND rating >= 4 ORDER BY created_at DESC LIMIT ?").bind(n).all();
  const tot = await DB.prepare("SELECT COUNT(*) AS n, ROUND(AVG(rating), 2) AS avg FROM reviews WHERE status = 'approved'").first();
  return json({ reviews: (results || []).map(pub), count: Number(tot?.n) || 0, avg: Number(tot?.avg) || 0 }, 200, { "Cache-Control": "public, max-age=60" });
}

export async function onRequestPost({ request, env }) {
  const DB = await getDb(env).catch(() => null);
  if (!DB) return json({ error: "Az értékelés még nincs bekapcsolva." }, 503);
  const b = await readJson(request, 8000);
  if (!b) return json({ error: "Hibás kérés." }, 400);
  if (b.website) return json({ ok: true });
  const id = Number(b.productId);
  const rating = Math.round(Number(b.rating));
  const name = clean(b.name, 60);
  const text = cleanText(b.body, 1500);
  const email = String(b.email || "").trim().toLowerCase();
  const orderId = clean(b.orderId, 24).toUpperCase();
  if (!(rating >= 1 && rating <= 5)) return json({ error: "Válassz 1–5 csillagot." }, 400);
  if (!name) return json({ error: "Add meg a neved (a vélemény mellett ez jelenik meg)." }, 400);
  if (text.length < 10) return json({ error: "Írj legalább egy rövid mondatot a termékről." }, 400);
  if (email && !validEmail(email)) return json({ error: "Az e-mail cím formátuma hibás." }, 400);
  const catalog = await loadCatalog(request, env);
  const p = catalog.products.find(x => Number(x.id) === id && !x.hidden);
  if (!p) return json({ error: "Ismeretlen termék." }, 404);
  if (!(await rateLimit(DB, `review:${clientIp(request)}`, 5, 3600))) return json({ error: "Túl sok vélemény rövid idő alatt. Próbáld újra később." }, 429);
  let verified = 0;
  if (email && orderId) {
    const hit = await DB.prepare("SELECT o.id FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.id = ? AND o.email = ? AND i.product_id = ? AND o.status != 'cancelled' LIMIT 1").bind(orderId, email, id).first();
    verified = hit ? 1 : 0;
  }
  const r = { product_id: id, name, rating, title: clean(b.title, 100), body: text, email: email || null, order_id: orderId || null, verified, created_at: nowIso() };
  await DB.prepare("INSERT INTO reviews (product_id, name, rating, title, body, email, order_id, verified, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)")
    .bind(r.product_id, r.name, r.rating, r.title, r.body, r.email, r.order_id, r.verified, r.created_at).run();
  const s = catalog.settings || {};
  const to = env.ADMIN_EMAIL || s.email;
  if (to) { try { await sendMail(env, s, { to, ...reviewAdminEmail(s, originOf(request), r, p.name) }); } catch {} }
  return json({ ok: true, verified: !!verified });
}
