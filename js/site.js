(function () {
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var burger = document.querySelector(".burger");
  var menu = document.querySelector(".menu");
  function menuOpen() { return !!menu && menu.getAttribute("data-open") === "true"; }
  function closeMenu() {
    if (!menu) return;
    menu.setAttribute("data-open", "false");
    if (burger) burger.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  }
  function openMenu() {
    if (!menu) return;
    menu.setAttribute("data-open", "true");
    if (burger) burger.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
  }
  if (burger && menu) {
    burger.addEventListener("click", function () { menuOpen() ? closeMenu() : openMenu(); });
    menu.querySelectorAll("a").forEach(function (a) { a.addEventListener("click", closeMenu); });
  }

  var modal = document.querySelector(".modal");
  var modalVideo = modal ? modal.querySelector("video") : null;
  var modalClose = modal ? modal.querySelector(".modal__close") : null;
  var lastTrigger = null;
  function modalIsOpen() { return !!modal && modal.getAttribute("data-open") === "true"; }
  function openModal(e) {
    if (!modal) return;
    lastTrigger = e && e.currentTarget ? e.currentTarget : null;
    modal.setAttribute("data-open", "true");
    document.body.style.overflow = "hidden";
    document.querySelectorAll("video[data-autoplay]").forEach(function (v) { v.pause(); });
    if (modalVideo) { modalVideo.currentTime = 0; modalVideo.play().catch(function () {}); }
    if (modalClose) modalClose.focus();
  }
  function closeModal() {
    if (!modal) return;
    modal.setAttribute("data-open", "false");
    document.body.style.overflow = menuOpen() ? "hidden" : "";
    if (modalVideo) modalVideo.pause();
    if (!reduce) document.querySelectorAll("video[data-autoplay]").forEach(function (v) { v.play().catch(function () {}); });
    if (lastTrigger && typeof lastTrigger.focus === "function") lastTrigger.focus();
  }
  document.querySelectorAll("[data-open-video]").forEach(function (b) { b.addEventListener("click", openModal); });
  if (modal) {
    if (modalClose) modalClose.addEventListener("click", closeModal);
    modal.addEventListener("click", function (e) { if (e.target === modal) closeModal(); });
    modal.addEventListener("keydown", function (e) {
      if (e.key !== "Tab") return;
      var f = modal.querySelectorAll("button, [href], video[controls]");
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (modalIsOpen()) { closeModal(); return; }
    if (menuOpen()) closeMenu();
  });

  document.querySelectorAll("video[data-autoplay]").forEach(function (v) {
    if (reduce) { v.removeAttribute("autoplay"); v.pause(); return; }
    v.muted = true; v.play().catch(function () {});
  });

  // Первый экран: переключатель «круг / арка» (только для прототипа)
  var hero = document.getElementById("hero");
  if (hero) {
    var heroBtns = hero.querySelectorAll("[data-hero]");
    var HERO_VARIANTS = ["circle", "arch"];
    function applyHero(name) {
      hero.setAttribute("data-variant", name);
      heroBtns.forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-hero") === name ? "true" : "false"); });
    }
    var heroRequested = new URLSearchParams(location.search).get("hero");
    if (!heroRequested) { try { heroRequested = localStorage.getItem("heroVariant"); } catch (e) {} }
    if (HERO_VARIANTS.indexOf(heroRequested) === -1) heroRequested = "circle";
    applyHero(heroRequested);
    heroBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var v = btn.getAttribute("data-hero");
        applyHero(v);
        try { localStorage.setItem("heroVariant", v); } catch (e) {}
        var params = new URLSearchParams(location.search);
        params.set("hero", v);
        history.replaceState(null, "", location.pathname + "?" + params.toString() + location.hash);
      });
    });
  }

  // Блок «Найдите свою проблему»: переключатель вариантов (только для прототипа)
  var problemsSection = document.getElementById("problems");
  if (problemsSection) {
    var switcher = problemsSection.querySelector(".proto-switch");
    var variants = problemsSection.querySelectorAll(".pv");
    var switchBtns = switcher ? switcher.querySelectorAll(".proto-switch__btn") : [];
    var KNOWN_VARIANTS = ["map", "ask", "tiles"];

    function readStoredVariant() {
      try { return localStorage.getItem("problemsVariant"); } catch (e) { return null; }
    }
    function writeStoredVariant(v) {
      try { localStorage.setItem("problemsVariant", v); } catch (e) {}
    }
    function applyVariant(name) {
      variants.forEach(function (el) { el.hidden = el.getAttribute("data-variant") !== name; });
      switchBtns.forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-variant") === name ? "true" : "false"); });
    }

    if (variants.length) {
      var requested = new URLSearchParams(location.search).get("problems") || readStoredVariant() || "map";
      if (KNOWN_VARIANTS.indexOf(requested) === -1) requested = "map";
      applyVariant(requested);
    }

    switchBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var v = btn.getAttribute("data-variant");
        applyVariant(v);
        writeStoredVariant(v);
        var params = new URLSearchParams(location.search);
        params.set("problems", v);
        var newUrl = location.pathname + "?" + params.toString() + location.hash;
        history.replaceState(null, "", newUrl);
      });
    });

    // Вариант «Карта стопы»: подсветка зоны при наведении/фокусе на строку
    var mapVariant = problemsSection.querySelector('.pv[data-variant="map"]');
    if (mapVariant) {
      var zones = mapVariant.querySelectorAll(".zones .zone");
      var mapLabel = mapVariant.querySelector(".map__label");
      var symList = mapVariant.querySelector(".sym");
      var MAP_DEFAULT = "Наведите на строку справа";
      function setZone(name, title, plain) {
        zones.forEach(function (z) { z.classList.toggle("on", z.getAttribute("data-zone") === name); });
        if (!mapLabel) return;
        mapLabel.textContent = "";
        if (!title) { mapLabel.textContent = MAP_DEFAULT; return; }
        if (plain) { mapLabel.textContent = title; return; }
        var b = document.createElement("b");
        b.textContent = title;
        mapLabel.appendChild(b);
      }
      if (symList && mapLabel && zones.length) {
        symList.querySelectorAll("a[data-zone]").forEach(function (a) {
          var name = a.getAttribute("data-zone");
          var titleEl = a.querySelector(".a b");
          var title = titleEl ? titleEl.textContent : "";
          var plain = name === "hands";
          var text = plain ? "Руки, не на карте стопы" : title;
          a.addEventListener("mouseenter", function () { setZone(name, text, plain); });
          a.addEventListener("focus", function () { setZone(name, text, plain); });
        });
        symList.addEventListener("mouseleave", function () { setZone(null); });
      }
    }

    // Вариант «Где беспокоит?»: фильтр списка по вкладкам
    var askVariant = problemsSection.querySelector('.pv[data-variant="ask"]');
    if (askVariant) {
      var tabs = askVariant.querySelectorAll(".tabs .tab");
      var items = askVariant.querySelectorAll(".ans li");
      tabs.forEach(function (tab) {
        tab.addEventListener("click", function () {
          var cat = tab.getAttribute("data-cat");
          tabs.forEach(function (t) { t.setAttribute("aria-selected", t === tab ? "true" : "false"); });
          items.forEach(function (li) { li.hidden = !(cat === "all" || li.getAttribute("data-cat") === cat); });
        });
      });
    }
  }
})();
