import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import { basename, dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const outputRoot = resolve(projectRoot, "site-deploy");

const runtimeFiles = [
  "summary.md",
  "OZET.md",
  "index.html",
  "script.js",
  "app-loader.js",
  "style.css",
  "online-research-options.js",
  "online-research-options.css",
  "home-page.js",
  "home-page.css",
  "catalogue-cleanup.js",
  "catalogue-cleanup.css",
  "program-page.js",
  "program-page.css",
  "program-pricing.js",
  "palette.css",
  "about-page.js",
  "about-page.css",
  "background-rays.css",
  "seo.js",
  "robots.txt",
  "data/programs.normalized.json",
  "data/program-digests.json",
  "data/image-candidates.json",
  "data/program-editor-overrides.json",
  "data/price-inclusions.json",
  "data/program-image-sources.json",
  "assets/program-images/image-sources.json",
  "assets/summerbutwhere-logo.png",
  "assets/asba-logo.png",
  "assets/Experience-Cambridge-1-1024x660.jpg-DppmgKJn.webp",
];

const referenceFiles = [
  ...runtimeFiles.filter((path) => path.endsWith(".json")),
  ...runtimeFiles.filter((path) => /\.(?:html|css|js)$/.test(path)),
];

function normalizeRelativePath(path) {
  const normalized = path
    .replace(/[?#].*$/, "")
    .replace(/^\.\//, "")
    .replace(/^\//, "")
    .replaceAll("\\", "/");

  if (!normalized || isAbsolute(normalized) || normalized.includes("..")) {
    throw new Error(`Unsafe deployment path: ${path}`);
  }

  return normalized;
}

function assertProjectFile(relativePath) {
  const normalized = normalizeRelativePath(relativePath);
  const absolutePath = resolve(projectRoot, normalized);
  const projectRelative = relative(projectRoot, absolutePath);

  if (projectRelative.startsWith("..") || isAbsolute(projectRelative)) {
    throw new Error(`Path leaves the project directory: ${relativePath}`);
  }
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    throw new Error(`Required deployment file is missing: ${normalized}`);
  }

  return { absolutePath, normalized };
}

function collectJsonAssetReferences(value, references) {
  if (typeof value === "string") {
    if (/^(?:\.\/|\/)?assets\//.test(value)) {
      references.add(normalizeRelativePath(value));
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectJsonAssetReferences(item, references));
    return;
  }

  if (value && typeof value === "object") {
    Object.values(value).forEach((item) =>
      collectJsonAssetReferences(item, references),
    );
  }
}

function collectTextAssetReferences(text, references) {
  const matches = text.matchAll(/(?:\.\/|\/)?assets\/[A-Za-z0-9_@%+.,()\-\/]+/g);
  for (const match of matches) {
    references.add(normalizeRelativePath(match[0]));
  }
}

function copyProjectFile(relativePath) {
  const { absolutePath, normalized } = assertProjectFile(relativePath);
  const destination = resolve(outputRoot, normalized);
  mkdirSync(dirname(destination), { recursive: true });
  copyFileSync(absolutePath, destination);
  return statSync(absolutePath).size;
}

if (
  dirname(outputRoot) !== resolve(projectRoot) ||
  basename(outputRoot) !== "site-deploy"
) {
  throw new Error(`Refusing to rebuild unexpected output path: ${outputRoot}`);
}

const filesToCopy = new Set(runtimeFiles.map(normalizeRelativePath));

for (const referenceFile of referenceFiles) {
  const { absolutePath } = assertProjectFile(referenceFile);
  const text = readFileSync(absolutePath, "utf8");

  if (referenceFile.endsWith(".json")) {
    collectJsonAssetReferences(JSON.parse(text), filesToCopy);
  } else {
    collectTextAssetReferences(text, filesToCopy);
  }
}

for (const relativePath of filesToCopy) {
  assertProjectFile(relativePath);
}

rmSync(outputRoot, { recursive: true, force: true });
mkdirSync(outputRoot, { recursive: true });

let totalBytes = 0;
for (const relativePath of [...filesToCopy].sort()) {
  totalBytes += copyProjectFile(relativePath);
}

for (const relativePath of filesToCopy) {
  const { absolutePath, normalized } = assertProjectFile(relativePath);
  const deployedPath = resolve(outputRoot, normalized);
  if (!existsSync(deployedPath)) {
    throw new Error(`Deployment copy is incomplete: ${normalized}`);
  }
  if (statSync(absolutePath).size !== statSync(deployedPath).size) {
    throw new Error(`Deployment copy size mismatch: ${normalized}`);
  }
}

console.log(`Built ${outputRoot}`);
console.log(`Files: ${filesToCopy.size}`);
console.log(`Size: ${(totalBytes / 1024 / 1024).toFixed(2)} MiB`);
