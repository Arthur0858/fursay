import { mkdir, readFile, writeFile } from "node:fs/promises";
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
  cls: 0.05,
  resourceTransferBytes: 750_000,
  resourceCount: 35,
};
const TARGETS = {
  cls: 0.02,
};
const MAX_ATTEMPTS = 3;

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

async function readReleaseExpectations(baseUrl) {
  if (baseUrl) {
    const response = await fetch(`${baseUrl}/release.json`, { cache: "no-store" });
    if (!response.ok) throw new Error(`release.json status ${response.status}`);
    return (await response.json()).liveExpectations || {};
  }
  const release = JSON.parse(await readFile(resolve(process.cwd(), "fursay-optimized-site/release.json"), "utf8"));
  return release.liveExpectations || {};
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

function checkTargets({ path, viewport, metrics }) {
  const warnings = [];
  if (metrics.cls > TARGETS.cls) warnings.push(`${path}:${viewport}:cls_target:${metrics.cls}`);
  return warnings;
}

function shouldRetry({ status, failures }) {
  if (status !== 200) return true;
  return failures.some((failure) => failure.includes(":fcp_ms:") || failure.includes(":lcp_ms:"));
}

function chooseBetterCheck(current, candidate) {
  if (!current) return candidate;
  if (candidate.failures.length !== current.failures.length) {
    return candidate.failures.length < current.failures.length ? candidate : current;
  }
  if (candidate.metrics.lcpMs !== current.metrics.lcpMs) {
    return candidate.metrics.lcpMs < current.metrics.lcpMs ? candidate : current;
  }
  return candidate.metrics.fcpMs < current.metrics.fcpMs ? candidate : current;
}

async function measurePage(browser, args, viewport, path, attempt) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    isMobile: viewport.isMobile,
    deviceScaleFactor: viewport.deviceScaleFactor,
  });
  const page = await context.newPage();
  try {
    await installVitalsObserver(page);
    const response = await page.goto(`${args.baseUrl}${path}`, { waitUntil: "load", timeout: 30_000 });
    await page.waitForTimeout(2_000);
    const metrics = await collectMetrics(page);
    const status = response?.status() || 0;
    const baseCheck = { path, viewport: viewport.name, status, metrics, attempt };
    const failures = [];
    if (status !== 200) failures.push(`${path}:${viewport.name}:status:${status}`);
    failures.push(...checkLimits(baseCheck));
    return { ...baseCheck, failures, warnings: checkTargets(baseCheck) };
  } finally {
    await context.close();
  }
}

async function main() {
  const args = parseArgs();
  const browser = await chromium.launch({ headless: true });
  const failures = [];
  const warnings = [];
  const checks = [];
  const releaseExpectations = await readReleaseExpectations(args.baseUrl);

  try {
    for (const viewport of VIEWPORTS) {
      for (const path of PAGES) {
        const attempts = [];
        let bestCheck;
        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
          const measured = await measurePage(browser, args, viewport, path, attempt);
          attempts.push({
            attempt,
            status: measured.status,
            metrics: measured.metrics,
            failures: measured.failures,
          });
          bestCheck = chooseBetterCheck(bestCheck, measured);
          if (!shouldRetry(measured)) break;
        }
        failures.push(...bestCheck.failures);
        warnings.push(...bestCheck.warnings);
        const check = {
          path,
          viewport: viewport.name,
          status: bestCheck.status,
          metrics: bestCheck.metrics,
          attempt: bestCheck.attempt,
        };
        if (attempts.length > 1) check.attempts = attempts;
        checks.push(check);
      }
    }
  } finally {
    await browser.close();
  }

  if (releaseExpectations.webVitalsChecks !== checks.length) {
    failures.push(`release_web_vitals_checks:${releaseExpectations.webVitalsChecks ?? "none"}!=${checks.length}`);
  }

  await mkdir(args.outDir, { recursive: true });
  const report = {
    ok: failures.length === 0,
    baseUrl: args.baseUrl,
    limits: LIMITS,
    targets: TARGETS,
    failures,
    warnings,
    checks,
  };
  await writeFile(resolve(args.outDir, "web-vitals-contract.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({
    ok: report.ok,
    outDir: args.outDir,
    failed: failures.length,
    warnings: warnings.length,
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
