import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { priceDetails, renderPriceDetails } from "../program-pricing.js";

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), "utf8"));
const all = read("../data/programs.normalized.json");
const records = all.filter((p) => p.provider === "studymind");
const digests = read("../data/program-digests.json");
const inclusions = read("../data/price-inclusions.json");
const photos = read("../data/program-image-sources.json");
const cards = read("../studymind/studymind-pages/index.json");

// Camps the provider lists as "coming soon" (no fee, no 2027 dates) are not catalogued.
const COMING_SOON_PAGES = new Set([
  "business-entrepreneurship-work-experience.html",
  "chemistry-work-experience.html",
  "journalism-work-experience.html",
]);
const COMING_SOON = new Set([
  "studymind-business-and-entrepreneurship-work-experience",
  "studymind-chemistry-work-experience",
  "studymind-media-and-journalism-work-experience",
]);
const live = records;

test("Study Mind catalogues the 12 open courses from the 15 course cards, traceable to saved pages", () => {
  assert.equal(cards.length, 15);
  assert.equal(records.length, 12);
  assert.equal(new Set(all.map((p) => p.id)).size, all.length);
  const open = cards.filter((c) => !COMING_SOON_PAGES.has(c.file));
  assert.deepEqual(
    records.map((p) => p.detail_url).sort(),
    open.map((c) => c.link).sort(),
  );
  for (const p of records) {
    assert.equal(p.provider_label, "Study Mind");
    assert.equal(p.country, "United Kingdom");
    assert.equal(p.city, "London");
    assert.deepEqual(p.age_ranges, ["15-18"]);
    assert.deepEqual(p.delivery_modes, ["in_person"]);
    assert(p.source_files.length === 2 && p.source_files.every((f) => existsSync(new URL(`../${f}`, import.meta.url))), p.id);
    assert.match(p.detail_url, /^https:\/\/studymind\.co\.uk\//);
    assert(p.title_tr && p.subject_tr && p.location_tr && p.description_short_tr, p.id);
  }
});

test("open courses carry the weekly 2027 start dates and one fee per programme length", () => {
  assert.equal(live.length, 12);
  for (const p of live) {
    assert.equal(p.publish_status, "ready", p.id);
    assert.deepEqual(p.dates, [
      "2027-06-28", "2027-07-05", "2027-07-12", "2027-07-19", "2027-07-26", "2027-08-02", "2027-08-09",
    ]);
    assert.deepEqual(p.date_months, ["June", "July", "August"]);
    assert.equal(p.dates_year, 2027);
    assert.equal(p.price.currency, "GBP");
    const amounts = p.price.tiers.map((t) => t.amount);
    // Careers & Life Skills is the only course with just 1- and 2-week plans.
    const expected = p.id === "studymind-careers-and-life-skills-work-experience" ? [1799, 2999] : [1799, 2999, 3999];
    assert.deepEqual(amounts, expected, p.id);
    assert.equal(p.price.min_amount, 1799);
    assert.equal(p.price.max_amount, expected.at(-1));
    assert(p.price.tiers.every((t) => t.title.en && t.title.tr && t.note.en && t.note.tr));
  }
});

test("coming-soon camps are not catalogued and leave no records, digests or photos behind", () => {
  for (const id of COMING_SOON) {
    assert(!all.some((p) => p.id === id), id);
    assert(!digests[id], id);
    assert(!photos.images[id], id);
    assert(!existsSync(new URL(`../assets/program-images/unique/${id}.png`, import.meta.url)), id);
  }
  // Their saved pages stay available as source material.
  for (const file of COMING_SOON_PAGES) {
    assert(existsSync(new URL(`../studymind/studymind-pages/${file}`, import.meta.url)), file);
  }
});

test("price comparison explains duration, not accommodation, in both languages", () => {
  for (const p of live) {
    for (const lang of ["en", "tr"]) {
      const model = priceDetails(p, lang, inclusions);
      assert.equal(model.options.length, p.price.tiers.length, p.id);
      assert.equal(model.historical, false);
      assert(model.options.every((o) => o.note && !/not been specified|belirtilmemiştir\.$/.test(o.note)), p.id);
      assert.match(model.explanation, /weeks|hafta/);
      assert.match(model.note, /UCL Ramsay Hall/);
      assert.match(model.options[0].title, lang === "en" ? /^1 week · / : /^1 hafta · /);
      const html = renderPriceDetails(p, lang, inclusions);
      assert(html.section.includes("£1,799") && html.section.includes("£2,999"), p.id);
      assert(!/undefined|NaN/.test(html.section + html.summary));
    }
  }
});

test("every Study Mind course has bilingual digest copy listing its programme weeks", () => {
  for (const p of records) {
    const d = digests[p.id];
    assert(d, p.id);
    for (const lang of ["en", "tr"]) {
      const x = d[lang];
      assert(x.focus && x.tags.length >= 3 && x.do.length >= 4 && x.outcomes.length >= 2 && x.fit.length >= 2, `${p.id} ${lang}`);
      assert(x.extras.some((e) => /Ramsay/.test(e)), `${p.id} ${lang}`);
      assert.equal(x.schedule.items.length, p.price.tiers.length, `${p.id} ${lang}`);
    }
    assert.equal(d.en.do.length, d.tr.do.length, p.id);
  }
});

test("each course has its own downloaded photograph; only Careers uses an illustrative one", () => {
  const seen = new Set();
  for (const p of records) {
    const image = photos.images[p.id];
    assert(image, p.id);
    assert(!seen.has(image.sha256), `repeated photograph: ${p.id}`);
    seen.add(image.sha256);
    assert(existsSync(new URL(`..${image.local_path}`, import.meta.url)), p.id);
    const expected = p.id === "studymind-careers-and-life-skills-work-experience" ? "illustrative" : "provider";
    assert.equal(image.source_kind, expected, p.id);
    if (expected === "provider") assert.match(image.source_page, /^https:\/\/studymind\.co\.uk\//);
  }
});
