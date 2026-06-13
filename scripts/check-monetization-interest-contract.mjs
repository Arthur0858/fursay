import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const SITE_DIR = resolve(process.cwd(), "fursay-optimized-site");
const DEFAULT_OUT = "/tmp/fursay-monetization-interest-contract";
const PAGES = ["/", "/zh/", "/ar/", "/koko", "/zh/koko", "/ar/koko", "/arabic", "/zh/arabic", "/ar/arabic"];
const CHECKOUT_NEEDLES = [/gumroad/i, /stripe/i, /ko-fi/i, /checkout/i, /buy now/i, /立即購買/i, /(?:^|\s)اشتر(?:\s|$)/i];
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
  const release = await readJson(args.baseUrl, "/release.json");
  const siteHealth = await readJson(args.baseUrl, "/site-health.json");
  const conversionHealth = await readJson(args.baseUrl, "/conversion-health.json");
  if (release.liveExpectations?.productInterestLinks !== productInterestLinks) failures.push(`release_product_interest_links:${release.liveExpectations?.productInterestLinks || "none"}!=${productInterestLinks}`);
  if (siteHealth.monetization?.ownedProducts?.checkoutEnabled !== false) failures.push("site_health_checkout_enabled");
  if (siteHealth.monetization?.ownedProducts?.interestOnly !== true) failures.push("site_health_interest_only_not_true");
  if (conversionHealth.monetization?.ownedProducts?.checkoutEnabled !== false) failures.push("conversion_health_checkout_enabled");
  if (conversionHealth.monetization?.ownedProducts?.interestOnly !== true) failures.push("conversion_health_interest_only_not_true");

  const ownedProducts = conversionHealth.monetization?.ownedProducts?.products || [];
  const checkoutGate = conversionHealth.monetization?.ownedProducts?.checkoutGate || {};
  if (release.liveExpectations?.ownedProductSpecs !== ownedProducts.length) failures.push(`release_owned_product_specs:${release.liveExpectations?.ownedProductSpecs || "none"}!=${ownedProducts.length}`);
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
  }

  await mkdir(args.outDir, { recursive: true });
  const report = { ok: failures.length === 0, mode: args.baseUrl ? "live" : "local", failures, productInterestLinks, ownedProducts, checkoutGate, pages };
  await writeFile(resolve(args.outDir, "monetization-interest-contract.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({ ok: report.ok, mode: report.mode, outDir: args.outDir, failed: failures.length, productInterestLinks }, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
