import { absoluteSiteUrl, currentRoute, sitePath } from "./src/site-paths.js";

(function () {
  "use strict";

  const SITE_NAME = "SummerButWhere";
  const ORGANIZATION_NAME = "ASBA Yurtdışı Eğitim Danışmanlık";
  const DEFAULT_IMAGE = "/assets/Experience-Cambridge-1-1024x660.jpg-DppmgKJn.webp";
  const LOGO = "/assets/summerbutwhere-logo.png";
  const copy = {
    en: {
      homeTitle: "SummerButWhere | Academic Summer School Programs",
      homeDescription: "Explore carefully selected academic summer school programs from leading institutions around the world and find the right summer experience.",
      catalogueTitle: "Academic Summer School Programs | SummerButWhere",
      catalogueDescription: "Compare academic summer school programs by subject, school and country, including ages, dates, locations and fees.",
      aboutTitle: "About SummerButWhere | ASBA",
      aboutDescription: "Learn about SummerButWhere, an ASBA project helping students and families compare academic summer school programs abroad.",
      programFallback: "View ages, dates, location, fees and program details on SummerButWhere."
    },
    tr: {
      homeTitle: "SummerButWhere | Akademik Yaz Okulu Programları",
      homeDescription: "Dünyanın önde gelen kurumlarındaki akademik yaz okulu programlarını keşfedin ve size uygun yaz deneyimini bulun.",
      catalogueTitle: "Akademik Yaz Okulu Programları | SummerButWhere",
      catalogueDescription: "Akademik yaz okulu programlarını konu, okul ve ülkeye göre karşılaştırın; yaş, tarih, konum ve ücret bilgilerini inceleyin.",
      aboutTitle: "SummerButWhere Hakkında | ASBA",
      aboutDescription: "Öğrencilerin ve ailelerin yurt dışı akademik yaz okullarını karşılaştırmasına yardımcı olan ASBA projesi SummerButWhere'ı tanıyın.",
      programFallback: "Yaş, tarih, konum, ücret ve program ayrıntılarını SummerButWhere'da inceleyin."
    }
  };

  let routeRevision = 0;
  let catalogueDataPromise = null;

  function language() {
    try { return localStorage.getItem("lang") === "tr" ? "tr" : "en"; }
    catch { return "en"; }
  }

  function baseUrl() {
    return absoluteSiteUrl();
  }

  function pageUrl() {
    return new URL(location.pathname, location.origin).href;
  }

  function assetUrl(path) {
    if (!path) return absoluteSiteUrl(DEFAULT_IMAGE);
    const value = String(path);
    return /^https?:\/\//i.test(value) ? value : absoluteSiteUrl(value);
  }

  function concise(value, maximum = 160) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    if (text.length <= maximum) return text;
    const shortened = text.slice(0, maximum - 1).replace(/\s+\S*$/, "").trim();
    return `${shortened}…`;
  }

  function setMeta(attribute, key, value) {
    let element = document.head.querySelector(`meta[${attribute}="${key}"]`);
    if (!element) {
      element = document.createElement("meta");
      element.setAttribute(attribute, key);
      document.head.appendChild(element);
    }
    element.setAttribute("content", value);
  }

  function setCanonical(url) {
    let link = document.head.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = url;
  }

  function structuredData(meta, lang) {
    const root = baseUrl();
    const graph = [
      {
        "@type": "Organization",
        "@id": `${root}#organization`,
        name: ORGANIZATION_NAME,
        url: "https://asba.com.tr/",
        logo: assetUrl(LOGO)
      },
      {
        "@type": "WebSite",
        "@id": `${root}#website`,
        url: root,
        name: SITE_NAME,
        description: copy[lang].homeDescription,
        inLanguage: ["en", "tr"],
        publisher: { "@id": `${root}#organization` }
      },
      {
        "@type": meta.schemaType,
        "@id": `${pageUrl()}#webpage`,
        url: pageUrl(),
        name: meta.title,
        description: meta.description,
        inLanguage: lang,
        isPartOf: { "@id": `${root}#website` },
        primaryImageOfPage: { "@type": "ImageObject", url: meta.image }
      }
    ];
    let script = document.getElementById("seo-structured-data");
    if (!script) {
      script = document.createElement("script");
      script.id = "seo-structured-data";
      script.type = "application/ld+json";
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify({ "@context": "https://schema.org", "@graph": graph });
  }

  function apply(meta, lang) {
    document.documentElement.lang = lang;
    document.title = meta.title;
    setCanonical(pageUrl());
    setMeta("name", "description", meta.description);
    setMeta("name", "robots", "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1");
    setMeta("property", "og:type", "website");
    setMeta("property", "og:site_name", SITE_NAME);
    setMeta("property", "og:title", meta.title);
    setMeta("property", "og:description", meta.description);
    setMeta("property", "og:url", pageUrl());
    setMeta("property", "og:image", meta.image);
    setMeta("property", "og:image:alt", meta.imageAlt || SITE_NAME);
    setMeta("property", "og:locale", lang === "tr" ? "tr_TR" : "en_US");
    setMeta("property", "og:locale:alternate", lang === "tr" ? "en_US" : "tr_TR");
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", meta.title);
    setMeta("name", "twitter:description", meta.description);
    setMeta("name", "twitter:image", meta.image);
    structuredData(meta, lang);
  }

  function routeMeta(lang) {
    const text = copy[lang];
    const image = assetUrl(DEFAULT_IMAGE);
    const path = currentRoute().replace(/\/+$/, "") || "/";
    if (path === "/about") {
      return { title: text.aboutTitle, description: text.aboutDescription, image, imageAlt: "SummerButWhere and ASBA", schemaType: "AboutPage" };
    }
    if (path === "/programs") {
      return { title: text.catalogueTitle, description: text.catalogueDescription, image, imageAlt: text.catalogueTitle, schemaType: "CollectionPage" };
    }
    return { title: text.homeTitle, description: text.homeDescription, image, imageAlt: text.homeTitle, schemaType: "WebPage" };
  }

  function loadCatalogueData() {
    if (!catalogueDataPromise) {
      catalogueDataPromise = Promise.all([
        fetch(sitePath("data/programs.normalized.json")).then((response) => response.ok ? response.json() : []),
        fetch(sitePath("data/image-candidates.json")).then((response) => response.ok ? response.json() : {}).catch(() => ({}))
      ]).catch(() => [[], {}]);
    }
    return catalogueDataPromise;
  }

  async function programMeta(programId, lang) {
    const [programs, images] = await loadCatalogueData();
    const program = programs.find((item) => item.id === programId);
    if (!program) return routeMeta(lang);
    const rawTitle = (lang === "tr" && program.title_tr) || program.title || SITE_NAME;
    const campus = (lang === "tr" && program.campus_tr) || program.campus || "";
    const displayTitle = campus && !rawTitle.toLocaleLowerCase(lang).includes(campus.toLocaleLowerCase(lang))
      ? `${rawTitle} - ${campus}` : rawTitle;
    const description = concise((lang === "tr" && program.description_short_tr) || program.description_short || copy[lang].programFallback);
    const candidate = Array.isArray(images[program.id]) ? images[program.id][0] : program.image_url;
    return {
      title: `${displayTitle} | ${SITE_NAME}`,
      description,
      image: assetUrl(candidate),
      imageAlt: displayTitle,
      schemaType: "ItemPage"
    };
  }

  async function update() {
    const revision = ++routeRevision;
    const lang = language();
    const match = /^\/programs\/([^/?#]+)\/?$/.exec(currentRoute());
    let meta = routeMeta(lang);
    if (match) meta = await programMeta(decodeURIComponent(match[1]), lang);
    if (revision !== routeRevision) return;
    apply(meta, lang);
  }

  window.addEventListener("popstate", update);
  window.addEventListener("storage", (event) => { if (event.key === "lang") update(); });
  document.addEventListener("click", (event) => {
    if (event.target.closest("#home-language,.catalogue-language,.pp-lang,.ab-lang")) {
      setTimeout(update, 0);
    }
  });
  update();
})();
