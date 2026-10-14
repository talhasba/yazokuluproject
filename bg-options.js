/*
 * Temporary background-pattern switcher. See bg-options.css.
 * ?bg=0 (off) .. ?bg=5, remembered in localStorage ("sbw-bg-option").
 */
(function () {
  "use strict";
  var KEY = "sbw-bg-option";
  var LABELS = { "0": "Yok", "1": "Nokta", "2": "Dalga", "3": "Halka", "4": "Işın", "5": "Rota" };
  var root = document.documentElement;

  function read() { try { return window.localStorage.getItem(KEY); } catch (e) { return null; } }
  function store(v) { try { window.localStorage.setItem(KEY, v); } catch (e) { /* ignore */ } }

  var fromUrl = new URLSearchParams(window.location.search).get("bg");
  var current = LABELS[fromUrl] ? fromUrl : (LABELS[read()] ? read() : "0");
  if (LABELS[fromUrl]) store(fromUrl);

  function apply() {
    root.setAttribute("data-bg", current);
    var buttons = document.querySelectorAll(".bg-switch button");
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].setAttribute("aria-pressed", String(buttons[i].getAttribute("data-option") === current));
    }
  }

  function build() {
    if (document.querySelector(".bg-switch")) return;
    var box = document.createElement("div");
    box.className = "bg-switch";
    box.setAttribute("role", "group");
    box.setAttribute("aria-label", "Arka plan desenleri");
    var title = document.createElement("span");
    title.textContent = "Desen";
    box.appendChild(title);
    Object.keys(LABELS).forEach(function (key) {
      var button = document.createElement("button");
      button.type = "button";
      button.setAttribute("data-option", key);
      button.textContent = LABELS[key];
      button.addEventListener("click", function () { current = key; store(key); apply(); });
      box.appendChild(button);
    });
    document.body.appendChild(box);
    apply();
  }

  apply();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
  else build();
})();