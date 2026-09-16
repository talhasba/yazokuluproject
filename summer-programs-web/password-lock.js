(function () {
  "use strict";

  var ACCESS_KEY = "summer-programs-access";
  var PASSWORD = "ASBA2026";

  function setPageInert(lock, isInert) {
    Array.prototype.forEach.call(document.body.children, function (element) {
      if (element !== lock) element.inert = isInert;
    });
  }

  function hasAccess() {
    try {
      return sessionStorage.getItem(ACCESS_KEY) === "granted";
    } catch (error) {
      return false;
    }
  }

  function rememberAccess() {
    try {
      sessionStorage.setItem(ACCESS_KEY, "granted");
    } catch (error) {
      // Access still works for this page load when storage is unavailable.
    }
  }

  function unlock(lock) {
    setPageInert(lock, false);
    document.documentElement.classList.remove("site-locked");
    lock.hidden = true;
  }

  function initializeLock() {
    var lock = document.getElementById("site-lock");
    var form = document.getElementById("site-lock-form");
    var passwordInput = document.getElementById("site-lock-password");
    var error = document.getElementById("site-lock-error");

    if (!lock || !form || !passwordInput || !error) return;

    setPageInert(lock, true);

    if (hasAccess()) {
      unlock(lock);
      return;
    }

    passwordInput.focus();

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      if (passwordInput.value === PASSWORD) {
        rememberAccess();
        unlock(lock);
        return;
      }

      passwordInput.value = "";
      passwordInput.setAttribute("aria-invalid", "true");
      error.textContent = "Incorrect password. Please try again.";
      passwordInput.focus();
    });

    passwordInput.addEventListener("input", function () {
      passwordInput.removeAttribute("aria-invalid");
      error.textContent = "";
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeLock, { once: true });
  } else {
    initializeLock();
  }
})();
