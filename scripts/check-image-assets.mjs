import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { extname, basename, join, relative, resolve } from "node:path";

const DEFAULT_OUT = "/tmp/fursay-image-assets";
const SITE_DIR = "fursay-optimized-site";
const IMAGE_EXTENSIONS = new Set([".avif", ".jpg", ".jpeg", ".png", ".svg", ".webp"]);
const TEXT_EXTENSIONS = new Set([".css", ".html", ".js", ".json", ".svg", ".txt", ".xml"]);

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = { outDir: DEFAULT_OUT };
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--out-dir") parsed.outDir = args[++i];
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

async function main() {
  const args = parseArgs();
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
  const unreferencedBytes = unreferenced.reduce((sum, asset) => sum + asset.bytes, 0);
  const failures = unreferenced.map((asset) => `unreferenced_image:${asset.path}`);

  await mkdir(args.outDir, { recursive: true });
  const report = {
    ok: failures.length === 0,
    failures,
    data: {
      imageFiles: assets.length,
      totalBytes,
      unreferencedBytes,
      largestImages: [...assets].sort((a, b) => b.bytes - a.bytes).slice(0, 20),
      unreferenced,
    },
  };
  await writeFile(resolve(args.outDir, "image-assets.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({
    ok: report.ok,
    outDir: args.outDir,
    failed: failures.length,
    imageFiles: assets.length,
    totalBytes,
    unreferencedBytes,
  }, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
