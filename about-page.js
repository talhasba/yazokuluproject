/*
 * About ("Hakkımızda") page, shown on /about. Independent layer like program-page.js:
 * it only decides whether #root or #about-page is visible.
 */
(function () {
  "use strict";
  const page = document.getElementById("about-page");
  const root = document.getElementById("root");
  const home = document.getElementById("home-page");
  if (!page || !root) return;

  const PHONE_DISPLAY = "(0216) 358 89 19";
  const PHONE_TEL = "+902163588919";
  const EMAIL = "bilgi@asba.com.tr";
  const WEBSITE = "https://asba.com.tr";
  const ADDRESS = "Caddebostan, Bağdat Cad. Yenel Apt No:350 D:8, 34728 Kadıköy/İstanbul";
  const MAPS = "https://www.google.com/maps/search/?api=1&query=" +
    encodeURIComponent("ASBA Yurtdışı Eğitim Danışmanlık, " + ADDRESS);

  const T = {
    tr: {
      title: "Hakkımızda · SummerButWhere",
      about: "Hakkımızda", back: "Tüm programlar", home: "Ana sayfa", langBtn: "EN", langLabel: "Switch to English",
      eyebrow: "Hakkımızda",
      h1: "SummerButWhere, ASBA Yurtdışı Eğitim Danışmanlık'ın, tavsiye ettiği akademik yaz okulu programlarını sunduğu projesidir",
      lead: [
        "SummerButWhere, ASBA Yurtdışı Eğitim Danışmanlık’ın dünyanın önde gelen kurumlarındaki akademik yaz okulu programlarını tek bir çatı altında sunduğu özel bir platformdur. Öğrencilerin vizyonunu geliştirecek en doğru akademik yaz programı seçimlerinde rehberlik etmek amacıyla hayata geçirilmiştir.",
        "Öğrencilerimiz için Dünyanın en seçkin akademik yaz okullarını tek bir noktada buluşturan özel bir rehber oluşturduk. ASBA Yurtdışı Eğitim Danışmanlık’ın akademik yaz okulu alanındaki uzmanlığını ve seçkin program tavsiyelerini tek bir çatı altında kolaylıkla inceleyebilir ve kayıt olabilirsiniz.",
        "SummerButWhere öğrencilere en doğru eğitim yolculuğunu sunmak üzere ASBA güvencesi ile hizmetinizde."
      ],
      whatTitle: "SummerButWhere nedir?",
      whatBody: "Öğrencilerin ve ailelerin yurtdışındaki akademik yaz okulu programlarını konu, okul ve ülkeye göre karşılaştırabilmesi için hazırlanmış bir program rehberidir. Her program sayfasında yaş aralığı, süre, tarih, ücret ve konaklama gibi temel bilgiler özetlenir.",
      asbaTitle: "ASBA Yurtdışı Eğitim Danışmanlık",
      asbaBody: "ASBA, İstanbul Kadıköy'de bulunan, 30 yılı aşkın bir süredir dünyanın birçok ülkesine lise düzeyinden yüksek lisans düzeyine geniş bir skalada öğrencilere yurtdışı eğitimi danışmanlığı veren köklü bir firmadır. SummerButWhere, ASBA'nın akademik yaz okulu programlarına yönelik çalışmasının markasıdır; program seçimi ve başvuru süreçlerinde destek için ASBA ekibiyle iletişime geçebilirsiniz.",
      asbaLink: "asba.com.tr",
      contactTitle: "İletişim",
      address: "Adres", phone: "Telefon", email: "E-posta", web: "Web sitesi",
      directions: "Yol tarifi al", cta: "Programları incele"
    },
    en: {
      title: "About Us · SummerButWhere",
      about: "About Us", back: "All programs", home: "Home", langBtn: "TR", langLabel: "Türkçeye geç",
      eyebrow: "About Us",
      h1: "SummerButWhere is a sub-brand of ASBA Yurtdışı Eğitim Danışmanlık",
      lead: "SummerButWhere is a sub-brand and project of ASBA Yurtdışı Eğitim Danışmanlık. It brings academic summer school programs from leading institutions around the world together in one place.",
      whatTitle: "What is SummerButWhere?",
      whatBody: "A program guide that lets students and families compare academic summer schools abroad by subject, school and country. Each program page summarises the essentials such as age range, duration, dates, price and accommodation.",
      asbaTitle: "ASBA Yurtdışı Eğitim Danışmanlık",
      asbaBody: "ASBA is an overseas education consultancy based in Kadıköy, Istanbul. SummerButWhere is the brand for ASBA's summer school work; you can contact the ASBA team for help with choosing a program and with the application process.",
      asbaLink: "asba.com.tr",
      contactTitle: "Contact",
      address: "Address", phone: "Phone", email: "Email", web: "Website",
      directions: "Get directions", cta: "Browse programs"
    }
  };

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const lang = () => { try { return localStorage.getItem("lang") === "tr" ? "tr" : "en"; } catch { return "en"; } };
  const isAbout = () => window.location.pathname.replace(/\/+$/, "") === "/about";
  const originalTitle = document.title;

  function render() {
    const l = lang();
    const L = T[l];
    page.innerHTML = `
      <header class="ab-top">
        <div class="ab-brand">
          <a class="site-brand-link" href="/" aria-label="SummerButWhere - ${esc(L.home)}"><img src="/assets/summerbutwhere-logo.png" alt="SummerButWhere - Akademik Yaz Okulu Programları"></a>
          <a class="parent-brand" href="${WEBSITE}"><img src="/assets/asba-logo.png" alt="ASBA Yurtdışı Eğitim Danışmanlık" width="738" height="237"></a>
        </div>
        <nav>
          <a class="ab-back" href="/programs">← ${esc(L.back)}</a>
          <button class="ab-lang" type="button" aria-label="${esc(L.langLabel)}">${esc(L.langBtn)}</button>
        </nav>
      </header>
      <main class="ab-wrap">
        <section class="ab-hero">
          <p class="ab-eyebrow">${esc(L.eyebrow)}</p>
          <h1>${esc(L.h1)}</h1>
          <div class="ab-lead">${(Array.isArray(L.lead) ? L.lead : [L.lead]).map((paragraph) => `<p>${esc(paragraph)}</p>`).join("")}</div>
        </section>
        <div class="ab-grid">
          <section class="ab-card">
            <h2>${esc(L.whatTitle)}</h2>
            <p>${esc(L.whatBody)}</p>
            <a class="ab-button" href="/programs">${esc(L.cta)} <span aria-hidden="true">→</span></a>
          </section>
          <section class="ab-card">
            <h2>${esc(L.asbaTitle)}</h2>
            <p>${esc(L.asbaBody)}</p>
            <a class="ab-link" href="${WEBSITE}">${esc(L.asbaLink)} <span aria-hidden="true">↗</span></a>
          </section>
        </div>
        <section class="ab-card ab-contact">
          <h2>${esc(L.contactTitle)}</h2>
          <dl>
            <div><dt>${esc(L.address)}</dt><dd>${esc(ADDRESS)}<br><a class="ab-link" href="${MAPS}" target="_blank" rel="noopener">${esc(L.directions)} <span aria-hidden="true">↗</span></a></dd></div>
            <div><dt>${esc(L.phone)}</dt><dd><a href="tel:${PHONE_TEL}">${esc(PHONE_DISPLAY)}</a></dd></div>
            <div><dt>${esc(L.email)}</dt><dd><a href="mailto:${EMAIL}">${esc(EMAIL)}</a></dd></div>
            <div><dt>${esc(L.web)}</dt><dd><a href="${WEBSITE}">asba.com.tr</a></dd></div>
          </dl>
        </section>
      </main>`;
    page.querySelector(".ab-lang").addEventListener("click", () => {
      try { localStorage.setItem("lang", l === "tr" ? "en" : "tr"); } catch { /* ignore */ }
      render();
      document.documentElement.lang = lang();
      document.title = T[lang()].title;
    });
  }

  function route() {
    if (isAbout()) {
      render();
      root.hidden = true;
      if (home) home.hidden = true;
      page.hidden = false;
      document.documentElement.lang = lang();
      document.title = T[lang()].title;
      window.scrollTo(0, 0);
    } else if (!page.hidden) {
      page.hidden = true;
      page.innerHTML = "";
      document.title = originalTitle;
    }
  }

  window.addEventListener("popstate", route);
  route();
})();
