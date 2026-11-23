/* POST /api/notify – „Értesíts, ha újra kapható” feliratkozás egy termékre. */
import { json, readJson, clientIp, validEmail, nowIso, loadCatalog } from "../../lib/core.js";
import { getDb, rateLimit } from "../../lib/db.js";

export async function onRequestPost({ request, env }) {
  const DB = await getDb(env).catch(() => null);
  if (!DB) return json({ error: "Az értesítő még nincs bekapcsolva." }, 503);
  const body = await readJson(request, 4000);
  if (!body) return json({ error: "Hibás kérés." }, 400);
  if (body.website) return json({ ok: true });
  const email = String(body.email || "").trim().toLowerCase();
  const id = Number(body.productId);
  if (!validEmail(email)) return json({ error: "Adj meg érvényes e-mail címet." }, 400);
  const catalog = await loadCatalog(request, env);
  if (!catalog.products.some(p => Number(p.id) === id && !p.hidden)) return json({ error: "Ismeretlen termék." }, 404);
  if (!(await rateLimit(DB, `notify:${clientIp(request)}`, 15, 3600))) return json({ error: "Túl sok próbálkozás. Próbáld újra később." }, 429);
  await DB.prepare("INSERT INTO stock_alerts (email, product_id, created_at) VALUES (?, ?, ?) ON CONFLICT(email, product_id) DO UPDATE SET notified_at = NULL, created_at = excluded.created_at")
    .bind(email, id, nowIso()).run();
  return json({ ok: true });
}

export const onRequest = () => json({ error: "Csak POST kérés engedélyezett." }, 405);
