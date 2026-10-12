/*
 * Temporary logo comparison switcher.
 * Swaps every SummerButWhere logo on the site between the two candidate
 * designs (assets/logo-option-1.png / logo-option-2.png) and shows a small
 * floating toggle. The choice is remembered in localStorage and can be forced
 * with ?logo=1 or ?logo=2 in the URL.
 * Once a logo is chosen: point the <img> tags (index.html, program-page.js,
 * app-loader.js) at the winner, delete this file, logo-options.css and the
 * two <script>/<link> tags in index.html.
 */
(function () {
  "use strict";

  var OPTIONS = {
    "1": { src: "./assets/logo-option-1.png", label: "Seçenek 1" },
    "2": { src: "./assets/logo-option-2.png", label: "Seçenek 2" }
  };
  var KEY = "sbw-logo-option";
  var root = document.documentElement;

  function readStored() {
    try { return window.localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function store(value) {
    try { window.localStorage.setItem(KEY, value); } catch (e) { /* ignore */ }
  }

  var fromUrl = new URLSearchParams(window.location.search).get("logo");
  var current = OPTIONS[fromUrl] ? fromUrl : (OPTIONS[readStored()] ? readStored() : "1");
  if (OPTIONS[fromUrl]) store(fromUrl);

  function isSiteLogo(img) {
    return img.hasAttribute("data-sbw-logo") || /summerbutwhere-logo\.png/.test(img.getAttribute("src") || "");
  }

  function applyTo(img) {
    if (!isSiteLogo(img)) return;
    img.setAttribute("data-sbw-logo", "");
    img.removeAttribute("width");
    img.removeAttribute("height");
    if (img.getAttribute("src") !== OPTIONS[current].src) img.setAttribute("src", OPTIONS[current].src);
  }

  function applyAll() {
    root.setAttribute("data-logo", current);
    var imgs = document.querySelectorAll("img");
    for (var i = 0; i < imgs.length; i++) applyTo(imgs[i]);
    var buttons = document.querySelectorAll(".logo-switch button[data-option]");
    for (var j = 0; j < buttons.length; j++) {
      buttons[j].setAttribute("aria-pressed", String(buttons[j].getAttribute("data-option") === current));
    }
  }

  function buildToggle() {
    if (document.querySelector(".logo-switch")) return;
    var box = document.createElement("div");
    box.className = "logo-switch";
    box.setAttribute("role", "group");
    box.setAttribute("aria-label", "Logo seçenekleri");
    var title = document.createElement("span");
    title.textContent = "Logo";
    box.appendChild(title);
    Object.keys(OPTIONS).forEach(function (key) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.setAttribute("data-option", key);
      btn.textContent = OPTIONS[key].label;
      btn.addEventListener("click", function () {
        current = key;
        store(key);
        applyAll();
      });
      box.appendChild(btn);
    });
    document.body.appendChild(box);
  }

  // React re-mounts nodes (catalogue header), so keep new <img>s in sync.
  new MutationObserver(function (records) {
    for (var i = 0; i < records.length; i++) {
      var added = records[i].addedNodes;
      for (var j = 0; j < added.length; j++) {
        var node = added[j];
        if (node.nodeType !== 1) continue;
        if (node.tagName === "IMG") applyTo(node);
        else if (node.querySelectorAll) {
          var imgs = node.querySelectorAll("img");
          for (var k = 0; k < imgs.length; k++) applyTo(imgs[k]);
        }
      }
    }
  }).observe(root, { childList: true, subtree: true });

  root.setAttribute("data-logo", current);

  function ready() {
    buildToggle();
    applyAll();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready);
  else ready();
})();
