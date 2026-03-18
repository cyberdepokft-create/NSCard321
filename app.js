(() => {
  const STORE_KEY = "ns-card-cart-v3";
  const SHIPPING = 1290;
  const AUTO_PAGE_REFRESH_INTERVAL_MS = 60 * 60 * 1000;
  const REMOTE_REFRESH_INTERVAL_MS = AUTO_PAGE_REFRESH_INTERVAL_MS;
  const REMOTE_REFRESH_JITTER_MS = 0;
  const CHECKOUT_FORM_STORAGE_KEY = "ns-card-checkout-form-v1";
  const state = { filter: "all", sort: "featured", query: "", checkoutBusy: false };

  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];
  const catalog = () => Array.isArray(window.NSCardCatalog) ? window.NSCardCatalog : [];
  const syncCatalog = () => {
    if (window.NSCardAdmin?.readCatalog) {
      const resolved = window.NSCardAdmin.readCatalog({ preferDraft: false });
      if (Array.isArray(resolved) && resolved.length) {
        window.NSCardCatalog = resolved;
        return;
      }
    }
    if (window.NSCardAdmin?.readPublishedCatalog) {
      const published = window.NSCardAdmin.readPublishedCatalog();
      if (Array.isArray(published) && published.length) window.NSCardCatalog = published;
    }
  };
  const fmtFt = v => new Intl.NumberFormat("hu-HU").format(Number(v) || 0) + " Ft";
  const getParam = name => new URLSearchParams(location.search).get(name) || "";
  const isComingSoon = item => String(item?.availability || "").toLowerCase() === "coming_soon";
  const isPurchasable = item => !!item && !isComingSoon(item);
  const availabilityLabel = item => isComingSoon(item) ? "Hamarosan" : `${Number(item?.stock) || 0} db készleten`;

  function escapeHtml(value){
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function productImages(item){
    const list = Array.isArray(item?.images) && item.images.length
      ? item.images
      : [item?.art].filter(Boolean);
    return list.map(src => String(src || "").trim()).filter(Boolean);
  }

  function setParam(name, value){
    const u = new URL(location.href);
    if (value) u.searchParams.set(name, value); else u.searchParams.delete(name);
    history.replaceState({}, "", u.toString());
  }
  function readCart(){ try { return JSON.parse(localStorage.getItem(STORE_KEY) || "{}"); } catch { return {}; } }
  function saveCart(cart){ localStorage.setItem(STORE_KEY, JSON.stringify(cart)); }
  function cartEntries(){
    const cart = readCart();
    return Object.entries(cart).map(([id, qty]) => {
      const product = catalog().find(p => p.id === Number(id));
      return product && qty > 0 && isPurchasable(product) ? { product, qty } : null;
    }).filter(Boolean);
  }

  function cleanUnavailableCartItems(){
    const cart = readCart();
    let changed = false;
    Object.keys(cart).forEach(id => {
      const product = catalog().find(p => p.id === Number(id));
      if (!product || !isPurchasable(product) || Number(cart[id]) <= 0) {
        delete cart[id];
        changed = true;
      }
    });
    if (changed) saveCart(cart);
  }
  function cartCount(){ return cartEntries().reduce((s, i) => s + i.qty, 0); }
  function cartSubtotal(){ return cartEntries().reduce((s, i) => s + (i.product.price * i.qty), 0); }
  function toast(msg){
    const t = $("#toast"); if(!t) return;
    t.textContent = msg; t.classList.add("show");
    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(() => t.classList.remove("show"), 1800);
  }
  function updateCartCount(){ $$("[data-cart-count]").forEach(el => el.textContent = cartCount()); }
  function openCart(){ $("#cartOverlay")?.classList.add("open"); $("#cartDrawer")?.classList.add("open"); document.body.classList.add("no-scroll"); }
  function closeCart(){ $("#cartOverlay")?.classList.remove("open"); $("#cartDrawer")?.classList.remove("open"); if(!$("#mobileDrawer")?.classList.contains("open")) document.body.classList.remove("no-scroll"); }
  function openMenu(){ $("#mobileMenuOverlay")?.classList.add("open"); $("#mobileDrawer")?.classList.add("open"); document.body.classList.add("no-scroll"); }
  function closeMenu(){ $("#mobileMenuOverlay")?.classList.remove("open"); $("#mobileDrawer")?.classList.remove("open"); if(!$("#cartDrawer")?.classList.contains("open")) document.body.classList.remove("no-scroll"); }

  function preserveSyncParamsInLinks(){
    const params = new URLSearchParams(window.location.search);
    const keepKeys = ["gh_owner", "gh_repo", "gh_branch", "gh_path", "catalog_url", "sync_provider"];
    const kept = keepKeys.filter(key => params.get(key));
    if (!kept.length) return;
    $$('a[href]').forEach(link => {
      const href = link.getAttribute('href') || '';
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
      try {
        const url = new URL(href, window.location.href);
        if (url.origin !== window.location.origin) return;
        kept.forEach(key => url.searchParams.set(key, params.get(key)));
        const normalized = url.pathname.replace(/^\//, '') + url.search + url.hash;
        link.setAttribute('href', normalized || href);
      } catch {}
    });
  }

  function addToCart(id){
    const product = catalog().find(item => item.id === Number(id));
    if (!isPurchasable(product)) {
      toast("Ez a termék jelenleg hamarosan érkezik");
      return;
    }
    const cart = readCart();
    cart[id] = (cart[id] || 0) + 1;
    saveCart(cart);
    updateCartCount(); renderCart(); renderCheckout(); toast("A termék bekerült a kosárba");
  }
  function changeQty(id, delta){
    const cart = readCart();
    cart[id] = (cart[id] || 0) + delta;
    if (cart[id] <= 0) delete cart[id];
    saveCart(cart);
    updateCartCount(); renderCart(); renderCheckout();
  }
  function removeItem(id){
    const cart = readCart(); delete cart[id]; saveCart(cart);
    updateCartCount(); renderCart(); renderCheckout(); toast("A terméket eltávolítottuk a kosárból");
  }

  function productMarkup(item){
    const flags = Array.isArray(item.flags) ? item.flags : [];
    const comingSoon = isComingSoon(item);
    const extra = comingSoon ? "Hamarosan" : (flags.includes("sale") ? "Kedvező ajánlat" : (flags.includes("rare") ? "Gyűjtői kedvenc" : "Gyorsan fogy"));
    const descriptionMarkup = item.description ? `<p>${escapeHtml(item.description)}</p>` : "";
    const images = productImages(item);
    const firstImage = images[0] || "pack-electric.svg";
    const galleryMarkup = images.length > 1
      ? `
        <div class="card-gallery" data-gallery="${item.id}">
          <div class="card-thumbs" role="list" aria-label="${escapeHtml(item.name)} további képei">
            ${images.map((src, index) => `
              <button class="thumb-btn ${index === 0 ? 'is-active' : ''}" type="button" data-thumb-index="${index}" data-gallery-target="${item.id}" data-gallery-src="${escapeHtml(src)}" aria-label="${escapeHtml(item.name)} kép ${index + 1}">
                <img src="${escapeHtml(src)}" alt="${escapeHtml(item.name)} ${index + 1}. kép">
              </button>
            `).join("")}
          </div>
          <span class="gallery-count">+${images.length} kép</span>
        </div>
      `
      : "";
    return `
      <article class="card reveal">
        <div class="card-art" style="--art-a:${escapeHtml(item.artA)};--art-b:${escapeHtml(item.artB)};">
          <div class="card-badges"><span class="badge">${escapeHtml(item.badge)}</span><span class="badge">${escapeHtml(extra)}</span></div>
          <div class="card-media">
            <div class="card-media-inner" data-trim-wrapper="${item.id}">
              <img class="product-visual" crossorigin="anonymous" src="${escapeHtml(firstImage)}" alt="${escapeHtml(item.name)}" data-gallery-main="${item.id}">
            </div>
          </div>
          ${galleryMarkup}
        </div>
        <div class="card-body">
          <div class="card-eyebrow">${escapeHtml(item.line)}</div>
          <h3>${escapeHtml(item.name)}</h3>
          ${descriptionMarkup}
          <div class="meta-row">
            <span class="meta ${comingSoon ? 'meta-soon' : ''}">${comingSoon ? '⏳' : '📦'} ${escapeHtml(availabilityLabel(item))}</span>
            <span class="meta">🎯 ${escapeHtml(item.set)}</span>
          </div>
          <div class="price-row">
            <div><div class="old-price">${item.oldPrice ? fmtFt(item.oldPrice) : "&nbsp;"}</div><div class="price">${fmtFt(item.price)}</div></div>
            <button class="btn ${comingSoon ? 'btn-ghost' : 'btn-primary'}" type="button" data-add="${item.id}" ${comingSoon ? 'disabled aria-disabled="true"' : ''}>${comingSoon ? 'Hamarosan' : 'Kosárba'}</button>
          </div>
        </div>
      </article>
    `;
  }

  function visibleCatalog(){
    let list = [...catalog()];
    if (state.filter !== "all") list = list.filter(i => (i.category || "").toLowerCase() === state.filter);
    if (state.query.trim()){
      const q = state.query.trim().toLowerCase();
      list = list.filter(i => [i.name,i.set,i.line,i.description,i.badge,i.category,i.availability === "coming_soon" ? "hamarosan" : "készleten"].join(" ").toLowerCase().includes(q));
    }
    if (state.sort === "price-asc") list.sort((a,b) => a.price-b.price);
    else if (state.sort === "price-desc") list.sort((a,b) => b.price-a.price);
    else if (state.sort === "name-asc") list.sort((a,b) => a.name.localeCompare(b.name, "hu"));
    else list.sort((a,b) => a.id-b.id);
    return list;
  }


  const imageTrimCache = new Map();

  function resetSmartImagePosition(img){
    const wrapper = img?.closest?.(".card-media-inner");
    if (!wrapper) return;
    wrapper.style.setProperty("--trim-x", "0px");
    wrapper.style.setProperty("--trim-y", "0px");
  }

  function applySmartImagePosition(img){
    if (!(img instanceof HTMLImageElement)) return;
    const wrapper = img.closest(".card-media-inner");
    if (!wrapper) return;

    const render = () => {
      const src = String(img.currentSrc || img.src || "").trim();
      if (!src || !img.naturalWidth || !img.naturalHeight) {
        resetSmartImagePosition(img);
        return;
      }

      const cached = imageTrimCache.get(src);
      if (cached) {
        const width = wrapper.clientWidth || 240;
        const height = wrapper.clientHeight || 240;
        wrapper.style.setProperty("--trim-x", `${Math.max(-width * 0.16, Math.min(width * 0.16, cached.xRatio * width * 1.08)).toFixed(2)}px`);
        wrapper.style.setProperty("--trim-y", `${Math.max(-height * 0.16, Math.min(height * 0.16, cached.yRatio * height * 1.08)).toFixed(2)}px`);
        return;
      }

      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          resetSmartImagePosition(img);
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let minX = width, minY = height, maxX = -1, maxY = -1;
        for (let y = 0; y < height; y += 1) {
          for (let x = 0; x < width; x += 1) {
            const alpha = data[(y * width + x) * 4 + 3];
            if (alpha > 18) {
              if (x < minX) minX = x;
              if (y < minY) minY = y;
              if (x > maxX) maxX = x;
              if (y > maxY) maxY = y;
            }
          }
        }

        if (maxX < 0 || maxY < 0) {
          imageTrimCache.set(src, { xRatio: 0, yRatio: 0 });
          resetSmartImagePosition(img);
          return;
        }

        const contentCenterX = minX + ((maxX - minX + 1) / 2);
        const contentCenterY = minY + ((maxY - minY + 1) / 2);
        const xRatio = ((width / 2) - contentCenterX) / width;
        const yRatio = ((height / 2) - contentCenterY) / height;
        const result = { xRatio, yRatio };
        imageTrimCache.set(src, result);

        const wrapperWidth = wrapper.clientWidth || 240;
        const wrapperHeight = wrapper.clientHeight || 240;
        wrapper.style.setProperty("--trim-x", `${Math.max(-wrapperWidth * 0.16, Math.min(wrapperWidth * 0.16, xRatio * wrapperWidth * 1.08)).toFixed(2)}px`);
        wrapper.style.setProperty("--trim-y", `${Math.max(-wrapperHeight * 0.16, Math.min(wrapperHeight * 0.16, yRatio * wrapperHeight * 1.08)).toFixed(2)}px`);
      } catch {
        imageTrimCache.set(src, { xRatio: 0, yRatio: 0 });
        resetSmartImagePosition(img);
      }
    };

    if (img.complete && img.naturalWidth) {
      render();
      return;
    }
    img.addEventListener("load", render, { once: true });
    img.addEventListener("error", () => resetSmartImagePosition(img), { once: true });
  }

  function smartCenterProductImages(root = document){
    $$("[data-gallery-main]", root).forEach(applySmartImagePosition);
  }

  function bindAddButtons(root){
    $$("[data-add]", root).forEach(btn => btn.addEventListener("click", () => addToCart(Number(btn.dataset.add))));
  }

  function bindGalleryButtons(root){
    $$("[data-gallery-target]", root).forEach(button => {
      button.addEventListener("click", () => {
        const target = button.dataset.galleryTarget;
        const main = $(`[data-gallery-main="${target}"]`, root) || document.querySelector(`[data-gallery-main="${target}"]`);
        if (!main) return;
        main.src = button.dataset.gallerySrc || main.src;
        applySmartImagePosition(main);
        $$("[data-gallery-target]", root)
          .filter(node => node.dataset.galleryTarget === target)
          .forEach(node => node.classList.toggle("is-active", node === button));
      });
    });
  }

  function reveal(scope=document){
    const els = $$(".reveal:not(.observer-bound)", scope);
    if (!els.length) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry, idx) => {
        if (entry.isIntersecting){
          setTimeout(() => entry.target.classList.add("revealed"), idx * 60);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: .12 });
    els.forEach(el => { el.classList.add("observer-bound"); io.observe(el); });
  }

  function hydrateProductGrid(grid){
    bindAddButtons(grid);
    bindGalleryButtons(grid);
    smartCenterProductImages(grid);
    reveal(grid);
  }

  function renderHome(){
    syncCatalog();
    const grid = $("[data-home-grid]");
    if (!grid) return;
    grid.innerHTML = catalog().slice(0,4).map(productMarkup).join("");
    hydrateProductGrid(grid);
  }
  function renderCatalog(){
    syncCatalog();
    const grid = $("[data-catalog-grid]");
    if (!grid) return;
    const list = visibleCatalog();
    if (!list.length){
      grid.innerHTML = '<div class="empty-state"><h3>Nincs találat</h3><p>Próbálj másik kulcsszót, vagy állítsd vissza az Összesen szűrőt, hogy újra lásd a teljes kínálatot.</p></div>';
      return;
    }
    grid.innerHTML = list.map(productMarkup).join("");
    hydrateProductGrid(grid);
  }

  function renderCart(){
    syncCatalog();
    const body = $("#cartItems"), sub = $("#cartSubtotal"), total = $("#cartTotal");
    if (!body || !sub || !total) return;
    const entries = cartEntries();
    const subtotal = cartSubtotal(), shipping = entries.length ? SHIPPING : 0, final = subtotal + shipping;
    sub.textContent = fmtFt(subtotal); total.textContent = fmtFt(final);
    if (!entries.length){
      body.innerHTML = '<div class="cart-empty">A kosarad még üres. Válogass a termékek közül, és tedd félre azt, amit legelőször kibontanál.</div>'; return;
    }
    body.innerHTML = entries.map(({product, qty}) => `
      <div class="cart-item">
        <div class="cart-thumb"><img src="${escapeHtml(productImages(product)[0] || product.art)}" alt="${escapeHtml(product.name)}"></div>
        <div class="cart-meta">
          <h4>${escapeHtml(product.name)}</h4><p>${fmtFt(product.price)} / db</p>
          <div class="qty">
            <button type="button" data-minus="${product.id}" aria-label="Mennyiség csökkentése">−</button>
            <span>${qty}</span>
            <button type="button" data-plus="${product.id}" aria-label="Mennyiség növelése">+</button>
          </div>
        </div>
        <div class="cart-side" style="display:flex;flex-direction:column;gap:8px;align-items:flex-end;">
          <strong>${fmtFt(product.price * qty)}</strong>
          <button class="remove-btn" type="button" data-remove="${product.id}">Törlés</button>
        </div>
      </div>
    `).join("");
    $$("[data-plus]", body).forEach(btn => btn.addEventListener("click", () => changeQty(Number(btn.dataset.plus), 1)));
    $$("[data-minus]", body).forEach(btn => btn.addEventListener("click", () => changeQty(Number(btn.dataset.minus), -1)));
    $$("[data-remove]", body).forEach(btn => btn.addEventListener("click", () => removeItem(Number(btn.dataset.remove))));
  }

  function renderCheckout(){
    syncCatalog();
    const list = $("#checkoutItems"), sub = $("#checkoutSubtotal"), ship = $("#checkoutShipping"), total = $("#checkoutTotal");
    if (!list || !sub || !ship || !total) return;
    const entries = cartEntries();
    const subtotal = cartSubtotal(), shipping = entries.length ? SHIPPING : 0, final = subtotal + shipping;
    sub.textContent = fmtFt(subtotal);
    ship.textContent = fmtFt(shipping);
    total.textContent = fmtFt(final);
    if (!entries.length){
      list.innerHTML = '<div class="cart-empty">A rendelés összesítő itt jelenik meg, amint kosárba teszed a kiválasztott termékeket.</div>';
      return;
    }
    list.innerHTML = entries.map(({product, qty}) => `
      <div class="summary-item">
        <div><strong>${escapeHtml(product.name)}</strong><br><small>${qty} × ${fmtFt(product.price)}</small></div>
        <strong>${fmtFt(product.price * qty)}</strong>
      </div>
    `).join("") + `
      <div class="summary-item">
        <div><strong>Szállítás</strong><br><small>Fix díj</small></div>
        <strong>${fmtFt(shipping)}</strong>
      </div>
    `;
  }

  function setCheckoutStatus(message, variant = "info"){
    const el = $("#checkoutStatus");
    if (!el) return;
    el.textContent = message || "";
    el.className = `checkout-status is-${variant}`;
  }

  function setCheckoutBusy(isBusy){
    state.checkoutBusy = !!isBusy;
    const btn = $("#checkoutAction");
    if (!btn) return;
    if (!btn.dataset.defaultLabel) btn.dataset.defaultLabel = btn.textContent.trim();
    btn.disabled = !!isBusy;
    btn.textContent = isBusy ? "Átirányítás..." : btn.dataset.defaultLabel;
  }

  function getCheckoutForm(){
    return $("#checkoutCustomerForm");
  }

  function getCheckoutFormValues(){
    const form = getCheckoutForm();
    if (!form) return null;
    return {
      fullName: $("#checkoutFullName", form)?.value.trim() || "",
      email: $("#checkoutEmail", form)?.value.trim() || "",
      phone: $("#checkoutPhone", form)?.value.trim() || "",
      cityZip: $("#checkoutCityZip", form)?.value.trim() || "",
      address: $("#checkoutAddress", form)?.value.trim() || "",
      shippingMethod: $("#checkoutShippingMethod", form)?.value.trim() || "",
      note: $("#checkoutNote", form)?.value.trim() || ""
    };
  }

  function saveCheckoutFormState(){
    const values = getCheckoutFormValues();
    if (!values) return;
    try {
      localStorage.setItem(CHECKOUT_FORM_STORAGE_KEY, JSON.stringify(values));
    } catch {}
  }

  function loadCheckoutFormState(){
    const form = getCheckoutForm();
    if (!form) return;
    try {
      const raw = localStorage.getItem(CHECKOUT_FORM_STORAGE_KEY);
      if (!raw) return;
      const values = JSON.parse(raw);
      if (!values || typeof values !== "object") return;
      $("#checkoutFullName", form).value = String(values.fullName || "");
      $("#checkoutEmail", form).value = String(values.email || "");
      $("#checkoutPhone", form).value = String(values.phone || "");
      $("#checkoutCityZip", form).value = String(values.cityZip || "");
      $("#checkoutAddress", form).value = String(values.address || "");
      $("#checkoutShippingMethod", form).value = String(values.shippingMethod || "");
      $("#checkoutNote", form).value = String(values.note || "");
    } catch {}
  }

  function bindCheckoutFormPersistence(){
    const form = getCheckoutForm();
    if (!form) return;
    form.addEventListener("input", saveCheckoutFormState);
    form.addEventListener("change", saveCheckoutFormState);
  }

  function validateCheckoutForm(){
    const form = getCheckoutForm();
    const values = getCheckoutFormValues();
    if (!form || !values) return { ok: true, values: null };
    const requiredFields = [
      ["checkoutFullName", values.fullName, "Add meg a teljes nevedet."],
      ["checkoutEmail", values.email, "Add meg az e-mail címedet."],
      ["checkoutPhone", values.phone, "Add meg a telefonszámodat."],
      ["checkoutCityZip", values.cityZip, "Add meg az irányítószámot és a várost."],
      ["checkoutAddress", values.address, "Add meg a címedet."],
      ["checkoutShippingMethod", values.shippingMethod, "Válassz szállítási módot."]
    ];
    let firstInvalidMessage = "";
    requiredFields.forEach(([id, value, message]) => {
      const field = $(`#${id}`, form);
      const invalid = !String(value || "").trim();
      if (field) field.toggleAttribute("aria-invalid", invalid);
      if (!firstInvalidMessage && invalid) firstInvalidMessage = message;
    });
    const emailField = $("#checkoutEmail", form);
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email);
    if (emailField) emailField.toggleAttribute("aria-invalid", !!values.email && !emailValid);
    if (!firstInvalidMessage && values.email && !emailValid) firstInvalidMessage = "Adj meg egy érvényes e-mail címet.";
    if (firstInvalidMessage) return { ok: false, values, message: firstInvalidMessage };
    return { ok: true, values };
  }

  async function startStripeCheckout(){
    if (state.checkoutBusy) return;
    const entries = cartEntries();
    if (!entries.length){
      setCheckoutStatus("A fizetéshez tegyél legalább egy terméket a kosárba.", "error");
      toast("Előbb válassz legalább egy terméket");
      return;
    }
    const validation = validateCheckoutForm();
    if (!validation.ok){
      setCheckoutStatus(validation.message, "error");
      toast(validation.message);
      return;
    }

    saveCheckoutFormState();
    setCheckoutBusy(true);
    setCheckoutStatus("Előkészítjük a fizetést...", "loading");

    try {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({
          items: entries.map(({ product, qty }) => ({ id: product.id, qty })),
          customer: validation.values
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.url) {
        throw new Error(data?.error || "A fizetés most nem érhető el.");
      }
      setCheckoutStatus("Átirányítunk a fizetési oldalra...", "success");
      window.location.href = data.url;
      return;
    } catch (error) {
      const message = error instanceof Error && error.message
        ? error.message
        : "Nem sikerült elindítani a fizetést.";
      setCheckoutStatus(message, "error");
      toast(message);
    } finally {
      setCheckoutBusy(false);
    }
  }

  function syncQueryInputs(){
    $$("[data-global-query],[data-mobile-query],[data-catalog-query]").forEach(i => i.value = state.query);
  }
  function navigateToProducts(query){
    location.href = query ? `products.html?q=${encodeURIComponent(query)}` : "products.html";
  }
  function runSearch(value, allowNav=false){
    state.query = value.trim();
    syncQueryInputs();
    if (document.body.dataset.page === "products"){
      setParam("q", state.query);
      renderCatalog();
    } else if (allowNav){
      navigateToProducts(state.query);
    }
  }

  function initSearch(){
    state.query = getParam("q"); syncQueryInputs();
    $$("[data-global-query],[data-mobile-query]").forEach(input => {
      input.addEventListener("keydown", e => { if (e.key === "Enter"){ e.preventDefault(); runSearch(e.target.value, true); }});
      input.addEventListener("input", e => { if (document.body.dataset.page === "products") runSearch(e.target.value, false); });
    });
    $$("[data-catalog-query]").forEach(input => {
      input.addEventListener("input", e => runSearch(e.target.value, false));
      input.addEventListener("keydown", e => { if (e.key === "Enter"){ e.preventDefault(); runSearch(e.target.value, false); }});
    });
    $$("[data-search-go],[data-mobile-search-go]").forEach(btn => {
      btn.addEventListener("click", () => {
        const input = btn.parentElement?.querySelector("input");
        runSearch(input ? input.value : "", true);
      });
    });
  }

  function initFilters(){
    $$("[data-filter]").forEach(btn => btn.addEventListener("click", () => {
      state.filter = btn.dataset.filter;
      $$("[data-filter]").forEach(node => node.classList.toggle("active", node.dataset.filter === state.filter));
      renderCatalog();
    }));
    $$("[data-sort]").forEach(select => select.addEventListener("change", e => {
      state.sort = e.target.value;
      $$("[data-sort]").forEach(node => node.value = state.sort);
      renderCatalog();
    }));
  }

  function setActiveNav(){
    const page = document.body.dataset.page;
    const active = page === "home" ? "home" : (page === "products" ? "products" : (page === "checkout" ? "checkout" : (page === "admin" ? "admin" : null)));
    $$("[data-nav-key]").forEach(link => link.classList.toggle("active", !!active && link.dataset.navKey === active));
  }

  function initNavigation(){
    setActiveNav();
    $$("[data-open-cart]").forEach(btn => btn.addEventListener("click", openCart));
    $("#closeCartBtn")?.addEventListener("click", closeCart);
    $("#cartOverlay")?.addEventListener("click", closeCart);
    $$("[data-open-menu]").forEach(btn => btn.addEventListener("click", openMenu));
    $("#closeMenuBtn")?.addEventListener("click", closeMenu);
    $("#mobileMenuOverlay")?.addEventListener("click", closeMenu);
    $("#cartGoCheckout")?.addEventListener("click", () => location.href = "checkout.html");
    $$(".mobile-links a").forEach(link => link.addEventListener("click", closeMenu));
  }

  function initActions(){
    $("#clearCartBtn")?.addEventListener("click", () => {
      localStorage.removeItem(STORE_KEY);
      updateCartCount();
      renderCart();
      renderCheckout();
      setCheckoutStatus("A kosár kiürült.", "info");
      toast("A kosarat kiürítettük");
    });
    $("#checkoutAction")?.addEventListener("click", e => {
      e.preventDefault();
      void startStripeCheckout();
    });
    $$('[data-demo-send]').forEach(btn => btn.addEventListener('click', e => {
      e.preventDefault(); toast("Köszönjük! Hamarosan felvesszük veled a kapcsolatot");
    }));
  }

  function rerenderAll(){
    syncCatalog();
    cleanUnavailableCartItems();
    updateCartCount();
    renderHome();
    renderCatalog();
    renderCart();
    renderCheckout();
  }

  let remoteRefreshInFlight = false;
  let lastCatalogRefreshAt = Date.now();

  async function refreshPublishedCatalog(forceRender = true){
    if (!window.NSCardAdmin?.loadRemoteCatalog || remoteRefreshInFlight) return false;
    remoteRefreshInFlight = true;
    try {
      const result = await window.NSCardAdmin.loadRemoteCatalog({ forceVisible: true });
      const changed = typeof result === "object" && result !== null && "changed" in result
        ? !!result.changed
        : true;
      lastCatalogRefreshAt = Date.now();
      if (forceRender && changed) rerenderAll();
      return changed;
    } catch {
      return false;
    } finally {
      remoteRefreshInFlight = false;
    }
  }

  function initLiveCatalogRefresh(){
    if (document.body?.dataset?.page === "admin" || !window.NSCardAdmin?.loadRemoteCatalog) return;

    const refreshIfDue = async () => {
      if (Date.now() - lastCatalogRefreshAt < REMOTE_REFRESH_INTERVAL_MS) return false;
      return refreshPublishedCatalog(true);
    };

    const scheduleNext = (delay = REMOTE_REFRESH_INTERVAL_MS) => {
      window.clearTimeout(window.__nsCatalogRefreshTimer);
      window.__nsCatalogRefreshTimer = window.setTimeout(async () => {
        if (document.visibilityState === "visible") await refreshIfDue();
        scheduleNext(REMOTE_REFRESH_INTERVAL_MS + Math.round(Math.random() * REMOTE_REFRESH_JITTER_MS));
      }, delay);
    };

    scheduleNext(REMOTE_REFRESH_INTERVAL_MS);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") refreshIfDue();
    });
    window.addEventListener("focus", () => refreshIfDue());
  }

  function initScheduledPageRefresh(){
    if (document.body?.dataset?.page === "admin") return;
    const pageLoadedAt = Date.now();

    const reloadIfDue = () => {
      if (Date.now() - pageLoadedAt < AUTO_PAGE_REFRESH_INTERVAL_MS) return;
      window.location.reload();
    };

    const scheduleReload = () => {
      window.clearTimeout(window.__nsPageRefreshTimer);
      window.__nsPageRefreshTimer = window.setTimeout(reloadIfDue, AUTO_PAGE_REFRESH_INTERVAL_MS);
    };

    scheduleReload();
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") reloadIfDue();
    });
    window.addEventListener("focus", reloadIfDue);
  }

  window.addEventListener("storage", event => {
    const relevantKeys = [
      window.NSCardAdmin?.STORAGE_KEY || "ns-card-catalog-v2",
      window.NSCardAdmin?.PUBLISHED_CACHE_KEY || "ns-card-catalog-published-cache-v1"
    ];
    if (relevantKeys.includes(event.key)) rerenderAll();
  });

  window.addEventListener("ns-card-catalog-updated", () => rerenderAll());

  document.addEventListener("DOMContentLoaded", async () => {
    updateCartCount();
    initNavigation();
    initSearch();
    initFilters();
    preserveSyncParamsInLinks();
    if (window.NSCardCatalogReady && typeof window.NSCardCatalogReady.then === "function") {
      try { await window.NSCardCatalogReady; } catch {}
    }
    rerenderAll();
    loadCheckoutFormState();
    bindCheckoutFormPersistence();
    initActions();
    reveal(document);

    initLiveCatalogRefresh();
    initScheduledPageRefresh();
  });
})();
