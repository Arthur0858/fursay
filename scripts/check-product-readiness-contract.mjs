import { createServer } from "node:http";
import { existsSync, statSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { chromium } from "playwright";

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
const REQUIRED_VALIDATION_SIGNALS = [
  "fursay_product_info_click",
  "fursay_product_interest_click",
  "fursay_subscribe_submit_success",
];
const PRIVATE_NEEDLES = ["@", "email", "name", "phone", "address", "token", "password", "subscriber"];
const ZH_PRODUCT_REQUIRED_COPY = [
  "故事提示頁",
  "英文情緒詞練習",
  "親子畫畫活動",
  "中文詞語與拼音練習",
  "阿語家長提示",
  "一個 3 分鐘親子小活動",
  "家庭可以怎麼用",
  "常見問題",
  "今天會收費嗎？",
  "之後可以取消嗎？",
];
const ZH_PRODUCT_ENGLISH_REGRESSIONS = [
  "story prompt sheet",
  "emotion word practice",
  "parent-child drawing activity",
  "Chinese color words with Pinyin",
  "Arabic parent prompts",
  "one 3-minute activity",
  "Mandarin-speaking families testing",
  "Arabic-speaking families testing",
  "Draft a 3",
  "Draft a 3-page",
  "Draft a 3-minute",
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
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url || "/", "http://127.0.0.1");
      if (url.pathname === "/api/event") {
        response.writeHead(204, { "content-type": "application/json; charset=utf-8" });
        response.end("");
        return;
      }
      if (url.pathname === "/api/subscribe") {
        response.writeHead(503, { "content-type": "application/json; charset=utf-8" });
        response.end(JSON.stringify({ success: false, message: "contract stub" }));
        return;
      }
      const asset = resolveAsset(url.pathname);
      if (!asset) {
        response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        response.end("not found");
        return;
      }
      response.writeHead(200, { "content-type": contentType(asset) });
      response.end(await readFile(asset));
    } catch (error) {
      response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      response.end(error instanceof Error ? error.message : String(error));
    }
  });
  return new Promise((resolveServer) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolveServer({ server, baseUrl: `http://127.0.0.1:${address.port}` });
    });
  });
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

function payloadHasPrivateNeedle(payload) {
  const text = JSON.stringify(payload || {}).toLowerCase();
  return PRIVATE_NEEDLES.filter((needle) => text.includes(needle));
}

async function clickProductInterest(page, pack) {
  return page.evaluate((targetPack) => {
    const button = document.querySelector(`[data-product-interest="${targetPack}"]`);
    if (!button) return null;
    button.click();
    return {
      pack: button.getAttribute("data-product-interest") || "",
      stage: button.getAttribute("data-interest-stage") || "",
      signupSource: button.getAttribute("data-signup-source") || "",
    };
  }, pack);
}

async function checkProductInteraction(baseUrl, productPath = "/products") {
  const failures = [];
  const checks = [];
  const browser = await chromium.launch({ headless: true });
  try {
    for (const pack of ["koko", "noor"]) {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      const eventPayloads = [];
      let subscribeApiCalls = 0;
      await page.route("**/api/event", async (route) => {
        try {
          eventPayloads.push(JSON.parse(route.request().postData() || "{}"));
        } catch {
          failures.push(`product_interaction:${pack}:event_payload_invalid_json`);
        }
        await route.fulfill({ status: 204, body: "" });
      });
      await page.route("**/api/subscribe", async (route) => {
        subscribeApiCalls += 1;
        await route.fulfill({
          status: 503,
          contentType: "application/json; charset=utf-8",
          body: JSON.stringify({ success: false, message: "contract stub" }),
        });
      });
      await page.goto(`${baseUrl}${productPath}?utm_source=contract&utm_medium=browser&utm_campaign=product_interest_validation&utm_content=${pack}_interaction`, {
        waitUntil: "domcontentloaded",
        timeout: 45000,
      });
      await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
      const clickMeta = await clickProductInterest(page, pack);
      if (!clickMeta) failures.push(`product_interaction:${pack}:missing_button`);
      await page.waitForTimeout(250);
      const state = await page.evaluate(() => ({
        events: window.fursayEvents || [],
        dataLayer: window.dataLayer || [],
        modalOpen: document.querySelector("#subscribeModal")?.classList.contains("open") || false,
        checkedGroups: [...document.querySelectorAll('#subscribeModal input[name="groups"]:checked, #subscribeModal input[name="channel"]:checked')]
          .map((input) => input.value === "arabic" ? "noor" : input.value),
        modalSignupSource: document.querySelector("#subscribeModal")?.dataset.signupSource || "",
        modalPreselect: document.querySelector("#subscribeModal")?.dataset.preselect || "",
      }));
      const productEvent = state.events.find((event) => event.event === "fursay_product_interest_click");
      const modalEvent = state.events.find((event) => event.event === "fursay_subscribe_modal_open");
      if (!productEvent) failures.push(`product_interaction:${pack}:missing_product_event`);
      if (!modalEvent) failures.push(`product_interaction:${pack}:missing_modal_event`);
      if (!state.dataLayer.some((event) => event.event === "fursay_product_interest_click")) failures.push(`product_interaction:${pack}:data_layer_missing_product_event`);
      if (!state.modalOpen) failures.push(`product_interaction:${pack}:modal_not_open`);
      if (!state.checkedGroups.includes(pack)) failures.push(`product_interaction:${pack}:modal_not_preselected`);
      if (state.modalPreselect !== pack) failures.push(`product_interaction:${pack}:modal_preselect:${state.modalPreselect || "none"}`);
      if (productEvent?.detail?.path !== productPath) failures.push(`product_interaction:${productPath}:${pack}:event_path:${productEvent?.detail?.path || "none"}`);
      if (productEvent?.detail?.product_interest !== pack) failures.push(`product_interaction:${pack}:event_interest:${productEvent?.detail?.product_interest || "none"}`);
      if (productEvent?.detail?.interest_stage !== "waitlist") failures.push(`product_interaction:${pack}:event_stage:${productEvent?.detail?.interest_stage || "none"}`);
      if (productEvent?.detail?.signup_source !== clickMeta?.signupSource) failures.push(`product_interaction:${pack}:event_source:${productEvent?.detail?.signup_source || "none"}`);
      if (modalEvent?.detail?.pack !== pack) failures.push(`product_interaction:${pack}:modal_event_pack:${modalEvent?.detail?.pack || "none"}`);
      if (state.modalSignupSource !== clickMeta?.signupSource) failures.push(`product_interaction:${pack}:modal_source:${state.modalSignupSource || "none"}`);
      if (subscribeApiCalls !== 0) failures.push(`product_interaction:${pack}:api_called_before_submit:${subscribeApiCalls}`);
      const privateHits = payloadHasPrivateNeedle(eventPayloads);
      if (privateHits.length) failures.push(`product_interaction:${pack}:event_payload_private_needles:${privateHits.join(",")}`);
      if (!eventPayloads.some((payload) => payload.event === "fursay_product_interest_click")) failures.push(`product_interaction:${pack}:api_event_missing_product_interest`);
      checks.push({
        productPath,
        pack,
        clickMeta,
        modalOpen: state.modalOpen,
        checkedGroups: state.checkedGroups,
        events: state.events.map((event) => event.event),
        apiEvents: eventPayloads.map((payload) => payload.event),
        subscribeApiCalls,
      });
      await page.close();
    }
  } finally {
    await browser.close();
  }
  return { failures, checks };
}

async function main() {
  const args = parseArgs();
  const failures = [];
  let localServer = null;
  let interaction = null;
  const html = await readText(args.baseUrl, "/products");
  const zhHtml = await readText(args.baseUrl, "/zh/products");
  const products = await readJson(args.baseUrl, "/products.json");
  const release = await readJson(args.baseUrl, "/release.json");
  const siteHealth = await readJson(args.baseUrl, "/site-health.json");
  const conversionHealth = await readJson(args.baseUrl, "/conversion-health.json");
  const links = await readJson(args.baseUrl, "/links.json");
  const linksHtml = await readText(args.baseUrl, "/links");

  if (!html.includes('<link rel="canonical" href="https://fursay.com/products">')) failures.push("products_page_bad_canonical");
  if (!zhHtml.includes('<link rel="canonical" href="https://fursay.com/zh/products">')) failures.push("zh_products_page_bad_canonical");
  if (!zhHtml.includes('<html lang="zh-TW">')) failures.push("zh_products_page_bad_lang");
  if (!html.includes("data-product-readiness-summary")) failures.push("products_page_missing_summary");
  if (!html.includes("data-product-readiness-gate")) failures.push("products_page_missing_gate");
  if (!html.includes("data-product-hero")) failures.push("products_page_missing_parent_hero");
  if (!html.includes("data-product-faq")) failures.push("products_page_missing_faq");
  if (!zhHtml.includes("data-product-faq")) failures.push("zh_products_page_missing_faq");
  if (!html.includes('id="subscribeModal"')) failures.push("products_page_missing_subscribe_modal");
  if (!html.includes("site-shared-20260613-commerce4.js")) failures.push("products_page_missing_shared_js");
  if (!zhHtml.includes("site-shared-20260613-commerce4.js")) failures.push("zh_products_page_missing_shared_js");
  if (!/No payment today/i.test(html)) failures.push("products_page_missing_no_payment_copy");
  if (!/Free story pack first/i.test(html)) failures.push("products_page_missing_free_pack_copy");
  if (!zhHtml.includes("今天不會收費")) failures.push("zh_products_page_missing_no_payment_copy");
  if (!zhHtml.includes("先領免費故事包")) failures.push("zh_products_page_missing_free_pack_copy");
  for (const needle of ZH_PRODUCT_REQUIRED_COPY) {
    if (!zhHtml.includes(needle)) failures.push(`zh_products_page_missing_localized_copy:${needle}`);
  }
  for (const needle of ZH_PRODUCT_ENGLISH_REGRESSIONS) {
    if (zhHtml.includes(needle)) failures.push(`zh_products_page_english_copy_regression:${needle}`);
  }
  if (/<div class="creator-kit-meta">/i.test(html)) failures.push("products_page_exposes_ops_meta");
  for (const needle of [/Commit\s+[a-f0-9]{7,}/i, /JSON manifest/i, /Conversion health/i]) {
    if (needle.test(html)) failures.push(`products_page_exposes_internal_copy:${needle}`);
  }
  if (!html.includes('"@type":"Product"') || !html.includes('"@type":"Offer"')) failures.push("products_page_missing_product_offer_schema");
  if (!html.includes('"RegisterAction"')) failures.push("products_page_missing_register_action_schema");

  for (const needle of CHECKOUT_NEEDLES) {
    if (needle.test(html)) failures.push(`products_page_checkout_language_or_link:${needle}`);
    if (needle.test(zhHtml)) failures.push(`zh_products_page_checkout_language_or_link:${needle}`);
  }
  const paymentHrefs = externalPaymentHrefs(html);
  const zhPaymentHrefs = externalPaymentHrefs(zhHtml);
  if (paymentHrefs.length) failures.push(`products_page_payment_hrefs:${paymentHrefs.join(",")}`);
  if (zhPaymentHrefs.length) failures.push(`zh_products_page_payment_hrefs:${zhPaymentHrefs.join(",")}`);

  const productButtons = [...html.matchAll(/<button\b[^>]*data-product-interest=(["'])(koko|noor)\1[^>]*>/gi)]
    .map((match) => ({ pack: match[2], tag: match[0] }));
  const zhProductButtons = [...zhHtml.matchAll(/<button\b[^>]*data-product-interest=(["'])(koko|noor)\1[^>]*>/gi)]
    .map((match) => ({ pack: match[2], tag: match[0] }));
  if (productButtons.length !== 2) failures.push(`products_page_product_interest_buttons:${productButtons.length}`);
  if (zhProductButtons.length !== 2) failures.push(`zh_products_page_product_interest_buttons:${zhProductButtons.length}`);
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
  if (products.trafficEntryPoints?.socialProfileLinks !== links.operations?.productInterest?.url) failures.push("products_manifest_social_entry_mismatch");
  if (products.trafficEntryPoints?.zhSocialProfileLinks !== links.operations?.zhProductInterest?.url) failures.push("products_manifest_zh_social_entry_mismatch");
  if (!products.trafficEntryPoints?.socialProfileLinks?.includes("utm_source=links")) failures.push("products_manifest_social_entry_missing_source");
  if (!products.trafficEntryPoints?.socialProfileLinks?.includes("utm_campaign=product_interest_validation")) failures.push("products_manifest_social_entry_missing_campaign");
  if (!products.trafficEntryPoints?.zhSocialProfileLinks?.includes("utm_source=links")) failures.push("products_manifest_zh_social_entry_missing_source");
  if (!products.trafficEntryPoints?.zhSocialProfileLinks?.includes("utm_campaign=product_interest_validation")) failures.push("products_manifest_zh_social_entry_missing_campaign");
  if (!products.trafficEntryPoints?.zhSocialProfileLinks?.includes("utm_content=links_zh_product_interest")) failures.push("products_manifest_zh_social_entry_missing_content");
  if (!linksHtml.includes('href="/links.json"')) failures.push("links_page_missing_manifest_link");
  if (!linksHtml.includes("Printable and worksheet packs")) failures.push("links_page_missing_product_interest_label");
  if (!linksHtml.includes("繁中產品等候名單")) failures.push("links_page_missing_zh_product_interest_label");
  if (!linksHtml.includes("utm_content=links_product_interest")) failures.push("links_page_missing_product_interest_utm");
  if (!linksHtml.includes("utm_content=links_zh_product_interest")) failures.push("links_page_missing_zh_product_interest_utm");
  if (!linksHtml.includes("https://fursay.com/products?utm_source=links")) failures.push("links_page_missing_product_interest_href");
  if (!linksHtml.includes("https://fursay.com/zh/products?utm_source=links")) failures.push("links_page_missing_zh_product_interest_href");

  const productIds = (products.products || []).map((product) => product.id).sort();
  if (productIds.join(",") !== REQUIRED_PRODUCTS.slice().sort().join(",")) failures.push(`products_manifest_product_ids:${productIds.join(",") || "none"}`);
  for (const product of products.products || []) {
    if (product.checkoutStatus !== "not_enabled") failures.push(`product_checkout_status:${product.id}:${product.checkoutStatus || "none"}`);
    if ((product.plannedIncludes || []).length < 3) failures.push(`product_missing_planned_includes:${product.id}`);
    const plan = product.validationPlan || {};
    if (!html.includes(`data-product-validation-plan="${product.id}"`)) failures.push(`products_page_missing_validation_plan:${product.id}`);
    if (!zhHtml.includes(`data-product-validation-plan="${product.id}"`)) failures.push(`zh_products_page_missing_validation_plan:${product.id}`);
    if (!plan.audience || plan.audience.length < 40) failures.push(`product_validation_missing_audience:${product.id}`);
    if (!plan.freeBridge?.startsWith("/")) failures.push(`product_validation_missing_free_bridge:${product.id}`);
    if (!plan.nextDecision || plan.nextDecision.length < 60) failures.push(`product_validation_missing_next_decision:${product.id}`);
    for (const signal of REQUIRED_VALIDATION_SIGNALS) {
      if (!plan.signals?.includes(signal)) failures.push(`product_validation_missing_signal:${product.id}:${signal}`);
    }
    if (plan.minimumSignals?.productInfoClicks < 1) failures.push(`product_validation_missing_info_threshold:${product.id}`);
    if (plan.minimumSignals?.productInterestClicks < 1) failures.push(`product_validation_missing_interest_threshold:${product.id}`);
    if (plan.minimumSignals?.subscriberSignals < 1) failures.push(`product_validation_missing_subscriber_threshold:${product.id}`);
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
  if (release.liveExpectations?.productLandingPages !== 2) failures.push(`release_product_landing_pages:${release.liveExpectations?.productLandingPages || "none"}`);
  if (release.liveExpectations?.ownedProductSpecs !== products.products?.length) failures.push("release_owned_product_spec_mismatch");
  if (release.liveExpectations?.productValidationPlans !== products.products?.filter((product) => product.validationPlan).length) failures.push("release_product_validation_plan_mismatch");
  if (!release.qualityGates?.includes("scripts/check-product-readiness-contract.mjs")) failures.push("release_missing_product_readiness_gate");
  if (!siteHealth.routes?.products?.includes("https://fursay.com/products")) failures.push("site_health_missing_products_route");
  if (!siteHealth.routes?.products?.includes("https://fursay.com/zh/products")) failures.push("site_health_missing_zh_products_route");
  if (!siteHealth.generatedFrom?.includes("/products.json")) failures.push("site_health_missing_products_generated_from");
  if (siteHealth.monetization?.ownedProducts?.checkoutEnabled !== false) failures.push("site_health_checkout_enabled");
  if (conversionHealth.monetization?.ownedProducts?.checkoutEnabled !== false) failures.push("conversion_health_checkout_enabled");

  try {
    if (args.baseUrl) {
      const enInteraction = await checkProductInteraction(args.baseUrl, "/products");
      const zhInteraction = await checkProductInteraction(args.baseUrl, "/zh/products");
      interaction = { failures: [...enInteraction.failures, ...zhInteraction.failures], checks: [...enInteraction.checks, ...zhInteraction.checks] };
    } else {
      localServer = await startServer();
      const enInteraction = await checkProductInteraction(localServer.baseUrl, "/products");
      const zhInteraction = await checkProductInteraction(localServer.baseUrl, "/zh/products");
      interaction = { failures: [...enInteraction.failures, ...zhInteraction.failures], checks: [...enInteraction.checks, ...zhInteraction.checks] };
    }
    failures.push(...interaction.failures);
  } finally {
    if (localServer) await new Promise((resolveClose) => localServer.server.close(resolveClose));
  }

  await mkdir(args.outDir, { recursive: true });
  const report = {
    ok: failures.length === 0,
    mode: args.baseUrl ? "live" : "local",
    baseUrl: args.baseUrl || "",
    failures,
    productButtons: productButtons.map((button) => button.pack),
    interaction: interaction?.checks || [],
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
