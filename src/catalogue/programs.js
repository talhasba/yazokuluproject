import { SUBJECT_BUCKETS } from "./constants.js";
import { sitePath } from "../site-paths.js";

function mergeOverride(base, override) {
  if (override === undefined) return base;
  if (Array.isArray(override) || !override || typeof override !== "object") return override;
  const result = base && typeof base === "object" && !Array.isArray(base) ? { ...base } : {};
  for (const [key, value] of Object.entries(override)) {
    result[key] = mergeOverride(result[key], value);
  }
  return result;
}

const TURKISH_COUNTRIES = {
  Canada: "Kanada",
  Germany: "Almanya",
  Ireland: "İrlanda",
  Italy: "İtalya",
  Spain: "İspanya",
  "United Kingdom": "Birleşik Krallık",
  "United States": "Amerika Birleşik Devletleri",
};

const TURKISH_CITIES = {
  London: "Londra",
  "New York City": "New York",
  Oxford: "Oxford",
  Cambridge: "Cambridge",
  Toronto: "Toronto",
  "San Francisco": "San Francisco",
  "New Haven": "New Haven",
  "New Haven / New York": "New Haven ve New York",
  "London & Cambridge": "Londra ve Cambridge",
  "Cambridge & London": "Cambridge ve Londra",
  Milan: "Milano",
  Rome: "Roma",
  Venice: "Venedik",
  Online: "Çevrimiçi",
};

const FILTER_NAMES = {
  UCL: "University College London (UCL)",
  "UC Berkeley": "University of California, Berkeley",
  UCLA: "University of California, Los Angeles (UCLA)",
  Dartmouth: "Dartmouth College",
};

const escapeRegExp = (value) => String(value || "").replace(/[|\\{}()[\]^$+*?.-]/g, "\\$&");

export function stripCountry(value, country, language = "en") {
  let result = String(value || "").trim();
  [country, language === "tr" ? TURKISH_COUNTRIES[country] : ""].filter(Boolean).forEach((suffix) => {
    result = result.replace(new RegExp(`\\s*,\\s*${escapeRegExp(suffix)}\\s*$`, "i"), "");
  });
  return result.trim();
}

export function cityName(program, language = "en") {
  return (language === "tr" && TURKISH_CITIES[program.city]) || program.city || "";
}

function samePlace(program) {
  if (["city", "virtual", "multi_city"].includes(program.location_type)) return true;
  const location = stripCountry(program.location, program.country).toLowerCase().replace(/[^a-z0-9]+/g, "");
  const city = String(program.city || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  return Boolean(location) && location === city;
}

export function placeName(program, language = "en") {
  const city = cityName(program, language);
  const location = language === "tr"
    ? stripCountry(program.location_tr || program.location, program.country, language)
    : stripCountry(program.location, program.country, language);
  return samePlace(program) ? city || location : location || city;
}

export function displayLocation(program, language = "en") {
  const city = cityName(program, language);
  const location = placeName(program, language);
  if (!city || samePlace(program) || city.toLowerCase() === location.toLowerCase()) return location || city;
  return `${city} · ${location}`;
}

function cleanTitle(value, program) {
  let title = String(value || "");
  const candidates = [
    program.location,
    stripCountry(program.location, program.country),
    program.city,
    program.location_tr,
    stripCountry(program.location_tr, program.country, "tr"),
    TURKISH_CITIES[program.city],
    ...(program.city === "New York City" ? ["NYC"] : []),
  ].filter(Boolean).sort((a, b) => b.length - a.length);

  [...new Set(candidates)].forEach((candidate) => {
    const escaped = escapeRegExp(candidate);
    title = title
      .replace(new RegExp(`\\s+in\\s+${escaped}(?=\\s|$)`, "gi"), " ")
      .replace(new RegExp(`\\s*[-–]\\s*${escaped}(?=\\s|$)`, "gi"), " ");
  });
  return title.replace(/\s+/g, " ").replace(/\s+([,:])/g, "$1").trim();
}

export function programTitle(program, language = "en") {
  const title = cleanTitle(language === "tr" && program.title_tr ? program.title_tr : program.title, program);
  const campus = (language === "tr" && program.campus_tr) || program.campus || placeName(program, language);
  return campus ? `${title} - ${campus}` : title;
}

export function normalizeProgram(program, photoSource) {
  const provider = program.provider_label || program.provider || "Unknown";
  const campus = program.campus || placeName(program);
  return {
    ...program,
    photo_source: photoSource,
    providerLabel: provider,
    providerFilter: provider,
    locationKey: campus,
    subjectBucket: SUBJECT_BUCKETS[program.subject] || "Other",
    filterLocationLabel: FILTER_NAMES[campus] || campus,
    filterLocationLabelTr: FILTER_NAMES[program.campus_tr || campus] || program.campus_tr || campus,
  };
}

export function imageFor(program, candidates) {
  const images = candidates[program.id] || [];
  const image = images.find((url) => url.startsWith("/assets/")) || program.image_url || "";
  return image.startsWith("/assets/") ? sitePath(image) : image;
}

async function readJson(url, fallback) {
  try {
    const response = await fetch(url, { cache: "no-store" });
    return response.ok ? response.json() : fallback;
  } catch {
    return fallback;
  }
}

export async function loadCatalogueData() {
  const [programs, candidates, overrides, photoSources] = await Promise.all([
    readJson(sitePath("data/programs.normalized.json"), []),
    readJson(sitePath("data/image-candidates.json"), {}),
    readJson(sitePath("data/program-editor-overrides.json"), { programs: {} }),
    readJson(sitePath("data/program-image-sources.json"), { images: {} }),
  ]);

  return {
    candidates,
    programs: programs.map((program) => {
      const merged = mergeOverride(program, overrides.programs?.[program.id]);
      return normalizeProgram(merged, photoSources.images?.[program.id]);
    }),
  };
}
