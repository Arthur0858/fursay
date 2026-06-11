import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const SITE_DIR = resolve(ROOT, "fursay-optimized-site");
const DEFAULT_OUT = "/tmp/fursay-noor-list-activation";
const PAGES = ["/arabic.html", "/zh/arabic.html", "/ar/arabic.html"];
const REQUIRED_SOURCES = [
  "arabic_hero_weekly_pack",
  "arabic_episode_story_pack",
  "arabic_story_pack_section",
];

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = { outDir: DEFAULT_OUT };
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--out-dir") parsed.outDir = args[++i];
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
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  return "application/octet-stream";
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
      if (!fullPath.startsWith(SITE_DIR) || !existsSync(fullPath)) {
        res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        res.end("not found");
        return;
      }
      const body = await readFile(fullPath);
      res.writeHead(200, { "content-type": contentType(fullPath) });
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
  await page.goto(baseUrl + path, { waitUntil: "domcontentloaded", timeout: 20000 });
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
      localStaticServerOnly: true,
    },
  };
}

async function main() {
  const args = parseArgs();
  const { server, baseUrl } = await startServer();
  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    for (const path of PAGES) results.push(await checkPage(browser, baseUrl, path));
  } finally {
    await browser.close();
    server.close();
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
      "- Safety: local static server only; no form submit; no MailerLite call; no secret read.",
      "",
    ].join("\n"))));
  console.log(JSON.stringify({ ok: report.ok, outDir: args.outDir, failed: failed.length }, null, 2));
  return report.ok ? 0 : 1;
}

main().then((code) => process.exit(code)).catch((error) => {
  console.error(error);
  process.exit(1);
});
