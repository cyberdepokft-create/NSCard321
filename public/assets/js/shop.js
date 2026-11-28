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

  ICON.heart = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 20s-7.5-4.6-9.2-9.4C1.6 7.2 3.8 4 7.2 4c2 0 3.6 1.1 4.8 2.8C13.2 5.1 14.8 4 16.8 4c3.4 0 5.6 3.2 4.4 6.6C19.5 15.4 12 20 12 20Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
  ICON.share = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="18" cy="5.5" r="2.5" stroke="currentColor" stroke-width="2"/><circle cx="6" cy="12" r="2.5" stroke="currentColor" stroke-width="2"/><circle cx="18" cy="18.5" r="2.5" stroke="currentColor" stroke-width="2"/><path d="m8.2 10.8 7.6-4.1M8.2 13.2l7.6 4.1" stroke="currentColor" stroke-width="2"/></svg>';
  ICON.zoom = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/><path d="m20 20-3.5-3.5M11 8v6M8 11h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  ICON.left = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m15 6-6 6 6 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  ICON.right = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m9 6 6 6-6 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  ICON.cal = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2.5" stroke="currentColor" stroke-width="2"/><path d="M3.5 10h17M8 3v4M16 3v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  ICON.pin = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 21s-6.5-6.2-6.5-11.2A6.5 6.5 0 0 1 12 3.3a6.5 6.5 0 0 1 6.5 6.5C18.5 14.8 12 21 12 21Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="10" r="2.4" stroke="currentColor" stroke-width="2"/></svg>';
  ICON.search = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/><path d="m20 20-3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  ICON.gift = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3.5" y="8" width="17" height="4" rx="1" stroke="currentColor" stroke-width="2"/><path d="M5 12v8h14v-8M12 8v12M12 8S10.5 4 8 4.5 7 8 12 8Zm0 0s1.5-4 4-3.5S17 8 12 8Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
  ICON.bell = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Zm4 4a2 2 0 0 0 4 0" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>';
  const SITE = "https://www.nscard.hu";

  const productUrl = p => `/product?id=${p.id}`;
  const favBtn = (p, cls = "fav") => `<button class="${cls}" type="button" data-fav="${p.id}" aria-pressed="${N.favorites.has(p.id)}" aria-label="${esc(t("fav.add"))}: ${esc(p.name)}">${ICON.heart}${cls === "fav" ? "" : `<span data-fav-label>${esc(N.favorites.has(p.id) ? t("fav.added") : t("fav.add"))}</span>`}</button>`;
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
  /* gyakori rövidítések és magyar/angol változatok: „etb” = Elite Trainer Box, „bb” = booster box (display)… */
  const SYN = [["etb", "elite trainer"], ["bb", "booster box", "display"], ["booster box", "display"], ["doboz", "box", "tin"], ["fem doboz", "tin"], ["csomag", "booster", "pack"],
    ["kollekcio", "collection"], ["promo", "promó"], ["single", "kartya", "card"], ["kartya", "card", "single"], ["elorendeles", "preorder"], ["mega", "mega evolution"], ["sv", "scarlet", "violet"]];
  const synOf = w => { const out = new Set([w]); SYN.forEach(g => { if (g.some(x => x === w)) g.forEach(x => out.add(norm(x))); }); return [...out]; };
  function searchHay(p) { return norm([p.name, p.set, p.line, p.badge, p.cardNo, p.rarity, p.grade, N.categoryLabel(p.category), N.isPreorder(p) ? "elorendeles preorder" : ""].join(" ")); }
  function matchWords(hay, words) { return words.every(w => synOf(w).some(x => hay.includes(x))); }
  function searchProducts(q, limit = 8) {
    const words = norm(q).split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    const rank = p => (N.isBuyable(p) ? 0 : N.isSoon(p) ? 1 : 2);
    return N.products()
      .filter(p => matchWords(searchHay(p), words))
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
        cats.innerHTML = (list.length ? `<h2>${esc(t("search.popular"))}</h2><div class="sheet-cats">${list.map(c => `<a href="/products?cat=${esc(c.value)}" style="--c:${esc(c.color)}">${catThumb(c) ? `<img src="${esc(catThumb(c))}" alt="" loading="lazy">` : ""}<span><b>${esc(c.label)}</b><small>${c.count} termék</small></span></a>`).join("")}</div>` : "")
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
    if (N.isPreorder(p)) tg.push(`<span class="tag tag-pre">${esc(t("pre.label"))}</span>`);
    if (p.grade) tg.push(`<span class="tag tag-grade">${esc(p.grade)}</span>`);
    if (p.oldPrice) tg.push(`<span class="tag tag-sale">−${N.discount(p)}%</span>`);
    else if (p.flags.includes("sale")) tg.push(`<span class="tag tag-sale">${esc(t("tag.sale"))}</span>`);
    if (p.flags.includes("new")) tg.push(`<span class="tag tag-new">${esc(t("tag.new"))}</span>`);
    if (p.flags.includes("rare")) tg.push(`<span class="tag tag-rare">${esc(t("tag.rare"))}</span>`);
    if (p.badge) tg.push(`<span class="tag">${esc(p.badge)}</span>`);
    return tg.slice(0, 3).join("");
  }
  const starsHTML = (avg, cls = "stars") => `<span class="${cls}" style="--r:${Math.max(0, Math.min(5, avg)) / 5 * 100}%" aria-hidden="true"></span>`;
  function ratingLine(p) {
    const r = N.rating(p.id);
    return r ? `<span class="rating" title="${r.avg.toLocaleString("hu-HU")} / 5 (${r.count} vélemény)">${starsHTML(r.avg)}<small>${r.count}</small><span class="sr-only">${r.avg.toLocaleString("hu-HU")} csillag, ${r.count} vélemény</span></span>` : "";
  }
  const condLabel = v => (N.CONDITIONS.find(c => c.value === v) || {}).short || "";
  const langLabel = v => (N.LANGS.find(l => l.value === v) || {}).label || "";
  function singleMeta(p) {
    const bits = [p.condition ? `<b>${esc(condLabel(p.condition))}</b>` : "", p.lang ? esc(langLabel(p.lang)) : "", p.cardNo ? `#${esc(p.cardNo)}` : "", p.rarity ? esc(p.rarity) : ""].filter(Boolean);
    return bits.length ? `<span class="single-meta">${bits.join('<i aria-hidden="true"></i>')}</span>` : "";
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
          ${favBtn(p)}
          ${img ? `<img${p.images[1] ? ' class="img-1"' : ""} src="${esc(img)}" alt="" loading="lazy" decoding="async">` : ""}
          ${p.images[1] ? `<img class="img-2" src="${esc(imageUrl(p.images[1]))}" alt="" loading="lazy" decoding="async">` : ""}
        </div>
        <div class="pcard-body">
          <h3><a href="${productUrl(p)}">${esc(p.name)}</a></h3>
          ${singleMeta(p)}${ratingLine(p)}
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
            <button type="button" data-qty="${p.id}" data-d="1" aria-label="Eggyel több" ${l.qty >= N.maxQty(p) ? "disabled" : ""}>+</button>
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
    const inCart = new Set(lines.map(l => l.product.id));
    const cartCats = new Set(lines.map(l => l.product.category));
    const reco = N.products().filter(p => N.isBuyable(p) && !inCart.has(p.id))
      .sort((a, b) => (cartCats.has(b.category) - cartCats.has(a.category)) || (b.flags.includes("popular") - a.flags.includes("popular")) || (a.price - b.price)).slice(0, 3);
    body.innerHTML = lines.map(l => lineHTML(l)).join("") + (reco.length ? `<div class="cart-reco"><h3>Ehhez jól jöhet még</h3>${reco.map(p => `<div class="rc"><img src="${esc(imageUrl(p.images[0]))}" alt="" loading="lazy"><span><a href="${productUrl(p)}">${esc(p.name)}</a><small>${fmtFt(p.price)}</small></span><button class="btn btn-ghost" type="button" data-add="${p.id}" aria-label="${esc(t("card.add"))}: ${esc(p.name)}">${ICON.plus}</button></div>`).join("")}</div>` : "");
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
      if (openDrawerEl?.matches("[data-cart]")) toast(`${t("added.title")}: ${p?.name || ""}`);
      else showAdded(p, qty);
    } else if (res.reason === "max") {
      toast(p?.maxPerOrder > 0 && p.maxPerOrder < p.stock ? `Ebből a termékből rendelésenként legfeljebb ${p.maxPerOrder} db vásárolható.` : `Ebből a termékből most ${p?.stock} db rendelhető, és mind a kosaradban van.`);
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
    return N.CATEGORIES.map(c => {
      const items = list.filter(p => p.category === c.value);
      const buy = items.filter(N.isBuyable);
      const imgs = items.filter(p => p.images[0]).sort((a, b) => (N.isBuyable(b) - N.isBuyable(a)) || (b.price - a.price)).map(p => imageUrl(p.images[0]));
      const meta = N.categoryMeta(c.value);
      const fresh = items.filter(p => p.flags.includes("new")).length;
      const sale = items.filter(p => p.oldPrice || p.flags.includes("sale")).length;
      return { ...c, color: meta.color, fresh, sale, count: items.length, inStock: buy.length, from: buy.length ? Math.min(...buy.map(p => p.price)) : 0, cover: c.image ? imageUrl(c.image) : "", imgs: [...new Set(imgs)] };
    }).filter(c => c.count > 0);
  }
  const catThumb = c => c.cover || c.imgs[0] || "";

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

  function faqItems(s) {
    if (s.faq?.length) return s.faq;
    const items = [{ q: "Mennyi a szállítási díj, és mikor kapom meg?", a: `${shipText(s)}${s.deliveryText ? ` A kézbesítés általában ${s.deliveryText}.` : ""}` }];
    const pays = payMethods(s);
    if (pays.length) items.push({ q: "Hogyan fizethetek?", a: `${cap(joinHu(pays))}. A rendelésről e-mailben küldünk visszaigazolást.` });
    items.push({ q: "Kell regisztrálnom a vásárláshoz?", a: "Nem. A kosár a böngésződben megmarad, a pénztárban csak a szállításhoz szükséges adatokat kérjük." });
    if (s.pages?.aszf || s.pages?.szallitas) items.push({ q: "Visszaküldhetem a terméket?", a: "Igen, az átvételtől számított 14 napon belül indoklás nélkül elállhatsz a vásárlástól. A részleteket a vásárlási feltételekben találod." });
    if (s.email) items.push({ q: "Nem találom, amit keresek. Mit tegyek?", a: `Írj nekünk a ${s.email} címre, és utánanézünk, be tudjuk-e szerezni.` });
    return items;
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
    const favN = N.favorites.list().filter(id => N.byId(id)).length;
    const menuCats = $("[data-menu-cats]");
    if (menuCats) menuCats.innerHTML = (favN ? `<a href="/products?fav=1"><span>${esc(t("fav.title"))}</span><span>${favN}</span></a>` : "") + (cats.length ? `<p>${esc(t("cats.title"))}</p>${cats.map(c => `<a href="/products?cat=${esc(c.value)}" style="--c:${esc(c.color)}">${catThumb(c) ? `<img src="${esc(catThumb(c))}" alt="" loading="lazy">` : ""}<span class="mc-name">${esc(c.label)}</span><span>${c.count}</span></a>`).join("")}` : "") + (installEvt ? `<button class="btn btn-ghost btn-block" type="button" data-install style="margin-top:14px">Telepítés a kezdőképernyőre</button>` : "");
    const mega = $("[data-mega-body]");
    if (mega) {
      const all = N.products();
      const saleN = all.filter(p => p.oldPrice || p.flags.includes("sale")).length;
      const newN = all.filter(p => p.flags.includes("new")).length;
      const soonN = all.filter(N.isSoon).length;
      mega.innerHTML = `<div class="mega-cats">${cats.map(c => `<a href="/products?cat=${esc(c.value)}" style="--c:${esc(c.color)}">${catThumb(c) ? `<img src="${esc(catThumb(c))}" alt="" loading="lazy">` : "<span></span>"}<span><b>${esc(c.label)}</b><small>${c.count} termék${c.from ? ` · ${fmtFt(c.from)}-tól` : ""}</small></span></a>`).join("")}</div>
        <div class="mega-side"><h3>Gyors szűrők</h3>
          <a href="/products">${esc(t("link.all"))}<span>${all.length}</span></a>
          ${newN ? `<a href="/products?sort=newest">Újdonságok<span>${newN}</span></a>` : ""}
          ${saleN ? `<a href="/products?sale=1">Akciós termékek<span>${saleN}</span></a>` : ""}
          ${soonN ? `<a href="/products?soon=1">Hamarosan érkezik<span>${soonN}</span></a>` : ""}
          ${favN ? `<a href="/products?fav=1">${esc(t("fav.title"))}<span>${favN}</span></a>` : ""}
        </div>`;
    }
    const footCats = $("[data-foot-cats]");
    if (footCats) footCats.innerHTML = `<li><a href="/products">${esc(t("link.all"))}</a></li>` + cats.map(c => `<li><a href="/products?cat=${esc(c.value)}">${esc(c.label)}</a></li>`).join("");
    const pages = s.pages || {};
    const hasCompany = !!(s.companyName || s.email || s.phone);
    const help = $("[data-foot-help]");
    if (help) help.innerHTML = [
      sectionOn("steps") ? `<li><a href="/#rendeles">${esc(t("nav.ship"))}</a></li>` : "",
      pages.szallitas ? `<li><a href="/info?p=szallitas">${esc(N.INFO_PAGES[2].short)}</a></li>` : "",
      pages.rolunk ? `<li><a href="/info?p=rolunk">${esc(N.INFO_PAGES[3].short)}</a></li>` : "",
      (s.posts || []).some(x => x.published) ? `<li><a href="/blog">Cikkek és útmutatók</a></li>` : "",
      `<li><a href="/checkout">${esc(t("checkout.title"))}</a></li>`,
      N.live.features?.db ? `<li><a href="/rendeles">Rendelés követése</a></li>` : "",
      (s.email || s.phone) && sectionOn("contact") ? `<li><a href="/#kapcsolat">${esc(t("nav.contact"))}</a></li>` : ""
    ].join("");
    const legal = $("[data-foot-legal]");
    if (legal) legal.innerHTML = [
      pages.aszf ? `<a href="/info?p=aszf">ÁSZF</a>` : "",
      pages.adatkezeles ? `<a href="/info?p=adatkezeles">Adatkezelés</a>` : "",
      hasCompany ? `<a href="/info?p=impresszum">${esc(t("info.impresszum"))}</a>` : ""
    ].join("");
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
    const fn = $("[data-foot-news]");
    if (fn) {
      const on = !!N.live.features?.db;
      if (on && !fn.dataset.ready) { fn.dataset.ready = "1"; fn.innerHTML = `<p>${esc(t("news.title"))}</p>${newsFormHTML("footer", true)}`; }
      fn.hidden = !on;
    }
    const ml = $("[data-menu-extra]");
    if (ml) ml.innerHTML = (s.posts || []).some(x => x.published) ? `<a href="/blog">Cikkek és útmutatók</a>` : "";
    $$("[data-contact-nav]").forEach(a => { a.hidden = (!s.email && !s.phone) || !sectionOn("contact"); });
    $$('a[href="/#rendeles"]').forEach(a => { a.hidden = !sectionOn("steps"); });
    $$("[data-year]").forEach(el => { el.textContent = new Date().getFullYear(); });
  }

  function bindMega() {
    const mega = $("[data-mega]");
    const header = $(".site-header");
    if (!mega || !header) return;
    let t1 = 0;
    const desktop = () => !mobileMQ.matches;
    const show = () => { if (!desktop()) return; clearTimeout(t1); mega.hidden = false; $$("[data-mega-trigger]").forEach(a => a.setAttribute("aria-expanded", "true")); };
    const hide = (delay = 160) => { clearTimeout(t1); t1 = setTimeout(() => { mega.hidden = true; $$("[data-mega-trigger]").forEach(a => a.setAttribute("aria-expanded", "false")); }, delay); };
    $$(".nav [data-mega-trigger]").forEach(a => {
      a.addEventListener("mouseenter", () => { clearTimeout(t1); t1 = setTimeout(show, 90); });
      a.addEventListener("focus", show);
      a.addEventListener("keydown", e => { if (e.key === "ArrowDown") { e.preventDefault(); show(); $("a", mega)?.focus(); } });
    });
    $$(".nav a:not([data-mega-trigger]), .search, .hdr-actions").forEach(el => el.addEventListener("mouseenter", () => hide(60)));
    header.addEventListener("mouseleave", () => hide());
    mega.addEventListener("mouseenter", () => clearTimeout(t1));
    mega.addEventListener("focusout", e => { if (!mega.contains(e.relatedTarget) && !e.relatedTarget?.matches?.("[data-mega-trigger]")) hide(0); });
    document.addEventListener("keydown", e => { if (e.key === "Escape" && !mega.hidden) { hide(0); $(".nav [data-mega-trigger]")?.focus(); } });
    mega.addEventListener("click", e => { if (e.target.closest("a")) hide(0); });
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
      else if (el.matches("[data-to-top]")) window.scrollTo({ top: 0, behavior: motionOK() ? "smooth" : "auto" });
      else if (el.matches("[data-view]")) {
        N.store.set(VIEW_KEY, el.dataset.view);
        applyViewPref();
        $$("[data-view]").forEach(b => b.setAttribute("aria-pressed", String(b === el)));
      } else if (el.matches("[data-install]") && installEvt) {
        installEvt.prompt();
        installEvt.userChoice.finally(() => { installEvt = null; renderChrome(); });
      }
      else if (el.matches("[data-add]")) addToCart(Number(el.dataset.add), 1, el);
      else if (el.matches("[data-fav]")) {
        e.preventDefault();
        const on = N.favorites.toggle(el.dataset.fav);
        if (motionOK()) { el.classList.remove("pop"); void el.offsetWidth; el.classList.add("pop"); }
        if (on) toast(`${t("fav.title")}: ${N.byId(el.dataset.fav)?.name || ""}`);
      }
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

    window.addEventListener("nsc:fav", () => {
      $$("[data-fav]").forEach(b => {
        const on = N.favorites.has(b.dataset.fav);
        b.setAttribute("aria-pressed", String(on));
        const l = $("[data-fav-label]", b);
        if (l) l.textContent = on ? t("fav.added") : t("fav.add");
      });
      renderChrome();
      if (page === "products" && filters.fav) { renderList(); revealScan(); }
      if (page === "products") renderChips();
    });
    window.addEventListener("storage", e => { if (e.key === N.KEYS.fav) window.dispatchEvent(new CustomEvent("nsc:fav")); });
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
    const grid = $("[data-cat-grid]");
    if (grid) {
      // elrendezés: az első kategória a nagy csempe, a többi hézag nélkül tölti ki a rácsot (asztalon 4, mobilon 2 oszlop)
      const n = cats.length;
      const layout = cats.map(() => []);
      if (n === 1) layout[0].push("d-w4", "m-w2");
      else if (n === 2) layout.forEach(l => l.push("d-w2", "d-h2"));
      else {
        layout[0].push("big");
        const k = Math.min(n - 1, 4);
        const right = layout.slice(1, 1 + k);
        if (k === 1) right[0].push("d-w2", "d-h2");
        if (k === 2) right.forEach(l => l.push("d-w2"));
        if (k === 3) right[2].push("d-w2");
        const rest = layout.slice(1 + k), r = rest.length % 4;
        const tail = rest.slice(rest.length - r);
        if (r === 1) tail[0].push("d-w4");
        if (r === 2) tail.forEach(l => l.push("d-w2"));
        if (r === 3) tail[0].push("d-w2");
      }
      if (n > 1 && (n - 1) % 2 === 1) layout[n - 1].push("m-w2");
      grid.innerHTML = cats.map((c, i) => {
        const art = c.cover ? `<span class="cat-art cover"><img src="${esc(c.cover)}" alt="" loading="lazy"></span>`
          : `<span class="cat-art">${c.imgs.slice(0, 3).map(src => `<img src="${esc(src)}" alt="" loading="lazy">`).join("")}</span>`;
        const cls = layout[i].join(" ");
        return `<a class="cat-card ${cls}" href="/products?cat=${esc(c.value)}" style="--c:${esc(c.color)}">
          ${art}<span class="cat-go">${ICON.arrow}</span>
          <strong>${esc(c.label)}</strong>
          <small>${c.count} termék${c.from ? ` · <b>${fmtFt(c.from)}</b>-tól` : ""}</small>
          ${c.desc ? `<em>${esc(c.desc)}</em>` : ""}
          ${c.fresh || c.sale ? `<span class="cat-badges">${c.fresh ? `<span class="b-new">${c.fresh} új</span>` : ""}${c.sale ? `<span class="b-sale">${c.sale} akciós</span>` : ""}</span>` : ""}
        </a>`;
      }).join("");
    }
    showSection("categories", cats.length > 0);

    const rh = $("[data-recent-home]");
    if (rh) {
      const rec = N.recent.list().map(id => N.byId(id)).filter(Boolean).slice(0, 8);
      rh.innerHTML = rec.map(p => `<a href="${productUrl(p)}"><img src="${esc(imageUrl(p.images[0]))}" alt="" loading="lazy"><span><strong>${esc(p.name)}</strong><span class="rr-price">${fmtFt(p.price)}</span></span></a>`).join("");
      showSection("recent", rec.length > 0);
    }

    const fq = $("[data-faq]");
    if (fq) {
      const items = faqItems(s);
      fq.innerHTML = items.map((x, i) => `<details${i === 0 ? " open" : ""}><summary>${esc(x.q)}</summary><div class="faq-a">${esc(x.a)}</div></details>`).join("");
      showSection("faq", items.length > 0);
    }

    const fg = $("[data-featured]");
    if (fg) fg.innerHTML = featured.length ? featured.map(cardHTML).join("") : emptyHTML("Hamarosan bővül a kínálat", "Nézz vissza később.");
    showSection("featured", true);

    const soonGrid = $("[data-soon]");
    if (soonGrid) soonGrid.innerHTML = soon.map(cardHTML).join("");
    showSection("soon", soon.length > 0);
    const soonLink = $("[data-soon-link]");
    if (soonLink) soonLink.hidden = !(soon.length && sectionOn("soon"));

    showSection("steps", true);
    renderReleases(list, s);
    renderHomeReviews();
    renderHomeBlog(s);
    const nb = $("[data-news-home]");
    if (nb && !nb.dataset.ready && N.live.features?.db) { nb.dataset.ready = "1"; nb.innerHTML = newsFormHTML("home"); }
    showSection("newsletter", !!N.live.features?.db);

    const cl = $("[data-contact-list]");
    if (cl) {
      const items = [];
      if (s.email) items.push(`<a href="mailto:${esc(s.email)}">${ICON.mail}${esc(s.email)}</a>`);
      if (s.phone) items.push(`<a href="tel:${esc(s.phone.replace(/[^+\d]/g, ""))}">${ICON.phone}${esc(s.phone)}</a>`);
      cl.innerHTML = items.join("");
    }
    const form = $("[data-contact-form]");
    const srv = !!N.live.features?.db;
    if (form) { form.hidden = !s.email && !srv; const note = $("[data-contact-note]", form); if (note) note.textContent = srv ? "Az üzenetet közvetlenül nekünk küldöd, e-mailben válaszolunk." : "A gomb megnyitja a levelezőprogramodat a kitöltött üzenettel."; }
    showSection("contact", !!(s.email || s.phone || srv));

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
      if (N.live.features?.db) {
        const btn = $('button[type="submit"]', f);
        btn.disabled = true;
        fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, message: msg, subject: f.subject?.value || "", website: f.website?.value || "" }) })
          .then(r => r.json().then(d => ({ ok: r.ok, d })))
          .then(({ ok: sent, d }) => {
            if (!sent) throw new Error(d.error || "");
            f.innerHTML = `<div class="notice success"><strong>Köszönjük, megkaptuk az üzeneted!${d.ref ? ` (${esc(d.ref)})` : ""}</strong> ${d.confirmed ? `Visszaigazolást küldtünk a(z) <strong>${esc(email)}</strong> címre – ha nem látod, nézd meg a Spam mappát is.` : ""} Általában 1 munkanapon belül válaszolunk.</div>`;
          })
          .catch(err => { btn.disabled = false; toast(err.message || "Az üzenet most nem ment el. Próbáld újra, vagy írj e-mailt."); });
        return;
      }
      if (!s.email) { toast("Az üzenetküldés most nem elérhető."); return; }
      const body = `${msg}\n\n— ${name} (${email})`;
      location.href = `mailto:${encodeURIComponent(s.email)}?subject=${encodeURIComponent("Érdeklődés az NS Card webshopból")}&body=${encodeURIComponent(body)}`;
    });
  }

  /* ---------------- terméklista ---------------- */
  const filters = { cat: "all", q: "", sort: "featured", instock: false, soon: false, sale: false, pre: false, min: "", max: "", fav: false, set: "", cond: "", lang: "" };

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
    filters.fav = u.get("fav") === "1";
    filters.set = u.get("set") || "";
    filters.pre = u.get("pre") === "1";
    filters.cond = u.get("cond") || "";
    filters.lang = u.get("lang") || "";
  }
  function writeFilters() {
    if (page !== "products") return;
    const u = new URLSearchParams();
    if (filters.cat !== "all") u.set("cat", filters.cat);
    if (filters.q) u.set("q", filters.q);
    if (filters.sort !== "featured") u.set("sort", filters.sort);
    ["instock", "soon", "sale", "pre"].forEach(k => filters[k] && u.set(k, "1"));
    if (filters.cond) u.set("cond", filters.cond);
    if (filters.lang) u.set("lang", filters.lang);
    if (filters.min) u.set("min", filters.min);
    if (filters.max) u.set("max", filters.max);
    if (filters.fav) u.set("fav", "1");
    if (filters.set) u.set("set", filters.set);
    const qs = u.toString();
    history.replaceState(null, "", qs ? `?${qs}` : location.pathname);
  }

  function filtered() {
    let list = N.products();
    if (filters.fav) { const fav = N.favorites.list(); list = list.filter(p => fav.includes(p.id)); }
    if (filters.cat !== "all") list = list.filter(p => p.category === filters.cat);
    if (filters.set) list = list.filter(p => p.set === filters.set);
    if (filters.q) {
      const words = norm(filters.q).split(/\s+/).filter(Boolean);
      list = list.filter(p => matchWords(`${searchHay(p)} ${norm(p.description)}`, words));
    }
    if (filters.instock && !filters.soon) list = list.filter(N.isBuyable);
    if (filters.soon && !filters.instock) list = list.filter(N.isSoon);
    if (filters.sale) list = list.filter(p => p.oldPrice || p.flags.includes("sale"));
    if (filters.pre) list = list.filter(N.isPreorder);
    if (filters.cond) list = list.filter(p => p.condition === filters.cond);
    if (filters.lang) list = list.filter(p => p.lang === filters.lang);
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

  const activeFilterCount = () => ["instock", "soon", "sale", "pre"].filter(k => filters[k]).length + (filters.min ? 1 : 0) + (filters.max ? 1 : 0) + (filters.cond ? 1 : 0) + (filters.lang ? 1 : 0);

  /* single kártyák: állapot és nyelv szűrő (csak ha van ilyen adat a listában) */
  function renderSingleFilters() {
    const box = $("[data-single-filters]");
    if (!box) return;
    const pool = N.products().filter(p => filters.cat === "all" || p.category === filters.cat);
    const conds = N.CONDITIONS.filter(c => pool.some(p => p.condition === c.value));
    const langs = N.LANGS.filter(l => pool.some(p => p.lang === l.value));
    if (filters.cond && !conds.some(c => c.value === filters.cond)) filters.cond = "";
    if (filters.lang && !langs.some(l => l.value === filters.lang)) filters.lang = "";
    box.hidden = !conds.length && !langs.length;
    const row = (key, label, items) => items.length ? `<div><h2>${label}</h2><div class="mini-chips">${[{ value: "", label: "Mind" }, ...items].map(x => `<button type="button" data-sf="${key}" data-v="${esc(x.value)}" aria-pressed="${filters[key] === x.value}">${esc(x.short || x.label)}</button>`).join("")}</div></div>` : "";
    box.innerHTML = row("cond", "Kártya állapota", conds) + row("lang", "Nyelv", langs);
  }

  function renderChips() {
    const chips = $("[data-chips]");
    if (!chips) return;
    const cats = categoriesWithCounts();
    const favN = N.favorites.list().filter(id => N.byId(id)).length;
    chips.innerHTML = `<button class="chip" type="button" data-cat="all" aria-pressed="${filters.cat === "all" && !filters.fav}">Összes</button>`
      + (favN || filters.fav ? `<button class="chip" type="button" data-fav-chip aria-pressed="${!!filters.fav}">♥ ${esc(t("fav.title"))} (${favN})</button>` : "")
      + cats.map(c => `<button class="chip chip-img" type="button" data-cat="${esc(c.value)}" aria-pressed="${filters.cat === c.value && !filters.fav}" style="--c:${esc(c.color)}">${catThumb(c) ? `<img src="${esc(catThumb(c))}" alt="" loading="lazy">` : ""}${esc(c.label)}<span>${c.count}</span></button>`).join("");
    const active = chips.querySelector('[aria-pressed="true"]');
    if (active && chips.scrollWidth > chips.clientWidth) chips.scrollLeft = Math.max(0, active.offsetLeft - 24);
  }

  function renderSetChips() {
    const box = $("[data-set-chips]");
    if (!box) return;
    const pool = N.products().filter(p => (filters.cat === "all" || p.category === filters.cat) && p.set);
    const sets = [...new Set(pool.map(p => p.set))].sort((a, b) => a.localeCompare(b, "hu"));
    if (filters.set && !sets.includes(filters.set)) filters.set = "";
    box.hidden = sets.length < 2;
    if (box.hidden) { box.innerHTML = ""; return; }
    box.innerHTML = `<span>Szett:</span><button class="chip" type="button" data-set="" aria-pressed="${!filters.set}">Mind</button>` + sets.map(x => `<button class="chip" type="button" data-set="${esc(x)}" aria-pressed="${filters.set === x}">${esc(x)} <span>${pool.filter(p => p.set === x).length}</span></button>`).join("");
  }

  function renderCatHero() {
    const hero = $("[data-cat-hero]");
    if (!hero) return;
    const c = filters.cat !== "all" && !filters.fav ? categoriesWithCounts().find(x => x.value === filters.cat) : null;
    hero.hidden = !c;
    $(".page-head")?.classList.toggle("has-hero", !!c);
    if (!c) return;
    hero.style.setProperty("--c", c.color);
    const art = (c.cover ? [c.cover] : c.imgs.slice(0, 3)).map(src => `<img src="${esc(src)}" alt="" loading="lazy">`).join("");
    hero.innerHTML = `<div><h2>${esc(c.label)}</h2>${c.desc ? `<p>${esc(c.desc)}</p>` : ""}<div class="meta"><span>${c.count} termék</span>${c.inStock ? `<span>${c.inStock} készleten</span>` : ""}${c.from ? `<span><b>${fmtFt(c.from)}</b>-tól</span>` : ""}</div></div><div class="cat-hero-art" aria-hidden="true">${art}</div>`;
  }

  function renderList() {
    const all = N.products();
    const cats = categoriesWithCounts();
    const catBtn = (value, label, count) => `<button type="button" data-cat="${esc(value)}" aria-pressed="${filters.cat === value && !filters.fav}">${esc(label)}<span>${count}</span></button>`;
    const favN = N.favorites.list().filter(id => N.byId(id)).length;
    const cl = $("[data-cat-list]");
    if (cl) cl.innerHTML = catBtn("all", t("link.all"), all.length) + (favN || filters.fav ? `<button type="button" data-fav-chip aria-pressed="${!!filters.fav}">♥ ${esc(t("fav.title"))}<span>${favN}</span></button>` : "") + cats.map(c => catBtn(c.value, c.label, c.count)).join("");
    renderChips();
    renderCatHero();
    renderSetChips();
    renderSingleFilters();
    $$("[data-view]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.view === (root.getAttribute("data-cols-m") || "2"))));

    $$("[data-f]").forEach(el => {
      const k = el.dataset.f;
      if (el.type === "checkbox") el.checked = !!filters[k]; else if (document.activeElement !== el) el.value = filters[k];
    });
    const sort = $("[data-sort]");
    if (sort) sort.value = filters.sort;
    const badge = $("[data-filter-badge]");
    const n = activeFilterCount();
    if (badge) badge.textContent = n ? ` (${n})` : "";

    const catLabel = filters.fav ? t("fav.title") : filters.cat === "all" ? t("products.title") : N.categoryLabel(filters.cat);
    $("[data-list-title]").textContent = catLabel;
    $("[data-crumb-current]").textContent = catLabel;
    document.title = `${catLabel} – NS Card`;

    const list = filtered();
    const countEl = $("[data-count]");
    if (countEl) countEl.innerHTML = `${list.length} termék${filters.q ? ` erre: <strong>„${esc(filters.q)}”</strong> <button class="link-more" style="background:none;border:0;padding:0;margin-left:6px" type="button" data-clear-q>Keresés törlése</button>` : ""}`;
    const grid = $("[data-list]");
    if (grid) grid.innerHTML = list.length
      ? list.map(cardHTML).join("")
      : filters.fav && !N.favorites.list().length
        ? emptyHTML(t("fav.title"), t("fav.empty"), `<a class="btn btn-primary" href="/products">${esc(t("hero.cta"))}</a>`)
        : emptyHTML("Nincs a szűrésnek megfelelő termék", "Próbálj más kulcsszót, vagy töröld a szűrőket.", '<button class="btn btn-ghost" type="button" data-reset-filters>Szűrők törlése</button>');
  }

  function bindList() {
    readFilters();
    document.addEventListener("click", e => {
      const b = e.target.closest("button");
      if (!b) return;
      if (b.matches("[data-set]")) { filters.set = b.dataset.set; writeFilters(); renderList(); revealScan(); return; }
      if (b.matches("[data-sf]")) { filters[b.dataset.sf] = b.dataset.v; writeFilters(); renderList(); revealScan(); return; }
      if (b.matches("[data-fav-chip]")) { filters.fav = !filters.fav; if (filters.fav) filters.cat = "all"; writeFilters(); renderList(); revealScan(); return; }
      if (b.matches("[data-cat]")) {
        filters.cat = b.dataset.cat; filters.fav = false; filters.set = ""; writeFilters(); renderList(); revealScan();
        if (b.classList.contains("chip")) b.scrollIntoView({ inline: "center", block: "nearest", behavior: motionOK() ? "smooth" : "auto" });
      } else if (b.matches("[data-reset-filters]")) {
        Object.assign(filters, { q: "", instock: false, soon: false, sale: false, pre: false, min: "", max: "", cond: "", lang: "" });
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
  let pdpSeen = 0;

  /* keresőknek: kanonikus cím és termék adatok (schema.org) */
  function productMeta(p) {
    const url = `${SITE}/product?id=${p.id}`;
    let can = $('link[rel="canonical"]');
    if (!can) { can = document.createElement("link"); can.rel = "canonical"; document.head.appendChild(can); }
    can.href = url;
    const img = imageUrl(p.images[0]);
    const abs = img && !/^https?:/.test(img) ? `${location.origin}${img}` : img;
    const ld = {
      "@context": "https://schema.org", "@type": "Product", name: p.name, sku: `NSC-${p.id}`, category: N.categoryLabel(p.category),
      image: p.images.map(src => { const u = imageUrl(src); return /^https?:/.test(u) ? u : `${location.origin}${u}`; }),
      description: p.description || p.line || `${p.name} – ${N.categoryLabel(p.category)}`,
      brand: { "@type": "Brand", name: "Pokémon TCG" },
      offers: { "@type": "Offer", url, priceCurrency: "HUF", price: p.price, itemCondition: ["LP", "MP", "HP", "DMG"].includes(p.condition) ? "https://schema.org/UsedCondition" : "https://schema.org/NewCondition",
        availability: N.isSoon(p) || N.isPreorder(p) ? "https://schema.org/PreOrder" : p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock", seller: { "@type": "Organization", name: "NS Card" } }
    };
    if (p.ean) ld.gtin13 = p.ean;
    const rr = N.rating(p.id);
    if (rr) ld.aggregateRating = { "@type": "AggregateRating", ratingValue: rr.avg, reviewCount: rr.count, bestRating: 5, worstRating: 1 };
    let tag = $("#pdp-ld");
    if (!tag) { tag = document.createElement("script"); tag.type = "application/ld+json"; tag.id = "pdp-ld"; document.head.appendChild(tag); }
    tag.textContent = JSON.stringify([ld, { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Kezdőlap", item: `${SITE}/` },
      { "@type": "ListItem", position: 2, name: N.categoryLabel(p.category), item: `${SITE}/products?cat=${encodeURIComponent(p.category)}` },
      { "@type": "ListItem", position: 3, name: p.name, item: url }
    ] }]);
    const og = (prop, val) => { let m = $(`meta[property="${prop}"]`); if (!m) { m = document.createElement("meta"); m.setAttribute("property", prop); document.head.appendChild(m); } m.setAttribute("content", val); };
    og("og:title", `${p.name} – NS Card`);
    og("og:url", url);
    if (abs) og("og:image", abs);
  }

  /* képnagyító */
  let lbIndex = 0;
  function openLightbox(i = 0) {
    const p = N.byId(Number(new URLSearchParams(location.search).get("id")));
    if (!p || !p.images.length) return;
    closeLightbox();
    lbIndex = i;
    const box = document.createElement("div");
    box.className = "lightbox";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", `${p.name} képei`);
    box.dataset.lightbox = "";
    const many = p.images.length > 1;
    box.innerHTML = `
      <div class="lb-top"><span data-lb-count>${i + 1} / ${p.images.length}</span><button class="icon-btn" type="button" data-lb-close aria-label="Bezárás">${ICON.close}</button></div>
      <div class="lb-stage" data-lb-stage>${p.images.map((src, k) => `<div class="lb-slide"><img src="${esc(imageUrl(src))}" alt="${esc(p.name)} – ${k + 1}. kép"></div>`).join("")}</div>
      ${many ? `<div class="lb-nav lb-prev"><button class="icon-btn" type="button" data-lb-go="-1" aria-label="Előző kép">${ICON.left}</button></div><div class="lb-nav lb-next"><button class="icon-btn" type="button" data-lb-go="1" aria-label="Következő kép">${ICON.right}</button></div>
      <div class="lb-thumbs">${p.images.map((src, k) => `<button type="button" data-lb-thumb="${k}" aria-current="${k === i}" aria-label="${k + 1}. kép"><img src="${esc(imageUrl(src))}" alt=""></button>`).join("")}</div>` : "<div></div>"}`;
    document.body.appendChild(box);
    lock(true);
    const stage = $("[data-lb-stage]", box);
    requestAnimationFrame(() => { stage.scrollLeft = i * stage.clientWidth; });
    stage.addEventListener("scroll", () => {
      const k = Math.round(stage.scrollLeft / Math.max(1, stage.clientWidth));
      if (k === lbIndex) return;
      lbIndex = k;
      $("[data-lb-count]", box).textContent = `${k + 1} / ${p.images.length}`;
      $$("[data-lb-thumb]", box).forEach((b, n) => b.setAttribute("aria-current", String(n === k)));
    }, { passive: true });
    box.addEventListener("click", e => {
      const b = e.target.closest("button");
      if (b?.matches("[data-lb-close]") || e.target.classList.contains("lb-slide")) closeLightbox();
      else if (b?.matches("[data-lb-go]")) lbGo(lbIndex + Number(b.dataset.lbGo));
      else if (b?.matches("[data-lb-thumb]")) lbGo(Number(b.dataset.lbThumb));
    });
    $("[data-lb-close]", box).focus();
  }
  function lbGo(k) {
    const stage = $("[data-lb-stage]");
    if (!stage) return;
    const n = stage.children.length;
    stage.scrollTo({ left: ((k + n) % n) * stage.clientWidth, behavior: motionOK() ? "smooth" : "auto" });
  }
  function closeLightbox() {
    const box = $("[data-lightbox]");
    if (!box) return;
    box.remove();
    if (!openDrawerEl && !searchOpen) lock(false);
  }
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
    const maxQty = Math.max(0, N.maxQty(p) - inCart);
    pdpQty = Math.min(Math.max(1, pdpQty), Math.max(1, maxQty));
    const imgs = p.images.length ? p.images : [""];
    pdpImage = Math.min(pdpImage, imgs.length - 1);
    const s = N.settings();
    const pays = payMethods(s);
    const multi = imgs.length > 1;

    box.innerHTML = `
      <div class="pdp">
        <div class="gallery">
          <div class="track" data-track tabindex="0" aria-label="Termékképek">${imgs.map((src, i) => `<div class="slide">${src ? `<img src="${esc(imageUrl(src))}" alt="${i === 0 ? esc(p.name) : `${esc(p.name)} – ${i + 1}. kép`}"${i ? ' loading="lazy"' : ""} data-zoom="${i}">` : ""}</div>`).join("")}</div>
          ${imgs[0] ? `<button class="zoom-hint" type="button" data-zoom-open aria-label="Kép nagyítása">${ICON.zoom}</button>` : ""}
          ${multi ? `<div class="dots" aria-hidden="true">${imgs.map((_, i) => `<i${i === pdpImage ? ' class="on"' : ""}></i>`).join("")}</div>
          <div class="thumbs" role="group" aria-label="Képek">${imgs.map((src, i) => `<button type="button" data-thumb="${i}" aria-current="${i === pdpImage}" aria-label="${i + 1}. kép"><img src="${esc(imageUrl(src))}" alt=""></button>`).join("")}</div>` : ""}
        </div>
        <div class="pdp-info">
          <div class="pdp-meta"><span>${esc(N.categoryLabel(p.category))}</span>${p.set ? `<span>· ${esc(p.set)}</span>` : ""}<div class="tags">${tagsHTML(p)}</div></div>
          <h1 class="display">${esc(p.name)}</h1>
          ${N.rating(p.id) ? `<a class="pdp-rating" href="#velemenyek">${starsHTML(N.rating(p.id).avg)}<span>${N.rating(p.id).avg.toLocaleString("hu-HU")} · ${N.rating(p.id).count} vélemény</span></a>` : ""}
          ${p.line ? `<p class="muted" style="font-size:1.1rem">${esc(p.line)}</p>` : ""}
          ${specsHTML(p)}
          <div class="pdp-price">${p.oldPrice ? `<s>${fmtFt(p.oldPrice)}</s>` : ""}<strong>${fmtFt(p.price)}</strong>${p.oldPrice ? `<span class="save">−${N.discount(p)}%</span>` : ""}</div>
          ${st.key === "low" ? `<div class="urgency"><span>${esc(st.label)} – siess, ha szeretnéd!</span><div class="bar"><i style="width:${Math.max(8, Math.min(100, p.stock / Math.max(1, s.lowStock + 1) * 100))}%"></i></div></div>` : `<span class="stock stock-${st.key}" style="font-size:1rem">${esc(st.label)}${inCart ? ` · ebből ${inCart} db már a kosaradban` : ""}</span>`}
          ${st.key === "low" && inCart ? `<span class="muted" style="font-size:.9rem">Ebből ${inCart} db már a kosaradban.</span>` : ""}
          ${N.isPreorder(p) || (N.isSoon(p) && p.releaseDate) ? `<div class="pre-note">${ICON.cal}<span>${N.isPreorder(p) ? esc(t("pre.note", { date: p.releaseDate ? N.fmtDate(p.releaseDate) : "hamarosan" })) : `Várható megjelenés: <b>${esc(N.fmtDate(p.releaseDate))}</b>`}</span></div>` : ""}
          ${buyable && !N.isPreorder(p) && dispatchText(s) ? `<div class="dispatch">${ICON.truck}<span data-dispatch>${dispatchText(s)}</span></div>` : ""}
          ${buyable ? `
            <div class="buy-row">
              <div class="stepper lg" role="group" aria-label="Mennyiség">
                <button type="button" data-pdp-qty="-1" aria-label="Eggyel kevesebb" ${pdpQty <= 1 ? "disabled" : ""}>−</button>
                <output aria-live="polite">${pdpQty}</output>
                <button type="button" data-pdp-qty="1" aria-label="Eggyel több" ${pdpQty >= maxQty ? "disabled" : ""}>+</button>
              </div>
              <button class="btn btn-primary" type="button" data-pdp-add ${maxQty <= 0 ? "disabled" : ""}>${ICON.cart}${maxQty <= 0 ? (p.maxPerOrder > 0 && p.maxPerOrder < p.stock ? "Elérted a rendelési limitet" : "A teljes készlet a kosaradban") : esc(N.isPreorder(p) ? "Előrendelem" : t("pdp.add"))}</button>
            </div>${p.maxPerOrder > 0 ? `<p class="limit-note">${ICON.shield}Rendelésenként legfeljebb ${p.maxPerOrder} db – hogy mindenkinek jusson.</p>` : ""}` : N.live.features?.db ? `<div data-notify-slot></div>` : `${s.email ? `<a class="btn btn-ghost" href="mailto:${esc(s.email)}?subject=${encodeURIComponent(`Értesítés kérése: ${p.name}`)}&body=${encodeURIComponent(`Kérem, értesítsenek, ha a(z) ${p.name} rendelhető lesz.\n\nKöszönöm!`)}">${ICON.mail}${esc(t("notify.button"))}</a>` : ""}<div class="notice">${N.isSoon(p) ? "Ez a termék hamarosan érkezik, még nem rendelhető." : "Ez a termék jelenleg elfogyott."}${s.email ? ` Írj nekünk a <a href="mailto:${esc(s.email)}?subject=${encodeURIComponent(`Érdeklődés: ${p.name}`)}">${esc(s.email)}</a> címre, és szólunk, ha elérhető.` : ""}</div>`}
          <div class="pdp-tools">
            ${favBtn(p, "btn btn-ghost btn-sm")}
            <button class="btn btn-ghost btn-sm" type="button" data-share>${ICON.share}${esc(t("pdp.share"))}</button>
          </div>
          <div class="perks">
            <div>${ICON.shield}<strong>${esc(t("perk.1"))}</strong><span>${esc(t("perk.1.text"))}</span></div>
            <div>${ICON.truck}<strong>${esc(t("perk.2"))}</strong><span>${esc(shipShortLabel())}${s.freeShippingFrom > 0 ? `, ${fmtFt(s.freeShippingFrom)} felett ingyenes` : ""}${s.deliveryText ? ` · ${esc(s.deliveryText)}` : ""}</span></div>
            <div>${ICON.lock}<strong>${esc(t("perk.3"))}</strong><span>${esc(cap(joinHu(pays)) || "Rendeléskor egyeztetjük")}</span></div>
          </div>
          <div>
            <h2 style="font-weight:800;font-size:1.05rem;margin-bottom:8px">${esc(t("pdp.desc"))}</h2>
            ${p.description ? `<p class="desc">${esc(p.description)}</p>` : `<p class="desc desc-empty">${esc(t("pdp.empty"))}</p>`}
          </div>
        </div>
      </div>`;

    const slot = $("[data-notify-slot]");
    if (slot) slot.replaceWith(notifyForm(p));
    renderReviews(p);

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

    if (pdpSeen !== p.id) { pdpSeen = p.id; N.recent.push(p.id); }
    const recentList = N.recent.list().filter(id => id !== p.id).map(id => N.byId(id)).filter(Boolean).slice(0, 4);
    const rw = $("[data-recent-wrap]");
    if (rw) { rw.hidden = !recentList.length; $("[data-recent]").innerHTML = recentList.map(cardHTML).join(""); }
    productMeta(p);

    const rel = N.products().filter(x => x.id !== p.id && x.category === p.category);
    const fill = N.products().filter(x => x.id !== p.id && !rel.includes(x) && N.isBuyable(x));
    const related = rel.concat(fill).slice(0, 4);
    $("[data-related-wrap]").hidden = !related.length;
    $("[data-related]").innerHTML = related.map(cardHTML).join("");
    updateCount(false);
    window.dispatchEvent(new CustomEvent("nsc:pdp"));
  }

  /* feladási határidő: „Rendelj 2 óra 15 percen belül, és még ma feladjuk.” (hétvégén a következő munkanap) */
  function dispatchText(s) {
    const cut = Number(s.dispatchCutoff) || 0;
    if (!cut) return "";
    const now = new Date();
    const work = d => d >= 1 && d <= 5;
    if (work(now.getDay()) && now.getHours() < cut) {
      const end = new Date(now); end.setHours(cut, 0, 0, 0);
      const mins = Math.max(1, Math.round((end - now) / 60000));
      const h = Math.floor(mins / 60), m = mins % 60;
      const time = h ? `<b>${h} óra ${m} percen</b>` : `<b>${m} percen</b>`;
      return esc(t("dispatch.today", { time: "§" })).replace("§", time);
    }
    const d = new Date(now);
    do { d.setDate(d.getDate() + 1); } while (!work(d.getDay()));
    const days = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
    const names = ["vasárnap", "hétfőn", "kedden", "szerdán", "csütörtökön", "pénteken", "szombaton"];
    return esc(t("dispatch.next", { day: "§" })).replace("§", `<b>${days === 1 ? "holnap" : names[d.getDay()]}</b>`);
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
      else if (b.matches("[data-zoom-open]")) openLightbox(pdpImage);
      else if (b.matches("[data-share]")) {
        const data = { title: p.name, text: `${p.name} – ${fmtFt(p.price)}`, url: location.href };
        if (navigator.share) navigator.share(data).catch(() => {});
        else navigator.clipboard?.writeText(location.href).then(() => toast("A termék linkje a vágólapra került."), () => toast(location.href));
      }
      else if (b.matches("[data-pdp-qty]")) { pdpQty += Number(b.dataset.pdpQty); renderProduct(); $(`[data-pdp-qty="${b.dataset.pdpQty}"]`)?.focus(); }
      else if (b.matches("[data-pdp-add]")) { const q = pdpQty; pdpQty = 1; addToCart(p.id, q, b); }
    });
    document.addEventListener("scroll", e => { if (e.target?.matches?.("[data-track]")) syncSlide(); }, { capture: true, passive: true });
    document.addEventListener("click", e => { const img = e.target.closest?.("[data-zoom]"); if (img) openLightbox(Number(img.dataset.zoom)); });
    document.addEventListener("keydown", e => {
      if (!$("[data-lightbox]")) return;
      if (e.key === "Escape") { e.stopPropagation(); closeLightbox(); }
      if (e.key === "ArrowRight") lbGo(lbIndex + 1);
      if (e.key === "ArrowLeft") lbGo(lbIndex - 1);
    }, true);
    document.addEventListener("keydown", e => {
      if (!e.target.matches?.("[data-track]")) return;
      if (e.key === "ArrowRight") { e.preventDefault(); setSlide(pdpImage + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); setSlide(Math.max(0, pdpImage - 1)); }
    });
    setInterval(() => { const el = $("[data-dispatch]"); if (el) el.innerHTML = dispatchText(N.settings()); }, 30000);
    const sticky = $("[data-sticky-buy]");
    if (sticky && "IntersectionObserver" in window) {
      const io = new IntersectionObserver(entries => {
        sticky.classList.toggle("show", !entries.some(en => en.isIntersecting));
      }, { threshold: 0 });
      window.addEventListener("nsc:pdp", () => { io.disconnect(); const btn = $(".buy-row [data-pdp-add]"); if (btn) io.observe(btn); else sticky.classList.remove("show"); });
    }
  }

  /* ---------------- pénztár ---------------- */
  const CO_FIELDS = ["name", "email", "phone", "zip", "city", "address", "locker", "lockerId", "lockerProvider", "note", "ship", "pay", "coupon", "gift", "giftMessage",
    "billSame", "billName", "billZip", "billCity", "billAddress", "billCompany", "billTax", "wantCompany"];
  let coState = Object.assign({ ship: "home", pay: "", billSame: "1" }, N.store.get(N.KEYS.checkout) || {});
  let coDone = null;
  let coError = "";
  let coBusy = false;
  let coSummaryOpen = false;
  let coCouponInput = "";
  let coCouponMsg = "";
  let coTerms = false;
  const needTerms = s => !!(s.pages?.aszf || s.pages?.adatkezeles);
  const couponDesc = c => c.type === "percent" ? `${c.value}% kedvezmény` : c.type === "fixed" ? `${fmtFt(c.value)} kedvezmény` : "Ingyenes szállítás";

  function availablePays(s) {
    const list = [];
    if (s.payCard) list.push({ v: "card", t: "Bankkártyás fizetés", d: "Biztonságos online fizetés a Stripe oldalán." });
    if (s.payTransfer && s.email) list.push({ v: "transfer", t: "Banki átutalás", d: "Az utalási adatokat a visszaigazoló e-mailben küldjük." });
    if (s.payCod && s.email) list.push({ v: "cod", t: "Utánvét", d: s.codFee > 0 ? `Fizetés átvételkor. Utánvételi díj: ${fmtFt(s.codFee)}.` : "Fizetés a csomag átvételekor." });
    return list;
  }

  function totals(s) {
    const subtotal = cart.subtotal();
    const cp = coState.coupon ? N.findCoupon(coState.coupon, subtotal) : null;
    const coupon = cp?.ok ? cp.coupon : null;
    const discount = coupon ? cp.discount : 0;
    let shipping = N.shippingFor(coState.ship, subtotal);
    const freeShip = !!(coupon && cp.freeShip && coState.ship !== "pickup");
    if (freeShip) shipping = 0;
    const cod = coState.pay === "cod" && subtotal ? s.codFee : 0;
    const gift = !!(s.giftWrap && coState.gift === "1");
    const giftFee = gift ? s.giftWrapPrice : 0;
    return { subtotal, shipping, cod, gift, giftFee, discount, coupon, couponState: cp, freeShip, total: Math.max(0, subtotal - discount) + shipping + cod + giftFee };
  }

  function couponHTML(s, tt) {
    if (!(s.coupons || []).some(c => c.active)) return "";
    if (tt.coupon) return `<div class="coupon"><div class="coupon-on"><span><b>${esc(tt.coupon.code)}</b><small>${esc(couponDesc(tt.coupon))}</small></span><button type="button" data-coupon-remove>Eltávolítás</button></div></div>`;
    const cs = tt.couponState;
    const msg = coCouponMsg || (cs && !cs.ok ? (cs.reason === "min" ? t("coupon.min", { n: fmtFt(cs.coupon.minOrder) }) : t("coupon.invalid")) : "");
    return `<div class="coupon"><label class="sr-only" for="co-coupon">${esc(t("coupon.label"))}</label><div class="coupon-row"><input class="input" id="co-coupon" placeholder="${esc(t("coupon.label"))}" value="${esc(coCouponInput || coState.coupon || "")}" autocomplete="off" autocapitalize="characters" spellcheck="false" enterkeyhint="done"><button class="btn btn-ghost" type="button" data-coupon-apply>${esc(t("coupon.apply"))}</button></div>${msg ? `<p class="coupon-msg" role="alert">${esc(msg)}</p>` : ""}</div>`;
  }

  function applyCoupon() {
    const code = String(coCouponInput || $("#co-coupon")?.value || "").trim().toUpperCase();
    const res = N.findCoupon(code, cart.subtotal());
    coCouponMsg = "";
    if (!code) return;
    if (!res.ok) { coState.coupon = ""; coCouponMsg = res.reason === "min" ? t("coupon.min", { n: fmtFt(res.coupon.minOrder) }) : t("coupon.invalid"); }
    else { coState.coupon = res.coupon.code; coCouponInput = ""; toast(`${res.coupon.code}: ${couponDesc(res.coupon)}`); }
    saveCo();
    renderCheckout();
  }

  function summaryHTML(s) {
    const tt = totals(s);
    return `
      <aside class="panel summary${coSummaryOpen ? "" : " collapsed"}" aria-label="Rendelés összesítő">
        <button class="summary-toggle" type="button" data-summary-toggle aria-expanded="${coSummaryOpen}"><span>Összesítő · ${cart.count()} db ${coSummaryOpen ? "▴" : "▾"}</span><strong>${fmtFt(tt.total)}</strong></button>
        <h2>Összesítő</h2>
        <div class="summary-body">
          <div>${cart.lines().map(l => lineHTML(l, true)).join("")}</div>
          ${couponHTML(s, tt)}
          ${tt.freeShip ? "" : freeShipHTML(tt.subtotal)}
          <div class="sum-row"><span>Részösszeg</span><strong>${fmtFt(tt.subtotal)}</strong></div>
          ${tt.discount ? `<div class="sum-row discount"><span>Kedvezmény (${esc(tt.coupon.code)})</span><strong>−${fmtFt(tt.discount)}</strong></div>` : ""}
          <div class="sum-row"><span>Szállítás</span><strong>${tt.shipping ? fmtFt(tt.shipping) : "Ingyenes"}</strong></div>
          ${tt.cod ? `<div class="sum-row"><span>Utánvételi díj</span><strong>${fmtFt(tt.cod)}</strong></div>` : ""}
          ${tt.gift ? `<div class="sum-row"><span>Ajándékcsomagolás</span><strong>${tt.giftFee ? fmtFt(tt.giftFee) : "Ingyenes"}</strong></div>` : ""}
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
        <span><strong>${esc(title)}</strong><small>${esc(desc)}</small></span><span class="opt-price">${!price || (v !== "pickup" && ((tt.subtotal && s.freeShippingFrom > 0 && tt.subtotal >= s.freeShippingFrom) || (tt.coupon && tt.coupon.type === "ship"))) ? "Ingyenes" : fmtFt(price)}</span></label>`;
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
                ? `${s.lockerMap !== false ? lockerPickHTML() : ""}${fieldHTML("locker", s.lockerMap !== false ? "Az automata neve és címe" : "Csomagautomata neve és címe", 'placeholder="Pl. Foxpost – Budapest, Váci út 1." required', "full")}`
                : `${fieldHTML("zip", "Irányítószám", 'autocomplete="postal-code" inputmode="numeric" maxlength="4" required data-zip-for="city"', "zip")}
                   ${fieldHTML("city", "Település", 'autocomplete="address-level2" required list="zip-city-list"')}
                   ${fieldHTML("address", "Utca, házszám, emelet, ajtó", 'autocomplete="street-address" required', "full")}`}
            </div>
            ${lines.some(l => N.isPreorder(l.product)) ? `<div class="notice pre-note">${ICON.cal}<span>Előrendelt termék is van a kosaradban. ${lines.some(l => !N.isPreorder(l.product)) ? "A teljes rendelést a megjelenés után, egyben adjuk fel – ha a készleten lévő termékeket előbb kérnéd, írd meg a megjegyzésben." : "A megjelenés után azonnal feladjuk."}</span></div>` : ""}
          </section>
          ${billingHTML()}
          <section class="co-section" aria-labelledby="co-h3">
            <h2 id="co-h3"><b>4</b>Fizetés</h2>
            ${pays.length ? `<div class="options" role="radiogroup" aria-label="Fizetési mód">${pays.map(p => `
              <label class="option"><input type="radio" name="pay" value="${p.v}" ${coState.pay === p.v ? "checked" : ""}>
                <span><strong>${p.t}</strong><small>${p.d}</small></span><span></span></label>`).join("")}</div>`
              : `<div class="notice error">Az online rendelés még nincs beállítva. Kérjük, vedd fel velünk a kapcsolatot.</div>`}
            ${s.giftWrap ? `<div class="gift-box${coState.gift === "1" ? " on" : ""}">
              <label class="check"><input type="checkbox" name="gift" ${coState.gift === "1" ? "checked" : ""}> <span><strong>${ICON.gift}Ajándékba lesz</strong><small>Ajándékcsomagolás${s.giftWrapPrice ? ` (+${fmtFt(s.giftWrapPrice)})` : " (ingyenes)"}, árcédula nélkül.</small></span></label>
              ${coState.gift === "1" ? `<div class="form-grid">${fieldHTML("giftMessage", "Üzenet az ajándékkártyára (nem kötelező)", 'maxlength="300" placeholder="pl. Boldog karácsonyt! Jó bontást!"', "full")}</div>` : ""}
            </div>` : ""}
            <div class="form-grid">${fieldHTML("note", "Megjegyzés a rendeléshez (nem kötelező)", 'rows="3"', "full")}</div>
            <div class="hp" aria-hidden="true"><label>Weboldal <input name="website" tabindex="-1" autocomplete="off" data-hp></label></div>
          </section>
          ${coError ? `<div class="notice error" role="alert" style="margin-bottom:16px">${coError}</div>` : ""}
          ${needTerms(s) ? `<label class="terms" data-terms><input type="checkbox" id="co-terms" ${coTerms ? "checked" : ""}><span>${esc(t("checkout.terms"))} ${s.pages.aszf ? '<a href="/info?p=aszf" target="_blank" rel="noopener">ÁSZF</a>' : ""}${s.pages.aszf && s.pages.adatkezeles ? " · " : ""}${s.pages.adatkezeles ? '<a href="/info?p=adatkezeles" target="_blank" rel="noopener">Adatkezelés</a>' : ""}</span></label>` : ""}
          <div class="co-submit">
            <button class="btn btn-primary btn-block" type="submit" style="--h:56px;font-size:1.05rem" ${!pays.length || coBusy ? "disabled" : ""}>
              ${coBusy ? "Folyamatban…" : `${esc(coState.pay === "card" ? t("checkout.pay") : t("checkout.submit"))} · ${fmtFt(tt.total)}`}
            </button>
          </div>
          <p class="muted" style="font-size:.86rem;margin-top:12px">${coState.pay === "card" ? "A gomb a Stripe biztonságos fizetési oldalára visz." : N.live.features?.db ? "A gombbal leadod a rendelést, a visszaigazolást e-mailben küldjük." : "A gomb megnyitja a levelezőprogramodat a kitöltött rendeléssel – a levél elküldésével adod le a rendelést."}</p>
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
    if (coState.ship === "locker") need("locker", "Válaszd ki vagy add meg a csomagautomatát.");
    else if (coState.ship !== "pickup") {
      need("zip", "Add meg az irányítószámot.");
      if (coState.zip && !/^\d{4}$/.test(String(coState.zip).trim())) errs.zip = "4 számjegy.";
      need("city", "Add meg a települést.");
      need("address", "Add meg a címet.");
    }
    if (needBilling()) {
      need("billZip", "Add meg a számlázási irányítószámot.");
      if (coState.billZip && !/^\d{4}$/.test(String(coState.billZip).trim())) errs.billZip = "4 számjegy.";
      need("billCity", "Add meg a települést.");
      need("billAddress", "Add meg a számlázási címet.");
    }
    if (coState.wantCompany === "1") {
      need("billCompany", "Add meg a cég nevét.");
      if (coState.billTax && !/^\d{8}-?\d-?\d{2}$/.test(String(coState.billTax).trim())) errs.billTax = "Formátum: 12345678-1-12";
    }
    $$("[data-err]").forEach(el => { const k = el.dataset.err; el.hidden = !errs[k]; el.textContent = errs[k] || ""; $(`#co-${k}`)?.setAttribute("aria-invalid", String(!!errs[k])); });
    const first = Object.keys(errs)[0];
    if (first) { $(`#co-${first}`)?.focus(); return false; }
    if (needTerms(N.settings()) && !coTerms) {
      const tl = $("[data-terms]");
      tl?.setAttribute("aria-invalid", "true");
      $("#co-terms")?.focus();
      toast("A rendeléshez fogadd el az ÁSZF-et és az adatkezelési tájékoztatót.");
      return false;
    }
    return true;
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
    L.push("", `Részösszeg: ${fmtFt(o.subtotal)}`);
    if (o.coupon) L.push(`Kupon (${o.coupon}): ${o.discount ? `−${fmtFt(o.discount)}` : "ingyenes szállítás"}`);
    L.push(`Szállítás (${o.shipLabel}): ${o.shipping ? fmtFt(o.shipping) : "ingyenes"}`);
    if (o.cod) L.push(`Utánvételi díj: ${fmtFt(o.cod)}`);
    if (o.gift) L.push(`Ajándékcsomagolás: ${o.giftFee ? fmtFt(o.giftFee) : "ingyenes"}${o.c.giftMessage ? ` – üzenet: „${o.c.giftMessage}”` : ""}`);
    L.push(`Fizetendő: ${fmtFt(o.total)}`, `Fizetési mód: ${o.payLabel}`, "");
    L.push("Vásárló:", o.c.name, o.c.email, o.c.phone);
    if (o.ship === "pickup") L.push("Személyes átvétel");
    else if (o.c.locker) L.push(`Csomagautomata: ${o.c.locker}`); else L.push(`${o.c.zip} ${o.c.city}, ${o.c.address}`);
    const b = o.c.billing;
    if (b && !b.same) L.push("", "Számlázási cím:", `${b.company || b.name || o.c.name}`, `${b.zip} ${b.city}, ${b.address}`);
    else if (b?.company) L.push("", `Számla: ${b.company}`);
    if (b?.taxNumber) L.push(`Adószám: ${b.taxNumber}`);
    if (o.c.note) L.push("", `Megjegyzés: ${o.c.note}`);
    return L.join("\n");
  }

  const mailtoFor = (o, s) => `mailto:${encodeURIComponent(s.email)}?subject=${encodeURIComponent(`Rendelés ${o.id}`)}&body=${encodeURIComponent(orderText(o))}`;

  function doneHTML(o, s) {
    if (o.server) {
      const pay = o.pay === "transfer"
        ? `<div class="pay-box"><strong>Utalási adatok</strong>${o.bankDetails ? `<p>${esc(o.bankDetails).replace(/\n/g, "<br>")}</p>` : "<p>Az utalási adatokat e-mailben küldjük.</p>"}<dl><dt>Összeg</dt><dd>${fmtFt(o.total)}</dd><dt>Közlemény</dt><dd>${esc(o.id)}</dd></dl><small>A csomagot az összeg beérkezése után adjuk fel.</small></div>`
        : o.pay === "cod" ? `<p class="muted">Fizetés a csomag átvételekor: <strong>${fmtFt(o.total)}</strong>.</p>` : "";
      return `
      <div class="done panel">
        <span class="done-ico">${ICON.check}</span>
        <h2 class="display" style="font-size:1.7rem">Köszönjük, megkaptuk a rendelésed!</h2>
        <p class="muted">Rendelésszám</p>
        <p class="order-id">${esc(o.id)}</p>
        ${pay}
        ${o.preorder ? `<div class="notice pre-note">${ICON.cal}<span>Az előrendelt termékeket a megjelenés után küldjük.</span></div>` : ""}
        <p class="muted">${o.emailed ? `A visszaigazolást elküldtük ide: <strong>${esc(o.email)}</strong>. Ha nem látod, nézd meg a Promóciók vagy Spam mappát is.` : "Hamarosan e-mailben is visszaigazoljuk a rendelést."} A feladásról csomagkövetési számmal értesítünk.</p>
        <div class="order-sum">${o.lines.map(l => `<div class="sum-row"><span>${esc(l.name)} × ${l.qty}</span><strong>${fmtFt(l.qty * l.price)}</strong></div>`).join("")}<div class="sum-row total"><span>Fizetendő</span><strong>${fmtFt(o.total)}</strong></div></div>
        <div class="hero-actions" style="margin:0"><a class="btn btn-primary" href="/products">Vásárlás folytatása</a>${o.token ? `<a class="btn btn-ghost" href="/rendeles?id=${encodeURIComponent(o.id)}&t=${encodeURIComponent(o.token)}">Rendelés követése</a>` : ""}<button class="btn btn-ghost" type="button" data-copy-id>Rendelésszám másolása</button></div>
      </div>`;
    }
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
    else if (coState.ship === "pickup") { c.zip = c.city = c.address = c.locker = c.lockerId = c.lockerProvider = ""; }
    else c.locker = c.lockerId = c.lockerProvider = "";
    const company = coState.wantCompany === "1";
    c.billing = { same: !needBilling(), name: c.billName || c.name, zip: c.billZip, city: c.billCity, address: c.billAddress, company: company ? c.billCompany : "", taxNumber: company ? c.billTax : "" };
    const honey = $("[data-hp]")?.value || "";

    if (coState.pay === "card") {
      coBusy = true; renderCheckout();
      try {
        const res = await fetch("/api/create-checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ items: lines.map(l => ({ id: l.product.id, qty: l.qty })), customer: c, shipping: coState.ship, coupon: tt.coupon?.code || "", gift: tt.gift, giftMessage: tt.gift ? c.giftMessage : "", website: honey })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.url) { stockConflict(data); throw new Error(data.error || ""); }
        if (data.order) N.store.set(N.KEYS.lastOrder, { id: data.order, pay: "card", at: Date.now() });
        location.href = data.url;
        return;
      } catch (err) {
        coError = esc(err.message || "") || "A kártyás fizetés most nem érhető el. Válassz másik fizetési módot, vagy próbáld újra később.";
        coBusy = false; renderCheckout();
        return;
      }
    }

    // szerver oldali rendelés (adatbázissal); ha még nincs bekapcsolva, a levelezős rendelés marad
    if (N.live.features?.db !== false) {
      coBusy = true; renderCheckout();
      let data = null, res = null;
      try {
        res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ items: lines.map(l => ({ id: l.product.id, qty: l.qty })), customer: c, shipping: coState.ship, pay: coState.pay, coupon: tt.coupon?.code || "", gift: tt.gift, giftMessage: tt.gift ? c.giftMessage : "", website: honey })
        });
        data = /json/.test(res.headers.get("content-type") || "") ? await res.json().catch(() => null) : null;
      } catch {}
      coBusy = false;
      if (res && res.ok && data?.id) {
        coDone = { server: true, id: data.id, token: data.token || "", total: data.total, pay: data.pay, method: data.method, preorder: data.preorder, emailed: data.emailed, email: c.email, bankDetails: data.bankDetails || s.bankDetails || "",
          lines: lines.map(l => ({ id: l.product.id, name: l.product.name, qty: l.qty, price: l.product.price })) };
        N.store.set(N.KEYS.lastOrder, { id: data.id, pay: data.pay, token: data.token || "", at: Date.now() });
        cart.clear();
        renderCheckout();
        window.scrollTo({ top: 0, behavior: motionOK() ? "smooth" : "auto" });
        return;
      }
      if (res && data && !data.fallback) {
        stockConflict(data);
        coError = esc(data.error || "A rendelés most nem sikerült. Próbáld újra.");
        renderCheckout();
        return;
      }
      if (!s.email) { coError = "A rendelés most nem küldhető el. Próbáld újra később."; renderCheckout(); return; }
    }

    const order = {
      id: orderNumber(),
      createdAt: new Date().toISOString(),
      lines: lines.map(l => ({ id: l.product.id, name: l.product.name, qty: l.qty, price: l.product.price })),
      subtotal: tt.subtotal, shipping: tt.shipping, cod: tt.cod, total: tt.total, discount: tt.discount, coupon: tt.coupon?.code || "", gift: tt.gift, giftFee: tt.giftFee,
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
      coState[el.name] = el.type === "checkbox" ? (el.checked ? "1" : "0") : el.value;
      if (el.name === "locker") { coState.lockerId = ""; coState.lockerProvider = ""; }
      saveCo();
      if (el.dataset.zipFor) zipFill(el);
      if (el.type === "radio" || el.type === "checkbox") { coError = ""; renderCheckout(); }
      else if (el.getAttribute("aria-invalid") === "true") { el.setAttribute("aria-invalid", "false"); const er = $(`[data-err="${el.name}"]`); if (er) er.hidden = true; }
    });
    box.addEventListener("submit", e => { e.preventDefault(); if (!coBusy) submitCheckout(); });
    box.addEventListener("input", e => {
      if (e.target.id === "co-coupon") { coCouponInput = e.target.value; coCouponMsg = ""; }
    });
    box.addEventListener("change", e => {
      if (e.target.id === "co-terms") { coTerms = e.target.checked; $("[data-terms]")?.removeAttribute("aria-invalid"); }
    });
    box.addEventListener("keydown", e => { if (e.target.id === "co-coupon" && e.key === "Enter") { e.preventDefault(); applyCoupon(); } });
    box.addEventListener("click", async e => {
      if (e.target.closest("[data-coupon-apply]")) { applyCoupon(); return; }
      if (e.target.closest("[data-coupon-remove]")) { coState.coupon = ""; coCouponInput = ""; coCouponMsg = ""; saveCo(); renderCheckout(); return; }
      if (e.target.closest("[data-summary-toggle]")) { coSummaryOpen = !coSummaryOpen; renderCheckout(); return; }
      if (e.target.closest("[data-locker-open]")) { openLockerMap(); return; }
      if (e.target.closest("[data-locker-clear]")) { coState.locker = coState.lockerId = coState.lockerProvider = ""; saveCo(); renderCheckout(); return; }
      if (e.target.closest("[data-copy-id]") && coDone) { try { await navigator.clipboard.writeText(coDone.id); toast("A rendelésszám a vágólapra került."); } catch { toast(coDone.id); } return; }
      if (e.target.closest("[data-copy-order]") && coDone) {
        try { await navigator.clipboard.writeText(orderText(coDone)); toast("A rendelés a vágólapra került."); }
        catch { toast("A másolás nem sikerült – jelöld ki a szöveget a részleteknél."); }
      }
    });
  }

  /* ---------------- számlázási adatok, csomagautomata, irányítószám ---------------- */
  const needBilling = () => coState.ship !== "home" || coState.billSame === "0";
  function billingHTML() {
    const home = coState.ship === "home";
    const company = coState.wantCompany === "1";
    return `
          <section class="co-section" aria-labelledby="co-hb">
            <h2 id="co-hb"><b>3</b>Számlázási adatok</h2>
            ${home ? `<label class="check"><input type="checkbox" name="billSame" ${coState.billSame !== "0" ? "checked" : ""}> A számlázási cím megegyezik a szállítási címmel</label>` : `<p class="muted" style="margin:0 0 12px;font-size:.92rem">A számlához kérjük a címed.</p>`}
            ${needBilling() ? `<div class="form-grid">
              ${fieldHTML("billName", "Név a számlán (ha eltér)", 'autocomplete="billing name" placeholder="Üresen hagyva a fenti név"', "full")}
              ${fieldHTML("billZip", "Irányítószám", 'autocomplete="billing postal-code" inputmode="numeric" maxlength="4" required data-zip-for="billCity"', "zip")}
              ${fieldHTML("billCity", "Település", 'autocomplete="billing address-level2" required list="zip-city-list"')}
              ${fieldHTML("billAddress", "Utca, házszám", 'autocomplete="billing street-address" required', "full")}
            </div>` : ""}
            <label class="check"><input type="checkbox" name="wantCompany" ${company ? "checked" : ""}> Cég nevére kérem a számlát</label>
            ${company ? `<div class="form-grid">${fieldHTML("billCompany", "Cégnév", 'autocomplete="organization" required')}${fieldHTML("billTax", "Adószám", 'inputmode="numeric" placeholder="12345678-1-12"')}</div>` : ""}
          </section>`;
  }

  function lockerPickHTML() {
    const chosen = coState.locker && coState.lockerId;
    return `<div class="locker-pick full">
      ${chosen ? `<div class="locker-chosen">${ICON.pin}<span><strong>${esc(coState.locker.split(" – ")[1]?.split(",")[0] || coState.locker)}</strong><small>${esc(coState.locker)}</small></span><button class="btn btn-ghost btn-sm" type="button" data-locker-open>Csere</button></div>`
        : `<button class="btn btn-primary btn-block locker-btn" type="button" data-locker-open>${ICON.pin}Automata kiválasztása térképen</button>`}
      <p class="hint">Foxpost és Packeta Z-BOX automaták és átvevőpontok. Más szolgáltató automatáját alább kézzel is megadhatod.</p>
    </div>`;
  }

  let lockerMsg = null;
  function openLockerMap() {
    closeLockerMap();
    const box = document.createElement("div");
    box.className = "locker-modal";
    box.dataset.lockerModal = "";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", "Csomagautomata választó");
    box.innerHTML = `<div class="lm-card"><div class="lm-head"><strong>Válassz csomagautomatát</strong><button class="icon-btn" type="button" data-locker-close aria-label="Bezárás">${ICON.close}</button></div>
      <iframe src="https://cdn.foxpost.hu/apt-finder/v1/app/" title="Foxpost csomagautomata kereső" allow="geolocation" loading="eager"></iframe>
      <p class="lm-foot">Keress rá a címedre, majd kattints a „Kiválasztom” gombra.</p></div>`;
    document.body.appendChild(box);
    lock(true);
    box.addEventListener("click", e => { if (e.target === box || e.target.closest("[data-locker-close]")) closeLockerMap(); });
    lockerMsg = e => {
      if (e.origin !== "https://cdn.foxpost.hu") return;
      let apt = e.data;
      try { if (typeof apt === "string") apt = JSON.parse(apt); } catch { return; }
      if (!apt || typeof apt !== "object" || !(apt.place_id || apt.operator_id) || !apt.name) return;
      const brand = /z-?box|z-?pont|packeta/i.test(String(apt.variant || "")) ? `Packeta ${apt.variant}` : String(apt.variant || "FOXPOST");
      const addr = apt.address || [apt.zip, apt.city].filter(Boolean).join(" ") + (apt.street ? `, ${apt.street}` : "");
      coState.locker = `${brand} – ${apt.name}${addr ? `, ${addr}` : ""}`.slice(0, 230);
      coState.lockerId = String(apt.place_id || apt.operator_id).slice(0, 40);
      coState.lockerProvider = brand.slice(0, 30);
      saveCo();
      closeLockerMap();
      renderCheckout();
      toast(`Kiválasztva: ${apt.name}`);
    };
    window.addEventListener("message", lockerMsg);
    $("[data-locker-close]", box).focus();
  }
  function closeLockerMap() {
    const box = $("[data-locker-modal]");
    if (lockerMsg) { window.removeEventListener("message", lockerMsg); lockerMsg = null; }
    if (box) { box.remove(); if (!openDrawerEl && !searchOpen) lock(false); }
  }
  document.addEventListener("keydown", e => { if (e.key === "Escape" && $("[data-locker-modal]")) closeLockerMap(); });

  /* irányítószám → település (Magyar Posta adatok, MIT licenc: pbakondy/hu-postal-codes) */
  let zipData = null, zipLoading = null;
  const loadZips = () => zipData ? Promise.resolve(zipData) : (zipLoading = zipLoading || fetch(`/assets/data/zip.json?v=${encodeURIComponent(document.querySelector('script[src*="shop.js"]')?.src.split("v=")[1] || "1")}`).then(r => r.ok ? r.json() : {}).then(d => (zipData = d)).catch(() => ({})));
  async function zipFill(el) {
    const zip = el.value.replace(/\D/g, "");
    if (zip.length !== 4) return;
    const data = await loadZips();
    const cities = String(data[zip] || "").split("|").filter(Boolean);
    const target = document.getElementById(`co-${el.dataset.zipFor}`);
    let dl = $("#zip-city-list");
    if (!dl) { dl = document.createElement("datalist"); dl.id = "zip-city-list"; document.body.appendChild(dl); }
    dl.innerHTML = cities.map(c => `<option value="${esc(c)}">`).join("");
    if (!target || !cities.length) return;
    if (!target.value.trim() || target.dataset.auto === "1" || !cities.includes(target.value.trim())) {
      target.value = cities[0];
      target.dataset.auto = "1";
      coState[el.dataset.zipFor] = cities[0];
      saveCo();
      target.setAttribute("aria-invalid", "false");
      const er = $(`[data-err="${el.dataset.zipFor}"]`); if (er) er.hidden = true;
    }
  }

  /* a szerver jelezte, hogy közben elfogyott: a kosarat a valós készlethez igazítjuk */
  function stockConflict(data) {
    if (!data || !data.productId || typeof data.left !== "number") return;
    if (data.left > 0) cart.set(data.productId, data.left); else cart.remove(data.productId);
    N.load({ fresh: true });
  }

  /* ---------------- termékoldal: adatok, értesítő, vélemények ---------------- */
  function specsHTML(p) {
    const rows = [
      p.set ? ["Szett", p.set] : null,
      p.cardNo ? ["Kártyaszám", p.cardNo] : null,
      p.rarity ? ["Ritkaság", p.rarity, "ritkasagi-jelek-es-lapfajtak"] : null,
      p.condition ? ["Állapot", (N.CONDITIONS.find(c => c.value === p.condition) || {}).label, "kartyaallapotok-nm-lp-mp-hp-dmg"] : null,
      p.lang ? ["Nyelv", langLabel(p.lang), "japan-angol-koreai-kartyak"] : null,
      p.grade ? ["Értékelés (grading)", p.grade, "grading-psa-cgc-bgs"] : null,
      p.releaseDate ? ["Megjelenés", N.fmtDate(p.releaseDate)] : null
    ].filter(Boolean);
    if (rows.length < 2 && !p.condition) return "";
    const guides = new Set(publishedPosts(N.settings()).map(x => x.slug));
    return `<dl class="specs">${rows.map(([k, v, g]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}${g && guides.has(g) ? ` <a class="spec-help" href="/blog/${g}">Mit jelent?</a>` : ""}</dd></div>`).join("")}</dl>`;
  }

  const notifyForms = new Map();
  function notifyForm(p) {
    if (notifyForms.has(p.id)) return notifyForms.get(p.id);
    const f = document.createElement("form");
    f.className = "notify-box";
    f.noValidate = true;
    f.innerHTML = `<strong>${ICON.bell}${esc(t("notify.title"))}</strong><p>${esc(N.isSoon(p) ? "Szólunk, amint rendelhető lesz." : t("notify.text"))}</p>
      <div class="nf-row"><label class="sr-only" for="nf-${p.id}">E-mail cím</label><input class="input" id="nf-${p.id}" type="email" name="email" autocomplete="email" inputmode="email" placeholder="E-mail címed" required><button class="btn btn-primary" type="submit">Kérem az értesítést</button></div>
      <div class="hp" aria-hidden="true"><input name="website" tabindex="-1" autocomplete="off"></div><p class="nf-msg" role="status"></p>`;
    f.addEventListener("submit", async e => {
      e.preventDefault();
      const msg = $(".nf-msg", f), email = f.email.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { msg.textContent = "Adj meg érvényes e-mail címet."; f.email.focus(); return; }
      const btn = $("button", f); btn.disabled = true;
      try {
        const res = await fetch("/api/notify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, productId: p.id, website: f.website.value }) });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(d.error || "");
        f.innerHTML = `<strong>${ICON.check}${esc(t("notify.ok"))}</strong>`;
      } catch (err) { msg.textContent = err.message || "Most nem sikerült. Próbáld újra később."; btn.disabled = false; }
    });
    notifyForms.set(p.id, f);
    return f;
  }

  const revState = { id: 0, data: null, loading: false, open: false };
  function renderReviews(p) {
    const box = $("[data-reviews]");
    if (!box) return;
    const on = !!N.live.features?.db;
    box.hidden = !on;
    if (!on) return;
    if (revState.id !== p.id) { revState.id = p.id; revState.data = null; revState.open = false; box.innerHTML = ""; delete box.dataset.painted; }
    if (!revState.data && !revState.loading) {
      revState.loading = true;
      fetch(`/api/reviews?product=${p.id}`).then(r => r.ok ? r.json() : { reviews: [] }).catch(() => ({ reviews: [] })).then(d => {
        revState.loading = false; revState.data = d; paintReviews(p);
        /* e-mailes „Értékelem” link: a vélemények betöltése után odagörgetünk, és megnyitjuk az űrlapot */
        if (location.hash === "#velemenyek") requestAnimationFrame(() => { box.scrollIntoView({ block: "start" }); box.querySelector("[data-rev-write]")?.click(); });
      });
      return;
    }
    if (revState.data && !box.dataset.painted) paintReviews(p);
  }
  function paintReviews(p) {
    const box = $("[data-reviews]");
    const d = revState.data || { reviews: [] };
    if (!box) return;
    box.dataset.painted = "1";
    const list = d.reviews || [];
    const dist = [5, 4, 3, 2, 1].map(n => ({ n, c: list.filter(r => r.rating === n).length }));
    box.innerHTML = `
      <div class="sec-head"><div><h2 class="display" id="velemenyek">${esc(t("rev.title"))}</h2>${list.length ? `<p>${starsHTML(d.avg, "stars lg")} <b>${Number(d.avg).toLocaleString("hu-HU")}</b> / 5 · ${list.length} vélemény</p>` : ""}</div><button class="btn btn-ghost" type="button" data-rev-write aria-expanded="${revState.open}">${esc(t("rev.write"))}</button></div>
      <div class="rev-layout">
        ${list.length ? `<div class="rev-dist">${dist.map(x => `<div><span>${x.n}★</span><i><b style="width:${list.length ? x.c / list.length * 100 : 0}%"></b></i><small>${x.c}</small></div>`).join("")}</div>` : ""}
        <div class="rev-list">${list.length ? list.slice(0, 12).map(r => `<article class="rev">
          <header>${starsHTML(r.rating)}<strong>${esc(r.name)}</strong>${r.verified ? `<span class="verified">${ICON.check}Ellenőrzött vásárlás</span>` : ""}<time>${esc(new Date(r.date).toLocaleDateString("hu-HU"))}</time></header>
          ${r.title ? `<h3>${esc(r.title)}</h3>` : ""}<p>${esc(r.body)}</p>${r.reply ? `<div class="rev-reply"><b>NS Card:</b> ${esc(r.reply)}</div>` : ""}</article>`).join("") : `<p class="muted">${esc(t("rev.empty"))}</p>`}</div>
      </div>
      <form class="panel rev-form" data-rev-form ${revState.open ? "" : "hidden"} novalidate>
        <div class="field"><span class="label" id="rf-r">Értékelés</span><div class="star-pick" role="radiogroup" aria-labelledby="rf-r">${[1, 2, 3, 4, 5].map(n => `<label><input type="radio" name="rating" value="${n}"><span aria-hidden="true">★</span><span class="sr-only">${n} csillag</span></label>`).join("")}</div></div>
        <div class="form-grid">
          <div class="field"><label for="rf-name">Neved (megjelenik)</label><input class="input" id="rf-name" name="name" maxlength="60" autocomplete="given-name" required></div>
          <div class="field"><label for="rf-title">Cím (nem kötelező)</label><input class="input" id="rf-title" name="title" maxlength="100"></div>
          <div class="field full"><label for="rf-body">Véleményed</label><textarea class="textarea" id="rf-body" name="body" rows="4" maxlength="1500" required placeholder="Milyen volt a termék, a csomagolás, a szállítás?"></textarea></div>
          <div class="field"><label for="rf-email">E-mail (nem jelenik meg)</label><input class="input" id="rf-email" name="email" type="email" autocomplete="email"></div>
          <div class="field"><label for="rf-order">Rendelésszám (nem kötelező)</label><input class="input" id="rf-order" name="orderId" placeholder="NSC-…" value="${esc(N.store.get(N.KEYS.lastOrder)?.id || "")}"><span class="hint">Az e-mail és a rendelésszám egyezésekor „Ellenőrzött vásárlás” jelölést kap.</span></div>
        </div>
        <div class="hp" aria-hidden="true"><input name="website" tabindex="-1" autocomplete="off"></div>
        <p class="form-msg" data-rev-msg role="status"></p>
        <button class="btn btn-primary" type="submit">Vélemény elküldése</button>
      </form>`;
    const f = $("[data-rev-form]", box);
    f.addEventListener("submit", async e => {
      e.preventDefault();
      const msg = $("[data-rev-msg]", f);
      const body = { productId: p.id, rating: Number(f.rating.value), name: f.name.value, title: f.title.value, body: f.body.value, email: f.email.value, orderId: f.orderId.value, website: f.website.value };
      if (!body.rating) { msg.textContent = "Válassz 1–5 csillagot."; return; }
      const btn = $('button[type="submit"]', f); btn.disabled = true;
      try {
        const res = await fetch("/api/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(d.error || "");
        f.innerHTML = `<p class="notice success">${esc(t("rev.thanks"))}</p>`;
      } catch (err) { msg.textContent = err.message || "Most nem sikerült elküldeni. Próbáld újra később."; btn.disabled = false; }
    });
    $("[data-rev-write]", box).addEventListener("click", e => {
      revState.open = !f.hidden ? false : true;
      f.hidden = !revState.open;
      e.currentTarget.setAttribute("aria-expanded", String(revState.open));
      if (revState.open) f.querySelector("input[name=rating]")?.focus();
    });
  }

  /* ---------------- kezdőlap: megjelenések, vélemények, cikkek, hírlevél ---------------- */
  function renderReleases(list, s) {
    const box = $("[data-releases]");
    if (!box) return;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const start = new Date(today - 14 * 864e5).toISOString().slice(0, 10);
    const used = new Set();
    const rows = (s.releases || []).filter(r => r.date.padEnd(10, "-31") >= start).map(r => {
      const p = r.productId ? N.byId(r.productId) : null;
      if (p) used.add(p.id);
      return { date: r.date, title: r.title, note: r.note, p };
    });
    list.filter(p => p.releaseDate && (N.isPreorder(p) || N.isSoon(p)) && !used.has(p.id) && p.releaseDate >= start)
      .forEach(p => rows.push({ date: p.releaseDate, title: p.name, note: p.set, p }));
    rows.sort((a, b) => a.date.localeCompare(b.date));
    const items = rows.slice(0, 8);
    box.innerHTML = items.map(r => {
      const m = r.date.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?/);
      const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3] || 1));
      const month = d.toLocaleDateString("hu-HU", { month: "short" }).replace(".", "");
      const past = d < today;
      const st = r.p ? (N.isPreorder(r.p) && N.isBuyable(r.p) ? `<span class="rel-st pre">Előrendelhető</span>` : N.isBuyable(r.p) ? `<span class="rel-st in">Kapható</span>` : `<span class="rel-st soon">Hamarosan</span>`) : past ? `<span class="rel-st">Megjelent</span>` : "";
      const inner = `<span class="rel-date${past ? " past" : ""}"><b>${m[3] ? Number(m[3]) : "–"}</b><small>${esc(month)}</small></span>
        ${r.p?.images[0] ? `<img src="${esc(imageUrl(r.p.images[0]))}" alt="" loading="lazy">` : `<span class="rel-ph" aria-hidden="true">${ICON.cal}</span>`}
        <span class="rel-txt"><strong>${esc(r.title)}</strong>${r.note ? `<small>${esc(r.note)}</small>` : ""}</span>${st}`;
      return r.p ? `<a class="rel" href="${productUrl(r.p)}">${inner}</a>` : `<div class="rel">${inner}</div>`;
    }).join("");
    showSection("releases", items.length > 0);
  }

  const homeRev = { loading: false, data: null };
  function renderHomeReviews() {
    const box = $("[data-home-reviews]");
    if (!box) return;
    if (!N.live.features?.db) { showSection("reviews", false); return; }
    if (!homeRev.data) {
      if (!homeRev.loading) {
        homeRev.loading = true;
        fetch("/api/reviews?latest=6").then(r => r.ok ? r.json() : null).catch(() => null).then(d => { homeRev.data = d || { reviews: [] }; renderHomeReviews(); });
      }
      showSection("reviews", false);
      return;
    }
    const list = homeRev.data.reviews || [];
    const head = $("[data-reviews-sub]");
    if (head && homeRev.data.count) head.textContent = t("reviews.text", { n: homeRev.data.count, avg: Number(homeRev.data.avg).toLocaleString("hu-HU") });
    box.innerHTML = list.map(r => {
      const p = N.byId(r.productId);
      return `<figure class="hrev">${starsHTML(r.rating)}<blockquote>${esc(r.body.length > 220 ? r.body.slice(0, 217) + "…" : r.body)}</blockquote><figcaption><strong>${esc(r.name)}</strong>${r.verified ? `<span class="verified">${ICON.check}Ellenőrzött vásárlás</span>` : ""}${p ? `<a href="${productUrl(p)}">${esc(p.name)}</a>` : ""}</figcaption></figure>`;
    }).join("");
    showSection("reviews", list.length > 0);
  }

  /* --- cikk kártyák: saját borító vagy automatikus, a címke színével és ikonjával --- */
  const readMins = x => Math.max(1, Math.round(String(x.body || "").replace(/\[\[[^\]]+\]\]/g, "").split(/\s+/).filter(Boolean).length / 200));
  const POST_ICONS = {
    guide: '<svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M8 10c6-3 11-3 16 1v28c-5-4-10-4-16-1V10Zm32 0c-6-3-11-3-16 1v28c5-4 10-4 16-1V10Z" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/></svg>',
    card: '<svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><rect x="13" y="6" width="22" height="32" rx="3" stroke="currentColor" stroke-width="3" transform="rotate(10 24 22)"/><rect x="9" y="10" width="22" height="32" rx="3" stroke="currentColor" stroke-width="3" fill="currentColor" fill-opacity=".12"/><circle cx="20" cy="24" r="5" stroke="currentColor" stroke-width="3"/></svg>',
    shield: '<svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M24 5 9 11v11c0 9 6.4 16.6 15 20 8.6-3.4 15-11 15-20V11L24 5Z" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><path d="m17 24 5 5 9-10" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    dice: '<svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><rect x="8" y="8" width="32" height="32" rx="7" stroke="currentColor" stroke-width="3"/><circle cx="17" cy="17" r="2.6" fill="currentColor"/><circle cx="31" cy="31" r="2.6" fill="currentColor"/><circle cx="24" cy="24" r="2.6" fill="currentColor"/><circle cx="31" cy="17" r="2.6" fill="currentColor"/><circle cx="17" cy="31" r="2.6" fill="currentColor"/></svg>',
    star: '<svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="m24 6 5.4 11 12.1 1.8-8.8 8.5 2.1 12L24 33.6 13.2 39.3l2.1-12-8.8-8.5 12.1-1.8L24 6Z" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/></svg>',
    gift: '<svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><rect x="7" y="17" width="34" height="8" rx="2" stroke="currentColor" stroke-width="3"/><path d="M10 25v16h28V25M24 17v24M24 17s-3-8-8-7-2 7 8 7Zm0 0s3-8 8-7 2 7-8 7Z" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/></svg>',
    cal: '<svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><rect x="7" y="10" width="34" height="30" rx="5" stroke="currentColor" stroke-width="3"/><path d="M7 20h34M16 6v8M32 6v8" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="m18 30 4 4 8-8" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    lens: '<svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><circle cx="21" cy="21" r="12" stroke="currentColor" stroke-width="3"/><path d="m30 30 10 10" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/></svg>'
  };
  function postIcon(x) {
    const k = norm(`${x.tag} ${x.slug}`);
    if (/hamis|eredeti/.test(k)) return POST_ICONS.lens;
    if (/ajandek/.test(k)) return POST_ICONS.gift;
    if (/elorendel|megjelen|naptar/.test(k)) return POST_ICONS.cal;
    if (/szabaly|jatek|kezdo/.test(k)) return POST_ICONS.dice;
    if (/tarol|vedo|sleeve/.test(k)) return POST_ICONS.shield;
    if (/ritka|grading|psa/.test(k)) return POST_ICONS.star;
    if (/single|allapot|kartya/.test(k)) return POST_ICONS.card;
    return POST_ICONS.guide;
  }
  const tagHue = tag => { let h = 0; for (const ch of String(tag || "cikk")) h = (h * 31 + ch.charCodeAt(0)) % 360; return h; };
  const autoCover = (x, big = false) => `<span class="auto-cover${big ? " big" : ""}" style="--h:${tagHue(x.tag)}" aria-hidden="true">${postIcon(x)}<b>${esc(x.tag || "Cikk")}</b></span>`;
  function postCard(x, big = false) {
    return `<a class="post-card${big ? " big" : ""}" href="/blog/${encodeURIComponent(x.slug)}">
      <span class="pc-cover">${x.cover ? `<img src="${esc(imageUrl(x.cover))}" alt="" loading="lazy">` : autoCover(x, big)}</span>
      <span class="pc-body">${x.tag ? `<em>${esc(x.tag)}</em>` : ""}<strong>${esc(x.title)}</strong>${x.excerpt ? `<small>${esc(x.excerpt)}</small>` : ""}<span class="pc-meta"><time>${esc(N.fmtDate(x.date))}</time><span>${readMins(x)} perc olvasás</span></span></span></a>`;
  }
  const publishedPosts = s => (s.posts || []).filter(x => x.published).sort((a, b) => b.date.localeCompare(a.date));
  function renderHomeBlog(s) {
    const box = $("[data-home-blog]");
    if (!box) return;
    const posts = publishedPosts(s).slice(0, 3);
    box.innerHTML = posts.map(x => postCard(x)).join("");
    showSection("blog", posts.length > 0);
  }

  function newsFormHTML(source, compact = false) {
    return `<form class="news-form${compact ? " compact" : ""}" data-news-form data-source="${esc(source)}" novalidate>
      <div class="nf-row"><label class="sr-only" for="nw-${source}">E-mail cím</label><input class="input" id="nw-${source}" type="email" name="email" autocomplete="email" inputmode="email" placeholder="E-mail címed" required><button class="btn btn-primary" type="submit">${esc(t("news.button"))}</button></div>
      <label class="check consent"><input type="checkbox" name="consent" required> <span>${esc(t("news.consent"))}${N.settings().pages?.adatkezeles ? ` <a href="/info?p=adatkezeles" target="_blank" rel="noopener">Adatkezelés</a>` : ""}</span></label>
      <div class="hp" aria-hidden="true"><input name="website" tabindex="-1" autocomplete="off"></div>
      <p class="nf-msg" role="status"></p></form>`;
  }
  document.addEventListener("submit", async e => {
    const f = e.target.closest?.("[data-news-form]");
    if (!f) return;
    e.preventDefault();
    const msg = $(".nf-msg", f);
    const email = f.email.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { msg.textContent = "Adj meg érvényes e-mail címet."; f.email.focus(); return; }
    if (!f.consent.checked) { msg.textContent = "A feliratkozáshoz pipáld be a hozzájárulást."; f.consent.focus(); return; }
    const btn = $('button[type="submit"]', f); btn.disabled = true;
    try {
      const res = await fetch("/api/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, consent: true, source: f.dataset.source, website: f.website.value }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "");
      f.innerHTML = `<p class="nf-done">${ICON.check}<span>${d.already ? "Már feliratkoztál, köszönjük!" : d.confirm ? `Majdnem kész! Küldtünk egy megerősítő levelet a(z) <strong>${esc(email)}</strong> címre – kattints benne a gombra. Ha nem látod, nézd meg a Spam vagy a Promóciók mappát.` : esc(t("news.okDirect"))}</span></p>`;
    } catch (err) { msg.textContent = err.message || "Most nem sikerült. Próbáld újra később."; btn.disabled = false; }
  });

  /* ---------------- cikkek ---------------- */
  const blogState = { tag: "", q: "" };
  function embedHTML(ids) {
    const list = ids.map(id => N.byId(id)).filter(Boolean);
    if (!list.length) return "";
    if (list.length === 1) {
      const p = list[0], st = N.stockInfo(p);
      return `<div class="post-prod"><a class="pp-img" href="${productUrl(p)}">${p.images[0] ? `<img src="${esc(imageUrl(p.images[0]))}" alt="" loading="lazy">` : ""}</a>
        <div class="pp-txt"><a href="${productUrl(p)}"><strong>${esc(p.name)}</strong></a><span class="stock stock-${st.key}">${esc(st.label)}</span><span class="price">${p.oldPrice ? `<s>${fmtFt(p.oldPrice)}</s>` : ""}<b>${fmtFt(p.price)}</b></span></div>
        ${N.isBuyable(p) ? `<button class="btn btn-primary btn-sm" type="button" data-add="${p.id}" aria-label="${esc(t("card.add"))}: ${esc(p.name)}">${ICON.cart}<span>${esc(t("card.add"))}</span></button>` : `<a class="btn btn-ghost btn-sm" href="${productUrl(p)}">${esc(t("card.details"))}</a>`}</div>`;
    }
    return `<div class="grid post-grid-prods">${list.map(cardHTML).join("")}</div>`;
  }
  function postHTML(x) {
    const embeds = [];
    const body = String(x.body || "").replace(/^\s*\[\[termek(?:ek)?:([\d,\s]+)\]\]\s*$/gm, (m, ids) => { embeds.push(ids.split(",").map(Number).filter(Boolean)); return `%%EMBED${embeds.length - 1}%%`; });
    return faqify(N.mdToHtml(body).replace(/<p>%%EMBED(\d+)%%<\/p>/g, (m, i) => embedHTML(embeds[Number(i)] || [])));
  }
  /* A „Gyakori kérdések” fejezet ### kérdései lenyitható sorok lesznek */
  function faqify(html) {
    return html.replace(/(<h2 id="gyakori-kerdesek[^"]*">[\s\S]*?<\/h2>)([\s\S]*?)(?=<h2 |$)/, (m, h, rest) => {
      const items = rest.split(/(?=<h3 )/).map(pt => {
        const q = pt.match(/^<h3 id="([^"]+)">([\s\S]*?)<\/h3>([\s\S]*)$/);
        return q ? `<details class="faq-item" id="${q[1]}"><summary>${q[2]}</summary><div class="faq-a">${q[3]}</div></details>` : pt;
      }).join("");
      return `${h}<div class="faq-list">${items}</div>`;
    });
  }
  function relatedFor(x) {
    const picked = (x.products || []).map(id => N.byId(id)).filter(Boolean);
    if (picked.length) return picked.slice(0, 4);
    const words = norm(`${x.title} ${x.tag}`).split(/\W+/).filter(w => w.length > 3);
    return N.products().filter(p => N.isBuyable(p) && words.some(w => norm(`${p.name} ${N.categoryLabel(p.category)}`).includes(w))).slice(0, 4);
  }
  function renderBlog() {
    const box = $("[data-blog]");
    if (!box) return;
    const s = N.settings();
    const posts = publishedPosts(s);
    const slug = decodeURIComponent((location.pathname.match(/^\/blog\/([^/?#]+)/) || [])[1] || "");
    const title = $("[data-blog-title]"), crumb = $("[data-blog-crumb]");
    document.body.classList.toggle("is-article", !!slug);
    if (!slug) {
      document.title = `${t("blog.page")} – NS Card`;
      if (title) title.textContent = t("blog.page");
      if (crumb) crumb.innerHTML = `<li><a href="/">${esc(t("nav.home"))}</a></li><li aria-current="page">${esc(t("blog.page"))}</li>`;
      if (!posts.length) { box.innerHTML = emptyHTML("Még nincs cikk", "Hamarosan jönnek az első útmutatók.", `<a class="btn btn-primary" href="/products">${esc(t("hero.cta"))}</a>`); return; }
      const tags = [...new Set(posts.map(x => x.tag).filter(Boolean))];
      const list = posts.filter(x => (!blogState.tag || x.tag === blogState.tag) && (!blogState.q || norm(`${x.title} ${x.excerpt} ${x.tag} ${x.body}`).includes(norm(blogState.q))));
      const focus = document.activeElement?.id === "blog-q";
      box.innerHTML = `
        <p class="blog-lead">${esc(t("blog.text"))}</p>
        <div class="blog-tools">
          <div class="chips" role="group" aria-label="Témák"><button class="chip" type="button" data-blog-tag="" aria-pressed="${!blogState.tag}">Mind <span>${posts.length}</span></button>${tags.map(tg => `<button class="chip" type="button" data-blog-tag="${esc(tg)}" aria-pressed="${blogState.tag === tg}">${esc(tg)} <span>${posts.filter(x => x.tag === tg).length}</span></button>`).join("")}</div>
          <label class="blog-search"><span class="sr-only">Keresés a cikkekben</span>${ICON.search || ""}<input class="input" id="blog-q" type="search" placeholder="Keresés a cikkekben" value="${esc(blogState.q)}" data-blog-q></label>
        </div>
        ${list.length ? `<div class="post-grid">${list.map((x, i) => postCard(x, i === 0 && !blogState.tag && !blogState.q)).join("")}</div>` : `<div class="empty"><strong>Nincs találat</strong><span>Próbálj más kulcsszót.</span></div>`}`;
      if (focus) { const q = $("#blog-q"); q?.focus(); q?.setSelectionRange(q.value.length, q.value.length); }
      return;
    }
    const x = posts.find(y => y.slug === slug);
    if (!x) {
      if (N.data && N.data.source !== "cache") box.innerHTML = emptyHTML("A cikk nem található", "Lehet, hogy átneveztük vagy lekerült.", '<a class="btn btn-primary" href="/blog">Összes cikk</a>');
      return;
    }
    document.title = `${x.title} – NS Card`;
    if (title) title.textContent = x.title;
    if (crumb) crumb.innerHTML = `<li><a href="/">${esc(t("nav.home"))}</a></li><li><a href="/blog">${esc(t("blog.page"))}</a></li><li aria-current="page">${esc(x.title)}</li>`;
    const i = posts.indexOf(x);
    const newer = posts[i - 1], older = posts[i + 1];
    const more = posts.filter(y => y.slug !== x.slug && (y.tag === x.tag)).concat(posts.filter(y => y.slug !== x.slug && y.tag !== x.tag)).slice(0, 3);
    const rel = relatedFor(x);
    const body = postHTML(x);
    const heads = [...body.matchAll(/<h2 id="([^"]+)">(.*?)<\/h2>/g)].map(m => ({ id: m[1], text: m[2].replace(/<[^>]+>/g, "") }));
    const toc = heads.length >= 3 ? `<ol>${heads.map(h => `<li><a href="#${h.id}">${h.text}</a></li>`).join("")}</ol>` : "";
    box.innerHTML = `
      <div class="post-head">
        <p class="post-meta">${x.tag ? `<a class="post-tag" href="/blog" data-blog-goto="${esc(x.tag)}">${esc(x.tag)}</a>` : ""}<time datetime="${esc(x.date)}">${esc(N.fmtDate(x.date))}</time><span>${readMins(x)} perc olvasás</span></p>
        ${x.excerpt ? `<p class="post-lead">${esc(x.excerpt)}</p>` : ""}
      </div>
      <div class="post-banner">${x.cover ? `<img src="${esc(imageUrl(x.cover))}" alt="">` : autoCover(x, true)}</div>
      <div class="post-layout${toc || rel.length ? "" : " single"}">
        <article class="post panel prose">
          ${toc ? `<details class="toc toc-m"><summary>Tartalom</summary>${toc}</details>` : ""}
          ${body}
          <div class="post-share"><button class="btn btn-ghost btn-sm" type="button" data-share-post>${ICON.share}Megosztás</button><a class="btn btn-primary btn-sm" href="/products">${esc(t("hero.cta"))}</a></div>
        </article>
        ${toc || rel.length ? `<aside class="post-aside">
          ${toc ? `<nav class="toc toc-d panel" aria-label="Tartalom"><h2>Tartalom</h2>${toc}</nav>` : ""}
          ${rel.length ? `<div class="aside-prods panel"><h2>Kapcsolódó termékek</h2>${rel.map(p => `<a class="ap" href="${productUrl(p)}">${p.images[0] ? `<img src="${esc(imageUrl(p.images[0]))}" alt="" loading="lazy">` : "<span></span>"}<span><b>${esc(p.name)}</b><small>${fmtFt(p.price)} · ${esc(N.stockInfo(p).label)}</small></span></a>`).join("")}</div>` : ""}
        </aside>` : ""}
      </div>
      ${newer || older ? `<nav class="post-nav" aria-label="Szomszédos cikkek">${older ? `<a href="/blog/${encodeURIComponent(older.slug)}"><small>Előző cikk</small><b>${esc(older.title)}</b></a>` : "<span></span>"}${newer ? `<a class="next" href="/blog/${encodeURIComponent(newer.slug)}"><small>Következő cikk</small><b>${esc(newer.title)}</b></a>` : ""}</nav>` : ""}
      ${more.length ? `<section class="section-tight"><div class="sec-head"><h2 class="display">Ezek is érdekelhetnek</h2><a class="link-more" href="/blog">Összes cikk${ICON.arrow}</a></div><div class="post-grid">${more.map(y => postCard(y)).join("")}</div></section>` : ""}`;
    $("[data-share-post]", box)?.addEventListener("click", () => {
      const data = { title: x.title, url: location.href };
      if (navigator.share) navigator.share(data).catch(() => {});
      else navigator.clipboard?.writeText(location.href).then(() => toast("A cikk linkje a vágólapra került."), () => toast(location.href));
    });
    if (location.hash) requestAnimationFrame(() => document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView());
  }
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-blog-tag], [data-blog-goto]");
    if (!b) return;
    if (b.matches("[data-blog-goto]")) { e.preventDefault(); location.href = `/blog?tema=${encodeURIComponent(b.dataset.blogGoto)}`; return; }
    blogState.tag = b.dataset.blogTag; renderBlog();
  });
  document.addEventListener("input", e => { if (e.target.matches("[data-blog-q]")) { blogState.q = e.target.value; renderBlog(); } });
  if (page === "blog") {
    const tg = new URLSearchParams(location.search).get("tema");
    if (tg) blogState.tag = tg;
    const bar = document.createElement("div");
    bar.className = "read-progress"; bar.setAttribute("aria-hidden", "true");
    document.body.appendChild(bar);
    let tk = false;
    window.addEventListener("scroll", () => {
      if (tk) return; tk = true;
      requestAnimationFrame(() => {
        const a = $(".post");
        if (a && document.body.classList.contains("is-article")) { const r = a.getBoundingClientRect(); bar.style.transform = `scaleX(${Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - innerHeight)))})`; }
        else bar.style.transform = "scaleX(0)";
        tk = false;
      });
    }, { passive: true });
  }

  /* Cloudflare Web Analytics (ha az adminban token van megadva; a Pages beépített elemzése enélkül is működik) */
  function analytics(s) {
    if (!s.analyticsToken || N.previewMode || document.querySelector("script[data-cf-beacon]")) return;
    const sc = document.createElement("script");
    sc.defer = true;
    sc.src = "https://static.cloudflareinsights.com/beacon.min.js";
    sc.setAttribute("data-cf-beacon", JSON.stringify({ token: s.analyticsToken }));
    document.head.appendChild(sc);
  }

  /* ---------------- rendelés követése ---------------- */
  const TRACK_STEPS = [["new", "Leadva"], ["paid", "Fizetve"], ["packed", "Csomagolva"], ["shipped", "Feladva"], ["done", "Kézbesítve"]];
  function trackHTML(o) {
    const order = ["new", "pending_payment", "paid", "packed", "shipped", "done"];
    const at = Math.max(0, order.indexOf(o.status));
    const when = st => o.history.slice().reverse().find(h => h.status === st)?.at;
    const steps = TRACK_STEPS.filter(([k]) => !(k === "paid" && o.pay && /utánvét/i.test(o.pay)));
    const done = k => o.status !== "cancelled" && (order.indexOf(k) <= at || (k === "paid" && o.paid));
    return `<div class="track panel">
      <div class="track-head"><div><p class="muted">Rendelésszám</p><p class="order-id">${esc(o.id)}</p></div><div class="track-total"><span class="muted">${esc(o.pay)}</span><strong>${fmtFt(o.total)}</strong></div></div>
      ${o.status === "cancelled" ? `<div class="notice error"><strong>A rendelést lemondtuk.</strong> Ha kérdésed van, írj nekünk.</div>` : `<ol class="track-steps">${steps.map(([k, l]) => `<li class="${done(k) ? "on" : ""}${o.status === k || (k === "new" && o.status === "pending_payment") ? " cur" : ""}"><b>${esc(l)}</b><small>${when(k) ? esc(new Date(when(k)).toLocaleString("hu-HU", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })) : ""}</small></li>`).join("")}</ol>`}
      ${o.status === "pending_payment" ? `<div class="notice">A kártyás fizetés még nem fejeződött be.</div>` : ""}
      ${o.tracking ? `<div class="track-ship">${ICON.truck}<span><strong>${esc(o.carrier || "Csomagkövetés")}</strong><small>${esc(o.tracking)}</small></span>${o.trackingUrl ? `<a class="btn btn-primary btn-sm" href="${esc(o.trackingUrl)}" target="_blank" rel="noopener">Csomag követése</a>` : ""}</div>` : ""}
      ${o.locker ? `<p class="muted">${ICON.pin} ${esc(o.locker)}</p>` : `<p class="muted">${esc(o.method)}</p>`}
      ${o.preorder ? `<div class="notice pre-note">${ICON.cal}<span>Előrendelést tartalmaz: a megjelenés után küldjük.</span></div>` : ""}
      <div class="order-sum">${o.lines.map(l => `<div class="sum-row"><span>${esc(l.name)} × ${l.qty}${l.preorder && l.releaseDate ? ` <small class="muted">· ${esc(N.fmtDate(l.releaseDate))}</small>` : ""}</span><strong>${fmtFt(l.qty * l.price)}</strong></div>`).join("")}${o.gift ? `<div class="sum-row"><span>${ICON.gift} Ajándékcsomagolás</span><span></span></div>` : ""}</div>
    </div>`;
  }
  async function renderTrack() {
    const box = $("[data-track-page]");
    if (!box) return;
    if (box.dataset.ready) return;
    box.dataset.ready = "1";
    const u = new URLSearchParams(location.search);
    const last = N.store.get(N.KEYS.lastOrder);
    const show = async (req) => {
      const res = $("[data-track-result]", box);
      res.innerHTML = '<p class="muted">Keresés…</p>';
      try {
        const r = await req;
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error || "");
        res.innerHTML = trackHTML(d.order);
      } catch (err) { res.innerHTML = `<div class="notice error">${esc(err.message || "Most nem sikerült lekérdezni. Próbáld újra később.")}</div>`; }
    };
    box.innerHTML = `<form class="panel track-form" data-track-form novalidate>
        <p class="muted">Add meg a rendelésszámot (a visszaigazoló e-mailben találod) és a rendeléskor megadott e-mail címet.</p>
        <div class="form-grid">
          <div class="field"><label for="tr-id">Rendelésszám</label><input class="input" id="tr-id" name="id" placeholder="NSC-261124-1234" autocapitalize="characters" spellcheck="false" value="${esc(u.get("id") || last?.id || "")}" required></div>
          <div class="field"><label for="tr-email">E-mail cím</label><input class="input" id="tr-email" name="email" type="email" autocomplete="email" inputmode="email" required></div>
        </div>
        <button class="btn btn-primary" type="submit">Állapot megtekintése</button>
      </form><div data-track-result aria-live="polite"></div>`;
    const f = $("[data-track-form]", box);
    f.addEventListener("submit", e => {
      e.preventDefault();
      const id = f.id.value.trim().toUpperCase(), email = f.email.value.trim();
      if (!/^NSC-\d{6}-\d{4}$/.test(id)) { toast("A rendelésszám formátuma: NSC-261124-1234"); f.id.focus(); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast("Adj meg érvényes e-mail címet."); f.email.focus(); return; }
      show(fetch("/api/order-status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, email }) }));
    });
    const id = u.get("id") || (last?.token ? last.id : "");
    const tok = u.get("t") || (u.get("id") && u.get("id") !== last?.id ? "" : last?.token || "");
    if (id && tok) {
      show(fetch(`/api/order-status?id=${encodeURIComponent(id)}&t=${encodeURIComponent(tok)}`));
      if (u.get("t")) history.replaceState(null, "", `${location.pathname}?id=${encodeURIComponent(id)}`);
      if (u.get("t") && (!last || last.id !== id)) N.store.set(N.KEYS.lastOrder, { id, token: tok, at: Date.now() });
    }
  }

  /* ---------------- tájékoztató oldalak ---------------- */
  function renderInfo() {
    const body = $("[data-info-body]");
    if (!body) return;
    const s = N.settings();
    const pages = s.pages || {};
    const key = new URLSearchParams(location.search).get("p") || "aszf";
    const hasCompany = !!(s.companyName || s.email || s.phone);
    const list = N.INFO_PAGES.filter(pg => pages[pg.key]).map(pg => ({ key: pg.key, label: pg.label }));
    if (hasCompany) list.push({ key: "impresszum", label: t("info.impresszum") });
    const nav = $("[data-info-nav]");
    if (nav) nav.innerHTML = list.map(x => `<a href="/info?p=${x.key}"${x.key === key ? ' aria-current="page"' : ""}>${esc(x.label)}</a>`).join("");
    let title, html;
    if (key === "impresszum") {
      title = t("info.impresszum");
      const row = (k, v) => v ? `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>` : "";
      html = `<dl>${row("Webshop", s.shopName)}${row("Üzemeltető", s.companyName)}${row("Székhely", s.companyAddress)}${row("Adószám", s.taxNumber)}${row("Cégjegyzékszám / nyilvántartási szám", s.regNumber)}${row("E-mail", s.email)}${row("Telefon", s.phone)}${row("Tárhelyszolgáltató", "Cloudflare, Inc. – 101 Townsend St, San Francisco, CA 94107, USA – cloudflare.com")}</dl>`;
    } else {
      const meta = N.INFO_PAGES.find(pg => pg.key === key);
      title = meta?.label || "Információk";
      html = pages[key] ? N.mdToHtml(pages[key].body) : `<p class="muted">${esc(t("info.missing"))}</p>`;
    }
    document.title = `${title} – NS Card`;
    $("[data-info-title]").textContent = title;
    $("[data-info-crumb]").textContent = title;
    body.innerHTML = html;
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
        el.innerHTML = `<strong>Sikeres fizetés.</strong> Köszönjük${d.customer_name ? `, ${esc(d.customer_name)}` : ""}! A ${fmtFt(d.amount_total)} összegű rendelésről ${d.email ? `a(z) <strong>${esc(d.email)}</strong> címre ` : ""}küldünk visszaigazolást.`;
        if (d.items?.length) {
          const box = document.createElement("div");
          box.className = "order-sum";
          box.innerHTML = `<p class="muted">Rendelés azonosító: <strong>${esc(d.order || "")}</strong>${d.shipping ? ` · ${esc(d.shipping)}` : ""}</p>
            ${d.items.map(x => `<div class="sum-row"><span>${esc(x.name)} × ${x.qty}</span><strong>${fmtFt(x.total)}</strong></div>`).join("")}
            ${d.discount ? `<div class="sum-row discount"><span>Kedvezmény${d.coupon ? ` (${esc(d.coupon)})` : ""}</span><strong>−${fmtFt(d.discount)}</strong></div>` : ""}
            <div class="sum-row total"><span>Fizetve</span><strong>${fmtFt(d.amount_total)}</strong></div>
            ${d.token ? `<a class="btn btn-ghost" href="/rendeles?id=${encodeURIComponent(d.order)}&t=${encodeURIComponent(d.token)}">Rendelés követése</a>` : ""}`;
          el.after(box);
        }
      } else {
        el.textContent = `A fizetés még feldolgozás alatt áll (${d.payment_status || d.status}).`;
      }
    } catch {
      el.className = "notice error";
      el.textContent = "A fizetés állapotát most nem sikerült lekérdezni. Ha a kártyádat megterheltük, a visszaigazolást e-mailben küldjük.";
    }
  }

  /* ---------------- indulás ---------------- */
  /* mobil nézet (rács / lista) – a vásárló saját választása felülírja az alapbeállítást */
  const VIEW_KEY = "nsc.view.v1";
  function applyViewPref() {
    const v = N.store.get(VIEW_KEY);
    if (v === "1" || v === "2") { root.style.setProperty("--cols-m", v); root.setAttribute("data-cols-m", v); }
  }
  let installEvt = null;
  window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); installEvt = e; renderChrome(); });

  function renderPage() {
    const s = N.settings();
    N.applyTheme(s.theme, undefined, !N.previewMode);
    applyViewPref();
    cart.prune();
    applyTexts();
    renderChrome();
    if (page === "home") renderHome();
    else if (page === "products") renderList();
    else if (page === "product") renderProduct();
    else if (page === "checkout") renderCheckout();
    else if (page === "info") renderInfo();
    else if (page === "blog") renderBlog();
    else if (page === "track") renderTrack();
    analytics(s);
    if (openDrawerEl?.matches("[data-cart]")) renderCart();
    if (searchOpen) renderSheet();
    updateCount(false);
    revealScan();
  }

  bindChrome();
  bindMega();
  {
    const tt = $("[data-to-top]");
    let ticking = false;
    window.addEventListener("scroll", () => {
      if (ticking || !tt) return;
      ticking = true;
      requestAnimationFrame(() => { tt.classList.toggle("show", scrollY > innerHeight * 1.4); ticking = false; });
    }, { passive: true });
  }
  if ("serviceWorker" in navigator && window.parent === window && !/^(localhost|127\.)/.test(location.hostname)) {
    window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
  }
  bindTilt();
  if (page === "home") bindHome();
  if (page === "products") bindList();
  if (page === "product") bindProduct();
  if (page === "checkout") bindCheckout();
  if (page === "success") renderSuccess();
  {
    const hl = new URLSearchParams(location.search).get("hirlevel");
    if (hl) {
      setTimeout(() => toast(hl === "ok" ? "Feliratkozás megerősítve! Küldtünk egy üdvözlő levelet." : hl === "leiratkozva" ? "Leiratkoztál a hírlevélről." : "Ez a link már nem érvényes."), 400);
      history.replaceState(null, "", location.pathname);
    }
  }

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
