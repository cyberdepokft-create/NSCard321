/* NS Card – közös szerver segédek a Cloudflare Pages Functions számára. */
export const SITE = "https://www.nscard.hu";

export const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), {
  status,
  headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers }
});

export const esc = v => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
export const int = (v, min = 0) => Math.max(min, Math.round(Number(v) || 0));
export const fmtFt = v => `${Math.round(Number(v) || 0).toLocaleString("hu-HU").replace(/ /g, " ")} Ft`;
export const validEmail = v => /^[^\s@<>"']{1,64}@[^\s@<>"']{1,190}\.[a-z]{2,}$/i.test(String(v || "").trim());
export const clean = (v, max = 200) => String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
export const cleanText = (v, max = 2000) => String(v ?? "").replace(/\r\n/g, "\n").replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, "").trim().slice(0, max);
export const nowIso = () => new Date().toISOString();

export function originOf(request) {
  const u = new URL(request.url);
  return u.origin;
}

export function clientIp(request) {
  return request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() || "0.0.0.0";
}

export async function readJson(request, max = 40000) {
  const len = Number(request.headers.get("Content-Length") || 0);
  if (len > max) return null;
  try {
    const text = await request.text();
    if (text.length > max) return null;
    return JSON.parse(text);
  } catch { return null; }
}

export async function sha256Hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(text)));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

export function randomToken(bytes = 18) {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return [...a].map(b => b.toString(16).padStart(2, "0")).join("");
}

/* ---------- katalógus ---------- */
let cfgCache = null;
export async function remoteConfig(request, env) {
  if (cfgCache) return cfgCache;
  let remote = null;
  try {
    const res = await env.ASSETS.fetch(new URL("/sync-config.json", originOf(request)));
    if (res.ok) remote = await res.json();
  } catch {}
  cfgCache = remote?.owner && remote?.repo ? {
    owner: String(remote.owner), repo: String(remote.repo), branch: String(remote.branch || "main"),
    path: String(remote.path || "public/store/catalog.json").replace(/^\/+/, "")
  } : { owner: "cyberdepokft-create", repo: "NSCard321", branch: "main", path: "public/store/catalog.json" };
  return cfgCache;
}

let catCache = { at: 0, data: null };
/* A publikált katalógus (GitHub), hiba esetén a telepített példány. fresh: a rendeléseknél mindig friss adat. */
export async function loadCatalog(request, env, { fresh = false } = {}) {
  if (!fresh && catCache.data && Date.now() - catCache.at < 20000) return catCache.data;
  const r = await remoteConfig(request, env);
  let data = null;
  const url = `https://raw.githubusercontent.com/${r.owner}/${r.repo}/${r.branch}/${r.path}?v=${fresh ? Date.now() : Math.floor(Date.now() / 30000)}`;
  try {
    const res = await fetch(url, { cf: { cacheTtl: fresh ? 0 : 30 } });
    if (res.ok) data = await res.json();
  } catch {}
  if (!data) {
    try {
      const local = await env.ASSETS.fetch(new URL("/store/catalog.json", originOf(request)));
      if (local.ok) data = await local.json();
    } catch {}
  }
  data = data && typeof data === "object" ? data : { products: [], settings: {} };
  if (!Array.isArray(data.products)) data.products = [];
  if (!data.settings || typeof data.settings !== "object") data.settings = {};
  catCache = { at: Date.now(), data };
  return data;
}

export function availabilityOf(p) {
  const v = String(p?.availability ?? p?.status ?? "").trim().toLowerCase();
  if (["preorder", "pre-order", "pre_order", "elorendeles", "előrendelés"].includes(v)) return "preorder";
  if (["coming_soon", "hamarosan", "soon"].includes(v)) return "coming_soon";
  if (!v && /hamarosan/i.test(String(p?.badge || ""))) return "coming_soon";
  return "in_stock";
}

export function productUrl(base, p) { return `${base}/product?id=${Number(p.id)}`; }

export function absUrl(src, base) {
  const s = String(src || "").trim();
  if (!s || /^data:/i.test(s)) return "";
  if (/^https?:/i.test(s)) return s;
  return `${base}/${s.replace(/^\.?\/+/, "")}`;
}

export function categoryLabel(settings, value) {
  const cats = Array.isArray(settings?.categories) ? settings.categories : [];
  return cats.find(c => c.value === value)?.label || "Pokémon TCG";
}

export function slugify(text) {
  return String(text || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

/* Egyszerű, biztonságos markdown → HTML (a bolt mdToHtml-jével azonos szabályok, plusz kép): ## cím, ### alcím, - lista, **félkövér**, [link](…), ![kép](https://…) */
export function mdToHtml(md, { imgStyle = "" } = {}) {
  const inline = t => esc(t)
    .replace(/!\[([^\]]*)\]\((https:\/\/[^\s)]+)\)/g, (m, alt, src) => `<img src="${src}" alt="${alt}" loading="lazy"${imgStyle ? ` style="${imgStyle}"` : ""}>`)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\(((?:https?:\/\/|mailto:|tel:|\/)[^)\s]+)\)/g, (m, a, href) => `<a href="${href}">${a}</a>`);
  const out = [];
  let para = [], list = null, ltype = "";
  const flushP = () => { if (para.length) { out.push(`<p>${para.map(inline).join("<br>")}</p>`); para = []; } };
  const flushL = () => { if (list) { out.push(`<${ltype}>${list.join("")}</${ltype}>`); list = null; } };
  for (const raw of String(md || "").replace(/\r\n/g, "\n").split("\n")) {
    const l = raw.trim();
    let m;
    if (!l) { flushP(); flushL(); continue; }
    if ((m = l.match(/^(#{1,3})\s+(.*)$/))) { flushP(); flushL(); out.push(m[1].length === 3 ? `<h3>${inline(m[2])}</h3>` : `<h2>${inline(m[2])}</h2>`); continue; }
    if ((m = l.match(/^[-*•]\s+(.*)$/)) || (m = l.match(/^\d+[.)]\s+(.*)$/))) {
      const type = /^\d/.test(l) ? "ol" : "ul";
      flushP();
      if (list && ltype !== type) flushL();
      ltype = type;
      (list = list || []).push(`<li>${inline(m[1])}</li>`);
      continue;
    }
    flushL();
    para.push(l);
  }
  flushP(); flushL();
  return out.join("\n");
}
