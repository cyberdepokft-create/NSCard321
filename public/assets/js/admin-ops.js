/* NS Card – admin: rendelések, közösség (vélemények, hírlevél, értesítők), cikkek és naptár, szolgáltatások bekötése.
 * Az admin.js állapotát a window.NSCAdmin felületen keresztül használja. */
(() => {
  "use strict";
  const A = window.NSCAdmin;
  if (!A) return;
  const { N, $, $$, esc, fmtFt, toast, confirmDialog, api, state } = A;

  const ops = {
    summary: null, summaryErr: null,
    filter: "open", q: "", orders: [], ordersAt: 0, ordersErr: null, loading: false,
    statuses: {}, carriers: {}, current: null, busy: false,
    community: null, communityAt: 0, communityErr: null, commTab: "messages",
    contentTab: "posts", postIdx: -1,
    integrations: null, intErr: null
  };

  const dt = iso => { const d = new Date(iso); return isNaN(d) ? "–" : d.toLocaleString("hu-HU", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); };
  const dtLong = iso => { const d = new Date(iso); return isNaN(d) ? "–" : d.toLocaleString("hu-HU", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }); };
  const ST_CLS = { new: "new", pending_payment: "pend", paid: "in", packed: "low", shipped: "ship", done: "done", cancelled: "out" };
  const ST_LABEL = { new: "Új", pending_payment: "Fizetésre vár", paid: "Fizetve", packed: "Csomagolva", shipped: "Feladva", done: "Teljesítve", cancelled: "Lemondva" };
  const PAY = { card: "Bankkártya", transfer: "Átutalás", cod: "Utánvét" };
  const pill = (st, extra = "") => `<span class="pill st-${ST_CLS[st] || "hidden"}">${esc(ST_LABEL[st] || st)}${extra}</span>`;
  const expired = o => o.status === "pending_payment" && Date.now() - new Date(o.createdAt).getTime() > 45 * 60000;
  const ico = {
    refresh: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    down: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v12m0 0-4-4m4 4 4-4M5 20h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    print: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
    mail: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="m4 7 8 6 8-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    doc: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm7 0v5h5M9 13h7M9 17h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>',
    copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" fill="none" stroke="currentColor" stroke-width="2"/></svg>'
  };

  /* ---------- beállítási útmutatók (ha még nincs adatbázis / token) ---------- */
  function setupBox(err, what = "A rendeléskezelés") {
    if (err?.notoken) return `<div class="setup"><h2>${what} belépett adminnal működik</h2><p class="muted">Ehhez kösd össze a GitHubot ezen az eszközön, vagy állítsd be a szerveres belépést a Cloudflare-ben (Publikálás oldal) – utána itt látod a rendeléseket.</p><a class="btn btn-primary" href="#publikalas">GitHub összekötése</a></div>`;
    if (err?.local) return `<div class="setup"><h2>Csak az élő boltban érhető el</h2><p class="muted">A rendelések, vélemények és hírlevél a Cloudflare-en futó webshopban működnek (nscard.hu), a helyi előnézetben nem.</p></div>`;
    if (err?.nodb) return `<div class="setup"><h2>Kapcsold be a rendeléskezelést</h2><p class="muted">Egyszeri, ingyenes beállítás a Cloudflare-en (kb. 2 perc). Utána a rendelések ide érkeznek, a készlet automatikusan csökken, és működnek a vélemények, a hírlevél és az „újra kapható” értesítők.</p>
      <ol class="howto">
        <li>Cloudflare → <strong>Storage &amp; Databases → D1 SQL Database → Create</strong>, név: <code>nscard</code>, helye: <em>Eastern Europe</em>.</li>
        <li>Workers &amp; Pages → <strong>nscard-webshop → Settings → Bindings → Add → D1 database</strong>. Variable name: <code>DB</code>, database: <code>nscard</code>. Mentés.</li>
        <li>Deployments fül → a legutóbbi telepítésnél <strong>⋯ → Retry deployment</strong>.</li>
        <li>Frissítsd ezt az oldalt. A táblákat a bolt magától létrehozza.</li>
      </ol><a class="btn btn-ghost" href="https://dash.cloudflare.com/?to=/:account/workers/d1" target="_blank" rel="noopener">Cloudflare D1 megnyitása</a></div>`;
    return `<div class="setup"><h2>Nem sikerült betölteni</h2><p class="muted">${esc(err?.message || "Ismeretlen hiba.")}</p><button class="btn btn-ghost" type="button" data-ops-retry>Újra</button></div>`;
  }

  /* ---------- összesítő, menü jelzések ---------- */
  async function loadSummary() {
    if (!A.hasAuth()) { ops.summary = null; ops.summaryErr = { notoken: true }; paintBadges(); return; }
    try { ops.summary = await api("summary"); ops.summaryErr = null; }
    catch (e) { ops.summary = null; ops.summaryErr = e; }
    paintBadges();
    if (state.view === "attekintes") dashboard();
    if (state.view === "rendelesek") paintTabs();
  }
  function paintBadges() {
    const s = ops.summary;
    const open = s?.open || 0;
    $$("[data-nav-orders]").forEach(b => { b.textContent = open || ""; b.hidden = !open; });
    $$("[data-nav-orders-dot]").forEach(b => { b.hidden = !(s?.counts?.new); });
    const c = (s?.pendingReviews || 0) + (s?.newMessages || 0);
    $$("[data-nav-community]").forEach(b => { b.textContent = c || ""; b.hidden = !c; });
  }

  function dashboard() {
    const box = $("[data-dash-orders]");
    if (!box) return;
    const s = ops.summary;
    if (!s) {
      box.hidden = !ops.summaryErr?.nodb;
      if (ops.summaryErr?.nodb) box.innerHTML = setupBox(ops.summaryErr);
      return;
    }
    box.hidden = false;
    box.innerHTML = `
      <div class="card-head"><h2>Rendelések</h2><a class="link" href="#rendelesek">Összes rendelés</a></div>
      <div class="ostats">
        <a href="#rendelesek" data-o-filter="open"><span>Teendő</span><strong>${s.open}</strong><small>${s.counts.new || 0} új · ${s.counts.paid || 0} fizetve · ${s.counts.packed || 0} csomagolva</small></a>
        <div><span>Utolsó 24 óra</span><strong>${fmtFt(s.last24.revenue)}</strong><small>${s.last24.orders} rendelés</small></div>
        <div><span>Utolsó 30 nap</span><strong>${fmtFt(s.last30.revenue)}</strong><small>${s.last30.orders} rendelés · átlag ${fmtFt(s.last30.orders ? s.last30.revenue / s.last30.orders : 0)}</small></div>
        <a href="#kozosseg"><span>Közösség</span><strong>${s.subscribers}</strong><small>feliratkozó · ${s.pendingReviews} vélemény vár · ${s.alerts} értesítő</small></a>
      </div>
      ${salesChart(s)}
      ${s.recent.length ? `<div class="olist compact">${s.recent.map(orderRow).join("")}</div>` : '<p class="muted">Még nincs rendelés. Amint valaki vásárol, itt jelenik meg.</p>'}`;
  }

  function salesChart(s) {
    const days = [];
    for (let i = 29; i >= 0; i--) { const d = new Date(Date.now() - i * 864e5); days.push(d.toISOString().slice(0, 10)); }
    const map = new Map((s.daily || []).map(r => [r.d, r]));
    const vals = days.map(d => map.get(d)?.sum || 0);
    const max = Math.max(1, ...vals);
    if (!vals.some(Boolean) && !(s.top || []).length) return "";
    const top = (s.top || []).map(t => ({ ...t, p: A.byId(t.id) })).filter(t => t.p);
    return `<div class="dash-sales">
      <div class="chart-card"><div class="chart-head"><b>Bevétel – utolsó 30 nap</b><small>${fmtFt(vals.reduce((a, b) => a + b, 0))}</small></div>
        <div class="bars" role="img" aria-label="Napi bevétel az utolsó 30 napban">${days.map((d, i) => `<span style="--v:${(vals[i] / max * 100).toFixed(1)}%" title="${esc(d.slice(5).replace("-", ". "))}.: ${fmtFt(vals[i])} · ${map.get(d)?.n || 0} rendelés"${vals[i] ? "" : ' class="z"'}></span>`).join("")}</div>
        <div class="chart-axis"><small>${esc(days[0].slice(5).replace("-", ". "))}.</small><small>ma</small></div></div>
      ${top.length ? `<div class="chart-card"><div class="chart-head"><b>Legkelendőbb termékek</b><small>30 nap</small></div><ol class="top-list">${top.map(t => `<li><button class="p-name" type="button" data-edit="${t.p.id}">${esc(t.p.name)}</button><span>${t.qty} db</span></li>`).join("")}</ol></div>` : ""}
    </div>`;
  }

  /* ---------- rendelések ---------- */
  const TABS = [["open", "Teendő"], ["new", "Új"], ["pending_payment", "Fizetésre vár"], ["paid", "Fizetve"], ["packed", "Csomagolva"], ["shipped", "Feladva"], ["done", "Teljesítve"], ["cancelled", "Lemondva"], ["", "Összes"]];
  function tabCount(k) {
    const c = ops.summary?.counts || {};
    if (k === "open") return ops.summary?.open ?? "";
    if (!k) return Object.values(c).reduce((a, b) => a + b, 0) || "";
    return c[k] || "";
  }
  function paintTabs() {
    const t = $("[data-o-tabs]");
    if (t) t.innerHTML = TABS.map(([k, l]) => `<button type="button" data-o-filter="${k}" aria-pressed="${ops.filter === k}">${l}${tabCount(k) !== "" ? `<b>${tabCount(k)}</b>` : ""}</button>`).join("");
  }
  function orderRow(o) {
    const exp = expired(o);
    return `<button type="button" class="orow${o.status === "new" ? " is-new" : ""}" data-order="${esc(o.id)}">
      <span class="o-id"><b>${esc(o.id)}</b><small>${esc(dt(o.createdAt))}</small></span>
      <span class="o-who"><b>${esc(o.name)}</b><small>${esc(o.preview)}</small></span>
      <span class="o-ship"><small>${esc(o.method)}${o.city ? ` · ${esc(o.city)}` : ""}</small><small>${esc(PAY[o.pay] || o.pay)}${o.paid ? " · <em class='ok'>fizetve</em>" : ""}</small></span>
      <span class="o-total"><b>${fmtFt(o.total)}</b><small>${o.items} db${o.preorder ? " · előrendelés" : ""}${o.gift ? " · ajándék" : ""}</small></span>
      <span class="o-st">${exp ? '<span class="pill st-out">Lejárt fizetés</span>' : pill(o.status)}${o.invoice ? `<small>${ico.doc}${esc(o.invoice)}</small>` : ""}</span>
    </button>`;
  }
  async function loadOrders(quiet = false) {
    if (ops.loading) return;
    ops.loading = true;
    if (!quiet) paintOrders();
    try {
      const d = await api(`orders?status=${encodeURIComponent(ops.filter)}&q=${encodeURIComponent(ops.q)}&limit=200`);
      ops.orders = d.orders || []; ops.statuses = d.statuses || ST_LABEL; ops.carriers = d.carriers || {}; ops.ordersErr = null; ops.ordersAt = Date.now();
    } catch (e) { ops.ordersErr = e; }
    ops.loading = false;
    paintOrders();
  }
  function renderOrders() {
    const box = $("[data-orders]");
    if (!box) return;
    if (!box.dataset.ready) {
      box.dataset.ready = "1";
      box.innerHTML = `
        <div class="o-tools">
          <div class="o-tabs" data-o-tabs role="group" aria-label="Rendelések szűrése"></div>
          <div class="o-actions">
            <div class="search-field"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="m20 20-3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><label class="sr-only" for="o-q">Keresés</label><input class="input" id="o-q" type="search" placeholder="Rendelésszám, név, e-mail, telefon" data-o-q></div>
            <button class="icon-btn" type="button" data-o-refresh aria-label="Frissítés" title="Frissítés">${ico.refresh}</button>
            <button class="btn btn-ghost btn-sm" type="button" data-o-csv>${ico.down}CSV export</button>
          </div>
        </div>
        <div class="card card-flush"><div data-o-list></div></div>`;
    }
    paintTabs();
    if (!ops.ordersAt || Date.now() - ops.ordersAt > 30000) loadOrders(!!ops.ordersAt);
    else paintOrders();
  }
  function paintOrders() {
    const list = $("[data-o-list]");
    if (!list) return;
    paintTabs();
    if (ops.ordersErr && !ops.orders.length) { list.innerHTML = setupBox(ops.ordersErr); return; }
    if (ops.loading && !ops.orders.length) { list.innerHTML = '<p class="muted pad">Rendelések betöltése…</p>'; return; }
    if (!ops.orders.length) { list.innerHTML = `<div class="empty-state"><strong>${ops.q ? "Nincs találat" : ops.filter === "open" ? "Nincs teendő" : "Nincs ilyen rendelés"}</strong><span class="muted">${ops.filter === "open" && !ops.q ? "Minden rendelés fel van dolgozva. Szép munka!" : "Próbálj másik szűrőt."}</span></div>`; return; }
    list.innerHTML = `<div class="olist">${ops.orders.map(orderRow).join("")}</div>`;
  }

  /* --- egy rendelés --- */
  function panel(open) {
    const p = $("[data-order-panel]"), sc = $("[data-order-scrim]");
    p.classList.toggle("open", open);
    sc.classList.toggle("open", open);
    document.body.classList.toggle("lock", open);
    if (!open) ops.current = null;
  }
  async function openOrder(id) {
    panel(true);
    $("[data-order-body]").innerHTML = `<div class="op-head"><h2 id="op-title">${esc(id)}</h2><button class="icon-btn" type="button" data-op-close aria-label="Bezárás">${ico.close}</button></div><p class="muted pad">Betöltés…</p>`;
    try {
      const d = await api(`orders/${encodeURIComponent(id)}`);
      ops.current = d.order; ops.statuses = d.statuses || ops.statuses; ops.carriers = d.carriers || ops.carriers;
      paintOrder();
    } catch (e) {
      $("[data-order-body]").innerHTML = `<div class="op-head"><h2 id="op-title">${esc(id)}</h2><button class="icon-btn" type="button" data-op-close aria-label="Bezárás">${ico.close}</button></div>${setupBox(e)}`;
    }
  }
  const NEXT = {
    new: [["paid", "Fizetve"], ["packed", "Csomagolva"]],
    pending_payment: [["paid", "Fizetve"]],
    paid: [["packed", "Csomagolva"], ["shipped", "Feladva"]],
    packed: [["shipped", "Feladva"]],
    shipped: [["done", "Teljesítve"]],
    done: [],
    cancelled: [["new", "Visszaállítás"]]
  };
  function paintOrder() {
    const o = ops.current;
    const box = $("[data-order-body]");
    if (!o || !box) return;
    const d = o.data || {}, c = d.customer || {}, b = c.billing || {};
    const exp = expired(o);
    const ship = d.method === "locker" ? `<b>Csomagautomata</b><span>${esc(c.locker)}</span>${c.lockerId ? `<small>Azonosító: ${esc(c.lockerId)}</small>` : ""}`
      : d.method === "pickup" ? "<b>Személyes átvétel</b>" : `<b>Házhozszállítás</b><span>${esc(c.zip)} ${esc(c.city)}, ${esc(c.address)}</span>`;
    const bill = b.same ? "<span>Megegyezik a szállítási címmel</span>" : `<span>${esc(b.name || c.name)}</span><span>${esc(b.zip)} ${esc(b.city)}, ${esc(b.address)}</span>`;
    const lines = (d.lines || []).map(l => {
      const p = A.byId(l.id) || N.byId?.(l.id);
      const img = p?.images?.[0] || l.image;
      return `<div class="op-line">${img ? `<img src="${esc(A.imageUrl(img))}" alt="">` : "<span></span>"}<span><b>${esc(l.name)}</b><small>${l.qty} db × ${fmtFt(l.price)}${l.preorder ? ` · előrendelés${l.releaseDate ? ` (${esc(N.fmtDate(l.releaseDate))})` : ""}` : ""}</small></span><strong>${fmtFt(l.qty * l.price)}</strong></div>`;
    }).join("");
    const next = NEXT[o.status] || [];
    const carriers = Object.entries(ops.carriers).map(([k, v]) => `<option value="${k}"${(o.carrier || (d.method === "locker" ? (/packeta|z-box/i.test(c.lockerProvider || "") ? "packeta" : "foxpost") : "gls")) === k ? " selected" : ""}>${esc(v)}</option>`).join("");
    box.innerHTML = `
      <div class="op-head">
        <div><h2 id="op-title">${esc(o.id)}</h2><p class="muted">${esc(dtLong(o.createdAt))}</p></div>
        <div class="op-head-act"><button class="icon-btn" type="button" data-op-print aria-label="Szállítólevél nyomtatása" title="Szállítólevél nyomtatása">${ico.print}</button><button class="icon-btn" type="button" data-op-close aria-label="Bezárás">${ico.close}</button></div>
      </div>
      <div class="op-body">
        <div class="op-status">${exp ? '<span class="pill st-out">Lejárt fizetés – a készletet felszabadítottuk</span>' : pill(o.status)}${o.paid ? '<span class="pill in">Fizetve</span>' : `<span class="pill hidden">Nincs fizetve</span>`}${d.preorder ? '<span class="pill soon">Előrendelés</span>' : ""}${d.gift ? '<span class="pill gift">Ajándékcsomagolás</span>' : ""}</div>
        ${d.gift ? `<div class="op-gift"><b>Ajándékcsomagolás kérve</b>${d.giftMessage ? `<p>„${esc(d.giftMessage)}”</p>` : "<p class=\"muted\">Üzenet nélkül.</p>"}<small>A nyomtatott lapon ilyenkor nincs ár, csak az üzenet.</small></div>` : ""}
        ${o.status !== "cancelled" ? `<div class="op-flow">
          ${next.filter(([k]) => k !== "shipped").map(([k, l]) => `<button class="btn ${k === "paid" || k === "packed" ? "btn-primary" : "btn-ghost"} btn-sm" type="button" data-op-status="${k}">${l}</button>`).join("")}
        </div>` : `<div class="op-flow"><button class="btn btn-ghost btn-sm" type="button" data-op-status="new">Visszaállítás</button></div>`}
        ${["paid", "packed", "new", "shipped"].includes(o.status) && !exp ? `<form class="op-ship" data-op-ship>
          <h3>${o.status === "shipped" ? "Csomagkövetés" : "Feladás"}</h3>
          <div class="form-grid">
            <div class="field"><label for="op-carrier">Futár</label><select class="select" id="op-carrier" name="carrier">${carriers}</select></div>
            <div class="field"><label for="op-track">Csomagszám (nem kötelező)</label><input class="input" id="op-track" name="tracking" value="${esc(o.tracking)}" placeholder="pl. CLFOX123456" autocomplete="off"></div>
          </div>
          <label class="check"><input type="checkbox" name="notify" checked> E-mail a vásárlónak a csomagszámmal</label>
          <button class="btn btn-primary btn-sm" type="submit">${o.status === "shipped" ? "Csomagszám mentése" : "Feladva – értesítés küldése"}</button>
        </form>` : ""}
        <section class="op-sec"><h3>Vásárló</h3>
          <p class="op-kv"><b>${esc(o.name)}</b><a href="mailto:${esc(o.email)}">${esc(o.email)}</a><a href="tel:${esc(String(o.phone).replace(/[^+\d]/g, ""))}">${esc(o.phone)}</a></p>
          <div class="op-cols"><div class="op-kv">${ship}</div><div class="op-kv"><b>Számlázás${b.company ? `: ${esc(b.company)}` : ""}</b>${bill}${b.taxNumber ? `<small>Adószám: ${esc(b.taxNumber)}</small>` : ""}</div></div>
          ${c.note ? `<p class="op-note"><b>Megjegyzés:</b> ${esc(c.note)}</p>` : ""}
        </section>
        <section class="op-sec"><h3>Tételek</h3>${lines}
          <div class="op-sum">
            <div><span>Részösszeg</span><span>${fmtFt(d.subtotal)}</span></div>
            ${d.discount ? `<div><span>Kupon (${esc(d.coupon)})</span><span>−${fmtFt(d.discount)}</span></div>` : d.coupon ? `<div><span>Kupon (${esc(d.coupon)})</span><span>ingyenes szállítás</span></div>` : ""}
            ${d.packDiscount ? `<div><span>Csomagbontás kedvezmény (5%)</span><span>−${fmtFt(d.packDiscount)}</span></div>` : ""}
            <div><span>${esc(d.methodLabel || "Szállítás")}</span><span>${d.shipping ? fmtFt(d.shipping) : "ingyenes"}</span></div>
            ${d.cod ? `<div><span>Utánvételi díj</span><span>${fmtFt(d.cod)}</span></div>` : ""}
            ${d.gift ? `<div><span>Ajándékcsomagolás</span><span>${d.giftFee ? fmtFt(d.giftFee) : "ingyenes"}</span></div>` : ""}
            <div class="tot"><span>Összesen · ${esc(PAY[o.pay] || o.pay)}</span><span>${fmtFt(d.total)}</span></div>
          </div>
        </section>
        <section class="op-sec"><h3>Fizetés és számla</h3>
          <label class="toggle"><input type="checkbox" data-op-paid ${o.paid ? "checked" : ""}><span class="switch"></span><span><strong>Fizetve</strong><small>${o.pay === "card" ? "Kártyás fizetésnél a Stripe automatikusan jelzi." : o.pay === "transfer" ? "Jelöld, amikor megérkezett az utalás." : "Utánvétnél a futár szedi be az összeget."}</small></span></label>
          <div class="op-inv">${o.invoice ? `<span class="pill in">${ico.doc}Számla: ${esc(o.invoice)}</span>${d.invoice?.provider === "szamlazz" ? `<button class="btn btn-ghost btn-sm" type="button" data-op-invoice-pdf>${ico.doc}PDF</button>` : ""}${d.invoice?.sent ? '<small class="muted">elküldve a vásárlónak</small>' : ""}${d.invoice?.paper ? '<small class="muted">papír alapú számla (a Számlázz.hu csomag nem enged e-számlát)</small>' : ""}`
            : `<button class="btn btn-ghost btn-sm" type="button" data-op-invoice>${ico.doc}Számla kiállítása${ops.integrations?.invoice?.label ? ` (${esc(ops.integrations.invoice.label)})` : ""}</button>`}${d.invoiceError ? `<p class="warn">${esc(d.invoiceError)}</p>` : ""}</div>
        </section>
        <section class="op-sec"><h3>Belső megjegyzés</h3>
          <textarea class="textarea" rows="2" data-op-note placeholder="Csak az adminban látszik">${esc(o.note)}</textarea>
        </section>
        <section class="op-sec"><h3>Történet</h3>
          <ol class="op-hist">${(d.history || []).slice().reverse().map(h => `<li><b>${esc(ST_LABEL[h.status] || h.status)}</b><small>${esc(dt(h.at))} · ${esc(h.by || "")}</small></li>`).join("")}</ol>
          <p class="muted small">${d.emailed?.customer ? `Visszaigazolás elküldve: ${esc(dt(d.emailed.customer))}` : "Visszaigazoló e-mail még nem ment ki."}${d.mailError ? ` <span class="warn">(${esc(d.mailError)})</span>` : ""}</p>
        </section>
      </div>
      <div class="op-foot">
        ${o.status !== "cancelled" ? `<button class="btn btn-danger-ghost btn-sm" type="button" data-op-status="cancelled">Lemondás</button>` : ""}
        <span class="spacer"></span>
        <button class="btn btn-ghost btn-sm" type="button" data-op-resend>${ico.mail}Visszaigazolás újraküldése</button>
      </div>`;
  }
  async function patchOrder(body, okMsg) {
    if (!ops.current || ops.busy) return;
    ops.busy = true;
    try {
      const r = await api(`orders/${encodeURIComponent(ops.current.id)}`, { method: "PATCH", body: JSON.stringify(body) });
      ops.current = r.order;
      paintOrder();
      toast(`${okMsg}${r.mailed ? " · e-mail elküldve" : r.mailError ? ` · e-mail hiba: ${r.mailError}` : body.status && body.notify !== false && !r.mailReady ? " · (e-mail küldés nincs bekötve)" : ""}`, !!r.mailError);
      ops.ordersAt = 0;
      loadSummary();
      if (state.view === "rendelesek") loadOrders(true);
      if (body.status === "cancelled" || body.status === "new") A.syncStock();
    } catch (e) { toast(e.message, true); }
    ops.busy = false;
  }
  function printSlip() {
    const o = ops.current;
    if (!o) return;
    const d = o.data, c = d.customer || {};
    const s = state.draft?.settings || {};
    const w = window.open("", "_blank", "width=820,height=900");
    if (!w) { toast("A böngésző letiltotta az új ablakot.", true); return; }
    const addr = d.method === "locker" ? c.locker : d.method === "pickup" ? "Személyes átvétel" : `${c.zip} ${c.city}, ${c.address}`;
    /* ajándéknál a csomagba tett lapon nincs ár, helyette az üzenet szerepel */
    const gift = !!d.gift;
    w.document.write(`<!doctype html><html lang="hu"><head><meta charset="utf-8"><title>${esc(o.id)}</title><style>
      body{font:14px/1.5 Arial,sans-serif;color:#111;margin:32px}h1{font-size:22px;margin:0}table{width:100%;border-collapse:collapse;margin:18px 0}td,th{border-bottom:1px solid #ddd;padding:8px 4px;text-align:left}th:last-child,td:last-child{text-align:right}.box{display:flex;gap:40px;margin-top:18px}.box div{flex:1}.muted{color:#666}.big{font-size:18px;font-weight:bold}.gift{border:2px dashed #999;border-radius:12px;padding:18px 20px;margin:22px 0;font-size:16px}.gift b{display:block;font-size:12px;color:#666;margin-bottom:6px;font-weight:normal}@media print{button{display:none}}
    </style></head><body>
      <h1>${esc(s.shopName || "NS Card")} – ${gift ? "ajándékcsomag" : "szállítólevél"}</h1><p class="muted">${esc(o.id)} · ${esc(dtLong(o.createdAt))}</p>
      <div class="box"><div><b>Címzett</b><br>${esc(c.name)}<br>${esc(addr)}<br>${esc(c.phone)}${gift ? "" : `<br>${esc(c.email)}`}</div><div><b>Feladó</b><br>${esc(s.companyName || s.shopName || "")}<br>${esc(s.companyAddress || s.address || "")}<br>${esc(s.phone || "")}<br>${esc(s.email || "")}</div></div>
      ${gift && d.giftMessage ? `<div class="gift"><b>Üzenet</b>${esc(d.giftMessage).replace(/\n/g, "<br>")}</div>` : ""}
      <table><thead><tr><th>Termék</th><th>Db</th>${gift ? "" : "<th>Összeg</th>"}</tr></thead><tbody>${(d.lines || []).map(l => `<tr><td>${esc(l.name)}${l.preorder ? " (előrendelés)" : ""}</td><td>${l.qty}</td>${gift ? "" : `<td>${fmtFt(l.qty * l.price)}</td>`}</tr>`).join("")}</tbody></table>
      ${gift ? `<p class="muted">Jó bontást kívánunk!</p>` : `<p class="big">Fizetendő: ${fmtFt(d.total)} – ${esc(d.payLabel || "")}${d.pay === "cod" && !o.paid ? " (UTÁNVÉT)" : o.paid ? " (fizetve)" : ""}</p>`}
      ${c.note && !gift ? `<p><b>Megjegyzés:</b> ${esc(c.note)}</p>` : ""}</body></html>`);
    w.document.close();
    setTimeout(() => { try { w.focus(); w.print(); } catch {} }, 250);
  }

  /* ---------- közösség ---------- */
  async function loadCommunity() {
    try { ops.community = await api("community"); ops.communityErr = null; ops.communityAt = Date.now(); }
    catch (e) { ops.communityErr = e; }
    paintCommunity();
  }
  function renderCommunity() {
    const box = $("[data-community]");
    if (!box) return;
    if (!ops.communityAt || Date.now() - ops.communityAt > 30000) { if (!ops.community) box.innerHTML = '<p class="muted">Betöltés…</p>'; loadCommunity(); }
    else paintCommunity();
  }
  const prodName = id => A.byId(id)?.name || `#${id}`;
  function paintCommunity() {
    const box = $("[data-community]");
    if (!box) return;
    if (!ops.community) { box.innerHTML = `<div class="card">${setupBox(ops.communityErr, "A közösségi funkciók")}</div>`; return; }
    const c = ops.community;
    const pend = c.reviews.filter(r => r.status === "pending").length;
    const newMsg = (c.messages || []).filter(m => m.status === "new").length;
    const tabs = [["messages", `Üzenetek${newMsg ? ` <b>${newMsg}</b>` : ""}`], ["reviews", `Vélemények${pend ? ` <b>${pend}</b>` : ""}`], ["news", `Hírlevél <b>${c.subStats.active}</b>`], ["alerts", `Értesítők${c.alerts.length ? ` <b>${c.alerts.reduce((a, x) => a + x.count, 0)}</b>` : ""}`]];
    let body = "";
    if (ops.commTab === "messages") {
      const list = c.messages || [];
      body = list.length ? `<div class="rv-list">${list.map(m => `
        <article class="rv msg ${m.status}">
          <header><b>${esc(m.name || m.email)}</b><span class="pill ${m.status === "new" ? "low" : m.status === "done" ? "in" : "hidden"}">${m.status === "new" ? "Új" : m.status === "done" ? "Megválaszolva" : "Olvasott"}</span><small>${esc(dt(m.createdAt))}</small></header>
          ${m.subject ? `<h3>${esc(m.subject)}</h3>` : ""}${m.productId ? `<p class="rv-prod">${esc(prodName(m.productId))}</p>` : ""}
          <p class="msg-body">${esc(m.body)}</p>
          <div class="row-actions">
            <a class="btn btn-primary btn-sm" href="mailto:${esc(m.email)}?subject=${encodeURIComponent(`Re: ${m.subject || "Kérdésed az NS Card webshopban"}`)}&body=${encodeURIComponent(`\n\n---\n${m.name || ""} írta:\n${m.body}`)}" data-msg-reply="${m.id}">${ico.mail}Válasz e-mailben</a>
            ${m.status !== "done" ? `<button class="btn btn-ghost btn-sm" type="button" data-msg="${m.id}" data-to="done">Kész</button>` : `<button class="btn btn-ghost btn-sm" type="button" data-msg="${m.id}" data-to="new">Újra nyitás</button>`}
            <button class="btn btn-danger-ghost btn-sm" type="button" data-msg-del="${m.id}">Törlés</button>
          </div>
        </article>`).join("")}</div>` : '<div class="empty-state"><strong>Nincs üzenet</strong><span class="muted">A kezdőlap „Kérdésed van?” űrlapjáról érkező üzenetek itt jelennek meg, és e-mailben is szólunk róluk.</span></div>';
    } else if (ops.commTab === "reviews") {
      body = c.reviews.length ? `<div class="rv-list">${c.reviews.map(r => `
        <article class="rv ${r.status}">
          <header><span class="stars-a" aria-label="${r.rating} csillag">${"★".repeat(r.rating)}<i>${"★".repeat(5 - r.rating)}</i></span><b>${esc(r.name)}</b>${r.verified ? '<span class="pill in">Ellenőrzött vásárlás</span>' : ""}<span class="pill ${r.status === "approved" ? "in" : r.status === "rejected" ? "out" : "low"}">${r.status === "approved" ? "Megjelenik" : r.status === "rejected" ? "Elutasítva" : "Jóváhagyásra vár"}</span><small>${esc(dt(r.createdAt))}</small></header>
          <p class="rv-prod">${esc(prodName(r.productId))}</p>
          ${r.title ? `<h3>${esc(r.title)}</h3>` : ""}<p>${esc(r.body)}</p>
          ${r.email ? `<p class="muted small">${esc(r.email)}${r.orderId ? ` · ${esc(r.orderId)}` : ""}</p>` : ""}
          <div class="rv-reply"><label class="sr-only" for="rr-${r.id}">Válasz</label><input class="input" id="rr-${r.id}" data-rv-reply="${r.id}" value="${esc(r.reply)}" placeholder="Nyilvános válasz (nem kötelező)"></div>
          <div class="row-actions">
            ${r.status !== "approved" ? `<button class="btn btn-primary btn-sm" type="button" data-rv="${r.id}" data-to="approved">Jóváhagyás</button>` : ""}
            ${r.status !== "rejected" ? `<button class="btn btn-ghost btn-sm" type="button" data-rv="${r.id}" data-to="rejected">Elutasítás</button>` : ""}
            <button class="btn btn-ghost btn-sm" type="button" data-rv-save="${r.id}">Válasz mentése</button>
            <button class="btn btn-danger-ghost btn-sm" type="button" data-rv-del="${r.id}">Törlés</button>
          </div>
        </article>`).join("")}</div>` : '<div class="empty-state"><strong>Még nincs vélemény</strong><span class="muted">A vásárlók a termékoldalon írhatnak véleményt. Jóváhagyás után jelenik meg a boltban és a Google találatokban (csillagok).</span></div>';
    } else if (ops.commTab === "news") {
      body = `
        <div class="ostats three"><div><span>Aktív feliratkozó</span><strong>${c.subStats.active}</strong></div><div><span>Megerősítésre vár</span><strong>${c.subStats.waiting}</strong></div><div><span>Leiratkozott</span><strong>${c.subStats.gone}</strong></div></div>
        <form class="card news-compose" data-news-compose>
          <div class="card-head"><h2>Hírlevél küldése</h2><span class="muted">${c.subStats.active} címzett</span></div>
          ${c.mail ? "" : '<p class="warn">Az e-mail küldés még nincs bekötve (Resend). Lásd: Beállítások → Szolgáltatások és bekötés.</p>'}
          <div class="field"><label for="nl-subj">Tárgy</label><input class="input" id="nl-subj" name="subject" maxlength="140" placeholder="pl. Decemberi megjelenések és előrendelés"></div>
          <div class="field"><label for="nl-body">Szöveg</label><textarea class="textarea code-area" id="nl-body" name="body" rows="10" placeholder="## Cím&#10;&#10;Szöveg…&#10;&#10;[Előrendelem](https://www.nscard.hu/products?pre=1)"></textarea><span class="hint">Formázás: <code>## Cím</code>, <code>**félkövér**</code>, <code>- lista</code>, <code>[link](https://…)</code>, <code>![kép](https://…)</code>. A leiratkozás linkje automatikusan bekerül.</span></div>
          <div class="row-actions"><input class="input" name="test" type="email" placeholder="Próba e-mail címe" value="${esc(state.draft?.settings?.email || "")}" style="max-width:280px"><button class="btn btn-ghost" type="button" data-nl-test>Próba küldése</button><span class="spacer"></span><button class="btn btn-primary" type="submit">Küldés mindenkinek</button></div>
        </form>
        <div class="card"><div class="card-head"><h2>Feliratkozók</h2><button class="btn btn-ghost btn-sm" type="button" data-sub-csv>${ico.down}CSV export</button></div>
          ${c.subscribers.length ? `<div class="sub-list">${c.subscribers.slice(0, 100).map(x => `<div><span>${esc(x.email)}</span><small>${esc(dt(x.createdAt))}${x.source ? ` · ${esc(x.source)}` : ""}</small><span class="pill ${x.unsubscribed ? "hidden" : x.confirmed ? "in" : "low"}">${x.unsubscribed ? "Leiratkozott" : x.confirmed ? "Aktív" : "Megerősítésre vár"}</span><button class="icon-btn" type="button" data-sub-del="${esc(x.email)}" aria-label="Törlés" title="Végleges törlés (GDPR kérésre)">${A.ICON.trash}</button></div>`).join("")}</div>` : '<p class="muted">Még nincs feliratkozó. A kezdőlapon és a láblécben lévő űrlapon lehet feliratkozni.</p>'}
        </div>`;
    } else {
      body = c.alerts.length ? `<div class="card"><p class="muted">Ennyien kértek értesítést, amikor a termék újra kapható. Publikáláskor, ha egy termék újra rendelhető lesz, a levél automatikusan kimegy.</p>
        <div class="al-list">${c.alerts.map(a => { const p = A.byId(a.id); return `<div><span><b>${esc(prodName(a.id))}</b><small>utolsó kérés: ${esc(dt(a.last))} · készlet: ${p ? p.stock : "–"}</small></span><strong>${a.count} fő</strong><button class="btn btn-ghost btn-sm" type="button" data-al-send="${a.id}" ${p && p.stock > 0 && p.availability !== "coming_soon" ? "" : "disabled"} title="${p && p.stock > 0 ? "Értesítés küldése most" : "Előbb tölts fel készletet és publikálj"}">Értesítés most</button></div>`; }).join("")}</div></div>`
        : '<div class="empty-state"><strong>Nincs függő értesítő</strong><span class="muted">Elfogyott vagy „Hamarosan” terméknél a vásárlók megadhatják az e-mail címüket, és szólunk nekik, amint rendelhető.</span></div>';
    }
    box.innerHTML = `<div class="o-tabs comm-tabs" role="tablist">${tabs.map(([k, l]) => `<button type="button" role="tab" data-comm-tab="${k}" aria-selected="${ops.commTab === k}">${l}</button>`).join("")}</div><div class="comm-body">${body}</div>`;
  }
  async function download(path, name) {
    try {
      const res = await api(path, { raw: true });
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1500);
    } catch (e) { toast(e.message, true); }
  }

  /* ---------- cikkek és megjelenési naptár ---------- */
  let STARTER_POSTS = [];
  const loadStarter = () => fetch("/assets/data/starter-posts.json?v=5.1.0").then(r => r.ok ? r.json() : []).then(d => { STARTER_POSTS = Array.isArray(d) ? d : []; if (state.view === "tartalom") renderContent(); }).catch(() => {});
  const posts = () => (state.draft.settings.posts = state.draft.settings.posts || []);
  const releases = () => (state.draft.settings.releases = state.draft.settings.releases || []);
  function savePosts(msg) {
    state.draft.settings.posts = N.sanitizePosts(posts());
    A.saveDraft();
    A.renderStatus();
    if (msg) toast(msg);
  }
  function renderContent() {
    const box = $("[data-content]");
    if (!box) return;
    const tabs = [["posts", `Cikkek <b>${posts().length}</b>`], ["releases", `Megjelenési naptár <b>${releases().length}</b>`]];
    let body = "";
    if (ops.contentTab === "posts") {
      const list = posts();
      const ed = ops.postIdx >= 0 ? list[ops.postIdx] : null;
      body = `<div class="content-layout">
        <div class="card">
          <div class="card-head"><h2>Cikkek</h2><button class="btn btn-primary btn-sm" type="button" data-post-new>Új cikk</button></div>
          ${list.length ? `<div class="post-list">${list.map((x, i) => `<button type="button" data-post-edit="${i}" aria-current="${i === ops.postIdx}"><span><b>${esc(x.title)}</b><small>${esc(x.date)}${x.tag ? ` · ${esc(x.tag)}` : ""}</small></span><span class="pill ${x.published ? "in" : "hidden"}">${x.published ? "Megjelenik" : "Vázlat"}</span></button>`).join("")}</div>` : '<p class="muted">Még nincs cikk. A cikkek segítenek a Google találatokban, és bizalmat építenek.</p>'}
          ${STARTER_POSTS.some(sp => !list.some(x => x.slug === sp.slug)) ? `<button class="btn btn-ghost btn-sm" type="button" data-post-starter>Mintacikkek hozzáadása (${STARTER_POSTS.filter(sp => !list.some(x => x.slug === sp.slug)).length})</button>` : ""}
          <p class="hint">A cikkek a <a class="link" href="/blog" target="_blank" rel="noopener">/blog</a> oldalon és a kezdőlapon jelennek meg, publikálás után.</p>
        </div>
        ${ed ? `<form class="card post-editor" data-post-form novalidate>
          <div class="card-head"><h2>Cikk szerkesztése</h2><div class="row-actions"><a class="btn btn-ghost btn-sm" href="/blog/${esc(encodeURIComponent(ed.slug))}" target="_blank" rel="noopener">Megnyitás</a><button class="btn btn-danger-ghost btn-sm" type="button" data-post-del>Törlés</button></div></div>
          <div class="field"><label for="po-title">Cím</label><input class="input" id="po-title" name="title" maxlength="140" value="${esc(ed.title)}" required></div>
          <div class="form-grid three">
            <div class="field"><label for="po-date">Dátum</label><input class="input" id="po-date" name="date" type="date" value="${esc(ed.date)}"></div>
            <div class="field"><label for="po-tag">Címke</label><input class="input" id="po-tag" name="tag" maxlength="30" value="${esc(ed.tag)}" placeholder="pl. Útmutató"></div>
            <div class="field"><label for="po-slug">Webcím</label><input class="input" id="po-slug" name="slug" maxlength="60" value="${esc(ed.slug)}" spellcheck="false"></div>
          </div>
          <div class="field"><label for="po-excerpt">Rövid összefoglaló</label><textarea class="textarea" id="po-excerpt" name="excerpt" rows="2" maxlength="280">${esc(ed.excerpt)}</textarea><span class="hint">A listában és a Google találatban jelenik meg.</span></div>
          <div class="field"><span class="label">Borítókép</span><div class="cover-row">${ed.cover ? `<img src="${esc(A.imageUrl(ed.cover))}" alt="">` : ""}<button class="btn btn-ghost btn-sm" type="button" data-post-cover>${ed.cover ? "Csere" : "Kép feltöltése"}</button>${ed.cover ? '<button class="btn btn-ghost btn-sm" type="button" data-post-cover-del>Eltávolítás</button>' : ""}<input type="file" accept="image/*" hidden data-post-cover-file></div></div>
          <div class="field">
            <div class="post-body-head"><label for="po-body">Szöveg</label><span class="muted small" data-po-stats>${wordStats(ed.body)}</span>
              <div class="segmented seg-sm" role="radiogroup" aria-label="Nézet"><label><input type="radio" name="po-view" value="edit" ${ops.postView !== "preview" ? "checked" : ""}><span>Szerkesztés</span></label><label><input type="radio" name="po-view" value="preview" ${ops.postView === "preview" ? "checked" : ""}><span>Előnézet</span></label></div></div>
            <textarea class="textarea code-area page-body" id="po-body" name="body" rows="18" ${ops.postView === "preview" ? "hidden" : ""}>${esc(ed.body)}</textarea>
            <article class="prose-preview post-preview" data-po-preview ${ops.postView === "preview" ? "" : "hidden"}>${ops.postView === "preview" ? previewHTML(ed.body) : ""}</article>
            <div class="post-insert"><label class="sr-only" for="po-ins">Termék beszúrása</label><select class="select" id="po-ins" data-po-ins><option value="">Termék beszúrása a szövegbe…</option>${state.draft.products.filter(p => !p.hidden).map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join("")}</select><button class="btn btn-ghost btn-sm" type="button" data-po-insert>Beszúrás</button><button class="btn btn-ghost btn-sm" type="button" data-po-tip>Tipp doboz</button><button class="btn btn-ghost btn-sm" type="button" data-po-snip="table">Táblázat</button><button class="btn btn-ghost btn-sm" type="button" data-po-snip="faq">GYIK</button></div>
            <span class="hint">Formázás: <code>## Cím</code>, <code>### Alcím</code>, <code>- lista</code>, <code>&gt; **Tipp:** …</code> (zöld doboz), <code>&gt; **Fontos:** …</code> (sárga doboz), <code>| táblázat | sor |</code>, <code>**félkövér**</code>, <code>[link](https://…)</code>, <code>![kép](https://…)</code>. Termékkártya: <code>[[termek:12]]</code> külön sorban. A <code>## Gyakori kérdések</code> fejezet <code>### kérdései</code> lenyitható sorok lesznek.</span>
          </div>
          <div class="field"><span class="label">Kapcsolódó termékek a cikk mellett</span>
            <div class="po-prods">${state.draft.products.filter(p => !p.hidden).map(p => `<label class="po-prod"><input type="checkbox" name="po-prod" value="${p.id}" ${(ed.products || []).includes(p.id) ? "checked" : ""}>${p.images[0] ? `<img class="po-thumb" src="${esc(A.imageUrl(p.images[0]))}" alt="">` : '<span class="po-thumb"></span>'}<span class="po-name">${esc(p.name)}</span></label>`).join("")}</div>
            <span class="hint">Ha egyet sem jelölsz, a cikk címe alapján automatikusan ajánlunk termékeket.</span>
          </div>
          <label class="toggle"><input type="checkbox" name="published" ${ed.published ? "checked" : ""}><span class="switch"></span><span><strong>Megjelenik a boltban</strong><small>Kikapcsolva vázlat marad.</small></span></label>
          <div class="row-actions end"><button class="btn btn-primary" type="submit">Cikk mentése</button></div>
        </form>` : `<div class="card"><p class="muted">Válassz egy cikket a szerkesztéshez, vagy írj újat.</p></div>`}
      </div>`;
    } else {
      const prods = state.draft.products.filter(p => !p.hidden);
      body = `<div class="card">
        <div class="card-head"><h2>Megjelenési naptár</h2></div>
        <p class="muted">A kezdőlap naptárában a megjelenés dátumával rendelkező <b>előrendelés</b> és <b>hamarosan</b> termékek automatikusan látszanak. Itt további megjelenéseket adhatsz hozzá (pl. olyan szettet, amire még nincs termék).</p>
        <div class="rel-rows">${releases().map((r, i) => `<div class="rel-row">
          <input class="input" type="date" value="${esc(r.date.length === 7 ? `${r.date}-01` : r.date)}" data-rel="${i}" data-k="date" aria-label="Dátum">
          <input class="input" value="${esc(r.title)}" data-rel="${i}" data-k="title" placeholder="Megjelenés neve" aria-label="Megjelenés neve">
          <input class="input" value="${esc(r.note)}" data-rel="${i}" data-k="note" placeholder="Megjegyzés (pl. előrendelés hamarosan)" aria-label="Megjegyzés">
          <select class="select" data-rel="${i}" data-k="productId" aria-label="Kapcsolódó termék"><option value="0">– nincs termék –</option>${prods.map(p => `<option value="${p.id}"${p.id === r.productId ? " selected" : ""}>${esc(p.name)}</option>`).join("")}</select>
          <button class="icon-btn danger" type="button" data-rel-del="${i}" aria-label="Törlés">${A.ICON.trash}</button></div>`).join("") || '<p class="muted">Még nincs kézi bejegyzés.</p>'}</div>
        <form class="rel-add" data-rel-add novalidate><input class="input" type="date" name="date" required aria-label="Dátum"><input class="input" name="title" placeholder="pl. Pokémon TCG: új szett" required aria-label="Megjelenés neve"><button class="btn btn-primary" type="submit">Hozzáadás</button></form>
        <div class="card-head" style="margin-top:8px"><h2>Termékek megjelenési dátummal</h2></div>
        ${prods.filter(p => p.releaseDate).map(p => `<div class="mini-row"><div class="thumb${p.images[0] ? "" : " empty"}">${p.images[0] ? `<img src="${esc(A.imageUrl(p.images[0]))}" alt="">` : ""}</div><div><button class="p-name" type="button" data-edit="${p.id}">${esc(p.name)}</button><div><small class="muted">${esc(N.fmtDate(p.releaseDate))} · ${p.availability === "preorder" ? "Előrendelés" : p.availability === "coming_soon" ? "Hamarosan" : "Kapható"}</small></div></div><span></span></div>`).join("") || '<p class="muted">A termék szerkesztőben az „Előrendelés” vagy „Hamarosan” elérhetőségnél adható meg a dátum.</p>'}
      </div>`;
    }
    box.innerHTML = `<div class="o-tabs comm-tabs" role="tablist">${tabs.map(([k, l]) => `<button type="button" role="tab" data-content-tab="${k}" aria-selected="${ops.contentTab === k}">${l}</button>`).join("")}</div>${body}`;
  }
  function readPostForm(f) {
    const x = posts()[ops.postIdx];
    if (!x || !f) return;
    x.title = f.title.value.trim() || x.title;
    x.date = f.date.value || x.date;
    x.tag = f.tag.value.trim();
    x.slug = N.slugify(f.slug.value || x.title) || x.slug;
    x.excerpt = f.excerpt.value.trim();
    x.body = f.body.value;
    x.published = f.published.checked;
    x.products = $$('input[name="po-prod"]:checked', f).map(c => Number(c.value)).slice(0, 8);
  }
  const wordStats = body => { const w = String(body || "").replace(/\[\[[^\]]+\]\]/g, "").split(/\s+/).filter(Boolean).length; return `${w} szó · ${Math.max(1, Math.round(w / 200))} perc olvasás`; };
  function previewHTML(body) {
    return N.mdToHtml(String(body || "").replace(/^\s*\[\[termek(?:ek)?:([\d,\s]+)\]\]\s*$/gm, (m, ids) => ids.split(",").map(Number).map(id => A.byId(id)).filter(Boolean).map(p => `> 🛒 Termékkártya: ${p.name}`).join("\n")));
  }

  /* ---------- szolgáltatások ---------- */
  async function loadIntegrations() {
    try { ops.integrations = await api("integrations"); ops.intErr = null; }
    catch (e) { ops.integrations = null; ops.intErr = e; }
    renderIntegrations();
  }
  function renderIntegrations(force = false) {
    const box = $("[data-integrations]");
    if (!box) return;
    if ((!ops.integrations && !ops.intErr) || force) { box.innerHTML = '<p class="muted">Ellenőrzés…</p>'; loadIntegrations(); return; }
    const i = ops.integrations;
    const origin = location.origin.includes("localhost") ? "https://www.nscard.hu" : location.origin;
    const row = (ok, title, desc, steps = "") => `<details class="int-row"${ok ? "" : " open"}><summary><span class="pill ${ok === true ? "in" : ok === "warn" ? "low" : "out"}">${ok === true ? "Kész" : ok === "warn" ? "Részben" : "Nincs bekötve"}</span><b>${title}</b><small>${desc}</small></summary>${steps}</details>`;
    const cfSecret = name => `Cloudflare → Workers &amp; Pages → <strong>nscard-webshop → Settings → Variables and Secrets → Add</strong>: típus <strong>Secret</strong>, név <code>${name}</code>`;
    const retry = "Mentés után a Deployments fülön: <strong>⋯ → Retry deployment</strong>.";
    const feeds = [["Google Merchant Center", "/feeds/google.xml"], ["Árukereső", "/feeds/arukereso.xml"], ["ÁrGép", "/feeds/argep.xml"]];
    if (!i) { box.innerHTML = setupBox(ops.intErr, "Az állapot lekérdezése"); return; }
    // számlatömbök a Billingo beállításhoz
    const sel = $("[data-billingo-blocks]");
    if (sel && i.billingo?.blocks?.length) {
      const cur = String(state.draft.settings.billingoBlockId || 0);
      sel.innerHTML = `<option value="0">Automatikus (az első számlatömb)</option>` + i.billingo.blocks.map(b => `<option value="${b.id}">${esc(b.name || b.prefix || b.id)}${b.prefix ? ` (${esc(b.prefix)})` : ""}</option>`).join("");
      sel.value = cur;
    }
    const inv = i.invoice || {};
    const bad = inv.provider === "szamlazz" ? i.szamlazz : inv.provider === "billingo" ? i.billingo : null;
    const bp = $("[data-invoice-pill]");
    if (bp) bp.innerHTML = inv.ok ? `<span class="pill in">${esc(inv.label)} bekötve</span>` : bad?.configured ? `<span class="pill out">${esc(inv.label)}: hiba</span>` : inv.provider ? `<span class="pill hidden">${esc(inv.label)}: nincs kulcs</span>` : '<span class="pill hidden">Nincs bekötve</span>';
    box.innerHTML = `<div class="int-list">
      ${row(i.adminAuth && i.github ? true : i.adminAuth || i.github ? "warn" : false, "Belépés és publikálás a szerveren", i.adminAuth && i.github ? "A jelszó és a GitHub token a Cloudflare-ben van – bármelyik eszközről belépve publikálhatsz." : "A jelszó és a GitHub token a Cloudflare-ben, a kódból nem kiolvasható helyen.", i.adminAuth && i.github ? "" : `<ol class="howto">${i.adminAuth ? "" : `<li>${cfSecret("ADMIN_PASSWORD")} – az új admin jelszó. Felhasználónév: <code>ADMIN_USER</code> (Text, alapból NSadmin).</li>`}${i.github ? "" : `<li>${cfSecret("GITHUB_TOKEN")} – a Publikálás oldalon lévő „Token létrehozása” gombbal készítsd el.</li>`}<li>${retry}</li></ol>`)}
      ${row(i.db, "Rendelések adatbázisa (D1)", "Rendelések, készletfoglalás, vélemények, hírlevél, értesítők.", i.db ? "" : `<ol class="howto"><li>Cloudflare → <strong>Storage &amp; Databases → D1 SQL Database → Create</strong>, név: <code>nscard</code>.</li><li>nscard-webshop → <strong>Settings → Bindings → Add → D1 database</strong>, Variable name: <code>DB</code>.</li><li>${retry}</li></ol>`)}
      ${row(i.mail, "E-mail küldés", i.mail ? `Feladó: <strong>${esc(i.mailFrom)}</strong>${i.mailTransport === "gmail" ? " (Gmail)" : i.mailTransport === "resend" ? " (Resend)" : ""}. Az új rendelések és üzenetek ide érkeznek: <strong>${esc(i.adminEmail || "–")}</strong>.` : "Rendelés visszaigazolás, fizetés és feladás értesítő, „újra kapható” levél, hírlevél, kapcsolat űrlap.", i.mail ? `<form class="test-mail" data-test-mail><input class="input" type="email" name="to" placeholder="${esc(i.adminEmail || "cimzett@example.com")}" aria-label="Próbalevél címzettje"><button class="btn btn-ghost btn-sm" type="submit">Próbalevél küldése</button></form>${i.mailTransport === "gmail" ? '<p class="hint">A Gmail naponta kb. 500 címzettnek enged levelet küldeni; a hírlevél ezért részletekben, egyszerre legfeljebb 80 címzettnek megy ki.</p>' : ""}` : `<ol class="howto"><li>Lépj be a bolt Gmail fiókjába (pl. <code>infonscard@gmail.com</code>), és kapcsold be a <strong>kétlépcsős azonosítást</strong>: <a class="link" href="https://myaccount.google.com/signinoptions/twosv" target="_blank" rel="noopener">Google-fiók → Biztonság</a>.</li><li>Készíts <strong>alkalmazásjelszót</strong>: <a class="link" href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener">myaccount.google.com/apppasswords</a>, név: <code>NS Card webshop</code>. A 16 karakteres kódot másold ki.</li><li>Cloudflare → nscard-webshop → Settings → Variables and Secrets: <code>SMTP_USER</code> (Text) = a Gmail cím, <code>SMTP_PASS</code> (Secret) = az alkalmazásjelszó.</li><li>${retry} Utána itt küldj próbalevelet.</li></ol>`)}
      ${row(i.stripe ? (i.webhook ? true : "warn") : false, "Kártyás fizetés (Stripe)", i.stripe ? (i.webhook ? "Kulcs és webhook rendben." : "A kulcs megvan. A webhook ajánlott, hogy a fizetés akkor is rögzüljön, ha a vásárló bezárja az ablakot.") : "A kulcs beállítását a Fizetési módoknál találod.", i.webhook ? "" : `<ol class="howto"><li>Stripe → <strong>Developers → Webhooks → Add endpoint</strong>: <code>${esc(origin)}/api/stripe-webhook</code></li><li>Események: <code>checkout.session.completed</code>, <code>checkout.session.async_payment_succeeded</code>, <code>checkout.session.expired</code>.</li><li>A „Signing secret” (<code>whsec_…</code>): ${cfSecret("STRIPE_WEBHOOK_SECRET")}. ${retry}</li></ol>`)}
      ${row(inv.ok ? true : false, `Számlázás${inv.label ? ` (${esc(inv.label)})` : ""}`, inv.ok ? (inv.provider === "szamlazz" ? "A Számla Agent kulcs működik. A számlák a Számlázz.hu fiókodban jelennek meg, a NAV felé is onnan mennek." : `${i.billingo.blocks.length} számlatömb elérhető.`) : bad?.configured ? esc(bad.error || "A kulcs nem működik.") : "Számla egy kattintással vagy automatikusan fizetéskor.", inv.ok ? "" : `<ol class="howto"><li><strong>Számlázz.hu:</strong> lépj be, és nyisd meg a <a class="link" href="https://www.szamlazz.hu/szamla/?page=dashboard" target="_blank" rel="noopener">Vezérlőpultot</a> → <strong>Fiók hozzáférések → Számla Agent kulcsok</strong> → kulcs ikon → új kulcs, név: <code>NS Card webshop</code>. A Számla Agent külön díjas szolgáltatás (a #free csomag mellett is használható).</li><li>${cfSecret("SZAMLAZZ_AGENT_KEY")}, érték a kulcs. ${retry}</li><li>Fent a „Számlázás” résznél válaszd ki az ÁFA-t, és kapcsold be az automatikus számlát.</li><li class="muted">Billingo helyett: ${cfSecret("BILLINGO_API_KEY")}.</li></ol>`)}
      <details class="int-row"><summary><span class="pill in">Kész</span><b>Termék feedek</b><small>Google Shopping, Árukereső, ÁrGép – élő készlettel, 15 percenként frissül.</small></summary>
        <div class="feed-list">${feeds.map(([n, u]) => `<div><span><b>${n}</b><code>${esc(origin)}${u}</code></span><button class="btn btn-ghost btn-sm" type="button" data-copy="${esc(origin)}${u}">${ico.copy}Másolás</button><a class="btn btn-ghost btn-sm" href="${u}" target="_blank" rel="noopener">Megnyitás</a></div>`).join("")}</div>
        <p class="hint">A Google Merchant Centerben: Termékek → Feedek → Hozzáadás → Ütemezett lekérés. Árukeresőnél a Partner Portál „Terméklista forrása” mezőjébe. Az EAN-t a termékszerkesztő „Azonosítók” részében adhatod meg.</p></details>
      <details class="int-row"><summary><span class="pill low">Ajánlott</span><b>Admin védelem (Cloudflare Access)</b><small>Csak a te e-mail címeddel lehessen megnyitni az /admin oldalt.</small></summary>
        <ol class="howto"><li>Cloudflare → <strong>Zero Trust</strong> (ingyenes csomag, legfeljebb 50 felhasználó) → <strong>Access → Applications → Add an application → Self-hosted</strong>.</li><li>Application domain: <code>www.nscard.hu</code>, path: <code>admin</code>. Adj hozzá még egyet: <code>nscard-webshop.pages.dev</code>, path: <code>admin</code>.</li><li>Policy: <strong>Allow</strong> → Include → <strong>Emails</strong>: a saját e-mail címed. Bejelentkezés: egyszeri kód e-mailben.</li><li>Mentés. Az admin ezután egy Cloudflare belépőoldallal nyílik, a szerver funkciókat továbbra is a GitHub token védi.</li></ol></details>
    </div>`;
  }

  /* ---------- újra kapható értesítő publikálás után ---------- */
  async function notifyBack(ids) {
    if (!ids?.length || !A.hasAuth()) return;
    try {
      const r = await api("notify", { method: "POST", body: JSON.stringify({ ids }) });
      if (r.sent) toast(`${r.sent} vásárló kapott „újra kapható” értesítést.`);
    } catch {}
  }

  /* ---------- események ---------- */
  document.addEventListener("click", async e => {
    const el = e.target.closest("button, a");
    if (!el) return;
    if (el.matches("[data-o-filter]")) {
      ops.filter = el.dataset.oFilter; ops.ordersAt = 0;
      if (state.view !== "rendelesek") return;
      e.preventDefault(); loadOrders(); return;
    }
    if (el.matches("[data-order]")) return openOrder(el.dataset.order);
    if (el.matches("[data-op-close]")) return panel(false);
    if (el.matches("[data-o-refresh]")) { loadSummary(); return loadOrders(); }
    if (el.matches("[data-o-csv]")) return download(`orders.csv?status=${encodeURIComponent(ops.filter === "open" ? "" : ops.filter)}`, `nscard-rendelesek-${new Date().toISOString().slice(0, 10)}.csv`);
    if (el.matches("[data-ops-retry]")) { ops.ordersAt = 0; ops.communityAt = 0; ops.integrations = null; ops.intErr = null; loadSummary(); return window.NSCAdminOps.render(state.view); }
    if (el.matches("[data-op-status]")) {
      const to = el.dataset.opStatus;
      if (to === "cancelled") {
        const ok = await confirmDialog({ title: "Lemondod a rendelést?", text: `A lefoglalt készlet visszakerül a boltba.${ops.current?.paid && ops.current?.pay === "card" ? " A kártyás visszatérítést a Stripe irányítópultján indítsd el." : ""} A vásárló e-mailt kap.`, yes: "Lemondás" });
        if (!ok) return;
      }
      return patchOrder({ status: to }, `Állapot: ${ST_LABEL[to]}`);
    }
    if (el.matches("[data-op-invoice]")) {
      el.disabled = true;
      try {
        const r = await api(`orders/${encodeURIComponent(ops.current.id)}/invoice`, { method: "POST" });
        ops.current = r.order; paintOrder(); toast(`Számla kiállítva: ${r.invoice.number}${r.invoice.sent ? ", elküldve a vásárlónak" : ""}.`);
        ops.ordersAt = 0;
      } catch (err) { toast(err.message, true); el.disabled = false; }
      return;
    }
    if (el.matches("[data-op-invoice-pdf]")) return download(`orders/${encodeURIComponent(ops.current.id)}/invoice.pdf`, `szamla-${String(ops.current.invoice).replace(/[^\w.-]+/g, "_")}.pdf`);
    if (el.matches("[data-op-resend]")) {
      try { await api(`orders/${encodeURIComponent(ops.current.id)}/resend`, { method: "POST" }); toast("Visszaigazolás újraküldve."); } catch (err) { toast(err.message, true); }
      return;
    }
    if (el.matches("[data-op-print]")) return printSlip();
    if (el.matches("[data-comm-tab]")) { ops.commTab = el.dataset.commTab; return paintCommunity(); }
    if (el.matches("[data-msg]")) {
      try { await api(`messages/${el.dataset.msg}`, { method: "PATCH", body: JSON.stringify({ status: el.dataset.to }) }); loadCommunity(); loadSummary(); } catch (err) { toast(err.message, true); }
      return;
    }
    if (el.matches("[data-msg-reply]")) { api(`messages/${el.dataset.msgReply}`, { method: "PATCH", body: JSON.stringify({ status: "done" }) }).then(() => { loadCommunity(); loadSummary(); }).catch(() => {}); return; }
    if (el.matches("[data-msg-del]")) {
      if (!(await confirmDialog({ title: "Törlöd az üzenetet?", text: "Véglegesen törlődik." }))) return;
      try { await api(`messages/${el.dataset.msgDel}`, { method: "DELETE" }); toast("Törölve."); loadCommunity(); loadSummary(); } catch (err) { toast(err.message, true); }
      return;
    }
    if (el.closest("[data-jump]") && el.matches("a")) {
      e.preventDefault();
      document.querySelector(el.getAttribute("href"))?.scrollIntoView({ behavior: "smooth", block: "start" });
      $$("[data-jump] a").forEach(a => a.removeAttribute("aria-current"));
      el.setAttribute("aria-current", "true");
      return;
    }
    if (el.matches("[data-rv]")) {
      try { await api(`reviews/${el.dataset.rv}`, { method: "PATCH", body: JSON.stringify({ status: el.dataset.to }) }); toast(el.dataset.to === "approved" ? "Jóváhagyva – megjelenik a boltban." : "Elutasítva."); loadCommunity(); loadSummary(); } catch (err) { toast(err.message, true); }
      return;
    }
    if (el.matches("[data-rv-save]")) {
      const v = $(`[data-rv-reply="${el.dataset.rvSave}"]`)?.value || "";
      try { await api(`reviews/${el.dataset.rvSave}`, { method: "PATCH", body: JSON.stringify({ reply: v }) }); toast("Válasz mentve."); loadCommunity(); } catch (err) { toast(err.message, true); }
      return;
    }
    if (el.matches("[data-rv-del]")) {
      if (!(await confirmDialog({ title: "Törlöd a véleményt?", text: "Véglegesen törlődik." }))) return;
      try { await api(`reviews/${el.dataset.rvDel}`, { method: "DELETE" }); toast("Törölve."); loadCommunity(); loadSummary(); } catch (err) { toast(err.message, true); }
      return;
    }
    if (el.matches("[data-sub-csv]")) return download("subscribers.csv", `nscard-hirlevel-${new Date().toISOString().slice(0, 10)}.csv`);
    if (el.matches("[data-sub-del]")) {
      if (!(await confirmDialog({ title: "Végleges törlés?", text: `${el.dataset.subDel} minden adata törlődik (pl. GDPR kérésre).` }))) return;
      try { await api(`subscribers/${encodeURIComponent(el.dataset.subDel)}`, { method: "DELETE" }); toast("Törölve."); loadCommunity(); } catch (err) { toast(err.message, true); }
      return;
    }
    if (el.matches("[data-nl-test]")) {
      const f = el.closest("form");
      try { await api("newsletter", { method: "POST", body: JSON.stringify({ subject: f.subject.value, body: f.body.value, test: f.test.value }) }); toast(`Próba elküldve: ${f.test.value}`); } catch (err) { toast(err.message, true); }
      return;
    }
    if (el.matches("[data-al-send]")) {
      el.disabled = true;
      try { const r = await api("notify", { method: "POST", body: JSON.stringify({ ids: [Number(el.dataset.alSend)] }) }); toast(r.skipped ? "Az e-mail küldés nincs bekötve." : `${r.sent} értesítő elküldve.`, !!r.skipped); loadCommunity(); } catch (err) { toast(err.message, true); el.disabled = false; }
      return;
    }
    if (el.matches("[data-content-tab]")) { ops.contentTab = el.dataset.contentTab; return renderContent(); }
    if (el.matches("[data-post-new]")) {
      posts().unshift({ slug: `uj-cikk-${Date.now().toString(36)}`, title: "Új cikk", date: new Date().toISOString().slice(0, 10), excerpt: "", cover: "", body: "## Alcím\n\nIde jön a szöveg.", tag: "", published: false });
      ops.postIdx = 0; savePosts(); renderContent(); setTimeout(() => $("#po-title")?.select(), 30); return;
    }
    if (el.matches("[data-post-edit]")) {
      ops.postIdx = Number(el.dataset.postEdit); renderContent();
      /* mobilon a szerkesztő a lista alatt van: odagörgetünk, hogy látszódjon, mit nyitottál meg */
      if (matchMedia("(max-width: 1100px)").matches) requestAnimationFrame(() => $("[data-post-form]")?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }));
      return;
    }
    if (el.matches("[data-post-starter]")) {
      const today = new Date();
      STARTER_POSTS.filter(sp => !posts().some(x => x.slug === sp.slug)).forEach((sp, k) => posts().push({ ...sp, cover: sp.cover || "", published: true, date: sp.date || new Date(today - k * 864e5 * 3).toISOString().slice(0, 10) }));
      savePosts("Mintacikkek hozzáadva. Nézd át és szabd testre őket."); renderContent(); return;
    }
    if (el.matches("[data-post-del]")) {
      if (!(await confirmDialog({ title: "Törlöd a cikket?", text: "Publikálás után lekerül a boltból." }))) return;
      posts().splice(ops.postIdx, 1); ops.postIdx = -1; savePosts("Cikk törölve."); renderContent(); return;
    }
    if (el.matches("[data-post-cover]")) return $("[data-post-cover-file]")?.click();
    if (el.matches("[data-po-insert]") || el.matches("[data-po-tip]") || el.matches("[data-po-snip]")) {
      const ta = $("#po-body");
      if (!ta) return;
      let snippet = "";
      if (el.matches("[data-po-tip]")) snippet = "> **Tipp:** ";
      else if (el.dataset.poSnip === "table") snippet = "| Termék | Mi van benne | Kinek |\n|---|---|---|\n| Booster | 10 lap | Kipróbálás |\n| ETB | 9 booster + kiegészítők | Ajándék |";
      else if (el.dataset.poSnip === "faq") snippet = "## Gyakori kérdések\n### Első kérdés?\nA válasz egy-két mondatban.\n\n### Második kérdés?\nA válasz.";
      else { const id = $("[data-po-ins]")?.value; if (!id) { toast("Válassz terméket a listából."); return; } snippet = `[[termek:${id}]]`; }
      const at = ta.selectionStart ?? ta.value.length;
      const before = ta.value.slice(0, at), after = ta.value.slice(at);
      const ins = `${before && !before.endsWith("\n\n") ? (before.endsWith("\n") ? "\n" : "\n\n") : ""}${snippet}${el.matches("[data-po-tip]") ? "" : "\n\n"}`;
      ta.value = before + ins + after;
      ta.focus();
      const pos = (before + ins).length;
      ta.setSelectionRange(pos, pos);
      $("[data-po-stats]").textContent = wordStats(ta.value);
      return;
    }
    if (el.matches("[data-post-cover-del]")) { readPostForm($("[data-post-form]")); posts()[ops.postIdx].cover = ""; savePosts(); renderContent(); return; }
    if (el.matches("[data-rel-del]")) { releases().splice(Number(el.dataset.relDel), 1); state.draft.settings.releases = N.sanitizeReleases(releases()); A.saveDraft(); renderContent(); return; }
    if (el.matches("[data-int-refresh]")) return renderIntegrations(true);
    if (el.matches("[data-copy]")) { try { await navigator.clipboard.writeText(el.dataset.copy); toast("Vágólapra másolva."); } catch { toast(el.dataset.copy); } }
  });
  document.addEventListener("submit", async e => {
    if (e.target.matches("[data-test-mail]")) {
      e.preventDefault();
      const f = e.target, b = $("button", f);
      b.disabled = true;
      try { const r = await api("test-mail", { method: "POST", body: JSON.stringify({ to: f.to.value.trim() }) }); toast(`Próbalevél elküldve: ${r.to}. Nézd meg a beérkezett leveleket (és a Spam mappát).`); }
      catch (err) { toast(err.message, true); }
      b.disabled = false;
      return;
    }
    const f = e.target;
    if (f.matches("[data-op-ship]")) {
      e.preventDefault();
      const body = { carrier: f.carrier.value, tracking: f.tracking.value.trim(), notify: f.notify.checked };
      if (ops.current.status !== "shipped") body.status = "shipped";
      return patchOrder(body, ops.current.status === "shipped" ? "Csomagszám mentve" : "Feladva");
    }
    if (f.matches("[data-news-compose]")) {
      e.preventDefault();
      if (!f.subject.value.trim() || f.body.value.trim().length < 10) { toast("Adj meg tárgyat és szöveget.", true); return; }
      const n = ops.community?.subStats?.active || 0;
      if (!(await confirmDialog({ title: "Elküldöd a hírlevelet?", text: `${n} feliratkozó kapja meg. Ezt nem lehet visszavonni.`, yes: "Küldés", danger: false }))) return;
      try {
        const r = await api("newsletter", { method: "POST", body: JSON.stringify({ subject: f.subject.value, body: f.body.value }) });
        if (r.done) toast("Ezt a hírlevelet már mindenki megkapta.");
        else if (r.left > 0) toast(`${r.sent} címzettnek elküldve, ${r.left} még hátravan. A Gmail korlát miatt kicsit később nyomd meg újra a Küldést – aki már megkapta, annak nem megy újra.`);
        else { toast(`Hírlevél elküldve ${r.sent} címzettnek.`); f.reset(); }
      } catch (err) { toast(err.message, true); }
      return;
    }
    if (f.matches("[data-post-form]")) {
      e.preventDefault();
      readPostForm(f); savePosts("Cikk mentve."); renderContent(); return;
    }
    if (f.matches("[data-rel-add]")) {
      e.preventDefault();
      if (!f.date.value || !f.title.value.trim()) { toast("Adj meg dátumot és nevet.", true); return; }
      releases().push({ date: f.date.value, title: f.title.value.trim(), note: "", productId: 0 });
      state.draft.settings.releases = N.sanitizeReleases(releases()); A.saveDraft(); renderContent(); toast("Hozzáadva a naptárhoz.");
    }
  });
  document.addEventListener("change", async e => {
    const el = e.target;
    if (el.matches("[data-op-paid]")) {
      const body = { paid: el.checked };
      if (el.checked && ["new", "pending_payment"].includes(ops.current?.status)) body.status = "paid";
      return patchOrder(body, el.checked ? "Fizetettnek jelölve" : "Fizetés visszavonva");
    }
    if (el.matches("[data-op-note]")) return patchOrder({ note: el.value }, "Megjegyzés mentve");
    if (el.matches("[data-rel]")) {
      const r = releases()[Number(el.dataset.rel)];
      if (!r) return;
      r[el.dataset.k] = el.dataset.k === "productId" ? Number(el.value) : el.value;
      state.draft.settings.releases = N.sanitizeReleases(releases()); A.saveDraft();
      return;
    }
    if (el.matches("[data-post-cover-file]") && el.files[0]) {
      try {
        readPostForm($("[data-post-form]"));
        posts()[ops.postIdx].cover = await A.compressImage(el.files[0]);
        savePosts("Borítókép hozzáadva – publikáláskor feltöltjük."); renderContent();
      } catch { toast("A kép nem olvasható be.", true); }
    }
  });
  document.addEventListener("change", e => {
    if (e.target.name !== "po-view") return;
    ops.postView = e.target.value;
    const ta = $("#po-body"), pv = $("[data-po-preview]");
    if (!ta || !pv) return;
    ta.hidden = ops.postView === "preview";
    pv.hidden = !ta.hidden;
    if (!pv.hidden) pv.innerHTML = previewHTML(ta.value);
  });
  let qTimer = 0;
  document.addEventListener("input", e => {
    if (e.target.id === "po-body") { const st = $("[data-po-stats]"); if (st) st.textContent = wordStats(e.target.value); }
    if (e.target.matches("[data-o-q]")) { clearTimeout(qTimer); qTimer = setTimeout(() => { ops.q = e.target.value.trim(); loadOrders(true); }, 350); }
  });
  $("[data-order-scrim]")?.addEventListener("click", () => panel(false));
  document.addEventListener("keydown", e => { if (e.key === "Escape" && $("[data-order-panel]")?.classList.contains("open") && $("[data-confirm]").hidden) panel(false); });

  function start() {
    loadSummary();
    loadStarter();
    setInterval(() => {
      if (document.visibilityState !== "visible") return;
      loadSummary();
      if (state.view === "rendelesek") loadOrders(true);
      A.syncStock();
    }, 60000);
  }

  window.NSCAdminOps = {
    render(view) {
      if (view === "rendelesek") renderOrders();
      else if (view === "kozosseg") renderCommunity();
      else if (view === "tartalom") renderContent();
    },
    dashboard, renderIntegrations, notifyBack, start, STARTER_POSTS
  };
})();
