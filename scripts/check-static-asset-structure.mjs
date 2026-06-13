import { readdir, readFile, stat, writeFile, mkdir } from "node:fs/promises";
import { resolve, join } from "node:path";

const DEFAULT_OUT = "/tmp/fursay-static-asset-structure";
const SITE_DIR = "fursay-optimized-site";
const EXPECTED_CSS = [
  "picture-book-base.css",
  "picture-world-shared-20260612-traffic10.css",
];
const EXPECTED_JS = [
  "site-shared-20260613-attribution1.js",
];

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

function unique(items) {
  return [...new Set(items)].sort();
}

function extractAssets(html) {
  const stylesheetMatches = [...html.matchAll(/<link\b[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["'][^>]*>/gi)];
  const scriptMatches = [...html.matchAll(/<script\b[^>]+src=["']([^"']+)["'][^>]*>/gi)];
  return {
    css: stylesheetMatches.map((match) => match[1]).filter((href) => href.startsWith("/css/")),
    js: scriptMatches.map((match) => match[1]).filter((src) => src.startsWith("/js/")),
  };
}

async function existsWithBytes(path) {
  try {
    const info = await stat(path);
    return info.size;
  } catch {
    return -1;
  }
}

async function main() {
  const args = parseArgs();
  const failures = [];
  const root = resolve(process.cwd(), SITE_DIR);
  const cssFiles = (await readdir(resolve(root, "css"))).filter((name) => name.endsWith(".css")).sort();
  const jsFiles = (await readdir(resolve(root, "js"))).filter((name) => name.endsWith(".js")).sort();
  const htmlFiles = (await walk(root)).filter((file) => file.endsWith(".html"));
  const referenced = { css: [], js: [] };

  for (const file of htmlFiles) {
    const html = await readFile(file, "utf8");
    const assets = extractAssets(html);
    referenced.css.push(...assets.css);
    referenced.js.push(...assets.js);
  }

  for (const name of cssFiles) {
    if (!EXPECTED_CSS.includes(name)) failures.push(`unexpected_css_asset:${name}`);
  }
  for (const name of jsFiles) {
    if (!EXPECTED_JS.includes(name)) failures.push(`unexpected_js_asset:${name}`);
  }
  for (const name of EXPECTED_CSS) {
    if (!cssFiles.includes(name)) failures.push(`missing_css_asset:${name}`);
  }
  for (const name of EXPECTED_JS) {
    if (!jsFiles.includes(name)) failures.push(`missing_js_asset:${name}`);
  }

  for (const asset of unique([...referenced.css, ...referenced.js])) {
    const bytes = await existsWithBytes(resolve(root, asset.replace(/^\//, "")));
    if (bytes <= 0) failures.push(`referenced_asset_missing:${asset}`);
  }

  const expectedCssRefs = EXPECTED_CSS.map((name) => `/css/${name}`);
  const expectedJsRefs = EXPECTED_JS.map((name) => `/js/${name}`);
  for (const asset of expectedCssRefs) {
    if (!referenced.css.includes(asset)) failures.push(`expected_css_not_referenced:${asset}`);
  }
  for (const asset of expectedJsRefs) {
    if (!referenced.js.includes(asset)) failures.push(`expected_js_not_referenced:${asset}`);
  }

  await mkdir(args.outDir, { recursive: true });
  const report = {
    ok: failures.length === 0,
    failures,
    data: {
      cssFiles,
      jsFiles,
      referencedCss: unique(referenced.css),
      referencedJs: unique(referenced.js),
      htmlFiles: htmlFiles.length,
    },
  };
  await writeFile(resolve(args.outDir, "static-asset-structure.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({
    ok: report.ok,
    outDir: args.outDir,
    failed: failures.length,
    cssFiles: cssFiles.length,
    jsFiles: jsFiles.length,
    htmlFiles: htmlFiles.length,
  }, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
