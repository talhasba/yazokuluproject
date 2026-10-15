import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const projectRoot = fileURLToPath(new URL("./", import.meta.url));
const runtimeFiles = [
  "robots.txt",
  "summary.md",
  "OZET.md",
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

function safeRelativePath(path) {
  const normalized = String(path).replace(/[?#].*$/, "").replace(/^\.\//, "").replace(/^\//, "").replaceAll("\\", "/");
  if (!normalized || isAbsolute(normalized) || normalized.split("/").includes("..")) throw new Error(`Unsafe deployment path: ${path}`);
  const absolute = resolve(projectRoot, normalized);
  const fromProject = relative(projectRoot, absolute);
  if (fromProject.startsWith("..") || isAbsolute(fromProject)) throw new Error(`Path leaves project: ${path}`);
  return normalized;
}

function collectAssetReferences(value, references) {
  if (typeof value === "string") {
    if (/^(?:\.\/|\/)?assets\//.test(value)) references.add(safeRelativePath(value));
    return;
  }
  if (Array.isArray(value)) return value.forEach((item) => collectAssetReferences(item, references));
  if (value && typeof value === "object") Object.values(value).forEach((item) => collectAssetReferences(item, references));
}

function runtimeCopyPlugin() {
  return {
    name: "summerbutwhere-runtime-copy",
    apply: "build",
    closeBundle() {
      const outputRoot = resolve(projectRoot, "dist");
      const files = new Set(runtimeFiles.map(safeRelativePath));
      runtimeFiles.filter((path) => path.endsWith(".json")).forEach((path) => {
        const source = resolve(projectRoot, safeRelativePath(path));
        collectAssetReferences(JSON.parse(readFileSync(source, "utf8")), files);
      });
      for (const path of files) {
        const source = resolve(projectRoot, path);
        if (!existsSync(source)) throw new Error(`Required runtime file is missing: ${path}`);
        const destination = resolve(outputRoot, path);
        mkdirSync(dirname(destination), { recursive: true });
        copyFileSync(source, destination);
      }
      copyFileSync(resolve(outputRoot, "index.html"), resolve(outputRoot, "404.html"));
      writeFileSync(resolve(outputRoot, ".nojekyll"), "");
    },
  };
}

export default defineConfig({
  publicDir: false,
  plugins: [react(), runtimeCopyPlugin()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    minify: false,
    sourcemap: true,
  },
  server: { host: "127.0.0.1" },
  optimizeDeps: { entries: ["index.html"] },
});
