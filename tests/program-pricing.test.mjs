import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { priceDetails, renderPriceDetails } from "../program-pricing.js";

const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const programs = read("../data/programs.normalized.json");
const details = read("../data/price-inclusions.json");
const record = (id) => programs.find((p) => p.id === id);

test("InvestIN prices retain six distinct packages with the correct length and accommodation", () => {
  const p = record("investin-products-the-ai-software-summer-experience");
  const model = priceDetails(p, "en", details);
  assert.equal(model.options.length, 6);
  assert.deepEqual(model.options.map((o) => o.price), p.price.tiers.map((t) => t.display));
  assert.match(model.options[0].title, /^1 week · Day/);
  assert.match(model.options[1].title, /^2 weeks · Day/);
  assert.match(model.options[2].title, /Enhanced · Day/);
  assert.match(model.options[3].title, /^1 week · Residential/);
  assert(model.options[3].includes.some((s) => s.includes("6 nights")));
  assert(model.options[5].includes.some((s) => s.includes("13 nights")));
  assert(model.options[2].includes.some((s) => s.includes("65")));
  assert(!model.options[0].includes.some((s) => s.includes("room")));
});

test("an edited, unmatched InvestIN fee cannot inherit a guessed package length", () => {
  const p = structuredClone(record("investin-products-the-ai-software-summer-experience"));
  p.price.tiers[0] = { ...p.price.tiers[0], amount: 2500, display: "£2,500" };
  const model = priceDetails(p, "en", details);
  assert.equal(model.options[0].price, "£2,500");
  assert.equal(model.options[0].title, "Programme fee");
  assert.match(model.options[0].note, /not been specified/);
  assert(!model.options[0].includes.some((s) => /25 hours|6 nights/.test(s)));
});

test("non-residential fees never inherit residential room or meal inclusions", () => {
  const p = programs.find((p) => p.provider === "oxford_royale" && p.price.tiers.length > 1);
  for (const lang of ["en", "tr"]) {
    const model = priceDetails(p, lang, details);
    assert.equal(model.options.length, 2);
    assert.equal(model.options[0].includes.length, 3);
    assert.equal(model.options[1].includes.length, 1);
    assert.equal(model.options[1].excludes.length, 1);
    assert(model.options[1].note);
  }
});

test("football compares length and board and includes lunch only in the verified day profile", () => {
  const model = priceDetails(record("sportech-football"), "tr", details);
  assert.equal(model.options.length, 4);
  assert.match(model.options[0].title, /Konaklamalı · 1 hafta/);
  assert.match(model.options[3].title, /Gündüzlü \/ konaklamasız · 2 hafta/);
  assert(model.options[2].includes.some((s) => s.includes("Öğle yemeği")));
  assert.equal(model.options[2].note, "");
  const other = priceDetails(record("sportech-architecture-urban-design"), "tr", details);
  assert(!other.options[1].includes.some((s) => s.includes("yemeği")));
  assert(other.options[1].note);
});

test("campus lower/upper bounds are explained as a range, not bookable packages", () => {
  const p = programs.find((p) => p.price_scope === "campus_tuition_range");
  const model = priceDetails(p, "en", details);
  assert.equal(model.range, true);
  assert.equal(model.options.length, 0);
  const html = renderPriceDetails(p, "tr", details);
  assert.match(html.summary, /bu ders için kesin ücret değildir/);
  assert.equal(html.section, "");
});

test("historical fees remain historical, retain the campus, and exclude missing values", () => {
  const p = structuredClone(programs.find((p) => p.provider === "mpw"));
  p.historical_2026_fees_gbp.London.residential = null;
  const model = priceDetails(p, "tr", details);
  assert.equal(model.historical, true);
  assert.match(model.title, /2026/);
  assert.equal(model.options.length, 3);
  assert.match(model.options[0].title, /^Londra/);
  assert.match(model.options[0].price, /^£2,400$/);
  p.price.display = "£5,000";
  assert.equal(priceDetails(p, "en", details).historical, false);
});

test("identical source fee duplicates do not manufacture multiple packages", () => {
  const p = record("immerse-architecture-summer-school-cambridge");
  assert.equal(p.price.tiers.length, 2);
  assert.equal(priceDetails(p, "en", details).options.length, 0);
  assert.deepEqual(renderPriceDetails(p, "en", details), { summary: "", section: "" });
  const reformatted = structuredClone(p);
  reformatted.price.tiers[1].display = "£5995";
  assert.equal(priceDetails(reformatted, "en", details).options.length, 0);
});

test("unknown distinct prices remain separate and safely escape their text", () => {
  const p = { price: { currency: "GBP", tiers: [
    { label: '<img src=x onerror="alert(1)">', amount: 100 },
    { label: "Other option", amount: 200 }
  ] } };
  const model = priceDetails(p);
  assert.equal(model.options.length, 2);
  assert.match(model.explanation, /does not specify/);
  const html = renderPriceDetails(p, "en", {});
  assert(!html.section.includes("<img"));
  assert(html.section.includes("&lt;img"));
  assert(html.section.includes("£100"));
});

test("every catalogue price comparison has bilingual copy without changing source data", () => {
  const original = JSON.stringify(programs);
  for (const p of programs) {
    for (const lang of ["en", "tr"]) {
      const model = priceDetails(p, lang, details);
      if (model.options.length || model.range) {
        assert(model.title && model.explanation, p.id);
        for (const o of model.options) assert(o.title && o.price && (o.includes.length || o.note), p.id);
      }
      const html = renderPriceDetails(p, lang, details);
      assert(!/undefined|\bNaN\b/.test(html.section + html.summary), p.id);
    }
  }
  assert.equal(JSON.stringify(programs), original);
});
