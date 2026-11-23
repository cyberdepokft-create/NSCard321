/* POST /api/subscribe – hírlevél feliratkozás. E-mail küldéssel dupla megerősítés, anélkül azonnali (kifejezett hozzájárulással). */
import { json, readJson, clientIp, validEmail, nowIso, randomToken, originOf, loadCatalog, clean } from "../../lib/core.js";
import { getDb, rateLimit } from "../../lib/db.js";
import { mailReady, sendMail, confirmSubscribeEmail } from "../../lib/mail.js";

export async function onRequestPost({ request, env }) {
  const DB = await getDb(env).catch(() => null);
  if (!DB) return json({ error: "A hírlevél még nincs bekapcsolva." }, 503);
  const body = await readJson(request, 4000);
  if (!body) return json({ error: "Hibás kérés." }, 400);
  if (body.website) return json({ ok: true });
  const email = String(body.email || "").trim().toLowerCase();
  if (!validEmail(email)) return json({ error: "Adj meg érvényes e-mail címet." }, 400);
  if (body.consent !== true) return json({ error: "A feliratkozáshoz fogadd el az adatkezelést." }, 400);
  if (!(await rateLimit(DB, `sub:${clientIp(request)}`, 6, 3600))) return json({ error: "Túl sok próbálkozás. Próbáld újra később." }, 429);

  const existing = await DB.prepare("SELECT * FROM subscribers WHERE email = ?").bind(email).first();
  const double = mailReady(env);
  if (existing?.confirmed && !existing.unsubscribed) return json({ ok: true, already: true });
  const token = existing?.token || randomToken(16);
  const at = nowIso();
  if (existing) await DB.prepare("UPDATE subscribers SET unsubscribed = 0, confirmed = ?, confirmed_at = ?, source = ? WHERE email = ?").bind(double ? 0 : 1, double ? null : at, clean(body.source, 40), email).run();
  else await DB.prepare("INSERT INTO subscribers (email, created_at, confirmed, token, source, confirmed_at) VALUES (?, ?, ?, ?, ?, ?)").bind(email, at, double ? 0 : 1, token, clean(body.source, 40), double ? null : at).run();
  if (double) {
    const catalog = await loadCatalog(request, env).catch(() => ({ settings: {} }));
    const r = await sendMail(env, catalog.settings, { to: email, ...confirmSubscribeEmail(catalog.settings, originOf(request), token) });
    if (!r.ok) {
      await DB.prepare("UPDATE subscribers SET confirmed = 1, confirmed_at = ? WHERE email = ?").bind(at, email).run();
      return json({ ok: true, confirm: false });
    }
  }
  return json({ ok: true, confirm: double });
}

export const onRequest = () => json({ error: "Csak POST kérés engedélyezett." }, 405);
