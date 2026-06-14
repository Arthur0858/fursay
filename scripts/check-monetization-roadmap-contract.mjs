import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const SITE_DIR = resolve(process.cwd(), "fursay-optimized-site");
const DEFAULT_OUT = "/tmp/fursay-monetization-roadmap-contract";
const ORIGIN = "https://fursay.com";
const ROADMAP_PATH = "/monetization-roadmap";
const ROADMAP_FILE = "monetization-roadmap.html";
const ROADMAP_JSON = "/monetization-roadmap.json";
const REQUIRED_STAGE_IDS = [
  "validate_interest",
  "draft_sample_pack",
  "publish_precheckout_disclosure",
  "choose_checkout_provider",
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

async function readText(baseUrl, pathname) {
  if (baseUrl) {
    const response = await fetch(`${baseUrl}${pathname}`);
    if (!response.ok) throw new Error(`${pathname} status ${response.status}`);
    return response.text();
  }
  const file = pathname === ROADMAP_PATH ? ROADMAP_FILE : pathname.replace(/^\//, "");
  return readFile(resolve(SITE_DIR, file), "utf8");
}

async function readJson(baseUrl, pathname) {
  return JSON.parse(await readText(baseUrl, pathname));
}

function attr(tag, name) {
  const match = tag.match(new RegExp(`${name}=(["'])(.*?)\\1`, "i"));
  return match?.[2] || "";
}

function headValue(head, type, name) {
  if (type === "title") return head.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim() || "";
  const tag = [...head.matchAll(/<meta\b[^>]*>/gi)]
    .find((match) => attr(match[0], type).toLowerCase() === name.toLowerCase())?.[0] || "";
  return attr(tag, "content");
}

function canonicalHref(head) {
  const tag = [...head.matchAll(/<link\b[^>]*>/gi)]
    .find((match) => attr(match[0], "rel").toLowerCase() === "canonical")?.[0] || "";
  return attr(tag, "href");
}

function includesAny(value, needles) {
  const lower = String(value || "").toLowerCase();
  return needles.filter((needle) => lower.includes(needle.toLowerCase()));
}

async function main() {
  const args = parseArgs();
  await mkdir(args.outDir, { recursive: true });
  const failures = [];
  const html = await readText(args.baseUrl, ROADMAP_PATH);
  const roadmap = await readJson(args.baseUrl, ROADMAP_JSON);
  const products = await readJson(args.baseUrl, "/products.json");
  const conversionHealth = await readJson(args.baseUrl, "/conversion-health.json");
  const release = await readJson(args.baseUrl, "/release.json");
  const siteHealth = await readJson(args.baseUrl, "/site-health.json");

  const head = html.match(/<head>([\s\S]*?)<\/head>/i)?.[1] || "";
  const bodyClass = html.match(/<body\b[^>]*class=(["'])(.*?)\1/i)?.[2] || "";
  const sections = [...html.matchAll(/data-monetization-roadmap-section=(["'])(.*?)\1/g)].map((match) => match[2]);
  const stageIds = (roadmap.stages || []).map((stage) => stage.id);
  const privateNeedles = ["MAILERLITE_API_KEY", "CLOUDFLARE_API_TOKEN", "Authorization:", "Bearer "];
  const paymentNeedles = ["gumroad.com", "stripe.com", "checkout.stripe.com", "ko-fi.com", "paypal.com", "buy now", "立即購買"];

  if (headValue(head, "title", "") !== "Fursay Monetization Roadmap") failures.push("bad_title");
  if (headValue(head, "name", "robots") !== "noindex,follow") failures.push("bad_robots");
  if (canonicalHref(head) !== `${ORIGIN}${ROADMAP_PATH}`) failures.push(`bad_canonical:${canonicalHref(head) || "none"}`);
  if (!bodyClass.split(/\s+/).includes("monetization-roadmap-page")) failures.push("missing_body_class");
  for (const required of ["status", "stages", "products", "guardrails"]) {
    if (!sections.includes(required)) failures.push(`missing_section:${required}`);
  }
  for (const link of [ROADMAP_JSON, "/products.json", "/conversion-health.json"]) {
    if (!html.includes(`href="${link}"`)) failures.push(`missing_link:${link}`);
  }
  if (!html.includes(`Commit ${roadmap.source?.commit}`)) failures.push("missing_commit_badge");
  for (const needle of includesAny(html, privateNeedles)) failures.push(`html_private_needle:${needle}`);
  for (const needle of includesAny(JSON.stringify(roadmap), privateNeedles)) failures.push(`json_private_needle:${needle}`);
  for (const needle of includesAny(html, paymentNeedles)) failures.push(`html_payment_link_or_cta:${needle}`);

  if (roadmap.status !== "interest_validation") failures.push(`status:${roadmap.status || "none"}`);
  if (roadmap.decisionState !== "wait_for_interest_and_subscriber_signal") failures.push(`decision_state:${roadmap.decisionState || "none"}`);
  if (roadmap.checkoutEnabled !== false) failures.push("checkout_enabled_not_false");
  if (roadmap.paymentLinksAllowed !== false) failures.push("payment_links_allowed_not_false");
  if (roadmap.guardrails?.noPaymentLinks !== true) failures.push("guardrail_no_payment_links");
  if (roadmap.guardrails?.noPricePromise !== true) failures.push("guardrail_no_price_promise");
  if (roadmap.guardrails?.noMailerLiteSecrets !== true) failures.push("guardrail_no_mailerlite_secrets");
  if (roadmap.guardrails?.noPiiInAnalytics !== true) failures.push("guardrail_no_pii");
  if (roadmap.subscribePayloadCompatibility !== products.subscribePayloadCompatibility) failures.push("subscribe_payload_mismatch");
  if (roadmap.productsManifest !== `${ORIGIN}/products.json`) failures.push("bad_products_manifest_url");
  if (roadmap.conversionHealth !== `${ORIGIN}/conversion-health.json`) failures.push("bad_conversion_health_url");

  if ((roadmap.stages || []).length !== release.liveExpectations?.monetizationRoadmapStages) failures.push("stage_count_mismatch");
  if ((roadmap.products || []).length !== release.liveExpectations?.monetizationRoadmapProducts) failures.push("product_count_mismatch");
  for (const stageId of REQUIRED_STAGE_IDS) {
    if (!stageIds.includes(stageId)) failures.push(`missing_stage:${stageId}`);
  }
  const validationStage = (roadmap.stages || []).find((stage) => stage.id === "validate_interest") || {};
  if (validationStage.status !== "active") failures.push(`validation_stage_status:${validationStage.status || "none"}`);
  if (validationStage.unlocks !== "publish_precheckout_disclosure") failures.push(`validation_stage_unlocks:${validationStage.unlocks || "none"}`);
  if (!html.includes("Unlocks: publish_precheckout_disclosure")) failures.push("html_missing_validation_unlocks");
  const checkoutStage = (roadmap.stages || []).find((stage) => stage.id === "choose_checkout_provider") || {};
  if (checkoutStage.status !== "locked") failures.push(`checkout_stage_status:${checkoutStage.status || "none"}`);
  if (checkoutStage.provider !== "not_selected") failures.push(`checkout_provider:${checkoutStage.provider || "none"}`);
  if (checkoutStage.paymentLinksAllowed !== false) failures.push("checkout_stage_payment_allowed");
  const sampleStage = (roadmap.stages || []).find((stage) => stage.id === "draft_sample_pack") || {};
  const printReadySamples = (roadmap.products || []).filter((product) => (
    product.samplePreview?.status === "print_ready_preview" &&
    product.samplePreview?.printReady === true &&
    product.samplePreview?.downloadableFormat === "pdf_and_browser_print"
  ));
  if (printReadySamples.length === (roadmap.products || []).length && sampleStage.status !== "completed") {
    failures.push(`sample_stage_status:${sampleStage.status || "none"}`);
  }
  if (sampleStage.status === "completed") {
    if (!sampleStage.completedAt) failures.push("sample_stage_missing_completed_at");
    if (!(sampleStage.evidenceSources || []).includes("sample PDF downloads")) failures.push("sample_stage_missing_download_evidence");
    if (!sampleStage.nextGate?.includes("checkout locked")) failures.push("sample_stage_missing_next_gate");
    if (!html.includes(`Completed: ${sampleStage.completedAt}`)) failures.push("html_missing_sample_completed_at");
    if (!html.includes("Next gate: Keep checkout locked")) failures.push("html_missing_sample_next_gate");
  }
  const disclosureStage = (roadmap.stages || []).find((stage) => stage.id === "publish_precheckout_disclosure") || {};
  if ((disclosureStage.requirements || []).length !== release.liveExpectations?.checkoutGateRequirements) failures.push("disclosure_requirement_count_mismatch");

  const productIds = new Set((products.products || []).map((product) => product.id));
  for (const product of roadmap.products || []) {
    if (!productIds.has(product.id)) failures.push(`unknown_product:${product.id}`);
    if (product.checkoutStatus !== "not_enabled") failures.push(`product_checkout_status:${product.id}:${product.checkoutStatus || "none"}`);
    if (!product.samplePreview?.url?.startsWith(`${ORIGIN}/product-samples/`)) failures.push(`missing_sample_preview:${product.id}`);
    if (product.samplePreview?.noindex !== true) failures.push(`sample_preview_not_noindex:${product.id}`);
    if (!product.samplePreview?.downloadUrl?.startsWith(`${ORIGIN}/downloads/`)) failures.push(`missing_sample_download:${product.id}`);
    if (product.samplePreview?.downloadableFormat !== "pdf_and_browser_print") failures.push(`sample_download_format:${product.id}:${product.samplePreview?.downloadableFormat || "none"}`);
    const minimumSignals = product.validationPlan?.minimumSignals || {};
    if (!minimumSignals.productInfoClicks || !minimumSignals.productInterestClicks || !minimumSignals.subscriberSignals) {
      failures.push(`missing_minimum_signals:${product.id}`);
    }
  }

  if (products.checkoutEnabled !== false) failures.push("products_checkout_enabled");
  if (products.paymentLinksAllowed !== false) failures.push("products_payment_links_allowed");
  if (conversionHealth.monetization?.ownedProducts?.checkoutEnabled !== false) failures.push("conversion_checkout_enabled");
  if (release.deployment?.monetizationRoadmapPage !== `${ORIGIN}${ROADMAP_PATH}`) failures.push("release_missing_roadmap_page");
  if (release.deployment?.monetizationRoadmapManifest !== `${ORIGIN}${ROADMAP_JSON}`) failures.push("release_missing_roadmap_manifest");
  if (!release.qualityGates?.includes("scripts/check-monetization-roadmap-contract.mjs")) failures.push("release_missing_roadmap_gate");
  if (!siteHealth.generatedFrom?.includes(ROADMAP_JSON)) failures.push("site_health_missing_roadmap_generated_from");
  for (const expected of [`${ORIGIN}${ROADMAP_PATH}`, `${ORIGIN}${ROADMAP_JSON}`]) {
    if (!siteHealth.routes?.monetizationRoadmap?.includes(expected)) failures.push(`site_health_missing_route:${expected}`);
  }
  if (siteHealth.monetization?.roadmap?.stages !== release.liveExpectations?.monetizationRoadmapStages) failures.push("site_health_roadmap_stage_count");
  if (!html.includes("No payment links")) failures.push("missing_no_payment_copy");

  const report = {
    ok: failures.length === 0,
    baseUrl: args.baseUrl || "local",
    stages: roadmap.stages?.length || 0,
    products: roadmap.products?.length || 0,
    sections,
    failures,
  };
  await writeFile(resolve(args.outDir, "monetization-roadmap-contract.json"), JSON.stringify(report, null, 2) + "\n");
  if (failures.length) {
    console.error(JSON.stringify(report, null, 2));
    process.exit(1);
  }
  console.log(`Monetization roadmap contract passed: stages=${report.stages} products=${report.products}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
