import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const SITE_DIR = resolve(process.cwd(), "fursay-optimized-site");
const DEFAULT_OUT = "/tmp/fursay-hero-preload-contract";
const PAGES = [
  { path: "/", file: "index.html", scene: "/images/scenes/story-world-home.webp", character: "/images/chars/koko.avif" },
  { path: "/zh/", file: "zh/index.html", scene: "/images/scenes/story-world-home.webp", character: "/images/chars/koko.avif" },
  { path: "/ar/", file: "ar/index.html", scene: "/images/scenes/story-world-home.webp", character: "/images/chars/koko.avif" },
  { path: "/koko", file: "koko.html", scene: "/images/scenes/story-world-forest.webp", character: "/images/chars/koko.avif" },
  { path: "/zh/koko", file: "zh/koko.html", scene: "/images/scenes/story-world-forest.webp", character: "/images/chars/koko.avif" },
  { path: "/ar/koko", file: "ar/koko.html", scene: "/images/scenes/story-world-forest.webp", character: "/images/chars/koko.avif" },
  { path: "/arabic", file: "arabic.html", scene: "/images/scenes/story-world-desert.webp", character: "/images/chars/arabic_nour_zayd_together.avif" },
  { path: "/zh/arabic", file: "zh/arabic.html", scene: "/images/scenes/story-world-desert.webp", character: "/images/chars/arabic_nour_zayd_together.avif" },
  { path: "/ar/arabic", file: "ar/arabic.html", scene: "/images/scenes/story-world-desert.webp", character: "/images/chars/arabic_nour_zayd_together.avif" },
];

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = { outDir: DEFAULT_OUT, baseUrl: "" };
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--out-dir") parsed.outDir = args[++i];
    if (args[i] === "--base-url") parsed.baseUrl = args[++i].replace(/\/$/, "");
  }
  return parsed;
}

async function readPage(baseUrl, page) {
  if (baseUrl) {
    const response = await fetch(`${baseUrl}${page.path}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`${page.path} status ${response.status}`);
    return response.text();
  }
  return readFile(resolve(SITE_DIR, page.file), "utf8");
}

function attr(tag, name) {
  return tag.match(new RegExp(`${name}=(["'])(.*?)\\1`, "i"))?.[2] || "";
}

function normalizeHref(href) {
  if (!href) return "";
  if (href.startsWith("https://fursay.com/")) return new URL(href).pathname;
  if (href.startsWith("/")) return href;
  return `/${href.replace(/^(\.\.\/)+/, "").replace(/^\.\//, "")}`;
}

function preloadLinks(html) {
  return [...html.matchAll(/<link\b[^>]*rel=["']preload["'][^>]*>/gi)].map((match) => ({
    tag: match[0],
    as: attr(match[0], "as"),
    href: normalizeHref(attr(match[0], "href")),
    type: attr(match[0], "type"),
    fetchpriority: attr(match[0], "fetchpriority"),
  }));
}

async function localAsset(path) {
  const info = await stat(resolve(SITE_DIR, path.replace(/^\//, "")));
  return {
    ok: info.size > 0,
    status: 200,
    bytes: info.size,
    contentType: path.endsWith(".webp") ? "image/webp" : "image/avif",
    cacheControl: "",
  };
}

async function liveAsset(baseUrl, path) {
  const response = await fetch(`${baseUrl}${path}`, { cache: "no-store" });
  return {
    ok: response.ok,
    status: response.status,
    bytes: Number(response.headers.get("content-length") || 0),
    contentType: response.headers.get("content-type") || "",
    cacheControl: response.headers.get("cache-control") || "",
  };
}

async function assetInfo(baseUrl, path) {
  return baseUrl ? liveAsset(baseUrl, path) : localAsset(path);
}

async function main() {
  const args = parseArgs();
  const failures = [];
  const pages = [];
  const assets = new Map();

  for (const page of PAGES) {
    const html = await readPage(args.baseUrl, page);
    const links = preloadLinks(html);
    const scene = links.find((link) => link.href === page.scene);
    const character = links.find((link) => link.href === page.character);
    if (!scene) failures.push(`${page.path}:missing_scene_preload:${page.scene}`);
    if (!character) failures.push(`${page.path}:missing_character_preload:${page.character}`);
    if (scene?.as !== "image") failures.push(`${page.path}:scene_preload_as:${scene?.as || "none"}`);
    if (character?.as !== "image") failures.push(`${page.path}:character_preload_as:${character?.as || "none"}`);
    if (scene?.type !== "image/webp") failures.push(`${page.path}:scene_preload_type:${scene?.type || "none"}`);
    if (character?.type !== "image/avif") failures.push(`${page.path}:character_preload_type:${character?.type || "none"}`);
    if (scene?.fetchpriority !== "high") failures.push(`${page.path}:scene_fetchpriority:${scene?.fetchpriority || "none"}`);
    if (character?.fetchpriority !== "high") failures.push(`${page.path}:character_fetchpriority:${character?.fetchpriority || "none"}`);

    for (const assetPath of [page.scene, page.character]) {
      if (!assets.has(assetPath)) assets.set(assetPath, await assetInfo(args.baseUrl, assetPath));
      const asset = assets.get(assetPath);
      if (!asset.ok) failures.push(`${page.path}:asset_status:${assetPath}:${asset.status}`);
      if (assetPath.endsWith(".webp") && !asset.contentType.includes("image/webp")) failures.push(`${page.path}:asset_type:${assetPath}:${asset.contentType || "none"}`);
      if (assetPath.endsWith(".avif") && !asset.contentType.includes("image/avif")) failures.push(`${page.path}:asset_type:${assetPath}:${asset.contentType || "none"}`);
      if (args.baseUrl && !asset.cacheControl.includes("max-age=31536000")) failures.push(`${page.path}:asset_cache:${assetPath}:${asset.cacheControl || "none"}`);
    }

    pages.push({
      path: page.path,
      scene: page.scene,
      character: page.character,
      preloadCount: links.length,
    });
  }

  await mkdir(args.outDir, { recursive: true });
  const report = {
    ok: failures.length === 0,
    mode: args.baseUrl ? "live" : "local",
    baseUrl: args.baseUrl || "",
    failures,
    pages,
    assets: Object.fromEntries(assets),
  };
  await writeFile(resolve(args.outDir, "hero-preload-contract.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({
    ok: report.ok,
    mode: report.mode,
    outDir: args.outDir,
    failed: failures.length,
    pages: pages.length,
    assets: assets.size,
  }, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
