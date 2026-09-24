// Builds data/program-digests.json from hand-reviewed sources in data/digest-src/.
//
//   node tools/build-digests.mjs
//
// A digest is the short, structured version of a program page (focus, topics, highlights,
// what you'll do, outcomes). Facts such as age, price, dates and location are NOT stored here;
// the page reads them from programs.normalized.json so they can never disagree.
//
// Fails (exit 1) on any validation error so bad content cannot ship silently.

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));

const programs = read("data/programs.normalized.json");
const byId = new Map(programs.map((p) => [p.id, p]));
const errors = [];
const fail = (id, msg) => errors.push(`${id}: ${msg}`);

const LIMITS = { focus: 330, tag: 34, hl: 150, trackText: 340, doLead: 70, doText: 260, outcome: 150, longItem: 460 };
const norm = (s) => String(s ?? "").trim().toLowerCase().replace(/\s+/g, " ");

function checkLang(id, lang, d) {
  const need = (cond, msg) => { if (!cond) fail(id, `${lang}: ${msg}`); };
  need(d.focus && d.focus.length <= LIMITS.focus, `focus missing or > ${LIMITS.focus} chars`);
  need(Array.isArray(d.tags) && d.tags.length >= 2 && d.tags.length <= 6, "tags must be 2-6 items");
  (d.tags || []).forEach((t) => need(t && t.length <= LIMITS.tag, `tag too long/empty: "${t}"`));
  need(Array.isArray(d.highlights) && d.highlights.length <= 5, "highlights must be at most 5 items");
  (d.highlights || []).forEach((h) => need(h && h.length <= LIMITS.hl, `highlight too long/empty: "${h}"`));
  (d.tracks || []).forEach((t) => need(t.age && t.text && t.text.length <= LIMITS.trackText, `bad track ${t.age}`));
  (d.do || []).forEach((x) => need((x.lead || x.text) && (x.lead || "").length <= LIMITS.doLead && (x.text || "").length <= LIMITS.doText, `bad do item "${x.lead || x.text}"`));
  (d.outcomes || []).forEach((o) => need(o && o.length <= LIMITS.longItem, `bad outcome "${o}"`));
  (d.fit || []).forEach((o) => need(o && o.length <= LIMITS.longItem, `bad fit item "${o}"`));
  (d.extras || []).forEach((o) => need(o && o.length <= LIMITS.outcome, `bad extras item "${o}"`));
  if (d.schedule) {
    need(d.schedule.title && d.schedule.items?.length, "schedule needs title and items");
    (d.schedule.items || []).forEach((i) => need(i.text && i.text.length <= LIMITS.doText, `bad schedule item "${i.text}"`));
  }
  const all = JSON.stringify(d);
  need(!/\bundefined\b|\bTODO\b|\bTBD\b|lorem ipsum/i.test(all), "contains placeholder text");
  const dup = new Set();
  [...(d.tags || []), ...(d.highlights || [])].forEach((s) => { const k = norm(s); need(!dup.has(k), `duplicate text "${s}"`); dup.add(k); });
}

function autoFlags(p) {
  const f = [];
  if (p.publish_status === "needs_review") f.push("Dataset marks this record needs_review");
  if (!p.dates?.length) f.push("No dates listed in the dataset");
  if (!p.duration) f.push("No duration listed in the dataset");
  if (!p.age_ranges?.length) f.push("No age range listed in the dataset");
  if (!p.price?.display) f.push("No price listed in the dataset");
  const tiers = (p.price?.tiers || []).map((t) => `${t.label}|${t.amount}`);
  if (tiers.length > 1 && new Set(tiers).size < tiers.length) f.push("Price tiers are duplicated in the dataset");
  if ((p.price?.tiers || []).some((t) => /campus range/i.test(t.label))) f.push("Price is a campus-wide range, not specific to this course");
  return f;
}

/* ---------- Immerse ---------- */
function buildImmerse(out) {
  const templates = read("data/digest-src/immerse-templates.json");
  const kinds = ["academic", "career"];
  const src = {};
  const dir = join(root, "data/digest-src/immerse");
  for (const file of readdirSync(dir).filter((n) => n.endsWith(".json"))) {
    for (const [k, v] of Object.entries(read(`data/digest-src/immerse/${file}`))) {
      if (src[k]) fail(`immerse-${k}`, `defined twice (also in ${file})`);
      src[k] = v;
    }
  }
  // The online research programme keeps its dedicated pricing/pathway page.
  const skip = new Set(["immerse-online-research-programme"]);
  const records = programs.filter((p) => p.provider === "immerse" && !skip.has(p.id));

  for (const key of Object.keys(src)) if (!byId.has(`immerse-${key}`)) fail(`immerse-${key}`, "source entry has no matching program");

  for (const p of records) {
    const key = p.id.replace(/^immerse-/, "");
    const s = src[key];
    if (!s) { fail(p.id, "no source entry in data/digest-src/immerse/"); continue; }

    let tpl = null;
    if (s.type !== "custom") {
      const titles = new Set((p.curriculum_sections || []).map((c) => norm(c.title)));
      const kind = kinds.find((k) => {
        const want = templates[k].sectionTitles.map(norm);
        return want.length === titles.size && want.every((t) => titles.has(t));
      });
      if (!kind) { fail(p.id, `curriculum sections match no template: ${[...titles].join(" | ")}`); continue; }
      tpl = templates[kind];
    }

    const digest = { v: 1, provider: "immerse" };
    for (const lang of ["en", "tr"]) {
      const l = s[lang];
      if (!l) { fail(p.id, `missing "${lang}" block`); continue; }
      digest[lang] = {
        focus: l.focus,
        tags: l.tags,
        highlights: l.hl,
        ...(l.tracks?.length ? { tracks: l.tracks.map(([age, text]) => ({ age, text })) } : {}),
        ...(tpl ? { doTitle: tpl[lang].doTitle, do: tpl[lang].do, outcomes: tpl[lang].outcomes } : {})
      };
      checkLang(p.id, lang, digest[lang]);
    }
    digest.review = { flags: [...(s.flags || []), ...autoFlags(p)] };
    out[p.id] = digest;
  }
}

/* ---------- Authored providers ----------
 * data/digest-src/<provider>/*.json holds one entry per program (key = program id without the
 * provider prefix). Optional data/digest-src/<provider>-templates.json adds shared blocks:
 *   { "common": { "en": {"doTitle","doAppend":[{lead,text}],"outcomes":[...]}, "tr": {...} },
 *     "cities": { "<key>": { "en": {"extras":[...]}, "tr": {...} } } }
 * An entry may set "city" to pull that city's extras. Entry fields win; shared blocks are appended.
 */
const PREFIX = {
  oxford_royale: "oxford-royale-", investin: "investin-", stclares: "stclares-", bucksmore: "bucksmore-",
  mpw: "mpw-", edconic: "edconic-", sportech: "sportech-", summer_discovery: "summer-discovery-"
};

function optionalJson(path) {
  try { return read(path); } catch { return null; }
}

function buildAuthored(out, provider, skip = new Set()) {
  const dir = join(root, `data/digest-src/${provider}`);
  let files;
  try { files = readdirSync(dir).filter((n) => n.endsWith(".json")); } catch { return; }
  const tpl = optionalJson(`data/digest-src/${provider}-templates.json`) || {};
  const src = {};
  for (const file of files) {
    for (const [k, v] of Object.entries(read(`data/digest-src/${provider}/${file}`))) {
      if (src[k]) fail(`${provider}:${k}`, `defined twice (also in ${file})`);
      src[k] = v;
    }
  }
  const prefix = PREFIX[provider];
  for (const key of Object.keys(src)) if (!byId.has(prefix + key)) fail(prefix + key, "source entry has no matching program");

  for (const p of programs.filter((x) => x.provider === provider && !skip.has(x.id))) {
    const s = src[p.id.slice(prefix.length)];
    if (!s) { fail(p.id, `no source entry in data/digest-src/${provider}/`); continue; }
    if (s.city && !tpl.cities?.[s.city]) { fail(p.id, `unknown city "${s.city}"`); continue; }

    const digest = { v: 1, provider };
    for (const lang of ["en", "tr"]) {
      const l = s[lang];
      if (!l) { fail(p.id, `missing "${lang}" block`); continue; }
      // "noCommon" skips every shared block; "noDoAppend" keeps shared outcomes but not the shared step.
      const common = s.noCommon ? {} : (tpl.common?.[lang] || {});
      const city = s.city ? tpl.cities[s.city][lang] || {} : {};
      const steps = [...(l.do || []).map(([lead, text]) => ({ lead, text })), ...(s.noDoAppend ? [] : common.doAppend || [])];
      const d = {
        focus: l.focus, tags: l.tags, highlights: l.hl,
        ...(l.tracks?.length ? { tracks: l.tracks.map(([age, text]) => ({ age, text })) } : {}),
        ...(steps.length ? { doTitle: l.doTitle || tpl.common?.[lang]?.doTitle, do: steps } : {}),
        ...([...(l.outcomes || []), ...(common.outcomes || [])].length ? { outcomes: [...(l.outcomes || []), ...(common.outcomes || [])] } : {}),
        ...((l.fit || common.fit)?.length ? { fit: l.fit || common.fit } : {}),
        ...([...(l.extras || []), ...(city.extras || [])].length ? { extras: [...(l.extras || []), ...(city.extras || [])] } : {}),
        ...(l.schedule ? { schedule: { title: l.schedule.title, items: l.schedule.items.map(([time, text]) => (text === undefined ? { text: time } : { time, text })), ...(l.schedule.note ? { note: l.schedule.note } : {}) } } : {})
      };
      if (d.doTitle === undefined && d.do) fail(p.id, `${lang}: "do" items need a doTitle`);
      checkLang(p.id, lang, d);
      digest[lang] = d;
    }
    digest.review = { flags: [...(s.flags || []), ...(s.noCommon ? [] : tpl.commonFlags || []), ...autoFlags(p)] };
    out[p.id] = digest;
  }
}

/* ---------- Summer Discovery ----------
 * English comes from tools/extract-sd.mjs (data/digest-src/summer_discovery-units.json): the source is
 * already bulleted, so nothing is rewritten. Turkish is hand-translated per unit in
 * data/digest-src/summer_discovery-tr/*.json and must match the English lists item for item.
 * Records whose unit has no translation yet are skipped (and counted).
 */
function buildSummerDiscovery(out) {
  const units = optionalJson("data/digest-src/summer_discovery-units.json");
  if (!units) return;
  const tr = {};
  const dir = join(root, "data/digest-src/summer_discovery-tr");
  let files = [];
  try { files = readdirSync(dir).filter((n) => n.endsWith(".json")); } catch { /* none yet */ }
  for (const file of files) {
    for (const [k, v] of Object.entries(read(`data/digest-src/summer_discovery-tr/${file}`))) {
      if (tr[k]) fail(`sd-unit ${k}`, `translated twice (also in ${file})`);
      tr[k] = v;
    }
  }
  for (const k of Object.keys(tr)) if (!units.units[k]) fail(`sd-unit ${k}`, "translation has no matching unit");

  let skipped = 0;
  for (const p of programs.filter((x) => x.provider === "summer_discovery")) {
    const hash = units.idToUnit[p.id];
    const u = units.units[hash]?.en;
    const t = tr[hash];
    if (!u || !t) { skipped++; continue; }
    const c = (s) => String(s ?? "").replaceAll("{campus}", p.location);
    const who = u.who.slice(0, 4);
    const eq = (a, b, what) => { if ((a || []).length !== (b || []).length) fail(`sd-unit ${hash}`, `${what}: ${a?.length} translated vs ${b?.length} English`); };
    eq(t.act, u.act, "activities"); eq(t.out, u.outcomes.items, "outcomes"); eq(t.who, who, "who-should-attend");
    if (!!t.close !== !!u.outcomes.closing) fail(`sd-unit ${hash}`, "closing sentence present in only one language");
    if (!t.tags?.en?.length || !t.tags?.tr?.length) { fail(`sd-unit ${hash}`, "missing tags"); continue; }

    const grades = u.grades;
    const facts = grades ? { age: { en: `Completed grades ${grades[0] === grades[1] ? grades[0] : grades.join("–")}`, tr: `${grades[0] === grades[1] ? grades[0] : grades.join("–")}. sınıfı bitirmiş` } } : undefined;
    const digest = { v: 1, provider: "summer_discovery", ...(facts ? { facts } : {}) };
    digest.en = {
      focus: c(u.focus), tags: t.tags.en, highlights: [],
      ...(u.act.length ? { doTitle: "What you'll do", do: u.act.map((x) => ({ text: c(x) })) } : {}),
      ...((u.outcomes.items.length || u.outcomes.closing) ? { outcomes: [...u.outcomes.items.map(c), ...(u.outcomes.closing ? [c(u.outcomes.closing)] : [])] } : {}),
      fit: who.map(c)
    };
    digest.tr = {
      focus: c(t.focus), tags: t.tags.tr, highlights: [],
      ...(u.act.length ? { doTitle: "Neler yapacaksınız", do: t.act.map((x) => ({ text: c(x) })) } : {}),
      ...((t.out?.length || t.close) ? { outcomes: [...(t.out || []).map(c), ...(t.close ? [c(t.close)] : [])] } : {}),
      fit: (t.who || []).map(c)
    };
    checkLang(p.id, "en", digest.en);
    checkLang(p.id, "tr", digest.tr);
    digest.review = { flags: [...(t.flags || []), ...autoFlags(p)] };
    out[p.id] = digest;
  }
  if (skipped) console.log(`Summer Discovery: ${skipped} records skipped (no Turkish translation yet)`);
}

/* ---------- run ---------- */
const out = {};
buildImmerse(out);
for (const provider of Object.keys(PREFIX)) if (provider !== "summer_discovery") buildAuthored(out, provider);
buildSummerDiscovery(out);

if (errors.length) {
  console.error(`\n${errors.length} problem(s):\n` + errors.map((e) => "  - " + e).join("\n"));
  process.exit(1);
}

const lines = Object.entries(out).map(([id, d]) => `  ${JSON.stringify(id)}: ${JSON.stringify(d)}`);
const file = `{\n  "_meta": ${JSON.stringify({ version: 1, count: lines.length, note: "Generated by tools/build-digests.mjs. Do not edit by hand." })},\n${lines.join(",\n")}\n}\n`;
writeFileSync(join(root, "data/program-digests.json"), file);

const tracks = Object.values(out).filter((d) => d.en.tracks).length;
const flagged = Object.values(out).filter((d) => d.review.flags.length).length;
console.log(`Wrote data/program-digests.json: ${lines.length} digests (${tracks} with age tracks, ${flagged} with review flags).`);
