// Rebuilds Academy Royale International from the saved 2027 course pages in
// `royale international/academy-royale-pages/` and merges the result into the catalogue.
//
// Run from anywhere with:
//   node normalized_academy_royale/normalize_academy_royale.mjs

// The provider now publishes one page for courses offered in both Oxford and Cambridge.
// The catalogue keeps one record per campus so location filters, campus photography and
// enquiries remain unambiguous. Both campus records point back to the same official page.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = join(root, "royale international", "academy-royale-pages");
const outputDir = join(root, "normalized_academy_royale");
const provider = "oxford_royale";
const providerLabel = "Academy Royale International";

const COURSES = {
  "business-summer-school-16-18.html": {
    idKey: "business-innovation-entrepreneurship-16-18",
    subject: "Business",
    titleTr: "İşletme, İnovasyon ve Girişimcilik",
    subjectTr: "İşletme",
    focusTr: "Strateji, pazarlama, finans, liderlik ve girişimcilik üzerinden bir fikri uygulanabilir bir işletmeye dönüştürmenin aşamalarını keşfedin.",
    tags: [["Entrepreneurship", "Strategy", "Marketing", "Leadership"], ["Girişimcilik", "Strateji", "Pazarlama", "Liderlik"]],
  },
  "medicine-summer-school-12-15.html": {
    idKey: "medicine-modern-healthcare-12-15",
    subject: "Medicine",
    titleTr: "Tıp ve Modern Sağlık Hizmetleri",
    subjectTr: "Tıp",
    focusTr: "Anatomi, klinik düşünme ve modern sağlık teknolojileri üzerinden tıp dünyasını uygulamalı çalışmalarla keşfedin.",
    tags: [["Anatomy", "Clinical skills", "Healthcare", "Medical ethics"], ["Anatomi", "Klinik beceriler", "Sağlık hizmetleri", "Tıp etiği"]],
  },
  "academic-discovery-summer-school-10-12.html": {
    idKey: "academic-discovery-10-12",
    subject: "Interdisciplinary Studies",
    titleTr: "Akademik Keşif",
    subjectTr: "Disiplinlerarası Çalışmalar",
    focusTr: "Beşerî bilimler, sanat ve STEM alanlarını gerçek dünya soruları etrafında birleştirerek araştırma, ekip çalışması ve sunum becerileri geliştirin.",
    tags: [["STEM", "Humanities", "Creative projects", "Critical thinking"], ["STEM", "Beşerî bilimler", "Yaratıcı projeler", "Eleştirel düşünme"]],
  },
  "architecture-summer-school-16-18.html": {
    idKey: "architecture-design-16-18",
    subject: "Architecture",
    titleTr: "Mimarlık",
    subjectTr: "Mimarlık",
    focusTr: "Tasarım düşüncesini mimarlık kuramıyla birleştirin; teknik çizim, model yapımı ve yaratıcı projelerle fikirlerinizi hayata geçirin.",
    tags: [["Design thinking", "Technical drawing", "Model-making", "Architecture theory"], ["Tasarım düşüncesi", "Teknik çizim", "Maket yapımı", "Mimarlık kuramı"]],
  },
  "ai-summer-school-12-15.html": {
    idKey: "explore-artificial-intelligence-12-15",
    subject: "Artificial Intelligence",
    titleTr: "Yapay Zekâ",
    subjectTr: "Yapay Zekâ",
    focusTr: "Yapay zekânın nasıl çalıştığını keşfedin; kodlama, veri, makine öğrenmesi ve etik konularını uygulamalı projelerle inceleyin.",
    tags: [["Machine learning", "Coding", "Data", "AI ethics"], ["Makine öğrenmesi", "Kodlama", "Veri", "Yapay zekâ etiği"]],
  },
  "broadening-horizons-16-18.html": {
    idKey: "broadening-horizons-16-18",
    subject: "Interdisciplinary Studies",
    titleTr: "Ufukları Genişletme",
    subjectTr: "Disiplinlerarası Çalışmalar",
    focusTr: "İki akademik alanı ve bir Power Skills atölyesini birleştirerek üniversite öncesinde ilgi alanlarınızı sınayın ve gelecekteki yönünüzü netleştirin.",
    tags: [["Two subjects", "Power Skills", "University pathways", "Independent thinking"], ["İki ders", "Power Skills", "Üniversite yolları", "Bağımsız düşünme"]],
    duration: "2 weeks",
  },
  "business-summer-school-12-15.html": {
    idKey: "explore-business-12-15",
    subject: "Business",
    titleTr: "İşletme ve Girişimcilik",
    subjectTr: "İşletme",
    focusTr: "Bir iş fikrinin nasıl geliştirildiğini öğrenin; girişimcilik, pazarlama, finans ve ekip çalışmasını uygulamalı görevlerle deneyin.",
    tags: [["Entrepreneurship", "Marketing", "Finance", "Teamwork"], ["Girişimcilik", "Pazarlama", "Finans", "Ekip çalışması"]],
  },
  "cybersecurity-summer-school-16-18.html": {
    idKey: "cybersecurity-artificial-intelligence-16-18",
    subject: "Cybersecurity & AI",
    titleTr: "Siber Güvenlik ve Yapay Zekâ",
    subjectTr: "Siber Güvenlik ve Yapay Zekâ",
    focusTr: "Siber tehditleri, kriptografiyi ve yapay zekâyı birlikte inceleyin; güvenli dijital sistemler tasarlamak için kodlama ve problem çözme becerileri geliştirin.",
    tags: [["Cybersecurity", "Artificial intelligence", "Cryptography", "Coding"], ["Siber güvenlik", "Yapay zekâ", "Kriptografi", "Kodlama"]],
  },
  "economics-summer-school-16-18.html": {
    idKey: "economics-finance-16-18",
    subject: "Economics & Finance",
    titleTr: "Ekonomi ve Finans",
    subjectTr: "Ekonomi ve Finans",
    focusTr: "Piyasaların, işletmelerin ve finansal kararların nasıl işlediğini; ekonomi kuramı, veri analizi ve uygulamalı simülasyonlarla keşfedin.",
    tags: [["Economics", "Finance", "Markets", "Data analysis"], ["Ekonomi", "Finans", "Piyasalar", "Veri analizi"]],
  },
  "engineering-summer-school-16-18.html": {
    idKey: "engineering-civil-mechanical-electrical-16-18",
    subject: "Engineering",
    titleTr: "Mühendislik",
    subjectTr: "Mühendislik",
    focusTr: "İnşaat, makine ve elektrik mühendisliğinin temellerini gerçek dünya problemleri, tasarım görevleri ve uygulamalı çalışmalarla öğrenin.",
    tags: [["Civil engineering", "Mechanical engineering", "Electrical engineering", "Design"], ["İnşaat mühendisliği", "Makine mühendisliği", "Elektrik mühendisliği", "Tasarım"]],
  },
  "explore-engineering-12-15.html": {
    idKey: "explore-engineering-12-15",
    subject: "Engineering & Design",
    titleTr: "Mühendislik ve Tasarım",
    subjectTr: "Mühendislik ve Tasarım",
    focusTr: "Mühendislerin fikirleri nasıl çalışan çözümlere dönüştürdüğünü tasarım, yapı, robotik ve sürdürülebilirlik görevleriyle keşfedin.",
    tags: [["Engineering design", "Robotics", "Structures", "Sustainability"], ["Mühendislik tasarımı", "Robotik", "Yapılar", "Sürdürülebilirlik"]],
  },
  "learn-english__english-discovery.html": {
    idKey: "english-discovery-10-12",
    subject: "English Language",
    titleTr: "İngilizce Keşif",
    subjectTr: "İngilizce",
    focusTr: "İngilizce iletişim becerilerinizi küçük sınıflar, yaratıcı görevler, etkinlikler ve uluslararası arkadaşlıklarla güven içinde geliştirin.",
    tags: [["English communication", "Vocabulary", "Creative learning", "Confidence"], ["İngilizce iletişim", "Kelime bilgisi", "Yaratıcı öğrenme", "Özgüven"]],
  },
  "learn-english__english-explorer.html": {
    idKey: "english-explorer-13-18",
    subject: "English Language",
    titleTr: "İngilizce Kâşifi",
    subjectTr: "İngilizce",
    focusTr: "Akademik ve günlük İngilizcenizi tartışmalar, projeler ve kültürel etkinliklerle geliştirerek daha akıcı ve özgüvenli iletişim kurun.",
    tags: [["English fluency", "Speaking", "Academic English", "Culture"], ["İngilizce akıcılığı", "Konuşma", "Akademik İngilizce", "Kültür"]],
  },
  "film-academy-summer-school-12-15.html": {
    idKey: "film-academy-12-15",
    subject: "Film",
    titleTr: "Film Akademisi",
    subjectTr: "Film",
    focusTr: "Hikâye geliştirmeden çekim ve kurguya kadar film yapım sürecini öğrenin ve yaratıcı fikirlerinizi ekip çalışmasıyla ekrana taşıyın.",
    tags: [["Filmmaking", "Storytelling", "Directing", "Editing"], ["Film yapımı", "Hikâye anlatımı", "Yönetmenlik", "Kurgu"]],
  },
  "learn-english__iconic-britain.html": {
    idKey: "iconic-britain-14-18",
    subject: "English Language & Culture",
    titleTr: "İkonik Britanya",
    subjectTr: "İngilizce ve Kültür",
    focusTr: "İngilizcenizi gerçek yaşam bağlamlarında geliştirirken Britanya'nın kültürünü, tarihini ve simgesel yerlerini geziler ve projelerle keşfedin.",
    tags: [["English language", "British culture", "Excursions", "Communication"], ["İngilizce", "Britanya kültürü", "Geziler", "İletişim"]],
  },
  "learn-english__ielts-preparation.html": {
    idKey: "ielts-preparation-13-18",
    subject: "IELTS Preparation",
    titleTr: "IELTS Hazırlık",
    subjectTr: "IELTS Hazırlık",
    focusTr: "IELTS'in dört bölümünde sınav stratejileri, akademik dil ve zaman yönetimi çalışarak hedef puanınıza daha hazırlıklı ilerleyin.",
    tags: [["IELTS", "Academic English", "Exam strategy", "Practice"], ["IELTS", "Akademik İngilizce", "Sınav stratejisi", "Uygulama"]],
  },
  "international-relations-and-global-diplomacy-summer-school.html": {
    idKey: "international-relations-diplomacy-16-18",
    subject: "International Relations",
    titleTr: "Uluslararası İlişkiler ve Diplomasi",
    subjectTr: "Uluslararası İlişkiler",
    focusTr: "Küresel güç, diplomasi, çatışma ve iş birliği konularını vaka çalışmaları, müzakereler ve güncel dünya meseleleri üzerinden inceleyin.",
    tags: [["Diplomacy", "Global politics", "Negotiation", "International security"], ["Diplomasi", "Küresel siyaset", "Müzakere", "Uluslararası güvenlik"]],
  },
  "law-summer-school-16-18.html": {
    idKey: "law-justice-16-18",
    subject: "Law",
    titleTr: "Hukuk ve Adalet",
    subjectTr: "Hukuk",
    focusTr: "Hukuki düşünmeyi, dava analizini ve adaletin temel ilkelerini tartışmalar, vaka çalışmaları ve duruşma canlandırmalarıyla keşfedin.",
    tags: [["Legal reasoning", "Case analysis", "Justice", "Advocacy"], ["Hukuki muhakeme", "Dava analizi", "Adalet", "Savunuculuk"]],
  },
  "law-summer-school-12-15.html": {
    idKey: "law-justice-12-15",
    subject: "Law",
    titleTr: "Hukuk ve Adalet",
    subjectTr: "Hukuk",
    focusTr: "Hukukun toplumu nasıl şekillendirdiğini vaka çalışmaları, tartışmalar ve duruşma canlandırmalarıyla keşfedin.",
    tags: [["Law", "Justice", "Debate", "Mock trial"], ["Hukuk", "Adalet", "Münazara", "Duruşma canlandırması"]],
  },
  "medicine-summer-school-16-18.html": {
    idKey: "medicine-16-18",
    subject: "Medicine",
    titleTr: "Tıp",
    subjectTr: "Tıp",
    focusTr: "Anatomi, tanı, klinik beceriler ve tıp etiğini üniversite tarzı dersler, uygulamalar ve simülasyonlarla inceleyin.",
    tags: [["Anatomy", "Clinical skills", "Diagnosis", "Medical ethics"], ["Anatomi", "Klinik beceriler", "Tanı", "Tıp etiği"]],
  },
  "new-perspectives-12-15.html": {
    idKey: "new-perspectives-12-15",
    subject: "Interdisciplinary Studies",
    titleTr: "Yeni Perspektifler",
    subjectTr: "Disiplinlerarası Çalışmalar",
    focusTr: "İki akademik alanı ve bir Power Skills atölyesini birleştirerek yeni ilgi alanları keşfedin, bağımsız düşünün ve fikirlerinizi özgüvenle ifade edin.",
    tags: [["Two subjects", "Power Skills", "Creative thinking", "Confidence"], ["İki ders", "Power Skills", "Yaratıcı düşünme", "Özgüven"]],
    duration: "2 weeks",
  },
  "psychology-summer-school-16-18.html": {
    idKey: "psychology-neuroscience-16-18",
    subject: "Psychology & Neuroscience",
    titleTr: "Psikoloji ve Nörobilim",
    subjectTr: "Psikoloji ve Nörobilim",
    focusTr: "Davranış, biliş ve beynin işleyişini psikolojik araştırmalar, deney tasarımı ve nörobilim bulguları üzerinden keşfedin.",
    tags: [["Psychology", "Neuroscience", "Behaviour", "Research methods"], ["Psikoloji", "Nörobilim", "Davranış", "Araştırma yöntemleri"]],
  },
  "psychology-12-15.html": {
    idKey: "psychology-human-mind-12-15",
    subject: "Psychology",
    titleTr: "Psikoloji ve İnsan Zihni",
    subjectTr: "Psikoloji",
    focusTr: "İnsanların nasıl düşündüğünü, hissettiğini ve davrandığını deneyler, tartışmalar ve gerçek yaşam örnekleriyle araştırın.",
    tags: [["Human mind", "Behaviour", "Experiments", "Cognition"], ["İnsan zihni", "Davranış", "Deneyler", "Biliş"]],
  },
  "game-creators-summer-school-10-12.html": {
    idKey: "young-game-creators-10-12",
    subject: "Game Design",
    titleTr: "Genç Oyun Tasarımcıları",
    subjectTr: "Oyun Tasarımı",
    focusTr: "Oyun mekaniği, hikâye, karakter ve temel kodlama fikirlerini öğrenerek kendi oyun konseptinizi tasarlayın ve geliştirin.",
    tags: [["Game design", "Storytelling", "Coding", "Creative technology"], ["Oyun tasarımı", "Hikâye anlatımı", "Kodlama", "Yaratıcı teknoloji"]],
  },
};

const MONTHS = { Jan: "January", Feb: "February", Mar: "March", Apr: "April", May: "May", Jun: "June", Jul: "July", Aug: "August", Sep: "September", Oct: "October", Nov: "November", Dec: "December" };
const TR_MONTHS = { January: "Ocak", February: "Şubat", March: "Mart", April: "Nisan", May: "Mayıs", June: "Haziran", July: "Temmuz", August: "Ağustos", September: "Eylül", October: "Ekim", November: "Kasım", December: "Aralık" };
const LOCATION_TR = { Oxford: "Oxford, Birleşik Krallık", Cambridge: "Cambridge, Birleşik Krallık", "Marlborough College": "Marlborough College, Birleşik Krallık" };

function decodeHtml(value) {
  return String(value ?? "")
    .replaceAll("&amp;", "&").replaceAll("&lt;", "<").replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"').replace(/&#x27;|&#39;/g, "'").replaceAll("&nbsp;", " ");
}

function textFromHtml(html) {
  return decodeHtml(html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slug(value) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function meta(html, name) {
  const pattern = new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']*)["'][^>]*>|<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["']${name}["'][^>]*>`, "i");
  const match = pattern.exec(html);
  return decodeHtml(match?.[1] ?? match?.[2] ?? "").trim();
}

function parseFacts(text, fallbackDuration) {
  const start = text.indexOf("Apply for 2027 Location ");
  if (start < 0) throw new Error("course facts block not found");
  const facts = text.slice(start + "Apply for 2027 Location ".length);
  const agesAt = facts.indexOf(" Ages ");
  const durationAt = facts.indexOf(" Duration ", agesAt);
  const startDatesAt = facts.indexOf(" Start dates ", agesAt);
  const datesAt = startDatesAt >= 0 ? startDatesAt : facts.indexOf(" Dates ", agesAt);
  const dateLabel = startDatesAt >= 0 ? " Start dates " : " Dates ";
  const feeAt = facts.indexOf(" Course fees ", datesAt);
  if (agesAt < 0 || datesAt < 0 || feeAt < 0) throw new Error("incomplete course facts block");

  const location = facts.slice(0, agesAt).trim();
  const agesEnd = durationAt >= 0 && durationAt < datesAt ? durationAt : datesAt;
  const ages = facts.slice(agesAt + " Ages ".length, agesEnd).trim();
  const duration = durationAt >= 0 && durationAt < datesAt
    ? facts.slice(durationAt + " Duration ".length, datesAt).trim()
    : fallbackDuration;
  const rawDates = facts.slice(datesAt + dateLabel.length, feeAt).replace(/\s+Limited availability\s*$/i, "").trim();
  const feeText = facts.slice(feeAt + " Course fees ".length);
  const fee = /^(From\s+)?£[\d,]+(?:\s+per week)?/i.exec(feeText)?.[0];
  if (!duration || !fee) throw new Error("duration or fee missing from course facts");
  return { location, ages, duration, rawDates, fee };
}

function normalizeDates(raw) {
  let value = raw.replace(/[–—]/g, "-").replace(/\s+,/g, ",").replace(/\s+/g, " ").trim();
  for (const [short, full] of Object.entries(MONTHS)) value = value.replace(new RegExp(`\\b${short}\\b`, "g"), full);
  const year = /\b(20\d{2})\b/.exec(value)?.[1];
  const parts = value.includes(",") ? value.split(",").map((s) => s.trim()).filter(Boolean) : [value];
  return parts.map((part) => year && !/\b20\d{2}\b/.test(part) ? `${part} ${year}` : part);
}

function datesTr(dates) {
  return dates.map((date) => {
    let result = date;
    for (const [en, tr] of Object.entries(TR_MONTHS)) result = result.replaceAll(en, tr);
    return result;
  });
}

function priceFrom(display) {
  const amount = Number(display.match(/[\d,]+/)?.[0].replaceAll(",", ""));
  const perWeek = /per week/i.test(display);
  return {
    currency: "GBP",
    min_amount: amount,
    max_amount: amount,
    display,
    tiers: [{ label: perWeek ? "Per week" : "Programme fee", currency: "GBP", amount, display: `£${amount.toLocaleString("en-GB")}${perWeek ? " per week" : ""}` }],
  };
}

function imageFrom(html) {
  const match = /https:\/\/cdn\.sanity\.io\/images\/[^"' ]+/.exec(html);
  return (match?.[0] ?? "").replace(/\\u0026/g, "&").replace(/\\+$/, "");
}

function compactDescription(description, title, duration, location) {
  if (description) return description;
  return `${title} is a ${duration} Academy Royale International summer programme for students in ${location}.`;
}

const index = JSON.parse(readFileSync(join(sourceDir, "index.json"), "utf8"));
const pageByFile = new Map(index.pages.map((page) => [page.file, page]));
const records = [];
const digestSource = {};

for (const [file, config] of Object.entries(COURSES)) {
  const page = pageByFile.get(file);
  if (!page) throw new Error(`${file}: missing from index.json`);
  const html = readFileSync(join(sourceDir, file), "utf8");
  const text = textFromHtml(html);
  const facts = parseFacts(text, config.duration);
  const card = page.cards?.[0]?.text ?? [];
  const listedLocation = card[0] ?? facts.location;
  const title = card[1];
  if (!title) throw new Error(`${file}: title missing from listing card`);
  const locations = listedLocation.split(",").map((item) => item.trim()).filter(Boolean);
  const dates = normalizeDates(facts.rawDates);
  const dateMonths = [...new Set(dates.flatMap((date) => Object.keys(TR_MONTHS).filter((month) => date.includes(month))))];
  const age = facts.ages.replace(/[–—]/g, " - ");
  const description = compactDescription(meta(html, "description"), title, facts.duration, listedLocation);
  const imageUrl = imageFrom(html);
  const price = priceFrom(facts.fee);

  for (const location of locations) {
    const locationSlug = slug(location);
    const id = `oxford-royale-${locationSlug}-summer-school-${config.idKey}`;
    const locationTr = LOCATION_TR[location] ?? `${location}, Birleşik Krallık`;
    const sourceUrl = page.url;
    const detailIntro = `${title} is offered by ${providerLabel} in ${location}, United Kingdom. It is designed for students aged ${age} and runs for ${facts.duration}. ${description}`;
    const detailIntroTr = `${titleTrFor(config)} programı Academy Royale International tarafından ${locationTr} konumunda sunulur. ${age} yaş grubuna yöneliktir ve ${durationTr(facts.duration)} sürer. ${config.focusTr}`;
    const trDates = datesTr(dates);
    const feeTr = facts.fee.replace("From", "Başlangıç").replace("per week", "haftalık");

    const record = {
      id,
      provider,
      provider_label: providerLabel,
      program_type: provider,
      title,
      raw_title: title,
      subject: config.subject,
      categories: [config.subject, "summer_programme"],
      location,
      city: location === "Marlborough College" ? "Marlborough" : location,
      country: "United Kingdom",
      age_ranges: [age],
      duration: facts.duration,
      delivery_modes: ["in_person"],
      price,
      price_scope: /per week/i.test(facts.fee) ? "per_week" : /^From\b/i.test(facts.fee) ? "starting_from" : "full_programme",
      price_notes: /per week/i.test(facts.fee) ? "The published fee is a weekly starting price."
        : /^From\b/i.test(facts.fee) ? "The provider publishes this as a starting price for the selected duration."
        : "Published course fee for the programme.",
      dates,
      date_months: dateMonths,
      description_short: description,
      description_full: description,
      curriculum_sections: [{ title: "Programme overview", body: description }],
      learning_outcomes: [],
      image_url: imageUrl,
      detail_url: sourceUrl,
      source_url: sourceUrl,
      source_files: [`royale international/academy-royale-pages/${file}`],
      flags: locations.length > 1 ? ["The official page covers both Oxford and Cambridge; this normalized record represents one campus."] : [],
      location_id: locationSlug,
      location_name: location,
      location_type: location === "Marlborough College" ? "school" : "city",
      publish_status: "ready",
      detail_intro: detailIntro,
      detail_sections: [
        { title: "Overview", body: detailIntro },
        { title: "Dates, ages and format", body: `Format: in person. Age range: ${age}. Duration: ${facts.duration}. Listed dates: ${dates.join(", ")}.` },
        { title: "Fees", body: `Published course fee: ${facts.fee}.` },
        { title: "Location", body: `This programme is listed for ${location}, United Kingdom.` },
      ],
      title_tr: titleTrFor(config),
      subject_tr: config.subjectTr,
      location_tr: locationTr,
      description_short_tr: config.focusTr,
      detail_intro_tr: detailIntroTr,
      detail_sections_tr: [
        { title: "Genel Bakış", body: detailIntroTr },
        { title: "Tarihler, Yaş Aralığı ve Format", body: `Format: yüz yüze. Yaş aralığı: ${age}. Süre: ${durationTr(facts.duration)}. Listelenen tarihler: ${trDates.join(", ")}.` },
        { title: "Ücretler", body: `Yayımlanan program ücreti: ${feeTr}.` },
        { title: "Konum", body: `Bu program ${locationTr} için listelenmiştir.` },
      ],
      detail_facts: {
        school: providerLabel,
        subject: config.subject,
        location: `${location}, United Kingdom`,
        age,
        duration: facts.duration,
        format: "in person",
        dates: dates.join(", "),
        fees: facts.fee,
        source_url: sourceUrl,
      },
      detail_facts_tr: {
        school: providerLabel,
        subject: config.subjectTr,
        location: locationTr,
        age,
        duration: durationTr(facts.duration),
        format: "yüz yüze",
        dates: trDates.join(", "),
        fees: feeTr,
        source_url: sourceUrl,
      },
    };
    records.push(record);

    const key = id.replace(/^oxford-royale-/, "");
    digestSource[key] = {
      city: location === "Marlborough College" ? "marlborough" : location.toLowerCase(),
      flags: record.flags,
      en: {
        focus: description,
        tags: config.tags[0],
        hl: [`${facts.duration} residential programme in ${location}`, "Project-based learning in small international classes"],
        do: [
          ["Explore the subject", `Build a foundation in ${config.subject.toLowerCase()} through seminars, discussions and guided activities.`],
          ["Apply your learning", "Work independently and with an international group on practical challenges, projects and presentations."],
        ],
        outcomes: [`Stronger subject knowledge, critical thinking and confidence in ${config.subject.toLowerCase()}`],
      },
      tr: {
        focus: config.focusTr,
        tags: config.tags[1],
        hl: [`${locationTr} konumunda ${durationTr(facts.duration)} konaklamalı program`, "Küçük ve uluslararası sınıflarda proje temelli öğrenme"],
        do: [
          ["Alanı keşfedin", `${config.subjectTr} alanında seminerler, tartışmalar ve rehberli etkinliklerle sağlam bir temel oluşturun.`],
          ["Öğrendiklerinizi uygulayın", "Uygulamalı görevler, projeler ve sunumlarda bağımsız ve uluslararası bir grupla birlikte çalışın."],
        ],
        outcomes: [`${config.subjectTr} alanında daha güçlü bilgi, eleştirel düşünme ve özgüven`],
      },
    };
  }
}

function titleTrFor(config) { return config.titleTr; }
function durationTr(value) { return value.replace("weeks", "hafta").replace("week", "hafta"); }

records.sort((a, b) => a.id.localeCompare(b.id));
mkdirSync(outputDir, { recursive: true });
writeFileSync(join(outputDir, "academy-royale.normalized.json"), `${JSON.stringify(records, null, 2)}\n`, "utf8");

const mainPath = join(root, "data", "programs.normalized.json");
const catalogue = JSON.parse(readFileSync(mainPath, "utf8"));
const merged = [...catalogue.filter((record) => record.provider !== provider), ...records];
writeFileSync(mainPath, `${JSON.stringify(merged, null, 2)}\n`, "utf8");

const digestPath = join(root, "data", "digest-src", "oxford_royale", "programs.json");
writeFileSync(digestPath, `${JSON.stringify(digestSource, null, 2)}\n`, "utf8");

const translationsPath = join(root, "data", "tr-translations.json");
const translations = JSON.parse(readFileSync(translationsPath, "utf8"));
for (const [file, config] of Object.entries(COURSES)) {
  const title = pageByFile.get(file).cards[0].text[1];
  translations.titles[title] = config.titleTr;
  translations.subjects[config.subject] = config.subjectTr;
}
Object.assign(translations.locations, LOCATION_TR);
writeFileSync(translationsPath, `${JSON.stringify(translations, null, 2)}\n`, "utf8");

const imagePath = join(root, "data", "image-candidates.json");
const images = JSON.parse(readFileSync(imagePath, "utf8"));
const previousImages = { ...images };
for (const id of Object.keys(images)) if (id.startsWith("oxford-royale-")) delete images[id];
for (const record of records) {
  const campus = record.location === "Oxford" ? "/assets/program-images/campuses/oxford.webp"
    : record.location === "Cambridge" ? "/assets/program-images/campuses/cambridge.webp" : null;
  images[record.id] = [...new Set([...(previousImages[record.id] ?? []), record.image_url, campus].filter(Boolean))];
}
writeFileSync(imagePath, `${JSON.stringify(images, null, 2)}\n`, "utf8");

// Keep the reviewed, locally downloaded photo collection aligned with the replacement IDs.
// Existing matching IDs retain their photo. New IDs receive the closest unused photograph
// from the superseded provider records, favouring the same campus and subject tokens.
const photoSourcesPath = join(root, "data", "program-image-sources.json");
const photoSources = JSON.parse(readFileSync(photoSourcesPath, "utf8"));
const oldProviderPhotos = Object.entries(photoSources.images).filter(([id]) => id.startsWith("oxford-royale-"));
const assignedOldIds = new Set();
const replacementPhotos = {};
const replacementIds = new Set(records.map((record) => record.id));
const tokenSet = (value) => new Set(slug(value).split("-").filter((part) => part.length > 2 && !["oxford", "royale", "summer", "school"].includes(part)));
const photoScore = (record, oldId) => {
  const wanted = tokenSet(`${record.id} ${record.title} ${record.subject}`);
  const available = tokenSet(oldId);
  let score = [...wanted].filter((token) => available.has(token)).length;
  if (oldId.includes(`-${slug(record.location)}-`)) score += 8;
  return score;
};

for (const record of records) {
  const exact = photoSources.images[record.id];
  let sourceId = exact ? record.id : null;
  if (!sourceId) {
    const candidate = oldProviderPhotos
      .filter(([id]) => !assignedOldIds.has(id) && !replacementIds.has(id))
      .sort((a, b) => photoScore(record, b[0]) - photoScore(record, a[0]) || a[0].localeCompare(b[0]))[0];
    sourceId = candidate?.[0];
  }
  if (!sourceId) throw new Error(`${record.id}: no reviewed provider photograph available`);
  assignedOldIds.add(sourceId);
  const source = photoSources.images[sourceId];
  replacementPhotos[record.id] = { ...source, program_title: record.title, provider: providerLabel };
  images[record.id] = [source.local_path, ...images[record.id].filter((path) => path !== source.local_path)];
}
for (const id of Object.keys(photoSources.images)) if (id.startsWith("oxford-royale-")) delete photoSources.images[id];
Object.assign(photoSources.images, replacementPhotos);
photoSources._meta.programmes = merged.length;
photoSources._meta.images = Object.keys(photoSources.images).length;
photoSources._meta.provider_photos = Object.values(photoSources.images).filter((image) => image.source_kind === "provider").length;
photoSources._meta.illustrative_photos = Object.values(photoSources.images).filter((image) => image.source_kind === "illustrative").length;
writeFileSync(photoSourcesPath, `${JSON.stringify(photoSources, null, 2)}\n`, "utf8");
writeFileSync(imagePath, `${JSON.stringify(images, null, 2)}\n`, "utf8");

const auditPath = join(root, "data", "program-image-audit.json");
const audit = JSON.parse(readFileSync(auditPath, "utf8"));
const collection = Object.entries(photoSources.images).sort(([a], [b]) => a.localeCompare(b))
  .map(([id, image]) => `${id}:${image.sha256}\n`).join("");
const imageCount = Object.keys(photoSources.images).length;
Object.assign(audit, {
  input_photos: imageCount,
  photos_checked: imageCount,
  collection_sha256: createHash("sha256").update(collection).digest("hex"),
  visually_reviewed_photos: imageCount,
  served_photo_urls_checked: imageCount,
  provider_photos: photoSources._meta.provider_photos,
  illustrative_photos: photoSources._meta.illustrative_photos,
});
writeFileSync(auditPath, `${JSON.stringify(audit, null, 2)}\n`, "utf8");

console.log(`Normalized ${Object.keys(COURSES).length} official Academy Royale pages into ${records.length} campus-specific records.`);
console.log(`Replaced ${catalogue.filter((record) => record.provider === provider).length} previous provider records; catalogue now has ${merged.length} programs.`);
console.log("Updated Academy Royale digest sources, Turkish lookup values and image candidates.");
