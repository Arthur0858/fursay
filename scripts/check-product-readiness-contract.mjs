import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const SITE_DIR = resolve(process.cwd(), "fursay-optimized-site");
const DEFAULT_OUT = "/tmp/fursay-product-readiness-contract";
const ORIGIN = "https://fursay.com";
const CHECKOUT_NEEDLES = [/gumroad/i, /stripe/i, /checkout\.stripe/i, /paypal/i, /buy now/i, /立即購買/i, /اشتر الآن/i];
const PRODUCTS = [
  { id: "koko-printable-pack", pack: "koko", slug: "koko-printable", sample: "/product-samples/koko-printable", pdf: "/downloads/koko-printable-sample.pdf", name: "Koko" },
  { id: "noor-worksheet-pack", pack: "noor", slug: "noor-worksheet", sample: "/product-samples/noor-worksheet", pdf: "/downloads/noor-worksheet-sample.pdf", name: "Nour" },
];
const LOCALES = [
  { key: "en", prefix: "", lang: "en", dir: "" },
  { key: "zh", prefix: "/zh", lang: "zh-TW", dir: "" },
  { key: "ar", prefix: "/ar", lang: "ar", dir: "rtl" },
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
  if (/\.[^/]+$/.test(pathname)) return pathname.slice(1);
  return `${pathname.slice(1)}.html`;
}

async function readText(baseUrl, pathname) {
  if (baseUrl) {
    const response = await fetch(`${baseUrl}${pathname}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`${pathname} status ${response.status}`);
    return response.text();
  }
  return readFile(resolve(SITE_DIR, localFile(pathname)), "utf8");
}

async function readBytes(baseUrl, pathname) {
  if (baseUrl) {
    const response = await fetch(`${baseUrl}${pathname}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`${pathname} status ${response.status}`);
    return new Uint8Array(await response.arrayBuffer());
  }
  return readFile(resolve(SITE_DIR, pathname.replace(/^\//, "")));
}

async function readJson(baseUrl, pathname) {
  return JSON.parse(await readText(baseUrl, pathname));
}

function requireContains(failures, page, html, needle, label) {
  if (!html.includes(needle)) failures.push(`${page}:missing_${label}`);
}

function checkNoCheckout(failures, page, html) {
  for (const needle of CHECKOUT_NEEDLES) {
    if (needle.test(html)) failures.push(`${page}:checkout_needle:${needle.source}`);
  }
}

function count(html, pattern) {
  return (html.match(pattern) || []).length;
}

async function main() {
  const args = parseArgs();
  const failures = [];
  const checkedPages = [];
  const products = await readJson(args.baseUrl, "/products.json");
  const roadmap = await readJson(args.baseUrl, "/monetization-roadmap.json");
  const release = await readJson(args.baseUrl, "/release.json");
  const sitemap = await readText(args.baseUrl, "/sitemap.xml");

  const expectedPresale = {
    status: "presale_preparation",
    checkoutEnabled: false,
    paymentLinksAllowed: false,
    provider: "not_selected",
    publicPrice: null,
    policyStatus: "review_required",
  };
  for (const [key, expected] of Object.entries(expectedPresale)) {
    if (products[key] !== expected) failures.push(`products_${key}:${String(products[key])}`);
    if (roadmap[key] !== expected) failures.push(`roadmap_${key}:${String(roadmap[key])}`);
  }
  if (JSON.stringify(products.targetPriceRangeUsd) !== JSON.stringify([3, 7])) failures.push("products_target_price_range");
  if (JSON.stringify(roadmap.targetPriceRangeUsd) !== JSON.stringify([3, 7])) failures.push("roadmap_target_price_range");
  if ((products.products || []).length !== 2) failures.push(`product_count:${products.products?.length || 0}`);
  if ((products.checkoutGate?.requirements || []).length !== 6) failures.push(`checkout_gate_requirements:${products.checkoutGate?.requirements?.length || 0}`);

  for (const spec of PRODUCTS) {
    const product = (products.products || []).find((item) => item.id === spec.id);
    if (!product) {
      failures.push(`missing_product:${spec.id}`);
      continue;
    }
    if (product.pack !== spec.pack) failures.push(`pack_key_changed:${spec.id}:${product.pack}`);
    if (!product.presalePage?.endsWith(`/products/${spec.slug}`)) failures.push(`presale_page:${spec.id}`);
    for (const locale of ["en", "zh-TW", "ar"]) {
      if (!product.localizedPresalePages?.[locale]) failures.push(`localized_presale_page:${spec.id}:${locale}`);
    }
    if (spec.pack === "noor" && product.publicName !== "Nour 3-minute worksheet pack") failures.push(`public_nour_name:${product.publicName || "none"}`);
    const pdf = await readBytes(args.baseUrl, spec.pdf);
    if (String.fromCharCode(...pdf.slice(0, 4)) !== "%PDF") failures.push(`sample_pdf_invalid:${spec.pack}`);
  }

  for (const locale of LOCALES) {
    const hubPath = `${locale.prefix}/products`;
    const hub = await readText(args.baseUrl, hubPath);
    checkedPages.push(hubPath);
    checkNoCheckout(failures, hubPath, hub);
    requireContains(failures, hubPath, hub, "brand-storybook-20260717-v1.css", "brand_css");
    requireContains(failures, hubPath, hub, "brand-icons.svg#story", "brand_story_icon");
    requireContains(failures, hubPath, hub, "product-choice-grid", "choice_grid");
    if (count(hub, /data-product-card=/g) !== 2) failures.push(`${hubPath}:product_card_count:${count(hub, /data-product-card=/g)}`);
    if (count(hub, /data-product-info-link=/g) < 2) failures.push(`${hubPath}:product_info_links`);
    if (count(hub, /<link rel="alternate" hreflang=/g) !== 4) failures.push(`${hubPath}:hreflang_count`);
    for (const spec of PRODUCTS) requireContains(failures, hubPath, hub, `${locale.prefix}/products/${spec.slug}`, `presale_link_${spec.pack}`);

    for (const spec of PRODUCTS) {
      const pagePath = `${locale.prefix}/products/${spec.slug}`;
      const html = await readText(args.baseUrl, pagePath);
      checkedPages.push(pagePath);
      checkNoCheckout(failures, pagePath, html);
      requireContains(failures, pagePath, html, "presale-brand-page", "presale_body");
      requireContains(failures, pagePath, html, `data-product-sample-download="${spec.pack}"`, "tracked_download");
      requireContains(failures, pagePath, html, `data-product-interest="${spec.pack}"`, "interest_cta");
      requireContains(failures, pagePath, html, "data-interest-stage=", "interest_stage");
      requireContains(failures, pagePath, html, "data-signup-source=", "signup_source");
      requireContains(failures, pagePath, html, "placement=presale_page_pdf_download", "download_placement");
      requireContains(failures, pagePath, html, "sample-preview", "sample_preview");
      requireContains(failures, pagePath, html, "brand-grid-3", "three_steps");
      requireContains(failures, pagePath, html, "brand-faq", "faq");
      requireContains(failures, pagePath, html, `${locale.prefix}/support`, "support_link");
      requireContains(failures, pagePath, html, "id=\"subscribeModal\"", "subscribe_modal");
      if (count(html, /<link rel="alternate" hreflang=/g) !== 4) failures.push(`${pagePath}:hreflang_count`);
      const jsonLd = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((match) => JSON.parse(match[1]));
      const corpus = JSON.stringify(jsonLd);
      for (const type of ["WebPage", "Product", "FAQPage"]) if (!corpus.includes(`\"@type\":\"${type}\"`)) failures.push(`${pagePath}:schema_${type}`);
      if (corpus.includes(`\"@type\":\"Offer\"`)) failures.push(`${pagePath}:unreviewed_offer_schema`);
      if (spec.pack === "noor") {
        const expectedName = locale.key === "en" ? "Nour" : locale.key === "zh" ? "努爾" : "نور";
        if (!html.includes(expectedName)) failures.push(`${pagePath}:public_name_${expectedName}`);
      }
    }

    for (const policy of ["privacy", "support"]) {
      const pagePath = `${locale.prefix}/${policy}`;
      const html = await readText(args.baseUrl, pagePath);
      checkedPages.push(pagePath);
      checkNoCheckout(failures, pagePath, html);
      requireContains(failures, pagePath, html, "policy-brand-page", "policy_body");
      requireContains(failures, pagePath, html, "contact@fursay.com", "support_email");
      if (count(html, /<link rel="alternate" hreflang=/g) !== 4) failures.push(`${pagePath}:hreflang_count`);
      if (policy === "privacy") {
        const localizedNeedle = locale.key === "en" ? "Anonymous interaction signals" : locale.key === "zh" ? "匿名互動訊號" : "إشارات مجهولة";
        requireContains(failures, pagePath, html, localizedNeedle, "anonymous_signal_copy");
      } else {
        requireContains(failures, pagePath, html, "checkoutEnabled=false", "checkout_disabled_copy");
        requireContains(failures, pagePath, html, "review-required", "review_required_copy");
      }
    }
  }

  for (const spec of PRODUCTS) {
    const locale = spec.pack === "noor" ? "ar" : "en";
    const html = await readText(args.baseUrl, spec.sample);
    checkedPages.push(spec.sample);
    checkNoCheckout(failures, spec.sample, html);
    requireContains(failures, spec.sample, html, 'name="robots" content="noindex,follow"', "noindex");
    requireContains(failures, spec.sample, html, `data-product-sample-download="${spec.pack}"`, "sample_download");
    requireContains(failures, spec.sample, html, `data-product-interest="${spec.pack}"`, "sample_interest");
    requireContains(failures, spec.sample, html, "trust-strip", "trust_strip");
    if (count(html, /<link rel="alternate" hreflang=/g) !== 0) failures.push(`${spec.sample}:noindex_hreflang`);
    if (spec.pack === "noor" && !html.includes("نور")) failures.push(`${spec.sample}:arabic_nour_name`);
    if (!html.includes(`lang="${locale}"`)) failures.push(`${spec.sample}:lang`);
  }

  for (const path of [
    "/products/koko-printable", "/products/noor-worksheet", "/zh/products/koko-printable", "/zh/products/noor-worksheet", "/ar/products/koko-printable", "/ar/products/noor-worksheet",
    "/privacy", "/zh/privacy", "/ar/privacy", "/support", "/zh/support", "/ar/support",
  ]) {
    if (!sitemap.includes(`<loc>${ORIGIN}${path}</loc>`)) failures.push(`sitemap_missing:${path}`);
  }
  if (release.liveExpectations?.productLandingPages !== 9) failures.push("release_product_landing_pages");
  if (release.liveExpectations?.productPresalePages !== 6) failures.push("release_presale_pages");
  if (release.liveExpectations?.policyPages !== 6) failures.push("release_policy_pages");
  if ((release.deployment?.productPresalePages || []).length !== 6) failures.push("release_presale_urls");
  if ((release.deployment?.privacyPages || []).length !== 3) failures.push("release_privacy_urls");
  if ((release.deployment?.supportPages || []).length !== 3) failures.push("release_support_urls");

  await mkdir(args.outDir, { recursive: true });
  const report = { ok: failures.length === 0, mode: args.baseUrl ? "live" : "local", baseUrl: args.baseUrl, failures, products: PRODUCTS.length, pages: checkedPages };
  await writeFile(resolve(args.outDir, "product-readiness-contract.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ ok: report.ok, mode: report.mode, outDir: args.outDir, failed: failures.length, products: PRODUCTS.length, pages: checkedPages.length }, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
