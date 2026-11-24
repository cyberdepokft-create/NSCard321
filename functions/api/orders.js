/* POST /api/orders – rendelés leadása átutalással vagy utánvéttel.
 * A szerver a publikált katalógusból számol árat, ellenőrzi és lefoglalja a készletet, majd e-mailt küld.
 * Adatbázis nélkül 503-at ad: ilyenkor a bolt a régi, levelezős rendelésre vált. */
import { json, readJson, loadCatalog, clientIp, originOf } from "../../lib/core.js";
import { getDb, rateLimit } from "../../lib/db.js";
import { priceOrder, sanitizeCustomer, validateCustomer, insertOrder, availableMap } from "../../lib/orders.js";
import { sendOrderMails } from "../../lib/flow.js";
import { mailReady } from "../../lib/mail.js";

export async function onRequestPost({ request, env }) {
  const DB = await getDb(env).catch(() => null);
  if (!DB) return json({ error: "Az online rendelés még nincs bekapcsolva.", fallback: true }, 503);
  const body = await readJson(request);
  if (!body) return json({ error: "Hibás kérés." }, 400);
  if (body.website) return json({ ok: true, id: "NSC-0" });
  if (!(await rateLimit(DB, `order:${clientIp(request)}`, 8, 600))) return json({ error: "Túl sok rendelés rövid idő alatt. Próbáld újra néhány perc múlva." }, 429);
  if (body.pay === "card") return json({ error: "A kártyás fizetés a /api/create-checkout-session címen indul." }, 400);

  const catalog = await loadCatalog(request, env, { fresh: true });
  const s = catalog.settings || {};
  const sold = await availableMap(DB, catalog);
  const priced = priceOrder(catalog, body, sold);
  if (!priced.ok) return json({ error: priced.error, productId: priced.productId, left: priced.left }, priced.status);
  const customer = sanitizeCustomer(body.customer, priced.method);
  const bad = validateCustomer(customer, priced.method);
  if (bad) return json({ error: bad }, 400);

  const o = await insertOrder(DB, priced, customer, { status: "new" });
  const full = { id: o.id, createdAt: o.createdAt, status: o.status, paid: false, email: customer.email, data: o.data };
  try { await sendOrderMails(DB, env, s, originOf(request), full); } catch {}
  return json({
    ok: true, id: o.id, total: priced.total, pay: priced.pay, method: priced.method, preorder: priced.preorder,
    emailed: !!full.data.emailed?.customer, mail: mailReady(env), bankDetails: priced.pay === "transfer" ? String(s.bankDetails || "") : "",
    token: o.data.token, gift: priced.gift
  });
}

export const onRequest = () => json({ error: "Csak POST kérés engedélyezett." }, 405);
