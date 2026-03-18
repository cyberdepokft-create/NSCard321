(() => {
  const api = window.NSCardAdmin;
  if (!api) return;

  const AUTH_SESSION_KEY = "ns-card-admin-auth-v1";
  const AUTH_USERNAME = "NSadmin";
  const AUTH_PASSWORD = "123321rewREW!";
  const GITHUB_SETTINGS_KEY = "ns-card-admin-github-v1";
  const MAX_UPLOAD_IMAGES = 5;
  const MAX_IMAGE_SIZE = 700000;
  const AUTO_PUBLISH_DEBOUNCE_MS = 700;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const fmtFt = value => new Intl.NumberFormat("hu-HU").format(Number(value) || 0) + " Ft";
  const CATEGORY_LABELS = Object.fromEntries(api.categories.map(item => [item.value, item.label]));
  const FLAG_LABELS = Object.fromEntries(api.flagOptions.map(item => [item.value, item.label]));
  const AVAILABILITY_LABELS = Object.fromEntries((api.availabilityOptions || []).map(item => [item.value, item.label]));
  const NETLIFY_DEPLOY_PRESET = Object.freeze({
    buildCommand: "echo \"NS Card static site ready\"",
    publishDir: ".",
    baseDir: ".",
    branch: "main"
  });
  const SYNC_CONFIG_FILE = api.REMOTE_SYNC_CONFIG_FILE || "sync-config.json";
  const DEFAULT_GITHUB_SETTINGS = {
    owner: "",
    repo: "",
    branch: "main",
    path: api.REMOTE_CATALOG_FILE || "catalog.json",
    token: "",
    autoPublish: true,
    buildHook: ""
  };

  const state = {
    items: [],
    query: "",
    filter: "all",
    editingId: null,
    uploadedImagesData: [],
    retainedImages: [],
    github: { ...DEFAULT_GITHUB_SETTINGS },
    publishing: false,
    pendingAutoPublish: false,
    autoPublishTimer: 0
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function toast(message) {
    const el = $("#toast");
    if (!el) return;
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(window.__nsAdminToastTimer);
    window.__nsAdminToastTimer = setTimeout(() => el.classList.remove("show"), 2400);
  }

  function setPublishStatus(message = "", variant = "") {
    const el = $("[data-github-status]");
    if (!el) return;
    el.textContent = message || "";
    el.className = "admin-publish-status" + (variant ? ` is-${variant}` : "");
  }

  function hasGitHubTargetConfigured(settings = state.github) {
    const current = settings || {};
    return !!(
      String(current.owner || '').trim() &&
      String(current.repo || '').trim() &&
      String(current.branch || '').trim() &&
      String(current.path || '').trim()
    );
  }

  function clearAutoPublishTimer() {
    if (!state.autoPublishTimer) return;
    window.clearTimeout(state.autoPublishTimer);
    state.autoPublishTimer = 0;
  }

  function setAuthenticated(value) {
    try {
      if (value) sessionStorage.setItem(AUTH_SESSION_KEY, "1");
      else sessionStorage.removeItem(AUTH_SESSION_KEY);
    } catch {}
  }

  function isAuthenticated() {
    try {
      return sessionStorage.getItem(AUTH_SESSION_KEY) === "1";
    } catch {
      return false;
    }
  }

  function loadGitHubSettings() {
    let base = { ...DEFAULT_GITHUB_SETTINGS };
    try {
      const raw = localStorage.getItem(GITHUB_SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        base = {
          owner: String(parsed?.owner || "").trim(),
          repo: String(parsed?.repo || "").trim(),
          branch: String(parsed?.branch || "main").trim() || "main",
          path: String(parsed?.path || api.REMOTE_CATALOG_FILE || "catalog.json").trim() || (api.REMOTE_CATALOG_FILE || "catalog.json"),
          token: String(parsed?.token || "").trim(),
          autoPublish: typeof parsed?.autoPublish === "boolean" ? parsed.autoPublish : true,
          buildHook: String(parsed?.buildHook || "").trim()
        };
      }
    } catch {}
    const urlDefaults = getUrlDrivenGitHubDefaults();
    return { ...base, ...urlDefaults };
  }

  function saveGitHubSettingsToStorage() {
    try {
      localStorage.setItem(GITHUB_SETTINGS_KEY, JSON.stringify(state.github));
    } catch {}
  }

  function applyDeployPreset() {
    const commandField = $("#deployPresetCommand");
    const publishField = $("#deployPresetPublish");
    const baseField = $("#deployPresetBase");
    const branchField = $("#deployPresetBranch");
    if (commandField) commandField.value = NETLIFY_DEPLOY_PRESET.buildCommand;
    if (publishField) publishField.value = NETLIFY_DEPLOY_PRESET.publishDir;
    if (baseField) baseField.value = NETLIFY_DEPLOY_PRESET.baseDir;
    if (branchField) branchField.value = state.github.branch || NETLIFY_DEPLOY_PRESET.branch;
  }

  function buildNetlifyDeployUrl(settings = state.github) {
    const owner = String(settings?.owner || "").trim();
    const repo = String(settings?.repo || "").trim();
    const branch = String(settings?.branch || NETLIFY_DEPLOY_PRESET.branch).trim() || NETLIFY_DEPLOY_PRESET.branch;
    if (!owner || !repo) return "";
    const params = new URLSearchParams({
      repository: `https://github.com/${owner}/${repo}`,
      branch,
      base: NETLIFY_DEPLOY_PRESET.baseDir
    });
    return `https://app.netlify.com/start/deploy?${params.toString()}`;
  }

  function refreshNetlifyDeployUi() {
    const branchField = $("#deployPresetBranch");
    const linkField = $("#netlifyDeployLink");
    const openButton = $("[data-open-netlify-deploy]");
    const copyButton = $("[data-copy-netlify-deploy-link]");
    const url = buildNetlifyDeployUrl();
    if (branchField) branchField.value = state.github.branch || NETLIFY_DEPLOY_PRESET.branch;
    if (linkField) linkField.value = url;
    const isReady = !!url;
    if (openButton) openButton.disabled = !isReady;
    if (copyButton) copyButton.disabled = !isReady;
  }

  function getUrlDrivenGitHubDefaults() {
    const params = new URLSearchParams(window.location.search);
    const maybe = value => String(value || "").trim();
    const next = {};
    const owner = maybe(params.get("gh_owner"));
    const repo = maybe(params.get("gh_repo"));
    const branch = maybe(params.get("gh_branch"));
    const pathValue = maybe(params.get("gh_path"));
    const buildHook = maybe(params.get("build_hook"));
    const token = maybe(params.get("gh_token"));
    if (owner) next.owner = owner;
    if (repo) next.repo = repo;
    if (branch) next.branch = branch;
    if (pathValue) next.path = pathValue;
    if (buildHook) next.buildHook = buildHook;
    if (token) next.token = token;
    if (params.has("auto_publish")) next.autoPublish = params.get("auto_publish") !== "0";
    return next;
  }

  function populateGitHubForm() {
    const wrap = $("[data-github-form]");
    if (!wrap) return;
    $("#githubOwner", wrap).value = state.github.owner;
    $("#githubRepo", wrap).value = state.github.repo;
    $("#githubBranch", wrap).value = state.github.branch;
    $("#githubPath", wrap).value = state.github.path;
    $("#githubToken", wrap).value = state.github.token;
    $("#githubAutoPublish", wrap).checked = !!state.github.autoPublish;
    const buildHookField = $("#githubBuildHook", wrap);
    if (buildHookField) buildHookField.value = state.github.buildHook || "";
    refreshNetlifyDeployUi();
  }

  function readGitHubForm() {
    const wrap = $("[data-github-form]");
    if (!wrap) return { ...state.github };
    state.github = {
      owner: $("#githubOwner", wrap).value.trim(),
      repo: $("#githubRepo", wrap).value.trim(),
      branch: $("#githubBranch", wrap).value.trim() || "main",
      path: $("#githubPath", wrap).value.trim() || (api.REMOTE_CATALOG_FILE || "catalog.json"),
      token: $("#githubToken", wrap).value.trim(),
      autoPublish: !!$("#githubAutoPublish", wrap).checked,
      buildHook: $("#githubBuildHook", wrap)?.value.trim() || ""
    };
    refreshNetlifyDeployUi();
    return { ...state.github };
  }

  function syncGitHubFormState() {
    const settings = readGitHubForm();
    saveGitHubSettingsToStorage();
    if (hasGitHubTargetConfigured(settings)) api.setRemoteSourceConfig(settings);
    return settings;
  }

  function scheduleAutoPublish(message = 'A módosítás mentve, automatikus publikálás indul…') {
    const settings = syncGitHubFormState();
    clearAutoPublishTimer();
    if (!settings.autoPublish) return;
    setPublishStatus(message, 'loading');
    state.autoPublishTimer = window.setTimeout(() => {
      state.autoPublishTimer = 0;
      void runAutoPublish();
    }, AUTO_PUBLISH_DEBOUNCE_MS);
  }

  async function runAutoPublish() {
    if (state.publishing) {
      state.pendingAutoPublish = true;
      return false;
    }
    const published = await publishCatalogToGitHub({ silent: true, automatic: true });
    if (!published) {
      setPublishStatus('A változás helyben elmentve, de az automatikus GitHub publikálás nem futott végig. Ellenőrizd a GitHub kapcsolat beállításait.', 'warn');
    }
    return published;
  }

  function updateAuthView() {
    const isAuthed = isAuthenticated();
    const authPanel = $("[data-admin-auth-panel]");
    const adminApp = $("[data-admin-app]");
    if (authPanel) authPanel.hidden = isAuthed;
    if (adminApp) adminApp.hidden = !isAuthed;
    if (isAuthed) {
      renderAll();
      populateGitHubForm();
    } else {
      $("#adminUsername")?.focus();
    }
  }

  function handleLoginSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const username = form.adminUsername.value.trim();
    const password = form.adminPassword.value;
    if (username === AUTH_USERNAME && password === AUTH_PASSWORD) {
      setAuthenticated(true);
      form.reset();
      updateAuthView();
      toast("Sikeres admin belépés.");
      return;
    }
    toast("Hibás felhasználónév vagy jelszó.");
    form.adminPassword.value = "";
    form.adminPassword.focus();
  }

  function handleLogout() {
    setAuthenticated(false);
    updateAuthView();
    toast("Kijelentkeztél az admin felületről.");
  }

  async function loadItems() {
    if (window.NSCardCatalogReady && typeof window.NSCardCatalogReady.then === "function") {
      try { await window.NSCardCatalogReady; } catch {}
    }
    state.items = api.readCatalog();
    window.NSCardCatalog = api.readCatalog();
  }

  async function refreshAdminProducts() {
    const activeEditId = state.editingId;
    try {
      if (typeof api.loadRemoteCatalog === "function") {
        await api.loadRemoteCatalog({ forceVisible: false });
      }
      await loadItems();
      renderAll();
      if (activeEditId) {
        const current = state.items.find(item => item.id === activeEditId);
        fillForm(current || null);
      } else {
        fillForm();
      }
      toast('A terméklista újratöltve.');
    } catch {
      toast('A terméklista frissítése nem sikerült.');
    }
  }

  function persistItems(message) {
    state.items = api.saveCatalog(state.items);
    window.NSCardCatalog = api.readCatalog();
    api.notifyCatalogChanged("draft");
    renderAll();
    if (message) toast(message);
    scheduleAutoPublish();
  }

  function populateSelects() {
    const categorySelect = $("#category");
    const adminFilter = $("[data-admin-filter]");
    const availabilitySelect = $("#availability");
    const artSelect = $("#artPreset");
    const flagWrap = $("[data-flag-wrap]");

    if (categorySelect) {
      categorySelect.innerHTML = api.categories.map(item => `<option value="${item.value}">${item.label}</option>`).join("");
    }
    if (adminFilter) {
      adminFilter.innerHTML = ['<option value="all">Összes kategória</option>']
        .concat(api.categories.map(item => `<option value="${item.value}">${item.label}</option>`))
        .join("");
    }
    if (availabilitySelect) {
      availabilitySelect.innerHTML = (api.availabilityOptions || [
        { value: "in_stock", label: "Készleten" },
        { value: "coming_soon", label: "Hamarosan" }
      ]).map(item => `<option value="${item.value}">${item.label}</option>`).join("");
    }
    if (artSelect) {
      artSelect.innerHTML = api.artOptions.map(item => `<option value="${item.value}">${item.label}</option>`).join("");
    }
    if (flagWrap) {
      flagWrap.innerHTML = api.flagOptions.map(item => `
        <label class="check-pill">
          <input type="checkbox" value="${item.value}" data-flag>
          <span>${item.label}</span>
        </label>
      `).join("");
    }
  }

  function updateCustomArtVisibility() {
    const select = $("#artPreset");
    const wrap = $("[data-custom-art-wrap]");
    if (!select || !wrap) return;
    wrap.classList.toggle("is-hidden", select.value !== "__custom__");
  }

  function getActiveFormImages() {
    if (state.uploadedImagesData.length) return [...state.uploadedImagesData];
    if (state.retainedImages.length) return [...state.retainedImages];
    const form = $("#adminProductForm");
    if (!form) return [];
    const art = form.artPreset.value === "__custom__"
      ? form.customArt.value.trim()
      : form.artPreset.value;
    return art ? [art] : [];
  }

  function setPrimaryImage(index) {
    const source = state.uploadedImagesData.length
      ? state.uploadedImagesData
      : (state.retainedImages.length ? state.retainedImages : null);
    if (!source || !source[index]) return;
    if (index === 0) {
      refreshArtPreviewFromFields();
      return;
    }
    const next = [...source];
    const [selected] = next.splice(index, 1);
    next.unshift(selected);
    if (state.uploadedImagesData.length) state.uploadedImagesData = next;
    else state.retainedImages = next;
    refreshArtPreviewFromFields();
    toast('A kiválasztott kép lett a fő kép.');
  }

  function renderImagePreview(images = []) {
    const preview = $("[data-art-preview]");
    if (!preview) return;
    const list = images.filter(Boolean);
    if (!list.length) {
      preview.innerHTML = '<span>Nincs kiválasztott kép</span>';
      return;
    }
    preview.innerHTML = `
      <div class="admin-image-preview-grid">
        ${list.map((src, index) => `
          <div class="admin-image-preview-item ${index === 0 ? 'is-primary' : ''}">
            <img src="${escapeHtml(src)}" alt="Termékkép ${index + 1}">
            <div class="admin-image-preview-meta">
              <strong>${index === 0 ? 'Fő kép' : `${index + 1}. kép`}</strong>
              ${index === 0
                ? '<span class="admin-image-primary-note">Ez jelenik meg elsőként.</span>'
                : `<button class="admin-image-primary-btn" type="button" data-make-primary="${index}">Legyen ez a fő kép</button>`}
            </div>
          </div>
        `).join("")}
      </div>
    `;
    $$('[data-make-primary]', preview).forEach(button => {
      button.addEventListener('click', () => setPrimaryImage(Number(button.dataset.makePrimary)));
    });
  }

  function refreshArtPreviewFromFields() {
    renderImagePreview(getActiveFormImages());
    const count = $("[data-image-count]");
    if (count) {
      const total = getActiveFormImages().length;
      count.textContent = total ? `${total} kép kiválasztva` : "Nincs kiválasztott kép";
    }
  }

  function clearUploadedImages(showToast = false) {
    state.uploadedImagesData = [];
    state.retainedImages = [];
    const fileInput = $("[data-product-image-file]");
    if (fileInput) fileInput.value = "";
    refreshArtPreviewFromFields();
    if (showToast) toast("A kiválasztott képeket töröltük az űrlapról.");
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleProductImageUpload(event) {
    const files = [...(event.target.files || [])];
    if (!files.length) {
      state.uploadedImagesData = [];
      refreshArtPreviewFromFields();
      return;
    }
    if (files.length > MAX_UPLOAD_IMAGES) {
      event.target.value = "";
      toast(`Maximum ${MAX_UPLOAD_IMAGES} képet tölthetsz fel egyszerre.`);
      return;
    }
    for (const file of files) {
      if (file.type && !file.type.startsWith("image/")) {
        event.target.value = "";
        toast("Csak képfájl tölthető fel.");
        return;
      }
      if (file.size > MAX_IMAGE_SIZE) {
        event.target.value = "";
        toast("Egy kép legfeljebb kb. 700 KB lehet, hogy stabilan publikálható maradjon.");
        return;
      }
    }
    try {
      const images = [];
      for (const file of files) {
        const dataUrl = await fileToDataUrl(file);
        if (dataUrl) images.push(dataUrl);
      }
      state.uploadedImagesData = images;
      state.retainedImages = [];
      refreshArtPreviewFromFields();
      toast(`A ${images.length} képfájl betöltve. Mentés után a termékhez kerül.`);
    } catch {
      toast("A képek betöltése nem sikerült.");
    }
  }

  function updateStats() {
    const lowStock = state.items.filter(item => item.availability !== "coming_soon" && Number(item.stock) <= 5).length;
    const saleCount = state.items.filter(item => (item.flags || []).includes("sale")).length;
    const totalStock = state.items.reduce((sum, item) => sum + (item.availability === "coming_soon" ? 0 : (Number(item.stock) || 0)), 0);

    $("[data-stat-total]") && ($("[data-stat-total]").textContent = state.items.length);
    $("[data-stat-low]") && ($("[data-stat-low]").textContent = lowStock);
    $("[data-stat-sale]") && ($("[data-stat-sale]").textContent = saleCount);
    $("[data-stat-stock]") && ($("[data-stat-stock]").textContent = totalStock);
  }

  function filteredItems() {
    let list = [...state.items];
    if (state.filter !== "all") list = list.filter(item => item.category === state.filter);
    if (state.query.trim()) {
      const query = state.query.trim().toLowerCase();
      list = list.filter(item => [item.name, item.set, item.line, item.badge, item.description, CATEGORY_LABELS[item.category] || item.category, AVAILABILITY_LABELS[item.availability] || item.availability].join(" ").toLowerCase().includes(query));
    }
    return list.sort((a, b) => a.id - b.id);
  }

  function rowMarkup(item) {
    const flags = Array.isArray(item.flags) ? item.flags : [];
    const comingSoon = item.availability === "coming_soon";
    const lowStock = !comingSoon && Number(item.stock) <= 5;
    const stockLabel = comingSoon ? "⏳ Hamarosan" : `📦 ${escapeHtml(item.stock)} db`;
    const stockClass = comingSoon ? "meta-soon" : (lowStock ? "meta-warn" : "");
    const images = Array.isArray(item.images) && item.images.length ? item.images : [item.art].filter(Boolean);
    const descriptionMarkup = item.description ? `<p>${escapeHtml(item.description)}</p>` : "";
    return `
      <article class="admin-product">
        <div class="admin-product-visual" style="--art-a:${escapeHtml(item.artA)};--art-b:${escapeHtml(item.artB)};">
          <img src="${escapeHtml(images[0] || item.art)}" alt="${escapeHtml(item.name)}">
          ${images.length > 1 ? `<span class="gallery-count admin-mini-gallery">+${images.length} kép</span>` : ""}
        </div>
        <div class="admin-product-copy">
          <div class="admin-product-top">
            <div>
              <div class="card-eyebrow">${escapeHtml(CATEGORY_LABELS[item.category] || item.category || "Termék")}</div>
              <h3>${escapeHtml(item.name)}</h3>
              ${descriptionMarkup}
            </div>
            <div class="admin-inline-chips">
              <span class="meta">🏷️ ${escapeHtml(item.badge || "Kiemelt")}</span>
              <span class="meta">🎯 ${escapeHtml(item.set || "Általános")}</span>
              <span class="meta ${stockClass}">${stockLabel}</span>
            </div>
          </div>
          <div class="admin-inline-meta">
            <span><strong>${fmtFt(item.price)}</strong>${item.oldPrice ? ` <small>${fmtFt(item.oldPrice)}</small>` : ""}</span>
            <span>${escapeHtml(item.line || "")}</span>
            <span>${flags.length ? flags.map(flag => escapeHtml(FLAG_LABELS[flag] || flag)).join(" • ") : "Nincs extra jelölés"}</span>
          </div>
        </div>
        <div class="admin-product-actions">
          <button class="btn btn-secondary" type="button" data-edit="${item.id}">Szerkesztés</button>
          <button class="btn btn-ghost" type="button" data-duplicate="${item.id}">Duplikálás</button>
          <button class="btn btn-ghost danger-soft" type="button" data-delete="${item.id}">Törlés</button>
        </div>
      </article>
    `;
  }

  function renderList() {
    const listRoot = $("[data-admin-list]");
    if (!listRoot) return;
    const list = filteredItems();
    if (!list.length) {
      listRoot.innerHTML = `
        <div class="admin-empty">
          <h3>Nincs találat</h3>
          <p>Próbálj másik kulcsszót, vagy állítsd vissza az Összes kategória szűrőt.</p>
        </div>
      `;
      return;
    }
    listRoot.innerHTML = list.map(rowMarkup).join("");
    $$('[data-edit]', listRoot).forEach(button => button.addEventListener('click', () => startEdit(Number(button.dataset.edit))));
    $$('[data-duplicate]', listRoot).forEach(button => button.addEventListener('click', () => duplicateItem(Number(button.dataset.duplicate))));
    $$('[data-delete]', listRoot).forEach(button => button.addEventListener('click', () => deleteItem(Number(button.dataset.delete))));
  }

  function setFormMode(editing, product = null) {
    state.editingId = editing && product ? product.id : null;
    const heading = $("[data-form-heading]");
    const submitLabel = $("[data-submit-label]");
    const cancelButton = $("[data-cancel-edit]");
    if (heading) heading.textContent = editing ? `Termék szerkesztése #${product.id}` : "Új termék létrehozása";
    if (submitLabel) submitLabel.textContent = editing ? "Módosítás mentése" : "Termék mentése";
    if (cancelButton) cancelButton.hidden = !editing;
  }

  function normalizeColor(value, fallback) {
    const color = String(value || "").trim();
    if (/^#[0-9a-fA-F]{6}$/.test(color)) return color;
    const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (!rgbMatch) return fallback;
    const toHex = part => Number(part).toString(16).padStart(2, '0');
    return `#${toHex(rgbMatch[1])}${toHex(rgbMatch[2])}${toHex(rgbMatch[3])}`;
  }

  function fillForm(product = null) {
    const form = $("#adminProductForm");
    if (!form) return;

    const defaultProduct = api.sanitizeProduct({
      id: api.nextId(state.items),
      category: api.categories[0]?.value || "booster",
      name: "",
      set: "",
      line: "",
      description: "",
      price: 0,
      oldPrice: null,
      stock: 0,
      availability: "in_stock",
      badge: "Kiemelt",
      flags: [],
      art: api.artOptions[0]?.value || "pack-electric.svg",
      images: [api.artOptions[0]?.value || "pack-electric.svg"],
      artA: "#1fd8a0",
      artB: "#081126"
    });

    const current = product ? api.sanitizeProduct(product) : defaultProduct;
    form.productName.value = product ? current.name : "";
    form.category.value = current.category;
    form.productSet.value = product ? current.set : "";
    form.badge.value = current.badge;
    form.line.value = product ? current.line : "";
    form.price.value = product ? current.price : "";
    form.oldPrice.value = product && current.oldPrice ? current.oldPrice : "";
    form.stock.value = product ? current.stock : "";
    form.availability.value = current.availability || "in_stock";
    const firstImage = (current.images && current.images[0]) || current.art;
    const hasPreset = api.artOptions.some(option => option.value === firstImage);
    form.artPreset.value = hasPreset ? firstImage : "__custom__";
    form.customArt.value = hasPreset ? "" : firstImage;
    form.artA.value = normalizeColor(current.artA, "#1fd8a0");
    form.artB.value = normalizeColor(current.artB, "#081126");
    form.description.value = product ? current.description : "";
    $$('[data-flag]').forEach(input => { input.checked = (current.flags || []).includes(input.value) && !!product; });
    state.uploadedImagesData = [];
    state.retainedImages = product ? [...(current.images || []).filter(Boolean)] : [];
    const fileInput = $("[data-product-image-file]");
    if (fileInput) fileInput.value = "";
    updateCustomArtVisibility();
    refreshArtPreviewFromFields();
    setFormMode(!!product, current);
  }

  function readFormProduct() {
    const form = $("#adminProductForm");
    const fallbackArt = form.artPreset.value === "__custom__"
      ? (form.customArt.value.trim() || "pack-electric.svg")
      : form.artPreset.value;
    const images = state.uploadedImagesData.length
      ? [...state.uploadedImagesData]
      : (state.retainedImages.length ? [...state.retainedImages] : [fallbackArt]);

    return api.sanitizeProduct({
      id: state.editingId || api.nextId(state.items),
      category: form.category.value,
      name: form.productName.value.trim(),
      set: form.productSet.value.trim(),
      line: form.line.value.trim(),
      description: form.description.value.trim(),
      price: form.price.value,
      oldPrice: form.oldPrice.value,
      stock: form.stock.value,
      availability: form.availability.value,
      badge: form.badge.value.trim(),
      flags: $$('[data-flag]:checked', form).map(input => input.value),
      art: images[0] || fallbackArt,
      images,
      artA: form.artA.value,
      artB: form.artB.value
    });
  }

  function validateProduct(product) {
    if (!product.name) {
      toast('Adj meg egy terméknevet.');
      return false;
    }
    if (!(Number(product.price) > 0)) {
      toast('Az ár legyen nagyobb mint 0.');
      return false;
    }
    if (Number(product.stock) < 0) {
      toast('A készlet nem lehet negatív.');
      return false;
    }
    if (!Array.isArray(product.images) || !product.images.length) {
      toast('Válassz vagy tölts fel legalább egy termékképet.');
      return false;
    }
    return true;
  }

  function utf8ToBase64(value) {
    return btoa(unescape(encodeURIComponent(value)));
  }

  function buildGitHubContentsUrl(settings, pathOverride) {
    const normalizedPath = String(pathOverride || settings.path || api.REMOTE_CATALOG_FILE || 'catalog.json')
      .split('/')
      .filter(Boolean)
      .map(part => encodeURIComponent(part))
      .join('/');
    return `https://api.github.com/repos/${encodeURIComponent(settings.owner)}/${encodeURIComponent(settings.repo)}/contents/${normalizedPath}`;
  }

  async function triggerNetlifyBuild(settings) {
    if (!settings.buildHook) return { skipped: true };
    const response = await fetch(settings.buildHook, { method: 'POST' });
    if (!response.ok) throw new Error(`Netlify build hook hiba (${response.status})`);
    return { skipped: false };
  }

  async function fetchGitHubFileSha(settings, pathOverride) {
    const url = `${buildGitHubContentsUrl(settings, pathOverride)}?ref=${encodeURIComponent(settings.branch)}`;
    const response = await fetch(url, {
      headers: {
        "Accept": "application/vnd.github+json",
        "Authorization": `Bearer ${settings.token}`
      }
    });
    if (response.status === 404) return null;
    if (!response.ok) {
      let message = `GitHub hiba (${response.status})`;
      try {
        const error = await response.json();
        if (error?.message) message = error.message;
      } catch {}
      throw new Error(message);
    }
    const data = await response.json();
    return data?.sha || null;
  }

  async function putGitHubJsonFile(settings, targetPath, payload, commitMessage) {
    const sha = await fetchGitHubFileSha(settings, targetPath);
    const body = {
      message: commitMessage,
      content: utf8ToBase64(JSON.stringify(payload, null, 2)),
      branch: settings.branch
    };
    if (sha) body.sha = sha;

    const response = await fetch(buildGitHubContentsUrl(settings, targetPath), {
      method: 'PUT',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.token}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      let message = `GitHub publikálási hiba (${response.status})`;
      try {
        const error = await response.json();
        if (error?.message) message = error.message;
      } catch {}
      throw new Error(message);
    }

    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  async function publishCatalogViaNetlifyFunction() {
    return { unavailable: true };
  }

  function buildSyncConfigPayload(settings) {
    if (typeof api.buildRemoteSyncPayload === 'function') {
      const payload = api.buildRemoteSyncPayload(settings);
      if (payload) return payload;
    }
    const url = typeof api.buildGitHubRawUrl === 'function' ? api.buildGitHubRawUrl(settings) : '';
    return {
      version: 1,
      updatedAt: new Date().toISOString(),
      provider: 'github',
      owner: settings.owner,
      repo: settings.repo,
      branch: settings.branch,
      path: settings.path,
      url
    };
  }

  async function publishCatalogToGitHub(options = {}) {
    const settings = syncGitHubFormState();
    const canDirectPublish = hasGitHubTargetConfigured(settings) && !!settings.token;

    if (state.publishing) {
      if (options.automatic) state.pendingAutoPublish = true;
      return false;
    }

    state.publishing = true;
    const publishButton = $("[data-publish-github]");
    if (publishButton) publishButton.disabled = true;
    setPublishStatus('Publikálás folyamatban…', 'loading');

    try {
      const stamp = new Date().toLocaleString('hu-HU');
      const payload = api.buildCatalogPayload(state.items, {
        updatedBy: AUTH_USERNAME,
        sync: hasGitHubTargetConfigured(settings) ? settings : undefined
      });
      let resolvedSource = hasGitHubTargetConfigured(settings) ? settings : null;
      let buildTriggered = false;
      let buildWarning = '';
      let usedServerMode = false;
      let serverIssue = '';
      let serverUnavailable = false;

      try {
        const serverResult = await publishCatalogViaNetlifyFunction(settings, payload);
        if (!serverResult?.unavailable) {
          usedServerMode = true;
          buildTriggered = !!serverResult?.buildTriggered;
          buildWarning = String(serverResult?.buildWarning || '').trim();
          if (serverResult?.source) resolvedSource = serverResult.source;
        } else {
          serverUnavailable = true;
        }
      } catch (serverError) {
        serverIssue = serverError instanceof Error ? serverError.message : 'a Netlify automatikus publikáló hibázott';
      }

      if (!usedServerMode) {
        if (!canDirectPublish) {
          const warnMessage = 'Nincs teljes GitHub kapcsolat kitöltve az automatikus publikáláshoz. Add meg az owner / repo / branch / path / token adatokat.';
          setPublishStatus(warnMessage, 'warn');
          if (!options.silent) toast('Automatikus publikáláshoz töltsd ki a GitHub kapcsolatot.');
          return false;
        }

        const syncPayload = buildSyncConfigPayload(settings);
        await putGitHubJsonFile(settings, settings.path, payload, `chore: NS Card katalógus frissítés (${stamp})`);
        await putGitHubJsonFile(settings, SYNC_CONFIG_FILE, syncPayload, `chore: NS Card live sync frissítés (${stamp})`);

        try {
          const buildResult = await triggerNetlifyBuild(settings);
          buildTriggered = !buildResult?.skipped;
        } catch (buildError) {
          buildWarning = buildError instanceof Error ? buildError.message : 'a Netlify build hook nem indult el';
        }

      }

      api.setPublishedCache(state.items);
      if (resolvedSource) api.setRemoteSourceConfig(resolvedSource);
      if (typeof api.clearDraftCatalog === 'function') api.clearDraftCatalog();
      api.notifyCatalogChanged(usedServerMode ? 'published-server' : 'published');

      const successPrefix = 'Sikeres GitHub publikálás';
      let successMessage = '';
      if (buildWarning) {
        successMessage = `${successPrefix}: a katalógus frissült, de ${buildWarning}.`;
      } else if (buildTriggered) {
        successMessage = `${successPrefix}: a katalógus frissült és a deploy is elindult.`;
      } else {
        successMessage = `${successPrefix}: a katalógus frissült. Ha a site Git-re van kötve, a Netlify deploy automatikusan elindul.`;
      }

      setPublishStatus(successMessage, buildWarning ? 'warn' : 'success');
      if (!options.silent) {
        if (buildWarning) toast(`A katalógus felment, de ${buildWarning}.`);
        else toast('A katalógus automatikusan publikálva lett.');
      }
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'A GitHub publikálás nem sikerült.';
      setPublishStatus(`${message} — a módosítás most csak ezen az eszközön látszik.`, 'error');
      if (!options.silent) toast(`Publikálási hiba: ${message}`);
      return false;
    } finally {
      state.publishing = false;
      if (publishButton) publishButton.disabled = false;
      if (state.pendingAutoPublish) {
        state.pendingAutoPublish = false;
        clearAutoPublishTimer();
        state.autoPublishTimer = window.setTimeout(() => {
          state.autoPublishTimer = 0;
          void runAutoPublish();
        }, 360);
      }
    }
  }

  async function submitForm(event) {
    event.preventDefault();
    const product = readFormProduct();
    if (!validateProduct(product)) return;

    if (state.editingId) {
      state.items = state.items.map(item => item.id === state.editingId ? product : item);
      persistItems('A termék módosítása elmentve.');
    } else {
      state.items = [...state.items, product];
      persistItems('Az új termék bekerült a katalógusba.');
    }
    fillForm();
  }

  function startEdit(id) {
    const product = state.items.find(item => item.id === id);
    if (!product) return;
    fillForm(product);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    fillForm();
    toast('A szerkesztés megszakítva.');
  }

  function duplicateItem(id) {
    const product = state.items.find(item => item.id === id);
    if (!product) return;
    const duplicate = api.sanitizeProduct({ ...product, id: api.nextId(state.items), name: `${product.name} (másolat)` });
    state.items = [...state.items, duplicate];
    persistItems('A termék másolata létrejött.');
  }

  function deleteItem(id) {
    const product = state.items.find(item => item.id === id);
    if (!product) return;
    if (!window.confirm(`Biztosan törlöd ezt a terméket?\n\n${product.name}`)) return;
    state.items = state.items.filter(item => item.id !== id);
    if (state.editingId === id) fillForm();
    persistItems('A terméket töröltük a katalógusból.');
  }

  function exportJson() {
    const payload = api.buildCatalogPayload(state.items, { updatedBy: AUTH_USERNAME });
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = api.REMOTE_CATALOG_FILE || 'catalog.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
    toast('A publikus catalog.json letöltése elindult.');
  }

  function applyImportedData(rawValue) {
    if (!rawValue.trim()) {
      toast('Nincs importálható JSON tartalom.');
      return;
    }
    let parsed;
    try {
      parsed = JSON.parse(rawValue);
    } catch {
      toast('A JSON formátuma hibás.');
      return;
    }
    const incoming = Array.isArray(parsed) ? parsed : parsed?.products;
    if (!Array.isArray(incoming)) {
      toast('Az importált JSON legyen tömb vagy { products: [...] } szerkezetű.');
      return;
    }
    state.items = incoming.map((item, index) => api.sanitizeProduct(item, index));
    persistItems('A katalógus sikeresen importálva.');
    const field = $("[data-import-json]");
    if (field) field.value = '';
    fillForm();
  }

  function handleFileImport(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      const textarea = $("[data-import-json]");
      if (textarea) textarea.value = text;
      applyImportedData(text);
      event.target.value = '';
    };
    reader.readAsText(file, 'utf-8');
  }

  function resetDefaults() {
    if (!window.confirm('Visszaállítsuk az eredeti demo katalógust? A mostani módosítások felülíródnak.')) return;
    state.items = window.NSCardDefaultCatalog || [];
    persistItems('Az alap katalógus visszaállítva.');
    fillForm();
  }

  function saveGitHubSettingsAction() {
    const settings = syncGitHubFormState();
    const remoteSource = api.setRemoteSourceConfig(settings);
    if (remoteSource?.url) {
      setPublishStatus(`Az élő szinkron forrás elmentve: ${remoteSource.url}`, 'success');
      toast('A GitHub kapcsolat elmentve. A mentések ezután automatikusan publikálhatók.');
    } else {
      setPublishStatus('A GitHub kapcsolat adatai elmentve.', 'success');
      toast('A GitHub kapcsolat elmentve.');
    }
    if (settings.autoPublish && typeof api.hasNewerDraftThanPublished === 'function' && api.hasNewerDraftThanPublished()) {
      scheduleAutoPublish('A mentett kapcsolat miatt az elmaradt módosítások automatikus publikálása indul…');
    }
  }

  async function copyNetlifyDeployLink() {
    const url = buildNetlifyDeployUrl();
    if (!url) {
      toast('Előbb töltsd ki a GitHub owner és repo mezőket.');
      return;
    }
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const field = $("#netlifyDeployLink");
        if (!field) throw new Error('Nincs másolható mező.');
        field.removeAttribute('readonly');
        field.select();
        document.execCommand('copy');
        field.setAttribute('readonly', 'readonly');
      }
      toast('A Netlify link a vágólapra került.');
    } catch {
      toast('A link másolása nem sikerült.');
    }
  }

  function openNetlifyDeploy() {
    const url = buildNetlifyDeployUrl();
    if (!url) {
      toast('Előbb töltsd ki a GitHub owner és repo mezőket.');
      return;
    }
    window.open(url, '_blank', 'noopener');
    toast('A Netlify oldal előre kitöltve megnyílt.');
  }

  function bindEvents() {
    $("#adminProductForm")?.addEventListener('submit', submitForm);
    $("[data-form-reset]")?.addEventListener('click', () => fillForm());
    $("[data-cancel-edit]")?.addEventListener('click', cancelEdit);
    $("#artPreset")?.addEventListener('change', () => {
      state.retainedImages = [];
      updateCustomArtVisibility();
      refreshArtPreviewFromFields();
    });
    $("#customArt")?.addEventListener('input', () => {
      if (!state.uploadedImagesData.length) {
        state.retainedImages = [];
        refreshArtPreviewFromFields();
      }
    });
    $("#productName")?.addEventListener('input', () => {
      if (!state.uploadedImagesData.length) refreshArtPreviewFromFields();
    });
    $("[data-product-image-file]")?.addEventListener('change', handleProductImageUpload);
    $("[data-clear-image-upload]")?.addEventListener('click', () => clearUploadedImages(true));
    $("[data-admin-search]")?.addEventListener('input', event => {
      state.query = event.target.value || '';
      renderList();
    });
    $("[data-admin-filter]")?.addEventListener('change', event => {
      state.filter = event.target.value || 'all';
      renderList();
    });
    $("[data-export-json]")?.addEventListener('click', exportJson);
    $("[data-import-apply]")?.addEventListener('click', () => applyImportedData($("[data-import-json]")?.value || ''));
    $("[data-open-import-file]")?.addEventListener('click', () => $("[data-import-file]")?.click());
    $("[data-import-file]")?.addEventListener('change', handleFileImport);
    $("[data-reset-defaults]")?.addEventListener('click', resetDefaults);
    $("#adminLoginForm")?.addEventListener('submit', handleLoginSubmit);
    $("[data-admin-logout]")?.addEventListener('click', handleLogout);
    $("[data-save-github]")?.addEventListener('click', saveGitHubSettingsAction);
    $("[data-publish-github]")?.addEventListener('click', () => publishCatalogToGitHub({ silent: false }));
    $("[data-admin-refresh]")?.addEventListener('click', () => { void refreshAdminProducts(); });
    $("[data-copy-netlify-deploy-link]")?.addEventListener('click', copyNetlifyDeployLink);
    $("[data-open-netlify-deploy]")?.addEventListener('click', openNetlifyDeploy);
    const syncGitHubInputs = () => {
      syncGitHubFormState();
    };
    $("[data-github-form]")?.addEventListener('input', syncGitHubInputs);
    $("[data-github-form]")?.addEventListener('change', syncGitHubInputs);
  }

  function renderAll() {
    updateStats();
    renderList();
  }

  document.addEventListener('DOMContentLoaded', async () => {
    state.github = loadGitHubSettings();
    saveGitHubSettingsToStorage();
    if (hasGitHubTargetConfigured(state.github)) api.setRemoteSourceConfig(state.github);
    populateSelects();
    await loadItems();
    fillForm();
    bindEvents();
    applyDeployPreset();
    populateGitHubForm();
    if (hasGitHubTargetConfigured(state.github)) {
      setPublishStatus(`A kapcsolat mentve. Mentéskor az admin automatikusan közvetlenül a GitHubra publikál. Célfájl: ${state.github.path}.`, 'success');
    } else {
      setPublishStatus('Az automatikus publikáláshoz töltsd ki a lenti GitHub mezőket (owner, repo, branch, path, token).', 'warn');
    }
    updateAuthView();
  });
})();
