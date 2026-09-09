(function () {
  var burger = document.querySelector(".burger");
  var menu = document.querySelector(".menu");
  if (burger && menu) {
    burger.addEventListener("click", function () {
      var open = menu.getAttribute("data-open") === "true";
      menu.setAttribute("data-open", open ? "false" : "true");
      burger.setAttribute("aria-expanded", open ? "false" : "true");
      document.body.style.overflow = open ? "" : "hidden";
    });
    menu.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        menu.setAttribute("data-open", "false");
        burger.setAttribute("aria-expanded", "false");
        document.body.style.overflow = "";
      });
    });
  }

  var modal = document.querySelector(".modal");
  var modalVideo = modal ? modal.querySelector("video") : null;
  function openModal() {
    if (!modal) return;
    modal.setAttribute("data-open", "true");
    document.body.style.overflow = "hidden";
    if (modalVideo) { modalVideo.currentTime = 0; modalVideo.play().catch(function () {}); }
    var close = modal.querySelector(".modal__close"); if (close) close.focus();
  }
  function closeModal() {
    if (!modal) return;
    modal.setAttribute("data-open", "false");
    document.body.style.overflow = "";
    if (modalVideo) modalVideo.pause();
  }
  document.querySelectorAll("[data-open-video]").forEach(function (b) { b.addEventListener("click", openModal); });
  if (modal) {
    modal.querySelector(".modal__close").addEventListener("click", closeModal);
    modal.addEventListener("click", function (e) { if (e.target === modal) closeModal(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeModal(); });
  }

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.querySelectorAll("video[data-autoplay]").forEach(function (v) {
    if (reduce) { v.removeAttribute("autoplay"); v.pause(); return; }
    v.muted = true; v.play().catch(function () {});
  });
})();
