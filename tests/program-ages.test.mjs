import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const programs = JSON.parse(
  readFileSync(new URL("../data/programs.normalized.json", import.meta.url), "utf8"),
);

test("every catalogue program has an explicit age bracket", () => {
  const missing = programs.filter(
    (program) =>
      !Array.isArray(program.age_ranges) ||
      !program.age_ranges.some((range) => typeof range === "string" && range.trim()),
  );

  assert.deepEqual(
    missing.map((program) => program.id),
    [],
    "Programs without age brackets should use the 13-18 default",
  );
});
