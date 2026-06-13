import { createServer } from "node:http";
import { existsSync, statSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { chromium } from "playwright";

const SITE_DIR = resolve(process.cwd(), "fursay-optimized-site");
const DEFAULT_OUT = "/tmp/fursay-event-tracking-contract";
const SHARED_JS = "/js/site-shared-20260613-commerce1.js";
const LEGACY_JS = [
  "/js/site-shared-20260613-attribution1.js",
  "/js/site-shared-20260613-events1.js",
];
const PAGES = [
  { path: "/", lang: "en", campaign: "home_story_funnel", market: "amazon" },
  { path: "/zh/", lang: "zh-TW", campaign: "home_story_funnel", market: "books" },
  { path: "/ar/", lang: "ar", campaign: "home_story_funnel", market: "amazon" },
  { path: "/koko", lang: "en", campaign: "koko_story_funnel", pack: "koko", market: "amazon" },
  { path: "/zh/koko", lang: "zh-TW", campaign: "koko_story_funnel", pack: "koko", market: "books" },
  { path: "/ar/koko", lang: "ar", campaign: "koko_story_funnel", pack: "koko", market: "amazon" },
  { path: "/arabic", lang: "en", campaign: "noor_story_funnel", pack: "noor", market: "amazon" },
  { path: "/zh/arabic", lang: "zh-TW", campaign: "noor_story_funnel", pack: "noor", market: "books" },
  { path: "/ar/arabic", lang: "ar", campaign: "noor_story_funnel", pack: "noor", market: "amazon" },
];
const SUBMIT_PATHS = new Set(["/", "/koko", "/arabic"]);
const PRIVATE_NEEDLES = ["event-contract@example.com", "Ada Parent", "email", "name"];

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
    try {
      const url = new URL(req.url || "/", "http://127.0.0.1");
      if (url.pathname === "/api/subscribe") {
        res.writeHead(503, { "content-type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ success: false, message: "contract stub" }));
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
    } catch (error) {
      res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      res.end(error instanceof Error ? error.message : String(error));
    }
  });
  return new Promise((resolveServer) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolveServer({ server, baseUrl: `http://127.0.0.1:${address.port}` });
    });
  });
}

async function readPageHtml(baseUrl, path) {
  if (baseUrl) {
    const response = await fetch(`${baseUrl}${path}`);
    return response.text();
  }
  const asset = resolveAsset(path);
  return readFile(asset, "utf8");
}

async function readReleaseExpectations(baseUrl) {
  const response = await fetch(`${baseUrl}/release.json`, { cache: "no-store" });
  if (!response.ok) throw new Error(`release.json status ${response.status}`);
  return (await response.json()).liveExpectations || {};
}

function assertEventShape(failures, label, spec, event) {
  if (!event) {
    failures.push(`${label}:missing_event`);
    return;
  }
  const detail = event.detail || {};
  if (detail.path !== spec.path) failures.push(`${label}:path:${detail.path || "none"}`);
  if (detail.locale !== spec.lang) failures.push(`${label}:locale:${detail.locale || "none"}`);
  if (detail.campaign !== spec.campaign) failures.push(`${label}:campaign:${detail.campaign || "none"}`);
  if ((detail.page_pack || "") !== (spec.pack || "")) failures.push(`${label}:page_pack:${detail.page_pack || "none"}`);
}

function containsPrivateValue(events) {
  const serialized = JSON.stringify(events || []);
  return PRIVATE_NEEDLES.filter((needle) => serialized.includes(needle));
}

async function clickFirstSubscribeCta(page) {
  return page.evaluate(() => {
    const candidates = [...document.querySelectorAll("[data-open-subscribe]")];
    const button = candidates.find((el) => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
    }) || candidates[0];
    if (!button) return null;
    button.click();
    return {
      pack: button.getAttribute("data-open-subscribe") || "",
      signupSource: button.getAttribute("data-signup-source") || "",
    };
  });
}

async function clickFirstAffiliateLink(page) {
  return page.evaluate(() => {
    window.__fursayAffiliateNavigationBlocked = false;
    document.addEventListener("click", (event) => {
      const link = event.target.closest?.('a.book-link[href*="amazon.com/dp/"], a.book-link[href*="books.com.tw/exep/assp.php/"]');
      if (!link) return;
      event.preventDefault();
      window.__fursayAffiliateNavigationBlocked = true;
    }, { capture: true, once: true });
    const candidates = [...document.querySelectorAll('a.book-link[href*="amazon.com/dp/"], a.book-link[href*="books.com.tw/exep/assp.php/"]')];
    const link = candidates.find((el) => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
    }) || candidates[0];
    if (!link) return null;
    const url = new URL(link.href);
    link.click();
    return {
      href: link.href,
      host: url.hostname.replace(/^www\./, ""),
      productId: url.hostname.includes("amazon.com")
        ? (url.pathname.match(/\/dp\/([^/?#]+)/) || [])[1] || ""
        : (url.pathname.match(/\/products\/([^/?#]+)/) || [])[1] || "",
    };
  });
}

async function checkPage(browser, baseUrl, spec) {
  const failures = [];
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  let subscribeApiCalls = 0;
  await page.route("**/api/subscribe", async (route) => {
    subscribeApiCalls += 1;
    await route.fulfill({
      status: 503,
      contentType: "application/json; charset=utf-8",
      body: JSON.stringify({ success: false, message: "contract stub" }),
    });
  });
  await page.goto(`${baseUrl}${spec.path}`, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});

  const clickMeta = await clickFirstSubscribeCta(page);
  if (!clickMeta) failures.push(`${spec.path}:missing_subscribe_cta`);
  await page.waitForTimeout(120);

  const openState = await page.evaluate(() => ({
    events: window.fursayEvents || [],
    dataLayer: window.dataLayer || [],
    modalOpen: document.querySelector("#subscribeModal")?.classList.contains("open") || false,
    checkedGroups: [...document.querySelectorAll('#subscribeModal input[name="groups"]:checked, #subscribeModal input[name="channel"]:checked')]
      .map((input) => input.value === "arabic" ? "noor" : input.value),
  }));
  if (!openState.modalOpen) failures.push(`${spec.path}:modal_not_open`);
  const openClick = openState.events.find((event) => event.event === "fursay_subscribe_open_click");
  const modalOpen = openState.events.find((event) => event.event === "fursay_subscribe_modal_open");
  assertEventShape(failures, `${spec.path}:open_click`, spec, openClick);
  assertEventShape(failures, `${spec.path}:modal_open`, spec, modalOpen);
  if (clickMeta?.pack && openClick?.detail?.pack !== (clickMeta.pack === "arabic" ? "noor" : clickMeta.pack)) {
    failures.push(`${spec.path}:open_click_pack:${openClick?.detail?.pack || "none"}`);
  }
  if (clickMeta?.signupSource && openClick?.detail?.signup_source !== clickMeta.signupSource) {
    failures.push(`${spec.path}:open_click_source:${openClick?.detail?.signup_source || "none"}`);
  }
  if (!openState.dataLayer.some((entry) => entry.event === "fursay_subscribe_open_click")) {
    failures.push(`${spec.path}:data_layer_missing_open_click`);
  }
  if (subscribeApiCalls !== 0) failures.push(`${spec.path}:api_called_before_submit:${subscribeApiCalls}`);

  const affiliateMeta = await clickFirstAffiliateLink(page);
  await page.waitForTimeout(120);
  const affiliateState = await page.evaluate(() => ({
    events: window.fursayEvents || [],
    dataLayer: window.dataLayer || [],
    navigationBlocked: window.__fursayAffiliateNavigationBlocked || false,
  }));
  if (!affiliateMeta) {
    failures.push(`${spec.path}:missing_affiliate_link`);
  } else {
    const affiliateEvent = affiliateState.events.find((event) => event.event === "fursay_affiliate_click");
    assertEventShape(failures, `${spec.path}:affiliate_click`, spec, affiliateEvent);
    if (affiliateEvent?.detail?.market !== spec.market) failures.push(`${spec.path}:affiliate_market:${affiliateEvent?.detail?.market || "none"}`);
    if (!affiliateEvent?.detail?.product_id) failures.push(`${spec.path}:affiliate_product_id_missing`);
    if (affiliateEvent?.detail?.product_id !== affiliateMeta.productId) failures.push(`${spec.path}:affiliate_product_id:${affiliateEvent?.detail?.product_id || "none"}`);
    if (affiliateEvent?.detail?.outbound_host !== affiliateMeta.host) failures.push(`${spec.path}:affiliate_host:${affiliateEvent?.detail?.outbound_host || "none"}`);
    if (!affiliateState.dataLayer.some((entry) => entry.event === "fursay_affiliate_click")) {
      failures.push(`${spec.path}:data_layer_missing_affiliate_click`);
    }
    if (!affiliateState.navigationBlocked) failures.push(`${spec.path}:affiliate_test_navigation_not_blocked`);
  }

  let submitState = null;
  if (SUBMIT_PATHS.has(spec.path)) {
    await page.fill("#subscribeModal input[type='email']", "event-contract@example.com");
    const nameInput = page.locator("#sub-name, #modalName").first();
    if (await nameInput.count()) await nameInput.fill("Ada Parent").catch(() => {});
    await page.locator("#subscribeModal [type='submit']").first().click();
    await page.waitForTimeout(300);
    submitState = await page.evaluate(() => ({
      events: window.fursayEvents || [],
      dataLayer: window.dataLayer || [],
    }));
    if (subscribeApiCalls !== 1) failures.push(`${spec.path}:api_stub_call_count:${subscribeApiCalls}`);
    if (!submitState.events.some((event) => event.event === "fursay_subscribe_submit_attempt")) {
      failures.push(`${spec.path}:missing_submit_attempt_event`);
    }
    if (!submitState.events.some((event) => event.event === "fursay_subscribe_submit_failure")) {
      failures.push(`${spec.path}:missing_submit_failure_event`);
    }
    if (!submitState.dataLayer.some((entry) => entry.event === "fursay_subscribe_submit_attempt")) {
      failures.push(`${spec.path}:data_layer_missing_submit_attempt`);
    }
    const privateValues = containsPrivateValue(submitState.events);
    if (privateValues.length) failures.push(`${spec.path}:private_value_in_events:${privateValues.join(",")}`);
  }

  await page.close();
  return {
    path: spec.path,
    ok: failures.length === 0,
    failures,
    clickMeta,
    affiliateEvent: Boolean(affiliateMeta),
    openEvents: openState.events.map((event) => event.event),
    dataLayerEvents: affiliateState.dataLayer.map((event) => event.event),
    submitEvents: submitState ? submitState.events.map((event) => event.event) : [],
  };
}

async function main() {
  const args = parseArgs();
  await mkdir(args.outDir, { recursive: true });
  let localServer = null;
  if (!args.baseUrl) {
    localServer = await startServer();
  }
  const baseUrl = args.baseUrl || localServer.baseUrl;

  const failures = [];
  const htmlChecks = [];
  for (const spec of PAGES) {
    const html = await readPageHtml(args.baseUrl ? baseUrl : "", spec.path);
    const hasShared = html.includes(SHARED_JS);
    const legacyHits = LEGACY_JS.filter((legacy) => html.includes(legacy));
    const hasLegacy = legacyHits.length > 0;
    if (!hasShared) failures.push(`${spec.path}:missing_shared_js`);
    if (hasLegacy) failures.push(`${spec.path}:legacy_js_reference:${legacyHits.join(",")}`);
    htmlChecks.push({ path: spec.path, hasShared, hasLegacy, legacyHits });
  }
  if (!existsSync(resolve(SITE_DIR, `.${SHARED_JS}`))) failures.push("shared_js_file_missing");
  for (const legacy of LEGACY_JS) {
    if (existsSync(resolve(SITE_DIR, `.${legacy}`))) failures.push(`legacy_js_file_still_present:${legacy}`);
  }

  const browser = await chromium.launch({ headless: true });
  const pages = [];
  try {
    for (const spec of PAGES) {
      const result = await checkPage(browser, baseUrl, spec);
      pages.push(result);
      failures.push(...result.failures);
    }
  } finally {
    await browser.close();
  }

  const checks = {
    htmlPages: htmlChecks.length,
    openEventPages: pages.length,
    affiliateEventPages: pages.filter((page) => page.affiliateEvent).length,
    submitEventPages: pages.filter((page) => page.submitEvents.length).length,
  };
  const expectations = await readReleaseExpectations(baseUrl);
  if (expectations.eventTrackingPages !== checks.openEventPages) {
    failures.push(`release_event_tracking_pages:${expectations.eventTrackingPages ?? "none"}!=${checks.openEventPages}`);
  }
  if (expectations.affiliateEventTrackingPages !== checks.affiliateEventPages) {
    failures.push(`release_affiliate_event_tracking_pages:${expectations.affiliateEventTrackingPages ?? "none"}!=${checks.affiliateEventPages}`);
  }
  if (expectations.eventTrackingSubmitPages !== checks.submitEventPages) {
    failures.push(`release_event_tracking_submit_pages:${expectations.eventTrackingSubmitPages ?? "none"}!=${checks.submitEventPages}`);
  }

  const report = {
    ok: failures.length === 0,
    mode: args.baseUrl ? "live" : "local",
    baseUrl,
    sharedJs: SHARED_JS,
    checks,
    htmlChecks,
    pages,
    failures,
  };
  await writeFile(resolve(args.outDir, "event-tracking-contract.json"), `${JSON.stringify(report, null, 2)}\n`);
  if (localServer?.server) await new Promise((resolveClose) => localServer.server.close(resolveClose));
  if (!report.ok) {
    console.error(JSON.stringify(report, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
