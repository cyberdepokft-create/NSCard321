/* NS Card – közös adatréteg (bolt + admin)
 * Katalógus, beállítások, kosár. Nincs külső függőség.
 */
(() => {
  "use strict";

  const VERSION = 3;

  /* Az élő katalógus helye. Az admin ide publikál, a bolt innen olvas.
   * A /sync-config.json felülírhatja (ha a repó vagy az útvonal változik). */
  const DEFAULT_REMOTE = Object.freeze({
    owner: "cyberdepokft-create",
    repo: "NSCard321",
    branch: "main",
    path: "public/store/catalog.json"
  });
  /* A webshop saját példánya (a GitHubról települt oldalon mindig a legutóbb élesített verzió). */
  const LOCAL_CATALOG = "/store/catalog.json";

  const DEFAULT_CATEGORIES = [
    { value: "booster", label: "Booster csomagok", short: "Booster" },
    { value: "tinek", label: "Tin dobozok", short: "Tin" },
    { value: "display", label: "Displayek", short: "Display" },
    { value: "etb", label: "Elite Trainer Boxok", short: "ETB" },
    { value: "collections", label: "Kollekciók", short: "Kollekció" },
    { value: "mysteri", label: "Mystery boxok", short: "Mystery box" },
    { value: "single", label: "Single kártyák", short: "Single" },
    { value: "accessories", label: "Kiegészítők", short: "Kiegészítő" }
  ];

  const FLAGS = [
    { value: "home", label: "Kezdőlapon kiemelve" },
    { value: "new", label: "Új" },
    { value: "sale", label: "Akció" },
    { value: "popular", label: "Népszerű" },
    { value: "rare", label: "Ritka" }
  ];

  const DEFAULT_SETTINGS = Object.freeze({
    shopName: "NS Card",
    email: "",
    phone: "",
    address: "",
    instagram: "",
    facebook: "",
    tiktok: "",
    announcement: "",
    shipHome: true,
    shippingHome: 2500,
    shipLocker: true,
    shippingLocker: 2500,
    shipPickup: false,
    shippingPickup: 0,
    pickupAddress: "",
    freeShippingFrom: 0,
    payCard: false,
    payTransfer: true,
    payCod: true,
    codFee: 0,
    lowStock: 3,
    companyName: "",
    companyAddress: "",
    taxNumber: "",
    regNumber: "",
    dispatchCutoff: 14,
    deliveryText: "1–3 munkanap",
    bankDetails: "",
    stockSyncedAt: "",
    lockerMap: true,
    vatRate: "27%",
    invoiceAuto: false,
    invoiceElectronic: true,
    invoiceSend: true,
    billingoBlockId: 0,
    analyticsToken: "",
    giftWrap: false,
    giftWrapPrice: 0
  });

  /* Single kártyák állapota és nyelve */
  const CONDITIONS = [
    { value: "NM", label: "Near Mint (NM)", short: "NM" },
    { value: "LP", label: "Lightly Played (LP)", short: "LP" },
    { value: "MP", label: "Moderately Played (MP)", short: "MP" },
    { value: "HP", label: "Heavily Played (HP)", short: "HP" },
    { value: "DMG", label: "Damaged (DMG)", short: "DMG" }
  ];
  const LANGS = [
    { value: "EN", label: "Angol" }, { value: "JP", label: "Japán" }, { value: "DE", label: "Német" }, { value: "FR", label: "Francia" },
    { value: "IT", label: "Olasz" }, { value: "ES", label: "Spanyol" }, { value: "KO", label: "Koreai" }, { value: "ZH", label: "Kínai" }
  ];

  const INFO_PAGES = [
    { key: "aszf", label: "Általános szerződési feltételek", short: "ÁSZF" },
    { key: "adatkezeles", label: "Adatkezelési tájékoztató", short: "Adatkezelés" },
    { key: "szallitas", label: "Szállítás, fizetés és elállás", short: "Szállítás és elállás" },
    { key: "rolunk", label: "Rólunk", short: "Rólunk" }
  ];

  const KEYS = {
    published: "nsc.published.v3",
    draft: "nsc.draft.v3",
    cart: "nsc.cart.v1",
    remote: "nsc.remote.v1",
    checkout: "nsc.checkout.v1",
    lastOrder: "nsc.lastOrder.v1",
    fav: "nsc.fav.v1",
    recent: "nsc.recent.v1",
    coupon: "nsc.coupon.v1",
    live: "nsc.live.v1"
  };

  /* ---------- segédfüggvények ---------- */
  const clone = v => JSON.parse(JSON.stringify(v));
  const store = {
    get(key) { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch { return null; } },
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } },
    del(key) { try { localStorage.removeItem(key); } catch {} }
  };
  const fmtFt = v => new Intl.NumberFormat("hu-HU").format(Math.round(Number(v) || 0)) + " Ft";
  const esc = v => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  const int = (v, min = 0) => Math.max(min, Math.round(Number(v) || 0));

  function categories() {
    return (current?.settings?.categories || DEFAULT_CATEGORIES).filter(c => !c.hidden);
  }
  const CAT_TINTS = ["#ff7a1f", "#45aaff", "#3ccb76", "#b56aff", "#ffb02e", "#ff5d8f", "#2fd3ff", "#e7b743"];
  function categoryMeta(value) {
    const list = current?.settings?.categories || DEFAULT_CATEGORIES;
    const i = Math.max(0, list.findIndex(c => c.value === value));
    const c = list[i] || {};
    return { ...c, color: c.color || CAT_TINTS[i % CAT_TINTS.length] };
  }
  function categoryLabel(value, short = false) {
    const c = (current?.settings?.categories || DEFAULT_CATEGORIES).find(item => item.value === value)
      || DEFAULT_CATEGORIES.find(item => item.value === value);
    if (!c) return "Egyéb";
    return short && c.short ? c.short : c.label;
  }

  /* Relatív képútvonalak a gyökérhez igazítva, hogy /products és /product oldalon is jók legyenek. */
  function imageUrl(src) {
    const s = String(src || "").trim();
    if (!s) return "";
    if (/^(https?:|data:|blob:|\/)/i.test(s)) return s;
    return "/" + s.replace(/^\.\//, "");
  }

  /* ---------- termék / katalógus normalizálás (régi formátumokkal is kompatibilis) ---------- */
  function normalizeAvailability(raw, badge) {
    const v = String(raw || "").trim().toLowerCase();
    if (["preorder", "pre-order", "pre_order", "elorendeles", "előrendelés"].includes(v)) return "preorder";
    if (["coming_soon", "hamarosan", "soon"].includes(v)) return "coming_soon";
    if (!v && /hamarosan/i.test(String(badge || ""))) return "coming_soon";
    return "in_stock";
  }

  function sanitizeProduct(raw, index = 0) {
    const r = raw && typeof raw === "object" ? raw : {};
    const images = (Array.isArray(r.images) ? r.images : (r.images ? [r.images] : []))
      .map(s => String(s || "").trim()).filter(Boolean);
    if (!images.length && r.art) images.push(String(r.art).trim());
    const flags = [...new Set((Array.isArray(r.flags) ? r.flags : []).map(f => String(f || "").trim().toLowerCase()).filter(Boolean))];
    const price = int(r.price);
    let oldPrice = r.oldPrice === null || r.oldPrice === "" || r.oldPrice === undefined ? null : int(r.oldPrice);
    if (!oldPrice || oldPrice <= price) oldPrice = null;
    const badgeRaw = String(r.badge ?? "").trim();
    const badge = /^(kiemelt|hamarosan)$/i.test(badgeRaw) ? "" : badgeRaw;
    const id = Number(r.id);
    return {
      id: Number.isFinite(id) && id > 0 ? Math.round(id) : index + 1,
      category: String(r.category || "booster").trim().toLowerCase(),
      name: String(r.name || "").trim(),
      set: String(r.set || "").trim(),
      line: String(r.line || "").trim(),
      description: String(r.description || "").trim(),
      price,
      oldPrice,
      stock: int(r.stock),
      availability: normalizeAvailability(r.availability ?? r.status, badgeRaw),
      badge,
      flags,
      images,
      hidden: !!r.hidden,
      releaseDate: /^\d{4}-\d{2}-\d{2}$/.test(String(r.releaseDate || "")) ? String(r.releaseDate) : "",
      condition: CONDITIONS.some(c => c.value === r.condition) ? r.condition : "",
      lang: LANGS.some(l => l.value === r.lang) ? r.lang : "",
      cardNo: String(r.cardNo || "").trim().slice(0, 20),
      rarity: String(r.rarity || "").trim().slice(0, 40),
      grade: String(r.grade || "").trim().slice(0, 24),
      ean: /^\d{8,14}$/.test(String(r.ean || "").trim()) ? String(r.ean).trim() : "",
      maxPerOrder: Math.min(99, int(r.maxPerOrder))
    };
  }

  function sanitizeCatalog(list) {
    if (!Array.isArray(list)) return [];
    const seen = new Set();
    return list.map((item, i) => sanitizeProduct(item, i)).map(p => {
      while (seen.has(p.id)) p.id += 1000;
      seen.add(p.id);
      return p;
    });
  }

  function sanitizeSettings(raw) {
    const r = raw && typeof raw === "object" ? raw : {};
    const s = { ...DEFAULT_SETTINGS };
    for (const key of Object.keys(DEFAULT_SETTINGS)) {
      if (!(key in r)) continue;
      const def = DEFAULT_SETTINGS[key];
      if (typeof def === "number") s[key] = int(r[key]);
      else if (typeof def === "boolean") s[key] = !!r[key];
      else s[key] = String(r[key] ?? "").trim();
    }
    if (!s.shopName) s.shopName = DEFAULT_SETTINGS.shopName;
    if (!s.shipHome && !s.shipLocker && !s.shipPickup) s.shipHome = true;
    s.categories = sanitizeCategories(r.categories);
    s.coupons = sanitizeCoupons(r.coupons);
    s.pages = sanitizePages(r.pages);
    s.faq = sanitizeFaq(r.faq);
    s.dispatchCutoff = Math.min(23, Math.max(0, s.dispatchCutoff));
    s.vatRate = s.vatRate === "AAM" ? "AAM" : "27%";
    if (!/^\d{4}-\d{2}-\d{2}T/.test(s.stockSyncedAt)) s.stockSyncedAt = "";
    s.analyticsToken = /^[a-f0-9]{32}$/i.test(s.analyticsToken) ? s.analyticsToken : "";
    s.posts = sanitizePosts(r.posts);
    s.releases = sanitizeReleases(r.releases);
    s.texts = sanitizeTexts(r.texts, r);
    s.theme = sanitizeTheme(r.theme);
    return s;
  }

  /* ---------- kuponok és tájékoztató oldalak ---------- */
  function sanitizeCoupons(raw) {
    const out = [];
    const seen = new Set();
    for (const c of Array.isArray(raw) ? raw.slice(0, 60) : []) {
      const code = String(c?.code || "").toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 24);
      if (!code || seen.has(code)) continue;
      seen.add(code);
      const type = ["percent", "fixed", "ship"].includes(c?.type) ? c.type : "percent";
      let value = int(c?.value);
      if (type === "percent") value = Math.min(90, Math.max(1, value || 10));
      if (type === "ship") value = 0;
      out.push({ code, type, value, minOrder: int(c?.minOrder), active: c?.active !== false, note: String(c?.note || "").trim().slice(0, 80) });
    }
    return out;
  }
  function sanitizePages(raw) {
    const out = {};
    const src = raw && typeof raw === "object" ? raw : {};
    for (const pg of INFO_PAGES) {
      const body = String(src[pg.key]?.body || "").replace(/\r\n/g, "\n").trim().slice(0, 40000);
      if (body) out[pg.key] = { body };
    }
    return out;
  }
  /* cikkek és megjelenési naptár */
  function sanitizePosts(raw) {
    const out = [];
    const seen = new Set();
    for (const p of Array.isArray(raw) ? raw.slice(0, 80) : []) {
      const title = String(p?.title || "").trim().slice(0, 140);
      if (!title) continue;
      let slug = slugify(p?.slug || title) || `cikk-${out.length + 1}`;
      while (seen.has(slug)) slug += "-2";
      seen.add(slug);
      out.push({
        slug, title,
        date: /^\d{4}-\d{2}-\d{2}$/.test(String(p?.date || "")) ? p.date : new Date().toISOString().slice(0, 10),
        excerpt: String(p?.excerpt || "").trim().slice(0, 280),
        cover: String(p?.cover || "").trim().slice(0, 600),
        body: String(p?.body || "").replace(/\r\n/g, "\n").trim().slice(0, 40000),
        tag: String(p?.tag || "").trim().slice(0, 30),
        products: [...new Set((Array.isArray(p?.products) ? p.products : []).map(Number).filter(n => n > 0))].slice(0, 8),
        published: p?.published !== false
      });
    }
    return out;
  }
  function sanitizeReleases(raw) {
    return (Array.isArray(raw) ? raw.slice(0, 60) : []).map(r => ({
      date: /^\d{4}-\d{2}(-\d{2})?$/.test(String(r?.date || "")) ? String(r.date) : "",
      title: String(r?.title || "").trim().slice(0, 120),
      note: String(r?.note || "").trim().slice(0, 200),
      productId: Number(r?.productId) > 0 ? Math.round(Number(r.productId)) : 0
    })).filter(r => r.date && r.title).sort((a, b) => a.date.localeCompare(b.date));
  }
  function sanitizeFaq(raw) {
    return (Array.isArray(raw) ? raw : []).slice(0, 24).map(x => ({ q: String(x?.q || "").trim().slice(0, 160), a: String(x?.a || "").trim().slice(0, 1200) })).filter(x => x.q && x.a);
  }
  function couponDiscount(coupon, subtotal) {
    if (!coupon || !subtotal) return 0;
    if (coupon.type === "percent") return Math.round(subtotal * coupon.value / 100);
    if (coupon.type === "fixed") return Math.min(coupon.value, subtotal);
    return 0;
  }
  function findCoupon(code, subtotal) {
    const c = String(code || "").trim().toUpperCase();
    if (!c) return { ok: false, reason: "empty" };
    const coupon = (settings().coupons || []).find(x => x.code === c && x.active);
    if (!coupon) return { ok: false, reason: "invalid" };
    if (coupon.minOrder && subtotal < coupon.minOrder) return { ok: false, reason: "min", coupon };
    return { ok: true, coupon, discount: couponDiscount(coupon, subtotal), freeShip: coupon.type === "ship" };
  }

  /* Egyszerű, biztonságos szövegformázás a tájékoztató oldalakhoz: ## cím, ### alcím, - lista, **félkövér**, [link](https://…) */
  function mdToHtml(md) {
    const inline = t => esc(t)
      .replace(/!\[([^\]]*)\]\((https:\/\/[^\s)]+)\)/g, '<img src="$2" alt="$1" loading="lazy">')
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\[([^\]]+)\]\(((?:https?:\/\/|mailto:|tel:|\/)[^)\s]+)\)/g, (m, a, href) => `<a href="${href}"${/^https?:/.test(href) ? ' target="_blank" rel="noopener"' : ""}>${a}</a>`);
    const out = [];
    let para = [], list = null, ltype = "", quote = [], table = [];
    const flushP = () => { if (para.length) { out.push(`<p>${para.map(inline).join("<br>")}</p>`); para = []; } };
    const flushL = () => { if (list) { out.push(`<${ltype}>${list.join("")}</${ltype}>`); list = null; } };
    const flushQ = () => { if (quote.length) { out.push(`<blockquote${calloutClass(quote[0])}>${quote.map(inline).join("<br>")}</blockquote>`); quote = []; } };
    const flushT = () => { if (table.length) { out.push(tableHTML(table, inline)); table = []; } };
    for (const raw of String(md || "").replace(/\r\n/g, "\n").split("\n")) {
      const l = raw.trim();
      let m;
      if (!l) { flushP(); flushL(); flushQ(); flushT(); continue; }
      if (/^\|.*\|$/.test(l)) { flushP(); flushL(); flushQ(); table.push(l); continue; }
      flushT();
      if (/^>\s?/.test(l)) { flushP(); flushL(); quote.push(l.replace(/^>\s?/, "")); continue; }
      flushQ();
      if ((m = l.match(/^(#{1,3})\s+(.*)$/))) { flushP(); flushL(); out.push(m[1].length === 3 ? `<h3 id="${slugify(m[2])}">${inline(m[2])}</h3>` : `<h2 id="${slugify(m[2])}">${inline(m[2])}</h2>`); continue; }
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
    flushP(); flushL(); flushQ(); flushT();
    return out.join("\n");
  }
  /* „> **Tipp:** …” zöld, „> **Fontos:** …” sárga kiemelő doboz */
  function calloutClass(first) {
    const k = String(first || "").toLowerCase();
    if (/^\*\*(tipp|jó tudni|érdekesség)/.test(k)) return ' class="callout tip"';
    if (/^\*\*(fontos|figyelem|vigyázat)/.test(k)) return ' class="callout warn"';
    return "";
  }
  /* | fejléc | fejléc | sorok → görgethető táblázat; a |---| elválasztó sor kimarad */
  function tableHTML(rows, inline) {
    const cells = r => r.replace(/^\||\|$/g, "").split("|").map(c => c.trim());
    const body = rows.filter(r => !/^\|[\s:|-]+\|$/.test(r)).map(cells);
    if (!body.length) return "";
    const head = rows.length > 1 && /^\|[\s:|-]+\|$/.test(rows[1]) ? body.shift() : null;
    /* a fejléc szövege data-label-ként minden cellán: mobilon a sorok kártyákká rendeződnek */
    const label = i => head && head[i] ? ` data-label="${esc(head[i].replace(/\*\*/g, ""))}"` : "";
    return `<div class="table-wrap${head ? " stack" : ""}"><table>${head ? `<thead><tr>${head.map(c => `<th scope="col">${inline(c)}</th>`).join("")}</tr></thead>` : ""}<tbody>${body.map(r => `<tr>${r.map((c, i) => i === 0 && head ? `<th scope="row">${inline(c)}</th>` : `<td${label(i)}>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  }

  /* ---------- kedvencek és nemrég megnézett ---------- */
  const favorites = {
    list() { const v = store.get(KEYS.fav); return Array.isArray(v) ? v.map(Number).filter(Boolean) : []; },
    has(id) { return favorites.list().includes(Number(id)); },
    toggle(id) {
      const n = Number(id);
      const list = favorites.list();
      const on = !list.includes(n);
      store.set(KEYS.fav, on ? [n, ...list].slice(0, 100) : list.filter(x => x !== n));
      window.dispatchEvent(new CustomEvent("nsc:fav", { detail: { id: n, on } }));
      return on;
    }
  };
  const recent = {
    list() { const v = store.get(KEYS.recent); return Array.isArray(v) ? v.map(Number).filter(Boolean) : []; },
    push(id) { const n = Number(id); store.set(KEYS.recent, [n, ...recent.list().filter(x => x !== n)].slice(0, 12)); }
  };

  /* ---------- szövegek ---------- */
  const TEXT_GROUPS = window.NSC_TEXT_GROUPS || [];
  const TEXT_DEFAULTS = {};
  TEXT_GROUPS.forEach(([, items]) => items.forEach(([key, , def]) => { TEXT_DEFAULTS[key] = def; }));
  const LEGACY_TEXT = { heroTitle: "hero.title", heroText: "hero.text", featuredTitle: "featured.title", featuredText: "featured.text", footerText: "footer.text" };

  function sanitizeTexts(raw, legacy = {}) {
    const out = {};
    const src = raw && typeof raw === "object" ? raw : {};
    for (const key of Object.keys(TEXT_DEFAULTS)) {
      const v = typeof src[key] === "string" ? src[key].trim().slice(0, 400) : "";
      if (v && v !== TEXT_DEFAULTS[key]) out[key] = v;
    }
    for (const [old, key] of Object.entries(LEGACY_TEXT)) {
      const v = String(legacy?.[old] || "").trim();
      if (v && !out[key] && v !== TEXT_DEFAULTS[key]) out[key] = v;
    }
    return out;
  }

  function t(key, vars) {
    const custom = current?.settings?.texts?.[key];
    let str = custom || TEXT_DEFAULTS[key] || key;
    if (vars) for (const [k, v] of Object.entries(vars)) str = str.replace(new RegExp(`\\{${k}\\}`, "g"), v);
    return str;
  }

  /* ---------- megjelenés (téma) ---------- */
  const FONTS = {
    display: [
      { key: "archivo", label: "Archivo Black – vastag, játékos", family: '"Archivo Black", "Arial Black", sans-serif', weight: 400 },
      { key: "anton", label: "Anton – magas, plakátszerű", family: 'Anton, Impact, sans-serif', weight: 400 },
      { key: "montserrat", label: "Montserrat – modern, letisztult", family: 'Montserrat, system-ui, sans-serif', weight: 800 },
      { key: "poppins", label: "Poppins – kerekded, barátságos", family: 'Poppins, system-ui, sans-serif', weight: 700 },
      { key: "bitter", label: "Bitter – talpas, erőteljes", family: 'Bitter, Georgia, serif', weight: 800 },
      { key: "lora", label: "Lora – elegáns, klasszikus", family: 'Lora, Georgia, serif', weight: 700 }
    ],
    body: [
      { key: "dmsans", label: "DM Sans", family: '"DM Sans", system-ui, sans-serif' },
      { key: "fira", label: "Fira Sans", family: '"Fira Sans", system-ui, sans-serif' },
      { key: "opensans", label: "Open Sans", family: '"Open Sans", system-ui, sans-serif' },
      { key: "roboto", label: "Roboto", family: 'Roboto, system-ui, sans-serif' },
      { key: "sourcesans", label: "Source Sans 3", family: '"Source Sans 3", system-ui, sans-serif' },
      { key: "poppins", label: "Poppins", family: 'Poppins, system-ui, sans-serif' },
      { key: "montserrat", label: "Montserrat", family: 'Montserrat, system-ui, sans-serif' }
    ]
  };

  const PRESETS = [
    { key: "sarkanytuz", label: "Sárkánytűz", colors: { bg: "#061230", surface: "#0b1a44", primary: "#ff7a1f", accent: "#ffd23f", secondary: "#45aaff", text: "#f2f5ff" } },
    { key: "jegvihar", label: "Jégvihar", colors: { bg: "#03141d", surface: "#08283a", primary: "#2fd3ff", accent: "#e9fbff", secondary: "#7cf3c8", text: "#eef9ff" } },
    { key: "lohere", label: "Lóhere", colors: { bg: "#06170e", surface: "#0d2b1b", primary: "#3ccb76", accent: "#f2d24a", secondary: "#9be15d", text: "#effbf3" } },
    { key: "lilaholo", label: "Lila holo", colors: { bg: "#110726", surface: "#1e0f42", primary: "#c34cff", accent: "#ffd23f", secondary: "#33e0ff", text: "#f6f0ff" } },
    { key: "aranyelit", label: "Arany elit", colors: { bg: "#0c0a07", surface: "#1b1610", primary: "#e7b743", accent: "#ffe7a1", secondary: "#e08a3c", text: "#fbf6ea" } },
    { key: "vilagos", label: "Világos", colors: { bg: "#f3f5fb", surface: "#ffffff", primary: "#ff6a00", accent: "#b45309", secondary: "#1d6fd8", text: "#0c1633" } }
  ];

  const SECTION_LIST = [
    { id: "ticker", label: "Futó sáv" },
    { id: "categories", label: "Kategóriák" },
    { id: "recent", label: "Folytasd, ahol abbahagytad" },
    { id: "pack", label: "Csomagbontó" },
    { id: "featured", label: "Kiemelt termékek" },
    { id: "soon", label: "Hamarosan érkezik" },
    { id: "releases", label: "Megjelenési naptár" },
    { id: "reviews", label: "Vásárlói vélemények" },
    { id: "steps", label: "Így rendelhetsz" },
    { id: "blog", label: "Cikkek" },
    { id: "faq", label: "Gyakori kérdések" },
    { id: "newsletter", label: "Hírlevél" },
    { id: "contact", label: "Kapcsolat" }
  ];

  const THEME_DEFAULTS = Object.freeze({
    preset: "sarkanytuz",
    colors: PRESETS[0].colors,
    fontDisplay: "archivo",
    fontBody: "dmsans",
    displayScale: 100,
    radius: "rounded",
    buttons: "pill",
    cards: "glass",
    colsDesktop: 4,
    colsMobile: 2,
    heroSide: "right",
    customCss: "",
    anim: { level: "full", speed: "normal", float: true, sparkles: true, glow: true, tilt: true, reveal: true, ticker: true, fly: true, pack: true },
    sections: SECTION_LIST.map(x => ({ id: x.id, on: true }))
  });

  const HEX = /^#[0-9a-f]{6}$/i;
  const pick = (v, allowed, def) => allowed.includes(v) ? v : def;

  function sanitizeTheme(raw) {
    const r = raw && typeof raw === "object" ? raw : {};
    const d = THEME_DEFAULTS;
    const colors = {};
    for (const k of Object.keys(d.colors)) colors[k] = HEX.test(String(r.colors?.[k] || "")) ? String(r.colors[k]).toLowerCase() : d.colors[k];
    const anim = {};
    for (const [k, v] of Object.entries(d.anim)) {
      if (typeof v === "boolean") anim[k] = typeof r.anim?.[k] === "boolean" ? r.anim[k] : v;
    }
    anim.level = pick(r.anim?.level, ["full", "subtle", "off"], d.anim.level);
    anim.speed = pick(r.anim?.speed, ["slow", "normal", "fast"], d.anim.speed);
    const seen = new Set();
    const sections = [];
    (Array.isArray(r.sections) ? r.sections : []).forEach(sct => {
      if (SECTION_LIST.some(x => x.id === sct?.id) && !seen.has(sct.id)) { seen.add(sct.id); sections.push({ id: sct.id, on: sct.on !== false }); }
    });
    // az új szekciók az alap sorrend szerinti helyükre kerülnek (nem a lista végére)
    SECTION_LIST.forEach((x, i) => {
      if (seen.has(x.id)) return;
      const prev = SECTION_LIST.slice(0, i).reverse().find(y => seen.has(y.id));
      const at = prev ? sections.findIndex(y => y.id === prev.id) + 1 : 0;
      sections.splice(at, 0, { id: x.id, on: true });
      seen.add(x.id);
    });
    return {
      preset: String(r.preset || d.preset),
      colors,
      fontDisplay: pick(r.fontDisplay, FONTS.display.map(f => f.key), d.fontDisplay),
      fontBody: pick(r.fontBody, FONTS.body.map(f => f.key), d.fontBody),
      displayScale: Math.min(130, Math.max(80, int(r.displayScale || d.displayScale))),
      radius: pick(r.radius, ["sharp", "rounded", "round"], d.radius),
      buttons: pick(r.buttons, ["pill", "rounded", "square"], d.buttons),
      cards: pick(r.cards, ["glass", "solid", "outline"], d.cards),
      colsDesktop: [3, 4, 5].includes(Number(r.colsDesktop)) ? Number(r.colsDesktop) : d.colsDesktop,
      colsMobile: [1, 2].includes(Number(r.colsMobile)) ? Number(r.colsMobile) : d.colsMobile,
      heroSide: pick(r.heroSide, ["right", "left"], d.heroSide),
      customCss: String(r.customCss || "").replace(/<\/?style/gi, "").slice(0, 12000),
      anim,
      sections
    };
  }

  /* Téma → CSS változók (a bolt és az admin előnézete is ezt használja) */
  function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function lum(h) { const [r, g, b] = hexToRgb(h).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * r + .7152 * g + .0722 * b; }
  function onColor(h) { return lum(h) > .42 ? "#160a00" : "#ffffff"; }

  function themeVars(theme) {
    const th = sanitizeTheme(theme);
    const c = th.colors;
    const fd = FONTS.display.find(f => f.key === th.fontDisplay) || FONTS.display[0];
    const fb = FONTS.body.find(f => f.key === th.fontBody) || FONTS.body[0];
    const r = { sharp: .35, rounded: 1, round: 1.5 }[th.radius];
    const light = lum(c.bg) > .5;
    return {
      vars: {
        "--ink": c.bg, "--ink-2": c.surface, "--paper": c.text,
        "--ember": c.primary, "--gold": c.accent, "--spark": c.secondary,
        "--on-ember": onColor(c.primary), "--on-gold": onColor(c.accent), "--on-spark": onColor(c.secondary),
        "--display": fd.family, "--display-weight": String(fd.weight), "--body": fb.family,
        "--display-scale": String(th.displayScale / 100),
        "--r": String(r), "--btn-r": th.buttons === "pill" ? "999px" : th.buttons === "rounded" ? "14px" : "6px",
        "--cols": String(th.colsDesktop), "--cols-m": String(th.colsMobile),
        "--speed": String({ slow: 1.6, normal: 1, fast: .65 }[th.anim.speed])
      },
      attrs: {
        "data-cards": th.cards, "data-hero": th.heroSide, "data-cols-m": String(th.colsMobile), "data-light": light ? "1" : "0", "data-anim": th.anim.level,
        "data-fx": Object.entries(th.anim).filter(([k, v]) => typeof v === "boolean" && v).map(([k]) => k).join(" ")
      }
    };
  }

  function applyTheme(theme, root = document.documentElement, persist = true) {
    const { vars, attrs } = themeVars(theme);
    const css = sanitizeTheme(theme).customCss;
    for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
    for (const [k, v] of Object.entries(attrs)) root.setAttribute(k, v);
    if (root === document.documentElement) {
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute("content", vars["--ink"]);
      let tag = document.getElementById("nsc-custom-css");
      if (css && !tag) { tag = document.createElement("style"); tag.id = "nsc-custom-css"; document.head.appendChild(tag); }
      if (tag) tag.textContent = css;
      if (persist) store.set("nsc.theme.v1", { vars, attrs, css });
    }
  }

  function slugify(text) {
    return String(text || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  }

  function sanitizeCategories(raw) {
    const list = Array.isArray(raw) ? raw : DEFAULT_CATEGORIES;
    const seen = new Set();
    const out = [];
    for (const c of list) {
      const label = String(c?.label || "").trim();
      let value = String(c?.value || "").trim().toLowerCase() || slugify(label);
      if (!label || !value || seen.has(value)) continue;
      seen.add(value);
      const color = /^#[0-9a-f]{6}$/i.test(String(c?.color || "")) ? String(c.color).toLowerCase() : "";
      const image = String(c?.image || "").trim().slice(0, 600);
      const desc = String(c?.desc || "").trim().slice(0, 160);
      out.push({ value, label, hidden: !!c?.hidden, color, image, desc });
    }
    return out.length ? out : DEFAULT_CATEGORIES.map(c => ({ value: c.value, label: c.label, hidden: false }));
  }

  function sanitizePayload(payload) {
    const products = Array.isArray(payload) ? payload : (Array.isArray(payload?.products) ? payload.products : null);
    if (!products) return null;
    return {
      version: VERSION,
      updatedAt: payload?.updatedAt || null,
      products: sanitizeCatalog(products),
      settings: sanitizeSettings(payload?.settings)
    };
  }

  function buildPayload(products, settings, extra = {}) {
    return {
      version: VERSION,
      updatedAt: new Date().toISOString(),
      updatedBy: extra.updatedBy || "admin",
      settings: sanitizeSettings(settings),
      products: sanitizeCatalog(products)
    };
  }

  /* ---------- távoli forrás ---------- */
  function normalizeRemote(raw) {
    if (!raw || typeof raw !== "object") return null;
    const owner = String(raw.owner || "").trim();
    const repo = String(raw.repo || "").trim();
    if (!owner || !repo) return null;
    return {
      owner, repo,
      branch: String(raw.branch || "main").trim() || "main",
      path: String(raw.path || DEFAULT_REMOTE.path).trim().replace(/^\/+/, "") || DEFAULT_REMOTE.path
    };
  }

  function rawUrl(remote) {
    const r = normalizeRemote(remote);
    if (!r) return "";
    const enc = p => p.split("/").filter(Boolean).map(encodeURIComponent).join("/");
    return `https://raw.githubusercontent.com/${encodeURIComponent(r.owner)}/${encodeURIComponent(r.repo)}/${enc(r.branch)}/${enc(r.path)}`;
  }

  let siteRemote = null;
  async function resolveRemote() {
    const local = normalizeRemote(store.get(KEYS.remote));
    if (local) return local;
    if (siteRemote) return siteRemote;
    try {
      const res = await fetchWithTimeout("/sync-config.json", 3000);
      if (res.ok) siteRemote = normalizeRemote(await res.json());
    } catch {}
    siteRemote = siteRemote || { ...DEFAULT_REMOTE };
    return siteRemote;
  }

  function setLocalRemote(remote) {
    const r = normalizeRemote(remote);
    if (r) store.set(KEYS.remote, r); else store.del(KEYS.remote);
    return r;
  }

  async function fetchWithTimeout(url, ms = 7000, init = {}) {
    const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const t = ctrl ? setTimeout(() => ctrl.abort(), ms) : 0;
    try {
      return await fetch(url, { cache: "no-cache", ...init, signal: ctrl?.signal });
    } finally { if (t) clearTimeout(t); }
  }

  /* ---------- katalógus betöltés ---------- */
  let current = null; // { products, settings, updatedAt, source }

  function emit() {
    window.dispatchEvent(new CustomEvent("nsc:catalog", { detail: current }));
  }

  function fromCache() {
    const cached = store.get(KEYS.published);
    const clean = cached ? sanitizePayload(cached) : null;
    return clean ? { ...clean, source: "cache" } : null;
  }

  async function fetchPublished({ fresh = false } = {}) {
    const remote = await resolveRemote();
    const url = rawUrl(remote);
    if (url) {
      try {
        // percenként változó kulcs: gyors frissülés, de nem kerül ki teljesen a cache
        const bucket = fresh ? Date.now() : Math.floor(Date.now() / 60000);
        const res = await fetchWithTimeout(`${url}?v=${bucket}`, 7000, { cache: fresh ? "no-store" : "no-cache" });
        if (res.ok) {
          const clean = sanitizePayload(await res.json());
          if (clean) return { ...clean, source: "remote", remote };
        }
      } catch {}
    }
    const res = await fetchWithTimeout(LOCAL_CATALOG, 7000);
    if (!res.ok) throw new Error("A katalógus nem érhető el.");
    const clean = sanitizePayload(await res.json());
    if (!clean) throw new Error("Hibás katalógus.");
    return { ...clean, source: "bundled", remote };
  }

  async function load(options = {}) {
    if (!current) {
      const cached = fromCache();
      if (cached) { current = cached; emit(); }
    }
    try {
      const next = await fetchPublished(options);
      if (previewMode && current) { next.settings = current.settings; if (previewProducts) next.products = current.products; }
      const changed = !current || JSON.stringify(current.products) !== JSON.stringify(next.products) || JSON.stringify(current.settings) !== JSON.stringify(next.settings);
      current = next;
      if (!previewMode) store.set(KEYS.published, { version: VERSION, updatedAt: next.updatedAt, products: next.products, settings: next.settings });
      liveBase = new Map(next.products.map(p => [p.id, p.stock]));
      if (changed) emit();
      if (options.live !== false) fetchLive(next).then(applyLive);
    } catch (err) {
      if (!current) { current = { products: [], settings: sanitizeSettings(null), updatedAt: null, source: "error" }; emit(); }
    }
    return current;
  }

  /* ---------- élő adatok: eladott darabok a szinkron óta, értékelések, szerver funkciók ---------- */
  let live = store.get(KEYS.live) || { features: {}, ratings: {} };
  let liveBase = null; // a katalógus eredeti (le nem vont) készlete
  async function fetchLive(cat) {
    if (previewMode || !/^https?:$/.test(location.protocol)) return null;
    try {
      const since = encodeURIComponent(cat?.settings?.stockSyncedAt || "");
      const res = await fetchWithTimeout(`/api/live?since=${since}`, 4000, { cache: "no-cache" });
      if (!res.ok || !/json/.test(res.headers.get("content-type") || "")) return null;
      const d = await res.json();
      return d && typeof d === "object" ? d : null;
    } catch { return null; }
  }
  function applyLive(d) {
    if (!current || !d) return;
    live = { features: d.features || {}, ratings: d.ratings || {}, at: Date.now() };
    store.set(KEYS.live, { features: live.features, ratings: live.ratings });
    const sold = d.sold || {};
    liveBase = liveBase || new Map(current.products.map(p => [p.id, p.stock]));
    current.products.forEach(p => { const b = liveBase.has(p.id) ? liveBase.get(p.id) : p.stock; p.stock = Math.max(0, b - int(sold[p.id], 0)); });
    emit();
  }

  let previewMode = false;
  let previewProducts = false;
  function setPreview(settingsRaw, productsRaw) {
    previewMode = true;
    if (!current) current = { products: [], settings: sanitizeSettings(null), updatedAt: null, source: "preview" };
    current = { ...current, settings: sanitizeSettings(settingsRaw) };
    if (Array.isArray(productsRaw)) { previewProducts = true; current.products = sanitizeCatalog(productsRaw); }
    emit();
  }

  const ready = load();

  /* ---------- lekérdezések ---------- */
  const products = () => (current?.products || []).filter(p => !p.hidden && p.name);
  const settings = () => current?.settings || sanitizeSettings(null);
  const byId = id => products().find(p => p.id === Number(id)) || null;
  const isSoon = p => p?.availability === "coming_soon";
  const isPreorder = p => p?.availability === "preorder";
  const isBuyable = p => !!p && !isSoon(p) && p.stock > 0;
  const maxQty = p => p ? (p.maxPerOrder > 0 ? Math.min(p.stock, p.maxPerOrder) : p.stock) : 0;
  const rating = id => { const r = live.ratings?.[id]; return Array.isArray(r) && r[1] > 0 ? { avg: Number(r[0]) || 0, count: Number(r[1]) || 0 } : null; };
  const fmtDate = (iso, opts = { year: "numeric", month: "long", day: "numeric" }) => {
    const m = String(iso || "").match(/^(\d{4})-(\d{2})(?:-(\d{2}))?$/);
    if (!m) return "";
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3] || 1));
    return m[3] ? d.toLocaleDateString("hu-HU", opts) : d.toLocaleDateString("hu-HU", { year: "numeric", month: "long" });
  };

  function stockInfo(p) {
    const low = settings().lowStock;
    if (isSoon(p)) return { key: "soon", label: t("stock.soon") };
    if (isPreorder(p)) return p.stock > 0 ? { key: "pre", label: p.releaseDate ? `Előrendelhető · ${fmtDate(p.releaseDate, { month: "short", day: "numeric" })}` : "Előrendelhető" } : { key: "out", label: "Az előrendelési keret betelt" };
    if (p.stock <= 0) return { key: "out", label: t("stock.out") };
    if (p.stock <= low) return { key: "low", label: t("stock.low", { n: p.stock }) };
    return { key: "in", label: t("stock.in") };
  }

  function discount(p) {
    return p?.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
  }

  /* ---------- kosár ---------- */
  const cart = {
    read() {
      const raw = store.get(KEYS.cart);
      return raw && typeof raw === "object" ? raw : {};
    },
    write(obj) { store.set(KEYS.cart, obj); window.dispatchEvent(new CustomEvent("nsc:cart")); },
    lines() {
      const raw = cart.read();
      return Object.entries(raw).map(([id, qty]) => {
        const product = byId(id);
        if (!product || !isBuyable(product)) return null;
        return { product, qty: Math.min(int(qty, 0), maxQty(product)) };
      }).filter(line => line && line.qty > 0);
    },
    count() { return cart.lines().reduce((s, l) => s + l.qty, 0); },
    subtotal() { return cart.lines().reduce((s, l) => s + l.qty * l.product.price, 0); },
    qtyOf(id) { return int(cart.read()[id], 0); },
    add(id, qty = 1) {
      const p = byId(id);
      if (!isBuyable(p)) return { ok: false, reason: isSoon(p) ? "soon" : "out" };
      const raw = cart.read();
      const next = Math.min(int(raw[id], 0) + int(qty, 1), maxQty(p));
      const capped = next === int(raw[id], 0);
      raw[id] = next;
      cart.write(raw);
      return { ok: !capped, reason: capped ? "max" : "", qty: next };
    },
    set(id, qty) {
      const p = byId(id);
      const raw = cart.read();
      const n = p ? Math.min(int(qty, 0), maxQty(p)) : 0;
      if (n <= 0) delete raw[id]; else raw[id] = n;
      cart.write(raw);
    },
    remove(id) { const raw = cart.read(); delete raw[id]; cart.write(raw); },
    clear() { store.del(KEYS.cart); window.dispatchEvent(new CustomEvent("nsc:cart")); },
    /* elfogyott / eltűnt termékek kitakarítása */
    prune() {
      const raw = cart.read();
      let changed = false;
      for (const id of Object.keys(raw)) {
        const p = byId(id);
        if (!p || !isBuyable(p)) { delete raw[id]; changed = true; }
        else if (raw[id] > maxQty(p)) { raw[id] = maxQty(p); changed = true; }
      }
      if (changed) cart.write(raw);
    }
  };

  function shippingMethods() {
    const s = settings();
    const list = [];
    if (s.shipHome) list.push({ value: "home", label: "Házhozszállítás", desc: "Futárral a megadott címre.", price: s.shippingHome });
    if (s.shipLocker) list.push({ value: "locker", label: "Csomagautomata", desc: "Átvétel a választott automatából.", price: s.shippingLocker });
    if (s.shipPickup) list.push({ value: "pickup", label: "Személyes átvétel", desc: s.pickupAddress ? `Átvétel: ${s.pickupAddress}` : "Az átvétel helyét e-mailben egyeztetjük.", price: s.shippingPickup });
    return list;
  }

  function shippingFor(method, subtotal) {
    const s = settings();
    if (!subtotal) return 0;
    const m = shippingMethods().find(x => x.value === method) || shippingMethods()[0];
    if (!m) return 0;
    if (m.value !== "pickup" && s.freeShippingFrom > 0 && subtotal >= s.freeShippingFrom) return 0;
    return m.price;
  }

  window.NSC = {
    VERSION, KEYS, FLAGS, DEFAULT_SETTINGS, DEFAULT_REMOTE, DEFAULT_CATEGORIES, LOCAL_CATALOG,
    get CATEGORIES() { return categories(); },
    FONTS, PRESETS, SECTION_LIST, THEME_DEFAULTS, TEXT_GROUPS, TEXT_DEFAULTS,
    t, sanitizeTheme, sanitizeTexts, themeVars, applyTheme, setPreview,
    categoryMeta, CAT_TINTS, sanitizeFaq, CONDITIONS, LANGS, sanitizePosts, sanitizeReleases, isPreorder, rating, fmtDate, fetchLive,
    get live() { return live; }, INFO_PAGES, sanitizeCoupons, sanitizePages, couponDiscount, findCoupon, mdToHtml, favorites, recent,
    store, clone, fmtFt, esc, int, categoryLabel, categories, imageUrl, slugify,
    sanitizeProduct, sanitizeCatalog, sanitizeSettings, sanitizeCategories, sanitizePayload, buildPayload,
    normalizeRemote, rawUrl, resolveRemote, setLocalRemote, fetchWithTimeout, fetchPublished,
    ready, load,
    get data() { return current; },
    get previewMode() { return previewMode; },
    products, settings, byId, isSoon, isBuyable, stockInfo, discount, maxQty,
    cart, shippingFor, shippingMethods
  };
})();
