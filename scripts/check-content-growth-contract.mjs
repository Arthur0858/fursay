import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const SITE_DIR = resolve(process.cwd(), "fursay-optimized-site");
const DEFAULT_OUT = "/tmp/fursay-content-growth-contract";
const PAGES = [
  { path: "/", file: "index.html", minLatest: 2, targets: { koko: "/episodes/koko-feelings", noor: "/episodes/noor-greetings" } },
  { path: "/zh/", file: "zh/index.html", minLatest: 2, minContent: 1500, targets: { koko: "/zh/episodes/koko-feelings", noor: "/zh/episodes/noor-greetings" } },
  { path: "/ar/", file: "ar/index.html", minLatest: 2, targets: { koko: "/ar/episodes/koko-feelings", noor: "/ar/episodes/noor-greetings" } },
  { path: "/koko", file: "koko.html", minLatest: 1, targets: { koko: "/episodes/koko-feelings" } },
  { path: "/zh/koko", file: "zh/koko.html", minLatest: 1, minContent: 1800, targets: { koko: "/zh/episodes/koko-feelings" } },
  { path: "/ar/koko", file: "ar/koko.html", minLatest: 1, targets: { koko: "/ar/episodes/koko-feelings" } },
  { path: "/arabic", file: "arabic.html", minLatest: 1, targets: { noor: "/episodes/noor-greetings" } },
  { path: "/zh/arabic", file: "zh/arabic.html", minLatest: 1, minContent: 2250, targets: { noor: "/zh/episodes/noor-greetings" } },
  { path: "/ar/arabic", file: "ar/arabic.html", minLatest: 1, targets: { noor: "/ar/episodes/noor-greetings" } },
  { path: "/zh/products", file: "zh/products.html", minLatest: 0, minContent: 500, targets: {} },
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

async function readText(baseUrl, page) {
  if (baseUrl) {
    const response = await fetch(`${baseUrl}${page.path}`);
    if (!response.ok) throw new Error(`${page.path} status ${response.status}`);
    return response.text();
  }
  return readFile(resolve(SITE_DIR, page.file), "utf8");
}

async function readJson(baseUrl, pathname) {
  if (baseUrl) {
    const response = await fetch(`${baseUrl}${pathname}`);
    if (!response.ok) throw new Error(`${pathname} status ${response.status}`);
    return response.json();
  }
  return JSON.parse(await readFile(resolve(SITE_DIR, pathname.replace(/^\//, "")), "utf8"));
}

function attr(tag, name) {
  return tag.match(new RegExp(`\\s${name}=(["'])(.*?)\\1`, "i"))?.[2] || "";
}

function latestStoryLinks(html) {
  return [...html.matchAll(/<a\b[^>]*\sdata-latest-story=["'](koko|noor)["'][^>]*>/gi)]
    .map((match) => ({ pack: match[1], href: attr(match[0], "href"), tag: match[0] }));
}

function visibleContentLength(html) {
  const visible = html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
  return (visible.match(/[A-Za-z0-9\u4e00-\u9fff\u0600-\u06ff]/g) || []).length;
}

async function main() {
  const args = parseArgs();
  const failures = [];
  const pages = [];
  let totalLatest = 0;
  for (const page of PAGES) {
    const html = await readText(args.baseUrl, page);
    const links = latestStoryLinks(html);
    const contentLength = visibleContentLength(html);
    const latest = links.map((link) => link.pack);
    totalLatest += latest.length;
    if (latest.length < page.minLatest) failures.push(`${page.path}:latest_story_entries:${latest.length}<${page.minLatest}`);
    if (page.minContent && contentLength < page.minContent) failures.push(`${page.path}:thin_visible_content:${contentLength}<${page.minContent}`);
    if (page.minLatest > 0 && !/youtube\.com\/@(?:KokosForest|ArabicKidsChinese)/.test(html)) failures.push(`${page.path}:missing_youtube_story_link`);
    for (const [pack, expectedHref] of Object.entries(page.targets || {})) {
      const link = links.find((item) => item.pack === pack);
      if (!link) {
        failures.push(`${page.path}:missing_latest_story_pack:${pack}`);
        continue;
      }
      if (link.href !== expectedHref) failures.push(`${page.path}:latest_story_href:${pack}:${link.href || "none"}!=${expectedHref}`);
      if (/^https?:\/\//i.test(link.href)) failures.push(`${page.path}:latest_story_external:${pack}:${link.href}`);
      if (/target=["']_blank["']/i.test(link.tag)) failures.push(`${page.path}:latest_story_external_target:${pack}`);
    }
    pages.push({ path: page.path, latestStories: latest.length, contentLength, packs: latest, links: links.map(({ pack, href }) => ({ pack, href })) });
  }
  const release = await readJson(args.baseUrl, "/release.json");
  const siteHealth = await readJson(args.baseUrl, "/site-health.json");
  if (release.liveExpectations?.latestStoryEntries !== totalLatest) failures.push(`release_latest_story_entries:${release.liveExpectations?.latestStoryEntries || "none"}!=${totalLatest}`);
  if (siteHealth.growth?.latestStoryEntries !== totalLatest) failures.push(`site_health_latest_story_entries:${siteHealth.growth?.latestStoryEntries || "none"}!=${totalLatest}`);
  await mkdir(args.outDir, { recursive: true });
  const report = { ok: failures.length === 0, mode: args.baseUrl ? "live" : "local", failures, totalLatest, pages };
  await writeFile(resolve(args.outDir, "content-growth-contract.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({ ok: report.ok, mode: report.mode, outDir: args.outDir, failed: failures.length, latestStoryEntries: totalLatest }, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
