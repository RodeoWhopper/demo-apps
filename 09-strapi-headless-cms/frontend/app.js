/* Tarla Journal – tiny client for the Strapi 5 REST API (no build step). */
(function () {
  const API = (window.API_URL || "").replace(/\/$/, "");

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function fmtDate(iso) {
    if (!iso) return "";
    try { return new Date(iso).toLocaleDateString("tr-TR", { year: "numeric", month: "long", day: "numeric" }); } catch { return iso; }
  }

  function mediaUrl(media) {
    if (!media || !media.url) return null;
    return /^https?:\/\//.test(media.url) ? media.url : API + media.url;
  }

  // Minimal renderer for Strapi "blocks" rich text (JSON AST) -> HTML.
  function renderInline(nodes) {
    return (nodes || []).map((n) => {
      if (n.type === "link") return `<a href="${esc(n.url)}" rel="noopener">${renderInline(n.children)}</a>`;
      let t = esc(n.text);
      if (n.code) t = `<code>${t}</code>`;
      if (n.bold) t = `<strong>${t}</strong>`;
      if (n.italic) t = `<em>${t}</em>`;
      if (n.underline) t = `<u>${t}</u>`;
      if (n.strikethrough) t = `<s>${t}</s>`;
      return t;
    }).join("");
  }
  function renderBlocks(blocks) {
    if (!Array.isArray(blocks)) return `<p>${esc(blocks)}</p>`;
    return blocks.map((b) => {
      switch (b.type) {
        case "heading": { const l = Math.min(Math.max(b.level || 2, 1), 6); return `<h${l}>${renderInline(b.children)}</h${l}>`; }
        case "quote": return `<blockquote>${renderInline(b.children)}</blockquote>`;
        case "code": return `<pre><code>${renderInline(b.children)}</code></pre>`;
        case "list": {
          const tag = b.format === "ordered" ? "ol" : "ul";
          return `<${tag}>${(b.children || []).map((li) => `<li>${renderInline(li.children)}</li>`).join("")}</${tag}>`;
        }
        case "image": { const u = mediaUrl(b.image); return u ? `<figure><img src="${esc(u)}" alt="${esc(b.image.alternativeText)}"></figure>` : ""; }
        default: return `<p>${renderInline(b.children)}</p>`;
      }
    }).join("\n");
  }

  async function api(path) {
    const res = await fetch(API + path, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`API ${res.status} for ${path}`);
    return res.json();
  }

  function showError(el, err) {
    el.innerHTML = `<p class="status status--error">İçerik yüklenemedi: ${esc(err.message)}.<br>API adresi <code>${esc(API)}</code> (frontend/config.js) ve Strapi'nin çalıştığından emin olun.</p>`;
  }

  function card(a) {
    const cover = mediaUrl(a.cover);
    const cat = a.category ? a.category.name : "";
    return `<article class="card">
      <a class="card__media" href="article.html?slug=${encodeURIComponent(a.slug)}">${cover ? `<img src="${esc(cover)}" alt="${esc(a.cover.alternativeText || a.title)}">` : esc((a.title || "?")[0])}</a>
      <div class="card__body">
        ${cat ? `<p class="card__cat">${esc(cat)}</p>` : ""}
        <h2 class="card__title"><a href="article.html?slug=${encodeURIComponent(a.slug)}">${esc(a.title)}</a></h2>
        <p class="card__excerpt">${esc(a.excerpt)}</p>
        <p class="card__meta">${esc(a.author ? a.author.name : "")}${a.author && a.publishedDate ? " · " : ""}${esc(fmtDate(a.publishedDate))}</p>
      </div>
    </article>`;
  }

  async function renderList() {
    const grid = document.getElementById("grid");
    const toolbar = document.getElementById("toolbar");
    try {
      const { data } = await api("/api/articles?populate=*&sort=publishedDate:desc&pagination[pageSize]=50");
      const cats = new Map();
      data.forEach((a) => { if (a.category) cats.set(a.category.slug, a.category.name); });
      let active = "";
      const draw = () => {
        const rows = active ? data.filter((a) => a.category && a.category.slug === active) : data;
        grid.innerHTML = rows.length ? rows.map(card).join("") : `<p class="status">Bu kategoride yazı yok.</p>`;
        toolbar.querySelectorAll(".chip").forEach((c) => c.classList.toggle("is-active", c.dataset.slug === active));
      };
      toolbar.innerHTML = [`<button class="chip is-active" data-slug="">Tümü</button>`]
        .concat([...cats].map(([slug, name]) => `<button class="chip" data-slug="${esc(slug)}">${esc(name)}</button>`)).join("");
      toolbar.addEventListener("click", (e) => { const b = e.target.closest(".chip"); if (!b) return; active = b.dataset.slug; draw(); });
      draw();
    } catch (err) { showError(grid, err); }
  }

  async function renderArticle() {
    const el = document.getElementById("article");
    const slug = new URLSearchParams(location.search).get("slug");
    if (!slug) { el.innerHTML = `<p class="status">Yazı seçilmedi.</p>`; return; }
    try {
      const { data } = await api(`/api/articles?filters[slug][$eq]=${encodeURIComponent(slug)}&populate=*`);
      const a = data[0];
      if (!a) { el.innerHTML = `<p class="status">Yazı bulunamadı.</p>`; return; }
      document.title = `${a.title} · Tarla Journal`;
      const cover = mediaUrl(a.cover);
      el.innerHTML = `
        ${a.category ? `<p class="article__cat">${esc(a.category.name)}</p>` : ""}
        <h1>${esc(a.title)}</h1>
        <p class="article__meta">${esc(a.author ? a.author.name : "")}${a.author && a.publishedDate ? " · " : ""}${esc(fmtDate(a.publishedDate))}</p>
        ${a.excerpt ? `<p class="article__lead">${esc(a.excerpt)}</p>` : ""}
        ${cover ? `<div class="article__cover"><img src="${esc(cover)}" alt="${esc(a.cover.alternativeText || a.title)}"></div>` : ""}
        <div class="prose">${renderBlocks(a.body)}</div>
        ${a.author ? `<div class="author-box"><strong>${esc(a.author.name)}</strong><p>${esc(a.author.bio)}</p></div>` : ""}
        <a class="back" href="./">← Tüm yazılar</a>`;
    } catch (err) { showError(el, err); }
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("grid")) renderList();
    if (document.getElementById("article")) renderArticle();
  });
})();
