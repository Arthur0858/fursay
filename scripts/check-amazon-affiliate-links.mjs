import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const DEFAULT_OUT = "/tmp/fursay-amazon-affiliate-links";
const AMAZON_TAG = "parenttechche-20";
const PAGES = [
  "/",
  "/zh/",
  "/ar/",
  "/koko",
  "/zh/koko",
  "/ar/koko",
  "/arabic",
  "/zh/arabic",
  "/ar/arabic",
];

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {
    baseUrl: "",
    outDir: DEFAULT_OUT,
  };
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--base-url") parsed.baseUrl = args[++i].replace(/\/$/, "");
    if (args[i] === "--out-dir") parsed.outDir = args[++i];
  }
  return parsed;
}

function localPath(pathname) {
  if (pathname === "/") return "fursay-optimized-site/index.html";
  if (pathname.endsWith("/")) return `fursay-optimized-site${pathname}index.html`;
  return `fursay-optimized-site${pathname}.html`;
}

async function readPage(pathname, baseUrl) {
  if (baseUrl) {
    const response = await fetch(`${baseUrl}${pathname}`);
    const text = await response.text();
    return {
      status: response.status,
      html: text,
      source: `${baseUrl}${pathname}`,
    };
  }
  return {
    status: 200,
    html: await readFile(resolve(process.cwd(), localPath(pathname)), "utf8"),
    source: localPath(pathname),
  };
}

function attr(tag, name) {
  const match = tag.match(new RegExp(`${name}=["']([^"']+)["']`, "i"));
  return match ? match[1] : "";
}

function pageDisclosureOk(html) {
  return /commission|affiliate|sponsored|聯盟|回饋|أمازون|تابعة|عمولة/i.test(html);
}

function checkPage(pathname, html, status) {
  const failures = [];
  const links = [];
  if (status !== 200) failures.push(`bad_status:${status}`);
  const anchors = html.match(/<a\b[^>]*href=["']https:\/\/www\.amazon\.com\/dp\/[^"']+["'][^>]*>/gi) || [];
  for (const anchor of anchors) {
    const href = attr(anchor, "href");
    const rel = attr(anchor, "rel").split(/\s+/).filter(Boolean);
    const className = attr(anchor, "class");
    const url = new URL(href);
    const tag = url.searchParams.get("tag") || "";
    links.push({ href, tag, rel, className });
    if (tag !== AMAZON_TAG) failures.push(`amazon_missing_tag:${href}`);
    if (!rel.includes("noopener")) failures.push(`amazon_missing_noopener:${href}`);
    if (!rel.includes("sponsored")) failures.push(`amazon_missing_sponsored:${href}`);
    if (!className.split(/\s+/).includes("book-link")) failures.push(`amazon_missing_book_link_class:${href}`);
  }
  if (links.length && !pageDisclosureOk(html)) failures.push("amazon_missing_affiliate_disclosure");
  return {
    path: pathname,
    ok: failures.length === 0,
    failures,
    data: {
      amazonLinks: links.length,
      tags: [...new Set(links.map((link) => link.tag).filter(Boolean))],
    },
  };
}

async function main() {
  const args = parseArgs();
  const results = [];
  for (const pathname of PAGES) {
    const page = await readPage(pathname, args.baseUrl);
    results.push(checkPage(pathname, page.html, page.status));
  }
  await mkdir(args.outDir, { recursive: true });
  await writeFile(resolve(args.outDir, "amazon-affiliate-links.json"), JSON.stringify(results, null, 2) + "\n");
  const failed = results.filter((result) => !result.ok);
  const totalLinks = results.reduce((sum, result) => sum + result.data.amazonLinks, 0);
  const report = {
    ok: failed.length === 0,
    outDir: args.outDir,
    failed: failed.length,
    totalLinks,
    tag: AMAZON_TAG,
  };
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
