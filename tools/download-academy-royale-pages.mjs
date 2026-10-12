// Downloads the course pages listed on a saved copy of academyroyaleinternational.com/courses.
//
//   node tools/download-academy-royale-pages.mjs [--listing <saved .html>] [--out <dir>] [--force] [--delay <ms>]
//
// The saved listing shows 57 cards, but only ~24 are real pages: the rest are subjects inside
// Broadening Horizons / New Perspectives and link to "#mini-..." anchors on those two pages.
// URLs are de-duplicated on everything before "#", each page is fetched once, and an index.json
// records which listing cards (title, price, ages, location) point at which saved file.
//
// Re-running skips files that already exist; pass --force to refetch them.

import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";

const DEFAULT_LISTING =
  "C:\\Users\\apply\\OneDrive\\Belgeler\\yazokul\\Courses _ Academy Royale International.html";

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : fallback;
};
const listing = opt("listing", DEFAULT_LISTING);
const outDir = opt("out", join(dirname(listing), "academy-royale-pages"));
const delayMs = Number(opt("delay", "1000"));
const force = args.includes("--force");

const UA = "Mozilla/5.0 (compatible; yazokul-catalogue-research; personal use)";
const SITE = "https://www.academyroyaleinternational.com";

const decode = (s) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
const clean = (s) => decode(s).replace(/\s+/g, " ").trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- 1. read the cards from the saved listing ---------------------------------------------

const html = readFileSync(listing, "utf8");
const start = html.search(/Showing \d+ of \d+ courses/);
if (start < 0) throw new Error(`No "Showing N of N courses" grid found in ${listing}`);
const grid = html.slice(start, html.indexOf("</ul>", start));

const cards = grid
  .split(/<li style="[^"]*">/)
  .slice(1)
  .map((li) => {
    const href = /href="([^"]+)"/.exec(li)?.[1];
    if (!href) return null;
    const text = li
      .replace(/<img[^>]*>/g, "")
      .replace(/<[^>]+>/g, "|")
      .split("|")
      .map(clean)
      .filter(Boolean);
    return { href: decode(href), text };
  })
  .filter(Boolean);

console.log(`Listing: ${cards.length} cards`);

// --- 2. group cards by page URL (fragment stripped) ---------------------------------------

const pages = new Map(); // url -> { url, file, cards: [...] }
for (const card of cards) {
  const url = new URL(card.href, SITE);
  const fragment = url.hash;
  url.hash = "";
  const key = url.href;
  if (!pages.has(key)) {
    const slug = url.pathname.replace(/^\/|\/$/g, "").replace(/\//g, "__") || "index";
    pages.set(key, { url: key, file: `${slug}.html`, cards: [] });
  }
  pages.get(key).cards.push({ fragment, text: card.text });
}
console.log(`Unique pages: ${pages.size}\n`);

// --- 3. download --------------------------------------------------------------------------

mkdirSync(outDir, { recursive: true });
const results = [];
let n = 0;

for (const page of pages.values()) {
  n++;
  const path = join(outDir, page.file);
  const label = `[${String(n).padStart(2)}/${pages.size}] ${page.file}`;

  if (!force && existsSync(path) && statSync(path).size > 0) {
    console.log(`${label}  skipped (exists)`);
    results.push({ ...page, status: "skipped", bytes: statSync(path).size });
    continue;
  }

  let status = "failed";
  let bytes = 0;
  let error;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(page.url, {
        headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml" },
        redirect: "follow",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const type = res.headers.get("content-type") ?? "";
      if (!type.includes("html")) throw new Error(`unexpected content-type ${type}`);
      const body = await res.text();
      writeFileSync(path, body, "utf8");
      bytes = Buffer.byteLength(body);
      status = "downloaded";
      error = undefined;
      break;
    } catch (e) {
      error = e.message;
      if (attempt < 3) await sleep(delayMs * attempt * 2);
    }
  }

  console.log(`${label}  ${status}${status === "downloaded" ? ` (${(bytes / 1024).toFixed(0)} KB)` : `: ${error}`}`);
  results.push({ ...page, status, bytes, ...(error ? { error } : {}) });
  if (n < pages.size) await sleep(delayMs);
}

// --- 4. index + summary -------------------------------------------------------------------

writeFileSync(
  join(outDir, "index.json"),
  JSON.stringify({ source: listing, fetchedAt: new Date().toISOString(), pages: results }, null, 2),
  "utf8",
);

const count = (s) => results.filter((r) => r.status === s).length;
console.log(`\nDone: ${count("downloaded")} downloaded, ${count("skipped")} skipped, ${count("failed")} failed`);
console.log(`Saved to ${outDir}`);
if (count("failed")) process.exitCode = 1;
