/* Admin azonosítás, kétféleképpen:
 * 1) Szerveres belépés (ajánlott): a Cloudflare-ben beállított ADMIN_PASSWORD (és opcionálisan ADMIN_USER) titokkal.
 *    Sikeres belépés után a szerver aláírt munkamenet-tokent ad („nsc1.…”), a publikálást pedig a szerver végzi
 *    a Cloudflare-ben tárolt GITHUB_TOKEN-nel – így a böngészőben nincs GitHub token, és bármelyik eszközről működik.
 * 2) Régi mód: az admin a saját GitHub tokenjét küldi; a szerver ellenőrzi, hogy tud-e írni a bolt repójába. */
import { remoteConfig, sha256Hex } from "./core.js";

const enc = new TextEncoder();
const cache = new Map();

const b64u = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64u = s => {
  const t = s.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(t + "=".repeat((4 - (t.length % 4)) % 4)), c => c.charCodeAt(0));
};

export const serverAuthReady = env => !!String(env.ADMIN_PASSWORD || "").length;
export const adminUserName = env => String(env.ADMIN_USER || "NSadmin").trim();

/* Az aláíró kulcs a jelszóból (és az opcionális SESSION_SECRET-ből) származik: jelszócserekor minden munkamenet lejár. */
async function sessionKey(env) {
  const raw = await crypto.subtle.digest("SHA-256", enc.encode(`nsc-admin-session|${env.SESSION_SECRET || ""}|${adminUserName(env).toLowerCase()}|${env.ADMIN_PASSWORD}`));
  return crypto.subtle.importKey("raw", raw, { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function issueSession(env, days) {
  const exp = Date.now() + Math.round(days * 864e5);
  const payload = b64u(enc.encode(JSON.stringify({ u: adminUserName(env), exp })));
  const sig = b64u(await crypto.subtle.sign("HMAC", await sessionKey(env), enc.encode(payload)));
  return { token: `nsc1.${payload}.${sig}`, exp };
}

export async function verifySession(env, token) {
  if (!serverAuthReady(env)) return false;
  const m = /^nsc1\.([A-Za-z0-9_-]{10,400})\.([A-Za-z0-9_-]{20,100})$/.exec(String(token || ""));
  if (!m) return false;
  try {
    if (!(await crypto.subtle.verify("HMAC", await sessionKey(env), fromB64u(m[2]), enc.encode(m[1])))) return false;
    const p = JSON.parse(new TextDecoder().decode(fromB64u(m[1])));
    return Number(p.exp) > Date.now() && String(p.u).toLowerCase() === adminUserName(env).toLowerCase();
  } catch { return false; }
}

/* Időben állandó összehasonlítás: a két érték SHA-256 lenyomatát hasonlítjuk össze bájtonként. */
async function sameSecret(a, b) {
  const [x, y] = await Promise.all([a, b].map(v => crypto.subtle.digest("SHA-256", enc.encode(String(v)))));
  const p = new Uint8Array(x), q = new Uint8Array(y);
  let diff = 0;
  for (let i = 0; i < p.length; i++) diff |= p[i] ^ q[i];
  return diff === 0;
}

/* A felhasználónév kis- és nagybetűre nem érzékeny (a telefon billentyűzete nagybetűvel kezdi), a jelszó igen. */
export async function checkAdminPassword(env, user, pass) {
  if (!serverAuthReady(env)) return false;
  const okUser = await sameSecret(String(user || "").trim().toLowerCase(), adminUserName(env).toLowerCase());
  const okPass = await sameSecret(String(pass || ""), String(env.ADMIN_PASSWORD));
  return okUser && okPass;
}

export const bearerOf = request => String(request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();

export async function isAdmin(request, env) {
  const token = bearerOf(request);
  if (token.startsWith("nsc1.")) return verifySession(env, token);
  if (token.length < 20 || token.length > 400) return false;
  const key = await sha256Hex(token);
  const hit = cache.get(key);
  if (hit && hit.exp > Date.now()) return hit.ok;
  const r = await remoteConfig(request, env);
  let ok = false;
  try {
    const res = await fetch(`https://api.github.com/repos/${encodeURIComponent(r.owner)}/${encodeURIComponent(r.repo)}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "nscard-webshop" }
    });
    if (res.ok) ok = !!(await res.json())?.permissions?.push;
  } catch {}
  if (cache.size > 200) cache.clear();
  cache.set(key, { ok, exp: Date.now() + (ok ? 10 : 1) * 60000 });
  return ok;
}
