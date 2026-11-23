/* NS Card – admin felület */
(() => {
  "use strict";
  const N = window.NSC;
  if (!N) return;
  const { esc, fmtFt, imageUrl } = N;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* A jelszó nem szerepel a kódban, csak a lenyomata. Csere: lásd README. */
  const AUTH = { user: "NSadmin", salt: "nscard-admin-v3", hash: "e118b28a9ef37d9a538411b5059ee15fd89ea586906abdf0e3a00149d99a651d" };
  const SESSION_KEY = "nsc.admin.session.v1";
  const GH_KEY = "nsc.admin.github.v1";
  const MAX_IMAGES = 8;
  const IMG_MAX_SIDE = 1200;

  const VIEWS = {
    attekintes: "Áttekintés",
    termekek: "Termékek",
    kategoriak: "Kategóriák",
    oldalak: "Oldalak",
    megjelenes: "Megjelenés",
    beallitasok: "Beállítások",
    publikalas: "Publikálás"
  };

  const VIEW_SUB = {
    attekintes: "A bolt állapota, teendők és alacsony készlet egy helyen.",
    termekek: "Termékek hozzáadása, árak, készlet és képek.",
    kategoriak: "A webshop menüjének és szűrőinek kategóriái.",
    oldalak: "ÁSZF, adatkezelési tájékoztató, szállítás, rólunk és impresszum.",
    megjelenes: "Színek, betűk, animációk és szövegek élő előnézettel.",
    beallitasok: "Elérhetőség, szállítás, fizetés és szerkesztő mód.",
    publikalas: "Élesítés, GitHub kapcsolat és biztonsági mentés."
  };

  function toggleMore(force) {
    const m = $("[data-more-menu]"), sc = $("[data-more-scrim]"), b = $("[data-mobile-more]");
    if (!m) return;
    const open = typeof force === "boolean" ? force : m.hidden;
    m.hidden = !open;
    if (sc) sc.hidden = !open;
    b?.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("lock", open || !!state?.edit);
  }

  const state = {
    live: null,
    draft: null,
    view: "attekintes",
    filters: { q: "", cat: "all", status: "all" },
    edit: null,
    publishing: false,
    publishQueued: false,
    publishStep: "",
    publishPct: 0,
    gh: loadGh(),
    ghState: "unknown"
  };

  /* ---------------- segédek ---------------- */
  let toastTimer = 0;
  function toast(msg, bad = false) {
    const el = $("[data-toast]");
    el.textContent = msg;
    el.classList.toggle("bad", bad);
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), bad ? 5200 : 2800);
  }

  function confirmDialog({ title, text, yes = "Törlés", danger = true, select = null }) {
    return new Promise(resolve => {
      const box = $("[data-confirm]");
      $("[data-cf-title]").textContent = title;
      $("[data-cf-text]").textContent = text;
      const selWrap = $("[data-cf-select-wrap]");
      selWrap.hidden = !select;
      if (select) {
        $("[data-cf-select-label]").textContent = select.label;
        $("[data-cf-select]").innerHTML = select.options.map(o => `<option value="${esc(o.value)}">${esc(o.label)}</option>`).join("");
      }
      const yesBtn = $("[data-cf-yes]");
      yesBtn.textContent = yes;
      yesBtn.className = `btn ${danger ? "btn-danger" : "btn-primary"}`;
      box.hidden = false;
      const prev = document.activeElement;
      yesBtn.focus();
      const done = v => { if (v && select) v = $("[data-cf-select]").value; box.hidden = true; yesBtn.onclick = noBtn.onclick = null; document.removeEventListener("keydown", onKey, true); prev?.focus?.(); resolve(v); };
      const noBtn = $("[data-cf-no]");
      const onKey = e => { if (e.key === "Escape") { e.stopPropagation(); done(false); } };
      yesBtn.onclick = () => done(true);
      noBtn.onclick = () => done(false);
      document.addEventListener("keydown", onKey, true);
    });
  }

  async function sha256(text) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
  }

  function b64FromString(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = "";
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }

  const fmtDate = iso => {
    if (!iso) return "–";
    const d = new Date(iso);
    return isNaN(d) ? "–" : d.toLocaleString("hu-HU", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const ICON = {
    up: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 15 6-6 6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    down: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
    copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    eye: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    eyeOff: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 4.4-1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };

  /* ---------------- belépés ---------------- */
  function session() {
    for (const st of [sessionStorage, localStorage]) {
      try {
        const s = JSON.parse(st.getItem(SESSION_KEY) || "null");
        if (s && s.exp > Date.now() && s.v === AUTH.hash.slice(0, 12)) return true;
      } catch {}
    }
    return false;
  }
  function setSession(remember) {
    const days = remember ? 30 : 0.5;
    const data = JSON.stringify({ exp: Date.now() + days * 864e5, v: AUTH.hash.slice(0, 12) });
    try { (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, data); } catch {}
  }
  function clearSession() {
    try { sessionStorage.removeItem(SESSION_KEY); localStorage.removeItem(SESSION_KEY); } catch {}
  }

  async function onLogin(e) {
    e.preventDefault();
    const f = e.currentTarget;
    const err = $("[data-login-error]");
    err.hidden = true;
    if (!window.crypto?.subtle) {
      err.textContent = "Az admin felület csak biztonságos (https) kapcsolaton érhető el.";
      err.hidden = false;
      return;
    }
    const user = f.user.value.trim();
    const hash = await sha256(`${AUTH.salt}|${user}|${f.pass.value}`);
    if (user === AUTH.user && hash === AUTH.hash) {
      setSession(f.remember.checked);
      f.reset();
      startApp();
    } else {
      err.textContent = "Hibás felhasználónév vagy jelszó.";
      err.hidden = false;
      f.pass.value = "";
      f.pass.focus();
    }
  }

  function logout() {
    clearSession();
    location.hash = "";
    location.reload();
  }

  /* ---------------- GitHub beállítások ---------------- */
  function loadGh() {
    const saved = N.store.get(GH_KEY) || {};
    return {
      owner: saved.owner || N.DEFAULT_REMOTE.owner,
      repo: saved.repo || N.DEFAULT_REMOTE.repo,
      branch: saved.branch || N.DEFAULT_REMOTE.branch,
      path: saved.path || N.DEFAULT_REMOTE.path,
      token: saved.token || "",
      autoPublish: saved.autoPublish !== false
    };
  }
  function saveGh() { N.store.set(GH_KEY, state.gh); }

  const ghBase = gh => `https://api.github.com/repos/${encodeURIComponent(gh.owner)}/${encodeURIComponent(gh.repo)}`;
  const encPath = p => p.split("/").filter(Boolean).map(encodeURIComponent).join("/");

  async function gh(path, init = {}) {
    const res = await fetch(`${ghBase(state.gh)}${path}`, {
      ...init,
      headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", Authorization: `Bearer ${state.gh.token}`, ...(init.body ? { "Content-Type": "application/json" } : {}) }
    });
    if (res.status === 404 && init.allow404) return null;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = res.status === 401 ? "A GitHub token érvénytelen vagy lejárt."
        : res.status === 403 ? "A tokennek nincs írási joga ehhez a repóhoz (Contents: Read and write)."
        : res.status === 404 ? "A repó nem található, vagy a token nem fér hozzá."
        : res.status === 409 ? "Közben valaki más is módosított. Próbáld újra."
        : (data.message || `GitHub hiba (${res.status})`);
      const err = new Error(msg);
      err.status = res.status;
      throw err;
    }
    return data;
  }

  async function verifyGh() {
    if (!state.gh.token) { state.ghState = "none"; return false; }
    try {
      const repo = await gh("");
      state.ghState = repo?.permissions?.push ? "ok" : "readonly";
    } catch (e) {
      state.ghState = e.status === 401 ? "badtoken" : "error";
      state.ghError = e.message;
    }
    return state.ghState === "ok";
  }

  async function putFile(path, contentB64, message, { knownNew = false } = {}) {
    let sha;
    if (!knownNew) {
      const cur = await gh(`/contents/${encPath(path)}?ref=${encodeURIComponent(state.gh.branch)}`, { allow404: true });
      sha = cur?.sha;
    }
    return gh(`/contents/${encPath(path)}`, {
      method: "PUT",
      body: JSON.stringify({ message, content: contentB64, branch: state.gh.branch, ...(sha ? { sha } : {}) })
    });
  }

  /* ---------------- adatok ---------------- */
  const snapshot = d => JSON.stringify({ p: d?.products || [], s: d?.settings || {} });
  const isDirty = () => !!state.live && !!state.draft && snapshot(state.draft) !== snapshot(state.live);

  function changeCount() {
    if (!isDirty()) return 0;
    const live = new Map(state.live.products.map(p => [p.id, JSON.stringify(p)]));
    const draft = new Map(state.draft.products.map(p => [p.id, JSON.stringify(p)]));
    let n = 0;
    for (const [id, v] of draft) if (live.get(id) !== v) n++;
    for (const id of live.keys()) if (!draft.has(id)) n++;
    if (JSON.stringify(state.live.settings) !== JSON.stringify(state.draft.settings)) n++;
    const orderChanged = state.live.products.map(p => p.id).join() !== state.draft.products.map(p => p.id).join();
    return Math.max(n, orderChanged ? 1 : 0);
  }

  async function loadLive() {
    const live = await N.fetchPublished({ fresh: true });
    state.live = { products: live.products, settings: live.settings, updatedAt: live.updatedAt, source: live.source };
    const saved = N.store.get(N.KEYS.draft);
    const clean = saved ? N.sanitizePayload(saved) : null;
    state.draft = clean ? { products: clean.products, settings: clean.settings } : N.clone({ products: state.live.products, settings: state.live.settings });
    state.draftBase = saved?.base || null;
  }

  let publishTimer = 0;
  function saveDraft({ quiet = false } = {}) {
    if (!isDirty()) {
      N.store.del(N.KEYS.draft);
    } else {
      const ok = N.store.set(N.KEYS.draft, { version: N.VERSION, products: state.draft.products, settings: state.draft.settings, base: state.live.updatedAt, savedAt: new Date().toISOString() });
      if (!ok) toast("A böngésző tárhelye megtelt (sok új kép). Publikálj most, hogy a képek feltöltődjenek.", true);
    }
    renderStatus();
    if (!quiet && isDirty() && state.gh.autoPublish && state.gh.token) {
      clearTimeout(publishTimer);
      publishTimer = setTimeout(() => publish({ auto: true }), 1200);
    }
  }

  const products = () => state.draft.products;
  const byId = id => products().find(p => p.id === Number(id));
  const nextId = () => products().reduce((m, p) => Math.max(m, p.id), 0) + 1;
  const cats = () => state.draft.settings.categories;
  const catLabel = v => cats().find(c => c.value === v)?.label || "Nincs kategória";
  const catOptions = (current) => {
    const list = cats().map(c => `<option value="${esc(c.value)}">${esc(c.label)}</option>`);
    if (current && !cats().some(c => c.value === current)) list.unshift(`<option value="${esc(current)}">Nincs kategória (${esc(current)})</option>`);
    return list.join("");
  };

  function statusOf(p) {
    const low = state.draft.settings.lowStock;
    if (p.hidden) return { key: "hidden", label: "Rejtett" };
    if (p.availability === "coming_soon") return { key: "soon", label: "Hamarosan" };
    if (p.stock <= 0) return { key: "out", label: "Elfogyott" };
    if (p.stock <= low) return { key: "low", label: "Alacsony" };
    return { key: "in", label: "Készleten" };
  }

  /* ---------------- publikálás ---------------- */
  function setProgress(step, pct) {
    state.publishStep = step;
    state.publishPct = pct;
    renderStatus();
    renderPublishCard();
  }

  async function publish({ auto = false } = {}) {
    if (state.publishing) { state.publishQueued = true; return false; }
    if (!state.gh.token) {
      if (!auto) { toast("A publikáláshoz előbb kösd össze a GitHubot.", true); go("publikalas"); setTimeout(() => $("#gh-token")?.focus(), 100); }
      return false;
    }
    clearTimeout(publishTimer);
    state.publishing = true;
    const g = state.gh;
    try {
      const pending = [];
      products().forEach(p => p.images.forEach((src, i) => { if (/^data:image\//.test(src)) pending.push({ p, i }); }));
      let done = 0;
      setProgress(pending.length ? `Képek feltöltése (0/${pending.length})` : "Katalógus mentése", 5);
      for (const { p, i } of pending) {
        const src = p.images[i];
        const [, mime, b64] = src.match(/^data:(image\/[a-z+]+);base64,(.*)$/) || [];
        if (!b64) continue;
        const ext = mime === "image/png" ? "png" : mime === "image/jpeg" ? "jpg" : "webp";
        const rand = Math.random().toString(36).slice(2, 8);
        const dir = g.path.includes("/") ? g.path.slice(0, g.path.lastIndexOf("/") + 1) : "";
        const filePath = `${dir}images/${p.id}-${Date.now().toString(36)}-${rand}.${ext}`;
        const res = await putFile(filePath, b64, `Kép feltöltése: ${p.name}`, { knownNew: true });
        p.images[i] = `https://cdn.jsdelivr.net/gh/${g.owner}/${g.repo}@${res.commit.sha}/${filePath}`;
        done++;
        saveDraft({ quiet: true });
        setProgress(`Képek feltöltése (${done}/${pending.length})`, 5 + Math.round(done / pending.length * 75));
      }
      setProgress("Katalógus mentése", 85);
      const payload = N.buildPayload(state.draft.products, state.draft.settings, { updatedBy: "NS Card admin" });
      await putFile(g.path, b64FromString(JSON.stringify(payload, null, 2)), `Katalógus frissítése – ${new Date().toLocaleString("hu-HU")}`);
      state.live = { products: N.clone(payload.products), settings: N.clone(payload.settings), updatedAt: payload.updatedAt, source: "remote" };
      state.draft = N.clone({ products: payload.products, settings: payload.settings });
      N.store.del(N.KEYS.draft);
      N.store.set(N.KEYS.published, payload);
      state.ghState = "ok";
      state.lastError = "";
      setProgress("", 100);
      toast("Publikálva. A bolt legfeljebb 1 percen belül frissül.");
      return true;
    } catch (e) {
      state.lastError = e.message || "A publikálás nem sikerült.";
      if (e.status === 401) state.ghState = "badtoken";
      toast(`Publikálás sikertelen: ${state.lastError}`, true);
      return false;
    } finally {
      state.publishing = false;
      state.publishStep = "";
      renderAll();
      if (state.publishQueued) { state.publishQueued = false; if (isDirty()) publish({ auto: true }); }
    }
  }

  /* ---------------- megjelenítés ---------------- */
  function go(view) {
    if (!VIEWS[view]) view = "attekintes";
    if (view === "megjelenes" && state.mode !== "pro") setMode("pro", { quiet: true });
    $("[data-app]").classList.toggle("studio-mode", view === "megjelenes");
    toggleMore(false);
    if (location.hash.slice(1) !== view) history.replaceState(null, "", `#${view}`);
    state.view = view;
    $$("[data-view]").forEach(s => { s.hidden = s.dataset.view !== view; });
    $$("[data-view-link]").forEach(a => { if (a.dataset.viewLink === view) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    $("[data-view-title]").textContent = VIEWS[view];
    const sub = $("[data-view-sub]");
    if (sub) sub.textContent = VIEW_SUB[view] || "";
    document.title = `${VIEWS[view]} – NS Card admin`;
    renderView();
    window.scrollTo(0, 0);
  }

  function renderStatus() {
    const pill = $("[data-status-pill]");
    const btn = $("[data-publish]");
    const dirty = isDirty();
    let cls = "ok", text = "Minden élesítve";
    if (state.publishing) { cls = "busy"; text = state.publishStep || "Publikálás…"; }
    else if (state.lastError) { cls = "bad"; text = "Publikálás sikertelen"; }
    else if (dirty) { cls = "warn"; const n = changeCount(); text = `${n} nem publikált módosítás`; }
    else if (state.live?.source === "bundled") { cls = "warn"; text = "Még nincs élő katalógus"; }
    pill.className = `status-pill ${cls}`;
    pill.textContent = text;
    btn.disabled = state.publishing || (!dirty && state.live?.source === "remote");
    const bl = $("[data-publish-label]", btn);
    if (bl) bl.textContent = state.publishing ? "Publikálás…" : "Publikálás"; else btn.textContent = state.publishing ? "Publikálás…" : "Publikálás";
    $$("[data-nav-dirty]").forEach(d => { d.hidden = !dirty; });
    const nc = $("[data-nav-count]");
    if (nc) nc.textContent = products().length;
    const cc = $("[data-nav-cat-count]");
    if (cc) cc.textContent = state.draft?.settings?.categories?.length || "";
    const ss = $("[data-side-status]");
    if (ss) {
      const live = state.live?.source === "remote";
      ss.textContent = state.publishing ? "Publikálás folyamatban" : dirty ? "Nem publikált módosítás" : live ? "Élő webshop" : "Webshop admin";
      ss.classList.toggle("warn", dirty || state.publishing);
    }
  }

  function renderView() {
    if (state.view === "attekintes") renderDashboard();
    else if (state.view === "termekek") renderProducts();
    else if (state.view === "kategoriak") renderCategories();
    else if (state.view === "beallitasok") renderSettings();
    else if (state.view === "megjelenes") renderStudio();
    else if (state.view === "oldalak") renderPages();
    else if (state.view === "publikalas") renderPublish();
  }

  function renderAll() { renderStatus(); renderView(); }

  /* --- áttekintés --- */
  function renderDashboard() {
    const list = products();
    const s = state.draft.settings;
    const visible = list.filter(p => !p.hidden);
    const value = visible.filter(p => p.availability !== "coming_soon").reduce((sum, p) => sum + p.price * p.stock, 0);
    const low = visible.filter(p => statusOf(p).key === "low");
    const out = visible.filter(p => statusOf(p).key === "out");
    const soon = visible.filter(p => statusOf(p).key === "soon");
    $("[data-stats]").innerHTML = `
      <a class="stat" href="#termekek" data-stat-filter="all"><span>Termékek a boltban</span><strong>${visible.length}</strong><small>${list.length - visible.length ? `${list.length - visible.length} rejtett` : "nincs rejtett termék"}</small></a>
      <div class="stat"><span>Készlet értéke</span><strong>${fmtFt(value)}</strong><small>eladási áron</small></div>
      <a class="stat" href="#termekek" data-stat-filter="low"><span>Alacsony készlet</span><strong>${low.length}</strong><small>${s.lowStock} db vagy kevesebb</small></a>
      <a class="stat" href="#termekek" data-stat-filter="out"><span>Elfogyott</span><strong>${out.length}</strong><small>${soon.length} hamarosan érkezik</small></a>`;

    const todo = [];
    if (!s.email && !s.payCard) todo.push({ cls: "bad", text: "Add meg a rendelési e-mail címet. Enélkül a vásárlók nem tudnak rendelést leadni.", btn: "Beállítás", act: "go:beallitasok" });
    if (!state.gh.token) todo.push({ cls: "bad", text: "Kösd össze a GitHubot, hogy a módosítások megjelenjenek a boltban.", btn: "Összekötés", act: "go:publikalas" });
    else if (state.ghState === "badtoken") todo.push({ cls: "bad", text: "A GitHub token lejárt vagy érvénytelen.", btn: "Javítás", act: "go:publikalas" });
    if (isDirty()) todo.push({ cls: "", text: `${changeCount()} módosítás még nincs élesítve a boltban.`, btn: "Publikálás", act: "publish" });
    const noImg = visible.filter(p => !p.images.length);
    if (noImg.length) todo.push({ cls: "bad", text: `${noImg.length} terméknek nincs képe.`, btn: "Szerkesztés", act: `edit:${noImg[0].id}` });
    const orphan = visible.filter(p => !cats().some(c => c.value === p.category));
    if (orphan.length) todo.push({ cls: "bad", text: `${orphan.length} termék nincs érvényes kategóriában, ezért a kategória szűrőkben nem jelenik meg.`, btn: "Javítás", act: `edit:${orphan[0].id}` });
    const noDesc = visible.filter(p => !p.description);
    if (noDesc.length) todo.push({ cls: "", text: `${noDesc.length} terméknél hiányzik a leírás. A leírás segít a vásárlóknak és a keresőknek.`, btn: "Pótlás", act: `edit:${noDesc[0].id}` });
    if (!s.pages?.aszf || !s.pages?.adatkezeles) todo.push({ cls: "", text: "Töltsd ki az ÁSZF-et és az adatkezelési tájékoztatót – webshopnál ezek kötelezőek.", btn: "Oldalak", act: "go:oldalak" });
    if (!s.companyName) todo.push({ cls: "", text: "Add meg a cég (üzemeltető) adatait az impresszumhoz.", btn: "Cégadatok", act: "go:beallitasok" });
    if (!todo.length) todo.push({ cls: "ok", text: "Minden rendben, nincs teendő." });
    $("[data-todo]").innerHTML = todo.map(t => `<li class="${t.cls}"><span>${esc(t.text)}</span>${t.btn ? `<button class="btn btn-ghost" type="button" data-act="${t.act}">${t.btn}</button>` : "<span></span>"}</li>`).join("");

    const lowList = visible.filter(p => ["low", "out"].includes(statusOf(p).key)).sort((a, b) => a.stock - b.stock).slice(0, 8);
    $("[data-lowstock]").innerHTML = lowList.length ? lowList.map(p => `
      <div class="mini-row">
        <div class="thumb${p.images[0] ? "" : " empty"}">${p.images[0] ? `<img src="${esc(imageUrl(p.images[0]))}" alt="">` : ""}</div>
        <div><button class="p-name" type="button" data-edit="${p.id}">${esc(p.name)}</button><div><span class="pill ${statusOf(p).key}">${statusOf(p).label}</span></div></div>
        ${stepperHTML(p)}
      </div>`).join("") : '<p class="muted">Minden termékből van elég.</p>';
  }

  /* --- termékek --- */
  function stepperHTML(p) {
    return `<div class="mini-stepper" role="group" aria-label="Készlet: ${esc(p.name)}">
      <button type="button" data-stock="${p.id}" data-d="-1" aria-label="Készlet csökkentése">−</button>
      <input type="number" min="0" inputmode="numeric" value="${p.stock}" data-stock-input="${p.id}" aria-label="Készlet (db)">
      <button type="button" data-stock="${p.id}" data-d="1" aria-label="Készlet növelése">+</button>
    </div>`;
  }

  function filteredProducts() {
    const { q, cat, status } = state.filters;
    const norm = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    return products().filter(p => {
      if (cat !== "all" && p.category !== cat) return false;
      if (status !== "all" && statusOf(p).key !== status) return false;
      if (q && !norm(`${p.name} ${p.set} ${p.badge}`).includes(norm(q))) return false;
      return true;
    });
  }

  function renderProducts() {
    const catSel = $("[data-p-cat]");
    catSel.innerHTML = `<option value="all">Minden kategória</option>` + cats().map(c => `<option value="${esc(c.value)}">${esc(c.label)}</option>`).join("");
    if (state.filters.cat !== "all" && !cats().some(c => c.value === state.filters.cat)) state.filters.cat = "all";
    catSel.value = state.filters.cat;
    $("[data-p-status]").value = state.filters.status;
    const search = $("[data-p-search]");
    if (document.activeElement !== search) search.value = state.filters.q;

    const list = filteredProducts();
    const all = products();
    const filtering = state.filters.q || state.filters.cat !== "all" || state.filters.status !== "all";
    const rows = $("[data-p-rows]");
    const cards = $("[data-p-cards]");
    if (!list.length) {
      const msg = all.length ? "Nincs a szűrésnek megfelelő termék." : "Még nincs termék. Kezdd az „Új termék” gombbal.";
      rows.innerHTML = `<tr><td colspan="6" class="empty-row">${msg}</td></tr>`;
      cards.innerHTML = `<p class="empty-row">${msg}</p>`;
    } else {
      rows.innerHTML = list.map(p => {
        const st = statusOf(p);
        const idx = all.indexOf(p);
        return `
        <tr class="${p.hidden ? "is-hidden" : ""}">
          <td class="col-order"><div class="order-btns">
            <button type="button" data-move="${p.id}" data-d="-1" aria-label="Feljebb" ${filtering || idx === 0 ? "disabled" : ""} title="${filtering ? "Szűrés közben a sorrend nem módosítható" : "Feljebb"}">${ICON.up}</button>
            <button type="button" data-move="${p.id}" data-d="1" aria-label="Lejjebb" ${filtering || idx === all.length - 1 ? "disabled" : ""} title="${filtering ? "Szűrés közben a sorrend nem módosítható" : "Lejjebb"}">${ICON.down}</button>
          </div></td>
          <td><div class="p-cell">
            <div class="thumb${p.images[0] ? "" : " empty"}">${p.images[0] ? `<img src="${esc(imageUrl(p.images[0]))}" alt="" loading="lazy">` : ""}</div>
            <div><button class="p-name" type="button" data-edit="${p.id}">${esc(p.name)}</button><div class="p-sub">${esc(catLabel(p.category))}${p.set ? ` – ${esc(p.set)}` : ""}</div></div>
          </div></td>
          <td class="col-price"><span class="p-price">${p.oldPrice ? `<s>${fmtFt(p.oldPrice)}</s>` : ""}${fmtFt(p.price)}</span></td>
          <td class="col-stock">${stepperHTML(p)}</td>
          <td class="col-status"><span class="pill ${st.key}">${st.label}</span></td>
          <td class="col-actions"><div class="row-menu">
            <button type="button" data-edit="${p.id}" aria-label="Szerkesztés" title="Szerkesztés">${ICON.edit}</button>
            <button type="button" data-dup="${p.id}" aria-label="Másolat készítése" title="Másolat készítése">${ICON.copy}</button>
            <button type="button" data-hide="${p.id}" aria-label="${p.hidden ? "Megjelenítés a boltban" : "Elrejtés a boltból"}" title="${p.hidden ? "Megjelenítés a boltban" : "Elrejtés a boltból"}">${p.hidden ? ICON.eyeOff : ICON.eye}</button>
            <button class="danger" type="button" data-del="${p.id}" aria-label="Törlés" title="Törlés">${ICON.trash}</button>
          </div></td>
        </tr>`;
      }).join("");
      cards.innerHTML = list.map(p => {
        const st = statusOf(p);
        return `
        <div class="pcard-a ${p.hidden ? "is-hidden" : ""}">
          <div class="thumb${p.images[0] ? "" : " empty"}">${p.images[0] ? `<img src="${esc(imageUrl(p.images[0]))}" alt="" loading="lazy">` : ""}</div>
          <div>
            <button class="p-name" type="button" data-edit="${p.id}">${esc(p.name)}</button>
            <div class="p-sub">${esc(catLabel(p.category))}</div>
            <div class="row2"><span class="p-price">${fmtFt(p.price)}</span><span class="pill ${st.key}">${st.label}</span>${stepperHTML(p)}</div>
          </div>
        </div>`;
      }).join("");
    }
    $("[data-p-foot]").textContent = `${list.length} / ${all.length} termék${filtering ? "" : " – a sorrend megegyezik a bolt „Ajánlott sorrend” nézetével"}`;
  }

  function changeStock(id, value) {
    const p = byId(id);
    if (!p) return;
    p.stock = Math.max(0, Math.round(Number(value) || 0));
    saveDraft();
  }

  function moveProduct(id, d) {
    const list = products();
    const i = list.findIndex(p => p.id === id);
    const j = i + d;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    saveDraft();
    renderProducts();
    $(`[data-move="${id}"][data-d="${d}"]`)?.focus();
  }

  async function deleteProduct(id) {
    const p = byId(id);
    if (!p) return false;
    const ok = await confirmDialog({ title: "Törlöd a terméket?", text: `„${p.name}” végleg lekerül a katalógusból a következő publikáláskor. Ha csak ideiglenesen vennéd le, használd inkább az elrejtést.` });
    if (!ok) return false;
    state.draft.products = products().filter(x => x.id !== id);
    saveDraft();
    renderAll();
    toast("A termék törölve.");
    return true;
  }

  function duplicateProduct(id) {
    const p = byId(id);
    if (!p) return;
    const copy = N.sanitizeProduct({ ...N.clone(p), id: nextId(), name: `${p.name} (másolat)`, hidden: true });
    const list = products();
    list.splice(list.indexOf(p) + 1, 0, copy);
    saveDraft();
    renderAll();
    toast("Másolat elkészült (rejtett állapotban).");
    openEditor(copy.id);
  }


  /* --- kategóriák --- */
  function renderCategories() {
    const rows = $("[data-cat-rows]");
    const list = cats();
    $("[data-cat-count]").textContent = `${list.length} kategória`;
    rows.innerHTML = list.map((c, i) => {
      const count = products().filter(p => p.category === c.value).length;
      return `
      <div class="cat-row">
        <div class="order-btns">
          <button type="button" data-cat-move="${i}" data-d="-1" aria-label="Feljebb" ${i === 0 ? "disabled" : ""}>${ICON.up}</button>
          <button type="button" data-cat-move="${i}" data-d="1" aria-label="Lejjebb" ${i === list.length - 1 ? "disabled" : ""}>${ICON.down}</button>
        </div>
        <label class="sr-only" for="cat-${i}">Kategória neve</label>
        <input class="input" id="cat-${i}" value="${esc(c.label)}" maxlength="40" data-cat-label="${i}">
        <span class="meta">${count} termék</span>
        <div class="row-menu">
          <button type="button" data-cat-filter="${esc(c.value)}" aria-label="Termékek megnyitása" title="Termékek megnyitása">${ICON.eye}</button>
          <button class="danger" type="button" data-cat-del="${i}" aria-label="Törlés" title="Törlés">${ICON.trash}</button>
        </div>
      </div>`;
    }).join("");
  }

  function renameCategory(i, label) {
    const c = cats()[i];
    const clean = String(label || "").trim();
    if (!c) return;
    if (!clean) { toast("A kategória neve nem lehet üres.", true); renderCategories(); return; }
    if (clean === c.label) return;
    c.label = clean;
    saveDraft();
    toast("Kategória átnevezve.");
  }

  function addCategory(label) {
    const clean = String(label || "").trim();
    if (!clean) { toast("Adj nevet az új kategóriának.", true); return false; }
    let value = N.slugify(clean) || `kategoria-${Date.now().toString(36)}`;
    while (cats().some(c => c.value === value)) value += "-2";
    cats().push({ value, label: clean, hidden: false });
    saveDraft();
    renderCategories();
    toast(`„${clean}” kategória hozzáadva.`);
    return true;
  }

  async function deleteCategory(i) {
    const c = cats()[i];
    if (!c) return;
    if (cats().length <= 1) { toast("Legalább egy kategóriának maradnia kell.", true); return; }
    const used = products().filter(p => p.category === c.value);
    if (used.length) {
      const target = await confirmDialog({
        title: `Törlöd: ${c.label}?`,
        text: `${used.length} termék tartozik ide. Válaszd ki, melyik kategóriába kerüljenek át.`,
        yes: "Áthelyezés és törlés",
        select: { label: "Új kategória", options: cats().filter(x => x !== c).map(x => ({ value: x.value, label: x.label })) }
      });
      if (!target) return;
      used.forEach(p => { p.category = target; });
    } else {
      const ok = await confirmDialog({ title: `Törlöd: ${c.label}?`, text: "Ebben a kategóriában nincs termék.", yes: "Törlés" });
      if (!ok) return;
    }
    state.draft.settings.categories = cats().filter(x => x !== c);
    saveDraft();
    renderCategories();
    toast("Kategória törölve.");
  }

  /* --- beállítások --- */
  function renderSettings() {
    const f = $("[data-settings-form]");
    const s = state.draft.settings;
    for (const [k, v] of Object.entries(s)) {
      if (k === "categories") continue;
      const el = f.elements[k];
      if (!el || el instanceof RadioNodeList) continue;
      if (el.type === "checkbox") el.checked = !!v; else el.value = v;
    }
    $("[data-settings-note]").textContent = "";
    renderCoupons();
  }

  function onSettingsSubmit(e) {
    e.preventDefault();
    const f = e.currentTarget;
    const raw = {};
    for (const k of Object.keys(N.DEFAULT_SETTINGS)) {
      const el = f.elements[k];
      if (!el) continue;
      raw[k] = el.type === "checkbox" ? el.checked : el.value;
    }
    if (raw.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.email)) {
      f.elements.email.setAttribute("aria-invalid", "true");
      f.elements.email.focus();
      toast("Az e-mail cím formátuma hibás.", true);
      return;
    }
    f.elements.email.removeAttribute("aria-invalid");
    for (const k of ["instagram", "facebook", "tiktok"]) {
      if (raw[k] && !/^https?:\/\//i.test(raw[k])) raw[k] = `https://${raw[k].replace(/^\/+/, "")}`;
    }
    if (!raw.shipHome && !raw.shipLocker && !raw.shipPickup) {
      toast("Legalább egy szállítási módot hagyj bekapcsolva.", true);
      return;
    }
    raw.categories = state.draft.settings.categories;
    raw.texts = state.draft.settings.texts;
    raw.theme = state.draft.settings.theme;
    raw.coupons = state.draft.settings.coupons;
    raw.pages = state.draft.settings.pages;
    state.draft.settings = N.sanitizeSettings(raw);
    saveDraft();
    renderStatus();
    const auto = state.gh.autoPublish && state.gh.token;
    $("[data-settings-note]").textContent = isDirty() ? (auto ? "Mentve, publikálás folyamatban…" : "Mentve. Publikáld, hogy élesedjen.") : "Nincs változás.";
    toast(isDirty() ? "Beállítások mentve." : "Nincs változás.");
  }

  /* --- publikálás --- */
  function renderPublishCard() {
    const card = $("[data-publish-card]");
    if (!card || state.view !== "publikalas") return;
    const dirty = isDirty();
    const g = state.gh;
    const title = state.publishing ? "Publikálás folyamatban"
      : dirty ? `${changeCount()} módosítás vár élesítésre`
      : state.live?.source === "remote" ? "A bolt a legfrissebb adatokat mutatja"
      : "Még nincs élő katalógus a GitHubon";
    card.innerHTML = `
      <div>
        <h2>${esc(title)}</h2>
        <div class="meta">
          <span>Utolsó publikálás: ${state.live?.source === "remote" ? esc(fmtDate(state.live.updatedAt)) : "még nem volt"}</span>
          <span>Tároló: ${esc(`${g.owner}/${g.repo}`)} – ${esc(g.path)}</span>
          ${state.lastError ? `<span style="color:var(--danger)">Utolsó hiba: ${esc(state.lastError)}</span>` : ""}
        </div>
      </div>
      <button class="btn btn-primary" type="button" data-publish ${state.publishing || (!dirty && state.live?.source === "remote") ? "disabled" : ""}>${state.publishing ? esc(state.publishStep || "Publikálás…") : "Publikálás most"}</button>
      ${state.publishing ? `<div class="progress"><i style="width:${state.publishPct}%"></i></div>` : ""}`;
  }

  function renderGhPill() {
    const pill = $("[data-gh-pill]");
    const map = {
      ok: ["ok", "Összekötve"], none: ["warn", "Nincs összekötve"], badtoken: ["bad", "Érvénytelen token"],
      readonly: ["bad", "Nincs írási jog"], error: ["bad", "Hiba"], unknown: [state.gh.token ? "busy" : "warn", state.gh.token ? "Ellenőrzés…" : "Nincs összekötve"]
    };
    const [cls, text] = map[state.ghState] || map.unknown;
    pill.className = `status-pill ${cls}`;
    pill.textContent = text;
  }

  function renderPublish() {
    renderPublishCard();
    const f = $("[data-gh-form]");
    const g = state.gh;
    ["owner", "repo", "branch", "path"].forEach(k => { if (document.activeElement !== f.elements[k]) f.elements[k].value = g[k]; });
    if (document.activeElement !== f.elements.token) f.elements.token.value = g.token;
    f.elements.autoPublish.checked = !!g.autoPublish;
    $("[data-gh-repo-name]").textContent = g.repo;
    renderGhPill();
  }

  async function onGhSubmit(e) {
    e.preventDefault();
    const f = e.currentTarget;
    const msg = $("[data-gh-msg]");
    state.gh = {
      owner: f.elements.owner.value.trim() || N.DEFAULT_REMOTE.owner,
      repo: f.elements.repo.value.trim() || N.DEFAULT_REMOTE.repo,
      branch: f.elements.branch.value.trim() || "main",
      path: f.elements.path.value.trim().replace(/^\/+/, "") || N.DEFAULT_REMOTE.path,
      token: f.elements.token.value.trim(),
      autoPublish: f.elements.autoPublish.checked
    };
    saveGh();
    msg.className = "form-msg";
    if (!state.gh.token) { state.ghState = "none"; msg.textContent = "Mentve. Token nélkül nem lehet publikálni."; renderGhPill(); return; }
    msg.textContent = "Kapcsolat ellenőrzése…";
    state.ghState = "unknown"; renderGhPill();
    const ok = await verifyGh();
    renderGhPill();
    if (ok) {
      msg.className = "form-msg ok";
      msg.textContent = "Rendben: a token tud írni a repóba.";
      state.lastError = "";
      renderStatus();
      if (isDirty() && state.gh.autoPublish) publish({ auto: true });
    } else {
      msg.className = "form-msg bad";
      msg.textContent = state.ghState === "readonly" ? "A token csak olvasni tud. Adj neki „Contents: Read and write” jogot." : (state.ghError || "Nem sikerült csatlakozni.");
    }
  }

  function exportJson() {
    const payload = N.buildPayload(state.draft.products, state.draft.settings, { updatedBy: "NS Card admin export" });
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `nscard-katalogus-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  async function importJson(file) {
    try {
      const parsed = JSON.parse(await file.text());
      const clean = N.sanitizePayload(parsed);
      if (!clean) throw new Error();
      const ok = await confirmDialog({ title: "Betöltöd a fájlt?", text: `${clean.products.length} termék kerül a mostani katalógus helyére. Publikálásig csak itt látszik.`, yes: "Betöltés", danger: false });
      if (!ok) return;
      state.draft = { products: clean.products, settings: parsed && parsed.settings ? clean.settings : state.draft.settings };
      saveDraft();
      renderAll();
      toast("A katalógus betöltve.");
    } catch {
      toast("Ez a fájl nem NS Card katalógus.", true);
    }
  }

  async function discardDraft() {
    if (!isDirty()) { toast("Nincs elvethető módosítás."); return; }
    const ok = await confirmDialog({ title: "Elveted a módosításokat?", text: "Minden nem publikált változás elveszik, és az admin visszaáll az élő katalógusra.", yes: "Elvetés" });
    if (!ok) return;
    state.draft = N.clone({ products: state.live.products, settings: state.live.settings });
    N.store.del(N.KEYS.draft);
    renderAll();
    toast("Visszaállítva az élő verzióra.");
  }

  /* ---------------- termék szerkesztő ---------------- */
  function editorForm() { return $("[data-editor-form]"); }

  function openEditor(id = null) {
    const p = id ? byId(id) : null;
    const f = editorForm();
    const defCat = state.filters.cat !== "all" ? state.filters.cat : (cats()[0]?.value || "booster");
    if (!$("[data-e-flags]").children.length) $("[data-e-flags]").innerHTML = N.FLAGS.map(fl => `<label><input type="checkbox" name="flags" value="${fl.value}"><span>${esc(fl.label)}</span></label>`).join("");
    const d = p || N.sanitizeProduct({ id: nextId(), category: defCat, availability: "in_stock", stock: 1 });
    $("[data-e-cats]").innerHTML = catOptions(d.category);
    state.edit = { id: p ? p.id : null, images: [...(p?.images || [])] };
    f.elements.name.value = p ? d.name : "";
    f.elements.category.value = d.category;
    f.elements.set.value = d.set;
    f.elements.line.value = d.line;
    f.elements.description.value = d.description;
    f.elements.price.value = p ? d.price : "";
    f.elements.oldPrice.value = d.oldPrice || "";
    f.elements.stock.value = d.stock;
    $$('input[name="availability"]', f).forEach(r => { r.checked = r.value === d.availability; });
    f.elements.hidden.checked = !!d.hidden;
    $$('input[name="flags"]', f).forEach(c => { c.checked = d.flags.includes(c.value); });
    f.elements.badge.value = d.badge;
    $$("[data-e-err]").forEach(el => { el.hidden = true; });
    $$(".input", f).forEach(el => el.removeAttribute("aria-invalid"));
    $("[data-ed-title]").textContent = p ? "Termék szerkesztése" : "Új termék";
    $("[data-ed-delete]").hidden = !p;
    renderImages();
    updateDiscountHint();
    state.edit.initial = JSON.stringify(readEditor());
    $("[data-editor]").classList.add("open");
    $("[data-scrim]").classList.add("open");
    document.body.classList.add("lock");
    $(".editor-body").scrollTop = 0;
    setTimeout(() => f.elements.name.focus(), 60);
  }

  async function closeEditor(force = false) {
    if (!state.edit) return;
    if (!force && JSON.stringify(readEditor()) !== state.edit.initial) {
      const ok = await confirmDialog({ title: "Elveted a változtatásokat?", text: "A termék módosításai nincsenek elmentve.", yes: "Elvetés" });
      if (!ok) return;
    }
    state.edit = null;
    $("[data-editor]").classList.remove("open");
    $("[data-scrim]").classList.remove("open");
    document.body.classList.remove("lock");
  }

  function readEditor() {
    const f = editorForm();
    return {
      name: f.elements.name.value.trim(),
      category: f.elements.category.value,
      set: f.elements.set.value.trim(),
      line: f.elements.line.value.trim(),
      description: f.elements.description.value.trim(),
      price: f.elements.price.value,
      oldPrice: f.elements.oldPrice.value,
      stock: f.elements.stock.value,
      availability: $('input[name="availability"]:checked', f)?.value || "in_stock",
      hidden: f.elements.hidden.checked,
      flags: $$('input[name="flags"]:checked', f).map(c => c.value),
      badge: f.elements.badge.value.trim(),
      images: [...(state.edit?.images || [])]
    };
  }

  function updateDiscountHint() {
    const f = editorForm();
    const price = Number(f.elements.price.value), old = Number(f.elements.oldPrice.value);
    const el = $("[data-e-discount]");
    el.textContent = old > price && price > 0 ? `A boltban −${Math.round((1 - price / old) * 100)}% kedvezmény jelenik meg.` : (old && old <= price ? "Az eredeti ár legyen nagyobb az árnál." : "Üresen hagyva nincs akció.");
  }

  function renderImages() {
    const grid = $("[data-img-grid]");
    const imgs = state.edit?.images || [];
    grid.innerHTML = imgs.map((src, i) => `
      <div class="img-item ${i === 0 ? "primary" : ""}">
        <div class="ph"><img src="${esc(imageUrl(src))}" alt="${i + 1}. kép"></div>
        ${i === 0 ? '<span class="main-tag">Fő kép</span>' : ""}
        ${src.startsWith("data:") ? '<span class="new-tag">Új</span>' : ""}
        <div class="img-tools">
          <button type="button" data-img-move="${i}" data-d="-1" aria-label="Előrébb" ${i === 0 ? "disabled" : ""}>◀</button>
          <button type="button" data-img-move="${i}" data-d="1" aria-label="Hátrébb" ${i === imgs.length - 1 ? "disabled" : ""}>▶</button>
          <button class="del" type="button" data-img-del="${i}" aria-label="Kép törlése">Törlés</button>
        </div>
      </div>`).join("");
    $("[data-dropzone]").hidden = imgs.length >= MAX_IMAGES;
  }

  async function compressImage(file) {
    const bmp = await (window.createImageBitmap ? createImageBitmap(file) : new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = rej;
      img.src = URL.createObjectURL(file);
    }));
    const w = bmp.width, h = bmp.height;
    const scale = Math.min(1, IMG_MAX_SIDE / Math.max(w, h));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    canvas.getContext("2d").drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(res => canvas.toBlob(res, "image/webp", 0.86));
    const out = blob && blob.type === "image/webp" ? blob : await new Promise(res => canvas.toBlob(res, "image/png"));
    return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(out); });
  }

  async function addFiles(files) {
    const list = [...files].filter(f => /^image\//.test(f.type));
    if (!list.length) { toast("Csak képfájlt tölthetsz fel.", true); return; }
    const room = MAX_IMAGES - state.edit.images.length;
    if (list.length > room) toast(`Legfeljebb ${MAX_IMAGES} kép lehet, ${room} kép került be.`, true);
    for (const file of list.slice(0, room)) {
      try { state.edit.images.push(await compressImage(file)); }
      catch { toast(`Nem sikerült beolvasni: ${file.name}`, true); }
      renderImages();
    }
    $("[data-e-err=images]").hidden = true;
  }

  async function onEditorSubmit(e) {
    e.preventDefault();
    const raw = readEditor();
    const errs = {};
    if (!raw.name) errs.name = "Add meg a termék nevét.";
    if (!(Number(raw.price) > 0)) errs.price = "Adj meg 0-nál nagyobb árat.";
    $$("[data-e-err]").forEach(el => { const k = el.dataset.eErr; el.hidden = !errs[k]; el.textContent = errs[k] || ""; });
    const f = editorForm();
    ["name", "price"].forEach(k => f.elements[k].setAttribute("aria-invalid", String(!!errs[k])));
    const first = Object.keys(errs)[0];
    if (first) { f.elements[first]?.focus(); return; }
    const isNew = !state.edit.id;
    const id = state.edit.id || nextId();
    const product = N.sanitizeProduct({ ...raw, id });
    if (isNew) state.draft.products.unshift(product);
    else state.draft.products = products().map(p => p.id === id ? product : p);
    if (!product.images.length) toast("Mentve, de a terméknek még nincs képe.", true);
    else toast(isNew ? "Az új termék elmentve." : "A módosítás elmentve.");
    await closeEditor(true);
    saveDraft();
    renderAll();
  }

  /* ---------------- Tájékoztató oldalak (ÁSZF, adatkezelés…) ---------------- */
  const PAGE_TEMPLATES = {
    aszf: `## 1. A szolgáltató adatai
A webshop üzemeltetője: [Cégnév / vállalkozó neve]
Székhely: [cím]
Adószám: [adószám] · Nyilvántartási szám: [szám]
E-mail: [e-mail] · Telefon: [telefonszám]
Tárhelyszolgáltató: Cloudflare, Inc. (101 Townsend St, San Francisco, CA 94107, USA)

## 2. A szerződés tárgya és nyelve
Jelen feltételek az NS Card webshopban (www.nscard.hu) történő vásárlásra vonatkoznak. A szerződés nyelve magyar, a szerződést nem iktatjuk, utólag nem hozzáférhető.

## 3. Termékek és árak
A termékek bontatlan, gyári Pokémon TCG termékek. Az árak forintban értendők, és [tartalmazzák az áfát / alanyi adómentesek]. A szállítási díjat a pénztár külön mutatja.

## 4. A rendelés menete
- A terméket a kosárba teszed, majd a pénztárban megadod az adataidat.
- A rendelés elküldése után e-mailben visszaigazoljuk, és ezzel jön létre a szerződés.
- Az adatbeviteli hibákat a rendelés elküldése előtt a pénztárban javíthatod.

## 5. Fizetés
[Banki átutalás / utánvét / bankkártya – a ténylegesen elérhető módok leírása.]

## 6. Szállítás
[Szállítási módok, díjak, várható szállítási idő.]

## 7. Elállási jog
A 45/2014. (II. 26.) Korm. rendelet alapján a termék átvételétől számított 14 napon belül indoklás nélkül elállhatsz a vásárlástól. Az elállási szándékot e-mailben jelezd: [e-mail]. A terméket bontatlan, eredeti állapotban, az elállás közlésétől számított 14 napon belül kell visszaküldeni; a visszaküldés költsége [a vásárlót terheli]. A vételárat a visszaérkezést követően legkésőbb 14 napon belül visszautaljuk.

## 8. Szavatosság és panaszkezelés
Panaszodat a [e-mail] címen jelezheted, 30 napon belül írásban válaszolunk. Jogvita esetén a lakóhelyed szerinti békéltető testülethez fordulhatsz, illetve használhatod az EU online vitarendezési platformját: [link](https://ec.europa.eu/consumers/odr).`,
    adatkezeles: `## Adatkezelő
[Cégnév / vállalkozó neve] · [székhely] · [e-mail]

## Milyen adatokat kezelünk?
- Rendeléskor: név, e-mail cím, telefonszám, szállítási cím vagy csomagautomata, megjegyzés.
- Kapcsolatfelvételkor: név, e-mail cím, üzenet.
- A böngésződ helyi tárhelyén (nem sütiként): kosár, kedvencek, megnézett termékek. Ezek nem jutnak el hozzánk.

## Az adatkezelés célja és jogalapja
A rendelés teljesítése és a kapcsolattartás – szerződés teljesítése (GDPR 6. cikk (1) b)). A számlázás – jogi kötelezettség (GDPR 6. cikk (1) c)).

## Meddig őrizzük az adatokat?
A rendelési adatokat [a szerződés teljesítéséig és az elévülési időig (5 év)], a számviteli bizonylatokat 8 évig.

## Kik férhetnek hozzá az adatokhoz?
- Tárhely: Cloudflare, Inc.
- Kártyás fizetés esetén: Stripe Payments Europe Ltd.
- Kiszállítás: [futárszolgálat neve]
- E-mail szolgáltató: [szolgáltató neve]

## A jogaid
Kérhetsz tájékoztatást, helyesbítést, törlést, az adatkezelés korlátozását és adathordozhatóságot, valamint tiltakozhatsz. Kérésedet a [e-mail] címre küldd. Panasszal a Nemzeti Adatvédelmi és Információszabadság Hatósághoz (NAIH, [link](https://naih.hu)) fordulhatsz.`,
    szallitas: `## Szállítási módok
- Házhozszállítás futárral: [díj], várható kézbesítés [1–3] munkanap.
- Csomagautomata: [díj], várható kézbesítés [1–3] munkanap.
- Személyes átvétel: [helyszín és időpont egyeztetés szerint].

## Fizetési módok
- Banki átutalás: az utalási adatokat a visszaigazoló e-mailben küldjük.
- Utánvét: fizetés a csomag átvételekor.

## Elállás és visszaküldés
A termék átvételétől számított 14 napon belül indoklás nélkül elállhatsz. Írj a [e-mail] címre, és küldd vissza a bontatlan terméket.`,
    rolunk: `## Kik vagyunk?
[Pár mondat a boltról: mióta foglalkoztok Pokémon kártyákkal, mi a célotok, miért érdemes nálatok vásárolni.]

## Amit vállalunk
- Csak eredeti, bontatlan termékek.
- Gondos, biztonságos csomagolás.
- Gyors válasz minden kérdésre.`
  };

  function pageFilled(key) { return !!state.draft.settings.pages?.[key]?.body; }

  function renderPages() {
    const list = $("[data-pages-list]");
    if (!list) return;
    const s = state.draft.settings;
    if (!state.pageKey) state.pageKey = "aszf";
    const items = [...N.INFO_PAGES.map(pg => ({ key: pg.key, label: pg.label, on: pageFilled(pg.key) })), { key: "impresszum", label: "Impresszum", on: !!(s.companyName || s.email), auto: true }];
    list.innerHTML = `<div class="page-items">${items.map(it => `<button type="button" class="page-item" data-page-key="${it.key}" aria-pressed="${state.pageKey === it.key}"><span><b>${esc(it.label)}</b><small>${it.auto ? "Automatikus, a cégadatokból" : it.on ? "Kitöltve, látszik a boltban" : "Üres, nem látszik"}</small></span><i class="pill ${it.on ? "in" : "hidden"}">${it.on ? "Aktív" : "Üres"}</i></button>`).join("")}</div>`;

    const key = state.pageKey;
    const ed = $("[data-page-editor]");
    const body = $("[data-page-body]");
    const meta = N.INFO_PAGES.find(pg => pg.key === key);
    $("[data-page-open]").href = `/info?p=${key}`;
    if (key === "impresszum") {
      $("[data-page-title]").textContent = "Impresszum";
      $("[data-page-meta]").textContent = "Automatikusan készül a Beállítások → Cég adatai és a bolt elérhetőségei alapján.";
      ed.classList.add("auto");
      $("[data-page-preview]").innerHTML = `<dl>${[["Webshop", s.shopName], ["Üzemeltető", s.companyName], ["Székhely", s.companyAddress], ["Adószám", s.taxNumber], ["Nyilvántartási szám", s.regNumber], ["E-mail", s.email], ["Telefon", s.phone], ["Tárhelyszolgáltató", "Cloudflare, Inc."]].filter(([, v]) => v).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl><p><a class="btn btn-primary btn-sm" href="#beallitasok">Cégadatok szerkesztése</a></p>`;
      return;
    }
    ed.classList.remove("auto");
    $("[data-page-title]").textContent = meta.label;
    const text = s.pages?.[key]?.body || "";
    $("[data-page-meta]").textContent = text ? `${text.length.toLocaleString("hu-HU")} karakter` : "Még üres. Kezdd a sablonnal, vagy írd meg a saját szövegedet.";
    if (document.activeElement !== body) body.value = text;
    body.placeholder = "## Cím\nSzöveg…";
    $("[data-page-template]").hidden = !!text;
    $("[data-page-preview]").innerHTML = text ? N.mdToHtml(text) : '<p class="muted">Az előnézet itt jelenik meg.</p>';
  }

  let pageSaveT = 0;
  function setPageBody(key, text) {
    const pages = { ...(state.draft.settings.pages || {}) };
    if (text.trim()) pages[key] = { body: text }; else delete pages[key];
    state.draft.settings.pages = pages;
    $("[data-page-preview]").innerHTML = text.trim() ? N.mdToHtml(text) : '<p class="muted">Az előnézet itt jelenik meg.</p>';
    $("[data-page-meta]").textContent = text ? `${text.length.toLocaleString("hu-HU")} karakter` : "Még üres.";
    $("[data-page-template]").hidden = !!text.trim();
    clearTimeout(pageSaveT);
    pageSaveT = setTimeout(() => { saveDraft(); renderPagesList(); }, 600);
  }
  function renderPagesList() { if (state.view === "oldalak") { const ae = document.activeElement; renderPages(); if (ae?.matches?.("[data-page-body]")) ae.focus(); } }

  /* ---------------- Kuponok ---------------- */
  const CP_TYPES = { percent: "Százalék", fixed: "Fix összeg", ship: "Ingyenes szállítás" };
  function renderCoupons() {
    const rows = $("[data-cp-rows]");
    if (!rows) return;
    const list = state.draft.settings.coupons || [];
    $("[data-cp-count]").textContent = list.length ? `${list.filter(c => c.active).length} aktív / ${list.length}` : "";
    rows.innerHTML = list.length ? list.map((c, i) => `
      <div class="cp-row${c.active ? "" : " off"}">
        <code class="cp-code">${esc(c.code)}</code>
        <span class="cp-desc"><b>${c.type === "percent" ? `${c.value}%` : c.type === "fixed" ? fmtFt(c.value) : "Ingyenes szállítás"}</b><small>${esc(CP_TYPES[c.type])}${c.minOrder ? ` · ${fmtFt(c.minOrder)} felett` : ""}</small></span>
        <label class="toggle compact"><input type="checkbox" data-cp-active="${i}" ${c.active ? "checked" : ""}><span class="switch"></span><span class="sr-only">Aktív</span></label>
        <button class="icon-btn danger-hover" type="button" data-cp-del="${i}" aria-label="${esc(c.code)} törlése"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
      </div>`).join("") : '<p class="muted">Még nincs kuponkód.</p>';
  }
  function addCoupon(form) {
    const code = String(form.code.value || "").toUpperCase().replace(/[^A-Z0-9_-]/g, "");
    if (!code) { toast("Adj meg egy kódot (betűk, számok, kötőjel).", true); form.code.focus(); return; }
    const list = state.draft.settings.coupons || [];
    if (list.some(c => c.code === code)) { toast("Ilyen kód már van.", true); return; }
    const type = form.type.value;
    const value = Number(form.value.value) || 0;
    if (type !== "ship" && value <= 0) { toast("Add meg a kedvezmény értékét.", true); form.value.focus(); return; }
    state.draft.settings.coupons = N.sanitizeCoupons([...list, { code, type, value, minOrder: Number(form.minOrder.value) || 0, active: true }]);
    form.reset();
    $("[data-cp-unit]").textContent = "%";
    $("#cp-value").disabled = false;
    saveDraft();
    renderCoupons();
    toast(`Kupon hozzáadva: ${code}`);
  }

  /* ---------------- Haladó mód: Megjelenés szerkesztő ---------------- */
  const MODE_KEY = "nsc.admin.mode.v1";
  state.mode = N.store.get(MODE_KEY) === "pro" ? "pro" : "basic";

  function applyMode() {
    document.documentElement.dataset.adminMode = state.mode;
    $$("[data-mode]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.mode === state.mode)));
    $$("[data-mode-toggle]").forEach(b => { b.textContent = state.mode === "pro" ? "Kezdő módra váltás" : "Haladó mód bekapcsolása"; });
  }
  function setMode(mode, { quiet = false } = {}) {
    if (mode !== "pro" && mode !== "basic") return;
    const changed = state.mode !== mode;
    state.mode = mode;
    N.store.set(MODE_KEY, mode);
    applyMode();
    if (mode === "basic" && state.view === "megjelenes") go("attekintes");
    if (changed && !quiet) toast(mode === "pro" ? "Haladó mód: a Megjelenés menüben az egész oldalt szerkesztheted." : "Kezdő mód: termékek, kategóriák és alapbeállítások.");
  }

  const studio = { tab: "style", device: "desktop", page: "/", textQ: "", saveT: 0, loaded: false, open: false };
  const COLOR_FIELDS = [
    ["bg", "Háttér", "Az oldal alapszíne"],
    ["surface", "Felületek", "Fiókok, panelek, kártyák alapja"],
    ["primary", "Fő szín", "Gombok, kosár, kiemelések"],
    ["accent", "Kiemelő szín", "Árak, csillogás, ritka jelölés"],
    ["secondary", "Másodlagos szín", "Linkek, új termék, fények"],
    ["text", "Szöveg", "Címek és törzsszöveg"]
  ];
  const ANIM_FIELDS = [
    ["float", "Lebegő termékek", "A nyitó képen és a termékoldalon lebegnek a dobozok."],
    ["sparkles", "Csillogás és konfetti", "Csillanások, csillagok és konfetti a csomagbontásnál."],
    ["glow", "Holo fények", "Mozgó háttérfények, holo fény a játékszőnyegen és a címen."],
    ["tilt", "Kártya dőlés", "Asztali gépen a termékkártya követi az egeret."],
    ["reveal", "Megjelenés görgetéskor", "A kártyák finoman beúsznak görgetés közben."],
    ["ticker", "Futó sáv", "A kategóriák sávja folyamatosan halad."],
    ["fly", "Kosárba repülés", "A termék képe a kosárba repül."],
    ["pack", "Csomagbontás", "A csomag kinyílik, a lapok egyenként fordulnak meg."]
  ];
  const TEXT_TARGET = { "Kezdőlap: nyitó blokk": ".hero", "Kezdőlap: csomagbontó": "#csomag", "Lábléc": ".site-footer", "Fejléc és menü": "body" };
  const TEXT_KEY_TARGET = { cats: "[data-section=categories]", link: "[data-section=featured]", featured: "[data-section=featured]", soon: "#hamarosan", steps: "#rendeles", contact: "#kapcsolat" };

  const theme = () => state.draft.settings.theme;
  const texts = () => state.draft.settings.texts || (state.draft.settings.texts = {});

  function hexLum(h) {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; })
      .reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0);
  }
  const contrast = (a, b) => { const x = hexLum(a), y = hexLum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };

  function setTheme(path, value) {
    const th = N.clone(theme());
    const keys = path.split(".");
    let o = th;
    for (let i = 0; i < keys.length - 1; i++) o = o[keys[i]];
    o[keys[keys.length - 1]] = value;
    if (path.startsWith("colors.")) th.preset = "custom";
    state.draft.settings.theme = N.sanitizeTheme(th);
    studioChanged();
  }
  function studioChanged() {
    sendPreview();
    clearTimeout(studio.saveT);
    studio.saveT = setTimeout(() => saveDraft(), 700);
  }

  /* élő előnézet */
  let pvRaf = 0;
  function sendPreview(withProducts = false) {
    cancelAnimationFrame(pvRaf);
    pvRaf = requestAnimationFrame(() => {
      const w = $("[data-preview-iframe]")?.contentWindow;
      if (!w) return;
      try { w.postMessage({ type: "nsc:preview", settings: state.draft.settings, products: withProducts ? state.draft.products : undefined }, location.origin); } catch {}
    });
  }
  function previewScroll(target) {
    if (!target || studio.page !== "/") return;
    const w = $("[data-preview-iframe]")?.contentWindow;
    try { w?.postMessage({ type: "nsc:preview-scroll", target }, location.origin); } catch {}
  }
  function previewUrl() {
    if (studio.page === "product") {
      const p = products().find(x => !x.hidden && x.availability !== "coming_soon" && x.stock > 0) || products()[0];
      return p ? `/product?id=${p.id}` : "/products";
    }
    return studio.page;
  }
  function loadPreview() {
    const f = $("[data-preview-iframe]");
    if (!f) return;
    studio.loaded = true;
    f.src = previewUrl();
  }
  function layoutPreview() {
    const stage = $("[data-preview-stage]"), frame = $("[data-preview-frame]"), f = $("[data-preview-iframe]");
    if (!stage || !frame || !f || !stage.clientWidth) return;
    const W = stage.clientWidth - 28, H = stage.clientHeight - 28;
    const phone = studio.device === "mobile";
    const vw = phone ? 390 : 1280;
    const s = phone ? Math.min(1, (W - 20) / vw, H / 700) : Math.min(1, W / vw);
    const vh = phone ? Math.min(844, Math.max(560, Math.floor((H - 20) / s))) : Math.floor(H / s);
    frame.classList.toggle("phone", phone);
    f.style.width = `${vw}px`;
    f.style.height = `${vh}px`;
    f.style.transform = `scale(${s})`;
    frame.style.width = `${Math.round(vw * s)}px`;
    frame.style.height = `${Math.round(vh * s)}px`;
  }

  /* panel tartalom */
  const seg = (path, opts, cur, label) => `
    <div class="seg-row">${label ? `<span>${label}</span>` : ""}<div class="segmented" role="radiogroup"${label ? ` aria-label="${esc(label)}"` : ""}>${opts.map(([v, l]) => `<label><input type="radio" name="th-${path}" value="${v}" data-th="${path}" ${String(cur) === String(v) ? "checked" : ""}><span>${l}</span></label>`).join("")}</div></div>`;

  function styleTabHTML() {
    const th = theme(), c = th.colors;
    const warn = [];
    if (contrast(c.text, c.bg) < 4.5) warn.push("A szöveg nehezen olvasható ezen a háttéren – válassz világosabb vagy sötétebb szövegszínt.");
    if (contrast(c.text, c.surface) < 4) warn.push("A felületek (kártyák, fiókok) és a szöveg között kicsi a kontraszt.");
    return `
      <div class="sgroup"><h3>Kész témák <small>egy kattintás</small></h3>
        <div class="presets">${N.PRESETS.map(p => `<button type="button" class="preset" data-preset="${p.key}" aria-pressed="${th.preset === p.key}"><span class="sw" style="background:linear-gradient(150deg, ${p.colors.surface}, ${p.colors.bg})"><i style="background:${p.colors.primary}"></i><i style="background:${p.colors.accent}"></i><i style="background:${p.colors.secondary}"></i></span><b>${esc(p.label)}</b></button>`).join("")}</div>
      </div>
      <div class="sgroup"><h3>Színek ${th.preset === "custom" ? "<small>egyedi</small>" : ""}</h3>
        <div class="colors">${COLOR_FIELDS.map(([k, l, h]) => `
          <div class="color-row"><input type="color" value="${c[k]}" data-color="${k}" aria-label="${l}"><span><strong>${l}</strong><small>${h}</small></span><input class="input hex" value="${c[k]}" data-hex="${k}" maxlength="7" spellcheck="false" aria-label="${l} hex kódja"></div>`).join("")}</div>
        ${warn.map(w => `<p class="contrast-warn">${w}</p>`).join("")}
      </div>
      <div class="sgroup"><h3>Formák</h3>
        ${seg("radius", [["sharp", "Szögletes"], ["rounded", "Lekerekített"], ["round", "Kerek"]], th.radius, "Sarkok")}
        ${seg("buttons", [["pill", "Kapszula"], ["rounded", "Lekerekített"], ["square", "Szögletes"]], th.buttons, "Gombok")}
        ${seg("cards", [["glass", "Üveg"], ["solid", "Tömör"], ["outline", "Körvonal"]], th.cards, "Termékkártyák")}
      </div>
      <div class="sgroup"><h3>Elrendezés</h3>
        ${seg("colsDesktop", [["3", "3"], ["4", "4"], ["5", "5"]], th.colsDesktop, "Termékek egy sorban (asztali)")}
        ${seg("colsMobile", [["1", "1 – lista"], ["2", "2 – rács"]], th.colsMobile, "Termékek egy sorban (mobil)")}
        ${seg("heroSide", [["right", "Kép jobbra"], ["left", "Kép balra"]], th.heroSide, "Nyitó blokk")}
      </div>`;
  }

  function fontsTabHTML() {
    const th = theme();
    const opt = (path, f, cur, sample) => `<label class="font-opt"><input type="radio" name="th-${path}" value="${f.key}" data-th="${path}" ${cur === f.key ? "checked" : ""}><span style="font-family:${esc(f.family)};font-weight:${f.weight || 400}"><b>${sample}</b><small>${esc(f.label)}</small></span></label>`;
    return `
      <div class="sgroup"><h3>Címek betűtípusa</h3>
        <div class="font-grid">${N.FONTS.display.map(f => opt("fontDisplay", f, th.fontDisplay, "Nyiss csomagot!")).join("")}</div>
      </div>
      <div class="sgroup"><h3>Címek mérete</h3>
        <div class="range-row"><input type="range" min="80" max="130" step="5" value="${th.displayScale}" data-th="displayScale" data-num aria-label="Címek mérete"><output data-scale-out>${th.displayScale}%</output></div>
      </div>
      <div class="sgroup"><h3>Szövegek betűtípusa</h3>
        <div class="font-grid">${N.FONTS.body.map(f => opt("fontBody", f, th.fontBody, "Booster, tin, ETB")).join("")}</div>
      </div>`;
  }

  function animTabHTML() {
    const a = theme().anim;
    return `
      <div class="sgroup"><h3>Összes animáció</h3>
        ${seg("anim.level", [["full", "Teljes"], ["subtle", "Visszafogott"], ["off", "Kikapcsolva"]], a.level)}
        ${seg("anim.speed", [["slow", "Lassú"], ["normal", "Normál"], ["fast", "Gyors"]], a.speed, "Sebesség")}
        <p class="hint">Akinek a készülékén be van kapcsolva a „mozgás csökkentése”, annak automatikusan visszafogott marad.</p>
      </div>
      <div class="sgroup"><h3>Effektek egyenként</h3>
        <div class="toggles">${ANIM_FIELDS.map(([k, l, h]) => `<label class="toggle"><input type="checkbox" data-th="anim.${k}" ${a[k] ? "checked" : ""}><span class="switch"></span><span><strong>${l}</strong><small>${h}</small></span></label>`).join("")}</div>
      </div>`;
  }

  function sectionsTabHTML() {
    const list = theme().sections;
    return `
      <div class="sgroup"><h3>Kezdőlap szekciói <small>sorrend és láthatóság</small></h3>
        <div class="sec-list">
          <div class="sec-row fixed"><label class="toggle"><input type="checkbox" checked disabled><span class="switch"></span><span><strong>Nyitó blokk</strong><small>Mindig az első</small></span></label></div>
          ${list.map((s, i) => {
            const meta = N.SECTION_LIST.find(x => x.id === s.id);
            return `<div class="sec-row"><label class="toggle"><input type="checkbox" data-sec-on="${s.id}" ${s.on ? "checked" : ""}><span class="switch"></span><span><strong>${esc(meta?.label || s.id)}</strong></span></label>
              <div class="order-btns"><button type="button" data-sec-move="${i}" data-d="-1" aria-label="Feljebb" ${i === 0 ? "disabled" : ""}>${ARROW_UP}</button><button type="button" data-sec-move="${i}" data-d="1" aria-label="Lejjebb" ${i === list.length - 1 ? "disabled" : ""}>${ARROW_DOWN}</button></div></div>`;
          }).join("")}
        </div>
        <p class="hint">A „Hamarosan érkezik” és a „Kapcsolat” csak akkor látszik, ha van hozzá tartalom (érkező termék, illetve e-mail cím vagy telefonszám). A csomagbontóhoz legalább 3 rendelhető, képes termék kell.</p>
      </div>`;
  }

  function textListHTML() {
    const q = studio.textQ.trim().toLowerCase();
    const tx = texts();
    const groups = N.TEXT_GROUPS.map(([g, items], gi) => {
      const list = items.filter(([k, l, d]) => !q || `${l} ${d} ${tx[k] || ""}`.toLowerCase().includes(q));
      if (!list.length) return "";
      const custom = items.filter(([k]) => tx[k]).length;
      return `<details class="tgroup" ${q || gi === 1 ? "open" : ""} data-tgroup="${esc(g)}"><summary>${esc(g)}${custom ? `<small>${custom} módosítva</small>` : ""}</summary><div class="tgroup-body">${list.map(([k, l, d]) => {
        const v = tx[k] || d;
        const long = d.length > 64;
        return `<div class="field tfield${tx[k] ? " custom" : ""}"><div class="label-row"><label for="tx-${k}">${esc(l)}</label><button class="mini-link" type="button" data-text-reset="${k}" ${tx[k] ? "" : "hidden"}>Eredeti</button></div>${long
          ? `<textarea class="textarea" id="tx-${k}" data-text="${k}" rows="3">${esc(v)}</textarea>`
          : `<input class="input" id="tx-${k}" data-text="${k}" value="${esc(v)}">`}</div>`;
      }).join("")}</div></details>`;
    }).join("");
    return groups || '<p class="muted">Nincs ilyen szöveg.</p>';
  }
  function textsTabHTML() {
    return `
      <div class="text-search"><label class="sr-only" for="tx-q">Szöveg keresése</label><input class="input" id="tx-q" type="search" placeholder="Keresés a szövegek között, pl. kosár" value="${esc(studio.textQ)}" data-text-q></div>
      <div class="sgroup" data-text-list>${textListHTML()}</div>`;
  }

  function cssTabHTML() {
    return `
      <div class="sgroup"><h3>Saját CSS <small>szakértőknek</small></h3>
        <p class="hint">Bármit felülírhatsz a bolt kinézetében. Példa: <code>.pcard h3 { font-size: 1.1rem; }</code> vagy <code>:root { --wrap: 1400px; }</code>. Hibás CSS nem rontja el a boltot, csak nem érvényesül.</p>
        <textarea class="textarea code-area" data-css spellcheck="false" placeholder="/* ide írd a saját stílusaidat */">${esc(theme().customCss)}</textarea>
      </div>`;
  }

  const ARROW_UP = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 15 6-6 6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const ARROW_DOWN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function renderStudioBody() {
    const body = $("[data-studio-body]");
    if (!body) return;
    const html = { style: styleTabHTML, fonts: fontsTabHTML, anim: animTabHTML, sections: sectionsTabHTML, texts: textsTabHTML, css: cssTabHTML }[studio.tab] || styleTabHTML;
    const top = body.scrollTop;
    body.innerHTML = html();
    body.scrollTop = top;
  }

  function renderStudio() {
    $$("[data-studio-tab]").forEach(b => b.setAttribute("aria-selected", String(b.dataset.studioTab === studio.tab)));
    renderStudioBody();
    const pageSel = $("[data-preview-page]");
    if (pageSel) pageSel.value = studio.page;
    if (!studio.loaded && (!isMobile() || studio.open)) loadPreview();
    requestAnimationFrame(layoutPreview);
  }
  const isMobile = () => window.matchMedia("(max-width: 860px)").matches;

  async function resetStudioTab() {
    const names = { style: "a színeket és formákat", fonts: "a betűtípusokat", anim: "az animációkat", sections: "a kezdőlap szekcióit", texts: "az összes szöveget", css: "a saját CSS-t" };
    const ok = await confirmDialog({ title: "Alaphelyzet visszaállítása", text: `Biztosan visszaállítod ${names[studio.tab]} az eredeti állapotra? Publikálásig visszavonható az „elvetés” gombbal.`, yes: "Visszaállítás", danger: false });
    if (!ok) return;
    const d = N.THEME_DEFAULTS, th = N.clone(theme());
    if (studio.tab === "style") Object.assign(th, { preset: d.preset, colors: N.clone(d.colors), radius: d.radius, buttons: d.buttons, cards: d.cards, colsDesktop: d.colsDesktop, colsMobile: d.colsMobile, heroSide: d.heroSide });
    else if (studio.tab === "fonts") Object.assign(th, { fontDisplay: d.fontDisplay, fontBody: d.fontBody, displayScale: d.displayScale });
    else if (studio.tab === "anim") th.anim = N.clone(d.anim);
    else if (studio.tab === "sections") th.sections = N.clone(d.sections);
    else if (studio.tab === "css") th.customCss = "";
    if (studio.tab === "texts") state.draft.settings.texts = {};
    else state.draft.settings.theme = N.sanitizeTheme(th);
    studioChanged();
    renderStudioBody();
    toast("Visszaállítva.");
  }

  function bindPagesAndCoupons() {
    $("[data-pages-list]")?.addEventListener("click", e => {
      const b = e.target.closest("[data-page-key]");
      if (!b) return;
      state.pageKey = b.dataset.pageKey;
      renderPages();
      if (window.matchMedia("(max-width: 860px)").matches) $("[data-page-editor]")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    $("[data-page-body]")?.addEventListener("input", e => setPageBody(state.pageKey, e.target.value));
    $("[data-page-template]")?.addEventListener("click", () => {
      const tpl = PAGE_TEMPLATES[state.pageKey];
      if (!tpl) return;
      const s = state.draft.settings;
      const fill = tpl.replaceAll("[e-mail]", s.email || "[e-mail]").replaceAll("[Cégnév / vállalkozó neve]", s.companyName || "[Cégnév / vállalkozó neve]");
      const ta = $("[data-page-body]");
      ta.value = fill;
      setPageBody(state.pageKey, fill);
      ta.focus();
      ta.setSelectionRange(0, 0);
      ta.scrollTop = 0;
      toast("Sablon beszúrva. Töltsd ki a szögletes zárójeles részeket.");
    });
    $$('input[name="pg-view"]').forEach(r => r.addEventListener("change", () => { $("[data-page-split]").dataset.view = r.value; }));
    $("[data-cp-add]")?.addEventListener("submit", e => { e.preventDefault(); addCoupon(e.currentTarget); });
    $("#cp-type")?.addEventListener("change", e => {
      $("[data-cp-unit]").textContent = e.target.value === "percent" ? "%" : "Ft";
      $("#cp-value").disabled = e.target.value === "ship";
    });
    $("[data-cp-rows]")?.addEventListener("change", e => {
      const i = e.target.dataset.cpActive;
      if (i === undefined) return;
      const list = state.draft.settings.coupons;
      list[Number(i)].active = e.target.checked;
      saveDraft(); renderCoupons();
    });
    $("[data-cp-rows]")?.addEventListener("click", async e => {
      const b = e.target.closest("[data-cp-del]");
      if (!b) return;
      const list = state.draft.settings.coupons;
      const c = list[Number(b.dataset.cpDel)];
      if (!c || !await confirmDialog({ title: "Kupon törlése", text: `Biztosan törlöd a(z) ${c.code} kódot?` })) return;
      state.draft.settings.coupons = list.filter(x => x !== c);
      saveDraft(); renderCoupons();
    });
  }

  function bindStudio() {
    const body = $("[data-studio-body]");
    if (!body) return;
    body.addEventListener("input", e => {
      const el = e.target;
      if (el.matches("[data-color]")) {
        const hex = $(`[data-hex="${el.dataset.color}"]`, body);
        if (hex) hex.value = el.value;
        setTheme(`colors.${el.dataset.color}`, el.value);
      } else if (el.matches("[data-th][data-num]")) {
        setTheme(el.dataset.th, Number(el.value));
        const out = $("[data-scale-out]", body);
        if (out) out.textContent = `${el.value}%`;
      } else if (el.matches("[data-text]")) {
        const k = el.dataset.text;
        const def = N.TEXT_DEFAULTS[k] || "";
        const v = el.value;
        if (!v.trim() || v.trim() === def) delete texts()[k]; else texts()[k] = v;
        const custom = !!texts()[k];
        el.closest(".tfield")?.classList.toggle("custom", custom);
        const rb = $(`[data-text-reset="${k}"]`, body);
        if (rb) rb.hidden = !custom;
        studioChanged();
      } else if (el.matches("[data-text-q]")) {
        studio.textQ = el.value;
        const list = $("[data-text-list]", body);
        if (list) list.innerHTML = textListHTML();
      } else if (el.matches("[data-css]")) {
        setTheme("customCss", el.value);
      }
    });
    body.addEventListener("change", e => {
      const el = e.target;
      if (el.matches("[data-th]:not([data-num])")) {
        setTheme(el.dataset.th, el.type === "checkbox" ? el.checked : el.value);
        if (studio.tab === "style" && el.dataset.th.startsWith("colors")) renderStudioBody();
      } else if (el.matches("[data-hex]")) {
        let v = el.value.trim().toLowerCase();
        if (/^[0-9a-f]{6}$/.test(v)) v = `#${v}`;
        if (/^#[0-9a-f]{3}$/.test(v)) v = `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
        if (/^#[0-9a-f]{6}$/.test(v)) { setTheme(`colors.${el.dataset.hex}`, v); renderStudioBody(); }
        else { toast("Hex színkódot adj meg, pl. #ff7a1f.", true); el.value = theme().colors[el.dataset.hex]; }
      } else if (el.matches("[data-color]")) {
        renderStudioBody();
      } else if (el.matches("[data-sec-on]")) {
        const th = N.clone(theme());
        const s = th.sections.find(x => x.id === el.dataset.secOn);
        if (s) s.on = el.checked;
        state.draft.settings.theme = N.sanitizeTheme(th);
        studioChanged();
        const target = { ticker: ".ticker", pack: "#csomag", categories: "[data-section=categories]", featured: "[data-section=featured]", soon: "#hamarosan", steps: "#rendeles", contact: "#kapcsolat" }[el.dataset.secOn];
        if (el.checked) setTimeout(() => previewScroll(target), 250);
      }
    });
    body.addEventListener("click", e => {
      const b = e.target.closest("button");
      if (!b) return;
      if (b.matches("[data-preset]")) {
        const p = N.PRESETS.find(x => x.key === b.dataset.preset);
        if (!p) return;
        state.draft.settings.theme = N.sanitizeTheme({ ...N.clone(theme()), preset: p.key, colors: N.clone(p.colors) });
        studioChanged();
        renderStudioBody();
      } else if (b.matches("[data-sec-move]")) {
        const i = Number(b.dataset.secMove), j = i + Number(b.dataset.d);
        const th = N.clone(theme());
        if (j < 0 || j >= th.sections.length) return;
        [th.sections[i], th.sections[j]] = [th.sections[j], th.sections[i]];
        state.draft.settings.theme = N.sanitizeTheme(th);
        studioChanged();
        renderStudioBody();
        $(`[data-sec-move="${j}"][data-d="${b.dataset.d}"]`, body)?.focus();
      } else if (b.matches("[data-text-reset]")) {
        const k = b.dataset.textReset;
        delete texts()[k];
        const f = $(`[data-text="${k}"]`, body);
        if (f) { f.value = N.TEXT_DEFAULTS[k] || ""; f.closest(".tfield")?.classList.remove("custom"); }
        b.hidden = true;
        studioChanged();
      }
    });
    body.addEventListener("focusin", e => {
      const el = e.target;
      if (!el.matches("[data-text]")) return;
      const k = el.dataset.text;
      const g = el.closest("[data-tgroup]")?.dataset.tgroup;
      previewScroll(TEXT_KEY_TARGET[k.split(".")[0]] && g === "Kezdőlap: szekciók" ? TEXT_KEY_TARGET[k.split(".")[0]] : TEXT_TARGET[g]);
    });

    $$("[data-studio-tab]").forEach(b => b.addEventListener("click", () => { studio.tab = b.dataset.studioTab; renderStudio(); body.scrollTop = 0; }));
    $("[data-studio-reset]")?.addEventListener("click", resetStudioTab);
    $("[data-preview-page]")?.addEventListener("change", e => { studio.page = e.target.value; loadPreview(); });
    $$('input[name="pv-device"]').forEach(r => r.addEventListener("change", () => { studio.device = r.value; studio.deviceChosen = true; layoutPreview(); }));
    $("[data-preview-reload]")?.addEventListener("click", loadPreview);
    $("[data-preview-open]")?.addEventListener("click", () => {
      studio.open = true;
      if (!studio.deviceChosen) { studio.device = "mobile"; const r = $('input[name="pv-device"][value="mobile"]'); if (r) r.checked = true; }
      $("[data-studio]").classList.add("preview-open");
      document.body.classList.add("lock");
      if (!studio.loaded) loadPreview(); else sendPreview();
      requestAnimationFrame(layoutPreview);
    });
    $("[data-preview-close]")?.addEventListener("click", () => {
      studio.open = false;
      $("[data-studio]").classList.remove("preview-open");
      document.body.classList.remove("lock");
    });
    window.addEventListener("message", e => {
      if (e.origin !== location.origin || e.data?.type !== "nsc:preview-ready") return;
      sendPreview(true);
    });
    if ("ResizeObserver" in window) new ResizeObserver(() => layoutPreview()).observe($("[data-preview-stage]"));
    else window.addEventListener("resize", layoutPreview);
  }

  /* ---------------- események ---------------- */
  function bind() {
    $("[data-login-form]").addEventListener("submit", onLogin);
    document.addEventListener("click", async e => {
      const t = e.target.closest("button, a");
      if (!t) return;
      if (t.matches("[data-toggle-pass]")) {
        const input = t.parentElement.querySelector("input");
        const show = input.type === "password";
        input.type = show ? "text" : "password";
        t.textContent = show ? "Elrejt" : "Mutat";
        return;
      }
      if (t.matches("[data-logout]")) return logout();
      if (t.matches("[data-mode]")) return setMode(t.dataset.mode);
      if (t.matches("[data-mode-toggle]")) { $("[data-more-menu]").hidden = true; return setMode(state.mode === "pro" ? "basic" : "pro"); }
      if (t.matches("[data-publish]")) return publish();
      if (t.matches("[data-mobile-more]")) return toggleMore();
      if (t.closest("[data-more-menu]") && t.matches("a")) toggleMore(false);
      if (t.matches("[data-new-product]")) return openEditor();
      if (t.matches("[data-edit]")) return openEditor(Number(t.dataset.edit));
      if (t.matches("[data-dup]")) return duplicateProduct(Number(t.dataset.dup));
      if (t.matches("[data-hide]")) {
        const p = byId(t.dataset.hide);
        if (p) { p.hidden = !p.hidden; saveDraft(); renderAll(); toast(p.hidden ? "A termék el van rejtve a boltban." : "A termék újra látszik a boltban."); }
        return;
      }
      if (t.matches("[data-del]")) return deleteProduct(Number(t.dataset.del));
      if (t.matches("[data-move]")) return moveProduct(Number(t.dataset.move), Number(t.dataset.d));
      if (t.matches("[data-stock]")) {
        const p = byId(t.dataset.stock);
        if (p) { changeStock(p.id, p.stock + Number(t.dataset.d)); renderView(); $(`[data-stock="${p.id}"][data-d="${t.dataset.d}"]`)?.focus(); }
        return;
      }
      if (t.matches("[data-stat-filter]")) { state.filters = { q: "", cat: "all", status: t.dataset.statFilter }; return; }
      if (t.matches("[data-goto-low]")) { state.filters = { q: "", cat: "all", status: "low" }; return; }
      if (t.matches("[data-act]")) {
        const [kind, arg] = t.dataset.act.split(":");
        if (kind === "go") go(arg);
        else if (kind === "publish") publish();
        else if (kind === "edit") openEditor(Number(arg));
        return;
      }
      if (t.matches("[data-ed-close]")) return closeEditor();
      if (t.matches("[data-ed-delete]")) {
        const id = state.edit?.id;
        if (id && await deleteProduct(id)) closeEditor(true);
        return;
      }
      if (t.matches("[data-img-move]")) {
        const i = Number(t.dataset.imgMove), j = i + Number(t.dataset.d);
        const a = state.edit.images;
        [a[i], a[j]] = [a[j], a[i]];
        renderImages();
        return;
      }
      if (t.matches("[data-img-del]")) { state.edit.images.splice(Number(t.dataset.imgDel), 1); renderImages(); return; }
      if (t.matches("[data-add-url]")) {
        const input = $("[data-img-url]");
        const url = input.value.trim();
        if (!/^https:\/\//i.test(url)) { toast("Adj meg egy https:// kezdetű képcímet.", true); return; }
        if (state.edit.images.length >= MAX_IMAGES) { toast(`Legfeljebb ${MAX_IMAGES} kép lehet.`, true); return; }
        state.edit.images.push(url);
        input.value = "";
        renderImages();
        return;
      }
      if (t.matches("[data-cat-move]")) {
        const i = Number(t.dataset.catMove), j = i + Number(t.dataset.d);
        const list = cats();
        if (j < 0 || j >= list.length) return;
        [list[i], list[j]] = [list[j], list[i]];
        saveDraft(); renderCategories();
        $(`[data-cat-move="${j}"][data-d="${t.dataset.d}"]`)?.focus();
        return;
      }
      if (t.matches("[data-cat-del]")) return deleteCategory(Number(t.dataset.catDel));
      if (t.matches("[data-cat-filter]")) { state.filters = { q: "", cat: t.dataset.catFilter, status: "all" }; go("termekek"); return; }
      if (t.matches("[data-export]")) return exportJson();
      if (t.matches("[data-import]")) return $("[data-import-file]").click();
      if (t.matches("[data-discard]")) return discardDraft();
      if (t.matches("[data-gh-forget]")) {
        state.gh.token = ""; saveGh(); state.ghState = "none"; renderPublish(); renderStatus();
        $("[data-gh-msg]").textContent = "A token törölve erről az eszközről.";
      }
    });
    document.addEventListener("click", e => {
      if (e.target.matches("[data-more-scrim]")) toggleMore(false);
    });

    window.addEventListener("hashchange", () => go(location.hash.slice(1)));

    $("[data-p-search]").addEventListener("input", e => { state.filters.q = e.target.value.trim(); renderProducts(); });
    $("[data-p-cat]").addEventListener("change", e => { state.filters.cat = e.target.value; renderProducts(); });
    $("[data-p-status]").addEventListener("change", e => { state.filters.status = e.target.value; renderProducts(); });

    let stockTimer = 0;
    document.addEventListener("input", e => {
      const el = e.target;
      if (el.matches("[data-stock-input]")) {
        clearTimeout(stockTimer);
        stockTimer = setTimeout(() => { changeStock(Number(el.dataset.stockInput), el.value); if (state.view === "attekintes") renderDashboard(); }, 500);
      }
    });
    document.addEventListener("change", e => {
      const el = e.target;
      if (el.matches("[data-stock-input]")) { clearTimeout(stockTimer); changeStock(Number(el.dataset.stockInput), el.value); renderView(); }
    });

    $("[data-settings-form]").addEventListener("submit", onSettingsSubmit);
    $("[data-cat-add]").addEventListener("submit", e => { e.preventDefault(); if (addCategory(e.currentTarget.label.value)) e.currentTarget.reset(); });
    document.addEventListener("change", e => { if (e.target.matches("[data-cat-label]")) renameCategory(Number(e.target.dataset.catLabel), e.target.value); });
    document.addEventListener("keydown", e => { if (e.key === "Enter" && e.target.matches("[data-cat-label]")) { e.preventDefault(); e.target.blur(); } });
    $("[data-gh-form]").addEventListener("submit", onGhSubmit);
    $("[data-import-file]").addEventListener("change", e => { const f = e.target.files[0]; if (f) importJson(f); e.target.value = ""; });

    const f = editorForm();
    f.addEventListener("submit", onEditorSubmit);
    f.elements.price.addEventListener("input", updateDiscountHint);
    f.elements.oldPrice.addEventListener("input", updateDiscountHint);
    const dz = $("[data-dropzone]");
    const fileInput = $("[data-file]");
    dz.addEventListener("click", () => fileInput.click());
    dz.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInput.click(); } });
    fileInput.addEventListener("change", e => { addFiles(e.target.files); e.target.value = ""; });
    ["dragenter", "dragover"].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add("over"); }));
    ["dragleave", "drop"].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove("over"); }));
    dz.addEventListener("drop", e => { if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files); });
    $("[data-scrim]").addEventListener("click", () => closeEditor());
    document.addEventListener("keydown", e => {
      if (e.key !== "Escape") return;
      if (!$("[data-more-menu]").hidden) { toggleMore(false); return; }
      if (state.edit && $("[data-confirm]").hidden) closeEditor();
    });
  }

  /* ---------------- indulás ---------------- */
  async function startApp() {
    applyMode();
    $("[data-login]").hidden = true;
    $("[data-app]").hidden = false;
    $("[data-view-title]").textContent = "Betöltés…";
    try {
      await loadLive();
    } catch {
      toast("A katalógus nem tölthető be. Ellenőrizd az internetkapcsolatot.", true);
      state.live = { products: [], settings: N.sanitizeSettings(null), updatedAt: null, source: "error" };
      state.draft = { products: [], settings: N.sanitizeSettings(null) };
    }
    go(location.hash.slice(1) || "attekintes");
    renderStatus();
    if (state.gh.token) verifyGh().then(() => { renderGhPill(); if (state.view === "attekintes") renderDashboard(); });
    else state.ghState = "none";
  }

  bind();
  bindStudio();
  bindPagesAndCoupons();
  if (session()) startApp();
  else {
    $("[data-login]").hidden = false;
    setTimeout(() => $("#lg-user")?.focus(), 50);
  }
})();
