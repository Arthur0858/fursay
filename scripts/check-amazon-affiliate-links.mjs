import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const DEFAULT_OUT = "/tmp/fursay-amazon-affiliate-links";
const AMAZON_TAG = "parenttechche-20";
const BOOKS_AFFILIATE_ID = "arthur0858";
const PAGES = [
  { path: "/", market: "amazon" },
  { path: "/zh/", market: "books" },
  { path: "/ar/", market: "amazon" },
  { path: "/koko", market: "amazon" },
  { path: "/zh/koko", market: "books" },
  { path: "/ar/koko", market: "amazon" },
  { path: "/arabic", market: "amazon" },
  { path: "/zh/arabic", market: "books" },
  { path: "/ar/arabic", market: "amazon" },
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
  if (/\.[^/]+$/.test(pathname)) return `fursay-optimized-site${pathname}`;
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

async function readJson(pathname, baseUrl) {
  const page = await readPage(pathname, baseUrl);
  return JSON.parse(page.html);
}

function attr(tag, name) {
  const match = tag.match(new RegExp(`${name}=["']([^"']+)["']`, "i"));
  return match ? match[1] : "";
}

function pageDisclosureOk(html) {
  return /commission|affiliate|sponsored|聯盟|回饋|أمازون|تابعة|عمولة/i.test(html);
}

function isbn13ToIsbn10(value) {
  if (!/^978\d{10}$/.test(value)) return value;
  const body = value.slice(3, 12);
  let sum = 0;
  for (let i = 0; i < body.length; i += 1) sum += (10 - i) * Number(body[i]);
  const check = (11 - (sum % 11)) % 11;
  return `${body}${check === 10 ? "X" : check}`;
}

function amazonProductKey(href) {
  const url = new URL(href);
  const asin = url.pathname.split("/").filter(Boolean)[1] || "";
  return `amazon:${isbn13ToIsbn10(asin.toUpperCase())}`;
}

function booksProductKey(href) {
  const url = new URL(href);
  return `books:${url.pathname.split("/").filter(Boolean).at(-1) || ""}`;
}

function checkPage(page, html, status) {
  const failures = [];
  const amazonLinks = [];
  const booksLinks = [];
  const pathname = page.path;
  if (status !== 200) failures.push(`bad_status:${status}`);
  const amazonAnchors = html.match(/<a\b[^>]*href=["']https:\/\/www\.amazon\.com\/dp\/[^"']+["'][^>]*>/gi) || [];
  const booksAnchors = html.match(/<a\b[^>]*href=["']https:\/\/www\.books\.com\.tw\/exep\/assp\.php\/[^"']+["'][^>]*>/gi) || [];
  for (const anchor of amazonAnchors) {
    const href = attr(anchor, "href");
    const rel = attr(anchor, "rel").split(/\s+/).filter(Boolean);
    const className = attr(anchor, "class");
    const url = new URL(href);
    const tag = url.searchParams.get("tag") || "";
    const productKey = amazonProductKey(href);
    amazonLinks.push({ href, tag, rel, className, productKey });
    if (tag !== AMAZON_TAG) failures.push(`amazon_missing_tag:${href}`);
    if (!rel.includes("noopener")) failures.push(`amazon_missing_noopener:${href}`);
    if (!rel.includes("sponsored")) failures.push(`amazon_missing_sponsored:${href}`);
    if (!className.split(/\s+/).includes("book-link")) failures.push(`amazon_missing_book_link_class:${href}`);
  }
  for (const anchor of booksAnchors) {
    const href = attr(anchor, "href");
    const rel = attr(anchor, "rel").split(/\s+/).filter(Boolean);
    const className = attr(anchor, "class");
    const productKey = booksProductKey(href);
    booksLinks.push({ href, rel, className, productKey });
    if (!href.includes(`/assp.php/${BOOKS_AFFILIATE_ID}/`)) failures.push(`books_missing_affiliate_id:${href}`);
    if (!href.includes("utm_source=arthur0858")) failures.push(`books_missing_utm_source:${href}`);
    if (!rel.includes("noopener")) failures.push(`books_missing_noopener:${href}`);
    if (!rel.includes("sponsored")) failures.push(`books_missing_sponsored:${href}`);
    if (!className.split(/\s+/).includes("book-link")) failures.push(`books_missing_book_link_class:${href}`);
  }
  if (page.market === "books" && amazonLinks.length) failures.push(`zh_page_must_not_use_amazon:${amazonLinks.length}`);
  if (page.market === "books" && !booksLinks.length) failures.push("zh_page_missing_books_links");
  if (page.market === "amazon" && booksLinks.length) failures.push(`non_zh_page_must_not_use_books:${booksLinks.length}`);
  if (page.market === "amazon" && !amazonLinks.length) failures.push("non_zh_page_missing_amazon_links");
  const productKeys = [...amazonLinks, ...booksLinks].map((link) => link.productKey);
  const duplicateProductKeys = [...new Set(productKeys.filter((key, index) => productKeys.indexOf(key) !== index))];
  if (duplicateProductKeys.length) failures.push(`duplicate_affiliate_products:${duplicateProductKeys.join(",")}`);
  if ((amazonLinks.length || booksLinks.length) && !pageDisclosureOk(html)) failures.push("affiliate_missing_disclosure");
  return {
    path: pathname,
    ok: failures.length === 0,
    failures,
    data: {
      market: page.market,
      amazonLinks: amazonLinks.length,
      booksLinks: booksLinks.length,
      tags: [...new Set(amazonLinks.map((link) => link.tag).filter(Boolean))],
      productKeys,
    },
  };
}

async function main() {
  const args = parseArgs();
  const results = [];
  for (const item of PAGES) {
    const page = await readPage(item.path, args.baseUrl);
    results.push(checkPage(item, page.html, page.status));
  }
  await mkdir(args.outDir, { recursive: true });
  await writeFile(resolve(args.outDir, "amazon-affiliate-links.json"), JSON.stringify(results, null, 2) + "\n");
  const failed = results.filter((result) => !result.ok);
  const totalLinks = results.reduce((sum, result) => sum + result.data.amazonLinks, 0);
  const totalBooksLinks = results.reduce((sum, result) => sum + result.data.booksLinks, 0);
  const release = await readJson("/release.json", args.baseUrl);
  const expectationFailures = [];
  const expectations = release.liveExpectations || {};
  if (expectations.amazonAffiliateLinks !== totalLinks) {
    expectationFailures.push(`release_amazon_links:${expectations.amazonAffiliateLinks ?? "none"}!=${totalLinks}`);
  }
  if (expectations.booksAffiliateLinks !== totalBooksLinks) {
    expectationFailures.push(`release_books_links:${expectations.booksAffiliateLinks ?? "none"}!=${totalBooksLinks}`);
  }
  if (expectations.amazonAffiliateTag !== AMAZON_TAG) {
    expectationFailures.push(`release_amazon_tag:${expectations.amazonAffiliateTag || "none"}!=${AMAZON_TAG}`);
  }
  if (expectations.booksAffiliateId !== BOOKS_AFFILIATE_ID) {
    expectationFailures.push(`release_books_affiliate_id:${expectations.booksAffiliateId || "none"}!=${BOOKS_AFFILIATE_ID}`);
  }
  const report = {
    ok: failed.length === 0 && expectationFailures.length === 0,
    outDir: args.outDir,
    failed: failed.length + expectationFailures.length,
    amazonLinks: totalLinks,
    booksLinks: totalBooksLinks,
    amazonTag: AMAZON_TAG,
    booksAffiliateId: BOOKS_AFFILIATE_ID,
    expectationFailures,
  };
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
