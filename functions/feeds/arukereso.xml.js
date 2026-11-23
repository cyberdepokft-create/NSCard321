/* /feeds/arukereso.xml – Árukereső terméklista (XML). Partner Portál → Megjelenítési beállítások → Terméklista forrása. */
import { feedData, x, xmlResponse } from "../../lib/feeds.js";

export async function onRequestGet({ request, env }) {
  const { s, products, shipFrom } = await feedData(request, env);
  const free = Number(s.freeShippingFrom) || 0;
  const vat = s.vatRate === "AAM" ? 0 : 0.27;
  const days = String(s.deliveryText || "1–3 munkanap");
  const items = products.filter(f => f.inStock || f.av === "preorder").map(({ p, images, url, cat, desc }) => `<product>
  <identifier>NSC-${Number(p.id)}</identifier>
  <manufacturer>The Pokémon Company</manufacturer>
  <name>${x(p.name)}</name>
  <category>${x(`Játék > Kártyajáték > Gyűjthető kártya > ${cat}`)}</category>
  <product_url>${x(url)}</product_url>
  <price>${Math.round(p.price)}</price>
  <net_price>${Math.round(p.price / (1 + vat))}</net_price>
  ${images[0] ? `<image_url>${x(images[0])}</image_url>` : ""}
  <description>${x(desc.slice(0, 1000))}</description>
  <delivery_time>${x(days)}</delivery_time>
  <delivery_cost>${free && p.price >= free ? 0 : shipFrom}</delivery_cost>
  ${p.ean ? `<ean_code>${x(p.ean)}</ean_code>` : ""}
</product>`).join("\n");
  return xmlResponse(`<?xml version="1.0" encoding="UTF-8"?>\n<products>\n${items}\n</products>`);
}
