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
    heroTitle: "A következő bontásod itt kezdődik.",
    heroText: "Pokémon TCG boosterek, tin dobozok, Elite Trainer Boxok és kollekciók – magyar webshopból, készletről.",
    featuredTitle: "Kiemelt termékek",
    featuredText: "A jelenlegi kínálat legkeresettebb darabjai.",
    footerText: "Pokémon TCG termékek gyűjtőknek és bontásra: boosterek, tin dobozok, Elite Trainer Boxok és kollekciók.",
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
    lowStock: 3
  });

  const KEYS = {
    published: "nsc.published.v3",
    draft: "nsc.draft.v3",
    cart: "nsc.cart.v1",
    remote: "nsc.remote.v1",
    checkout: "nsc.checkout.v1",
    lastOrder: "nsc.lastOrder.v1"
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
    if (["coming_soon", "hamarosan", "soon", "preorder", "pre-order", "pre_order"].includes(v)) return "coming_soon";
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
      hidden: !!r.hidden
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
    for (const k of ["heroTitle", "heroText", "featuredTitle", "featuredText", "footerText"]) if (!s[k]) s[k] = DEFAULT_SETTINGS[k];
    if (!s.shipHome && !s.shipLocker && !s.shipPickup) s.shipHome = true;
    s.categories = sanitizeCategories(r.categories);
    return s;
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
      out.push({ value, label, hidden: !!c?.hidden });
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
      const changed = !current || JSON.stringify(current.products) !== JSON.stringify(next.products) || JSON.stringify(current.settings) !== JSON.stringify(next.settings);
      current = next;
      store.set(KEYS.published, { version: VERSION, updatedAt: next.updatedAt, products: next.products, settings: next.settings });
      if (changed) emit();
    } catch (err) {
      if (!current) { current = { products: [], settings: sanitizeSettings(null), updatedAt: null, source: "error" }; emit(); }
    }
    return current;
  }

  const ready = load();

  /* ---------- lekérdezések ---------- */
  const products = () => (current?.products || []).filter(p => !p.hidden && p.name);
  const settings = () => current?.settings || sanitizeSettings(null);
  const byId = id => products().find(p => p.id === Number(id)) || null;
  const isSoon = p => p?.availability === "coming_soon";
  const isBuyable = p => !!p && !isSoon(p) && p.stock > 0;

  function stockInfo(p) {
    const low = settings().lowStock;
    if (isSoon(p)) return { key: "soon", label: "Hamarosan érkezik" };
    if (p.stock <= 0) return { key: "out", label: "Elfogyott" };
    if (p.stock <= low) return { key: "low", label: `Már csak ${p.stock} db` };
    return { key: "in", label: "Készleten" };
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
        return { product, qty: Math.min(int(qty, 0), product.stock) };
      }).filter(line => line && line.qty > 0);
    },
    count() { return cart.lines().reduce((s, l) => s + l.qty, 0); },
    subtotal() { return cart.lines().reduce((s, l) => s + l.qty * l.product.price, 0); },
    qtyOf(id) { return int(cart.read()[id], 0); },
    add(id, qty = 1) {
      const p = byId(id);
      if (!isBuyable(p)) return { ok: false, reason: isSoon(p) ? "soon" : "out" };
      const raw = cart.read();
      const next = Math.min(int(raw[id], 0) + int(qty, 1), p.stock);
      const capped = next === int(raw[id], 0);
      raw[id] = next;
      cart.write(raw);
      return { ok: !capped, reason: capped ? "max" : "", qty: next };
    },
    set(id, qty) {
      const p = byId(id);
      const raw = cart.read();
      const n = p ? Math.min(int(qty, 0), p.stock) : 0;
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
        else if (raw[id] > p.stock) { raw[id] = p.stock; changed = true; }
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
    store, clone, fmtFt, esc, int, categoryLabel, categories, imageUrl, slugify,
    sanitizeProduct, sanitizeCatalog, sanitizeSettings, sanitizeCategories, sanitizePayload, buildPayload,
    normalizeRemote, rawUrl, resolveRemote, setLocalRemote, fetchWithTimeout, fetchPublished,
    ready, load,
    get data() { return current; },
    products, settings, byId, isSoon, isBuyable, stockInfo, discount,
    cart, shippingFor, shippingMethods
  };
})();
