import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const inputRoot = resolve(projectRoot, "dist");
const outputRoot = resolve(projectRoot, "site-deploy");

if (!existsSync(resolve(inputRoot, "index.html"))) {
  throw new Error("dist/index.html is missing. Run the Vite build before creating the deployment copy.");
}
if (dirname(inputRoot) !== resolve(projectRoot) || basename(inputRoot) !== "dist") {
  throw new Error(`Refusing unexpected build input: ${inputRoot}`);
}
if (dirname(outputRoot) !== resolve(projectRoot) || basename(outputRoot) !== "site-deploy") {
  throw new Error(`Refusing unexpected deployment output: ${outputRoot}`);
}

rmSync(outputRoot, { recursive: true, force: true });
mkdirSync(outputRoot, { recursive: true });
cpSync(inputRoot, outputRoot, { recursive: true });
console.log(`Built ${outputRoot} from ${inputRoot}`);
