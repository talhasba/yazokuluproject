// Extracts Summer Discovery course text into de-duplicated "units" so each unique course is
// translated once.
//
//   node tools/extract-sd.mjs            writes data/digest-src/summer_discovery-units.json
//
// A unit is the parsed English structure of a program with the campus name replaced by {campus}.
// Records with the same unit share one Turkish translation (data/digest-src/summer_discovery-tr/*.json).

import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const programs = JSON.parse(readFileSync(join(root, "data/programs.normalized.json"), "utf8"));
const sd = programs.filter((p) => p.provider === "summer_discovery");

const clean = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function campusPatterns(location) {
  const names = new Set([location]);
  const l = location.replace(/^The /, "");
  names.add(l);
  if (/^University of /.test(l)) names.add(l.replace(/^University of /, "") + " ");
  if (location === "University of Michigan") ["Michigan", "U-M", "UMich"].forEach((n) => names.add(n));
  if (location === "Georgetown University") ["Georgetown"].forEach((n) => names.add(n));
  if (location === "Yale University") ["Yale"].forEach((n) => names.add(n));
  if (location === "Bryn Mawr College") ["Bryn Mawr"].forEach((n) => names.add(n));
  if (location === "Fairfield University") ["Fairfield"].forEach((n) => names.add(n));
  if (location === "University of Texas at Austin") ["University of Texas", "UT Austin", "UT"].forEach((n) => names.add(n));
  if (location === "UC Berkeley") ["University of California, Berkeley", "University of California Berkeley", "Berkeley"].forEach((n) => names.add(n));
  if (location === "UCLA Anderson School of Management") ["UCLA Anderson"].forEach((n) => names.add(n));
  return [...names].filter((n) => n.trim().length > 2).sort((a, b) => b.length - a.length);
}

function normalise(text, location) {
  let t = clean(text);
  for (const n of campusPatterns(location)) t = t.replace(new RegExp(`\\b${esc(n.trim())}\\b`, "g"), "{campus}");
  return t;
}

// Scraping artefacts: stray punctuation-only bullets, and "The source does not state ..." notes left in the data.
const isNoise = (s) => !/[A-Za-z]{3}/.test(s) || /^The source (does not|did not|doesn't)\b/i.test(s);
const bullets = (s) => {
  let items = clean(s).split(/\s*•\s*/).map(clean).filter(Boolean);
  // a few sources use "- item - item" instead of bullets
  if (items.length === 1 && /^-\s/.test(items[0])) items = items[0].split(/(?:^|\s)-\s+/).map(clean).filter(Boolean);
  return items.filter((x) => !isNoise(x));
};
const sentences = (s) => clean(s).split(/(?<=[.!?])\s+(?=[A-Z“"])/).map(clean).filter((x) => x && !isNoise(x));

function parse(p) {
  const sec = Object.fromEntries((p.curriculum_sections || []).map((c) => [clean(c.title).toLowerCase(), c.body || ""]));
  const uniq = (list) => list.filter((x, i) => list.indexOf(x) === i);
  const act = uniq(bullets(normalise(sec["activities"] || "", p.location)));
  const outRaw = normalise(sec["learning outcomes"] || "", p.location);
  const parts = outRaw.split(/\s*•\s*/).map(clean).filter(Boolean);
  // Some sources repeat the whole block or run the closing sentence into the last bullet, so bullets,
  // a leading "By the end of the course..." line and the closing "Students will leave with..." sentence are separated.
  const CLOSING = /\b((?:Students|Participants|You)\s+(?:will\s+)?(?:leave|take|walk|finish)\b.+)$/;
  let items = [], closing = "", intro = "";
  for (const part of parts) {
    if (/^By the end of/i.test(part) || /:\s*$/.test(part)) { intro ||= part; continue; }
    const m = CLOSING.exec(part);
    if (m) {
      const before = clean(part.slice(0, m.index));
      if (before) items.push(before);
      closing ||= clean(m[1].replace(/\s*By the end of the course.*$/i, ""));
    } else items.push(part);
  }
  items = uniq(items);
  const who = sentences(normalise(sec["who should attend"] || "", p.location));
  const short = sentences(normalise(p.description_short || "", p.location));
  return { short, act, outcomes: { intro, items, closing }, who };
}

// The focus line: whole sentences from the short description, dropping a final sentence the source cut off.
function focusFrom(short) {
  const ok = short.filter((s, i) => i < short.length - 1 || /[.!?”"]$/.test(s));
  let out = "";
  for (const s of ok) {
    if ((out + " " + s).trim().length > 260) break;
    out = (out + " " + s).trim();
  }
  return out || (ok[0] || short[0] || "").slice(0, 260);
}

// "completed 9th, 10th, 11th, or 12th grade" -> [9, 12]
function gradeRange(who) {
  const first = who.slice(0, 2).join(" ");
  const nums = [...first.matchAll(/\b(\d{1,2})(?:st|nd|rd|th)\b/g)].map((m) => +m[1]).filter((n) => n >= 1 && n <= 12);
  return nums.length ? [Math.min(...nums), Math.max(...nums)] : null;
}

const units = {};
const idToUnit = {};
for (const p of sd) {
  const u = parse(p);
  const hash = createHash("sha1").update(JSON.stringify(u)).digest("hex").slice(0, 10);
  idToUnit[p.id] = hash;
  units[hash] ||= { en: { ...u, focus: focusFrom(u.short), grades: gradeRange(u.who) }, ids: [] };
  units[hash].ids.push(p.id);
}

const stats = { records: sd.length, units: Object.keys(units).length };
const noAct = sd.filter((p) => !parse(p).act.length).length;
const noOut = sd.filter((p) => !parse(p).outcomes.items.length).length;
const noWho = sd.filter((p) => !parse(p).who.length).length;
console.log(JSON.stringify({ ...stats, noActivities: noAct, noOutcomes: noOut, noWho }));

// Translation worksheet: node tools/extract-sd.mjs --sheet <path>
const sheetAt = process.argv.indexOf("--sheet");
if (sheetAt > -1) {
  const byId = new Map(sd.map((p) => [p.id, p]));
  const order = Object.entries(units).sort(([, a], [, b]) => {
    const pa = byId.get(a.ids[0]), pb = byId.get(b.ids[0]);
    return (pa.subject + pa.title).localeCompare(pb.subject + pb.title);
  });
  const lines = order.map(([h, u]) => {
    const p = byId.get(u.ids[0]);
    const campuses = [...new Set(u.ids.map((i) => byId.get(i).location))].join(", ");
    const e = u.en;
    return [
      `## ${h} | ${p.title} | ${p.subject} | ${campuses} | grades ${e.grades ? e.grades.join("-") : "?"}`,
      `FOCUS: ${e.focus}`,
      `ACT: ${e.act.join(" || ")}`,
      `OUT: ${e.outcomes.items.join(" || ")}`,
      `CLOSE: ${e.outcomes.closing}`,
      `WHO: ${e.who.slice(0, 4).join(" || ")}`,
      ""
    ].join("\n");
  });
  writeFileSync(process.argv[sheetAt + 1], lines.join("\n"));
  console.log(`wrote worksheet with ${order.length} units to ${process.argv[sheetAt + 1]}`);
}

if (process.argv.includes("--write")) {
  writeFileSync(join(root, "data/digest-src/summer_discovery-units.json"), JSON.stringify({ idToUnit, units }, null, 1));
  console.log("wrote data/digest-src/summer_discovery-units.json");
}
