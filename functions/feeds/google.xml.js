/* /feeds/google.xml – Google Merchant Center termék feed (RSS 2.0). Merchant Center → Termékek → Feedek → Ütemezett lekérés. */
import { feedData, x, xmlResponse } from "../../lib/feeds.js";

const CONDITION_USED = ["LP", "MP", "HP", "DMG"];
export async function onRequestGet({ request, env }) {
  const { s, products, shipFrom } = await feedData(request, env);
  const free = Number(s.freeShippingFrom) || 0;
  const items = products.map(({ p, av, inStock, images, url, cat, desc }) => {
    const availability = av === "preorder" && inStock ? "preorder" : inStock ? "in_stock" : av === "coming_soon" ? "preorder" : "out_of_stock";
    const sale = p.oldPrice && Number(p.oldPrice) > Number(p.price);
    const date = /^\d{4}-\d{2}-\d{2}$/.test(String(p.releaseDate || "")) ? `${p.releaseDate}T00:00+01:00` : "";
    return `<item>
  <g:id>NSC-${Number(p.id)}</g:id>
  <title>${x(p.name)}</title>
  <description>${x(desc)}</description>
  <link>${x(url)}</link>
  ${images[0] ? `<g:image_link>${x(images[0])}</g:image_link>` : ""}
  ${images.slice(1, 10).map(i => `<g:additional_image_link>${x(i)}</g:additional_image_link>`).join("")}
  <g:availability>${availability}</g:availability>
  ${date && availability === "preorder" ? `<g:availability_date>${date}</g:availability_date>` : ""}
  <g:price>${Math.round(sale ? p.oldPrice : p.price)} HUF</g:price>
  ${sale ? `<g:sale_price>${Math.round(p.price)} HUF</g:sale_price>` : ""}
  <g:brand>Pokémon</g:brand>
  ${p.ean ? `<g:gtin>${x(p.ean)}</g:gtin>` : "<g:identifier_exists>no</g:identifier_exists>"}
  <g:condition>${CONDITION_USED.includes(String(p.condition || "").toUpperCase()) ? "used" : "new"}</g:condition>
  <g:google_product_category>Arts &amp; Entertainment &gt; Hobbies &amp; Creative Arts &gt; Collectibles &gt; Collectible Trading Cards</g:google_product_category>
  <g:product_type>${x(`Pokémon TCG > ${cat}`)}</g:product_type>
  <g:shipping><g:country>HU</g:country><g:price>${free && Number(p.price) >= free ? 0 : shipFrom} HUF</g:price></g:shipping>
</item>`;
  }).join("\n");
  return xmlResponse(`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel>
<title>${x(s.shopName || "NS Card")}</title><link>https://www.nscard.hu/</link><description>Pokémon TCG termékek</description>
${items}
</channel></rss>`);
}
