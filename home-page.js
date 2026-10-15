(function () {
  const page = document.getElementById("home-page");
  const root = document.getElementById("root");
  const languageButton = document.getElementById("home-language");

  if (!page || !root) return;

  function isHomeRoute() {
    return window.location.pathname.replace(/\/+$/, "") === "";
  }

  function getLanguage() {
    return localStorage.getItem("lang") === "tr" ? "tr" : "en";
  }

  function applyLanguage() {
    const language = getLanguage();
    document.documentElement.lang = language;
    page.querySelectorAll("[data-home-en][data-home-tr]").forEach((element) => {
      element.textContent = element.dataset[language === "tr" ? "homeTr" : "homeEn"];
    });
    languageButton.textContent = language === "tr" ? "EN" : "TR";
    languageButton.setAttribute(
      "aria-label",
      language === "tr" ? "Switch to English" : "Türkçeye geç"
    );
  }

  function renderRoute() {
    const showHome = isHomeRoute();
    page.hidden = !showHome;
    root.hidden = showHome;
    document.body.classList.toggle("home-route", showHome);
    if (showHome) {
      applyLanguage();
      window.scrollTo(0, 0);
    }
  }

  languageButton.addEventListener("click", () => {
    const nextLanguage = getLanguage() === "tr" ? "en" : "tr";
    localStorage.setItem("lang", nextLanguage);
    applyLanguage();
  });

  window.addEventListener("popstate", renderRoute);
  renderRoute();
})();
