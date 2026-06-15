import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const ROOT = process.cwd();
const SITE_DIR = resolve(ROOT, "fursay-optimized-site");
const DEFAULT_OUT = "/tmp/fursay-discovery-contract";
const ORIGIN = "https://fursay.com";
const FETCH_TIMEOUT_MS = 15_000;
const PACKS = ["koko", "noor"];
const PUBLIC_PAGES = [
  "/",
  "/zh/",
  "/ar/",
  "/koko",
  "/zh/koko",
  "/ar/koko",
  "/arabic",
  "/zh/arabic",
  "/ar/arabic",
  "/links",
  "/share-kit",
  "/creator-kit",
  "/traffic-launch",
  "/noor-sprint-status",
  "/deploy-readiness",
  "/conversion-health",
  "/monetization-roadmap",
  "/products",
  "/zh/products",
  "/ar/products",
  "/product-samples/koko-printable",
  "/product-samples/noor-worksheet",
  "/episodes/koko-feelings",
  "/zh/episodes/koko-feelings",
  "/ar/episodes/koko-feelings",
  "/episodes/noor-colors",
  "/zh/episodes/noor-colors",
  "/ar/episodes/noor-colors",
  "/episodes/noor-greetings",
  "/zh/episodes/noor-greetings",
  "/ar/episodes/noor-greetings",
];
const DISCOVERY_FILES = [
  "/sitemap.xml",
  "/robots.txt",
  "/llms.txt",
  "/site-health.json",
  "/release.json",
  "/deploy-readiness.json",
  "/campaigns.json",
  "/creator-kit.json",
  "/share-kit.json",
  "/traffic-launch.json",
  "/noor-sprint-status.json",
  "/links.json",
  "/conversion-health.json",
  "/products.json",
  "/monetization-roadmap.json",
  "/video-discovery.json",
  "/shortlinks.json",
];
const PUBLIC_DOWNLOADS = [
  "/downloads/koko-printable-sample.pdf",
  "/downloads/noor-worksheet-sample.pdf",
];
const KNOWN_API_ROUTES = new Set([
  "/api/event",
]);
const WORKER_ONLY_ROUTES = new Set([
  "/download/koko-printable-sample",
  "/download/noor-worksheet-sample",
]);
const TOOL_PAGES = [
  { page: "/links", manifest: "/links.json", requiresCommitBadge: false, requiresManifestLink: false },
  { page: "/share-kit", manifest: "/share-kit.json" },
  { page: "/creator-kit", manifest: "/creator-kit.json" },
  { page: "/traffic-launch", manifest: "/traffic-launch.json" },
  { page: "/noor-sprint-status", manifest: "/noor-sprint-status.json", requiresCommitBadge: false },
  { page: "/deploy-readiness", manifest: "/deploy-readiness.json" },
  { page: "/conversion-health", manifest: "/conversion-health.json" },
  { page: "/monetization-roadmap", manifest: "/monetization-roadmap.json" },
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

function localFile(pathname) {
  if (pathname === "/") return "index.html";
  if (pathname.endsWith("/")) return `${pathname.slice(1)}index.html`;
  if (/\.[^/]+$/.test(pathname)) return pathname.slice(1);
  return `${pathname.slice(1)}.html`;
}

async function readText(baseUrl, pathname) {
  if (baseUrl) {
    const response = await fetch(`${baseUrl}${pathname}`, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`${pathname} status ${response.status}`);
    return response.text();
  }
  return readFile(resolve(SITE_DIR, localFile(pathname)), "utf8");
}

async function readJson(baseUrl, pathname) {
  return JSON.parse(await readText(baseUrl, pathname));
}

async function existsLocal(pathname) {
  try {
    await access(resolve(SITE_DIR, localFile(pathname)));
    return true;
  } catch {
    return false;
  }
}

async function existsLive(baseUrl, pathname) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    redirect: "manual",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  return response.status >= 200 && response.status < 400;
}

function attr(tag, name) {
  const match = tag.match(new RegExp(`\\s${name}=(["'])(.*?)\\1`, "i"));
  return match?.[2] || "";
}

function ownUrl(value) {
  try {
    const url = new URL(value);
    return url.origin === ORIGIN ? url : null;
  } catch {
    return null;
  }
}

function collectOwnUrls(value, urls = new Set()) {
  if (typeof value === "string") {
    for (const match of value.matchAll(/https:\/\/fursay\.com[^\s"'<>),]+/g)) {
      const url = ownUrl(match[0]);
      if (url) urls.add(url.toString());
    }
    return urls;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectOwnUrls(item, urls);
    return urls;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) collectOwnUrls(item, urls);
  }
  return urls;
}

function siteHealthRoutePaths(siteHealth) {
  const paths = new Set();
  collectOwnUrls(siteHealth.routes || {}).forEach((url) => paths.add(pathKey(url)));
  return paths;
}

function pathKey(urlString) {
  const url = new URL(urlString);
  return url.pathname;
}

function hasPackSet(object) {
  const keys = Object.keys(object || {}).sort();
  return keys.join(",") === PACKS.join(",");
}

function expectedAttribution(pack, kind) {
  const campaign = `${pack === "koko" ? "koko" : "noor"}_story_funnel`;
  const content = {
    join: `join_${pack}`,
    sample: `sample_${pack}`,
    share: `share_sample_${pack}`,
    bio: `bio_${pack}`,
    creator: "creator_kit_sample",
  }[kind];
  return { campaign, content };
}

function checkShortlinkRoute(route, failures, knownPages) {
  const routeUrl = ownUrl(route.shortlink || "");
  const targetUrl = ownUrl(route.target || "");
  if (!routeUrl) failures.push(`shortlink_bad_shortlink:${route.path || "none"}`);
  if (!targetUrl) failures.push(`shortlink_bad_target:${route.path || "none"}`);
  if (routeUrl && routeUrl.pathname !== route.path) failures.push(`shortlink_path_mismatch:${route.path}:${routeUrl.pathname}`);
  if (targetUrl && targetUrl.pathname !== route.targetPath) failures.push(`shortlink_target_path_mismatch:${route.path}:${targetUrl.pathname}`);
  if (route.targetPath && !knownPages.has(route.targetPath)) failures.push(`shortlink_unknown_target_page:${route.path}:${route.targetPath}`);
  if (route.status !== 302) failures.push(`shortlink_bad_status:${route.path}:${route.status || "none"}`);
  if (route.attribution?.subscribe !== route.pack) failures.push(`shortlink_bad_subscribe:${route.path}:${route.attribution?.subscribe || "none"}`);

  if (routeUrl) {
    const parts = routeUrl.pathname.split("/").filter(Boolean);
    const kind = parts[0] === "creator" && parts.length > 2 ? `${parts[2]}` : parts[0];
    const baseKind = parts[0] === "creator" ? "creator" : kind;
    const expected = expectedAttribution(route.pack, baseKind);
    if (expected.campaign && route.attribution?.utm_campaign !== expected.campaign) {
      failures.push(`shortlink_bad_campaign:${route.path}:${route.attribution?.utm_campaign || "none"}`);
    }
    if (expected.content && route.attribution?.utm_content !== expected.content && parts.length <= 2) {
      failures.push(`shortlink_bad_content:${route.path}:${route.attribution?.utm_content || "none"}`);
    }
  }
}

function checkToolPage(page, html, manifest, expectedCommit, failures, options = {}) {
  const canonical = [...html.matchAll(/<link\b[^>]*>/gi)]
    .find((match) => attr(match[0], "rel").toLowerCase() === "canonical")?.[0] || "";
  if (attr(canonical, "href") !== `${ORIGIN}${page}`) failures.push(`${page}:bad_canonical:${attr(canonical, "href") || "none"}`);
  if (options.requiresManifestLink !== false && !html.includes(`href="${manifest}"`)) failures.push(`${page}:missing_manifest_link:${manifest}`);
  if (options.requiresCommitBadge !== false && !html.includes(`Commit ${expectedCommit}`)) failures.push(`${page}:missing_commit_badge:${expectedCommit}`);
  if (page === "/links") {
    for (const needle of ["JSON manifest", "Commit ", "Deploy readiness", "Traffic launch kit", "Creator kit", "Share kit"]) {
      if (html.includes(needle)) failures.push(`${page}:public_page_leaks_internal:${needle}`);
    }
  }
}

async function main() {
  const args = parseArgs();
  const failures = [];
  const checks = [];
  const knownPages = new Set(PUBLIC_PAGES);
  const knownFiles = new Set([...DISCOVERY_FILES, ...PUBLIC_DOWNLOADS]);
  const texts = {};
  const json = {};

  for (const pathname of [...DISCOVERY_FILES, ...PUBLIC_PAGES]) {
    texts[pathname] = await readText(args.baseUrl, pathname);
  }
  for (const pathname of DISCOVERY_FILES.filter((path) => path.endsWith(".json"))) {
    json[pathname] = JSON.parse(texts[pathname]);
  }

  const sitemap = texts["/sitemap.xml"];
  const robots = texts["/robots.txt"];
  const llms = texts["/llms.txt"];
  const release = json["/release.json"];
  const shortlinks = json["/shortlinks.json"];
  const expectedCommit = release.source?.commit || "";
  const expectedDate = release.releasedAt || "";
  const expectations = release.liveExpectations || {};
  const shortlinkPaths = new Set((shortlinks.routes || []).map((route) => route.path));
  const shortlinkUrls = new Set((shortlinks.routes || []).map((route) => route.shortlink));

  if (!robots.includes("Sitemap: https://fursay.com/sitemap.xml")) failures.push("robots_missing_sitemap");
  if (!sitemap.includes('xmlns:xhtml="http://www.w3.org/1999/xhtml"')) failures.push("sitemap_missing_hreflang_namespace");
  for (const page of PUBLIC_PAGES.slice(0, 9)) {
    if (!sitemap.includes(`<loc>${ORIGIN}${page}</loc>`)) failures.push(`sitemap_missing_indexable_page:${page}`);
  }
  for (const route of [...PUBLIC_PAGES, ...DISCOVERY_FILES]) {
    if (!llms.includes(`${ORIGIN}${route}`)) failures.push(`llms_missing_route:${route}`);
  }
  for (const route of shortlinks.routes || []) {
    if (!llms.includes(route.shortlink)) failures.push(`llms_missing_shortlink:${route.shortlink}`);
    checkShortlinkRoute(route, failures, knownPages);
  }

  const commerceNeedles = [
    "Traditional Chinese pages use Books.com.tw affiliate links only",
    "Books.com.tw affiliate ID: arthur0858",
    `Current expected Books.com.tw affiliate links: ${expectations.booksAffiliateLinks}`,
    "English and Arabic pages use Amazon affiliate links only",
    "Amazon Associates Store ID: parenttechche-20",
    `Current expected Amazon affiliate links: ${expectations.amazonAffiliateLinks}`,
    `Affiliate click tracking is expected on all ${expectations.affiliateEventTrackingPages} public story and episode pages.`,
  ];
  for (const needle of commerceNeedles) {
    if (!llms.includes(needle)) failures.push(`llms_missing_commerce_policy:${needle}`);
  }

  for (const [pathname, manifest] of Object.entries(json)) {
    if (manifest.platform && manifest.platform !== "cloudflare-workers-static-assets") {
      failures.push(`${pathname}:bad_platform:${manifest.platform}`);
    }
    if (manifest.source?.commit && manifest.source.commit !== expectedCommit) {
      failures.push(`${pathname}:bad_commit:${manifest.source.commit}`);
    }
    const date = manifest.updatedAt || manifest.releasedAt || "";
    if (date && date !== expectedDate) failures.push(`${pathname}:bad_date:${date}`);
  }

  for (const pathname of ["/campaigns.json", "/creator-kit.json", "/share-kit.json", "/traffic-launch.json", "/links.json"]) {
    const rootKey = pathname === "/campaigns.json" ? "campaigns" : "packs";
    if (!hasPackSet(json[pathname][rootKey])) failures.push(`${pathname}:bad_pack_set`);
  }
  if (!hasPackSet(json["/video-discovery.json"].channels)) failures.push("/video-discovery.json:bad_channel_set");

  const siteHealthPaths = siteHealthRoutePaths(json["/site-health.json"]);
  for (const page of PUBLIC_PAGES) {
    if (!siteHealthPaths.has(page)) failures.push(`site_health_missing_public_page_route:${page}`);
  }

  for (const pack of PACKS) {
    const campaign = json["/campaigns.json"].campaigns?.[pack] || {};
    for (const [kind, url] of Object.entries(campaign.shortlinks || {})) {
      if (!shortlinkUrls.has(url)) failures.push(`campaign_shortlink_unknown:${pack}:${kind}:${url}`);
    }
    if (json["/links.json"].packs?.[pack]?.primaryAction?.url !== campaign.shortlinks?.sample) {
      failures.push(`links_primary_action_mismatch:${pack}`);
    }
    if (json["/share-kit.json"].packs?.[pack]?.sampleShortlink !== campaign.shortlinks?.sample) {
      failures.push(`share_kit_sample_mismatch:${pack}`);
    }
    if (json["/creator-kit.json"].packs?.[pack]?.creatorShortlink !== campaign.shortlinks?.creator) {
      failures.push(`creator_kit_creator_mismatch:${pack}`);
    }
    if (json["/video-discovery.json"].channels?.[pack]?.subscribeShortlink !== campaign.shortlinks?.sample) {
      failures.push(`video_discovery_subscribe_mismatch:${pack}`);
    }
  }

  for (const toolPage of TOOL_PAGES) {
    checkToolPage(toolPage.page, texts[toolPage.page], toolPage.manifest, expectedCommit, failures, toolPage);
  }

  const ownUrls = new Set();
  collectOwnUrls(json, ownUrls);
  collectOwnUrls(llms, ownUrls);
  const unknownOwnUrls = [];
  for (const url of ownUrls) {
    const pathname = pathKey(url);
    const known = knownPages.has(pathname)
      || knownFiles.has(pathname)
      || shortlinkPaths.has(pathname)
      || KNOWN_API_ROUTES.has(pathname)
      || WORKER_ONLY_ROUTES.has(pathname)
      || pathname.startsWith("/images/qr/");
    if (!known) unknownOwnUrls.push(url);
  }
  failures.push(...unknownOwnUrls.map((url) => `unknown_own_url:${url}`));

  const publicArtifacts = [
    ...PUBLIC_PAGES,
    ...DISCOVERY_FILES,
    ...PUBLIC_DOWNLOADS,
    ...[...ownUrls].map(pathKey).filter((path) => path.startsWith("/images/qr/")),
  ];
  for (const pathname of [...new Set(publicArtifacts)]) {
    const exists = args.baseUrl ? await existsLive(args.baseUrl, pathname) : await existsLocal(pathname);
    checks.push({ path: pathname, exists });
    if (!exists) failures.push(`missing_public_artifact:${pathname}`);
  }

  await mkdir(args.outDir, { recursive: true });
  const report = {
    ok: failures.length === 0,
    mode: args.baseUrl ? "live" : "local",
    baseUrl: args.baseUrl || "",
    expectedCommit,
    expectedDate,
    failures,
    ownUrlCount: ownUrls.size,
    checks,
  };
  await writeFile(resolve(args.outDir, "discovery-contract.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({
    ok: report.ok,
    mode: report.mode,
    outDir: args.outDir,
    failed: failures.length,
    ownUrlCount: ownUrls.size,
    checks: checks.length,
  }, null, 2));
  if (!report.ok) process.exit(1);
  process.exit(0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
