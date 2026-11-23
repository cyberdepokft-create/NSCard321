/* Cloudflare Pages Function – a termékoldal címét, leírását, megosztási képét és schema.org adatait
 * már a szerver beírja a HTML-be (Google, Facebook, Messenger előnézet). Bármilyen hiba esetén a sima oldalt adja vissza. */
import { SITE, loadCatalog, availabilityOf } from "../lib/core.js";
import { getDb } from "../lib/db.js";
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
    const av = availabilityOf(p);
    let rating = null;
    try {
      const DB = await getDb(env);
      if (DB) {
        const r = await DB.prepare("SELECT COUNT(*) AS n, ROUND(AVG(rating), 1) AS avg FROM reviews WHERE product_id = ? AND status = 'approved'").bind(id).first();
        if (Number(r?.n) > 0) rating = { "@type": "AggregateRating", ratingValue: Number(r.avg), reviewCount: Number(r.n), bestRating: 5, worstRating: 1 };
      }
    } catch {}
    const used = ["LP", "MP", "HP", "DMG"].includes(String(p.condition || "").toUpperCase());
    const ld = {
      "@context": "https://schema.org", "@type": "Product", name: p.name, sku: `NSC-${id}`, category: cat, ...(p.ean ? { gtin13: String(p.ean) } : {}),
      image: (Array.isArray(p.images) ? p.images : []).map(x => absUrl(x, base)).filter(Boolean), description: desc,
      brand: { "@type": "Brand", name: "Pokémon TCG" },
      offers: { "@type": "Offer", url, priceCurrency: "HUF", price: Math.round(Number(p.price) || 0), itemCondition: used ? "https://schema.org/UsedCondition" : "https://schema.org/NewCondition",
        availability: av !== "in_stock" ? "https://schema.org/PreOrder" : Number(p.stock) > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock", seller: { "@type": "Organization", name: "NS Card" } },
      ...(rating ? { aggregateRating: rating } : {})
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
