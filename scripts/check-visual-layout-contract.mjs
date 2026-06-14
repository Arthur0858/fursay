import { mkdir, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve } from "node:path";
import { chromium } from "playwright";

const SITE_DIR = resolve(process.cwd(), "fursay-optimized-site");
const DEFAULT_OUT = "/tmp/fursay-visual-layout-contract";
const PAGES = [
  { path: "/", file: "index.html", lang: "en" },
  { path: "/zh/", file: "zh/index.html", lang: "zh-TW" },
  { path: "/ar/", file: "ar/index.html", lang: "ar", rtl: true },
  { path: "/koko", file: "koko.html", lang: "en" },
  { path: "/zh/koko", file: "zh/koko.html", lang: "zh-TW" },
  { path: "/ar/koko", file: "ar/koko.html", lang: "ar", rtl: true },
  { path: "/arabic", file: "arabic.html", lang: "en" },
  { path: "/zh/arabic", file: "zh/arabic.html", lang: "zh-TW" },
  { path: "/ar/arabic", file: "ar/arabic.html", lang: "ar", rtl: true },
  { path: "/products", file: "products.html", lang: "en", product: true },
  { path: "/zh/products", file: "zh/products.html", lang: "zh-TW", product: true },
  { path: "/ar/products", file: "ar/products.html", lang: "ar", rtl: true, product: true },
  { path: "/product-samples/koko-printable", file: "product-samples/koko-printable.html", lang: "en", sample: true },
  { path: "/product-samples/noor-worksheet", file: "product-samples/noor-worksheet.html", lang: "en", sample: true },
];
const VIEWPORTS = [
  { name: "desktop", width: 1366, height: 900, isMobile: false, deviceScaleFactor: 1 },
  { name: "mobile", width: 390, height: 844, isMobile: true, deviceScaleFactor: 2 },
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

function pageUrl(args, page) {
  return `${args.baseUrl}${page.path}`;
}

const CONTENT_TYPES = {
  ".avif": "image/avif",
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".webp": "image/webp",
  ".xml": "application/xml; charset=utf-8",
};

async function startStaticServer() {
  const { readFile, stat } = await import("node:fs/promises");
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url || "/", "http://127.0.0.1");
      let pathname = decodeURIComponent(url.pathname);
      if (pathname.endsWith("/")) pathname += "index.html";
      if (!extname(pathname)) pathname += ".html";
      const filePath = resolve(SITE_DIR, pathname.replace(/^\/+/, ""));
      if (!filePath.startsWith(SITE_DIR)) {
        response.writeHead(403).end("Forbidden");
        return;
      }
      const fileStat = await stat(filePath);
      if (!fileStat.isFile()) {
        response.writeHead(404).end("Not found");
        return;
      }
      const content = await readFile(filePath);
      response.writeHead(200, { "content-type": CONTENT_TYPES[extname(filePath)] || "application/octet-stream" });
      response.end(content);
    } catch {
      response.writeHead(404).end("Not found");
    }
  });
  await new Promise((resolveServer) => server.listen(0, "127.0.0.1", resolveServer));
  const address = server.address();
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolveClose) => server.close(resolveClose)),
  };
}

function roundedRect(rect) {
  return {
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
    top: Math.round(rect.top),
    right: Math.round(rect.right),
    bottom: Math.round(rect.bottom),
    left: Math.round(rect.left),
  };
}

function overlapArea(a, b) {
  const width = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
  const height = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  return { width, height, area: width * height };
}

async function collectLayout(page) {
  return page.evaluate(() => {
    const rectFor = (element) => {
      const rect = element.getBoundingClientRect();
      return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        left: rect.left,
      };
    };
    const isVisible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.visibility !== "hidden" && style.display !== "none" && Number(style.opacity) > 0.01 && rect.width > 1 && rect.height > 1;
    };
    const labelFor = (element) => {
      const text = (element.innerText || element.textContent || "").replace(/\s+/g, " ").trim();
      return text || element.getAttribute("aria-label") || element.getAttribute("alt") || element.tagName.toLowerCase();
    };
    const actionableSelector = "nav a, nav button, .hero a, .hero button, .hero [data-open-subscribe], .products-page [data-product-interest], .products-page .public-share-actions a";
    const actionables = [...document.querySelectorAll(actionableSelector)]
      .filter(isVisible)
      .map((element, index) => ({
        index,
        tag: element.tagName.toLowerCase(),
        selector: element.matches("[data-open-subscribe]") ? `[data-open-subscribe="${element.getAttribute("data-open-subscribe")}"]` : element.tagName.toLowerCase(),
        text: labelFor(element),
        rect: rectFor(element),
      }));
    const h1 = document.querySelector("h1");
    const hero = document.querySelector(".hero");
    const nav = document.querySelector("nav");
    const primaryCtas = [...document.querySelectorAll(".hero [data-open-subscribe]")].filter(isVisible);
    const heroImages = [...document.querySelectorAll(".hero img")].filter(isVisible).map((element, index) => ({
      index,
      alt: element.getAttribute("alt") || "",
      rect: rectFor(element),
      pointerEvents: getComputedStyle(element).pointerEvents,
    }));
    const shareStrip = document.querySelector(".share-strip");
    const shareCopy = document.querySelector(".share-copy");
    const shareActions = document.querySelector(".share-actions");
    const shareTextNodes = [...document.querySelectorAll(".share-copy h2, .share-copy p")];
    const shareActionNodes = [...document.querySelectorAll(".share-actions button, .share-actions a")];
    const productHero = document.querySelector("[data-product-hero]");
    const productTrust = document.querySelector(".product-trust-strip");
    const productCards = [...document.querySelectorAll(".product-waitlist-card")].filter(isVisible);
    const productButtons = [...document.querySelectorAll("[data-product-interest]")].filter(isVisible);
    const productBridgeLinks = [...document.querySelectorAll(".product-waitlist-card .public-share-actions a")].filter(isVisible);
    const sampleHero = document.querySelector("[data-product-sample-preview-page]");
    const samplePreview = document.querySelector("[data-product-sample-preview]");
    const sampleActivity = document.querySelector("[data-product-sample-activity]");
    const samplePack = sampleHero?.getAttribute("data-product-sample-preview-page") || "";
    const sampleLinks = [...document.querySelectorAll(".product-sample-preview-page .public-share-actions a")].filter(isVisible);
    const h1Style = h1 ? getComputedStyle(h1) : null;
    return {
      title: document.title,
      lang: document.documentElement.lang || "",
      dir: document.documentElement.dir || "",
      viewport: { width: window.innerWidth, height: window.innerHeight },
      scrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      h1: h1 ? {
        text: (h1.innerText || h1.textContent || "").replace(/\s+/g, " ").trim(),
        rect: rectFor(h1),
        direction: h1Style.direction,
        letterSpacing: h1Style.letterSpacing,
        fontSize: h1Style.fontSize,
        lineHeight: h1Style.lineHeight,
      } : null,
      hero: hero ? { rect: rectFor(hero) } : null,
      nav: nav ? { rect: rectFor(nav) } : null,
      actionables,
      primaryCtas: primaryCtas.map((element, index) => ({
        index,
        pack: element.getAttribute("data-open-subscribe") || "",
        source: element.getAttribute("data-signup-source") || "",
        text: labelFor(element),
        rect: rectFor(element),
      })),
      heroImages,
      share: shareStrip && shareCopy && shareActions ? {
        strip: rectFor(shareStrip),
        copy: rectFor(shareCopy),
        actions: rectFor(shareActions),
        copyOverflowX: shareCopy.scrollWidth > Math.ceil(shareCopy.clientWidth) + 1,
        actionsOverflowX: shareActions.scrollWidth > Math.ceil(shareActions.clientWidth) + 1,
        textNodes: shareTextNodes.map((element) => ({
          text: labelFor(element),
          rect: rectFor(element),
          overflowX: element.scrollWidth > Math.ceil(element.clientWidth) + 1,
        })),
        actionsNodes: shareActionNodes.filter(isVisible).map((element) => ({
          text: labelFor(element),
          rect: rectFor(element),
          overflowX: element.scrollWidth > Math.ceil(element.clientWidth) + 1,
        })),
      } : null,
      product: productHero ? {
        hero: rectFor(productHero),
        trust: productTrust ? {
          rect: rectFor(productTrust),
          itemCount: [...productTrust.children].filter(isVisible).length,
          overflowX: productTrust.scrollWidth > Math.ceil(productTrust.clientWidth) + 1,
        } : null,
        cards: productCards.map((element) => ({
          id: element.getAttribute("data-product-card") || "",
          rect: rectFor(element),
          overflowX: element.scrollWidth > Math.ceil(element.clientWidth) + 1,
        })),
        buttons: productButtons.map((element) => ({
          pack: element.getAttribute("data-product-interest") || "",
          source: element.getAttribute("data-signup-source") || "",
          stage: element.getAttribute("data-interest-stage") || "",
          text: labelFor(element),
          rect: rectFor(element),
          overflowX: element.scrollWidth > Math.ceil(element.clientWidth) + 1,
        })),
        bridgeLinks: productBridgeLinks.map((element) => ({
          text: labelFor(element),
          href: element.getAttribute("href") || "",
          rect: rectFor(element),
          overflowX: element.scrollWidth > Math.ceil(element.clientWidth) + 1,
        })),
      } : null,
      sample: sampleHero ? {
        pack: samplePack,
        hero: rectFor(sampleHero),
        trust: productTrust ? {
          rect: rectFor(productTrust),
          itemCount: [...productTrust.children].filter(isVisible).length,
          overflowX: productTrust.scrollWidth > Math.ceil(productTrust.clientWidth) + 1,
        } : null,
        preview: samplePreview ? {
          rect: rectFor(samplePreview),
          overflowX: samplePreview.scrollWidth > Math.ceil(samplePreview.clientWidth) + 1,
        } : null,
        activity: sampleActivity ? {
          rect: rectFor(sampleActivity),
          overflowX: sampleActivity.scrollWidth > Math.ceil(sampleActivity.clientWidth) + 1,
        } : null,
        buttons: productButtons.map((element) => ({
          pack: element.getAttribute("data-product-interest") || "",
          source: element.getAttribute("data-signup-source") || "",
          stage: element.getAttribute("data-interest-stage") || "",
          text: labelFor(element),
          rect: rectFor(element),
          overflowX: element.scrollWidth > Math.ceil(element.clientWidth) + 1,
        })),
        links: sampleLinks.map((element) => ({
          text: labelFor(element),
          href: element.getAttribute("href") || "",
          rect: rectFor(element),
          overflowX: element.scrollWidth > Math.ceil(element.clientWidth) + 1,
        })),
      } : null,
    };
  });
}

function checkRectInsideViewport(failures, label, rect, viewport, margin = 0) {
  if (rect.left < -margin) failures.push(`${label}:left:${Math.round(rect.left)}`);
  if (rect.right > viewport.width + margin) failures.push(`${label}:right:${Math.round(rect.right)}>${viewport.width}`);
  if (rect.width > viewport.width + margin) failures.push(`${label}:width:${Math.round(rect.width)}>${viewport.width}`);
}

function checkLayout(spec, viewport, layout) {
  const failures = [];
  const prefix = `${spec.path}:${viewport.name}`;
  const maxScroll = Math.max(layout.scrollWidth, layout.bodyScrollWidth);
  if (maxScroll > viewport.width + 1) failures.push(`${prefix}:horizontal_overflow:${maxScroll}>${viewport.width}`);
  if (layout.lang !== spec.lang) failures.push(`${prefix}:lang:${layout.lang || "none"}`);
  if (spec.rtl && layout.dir !== "rtl") failures.push(`${prefix}:html_dir:${layout.dir || "none"}`);
  if (!spec.rtl && layout.dir === "rtl") failures.push(`${prefix}:unexpected_rtl_dir`);
  const expectedHero = spec.sample ? layout.sample?.hero : spec.product ? layout.product?.hero : layout.hero;
  if (!expectedHero) failures.push(`${prefix}:missing_hero`);
  if (!layout.h1) {
    failures.push(`${prefix}:missing_h1`);
    return failures;
  }

  checkRectInsideViewport(failures, `${prefix}:h1`, layout.h1.rect, viewport, 8);
  if (layout.h1.rect.top < 40) failures.push(`${prefix}:h1_too_high:${Math.round(layout.h1.rect.top)}`);
  if (layout.h1.rect.bottom > viewport.height * 0.82) failures.push(`${prefix}:h1_below_first_view:${Math.round(layout.h1.rect.bottom)}`);
  if (layout.h1.rect.height > viewport.height * 0.42) failures.push(`${prefix}:h1_too_tall:${Math.round(layout.h1.rect.height)}`);
  if (layout.h1.text.length < 6) failures.push(`${prefix}:h1_text_too_short`);
  if (layout.h1.letterSpacing.startsWith("-")) failures.push(`${prefix}:h1_negative_letter_spacing:${layout.h1.letterSpacing}`);
  if (spec.rtl && layout.h1.direction !== "rtl") failures.push(`${prefix}:h1_direction:${layout.h1.direction}`);

  const heroCtas = spec.sample ? layout.sample?.buttons || [] : spec.product ? layout.product?.buttons || [] : layout.primaryCtas;
  if (!heroCtas.length) failures.push(`${prefix}:hero_subscribe_cta_missing`);
  for (const cta of heroCtas) {
    checkRectInsideViewport(failures, `${prefix}:cta_${cta.pack || cta.index}`, cta.rect, viewport, 8);
    if (!spec.product && cta.rect.top > viewport.height) failures.push(`${prefix}:cta_below_first_view:${cta.pack || cta.index}:${Math.round(cta.rect.top)}`);
    if (cta.rect.width < 44 || cta.rect.height < 36) failures.push(`${prefix}:cta_touch_target:${cta.pack || cta.index}:${Math.round(cta.rect.width)}x${Math.round(cta.rect.height)}`);
    if (!cta.source) failures.push(`${prefix}:cta_missing_signup_source:${cta.pack || cta.index}`);
    if (spec.product && cta.stage !== "waitlist") failures.push(`${prefix}:product_cta_stage:${cta.pack || cta.index}:${cta.stage || "none"}`);
    if (spec.product && cta.overflowX) failures.push(`${prefix}:product_cta_text_overflow:${cta.pack || cta.index}`);
    if (spec.sample && cta.stage !== "sample_preview_waitlist") failures.push(`${prefix}:sample_cta_stage:${cta.pack || cta.index}:${cta.stage || "none"}`);
    if (spec.sample && cta.overflowX) failures.push(`${prefix}:sample_cta_text_overflow:${cta.pack || cta.index}`);
  }

  if (spec.sample) {
    const sample = layout.sample;
    if (!sample) {
      failures.push(`${prefix}:missing_sample_layout`);
      return failures;
    }
    checkRectInsideViewport(failures, `${prefix}:sample_hero`, sample.hero, viewport, 8);
    if (!sample.trust) {
      failures.push(`${prefix}:sample_trust_missing`);
    } else {
      checkRectInsideViewport(failures, `${prefix}:sample_trust`, sample.trust.rect, viewport, 8);
      if (sample.trust.itemCount < 3) failures.push(`${prefix}:sample_trust_item_count:${sample.trust.itemCount}`);
      if (sample.trust.overflowX) failures.push(`${prefix}:sample_trust_overflow`);
    }
    if (!sample.preview) {
      failures.push(`${prefix}:sample_preview_missing`);
    } else {
      checkRectInsideViewport(failures, `${prefix}:sample_preview`, sample.preview.rect, viewport, 8);
      if (sample.preview.overflowX) failures.push(`${prefix}:sample_preview_overflow`);
    }
    if (!sample.activity) {
      failures.push(`${prefix}:sample_activity_missing`);
    } else {
      checkRectInsideViewport(failures, `${prefix}:sample_activity`, sample.activity.rect, viewport, 8);
      if (sample.activity.overflowX) failures.push(`${prefix}:sample_activity_overflow`);
    }
    if (sample.buttons.length !== 1) failures.push(`${prefix}:sample_button_count:${sample.buttons.length}`);
    for (const button of sample.buttons) {
      if (button.pack !== sample.pack) failures.push(`${prefix}:sample_button_pack:${button.pack || "none"}!=${sample.pack || "none"}`);
    }
    if (sample.links.length < 2) failures.push(`${prefix}:sample_link_count:${sample.links.length}`);
    for (const link of sample.links) {
      checkRectInsideViewport(failures, `${prefix}:sample_link`, link.rect, viewport, 8);
      if (link.rect.width < 44 || link.rect.height < 36) failures.push(`${prefix}:sample_link_touch_target:${Math.round(link.rect.width)}x${Math.round(link.rect.height)}`);
      if (link.overflowX) failures.push(`${prefix}:sample_link_text_overflow:${link.text.slice(0, 24)}`);
    }
  }

  if (spec.product) {
    const product = layout.product;
    if (!product) {
      failures.push(`${prefix}:missing_product_layout`);
      return failures;
    }
    checkRectInsideViewport(failures, `${prefix}:product_hero`, product.hero, viewport, 8);
    if (!product.trust) {
      failures.push(`${prefix}:product_trust_missing`);
    } else {
      checkRectInsideViewport(failures, `${prefix}:product_trust`, product.trust.rect, viewport, 8);
      if (product.trust.itemCount < 3) failures.push(`${prefix}:product_trust_item_count:${product.trust.itemCount}`);
      if (product.trust.overflowX) failures.push(`${prefix}:product_trust_overflow`);
    }
    if (product.cards.length !== 2) failures.push(`${prefix}:product_card_count:${product.cards.length}`);
    for (const card of product.cards) {
      checkRectInsideViewport(failures, `${prefix}:product_card_${card.id || "unknown"}`, card.rect, viewport, 8);
      if (card.rect.width < (viewport.isMobile ? 280 : 360)) failures.push(`${prefix}:product_card_too_narrow:${card.id || "unknown"}:${Math.round(card.rect.width)}`);
      if (card.overflowX) failures.push(`${prefix}:product_card_overflow:${card.id || "unknown"}`);
    }
    const buttonPacks = product.buttons.map((button) => button.pack).sort().join(",");
    if (buttonPacks !== "koko,noor") failures.push(`${prefix}:product_button_packs:${buttonPacks || "none"}`);
    if (product.bridgeLinks.length !== 2) failures.push(`${prefix}:product_bridge_link_count:${product.bridgeLinks.length}`);
    for (const link of product.bridgeLinks) {
      checkRectInsideViewport(failures, `${prefix}:product_bridge`, link.rect, viewport, 8);
      if (!link.href.includes("subscribe=")) failures.push(`${prefix}:product_bridge_missing_subscribe:${link.href || "none"}`);
      if (link.rect.width < 44 || link.rect.height < 36) failures.push(`${prefix}:product_bridge_touch_target:${Math.round(link.rect.width)}x${Math.round(link.rect.height)}`);
      if (link.overflowX) failures.push(`${prefix}:product_bridge_text_overflow:${link.text.slice(0, 24)}`);
    }
  }

  if (layout.nav && layout.nav.rect.bottom > layout.h1.rect.top && layout.nav.rect.top < layout.h1.rect.bottom) {
    failures.push(`${prefix}:nav_overlaps_h1`);
  }

  const actionables = layout.actionables;
  for (let i = 0; i < actionables.length; i += 1) {
    const item = actionables[i];
    checkRectInsideViewport(failures, `${prefix}:action_${i}`, item.rect, viewport, 4);
    for (let j = i + 1; j < actionables.length; j += 1) {
      const other = actionables[j];
      const overlap = overlapArea(item.rect, other.rect);
      if (overlap.width > 6 && overlap.height > 6) {
        failures.push(`${prefix}:action_overlap:${item.text.slice(0, 24)}::${other.text.slice(0, 24)}:${Math.round(overlap.area)}`);
      }
    }
  }

  for (const image of layout.heroImages) {
    const overlap = overlapArea(layout.h1.rect, image.rect);
    const h1Area = layout.h1.rect.width * layout.h1.rect.height;
    if (h1Area && overlap.area / h1Area > 0.18 && image.pointerEvents !== "none") {
      failures.push(`${prefix}:hero_image_obscures_h1:${image.index}:${Math.round(overlap.area)}`);
    }
    for (const cta of heroCtas) {
      const ctaOverlap = overlapArea(cta.rect, image.rect);
      const ctaArea = cta.rect.width * cta.rect.height;
      if (ctaArea && ctaOverlap.area / ctaArea > 0.18 && image.pointerEvents !== "none") {
        failures.push(`${prefix}:hero_image_obscures_cta:${cta.pack || cta.index}:${image.index}`);
      }
    }
  }

  if (spec.product || spec.sample) {
    return failures;
  }

  if (!layout.share) {
    failures.push(`${prefix}:share_strip_missing`);
  } else {
    const minCopyWidth = viewport.isMobile ? 240 : 260;
    checkRectInsideViewport(failures, `${prefix}:share_strip`, layout.share.strip, viewport, 8);
    checkRectInsideViewport(failures, `${prefix}:share_copy`, layout.share.copy, viewport, 8);
    checkRectInsideViewport(failures, `${prefix}:share_actions`, layout.share.actions, viewport, 8);
    if (layout.share.copy.width < minCopyWidth) failures.push(`${prefix}:share_copy_too_narrow:${Math.round(layout.share.copy.width)}<${minCopyWidth}`);
    if (layout.share.copyOverflowX) failures.push(`${prefix}:share_copy_overflow`);
    if (layout.share.actionsOverflowX) failures.push(`${prefix}:share_actions_overflow`);
    for (const textNode of layout.share.textNodes) {
      if (textNode.rect.width < minCopyWidth) failures.push(`${prefix}:share_text_too_narrow:${textNode.text.slice(0, 24)}:${Math.round(textNode.rect.width)}<${minCopyWidth}`);
      if (textNode.overflowX) failures.push(`${prefix}:share_text_overflow:${textNode.text.slice(0, 24)}`);
    }
    for (const action of layout.share.actionsNodes) {
      checkRectInsideViewport(failures, `${prefix}:share_action`, action.rect, viewport, 8);
      if (action.overflowX) failures.push(`${prefix}:share_action_text_overflow:${action.text.slice(0, 24)}`);
      if (action.rect.width < 44 || action.rect.height < 36) failures.push(`${prefix}:share_action_touch_target:${action.text.slice(0, 24)}:${Math.round(action.rect.width)}x${Math.round(action.rect.height)}`);
    }
  }
  return failures;
}

async function main() {
  const args = parseArgs();
  const mode = args.baseUrl ? "live" : "local";
  let staticServer;
  if (!args.baseUrl) {
    staticServer = await startStaticServer();
    args.baseUrl = staticServer.baseUrl;
  }
  const browser = await chromium.launch({ headless: true });
  const failures = [];
  const pages = [];
  let release = {};

  try {
    const releaseResponse = await fetch(`${args.baseUrl}/release.json`);
    release = await releaseResponse.json();
    for (const viewport of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        isMobile: viewport.isMobile,
        deviceScaleFactor: viewport.deviceScaleFactor,
      });
      for (const spec of PAGES) {
        const page = await context.newPage();
        const response = await page.goto(pageUrl(args, spec), { waitUntil: "domcontentloaded", timeout: 30_000 });
        await page.waitForLoadState("load", { timeout: 10_000 }).catch(() => {});
        await page.waitForTimeout(250);
        const layout = await collectLayout(page);
        const pageFailures = [];
        if (args.baseUrl && response?.status() !== 200) pageFailures.push(`${spec.path}:${viewport.name}:status:${response?.status() || 0}`);
        pageFailures.push(...checkLayout(spec, viewport, layout));
        failures.push(...pageFailures);
        pages.push({
          path: spec.path,
          viewport: viewport.name,
          ok: pageFailures.length === 0,
          failures: pageFailures,
          h1: layout.h1 ? { text: layout.h1.text, rect: roundedRect(layout.h1.rect) } : null,
          ctas: layout.primaryCtas.map((cta) => ({ pack: cta.pack, source: cta.source, rect: roundedRect(cta.rect) })),
          product: layout.product ? {
            trust: layout.product.trust ? { rect: roundedRect(layout.product.trust.rect), itemCount: layout.product.trust.itemCount, overflowX: layout.product.trust.overflowX } : null,
            cards: layout.product.cards.map((card) => ({ id: card.id, rect: roundedRect(card.rect), overflowX: card.overflowX })),
            buttons: layout.product.buttons.map((button) => ({ pack: button.pack, source: button.source, stage: button.stage, rect: roundedRect(button.rect), overflowX: button.overflowX })),
            bridgeLinks: layout.product.bridgeLinks.map((link) => ({ text: link.text, href: link.href, rect: roundedRect(link.rect), overflowX: link.overflowX })),
          } : null,
          sample: layout.sample ? {
            pack: layout.sample.pack,
            trust: layout.sample.trust ? { rect: roundedRect(layout.sample.trust.rect), itemCount: layout.sample.trust.itemCount, overflowX: layout.sample.trust.overflowX } : null,
            preview: layout.sample.preview ? { rect: roundedRect(layout.sample.preview.rect), overflowX: layout.sample.preview.overflowX } : null,
            activity: layout.sample.activity ? { rect: roundedRect(layout.sample.activity.rect), overflowX: layout.sample.activity.overflowX } : null,
            buttons: layout.sample.buttons.map((button) => ({ pack: button.pack, source: button.source, stage: button.stage, rect: roundedRect(button.rect), overflowX: button.overflowX })),
            links: layout.sample.links.map((link) => ({ text: link.text, href: link.href, rect: roundedRect(link.rect), overflowX: link.overflowX })),
          } : null,
          share: layout.share ? {
            copy: roundedRect(layout.share.copy),
            actions: roundedRect(layout.share.actions),
            textNodes: layout.share.textNodes.map((node) => ({ text: node.text, rect: roundedRect(node.rect), overflowX: node.overflowX })),
          } : null,
          scrollWidth: Math.max(layout.scrollWidth, layout.bodyScrollWidth),
        });
        await page.close();
      }
      await context.close();
    }
    if (release.liveExpectations?.visualLayoutChecks !== pages.length) {
      failures.push(`release_visual_layout_checks:${release.liveExpectations?.visualLayoutChecks ?? "none"}!=${pages.length}`);
    }
  } finally {
    await browser.close();
    if (staticServer) await staticServer.close();
  }

  await mkdir(args.outDir, { recursive: true });
  const report = {
    ok: failures.length === 0,
    mode,
    baseUrl: mode === "live" ? args.baseUrl : "",
    viewports: VIEWPORTS.map(({ name, width, height }) => ({ name, width, height })),
    failures,
    pages,
  };
  await writeFile(resolve(args.outDir, "visual-layout-contract.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({
    ok: report.ok,
    mode: report.mode,
    outDir: args.outDir,
    failed: failures.length,
    pages: pages.length,
  }, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
