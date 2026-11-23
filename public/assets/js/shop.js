/* NS Card – webshop felület (4.0) */
(() => {
  "use strict";
  const N = window.NSC;
  if (!N) return;
  const { esc, fmtFt, imageUrl, cart } = N;
  const t = (k, v) => N.t(k, v);
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const page = document.body.dataset.page;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  const mobileMQ = window.matchMedia("(max-width: 860px)");

  /* Animáció kapcsolók: az admin „Haladó → Animációk” beállítása a <html> data-fx / data-anim attribútumában */
  const motionOK = () => !reduceMotion && root.dataset.anim !== "off";
  const fx = name => {
    if (!motionOK()) return false;
    const f = root.getAttribute("data-fx");
    return f === null ? true : f.split(/\s+/).includes(name);
  };

  const SOCIAL = {
    instagram: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="2"/><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
    tiktok: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5M14 3c.5 3 2.5 5 5.5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
  };
  const ICON = {
    cart: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 4h2l2.2 10.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.5L20.5 8H6.2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="10" cy="20" r="1.5" fill="currentColor"/><circle cx="17" cy="20" r="1.5" fill="currentColor"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/><path d="m8 12.5 2.6 2.5L16 9.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="2"/><path d="m4 7 8 6 8-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6l-7-3Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="m9 12 2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    truck: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="7" cy="17.5" r="1.8" stroke="currentColor" stroke-width="2"/><circle cx="17" cy="17.5" r="1.8" stroke="currentColor" stroke-width="2"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" stroke-width="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" stroke-width="2"/></svg>'
  };

  const productUrl = p => `/product?id=${p.id}`;
  const norm = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  /* ---------------- szövegek ---------------- */
  function applyTexts(scope = document) {
    $$("[data-t]", scope).forEach(el => { const v = t(el.dataset.t); if (el.textContent !== v) el.textContent = v; });
    $$("[data-t-ph]", scope).forEach(el => { const v = t(el.dataset.tPh); if (el.placeholder !== v) el.placeholder = v; });
  }

  /* ---------------- üzenet ---------------- */
  let toastTimer = 0;
  function toast(message) {
    const el = $("[data-toast]");
    if (!el) return;
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 3400);
  }

  /* ---------------- „Kosárba került” panel ---------------- */
  let addedTimer = 0;
  function hideAdded() { clearTimeout(addedTimer); $("[data-added]")?.classList.remove("show"); }
  function showAdded(p, qty) {
    const el = $("[data-added]");
    if (!el || !p) return;
    const inCart = cart.qtyOf(p.id);
    el.innerHTML = `
      <div class="added-thumb"><img src="${esc(imageUrl(p.images[0]))}" alt=""></div>
      <div>
        <p class="added-title">${ICON.check}${esc(t("added.title"))}</p>
        <p class="added-name">${esc(p.name)}</p>
        <p class="added-meta">${qty} db × ${fmtFt(p.price)}${inCart > qty ? ` · a kosárban ${inCart} db` : ""}</p>
      </div>
      <button class="added-close" type="button" data-added-close aria-label="Értesítés bezárása">${ICON.close}</button>
      <div class="added-actions">
        <button class="btn btn-ghost btn-sm" type="button" data-open-cart>${esc(t("added.cart"))} (${cart.count()})</button>
        <a class="btn btn-primary btn-sm" href="/checkout">${esc(t("added.checkout"))}</a>
      </div>
      <div class="added-bar" aria-hidden="true"><i></i></div>`;
    el.classList.remove("show");
    void el.offsetWidth;
    el.classList.add("show");
    clearTimeout(addedTimer);
    addedTimer = setTimeout(hideAdded, 4600);
  }

  /* ---------------- fiókok és lapok ---------------- */
  const scrim = () => $("[data-scrim]");
  let openDrawerEl = null;
  let lastFocus = null;
  function lock(on) { document.body.classList.toggle("lock", on); }
  function openDrawer(el) {
    if (!el) return;
    closeDrawer(true);
    closeSearch(true);
    hideAdded();
    lastFocus = document.activeElement;
    openDrawerEl = el;
    el.style.transform = "";
    el.classList.add("open");
    scrim()?.classList.add("open");
    lock(true);
    $$(`[aria-controls="${el.id}"]`).forEach(b => b.setAttribute("aria-expanded", "true"));
    setTimeout(() => $("[data-close]", el)?.focus({ preventScroll: true }), 60);
  }
  function closeDrawer(silent) {
    if (!openDrawerEl) return;
    $$(`[aria-controls="${openDrawerEl.id}"]`).forEach(b => b.setAttribute("aria-expanded", "false"));
    openDrawerEl.classList.remove("open");
    openDrawerEl.style.transform = "";
    openDrawerEl = null;
    scrim()?.classList.remove("open");
    lock(false);
    if (!silent && lastFocus?.focus) lastFocus.focus({ preventScroll: true });
  }
  const openCart = () => { renderCart(); openDrawer($("[data-cart]")); };

  function openFilters() {
    const f = $("[data-filters]");
    if (!f) return;
    f.classList.add("open"); scrim()?.classList.add("open"); lock(true);
    setTimeout(() => $("[data-close-filters]", f)?.focus({ preventScroll: true }), 60);
  }
  function closeFilters() {
    const f = $("[data-filters]");
    if (f?.classList.contains("open")) {
      f.classList.remove("open");
      if (!openDrawerEl) { scrim()?.classList.remove("open"); lock(false); }
    }
  }

  /* Alsó lapok lehúzással zárhatók (mobil kosár, szűrők) */
  function bindSwipeDown(sheet, handleSel, onClose) {
    if (!sheet) return;
    let y0 = 0, dy = 0, dragging = false;
    sheet.addEventListener("touchstart", e => {
      if (!mobileMQ.matches || !e.target.closest(handleSel)) return;
      dragging = true; y0 = e.touches[0].clientY; dy = 0;
      sheet.style.transition = "none";
    }, { passive: true });
    sheet.addEventListener("touchmove", e => {
      if (!dragging) return;
      dy = Math.max(0, e.touches[0].clientY - y0);
      sheet.style.transform = `translateY(${dy}px)`;
    }, { passive: true });
    sheet.addEventListener("touchend", () => {
      if (!dragging) return;
      dragging = false;
      sheet.style.transition = "";
      if (dy > 90) onClose(); else sheet.style.transform = "";
      setTimeout(() => { sheet.style.transform = ""; }, 350);
    });
  }

  /* ---------------- keresés ---------------- */
  function searchProducts(q, limit = 8) {
    const words = norm(q).split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    const rank = p => (N.isBuyable(p) ? 0 : N.isSoon(p) ? 1 : 2);
    return N.products()
      .filter(p => { const hay = norm([p.name, p.set, p.line, p.badge, N.categoryLabel(p.category)].join(" ")); return words.every(w => hay.includes(w)); })
      .sort((a, b) => rank(a) - rank(b))
      .slice(0, limit);
  }
  function resultRow(p) {
    const st = N.stockInfo(p);
    return `<a href="${productUrl(p)}" role="option"><img src="${esc(imageUrl(p.images[0]))}" alt="" loading="lazy"><span><strong>${esc(p.name)}</strong><small>${esc(N.categoryLabel(p.category))} · ${esc(st.label)}</small></span><span class="s-price">${fmtFt(p.price)}</span></a>`;
  }
  function resultsHTML(q, limit) {
    const list = searchProducts(q, limit);
    if (!list.length) return `<p class="s-empty">${esc(t("search.empty", { q: q.replace(/\$/g, "$$$$") }))}</p>`;
    return list.map(resultRow).join("") + `<a class="s-all" href="/products?q=${encodeURIComponent(q)}">${esc(t("search.all"))}</a>`;
  }

  /* asztali kereső: lenyíló találatok (a terméklistán élő szűrés helyett) */
  function bindDesktopSearch() {
    const input = $("#q-desktop");
    const box = $("[data-suggest]");
    if (!input || !box || page === "products") return;
    let active = -1;
    const items = () => $$("a", box);
    const render = () => {
      const q = input.value.trim();
      active = -1;
      if (!q) { box.hidden = true; input.setAttribute("aria-expanded", "false"); return; }
      box.innerHTML = resultsHTML(q, 6);
      box.hidden = false;
      input.setAttribute("aria-expanded", "true");
    };
    input.addEventListener("input", render);
    input.addEventListener("focus", () => { if (input.value.trim()) render(); });
    input.addEventListener("keydown", e => {
      const list = items();
      if (box.hidden || !list.length) return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        active = (active + (e.key === "ArrowDown" ? 1 : -1) + list.length) % list.length;
        list.forEach((a, i) => a.classList.toggle("active", i === active));
      } else if (e.key === "Enter" && active >= 0) { e.preventDefault(); location.href = list[active].href; }
      else if (e.key === "Escape") { box.hidden = true; }
    });
    document.addEventListener("click", e => { if (!e.target.closest("[data-search-form]")) box.hidden = true; });
  }

  /* mobil kereső lap */
  let searchOpen = false;
  function renderSheet() {
    const input = $("#q-sheet");
    const q = input?.value.trim() || "";
    const cats = $("[data-sheet-cats]");
    const res = $("[data-sheet-results]");
    if (cats) {
      const list = categoriesWithCounts();
      cats.hidden = !!q;
      if (!q) {
        const top = N.products().filter(p => N.isBuyable(p) && (p.flags.includes("home") || p.flags.includes("popular"))).slice(0, 4);
        cats.innerHTML = (list.length ? `<h2>${esc(t("search.popular"))}</h2><div class="chips">${list.map(c => `<a class="chip" href="/products?cat=${esc(c.value)}">${esc(c.label)}</a>`).join("")}</div>` : "")
          + (top.length ? `<h2>${esc(t("featured.title"))}</h2><div class="suggest">${top.map(resultRow).join("")}</div>` : "");
      }
    }
    if (res) res.innerHTML = q ? resultsHTML(q, 12) : "";
  }
  function openSearch() {
    const sheet = $("[data-search-sheet]");
    if (!sheet) return;
    closeDrawer(true); closeFilters(); hideAdded();
    sheet.classList.add("open");
    searchOpen = true;
    lock(true);
    const input = $("#q-sheet");
    input?.focus();
    renderSheet();
  }
  function closeSearch(silent) {
    const sheet = $("[data-search-sheet]");
    if (!sheet || !searchOpen) return;
    sheet.classList.remove("open");
    searchOpen = false;
    if (!openDrawerEl) lock(false);
    if (!silent) $("[data-open-search]")?.focus({ preventScroll: true });
  }

  /* ---------------- termékkártya ---------------- */
  function tagsHTML(p) {
    const tg = [];
    if (N.isSoon(p)) tg.push(`<span class="tag tag-soon">${esc(t("stock.soon"))}</span>`);
    if (p.oldPrice) tg.push(`<span class="tag tag-sale">−${N.discount(p)}%</span>`);
    else if (p.flags.includes("sale")) tg.push(`<span class="tag tag-sale">${esc(t("tag.sale"))}</span>`);
    if (p.flags.includes("new")) tg.push(`<span class="tag tag-new">${esc(t("tag.new"))}</span>`);
    if (p.flags.includes("rare")) tg.push(`<span class="tag tag-rare">${esc(t("tag.rare"))}</span>`);
    if (p.badge) tg.push(`<span class="tag">${esc(p.badge)}</span>`);
    return tg.slice(0, 3).join("");
  }
  const rarity = p => p.flags.includes("rare") ? "rare" : p.flags.includes("new") ? "new" : (p.oldPrice || p.flags.includes("sale")) ? "sale" : "";

  function cardHTML(p) {
    const st = N.stockInfo(p);
    const buyable = N.isBuyable(p);
    const img = imageUrl(p.images[0]);
    const r = rarity(p);
    return `
      <article class="pcard"${r ? ` data-rarity="${r}"` : ""}>
        <div class="pcard-top"><span class="pcard-cat">${esc(N.categoryLabel(p.category))}</span><span class="gem" aria-hidden="true"></span></div>
        <div class="pcard-media">
          <div class="tags">${tagsHTML(p)}</div>
          ${img ? `<img src="${esc(img)}" alt="" loading="lazy" decoding="async">` : ""}
        </div>
        <div class="pcard-body">
          <h3><a href="${productUrl(p)}">${esc(p.name)}</a></h3>
          <span class="stock stock-${st.key}">${esc(st.label)}</span>
        </div>
        <div class="pcard-buy">
          <div class="price">${p.oldPrice ? `<s>${fmtFt(p.oldPrice)}</s>` : ""}<strong>${fmtFt(p.price)}</strong></div>
          ${buyable
            ? `<button class="btn btn-primary btn-sm add" type="button" data-add="${p.id}" aria-label="${esc(t("card.add"))}: ${esc(p.name)}"><span class="cart-ico">${ICON.cart}</span><span class="add-label">${esc(t("card.add"))}</span><span class="add-icon">${ICON.plus}</span></button>`
            : `<a class="btn btn-ghost btn-sm add" href="${productUrl(p)}" aria-label="${esc(t("card.details"))}: ${esc(p.name)}"><span class="add-label">${esc(t("card.details"))}</span><span class="add-icon">${ICON.arrow}</span></a>`}
        </div>
      </article>`;
  }

  const emptyHTML = (title, text, cta) => `<div class="empty" style="grid-column:1/-1"><strong>${esc(title)}</strong><span>${esc(text)}</span>${cta || ""}</div>`;

  /* ---------------- kosár ---------------- */
  function freeShipHTML(subtotal) {
    const s = N.settings();
    if (!(s.freeShippingFrom > 0) || !subtotal) return "";
    const left = s.freeShippingFrom - subtotal;
    const pct = Math.min(100, Math.round(subtotal / s.freeShippingFrom * 100));
    const text = left > 0 ? `Még ${fmtFt(left)} és ingyenes a szállítás.` : "A szállítás ingyenes.";
    return `<div class="free-ship">${text}<div class="bar"><i style="width:${pct}%"></i></div></div>`;
  }

  function lineHTML(l, compact) {
    const p = l.product;
    return `
      <div class="line">
        <a class="line-thumb" href="${productUrl(p)}" tabindex="-1" aria-hidden="true"><img src="${esc(imageUrl(p.images[0]))}" alt=""></a>
        <div>
          <h3><a href="${productUrl(p)}">${esc(p.name)}</a></h3>
          <p class="unit">${fmtFt(p.price)} / db</p>
          <div class="stepper" role="group" aria-label="Mennyiség: ${esc(p.name)}">
            <button type="button" data-qty="${p.id}" data-d="-1" aria-label="Eggyel kevesebb">−</button>
            <output aria-live="polite">${l.qty}</output>
            <button type="button" data-qty="${p.id}" data-d="1" aria-label="Eggyel több" ${l.qty >= p.stock ? "disabled" : ""}>+</button>
          </div>
        </div>
        <div><p class="sum">${fmtFt(p.price * l.qty)}</p>${compact ? "" : `<button class="remove" type="button" data-remove="${p.id}">Törlés</button>`}</div>
      </div>`;
  }

  function renderCart() {
    const lines = cart.lines();
    const body = $("[data-cart-lines]");
    const foot = $("[data-cart-foot]");
    if (!body || !foot) return;
    if (!lines.length) {
      body.innerHTML = emptyHTML(t("cart.empty"), t("cart.empty.text"), `<a class="btn btn-primary" href="/products">${esc(t("hero.cta"))}</a>`);
      foot.hidden = true;
      return;
    }
    foot.hidden = false;
    const subtotal = cart.subtotal();
    const s = N.settings();
    const free = s.freeShippingFrom > 0 && subtotal >= s.freeShippingFrom;
    body.innerHTML = lines.map(l => lineHTML(l)).join("");
    foot.innerHTML = `
      ${freeShipHTML(subtotal)}
      <div class="sum-row"><span>Részösszeg</span><strong>${fmtFt(subtotal)}</strong></div>
      <div class="sum-row"><span>Szállítás</span><strong>${free ? "Ingyenes" : shipShortLabel()}</strong></div>
      <a class="btn btn-primary btn-block" href="/checkout">${esc(t("cart.checkout"))}</a>
      <button class="btn btn-ghost btn-block" type="button" data-close>${esc(t("cart.continue"))}</button>`;
  }

  function updateCount(bump) {
    const n = cart.count();
    $$("[data-cart-count]").forEach(el => {
      el.textContent = n;
      el.classList.toggle("has", n > 0);
      if (bump && motionOK()) { el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); }
    });
  }

  function addToCart(id, qty = 1, sourceEl = null) {
    const p = N.byId(id);
    const img = sourceEl?.closest?.(".pcard")?.querySelector(".pcard-media img")
      || (sourceEl?.closest?.(".pdp, .sticky-buy") ? currentSlideImg() : null);
    const snap = img?.getBoundingClientRect ? { rect: img.getBoundingClientRect(), node: img.cloneNode() } : null;
    const res = cart.add(id, qty);
    if (res.ok) {
      const flew = flyToCart(snap);
      setTimeout(() => updateCount(true), flew ? 640 : 0);
      showAdded(p, qty);
    } else if (res.reason === "max") {
      toast(`Ebből a termékből most ${p?.stock} db rendelhető, és mind a kosaradban van.`);
    } else {
      toast(res.reason === "soon" ? "Ez a termék még nem rendelhető." : "Ez a termék elfogyott.");
    }
  }

  /* ---------------- mozgás ---------------- */
  let revealIO = null;
  function revealScan() {
    const els = $$(".pcard:not(.rv), .cat-tile:not(.rv), .steps li:not(.rv)");
    if (!els.length) return;
    if (!fx("reveal") || !("IntersectionObserver" in window)) return;
    revealIO = revealIO || new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        en.target.classList.add("in");
        revealIO.unobserve(en.target);
      });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.06 });
    const counters = new Map();
    els.forEach(el => {
      const parent = el.parentElement;
      const n = counters.get(parent) || 0;
      counters.set(parent, n + 1);
      el.style.setProperty("--d", `${Math.min(n, 8) * 60}ms`);
      el.classList.add("rv");
      const r = el.getBoundingClientRect();
      if (r.top < innerHeight && r.bottom > 0) requestAnimationFrame(() => el.classList.add("in"));
      else revealIO.observe(el);
    });
  }

  function bindTilt() {
    if (!finePointer) return;
    let active = null;
    document.addEventListener("pointermove", e => {
      const card = e.target.closest?.(".pcard");
      if (active && active !== card) { resetTilt(active); active = null; }
      if (!card || !fx("tilt")) return;
      active = card;
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      card.style.setProperty("--ry", `${((x - .5) * 12).toFixed(2)}deg`);
      card.style.setProperty("--rx", `${((.5 - y) * 12).toFixed(2)}deg`);
      card.style.setProperty("--gx", `${(x * 100).toFixed(1)}%`);
      card.style.setProperty("--gy", `${(y * 100).toFixed(1)}%`);
      card.classList.add("tilting");
    }, { passive: true });
    document.addEventListener("pointerleave", () => { if (active) resetTilt(active); active = null; });
  }
  function resetTilt(card) {
    card.classList.remove("tilting");
    card.style.setProperty("--rx", "0deg");
    card.style.setProperty("--ry", "0deg");
  }

  function flyToCart(snap) {
    if (!fx("fly") || !snap?.node?.animate) return false;
    const target = $$("[data-open-cart]").find(b => b.offsetParent !== null && !b.closest("[data-added]"));
    if (!target) return false;
    const a = snap.rect, b = target.getBoundingClientRect();
    if (!a.width) return false;
    const ghost = snap.node;
    ghost.className = "fly-ghost";
    ghost.removeAttribute("loading");
    Object.assign(ghost.style, { left: `${a.left}px`, top: `${a.top}px`, width: `${a.width}px`, height: `${a.height}px` });
    document.body.appendChild(ghost);
    const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
    ghost.animate([
      { transform: "translate(0,0) scale(1) rotate(0)", opacity: 1 },
      { transform: `translate(${dx * .5}px, ${dy * .5 - 110}px) scale(.55) rotate(-10deg)`, opacity: 1, offset: .5 },
      { transform: `translate(${dx}px, ${dy}px) scale(.1) rotate(14deg)`, opacity: .2 }
    ], { duration: 720, easing: "cubic-bezier(.5,0,.3,1)" }).onfinish = () => ghost.remove();
    return true;
  }

  /* ---------------- közös: fejléc, lábléc, menü ---------------- */
  function categoriesWithCounts() {
    const list = N.products();
    return N.CATEGORIES.map(c => ({ ...c, count: list.filter(p => p.category === c.value).length })).filter(c => c.count > 0);
  }

  function shipShortLabel() {
    const prices = N.shippingMethods().filter(m => m.value !== "pickup").map(m => m.price);
    if (!prices.length) return "Személyes átvétel";
    const min = Math.min(...prices), max = Math.max(...prices);
    return min === max ? fmtFt(min) : `${fmtFt(min)}-tól`;
  }
  function payMethods(s) {
    const m = [];
    if (s.payCard) m.push("bankkártya");
    if (s.payTransfer) m.push("átutalás");
    if (s.payCod) m.push("utánvét");
    return m;
  }
  const joinHu = arr => arr.length <= 1 ? (arr[0] || "") : `${arr.slice(0, -1).join(", ")} vagy ${arr[arr.length - 1]}`;
  const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
  function shipText(s) {
    const parts = N.shippingMethods().map(m => `${m.label.toLowerCase()} ${m.price ? fmtFt(m.price) : "ingyenes"}`);
    let tx = cap(parts.join(", "));
    if (s.freeShippingFrom > 0) tx += `. ${fmtFt(s.freeShippingFrom)} felett a szállítás ingyenes`;
    return tx + ".";
  }

  function sectionOn(id) {
    const sec = N.settings().theme.sections.find(x => x.id === id);
    return !sec || sec.on;
  }

  function renderChrome() {
    const s = N.settings();
    const ann = $("[data-announce]");
    if (ann) { ann.textContent = s.announcement; ann.hidden = !s.announcement; }

    const cats = categoriesWithCounts();
    const menuCats = $("[data-menu-cats]");
    if (menuCats) menuCats.innerHTML = cats.length ? `<p>${esc(t("cats.title"))}</p>${cats.map(c => `<a href="/products?cat=${esc(c.value)}"><span>${esc(c.label)}</span><span>${c.count}</span></a>`).join("")}` : "";
    const footCats = $("[data-foot-cats]");
    if (footCats) footCats.innerHTML = `<li><a href="/products">${esc(t("link.all"))}</a></li>` + cats.map(c => `<li><a href="/products?cat=${esc(c.value)}">${esc(c.label)}</a></li>`).join("");
    const footContact = $("[data-foot-contact]");
    if (footContact) {
      const items = [];
      if (s.email) items.push(`<li><a href="mailto:${esc(s.email)}">${esc(s.email)}</a></li>`);
      if (s.phone) items.push(`<li><a href="tel:${esc(s.phone.replace(/[^+\d]/g, ""))}">${esc(s.phone)}</a></li>`);
      if (s.address) items.push(`<li>${esc(s.address)}</li>`);
      if ((s.email || s.phone) && sectionOn("contact")) items.push(`<li><a href="/#kapcsolat">${esc(t("nav.contact"))}</a></li>`);
      footContact.innerHTML = items.join("") || "<li>Hamarosan</li>";
    }
    const social = $("[data-social]");
    if (social) {
      const links = [["instagram", "Instagram"], ["facebook", "Facebook"], ["tiktok", "TikTok"]]
        .filter(([k]) => /^https?:\/\//i.test(s[k] || ""))
        .map(([k, label]) => `<a href="${esc(s[k])}" target="_blank" rel="noopener" aria-label="${label}">${SOCIAL[k]}</a>`);
      social.innerHTML = links.join("");
      social.hidden = !links.length;
    }
    $$("[data-contact-nav]").forEach(a => { a.hidden = (!s.email && !s.phone) || !sectionOn("contact"); });
    $$('a[href="/#rendeles"]').forEach(a => { a.hidden = !sectionOn("steps"); });
    $$("[data-year]").forEach(el => { el.textContent = new Date().getFullYear(); });
  }

  function bindChrome() {
    document.addEventListener("click", e => {
      const el = e.target.closest("button, a");
      if (!el) return;
      if (el.matches("[data-open-cart]")) { e.preventDefault(); openCart(); }
      else if (el.matches("[data-open-menu]")) openDrawer($("[data-menu]"));
      else if (el.matches("[data-open-search]")) openSearch();
      else if (el.matches("[data-close-search]")) closeSearch();
      else if (el.matches("[data-close]")) closeDrawer();
      else if (el.matches("[data-added-close]")) hideAdded();
      else if (el.matches("[data-add]")) addToCart(Number(el.dataset.add), 1, el);
      else if (el.matches("[data-qty]")) {
        const id = Number(el.dataset.qty);
        cart.set(id, cart.qtyOf(id) + Number(el.dataset.d));
      } else if (el.matches("[data-remove]")) cart.remove(Number(el.dataset.remove));
      else if (el.closest(".menu-links a, .menu-cats a")) closeDrawer(true);
      else if (el.closest("[data-search-sheet] a")) closeSearch(true);
    });
    scrim()?.addEventListener("click", () => { closeDrawer(); closeFilters(); });
    document.addEventListener("keydown", e => {
      if (e.key !== "Escape") return;
      if (searchOpen) closeSearch(); else { closeDrawer(); closeFilters(); hideAdded(); if ($(".pull.focus")) setFocus(null); }
    });
    const added = $("[data-added]");
    added?.addEventListener("mouseenter", () => clearTimeout(addedTimer));
    added?.addEventListener("mouseleave", () => { clearTimeout(addedTimer); addedTimer = setTimeout(hideAdded, 1800); });
    added?.addEventListener("focusin", () => clearTimeout(addedTimer));

    bindSwipeDown($("[data-cart]"), ".grab, [data-cart-head]", () => closeDrawer());
    bindSwipeDown($("[data-filters]"), ".filters-grab, .sheet-head", closeFilters);

    window.addEventListener("nsc:cart", () => {
      updateCount(false);
      if (openDrawerEl?.matches("[data-cart]")) renderCart();
      if (page === "checkout") renderCheckout();
      if (page === "product") renderProduct();
    });
    window.addEventListener("storage", e => { if (e.key === N.KEYS.cart) { updateCount(false); renderCart(); if (page === "checkout") renderCheckout(); } });

    const q = new URLSearchParams(location.search).get("q") || "";
    $$("[data-q]").forEach(i => { i.value = q; });

    const sheetInput = $("#q-sheet");
    sheetInput?.addEventListener("input", renderSheet);
    sheetInput?.form?.addEventListener("submit", e => {
      if (page !== "products") return;
      e.preventDefault();
      filters.q = sheetInput.value.trim();
      $$("[data-q]").forEach(i => { i.value = sheetInput.value; });
      writeFilters(); renderList(); closeSearch(true);
      window.scrollTo({ top: 0 });
    });
    bindDesktopSearch();
  }

  /* ---------------- kezdőlap ---------------- */
  function arrangeSections() {
    const wrap = $("[data-sections]");
    if (!wrap) return;
    const order = N.settings().theme.sections;
    const sig = order.map(x => x.id).join();
    if (wrap.dataset.order === sig) return;
    wrap.dataset.order = sig;
    order.forEach(sec => { const el = $(`:scope > [data-section="${sec.id}"]`, wrap); if (el) wrap.appendChild(el); });
  }
  function showSection(id, hasContent) {
    const el = $(`[data-section="${id}"]`);
    if (el) el.hidden = !(sectionOn(id) && hasContent);
  }

  function renderHome() {
    const list = N.products();
    const s = N.settings();
    const buyable = list.filter(N.isBuyable);
    const soon = list.filter(N.isSoon);
    let featured = list.filter(p => p.flags.includes("home") && !N.isSoon(p));
    if (featured.length < 4) featured = featured.concat(buyable.filter(p => !featured.includes(p) && p.flags.includes("popular")));
    if (featured.length < 4) featured = featured.concat(buyable.filter(p => !featured.includes(p)));
    featured = featured.slice(0, 8);

    arrangeSections();

    const fan = $("[data-fan]");
    if (fan) {
      const pool = featured.concat(list.filter(p => !featured.includes(p) && p.images[0]));
      const pick = pool.filter(p => p.images[0]).slice(0, 5);
      const sig = pick.map(p => p.id + p.images[0]).join("|");
      if (fan.dataset.sig !== sig) {
        fan.dataset.sig = sig;
        fan.innerHTML = pick.map((p, i) => `<a href="${productUrl(p)}" aria-label="${esc(p.name)}" style="--i:${i}"><span class="float"><img src="${esc(imageUrl(p.images[0]))}" alt="" decoding="async"${i > 2 ? ' loading="lazy"' : ""}></span></a>`).join("");
      }
    }

    const ticker = $("[data-ticker]");
    if (ticker) {
      const cats = categoriesWithCounts().map(c => c.label);
      const items = [...cats, s.freeShippingFrom > 0 ? `Ingyenes szállítás ${fmtFt(s.freeShippingFrom)} felett` : `Szállítás ${shipShortLabel()}`, `${buyable.length} termék készleten`, ...buyable.filter(p => p.flags.includes("new")).slice(0, 3).map(p => `Új: ${p.name}`)];
      const row = items.map(x => `<span>${esc(x)}</span>`).join("");
      ticker.innerHTML = `<div class="ticker-track">${row}${row}</div>`;
    }
    showSection("ticker", true);

    const setText = (sel, text) => { const el = $(sel); if (el) el.textContent = text; };
    setText("[data-fact-stock]", `${buyable.length} termék készleten${soon.length ? `, ${soon.length} érkezik` : ""}`);
    const shipShort = shipShortLabel();
    setText("[data-fact-ship]", s.freeShippingFrom > 0 ? `${shipShort}, ${fmtFt(s.freeShippingFrom)} felett ingyenes` : shipShort);
    setText("[data-fact-pay]", cap(joinHu(payMethods(s))) || "Rendeléskor egyeztetjük");
    setText("[data-step-ship]", shipText(s));
    setText("[data-step-pay]", payMethods(s).length ? `${cap(joinHu(payMethods(s)))}. A rendelésről e-mailben küldünk visszaigazolást.` : "A rendelésről e-mailben küldünk visszaigazolást.");

    const cats = categoriesWithCounts();
    const rail = $("[data-cat-rail]");
    if (rail) rail.innerHTML = cats.map(c => {
      const sample = list.find(p => p.category === c.value && p.images[0]);
      return `<a class="cat-tile" href="/products?cat=${esc(c.value)}"><div><strong>${esc(c.label)}</strong><span>${c.count} termék</span></div>${sample ? `<img src="${esc(imageUrl(sample.images[0]))}" alt="" loading="lazy">` : ""}</a>`;
    }).join("");
    showSection("categories", cats.length > 0);

    const fg = $("[data-featured]");
    if (fg) fg.innerHTML = featured.length ? featured.map(cardHTML).join("") : emptyHTML("Hamarosan bővül a kínálat", "Nézz vissza később.");
    showSection("featured", true);

    const soonGrid = $("[data-soon]");
    if (soonGrid) soonGrid.innerHTML = soon.map(cardHTML).join("");
    showSection("soon", soon.length > 0);
    const soonLink = $("[data-soon-link]");
    if (soonLink) soonLink.hidden = !(soon.length && sectionOn("soon"));

    showSection("steps", true);

    const cl = $("[data-contact-list]");
    if (cl) {
      const items = [];
      if (s.email) items.push(`<a href="mailto:${esc(s.email)}">${ICON.mail}${esc(s.email)}</a>`);
      if (s.phone) items.push(`<a href="tel:${esc(s.phone.replace(/[^+\d]/g, ""))}">${ICON.phone}${esc(s.phone)}</a>`);
      cl.innerHTML = items.join("");
    }
    const form = $("[data-contact-form]");
    if (form) form.hidden = !s.email;
    showSection("contact", !!(s.email || s.phone));

    const pool = packPool();
    showSection("pack", pool.length >= 3);
    const sig = pool.map(p => p.id).join();
    if (pool.length >= 3 && pack.sig !== sig) { pack.sig = sig; resetPack(true); }
  }

  /* --- csomagbontó --- */
  const pack = { picks: [], timers: [], sig: "", busy: false };
  const packPool = () => N.products().filter(p => N.isBuyable(p) && p.images[0]);
  const TINTS = ["var(--ember)", "var(--spark)", "#3ccb76", "#b56aff", "#ffb02e", "#ff5d8f", "#2fd3ff", "#e7b743"];
  const tintFor = cat => TINTS[Math.max(0, N.CATEGORIES.findIndex(c => c.value === cat)) % TINTS.length];
  function drawPack() {
    const pool = packPool();
    if (pool.length < 3) return [];
    const three = pool.map(p => ({ p, w: Math.random() * (p.flags.includes("rare") ? 1.7 : p.flags.includes("new") ? 1.3 : 1) }))
      .sort((a, b) => b.w - a.w).slice(0, 3).map(x => x.p);
    const best = three.reduce((m, p) => (p.price > m.price ? p : m), three[0]);
    const rest = three.filter(p => p !== best);
    return [rest[0], best, rest[1]]; // a legjobb lap középre kerül, és utoljára fordul meg
  }
  function pullHTML(p, i, best) {
    const rare = p.flags.includes("rare");
    const cls = best || rare ? "r-gold" : p.flags.includes("new") ? "r-new" : "";
    const stars = best ? 3 : rare ? 2 : 1;
    return `
      <div class="pull ${cls}${best ? " best holo" : rare ? " holo" : ""}" style="--i:${i}" data-pull="${i}" role="button" tabindex="-1" aria-label="${esc(p.name)}, ${fmtFt(p.price)}">
        <div class="pull-inner">
          <div class="pull-face pull-front" style="--tint:${tintFor(p.category)}">
            <div class="pc-card">
              <div class="pc-head"><span class="pc-name">${esc(p.name.replace(/^Pokémon TCG:?\s*/i, ""))}</span><span class="pc-rar" aria-hidden="true">${"<i></i>".repeat(stars)}</span></div>
              <div class="pc-art">${best ? `<span class="pc-badge">${esc(t("pack.best"))}</span>` : ""}<img src="${esc(imageUrl(p.images[0]))}" alt="" loading="lazy"></div>
              <span class="pc-type">${esc(N.categoryLabel(p.category))}</span>
              <div class="pc-stats"><div><small>Ár</small><b>${fmtFt(p.price)}</b></div><div><small>Készlet</small><b>${p.stock} db</b></div></div>
              <div class="pc-foot"><span>NSC ${String(p.id).padStart(3, "0")}</span><span>NS Card</span></div>
            </div>
            <a class="pc-view" href="${productUrl(p)}" tabindex="-1">${esc(t("pack.view"))}</a>
          </div>
          <div class="pull-face pull-back" aria-hidden="true"><img src="/img/brand/mark.webp" alt=""><span>NS CARD</span></div>
        </div>
      </div>`;
  }
  function renderPulls() {
    const box = $("[data-pulls]");
    if (!box) return;
    pack.picks = drawPack();
    box.classList.remove("has-focus");
    box.innerHTML = pack.picks.map((p, i) => pullHTML(p, i, i === 1)).join("");
    const total = $("[data-pack-total]");
    if (total) total.textContent = fmtFt(pack.picks.reduce((s, p) => s + p.price, 0));
    layoutPulls();
  }
  function layoutPulls() {
    const stage = $("[data-pack-stage]");
    if (!stage) return;
    const cards = $$(".pull", stage);
    if (!cards.length) return;
    const w = stage.clientWidth, cw = cards[0].offsetWidth || 180;
    const off = Math.max(cw * .7, Math.min(cw + 30, (w - cw) / 2 - 12));
    const pos = [[-off, 22, -10], [0, -14, 0], [off, 22, 10]];
    cards.forEach((c, i) => {
      c.style.setProperty("--x", pos[i][0].toFixed(0));
      c.style.setProperty("--y", pos[i][1]);
      c.style.setProperty("--rot", pos[i][2]);
      c.style.zIndex = i === 1 ? 3 : 2;
    });
  }
  function burst() {
    const box = $("[data-burst]");
    if (!box) return;
    box.classList.remove("go");
    if (!fx("sparkles")) { box.innerHTML = ""; return; }
    const colors = ["var(--gold)", "var(--ember)", "var(--spark)", "#ffffff", "#ff6ad5"];
    box.innerHTML = Array.from({ length: 34 }, (_, i) => {
      const a = Math.random() * Math.PI * 2, d = 120 + Math.random() * 190;
      return `<i style="--tx:${(Math.cos(a) * d).toFixed(0)}px;--ty:${(Math.sin(a) * d - 50).toFixed(0)}px;--tr:${(Math.random() * 720 - 360).toFixed(0)}deg;--c:${colors[i % colors.length]};--dl:${(Math.random() * .12).toFixed(2)}s;${i % 3 ? "" : "border-radius:50%;"}${i % 4 ? "" : "width:5px;height:12px;"}"></i>`;
    }).join("");
    void box.offsetWidth;
    box.classList.add("go");
  }
  function flipPull(card) {
    if (!card || card.classList.contains("flip")) return;
    card.classList.add("flip");
    card.tabIndex = 0;
    if (card.classList.contains("best")) setTimeout(burst, fx("pack") ? 350 : 0);
  }
  function setFocus(card) {
    const box = $("[data-pulls]");
    $$(".pull.focus", box).forEach(c => { if (c !== card) { c.classList.remove("focus"); const a = $(".pc-view", c); if (a) a.tabIndex = -1; } });
    const on = !!card && !card.classList.contains("focus");
    if (card) card.classList.toggle("focus", on);
    box?.classList.toggle("has-focus", on);
    const a = card && $(".pc-view", card);
    if (a) a.tabIndex = on ? 0 : -1;
  }
  function openPack() {
    const stage = $("[data-pack-stage]");
    if (!stage || pack.busy || stage.classList.contains("open")) return;
    if (!pack.picks.length) renderPulls();
    if (!pack.picks.length) return;
    pack.busy = true;
    const anim = fx("pack");
    const at = (ms, fn) => pack.timers.push(setTimeout(fn, anim ? ms : 0));
    layoutPulls();
    if (anim) stage.classList.add("shake");
    at(420, () => { stage.classList.remove("shake"); stage.classList.add("open"); });
    at(1250, () => stage.classList.add("spread"));
    const cards = $$(".pull", stage);
    [0, 2, 1].forEach((idx, k) => at(2000 + k * 560, () => flipPull(cards[idx])));
    at(2000 + 3 * 560 + 450, () => { stage.classList.add("is-done"); pack.busy = false; });
  }
  function resetPack(silent) {
    const stage = $("[data-pack-stage]");
    if (!stage) return;
    pack.timers.forEach(clearTimeout);
    pack.timers = [];
    pack.busy = false;
    stage.classList.remove("open", "spread", "shake", "is-done");
    $("[data-burst]")?.classList.remove("go");
    renderPulls();
    if (!silent) $(".booster", stage)?.focus({ preventScroll: true });
  }

  function bindHome() {
    const mat = $("[data-playmat]");
    if (mat && finePointer) {
      mat.addEventListener("pointermove", e => {
        if (!fx("glow")) return;
        const r = mat.getBoundingClientRect();
        mat.style.setProperty("--mx", `${((e.clientX - r.left) / r.width * 100).toFixed(1)}%`);
        mat.style.setProperty("--my", `${((e.clientY - r.top) / r.height * 100).toFixed(1)}%`);
      });
      mat.addEventListener("pointerenter", () => mat.classList.add("pointer"));
      mat.addEventListener("pointerleave", () => { mat.classList.remove("pointer"); mat.style.setProperty("--mx", "50%"); mat.style.setProperty("--my", "50%"); });
    }
    document.addEventListener("click", e => {
      const stage = $("[data-pack-stage]");
      if (!stage) return;
      if (e.target.closest(".pc-view")) return;
      const card = e.target.closest(".pull");
      if (card && stage.classList.contains("spread")) {
        if (!card.classList.contains("flip")) flipPull(card); else setFocus(card);
        return;
      }
      const b = e.target.closest("[data-pack-open], [data-pack-again]");
      if (!b) { if (e.target.closest("[data-pack-stage]")) setFocus(null); return; }
      if (b.matches("[data-pack-again]")) { resetPack(); setTimeout(openPack, 420); return; }
      if (!b.closest("[data-pack-stage]") && mobileMQ.matches) stage.scrollIntoView({ behavior: motionOK() ? "smooth" : "auto", block: "center" });
      if (stage.classList.contains("open")) { resetPack(true); setTimeout(openPack, 420); } else openPack();
    });
    document.addEventListener("keydown", e => {
      const card = e.target.closest?.(".pull");
      if (!card || (e.key !== "Enter" && e.key !== " ")) return;
      e.preventDefault();
      if (!card.classList.contains("flip")) flipPull(card); else setFocus(card);
    });
    let rz = 0;
    window.addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(layoutPulls, 120); });

    $("[data-contact-form]")?.addEventListener("submit", e => {
      e.preventDefault();
      const f = e.currentTarget;
      const s = N.settings();
      const name = f.name.value.trim(), email = f.email.value.trim(), msg = f.message.value.trim();
      let ok = true;
      [[f.name, name], [f.email, /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)], [f.message, msg]].forEach(([el, v]) => { el.setAttribute("aria-invalid", String(!v)); if (!v) ok = false; });
      if (!ok) { toast("Töltsd ki a nevet, az e-mail címet és az üzenetet."); return; }
      const body = `${msg}\n\n— ${name} (${email})`;
      location.href = `mailto:${encodeURIComponent(s.email)}?subject=${encodeURIComponent("Érdeklődés az NS Card webshopból")}&body=${encodeURIComponent(body)}`;
    });
  }

  /* ---------------- terméklista ---------------- */
  const filters = { cat: "all", q: "", sort: "featured", instock: false, soon: false, sale: false, min: "", max: "" };

  function readFilters() {
    const u = new URLSearchParams(location.search);
    filters.cat = u.get("cat") || "all";
    filters.q = u.get("q") || "";
    filters.sort = u.get("sort") || "featured";
    filters.instock = u.get("instock") === "1";
    filters.soon = u.get("soon") === "1";
    filters.sale = u.get("sale") === "1";
    filters.min = u.get("min") || "";
    filters.max = u.get("max") || "";
  }
  function writeFilters() {
    if (page !== "products") return;
    const u = new URLSearchParams();
    if (filters.cat !== "all") u.set("cat", filters.cat);
    if (filters.q) u.set("q", filters.q);
    if (filters.sort !== "featured") u.set("sort", filters.sort);
    ["instock", "soon", "sale"].forEach(k => filters[k] && u.set(k, "1"));
    if (filters.min) u.set("min", filters.min);
    if (filters.max) u.set("max", filters.max);
    const qs = u.toString();
    history.replaceState(null, "", qs ? `?${qs}` : location.pathname);
  }

  function filtered() {
    let list = N.products();
    if (filters.cat !== "all") list = list.filter(p => p.category === filters.cat);
    if (filters.q) {
      const words = norm(filters.q).split(/\s+/).filter(Boolean);
      list = list.filter(p => {
        const hay = norm([p.name, p.set, p.line, p.description, p.badge, N.categoryLabel(p.category)].join(" "));
        return words.every(w => hay.includes(w));
      });
    }
    if (filters.instock && !filters.soon) list = list.filter(N.isBuyable);
    if (filters.soon && !filters.instock) list = list.filter(N.isSoon);
    if (filters.sale) list = list.filter(p => p.oldPrice || p.flags.includes("sale"));
    const min = Number(filters.min), max = Number(filters.max);
    if (filters.min !== "" && min > 0) list = list.filter(p => p.price >= min);
    if (filters.max !== "" && max > 0) list = list.filter(p => p.price <= max);
    const rank = p => (N.isSoon(p) ? 2 : (N.isBuyable(p) ? 0 : 1));
    const by = {
      "price-asc": (a, b) => a.price - b.price,
      "price-desc": (a, b) => b.price - a.price,
      name: (a, b) => a.name.localeCompare(b.name, "hu"),
      newest: (a, b) => b.id - a.id,
      featured: () => 0
    }[filters.sort] || (() => 0);
    return list.map((p, i) => ({ p, i })).sort((a, b) => rank(a.p) - rank(b.p) || by(a.p, b.p) || a.i - b.i).map(x => x.p);
  }

  const activeFilterCount = () => ["instock", "soon", "sale"].filter(k => filters[k]).length + (filters.min ? 1 : 0) + (filters.max ? 1 : 0);

  function renderList() {
    const all = N.products();
    const cats = categoriesWithCounts();
    const catBtn = (value, label, count) => `<button type="button" data-cat="${esc(value)}" aria-pressed="${filters.cat === value}">${esc(label)}<span>${count}</span></button>`;
    const cl = $("[data-cat-list]");
    if (cl) cl.innerHTML = catBtn("all", t("link.all"), all.length) + cats.map(c => catBtn(c.value, c.label, c.count)).join("");
    const chips = $("[data-chips]");
    if (chips) chips.innerHTML = `<button class="chip" type="button" data-cat="all" aria-pressed="${filters.cat === "all"}">Összes</button>` + cats.map(c => `<button class="chip" type="button" data-cat="${esc(c.value)}" aria-pressed="${filters.cat === c.value}">${esc(c.label)}</button>`).join("");

    $$("[data-f]").forEach(el => {
      const k = el.dataset.f;
      if (el.type === "checkbox") el.checked = !!filters[k]; else if (document.activeElement !== el) el.value = filters[k];
    });
    const sort = $("[data-sort]");
    if (sort) sort.value = filters.sort;
    const badge = $("[data-filter-badge]");
    const n = activeFilterCount();
    if (badge) badge.textContent = n ? ` (${n})` : "";

    const catLabel = filters.cat === "all" ? t("products.title") : N.categoryLabel(filters.cat);
    $("[data-list-title]").textContent = catLabel;
    $("[data-crumb-current]").textContent = catLabel;
    document.title = `${catLabel} – NS Card`;

    const list = filtered();
    const countEl = $("[data-count]");
    if (countEl) countEl.innerHTML = `${list.length} termék${filters.q ? ` erre: <strong>„${esc(filters.q)}”</strong> <button class="link-more" style="background:none;border:0;padding:0;margin-left:6px" type="button" data-clear-q>Keresés törlése</button>` : ""}`;
    const grid = $("[data-list]");
    if (grid) grid.innerHTML = list.length
      ? list.map(cardHTML).join("")
      : emptyHTML("Nincs a szűrésnek megfelelő termék", "Próbálj más kulcsszót, vagy töröld a szűrőket.", '<button class="btn btn-ghost" type="button" data-reset-filters>Szűrők törlése</button>');
  }

  function bindList() {
    readFilters();
    document.addEventListener("click", e => {
      const b = e.target.closest("button");
      if (!b) return;
      if (b.matches("[data-cat]")) {
        filters.cat = b.dataset.cat; writeFilters(); renderList(); revealScan();
        if (b.classList.contains("chip")) b.scrollIntoView({ inline: "center", block: "nearest", behavior: motionOK() ? "smooth" : "auto" });
      } else if (b.matches("[data-reset-filters]")) {
        Object.assign(filters, { q: "", instock: false, soon: false, sale: false, min: "", max: "" });
        $$("[data-q]").forEach(i => { i.value = ""; });
        writeFilters(); renderList(); revealScan();
      } else if (b.matches("[data-clear-q]")) { filters.q = ""; $$("[data-q]").forEach(i => { i.value = ""; }); writeFilters(); renderList(); revealScan(); }
      else if (b.matches("[data-open-filters]")) openFilters();
      else if (b.matches("[data-close-filters]")) closeFilters();
    });
    $$("[data-f]").forEach(el => el.addEventListener(el.type === "checkbox" ? "change" : "input", () => {
      const k = el.dataset.f;
      filters[k] = el.type === "checkbox" ? el.checked : el.value.replace(/[^\d]/g, "");
      writeFilters(); renderList(); revealScan();
    }));
    $("[data-sort]")?.addEventListener("change", e => { filters.sort = e.target.value; writeFilters(); renderList(); revealScan(); });
    const input = $("#q-desktop");
    input?.addEventListener("input", () => { filters.q = input.value.trim(); writeFilters(); renderList(); revealScan(); });
    input?.form?.addEventListener("submit", e => { e.preventDefault(); input.blur(); $("[data-list]")?.scrollIntoView({ behavior: motionOK() ? "smooth" : "auto", block: "start" }); });
  }

  /* ---------------- termékoldal ---------------- */
  let pdpQty = 1;
  let pdpImage = 0;
  let pdpId = 0;
  const currentSlideImg = () => $$("[data-track] img")[pdpImage] || $("[data-track] img");

  function renderProduct() {
    const id = Number(new URLSearchParams(location.search).get("id"));
    const p = N.byId(id);
    const box = $("[data-pdp]");
    if (!box) return;
    if (!p) {
      if (N.data && N.data.source !== "cache") {
        box.innerHTML = emptyHTML("Ez a termék nem található", "Lehet, hogy elfogyott vagy lekerült a kínálatból.", `<a class="btn btn-primary" href="/products">${esc(t("hero.cta"))}</a>`);
        $("[data-related-wrap]").hidden = true;
        $("[data-sticky-buy]").innerHTML = "";
      }
      return;
    }
    if (pdpId !== p.id) { pdpId = p.id; pdpImage = 0; pdpQty = 1; }
    document.title = `${p.name} – NS Card`;
    const md = $('meta[name="description"]');
    if (md) md.setAttribute("content", (p.description || `${p.name} – ${N.categoryLabel(p.category)} az NS Card webshopban. Ár: ${fmtFt(p.price)}.`).slice(0, 160));

    $("[data-crumbs]").innerHTML = `<li><a href="/">${esc(t("nav.home"))}</a></li><li><a href="/products?cat=${esc(p.category)}">${esc(N.categoryLabel(p.category))}</a></li><li aria-current="page">${esc(p.name)}</li>`;
    const st = N.stockInfo(p);
    const buyable = N.isBuyable(p);
    const inCart = cart.qtyOf(p.id);
    const maxQty = Math.max(0, p.stock - inCart);
    pdpQty = Math.min(Math.max(1, pdpQty), Math.max(1, maxQty));
    const imgs = p.images.length ? p.images : [""];
    pdpImage = Math.min(pdpImage, imgs.length - 1);
    const s = N.settings();
    const pays = payMethods(s);
    const multi = imgs.length > 1;

    box.innerHTML = `
      <div class="pdp">
        <div class="gallery">
          <div class="track" data-track tabindex="0" aria-label="Termékképek">${imgs.map((src, i) => `<div class="slide">${src ? `<img src="${esc(imageUrl(src))}" alt="${i === 0 ? esc(p.name) : `${esc(p.name)} – ${i + 1}. kép`}"${i ? ' loading="lazy"' : ""}>` : ""}</div>`).join("")}</div>
          ${multi ? `<div class="dots" aria-hidden="true">${imgs.map((_, i) => `<i${i === pdpImage ? ' class="on"' : ""}></i>`).join("")}</div>
          <div class="thumbs" role="group" aria-label="Képek">${imgs.map((src, i) => `<button type="button" data-thumb="${i}" aria-current="${i === pdpImage}" aria-label="${i + 1}. kép"><img src="${esc(imageUrl(src))}" alt=""></button>`).join("")}</div>` : ""}
        </div>
        <div class="pdp-info">
          <div class="pdp-meta"><span>${esc(N.categoryLabel(p.category))}</span>${p.set ? `<span>· ${esc(p.set)}</span>` : ""}<div class="tags">${tagsHTML(p)}</div></div>
          <h1 class="display">${esc(p.name)}</h1>
          ${p.line ? `<p class="muted" style="font-size:1.1rem">${esc(p.line)}</p>` : ""}
          <div class="pdp-price">${p.oldPrice ? `<s>${fmtFt(p.oldPrice)}</s>` : ""}<strong>${fmtFt(p.price)}</strong>${p.oldPrice ? `<span class="save">−${N.discount(p)}%</span>` : ""}</div>
          <span class="stock stock-${st.key}" style="font-size:1rem">${esc(st.label)}${inCart ? ` · ebből ${inCart} db már a kosaradban` : ""}</span>
          ${buyable ? `
            <div class="buy-row">
              <div class="stepper lg" role="group" aria-label="Mennyiség">
                <button type="button" data-pdp-qty="-1" aria-label="Eggyel kevesebb" ${pdpQty <= 1 ? "disabled" : ""}>−</button>
                <output aria-live="polite">${pdpQty}</output>
                <button type="button" data-pdp-qty="1" aria-label="Eggyel több" ${pdpQty >= maxQty ? "disabled" : ""}>+</button>
              </div>
              <button class="btn btn-primary" type="button" data-pdp-add ${maxQty <= 0 ? "disabled" : ""}>${ICON.cart}${maxQty <= 0 ? "A teljes készlet a kosaradban" : esc(t("pdp.add"))}</button>
            </div>` : `<div class="notice">${N.isSoon(p) ? "Ez a termék hamarosan érkezik, még nem rendelhető." : "Ez a termék jelenleg elfogyott."}${s.email ? ` Írj nekünk a <a href="mailto:${esc(s.email)}?subject=${encodeURIComponent(`Érdeklődés: ${p.name}`)}">${esc(s.email)}</a> címre, és szólunk, ha elérhető.` : ""}</div>`}
          <div class="perks">
            <div>${ICON.shield}<strong>${esc(t("perk.1"))}</strong><span>${esc(t("perk.1.text"))}</span></div>
            <div>${ICON.truck}<strong>${esc(t("perk.2"))}</strong><span>${esc(shipShortLabel())}${s.freeShippingFrom > 0 ? `, ${fmtFt(s.freeShippingFrom)} felett ingyenes` : ""}</span></div>
            <div>${ICON.lock}<strong>${esc(t("perk.3"))}</strong><span>${esc(cap(joinHu(pays)) || "Rendeléskor egyeztetjük")}</span></div>
          </div>
          <div>
            <h2 style="font-weight:800;font-size:1.05rem;margin-bottom:8px">${esc(t("pdp.desc"))}</h2>
            ${p.description ? `<p class="desc">${esc(p.description)}</p>` : `<p class="desc desc-empty">${esc(t("pdp.empty"))}</p>`}
          </div>
        </div>
      </div>`;

    const track = $("[data-track]");
    if (track && pdpImage) { track.style.scrollBehavior = "auto"; track.scrollLeft = pdpImage * track.clientWidth; track.style.scrollBehavior = ""; }

    const sticky = $("[data-sticky-buy]");
    if (sticky) {
      sticky.innerHTML = buyable && maxQty > 0
        ? `<div class="sb-price"><small>${esc(t("cart.title"))}: ${cart.count()} db</small><strong>${fmtFt(p.price)}</strong></div>
           <button class="icon-btn" type="button" data-open-cart aria-controls="cart" aria-label="Kosár megnyitása">${ICON.cart}<span class="cart-count" data-cart-count>0</span></button>
           <button class="btn btn-primary" type="button" data-pdp-add>${ICON.cart}${esc(t("card.add"))}</button>`
        : "";
      document.body.classList.toggle("has-sticky", !!sticky.innerHTML);
    }

    const rel = N.products().filter(x => x.id !== p.id && x.category === p.category);
    const fill = N.products().filter(x => x.id !== p.id && !rel.includes(x) && N.isBuyable(x));
    const related = rel.concat(fill).slice(0, 4);
    $("[data-related-wrap]").hidden = !related.length;
    $("[data-related]").innerHTML = related.map(cardHTML).join("");
    updateCount(false);
    window.dispatchEvent(new CustomEvent("nsc:pdp"));
  }

  function setSlide(i, smooth = true) {
    const track = $("[data-track]");
    if (!track) return;
    track.scrollTo({ left: i * track.clientWidth, behavior: smooth && motionOK() ? "smooth" : "auto" });
  }
  function syncSlide() {
    const track = $("[data-track]");
    if (!track) return;
    const i = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
    if (i === pdpImage) return;
    pdpImage = i;
    $$(".dots i").forEach((d, k) => d.classList.toggle("on", k === i));
    $$("[data-thumb]").forEach((b, k) => b.setAttribute("aria-current", String(k === i)));
  }

  function bindProduct() {
    document.addEventListener("click", e => {
      const b = e.target.closest("button");
      if (!b) return;
      const p = N.byId(Number(new URLSearchParams(location.search).get("id")));
      if (!p) return;
      if (b.matches("[data-thumb]")) setSlide(Number(b.dataset.thumb));
      else if (b.matches("[data-pdp-qty]")) { pdpQty += Number(b.dataset.pdpQty); renderProduct(); $(`[data-pdp-qty="${b.dataset.pdpQty}"]`)?.focus(); }
      else if (b.matches("[data-pdp-add]")) { const q = pdpQty; pdpQty = 1; addToCart(p.id, q, b); }
    });
    document.addEventListener("scroll", e => { if (e.target?.matches?.("[data-track]")) syncSlide(); }, { capture: true, passive: true });
    document.addEventListener("keydown", e => {
      if (!e.target.matches?.("[data-track]")) return;
      if (e.key === "ArrowRight") { e.preventDefault(); setSlide(pdpImage + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); setSlide(Math.max(0, pdpImage - 1)); }
    });
    const sticky = $("[data-sticky-buy]");
    if (sticky && "IntersectionObserver" in window) {
      const io = new IntersectionObserver(entries => {
        sticky.classList.toggle("show", !entries.some(en => en.isIntersecting));
      }, { threshold: 0 });
      window.addEventListener("nsc:pdp", () => { io.disconnect(); const btn = $(".buy-row [data-pdp-add]"); if (btn) io.observe(btn); else sticky.classList.remove("show"); });
    }
  }

  /* ---------------- pénztár ---------------- */
  const CO_FIELDS = ["name", "email", "phone", "zip", "city", "address", "locker", "note", "ship", "pay"];
  let coState = Object.assign({ ship: "home", pay: "" }, N.store.get(N.KEYS.checkout) || {});
  let coDone = null;
  let coError = "";
  let coBusy = false;
  let coSummaryOpen = false;

  function availablePays(s) {
    const list = [];
    if (s.payCard) list.push({ v: "card", t: "Bankkártyás fizetés", d: "Biztonságos online fizetés a Stripe oldalán." });
    if (s.payTransfer && s.email) list.push({ v: "transfer", t: "Banki átutalás", d: "Az utalási adatokat a visszaigazoló e-mailben küldjük." });
    if (s.payCod && s.email) list.push({ v: "cod", t: "Utánvét", d: s.codFee > 0 ? `Fizetés átvételkor. Utánvételi díj: ${fmtFt(s.codFee)}.` : "Fizetés a csomag átvételekor." });
    return list;
  }

  function totals(s) {
    const subtotal = cart.subtotal();
    const shipping = N.shippingFor(coState.ship, subtotal);
    const cod = coState.pay === "cod" && subtotal ? s.codFee : 0;
    return { subtotal, shipping, cod, total: subtotal + shipping + cod };
  }

  function summaryHTML(s) {
    const tt = totals(s);
    return `
      <aside class="panel summary${coSummaryOpen ? "" : " collapsed"}" aria-label="Rendelés összesítő">
        <button class="summary-toggle" type="button" data-summary-toggle aria-expanded="${coSummaryOpen}"><span>Összesítő · ${cart.count()} db ${coSummaryOpen ? "▴" : "▾"}</span><strong>${fmtFt(tt.total)}</strong></button>
        <h2>Összesítő</h2>
        <div class="summary-body">
          <div>${cart.lines().map(l => lineHTML(l, true)).join("")}</div>
          ${freeShipHTML(tt.subtotal)}
          <div class="sum-row"><span>Részösszeg</span><strong>${fmtFt(tt.subtotal)}</strong></div>
          <div class="sum-row"><span>Szállítás</span><strong>${tt.shipping ? fmtFt(tt.shipping) : "Ingyenes"}</strong></div>
          ${tt.cod ? `<div class="sum-row"><span>Utánvételi díj</span><strong>${fmtFt(tt.cod)}</strong></div>` : ""}
          <div class="sum-row total"><span>Fizetendő</span><strong>${fmtFt(tt.total)}</strong></div>
        </div>
      </aside>`;
  }

  function fieldHTML(id, label, attrs = "", cls = "") {
    const v = esc(coState[id] || "");
    const tag = id === "note"
      ? `<textarea class="textarea" id="co-${id}" name="${id}" ${attrs}>${v}</textarea>`
      : `<input class="input" id="co-${id}" name="${id}" value="${v}" ${attrs}>`;
    return `<div class="field${cls ? ` ${cls}` : ""}"><label for="co-${id}">${label}</label>${tag}<span class="err" data-err="${id}" hidden></span></div>`;
  }

  function renderCheckout() {
    const box = $("[data-checkout]");
    if (!box) return;
    const s = N.settings();
    if (coDone) { box.innerHTML = doneHTML(coDone, s); return; }
    const lines = cart.lines();
    if (!lines.length) {
      box.innerHTML = emptyHTML(t("cart.empty"), "Tegyél kosárba legalább egy terméket a rendeléshez.", `<a class="btn btn-primary" href="/products">${esc(t("hero.cta"))}</a>`);
      return;
    }
    const pays = availablePays(s);
    if (!pays.find(p => p.v === coState.pay)) coState.pay = pays[0]?.v || "";
    const ships = N.shippingMethods();
    if (!ships.find(m => m.value === coState.ship)) coState.ship = ships[0]?.value || "home";
    const tt = totals(s);
    const shipOpt = (v, title, desc, price) => `
      <label class="option"><input type="radio" name="ship" value="${v}" ${coState.ship === v ? "checked" : ""}>
        <span><strong>${esc(title)}</strong><small>${esc(desc)}</small></span><span class="opt-price">${!price || (v !== "pickup" && tt.subtotal && s.freeShippingFrom > 0 && tt.subtotal >= s.freeShippingFrom) ? "Ingyenes" : fmtFt(price)}</span></label>`;
    const focusId = document.activeElement?.id;

    box.innerHTML = `
      <div class="checkout">
        <form class="panel" data-co-form novalidate>
          <section class="co-section" aria-labelledby="co-h1">
            <h2 id="co-h1"><b>1</b>Elérhetőség</h2>
            <div class="form-grid">
              ${fieldHTML("name", "Teljes név", 'autocomplete="name" required', "full")}
              ${fieldHTML("email", "E-mail cím", 'type="email" autocomplete="email" inputmode="email" autocapitalize="off" required')}
              ${fieldHTML("phone", "Telefonszám", 'type="tel" autocomplete="tel" inputmode="tel" placeholder="+36 30 123 4567" required')}
            </div>
          </section>
          <section class="co-section" aria-labelledby="co-h2">
            <h2 id="co-h2"><b>2</b>Szállítás</h2>
            <div class="options" role="radiogroup" aria-label="Szállítási mód">
              ${ships.map(m => shipOpt(m.value, m.label, m.desc, m.price)).join("")}
            </div>
            <div class="form-grid">
              ${coState.ship === "pickup" ? "" : coState.ship === "locker"
                ? fieldHTML("locker", "Csomagautomata neve és címe", 'placeholder="Pl. Foxpost – Budapest, Váci út 1." required', "full")
                : `${fieldHTML("zip", "Irányítószám", 'autocomplete="postal-code" inputmode="numeric" maxlength="4" required', "zip")}
                   ${fieldHTML("city", "Település", 'autocomplete="address-level2" required')}
                   ${fieldHTML("address", "Utca, házszám, emelet, ajtó", 'autocomplete="street-address" required', "full")}`}
            </div>
          </section>
          <section class="co-section" aria-labelledby="co-h3">
            <h2 id="co-h3"><b>3</b>Fizetés</h2>
            ${pays.length ? `<div class="options" role="radiogroup" aria-label="Fizetési mód">${pays.map(p => `
              <label class="option"><input type="radio" name="pay" value="${p.v}" ${coState.pay === p.v ? "checked" : ""}>
                <span><strong>${p.t}</strong><small>${p.d}</small></span><span></span></label>`).join("")}</div>`
              : `<div class="notice error">Az online rendelés még nincs beállítva. Kérjük, vedd fel velünk a kapcsolatot.</div>`}
            <div class="form-grid">${fieldHTML("note", "Megjegyzés a rendeléshez (nem kötelező)", 'rows="3"', "full")}</div>
          </section>
          ${coError ? `<div class="notice error" role="alert" style="margin-bottom:16px">${coError}</div>` : ""}
          <div class="co-submit">
            <button class="btn btn-primary btn-block" type="submit" style="--h:56px;font-size:1.05rem" ${!pays.length || coBusy ? "disabled" : ""}>
              ${coBusy ? "Folyamatban…" : `${esc(coState.pay === "card" ? t("checkout.pay") : t("checkout.submit"))} · ${fmtFt(tt.total)}`}
            </button>
          </div>
          <p class="muted" style="font-size:.86rem;margin-top:12px">${coState.pay === "card" ? "A gomb a Stripe biztonságos fizetési oldalára visz." : "A gomb megnyitja a levelezőprogramodat a kitöltött rendeléssel – a levél elküldésével adod le a rendelést."}</p>
        </form>
        ${summaryHTML(s)}
      </div>`;
    if (focusId && document.getElementById(focusId)) {
      const el = document.getElementById(focusId);
      el.focus({ preventScroll: true });
      if (el.setSelectionRange && el.type !== "email" && el.type !== "radio") { const n = el.value.length; try { el.setSelectionRange(n, n); } catch {} }
    }
  }

  function saveCo() { N.store.set(N.KEYS.checkout, Object.fromEntries(CO_FIELDS.map(k => [k, coState[k] || ""]))); }

  function validateCo() {
    const errs = {};
    const need = (k, msg) => { if (!String(coState[k] || "").trim()) errs[k] = msg; };
    need("name", "Add meg a neved.");
    need("email", "Add meg az e-mail címed.");
    if (coState.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(coState.email)) errs.email = "Ez nem tűnik érvényes e-mail címnek.";
    need("phone", "Add meg a telefonszámod.");
    if (coState.phone && String(coState.phone).replace(/\D/g, "").length < 8) errs.phone = "Ellenőrizd a telefonszámot.";
    if (coState.ship === "locker") need("locker", "Add meg a csomagautomatát.");
    else if (coState.ship !== "pickup") {
      need("zip", "Add meg az irányítószámot.");
      if (coState.zip && !/^\d{4}$/.test(String(coState.zip).trim())) errs.zip = "4 számjegy.";
      need("city", "Add meg a települést.");
      need("address", "Add meg a címet.");
    }
    $$("[data-err]").forEach(el => { const k = el.dataset.err; el.hidden = !errs[k]; el.textContent = errs[k] || ""; $(`#co-${k}`)?.setAttribute("aria-invalid", String(!!errs[k])); });
    const first = Object.keys(errs)[0];
    if (first) $(`#co-${first}`)?.focus();
    return !first;
  }

  function orderNumber() {
    const d = new Date();
    const pad = n => String(n).padStart(2, "0");
    return `NSC-${String(d.getFullYear()).slice(2)}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  function orderText(o) {
    const L = [];
    L.push(`Rendelésszám: ${o.id}`, "");
    L.push("Termékek:");
    o.lines.forEach(l => L.push(`- ${l.name} (#${l.id}) – ${l.qty} db × ${fmtFt(l.price)} = ${fmtFt(l.qty * l.price)}`));
    L.push("", `Részösszeg: ${fmtFt(o.subtotal)}`, `Szállítás (${o.shipLabel}): ${o.shipping ? fmtFt(o.shipping) : "ingyenes"}`);
    if (o.cod) L.push(`Utánvételi díj: ${fmtFt(o.cod)}`);
    L.push(`Fizetendő: ${fmtFt(o.total)}`, `Fizetési mód: ${o.payLabel}`, "");
    L.push("Vásárló:", o.c.name, o.c.email, o.c.phone);
    if (o.ship === "pickup") L.push("Személyes átvétel");
    else if (o.c.locker) L.push(`Csomagautomata: ${o.c.locker}`); else L.push(`${o.c.zip} ${o.c.city}, ${o.c.address}`);
    if (o.c.note) L.push("", `Megjegyzés: ${o.c.note}`);
    return L.join("\n");
  }

  const mailtoFor = (o, s) => `mailto:${encodeURIComponent(s.email)}?subject=${encodeURIComponent(`Rendelés ${o.id}`)}&body=${encodeURIComponent(orderText(o))}`;

  function doneHTML(o, s) {
    return `
      <div class="done panel">
        <p class="muted">Rendelésszám</p>
        <p class="order-id">${esc(o.id)}</p>
        <h2 class="display" style="font-size:1.6rem">Már csak egy lépés: küldd el a levelet</h2>
        <p class="muted">Megnyitottuk a levelezőprogramodat a kitöltött rendeléssel, címzett: <strong>${esc(s.email)}</strong>. A levél elküldése után e-mailben visszaigazoljuk a rendelést${o.pay === "transfer" ? " és elküldjük az utalási adatokat" : ""}.</p>
        <div class="notice"><strong>Nem nyílt meg a levelező?</strong> Nyisd meg újra, vagy másold ki a rendelést, és küldd el a fenti címre.</div>
        <div class="hero-actions" style="margin:0">
          <a class="btn btn-primary" href="${esc(mailtoFor(o, s))}">Levél megnyitása újra</a>
          <button class="btn btn-ghost" type="button" data-copy-order>Rendelés másolása</button>
        </div>
        <details><summary class="muted" style="cursor:pointer">A rendelés részletei</summary><pre style="white-space:pre-wrap;font-family:var(--body);color:var(--muted);margin-top:12px">${esc(orderText(o))}</pre></details>
        <a class="link-more" href="/products">Vissza a termékekhez</a>
      </div>`;
  }

  async function submitCheckout() {
    const s = N.settings();
    coError = "";
    if (!validateCo()) return;
    const tt = totals(s);
    const lines = cart.lines();
    const c = Object.fromEntries(CO_FIELDS.map(k => [k, String(coState[k] || "").trim()]));
    if (coState.ship === "locker") { c.zip = c.city = c.address = ""; }
    else if (coState.ship === "pickup") { c.zip = c.city = c.address = c.locker = ""; }
    else c.locker = "";

    if (coState.pay === "card") {
      coBusy = true; renderCheckout();
      try {
        const res = await fetch("/api/create-checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ items: lines.map(l => ({ id: l.product.id, qty: l.qty })), customer: c, shipping: coState.ship })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.url) throw new Error(data.error || "");
        location.href = data.url;
        return;
      } catch (err) {
        coError = esc(err.message || "") || "A kártyás fizetés most nem érhető el. Válassz másik fizetési módot, vagy próbáld újra később.";
        coBusy = false; renderCheckout();
        return;
      }
    }

    const order = {
      id: orderNumber(),
      createdAt: new Date().toISOString(),
      lines: lines.map(l => ({ id: l.product.id, name: l.product.name, qty: l.qty, price: l.product.price })),
      subtotal: tt.subtotal, shipping: tt.shipping, cod: tt.cod, total: tt.total,
      ship: coState.ship, shipLabel: (N.shippingMethods().find(m => m.value === coState.ship)?.label || "szállítás").toLowerCase(),
      pay: coState.pay, payLabel: coState.pay === "cod" ? "utánvét" : "banki átutalás",
      c
    };
    N.store.set(N.KEYS.lastOrder, order);
    coDone = order;
    cart.clear();
    renderCheckout();
    window.scrollTo({ top: 0, behavior: motionOK() ? "smooth" : "auto" });
    location.href = mailtoFor(order, s);
  }

  function bindCheckout() {
    const box = $("[data-checkout]");
    if (!box) return;
    box.addEventListener("input", e => {
      const el = e.target;
      if (!el.name || !CO_FIELDS.includes(el.name)) return;
      coState[el.name] = el.value;
      saveCo();
      if (el.type === "radio") { coError = ""; renderCheckout(); }
      else if (el.getAttribute("aria-invalid") === "true") { el.setAttribute("aria-invalid", "false"); const er = $(`[data-err="${el.name}"]`); if (er) er.hidden = true; }
    });
    box.addEventListener("submit", e => { e.preventDefault(); if (!coBusy) submitCheckout(); });
    box.addEventListener("click", async e => {
      if (e.target.closest("[data-summary-toggle]")) { coSummaryOpen = !coSummaryOpen; renderCheckout(); return; }
      if (e.target.closest("[data-copy-order]") && coDone) {
        try { await navigator.clipboard.writeText(orderText(coDone)); toast("A rendelés a vágólapra került."); }
        catch { toast("A másolás nem sikerült – jelöld ki a szöveget a részleteknél."); }
      }
    });
  }

  /* ---------------- Stripe visszatérés ---------------- */
  async function renderSuccess() {
    const el = $("[data-pay-status]");
    if (!el) return;
    const sid = new URLSearchParams(location.search).get("session_id");
    if (!sid) { el.textContent = "Hiányzik a fizetés azonosítója. Ha fizettél, a visszaigazolást e-mailben küldjük."; return; }
    try {
      const res = await fetch(`/api/checkout-session?session_id=${encodeURIComponent(sid)}`, { headers: { Accept: "application/json" } });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "");
      if (d.payment_status === "paid" || d.status === "complete") {
        cart.clear(); updateCount(false);
        el.className = "notice success";
        el.innerHTML = `<strong>Sikeres fizetés.</strong> Köszönjük${d.customer_name ? `, ${esc(d.customer_name)}` : ""}! A ${fmtFt(d.amount_total)} összegű rendelésről e-mailben küldünk visszaigazolást.`;
      } else {
        el.textContent = `A fizetés még feldolgozás alatt áll (${d.payment_status || d.status}).`;
      }
    } catch {
      el.className = "notice error";
      el.textContent = "A fizetés állapotát most nem sikerült lekérdezni. Ha a kártyádat megterheltük, a visszaigazolást e-mailben küldjük.";
    }
  }

  /* ---------------- indulás ---------------- */
  function renderPage() {
    const s = N.settings();
    N.applyTheme(s.theme, undefined, !N.previewMode);
    cart.prune();
    applyTexts();
    renderChrome();
    if (page === "home") renderHome();
    else if (page === "products") renderList();
    else if (page === "product") renderProduct();
    else if (page === "checkout") renderCheckout();
    if (openDrawerEl?.matches("[data-cart]")) renderCart();
    if (searchOpen) renderSheet();
    updateCount(false);
    revealScan();
  }

  bindChrome();
  bindTilt();
  if (page === "home") bindHome();
  if (page === "products") bindList();
  if (page === "product") bindProduct();
  if (page === "checkout") bindCheckout();
  if (page === "success") renderSuccess();

  /* Admin élő előnézet: a szülő (admin) ablak küldi a még nem publikált beállításokat */
  if (window.parent !== window) {
    window.addEventListener("message", e => {
      if (e.origin !== location.origin) return;
      const d = e.data || {};
      if (d.type === "nsc:preview") N.setPreview(d.settings, d.products);
      if (d.type === "nsc:preview-scroll" && d.target) $(d.target)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    try { window.parent.postMessage({ type: "nsc:preview-ready", page }, location.origin); } catch {}
  }

  window.addEventListener("nsc:catalog", renderPage);
  if (N.data) renderPage();
  N.ready.then(() => { if (!N.data?.products?.length) renderPage(); });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && !N.previewMode && Date.now() - (window.__nscLoadedAt || 0) > 5 * 60 * 1000) {
      window.__nscLoadedAt = Date.now();
      N.load();
    }
  });
  window.__nscLoadedAt = Date.now();
})();
