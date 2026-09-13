/* Kılavuz Etkinlik – static client for the Directus items API (no build step). */
(function () {
  const API = (window.API_URL || "").replace(/\/$/, "");
  const MONTHS = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const grid = document.getElementById("grid");
  const citySel = document.getElementById("city");
  const catSel = document.getElementById("category");
  const search = document.getElementById("q");
  const count = document.getElementById("count");

  function fmtTime(iso) {
    const d = new Date(iso);
    return isNaN(d) ? "" : d.toLocaleString("tr-TR", { weekday: "short", hour: "2-digit", minute: "2-digit" });
  }

  function card(e) {
    const d = new Date(e.starts_at);
    const day = isNaN(d) ? "?" : d.getDate();
    const mon = isNaN(d) ? "" : MONTHS[d.getMonth()];
    const cat = e.category && e.category.name ? e.category.name : "";
    return `<article class="event">
      <div class="event__date"><b>${day}</b><span>${mon}</span></div>
      <div>
        ${cat ? `<span class="event__cat">${esc(cat)}</span>` : ""}
        <h2>${esc(e.title)}</h2>
        <p class="event__where">${esc(e.venue || "")}${e.venue && e.city ? " · " : ""}<strong>${esc(e.city || "")}</strong></p>
        <p class="event__desc">${esc(e.description || "")}</p>
        <p class="event__time">${esc(fmtTime(e.starts_at))}${e.ends_at ? " – " + esc(fmtTime(e.ends_at)) : ""}</p>
      </div>
    </article>`;
  }

  async function load() {
    const url = `${API}/items/events?filter[status][_eq]=published&fields=*,category.name,category.slug&sort=starts_at&limit=200`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return (await res.json()).data || [];
  }

  function fillSelect(sel, values, label) {
    sel.innerHTML = `<option value="">${label}</option>` + values.map((v) => `<option value="${esc(v)}">${esc(v)}</option>`).join("");
  }

  function draw(events) {
    const city = citySel.value, cat = catSel.value, q = search.value.trim().toLowerCase();
    const rows = events.filter((e) =>
      (!city || e.city === city) &&
      (!cat || (e.category && e.category.slug === cat)) &&
      (!q || `${e.title} ${e.venue} ${e.description}`.toLowerCase().includes(q)));
    grid.innerHTML = rows.length ? rows.map(card).join("") : `<p class="status">Bu filtreyle etkinlik bulunamadı.</p>`;
    count.textContent = `${rows.length} / ${events.length} etkinlik`;
  }

  document.addEventListener("DOMContentLoaded", async () => {
    try {
      const events = await load();
      fillSelect(citySel, [...new Set(events.map((e) => e.city).filter(Boolean))].sort((a, b) => a.localeCompare(b, "tr")), "Tüm şehirler");
      const cats = new Map(); events.forEach((e) => { if (e.category) cats.set(e.category.slug, e.category.name); });
      catSel.innerHTML = `<option value="">Tüm kategoriler</option>` + [...cats].map(([s, n]) => `<option value="${esc(s)}">${esc(n)}</option>`).join("");
      [citySel, catSel].forEach((el) => el.addEventListener("change", () => draw(events)));
      search.addEventListener("input", () => draw(events));
      draw(events);
    } catch (err) {
      grid.innerHTML = `<p class="status status--error">Etkinlikler yüklenemedi (${esc(err.message)}). API adresi <code>${esc(API)}</code> (frontend/config.js) ve Directus'un çalıştığından emin olun.</p>`;
    }
  });
})();
