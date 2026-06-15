import { createServer } from "node:http";
import { existsSync, statSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { chromium } from "playwright";

const SITE_DIR = resolve(process.cwd(), "fursay-optimized-site");
const DEFAULT_OUT = "/tmp/fursay-product-readiness-contract";
const CHECKOUT_NEEDLES = [/gumroad/i, /stripe/i, /ko-fi/i, /buy now/i, /立即購買/i, /(?:^|\s)اشتر(?:\s|$)/i];
const REQUIRED_PRODUCTS = ["koko-printable-pack", "noor-worksheet-pack"];
const REQUIRED_SAMPLE_PREVIEWS = [
  {
    pack: "koko",
    path: "/product-samples/koko-printable",
    canonical: "https://fursay.com/product-samples/koko-printable",
    downloadPath: "/downloads/koko-printable-sample.pdf",
    downloadUrl: "https://fursay.com/downloads/koko-printable-sample.pdf",
    trackedDownloadPath: "/download/koko-printable-sample",
    trackedDownloadUrl: "https://fursay.com/download/koko-printable-sample?source_id=koko_product_validation_pdf_sample&creator=fursay&placement=sample_preview_pdf_download",
  },
  {
    pack: "noor",
    path: "/product-samples/noor-worksheet",
    canonical: "https://fursay.com/product-samples/noor-worksheet",
    downloadPath: "/downloads/noor-worksheet-sample.pdf",
    downloadUrl: "https://fursay.com/downloads/noor-worksheet-sample.pdf",
    trackedDownloadPath: "/download/noor-worksheet-sample",
    trackedDownloadUrl: "https://fursay.com/download/noor-worksheet-sample?source_id=noor_product_validation_pdf_sample&creator=fursay&placement=sample_preview_pdf_download",
  },
];
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
const AR_PRODUCT_REQUIRED_COPY = [
  "لا دفع اليوم",
  "الحزمة المجانية أولا",
  "قائمة اهتمام فقط",
  "كلمات صينية مع البينيين",
  "توجيهات عربية للوالدين",
  "نشاط عائلي في 3 دقائق",
  "كيف تستخدمها العائلة؟",
  "أسئلة شائعة",
  "هل سأدفع اليوم؟",
  "هل يمكنني الإلغاء لاحقا؟",
];
const NOOR_SAMPLE_REQUIRED_COPY = [
  "عينة ورقة نور في 3 دقائق",
  "ثلاث كلمات صينية مع Pinyin",
  "توجيه للوالدين",
  "نشاط 3 دقائق",
  "احصلوا على حزمة نور المجانية",
  "لا يوجد دفع",
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
  if (ext === ".pdf") return "application/pdf";
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

async function readBytes(baseUrl, pathname) {
  if (baseUrl) {
    const response = await fetch(`${baseUrl}${pathname}`, { cache: "no-store" });
    if (!response.ok) {
      return { ok: false, status: response.status, bytes: new Uint8Array() };
    }
    return { ok: true, status: response.status, bytes: new Uint8Array(await response.arrayBuffer()) };
  }
  try {
    return { ok: true, status: 200, bytes: await readFile(resolve(SITE_DIR, pathname.replace(/^\//, ""))) };
  } catch {
    return { ok: false, status: 0, bytes: new Uint8Array() };
  }
}

async function readJson(baseUrl, pathname) {
  return JSON.parse(await readText(baseUrl, pathname));
}

function attr(tag, name) {
  const match = tag.match(new RegExp(`${name}=(["'])(.*?)\\1`, "i"));
  return match?.[2] || "";
}

function alternateMap(html) {
  const alternates = {};
  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = match[0];
    if (attr(tag, "rel").toLowerCase() !== "alternate") continue;
    alternates[attr(tag, "hreflang")] = attr(tag, "href");
  }
  return alternates;
}

function checkProductAlternates(html, pagePath, failures) {
  const alternates = alternateMap(html);
  const expected = {
    en: "https://fursay.com/products",
    "zh-TW": "https://fursay.com/zh/products",
    ar: "https://fursay.com/ar/products",
    "x-default": "https://fursay.com/products",
  };
  for (const [hreflang, href] of Object.entries(expected)) {
    if (alternates[hreflang] !== href) {
      failures.push(`product_page_bad_hreflang:${pagePath}:${hreflang}:${alternates[hreflang] || "none"}`);
    }
  }
}

function checkProductSitemapAlternates(sitemap, failures) {
  const productEntries = [
    "https://fursay.com/products",
    "https://fursay.com/zh/products",
    "https://fursay.com/ar/products",
  ];
  const expectedAlternates = [
    '<xhtml:link rel="alternate" hreflang="en" href="https://fursay.com/products"/>',
    '<xhtml:link rel="alternate" hreflang="zh-TW" href="https://fursay.com/zh/products"/>',
    '<xhtml:link rel="alternate" hreflang="ar" href="https://fursay.com/ar/products"/>',
    '<xhtml:link rel="alternate" hreflang="x-default" href="https://fursay.com/products"/>',
  ];
  for (const entry of productEntries) {
    const start = sitemap.indexOf(`<loc>${entry}</loc>`);
    if (start === -1) {
      failures.push(`product_sitemap_missing_loc:${entry}`);
      continue;
    }
    const end = sitemap.indexOf("</url>", start);
    const block = sitemap.slice(start, end);
    for (const alternate of expectedAlternates) {
      if (!block.includes(alternate)) failures.push(`product_sitemap_missing_hreflang:${entry}:${alternate}`);
    }
  }
}

function structuredDataBlocks(html, pagePath, failures) {
  const blocks = [];
  const matches = [...html.matchAll(/<script\b([^>]*)type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (let index = 0; index < matches.length; index += 1) {
    try {
      blocks.push(JSON.parse(matches[index][2]));
    } catch (error) {
      failures.push(`product_json_ld_parse:${pagePath}:${index}:${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return blocks;
}

function graphNodes(blocks) {
  return blocks.flatMap((block) => (Array.isArray(block?.["@graph"]) ? block["@graph"] : [block]));
}

function itemListProductItems(blocks) {
  return graphNodes(blocks)
    .filter((node) => node?.["@type"] === "ItemList")
    .flatMap((list) => list.itemListElement || [])
    .map((item) => item?.item)
    .filter((item) => item?.["@type"] === "Product");
}

function checkProductSchema(html, pagePath, expectedUrl, expectedNames, localizedNeedle, failures) {
  const blocks = structuredDataBlocks(html, pagePath, failures);
  const nodes = graphNodes(blocks);
  const webpage = nodes.find((node) => node?.["@type"] === "WebPage");
  const products = itemListProductItems(blocks);
  if (blocks.length < 1) failures.push(`product_schema_missing_json_ld:${pagePath}`);
  if (webpage?.url !== expectedUrl) failures.push(`product_schema_webpage_url:${pagePath}:${webpage?.url || "none"}`);
  if (pagePath === "/zh/products" && webpage?.inLanguage !== "zh-TW") failures.push(`product_schema_zh_language:${webpage?.inLanguage || "none"}`);
  if (pagePath === "/ar/products" && webpage?.inLanguage !== "ar") failures.push(`product_schema_ar_language:${webpage?.inLanguage || "none"}`);
  if (products.length !== expectedNames.length) failures.push(`product_schema_product_count:${pagePath}:${products.length}`);
  for (const name of expectedNames) {
    if (!products.some((product) => product.name === name)) failures.push(`product_schema_missing_name:${pagePath}:${name}`);
  }
  for (const product of products) {
    const offer = product.offers || {};
    if (offer?.["@type"] !== "Offer") failures.push(`product_schema_offer_type:${pagePath}:${product.name || "unnamed"}`);
    if (offer.availability !== "https://schema.org/PreOrder") failures.push(`product_schema_offer_availability:${pagePath}:${product.name || "unnamed"}:${offer.availability || "none"}`);
    if (offer.price !== "0") failures.push(`product_schema_offer_price:${pagePath}:${product.name || "unnamed"}:${offer.price || "none"}`);
    if (offer.url !== expectedUrl) failures.push(`product_schema_offer_url:${pagePath}:${product.name || "unnamed"}:${offer.url || "none"}`);
    const description = `${product.description || ""} ${offer.description || ""}`;
    if (!description.includes(localizedNeedle)) failures.push(`product_schema_missing_interest_copy:${pagePath}:${product.name || "unnamed"}`);
    if (product.potentialAction?.["@type"] !== "RegisterAction") failures.push(`product_schema_register_action:${pagePath}:${product.name || "unnamed"}`);
    if (product.potentialAction?.target !== expectedUrl) failures.push(`product_schema_register_target:${pagePath}:${product.name || "unnamed"}:${product.potentialAction?.target || "none"}`);
  }
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

function htmlIncludesUrl(html, url) {
  if (!url) return false;
  return html.includes(url) || html.includes(url.replaceAll("&", "&amp;"));
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

async function checkSamplePrintInteraction(baseUrl) {
  const failures = [];
  const checks = [];
  const browser = await chromium.launch({ headless: true });
  try {
    for (const sample of REQUIRED_SAMPLE_PREVIEWS) {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      const eventPayloads = [];
      await page.addInitScript(() => {
        window.__fursayPrintCalls = 0;
        window.print = () => {
          window.__fursayPrintCalls += 1;
        };
      });
      await page.route("**/api/event", async (route) => {
        try {
          eventPayloads.push(JSON.parse(route.request().postData() || "{}"));
        } catch {
          failures.push(`sample_print:${sample.pack}:event_payload_invalid_json`);
        }
        await route.fulfill({ status: 204, body: "" });
      });
      await page.goto(`${baseUrl}${sample.path}?utm_source=contract&utm_medium=browser&utm_campaign=product_interest_validation&utm_content=${sample.pack}_sample_print`, {
        waitUntil: "domcontentloaded",
        timeout: 45000,
      });
      await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
      const clickMeta = await page.evaluate((pack) => {
        const button = document.querySelector(`[data-print-product-sample="${pack}"]`);
        if (!button) return null;
        button.click();
        return {
          pack: button.getAttribute("data-print-product-sample") || "",
          stage: button.getAttribute("data-interest-stage") || "",
          signupSource: button.getAttribute("data-signup-source") || "",
        };
      }, sample.pack);
      if (!clickMeta) failures.push(`sample_print:${sample.pack}:missing_button`);
      await page.waitForTimeout(250);
      const state = await page.evaluate(() => ({
        events: window.fursayEvents || [],
        dataLayer: window.dataLayer || [],
        printCalls: window.__fursayPrintCalls || 0,
      }));
      const printEvent = [...state.events].reverse().find((event) => event.event === "fursay_product_info_click");
      if (!printEvent) failures.push(`sample_print:${sample.pack}:missing_product_info_event`);
      if (!state.dataLayer.some((event) => event.event === "fursay_product_info_click")) failures.push(`sample_print:${sample.pack}:data_layer_missing_product_info_event`);
      if (state.printCalls !== 1) failures.push(`sample_print:${sample.pack}:print_calls:${state.printCalls}`);
      if (printEvent?.detail?.path !== sample.path) failures.push(`sample_print:${sample.pack}:event_path:${printEvent?.detail?.path || "none"}`);
      if (printEvent?.detail?.product_interest !== sample.pack) failures.push(`sample_print:${sample.pack}:event_interest:${printEvent?.detail?.product_interest || "none"}`);
      if (printEvent?.detail?.interest_stage !== "sample_print") failures.push(`sample_print:${sample.pack}:event_stage:${printEvent?.detail?.interest_stage || "none"}`);
      if (printEvent?.detail?.signup_source !== `sample_print_${sample.pack}`) failures.push(`sample_print:${sample.pack}:event_source:${printEvent?.detail?.signup_source || "none"}`);
      const privateHits = payloadHasPrivateNeedle(eventPayloads);
      if (privateHits.length) failures.push(`sample_print:${sample.pack}:event_payload_private_needles:${privateHits.join(",")}`);
      if (!eventPayloads.some((payload) => payload.event === "fursay_product_info_click")) failures.push(`sample_print:${sample.pack}:api_event_missing_product_info`);
      checks.push({
        path: sample.path,
        pack: sample.pack,
        clickMeta,
        printCalls: state.printCalls,
        events: state.events.map((event) => event.event),
        apiEvents: eventPayloads.map((payload) => payload.event),
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
  let samplePrintInteraction = null;
  const html = await readText(args.baseUrl, "/products");
  const zhHtml = await readText(args.baseUrl, "/zh/products");
  const arHtml = await readText(args.baseUrl, "/ar/products");
  const sampleHtml = Object.fromEntries(await Promise.all(REQUIRED_SAMPLE_PREVIEWS.map(async (sample) => [sample.path, await readText(args.baseUrl, sample.path)])));
  const products = await readJson(args.baseUrl, "/products.json");
  const release = await readJson(args.baseUrl, "/release.json");
  const siteHealth = await readJson(args.baseUrl, "/site-health.json");
  const conversionHealth = await readJson(args.baseUrl, "/conversion-health.json");
  const links = await readJson(args.baseUrl, "/links.json");
  const linksHtml = await readText(args.baseUrl, "/links");
  const sitemap = await readText(args.baseUrl, "/sitemap.xml");

  if (!html.includes('<link rel="canonical" href="https://fursay.com/products">')) failures.push("products_page_bad_canonical");
  if (!zhHtml.includes('<link rel="canonical" href="https://fursay.com/zh/products">')) failures.push("zh_products_page_bad_canonical");
  if (!arHtml.includes('<link rel="canonical" href="https://fursay.com/ar/products">')) failures.push("ar_products_page_bad_canonical");
  if (!zhHtml.includes('<html lang="zh-TW">')) failures.push("zh_products_page_bad_lang");
  if (!arHtml.includes('<html lang="ar" dir="rtl">')) failures.push("ar_products_page_bad_lang_or_dir");
  checkProductAlternates(html, "/products", failures);
  checkProductAlternates(zhHtml, "/zh/products", failures);
  checkProductAlternates(arHtml, "/ar/products", failures);
  checkProductSitemapAlternates(sitemap, failures);
  if (!html.includes("data-product-readiness-summary")) failures.push("products_page_missing_summary");
  if (!html.includes("data-product-readiness-gate")) failures.push("products_page_missing_gate");
  if (!html.includes("data-product-validation-handoff")) failures.push("products_page_missing_validation_handoff");
  if (!zhHtml.includes("data-product-validation-handoff")) failures.push("zh_products_page_missing_validation_handoff");
  if (!arHtml.includes("data-product-validation-handoff")) failures.push("ar_products_page_missing_validation_handoff");
  if (!zhHtml.includes("先測努爾學習單需求")) failures.push("zh_products_page_missing_validation_handoff_copy");
  if (!arHtml.includes("اختبار اهتمام ورقة نور أولا")) failures.push("ar_products_page_missing_validation_handoff_copy");
  if (!zhHtml.includes("npm run report:events")) failures.push("zh_products_page_missing_validation_report_command");
  if (!arHtml.includes("npm run report:events")) failures.push("ar_products_page_missing_validation_report_command");
  if (!html.includes("data-product-sample-previews")) failures.push("products_page_missing_sample_preview_section");
  if (!zhHtml.includes("data-product-sample-previews")) failures.push("zh_products_page_missing_sample_preview_section");
  if (!arHtml.includes("data-product-sample-previews")) failures.push("ar_products_page_missing_sample_preview_section");
  if (!html.includes("data-product-hero")) failures.push("products_page_missing_parent_hero");
  if (!html.includes("data-product-faq")) failures.push("products_page_missing_faq");
  if (!zhHtml.includes("data-product-faq")) failures.push("zh_products_page_missing_faq");
  if (!arHtml.includes("data-product-faq")) failures.push("ar_products_page_missing_faq");
  if (!html.includes('id="subscribeModal"')) failures.push("products_page_missing_subscribe_modal");
  if (!html.includes("site-shared-20260615-sharekit1.js")) failures.push("products_page_missing_shared_js");
  if (!zhHtml.includes("site-shared-20260615-sharekit1.js")) failures.push("zh_products_page_missing_shared_js");
  if (!arHtml.includes("site-shared-20260615-sharekit1.js")) failures.push("ar_products_page_missing_shared_js");
  if (!/No payment today/i.test(html)) failures.push("products_page_missing_no_payment_copy");
  if (!/Free story pack first/i.test(html)) failures.push("products_page_missing_free_pack_copy");
  if (!zhHtml.includes("今天不會收費")) failures.push("zh_products_page_missing_no_payment_copy");
  if (!zhHtml.includes("先領免費故事包")) failures.push("zh_products_page_missing_free_pack_copy");
  if (!arHtml.includes("لا دفع اليوم")) failures.push("ar_products_page_missing_no_payment_copy");
  if (!arHtml.includes("الحزمة المجانية أولا")) failures.push("ar_products_page_missing_free_pack_copy");
  for (const needle of ZH_PRODUCT_REQUIRED_COPY) {
    if (!zhHtml.includes(needle)) failures.push(`zh_products_page_missing_localized_copy:${needle}`);
  }
  for (const needle of ZH_PRODUCT_ENGLISH_REGRESSIONS) {
    if (zhHtml.includes(needle)) failures.push(`zh_products_page_english_copy_regression:${needle}`);
  }
  for (const needle of AR_PRODUCT_REQUIRED_COPY) {
    if (!arHtml.includes(needle)) failures.push(`ar_products_page_missing_localized_copy:${needle}`);
  }
  if (/<div class="creator-kit-meta">/i.test(html)) failures.push("products_page_exposes_ops_meta");
  for (const needle of [/Commit\s+[a-f0-9]{7,}/i, /JSON manifest/i, /Conversion health/i]) {
    if (needle.test(html)) failures.push(`products_page_exposes_internal_copy:${needle}`);
  }
  checkProductSchema(
    html,
    "/products",
    "https://fursay.com/products",
    ["Koko printable story pack", "Noor 3-minute worksheet pack"],
    "Interest",
    failures,
  );
  checkProductSchema(
    zhHtml,
    "/zh/products",
    "https://fursay.com/zh/products",
    ["叩叩可列印故事包等候名單", "努爾 3 分鐘中文學習單等候名單"],
    "興趣",
    failures,
  );
  checkProductSchema(
    arHtml,
    "/ar/products",
    "https://fursay.com/ar/products",
    ["قائمة انتظار حزمة كوكو القابلة للطباعة", "قائمة انتظار ورقة نور في 3 دقائق"],
    "اهتمام",
    failures,
  );

  for (const needle of CHECKOUT_NEEDLES) {
    if (needle.test(html)) failures.push(`products_page_checkout_language_or_link:${needle}`);
    if (needle.test(zhHtml)) failures.push(`zh_products_page_checkout_language_or_link:${needle}`);
    if (needle.test(arHtml)) failures.push(`ar_products_page_checkout_language_or_link:${needle}`);
  }
  const paymentHrefs = externalPaymentHrefs(html);
  const zhPaymentHrefs = externalPaymentHrefs(zhHtml);
  const arPaymentHrefs = externalPaymentHrefs(arHtml);
  if (paymentHrefs.length) failures.push(`products_page_payment_hrefs:${paymentHrefs.join(",")}`);
  if (zhPaymentHrefs.length) failures.push(`zh_products_page_payment_hrefs:${zhPaymentHrefs.join(",")}`);
  if (arPaymentHrefs.length) failures.push(`ar_products_page_payment_hrefs:${arPaymentHrefs.join(",")}`);

  const productButtons = [...html.matchAll(/<button\b[^>]*data-product-interest=(["'])(koko|noor)\1[^>]*>/gi)]
    .map((match) => ({ pack: match[2], tag: match[0] }));
  const zhProductButtons = [...zhHtml.matchAll(/<button\b[^>]*data-product-interest=(["'])(koko|noor)\1[^>]*>/gi)]
    .map((match) => ({ pack: match[2], tag: match[0] }));
  const arProductButtons = [...arHtml.matchAll(/<button\b[^>]*data-product-interest=(["'])(koko|noor)\1[^>]*>/gi)]
    .map((match) => ({ pack: match[2], tag: match[0] }));
  if (productButtons.length !== 2) failures.push(`products_page_product_interest_buttons:${productButtons.length}`);
  if (zhProductButtons.length !== 2) failures.push(`zh_products_page_product_interest_buttons:${zhProductButtons.length}`);
  if (arProductButtons.length !== 2) failures.push(`ar_products_page_product_interest_buttons:${arProductButtons.length}`);
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
  if (products.samplePreviews?.length !== release.liveExpectations?.productSamplePreviewPages) failures.push(`products_manifest_sample_preview_count:${products.samplePreviews?.length || 0}`);
  if (!products.nextValidationHandoff) failures.push("products_manifest_missing_next_validation_handoff");
  if ((products.productValidationHandoffs || []).length !== REQUIRED_PRODUCTS.length) failures.push(`products_manifest_validation_handoff_count:${products.productValidationHandoffs?.length || 0}`);
  if (products.nextValidationHandoff?.pack !== "noor") failures.push(`products_manifest_next_handoff_pack:${products.nextValidationHandoff?.pack || "none"}`);
  if (products.nextValidationHandoff?.paymentLinksAllowed !== false) failures.push("products_manifest_handoff_payment_links_allowed");
  if (products.nextValidationHandoff?.piiAllowed !== false) failures.push("products_manifest_handoff_pii_allowed");
  if (!products.nextValidationHandoff?.samplePreviewUrl?.startsWith("https://fursay.com/product-samples/")) failures.push("products_manifest_handoff_missing_sample_preview");
  if (!products.nextValidationHandoff?.sampleDownloadUrl?.startsWith("https://fursay.com/downloads/")) failures.push("products_manifest_handoff_missing_sample_download");
  if (!products.nextValidationHandoff?.trackedSampleDownloadUrl?.startsWith("https://fursay.com/download/")) failures.push("products_manifest_handoff_missing_tracked_sample_download");
  if (!products.nextValidationHandoff?.trackedSampleDownloadUrl?.includes("source_id=")) failures.push("products_manifest_handoff_tracked_download_missing_source_id");
  if (!htmlIncludesUrl(html, products.nextValidationHandoff?.trackedSampleDownloadUrl)) failures.push("products_page_missing_tracked_handoff_download");
  if (!htmlIncludesUrl(zhHtml, products.nextValidationHandoff?.trackedSampleDownloadUrl)) failures.push("zh_products_page_missing_tracked_handoff_download");
  if (!htmlIncludesUrl(arHtml, products.nextValidationHandoff?.trackedSampleDownloadUrl)) failures.push("ar_products_page_missing_tracked_handoff_download");
  if (!products.nextValidationHandoff?.freeStoryPackPath?.startsWith("/")) failures.push("products_manifest_handoff_missing_free_bridge");
  if (products.nextValidationHandoff?.reportCommand !== "npm run report:events") failures.push("products_manifest_handoff_bad_report_command");
  if (!products.nextValidationHandoff?.checkoutBlockedReason?.includes("Checkout stays disabled")) failures.push("products_manifest_handoff_missing_checkout_guardrail");
  if (products.subscribePayloadCompatibility !== "email/groups/attribution unchanged") failures.push("products_manifest_payload_contract_changed");
  if (products.trafficEntryPoints?.socialProfileLinks !== links.operations?.productInterest?.url) failures.push("products_manifest_social_entry_mismatch");
  if (products.trafficEntryPoints?.zhSocialProfileLinks !== links.operations?.zhProductInterest?.url) failures.push("products_manifest_zh_social_entry_mismatch");
  if (products.trafficEntryPoints?.arSocialProfileLinks !== links.operations?.arProductInterest?.url) failures.push("products_manifest_ar_social_entry_mismatch");
  if (!products.trafficEntryPoints?.socialProfileLinks?.includes("utm_source=links")) failures.push("products_manifest_social_entry_missing_source");
  if (!products.trafficEntryPoints?.socialProfileLinks?.includes("utm_campaign=product_interest_validation")) failures.push("products_manifest_social_entry_missing_campaign");
  if (!products.trafficEntryPoints?.zhSocialProfileLinks?.includes("utm_source=links")) failures.push("products_manifest_zh_social_entry_missing_source");
  if (!products.trafficEntryPoints?.zhSocialProfileLinks?.includes("utm_campaign=product_interest_validation")) failures.push("products_manifest_zh_social_entry_missing_campaign");
  if (!products.trafficEntryPoints?.zhSocialProfileLinks?.includes("utm_content=links_zh_product_interest")) failures.push("products_manifest_zh_social_entry_missing_content");
  if (!products.trafficEntryPoints?.arSocialProfileLinks?.includes("utm_source=links")) failures.push("products_manifest_ar_social_entry_missing_source");
  if (!products.trafficEntryPoints?.arSocialProfileLinks?.includes("utm_campaign=product_interest_validation")) failures.push("products_manifest_ar_social_entry_missing_campaign");
  if (!products.trafficEntryPoints?.arSocialProfileLinks?.includes("utm_content=links_ar_product_interest")) failures.push("products_manifest_ar_social_entry_missing_content");
  if (release.liveExpectations?.productSampleDownloadFiles !== REQUIRED_SAMPLE_PREVIEWS.length) {
    failures.push(`release_product_sample_download_files:${release.liveExpectations?.productSampleDownloadFiles || "none"}`);
  }
  const healthDownloads = siteHealth.routes?.productSampleDownloads || [];
  for (const sample of REQUIRED_SAMPLE_PREVIEWS) {
    if (!healthDownloads.includes(sample.downloadUrl)) failures.push(`site_health_missing_sample_download:${sample.pack}`);
  }
  for (const needle of ["/links.json", "JSON manifest", "Commit ", "Deploy readiness", "Traffic launch kit", "Creator kit", "Share kit", "Safety contract"]) {
    if (linksHtml.includes(needle)) failures.push(`links_page_public_internal_leak:${needle}`);
  }
  for (const pack of ["products", "koko", "noor"]) {
    if (!linksHtml.includes(`data-public-product-link="${pack}"`)) failures.push(`links_page_missing_public_product_link:${pack}`);
  }
  if (!linksHtml.includes("Printable and worksheet packs")) failures.push("links_page_missing_product_interest_label");
  if (!linksHtml.includes("繁中產品等候名單")) failures.push("links_page_missing_zh_product_interest_label");
  if (!linksHtml.includes("قائمة انتظار حزم Fursay")) failures.push("links_page_missing_ar_product_interest_label");
  if (!linksHtml.includes("utm_content=links_product_interest")) failures.push("links_page_missing_product_interest_utm");
  if (!linksHtml.includes("utm_content=links_zh_product_interest")) failures.push("links_page_missing_zh_product_interest_utm");
  if (!linksHtml.includes("utm_content=links_ar_product_interest")) failures.push("links_page_missing_ar_product_interest_utm");
  if (!linksHtml.includes("https://fursay.com/products?utm_source=links")) failures.push("links_page_missing_product_interest_href");
  if (!linksHtml.includes("https://fursay.com/zh/products?utm_source=links")) failures.push("links_page_missing_zh_product_interest_href");
  if (!linksHtml.includes("https://fursay.com/ar/products?utm_source=links")) failures.push("links_page_missing_ar_product_interest_href");

  const productIds = (products.products || []).map((product) => product.id).sort();
  if (productIds.join(",") !== REQUIRED_PRODUCTS.slice().sort().join(",")) failures.push(`products_manifest_product_ids:${productIds.join(",") || "none"}`);
  for (const sample of REQUIRED_SAMPLE_PREVIEWS) {
    const manifestSample = (products.samplePreviews || []).find((item) => item.pack === sample.pack);
    const pageHtml = sampleHtml[sample.path] || "";
    if (!manifestSample) failures.push(`products_manifest_missing_sample_preview:${sample.pack}`);
    if (manifestSample?.url !== sample.canonical) failures.push(`products_manifest_bad_sample_url:${sample.pack}:${manifestSample?.url || "none"}`);
    if (manifestSample?.noindex !== true) failures.push(`products_manifest_sample_not_noindex:${sample.pack}`);
    if (manifestSample?.printReady !== true) failures.push(`products_manifest_sample_not_print_ready:${sample.pack}`);
    if (manifestSample?.downloadableFormat !== "pdf_and_browser_print") failures.push(`products_manifest_sample_bad_download_format:${sample.pack}:${manifestSample?.downloadableFormat || "none"}`);
    if (manifestSample?.downloadUrl !== sample.downloadUrl) failures.push(`products_manifest_sample_bad_download_url:${sample.pack}:${manifestSample?.downloadUrl || "none"}`);
    if (manifestSample?.trackedDownloadUrl !== sample.trackedDownloadUrl) failures.push(`products_manifest_sample_bad_tracked_download_url:${sample.pack}:${manifestSample?.trackedDownloadUrl || "none"}`);
    if (!manifestSample?.trackedDownloadUrl?.startsWith("https://fursay.com/download/")) failures.push(`products_manifest_sample_missing_tracked_download:${sample.pack}`);
    if (!manifestSample?.trackedDownloadUrl?.includes("placement=sample_preview_pdf_download")) failures.push(`products_manifest_sample_bad_tracked_download_placement:${sample.pack}`);
    if ((manifestSample?.contents || []).length < 3) failures.push(`products_manifest_sample_missing_contents:${sample.pack}`);
    const pdf = await readBytes(args.baseUrl, sample.downloadPath);
    if (!pdf.ok) {
      failures.push(`sample_download_pdf_status:${sample.pack}:${pdf.status}`);
    } else {
      const signature = String.fromCharCode(...pdf.bytes.slice(0, 4));
      if (signature !== "%PDF") failures.push(`sample_download_pdf_signature:${sample.pack}:${signature || "none"}`);
      if (pdf.bytes.length < 5000) failures.push(`sample_download_pdf_too_small:${sample.pack}:${pdf.bytes.length}`);
    }
    if (!html.includes(`href="${sample.path}"`)) failures.push(`products_page_missing_sample_link:${sample.pack}`);
    if (!zhHtml.includes(`href="${sample.path}"`)) failures.push(`zh_products_page_missing_sample_link:${sample.pack}`);
    if (!arHtml.includes(`href="${sample.path}"`)) failures.push(`ar_products_page_missing_sample_link:${sample.pack}`);
    if (!html.includes(`data-product-info-link="${sample.pack}"`)) failures.push(`products_page_sample_missing_tracking:${sample.pack}`);
    if (!zhHtml.includes(`data-product-info-link="${sample.pack}"`)) failures.push(`zh_products_page_sample_missing_tracking:${sample.pack}`);
    if (!arHtml.includes(`data-product-info-link="${sample.pack}"`)) failures.push(`ar_products_page_sample_missing_tracking:${sample.pack}`);
    if (!pageHtml.includes(`rel="canonical" href="${sample.canonical}"`)) failures.push(`sample_page_bad_canonical:${sample.pack}`);
    if (!pageHtml.includes('name="robots" content="noindex,follow"')) failures.push(`sample_page_not_noindex:${sample.pack}`);
    if (!pageHtml.includes(`data-product-sample-preview-page="${sample.pack}"`)) failures.push(`sample_page_missing_body_marker:${sample.pack}`);
    if (!pageHtml.includes(`data-product-interest="${sample.pack}"`)) failures.push(`sample_page_missing_interest_button:${sample.pack}`);
    if (!pageHtml.includes('data-interest-stage="sample_preview_waitlist"')) failures.push(`sample_page_missing_interest_stage:${sample.pack}`);
    if (sample.pack === "noor") {
      if (!pageHtml.includes('<html lang="ar" dir="rtl">')) failures.push("sample_page_noor_missing_ar_lang_dir");
      for (const needle of NOOR_SAMPLE_REQUIRED_COPY) {
        if (!pageHtml.includes(needle)) failures.push(`sample_page_noor_missing_arabic_copy:${needle}`);
      }
      if (!pageHtml.includes("/ar/arabic?subscribe=noor")) failures.push("sample_page_noor_missing_ar_story_pack_cta");
    }
    if (!pageHtml.includes("No payment today") && !pageHtml.includes("لا دفع اليوم") && !pageHtml.includes("لا يوجد دفع")) {
      failures.push(`sample_page_missing_no_payment_copy:${sample.pack}`);
    }
    if (!pageHtml.includes(`data-product-sample-print-view="${sample.pack}"`)) failures.push(`sample_page_missing_print_view:${sample.pack}`);
    const trackedHref = new URL(sample.trackedDownloadUrl).pathname + new URL(sample.trackedDownloadUrl).search;
    if (!htmlIncludesUrl(pageHtml, trackedHref)) failures.push(`sample_page_missing_tracked_pdf_download_href:${sample.pack}`);
    if (pageHtml.includes(`href="${sample.downloadPath}"`)) failures.push(`sample_page_uses_raw_pdf_download_href:${sample.pack}`);
    if (!pageHtml.includes(`data-product-sample-download="${sample.pack}"`)) failures.push(`sample_page_missing_pdf_download_tracking:${sample.pack}`);
    if (!pageHtml.includes('data-interest-stage="sample_pdf_download"')) failures.push(`sample_page_missing_pdf_download_stage:${sample.pack}`);
    if (!pageHtml.includes(`data-signup-source="sample_pdf_download_${sample.pack}"`)) failures.push(`sample_page_missing_pdf_download_source:${sample.pack}`);
    if (!pageHtml.includes(`data-print-product-sample="${sample.pack}"`)) failures.push(`sample_page_missing_print_button:${sample.pack}`);
    if (!pageHtml.includes('data-interest-stage="sample_print"')) failures.push(`sample_page_missing_print_stage:${sample.pack}`);
    if (!pageHtml.includes(`data-signup-source="sample_print_${sample.pack}"`)) failures.push(`sample_page_missing_print_source:${sample.pack}`);
    if (!/Save as PDF|print command|列印|PDF/i.test(pageHtml)) failures.push(`sample_page_missing_print_copy:${sample.pack}`);
    for (const needle of CHECKOUT_NEEDLES) {
      if (needle.test(pageHtml)) failures.push(`sample_page_checkout_language_or_link:${sample.pack}:${needle}`);
    }
    const samplePaymentHrefs = externalPaymentHrefs(pageHtml);
    if (samplePaymentHrefs.length) failures.push(`sample_page_payment_hrefs:${sample.pack}:${samplePaymentHrefs.join(",")}`);
  }
  for (const product of products.products || []) {
    if (product.checkoutStatus !== "not_enabled") failures.push(`product_checkout_status:${product.id}:${product.checkoutStatus || "none"}`);
    if ((product.plannedIncludes || []).length < 3) failures.push(`product_missing_planned_includes:${product.id}`);
    if (!product.samplePreview?.url?.startsWith("https://fursay.com/product-samples/")) failures.push(`product_missing_sample_preview:${product.id}`);
    const plan = product.validationPlan || {};
    const sampleIsPrintReady = product.samplePreview?.status === "print_ready_preview" && product.samplePreview?.printReady === true;
    if (!html.includes(`data-product-validation-plan="${product.id}"`)) failures.push(`products_page_missing_validation_plan:${product.id}`);
    if (!zhHtml.includes(`data-product-validation-plan="${product.id}"`)) failures.push(`zh_products_page_missing_validation_plan:${product.id}`);
    if (!arHtml.includes(`data-product-validation-plan="${product.id}"`)) failures.push(`ar_products_page_missing_validation_plan:${product.id}`);
    if (!plan.audience || plan.audience.length < 40) failures.push(`product_validation_missing_audience:${product.id}`);
    if (!plan.freeBridge?.startsWith("/")) failures.push(`product_validation_missing_free_bridge:${product.id}`);
    if (!plan.nextDecision || plan.nextDecision.length < 60) failures.push(`product_validation_missing_next_decision:${product.id}`);
    if (sampleIsPrintReady && /draft\s+a|draft\s+the|draft\s+sample/i.test(plan.nextDecision || "")) {
      failures.push(`product_validation_stale_sample_decision:${product.id}`);
    }
    if (sampleIsPrintReady && !/complete|full|expand/i.test(plan.nextDecision || "")) {
      failures.push(`product_validation_missing_full_pack_decision:${product.id}`);
    }
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
  if (release.liveExpectations?.productLandingPages !== 3) failures.push(`release_product_landing_pages:${release.liveExpectations?.productLandingPages || "none"}`);
  if (release.liveExpectations?.productSamplePreviewPages !== REQUIRED_SAMPLE_PREVIEWS.length) failures.push(`release_product_sample_preview_pages:${release.liveExpectations?.productSamplePreviewPages || "none"}`);
  if (release.liveExpectations?.ownedProductSpecs !== products.products?.length) failures.push("release_owned_product_spec_mismatch");
  if (release.liveExpectations?.productValidationPlans !== products.products?.filter((product) => product.validationPlan).length) failures.push("release_product_validation_plan_mismatch");
  if (!release.qualityGates?.includes("scripts/check-product-readiness-contract.mjs")) failures.push("release_missing_product_readiness_gate");
  if (!siteHealth.routes?.products?.includes("https://fursay.com/products")) failures.push("site_health_missing_products_route");
  if (!siteHealth.routes?.products?.includes("https://fursay.com/zh/products")) failures.push("site_health_missing_zh_products_route");
  if (!siteHealth.routes?.products?.includes("https://fursay.com/ar/products")) failures.push("site_health_missing_ar_products_route");
  if (!siteHealth.generatedFrom?.includes("/products.json")) failures.push("site_health_missing_products_generated_from");
  if (siteHealth.monetization?.ownedProducts?.checkoutEnabled !== false) failures.push("site_health_checkout_enabled");
  if (conversionHealth.monetization?.ownedProducts?.checkoutEnabled !== false) failures.push("conversion_health_checkout_enabled");

  try {
    if (args.baseUrl) {
      const enInteraction = await checkProductInteraction(args.baseUrl, "/products");
      const zhInteraction = await checkProductInteraction(args.baseUrl, "/zh/products");
      const arInteraction = await checkProductInteraction(args.baseUrl, "/ar/products");
      interaction = { failures: [...enInteraction.failures, ...zhInteraction.failures, ...arInteraction.failures], checks: [...enInteraction.checks, ...zhInteraction.checks, ...arInteraction.checks] };
      samplePrintInteraction = await checkSamplePrintInteraction(args.baseUrl);
    } else {
      localServer = await startServer();
      const enInteraction = await checkProductInteraction(localServer.baseUrl, "/products");
      const zhInteraction = await checkProductInteraction(localServer.baseUrl, "/zh/products");
      const arInteraction = await checkProductInteraction(localServer.baseUrl, "/ar/products");
      interaction = { failures: [...enInteraction.failures, ...zhInteraction.failures, ...arInteraction.failures], checks: [...enInteraction.checks, ...zhInteraction.checks, ...arInteraction.checks] };
      samplePrintInteraction = await checkSamplePrintInteraction(localServer.baseUrl);
    }
    failures.push(...interaction.failures);
    failures.push(...samplePrintInteraction.failures);
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
    samplePrintInteraction: samplePrintInteraction?.checks || [],
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
