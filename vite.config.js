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
  let deploymentBase = "/";
  return {
    name: "summerbutwhere-runtime-copy",
    apply: "build",
    configResolved(config) {
      deploymentBase = config.base.endsWith("/") ? config.base : `${config.base}/`;
    },
    writeBundle(outputOptions) {
      const outputRoot = resolve(projectRoot, outputOptions.dir || "dist");
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

      // GitHub Pages otherwise serves these clean URLs through 404.html. Writing
      // the app shell into each route directory makes refreshes and direct links
      // return a real page instead of depending on an inline redirect script.
      const shell = readFileSync(resolve(outputRoot, "index.html"), "utf8");
      const programs = JSON.parse(readFileSync(resolve(projectRoot, "data/programs.normalized.json"), "utf8"));
      const staticRoutes = [
        "about",
        "programs",
        ...programs.map(({ id }) => `programs/${encodeURIComponent(String(id))}`),
      ];
      for (const route of staticRoutes) {
        const destination = resolve(outputRoot, safeRelativePath(route), "index.html");
        const fromOutput = relative(outputRoot, destination);
        if (fromOutput.startsWith("..") || isAbsolute(fromOutput)) throw new Error(`Route leaves output directory: ${route}`);
        mkdirSync(dirname(destination), { recursive: true });
        writeFileSync(destination, shell);
      }

      const fallback = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Opening SummerButWhere…</title>
    <script>
      (() => {
        const base = ${JSON.stringify(deploymentBase)};
        const route = location.pathname.startsWith(base)
          ? location.pathname.slice(base.length)
          : location.pathname.replace(/^\\/+/, "");
        location.replace(base + "?__route=" + encodeURIComponent(route + location.search + location.hash));
      })();
    <\/script>
  </head>
  <body></body>
</html>
`;
      writeFileSync(resolve(outputRoot, "404.html"), fallback);
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
