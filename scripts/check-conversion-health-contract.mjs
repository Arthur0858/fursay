import { createServer } from "node:http";
import { existsSync, statSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { chromium } from "playwright";

const SITE_DIR = resolve(process.cwd(), "fursay-optimized-site");
const DEFAULT_OUT = "/tmp/fursay-conversion-health-contract";
const PAGES = [
  { path: "/", productInterest: true },
  { path: "/zh/", productInterest: true },
  { path: "/ar/", productInterest: true },
  { path: "/koko", productInterest: true },
  { path: "/zh/koko", productInterest: true },
  { path: "/ar/koko", productInterest: true },
  { path: "/arabic", productInterest: true },
  { path: "/zh/arabic", productInterest: true },
  { path: "/ar/arabic", productInterest: true },
  { path: "/episodes/koko-feelings" },
  { path: "/zh/episodes/koko-feelings" },
  { path: "/ar/episodes/koko-feelings" },
  { path: "/episodes/noor-colors" },
  { path: "/zh/episodes/noor-colors" },
  { path: "/ar/episodes/noor-colors" },
  { path: "/episodes/noor-greetings" },
  { path: "/zh/episodes/noor-greetings" },
  { path: "/ar/episodes/noor-greetings" },
];
const BASE_REQUIRED_EVENTS = [
  "fursay_subscribe_open_click",
  "fursay_subscribe_modal_open",
  "fursay_affiliate_click",
  "fursay_outbound_click",
  "fursay_share_click",
  "fursay_sample_link_copy_click",
];
const PRODUCT_INTEREST_EVENT = "fursay_product_interest_click";
const PRIVATE_NEEDLES = ["event-contract@example.com", "Ada Parent", "email", "name", "phone", "address"];

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = { outDir: DEFAULT_OUT, baseUrl: "" };
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--out-dir") parsed.outDir = args[++i];
    if (args[i] === "--base-url") parsed.baseUrl = args[++i].replace(/\/$/, "");
  }
  return parsed;
}

function contentType(path) {
  const ext = extname(path).toLowerCase();
  if (ext === ".html") return "text/html; charset=utf-8";
  if (ext === ".js") return "text/javascript; charset=utf-8";
  if (ext === ".css") return "text/css; charset=utf-8";
  if (ext === ".json") return "application/json; charset=utf-8";
  if (ext === ".webp") return "image/webp";
  if (ext === ".avif") return "image/avif";
  if (ext === ".png") return "image/png";
  if (ext === ".svg") return "image/svg+xml";
  return "application/octet-stream";
}

function resolveAsset(pathname) {
  const clean = pathname === "/" ? "/index.html" : pathname;
  const candidates = [
    resolve(SITE_DIR, `.${clean}/index.html`),
    resolve(SITE_DIR, `.${clean}.html`),
    resolve(SITE_DIR, `.${clean}`),
  ];
  return candidates.find((candidate) => (
    candidate.startsWith(SITE_DIR)
    && existsSync(candidate)
    && statSync(candidate).isFile()
  ));
}

function startServer() {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    if (url.pathname === "/api/subscribe" || url.pathname === "/api/event") {
      res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ success: true }));
      return;
    }
    const asset = resolveAsset(url.pathname);
    if (!asset) {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("not found");
      return;
    }
    res.writeHead(200, { "content-type": contentType(asset) });
    res.end(await readFile(asset));
  });
  return new Promise((resolveServer) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolveServer({ server, baseUrl: `http://127.0.0.1:${address.port}` });
    });
  });
}

async function readJson(baseUrl, pathname) {
  if (baseUrl) return fetch(`${baseUrl}${pathname}`).then((response) => response.json());
  return JSON.parse(await readFile(resolve(SITE_DIR, pathname.replace(/^\//, "")), "utf8"));
}

function privateNeedles(events) {
  const serialized = JSON.stringify(events || []);
  return PRIVATE_NEEDLES.filter((needle) => serialized.includes(needle));
}

async function clickVisible(page, selector) {
  return page.evaluate((sel) => {
    document.addEventListener("click", (event) => {
      const link = event.target.closest?.("a.book-link, a[data-fursay-outbound]");
      if (link) event.preventDefault();
    }, { capture: true, once: true });
    const candidates = [...document.querySelectorAll(sel)];
    const el = candidates.find((item) => {
      const rect = item.getBoundingClientRect();
      const style = window.getComputedStyle(item);
      return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
    }) || candidates[0];
    if (!el) return false;
    el.click();
    return true;
  }, selector);
}

async function checkPage(browser, baseUrl, spec) {
  const pathname = spec.path;
  const failures = [];
  const events = [];
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.route("**/api/event", async (route) => {
    const data = route.request().postData() || "{}";
    try {
      events.push(JSON.parse(data));
    } catch {
      failures.push(`${pathname}:event_invalid_json`);
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true }) });
  });
  await page.route("**/api/subscribe", async (route) => {
    await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ success: false }) });
  });
  await page.goto(`${baseUrl}${pathname}`, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});

  const selectors = [
    "[data-open-subscribe]",
    "a.book-link",
    "a[data-fursay-outbound]",
    "[data-share-fursay]",
    "[data-copy-sample-link]",
  ];
  if (spec.productInterest) selectors.push("[data-product-interest]");
  for (const selector of selectors) {
    const clicked = await clickVisible(page, selector);
    if (!clicked) failures.push(`${pathname}:missing_click_target:${selector}`);
    await page.waitForTimeout(160);
  }

  const eventNames = new Set(events.map((event) => event.event));
  const requiredEvents = spec.productInterest ? [...BASE_REQUIRED_EVENTS, PRODUCT_INTEREST_EVENT] : BASE_REQUIRED_EVENTS;
  for (const name of requiredEvents) {
    if (!eventNames.has(name)) failures.push(`${pathname}:missing_event:${name}`);
  }
  const privateValues = privateNeedles(events);
  if (privateValues.length) failures.push(`${pathname}:private_value_in_events:${privateValues.join(",")}`);
  await page.close();
  return { path: pathname, ok: failures.length === 0, failures, eventCount: events.length, events: [...eventNames] };
}

async function main() {
  const args = parseArgs();
  await mkdir(args.outDir, { recursive: true });
  const localServer = args.baseUrl ? null : await startServer();
  const effectiveBaseUrl = args.baseUrl || localServer.baseUrl;
  const conversionHealth = await readJson(args.baseUrl, "/conversion-health.json");
  const release = await readJson(args.baseUrl, "/release.json");
  const failures = [];
  if (conversionHealth.measurement?.anonymousEventEndpoint !== "https://fursay.com/api/event") failures.push("bad_event_endpoint");
  if (conversionHealth.measurement?.piiAllowed !== false) failures.push("pii_allowed_not_false");
  if (conversionHealth.measurement?.externalAnalytics !== "worker_event_endpoint") failures.push("bad_external_analytics");
  if (conversionHealth.measurement?.analyticsSink?.binding !== "FURSAY_EVENTS") failures.push("bad_analytics_binding");
  if (conversionHealth.measurement?.analyticsSink?.dataset !== "fursay_events") failures.push("bad_analytics_dataset");
  if (conversionHealth.measurement?.analyticsSink?.status !== "pending_cloudflare_dashboard_enablement") failures.push("bad_analytics_status");
  if (conversionHealth.measurement?.analyticsSink?.deployBlockerCode !== "10089") failures.push("bad_analytics_deploy_blocker_code");
  if (!conversionHealth.measurement?.analyticsSink?.enablementUrl?.includes("/workers/analytics-engine")) failures.push("bad_analytics_enablement_url");
  if (conversionHealth.measurement?.analyticsSink?.piiAllowed !== false) failures.push("analytics_pii_allowed_not_false");
  if (conversionHealth.measurement?.analyticsSink?.blobFields?.length !== release.liveExpectations?.eventAnalyticsBlobFields) failures.push("analytics_blob_field_count_mismatch");
  for (const field of ["source_id", "creator", "placement"]) {
    if (!conversionHealth.measurement?.analyticsSink?.blobFields?.includes(field)) failures.push(`analytics_missing_variant_field:${field}`);
  }
  if (conversionHealth.measurement?.analyticsSink?.doubleFields?.length !== release.liveExpectations?.eventAnalyticsDoubleFields) failures.push("analytics_double_field_count_mismatch");
  if (conversionHealth.measurement?.analyticsReport?.script !== "scripts/query-event-analytics-report.mjs") failures.push("bad_report_script");
  if (conversionHealth.measurement?.analyticsReport?.packageScript !== "npm run report:events") failures.push("bad_report_package_script");
  if (conversionHealth.measurement?.analyticsReport?.status !== "pending_cloudflare_credentials_or_enablement") failures.push("bad_report_status");
  if (conversionHealth.measurement?.analyticsReport?.queryCount !== release.liveExpectations?.eventAnalyticsReportQueries) failures.push("report_query_count_mismatch");
  if (conversionHealth.measurement?.analyticsReport?.windowDays !== release.liveExpectations?.eventAnalyticsReportWindowDays) failures.push("report_window_mismatch");
  if ((conversionHealth.measurement?.analyticsReport?.comparisonWindows || []).join(",") !== (release.liveExpectations?.eventAnalyticsReportComparisonWindows || []).join(",")) failures.push("report_comparison_windows_mismatch");
  for (const name of ["noor_growth_signals_7d", "noor_growth_signals_30d"]) {
    if (!conversionHealth.measurement?.analyticsReport?.queries?.includes(name)) failures.push(`report_missing_noor_query:${name}`);
  }
  if (conversionHealth.growth?.noorSprintVariantCount !== release.liveExpectations?.noorSprintCopyVariants) {
    failures.push(`noor_sprint_variant_count:${conversionHealth.growth?.noorSprintVariantCount || 0}`);
  }
  const noorVariantSourceIds = new Set((conversionHealth.growth?.noorSprintVariants || []).map((variant) => variant.sourceId));
  for (const sourceId of ["noor_first_subscriber_sprint_parent_group", "noor_first_subscriber_sprint_direct_dm", "noor_first_subscriber_sprint_worksheet_followup"]) {
    if (!noorVariantSourceIds.has(sourceId)) failures.push(`missing_noor_variant_source_id:${sourceId}`);
  }
  if (conversionHealth.events?.length !== release.liveExpectations?.anonymousConversionEvents) failures.push("event_count_expectation_mismatch");
  for (const name of [...BASE_REQUIRED_EVENTS, PRODUCT_INTEREST_EVENT]) {
    if (!conversionHealth.events?.includes(name)) failures.push(`manifest_missing_event:${name}`);
  }

  const browser = await chromium.launch({ headless: true });
  const pages = [];
  try {
    for (const spec of PAGES) pages.push(await checkPage(browser, effectiveBaseUrl, spec));
  } finally {
    await browser.close();
    if (localServer) await new Promise((resolveClose) => localServer.server.close(resolveClose));
  }
  failures.push(...pages.flatMap((page) => page.failures));
  const report = {
    ok: failures.length === 0,
    mode: args.baseUrl ? "live" : "local",
    baseUrl: args.baseUrl || "",
    failures,
    pages,
    conversionHealth,
  };
  await writeFile(resolve(args.outDir, "conversion-health-contract.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({ ok: report.ok, mode: report.mode, outDir: args.outDir, failed: failures.length, pages: pages.length }, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
