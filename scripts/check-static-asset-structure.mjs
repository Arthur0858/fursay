import { readdir, readFile, stat, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, join } from "node:path";

const DEFAULT_OUT = "/tmp/fursay-static-asset-structure";
const SITE_DIR = "fursay-optimized-site";
const IMMUTABLE_ASSET_MANIFEST = "data/immutable-asset-fingerprints.json";
const EXPECTED_CSS = [
  "home-common-20260613-cache1.css",
  "home-ar-page-20260613-cache1.css",
  "home-en-page-20260613-cache1.css",
  "home-zh-page-20260613-cache1.css",
  "koko-common-20260613-cache1.css",
  "koko-ar-page-20260613-cache1.css",
  "koko-en-page-20260613-cache1.css",
  "noor-common-20260613-cache1.css",
  "noor-ltr-page-20260613-cache1.css",
  "noor-rtl-page-20260613-cache1.css",
  "picture-book-base-20260613-base1.css",
  "story-page-common-20260613-css1.css",
  "storybook-skin-20260613-inline1.css",
  "picture-world-shared-20260613-traffic12.css",
  "picture-world-tools-20260613-products1.css",
];
const EXPECTED_JS = [
  "site-shared-20260613-commerce4.js",
];
const MAX_TOTAL_CSS_BYTES = 370_000;
const MAX_MAIN_SHARED_CSS_BYTES = 88_000;
const MAX_SINGLE_CSS_BYTES = 100_000;
const MAX_TOTAL_JS_BYTES = 35_000;
const MAX_SINGLE_JS_BYTES = 35_000;
const MAIN_STORY_HTML = new Set([
  "index.html",
  "zh/index.html",
  "ar/index.html",
  "koko.html",
  "zh/koko.html",
  "ar/koko.html",
  "arabic.html",
  "zh/arabic.html",
  "ar/arabic.html",
  "episodes/koko-feelings.html",
  "zh/episodes/koko-feelings.html",
  "ar/episodes/koko-feelings.html",
  "episodes/noor-colors.html",
  "zh/episodes/noor-colors.html",
  "ar/episodes/noor-colors.html",
  "episodes/noor-greetings.html",
  "zh/episodes/noor-greetings.html",
  "ar/episodes/noor-greetings.html",
]);
const OPERATIONS_HTML = new Set([
  "conversion-health.html",
  "creator-kit.html",
  "deploy-readiness.html",
  "links.html",
  "monetization-roadmap.html",
  "share-kit.html",
  "traffic-launch.html",
]);
const MAIN_SHARED_CSS = "/css/picture-world-shared-20260613-traffic12.css";
const HOME_COMMON_CSS = "/css/home-common-20260613-cache1.css";
const KOKO_COMMON_CSS = "/css/koko-common-20260613-cache1.css";
const NOOR_COMMON_CSS = "/css/noor-common-20260613-cache1.css";
const OPERATIONS_CSS = "/css/picture-world-tools-20260613-products1.css";
const HOME_HTML = new Set(["index.html", "zh/index.html", "ar/index.html"]);
const KOKO_HTML = new Set(["koko.html", "zh/koko.html", "ar/koko.html", "episodes/koko-feelings.html", "zh/episodes/koko-feelings.html", "ar/episodes/koko-feelings.html"]);
const NOOR_HTML = new Set(["arabic.html", "zh/arabic.html", "ar/arabic.html", "episodes/noor-colors.html", "zh/episodes/noor-colors.html", "ar/episodes/noor-colors.html", "episodes/noor-greetings.html", "zh/episodes/noor-greetings.html", "ar/episodes/noor-greetings.html"]);
const VOID_HTML_TAGS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

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

function checkHtmlTagBalance(html, relativeFile) {
  const failures = [];
  const stack = [];
  for (const match of html.matchAll(/<\/?([a-zA-Z][\w:-]*)(\s[^<>]*?)?>/g)) {
    const rawTag = match[0];
    const tagName = match[1].toLowerCase();
    if (rawTag.startsWith("<!") || rawTag.startsWith("<?") || rawTag.endsWith("/>") || VOID_HTML_TAGS.has(tagName)) continue;
    if (!rawTag.startsWith("</")) {
      stack.push({ tagName, index: match.index });
      continue;
    }
    const openIndex = stack.findLastIndex((item) => item.tagName === tagName);
    if (openIndex === -1) {
      failures.push(`html_unexpected_close_tag:${relativeFile}:${tagName}:${match.index}`);
      continue;
    }
    if (openIndex !== stack.length - 1) {
      failures.push(`html_misnested_close_tag:${relativeFile}:${tagName}:${match.index}:top_${stack.at(-1)?.tagName || "none"}`);
      stack.splice(openIndex, 1);
      continue;
    }
    stack.pop();
  }
  for (const item of stack.filter((entry) => !["html", "body"].includes(entry.tagName))) {
    failures.push(`html_unclosed_tag:${relativeFile}:${item.tagName}:${item.index}`);
  }
  return failures;
}

async function existsWithBytes(path) {
  try {
    const info = await stat(path);
    return info.size;
  } catch {
    return -1;
  }
}

async function assetFingerprint(path) {
  const buffer = await readFile(path);
  return createHash("sha256").update(buffer).digest("hex");
}

async function main() {
  const args = parseArgs();
  const failures = [];
  const root = resolve(process.cwd(), SITE_DIR);
  const cssFiles = (await readdir(resolve(root, "css"))).filter((name) => name.endsWith(".css")).sort();
  const jsFiles = (await readdir(resolve(root, "js"))).filter((name) => name.endsWith(".js")).sort();
  const htmlFiles = (await walk(root)).filter((file) => file.endsWith(".html"));
  const referenced = { css: [], js: [] };
  const pageAssets = {};
  const assetSizes = { css: {}, js: {} };
  const immutableManifestPath = resolve(root, IMMUTABLE_ASSET_MANIFEST);
  let immutableManifest = null;
  try {
    immutableManifest = JSON.parse(await readFile(immutableManifestPath, "utf8"));
  } catch (error) {
    failures.push(`immutable_manifest_unreadable:${IMMUTABLE_ASSET_MANIFEST}:${error instanceof Error ? error.message : String(error)}`);
  }

  for (const file of htmlFiles) {
    const html = await readFile(file, "utf8");
    const relativeFile = file.replace(`${root}/`, "");
    failures.push(...checkHtmlTagBalance(html, relativeFile));
    const inlineStyles = [...html.matchAll(/\sstyle=("[^"]*"|'[^']*')/gi)];
    const inlineHandlers = [...html.matchAll(/\son[a-z]+=/gi)];
    const inlineScripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
      .filter((match) => !/\bsrc=/.test(match[1]) && !/type=["']application\/ld\+json["']/i.test(match[1]));
    if (inlineStyles.length) failures.push(`inline_style_attribute:${relativeFile}:${inlineStyles.length}`);
    if (inlineHandlers.length) failures.push(`inline_event_handler:${relativeFile}:${inlineHandlers.length}`);
    if (inlineScripts.length) failures.push(`inline_executable_script:${relativeFile}:${inlineScripts.length}`);
    const assets = extractAssets(html);
    pageAssets[relativeFile] = assets;
    if (MAIN_STORY_HTML.has(relativeFile) && assets.css.includes(OPERATIONS_CSS)) {
      failures.push(`main_story_page_loads_operations_css:${relativeFile}`);
    }
    if (OPERATIONS_HTML.has(relativeFile) && !assets.css.includes(OPERATIONS_CSS)) {
      failures.push(`operations_page_missing_operations_css:${relativeFile}`);
    }
    if (MAIN_STORY_HTML.has(relativeFile) && !assets.css.includes(MAIN_SHARED_CSS)) {
      failures.push(`page_missing_main_shared_css:${relativeFile}`);
    }
    if (OPERATIONS_HTML.has(relativeFile) && assets.css.includes(MAIN_SHARED_CSS)) {
      failures.push(`operations_page_loads_main_shared_css:${relativeFile}`);
    }
    if (HOME_HTML.has(relativeFile) && !assets.css.includes(HOME_COMMON_CSS)) {
      failures.push(`home_page_missing_home_common_css:${relativeFile}`);
    }
    if (!HOME_HTML.has(relativeFile) && assets.css.includes(HOME_COMMON_CSS)) {
      failures.push(`non_home_page_loads_home_common_css:${relativeFile}`);
    }
    if (KOKO_HTML.has(relativeFile) && !assets.css.includes(KOKO_COMMON_CSS)) {
      failures.push(`koko_page_missing_koko_common_css:${relativeFile}`);
    }
    if (!KOKO_HTML.has(relativeFile) && assets.css.includes(KOKO_COMMON_CSS)) {
      failures.push(`non_koko_page_loads_koko_common_css:${relativeFile}`);
    }
    if (NOOR_HTML.has(relativeFile) && !assets.css.includes(NOOR_COMMON_CSS)) {
      failures.push(`noor_page_missing_noor_common_css:${relativeFile}`);
    }
    if (!NOOR_HTML.has(relativeFile) && assets.css.includes(NOOR_COMMON_CSS)) {
      failures.push(`non_noor_page_loads_noor_common_css:${relativeFile}`);
    }
    referenced.css.push(...assets.css);
    referenced.js.push(...assets.js);
  }
  for (const file of MAIN_STORY_HTML) {
    if (!pageAssets[file]) failures.push(`missing_main_story_html:${file}`);
  }
  for (const file of OPERATIONS_HTML) {
    if (!pageAssets[file]) failures.push(`missing_operations_html:${file}`);
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

  for (const name of cssFiles) {
    const bytes = await existsWithBytes(resolve(root, "css", name));
    assetSizes.css[name] = bytes;
    if (bytes > MAX_SINGLE_CSS_BYTES) failures.push(`css_asset_too_large:${name}:${bytes}`);
  }
  if ((assetSizes.css["picture-world-shared-20260613-traffic12.css"] || 0) > MAX_MAIN_SHARED_CSS_BYTES) {
    failures.push(`main_shared_css_too_large:picture-world-shared-20260613-traffic12.css:${assetSizes.css["picture-world-shared-20260613-traffic12.css"]}`);
  }
  for (const name of jsFiles) {
    const bytes = await existsWithBytes(resolve(root, "js", name));
    assetSizes.js[name] = bytes;
    if (bytes > MAX_SINGLE_JS_BYTES) failures.push(`js_asset_too_large:${name}:${bytes}`);
  }
  const totalCssBytes = Object.values(assetSizes.css).reduce((sum, bytes) => sum + bytes, 0);
  const totalJsBytes = Object.values(assetSizes.js).reduce((sum, bytes) => sum + bytes, 0);
  if (totalCssBytes > MAX_TOTAL_CSS_BYTES) failures.push(`css_total_bytes:${totalCssBytes}`);
  if (totalJsBytes > MAX_TOTAL_JS_BYTES) failures.push(`js_total_bytes:${totalJsBytes}`);

  for (const asset of unique([...referenced.css, ...referenced.js])) {
    const bytes = await existsWithBytes(resolve(root, asset.replace(/^\//, "")));
    if (bytes <= 0) failures.push(`referenced_asset_missing:${asset}`);
  }

  if (immutableManifest) {
    const expectedImmutableAssets = unique([
      ...cssFiles.map((name) => `/css/${name}`),
      ...jsFiles.map((name) => `/js/${name}`),
    ]);
    const manifestAssets = Array.isArray(immutableManifest.assets) ? immutableManifest.assets : [];
    const manifestByPath = new Map(manifestAssets.map((asset) => [asset.path, asset]));
    const manifestPaths = unique(manifestAssets.map((asset) => asset.path).filter(Boolean));

    for (const assetPath of expectedImmutableAssets) {
      const entry = manifestByPath.get(assetPath);
      if (!entry) {
        failures.push(`immutable_manifest_missing_asset:${assetPath}`);
        continue;
      }
      const fullPath = resolve(root, assetPath.replace(/^\//, ""));
      const bytes = await existsWithBytes(fullPath);
      const sha256 = await assetFingerprint(fullPath);
      if (entry.bytes !== bytes) failures.push(`immutable_manifest_bytes_changed:${assetPath}:${entry.bytes}->${bytes}`);
      if (entry.sha256 !== sha256) failures.push(`immutable_manifest_sha_changed:${assetPath}`);
    }
    for (const assetPath of manifestPaths) {
      if (!expectedImmutableAssets.includes(assetPath)) failures.push(`immutable_manifest_unexpected_asset:${assetPath}`);
    }
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
      mainStoryHtml: [...MAIN_STORY_HTML].sort(),
      operationsHtml: [...OPERATIONS_HTML].sort(),
      assetSizes,
      totalCssBytes,
      totalJsBytes,
      immutableAssetManifest: IMMUTABLE_ASSET_MANIFEST,
      maxTotalCssBytes: MAX_TOTAL_CSS_BYTES,
      maxMainSharedCssBytes: MAX_MAIN_SHARED_CSS_BYTES,
      maxSingleCssBytes: MAX_SINGLE_CSS_BYTES,
      maxTotalJsBytes: MAX_TOTAL_JS_BYTES,
      maxSingleJsBytes: MAX_SINGLE_JS_BYTES,
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
    totalCssBytes,
    totalJsBytes,
  }, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
