import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

const DEFAULT_OUT = "/tmp/fursay-site-structure-contract";
const SITE_DIR = "fursay-optimized-site";
const EXPECTED_LOCALES = [
  { code: "en", label: "EN", dir: "ltr", basePath: "/" },
  { code: "zh-TW", label: "中文", dir: "ltr", basePath: "/zh/" },
  { code: "ar", label: "عربي", dir: "rtl", basePath: "/ar/" },
];
const EXPECTED_PAGES = {
  home: {
    route: "/",
    localizedRoutes: { en: "/", "zh-TW": "/zh/", ar: "/ar/" },
  },
  koko: {
    route: "/koko",
    channel: "koko",
    localizedRoutes: { en: "/koko", "zh-TW": "/zh/koko", ar: "/ar/koko" },
  },
  arabic: {
    route: "/arabic",
    channel: "noor",
    localizedRoutes: { en: "/arabic", "zh-TW": "/zh/arabic", ar: "/ar/arabic" },
  },
  "episode-koko-feelings": {
    route: "/episodes/koko-feelings",
    channel: "koko",
    localizedRoutes: { en: "/episodes/koko-feelings", "zh-TW": "/zh/episodes/koko-feelings", ar: "/ar/episodes/koko-feelings" },
  },
  "episode-noor-colors": {
    route: "/episodes/noor-colors",
    channel: "noor",
    localizedRoutes: { en: "/episodes/noor-colors", "zh-TW": "/zh/episodes/noor-colors", ar: "/ar/episodes/noor-colors" },
  },
};
const EXPECTED_CHANNELS = {
  koko: {
    youtubeNeedle: "@KokosForest",
    playlistNeedle: "UU0X4CIwf6KoUMoIHwRxN3jw",
    primaryCharacter: "koko",
    scene: "/images/scenes/story-world-forest.webp",
  },
  noor: {
    youtubeNeedle: "@ArabicKidsChinese",
    playlistNeedle: "UUOxmnonpfBvpiV8Vg5LEiYw",
    primaryCharacter: "arabic_nour_zayd_together",
    scene: "/images/scenes/story-world-desert.webp",
  },
};
const TOOL_ONLY_CSS = new Set([
  "/css/picture-world-tools-20260613-ops2.css",
]);

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

function htmlFileForRoute(route) {
  if (route === "/") return "index.html";
  if (route.endsWith("/")) return `${route.slice(1)}index.html`;
  return `${route.slice(1)}.html`;
}

function publicUrl(baseUrl, path) {
  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

async function readLocalText(root, path) {
  return readFile(resolve(root, path.replace(/^\//, "")), "utf8");
}

async function fetchText(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`${url} ${response.status}`);
  return response.text();
}

async function readText({ root, baseUrl }, path) {
  if (baseUrl) return fetchText(publicUrl(baseUrl, path));
  return readLocalText(root, path);
}

async function assetExists({ root, baseUrl }, path) {
  if (baseUrl) {
    const response = await fetch(publicUrl(baseUrl, path), { cache: "no-store" });
    return {
      ok: response.ok,
      status: response.status,
      bytes: Number(response.headers.get("content-length") || 0),
    };
  }
  try {
    const info = await stat(resolve(root, path.replace(/^\//, "")));
    return { ok: info.size > 0, status: 200, bytes: info.size };
  } catch {
    return { ok: false, status: 0, bytes: 0 };
  }
}

function htmlAttr(html, attr) {
  const match = html.match(new RegExp(`<html\\b[^>]*\\s${attr}=["']([^"']+)["']`, "i"));
  return match?.[1] || "";
}

function canonicalHref(html) {
  return html.match(/<link\b[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i)?.[1] || "";
}

function bodyClass(html) {
  return html.match(/<body\b[^>]*\sclass=["']([^"']+)["'][^>]*>/i)?.[1] || "";
}

function stylesheetHrefs(html) {
  return [...html.matchAll(/<link\b[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["'][^>]*>/gi)]
    .map((match) => match[1])
    .filter((href) => href.startsWith("/css/"));
}

function scriptSrcs(html) {
  return [...html.matchAll(/<script\b[^>]+src=["']([^"']+)["'][^>]*>/gi)]
    .map((match) => match[1])
    .filter((src) => src.startsWith("/js/"));
}

function pushMismatch(failures, key, actual, expected) {
  if (actual !== expected) failures.push(`${key}:${actual || "none"}!=${expected}`);
}

function validateLocales(structure, failures) {
  pushMismatch(failures, "site_name", structure.site?.name, "Fursay");
  pushMismatch(failures, "site_origin", structure.site?.origin, "https://fursay.com");
  pushMismatch(failures, "site_default_locale", structure.site?.defaultLocale, "en");
  const locales = structure.site?.locales || [];
  if (locales.length !== EXPECTED_LOCALES.length) failures.push(`locale_count:${locales.length}`);
  for (const expected of EXPECTED_LOCALES) {
    const locale = locales.find((item) => item.code === expected.code);
    if (!locale) {
      failures.push(`missing_locale:${expected.code}`);
      continue;
    }
    pushMismatch(failures, `locale_label:${expected.code}`, locale.label, expected.label);
    pushMismatch(failures, `locale_dir:${expected.code}`, locale.dir, expected.dir);
    pushMismatch(failures, `locale_base_path:${expected.code}`, locale.basePath, expected.basePath);
  }
}

function validatePages(structure, failures) {
  const pages = structure.pages || [];
  if (pages.length !== Object.keys(EXPECTED_PAGES).length) failures.push(`page_count:${pages.length}`);
  for (const [key, expected] of Object.entries(EXPECTED_PAGES)) {
    const page = pages.find((item) => item.key === key);
    if (!page) {
      failures.push(`missing_page:${key}`);
      continue;
    }
    pushMismatch(failures, `page_route:${key}`, page.route, expected.route);
    if (expected.channel) pushMismatch(failures, `page_channel:${key}`, page.channel, expected.channel);
    for (const [locale, route] of Object.entries(expected.localizedRoutes)) {
      pushMismatch(failures, `page_localized_route:${key}:${locale}`, page.localizedRoutes?.[locale], route);
      if (page.localizedRoutes?.[locale]?.endsWith(".html")) failures.push(`page_localized_route_html:${key}:${locale}`);
    }
  }
}

function validateChannels(structure, failures) {
  for (const [key, expected] of Object.entries(EXPECTED_CHANNELS)) {
    const channel = structure.channels?.[key];
    if (!channel) {
      failures.push(`missing_channel:${key}`);
      continue;
    }
    if (!channel.youtube?.includes(expected.youtubeNeedle)) failures.push(`channel_youtube:${key}:${channel.youtube || "none"}`);
    if (!channel.playlistEmbed?.includes(expected.playlistNeedle)) failures.push(`channel_playlist:${key}:${channel.playlistEmbed || "none"}`);
    pushMismatch(failures, `channel_primary_character:${key}`, channel.primaryCharacter, expected.primaryCharacter);
    pushMismatch(failures, `channel_scene:${key}`, channel.scene, expected.scene);
  }
}

async function validateAssets(structure, context, failures, data) {
  const cssAssets = structure.sharedAssets?.css || [];
  const jsAssets = structure.sharedAssets?.js || [];
  const scenes = structure.sharedAssets?.scenes || [];
  const root = context.root;
  if (!cssAssets.length) failures.push("shared_assets_missing_css");
  if (!jsAssets.length) failures.push("shared_assets_missing_js");
  if (scenes.length !== 3) failures.push(`shared_assets_scene_count:${scenes.length}`);

  for (const asset of [...cssAssets, ...jsAssets, ...scenes]) {
    const result = await assetExists(context, asset);
    data.assetResults.push({ asset, ...result });
    if (!result.ok || (!context.baseUrl && result.bytes === 0)) failures.push(`shared_asset_missing:${asset}:${result.status}`);
  }

  const cssCorpus = (await Promise.all(cssAssets.map(async (asset) => {
    try {
      return await readText(context, context.baseUrl ? asset : asset.replace(/^\//, ""));
    } catch {
      return "";
    }
  }))).join("\n");
  for (const scene of scenes) {
    if (!cssCorpus.includes(scene)) failures.push(`shared_scene_not_referenced_by_css:${scene}`);
  }

  if (!context.baseUrl) {
    const cssFiles = (await readdir(resolve(root, "css"))).filter((name) => name.endsWith(".css")).map((name) => `/css/${name}`).sort();
    const jsFiles = (await readdir(resolve(root, "js"))).filter((name) => name.endsWith(".js")).map((name) => `/js/${name}`).sort();
    for (const file of cssFiles) {
      if (!cssAssets.includes(file)) failures.push(`css_file_not_in_site_structure:${file}`);
    }
    for (const file of jsFiles) {
      if (!jsAssets.includes(file)) failures.push(`js_file_not_in_site_structure:${file}`);
    }
  }
}

async function validateHtmlRoutes(structure, context, failures, data) {
  const expectedRouteEntries = [];
  for (const page of structure.pages || []) {
    for (const [locale, route] of Object.entries(page.localizedRoutes || {})) {
      expectedRouteEntries.push({ page: page.key, channel: page.channel || "", locale, route });
    }
  }

  const sharedCss = new Set(structure.sharedAssets?.css || []);
  const sharedJs = new Set(structure.sharedAssets?.js || []);
  const seenCss = new Set();
  const seenJs = new Set();

  for (const entry of expectedRouteEntries) {
    const file = htmlFileForRoute(entry.route);
    const html = await readText(context, context.baseUrl ? entry.route : file);
    const lang = htmlAttr(html, "lang");
    const dir = htmlAttr(html, "dir") || "ltr";
    const canonical = canonicalHref(html);
    const classes = bodyClass(html).split(/\s+/).filter(Boolean);
    const expectedCanonical = `https://fursay.com${entry.route}`;
    const css = stylesheetHrefs(html);
    const js = scriptSrcs(html);
    css.forEach((asset) => seenCss.add(asset));
    js.forEach((asset) => seenJs.add(asset));

    pushMismatch(failures, `html_lang:${entry.route}`, lang, entry.locale);
    pushMismatch(failures, `html_dir:${entry.route}`, dir, entry.locale === "ar" ? "rtl" : "ltr");
    pushMismatch(failures, `html_canonical:${entry.route}`, canonical, expectedCanonical);
    if (!js.includes("/js/site-shared-20260613-commerce3.js")) failures.push(`html_missing_shared_js:${entry.route}`);

    if (entry.channel) {
      const channel = structure.channels?.[entry.channel];
      const expectedWorldClass = entry.channel === "koko" ? "world-koko" : "world-arabic";
      if (!classes.includes(expectedWorldClass)) failures.push(`html_missing_channel_body_class:${entry.route}:${expectedWorldClass}`);
      if (channel?.youtube && !html.includes(channel.youtube)) failures.push(`html_missing_channel_youtube:${entry.route}`);
      if (channel?.playlistEmbed && !html.includes(channel.playlistEmbed)) failures.push(`html_missing_channel_playlist:${entry.route}`);
    }
    data.routes.push({ ...entry, file, css, js });
  }

  for (const asset of sharedCss) {
    if (TOOL_ONLY_CSS.has(asset)) continue;
    if (!seenCss.has(asset)) failures.push(`shared_css_not_referenced_by_main_routes:${asset}`);
  }
  for (const asset of sharedJs) {
    if (!seenJs.has(asset)) failures.push(`shared_js_not_referenced_by_main_routes:${asset}`);
  }
}

async function validateLocalHtmlInventory(context, failures, data) {
  if (context.baseUrl) return;
  const files = await walk(context.root);
  const htmlFiles = files
    .filter((file) => file.endsWith(".html"))
    .map((file) => relative(context.root, file).split("\\").join("/"))
    .sort();
  data.htmlFiles = htmlFiles;
  if (htmlFiles.length !== 21) failures.push(`html_file_count:${htmlFiles.length}`);
  for (const file of htmlFiles) {
    const html = await readLocalText(context.root, file);
    for (const href of [...stylesheetHrefs(html), ...scriptSrcs(html)]) {
      const result = await assetExists(context, href);
      if (!result.ok) failures.push(`html_references_missing_asset:${file}:${href}`);
    }
  }
}

async function main() {
  const args = parseArgs();
  const failures = [];
  const context = {
    root: resolve(process.cwd(), SITE_DIR),
    baseUrl: args.baseUrl,
  };
  const raw = await readText(context, context.baseUrl ? "/data/site-structure.json" : "data/site-structure.json");
  const structure = JSON.parse(raw);
  const data = {
    mode: context.baseUrl ? "live" : "local",
    routes: [],
    assetResults: [],
    htmlFiles: [],
  };

  validateLocales(structure, failures);
  validatePages(structure, failures);
  validateChannels(structure, failures);
  await validateAssets(structure, context, failures, data);
  await validateHtmlRoutes(structure, context, failures, data);
  await validateLocalHtmlInventory(context, failures, data);

  await mkdir(args.outDir, { recursive: true });
  const report = {
    ok: failures.length === 0,
    mode: data.mode,
    failures,
    data,
  };
  await writeFile(resolve(args.outDir, "site-structure-contract.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({
    ok: report.ok,
    mode: report.mode,
    outDir: args.outDir,
    failed: failures.length,
    pages: data.routes.length,
    assets: data.assetResults.length,
    htmlFiles: data.htmlFiles.length || undefined,
  }, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
