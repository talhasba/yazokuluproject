// Rebuild the two reviewed Emerald programmes without modifying other providers.
// node normalized_ireland/normalize_ireland.mjs
// Then: node tools/build-digests.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
const root = fileURLToPath(new URL("../", import.meta.url));
const read = (path) => JSON.parse(readFileSync(join(root, path), "utf8"));
const write = (path, data) => writeFileSync(join(root, path), JSON.stringify(data, null, 2) + "\n");
const source = read("normalized_ireland/programs.reviewed.json");
const records = source.programs.map((p) => ({
  id: `emerald-${p.slug}`, provider: "emerald", provider_label: "Emerald Cultural Institute",
  program_type: "summer_school", title: p.title, raw_title: p.title, title_tr: p.title_tr,
  subject: p.subject, subject_tr: p.subject_tr, categories: p.en.tags,
  location: p.location, location_tr: p.location_tr, location_type: p.location_type,
  location_id: p.location_type === "campus" ? "trinity-college-dublin" : "dublin", location_name: p.location,
  city: "Dublin", country: "Ireland", age_ranges: [p.ages], duration: p.duration,
  delivery_modes: ["in_person"],
  price: { currency: "EUR", min_amount: Math.min(...p.price_tiers.map((x) => x[1])),
    max_amount: Math.max(...p.price_tiers.map((x) => x[1])),
    display: `2026 · €${Math.min(...p.price_tiers.map((x) => x[1])).toLocaleString("en-GB")}–€${Math.max(...p.price_tiers.map((x) => x[1])).toLocaleString("en-GB")}`,
    tiers: p.price_tiers.map(([label, amount]) => ({ label, currency: "EUR", amount, display: `€${amount.toLocaleString("en-GB")}` })) },
  price_status: "historical", price_year: 2026, dates_year: 2026,
  ...(p.price_supplements ? { price_supplements: p.price_supplements } : {}),
  dates: p.dates, date_months: p.date_months, language_requirement: p.language_requirement,
  course_codes: p.codes, description_short: p.en.focus, description_short_tr: p.tr.focus,
  description_full: [p.en.focus, ...p.en.do.map(([lead, text]) => `${lead}: ${text}`)].join("\n\n"),
  description_full_tr: [p.tr.focus, ...p.tr.do.map(([lead, text]) => `${lead}: ${text}`)].join("\n\n"),
  curriculum_sections: p.en.do.map(([title, body]) => ({ title, body })),
  curriculum_sections_tr: p.tr.do.map(([title, body]) => ({ title, body })),
  learning_outcomes: p.en.outcomes, learning_outcomes_tr: p.tr.outcomes,
  image_url: p.image, image_credit: "Emerald Cultural Institute", detail_url: p.source_url, source_url: p.source_url, source_files: p.source_files,
  source_reviewed: source._meta.reviewed, flags: p.flags, publish_status: "needs_review"
}));
if (records.length !== 2 || new Set(records.map((p) => p.id)).size !== records.length) throw new Error("Invalid Emerald records");
const catalogue = read("data/programs.normalized.json");
const retained = catalogue.filter((p) => p.provider !== "emerald");
if (retained.some((p) => records.some((r) => r.id === p.id))) throw new Error("Programme ID collision");
write("normalized_ireland/programs.normalized.json", records);
write("data/programs.normalized.json", [...retained, ...records]);
mkdirSync(join(root, "data/digest-src/emerald"), { recursive: true });
write("data/digest-src/emerald/programs.json", Object.fromEntries(source.programs.map((p) => [p.slug, { en: p.en, tr: p.tr, flags: p.flags }])));
const images = read("data/image-candidates.json");
for (const p of source.programs) images[`emerald-${p.slug}`] = [p.image];
write("data/image-candidates.json", images);
write("normalized_ireland/image-provenance.json", {
  note: "Original JPEGs extracted from supplied Emerald brochures; provider-owned material, no open licence asserted.",
  images: source.programs.map((p) => ({ path: p.image, source_file: p.image_source, page: p.image_page, credit: "Emerald Cultural Institute" }))
});
console.log(`Merged ${records.length} Emerald programmes; catalogue now has ${retained.length + records.length} records.`);
