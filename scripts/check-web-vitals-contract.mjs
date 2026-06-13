import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";

const DEFAULT_OUT = "/tmp/fursay-web-vitals";
const DEFAULT_BASE_URL = "https://fursay.com";
const PAGES = ["/", "/zh/", "/ar/", "/koko", "/zh/koko", "/ar/koko", "/arabic", "/zh/arabic", "/ar/arabic"];
const VIEWPORTS = [
  { name: "desktop", width: 1366, height: 900, isMobile: false, deviceScaleFactor: 1 },
  { name: "mobile", width: 390, height: 844, isMobile: true, deviceScaleFactor: 2 },
];
const LIMITS = {
  fcpMs: 2000,
  lcpMs: 2500,
  cls: 0.02,
  resourceTransferBytes: 750_000,
  resourceCount: 35,
};

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = { outDir: DEFAULT_OUT, baseUrl: DEFAULT_BASE_URL };
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--out-dir") parsed.outDir = args[++i];
    if (args[i] === "--base-url") parsed.baseUrl = args[++i].replace(/\/$/, "");
  }
  return parsed;
}

async function installVitalsObserver(page) {
  await page.addInitScript(() => {
    window.__fursayVitals = { cls: 0, lcp: 0, lcpElement: "" };
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.__fursayVitals.lcp = entry.startTime;
          window.__fursayVitals.lcpElement = entry.element?.tagName || "";
        }
      }).observe({ type: "largest-contentful-paint", buffered: true });
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) window.__fursayVitals.cls += entry.value;
        }
      }).observe({ type: "layout-shift", buffered: true });
    } catch {
      window.__fursayVitals.unsupported = true;
    }
  });
}

async function collectMetrics(page) {
  return page.evaluate(() => {
    const navigation = performance.getEntriesByType("navigation")[0];
    const paints = Object.fromEntries(performance.getEntriesByType("paint").map((entry) => [entry.name, entry.startTime]));
    const resources = performance.getEntriesByType("resource");
    const totals = resources.reduce((sum, resource) => ({
      transfer: sum.transfer + (resource.transferSize || 0),
      encoded: sum.encoded + (resource.encodedBodySize || 0),
      decoded: sum.decoded + (resource.decodedBodySize || 0),
    }), { transfer: 0, encoded: 0, decoded: 0 });
    return {
      fcpMs: Math.round(paints["first-contentful-paint"] || 0),
      lcpMs: Math.round(window.__fursayVitals?.lcp || 0),
      cls: Number((window.__fursayVitals?.cls || 0).toFixed(4)),
      lcpElement: window.__fursayVitals?.lcpElement || "",
      domContentLoadedMs: Math.round(navigation?.domContentLoadedEventEnd || 0),
      loadMs: Math.round(navigation?.loadEventEnd || 0),
      resourceTransferBytes: Math.round(totals.transfer),
      resourceEncodedBytes: Math.round(totals.encoded),
      resourceDecodedBytes: Math.round(totals.decoded),
      resourceCount: resources.length,
    };
  });
}

function checkLimits({ path, viewport, metrics }) {
  const failures = [];
  if (!metrics.fcpMs || metrics.fcpMs > LIMITS.fcpMs) failures.push(`${path}:${viewport}:fcp_ms:${metrics.fcpMs}`);
  if (!metrics.lcpMs || metrics.lcpMs > LIMITS.lcpMs) failures.push(`${path}:${viewport}:lcp_ms:${metrics.lcpMs}`);
  if (metrics.cls > LIMITS.cls) failures.push(`${path}:${viewport}:cls:${metrics.cls}`);
  if (metrics.resourceTransferBytes > LIMITS.resourceTransferBytes) {
    failures.push(`${path}:${viewport}:resource_transfer_bytes:${metrics.resourceTransferBytes}`);
  }
  if (metrics.resourceCount > LIMITS.resourceCount) failures.push(`${path}:${viewport}:resource_count:${metrics.resourceCount}`);
  return failures;
}

async function main() {
  const args = parseArgs();
  const browser = await chromium.launch({ headless: true });
  const failures = [];
  const checks = [];

  try {
    for (const viewport of VIEWPORTS) {
      for (const path of PAGES) {
        const context = await browser.newContext({
          viewport: { width: viewport.width, height: viewport.height },
          isMobile: viewport.isMobile,
          deviceScaleFactor: viewport.deviceScaleFactor,
        });
        const page = await context.newPage();
        await installVitalsObserver(page);
        const response = await page.goto(`${args.baseUrl}${path}`, { waitUntil: "load", timeout: 30_000 });
        await page.waitForTimeout(2_000);
        const metrics = await collectMetrics(page);
        const status = response?.status() || 0;
        const check = { path, viewport: viewport.name, status, metrics };
        if (status !== 200) failures.push(`${path}:${viewport.name}:status:${status}`);
        failures.push(...checkLimits(check));
        checks.push(check);
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }

  await mkdir(args.outDir, { recursive: true });
  const report = {
    ok: failures.length === 0,
    baseUrl: args.baseUrl,
    limits: LIMITS,
    failures,
    checks,
  };
  await writeFile(resolve(args.outDir, "web-vitals-contract.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({
    ok: report.ok,
    outDir: args.outDir,
    failed: failures.length,
    checks: checks.length,
    maxFcpMs: Math.max(...checks.map((check) => check.metrics.fcpMs)),
    maxLcpMs: Math.max(...checks.map((check) => check.metrics.lcpMs)),
    maxCls: Math.max(...checks.map((check) => check.metrics.cls)),
    maxTransferBytes: Math.max(...checks.map((check) => check.metrics.resourceTransferBytes)),
  }, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
