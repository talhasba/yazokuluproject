// Normalizes the 15 Study Mind work-experience programmes (central London, ages 15-18)
// into the catalogue's BASE_FIELDS schema and merges them into data/programs.normalized.json.
//
// Source material, read-only:
//   studymind/Study Mind Work Experience _ Career Programmes 2026.html   (course card list)
//   studymind/studymind-pages/*.html + index.json                       (one saved page per course,
//                                                                         from studymind/download-courses.mjs)
//
// Facts come from each page's structured data and visible text (see extract_studymind.mjs).
// Camps the provider lists as "coming soon" are skipped. Bilingual digest copy lives in digest-content.mjs; this script writes it to
// data/digest-src/studymind/programs.json and data/digest-src/studymind-templates.json.
//
// Run from the project root, then rebuild the derived files:
//   node normalized_studymind/normalize_studymind.mjs
//   node tools/build-digests.mjs
//   node tools/apply-tr-translations.mjs

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { extractAll } from "./extract_studymind.mjs";
import { PROGRAMS } from "./digest-content.mjs";

const OUT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = join(OUT_DIR, "..");
const MAIN_DATA = join(ROOT, "data", "programs.normalized.json");
const DIGEST_DIR = join(ROOT, "data", "digest-src", "studymind");

const PROVIDER = "studymind";
const PROVIDER_LABEL = "Study Mind";
const ID_PREFIX = "studymind-";
const REVIEWED = "2026-10-13";
const LISTING_PAGE = "studymind/Study Mind Work Experience _ Career Programmes 2026.html";
const PAGES_DIR = "studymind/studymind-pages";

// One entry per saved page: catalogue title/subject and the page's own photo.
// `image` is the 1280px (or original) upload the page itself uses; Careers & Life Skills
// shares Creative Writing's photo on the provider site, so it gets none here and the
// photo pipeline picks a distinct representative one instead.
const COURSES = {
  "technology-summer-career-camp.html": { key: "technology", title: "Computer Science & Technology Work Experience", subject: "Computer Science & Technology", image: "https://studymind.co.uk/wp-content/uploads/2025/05/New-computer-1280x854.png" },
  "economics-work-experience.html": { key: "economics", title: "Economics Work Experience", subject: "Economics", image: "https://studymind.co.uk/wp-content/uploads/2025/03/Banking-Intro-Video-Block.png" },
  "careers-and-life-skills.html": { key: "careers-and-life-skills", title: "Careers and Life Skills Work Experience", subject: "Careers & Life Skills", image: "" },
  "psychology-summer-career-camp.html": { key: "psychology", title: "Psychology Work Experience", subject: "Psychology", image: "https://studymind.co.uk/wp-content/uploads/2025/04/WhatsApp-Image-2025-04-30-at-11.19.58.jpeg" },
  "international-relations-work-experience.html": { key: "international-relations", title: "International Relations Work Experience", subject: "International Relations", image: "https://studymind.co.uk/wp-content/uploads/2025/05/New-International-1280x854.png" },
  "maths-work-experience.html": { key: "maths", title: "Maths Work Experience", subject: "Mathematics", image: "https://studymind.co.uk/wp-content/uploads/2025/05/New-Maths-1280x854.png" },
  "journalism-work-experience.html": { key: "media-and-journalism", title: "Media & Journalism Work Experience", subject: "Media & Journalism", image: "https://studymind.co.uk/wp-content/uploads/2025/05/New-media-and-journalism-1280x854.png" },
  "criminology-summer-career-camp.html": { key: "criminology", title: "Criminology Work Experience", subject: "Criminology", image: "https://studymind.co.uk/wp-content/uploads/2025/05/New-criminology-1280x854.png" },
  "creative-writing-summer-career-camp.html": { key: "creative-writing", title: "Creative Writing Work Experience", subject: "Creative Writing", image: "https://studymind.co.uk/wp-content/uploads/2025/05/Creative-writing-1280x854.png" },
  "chemical-engineering-summer-career-camp.html": { key: "chemical-engineering", title: "Chemical Engineering Work Experience", subject: "Chemical Engineering", image: "https://studymind.co.uk/wp-content/uploads/2025/05/Chemical-Engineering-1280x854.png" },
  "chemistry-work-experience.html": { key: "chemistry", title: "Chemistry Work Experience", subject: "Chemistry", image: "https://studymind.co.uk/wp-content/uploads/2025/05/chemistry-WEx-original-image-1280x986.png" },
  "business-entrepreneurship-work-experience.html": { key: "business-and-entrepreneurship", title: "Business & Entrepreneurship Work Experience", subject: "Business & Entrepreneurship", image: "https://studymind.co.uk/wp-content/uploads/2025/05/Business-Management-1280x854.png" },
  "law-summer-career-camp.html": { key: "law", title: "Law Work Experience", subject: "Law", image: "https://studymind.co.uk/wp-content/uploads/2025/05/New-law-1280x854.png" },
  "physics-summer-career-camp.html": { key: "physics", title: "Physics Work Experience", subject: "Physics", image: "https://studymind.co.uk/wp-content/uploads/2025/03/physics-intro-page.jpg" },
  "engineering-summer-career-camp.html": { key: "engineering", title: "Engineering Work Experience", subject: "Engineering", image: "https://studymind.co.uk/wp-content/uploads/2025/05/Engineering-1280x854.png" },
};

const BASE_FIELDS = [
  "id", "provider", "provider_label", "program_type", "title", "raw_title",
  "subject", "categories", "location", "city", "country", "age_ranges",
  "duration", "delivery_modes", "price", "dates", "date_months",
  "description_short", "description_full", "curriculum_sections",
  "learning_outcomes", "image_url", "detail_url", "source_url",
  "source_files", "flags", "publish_status",
];

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const gbp = (n) => `£${n.toLocaleString("en-GB")}`;
const emptyPrice = () => ({ currency: "", min_amount: null, max_amount: null, display: "", tiers: [] });

// Plan names on the pages are used as-is; the duration wording is localized here.
const TIER_NOTES = {
  1: {
    en: "One week: the core subject modules, workshops and visits.",
    tr: "Bir hafta: temel konu modülleri, atölyeler ve ziyaretler.",
  },
  2: {
    en: "Two weeks: the core week plus a second week of further modules; some programmes let you choose a related or Career & Life Skills week.",
    tr: "İki hafta: temel hafta ve ek modüllerden oluşan ikinci hafta; bazı programlarda ilgili bir hafta veya Kariyer ve Yaşam Becerileri haftası seçilebilir.",
  },
  3: {
    en: "Three weeks: the programme weeks plus a Career & Life Skills or related career week and professional networking.",
    tr: "Üç hafta: program haftalarına ek olarak Kariyer ve Yaşam Becerileri veya ilgili bir kariyer haftası ile profesyonel ağ kurma.",
  },
};

const COMMON_FLAGS = [
  "Weekly start dates and fees are read from the course page’s structured data (2027 course instances); confirm both before booking.",
  "The page offers residential and non-residential options (UCL Ramsay Hall) but lists one fee per programme length and does not say whether accommodation is included or what it costs.",
];

function weeksOf(plan) {
  // The Careers & Life Skills page labels its first plan "1 day" at the 1-week price.
  const n = Number(plan.duration.split(" ")[0]);
  return plan.duration.endsWith("day") ? 1 : n;
}

function buildTiers(plans) {
  return plans.map((plan) => {
    const weeks = weeksOf(plan);
    const unit = weeks === 1 ? "week" : "weeks";
    return {
      label: `${weeks} ${unit} · ${plan.name}`,
      title: { en: `${weeks} ${unit} · ${plan.name}`, tr: `${weeks} hafta · ${plan.name}` },
      note: TIER_NOTES[weeks],
      weeks,
      plan: plan.name,
      amount: plan.price,
      currency: "GBP",
      display: gbp(plan.price),
    };
  });
}

function priceFor(plans) {
  if (!plans.length) return emptyPrice();
  const amounts = plans.map((p) => p.price);
  const min = Math.min(...amounts);
  const max = Math.max(...amounts);
  return {
    currency: "GBP",
    min_amount: min,
    max_amount: max,
    display: min === max ? gbp(min) : `${gbp(min)} – ${gbp(max)}`,
    tiers: buildTiers(plans),
  };
}

function durationFor(page, plans) {
  if (!plans.length) return page.duration.replace(/\s*-\s*/g, "-");
  const weeks = [...new Set(plans.map(weeksOf))].sort((a, b) => a - b);
  if (weeks.length === 1) return `${weeks[0]} week${weeks[0] === 1 ? "" : "s"}`;
  const consecutive = weeks.every((w, i) => i === 0 || w === weeks[i - 1] + 1);
  return consecutive && weeks.length > 2 ? `${weeks[0]}-${weeks.at(-1)} weeks` : `${weeks.slice(0, -1).join(", ")} or ${weeks.at(-1)} weeks`;
}

function startDates(page) {
  // Sessions dated before 2027 are past and are not offered.
  const starts = [...new Set(page.instances.map((i) => i.start))].filter((d) => d >= "2027-01-01").sort();
  return starts;
}

const dedupe = (items, key) => {
  const seen = new Set();
  return items.filter((i) => (seen.has(i[key]) ? false : seen.add(i[key])));
};

function buildRecord(page, card) {
  const meta = COURSES[page.file];
  if (!meta) throw new Error(`No catalogue metadata for ${page.file}`);
  const digest = PROGRAMS[`${meta.key}-work-experience`];
  if (!digest) throw new Error(`No digest copy for ${meta.key}`);
  const plans = page.plans;
  if (!plans.length) throw new Error(`${meta.key}: no pricing plans found`);
  const dates = startDates(page);
  if (!dates.length) throw new Error(`${meta.key}: no 2027 start dates found`);

  const highlights = dedupe(page.highlights.filter((h) => h.body), "title");
  const description = [...new Set([page.hero.at(-1), ...page.about])]
    .map((p) => (p || "").replace(/\s*Scroll down[^.!]*[.!]?/gi, "").trim())
    .filter((p) => p.length > 40);
  const flags = [...COMMON_FLAGS, ...(digest.flags || [])];

  const record = {
    id: `${ID_PREFIX}${meta.key}-work-experience`,
    provider: PROVIDER,
    provider_label: PROVIDER_LABEL,
    operating_institution: "Study Mind",
    program_type: "work_experience",
    title: meta.title,
    raw_title: card.title,
    subject: meta.subject,
    categories: ["Work experience", "Summer career camp", meta.subject],
    location: "Central London",
    location_type: "city",
    location_id: "london",
    location_name: "Central London",
    city: "London",
    country: "United Kingdom",
    age_ranges: ["15-18"],
    duration: durationFor(page, plans),
    delivery_modes: ["in_person"],
    class_size: "10-12 students",
    accommodation: "Optional residential stay at UCL Ramsay Hall, central London",
    price: priceFor(plans),
    price_scope: "course_fee_by_duration",
    price_note: "One fee per programme length (1, 2 or 3 weeks). The page does not say whether the optional UCL Ramsay Hall accommodation is included or what it costs.",
    price_note_tr: "Program süresine göre tek ücret (1, 2 veya 3 hafta). Sayfada isteğe bağlı UCL Ramsay Hall konaklamasının ücrete dahil olup olmadığı veya maliyeti belirtilmemiştir.",
    dates,
    date_months: [...new Set(dates.map((d) => MONTHS[Number(d.slice(5, 7)) - 1]))],
    ...(dates.length ? { dates_year: 2027 } : {}),
    description_short: card.text,
    description_full: description.join("\n\n"),
    curriculum_sections: [
      ...highlights.map((h) => ({ title: h.title, body: h.body })),
      ...plans.map((p) => ({
        title: `${weeksOf(p)} ${weeksOf(p) === 1 ? "week" : "weeks"} · ${p.name}`,
        body: p.items.filter((i) => !/^(Included:?|1st week, plus:?|The ultimate immersive experience)$/i.test(i)).join(" • "),
      })),
    ],
    learning_outcomes: [],
    image_url: meta.image,
    detail_url: card.link,
    source_url: card.link,
    source_files: [LISTING_PAGE, `${PAGES_DIR}/${page.file}`],
    source_reviewed: REVIEWED,
    flags,
  };
  return record;
}

function addPublishStatus(programs) {
  for (const p of programs) {
    const missing =
      !p.title || !p.provider || !p.location || !p.description_full || !p.detail_url ||
      !(p.age_ranges || []).length || !(p.price && p.price.min_amount) ||
      (!(p.dates || []).length && !(p.date_months || []).length);
    p.publish_status = missing ? "needs_review" : "ready";
  }
}

function ensureSchema(programs) {
  for (const p of programs) {
    for (const field of BASE_FIELDS) {
      if (!(field in p)) throw new Error(`${p.id}: missing schema field ${field}`);
    }
  }
}

function writeDigestSources() {
  mkdirSync(DIGEST_DIR, { recursive: true });
  const entries = {};
  const label = (text) => {
    // "1 week · Rising Talent" -> time "1 week", text "Rising Talent: ..." (the time column is narrow).
    const [time, name] = text.split(" · ");
    return [time, name];
  };
  for (const [key, p] of Object.entries(PROGRAMS)) {
    const entry = { city: "london" };
    for (const lang of ["en", "tr"]) {
      const l = p[lang];
      const sharedFit = lang === "en"
        ? "Open to UK and international students aged 15–18; no previous subject experience needed, but participants need enough English to join workshops and discussions"
        : "15–18 yaş arası Birleşik Krallık ve uluslararası öğrencilere açıktır; önceden konu deneyimi gerekmez, ancak atölye ve tartışmalara katılmak için yeterli İngilizce gerekir";
      entry[lang] = {
        focus: l.focus,
        tags: l.tags,
        hl: l.hl,
        do: l.do,
        outcomes: l.outcomes,
        fit: [...l.fit, sharedFit],
        ...(l.schedule
          ? {
              schedule: {
                title: lang === "en" ? "Programme weeks" : "Program haftaları",
                items: l.schedule.map(([lab, text]) => {
                  const [time, name] = label(lab);
                  return [time, `${name}: ${text}`];
                }),
                note: lang === "en"
                  ? "Module lists are taken from the provider’s pricing table; a finalised timetable is sent before the programme."
                  : "Modül listeleri sağlayıcının fiyat tablosundan alınmıştır; kesinleşmiş zaman çizelgesi program öncesinde gönderilir.",
              },
            }
          : {}),
      };
    }
    entry.flags = p.flags || [];
    entries[key] = entry;
  }
  writeFileSync(join(DIGEST_DIR, "programs.json"), JSON.stringify(entries, null, 2) + "\n", "utf8");

  const templates = {
    common: {
      en: {
        doTitle: "What you'll do",
        outcomes: ["A Study Mind certificate of completion to add to UCAS applications, CVs and portfolios"],
      },
      tr: {
        doTitle: "Neler yapacaksınız",
        outcomes: ["UCAS başvurularınıza, CV’nize ve portfolyonuza ekleyebileceğiniz Study Mind katılım sertifikası"],
      },
    },
    cities: {
      london: {
        en: {
          extras: [
            "Small groups of 10–12 students per class",
            "Optional residential stay at UCL Ramsay Hall in central London, with 24/7 supervision",
            "Bursary places (full, 75% or 50%) for eligible students; bursaries do not include accommodation",
          ],
        },
        tr: {
          extras: [
            "Sınıf başına 10–12 öğrencilik küçük gruplar",
            "Londra merkezinde UCL Ramsay Hall’da 7/24 gözetimli isteğe bağlı konaklama",
            "Uygun öğrenciler için burs (tam, %75 veya %50); burslar konaklamayı kapsamaz",
          ],
        },
      },
    },
    commonFlags: COMMON_FLAGS,
  };
  writeFileSync(join(ROOT, "data", "digest-src", "studymind-templates.json"), JSON.stringify(templates, null, 2) + "\n", "utf8");
}

function mergeIntoMain(newRecords) {
  const existing = JSON.parse(readFileSync(MAIN_DATA, "utf8"));
  const kept = existing.filter((p) => p.provider !== PROVIDER);
  const merged = [...kept, ...newRecords];
  writeFileSync(MAIN_DATA, JSON.stringify(merged, null, 2) + "\n", "utf8");
  return { previous_total: existing.length, removed_old: existing.length - kept.length, new_total: merged.length };
}

function main() {
  const pages = extractAll();
  const cards = JSON.parse(readFileSync(join(ROOT, PAGES_DIR, "index.json"), "utf8"));
  const cardByFile = new Map(cards.map((c) => [c.file, c]));
  if (pages.length !== Object.keys(COURSES).length) {
    throw new Error(`Expected ${Object.keys(COURSES).length} pages, found ${pages.length}`);
  }

  // "Coming soon" camps publish no fee or 2027 dates, so they are not catalogued (their authored
  // copy is parked in digest-content.mjs). A page that opens for booking is picked up on rerun.
  const open = pages.filter((page) => !page.coming_soon);
  const skipped = pages.filter((page) => page.coming_soon).map((page) => page.file);

  const records = open.map((page) => {
    const card = cardByFile.get(page.file);
    if (!card) throw new Error(`${page.file} is not in index.json`);
    return buildRecord(page, card);
  });
  addPublishStatus(records);
  ensureSchema(records);
  records.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  const ids = records.map((r) => r.id);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dupes.length) throw new Error(`duplicate ids: ${dupes.join(", ")}`);

  writeFileSync(join(OUT_DIR, "studymind.normalized.json"), JSON.stringify(records, null, 2) + "\n", "utf8");
  writeDigestSources();
  const mergeStats = mergeIntoMain(records);
  const statusCounts = records.reduce((acc, r) => ((acc[r.publish_status] = (acc[r.publish_status] || 0) + 1), acc), {});
  console.log(JSON.stringify({ total_studymind_records: records.length, publish_status: statusCounts, skipped_coming_soon: skipped, merge: mergeStats }));
}

main();
