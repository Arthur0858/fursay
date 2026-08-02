import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { GUIDE_SLUGS } from "./fursay-editorial-content.mjs";

const ROOT = resolve(process.cwd(), "fursay-optimized-site");
const ORIGIN = "https://fursay.com";
const ADS_LINE = "google.com, pub-4093856660317740, DIRECT, f08c47fec0942fa0";
const ACCOUNT_META = "ca-pub-4093856660317740";
const DEFAULT_OUT = "/tmp/fursay-adsense-review-contract";
const LOCALES = [{ prefix: "", code: "en" }, { prefix: "/zh", code: "zh" }, { prefix: "/ar", code: "ar" }];
const TRUST = ["about", "editorial-method", "contact", "terms", "privacy", "support"];
const NOINDEX_HEADERS = ["/links.json", "/share-kit.json", "/creator-kit.json", "/traffic-launch.json", "/noor-sprint-status.json", "/noor-sprint-action.json", "/deploy-readiness.json", "/conversion-health.json", "/monetization-roadmap.json", "/adsense-readiness.json", "/product-samples/koko-printable", "/product-samples/noor-worksheet"];

function args() { const parsed = { baseUrl: "", outDir: DEFAULT_OUT }; const values = process.argv.slice(2); for (let i = 0; i < values.length; i += 1) { if (values[i] === "--base-url") parsed.baseUrl = values[++i].replace(/\/$/, ""); if (values[i] === "--out-dir") parsed.outDir = values[++i]; } return parsed; }
function fileFor(path) { return path === "/" ? "index.html" : path.endsWith("/") ? `${path.slice(1)}index.html` : path.endsWith(".xml") || path.endsWith(".txt") || path.endsWith(".json") ? path.slice(1) : `${path.slice(1)}.html`; }
async function get(baseUrl, path) { if (baseUrl) { const response = await fetch(`${baseUrl}${path}`, { headers: { "User-Agent": "Fursay-AdSense-review-contract/1.0" } }); return { status: response.status, headers: Object.fromEntries(response.headers), text: await response.text() }; } try { return { status: 200, headers: {}, text: await readFile(resolve(ROOT, fileFor(path)), "utf8") }; } catch { return { status: 404, headers: {}, text: "" }; } }
function visible(html) { return html.replace(/<(script|style|template)\b[^>]*>[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&[^;]+;/g, " ").replace(/\s+/g, " ").trim(); }
function main(html) { return html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] || html; }
function meta(html, name) { return [...html.matchAll(/<meta\b[^>]*>/gi)].map((m) => m[0]).find((tag) => new RegExp(`name=["']${name}["']`, "i").test(tag))?.match(/content=["']([^"']*)/i)?.[1] || ""; }
function schemas(html) { const out = []; for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) { try { const data = JSON.parse(match[1]); out.push(...(data["@graph"] || [data])); } catch {} } return out; }
function tokenList(text, locale) { if (locale === "zh") return text.match(/[\u3400-\u9fff]/g) || []; if (locale === "ar") return text.match(/[\u0600-\u06ff]+/g) || []; return text.toLowerCase().match(/[a-z]+(?:[-'][a-z]+)*/g) || []; }
function normalizedParagraph(text) { return text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").replace(/\s+/g, " ").trim(); }
function shingles(tokens, width = 10) { return new Set(Array.from({ length: Math.max(0, tokens.length - width + 1) }, (_, index) => tokens.slice(index, index + width).join(" "))); }

async function mainRun() {
  const options = args(), failures = [], metrics = { sitemapUrls: 0, guidePages: 0, trustPages: 0 };
  const titlesByLocale = new Map(), articlesByLocale = new Map(), sourceUsage = new Map(), sourceNotes = new Set();
  await mkdir(options.outDir, { recursive: true });
  const ads = await get(options.baseUrl, "/ads.txt");
  if (ads.status !== 200 || ads.text.trim() !== ADS_LINE) failures.push(`ads_txt:${ads.status}:${ads.text.trim()}`);
  if (options.baseUrl && !String(ads.headers["content-type"] || "").startsWith("text/plain")) failures.push(`ads_txt_content_type:${ads.headers["content-type"] || "none"}`);
  const sitemapResponse = await get(options.baseUrl, "/sitemap.xml");
  const urls = [...sitemapResponse.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  metrics.sitemapUrls = urls.length;
  if (urls.length !== 72 || new Set(urls).size !== 72) failures.push(`sitemap_expected_72_unique:${urls.length}:${new Set(urls).size}`);
  if (urls.some((url) => !url.startsWith(`${ORIGIN}/`))) failures.push("sitemap_noncanonical_origin");
  for (const url of urls) {
    const path = new URL(url).pathname; const response = await get(options.baseUrl, path); const html = response.text;
    if (response.status !== 200) { failures.push(`${path}:status:${response.status}`); continue; }
    if (meta(html, "google-adsense-account") !== ACCOUNT_META) failures.push(`${path}:adsense_meta`);
    if (/adsbygoogle|pagead2\.googlesyndication\.com/i.test(html)) failures.push(`${path}:ads_runtime_before_approval`);
    if (meta(html, "robots").includes("noindex")) failures.push(`${path}:unexpected_noindex`);
    if (!html.includes('hreflang="x-default"') || !html.includes('rel="canonical"')) failures.push(`${path}:discovery_links`);
    const affiliateLinks = (html.match(/rel="sponsored noopener"/g) || []).length;
    if (affiliateLinks > 2) failures.push(`${path}:affiliate_links_over_2:${affiliateLinks}`);
    const bookSection = html.match(/<section class="booklist-sec"[\s\S]*?<\/section>/i)?.[0] || "";
    if (affiliateLinks && ((html.match(/class="booklist-sec"/g) || []).length !== 1 || (!/class="booklist-note\b/.test(bookSection) && !/disclosure|聯盟|回饋|إفصاح|عمولة/i.test(visible(bookSection))))) failures.push(`${path}:affiliate_section_or_disclosure`);
  }
  const revisions = new Set();
  for (const locale of LOCALES) for (const slug of GUIDE_SLUGS) {
    const path = `${locale.prefix}/guides/${slug}`; const response = await get(options.baseUrl, path); const html = response.text; const text = visible(main(html)); metrics.guidePages += 1;
    if (response.status !== 200) { failures.push(`${path}:status:${response.status}`); continue; }
    const latin = (text.match(/[A-Za-z]+(?:[-'][A-Za-z]+)*/g) || []).length;
    const cjk = (text.match(/[\u3400-\u9fff]/g) || []).length;
    const arabic = (text.match(/[\u0600-\u06ff]+/g) || []).length;
    if (locale.code === "en" && (latin < 900 || latin > 1400)) failures.push(`${path}:english_words:${latin}`);
    if (locale.code === "zh" && (cjk < 1800 || cjk > 2600)) failures.push(`${path}:cjk_chars:${cjk}`);
    if (locale.code === "ar" && (arabic < 900 || arabic > 1400)) failures.push(`${path}:arabic_words:${arabic}`);
    const title = visible(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "");
    const localeTitles = titlesByLocale.get(locale.code) || new Set();
    if (!title || localeTitles.has(title)) failures.push(`${path}:title_missing_or_duplicate`);
    localeTitles.add(title); titlesByLocale.set(locale.code, localeTitles);
    const paragraphMatches = [...main(html).matchAll(/<p\b([^>]*)>([\s\S]*?)<\/p>/gi)];
    const substantive = paragraphMatches.map((match) => ({ standard: /data-editorial-standard/i.test(match[1]), text: visible(match[2]) })).filter((item) => item.text);
    const standardTokens = substantive.filter((item) => item.standard).flatMap((item) => tokenList(item.text, locale.code)).length;
    const allTokens = tokenList(text, locale.code);
    if (allTokens.length && standardTokens / allTokens.length > 0.1) failures.push(`${path}:standard_statement_ratio:${standardTokens}:${allTokens.length}`);
    const articleText = substantive.filter((item) => !item.standard).map((item) => item.text).join(" ");
    const exactParagraphs = new Set(substantive.filter((item) => !item.standard && normalizedParagraph(item.text).length > 80).map((item) => normalizedParagraph(item.text)));
    const articleShingles = shingles(tokenList(articleText, locale.code), 10);
    const localeArticles = articlesByLocale.get(locale.code) || [];
    localeArticles.push({ path, slug, exactParagraphs, shingles: articleShingles }); articlesByLocale.set(locale.code, localeArticles);
    const headings = [...main(html).matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)].map((match) => visible(match[1]));
    const topicHeadings = headings.slice(0, 7);
    if (topicHeadings.length < 5 || new Set(topicHeadings).size !== topicHeadings.length) failures.push(`${path}:topic_h2_under_5_or_duplicate`);
    for (const marker of ["data-guide-editorial-byline", "data-guide-revision", "data-guide-sources"]) if (!html.includes(marker)) failures.push(`${path}:missing:${marker}`);
    const sourceItems = [...(html.match(/<section data-guide-sources>([\s\S]*?)<\/section>/i)?.[1] || "").matchAll(/<li><a href="([^"]+)"[^>]*>([\s\S]*?)<\/a><p data-source-relevance>([\s\S]*?)<\/p><\/li>/gi)];
    if (sourceItems.length < 3) failures.push(`${path}:sources_under_3:${sourceItems.length}`);
    for (const item of sourceItems) { const url = item[1], note = normalizedParagraph(visible(item[3])); sourceUsage.set(url, (sourceUsage.get(url) || 0) + 1); if (!note || sourceNotes.has(`${locale.code}:${note}`)) failures.push(`${path}:source_note_missing_or_duplicate`); sourceNotes.add(`${locale.code}:${note}`); }
    const editorialLinks = [...(html.match(/<section class="editorial-related"[\s\S]*?<\/section>/i)?.[0] || "").matchAll(/href="([^"]*\/guides\/[^"#?]+)"/g)].length;
    if (editorialLinks < 2 || editorialLinks > 4) failures.push(`${path}:editorial_links:${editorialLinks}`);
    const schemaItems = schemas(html); const types = new Set(schemaItems.map((item) => item["@type"]));
    const org = schemaItems.find((item) => item["@type"] === "Organization"); const article = schemaItems.find((item) => item["@type"] === "Article");
    if (!types.has("Article") || !types.has("BreadcrumbList") || !org?.contactPoint || !article?.datePublished || !article?.dateModified) failures.push(`${path}:schema_types_or_responsibility`);
    const revision = html.match(/<p data-guide-revision>([\s\S]*?)<\/p>/i)?.[1] || "";
    if (!revision || revisions.has(revision)) failures.push(`${path}:revision_missing_or_duplicate`); else revisions.add(revision);
  }
  for (const [locale, articles] of articlesByLocale) for (let i = 0; i < articles.length; i += 1) for (let j = i + 1; j < articles.length; j += 1) {
    const left = articles[i], right = articles[j];
    const exact = [...left.exactParagraphs].filter((paragraph) => right.exactParagraphs.has(paragraph));
    if (exact.length) failures.push(`${left.path}:${right.path}:duplicate_substantive_paragraphs:${exact.length}`);
    const intersection = [...left.shingles].filter((value) => right.shingles.has(value)).length;
    const denominator = Math.min(left.shingles.size, right.shingles.size) || 1;
    if (intersection / denominator > 0.05) failures.push(`${left.path}:${right.path}:ten_token_overlap:${(intersection / denominator).toFixed(4)}`);
    const leftHtml = await get(options.baseUrl, left.path); const rightHtml = await get(options.baseUrl, right.path);
    const leftH2 = new Set([...main(leftHtml.text).matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)].slice(0, 7).map((match) => visible(match[1])));
    const rightH2 = new Set([...main(rightHtml.text).matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)].slice(0, 7).map((match) => visible(match[1])));
    if ([...leftH2].filter((value) => rightH2.has(value)).length > 2) failures.push(`${left.path}:${right.path}:shared_h2_over_2`);
  }
  metrics.distinctEditorialSources = sourceUsage.size;
  if (sourceUsage.size < 16) failures.push(`distinct_editorial_sources:${sourceUsage.size}`);
  for (const [url, count] of sourceUsage) if (count > 9) failures.push(`source_supports_over_3_guides:${url}:${count}`);
  for (const locale of LOCALES) for (const name of TRUST) {
    const path = `${locale.prefix}/${name}`, response = await get(options.baseUrl, path); metrics.trustPages += 1;
    if (response.status !== 200 || !visible(main(response.text)).trim()) failures.push(`${path}:trust_page`);
    if (meta(response.text, "google-adsense-account") !== ACCOUNT_META) failures.push(`${path}:adsense_meta`);
  }
  const links = await get(options.baseUrl, "/links");
  if (meta(links.text, "robots") !== "noindex,follow") failures.push("links_missing_noindex_follow");
  if (options.baseUrl && String(links.headers["x-robots-tag"] || "").replace(/\s+/g, "") !== "noindex,follow") failures.push("links_header_missing_noindex_follow");
  if (urls.includes(`${ORIGIN}/links`)) failures.push("links_in_sitemap");
  const readinessResponse = await get(options.baseUrl, "/adsense-readiness.json");
  let readiness = {}; try { readiness = JSON.parse(readinessResponse.text); } catch { failures.push("adsense_readiness_invalid_json"); }
  if (readiness.status !== "not_ready" || readiness.readyToSubmit !== false || readiness.adRuntimeEnabled !== false || readiness.publisherId !== "pub-4093856660317740") failures.push("adsense_readiness_unsafe_state");
  if (readiness.contentTemplateRisk !== "passed" || readiness.distinctEditorialSources < 16 || readiness.minimumDistinctEditorialSources !== 16 || readiness.commercialIndexingPolicy !== "maintained" || readiness.operatorDisclosureMode !== "brand") failures.push("adsense_readiness_content_state");
  if (options.baseUrl) for (const path of NOINDEX_HEADERS) { const response = await get(options.baseUrl, path); if (!String(response.headers["x-robots-tag"] || "").includes("noindex")) failures.push(`${path}:x_robots_tag`); }
  const result = { ok: failures.length === 0, mode: options.baseUrl ? "live" : "local", baseUrl: options.baseUrl || "", metrics, failures };
  await writeFile(resolve(options.outDir, "adsense-review-contract.json"), `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify({ ok: result.ok, mode: result.mode, failed: failures.length, ...metrics }, null, 2));
  if (failures.length) { console.error(failures.join("\n")); process.exit(1); }
}
mainRun().catch((error) => { console.error(error); process.exit(1); });
