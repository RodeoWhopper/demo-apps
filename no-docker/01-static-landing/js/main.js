// Nordwind Coffee Roasters — progressive enhancements (no dependencies)
(function () {
  "use strict";

  // Mobile navigation toggle
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      const open = links.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    links.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        links.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  // Scroll reveal via IntersectionObserver (falls back to visible)
  const revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealEls.length) {
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  }

  // FAQ accordion
  document.querySelectorAll(".faq-q").forEach(function (btn) {
    const panel = document.getElementById(btn.getAttribute("aria-controls"));
    if (!panel) return;
    btn.addEventListener("click", function () {
      const expanded = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!expanded));
      panel.style.maxHeight = expanded ? "0px" : panel.scrollHeight + "px";
    });
  });

  // Contact form: never posts anywhere, only shows a toast
  const form = document.querySelector("form[data-demo-form]");
  const toast = document.getElementById("toast");
  if (form && toast) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      const name = form.querySelector("[name=name]");
      toast.textContent = "Thanks" + (name && name.value ? ", " + name.value.trim() : "") + " — we'll be in touch soon.";
      toast.classList.add("is-visible");
      form.reset();
      clearTimeout(toast._timer);
      toast._timer = setTimeout(function () { toast.classList.remove("is-visible"); }, 4000);
    });
  }

  // Footer year
  const year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());
})();
