import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
const read = (file) => JSON.parse(readFileSync(new URL(file, import.meta.url), "utf8"));
const programmes = read("../data/programs.normalized.json");
const candidates = read("../data/image-candidates.json");
const sources = read("../data/program-image-sources.json");

test("every programme has a distinct downloaded primary photograph", () => {
  assert.equal(Object.keys(sources.images).length, programmes.length);
  assert.equal(Object.keys(sources.failures).length, 0);
  const paths = new Set(), hashes = new Set(), canonical = new Set();
  for (const programme of programmes) {
    const image = sources.images[programme.id];
    assert(image, programme.id);
    assert.equal(candidates[programme.id][0], image.local_path, programme.id);
    assert.match(image.local_path, /^\/assets\/program-images\/unique\/[^/]+\.(jpg|png|webp|avif)$/);
    const file = new URL(`..${image.local_path}`, import.meta.url);
    assert(existsSync(file), image.local_path);
    const bytes = readFileSync(file);
    const hash = createHash("sha256").update(bytes).digest("hex");
    assert.equal(hash, image.sha256, programme.id);
    assert(!hashes.has(hash), `Repeated photograph: ${programme.id}`);
    assert(!paths.has(image.local_path));
    assert(!canonical.has(image.canonical_url));
    hashes.add(hash); paths.add(image.local_path); canonical.add(image.canonical_url);
    assert(image.width >= 700 && image.height >= 350, programme.id);
  }
});

test("photo provenance distinguishes provider imagery from reusable illustrative photos", () => {
  for (const [id, image] of Object.entries(sources.images)) {
    assert.match(image.source_page, /^https:\/\//, id);
    assert(image.artist, id);
    assert(image.description || image.title || image.program_title, id);
    assert.match(image.source_kind, /^(provider|illustrative)$/);
    if (image.source_kind === "illustrative") {
      assert(["Wikimedia Commons", "Openverse"].includes(image.source_platform || "Wikimedia Commons"));
      assert.match(image.license, /^CC BY(?:-SA)? [\d.]+$|^CC0|^Public domain$|^PDM/);
      assert(image.query);
    }
    assert.equal(image.changes, "None; original downloaded bytes");
  }
});

test("different programmes do not reuse perceptually near-identical photo variants", () => {
  const images = Object.entries(sources.images);
  const countBits = (n) => { let count = 0; while (n) { n &= n - 1n; count++; } return count; };
  for (let i = 0; i < images.length; i++) {
    for (let j = 0; j < i; j++) {
      const distance = countBits(BigInt(`0x${images[i][1].dhash}`) ^ BigInt(`0x${images[j][1].dhash}`));
      assert(distance > 3, `Near duplicate: ${images[i][0]} / ${images[j][0]}`);
    }
  }
});

test("the crop and visual review applies to the current photo collection", () => {
  const audit = read("../data/program-image-audit.json");
  const collection = Object.entries(sources.images).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
    .map(([id, image]) => `${id}:${image.sha256}\n`).join("");
  assert.equal(audit.collection_sha256, createHash("sha256").update(collection).digest("hex"));
  assert.equal(audit.input_photos, programmes.length);
  assert.equal(audit.visually_reviewed_photos, programmes.length);
  assert.equal(audit.served_photo_urls_checked, programmes.length);
  assert.deepEqual(audit.pairs, []);
});
