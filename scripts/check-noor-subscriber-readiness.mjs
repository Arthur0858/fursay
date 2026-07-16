import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

const SITE_DIR = resolve(process.cwd(), "fursay-optimized-site");
const DEFAULT_OUT = "/tmp/fursay-noor-subscriber-readiness";
const NOOR_PAGES = [
  { path: "/arabic", file: "arabic.html" },
  { path: "/zh/arabic", file: "zh/arabic.html" },
  { path: "/ar/arabic", file: "ar/arabic.html" },
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

async function readPage(baseUrl, page) {
  if (baseUrl) {
    const response = await fetch(`${baseUrl}${page.path}`);
    if (!response.ok) throw new Error(`${page.path} status ${response.status}`);
    return response.text();
  }
  return readFile(resolve(SITE_DIR, page.file), "utf8");
}

async function readJson(baseUrl, pathname) {
  if (baseUrl) {
    const response = await fetch(`${baseUrl}${pathname}`);
    if (!response.ok) throw new Error(`${pathname} status ${response.status}`);
    return response.json();
  }
  return JSON.parse(await readFile(resolve(SITE_DIR, pathname.replace(/^\//, "")), "utf8"));
}

async function recentNoorSubscriberEmptyRuns() {
  const dir = resolve(process.cwd(), "content/newsletters/runs");
  if (!existsSync(dir)) return [];
  const files = (await readdir(dir)).filter((file) => file.endsWith(".json")).sort();
  const rows = [];
  for (const file of files) {
    const data = JSON.parse(await readFile(join(dir, file), "utf8"));
    const text = JSON.stringify(data);
    if (data.channel === "arabic" && /Nour subscribers/.test(text) && /subscriber_empty|0 active subscribers/.test(text)) {
      rows.push({ file: `content/newsletters/runs/${file}`, status: data.status || "", failureCode: data.failureCode || data.providerErrorCode || "" });
    }
  }
  return rows.slice(-5);
}

async function main() {
  const args = parseArgs();
  const failures = [];
  const pageResults = [];
  for (const page of NOOR_PAGES) {
    const html = await readPage(args.baseUrl, page);
    const noorCtas = (html.match(/data-open-subscribe=["']noor["']/g) || []).length;
    const leadMagnets = (html.match(/data-noor-lead-magnet=["']weekly-sample-v2["']/g) || []).length;
    if (noorCtas < 3) failures.push(`${page.path}:noor_ctas:${noorCtas}<3`);
    if (leadMagnets !== 1) failures.push(`${page.path}:lead_magnet:${leadMagnets}!=1`);
    if (!/3-minute|3 分鐘|3 دقائق/.test(html)) failures.push(`${page.path}:missing_three_minute_promise`);
    if (!/free|免費|مجانية/i.test(html)) failures.push(`${page.path}:missing_free_promise`);
    if (!/receive|收到|تصلكم|ستصلكم|ستصل/i.test(html)) failures.push(`${page.path}:missing_delivery_promise`);
    pageResults.push({ path: page.path, noorCtas, leadMagnets });
  }
  const siteHealth = await readJson(args.baseUrl, "/site-health.json");
  const conversionHealth = await readJson(args.baseUrl, "/conversion-health.json");
  if (siteHealth.growth?.noorReadinessStatus !== "safe_wait_subscriber_empty") failures.push(`site_health_noor_readiness:${siteHealth.growth?.noorReadinessStatus || "none"}`);
  if (conversionHealth.growth?.noorLeadMagnetPages !== NOOR_PAGES.length) failures.push(`conversion_health_noor_pages:${conversionHealth.growth?.noorLeadMagnetPages || "none"}`);
  const subscriberEmptyRuns = args.baseUrl ? [] : await recentNoorSubscriberEmptyRuns();
  const report = {
    ok: failures.length === 0,
    mode: args.baseUrl ? "live" : "local",
    status: "safe_wait_subscriber_empty",
    failures,
    pages: pageResults,
    subscriberEmptyRuns,
  };
  await mkdir(args.outDir, { recursive: true });
  await writeFile(resolve(args.outDir, "noor-subscriber-readiness.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({ ok: report.ok, mode: report.mode, outDir: args.outDir, status: report.status, failed: failures.length, pages: pageResults.length }, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
