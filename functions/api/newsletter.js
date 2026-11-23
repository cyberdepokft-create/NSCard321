/* GET /api/newsletter?confirm=TOKEN | ?unsubscribe=TOKEN – megerősítés és leiratkozás, majd vissza a boltba. */
import { getDb } from "../../lib/db.js";
import { nowIso } from "../../lib/core.js";

export async function onRequestGet({ request, env }) {
  const u = new URL(request.url);
  const go = q => Response.redirect(`${u.origin}/?hirlevel=${q}`, 302);
  const DB = await getDb(env).catch(() => null);
  if (!DB) return go("hiba");
  const confirm = u.searchParams.get("confirm"), unsub = u.searchParams.get("unsubscribe");
  const token = String(confirm || unsub || "");
  if (!/^[a-f0-9]{16,64}$/.test(token)) return go("hiba");
  const row = await DB.prepare("SELECT email FROM subscribers WHERE token = ?").bind(token).first();
  if (!row) return go("hiba");
  if (confirm) { await DB.prepare("UPDATE subscribers SET confirmed = 1, unsubscribed = 0, confirmed_at = ? WHERE token = ?").bind(nowIso(), token).run(); return go("ok"); }
  await DB.prepare("UPDATE subscribers SET unsubscribed = 1 WHERE token = ?").bind(token).run();
  return go("leiratkozva");
}

/* Egy kattintásos leiratkozás (List-Unsubscribe-Post) */
export async function onRequestPost(ctx) { return onRequestGet(ctx); }
