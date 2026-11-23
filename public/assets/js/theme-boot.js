/* NS Card – a mentett megjelenés beállítása még az első kirajzolás előtt (villanás nélkül). */
(function () {
  try {
    var saved = JSON.parse(localStorage.getItem("nsc.theme.v1") || "null");
    if (!saved) return;
    var root = document.documentElement;
    Object.keys(saved.vars || {}).forEach(function (k) { root.style.setProperty(k, saved.vars[k]); });
    Object.keys(saved.attrs || {}).forEach(function (k) { root.setAttribute(k, saved.attrs[k]); });
    if (saved.css) {
      var tag = document.createElement("style");
      tag.id = "nsc-custom-css";
      tag.textContent = saved.css;
      document.head.appendChild(tag);
    }
  } catch (e) {}
})();
