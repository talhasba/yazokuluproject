// Price amounts come from the merged programme record. Reviewed inclusions live separately
// so regenerating the catalogue does not erase them. See data/price-inclusions.json for sources.
const COPY = {
  en: {
    title: "Price options & what's included", why: "Why prices differ", included: "Includes",
    excluded: "Not included", residential: "Residential", day: "Day / non-residential",
    historical: "2026 fees · historical reference", historicalNote: "These are previous-season prices, not a current quote. Fees differ by campus and accommodation; current fees are available on request.",
    campus: "Campus tuition range", campusNote: "This is a campus-wide tuition range, not two bookable packages or a confirmed fee for this course. The catalogue does not specify which duration or inclusions correspond to each end of the range.",
    unknown: "The provider lists different prices, but the catalogue does not specify what distinguishes these options.",
    unknownOption: "Inclusions for this option have not been specified.",
    accommodation: "Residential includes overnight accommodation; day/non-residential does not. Any other package inclusions need confirmation.",
    teaching: "Teaching and course activities", room: "Overnight accommodation", stay: "Accommodation",
    details: "See what's included", week: "week", weeks: "weeks"
  },
  tr: {
    title: "Fiyat seçenekleri ve kapsamları", why: "Fiyatlar neden farklı?", included: "Dahil olanlar",
    excluded: "Dahil olmayanlar", residential: "Konaklamalı", day: "Gündüzlü / konaklamasız",
    historical: "2026 ücretleri · geçmiş dönem", historicalNote: "Bunlar geçmiş dönem ücretleridir; güncel fiyat teklifi değildir. Ücretler kampüse ve konaklamaya göre değişir; güncel ücretler talep üzerine öğrenilebilir.",
    campus: "Kampüs genelindeki ücret aralığı", campusNote: "Bu aralık kampüs genelindeki eğitim ücretlerini gösterir; satın alınabilir iki paket veya bu ders için kesin ücret değildir. Aralığın alt ve üst sınırlarının hangi süre ve olanakları içerdiği katalogda belirtilmemiştir.",
    unknown: "Sağlayıcı farklı ücretler listeliyor; ancak bu seçenekler arasındaki fark katalogda belirtilmemiştir.",
    unknownOption: "Bu seçeneğin kapsamı belirtilmemiştir.",
    accommodation: "Konaklamalı seçenekte gece konaklaması dahildir; gündüzlü/konaklamasız seçenekte dahil değildir. Diğer paket olanakları teyit edilmelidir.",
    teaching: "Dersler ve program etkinlikleri", room: "Gece konaklaması", stay: "Konaklama",
    details: "Kapsamları incele", week: "hafta", weeks: "hafta"
  }
};

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const norm = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
const localized = (value, lang, fallback) => value?.[lang] ?? value?.en ?? fallback;
const hasAmount = (amount) => amount !== null && amount !== undefined && amount !== "" && Number.isFinite(Number(amount)) && Number(amount) >= 0;
const residential = (label) => !/non[\s-]*residential/i.test(label) && /residential|boarding|accommodation/i.test(label);
const day = (label) => /non[\s-]*residential|\bday\b|^programme fee$|^program fee$/i.test(label);

function money(tier, currency) {
  if (String(tier.display || "").trim()) return String(tier.display).trim();
  if (!hasAmount(tier.amount)) return "";
  try {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency: tier.currency || currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(tier.amount));
  } catch {
    return `${tier.amount} ${tier.currency || currency || ""}`.trim();
  }
}

function option(tier, rec, lang, profile, historical = false) {
  const L = COPY[lang];
  const isResidential = residential(tier.label);
  const isDay = day(tier.label);
  let title = String(tier.label || L.title).trim();
  let includes = [];
  let excludes = [];
  let note = "";
  if (isResidential || isDay) {
    title = isResidential ? L.residential : L.day;
    const weeks = /\b(\d+)\s*weeks?\b/i.exec(tier.label || "");
    if (weeks) title += ` · ${weeks[1]} ${Number(weeks[1]) === 1 ? L.week : L.weeks}`;
    includes = localized(profile[isResidential ? "residential" : "day"], lang, [L.teaching, ...(isResidential ? [L.room] : [])]);
    excludes = isDay ? localized(profile.dayExcluded, lang, [L.room]) : [];
    note = isDay ? localized(profile.dayNote, lang, "") : "";
  } else {
    note = L.unknownOption;
  }

  // A historical record or edited/unrecognised fee must never inherit a guessed duration.
  if (!historical && rec.provider === "investin" && /^(programme fee|programme fee \+ residential package total)$/i.test(tier.label || "") && hasAmount(tier.amount)) {
    const pack = (profile.packages || []).find((p) =>
      p.currency === (tier.currency || rec.price?.currency) && Number(tier.amount) === p[isResidential ? "residentialAmount" : "dayAmount"]
    );
    if (pack) {
      title = `${localized(pack.duration, lang, "")} · ${isResidential ? L.residential : L.day}`;
      includes = [...localized(pack.includes, lang, []), ...includes];
      if (isResidential) includes.push(`${L.stay}: ${localized(pack.stay, lang, "")}`);
    } else {
      // Keep unmatched labels visible instead of hiding which source option the price belongs to.
      title = lang === "tr" ? (isResidential ? "Program ücreti + konaklama paketi" : "Program ücreti") : String(tier.label || title);
      note = L.unknownOption;
    }
  }
  return { title, price: money(tier, rec.price?.currency), includes, excludes, note };
}

export function priceDetails(rec, language = "en", details = {}) {
  const lang = language === "tr" ? "tr" : "en";
  const L = COPY[lang];
  const tiers = Array.isArray(rec.price?.tiers) ? rec.price.tiers : [];
  if (rec.price_scope === "campus_tuition_range" || tiers.some((t) => /campus range (lower|upper) bound/i.test(t.label || ""))) {
    return { lang, title: L.campus, explanation: L.campusNote, options: [], note: "", historical: false, range: true };
  }

  const profile = { ...(details.providers?.[rec.provider] || {}), ...(details.programs?.[rec.id] || {}) };
  const unique = [];
  const seen = new Set();
  for (const tier of tiers) {
    if (!tier || !money(tier, rec.price?.currency)) continue;
    const key = JSON.stringify([norm(tier.label), tier.currency || rec.price?.currency || "", hasAmount(tier.amount) ? Number(tier.amount) : money(tier, rec.price?.currency)]);
    if (!seen.has(key)) { seen.add(key); unique.push(tier); }
  }
  let options = unique.map((tier) => option(tier, rec, lang, profile));
  let historical = false;
  if (!options.length && rec.historical_2026_fees_gbp && !rec.price?.display && !hasAmount(rec.price?.min_amount) && !hasAmount(rec.price?.max_amount)) {
    const cities = { London: "Londra", Cambridge: "Cambridge" };
    for (const [city, prices] of Object.entries(rec.historical_2026_fees_gbp)) {
      for (const [key, label] of [["residential", "Residential"], ["day_student", "Day"]]) {
        if (!hasAmount(prices?.[key])) continue;
        const item = option({ label, amount: prices[key], currency: "GBP" }, rec, lang, {}, true);
        item.title = `${lang === "tr" ? cities[city] || city : city} · ${item.title}`;
        options.push(item);
      }
    }
    historical = options.length > 0;
  }
  // Repeated identical fee entries do not represent different packages.
  if (options.length < 2) return { lang, options: [], explanation: "", note: "", historical: false, range: false };
  const hasAccommodationChoice = unique.some((t) => residential(t.label)) && unique.some((t) => day(t.label));
  return {
    lang, title: historical ? L.historical : L.title, options, historical, range: false,
    explanation: historical ? L.historicalNote : localized(profile.explanation, lang, hasAccommodationChoice ? L.accommodation : L.unknown),
    note: historical ? "" : localized(profile.note, lang, "")
  };
}

export function renderPriceDetails(rec, language, details) {
  const model = priceDetails(rec, language, details);
  const L = COPY[model.lang];
  if (model.range) {
    return { summary: `<div class="pp-price-options"><div class="pp-price-options-title">${esc(model.title)}</div><p class="pp-price-note">${esc(model.explanation)}</p></div>`, section: "" };
  }
  if (!model.options.length) return { summary: "", section: "" };
  const items = (values) => `<ul>${values.map((value) => `<li>${esc(value)}</li>`).join("")}</ul>`;
  const summary = `<div class="pp-price-options${model.historical ? " pp-price-history" : ""}">
    <div class="pp-price-options-title">${esc(model.title)}</div>
    ${model.options.map((o) => `<div class="pp-price-option"><span>${esc(o.title)}</span><b>${esc(o.price)}</b></div>`).join("")}
    ${model.historical ? `<p class="pp-price-note">${esc(L.historicalNote)}</p>` : ""}
    <a class="pp-price-details-link" href="#price-options" data-goto-pricing>${esc(L.details)} ↓</a>
  </div>`;
  const section = `<section class="pp-block pp-pricing-detail" id="price-options" aria-labelledby="price-options-title">
    <h3 class="pp-h" id="price-options-title">${esc(model.title)}</h3>
    <p class="pp-pricing-why"><strong>${esc(L.why)}</strong> ${esc(model.explanation)}</p>
    <div class="pp-pricing-grid">${model.options.map((o) => `<article class="pp-pricing-package">
      <div class="pp-pricing-heading"><h4>${esc(o.title)}</h4><b>${esc(o.price)}</b></div>
      ${o.includes.length ? `<div class="pp-pricing-label">${esc(L.included)}</div>${items(o.includes)}` : ""}
      ${o.excludes.length ? `<div class="pp-pricing-label">${esc(L.excluded)}</div>${items(o.excludes)}` : ""}
      ${o.note ? `<p class="pp-pricing-caveat">${esc(o.note)}</p>` : ""}
    </article>`).join("")}</div>
    ${model.note ? `<p class="pp-pricing-caveat">${esc(model.note)}</p>` : ""}
  </section>`;
  return { summary, section };
}
