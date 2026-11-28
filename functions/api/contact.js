/* POST /api/contact – üzenet a kapcsolat űrlapról. Az admin Közösség → Üzenetek fülén jelenik meg, és e-mailben is értesít. */
import { json, readJson, clientIp, clean, cleanText, validEmail, nowIso, loadCatalog, originOf } from "../../lib/core.js";
import { getDb, rateLimit } from "../../lib/db.js";
import { sendMany, contactAdminEmail, contactAutoReply, mailReady, shopEmail } from "../../lib/mail.js";

export async function onRequestPost({ request, env }) {
  const DB = await getDb(env).catch(() => null);
  if (!DB) return json({ error: "Az üzenetküldés még nincs bekapcsolva.", fallback: true }, 503);
  const b = await readJson(request, 12000);
  if (!b) return json({ error: "Hibás kérés." }, 400);
  if (b.website) return json({ ok: true });
  const m = { name: clean(b.name, 80), email: String(b.email || "").trim().toLowerCase(), subject: clean(b.subject, 120), body: cleanText(b.message, 4000), productId: Number(b.productId) || null };
  if (!m.name) return json({ error: "Add meg a neved." }, 400);
  if (!validEmail(m.email)) return json({ error: "Adj meg érvényes e-mail címet, hogy válaszolni tudjunk." }, 400);
  if (m.body.length < 5) return json({ error: "Írd meg az üzeneted." }, 400);
  if (!(await rateLimit(DB, `contact:${clientIp(request)}`, 5, 3600))) return json({ error: "Túl sok üzenet rövid idő alatt. Próbáld újra később." }, 429);
  await DB.prepare("INSERT INTO messages (created_at, name, email, subject, body, product_id, status) VALUES (?, ?, ?, ?, ?, ?, 'new')")
    .bind(nowIso(), m.name, m.email, m.subject || null, m.body, m.productId).run();
  const catalog = await loadCatalog(request, env).catch(() => ({ products: [], settings: {} }));
  const s = catalog.settings || {};
  const base = originOf(request);
  const pname = m.productId ? catalog.products.find(p => Number(p.id) === m.productId)?.name || "" : "";
  let mailed = false;
  if (mailReady(env)) {
    const to = shopEmail(env, s);
    const msgs = [{ to: m.email, ...contactAutoReply(s, base, m) }];
    if (to) msgs.unshift({ to, ...contactAdminEmail(s, base, m, pname), replyTo: m.email });
    const r = await sendMany(env, s, msgs);
    mailed = to ? !!r.results[0]?.ok : false;
  }
  return json({ ok: true, mailed });
}

export const onRequest = () => json({ error: "Csak POST kérés engedélyezett." }, 405);
