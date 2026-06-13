import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const SITE_DIR = "fursay-optimized-site";
const MANIFEST_PATH = "data/immutable-asset-fingerprints.json";
const PURPOSE = "Immutable-cache CSS/JS fingerprint guard for fursay.com static assets.";

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = { check: false, siteDir: SITE_DIR };
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--check") parsed.check = true;
    if (args[i] === "--site-dir") parsed.siteDir = args[++i];
  }
  return parsed;
}

function taipeiDateString(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

async function readExistingManifest(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return null;
  }
}

function sameAssets(a = [], b = []) {
  return JSON.stringify(a) === JSON.stringify(b);
}

async function immutableAssets(siteDir) {
  const root = resolve(process.cwd(), siteDir);
  const assets = [];
  for (const dir of ["css", "js"]) {
    const ext = dir === "css" ? ".css" : ".js";
    const names = (await readdir(resolve(root, dir)))
      .filter((name) => name.endsWith(ext))
      .sort();
    for (const name of names) {
      const path = resolve(root, dir, name);
      const buffer = await readFile(path);
      assets.push({
        path: `/${dir}/${name}`,
        bytes: buffer.length,
        sha256: createHash("sha256").update(buffer).digest("hex"),
      });
    }
  }
  return assets;
}

async function main() {
  const args = parseArgs();
  const root = resolve(process.cwd(), args.siteDir);
  const manifestPath = resolve(root, MANIFEST_PATH);
  const existing = await readExistingManifest(manifestPath);
  const assets = await immutableAssets(args.siteDir);
  const unchanged = sameAssets(existing?.assets, assets);
  const manifest = {
    generatedAt: unchanged && existing?.generatedAt ? existing.generatedAt : taipeiDateString(),
    purpose: PURPOSE,
    assets,
  };
  const next = `${JSON.stringify(manifest, null, 2)}\n`;
  const current = existing ? `${JSON.stringify(existing, null, 2)}\n` : "";

  if (args.check) {
    const ok = current === next;
    console.log(JSON.stringify({
      ok,
      mode: "check",
      manifest: MANIFEST_PATH,
      assetCount: assets.length,
      changed: !ok,
    }, null, 2));
    if (!ok) process.exit(1);
    return;
  }

  await writeFile(manifestPath, next);
  console.log(JSON.stringify({
    ok: true,
    mode: "write",
    manifest: MANIFEST_PATH,
    assetCount: assets.length,
    changed: current !== next,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
