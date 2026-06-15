import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const SITE_DIR = resolve(process.cwd(), "fursay-optimized-site");
const DEFAULT_OUT = "/tmp/fursay-head-metadata";
const PAGES = [
  { path: "/", file: "index.html", lang: "en", canonical: "https://fursay.com/", ogImage: "https://fursay.com/og-image.png", alternates: ["en", "zh-TW", "ar", "x-default"] },
  { path: "/zh/", file: "zh/index.html", lang: "zh-TW", canonical: "https://fursay.com/zh/", ogImage: "https://fursay.com/og-image.png", alternates: ["en", "zh-TW", "ar", "x-default"], minDescription: 70 },
  { path: "/ar/", file: "ar/index.html", lang: "ar", dir: "rtl", canonical: "https://fursay.com/ar/", ogImage: "https://fursay.com/og-image.png", alternates: ["en", "zh-TW", "ar", "x-default"] },
  { path: "/koko", file: "koko.html", lang: "en", canonical: "https://fursay.com/koko", ogImage: "https://fursay.com/og-koko.png", alternates: ["en", "zh-TW", "ar", "x-default"] },
  { path: "/zh/koko", file: "zh/koko.html", lang: "zh-TW", canonical: "https://fursay.com/zh/koko", ogImage: "https://fursay.com/og-koko.png", alternates: ["en", "zh-TW", "ar", "x-default"], minDescription: 70 },
  { path: "/ar/koko", file: "ar/koko.html", lang: "ar", dir: "rtl", canonical: "https://fursay.com/ar/koko", ogImage: "https://fursay.com/og-koko.png", alternates: ["en", "zh-TW", "ar", "x-default"] },
  { path: "/arabic", file: "arabic.html", lang: "en", canonical: "https://fursay.com/arabic", ogImage: "https://fursay.com/og-noor.png", alternates: ["en", "zh-TW", "ar", "x-default"] },
  { path: "/zh/arabic", file: "zh/arabic.html", lang: "zh-TW", canonical: "https://fursay.com/zh/arabic", ogImage: "https://fursay.com/og-noor.png", alternates: ["en", "zh-TW", "ar", "x-default"], minDescription: 70 },
  { path: "/ar/arabic", file: "ar/arabic.html", lang: "ar", dir: "rtl", canonical: "https://fursay.com/ar/arabic", ogImage: "https://fursay.com/og-noor.png", alternates: ["en", "zh-TW", "ar", "x-default"] },
  { path: "/links", file: "links.html", lang: "en", canonical: "https://fursay.com/links", ogImage: "https://fursay.com/og-image.png" },
  { path: "/share-kit", file: "share-kit.html", lang: "en", canonical: "https://fursay.com/share-kit", robots: "noindex,follow" },
  { path: "/creator-kit", file: "creator-kit.html", lang: "en", canonical: "https://fursay.com/creator-kit", robots: "noindex,follow" },
  { path: "/traffic-launch", file: "traffic-launch.html", lang: "en", canonical: "https://fursay.com/traffic-launch", robots: "noindex,follow" },
  { path: "/noor-sprint-status", file: "noor-sprint-status.html", lang: "en", canonical: "https://fursay.com/noor-sprint-status", robots: "noindex,follow" },
  { path: "/deploy-readiness", file: "deploy-readiness.html", lang: "en", canonical: "https://fursay.com/deploy-readiness", robots: "noindex,follow" },
  { path: "/conversion-health", file: "conversion-health.html", lang: "en", canonical: "https://fursay.com/conversion-health", robots: "noindex,follow" },
  { path: "/monetization-roadmap", file: "monetization-roadmap.html", lang: "en", canonical: "https://fursay.com/monetization-roadmap", robots: "noindex,follow" },
  { path: "/products", file: "products.html", lang: "en", canonical: "https://fursay.com/products", ogImage: "https://fursay.com/og-image.png", alternates: ["en", "zh-TW", "ar", "x-default"] },
  { path: "/zh/products", file: "zh/products.html", lang: "zh-TW", canonical: "https://fursay.com/zh/products", ogImage: "https://fursay.com/og-image.png", alternates: ["en", "zh-TW", "ar", "x-default"], minDescription: 70 },
  { path: "/ar/products", file: "ar/products.html", lang: "ar", dir: "rtl", canonical: "https://fursay.com/ar/products", ogImage: "https://fursay.com/og-image.png", alternates: ["en", "zh-TW", "ar", "x-default"] },
  { path: "/product-samples/koko-printable", file: "product-samples/koko-printable.html", lang: "en", canonical: "https://fursay.com/product-samples/koko-printable", robots: "noindex,follow" },
  { path: "/product-samples/noor-worksheet", file: "product-samples/noor-worksheet.html", lang: "ar", dir: "rtl", canonical: "https://fursay.com/product-samples/noor-worksheet", robots: "noindex,follow" },
  { path: "/episodes/koko-feelings", file: "episodes/koko-feelings.html", lang: "en", canonical: "https://fursay.com/episodes/koko-feelings", ogImage: "https://fursay.com/og-koko.png", alternates: ["en", "zh-TW", "ar", "x-default"] },
  { path: "/zh/episodes/koko-feelings", file: "zh/episodes/koko-feelings.html", lang: "zh-TW", canonical: "https://fursay.com/zh/episodes/koko-feelings", ogImage: "https://fursay.com/og-koko.png", alternates: ["en", "zh-TW", "ar", "x-default"] },
  { path: "/ar/episodes/koko-feelings", file: "ar/episodes/koko-feelings.html", lang: "ar", dir: "rtl", canonical: "https://fursay.com/ar/episodes/koko-feelings", ogImage: "https://fursay.com/og-koko.png", alternates: ["en", "zh-TW", "ar", "x-default"] },
  { path: "/episodes/noor-colors", file: "episodes/noor-colors.html", lang: "en", canonical: "https://fursay.com/episodes/noor-colors", ogImage: "https://fursay.com/og-noor.png", alternates: ["en", "zh-TW", "ar", "x-default"] },
  { path: "/zh/episodes/noor-colors", file: "zh/episodes/noor-colors.html", lang: "zh-TW", canonical: "https://fursay.com/zh/episodes/noor-colors", ogImage: "https://fursay.com/og-noor.png", alternates: ["en", "zh-TW", "ar", "x-default"] },
  { path: "/ar/episodes/noor-colors", file: "ar/episodes/noor-colors.html", lang: "ar", dir: "rtl", canonical: "https://fursay.com/ar/episodes/noor-colors", ogImage: "https://fursay.com/og-noor.png", alternates: ["en", "zh-TW", "ar", "x-default"] },
  { path: "/episodes/noor-greetings", file: "episodes/noor-greetings.html", lang: "en", canonical: "https://fursay.com/episodes/noor-greetings", ogImage: "https://fursay.com/og-noor.png", alternates: ["en", "zh-TW", "ar", "x-default"] },
  { path: "/zh/episodes/noor-greetings", file: "zh/episodes/noor-greetings.html", lang: "zh-TW", canonical: "https://fursay.com/zh/episodes/noor-greetings", ogImage: "https://fursay.com/og-noor.png", alternates: ["en", "zh-TW", "ar", "x-default"] },
  { path: "/ar/episodes/noor-greetings", file: "ar/episodes/noor-greetings.html", lang: "ar", dir: "rtl", canonical: "https://fursay.com/ar/episodes/noor-greetings", ogImage: "https://fursay.com/og-noor.png", alternates: ["en", "zh-TW", "ar", "x-default"] },
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

async function readPage(baseUrl, page) {
  if (baseUrl) {
    const response = await fetch(`${baseUrl}${page.path}`);
    if (!response.ok) throw new Error(`${page.path} status ${response.status}`);
    return response.text();
  }
  return readFile(resolve(SITE_DIR, page.file), "utf8");
}

function attr(tag, name) {
  const match = tag.match(new RegExp(`${name}=(["'])(.*?)\\1`, "i"));
  return match?.[2] || "";
}

function headValue(head, selector) {
  if (selector.type === "title") return head.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim() || "";
  if (selector.type === "meta-name") {
    const tag = [...head.matchAll(/<meta\b[^>]*>/gi)]
      .find((match) => attr(match[0], "name").toLowerCase() === selector.name.toLowerCase())?.[0] || "";
    return attr(tag, "content");
  }
  if (selector.type === "meta-property") {
    const tag = [...head.matchAll(/<meta\b[^>]*>/gi)]
      .find((match) => attr(match[0], "property").toLowerCase() === selector.name.toLowerCase())?.[0] || "";
    return attr(tag, "content");
  }
  if (selector.type === "link") {
    const tag = [...head.matchAll(/<link\b[^>]*>/gi)]
      .find((match) => attr(match[0], "rel").toLowerCase() === selector.rel.toLowerCase())?.[0] || "";
    return attr(tag, "href");
  }
  return "";
}

function headValues(head, selector) {
  if (selector.type === "meta-property") {
    return [...head.matchAll(/<meta\b[^>]*>/gi)]
      .filter((match) => attr(match[0], "property").toLowerCase() === selector.name.toLowerCase())
      .map((match) => attr(match[0], "content"))
      .filter(Boolean);
  }
  return [];
}

function ogLocaleForLang(lang) {
  return {
    en: "en_US",
    "zh-TW": "zh_TW",
    ar: "ar_SA",
  }[lang] || "";
}

function checkTextLength(failures, page, key, value, min, max) {
  const length = [...String(value || "")].length;
  if (length < min || length > max) failures.push(`${page.path}:${key}_length:${length}`);
}

function checkPage(page, html, failures) {
  const htmlTag = html.match(/<html\b[^>]*>/i)?.[0] || "";
  const head = html.match(/<head>([\s\S]*?)<\/head>/i)?.[1] || "";
  const title = headValue(head, { type: "title" });
  const description = headValue(head, { type: "meta-name", name: "description" });
  const robots = headValue(head, { type: "meta-name", name: "robots" });
  const canonical = headValue(head, { type: "link", rel: "canonical" });
  const icon = headValue(head, { type: "link", rel: "icon" });
  const themeColor = headValue(head, { type: "meta-name", name: "theme-color" });
  const lang = attr(htmlTag, "lang");
  const dir = attr(htmlTag, "dir");
  const isNoindex = page.robots === "noindex,follow";

  if (lang !== page.lang) failures.push(`${page.path}:lang:${lang || "none"}`);
  if ((page.dir || "") !== dir) failures.push(`${page.path}:dir:${dir || "none"}`);
  if (!head.includes('charset="UTF-8"')) failures.push(`${page.path}:missing_charset`);
  if (!head.includes('name="viewport"')) failures.push(`${page.path}:missing_viewport`);
  if (canonical !== page.canonical) failures.push(`${page.path}:canonical:${canonical || "none"}`);
  if (icon !== "/favicon.svg") failures.push(`${page.path}:icon:${icon || "none"}`);
  if (!themeColor) failures.push(`${page.path}:missing_theme_color`);
  checkTextLength(failures, page, "title", title, 8, 80);
  checkTextLength(failures, page, "description", description, page.minDescription || 20, 180);

  if (isNoindex) {
    if (robots !== page.robots) failures.push(`${page.path}:robots:${robots || "none"}`);
    if ((head.match(/<link\b[^>]*rel=["']alternate["'][^>]*hreflang=/gi) || []).length) failures.push(`${page.path}:noindex_has_hreflang`);
    return;
  }

  if (robots.toLowerCase().includes("noindex")) failures.push(`${page.path}:unexpected_noindex`);
  const ogTitle = headValue(head, { type: "meta-property", name: "og:title" });
  const ogDescription = headValue(head, { type: "meta-property", name: "og:description" });
  const ogUrl = headValue(head, { type: "meta-property", name: "og:url" });
  const ogImage = headValue(head, { type: "meta-property", name: "og:image" });
  const ogImageAlt = headValue(head, { type: "meta-property", name: "og:image:alt" });
  const twitterCard = headValue(head, { type: "meta-name", name: "twitter:card" });
  const twitterTitle = headValue(head, { type: "meta-name", name: "twitter:title" });
  const twitterDescription = headValue(head, { type: "meta-name", name: "twitter:description" });
  const twitterImage = headValue(head, { type: "meta-name", name: "twitter:image" });
  const twitterImageAlt = headValue(head, { type: "meta-name", name: "twitter:image:alt" });
  if (!ogTitle) failures.push(`${page.path}:missing_og_title`);
  if (!ogDescription) failures.push(`${page.path}:missing_og_description`);
  if (ogUrl !== page.canonical) failures.push(`${page.path}:og_url:${ogUrl || "none"}`);
  if (ogImage !== page.ogImage) failures.push(`${page.path}:og_image:${ogImage || "none"}`);
  if (!ogImageAlt) failures.push(`${page.path}:missing_og_image_alt`);
  if (twitterCard !== "summary_large_image") failures.push(`${page.path}:twitter_card:${twitterCard || "none"}`);
  if (!twitterTitle) failures.push(`${page.path}:missing_twitter_title`);
  if (!twitterDescription) failures.push(`${page.path}:missing_twitter_description`);
  if (twitterImage !== page.ogImage) failures.push(`${page.path}:twitter_image:${twitterImage || "none"}`);
  if (!twitterImageAlt) failures.push(`${page.path}:missing_twitter_image_alt`);

  if (page.alternates) {
    const alternates = [...head.matchAll(/<link\b[^>]*rel=["']alternate["'][^>]*hreflang=["']([^"']+)["'][^>]*href=["']([^"']+)["'][^>]*>/gi)];
    const languages = alternates.map((match) => match[1]).sort();
    const expected = [...page.alternates].sort();
    if (languages.join(",") !== expected.join(",")) failures.push(`${page.path}:hreflang:${languages.join(",") || "none"}`);
    if (alternates.length !== page.alternates.length) failures.push(`${page.path}:hreflang_count:${alternates.length}`);

    const ogLocale = headValue(head, { type: "meta-property", name: "og:locale" });
    const expectedOgLocale = ogLocaleForLang(page.lang);
    if (ogLocale !== expectedOgLocale) failures.push(`${page.path}:og_locale:${ogLocale || "none"}`);
    const ogLocaleAlternates = headValues(head, { type: "meta-property", name: "og:locale:alternate" }).sort();
    const expectedOgAlternates = page.alternates
      .filter((lang) => lang !== page.lang && lang !== "x-default")
      .map(ogLocaleForLang)
      .filter(Boolean)
      .sort();
    if (ogLocaleAlternates.join(",") !== expectedOgAlternates.join(",")) {
      failures.push(`${page.path}:og_locale_alternates:${ogLocaleAlternates.join(",") || "none"}`);
    }
  }
}

async function main() {
  const args = parseArgs();
  const failures = [];
  const pages = [];
  for (const page of PAGES) {
    const html = await readPage(args.baseUrl, page);
    checkPage(page, html, failures);
    pages.push({ path: page.path, file: page.file });
  }

  await mkdir(args.outDir, { recursive: true });
  const report = {
    ok: failures.length === 0,
    mode: args.baseUrl ? "live" : "local",
    baseUrl: args.baseUrl || "",
    failures,
    pages,
  };
  await writeFile(resolve(args.outDir, "head-metadata.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({
    ok: report.ok,
    mode: report.mode,
    outDir: args.outDir,
    failed: failures.length,
    pages: pages.length,
  }, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
