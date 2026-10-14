// Adds `campus` / `campus_tr` to data/programs.normalized.json.
//
// The catalogue title is "<program> - <campus>"; when a record has no campus the
// city/location is used instead (see codexProgramTitle in app-loader.js and
// programTitle in program-page.js). The city still shows under each card.
//
// Only venues confirmed from the provider's own pages are listed. Providers that
// are missing here (Edconic, Sportech, Emerald Young Adult) do not publish a
// single named campus per program and keep their city in the title.
//
// Re-run after any normalizer rebuilds programs.normalized.json:
//   node tools/apply-campuses.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = path.join(root, "data", "programs.normalized.json");
const programs = JSON.parse(fs.readFileSync(file, "utf8"));

const both = (en, tr = en) => ({ campus: en, campus_tr: tr });

// provider -> location (exact `location` string) -> campus
const byLocation = {
  immerse: {
    London: both("UCL"),
    Cambridge: both("University of Cambridge", "Cambridge Üniversitesi"),
    Oxford: both("University of Oxford", "Oxford Üniversitesi"),
    "New York": both("Barnard College (Columbia University)", "Barnard College (Columbia Üniversitesi)"),
    Toronto: both("University of Toronto", "Toronto Üniversitesi"),
    "San Francisco": both("UC Berkeley")
  },
  investin: {
    London: both("UCL")
  },
  oxford_royale: {
    Oxford: both("University of Oxford", "Oxford Üniversitesi"),
    Cambridge: both("University of Cambridge", "Cambridge Üniversitesi")
  },
  stclares: {
    Oxford: both("St Clare's")
  },
  mpw: {
    London: both("MPW London"),
    "London & Cambridge": both("MPW London & Cambridge"),
    "Cambridge & London": both("MPW Cambridge & London")
  },
  constructor_university: {
    "Bremen, Germany": both("Constructor University")
  }
};

// Per-program exceptions (take precedence over byLocation).
const byId = {
  // Career Discovery's venue is Dulwich College, not UCL.
  "investin-products-career-discovery-summer-experience": both("Dulwich College"),

  // Edconic: `operating_institution` in edconic_programs_combined.json.
  "edconic-courses-vogue-summer-school-fashion-business-vogue-summer-school-london": both("Vogue College of Fashion"),
  "edconic-vogue-summer-school-vogue-summer-school-nyc": both("Vogue College of Fashion"),
  "edconic-courses-vogue-winter-break-vogue-winter-break-nyc": both("Vogue College of Fashion"),
  "edconic-pre-college-summer-academy-nyc-nyc-summer-academy": both("The School of The New York Times"),
  "edconic-pre-college-summer-institute-summer-institute-nyc": both("Sotheby's Institute of Art"),
  "edconic-precollege-mayo-edu-pre-college-healthcare-academy": both("Mayo Clinic College of Medicine & Science"),

  // Sportech: only programs whose own page names the host venue.
  "sportech-aerospace-engineering": both("Sapienza University of Rome", "Roma Sapienza Üniversitesi"),
  "sportech-aerospace-engineering-university": both("Sapienza University of Rome", "Roma Sapienza Üniversitesi"),
  "sportech-medicine": both("Vita-Salute San Raffaele University (UniSR)", "Vita-Salute San Raffaele Üniversitesi (UniSR)"),
  "sportech-engineering-motorsport": both("Dallara Academy"),
  "sportech-esports-in-motorsport": both("Dallara AK Esports"),
  "sportech-football": both("AC Milan")
};

let set = 0;
let cleared = 0;
for (const program of programs) {
  const rule = byId[program.id] || byLocation[program.provider]?.[program.location];
  if (rule) {
    program.campus = rule.campus;
    program.campus_tr = rule.campus_tr;
    set += 1;
  } else if ("campus" in program || "campus_tr" in program) {
    delete program.campus;
    delete program.campus_tr;
    cleared += 1;
  }
}

fs.writeFileSync(file, JSON.stringify(programs, null, 2) + "\n");
console.log(`campus set on ${set} of ${programs.length} programs (${cleared} cleared)`);
