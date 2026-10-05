import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { priceDetails, renderPriceDetails } from "../program-pricing.js";
const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), "utf8"));
const catalogue = read("../data/programs.normalized.json");
const records = catalogue.filter((p) => p.provider === "emerald");
const digests = read("../data/program-digests.json");
const images = read("../data/image-candidates.json");
const inclusions = read("../data/price-inclusions.json");

test("Ireland records are complete, unique, bilingual and traceable to supplied sources", () => {
  assert.equal(records.length, 2);
  assert.equal(new Set(catalogue.map((p) => p.id)).size, catalogue.length);
  for (const p of records) {
    assert.equal(p.country, "Ireland");
    assert.equal(p.city, "Dublin");
    assert.equal(p.price_status, "historical");
    assert.equal(p.price_year, 2026);
    assert.equal(p.dates_year, 2026);
    assert.equal(p.publish_status, "needs_review");
    assert(p.dates.every((s) => /^2026-\d{2}-\d{2}\/2026-\d{2}-\d{2}$/.test(s)));
    for (const lang of ["en", "tr"]) {
      assert(digests[p.id][lang].focus);
      assert(digests[p.id][lang].do.length >= 4);
      assert(digests[p.id][lang].fit.length);
    }
    for (const key of ["title_tr", "subject_tr", "location_tr", "description_short_tr"]) assert(p[key]);
    assert(p.source_files.every((path) => existsSync(new URL(`../${path}`, import.meta.url))));
    assert(images[p.id].every((path) => existsSync(new URL(`..${path}`, import.meta.url))));
  }
});

test("STEM fee comparison distinguishes two accommodation packages with the same tuition", () => {
  const p = records.find((x) => x.id.endsWith("trinity-walton-stem"));
  assert.deepEqual(p.price.tiers.map((t) => t.amount), [2990, 3700]);
  assert.deepEqual(p.age_ranges, ["14-17"]);
  for (const lang of ["en", "tr"]) {
    const model = priceDetails(p, lang, inclusions);
    assert.equal(model.historical, true);
    assert.equal(model.options.length, 2);
    assert(model.options.every((o) => /2/.test(o.title)));
    assert(model.options.every((o) => o.includes.some((s) => /10.*10/.test(s))));
    assert(model.options.every((o) => o.includes.some((s) => /full board|tam pansiyon/i.test(s))));
    assert(model.options.every((o) => !o.excludes.some((s) => /^Overnight accommodation|^Gece konaklaması/.test(s))));
    assert(model.options[1].note.includes("70"));
    const html = renderPriceDetails(p, lang, inclusions);
    assert(html.summary.includes("2026"));
    assert(html.section.includes("105"));
  }
});

test("Young Adult durations use complete tariff fees, not extra-week prices", () => {
  const p = records.find((x) => x.id.endsWith("young-adult"));
  assert.deepEqual(p.age_ranges, ["16-19"]);
  assert.deepEqual(p.price.tiers.map((t) => t.amount), [2200, 3250, 4240, 2950, 4375, 5740]);
  assert.equal(p.price.min_amount, 2200);
  assert.equal(p.price.max_amount, 5740);
  assert.equal(p.price_supplements.homestay_extra_week_eur, 990);
  for (const lang of ["en", "tr"]) {
    const model = priceDetails(p, lang, inclusions);
    assert.equal(model.options.length, 6);
    assert.deepEqual(model.options.map((o) => Number(o.title.match(/\d+/)[0])), [2, 3, 4, 2, 3, 4]);
    assert(model.options.slice(0, 3).every((o) => /Homestay|Aile yanı/.test(o.title)));
    assert(model.options.slice(3).every((o) => /Residence|Yurt/.test(o.title)));
    assert(model.explanation.includes("Sandford Park School"));
    assert(model.note.includes("190"));
    assert(model.note.includes("105"));
  }
  assert(p.flags.some((s) => /16-20/.test(s)));
});
