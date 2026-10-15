import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const indexBytes = readFileSync(new URL("../index.html", import.meta.url));
const indexHtml = indexBytes.toString("utf8");

test("landing-page Turkish copy is valid UTF-8 without mojibake", () => {
  assert.equal(
    indexBytes.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf])),
    false,
    "index.html should not start with an unexpected UTF-8 BOM",
  );

  const mojibakeTokens = ["Ä±", "ÅŸ", "ÄŸ", "Ã¶", "Ã¼", "Ã§", "Ã–", "Ä°", "â†’"];
  for (const token of mojibakeTokens) {
    assert.equal(indexHtml.includes(token), false, `index.html contains mojibake token ${token}`);
  }

  assert.match(indexHtml, /Hakkımızda/);
  assert.match(indexHtml, /Bu yaz tatilini bir keşif yolculuğuna dönüştür/);
  assert.match(indexHtml, /Programları Gör/);
});

test("the public site opens without a password gate", () => {
  assert.doesNotMatch(indexHtml, /site-lock|site-locked|password-lock/);
  assert.doesNotMatch(indexHtml, /type=["']password["']/i);
  assert.match(indexHtml, /id="home-page"/);
});
