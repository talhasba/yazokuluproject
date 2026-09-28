import { createServer } from "node:http";
import {
  copyFileSync,
  createReadStream,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { extname, join, normalize, relative } from "node:path";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const host = "127.0.0.1";
const requestedPort = process.argv.find((argument) => argument.startsWith("--port="));
const port = requestedPort ? Number(requestedPort.slice("--port=".length)) : 5173;
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("Invalid --port value.");
const editorToken = randomBytes(24).toString("hex");
const openEditor = process.argv.includes("--editor");
const noOpen = process.argv.includes("--no-open");
const programsPath = join(root, "data", "programs.normalized.json");
const digestsPath = join(root, "data", "program-digests.json");
const overridesPath = join(root, "data", "program-editor-overrides.json");
const backupDir = join(root, ".local-editor", "backups");

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

const PROGRAM_FIELDS = [
  "title", "title_tr", "subject", "subject_tr", "location", "location_tr", "city", "country",
  "duration", "publish_status", "age_ranges", "dates", "delivery_modes", "description_short",
  "description_short_tr", "description_full", "price", "price_note", "price_scope",
];
const DIGEST_FIELDS = ["focus", "tags", "highlights", "doTitle", "do", "outcomes", "fit", "extras"];

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function emptyOverrides() {
  return {
    _meta: {
      version: 1,
      note: "Local Program Editor overrides. Values here are applied after generated catalogue data.",
    },
    programs: {},
    digests: {},
  };
}

function readOverrides() {
  if (!existsSync(overridesPath)) return emptyOverrides();
  const value = readJson(overridesPath);
  return {
    _meta: value._meta || emptyOverrides()._meta,
    programs: value.programs && typeof value.programs === "object" ? value.programs : {},
    digests: value.digests && typeof value.digests === "object" ? value.digests : {},
  };
}

function json(response, status, value) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(JSON.stringify(value));
}

function resolveRequestPath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const requested = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
  const resolved = normalize(join(root, requested));
  return relative(root, resolved).startsWith("..") ? null : resolved;
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > 1024 * 1024) {
        reject(new Error("Request is too large."));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
      } catch {
        reject(new Error("The editor sent invalid data."));
      }
    });
    request.on("error", reject);
  });
}

function assertEditorRequest(request) {
  const origin = request.headers.origin;
  const validOrigin = !origin || origin === `http://localhost:${port}` || origin === `http://${host}:${port}`;
  if (!validOrigin || request.headers["x-editor-token"] !== editorToken) {
    const error = new Error("This save request did not come from the local editor.");
    error.statusCode = 403;
    throw error;
  }
}

function string(value, label, max = 20000) {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") throw new Error(`${label} must be text.`);
  const clean = value.trim();
  if (clean.length > max) throw new Error(`${label} is longer than ${max.toLocaleString()} characters.`);
  return clean;
}

function stringList(value, label, maxItems = 40, maxLength = 600) {
  if (!Array.isArray(value)) throw new Error(`${label} must be a list.`);
  if (value.length > maxItems) throw new Error(`${label} can contain at most ${maxItems} items.`);
  return value.map((item, index) => string(item, `${label} item ${index + 1}`, maxLength)).filter(Boolean);
}

function nullableNumber(value, label) {
  if (value === "" || value === null || value === undefined) return null;
  const result = Number(value);
  if (!Number.isFinite(result) || result < 0) throw new Error(`${label} must be a positive number.`);
  return result;
}

function sanitizePrice(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Price must be an object.");
  const tiers = Array.isArray(value.tiers) ? value.tiers : [];
  if (tiers.length > 20) throw new Error("Price can contain at most 20 tiers.");
  return {
    currency: string(value.currency, "Currency", 12).toUpperCase(),
    min_amount: nullableNumber(value.min_amount, "Minimum price"),
    max_amount: nullableNumber(value.max_amount, "Maximum price"),
    display: string(value.display, "Displayed price", 120),
    tiers: tiers.map((tier, index) => ({
      label: string(tier?.label, `Price tier ${index + 1} label`, 240),
      currency: string(tier?.currency, `Price tier ${index + 1} currency`, 12).toUpperCase(),
      amount: nullableNumber(tier?.amount, `Price tier ${index + 1} amount`),
      display: string(tier?.display, `Price tier ${index + 1} display`, 120),
    })),
  };
}

function sanitizeProgram(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Program data is missing.");
  const result = {};
  for (const field of PROGRAM_FIELDS) {
    if (field === "price") result.price = sanitizePrice(value.price || {});
    else if (["age_ranges", "dates", "delivery_modes"].includes(field)) result[field] = stringList(value[field] || [], field, 40, 300);
    else if (field === "publish_status") {
      const status = string(value[field], "Publication status", 30);
      if (!["ready", "needs_review"].includes(status)) throw new Error("Publication status is not supported.");
      result[field] = status;
    } else {
      const max = field.startsWith("description_") ? 30000 : 500;
      result[field] = string(value[field], field, max);
    }
  }
  if (!result.title) throw new Error("English title is required.");
  if (!result.title_tr) throw new Error("Turkish title is required.");
  return result;
}

function sanitizeSteps(value, lang) {
  if (!Array.isArray(value)) throw new Error(`${lang} activities must be a list.`);
  if (value.length > 20) throw new Error(`${lang} activities can contain at most 20 items.`);
  return value.map((item, index) => ({
    lead: string(item?.lead, `${lang} activity ${index + 1} heading`, 100),
    text: string(item?.text, `${lang} activity ${index + 1} text`, 800),
  })).filter((item) => item.lead || item.text);
}

function sanitizeDigestLanguage(value, lang) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${lang} program-page content is missing.`);
  const result = {};
  for (const field of DIGEST_FIELDS) {
    if (field === "do") result.do = sanitizeSteps(value.do || [], lang);
    else if (["tags", "highlights", "outcomes", "fit", "extras"].includes(field)) {
      const maxItems = field === "tags" ? 6 : 20;
      const maxLength = field === "tags" ? 80 : 800;
      result[field] = stringList(value[field] || [], `${lang} ${field}`, maxItems, maxLength);
    } else {
      result[field] = string(value[field], `${lang} ${field}`, field === "focus" ? 1000 : 150);
    }
  }
  if (!result.focus) throw new Error(`${lang} focus statement is required.`);
  if (result.tags.length < 2) throw new Error(`${lang} needs at least two topic tags.`);
  return result;
}

function sanitizeDigest(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Program-page content is missing.");
  return { en: sanitizeDigestLanguage(value.en, "English"), tr: sanitizeDigestLanguage(value.tr, "Turkish") };
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function diff(base, edited) {
  if (Array.isArray(edited) || !isObject(edited)) {
    return JSON.stringify(base) === JSON.stringify(edited) ? undefined : edited;
  }
  const result = {};
  for (const [key, value] of Object.entries(edited)) {
    const change = diff(isObject(base) ? base[key] : undefined, value);
    if (change !== undefined) result[key] = change;
  }
  return Object.keys(result).length ? result : undefined;
}

function projectProgram(record) {
  return Object.fromEntries(PROGRAM_FIELDS.map((field) => [field, record[field] ?? (["age_ranges", "dates", "delivery_modes"].includes(field) ? [] : field === "price" ? {} : "")]));
}

function projectDigest(record) {
  const language = (value = {}) => Object.fromEntries(DIGEST_FIELDS.map((field) => [field, value[field] ?? (["tags", "highlights", "do", "outcomes", "fit", "extras"].includes(field) ? [] : "")]));
  return { en: language(record.en), tr: language(record.tr) };
}

function writeOverrides(value) {
  const text = `${JSON.stringify(value, null, 2)}\n`;
  const current = existsSync(overridesPath) ? readFileSync(overridesPath, "utf8") : "";
  if (current === text) return false;
  if (current) {
    mkdirSync(backupDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    copyFileSync(overridesPath, join(backupDir, `program-editor-overrides.${stamp}.json`));
  }
  writeFileSync(overridesPath, text, "utf8");
  return true;
}

async function handleEditorApi(request, response, pathname) {
  if (pathname === "/api/editor/status" && request.method === "GET") {
    const programs = readJson(programsPath);
    const overrides = readOverrides();
    json(response, 200, {
      local: true,
      programs: programs.length,
      modifiedPrograms: new Set([...Object.keys(overrides.programs), ...Object.keys(overrides.digests)]).size,
    });
    return true;
  }

  const match = /^\/api\/editor\/programs\/([a-z0-9_-]+)$/.exec(pathname);
  if (!match || !["PUT", "DELETE"].includes(request.method)) return false;
  assertEditorRequest(request);
  const id = match[1];
  const programs = readJson(programsPath);
  const baseProgram = programs.find((program) => program.id === id);
  if (!baseProgram) {
    json(response, 404, { error: "Program not found." });
    return true;
  }
  const digests = readJson(digestsPath);
  const overrides = readOverrides();

  if (request.method === "DELETE") {
    delete overrides.programs[id];
    delete overrides.digests[id];
  } else {
    const body = await readBody(request);
    const editedProgram = sanitizeProgram(body.program);
    const programChange = diff(projectProgram(baseProgram), editedProgram);
    if (programChange) overrides.programs[id] = programChange;
    else delete overrides.programs[id];

    if (digests[id]) {
      const editedDigest = sanitizeDigest(body.digest);
      const digestChange = diff(projectDigest(digests[id]), editedDigest);
      if (digestChange) overrides.digests[id] = digestChange;
      else delete overrides.digests[id];
    } else {
      delete overrides.digests[id];
    }
  }

  const modifiedIds = new Set([...Object.keys(overrides.programs), ...Object.keys(overrides.digests)]);
  overrides._meta = {
    ...emptyOverrides()._meta,
    updated_at: new Date().toISOString(),
    modified_programs: modifiedIds.size,
  };
  const changed = writeOverrides(overrides);
  json(response, 200, { ok: true, changed, modified: modifiedIds.has(id), modifiedPrograms: modifiedIds.size });
  return true;
}

function serveAdmin(response, headOnly = false) {
  const path = join(root, "local-editor", "index.html");
  if (!existsSync(path)) {
    response.writeHead(404);
    response.end("Editor not found");
    return;
  }
  const body = readFileSync(path, "utf8").replaceAll("__EDITOR_TOKEN__", editorToken);
  response.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(headOnly ? "" : body);
}

const server = createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url ?? "/", `http://${host}:${port}`);
    if (requestUrl.pathname.startsWith("/api/editor/")) {
      const handled = await handleEditorApi(request, response, requestUrl.pathname);
      if (!handled) json(response, 404, { error: "Editor endpoint not found." });
      return;
    }

    if (["/admin", "/admin/"].includes(requestUrl.pathname)) {
      if (!["GET", "HEAD"].includes(request.method)) {
        response.writeHead(405, { Allow: "GET, HEAD" });
        response.end("Method not allowed");
        return;
      }
      serveAdmin(response, request.method === "HEAD");
      return;
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, { Allow: "GET, HEAD" });
      response.end("Method not allowed");
      return;
    }

    let filePath;
    try {
      filePath = resolveRequestPath(request.url ?? "/");
    } catch {
      response.writeHead(400);
      response.end("Bad request");
      return;
    }

    if (!filePath || !existsSync(filePath) || !statSync(filePath).isFile()) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    response.writeHead(200, {
      "Content-Type": contentTypes[extname(filePath).toLowerCase()] ?? "application/octet-stream",
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
    });

    if (request.method === "HEAD") response.end();
    else createReadStream(filePath).pipe(response);
  } catch (error) {
    console.error(error);
    if (!response.headersSent) json(response, error.statusCode || 400, { error: error.message || "Editor request failed." });
    else response.end();
  }
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${port} is already in use. Close the other local server and try again.`);
  } else {
    console.error(error.message);
  }
  process.exitCode = 1;
});

server.listen(port, host, () => {
  const siteUrl = `http://localhost:${port}`;
  const editorUrl = `${siteUrl}/admin`;
  console.log(`Local site is running at ${siteUrl}`);
  console.log(`Program Editor is available at ${editorUrl}`);
  if (!noOpen) {
    spawn("cmd.exe", ["/c", "start", "", openEditor ? editorUrl : siteUrl], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    }).unref();
  }
});
