/* GET /api/order-status?id=NSC-…&t=TOKEN  vagy  POST {id, email} – a vásárló a rendelése állapotát nézheti meg.
 * Személyes adatot (cím, telefon) nem ad vissza. */
import { json, readJson, clientIp, originOf } from "../../lib/core.js";
import { getDb, rateLimit } from "../../lib/db.js";
import { getOrder, publicOrder } from "../../lib/orders.js";

async function find(request, env, id, check) {
  const DB = await getDb(env).catch(() => null);
  if (!DB) return json({ error: "A rendelés követés még nincs bekapcsolva. Írj nekünk, és megnézzük." }, 503);
  if (!(await rateLimit(DB, `track:${clientIp(request)}`, 30, 600))) return json({ error: "Túl sok próbálkozás. Próbáld újra néhány perc múlva." }, 429);
  const o = /^NSC-\d{6}-\d{4}$/.test(String(id || "").toUpperCase()) ? await getOrder(DB, String(id).toUpperCase()) : null;
  if (!o || !check(o)) return json({ error: "Nem találjuk ezt a rendelést. Ellenőrizd a rendelésszámot és az e-mail címet." }, 404);
  return json({ order: publicOrder(o, originOf(request)) });
}

export const onRequestGet = ({ request, env }) => {
  const u = new URL(request.url);
  const t = u.searchParams.get("t") || "";
  return find(request, env, u.searchParams.get("id"), o => t.length >= 16 && o.data?.token === t);
};

export async function onRequestPost({ request, env }) {
  const b = await readJson(request, 2000) || {};
  const email = String(b.email || "").trim().toLowerCase();
  return find(request, env, b.id, o => !!email && String(o.email || "").toLowerCase() === email);
}
