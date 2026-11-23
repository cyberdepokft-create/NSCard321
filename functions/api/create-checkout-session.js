/* Cloudflare Pages Function – Stripe Checkout indítása.
 * Csak GitHubról telepített Pages projektben fut (a feltöltött mappás telepítés nem futtat függvényeket).
 * Szükséges környezeti változó: STRIPE_SECRET_KEY (Settings → Variables and Secrets, típus: Secret).
 * Az árakat és a készletet a szerver a publikált katalógusból ellenőrzi, a böngészőtől csak azonosítót és darabszámot fogad el.
 */
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
});

async function loadCatalog(request, env) {
  const origin = new URL(request.url).origin;
  let remote = null;
  try {
    const cfg = await env.ASSETS.fetch(new URL("/sync-config.json", origin));
    if (cfg.ok) remote = await cfg.json();
  } catch {}
  if (remote?.owner && remote?.repo) {
    const path = String(remote.path || "public/store/catalog.json").replace(/^\/+/, "");
    const url = `https://raw.githubusercontent.com/${remote.owner}/${remote.repo}/${remote.branch || "main"}/${path}?v=${Date.now()}`;
    try {
      const res = await fetch(url, { cf: { cacheTtl: 0 } });
      if (res.ok) return await res.json();
    } catch {}
  }
  const local = await env.ASSETS.fetch(new URL("/store/catalog.json", origin));
  return local.json();
}

export async function onRequestPost({ request, env }) {
  if (!env.STRIPE_SECRET_KEY) return json({ error: "A kártyás fizetés nincs beállítva (hiányzó STRIPE_SECRET_KEY)." }, 503);

  let body;
  try { body = await request.json(); } catch { return json({ error: "Hibás kérés." }, 400); }
  const items = Array.isArray(body?.items) ? body.items : [];
  if (!items.length || items.length > 50) return json({ error: "A kosár üres." }, 400);

  const catalog = await loadCatalog(request, env);
  const products = Array.isArray(catalog?.products) ? catalog.products : [];
  const settings = catalog?.settings || {};
  if (settings.payCard === false) return json({ error: "A kártyás fizetés jelenleg nem elérhető." }, 403);

  const params = new URLSearchParams();
  let subtotal = 0;
  let i = 0;
  for (const raw of items) {
    const id = Number(raw?.id);
    const qty = Math.max(1, Math.min(99, Math.round(Number(raw?.qty) || 0)));
    const p = products.find(x => Number(x.id) === id && !x.hidden);
    if (!p) return json({ error: "Az egyik termék már nem elérhető. Frissítsd az oldalt." }, 409);
    const soon = String(p.availability || "").toLowerCase() === "coming_soon";
    if (soon) return json({ error: `${p.name}: még nem rendelhető.` }, 409);
    if (Number(p.stock) < qty) return json({ error: `${p.name}: csak ${p.stock} db rendelhető.` }, 409);
    const price = Math.round(Number(p.price) || 0);
    subtotal += price * qty;
    params.append(`line_items[${i}][price_data][currency]`, "huf");
    params.append(`line_items[${i}][price_data][unit_amount]`, String(price * 100));
    params.append(`line_items[${i}][price_data][product_data][name]`, String(p.name).slice(0, 250));
    params.append(`line_items[${i}][quantity]`, String(qty));
    i++;
  }

  const methods = {
    home: { on: settings.shipHome !== false, price: settings.shippingHome, label: "Házhozszállítás" },
    locker: { on: settings.shipLocker !== false, price: settings.shippingLocker, label: "Csomagautomata" },
    pickup: { on: !!settings.shipPickup, price: settings.shippingPickup, label: "Személyes átvétel" }
  };
  const method = methods[body?.shipping]?.on ? body.shipping : Object.keys(methods).find(k => methods[k].on) || "home";
  const free = method !== "pickup" && Number(settings.freeShippingFrom) > 0 && subtotal >= Number(settings.freeShippingFrom);
  const shipping = free ? 0 : Math.round(Number(methods[method].price) || 0);
  if (shipping > 0) {
    params.append(`line_items[${i}][price_data][currency]`, "huf");
    params.append(`line_items[${i}][price_data][unit_amount]`, String(shipping * 100));
    params.append(`line_items[${i}][price_data][product_data][name]`, `Szállítás – ${methods[method].label.toLowerCase()}`);
    params.append(`line_items[${i}][quantity]`, "1");
  }

  const c = body?.customer || {};
  const origin = new URL(request.url).origin;
  params.append("mode", "payment");
  params.append("locale", "hu");
  params.append("success_url", `${origin}/success?session_id={CHECKOUT_SESSION_ID}`);
  params.append("cancel_url", `${origin}/cancel`);
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(c.email || ""))) params.append("customer_email", String(c.email));
  const meta = {
    name: c.name, phone: c.phone, shipping: methods[method].label,
    address: method === "locker" ? c.locker : method === "pickup" ? "" : `${c.zip || ""} ${c.city || ""}, ${c.address || ""}`, note: c.note
  };
  for (const [k, v] of Object.entries(meta)) if (v) params.append(`metadata[${k}]`, String(v).slice(0, 480));

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: params
  });
  const data = await res.json();
  if (!res.ok) return json({ error: data?.error?.message || "A fizetés indítása nem sikerült." }, 502);
  return json({ url: data.url, id: data.id });
}

export const onRequest = () => json({ error: "Csak POST kérés engedélyezett." }, 405);
