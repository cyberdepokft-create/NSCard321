/* /api/admin-login – szerveres admin belépés a Cloudflare-ben tárolt ADMIN_PASSWORD (és ADMIN_USER) alapján.
 * GET  → { configured, github }  (be van-e állítva a szerveres belépés és a GITHUB_TOKEN)
 * POST { user, pass, remember } → { ok, token, exp, user, github }
 * Próbálkozás-korlát: IP-nként 10 hibás próbálkozás 15 percenként (adatbázissal tartósan, nélküle példányonként). */
import { json, readJson, clientIp } from "../../lib/core.js";
import { getDb, rateLimit } from "../../lib/db.js";
import { serverAuthReady, checkAdminPassword, issueSession, adminUserName } from "../../lib/auth.js";

const WINDOW = 15 * 60, LIMIT = 10;
const mem = new Map();
function memAllow(key) {
  const now = Date.now();
  const e = mem.get(key);
  if (!e || e.reset < now) { mem.set(key, { n: 0, reset: now + WINDOW * 1000 }); return true; }
  return e.n < LIMIT;
}
function memFail(key) {
  const e = mem.get(key);
  if (e) e.n++;
  if (mem.size > 5000) mem.clear();
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function onRequestGet({ env }) {
  return json({ configured: serverAuthReady(env), github: !!env.GITHUB_TOKEN });
}

export async function onRequestPost({ request, env }) {
  if (!serverAuthReady(env)) return json({ configured: false, error: "A szerveres belépés nincs beállítva." }, 501);
  const ip = clientIp(request);
  const key = `login:${ip}`;
  if (!memAllow(key)) return json({ error: "Túl sok sikertelen próbálkozás. Próbáld újra 15 perc múlva." }, 429);
  const DB = await getDb(env).catch(() => null);
  const body = await readJson(request, 4000);
  if (!body) return json({ error: "Hibás kérés." }, 400);
  const ok = await checkAdminPassword(env, body.user, body.pass);
  if (!ok) {
    memFail(key);
    /* tartós számláló csak a hibás próbálkozásokra: a sikeres belépést nem korlátozza */
    if (DB && !(await rateLimit(DB, key, LIMIT, WINDOW))) return json({ error: "Túl sok sikertelen próbálkozás. Próbáld újra 15 perc múlva." }, 429);
    await sleep(450);
    return json({ error: "Hibás felhasználónév vagy jelszó." }, 401);
  }
  if (DB) {
    try {
      const row = await DB.prepare("SELECT n, reset FROM rate WHERE k = ?").bind(key).first();
      if (row && row.reset > Math.floor(Date.now() / 1000) && row.n >= LIMIT) return json({ error: "Túl sok sikertelen próbálkozás. Próbáld újra 15 perc múlva." }, 429);
    } catch {}
  }
  const s = await issueSession(env, body.remember ? 30 : 0.5);
  return json({ ok: true, token: s.token, exp: s.exp, user: adminUserName(env), github: !!env.GITHUB_TOKEN });
}
