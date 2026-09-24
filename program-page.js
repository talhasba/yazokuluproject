/*
 * Program detail page layer.
 *
 * Takes over #/programs/<id> for programs that have an entry in data/program-digests.json and
 * renders a photo-led, bullet-first page with the "Bilgi Formu". Programs without a digest are
 * left alone and keep showing the original React page. Facts (age, price, dates, location) are read
 * from programs.normalized.json, never from the digest, so the two cannot disagree.
 *
 * Add ?review to the site URL (before the #) to show internal data-check notes on each page.
 */
(function () {
  "use strict";

  // ---- Configuration: fill these in when the email/WhatsApp side is ready -------------------
  const FORM_ENDPOINT = "";   // e.g. a Formspree / Web3Forms / serverless URL that emails the enquiry
  const WHATSAPP_NUMBER = ""; // international format without "+", e.g. "905551234567"
  // -------------------------------------------------------------------------------------------

  const root = document.getElementById("root");
  const page = document.getElementById("program-page");
  if (!root || !page) return;

  const originalTitle = document.title;
  const reviewMode = new URLSearchParams(window.location.search).has("review");
  let data = null;
  let loading = null;

  const getLang = () => (localStorage.getItem("lang") === "tr" ? "tr" : "en");
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const stripTags = (s) => String(s ?? "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

  const T = {
    en: {
      brand: "Summer Programs", back: "All programs", langBtn: "TR", langLabel: "Türkçeye geç",
      age: "Age", duration: "Duration", dates: "Dates", price: "Price", location: "Location", format: "Format",
      onRequest: "On request", notListed: "Not listed",
      in_person: "In person", virtual: "Online", online: "Online", hybrid: "Hybrid",
      ready: "Ready", needs_review: "Needs review",
      topics: "Topics", tracks: "Course by age group", outcomes: "You'll leave with", fit: "Good fit if…", extras: "Beyond the classroom",
      glance: "At a glance", doTitle: "What you'll do", formPill: "Information form", photo: "Photo",
      review: "Needs source check (internal)"
    },
    tr: {
      brand: "Yaz Programları", back: "Tüm programlar", langBtn: "EN", langLabel: "Switch to English",
      age: "Yaş", duration: "Süre", dates: "Tarihler", price: "Ücret", location: "Konum", format: "Format",
      onRequest: "Talep üzerine", notListed: "Belirtilmemiş",
      in_person: "Yüz yüze", virtual: "Çevrimiçi", online: "Çevrimiçi", hybrid: "Karma",
      ready: "Hazır", needs_review: "İnceleme gerekli",
      topics: "Konular", tracks: "Yaş grubuna göre içerik", outcomes: "Programın sonunda", fit: "Şunlar için uygun…", extras: "Sınıfın dışında",
      glance: "Bir bakışta", doTitle: "Neler yapacaksınız", formPill: "Bilgi Formu", photo: "Fotoğraf",
      review: "Kaynak kontrolü gerekli (dahili)"
    }
  };

  const FORM = {
    tr: {
      title: "Bilgi Formu", intro: "İlgilendiğiniz programlar hakkında detaylı bilgi ve fiyat teklifi almak için formu doldurunuz.",
      perks: ["Program hakkında detaylı bilgi", "Fiyat teklifi", "Katılımcının yaşına uygun program önerisi"], progLabel: "İlgilendiğiniz program",
      name: "Adı Soyadı", namePh: "Adınız soyadınızı yazınız.", phone: "Telefon", phonePh: "05xx xxx xx xx", email: "E-posta", emailPh: "ornek@eposta.com",
      age: "Katılımcının yaşı", city: "Bulunduğunuz il", pick: "Lütfen seçin", submit: "Bilgi al", note: "Bilgileriniz yalnızca size dönüş yapmak için kullanılır.",
      errName: "Lütfen adınızı ve soyadınızı yazın.", errPhone: "Lütfen geçerli bir telefon numarası yazın.", errEmail: "Lütfen geçerli bir e-posta adresi yazın.", errAge: "Lütfen katılımcının yaşını seçin.", errCity: "Lütfen ilinizi seçin.",
      yearsOld: "yaş", abroad: "Yurt dışı",
      fits: (a, r) => `${a} yaş, programın ${r} yaş grubuna uygun.`,
      misfit: (a, r) => `Bu program ${r} yaş için listelenmiş. ${a} yaş bu aralığın dışında; danışmanımız uygun alternatifleri önerecek.`,
      noRange: "Bu programın yaş aralığı belirtilmemiş; danışmanımız yaşı kontrol edecek.",
      done: "Talebiniz alındı. En kısa sürede size dönüş yapacağız.", notConnected: "Form henüz bir e-posta adresine bağlı değil; bilgileriniz gönderilmedi.",
      failed: "Gönderilemedi. Lütfen daha sonra tekrar deneyin veya WhatsApp ile yazın.", sending: "Gönderiliyor…", wa: "Whatsapp'tan Bilgi Al"
    },
    en: {
      title: "Information form", intro: "Fill in the form to get detailed information and a price quote for the programs you are interested in.",
      perks: ["Detailed program information", "Price quote", "Program suggestions that match the participant's age"], progLabel: "Program of interest",
      name: "Name / surname", namePh: "Enter your name and surname.", phone: "Phone", phonePh: "+90 5xx xxx xx xx", email: "Email", emailPh: "name@example.com",
      age: "Participant's age", city: "City you live in", pick: "Please select", submit: "Request info", note: "Your details are only used to get back to you.",
      errName: "Please enter your name and surname.", errPhone: "Please enter a valid phone number.", errEmail: "Please enter a valid email address.", errAge: "Please select the participant's age.", errCity: "Please select your city.",
      yearsOld: "years old", abroad: "Outside Türkiye",
      fits: (a, r) => `Age ${a} fits this program's ${r} age group.`,
      misfit: (a, r) => `This program is listed for ages ${r}. Age ${a} is outside that range; an adviser will suggest suitable alternatives.`,
      noRange: "This program has no listed age range; an adviser will check the age.",
      done: "Request received. We will get back to you shortly.", notConnected: "The form is not connected to an email address yet; your details were not sent.",
      failed: "Could not send. Please try again later or contact us on WhatsApp.", sending: "Sending…", wa: "Get info on WhatsApp"
    }
  };

  const CITIES = ("Adana,Adıyaman,Afyonkarahisar,Ağrı,Aksaray,Amasya,Ankara,Antalya,Ardahan,Artvin,Aydın,Balıkesir,Bartın,Batman,Bayburt,Bilecik,Bingöl,Bitlis,Bolu,Burdur,Bursa,Çanakkale,Çankırı,Çorum,Denizli,Diyarbakır,Düzce,Edirne,Elazığ,Erzincan,Erzurum,Eskişehir,Gaziantep,Giresun,Gümüşhane,Hakkâri,Hatay,Iğdır,Isparta,İstanbul,İzmir,Kahramanmaraş,Karabük,Karaman,Kars,Kastamonu,Kayseri,Kırıkkale,Kırklareli,Kırşehir,Kilis,Kocaeli,Konya,Kütahya,Malatya,Manisa,Mardin,Mersin,Muğla,Muş,Nevşehir,Niğde,Ordu,Osmaniye,Rize,Sakarya,Samsun,Şanlıurfa,Siirt,Sinop,Sivas,Şırnak,Tekirdağ,Tokat,Trabzon,Tunceli,Uşak,Van,Yalova,Yozgat,Zonguldak")
    .split(",").sort((a, b) => a.localeCompare(b, "tr"));

  // ---- icons ---------------------------------------------------------------------------------
  const svg = (p) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  const ICON = {
    age: svg('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>'),
    duration: svg('<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>'),
    dates: svg('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>'),
    price: svg('<circle cx="12" cy="12" r="10"/><path d="M15 9.5a3 3 0 0 0-3-1.5c-1.7 0-3 1-3 2.3 0 3 6 1.7 6 4.7 0 1.3-1.3 2.5-3 2.5a3.4 3.4 0 0 1-3-1.5M12 6v2m0 8v2"/>'),
    location: svg('<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>'),
    format: svg('<path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6"/>'),
    form: svg('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h2l1.5 3 2-6L15 13h1"/>'),
    user: svg('<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'),
    phone: svg('<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>'),
    mail: svg('<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>'),
    cal: svg('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>'),
    arrow: svg('<path d="M5 12h14M13 6l6 6-6 6"/>'),
    chat: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 3h16a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H9l-5 4v-4H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/></svg>'
  };

  // ---- data ----------------------------------------------------------------------------------
  function load() {
    if (!loading) {
      const json = (url, fallback) => fetch(url).then((r) => (r.ok ? r.json() : fallback)).catch(() => fallback);
      loading = Promise.all([
        json("./data/programs.normalized.json", []),
        json("./data/program-digests.json", {}),
        json("./data/image-candidates.json", {}),
        json("./assets/program-images/image-sources.json", { images: {} })
      ]).then(([programs, digests, images, sources]) => {
        data = { programs: new Map(programs.map((p) => [p.id, p])), digests, images, sources: sources.images || {} };
        return data;
      });
    }
    return loading;
  }

  // ---- helpers -------------------------------------------------------------------------------
  function fmtDates(list, lang) {
    const months = lang === "tr"
      ? ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"]
      : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const one = (s) => {
      const m = /^(\d{4})-(\d\d)-(\d\d)/.exec(s);
      return m ? `${+m[3]} ${months[+m[2] - 1]} ${m[1]}` : (lang === "tr" ? trMonths(s) : s);
    };
    return (list || []).map((d) => (/^\d{4}-/.test(d) && d.includes("/") ? d.split("/").map(one).join(" – ") : one(d)));
  }

  // Free-text dates from providers ("26 July to 8 August") are only translated for the month names and "to".
  function trMonths(text) {
    const map = { January: "Ocak", February: "Şubat", March: "Mart", April: "Nisan", May: "Mayıs", June: "Haziran", July: "Temmuz", August: "Ağustos", September: "Eylül", October: "Ekim", November: "Kasım", December: "Aralık" };
    return text.replace(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/g, (m) => map[m]).replace(/\bto\b/g, "–");
  }

  function photosFor(id) {
    const local = (data.images[id] || [])
      .filter((u) => u.startsWith("/") && !/\.(svg|png)(\?|$)/i.test(u) && !/-300x\d+/.test(u))
      .map((u) => "." + u);
    const hero = local.find((u) => u.includes("/campuses/")) || local[0] || "";
    return { hero, gallery: local.filter((u) => u !== hero).slice(0, 3) };
  }

  function credit(heroUrl) {
    const m = /\/campuses\/([^/.]+)\.webp$/.exec(heroUrl);
    const s = m && data.sources[m[1]];
    if (!s) return "";
    const artist = stripTags(s.artist) || stripTags(s.credit) || "Wikimedia Commons";
    return `<a class="pp-credit" href="${esc(s.commons_page)}" target="_blank" rel="noopener">${esc(T[getLang()].photo)}: ${esc(artist)} · ${esc(s.license || "")}</a>`;
  }

  function factRows(rec, lang, digest) {
    const L = T[lang];
    const ageOverride = !(rec.age_ranges || []).length && digest?.facts?.age?.[lang];
    const mode = (rec.delivery_modes || [])[0];
    const dates = fmtDates(rec.dates, lang);
    const duration = rec.duration ? (lang === "tr" ? rec.duration.replace(/weeks?/i, "hafta") : rec.duration) : "";
    return [
      ["age", L.age, (rec.age_ranges || []).join(", ") || ageOverride || L.notListed],
      ["duration", L.duration, duration || L.notListed],
      ["dates", L.dates, dates.join(" · ") || L.onRequest],
      ["price", L.price, rec.price?.display || L.onRequest],
      ["location", L.location, (lang === "tr" && rec.location_tr) || rec.location || L.notListed],
      ["format", L.format, L[mode] || mode || L.notListed]
    ];
  }

  const list = (items, cls = "") => `<ul class="pp-list ${cls}">${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;
  const card = (title, body) => `<section class="pp-card"><h3 class="pp-h">${esc(title)}</h3>${body}</section>`;

  // ---- render --------------------------------------------------------------------------------
  function render(rec, digest) {
    const lang = getLang();
    const L = T[lang];
    const d = digest[lang] || digest.en;
    const title = (lang === "tr" && rec.title_tr) || rec.title;
    const { hero, gallery } = photosFor(rec.id);
    const facts = factRows(rec, lang, digest);
    const dates = fmtDates(rec.dates, lang);

    const tracks = d.tracks?.length
      ? `<section class="pp-block"><h3 class="pp-h">${esc(L.tracks)}</h3><div class="pp-tracks">${d.tracks.map((t) => `<div class="pp-track"><span class="pp-age">${esc(t.age)}</span><p>${esc(t.text)}</p></div>`).join("")}</div></section>`
      : "";
    const steps = d.do?.length
      ? `<section class="pp-block"><h3 class="pp-h">${esc(d.doTitle || L.doTitle)}</h3><div class="pp-mods">${d.do.map((x) => `<div class="pp-mod">${x.lead ? `<b>${esc(x.lead)}</b>` : ""}${x.text ? `<span>${esc(x.text)}</span>` : ""}</div>`).join("")}</div></section>`
      : "";
    const schedule = d.schedule?.items?.length
      ? card(d.schedule.title, `<ul class="pp-sched">${d.schedule.items.map((i) => (i.time
          ? `<li><span class="pp-time">${esc(i.time)}</span><span>${esc(i.text)}</span></li>`
          : `<li class="nt"><span>${esc(i.text)}</span></li>`)).join("")}</ul>${d.schedule.note ? `<p class="pp-snote">${esc(d.schedule.note)}</p>` : ""}`)
      : "";
    const outcomes = d.outcomes?.length ? card(L.outcomes, list(d.outcomes, "ok")) : "";
    const fit = d.fit?.length ? card(L.fit, list(d.fit)) : "";
    const extras = d.extras?.length ? card(L.extras, list(d.extras)) : "";
    const pair = outcomes || fit ? `<div class="pp-two">${outcomes}${fit}</div>` : "";
    const flags = reviewMode && digest.review?.flags?.length
      ? `<div class="pp-review"><b>⚠ ${esc(L.review)}</b>${list(digest.review.flags)}</div>` : "";

    page.innerHTML = `
      <header class="pp-top">
        <a class="pp-brand" href="#/"><img src="./logo.png" alt=""><span>${esc(L.brand)}</span></a>
        <nav><a class="pp-back" href="#/programs">← ${esc(L.back)}</a>
        <button class="pp-lang" type="button" aria-label="${esc(L.langLabel)}">${L.langBtn}</button></nav>
      </header>
      <div class="pp-wrap">
        <div class="pp-hero"${hero ? ` style="background-image:url('${esc(hero)}')"` : ""}>
          <div class="pp-hero-in">
            <div class="pp-crumb">${esc(rec.provider_label || rec.provider)}</div>
            <h1 class="pp-title">${esc(title)}</h1>
            <div class="pp-sub">${ICON.location}<span>${esc(facts[4][2])}</span></div>
          </div>
          ${hero ? credit(hero) : ""}
        </div>
        <div class="pp-facts">${facts.map(([k, label, value]) => `<div class="pp-fact"><div class="pp-ic">${ICON[k]}</div><div><small>${esc(label)}</small><span>${esc(value)}</span></div></div>`).join("")}</div>
        <div class="pp-grid">
          <main class="pp-main">
            <p class="pp-focus">${esc(d.focus)}</p>
            <div class="pp-chips">${(d.tags || []).map((t) => `<span class="pp-chip">${esc(t)}</span>`).join("")}</div>
            ${tracks}${steps}${schedule}${pair}${extras}${flags}
          </main>
          <aside class="pp-side">
            <div class="pp-card pp-price">
              <h3 class="pp-h">${esc(L.price)}</h3>
              <div class="pp-big">${esc(rec.price?.display || L.onRequest)}</div>
              ${dates.length ? `<div class="pp-sm">${esc(dates.join(" · "))}</div>` : ""}
              ${d.highlights?.length ? `<div class="pp-hl">${list(d.highlights)}</div>` : ""}
              <a class="pp-cta" href="#" data-goto-form>${esc(L.formPill)} ${ICON.form}</a>
            </div>
            ${gallery.length ? `<div class="pp-gal">${gallery.map((u) => `<img src="${esc(u)}" alt="" loading="lazy">`).join("")}</div>` : ""}
          </aside>
        </div>
        ${formHTML(rec, lang)}
      </div>`;

    page.dataset.id = rec.id;
    page.querySelector(".pp-lang").addEventListener("click", () => {
      localStorage.setItem("lang", lang === "tr" ? "en" : "tr");
      window.location.reload();
    });
    page.querySelectorAll("[data-goto-form]").forEach((a) => a.addEventListener("click", (e) => {
      e.preventDefault();
      page.querySelector(".pp-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }));
    page.querySelectorAll(".pp-gal img").forEach((img) => img.addEventListener("error", () => img.remove()));
    bindForm(rec, lang);
  }

  // ---- Bilgi Formu ---------------------------------------------------------------------------
  function formHTML(rec, lang) {
    const F = FORM[lang];
    const name = (lang === "tr" && rec.title_tr) || rec.title;
    const ages = Array.from({ length: 15 }, (_, i) => i + 5);
    const field = (id, label, icon, inner, err, full) =>
      `<div class="pp-field${full ? " full" : ""}" data-f="${id}"><label for="pp-${id}">${esc(label)} <i>*</i></label><div class="pp-in">${ICON[icon]}${inner}</div><div class="pp-err">${esc(err)}</div></div>`;
    const wa = WHATSAPP_NUMBER
      ? `<a class="pp-wa" href="https://wa.me/${esc(WHATSAPP_NUMBER)}?text=${encodeURIComponent(name)}" target="_blank" rel="noopener">${ICON.chat} ${F.wa}</a>` : "";
    return `<section class="pp-form" id="bilgi-formu">
      <aside class="pp-form-side">
        <div class="pp-badge">${ICON.form}</div><h2>${F.title}</h2><p>${F.intro}</p>
        <div class="pp-prog"><small>${F.progLabel}</small><b>${esc(name)}</b></div>
        <ul class="pp-perks">${F.perks.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>${wa}
      </aside>
      <div class="pp-form-main"><form novalidate>
        <input type="hidden" name="program" value="${esc(name + " — " + (rec.provider_label || rec.provider))}">
        <div class="pp-fgrid">
          ${field("name", F.name, "user", `<input id="pp-name" name="name" autocomplete="name" placeholder="${esc(F.namePh)}">`, F.errName, true)}
          ${field("phone", F.phone, "phone", `<input id="pp-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" placeholder="${esc(F.phonePh)}">`, F.errPhone)}
          ${field("email", F.email, "mail", `<input id="pp-email" name="email" type="email" autocomplete="email" inputmode="email" placeholder="${esc(F.emailPh)}">`, F.errEmail)}
          ${field("age", F.age, "cal", `<select id="pp-age" name="age"><option value="">${F.pick}</option>${ages.map((a) => `<option value="${a}">${a} ${F.yearsOld}</option>`).join("")}</select>`, F.errAge)}
          ${field("city", F.city, "location", `<select id="pp-city" name="city"><option value="">${F.pick}</option>${CITIES.map((c) => `<option>${c}</option>`).join("")}<option>${F.abroad}</option></select>`, F.errCity)}
        </div>
        <div class="pp-hint" role="status"></div>
        <button class="pp-submit" type="submit">${F.submit} ${ICON.arrow}</button>
        <p class="pp-note">${F.note}</p>
        <div class="pp-done" role="status"></div>
      </form></div></section>`;
  }

  function ageRanges(rec) {
    return (rec.age_ranges || []).map((r) => (r.match(/\d+/g) || []).map(Number)).filter((a) => a.length).map((a) => [a[0], a[1] ?? a[0]]);
  }

  function bindForm(rec, lang) {
    const F = FORM[lang];
    const root_ = page.querySelector(".pp-form");
    const form = root_.querySelector("form");
    const hint = root_.querySelector(".pp-hint");
    const done = root_.querySelector(".pp-done");
    const age = form.age, city = form.city, submit = form.querySelector(".pp-submit");
    const ranges = ageRanges(rec);
    const label = (rec.age_ranges || []).join(", ");
    const paint = (s) => s.classList.toggle("picked", !!s.value);

    function ageHint() {
      paint(age);
      hint.className = "pp-hint"; hint.textContent = "";
      if (!age.value) return;
      const a = +age.value;
      const match = ranges.find(([lo, hi]) => a >= lo && a <= hi);
      if (!ranges.length) { hint.className = "pp-hint info"; hint.textContent = F.noRange; }
      else if (match) { hint.className = "pp-hint ok"; hint.textContent = F.fits(a, match.join("–")); }
      else { hint.className = "pp-hint info"; hint.textContent = F.misfit(a, label); }
    }
    age.addEventListener("change", ageHint);
    city.addEventListener("change", () => paint(city));

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const bad = {
        name: form.name.value.trim().length < 3,
        phone: form.phone.value.replace(/\D/g, "").length < 10,
        email: !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.value.trim()),
        age: !age.value,
        city: !city.value
      };
      Object.entries(bad).forEach(([k, v]) => form.querySelector(`[data-f="${k}"]`).classList.toggle("bad", v));
      if (Object.values(bad).some(Boolean)) return;

      const payload = {
        name: form.name.value.trim(), phone: form.phone.value.trim(), email: form.email.value.trim(),
        age: +age.value, city: city.value, program: form.program.value, program_id: rec.id,
        age_fits: hint.classList.contains("ok"), language: lang, page: location.href.split("#")[0] + "#/programs/" + rec.id
      };

      if (!FORM_ENDPOINT) {
        console.info("[program-page] Bilgi Formu is not connected yet; payload was NOT sent:", payload);
        done.className = "pp-done warn"; done.textContent = F.notConnected;
        return;
      }
      submit.disabled = true; done.className = "pp-done"; done.textContent = F.sending;
      try {
        const res = await fetch(FORM_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error(String(res.status));
        form.classList.add("sent"); done.className = "pp-done ok"; done.textContent = F.done;
      } catch {
        submit.disabled = false; done.className = "pp-done err"; done.textContent = F.failed;
      }
    });
  }

  // ---- routing -------------------------------------------------------------------------------
  function currentId() {
    const m = /^#\/programs\/([^/?#]+)/.exec(window.location.hash);
    return m ? decodeURIComponent(m[1]) : null;
  }

  const isHomeRoute = () => window.location.hash === "" || window.location.hash === "#/";
  let active = false;

  function leave() {
    if (active) root.hidden = isHomeRoute(); // give the React page back (home-page.js owns this on the home route)
    active = false;
    page.hidden = true;
    page.innerHTML = "";
    root.style.visibility = "";
    document.body.classList.remove("pp-active");
    document.title = originalTitle;
  }

  async function route() {
    const id = currentId();
    if (!id) { leave(); return; }

    root.style.visibility = "hidden"; // avoid a flash of the old page while we check for a digest
    let d;
    try { d = await load(); } catch { d = null; }
    if (currentId() !== id) return; // navigated away meanwhile

    const rec = d?.programs.get(id);
    const digest = d?.digests[id];
    if (!rec || !digest) { leave(); return; }

    render(rec, digest);
    active = true;
    root.hidden = true;
    root.style.visibility = "";
    page.hidden = false;
    document.body.classList.add("pp-active");
    document.title = `${((getLang() === "tr" && rec.title_tr) || rec.title)} · ${T[getLang()].brand}`;
    window.scrollTo(0, 0);
  }

  window.addEventListener("hashchange", route);
  route();
})();
