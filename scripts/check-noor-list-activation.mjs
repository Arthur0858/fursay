import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const SITE_DIR = resolve(ROOT, "fursay-optimized-site");
const DEFAULT_OUT = "/tmp/fursay-noor-list-activation";
const PAGES = ["/arabic", "/zh/arabic", "/ar/arabic"];
const REQUIRED_SOURCES = [
  "arabic_hero_weekly_pack",
  "arabic_episode_story_pack",
  "arabic_sample_pack_cta",
  "arabic_story_pack_section",
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

function contentType(path) {
  const ext = extname(path).toLowerCase();
  if (ext === ".html") return "text/html; charset=utf-8";
  if (ext === ".js") return "text/javascript; charset=utf-8";
  if (ext === ".css") return "text/css; charset=utf-8";
  if (ext === ".json") return "application/json; charset=utf-8";
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".webp") return "image/webp";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  return "application/octet-stream";
}

async function readBytes(baseUrl, pathname) {
  const response = await fetch(`${baseUrl}${pathname}`);
  if (!response.ok) return { ok: false, status: response.status, bytes: new Uint8Array() };
  return { ok: true, status: response.status, bytes: new Uint8Array(await response.arrayBuffer()) };
}

function startServer() {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url || "/", "http://127.0.0.1");
      if (url.pathname === "/api/subscribe") {
        res.writeHead(405, { "content-type": "application/json" });
        res.end(JSON.stringify({ success: false, message: "disabled in local audit" }));
        return;
      }
      const clean = url.pathname === "/" ? "/index.html" : url.pathname;
      const fullPath = resolve(SITE_DIR, `.${clean}`);
      const htmlPath = resolve(SITE_DIR, `.${clean}.html`);
      const indexPath = resolve(SITE_DIR, `.${clean}/index.html`);
      const candidatePath = existsSync(fullPath) ? fullPath : (existsSync(htmlPath) ? htmlPath : indexPath);
      if (!candidatePath.startsWith(SITE_DIR) || !existsSync(candidatePath)) {
        res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        res.end("not found");
        return;
      }
      const body = await readFile(candidatePath);
      res.writeHead(200, { "content-type": contentType(candidatePath) });
      res.end(body);
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

async function checkPage(browser, baseUrl, path) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const apiCalls = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/subscribe") apiCalls.push(request.url());
  });
  try {
    await page.goto(baseUrl + path, { waitUntil: "domcontentloaded", timeout: 45000 });
  } catch (error) {
    await page.goto(baseUrl + path, { waitUntil: "load", timeout: 45000 });
  }
  await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});

  const staticChecks = await page.evaluate((sources) => {
    const ctas = [...document.querySelectorAll('[data-open-subscribe="noor"]')].map((el) => ({
      text: el.textContent.trim().replace(/\s+/g, " "),
      source: el.getAttribute("data-signup-source") || "",
      tag: el.tagName.toLowerCase(),
    }));
    const sourceSet = new Set(ctas.map((cta) => cta.source));
    return {
      title: document.title,
      lang: document.documentElement.lang || "",
      dir: document.documentElement.dir || "",
      ctas,
      missingSources: sources.filter((source) => !sourceSet.has(source)),
      hasNoorLeadMagnet: !!document.querySelector(".noor-lead-magnet"),
      leadMagnetVariant: document.querySelector(".noor-lead-magnet")?.getAttribute("data-noor-lead-magnet") || "",
      leadMagnetText: document.querySelector(".noor-lead-magnet")?.textContent.trim().replace(/\s+/g, " ") || "",
      leadMagnetItems: document.querySelectorAll(".noor-lead-magnet li").length,
      sampleCtaGroup: document.querySelector('[data-signup-source="arabic_sample_pack_cta"]')?.getAttribute("data-open-subscribe") || "",
      sampleDownload: {
        href: document.querySelector('.noor-lead-magnet a[data-product-sample-download="noor"]')?.getAttribute("href") || "",
        download: document.querySelector('.noor-lead-magnet a[data-product-sample-download="noor"]')?.hasAttribute("download") || false,
        stage: document.querySelector('.noor-lead-magnet a[data-product-sample-download="noor"]')?.getAttribute("data-interest-stage") || "",
        source: document.querySelector('.noor-lead-magnet a[data-product-sample-download="noor"]')?.getAttribute("data-signup-source") || "",
      },
      sampleInterest: {
        pack: document.querySelector('.noor-lead-magnet [data-product-interest="noor"]')?.getAttribute("data-product-interest") || "",
        stage: document.querySelector('.noor-lead-magnet [data-product-interest="noor"]')?.getAttribute("data-interest-stage") || "",
        source: document.querySelector('.noor-lead-magnet [data-product-interest="noor"]')?.getAttribute("data-signup-source") || "",
      },
      hasNoorCheckbox: !!document.querySelector('#subscribeModal input[name="groups"][value="noor"]'),
      hasSubscribeForm: !!document.querySelector("#subscribeModal form"),
      horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
    };
  }, REQUIRED_SOURCES);

  const clicked = await page.evaluate(() => {
    const target = document.querySelector('[data-signup-source="arabic_episode_story_pack"]');
    if (!target) return false;
    target.click();
    return true;
  });
  const modalChecks = await page.evaluate(() => {
    const modal = document.querySelector("#subscribeModal");
    const noor = document.querySelector('#subscribeModal input[name="groups"][value="noor"]');
    const koko = document.querySelector('#subscribeModal input[name="groups"][value="koko"]');
    return {
      modalOpen: modal?.classList.contains("open") || false,
      signupSource: modal?.dataset.signupSource || "",
      noorChecked: !!noor?.checked,
      kokoChecked: !!koko?.checked,
      bodyLocked: document.body.style.overflow === "hidden",
    };
  });

  await page.close();
  const failures = [];
  if (staticChecks.missingSources.length) failures.push(`missing_sources:${staticChecks.missingSources.join(",")}`);
  if (!staticChecks.hasNoorLeadMagnet) failures.push("missing_noor_lead_magnet");
  if (staticChecks.leadMagnetVariant !== "weekly-sample-v2") failures.push(`bad_lead_magnet_variant:${staticChecks.leadMagnetVariant || "none"}`);
  if (staticChecks.leadMagnetItems < 6) failures.push(`short_noor_lead_magnet:${staticChecks.leadMagnetItems}`);
  if (staticChecks.sampleCtaGroup !== "noor") failures.push(`bad_sample_cta_group:${staticChecks.sampleCtaGroup || "none"}`);
  const expectedDownloadHref = "/download/noor-worksheet-sample?source_id=noor_lead_magnet_pdf&creator=fursay&placement=noor_lead_magnet_pdf";
  if (staticChecks.sampleDownload.href !== expectedDownloadHref) failures.push(`bad_sample_download_href:${staticChecks.sampleDownload.href || "none"}`);
  if (staticChecks.sampleDownload.href?.startsWith("/downloads/")) failures.push(`sample_download_uses_raw_pdf_href:${staticChecks.sampleDownload.href}`);
  if (!staticChecks.sampleDownload.download) failures.push("sample_download_missing_download_attr");
  if (staticChecks.sampleDownload.stage !== "noor_lead_magnet_pdf") failures.push(`bad_sample_download_stage:${staticChecks.sampleDownload.stage || "none"}`);
  if (staticChecks.sampleDownload.source !== "noor_lead_magnet_pdf") failures.push(`bad_sample_download_source:${staticChecks.sampleDownload.source || "none"}`);
  if (staticChecks.sampleInterest.pack !== "noor") failures.push(`bad_sample_interest_pack:${staticChecks.sampleInterest.pack || "none"}`);
  if (staticChecks.sampleInterest.stage !== "lead_magnet_after_pdf") failures.push(`bad_sample_interest_stage:${staticChecks.sampleInterest.stage || "none"}`);
  if (staticChecks.sampleInterest.source !== "noor_lead_magnet_interest_after_pdf") failures.push(`bad_sample_interest_source:${staticChecks.sampleInterest.source || "none"}`);
  if (!/(sample pack|樣張|نموذج)/i.test(staticChecks.leadMagnetText)) failures.push("lead_magnet_missing_sample_copy");
  if (!/(ready|準備好|جاهزة)/i.test(staticChecks.leadMagnetText)) failures.push("lead_magnet_missing_delivery_copy");
  if (!/(free|免費|مجانية)/i.test(staticChecks.leadMagnetText)) failures.push("lead_magnet_missing_free_copy");
  if (!/(receive|收到|تصلكم|ستصلكم|ستصل)/i.test(staticChecks.leadMagnetText)) failures.push("lead_magnet_missing_receive_copy");
  if (!staticChecks.hasNoorCheckbox) failures.push("missing_noor_checkbox");
  if (!staticChecks.hasSubscribeForm) failures.push("missing_subscribe_form");
  if (staticChecks.horizontalOverflow > 2) failures.push(`horizontal_overflow:${staticChecks.horizontalOverflow}`);
  if (!clicked) failures.push("episode_story_pack_cta_not_found");
  if (!modalChecks.modalOpen) failures.push("modal_not_open");
  if (modalChecks.signupSource !== "arabic_episode_story_pack") failures.push(`wrong_signup_source:${modalChecks.signupSource}`);
  if (!modalChecks.noorChecked) failures.push("noor_not_preselected");
  if (modalChecks.kokoChecked) failures.push("koko_unexpectedly_checked");
  if (!modalChecks.bodyLocked) failures.push("body_not_locked");
  if (apiCalls.length) failures.push("api_called_before_submit");
  const pdf = await readBytes(baseUrl, "/downloads/noor-worksheet-sample.pdf");
  if (!pdf.ok) {
    failures.push(`sample_download_pdf_status:${pdf.status}`);
  } else {
    const signature = String.fromCharCode(...pdf.bytes.slice(0, 4));
    if (signature !== "%PDF") failures.push(`sample_download_pdf_signature:${signature || "none"}`);
    if (pdf.bytes.length < 5000) failures.push(`sample_download_pdf_too_small:${pdf.bytes.length}`);
  }

  return {
    path,
    ok: failures.length === 0,
    failures,
    staticChecks,
    modalChecks,
    safety: {
      noFormSubmit: true,
      noMailerLiteCall: apiCalls.length === 0,
      noSecretRead: true,
      baseUrl,
    },
  };
}

async function main() {
  const args = parseArgs();
  const local = args.baseUrl ? { server: null, baseUrl: args.baseUrl } : await startServer();
  const { server, baseUrl } = local;
  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    for (const path of PAGES) results.push(await checkPage(browser, baseUrl, path));
  } finally {
    await browser.close();
    if (server) server.close();
  }
  const failed = results.filter((result) => !result.ok);
  const report = {
    generatedAt: new Date().toISOString(),
    siteDir: SITE_DIR,
    baseUrl,
    ok: failed.length === 0,
    total: results.length,
    failed: failed.map((result) => ({ path: result.path, failures: result.failures })),
    results,
  };
  await import("node:fs/promises").then((fs) => fs.mkdir(args.outDir, { recursive: true })
    .then(() => fs.writeFile(join(args.outDir, "noor-list-activation.json"), JSON.stringify(report, null, 2) + "\n"))
    .then(() => fs.writeFile(join(args.outDir, "noor-list-activation.md"), [
      "# Fursay Noor List Activation Check",
      "",
      `- Result: ${report.ok ? "PASS" : "FAIL"}`,
      `- Pages: ${report.total}`,
      `- Failed: ${failed.length}`,
      `- Base URL: ${baseUrl}`,
      "- Safety: no form submit; no MailerLite call; no secret read.",
      "",
    ].join("\n"))));
  console.log(JSON.stringify({ ok: report.ok, outDir: args.outDir, failed: failed.length }, null, 2));
  return report.ok ? 0 : 1;
}

main().then((code) => process.exit(code)).catch((error) => {
  console.error(error);
  process.exit(1);
});
