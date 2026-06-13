import { chromium } from "playwright";

const base = process.argv[2] || "https://fursay.com";
const paths = ["/", "/koko.html", "/arabic.html", "/zh/", "/zh/koko.html", "/zh/arabic.html", "/ar/", "/ar/koko.html", "/ar/arabic.html"];
const NAVIGATION_TIMEOUT_MS = 45000;
const NAVIGATION_RETRIES = 2;
const browser = await chromium.launch({ headless: true });
const results = [];

async function gotoWithRetry(page, url) {
  let lastError;
  for (let attempt = 1; attempt <= NAVIGATION_RETRIES; attempt += 1) {
    try {
      return await page.goto(url, { waitUntil: "domcontentloaded", timeout: NAVIGATION_TIMEOUT_MS });
    } catch (error) {
      lastError = error;
      if (attempt < NAVIGATION_RETRIES) {
        await page.waitForTimeout(1000);
      }
    }
  }
  throw lastError;
}

for (const path of paths) {
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  const consoleMessages = [];
  const failedRequests = [];
  const badStatuses = [];

  page.on("console", (msg) => {
    if (["error", "warning"].includes(msg.type())) {
      consoleMessages.push({ type: msg.type(), text: msg.text().slice(0, 300) });
    }
  });
  page.on("requestfailed", (req) => failedRequests.push({ url: req.url(), failure: req.failure()?.errorText }));
  page.on("response", (res) => {
    if (res.status() >= 400) badStatuses.push({ status: res.status(), url: res.url() });
  });

  const response = await gotoWithRetry(page, base + path);
  await page.waitForLoadState("networkidle", { timeout: 12000 }).catch(() => {});
  await page.evaluate(async () => {
    const step = Math.max(480, Math.floor(window.innerHeight * 0.75));
    for (let y = 0; y <= document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 80));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});

  const data = await page.evaluate(() => {
    const q = (selector) => document.querySelector(selector);
    const qa = (selector) => [...document.querySelectorAll(selector)];
    const images = [...document.images];
    const anchors = qa("a[href]");
    return {
      title: document.title,
      lang: document.documentElement.lang || "",
      dir: document.documentElement.dir || "",
      canonical: q('link[rel="canonical"]')?.href || "",
      description: q('meta[name="description"]')?.getAttribute("content") || "",
      h1Count: qa("h1").length,
      h1: qa("h1").map((h) => h.textContent.trim()).join(" | "),
      ogImage: q('meta[property="og:image"]')?.getAttribute("content") || "",
      twitterImage: q('meta[name="twitter:image"]')?.getAttribute("content") || "",
      hreflangs: qa('link[rel="alternate"][hreflang]').map((el) => ({ lang: el.getAttribute("hreflang"), href: el.href })),
      brokenImages: images.filter((img) => img.complete && img.naturalWidth === 0).map((img) => img.currentSrc || img.src),
      lazyUnloadedImages: images.filter((img) => !img.complete && !img.currentSrc).map((img) => img.src),
      imagesMissingAlt: images.filter((img) => !img.hasAttribute("alt")).map((img) => img.currentSrc || img.src),
      characterImagesMissingSize: images
        .filter((img) => img.currentSrc.includes("/images/chars/"))
        .filter((img) => !img.getAttribute("width") || !img.getAttribute("height"))
        .map((img) => img.currentSrc || img.src),
      externalBlankNoNoopener: anchors.filter((a) => a.target === "_blank" && !/noopener|noreferrer/.test(a.rel)).map((a) => a.href),
      emptyLinks: anchors.filter((a) => !a.textContent.trim() && !a.getAttribute("aria-label")).map((a) => a.href),
      bodyOverflow: document.body.scrollWidth > innerWidth + 1,
      scrollWidth: document.body.scrollWidth,
      viewportWidth: innerWidth,
      pictureCount: qa("picture").length,
      charPngCurrent: images.filter((img) => img.currentSrc.includes("/images/chars/") && img.currentSrc.endsWith(".png")).length,
      charAvifCurrent: images.filter((img) => img.currentSrc.includes("/images/chars/") && img.currentSrc.endsWith(".avif")).length,
    };
  });

  results.push({ path, status: response.status(), ...data, consoleMessages, failedRequests, badStatuses });
  await page.close();
}

await browser.close();
console.log(JSON.stringify(results, null, 2));
