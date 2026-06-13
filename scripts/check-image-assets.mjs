import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { extname, basename, join, relative, resolve } from "node:path";

const DEFAULT_OUT = "/tmp/fursay-image-assets";
const SITE_DIR = "fursay-optimized-site";
const IMAGE_EXTENSIONS = new Set([".avif", ".jpg", ".jpeg", ".png", ".svg", ".webp"]);
const TEXT_EXTENSIONS = new Set([".css", ".html", ".js", ".json", ".svg", ".txt", ".xml"]);
const MAX_TOTAL_IMAGE_BYTES = 4_100_000;
const MAX_TOTAL_PNG_BYTES = 2_300_000;
const MAX_TOTAL_WEBP_BYTES = 1_250_000;
const MAX_TOTAL_AVIF_BYTES = 600_000;
const MAX_CHARACTER_PNG_BYTES = 140_000;
const MAX_OG_PNG_BYTES = 350_000;
const FETCH_TIMEOUT_MS = 15_000;

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = { outDir: DEFAULT_OUT, baseUrl: "" };
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--out-dir") parsed.outDir = args[++i];
    if (args[i] === "--base-url") parsed.baseUrl = args[++i].replace(/\/$/, "");
  }
  return parsed;
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full));
    else files.push(full);
  }
  return files;
}

function normalizeAssetPath(path) {
  return path.split("\\").join("/");
}

function isReferenced(asset, corpus) {
  const rel = normalizeAssetPath(asset.rel);
  const name = basename(rel);
  const checks = [
    rel,
    `/${rel}`,
    rel.replace(/^images\//, ""),
    `https://fursay.com/${rel}`,
    name,
  ];
  return checks.some((needle) => corpus.includes(needle));
}

function expectedContentType(path) {
  if (path.endsWith(".avif")) return "image/avif";
  if (path.endsWith(".webp")) return "image/webp";
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".svg")) return "image/svg+xml";
  if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
  return "image/";
}

async function checkLiveAsset(baseUrl, asset) {
  const response = await fetchWithTimeout(`${baseUrl}${asset.path}`, { cache: "no-store" });
  const contentType = response.headers.get("content-type") || "";
  const expected = expectedContentType(asset.path);
  return {
    path: asset.path,
    status: response.status,
    ok: response.ok,
    contentType,
    expectedContentType: expected,
    cacheControl: response.headers.get("cache-control") || "",
    contentLength: Number(response.headers.get("content-length") || 0),
  };
}

async function fetchWithTimeout(url, init = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  const args = parseArgs();
  const mode = args.baseUrl ? "live" : "local";
  const root = resolve(process.cwd(), SITE_DIR);
  const files = await walk(root);
  const textFiles = files.filter((file) => TEXT_EXTENSIONS.has(extname(file).toLowerCase()));
  const imageFiles = files.filter((file) => IMAGE_EXTENSIONS.has(extname(file).toLowerCase()));
  const corpus = (await Promise.all(textFiles.map((file) => readFile(file, "utf8")))).join("\n");
  const assets = [];

  for (const file of imageFiles) {
    const info = await stat(file);
    const rel = normalizeAssetPath(relative(root, file));
    assets.push({
      path: `/${rel}`,
      rel,
      bytes: info.size,
      referenced: isReferenced({ rel }, corpus),
    });
  }

  const unreferenced = assets
    .filter((asset) => !asset.referenced)
    .sort((a, b) => b.bytes - a.bytes || a.path.localeCompare(b.path));
  const totalBytes = assets.reduce((sum, asset) => sum + asset.bytes, 0);
  const bytesByExt = assets.reduce((totals, asset) => {
    const extension = extname(asset.path).toLowerCase().replace(/^\./, "");
    totals[extension] = (totals[extension] || 0) + asset.bytes;
    return totals;
  }, {});
  const unreferencedBytes = unreferenced.reduce((sum, asset) => sum + asset.bytes, 0);
  const failures = unreferenced.map((asset) => `unreferenced_image:${asset.path}`);
  if (totalBytes > MAX_TOTAL_IMAGE_BYTES) failures.push(`image_total_bytes:${totalBytes}`);
  if ((bytesByExt.png || 0) > MAX_TOTAL_PNG_BYTES) failures.push(`png_total_bytes:${bytesByExt.png}`);
  if ((bytesByExt.webp || 0) > MAX_TOTAL_WEBP_BYTES) failures.push(`webp_total_bytes:${bytesByExt.webp}`);
  if ((bytesByExt.avif || 0) > MAX_TOTAL_AVIF_BYTES) failures.push(`avif_total_bytes:${bytesByExt.avif}`);
  for (const asset of assets) {
    if (asset.path.startsWith("/images/chars/") && asset.path.endsWith(".png") && asset.bytes > MAX_CHARACTER_PNG_BYTES) {
      failures.push(`character_png_too_large:${asset.path}:${asset.bytes}`);
    }
    if (/^\/og-[a-z-]+\.png$/.test(asset.path) && asset.bytes > MAX_OG_PNG_BYTES) {
      failures.push(`og_png_too_large:${asset.path}:${asset.bytes}`);
    }
  }

  const liveChecks = [];
  if (args.baseUrl) {
    for (const asset of assets) {
      const result = await checkLiveAsset(args.baseUrl, asset);
      liveChecks.push(result);
      if (!result.ok) failures.push(`live_image_bad_status:${asset.path}:${result.status}`);
      if (!result.contentType.includes(result.expectedContentType)) {
        failures.push(`live_image_bad_content_type:${asset.path}:${result.contentType || "none"}`);
      }
    }
  }

  await mkdir(args.outDir, { recursive: true });
  const report = {
    ok: failures.length === 0,
    mode,
    baseUrl: args.baseUrl,
    failures,
    data: {
      imageFiles: assets.length,
      totalBytes,
      bytesByExt,
      maxTotalBytes: MAX_TOTAL_IMAGE_BYTES,
      maxTotalPngBytes: MAX_TOTAL_PNG_BYTES,
      maxTotalWebpBytes: MAX_TOTAL_WEBP_BYTES,
      maxTotalAvifBytes: MAX_TOTAL_AVIF_BYTES,
      unreferencedBytes,
      maxCharacterPngBytes: MAX_CHARACTER_PNG_BYTES,
      maxOgPngBytes: MAX_OG_PNG_BYTES,
      largestImages: [...assets].sort((a, b) => b.bytes - a.bytes).slice(0, 20),
      unreferenced,
      liveChecks,
    },
  };
  await writeFile(resolve(args.outDir, "image-assets.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({
    ok: report.ok,
    mode: report.mode,
    outDir: args.outDir,
    failed: failures.length,
    imageFiles: assets.length,
    totalBytes,
    pngBytes: bytesByExt.png || 0,
    webpBytes: bytesByExt.webp || 0,
    avifBytes: bytesByExt.avif || 0,
    unreferencedBytes,
    liveChecks: liveChecks.length || undefined,
  }, null, 2));
  if (!report.ok) process.exit(1);
  process.exit(0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
