/* Admin azonosítás: az admin a saját GitHub tokenjét küldi (amivel publikál is).
 * A szerver ellenőrzi, hogy a token tud-e írni a bolt repójába. Az eredmény 10 percig gyorsítótárazva. */
import { remoteConfig, sha256Hex } from "./core.js";

const cache = new Map();

export async function isAdmin(request, env) {
  const token = String(request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
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
