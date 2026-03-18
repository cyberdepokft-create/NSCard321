(() => {
  const DEFAULT_CATALOG = [
    {id:1,category:"booster",name:"Evolving Skies booster pakk",set:"Evolving Skies",line:"Légi energia, nagy bontásélmény",description:"Kedvelt, látványos és biztos kezdő választás, ha olyan pakkot keresel, amely már az első pillanatban megadja a bontás igazi hangulatát.",price:1490,oldPrice:1690,stock:18,badge:"Népszerű",flags:["popular"],art:"pack-electric.svg",images:["pack-electric.svg"],artA:"rgba(31,216,160,.22)",artB:"rgba(8,17,38,.04)"},
    {id:2,category:"booster",name:"Brilliant Stars booster pakk",set:"Brilliant Stars",line:"Fényes, ajándékba is erős választás",description:"Kiegyensúlyozott, könnyen szerethető csomag, amely remekül mutat a kínálat elején, és első rendeléshez is magabiztos döntés.",price:1590,oldPrice:null,stock:14,badge:"Top választás",flags:["popular","new"],art:"pack-stellar.svg",images:["pack-stellar.svg"],artA:"rgba(45,130,255,.22)",artB:"rgba(255,225,109,.05)"},
    {id:3,category:"booster",name:"Chilling Reign booster pakk",set:"Chilling Reign",line:"Hűvösebb tónus, kedvezőbb ár",description:"Akciós kedvenc azoknak, akik jó áron szeretnének bontani, miközben a komolyabb, sötétebb hangulatú vizuálból sem engednek.",price:1290,oldPrice:1490,stock:21,badge:"Akció",flags:["sale"],art:"pack-frost.svg",images:["pack-frost.svg"],artA:"rgba(170,130,255,.22)",artB:"rgba(8,17,38,.04)"},
    {id:4,category:"booster",name:"Legacy Series limitált pakk",set:"Legacy Series",line:"Különlegesebb, gyűjtőibb hangulat",description:"Kisebb készlettel futó, karakteres csomag, amely a kínálat prémiumabb oldalát erősíti, és remek választás, ha valami ritkábbat keresel.",price:2490,oldPrice:null,stock:6,badge:"Ritka kiadás",flags:["rare"],art:"pack-legacy.svg",images:["pack-legacy.svg"],artA:"rgba(255,215,109,.16)",artB:"rgba(8,17,38,.04)"},
    {id:5,category:"booster",name:"Silver Tempest booster pakk",set:"Silver Tempest",line:"Villámos, lendületes kedvenc",description:"Jó ár-érték arányú, erős megjelenésű pakk, amely különösen jól működik azoknál, akik szeretik a gyors, energikus bontásélményt.",price:1540,oldPrice:1740,stock:9,badge:"Akció + Top",flags:["sale","popular"],art:"pack-tempest.svg",images:["pack-tempest.svg"],artA:"rgba(108,232,255,.24)",artB:"rgba(8,17,38,.04)"},
    {id:6,category:"etb",name:"Crown Zenith elite pakk",set:"Crown Zenith",line:"Prémium csomag magasabb kosárértékhez",description:"Azoknak készült, akik nem egy gyors kört szeretnének, hanem valami komolyabbat. Erős jelenlét, prémium hangulat és emlékezetes bontás.",price:6990,oldPrice:null,stock:4,badge:"Elite",flags:["rare","popular"],art:"pack-crown.svg",images:["pack-crown.svg"],artA:"rgba(255,185,0,.22)",artB:"rgba(8,17,38,.04)"}
  ];

  const STORAGE_KEY = "ns-card-catalog-v2";
  const LEGACY_STORAGE_KEY = "ns-card-catalog-v1";
  const PUBLISHED_CACHE_KEY = "ns-card-catalog-published-cache-v1";
  const DRAFT_UPDATED_AT_KEY = "ns-card-catalog-draft-updated-at-v1";
  const PUBLISHED_UPDATED_AT_KEY = "ns-card-catalog-published-updated-at-v1";
  const REMOTE_CATALOG_FILE = "catalog.json";
  const REMOTE_SYNC_CONFIG_FILE = "sync-config.json";
  const REMOTE_SOURCE_KEY = "ns-card-remote-source-v1";
  const CATEGORIES = [
    { value: "booster", label: "Booster" },
    { value: "tinek", label: "Tinek" },
    { value: "display", label: "Display" },
    { value: "etb", label: "Elite trainer box" },
    { value: "mysteri", label: "Mysteri box" },
    { value: "single", label: "Single Cards" },
    { value: "accessories", label: "Kiegészítők" },
    { value: "collections", label: "Collections" }
  ];
  const FLAG_OPTIONS = [
    { value: "popular", label: "Népszerű" },
    { value: "sale", label: "Akció" },
    { value: "rare", label: "Ritka" },
    { value: "new", label: "Új" }
  ];
  const AVAILABILITY_OPTIONS = [
    { value: "in_stock", label: "Készleten" },
    { value: "coming_soon", label: "Hamarosan" }
  ];
  const ART_OPTIONS = [
    { value: "pack-electric.svg", label: "Electric booster" },
    { value: "pack-stellar.svg", label: "Stellar booster" },
    { value: "pack-frost.svg", label: "Frost booster" },
    { value: "pack-legacy.svg", label: "Legacy booster" },
    { value: "pack-tempest.svg", label: "Tempest booster" },
    { value: "pack-crown.svg", label: "Crown ETB" },
    { value: "__custom__", label: "Egyedi kép URL" }
  ];

  let publishedCatalogCache = [];

  function appendCacheBuster(url, hardRefresh = false) {
    const normalized = String(url || "").trim();
    if (!hardRefresh || !normalized) return normalized;
    const glue = normalized.includes("?") ? "&" : "?";
    return `${normalized}${glue}v=${Date.now()}`;
  }

  function encodeUrlPath(pathValue) {
    return String(pathValue || "")
      .split("/")
      .filter(Boolean)
      .map(part => encodeURIComponent(part))
      .join("/");
  }

  function buildGitHubRawUrl(settings = {}) {
    const owner = String(settings.owner || "").trim();
    const repo = String(settings.repo || "").trim();
    const branch = String(settings.branch || "main").trim() || "main";
    const path = String(settings.path || REMOTE_CATALOG_FILE).trim() || REMOTE_CATALOG_FILE;
    if (!owner || !repo || !branch || !path) return "";
    return `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodeUrlPath(branch)}/${encodeUrlPath(path)}`;
  }

  const deepClone = value => JSON.parse(JSON.stringify(value));
  const isBrowserStorageAvailable = () => {
    try {
      return typeof localStorage !== "undefined";
    } catch {
      return false;
    }
  };

  const isAdminContext = () => {
    try {
      return document?.body?.dataset?.page === "admin" || /(^|\/)admin(\.html)?$/i.test(location.pathname);
    } catch {
      return false;
    }
  };

  const deepEqualCatalog = (a, b) => JSON.stringify(a || []) === JSON.stringify(b || []);

  function normalizeFlags(flags) {
    if (!Array.isArray(flags)) return [];
    return [...new Set(flags.map(flag => String(flag || "").trim().toLowerCase()).filter(Boolean))];
  }

  function normalizeAvailability(rawValue) {
    const value = String(rawValue || "").trim().toLowerCase();
    if (["hamarosan", "coming_soon", "comingsoon", "soon", "preorder", "pre_order", "pre-order"].includes(value)) return "coming_soon";
    return "in_stock";
  }

  function normalizeImages(rawImages, fallbackArt) {
    const list = Array.isArray(rawImages)
      ? rawImages
      : (typeof rawImages === "string" && rawImages.trim() ? [rawImages] : []);
    const cleaned = [...new Set(list.map(item => String(item || "").trim()).filter(Boolean))];
    const fallback = String(fallbackArt || "").trim();
    if (!cleaned.length && fallback) cleaned.push(fallback);
    return cleaned;
  }

  function sanitizeProduct(raw, index = 0) {
    const fallback = DEFAULT_CATALOG[index] || DEFAULT_CATALOG[0];
    const id = Number(raw?.id);
    const price = Math.max(0, Math.round(Number(raw?.price) || 0));
    const oldPriceValue = raw?.oldPrice === null || raw?.oldPrice === "" || typeof raw?.oldPrice === "undefined"
      ? null
      : Math.max(0, Math.round(Number(raw.oldPrice) || 0));
    const stock = Math.max(0, Math.round(Number(raw?.stock) || 0));
    const category = String(raw?.category ?? fallback?.category ?? "booster").trim().toLowerCase() || (fallback?.category || "booster");
    const availability = normalizeAvailability(raw?.availability ?? raw?.status ?? (raw?.stock === 0 && /hamarosan/i.test(String(raw?.badge || "")) ? "coming_soon" : ""));
    const fallbackBadge = availability === "coming_soon" ? "Hamarosan" : "Kiemelt";
    const badge = String(raw?.badge ?? fallbackBadge).trim() || fallbackBadge;
    const fallbackArt = String(raw?.art ?? fallback?.art ?? "pack-electric.svg").trim() || (fallback?.art || "pack-electric.svg");
    const images = normalizeImages(raw?.images, fallbackArt);
    const art = images[0] || fallbackArt;
    const artA = String(raw?.artA ?? "#1fd8a0").trim() || "#1fd8a0";
    const artB = String(raw?.artB ?? "#081126").trim() || "#081126";
    const product = {
      id: Number.isFinite(id) && id > 0 ? id : (fallback?.id || index + 1),
      category,
      name: String(raw?.name ?? "").trim(),
      set: String(raw?.set ?? "").trim(),
      line: String(raw?.line ?? "").trim(),
      description: String(raw?.description ?? "").trim(),
      price,
      oldPrice: oldPriceValue && oldPriceValue > 0 ? oldPriceValue : null,
      stock,
      availability,
      badge,
      flags: normalizeFlags(raw?.flags),
      art,
      images,
      artA,
      artB
    };
    if (!product.flags.length && product.badge.toLowerCase().includes("akció")) product.flags = ["sale"];
    return product;
  }

  function sanitizeCatalog(list) {
    if (!Array.isArray(list)) return [];
    const cleaned = list.map((item, index) => sanitizeProduct(item, index));
    const seen = new Set();
    cleaned.forEach(item => {
      while (seen.has(item.id)) item.id += 1;
      seen.add(item.id);
    });
    return cleaned.sort((a, b) => a.id - b.id);
  }

  function extractCatalogFromPayload(payload) {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.products)) return payload.products;
    return null;
  }

  function normalizeRemoteSource(raw) {
    if (!raw || typeof raw !== "object") return null;
    const provider = String(raw.provider || "").trim().toLowerCase();
    const owner = String(raw.owner || "").trim();
    const repo = String(raw.repo || "").trim();
    const branch = String(raw.branch || "main").trim() || "main";
    const path = String(raw.path || REMOTE_CATALOG_FILE).trim() || REMOTE_CATALOG_FILE;
    const directUrl = String(raw.url || raw.directUrl || "").trim();

    if (provider === "github" || (!provider && owner && repo)) {
      if (!owner || !repo) return directUrl ? { provider: "url", url: directUrl } : null;
      return {
        provider: "github",
        owner,
        repo,
        branch,
        path,
        url: directUrl || buildGitHubRawUrl({ owner, repo, branch, path })
      };
    }

    if (directUrl) {
      return { provider: "url", url: directUrl };
    }

    return null;
  }

  function readRemoteSourceConfig() {
    let base = null;
    if (isBrowserStorageAvailable()) {
      try {
        const raw = localStorage.getItem(REMOTE_SOURCE_KEY);
        if (raw) base = normalizeRemoteSource(JSON.parse(raw));
      } catch {}
    }

    try {
      const params = new URLSearchParams(location.search);
      const urlConfig = normalizeRemoteSource({
        provider: params.get("provider") || params.get("sync_provider") || "github",
        owner: params.get("gh_owner") || "",
        repo: params.get("gh_repo") || "",
        branch: params.get("gh_branch") || "main",
        path: params.get("gh_path") || REMOTE_CATALOG_FILE,
        url: params.get("catalog_url") || ""
      });
      if (urlConfig) {
        setRemoteSourceConfig(urlConfig);
        return urlConfig;
      }
    } catch {}

    return base;
  }

  function setRemoteSourceConfig(raw) {
    const normalized = normalizeRemoteSource(raw);
    if (isBrowserStorageAvailable()) {
      try {
        if (normalized) localStorage.setItem(REMOTE_SOURCE_KEY, JSON.stringify(normalized));
        else localStorage.removeItem(REMOTE_SOURCE_KEY);
      } catch {}
    }
    return normalized;
  }

  function extractRemoteSourceFromPayload(payload) {
    const directCandidate = payload?.sync || payload?.source || payload?.remoteSource || payload;
    return normalizeRemoteSource(directCandidate);
  }

  function getRemoteCatalogCandidates() {
    const candidates = [];
    const configured = readRemoteSourceConfig();
    if (configured?.url) candidates.push({ url: configured.url, source: configured, remote: true });
    candidates.push({ url: REMOTE_CATALOG_FILE, source: null, remote: false });
    return candidates;
  }

  async function fetchCatalogPayload(url, options = {}) {
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timeoutMs = Math.max(2500, Number(options?.timeoutMs) || 6500);
    const timeoutId = controller ? window.setTimeout(() => controller.abort(), timeoutMs) : 0;
    try {
      const response = await fetch(appendCacheBuster(url, !!options?.bypassCache), {
        cache: options?.bypassCache ? "no-store" : "no-cache",
        headers: { "Accept": "application/json" },
        signal: controller?.signal
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    } finally {
      if (timeoutId) window.clearTimeout(timeoutId);
    }
  }

  function readCatalogFromStorageKey(key) {
    if (!isBrowserStorageAvailable()) return null;
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return null;
      const parsed = JSON.parse(raw);
      const incoming = extractCatalogFromPayload(parsed);
      if (!Array.isArray(incoming)) return null;
      return sanitizeCatalog(incoming);
    } catch {
      return null;
    }
  }

  function readTimestamp(key) {
    if (!isBrowserStorageAvailable()) return 0;
    try {
      const value = Number(localStorage.getItem(key) || 0);
      return Number.isFinite(value) && value > 0 ? value : 0;
    } catch {
      return 0;
    }
  }

  function writeTimestamp(key, value = Date.now()) {
    if (!isBrowserStorageAvailable()) return 0;
    const timestamp = Number(value);
    const next = Number.isFinite(timestamp) && timestamp > 0 ? Math.round(timestamp) : Date.now();
    try {
      localStorage.setItem(key, String(next));
    } catch {}
    return next;
  }

  function clearTimestamp(key) {
    if (!isBrowserStorageAvailable()) return;
    try {
      localStorage.removeItem(key);
    } catch {}
  }

  function hasNewerDraftThanPublished() {
    const draft = readDraftCatalog();
    if (!draft?.length) return false;
    const published = readPublishedCache();
    if (!published.length) return true;
    return readTimestamp(DRAFT_UPDATED_AT_KEY) > readTimestamp(PUBLISHED_UPDATED_AT_KEY);
  }

  function migrateLegacyDraftIfNeeded() {
    if (!isBrowserStorageAvailable()) return;
    try {
      if (localStorage.getItem(STORAGE_KEY) !== null) return;
      const legacy = readCatalogFromStorageKey(LEGACY_STORAGE_KEY);
      if (!legacy?.length) return;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));
    } catch {}
  }

  function readDraftCatalog() {
    migrateLegacyDraftIfNeeded();
    return readCatalogFromStorageKey(STORAGE_KEY);
  }

  function hasDraftCatalog() {
    const draft = readDraftCatalog();
    return Array.isArray(draft) && draft.length > 0;
  }

  function readPublishedCache() {
    if (publishedCatalogCache.length) return deepClone(publishedCatalogCache);
    const cached = readCatalogFromStorageKey(PUBLISHED_CACHE_KEY);
    if (cached?.length) {
      publishedCatalogCache = deepClone(cached);
      return deepClone(cached);
    }
    return [];
  }

  function setPublishedCache(list, options = {}) {
    const cleaned = sanitizeCatalog(list);
    publishedCatalogCache = deepClone(cleaned);
    if (isBrowserStorageAvailable()) {
      try {
        localStorage.setItem(PUBLISHED_CACHE_KEY, JSON.stringify(cleaned));
      } catch {}
    }
    const timestampSource = options?.updatedAt ? new Date(options.updatedAt).getTime() : Date.now();
    writeTimestamp(PUBLISHED_UPDATED_AT_KEY, timestampSource);
    return deepClone(cleaned);
  }

  function clearDraftCatalog() {
    if (isBrowserStorageAvailable()) {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
    }
    clearTimestamp(DRAFT_UPDATED_AT_KEY);
  }

  function readCatalog(options = {}) {
    const preferDraft = typeof options?.preferDraft === "boolean" ? options.preferDraft : isAdminContext();
    const draft = readDraftCatalog();
    const published = readPublishedCache();
    if (preferDraft && draft?.length) return deepClone(draft);
    if (!preferDraft && draft?.length && (hasNewerDraftThanPublished() || !published.length)) return deepClone(draft);
    if (published.length) return deepClone(published);
    if (draft?.length) return deepClone(draft);
    return deepClone(DEFAULT_CATALOG);
  }

  function saveCatalog(list, options = {}) {
    const cleaned = sanitizeCatalog(list);
    if (isBrowserStorageAvailable()) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
      } catch {}
    }
    writeTimestamp(DRAFT_UPDATED_AT_KEY);
    if (options?.published) setPublishedCache(cleaned, options);
    window.NSCardCatalog = deepClone(cleaned);
    return deepClone(cleaned);
  }

  function resetCatalog() {
    clearDraftCatalog();
    window.NSCardCatalog = readPublishedCache().length ? readPublishedCache() : deepClone(DEFAULT_CATALOG);
    return deepClone(DEFAULT_CATALOG);
  }

  function nextId(list = readCatalog()) {
    return list.reduce((max, item) => Math.max(max, Number(item?.id) || 0), 0) + 1;
  }

  function buildCatalogPayload(list, extra = {}) {
    const cleaned = sanitizeCatalog(list);
    const payload = {
      version: 2,
      updatedAt: extra.updatedAt || new Date().toISOString(),
      updatedBy: extra.updatedBy || "NS Card admin",
      products: cleaned
    };
    const sync = normalizeRemoteSource(extra.sync || readRemoteSourceConfig());
    if (sync) payload.sync = sync;
    return payload;
  }

  function buildRemoteSyncPayload(raw) {
    const sync = normalizeRemoteSource(raw || readRemoteSourceConfig());
    if (!sync) return null;
    return {
      version: 1,
      updatedAt: new Date().toISOString(),
      provider: sync.provider || "github",
      owner: sync.owner || "",
      repo: sync.repo || "",
      branch: sync.branch || "main",
      path: sync.path || REMOTE_CATALOG_FILE,
      url: sync.url || ""
    };
  }

  async function loadRemoteCatalog(options = {}) {
    const previous = readPublishedCache();
    const shouldShowPublished = options?.forceVisible || !hasDraftCatalog() || !isAdminContext();

    const applyCatalogPayload = (payload, meta = {}) => {
      const incoming = extractCatalogFromPayload(payload);
      if (!Array.isArray(incoming)) throw new Error("invalid payload");
      const cleaned = setPublishedCache(incoming, { updatedAt: payload?.updatedAt });
      const discoveredSource = extractRemoteSourceFromPayload(payload) || meta.source || null;
      if (discoveredSource) setRemoteSourceConfig(discoveredSource);
      const changed = !deepEqualCatalog(previous, cleaned);
      if (shouldShowPublished) window.NSCardCatalog = deepClone(cleaned);
      if (changed) notifyCatalogChanged(meta.reason || (meta.remote ? "remote-live-sync" : "remote-sync"));
      return {
        catalog: deepClone(cleaned),
        changed,
        reason: meta.reason || (meta.remote ? "remote-live-sync" : "remote-sync"),
        source: discoveredSource,
        remote: !!meta.remote
      };
    };

    const fetchAndApply = async (url, meta = {}) => {
      const payload = await fetchCatalogPayload(url, meta.fetchOptions || {});
      return applyCatalogPayload(payload, meta);
    };

    let activeSource = normalizeRemoteSource(options?.source || readRemoteSourceConfig());

    if (!activeSource?.url) {
      try {
        const syncPayload = await fetchCatalogPayload(REMOTE_SYNC_CONFIG_FILE, { timeoutMs: 3500 });
        const discoveredFromConfig = extractRemoteSourceFromPayload(syncPayload);
        if (discoveredFromConfig?.url) activeSource = setRemoteSourceConfig(discoveredFromConfig);
      } catch {}
    }

    if (activeSource?.url) {
      try {
        return await fetchAndApply(activeSource.url, {
          source: activeSource,
          remote: true,
          reason: "remote-live-sync"
        });
      } catch {}
    }

    try {
      const localResult = await fetchAndApply(REMOTE_CATALOG_FILE, {
        remote: false,
        reason: "remote-sync"
      });
      const discoveredFromCatalog = localResult?.source;
      const shouldUpgradeToLive = discoveredFromCatalog?.url && (!activeSource?.url || discoveredFromCatalog.url !== activeSource.url);
      if (shouldUpgradeToLive) {
        try {
          return await fetchAndApply(discoveredFromCatalog.url, {
            source: discoveredFromCatalog,
            remote: true,
            reason: "remote-live-sync"
          });
        } catch {}
      }
      return localResult;
    } catch {}

    const published = readPublishedCache();
    if (shouldShowPublished && published.length) window.NSCardCatalog = deepClone(published);
    const fallbackCatalog = published.length ? deepClone(published) : deepClone(DEFAULT_CATALOG);
    return {
      catalog: fallbackCatalog,
      changed: false,
      reason: "fallback",
      source: activeSource || null,
      remote: false
    };
  }

  function notifyCatalogChanged(reason = "catalog") {
    window.dispatchEvent(new CustomEvent("ns-card-catalog-updated", { detail: { reason } }));
  }

  window.NSCardDefaultCatalog = deepClone(DEFAULT_CATALOG);
  window.NSCardCatalog = readCatalog({ preferDraft: isAdminContext() });
  window.NSCardCatalogReady = loadRemoteCatalog();
  window.NSCardAdmin = {
    STORAGE_KEY,
    LEGACY_STORAGE_KEY,
    PUBLISHED_CACHE_KEY,
    DRAFT_UPDATED_AT_KEY,
    PUBLISHED_UPDATED_AT_KEY,
    REMOTE_CATALOG_FILE,
    REMOTE_SYNC_CONFIG_FILE,
    REMOTE_SOURCE_KEY,
    categories: deepClone(CATEGORIES),
    flagOptions: deepClone(FLAG_OPTIONS),
    availabilityOptions: deepClone(AVAILABILITY_OPTIONS),
    artOptions: deepClone(ART_OPTIONS),
    readCatalog,
    readDraftCatalog,
    hasDraftCatalog,
    readPublishedCatalog: readPublishedCache,
    readRemoteSourceConfig,
    setRemoteSourceConfig,
    setPublishedCache,
    hasNewerDraftThanPublished,
    saveCatalog,
    clearDraftCatalog,
    resetCatalog,
    nextId,
    sanitizeProduct,
    sanitizeCatalog,
    buildCatalogPayload,
    buildRemoteSyncPayload,
    buildGitHubRawUrl,
    loadRemoteCatalog,
    notifyCatalogChanged
  };
})();
