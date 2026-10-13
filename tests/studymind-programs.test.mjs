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

const COMING_SOON = new Set([
  "studymind-business-and-entrepreneurship-work-experience",
  "studymind-chemistry-work-experience",
  "studymind-media-and-journalism-work-experience",
]);
const live = records.filter((p) => !COMING_SOON.has(p.id));
const soon = records.filter((p) => COMING_SOON.has(p.id));

test("Study Mind has one record for each of the 15 course cards, traceable to saved pages", () => {
  assert.equal(cards.length, 15);
  assert.equal(records.length, 15);
  assert.equal(new Set(all.map((p) => p.id)).size, all.length);
  assert.deepEqual(
    records.map((p) => p.detail_url).sort(),
    cards.map((c) => c.link).sort(),
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

test("live courses carry the weekly 2027 start dates and one fee per programme length", () => {
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

test("coming-soon camps publish no price or dates and say so in both languages", () => {
  assert.equal(soon.length, 3);
  for (const p of soon) {
    assert.equal(p.publish_status, "needs_review");
    assert.deepEqual(p.dates, []);
    assert.deepEqual(p.price.tiers, []);
    assert.equal(p.price.display, "");
    assert.match(p.description_short, /^Coming soon/);
    assert.match(digests[p.id].en.focus, /^Coming soon/);
    assert.match(digests[p.id].tr.focus, /^Yakında/);
    assert(p.flags.some((f) => /coming soon/i.test(f)));
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
  for (const p of soon) {
    assert.equal(priceDetails(p, "en", inclusions).options.length, 0);
  }
});

test("every Study Mind course has bilingual digest copy; live ones list their programme weeks", () => {
  for (const p of records) {
    const d = digests[p.id];
    assert(d, p.id);
    for (const lang of ["en", "tr"]) {
      const x = d[lang];
      assert(x.focus && x.tags.length >= 3 && x.do.length >= 4 && x.outcomes.length >= 2 && x.fit.length >= 2, `${p.id} ${lang}`);
      assert(x.extras.some((e) => /Ramsay/.test(e)), `${p.id} ${lang}`);
      if (!COMING_SOON.has(p.id)) {
        assert.equal(x.schedule.items.length, p.price.tiers.length, `${p.id} ${lang}`);
      }
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
