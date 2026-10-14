// Gives every program without a published age bracket the catalogue-wide default.
//
// Run after a provider normalizer rebuilds any of the files below:
//   node tools/apply-default-age-range.mjs

// Existing age ranges are never changed.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const DEFAULT_AGE_RANGE = "13-18";
const files = [
  "data/programs.normalized.json",
  "normalized_new_providers/programs.normalized.json",
  "normalized_new_providers/edconic.normalized.json",
  "normalized_new_providers/mpw.normalized.json",
  "normalized_new_providers/sportech.normalized.json",
  "normalized_new_providers/summer_discovery.normalized.json",
];

let totalUpdated = 0;

for (const relativePath of files) {
  const path = join(root, relativePath);
  if (!existsSync(path)) continue;

  const programs = JSON.parse(readFileSync(path, "utf8"));
  if (!Array.isArray(programs)) throw new Error(`${relativePath} must contain a JSON array`);

  let updated = 0;
  for (const program of programs) {
    const ranges = Array.isArray(program.age_ranges) ? program.age_ranges : [];
    const hasRange = ranges.some((range) => typeof range === "string" && range.trim());
    if (hasRange) continue;

    program.age_ranges = [DEFAULT_AGE_RANGE];
    updated += 1;
  }

  if (updated) {
    writeFileSync(path, `${JSON.stringify(programs, null, 2)}\n`, "utf8");
  }

  totalUpdated += updated;
  console.log(`${relativePath}: ${updated} updated`);
}

console.log(`Total records updated: ${totalUpdated}`);
