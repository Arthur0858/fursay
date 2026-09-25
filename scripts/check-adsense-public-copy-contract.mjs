import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const ROOT = resolve(process.cwd(), "fursay-optimized-site");
const OUT = "/tmp/fursay-adsense-public-copy-contract";
const ORIGIN = "https://fursay.com";

function parseArgs() {
  const parsed = { baseUrl: "", outDir: OUT };
  const values = process.argv.slice(2);
  for (let index = 0; index < values.length; index += 1) {
    if (values[index] === "--base-url") parsed.baseUrl = values[++index].replace(/\/$/, "");
    if (values[index] === "--out-dir") parsed.outDir = values[++index];
  }
  return parsed;
}

async function get(baseUrl, path) {
  if (baseUrl) {
    const response = await fetch(`${baseUrl}${path}`, { headers: { "User-Agent": "Fursay-public-copy-contract/1.0" } });
    return { status: response.status, text: await response.text() };
  }
  const file = path === "/" ? "index.html" : path.endsWith("/") ? `${path.slice(1)}index.html` : /\.[a-z0-9]+$/i.test(path) ? path.slice(1) : `${path.slice(1)}.html`;
  try { return { status: 200, text: await readFile(resolve(ROOT, file), "utf8") }; } catch { return { status: 404, text: "" }; }
}

function visible(html) {
  return html.replace(/<(script|style|template)\b[^>]*>[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&[^;]+;/g, " ").replace(/\s+/g, " ").trim();
}

async function run() {
  const options = parseArgs(), failures = [], checked = [];
  await mkdir(options.outDir, { recursive: true });
  const sitemap = await get(options.baseUrl, "/sitemap.xml");
  const urls = [...sitemap.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  if (urls.length !== 84 || new Set(urls).size !== 84) failures.push(`sitemap_count:${urls.length}`);
  const forbiddenCopy = /presale[\s-]*preparation|review-required|checkoutEnabled|paymentLinksAllowed|publicPrice|正在準備|預售準備|審核中|قيد الإعداد|قيد المراجعة|البيع المسبق/i;
  const unsupportedCount = /(?:\+\s*1000|1000\s*\+|\+\s*100|100\s*\+)\s*(?:stories|episodes|chapters|集|篇|حلقة)/i;
  for (const url of urls) {
    const path = new URL(url).pathname;
    const response = await get(options.baseUrl, path);
    if (response.status !== 200) { failures.push(`${path}:status:${response.status}`); continue; }
    const text = visible(response.text);
    if (forbiddenCopy.test(text)) failures.push(`${path}:unfinished_or_internal_copy`);
    if (unsupportedCount.test(text)) failures.push(`${path}:unsupported_content_count`);
    if (/class=["'][^"']*presale-brand-page/i.test(response.text)) failures.push(`${path}:legacy_presale_css_class`);
    if (/^\/products\/(?:koko-printable|noor-worksheet)$/.test(path) || /^\/(?:zh|ar)\/products\/(?:koko-printable|noor-worksheet)$/.test(path)) {
      if (!response.text.includes('"@type":"LearningResource"') || !response.text.includes('"isAccessibleForFree":true') || !response.text.includes('"@type":"DownloadAction"')) failures.push(`${path}:free_learning_resource_schema`);
    }
    checked.push(path);
  }
  for (const path of ["/llms.txt", "/release.json"]) {
    const response = await get(options.baseUrl, path);
    if (response.status !== 200) { failures.push(`${path}:status:${response.status}`); continue; }
    if (forbiddenCopy.test(response.text)) failures.push(`${path}:unfinished_or_internal_copy`);
    if (/productPresalePages|presale-preparation/i.test(response.text)) failures.push(`${path}:legacy_public_product_naming`);
  }
  const report = { ok: failures.length === 0, mode: options.baseUrl ? "live" : "local", baseUrl: options.baseUrl, checkedIndexablePages: checked.length, sitemapUrls: urls.length, failures };
  await writeFile(resolve(options.outDir, "adsense-public-copy-contract.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ ok: report.ok, mode: report.mode, checkedIndexablePages: report.checkedIndexablePages, sitemapUrls: report.sitemapUrls, failed: failures.length }, null, 2));
  if (failures.length) { console.error(failures.join("\n")); process.exit(1); }
}

run().catch((error) => { console.error(error); process.exit(1); });
