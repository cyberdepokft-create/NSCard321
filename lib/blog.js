/* Cikkek (blog): /blog és /blog/<cím> – a címet, leírást és a cikk szövegét már a szerver beírja (Google, megosztás). */
import { SITE, loadCatalog, esc, absUrl, mdToHtml } from "./core.js";

export function postsOf(catalog) {
  return (Array.isArray(catalog?.settings?.posts) ? catalog.settings.posts : [])
    .filter(p => p && p.published !== false && p.slug && p.title)
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
}

export async function renderBlog({ request, env }, slug) {
  const origin = new URL(request.url).origin;
  const asset = await env.ASSETS.fetch(new URL("/blog", origin));
  try {
    if (!asset.ok) return asset;
    const catalog = await loadCatalog(request, env);
    const posts = postsOf(catalog);
    const shop = catalog.settings?.shopName || "NS Card";
    let title = `Cikkek és útmutatók – ${shop}`, desc = "Pokémon TCG útmutatók, megjelenések, gyűjtési és tárolási tippek az NS Card csapatától.", url = `${SITE}/blog`, img = "", ld = null, body = "", status = 200;
    if (slug) {
      const p = posts.find(x => x.slug === slug);
      if (!p) status = 404;
      else {
        title = `${p.title} – ${shop}`;
        desc = String(p.excerpt || p.body || "").replace(/[#*\[\]()]/g, "").replace(/\s+/g, " ").trim().slice(0, 160);
        url = `${SITE}/blog/${encodeURIComponent(p.slug)}`;
        img = absUrl(p.cover, origin);
        ld = { "@context": "https://schema.org", "@type": "BlogPosting", headline: p.title, datePublished: p.date || undefined, image: img || undefined, description: desc, mainEntityOfPage: url, author: { "@type": "Organization", name: shop }, publisher: { "@type": "Organization", name: shop } };
        body = `<article class="post"><h1>${esc(p.title)}</h1>${mdToHtml(p.body)}</article>`;
      }
    } else {
      body = posts.map(p => `<article><h2><a href="/blog/${esc(encodeURIComponent(p.slug))}">${esc(p.title)}</a></h2><p>${esc(p.excerpt || "")}</p></article>`).join("");
    }
    const setContent = v => ({ element(el) { el.setAttribute("content", v); } });
    let rw = new HTMLRewriter()
      .on("title", { element(el) { el.setInnerContent(title); } })
      .on('meta[name="description"]', setContent(desc))
      .on('meta[property="og:title"]', setContent(title))
      .on('meta[property="og:description"]', setContent(desc))
      .on('link[rel="canonical"]', { element(el) { el.setAttribute("href", url); } })
      .on("[data-blog-ssr]", { element(el) { el.setInnerContent(body, { html: true }); } });
    if (slug) rw = rw.on('meta[property="og:type"]', setContent("article"));
    if (img) rw = rw.on('meta[property="og:image"]', setContent(img));
    if (ld) rw = rw.on("head", { element(el) { el.append(`<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>`, { html: true }); } });
    const res = rw.transform(asset);
    const out = new Response(res.body, { status, headers: res.headers });
    out.headers.set("Cache-Control", "public, max-age=0, s-maxage=60");
    return out;
  } catch {
    return asset;
  }
}
