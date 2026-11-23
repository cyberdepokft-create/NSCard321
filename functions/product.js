/* Cloudflare Pages Function – a termékoldal címét, leírását, megosztási képét és schema.org adatait
 * már a szerver beírja a HTML-be (Google, Facebook, Messenger előnézet). Bármilyen hiba esetén a sima oldalt adja vissza. */
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

const fmtFt = v => `${Math.round(Number(v) || 0).toLocaleString("hu-HU")} Ft`;
const absUrl = (src, base) => { const s = String(src || "").trim(); if (!s) return ""; if (/^https?:/i.test(s)) return s; return base + "/" + s.replace(/^\.?\/+/, ""); };

export async function onRequestGet(context) {
  const { request, env } = context;
  const asset = await env.ASSETS.fetch(request);
  try {
    const id = Number(new URL(request.url).searchParams.get("id"));
    if (!id || !asset.ok || !(asset.headers.get("content-type") || "").includes("text/html")) return asset;
    const catalog = await loadCatalog(request, env);
    const p = (Array.isArray(catalog?.products) ? catalog.products : []).find(x => Number(x.id) === id && !x.hidden);
    if (!p) return asset;
    const cats = Array.isArray(catalog?.settings?.categories) ? catalog.settings.categories : [];
    const cat = cats.find(c => c.value === p.category)?.label || "Pokémon TCG";
    const title = `${p.name} – NS Card`;
    const desc = String(p.description || p.line || `${p.name} – ${cat} az NS Card webshopban. Ár: ${fmtFt(p.price)}.`).replace(/\s+/g, " ").slice(0, 160);
    const base = new URL(request.url).origin;
    const img = absUrl(Array.isArray(p.images) ? p.images[0] : "", base);
    const url = `${SITE}/product?id=${id}`;
    const soon = String(p.availability || "").toLowerCase() === "coming_soon";
    const ld = {
      "@context": "https://schema.org", "@type": "Product", name: p.name, sku: `NSC-${id}`, category: cat,
      image: (Array.isArray(p.images) ? p.images : []).map(x => absUrl(x, base)).filter(Boolean), description: desc,
      brand: { "@type": "Brand", name: "Pokémon TCG" },
      offers: { "@type": "Offer", url, priceCurrency: "HUF", price: Math.round(Number(p.price) || 0), itemCondition: "https://schema.org/NewCondition",
        availability: soon ? "https://schema.org/PreOrder" : Number(p.stock) > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock", seller: { "@type": "Organization", name: "NS Card" } }
    };
    const ldText = JSON.stringify(ld).replace(/</g, "\\u003c");
    const setContent = v => ({ element(el) { el.setAttribute("content", v); } });
    const res = new HTMLRewriter()
      .on("title", { element(el) { el.setInnerContent(title); } })
      .on('meta[name="description"]', setContent(desc))
      .on('meta[property="og:title"]', setContent(title))
      .on('meta[property="og:description"]', setContent(desc))
      .on('meta[property="og:type"]', setContent("product"))
      .on('meta[property="og:image"]', setContent(img || `${base}/img/brand/og.jpg`))
      .on("head", { element(el) { el.append(`<link rel="canonical" href="${url}"><meta property="og:url" content="${url}"><script type="application/ld+json" id="pdp-ld">${ldText}</script>`, { html: true }); } })
      .transform(asset);
    const out = new Response(res.body, res);
    out.headers.set("Cache-Control", "public, max-age=0, s-maxage=60");
    return out;
  } catch (err) {
    return asset;
  }
}
