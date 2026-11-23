/* Cloudflare Pages Function – kategória oldalak (/products?cat=…) címe, leírása és kanonikus címe már a szerveren
 * (Google találatok, megosztási előnézet). Hiba esetén a sima oldalt adja vissza. */
const SITE = "https://www.nscard.hu";
async function loadCatalog(request, env) {
  const origin = new URL(request.url).origin;
  let remote = null;
  try {
    const cfg = await env.ASSETS.fetch(new URL("/sync-config.json", origin));
    if (cfg.ok) remote = await cfg.json();
  } catch {}
  if (remote?.owner && remote?.repo) {
    const path = String(remote.path || "public/store/catalog.json").replace(/^\/+/, "");
    const url = `https://raw.githubusercontent.com/${remote.owner}/${remote.repo}/${remote.branch || "main"}/${path}?m=${Math.floor(Date.now() / 60000)}`;
    try {
      const res = await fetch(url, { cf: { cacheTtl: 60, cacheEverything: true } });
      if (res.ok) return await res.json();
    } catch {}
  }
  const local = await env.ASSETS.fetch(new URL("/store/catalog.json", origin));
  return local.json();
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const asset = await env.ASSETS.fetch(request);
  try {
    const url = new URL(request.url);
    const cat = url.searchParams.get("cat");
    if (!cat || !asset.ok || !(asset.headers.get("content-type") || "").includes("text/html")) return asset;
    const catalog = await loadCatalog(request, env);
    const c = (Array.isArray(catalog?.settings?.categories) ? catalog.settings.categories : []).find(x => x.value === cat && !x.hidden);
    if (!c) return asset;
    const items = (Array.isArray(catalog.products) ? catalog.products : []).filter(p => p.category === cat && !p.hidden && p.name);
    const title = `${c.label} – NS Card`;
    const desc = String(c.desc || `${c.label}: ${items.length} Pokémon TCG termék az NS Card webshopban. Gyors szállítás, átlátható árak.`).slice(0, 160);
    const img = items.map(p => Array.isArray(p.images) ? p.images[0] : "").find(Boolean) || "";
    const imgAbs = img ? (/^https?:/.test(img) ? img : `${url.origin}/${String(img).replace(/^\.?\/+/, "")}`) : `${url.origin}/img/brand/og.jpg`;
    const canon = `${SITE}/products?cat=${encodeURIComponent(cat)}`;
    const setContent = v => ({ element(el) { el.setAttribute("content", v); } });
    const res = new HTMLRewriter()
      .on("title", { element(el) { el.setInnerContent(title); } })
      .on('meta[name="description"]', setContent(desc))
      .on('meta[property="og:title"]', setContent(title))
      .on('meta[property="og:description"]', setContent(desc))
      .on('meta[property="og:image"]', setContent(imgAbs))
      .on('link[rel="canonical"]', { element(el) { el.setAttribute("href", canon); } })
      .transform(asset);
    const out = new Response(res.body, res);
    out.headers.set("Cache-Control", "public, max-age=0, s-maxage=60");
    return out;
  } catch {
    return asset;
  }
}
