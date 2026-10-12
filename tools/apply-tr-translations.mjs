// Applies reviewed Turkish catalogue metadata to providers whose digest content was
// translated before their normalized records received Turkish card/detail fields.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const translations = JSON.parse(readFileSync(join(root, "data/tr-translations.json"), "utf8"));
const digests = JSON.parse(readFileSync(join(root, "data/program-digests.json"), "utf8"));

const files = [
  "data/programs.normalized.json",
  "normalized_new_providers/programs.normalized.json",
  "normalized_new_providers/edconic.normalized.json",
  "normalized_new_providers/mpw.normalized.json",
  "normalized_new_providers/sportech.normalized.json",
  "normalized_new_providers/summer_discovery.normalized.json",
  "normalized_constructor/constructor.normalized.json",
  "normalized_academy_royale/academy-royale.normalized.json",
];

const translatedProviders = new Set([
  "edconic",
  "mpw",
  "sportech",
  "summer_discovery",
  "constructor_university",
  // older providers: their original title_tr/subject_tr came from a word-by-word substitution
  // (half English titles) and their description was a generic template.
  "bucksmore",
  "immerse",
  "investin",
  "oxford_royale",
  "stclares",
]);

const olderProviders = new Set(["bucksmore", "immerse", "investin", "oxford_royale", "stclares"]);

function translateRecord(record) {
  if (!translatedProviders.has(record.provider)) return record;

  const title = translations.titles[record.title];
  const subject = translations.subjects[record.subject];
  // Older records already carry a usable location_tr; keep it when the lookup table has no entry.
  const location = translations.locations[record.location] ?? record.location_tr;
  // Records without a digest (e.g. the online research programme) keep their existing description.
  const description = digests[record.id]?.tr?.focus ?? record.description_short_tr;

  const missing = [
    !title && `title: ${record.title}`,
    !subject && `subject: ${record.subject}`,
    !location && `location: ${record.location}`,
    !description && `digest: ${record.id}`,
  ].filter(Boolean);
  if (missing.length) throw new Error(`${record.id} — missing ${missing.join(", ")}`);

  const result = {
    ...record,
    title_tr: title,
    subject_tr: subject,
    location_tr: location,
    description_short_tr: description,
  };

  // Keep the legacy detail-page fields in step with the new title/subject/description.
  if (olderProviders.has(record.provider) && digests[record.id]) {
    const oldSubject = record.subject_tr;
    result.detail_intro_tr = description;
    if (Array.isArray(record.detail_sections_tr)) {
      result.detail_sections_tr = record.detail_sections_tr.map((section) => {
        if (section.title === "Genel Bakış") return { ...section, body: description };
        if (oldSubject && subject !== oldSubject) {
          return { ...section, body: section.body.replace(`${oldSubject} alanındaki`, `${subject} alanındaki`) };
        }
        return section;
      });
    }
    if (record.detail_facts_tr) result.detail_facts_tr = { ...record.detail_facts_tr, subject };
  }
  return result;
}

let updated = 0;
for (const relativePath of files) {
  const path = join(root, relativePath);
  const records = JSON.parse(readFileSync(path, "utf8"));
  const translated = records.map((record) => {
    if (translatedProviders.has(record.provider)) updated += 1;
    return translateRecord(record);
  });
  writeFileSync(path, `${JSON.stringify(translated, null, 2)}\n`, "utf8");
}

const catalogue = JSON.parse(readFileSync(join(root, files[0]), "utf8"));
const missing = catalogue.filter((record) =>
  !record.title_tr || !record.subject_tr || !record.location_tr || !record.description_short_tr
);
if (missing.length) {
  throw new Error(`Catalogue still has ${missing.length} incomplete Turkish records: ${missing.map((r) => r.id).join(", ")}`);
}

console.log(`Applied Turkish metadata to ${updated} records across ${files.length} files.`);
console.log(`Validated complete Turkish catalogue metadata for ${catalogue.length} programs.`);
