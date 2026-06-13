import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const SITE_DIR = resolve(process.cwd(), "fursay-optimized-site");
const DEFAULT_OUT = "/tmp/fursay-content-growth-contract";
const PAGES = [
  { path: "/", file: "index.html", minLatest: 2 },
  { path: "/zh/", file: "zh/index.html", minLatest: 2 },
  { path: "/ar/", file: "ar/index.html", minLatest: 2 },
  { path: "/koko", file: "koko.html", minLatest: 1 },
  { path: "/zh/koko", file: "zh/koko.html", minLatest: 1 },
  { path: "/ar/koko", file: "ar/koko.html", minLatest: 1 },
  { path: "/arabic", file: "arabic.html", minLatest: 1 },
  { path: "/zh/arabic", file: "zh/arabic.html", minLatest: 1 },
  { path: "/ar/arabic", file: "ar/arabic.html", minLatest: 1 },
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

async function main() {
  const args = parseArgs();
  const failures = [];
  const pages = [];
  let totalLatest = 0;
  for (const page of PAGES) {
    const html = await readText(args.baseUrl, page);
    const latest = [...html.matchAll(/data-latest-story=["'](koko|noor)["']/g)].map((match) => match[1]);
    totalLatest += latest.length;
    if (latest.length < page.minLatest) failures.push(`${page.path}:latest_story_entries:${latest.length}<${page.minLatest}`);
    if (!/youtube\.com\/@(?:KokosForest|ArabicKidsChinese)/.test(html)) failures.push(`${page.path}:missing_youtube_story_link`);
    pages.push({ path: page.path, latestStories: latest.length, packs: latest });
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
