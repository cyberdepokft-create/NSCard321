/* /feeds/argep.xml – ÁrGép terméklista (XML). Az ÁrGép partner felületén kell megadni a címet. */
import { feedData, x, xmlResponse } from "../../lib/feeds.js";

export async function onRequestGet({ request, env }) {
  const { s, products, shipFrom } = await feedData(request, env);
  const free = Number(s.freeShippingFrom) || 0;
  const items = products.filter(f => f.inStock || f.av === "preorder").map(({ p, images, url, cat, desc }) => `<termek>
  <cikkszam>NSC-${Number(p.id)}</cikkszam>
  <nev>${x(p.name)}</nev>
  <leiras>${x(desc.slice(0, 1000))}</leiras>
  <ar>${Math.round(p.price)}</ar>
  ${images[0] ? `<fotolink>${x(images[0])}</fotolink>` : ""}
  <termeklink>${x(url)}</termeklink>
  <kategoria>${x(`Pokémon TCG > ${cat}`)}</kategoria>
  <gyarto>The Pokémon Company</gyarto>
  <ido>${x(s.deliveryText || "1–3 munkanap")}</ido>
  <szallitas>${free && p.price >= free ? 0 : shipFrom}</szallitas>
  ${p.ean ? `<ean>${x(p.ean)}</ean>` : ""}
</termek>`).join("\n");
  return xmlResponse(`<?xml version="1.0" encoding="UTF-8"?>\n<termeklista>\n${items}\n</termeklista>`);
}
