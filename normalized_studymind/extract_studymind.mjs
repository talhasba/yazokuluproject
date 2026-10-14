// Extracts structured facts and copy from the saved Study Mind course pages
// (studymind/studymind-pages/*.html, produced by studymind/download-courses.mjs).
//
// Two sources are combined per page:
//   1. The page's JSON-LD "Course" object: weekly start dates and the price offers.
//   2. The visible text: ages, duration, class size, location, highlights and
//      the per-plan module lists from the pricing table.
//
// Exported for normalize_studymind.mjs; run directly to print the extraction as JSON:
//   node normalized_studymind/extract_studymind.mjs

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const PAGES_DIR = join(HERE, "..", "studymind", "studymind-pages");

const ENTITIES = { "&amp;": "&", "&#038;": "&", "&nbsp;": " ", "&#8217;": "’", "&#8211;": "–", "&#8220;": "“", "&#8221;": "”", "&#8216;": "‘", "&#039;": "'", "&quot;": '"' };
const decode = (s) => s.replace(/&#?\w+;/g, (m) => ENTITIES[m] ?? m);
const clean = (s) => decode(s).replace(/\s+/g, " ").trim();

function visibleLines(html) {
  let h = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    .replace(/<svg[\s\S]*?<\/svg>/gi, "");
  const body = h.indexOf("<body");
  if (body >= 0) h = h.slice(body);
  return h
    .replace(/<\/(p|div|h\d|li|section|tr|br|ul|span|a|button)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .split("\n")
    .map(clean)
    .filter(Boolean);
}

function jsonLdCourse(html) {
  const h = html.replace(/\\\//g, "/");
  const blocks = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  for (const block of blocks) {
    let data;
    try { data = JSON.parse(block); } catch { continue; }
    const found = (function walk(o) {
      if (Array.isArray(o)) { for (const x of o) { const r = walk(x); if (r) return r; } return null; }
      if (o && typeof o === "object") {
        if (o.hasCourseInstance) return o;
        for (const v of Object.values(o)) { const r = walk(v); if (r) return r; }
      }
      return null;
    })(data);
    if (found) return found;
  }
  return null;
}

const idx = (lines, pred, from = 0) => {
  for (let i = from; i < lines.length; i++) if (pred(lines[i], i)) return i;
  return -1;
};

// The pricing table lists each plan as: "<n> week(s)", plan name, price, tagline,
// optional "Processing . . .", "Book Now", then its module lines.
const PLAN_RE = /^(\d+)\s*(day|week)s?$/i;
const PRICE_RE = /^(?:£\s*)?(\d{3,5})(?:\.\d\d)?$/;
const PLAN_STOP = /^(Most popular|Features by Plan|Compare plans|ALUMNI|Hear from Students)$/i;

function parsePlans(lines) {
  const start = idx(lines, (l) => /^Pricing(\s+for\s+\d{4})?$/i.test(l) || /^Pricing for \d{4}/i.test(l));
  if (start < 0) return { heading: "", plans: [] };
  const heading = lines.slice(start, start + 2).join(" ");
  const end = idx(lines, (l) => /^Features by Plan$/i.test(l), start);
  const block = lines.slice(start, end < 0 ? start + 80 : end);
  const plans = [];
  let current = null;
  for (let i = 0; i < block.length; i++) {
    const line = block[i];
    if (PLAN_RE.test(line) && PRICE_RE.test(block[i + 2] ?? "")) {
      const [, n, unit] = PLAN_RE.exec(line);
      current = { duration: `${n} ${unit.toLowerCase()}${Number(n) === 1 ? "" : "s"}`, name: block[i + 1], price: Number(PRICE_RE.exec(block[i + 2])[1]), tagline: block[i + 3] ?? "", items: [] };
      plans.push(current);
      i += 3;
      continue;
    }
    if (!current) continue;
    if (/^(Book Now|Processing[ .]*|Most popular)$/i.test(line)) continue;
    current.items.push(line);
  }
  return { heading, plans };
}

// Highlight cards are "title" / "description" line pairs between the HIGHLIGHTS
// heading and the "Plan Your Path" (or timetable) heading.
function parseHighlights(lines) {
  const start = idx(lines, (l) => /^HIGHLIGHTS$/i.test(l));
  if (start < 0) return { intro: "", items: [] };
  let end = idx(lines, (l) => /^(Plan Your Path|What you'll do each week|WHY STUDY MIND|Tutors)$/i.test(l), start + 1);
  if (end < 0) end = start + 40;
  const block = lines.slice(start + 1, end);
  const items = [];
  const intro = [];
  let i = 0;
  // Leading heading line(s) and intro sentence precede the first card.
  while (i < block.length) {
    const next = block[i + 1];
    const looksLikeTitle = block[i].length <= 90 && !/[.!?]$/.test(block[i]) && next && next.length > block[i].length;
    if (looksLikeTitle && intro.length >= 1) break;
    intro.push(block[i]);
    i++;
  }
  for (; i < block.length; i += 2) {
    if (block[i + 1] === undefined) { items.push({ title: block[i], body: "" }); break; }
    items.push({ title: block[i], body: block[i + 1] });
  }
  return { intro: intro.join(" "), items };
}

function listAfter(lines, headingRe, stopRe, max = 14) {
  const s = idx(lines, (l) => headingRe.test(l));
  if (s < 0) return [];
  const out = [];
  for (let i = s + 1; i < lines.length && out.length < max; i++) {
    if (stopRe.test(lines[i])) break;
    out.push(lines[i]);
  }
  return out;
}

export function extractPage(file) {
  const html = readFileSync(join(PAGES_DIR, file), "utf8");
  const lines = visibleLines(html);
  const ld = jsonLdCourse(html);
  const text = lines.join("\n");

  const field = (re) => (re.exec(text) || [])[1]?.trim() ?? "";
  const ages = field(/^Ages:\s*(.+)$/m);
  const duration = field(/^Duration:\s*(.+)$/m);
  const classSize = field(/^Class size:\s*(.+)$/m);
  const location = field(/^Location\s*\|\s*(.+)$/m);

  const aboutStart = idx(lines, (l) => /^On this page you can find$/i.test(l));
  const factsStart = idx(lines, (l) => /^Ages:/.test(l));
  const about = aboutStart >= 0 && factsStart > aboutStart ? lines.slice(aboutStart + 2, factsStart) : [];

  const heroStart = idx(lines, (l) => /^Official UK Government Partner/i.test(l));
  const heroEnd = idx(lines, (l) => /^(Enroll now|Enquire now)$/i.test(l), heroStart);
  const hero = heroStart >= 0 && heroEnd > heroStart ? lines.slice(heroStart + 1, heroEnd) : [];

  const { heading: pricingHeading, plans } = parsePlans(lines);
  const highlights = parseHighlights(lines);
  const instances = (ld?.hasCourseInstance || []).map((i) => ({ start: i.startDate, end: i.endDate }));
  const offers = [];
  const seen = new Set();
  for (const o of JSON.stringify(ld || {}).matchAll(/"@type":"Offer","name":"([^"]+)"[^{}]*?"priceCurrency":"(\w+)","price":"([\d.]+)"/g)) {
    const key = o[1];
    if (!seen.has(key)) { seen.add(key); offers.push({ name: o[1], currency: o[2], price: Number(o[3]) }); }
  }

  const comingSoon = /coming soon/i.test(hero.join(" ")) || /\bCOMING SOON\b/.test(text) || /Register your interest/i.test(text);
  return {
    file,
    ld_name: ld?.name ?? "",
    hero,
    about,
    ages, duration, class_size: classSize, location,
    highlights_intro: highlights.intro,
    highlights: highlights.items,
    pricing_heading: pricingHeading,
    plans,
    offers,
    instances,
    coming_soon: comingSoon,
    accommodation: listAfter(lines, /^(Where do students stay\?|Where will the students stay\?)$/i, /^(Contact Us|ALUMNI|SAFETY AND SECURITY)$/i, 6),
    benefits: listAfter(lines, /^(Benefits for you|Why Choose Our .*)$/i, /^(Enroll now|Enquire now|SUMMER CAREER CAMP COMING SOON)$/i, 14),
    why: listAfter(lines, /^WHY STUDY MIND$/i, /^(Enroll now|Enquire now)$/i, 24),
    mentions: {
      certificate: /certificate/i.test(text),
      ucas: /UCAS/i.test(text),
      ramsay_hall: /Ramsay Hall/i.test(text),
      bursary: /bursary/i.test(text),
    },
  };
}

export function extractAll() {
  return readdirSync(PAGES_DIR).filter((f) => f.endsWith(".html")).sort().map(extractPage);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  console.log(JSON.stringify(extractAll(), null, 2));
}
