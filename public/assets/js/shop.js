/* NS Card – webshop felület */
(() => {
  "use strict";
  const N = window.NSC;
  if (!N) return;
  const { esc, fmtFt, imageUrl, cart } = N;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const page = document.body.dataset.page;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const SOCIAL = {
    instagram: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="2"/><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
    tiktok: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5M14 3c.5 3 2.5 5 5.5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
  };
  const ICON = {
    cart: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 4h2l2.2 10.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.5L20.5 8H6.2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="10" cy="20" r="1.5" fill="currentColor"/><circle cx="17" cy="20" r="1.5" fill="currentColor"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="2"/><path d="m4 7 8 6 8-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>'
  };

  /* ---------------- közös elemek ---------------- */
  let toastTimer = 0;
  function toast(message, action) {
    const el = $("[data-toast]");
    if (!el) return;
    el.innerHTML = `<span>${esc(message)}</span>${action ? `<a href="#" data-toast-action>${esc(action.label)}</a>` : ""}`;
    el.classList.add("show");
    if (action) $("[data-toast-action]", el).addEventListener("click", e => { e.preventDefault(); el.classList.remove("show"); action.run(); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 3200);
  }

  const scrim = () => $("[data-scrim]");
  let openDrawerEl = null;
  let lastFocus = null;
  function openDrawer(el) {
    if (!el) return;
    closeDrawer(true);
    lastFocus = document.activeElement;
    openDrawerEl = el;
    el.classList.add("open");
    scrim()?.classList.add("open");
    document.body.classList.add("lock");
    $$(`[aria-controls="${el.id}"]`).forEach(b => b.setAttribute("aria-expanded", "true"));
    setTimeout(() => $("[data-close]", el)?.focus(), 50);
  }
  function closeDrawer(silent) {
    if (!openDrawerEl) return;
    $$(`[aria-controls="${openDrawerEl.id}"]`).forEach(b => b.setAttribute("aria-expanded", "false"));
    openDrawerEl.classList.remove("open");
    openDrawerEl = null;
    scrim()?.classList.remove("open");
    closeFilters();
    document.body.classList.remove("lock");
    if (!silent && lastFocus?.focus) lastFocus.focus();
  }
  const openCart = () => { renderCart(); openDrawer($("[data-cart]")); };

  function closeFilters() {
    const f = $("[data-filters]");
    if (f?.classList.contains("open")) {
      f.classList.remove("open");
      if (!openDrawerEl) { scrim()?.classList.remove("open"); document.body.classList.remove("lock"); }
    }
  }

  /* ---------------- termékkártya ---------------- */
  function tagsHTML(p) {
    const t = [];
    if (N.isSoon(p)) t.push('<span class="tag tag-soon">Hamarosan</span>');
    if (p.oldPrice) t.push(`<span class="tag tag-sale">−${N.discount(p)}%</span>`);
    else if (p.flags.includes("sale")) t.push('<span class="tag tag-sale">Akció</span>');
    if (p.flags.includes("new")) t.push('<span class="tag tag-new">Új</span>');
    if (p.flags.includes("rare")) t.push('<span class="tag tag-rare">Ritka</span>');
    if (p.badge) t.push(`<span class="tag">${esc(p.badge)}</span>`);
    return t.slice(0, 3).join("");
  }

  const productUrl = p => `/product?id=${p.id}`;

  function cardHTML(p) {
    const st = N.stockInfo(p);
    const buyable = N.isBuyable(p);
    const img = imageUrl(p.images[0]);
    return `
      <article class="pcard">
        <div class="pcard-media">
          <div class="tags">${tagsHTML(p)}</div>
          ${img ? `<img src="${esc(img)}" alt="" loading="lazy" decoding="async">` : ""}
        </div>
        <div class="pcard-body">
          <p class="pcard-cat">${esc(N.categoryLabel(p.category))}</p>
          <h3><a href="${productUrl(p)}">${esc(p.name)}</a></h3>
          <span class="stock stock-${st.key}">${esc(st.label)}</span>
          <div class="pcard-buy">
            <div class="price">${p.oldPrice ? `<s>${fmtFt(p.oldPrice)}</s>` : ""}<strong>${fmtFt(p.price)}</strong></div>
            ${buyable
              ? `<button class="btn btn-primary btn-sm add" type="button" data-add="${p.id}" aria-label="Kosárba: ${esc(p.name)}">${ICON.cart}Kosárba</button>`
              : `<a class="btn btn-ghost btn-sm add" href="${productUrl(p)}">Részletek</a>`}
          </div>
        </div>
      </article>`;
  }

  const emptyHTML = (title, text, cta) => `<div class="empty" style="grid-column:1/-1"><strong>${esc(title)}</strong><span>${esc(text)}</span>${cta || ""}</div>`;

  /* ---------------- kosár fiók ---------------- */
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
      body.innerHTML = emptyHTML("A kosarad üres", "Nézz körül a termékek között, és tedd kosárba, ami tetszik.", '<a class="btn btn-primary" href="/products">Termékek böngészése</a>');
      foot.hidden = true;
      return;
    }
    foot.hidden = false;
    const subtotal = cart.subtotal();
    const s = N.settings();
    const shipLabel = shipShortLabel();
    const free = s.freeShippingFrom > 0 && subtotal >= s.freeShippingFrom;
    body.innerHTML = lines.map(l => lineHTML(l)).join("");
    foot.innerHTML = `
      ${freeShipHTML(subtotal)}
      <div class="sum-row"><span>Részösszeg</span><strong>${fmtFt(subtotal)}</strong></div>
      <div class="sum-row"><span>Szállítás</span><strong>${free ? "Ingyenes" : shipLabel}</strong></div>
      <a class="btn btn-primary btn-block" href="/checkout">Tovább a pénztárhoz</a>
      <button class="btn btn-ghost btn-block" type="button" data-close>Vásárlás folytatása</button>`;
  }

  function updateCount(bump) {
    const n = cart.count();
    $$("[data-cart-count]").forEach(el => {
      el.textContent = n;
      el.classList.toggle("has", n > 0);
      if (bump && !reduceMotion) { el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); }
    });
  }

  function addToCart(id, qty = 1, sourceEl = null) {
    const p = N.byId(id);
    const res = cart.add(id, qty);
    if (res.ok) {
      const img = sourceEl?.closest?.(".pcard")?.querySelector(".pcard-media img") || (sourceEl?.closest?.(".pdp, .sticky-buy") ? $("[data-stage]") : null);
      flyToCart(img);
      setTimeout(() => updateCount(true), reduceMotion ? 0 : 620);
      toast(`Kosárba téve: ${p?.name || "termék"}`, { label: "Kosár megnyitása", run: openCart });
    } else if (res.reason === "max") {
      toast(`Ebből a termékből most ${p?.stock} db rendelhető.`);
    } else {
      toast(res.reason === "soon" ? "Ez a termék még nem rendelhető." : "Ez a termék elfogyott.");
    }
  }


  /* ---------------- mozgás: megjelenés görgetéskor, kártya dőlés, kosárba repülés ---------------- */
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  let revealIO = null;
  function revealScan() {
    if (reduceMotion) return;
    const els = $$(".pcard:not(.rv), .cat-tile:not(.rv), [data-reveal]:not(.rv), .steps li:not(.rv)");
    if (!els.length) return;
    if (!("IntersectionObserver" in window)) { els.forEach(el => el.classList.add("rv", "in")); return; }
    revealIO = revealIO || new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        en.target.classList.add("in");
        revealIO.unobserve(en.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    const counters = new Map();
    els.forEach(el => {
      const parent = el.parentElement;
      const n = counters.get(parent) || 0;
      counters.set(parent, n + 1);
      el.style.setProperty("--d", `${Math.min(n, 8) * 70}ms`);
      el.classList.add("rv");
      // ami már látszik, azonnal induljon
      const r = el.getBoundingClientRect();
      if (r.top < innerHeight && r.bottom > 0) requestAnimationFrame(() => el.classList.add("in"));
      else revealIO.observe(el);
    });
  }

  function bindTilt() {
    if (reduceMotion || !finePointer) return;
    let active = null;
    document.addEventListener("pointermove", e => {
      const card = e.target.closest?.(".pcard, [data-tilt]");
      if (active && active !== card) { resetTilt(active); active = null; }
      if (!card) return;
      active = card;
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      const max = card.matches("[data-tilt]") ? 5 : 7;
      card.style.setProperty("--ry", `${((x - .5) * max * 2).toFixed(2)}deg`);
      card.style.setProperty("--rx", `${((.5 - y) * max * 2).toFixed(2)}deg`);
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

  function flyToCart(fromImg) {
    if (reduceMotion || !fromImg || !fromImg.getBoundingClientRect || !fromImg.animate) return;
    const target = $$("[data-open-cart]").find(b => b.offsetParent !== null);
    if (!target) return;
    const a = fromImg.getBoundingClientRect(), b = target.getBoundingClientRect();
    if (!a.width) return;
    const ghost = fromImg.cloneNode();
    ghost.className = "fly-ghost";
    ghost.removeAttribute("loading");
    Object.assign(ghost.style, { left: `${a.left}px`, top: `${a.top}px`, width: `${a.width}px`, height: `${a.height}px` });
    document.body.appendChild(ghost);
    const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
    ghost.animate([
      { transform: "translate(0,0) scale(1) rotate(0)", opacity: 1 },
      { transform: `translate(${dx * .55}px, ${dy * .55 - 90}px) scale(.55) rotate(-8deg)`, opacity: 1, offset: .55 },
      { transform: `translate(${dx}px, ${dy}px) scale(.12) rotate(12deg)`, opacity: .2 }
    ], { duration: 720, easing: "cubic-bezier(.5,0,.3,1)" }).onfinish = () => ghost.remove();
  }

  /* ---------------- közös: fejléc, lábléc, menü ---------------- */
  function categoriesWithCounts() {
    const list = N.products();
    return N.CATEGORIES.map(c => ({ ...c, count: list.filter(p => p.category === c.value).length })).filter(c => c.count > 0);
  }

  function renderChrome() {
    const s = N.settings();
    const ann = $("[data-announce]");
    if (ann) { ann.textContent = s.announcement; ann.hidden = !s.announcement; }

    const cats = categoriesWithCounts();
    const menuCats = $("[data-menu-cats]");
    if (menuCats) menuCats.innerHTML = cats.length ? `<p>Kategóriák</p>${cats.map(c => `<a href="/products?cat=${c.value}"><span>${esc(c.label)}</span><span>${c.count}</span></a>`).join("")}` : "";
    const footCats = $("[data-foot-cats]");
    if (footCats) footCats.innerHTML = `<li><a href="/products">Összes termék</a></li>` + cats.map(c => `<li><a href="/products?cat=${c.value}">${esc(c.label)}</a></li>`).join("");
    const footContact = $("[data-foot-contact]");
    if (footContact) {
      const items = [];
      if (s.email) items.push(`<li><a href="mailto:${esc(s.email)}">${esc(s.email)}</a></li>`);
      if (s.phone) items.push(`<li><a href="tel:${esc(s.phone.replace(/[^+\d]/g, ""))}">${esc(s.phone)}</a></li>`);
      if (s.address) items.push(`<li>${esc(s.address)}</li>`);
      if (s.email || s.phone) items.push('<li><a href="/#kapcsolat">Kapcsolatfelvétel</a></li>');
      footContact.innerHTML = items.join("") || "<li>Hamarosan</li>";
    }
    const footText = $("[data-foot-text]");
    if (footText) footText.textContent = s.footerText;
    const social = $("[data-social]");
    if (social) {
      const links = [["instagram", "Instagram"], ["facebook", "Facebook"], ["tiktok", "TikTok"]]
        .filter(([k]) => /^https?:\/\//i.test(s[k] || ""))
        .map(([k, label]) => `<a href="${esc(s[k])}" target="_blank" rel="noopener" aria-label="${label}">${SOCIAL[k]}</a>`);
      social.innerHTML = links.join("");
      social.hidden = !links.length;
    }
    $$("[data-contact-nav]").forEach(a => { a.hidden = !s.email && !s.phone; });
    $$("[data-year]").forEach(el => el.textContent = new Date().getFullYear());
    updateCount(false);
  }

  function bindChrome() {
    document.addEventListener("click", e => {
      const t = e.target.closest("button, a");
      if (!t) {
        if (e.target.matches("[data-scrim]")) closeDrawer();
        return;
      }
      if (t.matches("[data-open-cart]")) { e.preventDefault(); openCart(); }
      else if (t.matches("[data-open-menu]")) openDrawer($("[data-menu]"));
      else if (t.matches("[data-close]")) closeDrawer();
      else if (t.matches("[data-add]")) addToCart(Number(t.dataset.add), 1, t);
      else if (t.matches("[data-qty]")) {
        const id = Number(t.dataset.qty);
        cart.set(id, cart.qtyOf(id) + Number(t.dataset.d));
        updateCount(false);
      } else if (t.matches("[data-remove]")) { cart.remove(Number(t.dataset.remove)); updateCount(false); }
      else if (t.matches("[data-toggle-search]")) {
        const box = $("[data-mobile-search]");
        const open = !box.classList.contains("open");
        box.classList.toggle("open", open);
        t.setAttribute("aria-expanded", String(open));
        if (open) $("input", box)?.focus();
      } else if (t.closest(".menu-links a, .menu-cats a")) closeDrawer(true);
    });
    $("[data-scrim]")?.addEventListener("click", () => { closeDrawer(); closeFilters(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape") { closeDrawer(); closeFilters(); } });
    window.addEventListener("nsc:cart", () => {
      updateCount(false);
      if (openDrawerEl?.matches("[data-cart]")) renderCart();
      if (page === "checkout") renderCheckout();
    });
    // másik fülön módosított kosár
    window.addEventListener("storage", e => { if (e.key === N.KEYS.cart) { updateCount(false); renderCart(); if (page === "checkout") renderCheckout(); } });
    // keresőmezők kitöltése az URL alapján
    const q = new URLSearchParams(location.search).get("q") || "";
    $$("[data-q]").forEach(i => { i.value = q; });
  }

  /* ---------------- kezdőlap ---------------- */
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
    const ms = N.shippingMethods();
    const parts = ms.map(m => `${m.label.toLowerCase()} ${m.price ? fmtFt(m.price) : "ingyenes"}`);
    let t = cap(parts.join(", "));
    if (s.freeShippingFrom > 0) t += `. ${fmtFt(s.freeShippingFrom)} felett a szállítás ingyenes`;
    return t + ".";
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

    const setTextIf = (sel, text) => { const el = $(sel); if (el && text && el.textContent !== text) el.textContent = text; };
    setTextIf("[data-hero-title]", s.heroTitle);
    setTextIf("[data-hero-text]", s.heroText);
    setTextIf("[data-featured-title]", s.featuredTitle);
    setTextIf("[data-featured-text]", s.featuredText);

    const fan = $("[data-fan]");
    if (fan) {
      // az első kerül középre, a legnagyobb méretben; mind lebeg, eltolt ütemben
      const pool = featured.concat(list.filter(p => !featured.includes(p) && p.images[0]));
      const pick = pool.filter(p => p.images[0]).slice(0, 5);
      const sig = pick.map(p => p.id + p.images[0]).join("|");
      if (fan.dataset.sig !== sig) {
        fan.dataset.sig = sig;
        fan.innerHTML = pick.map((p, i) => `<a href="${productUrl(p)}" aria-label="${esc(p.name)}" style="--i:${i}"><span class="float"><img src="${esc(imageUrl(p.images[0]))}" alt="" decoding="async"></span></a>`).join("");
      }
    }
    const ticker = $("[data-ticker]");
    if (ticker) {
      const cats = categoriesWithCounts().map(c => c.label);
      const items = [...cats, s.freeShippingFrom > 0 ? `Ingyenes szállítás ${fmtFt(s.freeShippingFrom)} felett` : `Szállítás ${shipShortLabel()}`, `${buyable.length} termék készleten`];
      const row = items.map(t => `<span>${esc(t)}</span>`).join("");
      ticker.innerHTML = `<div class="ticker-track">${row}${row}</div>`;
    }

    const setText = (sel, text) => { const el = $(sel); if (el) el.textContent = text; };
    setText("[data-fact-stock]", `${buyable.length} termék készleten${soon.length ? `, ${soon.length} érkezik` : ""}`);
    const shipShort = shipShortLabel();
    setText("[data-fact-ship]", s.freeShippingFrom > 0 ? `${shipShort}, ${fmtFt(s.freeShippingFrom)} felett ingyenes` : shipShort);
    setText("[data-fact-pay]", cap(joinHu(payMethods(s))) || "Rendeléskor egyeztetjük");
    setText("[data-step-ship]", `${shipText(s)}`);
    setText("[data-step-pay]", payMethods(s).length ? `${cap(joinHu(payMethods(s)))}. A rendelésről e-mailben küldünk visszaigazolást.` : "A rendelésről e-mailben küldünk visszaigazolást.");

    const rail = $("[data-cat-rail]");
    if (rail) rail.innerHTML = categoriesWithCounts().map(c => {
      const sample = list.find(p => p.category === c.value && p.images[0]);
      return `<a class="cat-tile" href="/products?cat=${c.value}"><div><strong>${esc(c.label)}</strong><span>${c.count} termék</span></div>${sample ? `<img src="${esc(imageUrl(sample.images[0]))}" alt="" loading="lazy">` : ""}</a>`;
    }).join("");

    const fg = $("[data-featured]");
    if (fg) fg.innerHTML = featured.length ? featured.map(cardHTML).join("") : emptyHTML("Hamarosan bővül a kínálat", "Nézz vissza később.");

    const soonSec = $("[data-soon-section]");
    if (soonSec) {
      soonSec.hidden = !soon.length;
      $("[data-soon-link]") && ($("[data-soon-link]").hidden = !soon.length);
      $("[data-soon]").innerHTML = soon.map(cardHTML).join("");
    }

    const cl = $("[data-contact-list]");
    const form = $("[data-contact-form]");
    if (cl) {
      const items = [];
      if (s.email) items.push(`<a href="mailto:${esc(s.email)}">${ICON.mail}${esc(s.email)}</a>`);
      if (s.phone) items.push(`<a href="tel:${esc(s.phone.replace(/[^+\d]/g, ""))}">${ICON.phone}${esc(s.phone)}</a>`);
      cl.innerHTML = items.join("");
    }
    if (form) form.hidden = !s.email;
    const contactSec = $("#kapcsolat");
    if (contactSec) contactSec.hidden = !s.email && !s.phone;
  }

  function bindHome() {
    const mat = $("[data-playmat]");
    if (mat && !reduceMotion && window.matchMedia("(pointer: fine)").matches) {
      mat.addEventListener("pointermove", e => {
        const r = mat.getBoundingClientRect();
        mat.style.setProperty("--mx", `${((e.clientX - r.left) / r.width * 100).toFixed(1)}%`);
        mat.style.setProperty("--my", `${((e.clientY - r.top) / r.height * 100).toFixed(1)}%`);
      });
      mat.addEventListener("pointerenter", () => mat.classList.add("pointer"));
      mat.addEventListener("pointerleave", () => { mat.classList.remove("pointer"); mat.style.setProperty("--mx", "50%"); mat.style.setProperty("--my", "50%"); });
    }
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

  const norm = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

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

  function activeFilterCount() {
    return ["instock", "soon", "sale"].filter(k => filters[k]).length + (filters.min ? 1 : 0) + (filters.max ? 1 : 0);
  }

  function renderList() {
    const all = N.products();
    const cats = categoriesWithCounts();
    const catBtn = (value, label, count) => `<button type="button" data-cat="${value}" aria-pressed="${filters.cat === value}">${esc(label)}<span>${count}</span></button>`;
    const cl = $("[data-cat-list]");
    if (cl) cl.innerHTML = catBtn("all", "Összes termék", all.length) + cats.map(c => catBtn(c.value, c.label, c.count)).join("");
    const chips = $("[data-chips]");
    if (chips) chips.innerHTML = `<button class="chip" type="button" data-cat="all" aria-pressed="${filters.cat === "all"}">Összes</button>` + cats.map(c => `<button class="chip" type="button" data-cat="${c.value}" aria-pressed="${filters.cat === c.value}">${esc(c.label)}</button>`).join("");

    $$("[data-f]").forEach(el => {
      const k = el.dataset.f;
      if (el.type === "checkbox") el.checked = !!filters[k]; else if (document.activeElement !== el) el.value = filters[k];
    });
    const sort = $("[data-sort]");
    if (sort) sort.value = filters.sort;
    const badge = $("[data-filter-badge]");
    const n = activeFilterCount();
    if (badge) badge.textContent = n ? ` (${n})` : "";

    const catLabel = filters.cat === "all" ? "Termékek" : N.categoryLabel(filters.cat);
    $("[data-list-title]").textContent = catLabel;
    $("[data-crumb-current]").textContent = catLabel;
    document.title = `${catLabel} – NS Card`;

    const list = filtered();
    const countEl = $("[data-count]");
    if (countEl) countEl.innerHTML = `${list.length} termék${filters.q ? ` a következőre: <strong>„${esc(filters.q)}”</strong> <button class="link-more" style="background:none;border:0;padding:0;margin-left:6px" type="button" data-clear-q>Keresés törlése</button>` : ""}`;
    const grid = $("[data-list]");
    if (grid) grid.innerHTML = list.length
      ? list.map(cardHTML).join("")
      : emptyHTML("Nincs a szűrésnek megfelelő termék", "Próbálj más kulcsszót, vagy töröld a szűrőket.", '<button class="btn btn-ghost" type="button" data-reset-filters>Szűrők törlése</button>');
    revealScan();
  }

  function bindList() {
    readFilters();
    document.addEventListener("click", e => {
      const t = e.target.closest("button");
      if (!t) return;
      if (t.matches("[data-cat]")) { filters.cat = t.dataset.cat; writeFilters(); renderList(); }
      else if (t.matches("[data-reset-filters]")) {
        Object.assign(filters, { cat: filters.cat, q: "", instock: false, soon: false, sale: false, min: "", max: "" });
        $$("[data-q]").forEach(i => { i.value = ""; });
        writeFilters(); renderList();
      } else if (t.matches("[data-clear-q]")) { filters.q = ""; $$("[data-q]").forEach(i => { i.value = ""; }); writeFilters(); renderList(); }
      else if (t.matches("[data-open-filters]")) {
        $("[data-filters]").classList.add("open"); scrim()?.classList.add("open"); document.body.classList.add("lock");
        setTimeout(() => $("[data-filters] [data-close-filters]")?.focus(), 50);
      } else if (t.matches("[data-close-filters]")) closeFilters();
    });
    $$("[data-f]").forEach(el => el.addEventListener(el.type === "checkbox" ? "change" : "input", () => {
      const k = el.dataset.f;
      filters[k] = el.type === "checkbox" ? el.checked : el.value.replace(/[^\d]/g, "");
      writeFilters(); renderList();
    }));
    $("[data-sort]")?.addEventListener("change", e => { filters.sort = e.target.value; writeFilters(); renderList(); });
    // élő keresés a terméklistán
    $$("[data-q]").forEach(input => {
      input.addEventListener("input", () => { filters.q = input.value.trim(); $$("[data-q]").forEach(i => { if (i !== input) i.value = input.value; }); writeFilters(); renderList(); });
      input.form?.addEventListener("submit", e => { e.preventDefault(); input.blur(); $("[data-list]")?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" }); });
    });
  }

  /* ---------------- termékoldal ---------------- */
  let pdpQty = 1;
  let pdpImage = 0;

  function renderProduct() {
    const id = Number(new URLSearchParams(location.search).get("id"));
    const p = N.byId(id);
    const root = $("[data-pdp]");
    if (!root) return;
    if (!p) {
      if (N.data && N.data.source !== "cache") {
        root.innerHTML = emptyHTML("Ez a termék nem található", "Lehet, hogy elfogyott vagy lekerült a kínálatból.", '<a class="btn btn-primary" href="/products">Vissza a termékekhez</a>');
        $("[data-related-wrap]").hidden = true;
      }
      return;
    }
    document.title = `${p.name} – NS Card`;
    const md = $('meta[name="description"]');
    if (md) md.setAttribute("content", (p.description || `${p.name} – ${N.categoryLabel(p.category)} az NS Card webshopban. Ár: ${fmtFt(p.price)}.`).slice(0, 160));

    $("[data-crumbs]").innerHTML = `<li><a href="/">Kezdőlap</a></li><li><a href="/products?cat=${p.category}">${esc(N.categoryLabel(p.category))}</a></li><li aria-current="page">${esc(p.name)}</li>`;
    const st = N.stockInfo(p);
    const buyable = N.isBuyable(p);
    const inCart = cart.qtyOf(p.id);
    const maxQty = Math.max(0, p.stock - inCart);
    pdpQty = Math.min(Math.max(1, pdpQty), Math.max(1, maxQty));
    pdpImage = Math.min(pdpImage, p.images.length - 1);
    const s = N.settings();
    const shipLine = shipShortLabel();

    root.innerHTML = `
      <div class="pdp">
        <div class="gallery">
          <div class="stage"><img src="${esc(imageUrl(p.images[pdpImage]))}" alt="${esc(p.name)}" data-stage></div>
          ${p.images.length > 1 ? `<div class="thumbs" role="group" aria-label="Képek">${p.images.map((src, i) => `<button type="button" data-thumb="${i}" aria-current="${i === pdpImage}" aria-label="${i + 1}. kép"><img src="${esc(imageUrl(src))}" alt=""></button>`).join("")}</div>` : ""}
        </div>
        <div class="pdp-info">
          <div class="pdp-meta"><span>${esc(N.categoryLabel(p.category))}</span>${p.set ? `<span>${esc(p.set)}</span>` : ""}<div class="tags">${tagsHTML(p)}</div></div>
          <h1 class="display">${esc(p.name)}</h1>
          ${p.line ? `<p class="muted" style="font-size:1.1rem">${esc(p.line)}</p>` : ""}
          <div class="pdp-price">${p.oldPrice ? `<s>${fmtFt(p.oldPrice)}</s>` : ""}<strong>${fmtFt(p.price)}</strong>${p.oldPrice ? `<span class="save">${N.discount(p)}% kedvezmény</span>` : ""}</div>
          <span class="stock stock-${st.key}" style="font-size:1rem">${esc(st.label)}${inCart ? ` – ebből ${inCart} db már a kosaradban` : ""}</span>
          ${buyable ? `
            <div class="buy-row">
              <div class="stepper lg" role="group" aria-label="Mennyiség">
                <button type="button" data-pdp-qty="-1" aria-label="Eggyel kevesebb" ${pdpQty <= 1 ? "disabled" : ""}>−</button>
                <output aria-live="polite">${pdpQty}</output>
                <button type="button" data-pdp-qty="1" aria-label="Eggyel több" ${pdpQty >= maxQty ? "disabled" : ""}>+</button>
              </div>
              <button class="btn btn-primary" type="button" data-pdp-add ${maxQty <= 0 ? "disabled" : ""}>${ICON.cart}${maxQty <= 0 ? "A teljes készlet a kosaradban" : "Kosárba teszem"}</button>
            </div>` : `<div class="notice">${N.isSoon(p) ? "Ez a termék hamarosan érkezik, még nem rendelhető." : "Ez a termék jelenleg elfogyott."}${s.email ? ` Írj nekünk a <a href="mailto:${esc(s.email)}?subject=${encodeURIComponent(`Érdeklődés: ${p.name}`)}">${esc(s.email)}</a> címre, és szólunk, ha elérhető.` : ""}</div>`}
          <div class="ship-box">
            <div><span>Szállítás</span><strong>${shipLine}${s.freeShippingFrom > 0 ? `, ${fmtFt(s.freeShippingFrom)} felett ingyenes` : ""}</strong></div>
            ${payMethods(s).length ? `<div><span>Fizetés</span><strong>${esc(cap(joinHu(payMethods(s))))}</strong></div>` : ""}
          </div>
          <div>
            <h2 style="font-weight:800;font-size:1.05rem;margin-bottom:8px">Leírás</h2>
            ${p.description ? `<p class="desc">${esc(p.description)}</p>` : `<p class="desc desc-empty">Bontatlan, gyári termék. Kérdésed van vele kapcsolatban? Írj nekünk.</p>`}
          </div>
        </div>
      </div>`;

    const sticky = $("[data-sticky-buy]");
    if (sticky) {
      sticky.innerHTML = buyable && maxQty > 0 ? `<div><strong>${fmtFt(p.price)}</strong></div><button class="btn btn-primary" type="button" data-pdp-add>${ICON.cart}Kosárba</button>` : "";
      document.body.classList.toggle("has-sticky", !!sticky.innerHTML);
    }

    const rel = N.products().filter(x => x.id !== p.id && x.category === p.category);
    const fill = N.products().filter(x => x.id !== p.id && !rel.includes(x) && N.isBuyable(x));
    const related = rel.concat(fill).slice(0, 4);
    $("[data-related-wrap]").hidden = !related.length;
    $("[data-related]").innerHTML = related.map(cardHTML).join("");
  }

  function bindProduct() {
    document.addEventListener("click", e => {
      const t = e.target.closest("button");
      if (!t) return;
      const p = N.byId(Number(new URLSearchParams(location.search).get("id")));
      if (!p) return;
      if (t.matches("[data-thumb]")) { pdpImage = Number(t.dataset.thumb); renderProduct(); $(`[data-thumb="${pdpImage}"]`)?.focus(); }
      else if (t.matches("[data-pdp-qty]")) { pdpQty += Number(t.dataset.pdpQty); renderProduct(); $(`[data-pdp-qty="${t.dataset.pdpQty}"]`)?.focus(); }
      else if (t.matches("[data-pdp-add]")) { addToCart(p.id, pdpQty, t); pdpQty = 1; setTimeout(renderProduct, reduceMotion ? 0 : 50); }
    });
    const sticky = $("[data-sticky-buy]");
    if (sticky && "IntersectionObserver" in window) {
      const io = new IntersectionObserver(entries => {
        const visible = entries.some(en => en.isIntersecting);
        sticky.classList.toggle("show", !visible);
      }, { threshold: 0 });
      const watch = () => { io.disconnect(); const btn = $(".buy-row [data-pdp-add]"); if (btn) io.observe(btn); else sticky.classList.remove("show"); };
      window.addEventListener("nsc:rendered", watch);
    }
  }

  /* ---------------- pénztár ---------------- */
  const CO_FIELDS = ["name", "email", "phone", "zip", "city", "address", "locker", "note", "ship", "pay"];
  let coState = Object.assign({ ship: "home", pay: "" }, N.store.get(N.KEYS.checkout) || {});
  let coDone = null;
  let coError = "";
  let coBusy = false;

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
    const t = totals(s);
    return `
      <aside class="panel summary" aria-label="Rendelés összesítő">
        <h2>Összesítő</h2>
        <div>${cart.lines().map(l => lineHTML(l, true)).join("")}</div>
        ${freeShipHTML(t.subtotal)}
        <div class="sum-row"><span>Részösszeg</span><strong>${fmtFt(t.subtotal)}</strong></div>
        <div class="sum-row"><span>Szállítás</span><strong>${t.shipping ? fmtFt(t.shipping) : "Ingyenes"}</strong></div>
        ${t.cod ? `<div class="sum-row"><span>Utánvételi díj</span><strong>${fmtFt(t.cod)}</strong></div>` : ""}
        <div class="sum-row total"><span>Fizetendő</span><strong>${fmtFt(t.total)}</strong></div>
      </aside>`;
  }

  function fieldHTML(id, label, attrs = "", full = false) {
    const v = esc(coState[id] || "");
    const tag = id === "note"
      ? `<textarea class="textarea" id="co-${id}" name="${id}" ${attrs}>${v}</textarea>`
      : `<input class="input" id="co-${id}" name="${id}" value="${v}" ${attrs}>`;
    return `<div class="field${full ? " full" : ""}"><label for="co-${id}">${label}</label>${tag}<span class="err" data-err="${id}" hidden></span></div>`;
  }

  function renderCheckout() {
    const root = $("[data-checkout]");
    if (!root) return;
    const s = N.settings();
    if (coDone) { root.innerHTML = doneHTML(coDone, s); return; }
    const lines = cart.lines();
    if (!lines.length) {
      root.innerHTML = emptyHTML("A kosarad üres", "Tegyél kosárba legalább egy terméket a rendeléshez.", '<a class="btn btn-primary" href="/products">Termékek böngészése</a>');
      return;
    }
    const pays = availablePays(s);
    if (!pays.find(p => p.v === coState.pay)) coState.pay = pays[0]?.v || "";
    const ships = N.shippingMethods();
    if (!ships.find(m => m.value === coState.ship)) coState.ship = ships[0]?.value || "home";
    const t = totals(s);
    const shipOpt = (v, title, desc, price) => `
      <label class="option"><input type="radio" name="ship" value="${v}" ${coState.ship === v ? "checked" : ""}>
        <span><strong>${esc(title)}</strong><small>${esc(desc)}</small></span><span class="opt-price">${!price || (v !== "pickup" && t.subtotal && s.freeShippingFrom > 0 && t.subtotal >= s.freeShippingFrom) ? "Ingyenes" : fmtFt(price)}</span></label>`;
    const focusId = document.activeElement?.id;

    root.innerHTML = `
      <div class="checkout">
        <form class="panel" data-co-form novalidate>
          <section class="co-section" aria-labelledby="co-h1">
            <h2 id="co-h1"><b>1</b>Elérhetőség</h2>
            <div class="form-grid">
              ${fieldHTML("name", "Teljes név", 'autocomplete="name" required', true)}
              ${fieldHTML("email", "E-mail cím", 'type="email" autocomplete="email" inputmode="email" required')}
              ${fieldHTML("phone", "Telefonszám", 'type="tel" autocomplete="tel" inputmode="tel" placeholder="+36 30 123 4567" required')}
            </div>
          </section>
          <section class="co-section" aria-labelledby="co-h2">
            <h2 id="co-h2"><b>2</b>Szállítás</h2>
            <div class="options" role="radiogroup" aria-label="Szállítási mód">
              ${N.shippingMethods().map(m => shipOpt(m.value, m.label, m.desc, m.price)).join("")}
            </div>
            <div class="form-grid">
              ${coState.ship === "pickup" ? "" : coState.ship === "locker"
                ? fieldHTML("locker", "Csomagautomata neve és címe", 'placeholder="Pl. Foxpost – Budapest, Váci út 1." required', true)
                : `${fieldHTML("zip", "Irányítószám", 'autocomplete="postal-code" inputmode="numeric" maxlength="4" required')}
                   ${fieldHTML("city", "Település", 'autocomplete="address-level2" required')}
                   ${fieldHTML("address", "Utca, házszám, emelet, ajtó", 'autocomplete="street-address" required', true)}`}
            </div>
          </section>
          <section class="co-section" aria-labelledby="co-h3">
            <h2 id="co-h3"><b>3</b>Fizetés</h2>
            ${pays.length ? `<div class="options" role="radiogroup" aria-label="Fizetési mód">${pays.map(p => `
              <label class="option"><input type="radio" name="pay" value="${p.v}" ${coState.pay === p.v ? "checked" : ""}>
                <span><strong>${p.t}</strong><small>${p.d}</small></span><span></span></label>`).join("")}</div>`
              : `<div class="notice error">Az online rendelés még nincs beállítva. Kérjük, vedd fel velünk a kapcsolatot.</div>`}
            <div class="form-grid">${fieldHTML("note", "Megjegyzés a rendeléshez (nem kötelező)", 'rows="3"', true)}</div>
          </section>
          ${coError ? `<div class="notice error" role="alert" style="margin-bottom:16px">${coError}</div>` : ""}
          <button class="btn btn-primary btn-block" type="submit" style="--h:56px;font-size:1.05rem" ${!pays.length || coBusy ? "disabled" : ""}>
            ${coBusy ? "Folyamatban…" : (coState.pay === "card" ? `Tovább a fizetéshez – ${fmtFt(t.total)}` : `Rendelés elküldése – ${fmtFt(t.total)}`)}
          </button>
          <p class="muted" style="font-size:.86rem;margin-top:12px">${coState.pay === "card" ? "A gomb a Stripe biztonságos fizetési oldalára visz." : "A gomb megnyitja a levelezőprogramodat a kitöltött rendeléssel – a levél elküldésével adod le a rendelést."}</p>
        </form>
        ${summaryHTML(s)}
      </div>`;
    if (focusId && document.getElementById(focusId)) {
      const el = document.getElementById(focusId);
      el.focus();
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
    else if (coState.ship === "pickup") { /* nincs cím */ }
    else {
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
    const t = totals(s);
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
      subtotal: t.subtotal, shipping: t.shipping, cod: t.cod, total: t.total,
      ship: coState.ship, shipLabel: (N.shippingMethods().find(m => m.value === coState.ship)?.label || "szállítás").toLowerCase(),
      pay: coState.pay, payLabel: coState.pay === "cod" ? "utánvét" : "banki átutalás",
      c
    };
    N.store.set(N.KEYS.lastOrder, order);
    coDone = order;
    cart.clear();
    renderCheckout();
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    location.href = mailtoFor(order, s);
  }

  function bindCheckout() {
    const root = $("[data-checkout]");
    if (!root) return;
    root.addEventListener("input", e => {
      const el = e.target;
      if (!el.name || !CO_FIELDS.includes(el.name)) return;
      coState[el.name] = el.value;
      saveCo();
      if (el.type === "radio") { coError = ""; renderCheckout(); }
      else if (el.getAttribute("aria-invalid") === "true") { el.setAttribute("aria-invalid", "false"); const er = $(`[data-err="${el.name}"]`); if (er) er.hidden = true; }
    });
    root.addEventListener("submit", e => { e.preventDefault(); if (!coBusy) submitCheckout(); });
    root.addEventListener("click", async e => {
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
    } catch (err) {
      el.className = "notice error";
      el.textContent = "A fizetés állapotát most nem sikerült lekérdezni. Ha a kártyádat megterheltük, a visszaigazolást e-mailben küldjük.";
    }
  }

  /* ---------------- indulás ---------------- */
  function renderPage() {
    cart.prune();
    renderChrome();
    if (page === "home") renderHome();
    else if (page === "products") renderList();
    else if (page === "product") renderProduct();
    else if (page === "checkout") renderCheckout();
    if (openDrawerEl?.matches("[data-cart]")) renderCart();
    revealScan();
    window.dispatchEvent(new CustomEvent("nsc:rendered"));
  }

  bindChrome();
  bindTilt();
  if (page === "home") bindHome();
  if (page === "products") bindList();
  if (page === "product") bindProduct();
  if (page === "checkout") bindCheckout();
  if (page === "success") renderSuccess();

  window.addEventListener("nsc:catalog", renderPage);
  if (N.data) renderPage();
  N.ready.then(() => { if (!N.data?.products?.length) renderPage(); });

  // hosszú ideig nyitva hagyott lapon is frissüljön a kínálat
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && Date.now() - (window.__nscLoadedAt || 0) > 5 * 60 * 1000) {
      window.__nscLoadedAt = Date.now();
      N.load();
    }
  });
  window.__nscLoadedAt = Date.now();
})();
