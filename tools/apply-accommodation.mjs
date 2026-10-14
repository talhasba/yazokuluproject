// Adds `accommodation` / `accommodation_tr` to data/programs.normalized.json.
//
// The digest detail page shows these next to Location (program-page.js), so the
// values are kept short: the institution or residence, not a sentence. Text comes
// from each provider's own pages (saved HTML/markdown, provider sites, and the
// digest sources in this repo). A program with no entry shows "On request".
//
// Re-run after any normalizer rebuilds programs.normalized.json:
//   node tools/apply-accommodation.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = path.join(root, "data", "programs.normalized.json");
const programs = JSON.parse(fs.readFileSync(file, "utf8"));

const a = (en, tr = en) => ({ accommodation: en, accommodation_tr: tr });

// ---- provider + location -------------------------------------------------
const byLocation = {
  immerse: {
    London: a("University College London (UCL)"),
    Cambridge: a("University of Cambridge", "Cambridge Üniversitesi"),
    Oxford: a("University of Oxford", "Oxford Üniversitesi"),
    "New York": a("Barnard College (Columbia University)", "Barnard College (Columbia Üniversitesi)"),
    Toronto: a("University of Toronto", "Toronto Üniversitesi"),
    "San Francisco": a("UC Berkeley")
  },
  investin: {
    London: a("University of London halls, central London", "Londra Üniversitesi yurtları, Londra merkezi")
  },
  bucksmore: {
    "King's College London": a("King's College London")
  },
  mpw: {
    London: a("Queen's Gate House, London"),
    "London & Cambridge": a(
      "Queen's Gate House (London), Tripos Court (Cambridge)",
      "Queen's Gate House (Londra), Tripos Court (Cambridge)"
    ),
    "Cambridge & London": a(
      "Queen's Gate House (London), Tripos Court (Cambridge)",
      "Queen's Gate House (Londra), Tripos Court (Cambridge)"
    )
  },
  oxford_royale: {
    Oxford: a("University of Oxford", "Oxford Üniversitesi"),
    Cambridge: a("University of Cambridge", "Cambridge Üniversitesi"),
    "Marlborough College": a("Marlborough College")
  },
  constructor_university: {
    "Bremen, Germany": a("Constructor University campus", "Constructor University kampüsü")
  },
  schiller: {
    "Madrid Campus": a("Included (details on request)", "Dahil (ayrıntılar talep üzerine)"),
    "Heidelberg Campus": a("Included (details on request)", "Dahil (ayrıntılar talep üzerine)")
  }
};

// ---- per program ------------------------------------------------------------
const byId = {
  // InvestIN Career Discovery runs at Dulwich College.
  "investin-products-career-discovery-summer-experience": a(
    "Dulwich College boarding houses",
    "Dulwich College yatılı evleri"
  ),

  // Emerald Cultural Institute
  "emerald-trinity-walton-stem": a("Homestay or Trinity Hall", "Aile yanı veya Trinity Hall"),
  "emerald-young-adult": a("Homestay or residence, Dublin", "Aile yanı veya yurt, Dublin"),

  // Edconic
  "edconic-pre-college-summer-academy-nyc-nyc-summer-academy": a(
    "University residence hall, New York",
    "Üniversite yurdu, New York"
  ),
  "edconic-pre-college-summer-institute-summer-institute-nyc": a(
    "Residence hall, Manhattan",
    "Yurt, Manhattan"
  ),
  "edconic-precollege-mayo-edu-pre-college-healthcare-academy": a(
    "University housing, Rochester, MN",
    "Üniversite konaklaması, Rochester, MN"
  ),

  // Sportech (from each program's own page)
  "sportech-aerospace-engineering": a("4★ hotel, Rome", "4★ otel, Roma"),
  "sportech-aerospace-engineering-university": a("Optional, arranged by Sportech", "İsteğe bağlı, Sportech aracılığıyla"),
  "sportech-agrifoodtech": a("University residence, Milan", "Üniversite yurdu, Milano"),
  "sportech-architecture-urban-design": a("Residence, Milan", "Yurt, Milano"),
  "sportech-automotive-design": a("Residence, Milan", "Yurt, Milano"),
  "sportech-biomedical-engineering": a("Residence, Milan", "Yurt, Milano"),
  "sportech-business": a("University residence, Milan", "Üniversite yurdu, Milano"),
  "sportech-business-university": a("Optional, university residence in Milan", "İsteğe bağlı, Milano'da üniversite yurdu"),
  "sportech-cosmetic-sciences": a("Residence, Milan", "Yurt, Milano"),
  "sportech-engineering-motorsport": a("Accommodation in Parma", "Parma'da konaklama"),
  "sportech-esports-in-motorsport": a(
    "Courtyard by Marriott Indianapolis West-Speedway",
    "Courtyard by Marriott Indianapolis West-Speedway"
  ),
  "sportech-fashion": a("Residence, Milan", "Yurt, Milano"),
  "sportech-football": a("Quark Hotel Milano", "Quark Hotel Milano"),
  "sportech-medicine": a("University residence, Milan", "Üniversite yurdu, Milano"),
  "sportech-motorsport-management-university": a("Optional, university residence", "İsteğe bağlı, üniversite yurdu"),
  "sportech-motorsport-engineering-university": a(
    "Optional, Daytona Hotel & Residence",
    "İsteğe bağlı, Daytona Hotel & Residence"
  ),
  "sportech-music-innovation": a("Hotel Alla Torre, Castelfranco Veneto", "Hotel Alla Torre, Castelfranco Veneto"),
  "sportech-pet-design": a("Residence, Milan", "Yurt, Milano"),
  "sportech-sports-management": a("University residence, Milan", "Üniversite yurdu, Milano")
};

// ---- rules that need the record -------------------------------------------------
function rule(p) {
  if (byId[p.id]) return byId[p.id];

  if (p.provider === "studymind") {
    return a("UCL Ramsay Hall (optional)", "UCL Ramsay Hall (isteğe bağlı)");
  }

  if (p.provider === "stclares") {
    return p.program_type === "stclares_teenagers_oxford" || p.program_type === "stclares_add_on"
      ? a("St Clare's houses, Oxford", "St Clare's evleri, Oxford")
      : a("St Clare's campus, Oxford", "St Clare's kampüsü, Oxford");
  }

  if (p.provider === "summer_discovery") {
    // The saved Summer Discovery pages describe a residential programme on each
    // campus and name only UCLA's hall.
    if (p.location === "UCLA") return a("UCLA, Hedrick Summit Hall", "UCLA, Hedrick Summit yurdu");
    return a(`${p.location} campus`, `${p.location} kampüsü`);
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
