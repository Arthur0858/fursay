import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

const SITE_DIR = resolve(process.cwd(), "fursay-optimized-site");
const DEFAULT_OUT = "/tmp/fursay-internal-links";
const ORIGIN = "https://fursay.com";
const ATTRIBUTES = new Set(["href", "src", "action"]);
const EXTERNAL_SCHEMES = /^(mailto:|tel:|javascript:|data:)/i;
const FETCH_TIMEOUT_MS = 8000;

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
    else if (entry.isFile() && entry.name.endsWith(".html")) files.push(full);
  }
  return files;
}

function routeForHtmlFile(file) {
  const rel = relative(SITE_DIR, file).replace(/\\/g, "/");
  if (rel === "index.html") return "/";
  if (rel.endsWith("/index.html")) return `/${rel.slice(0, -"index.html".length)}`;
  return `/${rel.replace(/\.html$/, "")}`;
}

function localPathForUrlPath(pathname) {
  if (pathname === "/") return "index.html";
  if (pathname.endsWith("/")) return `${pathname.slice(1)}index.html`;
  if (/\.[^/]+$/.test(pathname)) return pathname.slice(1);
  return `${pathname.slice(1)}.html`;
}

function idsIn(html) {
  const ids = new Set();
  for (const match of html.matchAll(/\s(?:id|name)=["']([^"']+)["']/gi)) {
    ids.add(match[1]);
  }
  return ids;
}

function tagAttributes(tag) {
  const attrs = [];
  for (const match of tag.matchAll(/\s([:\w-]+)=["']([^"']*)["']/gi)) {
    const name = match[1].toLowerCase();
    if (ATTRIBUTES.has(name)) attrs.push({ name, value: match[2] });
  }
  return attrs;
}

function linkAttributes(html) {
  return [...html.matchAll(/<[^>]+>/g)].flatMap((match) => tagAttributes(match[0]));
}

async function readPages() {
  const pages = new Map();
  for (const file of await walk(SITE_DIR)) {
    const html = await readFile(file, "utf8");
    const route = routeForHtmlFile(file);
    pages.set(route, {
      route,
      file: relative(SITE_DIR, file).replace(/\\/g, "/"),
      html,
      ids: idsIn(html),
      links: linkAttributes(html),
    });
  }
  return pages;
}

async function readShortlinkPaths(baseUrl) {
  const text = baseUrl
    ? await fetch(`${baseUrl}/shortlinks.json`, { cache: "no-store" }).then((response) => {
        if (!response.ok) throw new Error(`/shortlinks.json status ${response.status}`);
        return response.text();
      })
    : await readFile(resolve(SITE_DIR, "shortlinks.json"), "utf8");
  const manifest = JSON.parse(text);
  return new Set((manifest.routes || []).map((route) => route.path));
}

async function localTargetExists(pathname) {
  try {
    const info = await stat(resolve(SITE_DIR, localPathForUrlPath(pathname)));
    return info.isFile() && info.size > 0;
  } catch {
    return false;
  }
}

async function liveTargetExists(baseUrl, pathname) {
  try {
    const response = await fetch(`${baseUrl}${pathname}`, {
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    return response.status >= 200 && response.status < 400;
  } catch {
    return false;
  }
}

async function readTargetHtml(baseUrl, pages, pathname) {
  const pageRoute = pathname.endsWith("/") ? pathname : pathname.replace(/\.html$/, "");
  if (!baseUrl) return pages.get(pageRoute)?.html || "";
  try {
    const response = await fetch(`${baseUrl}${pathname}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) return "";
    return response.text();
  } catch {
    return "";
  }
}

function pageForHash(pages, pathname) {
  const route = pathname.endsWith("/") ? pathname : pathname.replace(/\.html$/, "");
  return pages.get(route);
}

async function checkReference({ baseUrl, pages, shortlinkPaths, caches, sourceRoute, attrName, rawValue }) {
  const failures = [];
  if (!rawValue || EXTERNAL_SCHEMES.test(rawValue)) return failures;

  let url;
  try {
    url = new URL(rawValue, `${ORIGIN}${sourceRoute}`);
  } catch {
    return [`${sourceRoute}:${attrName}:bad_url:${rawValue}`];
  }

  if (url.origin !== ORIGIN) return failures;
  if (url.pathname.endsWith(".html")) failures.push(`${sourceRoute}:${attrName}:html_suffix:${rawValue}`);
  if (shortlinkPaths.has(url.pathname)) return failures;
  if (url.pathname === "/api/subscribe") return failures;

  if (!caches.targets.has(url.pathname)) {
    caches.targets.set(url.pathname, baseUrl
      ? await liveTargetExists(baseUrl, url.pathname)
      : await localTargetExists(url.pathname));
  }
  const exists = caches.targets.get(url.pathname);
  if (!exists) failures.push(`${sourceRoute}:${attrName}:missing_target:${rawValue}:${localPathForUrlPath(url.pathname)}`);

  const hash = decodeURIComponent(url.hash.slice(1));
  if (hash) {
    const targetPage = baseUrl ? null : pageForHash(pages, url.pathname);
    if (!targetPage && !caches.html.has(url.pathname)) {
      caches.html.set(url.pathname, await readTargetHtml(baseUrl, pages, url.pathname));
    }
    const html = targetPage?.html || caches.html.get(url.pathname) || "";
    const ids = targetPage?.ids || idsIn(html);
    if (!ids.has(hash)) failures.push(`${sourceRoute}:${attrName}:missing_fragment:${rawValue}`);
  }

  return failures;
}

async function main() {
  const args = parseArgs();
  const pages = await readPages();
  const shortlinkPaths = await readShortlinkPaths(args.baseUrl);
  const failures = [];
  const checks = [];
  const caches = { targets: new Map(), html: new Map() };

  for (const page of pages.values()) {
    let checked = 0;
    for (const link of page.links) {
      const linkFailures = await checkReference({
        baseUrl: args.baseUrl,
        pages,
        shortlinkPaths,
        caches,
        sourceRoute: page.route,
        attrName: link.name,
        rawValue: link.value,
      });
      failures.push(...linkFailures);
      checked += 1;
    }
    checks.push({ route: page.route, file: page.file, references: checked });
  }

  await mkdir(args.outDir, { recursive: true });
  const report = {
    ok: failures.length === 0,
    mode: args.baseUrl ? "live" : "local",
    baseUrl: args.baseUrl || "",
    failures,
    pages: checks,
    shortlinks: shortlinkPaths.size,
    uniqueTargets: caches.targets.size,
  };
  await writeFile(resolve(args.outDir, "internal-links-contract.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({
    ok: report.ok,
    mode: report.mode,
    outDir: args.outDir,
    failed: failures.length,
    pages: checks.length,
    references: checks.reduce((sum, page) => sum + page.references, 0),
    shortlinks: shortlinkPaths.size,
    uniqueTargets: caches.targets.size,
  }, null, 2));
  if (!report.ok) process.exit(1);
}

main().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
