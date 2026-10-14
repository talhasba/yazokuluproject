// Adds `accommodation` / `accommodation_tr` to data/programs.normalized.json.
//
// The digest detail page shows these in the "Accommodation / Konaklama" fact
// (program-page.js). Text comes from each provider's own pages (saved HTML in the
// hp_comp/summerbutwhere folder, provider sites, and the digest sources in this
// repo). A program with no entry here shows "On request" on the page.
//
// Re-run after any normalizer rebuilds programs.normalized.json:
//   node tools/apply-accommodation.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = path.join(root, "data", "programs.normalized.json");
const programs = JSON.parse(fs.readFileSync(file, "utf8"));

const a = (en, tr) => ({ accommodation: en, accommodation_tr: tr });

// ---- provider + location -------------------------------------------------
const byLocation = {
  immerse: {
    London: a(
      "UCL student residences (Astor College, John Dodgson House), central London",
      "UCL öğrenci yurtları (Astor College, John Dodgson House), Londra merkezi"
    ),
    Cambridge: a(
      "Cambridge University college rooms (college assigned a few weeks before arrival)",
      "Cambridge Üniversitesi kolej odaları (kolej, varıştan birkaç hafta önce atanır)"
    ),
    Oxford: a(
      "Oxford University college rooms (college assigned a few weeks before arrival)",
      "Oxford Üniversitesi kolej odaları (kolej, varıştan birkaç hafta önce atanır)"
    ),
    "New York": a(
      "Barnard College (Columbia University), Manhattan",
      "Barnard College (Columbia Üniversitesi), Manhattan"
    ),
    Toronto: a(
      "University of Toronto college residences",
      "Toronto Üniversitesi kolej yurtları"
    ),
    "San Francisco": a(
      "UC Berkeley campus, college-style rooms",
      "UC Berkeley kampüsü, kolej tarzı odalar"
    )
  },
  investin: {
    London: a(
      "UCL student halls, central London (residential or non-residential option)",
      "UCL öğrenci yurtları, Londra merkezi (yurtta kalarak veya gündüzlü katılım seçeneği)"
    )
  },
  bucksmore: {
    "King's College London": a(
      "King's College London student residence, just over Waterloo Bridge",
      "King's College London öğrenci yurdu, Waterloo Köprüsü'nün hemen karşısı"
    )
  },
  mpw: {
    London: a(
      "Queen's Gate House, South Kensington (MPW residence, en-suite rooms)",
      "Queen's Gate House, South Kensington (MPW yurdu, özel banyolu odalar)"
    ),
    "London & Cambridge": a(
      "Queen's Gate House, London and Tripos Court, Cambridge (MPW residences, en-suite rooms)",
      "Queen's Gate House, Londra ve Tripos Court, Cambridge (MPW yurtları, özel banyolu odalar)"
    ),
    "Cambridge & London": a(
      "Queen's Gate House, London and Tripos Court, Cambridge (MPW residences, en-suite rooms)",
      "Queen's Gate House, Londra ve Tripos Court, Cambridge (MPW yurtları, özel banyolu odalar)"
    )
  },
  oxford_royale: {
    Oxford: a("University of Oxford college residences", "Oxford Üniversitesi kolej yurtları"),
    Cambridge: a("University of Cambridge college residences", "Cambridge Üniversitesi kolej yurtları"),
    "Marlborough College": a(
      "Marlborough College boarding houses",
      "Marlborough College yatılı evleri"
    )
  },
  constructor_university: {
    "Bremen, Germany": a(
      "On the Constructor University campus, Bremen",
      "Constructor University kampüsünde, Bremen"
    )
  },
  schiller: {
    "Madrid Campus": a(
      "Included for the full two weeks, Madrid (details on request)",
      "İki haftanın tamamı için dahil, Madrid (ayrıntılar talep üzerine)"
    ),
    "Heidelberg Campus": a(
      "Included for the full two weeks, Heidelberg (details on request)",
      "İki haftanın tamamı için dahil, Heidelberg (ayrıntılar talep üzerine)"
    )
  }
};

// ---- per program ------------------------------------------------------------
const byId = {
  // InvestIN Career Discovery runs at Dulwich College.
  "investin-products-career-discovery-summer-experience": a(
    "Dulwich College, London (single en-suite or shared room; non-residential option)",
    "Dulwich College, Londra (tek kişilik özel banyolu veya paylaşımlı oda; gündüzlü katılım seçeneği)"
  ),

  // Emerald Cultural Institute
  "emerald-trinity-walton-stem": a(
    "Homestay or Trinity Hall residence (Dartry Road), Dublin",
    "Aile yanı veya Trinity Hall yurdu (Dartry Road), Dublin"
  ),
  "emerald-young-adult": a("Homestay or residence, Dublin", "Aile yanı veya yurt, Dublin"),

  // Edconic
  "edconic-pre-college-summer-academy-nyc-nyc-summer-academy": a(
    "Dorm-style university residence hall, New York City (residential or day option)",
    "Üniversite yurdu tarzı konaklama, New York (yurtta veya gündüzlü katılım)"
  ),
  "edconic-pre-college-summer-institute-summer-institute-nyc": a(
    "Dorm-style residence hall, Manhattan (residential or day option)",
    "Yurt tarzı konaklama, Manhattan (yurtta veya gündüzlü katılım)"
  ),
  "edconic-precollege-mayo-edu-pre-college-healthcare-academy": a(
    "University accommodation in central Rochester, MN, walking distance to Mayo Clinic",
    "Rochester (MN) merkezinde üniversite konaklaması, Mayo Clinic'e yürüme mesafesinde"
  ),

  // StudyMind
  // (applied per record below: all StudyMind programs share the same residence)

  // Sportech (from each program's own page)
  "sportech-aerospace-engineering": a("4★ hotel in Rome, with daily shuttle to classes", "Roma'da 4★ otel, derslere günlük servis"),
  "sportech-aerospace-engineering-university": a("Optional: arranged by Sportech Academy in Rome", "İsteğe bağlı: Sportech Academy aracılığıyla Roma'da"),
  "sportech-agrifoodtech": a("University residence in Milan, single rooms with private bathroom", "Milano'da üniversite yurdu, özel banyolu tek kişilik odalar"),
  "sportech-architecture-urban-design": a("Residential accommodation in Milan, full board", "Milano'da yurt konaklaması, tam pansiyon"),
  "sportech-automotive-design": a("Residential accommodation in Milan, full board", "Milano'da yurt konaklaması, tam pansiyon"),
  "sportech-biomedical-engineering": a("Residential accommodation in Milan, full board", "Milano'da yurt konaklaması, tam pansiyon"),
  "sportech-business": a("University residence in Milan, single en-suite rooms", "Milano'da üniversite yurdu, özel banyolu tek kişilik odalar"),
  "sportech-business-university": a("Optional: university residence in Milan, walking distance to the lecture rooms", "İsteğe bağlı: Milano'da üniversite yurdu, ders salonlarına yürüme mesafesinde"),
  "sportech-cosmetic-sciences": a("Residential accommodation in Milan, full board", "Milano'da yurt konaklaması, tam pansiyon"),
  "sportech-engineering-motorsport": a("Accommodation in Parma, all meals included", "Parma'da konaklama, tüm öğünler dahil"),
  "sportech-esports-in-motorsport": a("4★ Courtyard by Marriott Indianapolis West-Speedway, shared rooms", "4★ Courtyard by Marriott Indianapolis West-Speedway, paylaşımlı odalar"),
  "sportech-fashion": a("Residential accommodation in Milan, full board", "Milano'da yurt konaklaması, tam pansiyon"),
  "sportech-football": a("4★ Quark Hotel Milano, close to the training facility", "4★ Quark Hotel Milano, antrenman tesisine yakın"),
  "sportech-medicine": a("University residence in Milan, single en-suite rooms", "Milano'da üniversite yurdu, özel banyolu tek kişilik odalar"),
  "sportech-motorsport-management-university": a("Optional accommodation arranged by Sportech Academy", "İsteğe bağlı konaklama, Sportech Academy aracılığıyla"),
  "sportech-motorsport-engineering-university": a("Optional accommodation arranged by Sportech Academy", "İsteğe bağlı konaklama, Sportech Academy aracılığıyla"),
  "sportech-music-innovation": a("4★ Hotel Alla Torre, centre of Castelfranco Veneto", "4★ Hotel Alla Torre, Castelfranco Veneto merkezi"),
  "sportech-pet-design": a("Residential accommodation in Milan, full board", "Milano'da yurt konaklaması, tam pansiyon"),
  "sportech-sports-management": a("University residence in Milan, full board", "Milano'da üniversite yurdu, tam pansiyon")
};

// ---- rules that need the record -------------------------------------------------
function rule(p) {
  if (byId[p.id]) return byId[p.id];

  if (p.provider === "studymind") {
    return a(
      "UCL Ramsay Hall, central London (optional residential stay)",
      "UCL Ramsay Hall, Londra merkezi (isteğe bağlı yurt konaklaması)"
    );
  }

  if (p.provider === "stclares") {
    return p.program_type === "stclares_teenagers_oxford" || p.program_type === "stclares_add_on"
      ? a(
          "St Clare's residential houses near the Banbury Road campus, Oxford (single, twin or triple rooms)",
          "St Clare's yatılı evleri, Banbury Road kampüsüne yakın, Oxford (tek, çift veya üç kişilik odalar)"
        )
      : a("St Clare's residential campus, Oxford", "St Clare's yatılı kampüsü, Oxford");
  }

  if (p.provider === "summer_discovery") {
    const campus = p.location;
    const blob = JSON.stringify(p).toLowerCase();
    const commuter = blob.includes("commuter");
    if (campus === "UCLA") {
      return a(
        `UCLA, Hedrick Summit Residence Hall (exclusive to Summer Discovery students)${commuter ? "; commuter option available" : ""}`,
        `UCLA, Hedrick Summit yurdu (yalnızca Summer Discovery öğrencilerine ayrılmış)${commuter ? "; gündüzlü katılım seçeneği mevcut" : ""}`
      );
    }
    return a(
      `${campus} campus residence halls${commuter ? " (commuter option available)" : ""}`,
      `${campus} kampüsündeki yurtlar${commuter ? " (gündüzlü katılım seçeneği mevcut)" : ""}`
    );
  }

  return byLocation[p.provider]?.[p.location] || null;
}

let set = 0;
let cleared = 0;
for (const program of programs) {
  const r = rule(program);
  if (r) {
    program.accommodation = r.accommodation;
    program.accommodation_tr = r.accommodation_tr;
    set += 1;
  } else if ("accommodation" in program || "accommodation_tr" in program) {
    delete program.accommodation;
    delete program.accommodation_tr;
    cleared += 1;
  }
}

fs.writeFileSync(file, JSON.stringify(programs, null, 2) + "\n");
const missing = programs.filter((p) => !p.accommodation).map((p) => `${p.provider}:${p.id}`);
console.log(`accommodation set on ${set} of ${programs.length} programs (${cleared} cleared)`);
console.log(`without accommodation: ${missing.length}`);
missing.forEach((m) => console.log("  " + m));
