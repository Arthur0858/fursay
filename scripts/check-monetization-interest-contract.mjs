import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const SITE_DIR = resolve(process.cwd(), "fursay-optimized-site");
const DEFAULT_OUT = "/tmp/fursay-monetization-interest-contract";
const PAGES = ["/", "/zh/", "/ar/", "/koko", "/zh/koko", "/ar/koko", "/arabic", "/zh/arabic", "/ar/arabic"];
const PRODUCT_INFO_PAGES = [
  ...PAGES,
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
const CHECKOUT_NEEDLES = [/gumroad/i, /stripe/i, /ko-fi/i, /checkout/i, /buy now/i, /立即購買/i, /(?:^|\s)اشتر(?:\s|$)/i];
const REQUIRED_GATE_REQUIREMENTS = [
  "verified_product_interest_clicks",
  "disclosure_copy",
  "refund_support_copy",
  "checkout_tracking_contract",
];
const REQUIRED_VALIDATION_SIGNALS = [
  "fursay_product_info_click",
  "fursay_product_interest_click",
  "fursay_subscribe_submit_success",
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
  return `${pathname.slice(1)}.html`;
}

function productInterestSection(html) {
  const marker = html.indexOf("data-product-interest-section");
  if (marker === -1) return "";
  const sectionStart = html.lastIndexOf("<section", marker);
  const sectionEnd = html.indexOf("</section>", marker);
  if (sectionStart === -1 || sectionEnd === -1) return "";
  return html.slice(sectionStart, sectionEnd + "</section>".length);
}

function attr(tag, name) {
  return tag.match(new RegExp(`${name}=(["'])(.*?)\\1`, "i"))?.[2] || "";
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
  let productInterestLinks = 0;
  for (const pathname of PAGES) {
    const html = await readText(args.baseUrl, pathname);
    const interests = [...html.matchAll(/data-product-interest=["'](koko|noor)["']/g)].map((match) => match[1]);
    productInterestLinks += interests.length;
    if (interests.length < 2) failures.push(`${pathname}:product_interest_links:${interests.length}<2`);
    if (!html.includes('data-interest-stage="waitlist"')) failures.push(`${pathname}:missing_waitlist_stage`);
    const productSection = productInterestSection(html);
    const badNeedle = CHECKOUT_NEEDLES.find((needle) => needle.test(productSection));
    if (badNeedle) failures.push(`${pathname}:checkout_language_or_link_present:${badNeedle}`);
    pages.push({ path: pathname, productInterestLinks: interests.length, packs: interests });
  }
  let productInfoLinks = 0;
  const productInfoPages = [];
  for (const pathname of PRODUCT_INFO_PAGES) {
    const html = await readText(args.baseUrl, pathname);
    const infoLinks = [...html.matchAll(/<a\b[^>]*data-product-info-link=(["'])(all|koko|noor)\1[^>]*>/g)]
      .map((match) => ({ pack: match[2], href: attr(match[0], "href") }));
    productInfoLinks += infoLinks.length;
    if (infoLinks.length < 1) failures.push(`${pathname}:missing_product_info_link`);
    for (const link of infoLinks) {
      if (!link.href.includes("/products?")) failures.push(`${pathname}:product_info_link_bad_target`);
      if (pathname.startsWith("/zh/") && !link.href.startsWith("/zh/products?")) failures.push(`${pathname}:product_info_link_not_localized:${link.href}`);
      if (!pathname.startsWith("/zh/") && link.href.startsWith("/zh/products?")) failures.push(`${pathname}:product_info_link_unexpected_zh_target:${link.href}`);
      if (!link.href.includes("utm_campaign=product_interest_validation")) failures.push(`${pathname}:product_info_link_missing_campaign`);
      if (!link.href.includes("utm_content=")) failures.push(`${pathname}:product_info_link_missing_content`);
    }
    productInfoPages.push({ path: pathname, productInfoLinks: infoLinks.length });
  }
  const release = await readJson(args.baseUrl, "/release.json");
  const siteHealth = await readJson(args.baseUrl, "/site-health.json");
  const conversionHealth = await readJson(args.baseUrl, "/conversion-health.json");
  const products = await readJson(args.baseUrl, "/products.json");
  const links = await readJson(args.baseUrl, "/links.json");
  const linksHtml = await readText(args.baseUrl, "/links");
  if (release.liveExpectations?.productInterestLinks !== productInterestLinks) failures.push(`release_product_interest_links:${release.liveExpectations?.productInterestLinks || "none"}!=${productInterestLinks}`);
  if (release.liveExpectations?.productInfoLinks !== productInfoLinks) failures.push(`release_product_info_links:${release.liveExpectations?.productInfoLinks || "none"}!=${productInfoLinks}`);
  if (conversionHealth.growth?.productInfoLinks !== release.liveExpectations?.productInfoLinks) failures.push("conversion_health_product_info_link_mismatch");
  if (siteHealth.monetization?.ownedProducts?.checkoutEnabled !== false) failures.push("site_health_checkout_enabled");
  if (siteHealth.monetization?.ownedProducts?.interestOnly !== true) failures.push("site_health_interest_only_not_true");
  if (conversionHealth.monetization?.ownedProducts?.checkoutEnabled !== false) failures.push("conversion_health_checkout_enabled");
  if (conversionHealth.monetization?.ownedProducts?.interestOnly !== true) failures.push("conversion_health_interest_only_not_true");
  if (products.trafficEntryPoints?.socialProfileLinks !== links.operations?.productInterest?.url) failures.push("products_social_entry_mismatch");
  if (products.trafficEntryPoints?.zhSocialProfileLinks !== links.operations?.zhProductInterest?.url) failures.push("products_zh_social_entry_mismatch");
  if (!linksHtml.includes("https://fursay.com/products?utm_source=links")) failures.push("links_missing_product_social_entry");
  if (!linksHtml.includes("https://fursay.com/zh/products?utm_source=links")) failures.push("links_missing_zh_product_social_entry");
  if (!linksHtml.includes("utm_content=links_zh_product_interest")) failures.push("links_missing_zh_product_social_utm");

  const ownedProducts = conversionHealth.monetization?.ownedProducts?.products || [];
  const checkoutGate = conversionHealth.monetization?.ownedProducts?.checkoutGate || {};
  if (release.liveExpectations?.ownedProductSpecs !== ownedProducts.length) failures.push(`release_owned_product_specs:${release.liveExpectations?.ownedProductSpecs || "none"}!=${ownedProducts.length}`);
  if (release.liveExpectations?.productValidationPlans !== ownedProducts.filter((product) => product.validationPlan).length) failures.push(`release_product_validation_plans:${release.liveExpectations?.productValidationPlans || "none"}!=${ownedProducts.filter((product) => product.validationPlan).length}`);
  if (siteHealth.monetization?.ownedProducts?.products?.length !== ownedProducts.length) failures.push("site_health_owned_product_spec_count_mismatch");
  if (checkoutGate.status !== "blocked_until_interest_signal") failures.push(`checkout_gate_status:${checkoutGate.status || "none"}`);
  if (checkoutGate.paymentLinksAllowed !== false) failures.push("checkout_payment_links_allowed");
  if (checkoutGate.minimumInterestClicks < 1) failures.push("checkout_gate_missing_interest_threshold");
  if (checkoutGate.minimumSubscriberSignals < 1) failures.push("checkout_gate_missing_subscriber_threshold");
  if (!checkoutGate.disclosureCopy?.includes("clearly labeled")) failures.push("checkout_gate_missing_disclosure_copy");
  if (!checkoutGate.refundSupportCopy?.includes("Refund and support")) failures.push("checkout_gate_missing_refund_support_copy");
  if (!checkoutGate.trackingGate?.includes("fursay_product_interest_click")) failures.push("checkout_gate_missing_tracking_gate");
  if (release.liveExpectations?.checkoutGateRequirements !== checkoutGate.requirements?.length) failures.push(`release_checkout_gate_requirements:${release.liveExpectations?.checkoutGateRequirements || "none"}!=${checkoutGate.requirements?.length || 0}`);
  for (const requirement of REQUIRED_GATE_REQUIREMENTS) {
    if (!checkoutGate.requirements?.includes(requirement)) failures.push(`checkout_gate_missing_requirement:${requirement}`);
  }
  for (const product of ownedProducts) {
    if (!["koko-printable-pack", "noor-worksheet-pack"].includes(product.id)) failures.push(`unknown_owned_product:${product.id || "none"}`);
    if (!product.format) failures.push(`owned_product_missing_format:${product.id || "none"}`);
    if (product.checkoutStatus !== "not_enabled") failures.push(`owned_product_checkout_enabled:${product.id || "none"}`);
    if ((product.plannedIncludes || []).length < 3) failures.push(`owned_product_missing_includes:${product.id || "none"}`);
    if (!product.validationPlan?.audience) failures.push(`owned_product_missing_validation_audience:${product.id || "none"}`);
    if (!product.validationPlan?.freeBridge?.startsWith("/")) failures.push(`owned_product_missing_validation_bridge:${product.id || "none"}`);
    if (!product.validationPlan?.nextDecision) failures.push(`owned_product_missing_next_decision:${product.id || "none"}`);
    for (const signal of REQUIRED_VALIDATION_SIGNALS) {
      if (!product.validationPlan?.signals?.includes(signal)) failures.push(`owned_product_missing_validation_signal:${product.id || "none"}:${signal}`);
    }
    if (product.validationPlan?.minimumSignals?.productInfoClicks < 1) failures.push(`owned_product_missing_info_threshold:${product.id || "none"}`);
    if (product.validationPlan?.minimumSignals?.productInterestClicks < 1) failures.push(`owned_product_missing_interest_threshold:${product.id || "none"}`);
    if (product.validationPlan?.minimumSignals?.subscriberSignals < 1) failures.push(`owned_product_missing_subscriber_threshold:${product.id || "none"}`);
  }

  await mkdir(args.outDir, { recursive: true });
  const report = { ok: failures.length === 0, mode: args.baseUrl ? "live" : "local", failures, productInterestLinks, productInfoLinks, ownedProducts, checkoutGate, pages, productInfoPages };
  await writeFile(resolve(args.outDir, "monetization-interest-contract.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({ ok: report.ok, mode: report.mode, outDir: args.outDir, failed: failures.length, productInterestLinks, productInfoLinks }, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
