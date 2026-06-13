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
    const actionableSelector = "nav a, nav button, .hero a, .hero button, .hero [data-open-subscribe]";
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
  if (!layout.hero) failures.push(`${prefix}:missing_hero`);
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

  const heroCtas = layout.primaryCtas;
  if (!heroCtas.length) failures.push(`${prefix}:hero_subscribe_cta_missing`);
  for (const cta of heroCtas) {
    checkRectInsideViewport(failures, `${prefix}:cta_${cta.pack || cta.index}`, cta.rect, viewport, 8);
    if (cta.rect.top > viewport.height) failures.push(`${prefix}:cta_below_first_view:${cta.pack || cta.index}:${Math.round(cta.rect.top)}`);
    if (cta.rect.width < 44 || cta.rect.height < 36) failures.push(`${prefix}:cta_touch_target:${cta.pack || cta.index}:${Math.round(cta.rect.width)}x${Math.round(cta.rect.height)}`);
    if (!cta.source) failures.push(`${prefix}:cta_missing_signup_source:${cta.pack || cta.index}`);
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

  try {
    for (const viewport of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        isMobile: viewport.isMobile,
        deviceScaleFactor: viewport.deviceScaleFactor,
      });
      for (const spec of PAGES) {
        const page = await context.newPage();
        const response = await page.goto(pageUrl(args, spec), { waitUntil: "networkidle", timeout: 30_000 });
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
          scrollWidth: Math.max(layout.scrollWidth, layout.bodyScrollWidth),
        });
        await page.close();
      }
      await context.close();
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
