import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const SITE_DIR = resolve(process.cwd(), "fursay-optimized-site");
const DEFAULT_OUT = "/tmp/fursay-product-readiness-contract";
const CHECKOUT_NEEDLES = [/gumroad/i, /stripe/i, /ko-fi/i, /buy now/i, /立即購買/i, /(?:^|\s)اشتر(?:\s|$)/i];
const REQUIRED_PRODUCTS = ["koko-printable-pack", "noor-worksheet-pack"];
const REQUIRED_GATE_REQUIREMENTS = [
  "verified_product_interest_clicks",
  "disclosure_copy",
  "refund_support_copy",
  "checkout_tracking_contract",
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
  if (pathname.endsWith("/")) return `${pathname.slice(1)}index.html`;
  return `${pathname.slice(1)}.html`;
}

async function readText(baseUrl, pathname) {
  if (baseUrl) {
    const response = await fetch(`${baseUrl}${pathname}`);
    if (!response.ok) throw new Error(`${pathname} status ${response.status}`);
    return response.text();
  }
  return readFile(resolve(SITE_DIR, localFile(pathname)), "utf8");
}

async function readJson(baseUrl, pathname) {
  return JSON.parse(await readText(baseUrl, pathname));
}

function attr(tag, name) {
  const match = tag.match(new RegExp(`${name}=(["'])(.*?)\\1`, "i"));
  return match?.[2] || "";
}

function externalPaymentHrefs(html) {
  return [...html.matchAll(/<a\b[^>]*href=(["'])(.*?)\1[^>]*>/gi)]
    .map((match) => match[2])
    .filter((href) => /gumroad|stripe|ko-fi|paypal|buy/i.test(href));
}

async function main() {
  const args = parseArgs();
  const failures = [];
  const html = await readText(args.baseUrl, "/products");
  const products = await readJson(args.baseUrl, "/products.json");
  const release = await readJson(args.baseUrl, "/release.json");
  const siteHealth = await readJson(args.baseUrl, "/site-health.json");
  const conversionHealth = await readJson(args.baseUrl, "/conversion-health.json");

  if (!html.includes('<link rel="canonical" href="https://fursay.com/products">')) failures.push("products_page_bad_canonical");
  if (!html.includes("data-product-readiness-summary")) failures.push("products_page_missing_summary");
  if (!html.includes("data-product-readiness-gate")) failures.push("products_page_missing_gate");
  if (!html.includes('id="subscribeModal"')) failures.push("products_page_missing_subscribe_modal");
  if (!html.includes("site-shared-20260613-commerce3.js")) failures.push("products_page_missing_shared_js");
  if (!html.includes("/products.json")) failures.push("products_page_missing_manifest_link");
  if (!html.includes("/conversion-health")) failures.push("products_page_missing_conversion_health_link");
  if (!/No payment today/i.test(html)) failures.push("products_page_missing_no_payment_copy");

  for (const needle of CHECKOUT_NEEDLES) {
    if (needle.test(html)) failures.push(`products_page_checkout_language_or_link:${needle}`);
  }
  const paymentHrefs = externalPaymentHrefs(html);
  if (paymentHrefs.length) failures.push(`products_page_payment_hrefs:${paymentHrefs.join(",")}`);

  const productButtons = [...html.matchAll(/<button\b[^>]*data-product-interest=(["'])(koko|noor)\1[^>]*>/gi)]
    .map((match) => ({ pack: match[2], tag: match[0] }));
  if (productButtons.length !== 2) failures.push(`products_page_product_interest_buttons:${productButtons.length}`);
  for (const button of productButtons) {
    if (attr(button.tag, "data-interest-stage") !== "waitlist") failures.push(`product_button_bad_stage:${button.pack}`);
    if (!attr(button.tag, "data-signup-source").startsWith(`product_page_${button.pack}`)) failures.push(`product_button_bad_source:${button.pack}`);
  }

  if (products.platform !== "cloudflare-workers-static-assets") failures.push(`products_manifest_platform:${products.platform || "none"}`);
  if (products.status !== "interest_validation") failures.push(`products_manifest_status:${products.status || "none"}`);
  if (products.checkoutEnabled !== false) failures.push("products_manifest_checkout_enabled");
  if (products.paymentLinksAllowed !== false) failures.push("products_manifest_payment_links_allowed");
  if (products.interestOnly !== true) failures.push("products_manifest_interest_only_not_true");
  if (products.event !== "fursay_product_interest_click") failures.push(`products_manifest_event:${products.event || "none"}`);
  if (products.subscribePayloadCompatibility !== "email/groups/attribution unchanged") failures.push("products_manifest_payload_contract_changed");

  const productIds = (products.products || []).map((product) => product.id).sort();
  if (productIds.join(",") !== REQUIRED_PRODUCTS.slice().sort().join(",")) failures.push(`products_manifest_product_ids:${productIds.join(",") || "none"}`);
  for (const product of products.products || []) {
    if (product.checkoutStatus !== "not_enabled") failures.push(`product_checkout_status:${product.id}:${product.checkoutStatus || "none"}`);
    if ((product.plannedIncludes || []).length < 3) failures.push(`product_missing_planned_includes:${product.id}`);
  }

  const requirements = products.checkoutGate?.requirements || [];
  for (const requirement of REQUIRED_GATE_REQUIREMENTS) {
    if (!requirements.includes(requirement)) failures.push(`checkout_gate_missing_requirement:${requirement}`);
  }
  if (products.checkoutGate?.paymentLinksAllowed !== false) failures.push("checkout_gate_payment_links_allowed");
  if (products.checkoutGate?.minimumInterestClicks < 1) failures.push("checkout_gate_missing_interest_threshold");
  if (products.checkoutGate?.minimumSubscriberSignals < 1) failures.push("checkout_gate_missing_subscriber_threshold");

  if (release.deployment?.productsPage !== "https://fursay.com/products") failures.push("release_missing_products_page");
  if (release.deployment?.productsManifest !== "https://fursay.com/products.json") failures.push("release_missing_products_manifest");
  if (release.liveExpectations?.productLandingPages !== 1) failures.push(`release_product_landing_pages:${release.liveExpectations?.productLandingPages || "none"}`);
  if (release.liveExpectations?.ownedProductSpecs !== products.products?.length) failures.push("release_owned_product_spec_mismatch");
  if (!release.qualityGates?.includes("scripts/check-product-readiness-contract.mjs")) failures.push("release_missing_product_readiness_gate");
  if (!siteHealth.routes?.products?.includes("https://fursay.com/products")) failures.push("site_health_missing_products_route");
  if (!siteHealth.generatedFrom?.includes("/products.json")) failures.push("site_health_missing_products_generated_from");
  if (siteHealth.monetization?.ownedProducts?.checkoutEnabled !== false) failures.push("site_health_checkout_enabled");
  if (conversionHealth.monetization?.ownedProducts?.checkoutEnabled !== false) failures.push("conversion_health_checkout_enabled");

  await mkdir(args.outDir, { recursive: true });
  const report = {
    ok: failures.length === 0,
    mode: args.baseUrl ? "live" : "local",
    baseUrl: args.baseUrl || "",
    failures,
    productButtons: productButtons.map((button) => button.pack),
    products: products.products || [],
    checkoutGate: products.checkoutGate || {},
  };
  await writeFile(resolve(args.outDir, "product-readiness-contract.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({ ok: report.ok, mode: report.mode, outDir: args.outDir, failed: failures.length, products: report.products.length }, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
