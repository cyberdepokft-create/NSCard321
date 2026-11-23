/* Termék feedek az ár-összehasonlítókhoz és a Google Merchant Centerhez (a publikált katalógusból, élő készlettel). */
import { loadCatalog, absUrl, categoryLabel, availabilityOf, int } from "./core.js";
import { getDb, soldSince } from "./db.js";

export const x = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");
export const plain = s => String(s || "").replace(/\*\*|##+|\[|\]\([^)]*\)/g, "").replace(/\s+/g, " ").trim();

export async function feedData(request, env) {
  const catalog = await loadCatalog(request, env);
  const s = catalog.settings || {};
  let sold = {};
  try { const DB = await getDb(env); if (DB) sold = await soldSince(DB, s.stockSyncedAt); } catch {}
  const base = "https://www.nscard.hu";
  const origin = new URL(request.url).origin;
  const products = catalog.products.filter(p => p && !p.hidden && p.name && int(p.price) > 0).map(p => {
    const av = availabilityOf(p);
    const stock = Math.max(0, int(p.stock) - int(sold[p.id]));
    const images = (Array.isArray(p.images) ? p.images : []).map(i => absUrl(i, origin)).filter(Boolean);
    return {
      p, av, stock, images, url: `${base}/product?id=${Number(p.id)}`, cat: categoryLabel(s, p.category),
      desc: plain(p.description || p.line || p.name).slice(0, 4900),
      inStock: av !== "coming_soon" && stock > 0
    };
  });
  const shipMin = [s.shipHome !== false ? int(s.shippingHome ?? 2500) : null, s.shipLocker !== false ? int(s.shippingLocker ?? 2500) : null].filter(v => v !== null);
  return { s, products, shipFrom: shipMin.length ? Math.min(...shipMin) : 0 };
}

export const xmlResponse = body => new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=900" } });
