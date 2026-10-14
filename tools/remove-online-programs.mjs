// Removes online-only programs (we only run in-person courses) from the data the
// site reads: programs.normalized.json, image-candidates.json, program-digests.json.
//
// A record is "online" when its delivery_modes contain "virtual"/"online" and not
// "in_person", or its location_type is "virtual". Re-run after any normalizer
// rebuilds programs.normalized.json:
//   node tools/remove-online-programs.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (f) => JSON.parse(fs.readFileSync(path.join(root, f), "utf8"));
const writeJson = (f, value) => fs.writeFileSync(path.join(root, f), JSON.stringify(value, null, 2) + "\n");

const isOnline = (p) => {
  const modes = p.delivery_modes || [];
  const online = modes.includes("virtual") || modes.includes("online");
  return p.location_type === "virtual" || (online && !modes.includes("in_person"));
};

const programsFile = "data/programs.normalized.json";
const programs = readJson(programsFile);
const removed = programs.filter(isOnline);
const kept = programs.filter((p) => !isOnline(p));
const ids = new Set(removed.map((p) => p.id));

if (removed.length) writeJson(programsFile, kept);

for (const f of ["data/image-candidates.json", "data/program-digests.json"]) {
  const data = readJson(f);
  let n = 0;
  for (const id of ids) if (id in data) { delete data[id]; n += 1; }
  if (n) writeJson(f, data);
  console.log(`${f}: ${n} entr${n === 1 ? "y" : "ies"} removed`);
}

console.log(`programs: ${removed.length} online removed, ${kept.length} remain`);
removed.forEach((p) => console.log("  - " + p.id));