import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const SITE_DIR = resolve(process.cwd(), "fursay-optimized-site");
const DEFAULT_OUT = "/tmp/fursay-growth-dashboard-contract";
const DASHBOARD_PATH = "/conversion-health";
const DASHBOARD_FILE = "conversion-health.html";
const REQUIRED_SECTIONS = [
  "measurement",
  "coverage",
  "growth",
  "monetization",
  "product-validation",
  "events",
];
const REQUIRED_EVENTS = [
  "fursay_subscribe_open_click",
  "fursay_subscribe_modal_open",
  "fursay_subscribe_submit_attempt",
  "fursay_subscribe_submit_success",
  "fursay_subscribe_submit_failure",
  "fursay_affiliate_click",
  "fursay_outbound_click",
  "fursay_share_click",
  "fursay_pack_link_copy_click",
  "fursay_sample_link_copy_click",
  "fursay_public_share_copy_click",
  "fursay_kit_copy_click",
  "fursay_product_interest_click",
  "fursay_product_info_click",
];
const PRIVATE_VALUE_NEEDLES = [
  "event-contract@example.com",
  "ada parent",
  "phone",
  "street address",
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

async function readText(baseUrl, pathname, localFile = pathname.replace(/^\//, "")) {
  if (baseUrl) {
    const response = await fetch(`${baseUrl}${pathname}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`${pathname} status ${response.status}`);
    return response.text();
  }
  return readFile(resolve(SITE_DIR, localFile), "utf8");
}

async function readJson(baseUrl, pathname) {
  return JSON.parse(await readText(baseUrl, pathname));
}

function attr(html, tagPattern, name) {
  const tag = html.match(tagPattern)?.[0] || "";
  return tag.match(new RegExp(`\\s${name}=["']([^"']+)["']`, "i"))?.[1] || "";
}

function metaContent(head, name) {
  const match = head.match(new RegExp(`<meta\\b[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"));
  return match?.[1] || "";
}

function canonicalHref(head) {
  return head.match(/<link\b[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i)?.[1] || "";
}

function textLength(value) {
  return String(value || "").trim().length;
}

function htmlIncludesValue(html, value) {
  const text = String(value || "");
  return html.includes(text) || html.includes(text.replace(/&/g, "&amp;"));
}

async function main() {
  const args = parseArgs();
  const failures = [];
  const release = await readJson(args.baseUrl, "/release.json");
  const conversionHealth = await readJson(args.baseUrl, "/conversion-health.json");
  const siteHealth = await readJson(args.baseUrl, "/site-health.json");
  const products = await readJson(args.baseUrl, "/products.json");
  const html = await readText(args.baseUrl, DASHBOARD_PATH, DASHBOARD_FILE);
  const head = html.match(/<head>([\s\S]*?)<\/head>/i)?.[1] || "";
  const htmlLang = attr(html, /<html\b[^>]*>/i, "lang");
  const bodyClass = attr(html, /<body\b[^>]*>/i, "class");
  const robots = metaContent(head, "robots");
  const description = metaContent(head, "description");
  const sections = [...html.matchAll(/\sdata-growth-dashboard-section=["']([^"']+)["']/gi)].map((match) => match[1]);

  if (htmlLang !== "en") failures.push(`bad_lang:${htmlLang || "none"}`);
  if (!bodyClass.split(/\s+/).includes("conversion-health-page")) failures.push("missing_body_class");
  if (canonicalHref(head) !== "https://fursay.com/conversion-health") failures.push(`bad_canonical:${canonicalHref(head) || "none"}`);
  if (robots !== "noindex,follow") failures.push(`bad_robots:${robots || "none"}`);
  if (textLength(description) < 40 || textLength(description) > 180) failures.push(`bad_description_length:${textLength(description)}`);
  if (!html.includes(`Commit ${release.source?.commit}`)) failures.push("missing_release_commit_badge");
  if (!html.includes("/conversion-health.json")) failures.push("missing_json_link");
  if (!html.includes("/site-health.json")) failures.push("missing_site_health_link");
  if (!html.includes("FURSAY_EVENTS")) failures.push("dashboard_missing_analytics_binding");
  if (!html.includes("fursay_events")) failures.push("dashboard_missing_analytics_dataset");

  if (sections.length !== release.liveExpectations?.conversionDashboardSections) {
    failures.push(`section_count:${sections.length}!=${release.liveExpectations?.conversionDashboardSections || "none"}`);
  }
  for (const section of REQUIRED_SECTIONS) {
    if (!sections.includes(section)) failures.push(`missing_section:${section}`);
  }
  for (const needle of PRIVATE_VALUE_NEEDLES) {
    if (html.toLowerCase().includes(needle)) failures.push(`private_value_rendered:${needle}`);
  }

  if (release.deployment?.conversionHealthPage !== "https://fursay.com/conversion-health") failures.push("release_missing_dashboard_page");
  if (release.deployment?.conversionHealthManifest !== "https://fursay.com/conversion-health.json") failures.push("release_missing_dashboard_manifest");
  if (conversionHealth.measurement?.anonymousEventEndpoint !== "https://fursay.com/api/event") failures.push("bad_event_endpoint");
  if (conversionHealth.measurement?.piiAllowed !== false) failures.push("pii_allowed_not_false");
  if (conversionHealth.measurement?.externalAnalytics !== "worker_event_endpoint") failures.push("bad_external_analytics");
  if (conversionHealth.measurement?.analyticsSink?.binding !== "FURSAY_EVENTS") failures.push("bad_analytics_binding");
  if (conversionHealth.measurement?.analyticsSink?.dataset !== "fursay_events") failures.push("bad_analytics_dataset");
  if (conversionHealth.measurement?.analyticsSink?.status !== "pending_cloudflare_enablement") failures.push("bad_analytics_status");
  if (conversionHealth.measurement?.analyticsSink?.piiAllowed !== false) failures.push("analytics_pii_allowed_not_false");
  if (conversionHealth.measurement?.analyticsSink?.blobFields?.length !== release.liveExpectations?.eventAnalyticsBlobFields) failures.push("analytics_blob_field_count_mismatch");
  if (conversionHealth.measurement?.analyticsSink?.doubleFields?.length !== release.liveExpectations?.eventAnalyticsDoubleFields) failures.push("analytics_double_field_count_mismatch");
  if (conversionHealth.measurement?.analyticsReport?.script !== "scripts/query-event-analytics-report.mjs") failures.push("bad_report_script");
  if (conversionHealth.measurement?.analyticsReport?.packageScript !== "npm run report:events") failures.push("bad_report_package_script");
  if (conversionHealth.measurement?.analyticsReport?.status !== "pending_cloudflare_credentials_or_enablement") failures.push("bad_report_status");
  if (conversionHealth.measurement?.analyticsReport?.queryCount !== release.liveExpectations?.eventAnalyticsReportQueries) failures.push("report_query_count_mismatch");
  if (conversionHealth.measurement?.analyticsReport?.windowDays !== release.liveExpectations?.eventAnalyticsReportWindowDays) failures.push("report_window_mismatch");
  if (!html.includes("npm run report:events")) failures.push("dashboard_missing_report_script");
  if (conversionHealth.events?.length !== release.liveExpectations?.anonymousConversionEvents) failures.push("event_count_mismatch");
  for (const event of REQUIRED_EVENTS) {
    if (!conversionHealth.events?.includes(event)) failures.push(`missing_event:${event}`);
    if (!html.includes(event)) failures.push(`dashboard_missing_event:${event}`);
  }

  if (conversionHealth.coverage?.subscribeOpenPages !== release.liveExpectations?.eventTrackingPages) failures.push("subscribe_open_coverage_mismatch");
  if (conversionHealth.coverage?.affiliateClickPages !== release.liveExpectations?.affiliateEventTrackingPages) failures.push("affiliate_coverage_mismatch");
  if (conversionHealth.coverage?.outboundClickPages !== release.liveExpectations?.eventTrackingPages) failures.push("outbound_coverage_mismatch");
  if (conversionHealth.coverage?.shareOrCopyPages !== release.liveExpectations?.eventTrackingPages) failures.push("share_copy_coverage_mismatch");
  if (conversionHealth.coverage?.submitAttemptPages !== release.liveExpectations?.eventTrackingSubmitPages) failures.push("submit_coverage_mismatch");
  if (conversionHealth.growth?.noorReadinessStatus !== "safe_wait_subscriber_empty") failures.push("bad_noor_readiness_status");
  if (conversionHealth.monetization?.ownedProducts?.checkoutEnabled !== false) failures.push("checkout_enabled_must_be_false");
  if (conversionHealth.monetization?.ownedProducts?.interestOnly !== true) failures.push("interest_only_must_be_true");
  if (conversionHealth.monetization?.ownedProducts?.status !== "interest_validation") failures.push("owned_products_bad_status");
  if (conversionHealth.monetization?.ownedProducts?.products?.length !== release.liveExpectations?.ownedProductSpecs) failures.push("owned_product_spec_count_mismatch");
  if (conversionHealth.monetization?.ownedProducts?.checkoutGate?.status !== "blocked_until_interest_signal") failures.push("checkout_gate_bad_status");
  if (conversionHealth.monetization?.ownedProducts?.checkoutGate?.requirements?.length !== release.liveExpectations?.checkoutGateRequirements) failures.push("checkout_gate_requirement_count_mismatch");
  if (conversionHealth.monetization?.ownedProducts?.checkoutGate?.paymentLinksAllowed !== false) failures.push("checkout_payment_links_allowed");
  if (!html.includes("Checkout gate")) failures.push("dashboard_missing_checkout_gate");
  if (!html.includes("Product validation scoreboard")) failures.push("dashboard_missing_product_validation_scoreboard");
  if (!htmlIncludesValue(html, products.trafficEntryPoints?.socialProfileLinks || "missing")) failures.push("dashboard_missing_product_social_entry");
  if (!htmlIncludesValue(html, products.trafficEntryPoints?.zhSocialProfileLinks || "missing")) failures.push("dashboard_missing_zh_product_social_entry");
  if (!html.includes("Checkout links allowed")) failures.push("dashboard_missing_checkout_links_allowed");
  for (const product of conversionHealth.monetization?.ownedProducts?.products || []) {
    const minimumSignals = product.validationPlan?.minimumSignals || {};
    if (!html.includes(`data-product-validation-scorecard="${product.id}"`)) failures.push(`dashboard_missing_product_scorecard:${product.id}`);
    if (!html.includes(product.validationPlan?.nextDecision || "missing")) failures.push(`dashboard_missing_product_next_decision:${product.id}`);
    if (!html.includes(String(minimumSignals.productInfoClicks))) failures.push(`dashboard_missing_info_threshold:${product.id}`);
    if (!html.includes(String(minimumSignals.productInterestClicks))) failures.push(`dashboard_missing_interest_threshold:${product.id}`);
    if (!html.includes(String(minimumSignals.subscriberSignals))) failures.push(`dashboard_missing_subscriber_threshold:${product.id}`);
  }
  if (!conversionHealth.monetization?.affiliate?.localePolicy?.includes("zh-TW pages use Books.com.tw")) failures.push("missing_locale_affiliate_policy");

  const healthRoutes = siteHealth.routes?.conversionHealth || [];
  for (const expected of ["https://fursay.com/conversion-health", "https://fursay.com/conversion-health.json"]) {
    if (!healthRoutes.includes(expected)) failures.push(`site_health_missing_route:${expected}`);
  }

  await mkdir(args.outDir, { recursive: true });
  const report = {
    ok: failures.length === 0,
    mode: args.baseUrl ? "live" : "local",
    baseUrl: args.baseUrl || "",
    failures,
    dashboard: {
      path: DASHBOARD_PATH,
      sections,
      events: conversionHealth.events?.length || 0,
      commit: release.source?.commit || "",
    },
  };
  await writeFile(resolve(args.outDir, "growth-dashboard-contract.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({
    ok: report.ok,
    mode: report.mode,
    outDir: args.outDir,
    failed: failures.length,
    sections: sections.length,
    events: report.dashboard.events,
  }, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
