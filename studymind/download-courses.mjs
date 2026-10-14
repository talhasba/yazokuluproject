// Downloads the HTML page of every course listed on the saved Study Mind
// "Work Experience / Career Programmes" page.
//
// The course cards are not plain <a> tags; the page builds them from a
// `var cardsData = [...]` JSON array, which is what this script reads.
//
// Usage:  node download-courses.mjs [input.html] [output-dir]
// Output: <output-dir>/<slug>.html for every course, plus index.json
//         (id, title, blurb, source link, image, saved file, status).

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const inputFile = path.resolve(
  process.argv[2] ?? path.join(here, "Study Mind Work Experience _ Career Programmes 2026.html"),
);
const outDir = path.resolve(process.argv[3] ?? path.join(here, "studymind-pages"));

const DELAY_MS = 750; // be polite to the server between requests
const RETRIES = 3;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function extractCards(html) {
  const start = html.indexOf("var cardsData =");
  if (start === -1) throw new Error("cardsData not found in input HTML");
  const arrStart = html.indexOf("[", start);
  // Walk to the matching bracket, ignoring brackets inside JSON strings.
  let depth = 0;
  let inString = false;
  for (let i = arrStart; i < html.length; i++) {
    const ch = html[i];
    if (inString) {
      if (ch === "\\") i++;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "[") depth++;
    else if (ch === "]" && --depth === 0) {
      return JSON.parse(html.slice(arrStart, i + 1));
    }
  }
  throw new Error("cardsData array is not terminated");
}

const slugOf = (link) =>
  new URL(link).pathname.split("/").filter(Boolean).pop() ?? "index";

async function fetchPage(url) {
  let lastError;
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        redirect: "follow",
        headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { html: await res.text(), finalUrl: res.url };
    } catch (err) {
      lastError = err;
      if (attempt < RETRIES) await sleep(1500 * attempt);
    }
  }
  throw lastError;
}

async function main() {
  const cards = extractCards(await readFile(inputFile, "utf8"));
  await mkdir(outDir, { recursive: true });
  console.log(`Found ${cards.length} courses in ${path.basename(inputFile)}`);

  const index = [];
  for (const [i, card] of cards.entries()) {
    const slug = slugOf(card.link);
    const file = `${slug}.html`;
    const entry = {
      id: card.id,
      title: card.title,
      text: card.text,
      link: card.link,
      image: card.image,
      file,
    };
    try {
      const { html, finalUrl } = await fetchPage(card.link);
      await writeFile(path.join(outDir, file), html, "utf8");
      Object.assign(entry, {
        status: "ok",
        final_url: finalUrl,
        bytes: Buffer.byteLength(html),
        fetched_at: new Date().toISOString(),
      });
      console.log(`[${i + 1}/${cards.length}] ok    ${file} (${entry.bytes} bytes)`);
    } catch (err) {
      Object.assign(entry, { status: "error", error: String(err.message ?? err) });
      console.error(`[${i + 1}/${cards.length}] FAIL  ${card.link} - ${entry.error}`);
    }
    index.push(entry);
    if (i < cards.length - 1) await sleep(DELAY_MS);
  }

  await writeFile(path.join(outDir, "index.json"), JSON.stringify(index, null, 2) + "\n", "utf8");
  const failed = index.filter((e) => e.status !== "ok");
  console.log(`\nDone: ${index.length - failed.length}/${index.length} saved to ${outDir}`);
  if (failed.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
