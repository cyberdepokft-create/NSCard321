/* Cloudflare Pages Function – /sitemap.xml a publikált katalógusból (termékek, kategóriák, tájékoztató oldalak). */
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

const xmlEsc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function onRequestGet({ request, env }) {
  let catalog = {};
  try { catalog = await loadCatalog(request, env); } catch {}
  const products = (Array.isArray(catalog.products) ? catalog.products : []).filter(p => p && !p.hidden && p.name);
  const settings = catalog.settings || {};
  const lastmod = (catalog.updatedAt || new Date().toISOString()).slice(0, 10);
  const urls = [
    { loc: `${SITE}/`, pr: "1.0" },
    { loc: `${SITE}/products`, pr: "0.9" },
    ...(Array.isArray(settings.categories) ? settings.categories : []).filter(c => c && !c.hidden && products.some(p => p.category === c.value)).map(c => ({ loc: `${SITE}/products?cat=${encodeURIComponent(c.value)}`, pr: "0.7" })),
    ...products.map(p => ({ loc: `${SITE}/product?id=${Number(p.id)}`, pr: "0.8" })),
    ...Object.keys(settings.pages || {}).map(k => ({ loc: `${SITE}/info?p=${encodeURIComponent(k)}`, pr: "0.3" }))
  ];
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${xmlEsc(u.loc)}</loc><lastmod>${lastmod}</lastmod><priority>${u.pr}</priority></url>`).join("\n")}\n</urlset>\n`;
  return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=600" } });
}
