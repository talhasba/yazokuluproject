import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const catalogue = read("../data/programs.normalized.json");
const records = catalogue.filter((record) => record.provider === "oxford_royale");
const digests = read("../data/program-digests.json");
const sourceIndex = read("../royale international/academy-royale-pages/index.json");

test("Academy Royale reflects the 24 supplied 2027 pages as campus-specific records", () => {
  assert.equal(sourceIndex.pages.length, 24);
  assert.equal(records.length, 36);
  assert.equal(new Set(records.map((record) => record.source_url)).size, 24);
  assert.deepEqual([...new Set(records.map((record) => record.location))].sort(), ["Cambridge", "Marlborough College", "Oxford"]);
  assert(records.every((record) => record.country === "United Kingdom"));
  assert(records.every((record) => record.publish_status === "ready"));
  assert(records.every((record) => record.duration));
  assert(records.every((record) => record.dates.length && record.dates.every((date) => date.includes("2027"))));
  assert(records.every((record) => record.price.display && record.price.tiers.length === 1));
  assert(records.every((record) => !/-london-|-yale-|-new-york-/.test(record.id)));
});

test("Academy Royale records remain bilingual, digested and traceable to saved HTML", () => {
  for (const record of records) {
    for (const field of ["title_tr", "subject_tr", "location_tr", "description_short_tr"]) assert(record[field], `${record.id}: ${field}`);
    assert(digests[record.id]?.en?.focus, `${record.id}: English digest`);
    assert(digests[record.id]?.tr?.focus, `${record.id}: Turkish digest`);
    assert(record.source_files.every((path) => existsSync(new URL(`../${path}`, import.meta.url))), record.id);
    assert.match(record.source_url, /^https:\/\/www\.academyroyaleinternational\.com\//);
  }
});

test("weekly English and discovery courses retain their published price scope", () => {
  const weekly = records.filter((record) => record.price_scope === "per_week");
  assert.equal(weekly.length, 2);
  assert(weekly.every((record) => /^(?:From )?£[\d,]+ per week$/.test(record.price.display)));
  assert(weekly.every((record) => record.price_notes.includes("weekly")));
  const starting = records.filter((record) => record.price_scope === "starting_from");
  assert.equal(starting.length, 2);
  assert(starting.every((record) => /^From £[\d,]+$/.test(record.price.display)));
});
