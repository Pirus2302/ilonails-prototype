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

  // Переключатели вариантов блоков (только для прототипа): ?param=variant + localStorage
  function setupSwitcher(section, opts) {
    if (!section) return;
    var switcher = section.querySelector(".proto-switch");
    var variants = section.querySelectorAll(opts.itemSelector);
    var btns = switcher ? switcher.querySelectorAll(".proto-switch__btn") : [];
    function readStored() { try { return localStorage.getItem(opts.storageKey); } catch (e) { return null; } }
    function writeStored(v) { try { localStorage.setItem(opts.storageKey, v); } catch (e) {} }
    function apply(name) {
      variants.forEach(function (el) { el.hidden = el.getAttribute("data-variant") !== name; });
      btns.forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-variant") === name ? "true" : "false"); });
    }
    if (variants.length) {
      var requested = new URLSearchParams(location.search).get(opts.param) || readStored() || opts.known[0];
      if (opts.known.indexOf(requested) === -1) requested = opts.known[0];
      apply(requested);
    }
    btns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var v = btn.getAttribute("data-variant");
        apply(v); writeStored(v);
        var params = new URLSearchParams(location.search);
        params.set(opts.param, v);
        history.replaceState(null, "", location.pathname + "?" + params.toString() + location.hash);
      });
    });
  }
  setupSwitcher(document.getElementById("ilona"), { param: "ilona", storageKey: "ilonaVariant", itemSelector: ".iv", known: ["photo", "quote"] });
  setupSwitcher(document.getElementById("courses"), { param: "courses", storageKey: "coursesVariant", itemSelector: ".kv", known: ["simple", "masters"] });
  setupSwitcher(document.getElementById("contacts"), { param: "contacts", storageKey: "contactsVariant", itemSelector: ".cv", known: ["map", "table", "form"] });
  setupSwitcher(document.getElementById("safety"), { param: "safety", storageKey: "safetyVariant", itemSelector: ".sv", known: ["steps", "photos", "qa"] });

  // Блок «Найдите свою проблему»: переключатель вариантов (только для прототипа)
  var problemsSection = document.getElementById("problems");
  if (problemsSection) {
    setupSwitcher(problemsSection, { param: "problems", storageKey: "problemsVariant", itemSelector: ".pv", known: ["map", "ask", "tiles"] });

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
  // Блок «до и после»: переключатель вариантов (только для прототипа) и ползунок сравнения
  var dynSection = document.getElementById("dynamics");
  if (dynSection) {
    setupSwitcher(dynSection, { param: "dynamics", storageKey: "dynamicsVariant", itemSelector: ".dv", known: ["compare", "strip"] });

    var cmp = dynSection.querySelector(".cmp");
    if (cmp) {
      var range = cmp.querySelector("input[type=range]");
      var beforeImg = cmp.querySelector(".cmp__before");
      var afterImg = cmp.querySelector(".cmp__after");
      if (range) range.addEventListener("input", function () { cmp.style.setProperty("--x", range.value + "%"); });
      var caseBtns = dynSection.querySelectorAll(".clist button");
      caseBtns.forEach(function (b) {
        b.addEventListener("click", function () {
          caseBtns.forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
          b.setAttribute("aria-pressed", "true");
          var title = b.getAttribute("data-title") || "";
          if (beforeImg) { beforeImg.src = b.getAttribute("data-before"); beforeImg.alt = title + ", до"; }
          if (afterImg) { afterImg.src = b.getAttribute("data-after"); afterImg.alt = title + ", после"; }
        });
      });
    }
  }

  // Блок команды: переключатель, вариант «Выбор» (смена фото по имени) и вариант «Слайдер» (стрелки)
  var teamSection = document.getElementById("team");
  if (teamSection) {
    setupSwitcher(teamSection, { param: "team", storageKey: "teamVariant", itemSelector: ".tv", known: ["pick", "slider"] });

    var pickPh = teamSection.querySelector(".pick__ph img");
    var pickCap = teamSection.querySelector(".pick__cap");
    var pickMore = teamSection.querySelector(".pick__more");
    var pickBtns = teamSection.querySelectorAll(".plist button");
    if (pickPh && pickCap && pickMore) {
      pickBtns.forEach(function (b) {
        b.addEventListener("click", function () {
          pickBtns.forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
          b.setAttribute("aria-pressed", "true");
          pickPh.src = b.getAttribute("data-img"); pickPh.alt = b.getAttribute("data-alt") || "";
          pickCap.querySelector("b").textContent = b.getAttribute("data-name");
          pickCap.querySelector("span").textContent = b.getAttribute("data-role");
          var ul = pickMore.querySelector(".tags"); ul.textContent = "";
          (b.getAttribute("data-tags") || "").split("|").forEach(function (t) { var li = document.createElement("li"); li.textContent = t; ul.appendChild(li); });
          pickMore.querySelector(".quote").textContent = b.getAttribute("data-q");
        });
      });
    }

    var track = teamSection.querySelector(".tslider__track");
    var navBtns = teamSection.querySelectorAll(".tslider__btn");
    if (track && navBtns.length) {
      function cardStep() { var c = track.querySelector(".tcard"); return c ? c.getBoundingClientRect().width + 20 : 300; }
      function updateNav() {
        var max = track.scrollWidth - track.clientWidth - 2;
        navBtns.forEach(function (b) {
          var dir = parseInt(b.getAttribute("data-dir"), 10);
          b.disabled = dir < 0 ? track.scrollLeft <= 2 : track.scrollLeft >= max;
        });
      }
      navBtns.forEach(function (b) {
        b.addEventListener("click", function () {
          track.scrollBy({ left: parseInt(b.getAttribute("data-dir"), 10) * cardStep(), behavior: reduce ? "auto" : "smooth" });
        });
      });
      track.addEventListener("scroll", updateNav, { passive: true });
      window.addEventListener("resize", updateNav);
      updateNav();
      teamSection.querySelectorAll(".proto-switch__btn").forEach(function (b) { b.addEventListener("click", function () { setTimeout(updateNav, 0); }); });
    }
  }

})();
