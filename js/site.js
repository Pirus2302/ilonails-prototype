(function () {
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
    if (modalVideo) { modalVideo.currentTime = 0; modalVideo.play().catch(function () {}); }
    if (modalClose) modalClose.focus();
  }
  function closeModal() {
    if (!modal) return;
    modal.setAttribute("data-open", "false");
    document.body.style.overflow = menuOpen() ? "hidden" : "";
    if (modalVideo) modalVideo.pause();
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

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.querySelectorAll("video[data-autoplay]").forEach(function (v) {
    if (reduce) { v.removeAttribute("autoplay"); v.pause(); return; }
    v.muted = true; v.play().catch(function () {});
  });
})();
