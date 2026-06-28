import { createServer } from "node:http";
import { existsSync, statSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { chromium } from "playwright";

const SITE_DIR = resolve(process.cwd(), "fursay-optimized-site");
const DEFAULT_OUT = "/tmp/fursay-localized-cta-contract";
const PAGES = [
  {
    path: "/",
    lang: "en",
    kind: "home",
    required: {
      home_koko_weekly_pack: "koko",
      home_noor_weekly_pack: "noor",
      home_weekly_pack_koko: "koko",
      home_weekly_pack_noor: "noor",
    },
    samples: {
      koko: {
        path: "/product-samples/koko-printable",
        sourceId: "home_koko_sample_preview",
        creator: "fursay",
        placement: "home_weekly_pack",
      },
      noor: "/arabic",
    },
  },
  {
    path: "/zh/",
    lang: "zh-TW",
    kind: "home",
    required: {
      home_koko_weekly_pack: "koko",
      home_noor_weekly_pack: "noor",
      home_weekly_pack_koko: "koko",
      home_weekly_pack_noor: "noor",
    },
    samples: {
      koko: {
        path: "/product-samples/koko-printable",
        sourceId: "zh_home_koko_sample_preview",
        creator: "fursay",
        placement: "home_weekly_pack",
      },
      noor: "/zh/arabic",
    },
  },
  {
    path: "/ar/",
    lang: "ar",
    dir: "rtl",
    kind: "home",
    required: {
      home_koko_weekly_pack: "koko",
      home_noor_weekly_pack: "noor",
      home_weekly_pack_koko: "koko",
      home_weekly_pack_noor: "noor",
    },
    samples: {
      koko: {
        path: "/product-samples/koko-printable",
        sourceId: "ar_home_koko_sample_preview",
        creator: "fursay",
        placement: "home_weekly_pack",
      },
      noor: "/ar/arabic",
    },
  },
  {
    path: "/koko",
    lang: "en",
    kind: "koko",
    required: {
      koko_hero_weekly_pack: "koko",
      koko_sample_pack_cta: "koko",
      koko_story_pack_section: "koko",
    },
  },
  {
    path: "/zh/koko",
    lang: "zh-TW",
    kind: "koko",
    required: {
      koko_hero_weekly_pack: "koko",
      koko_sample_pack_cta: "koko",
      koko_story_pack_section: "koko",
    },
  },
  {
    path: "/ar/koko",
    lang: "ar",
    dir: "rtl",
    kind: "koko",
    required: {
      koko_hero_weekly_pack: "koko",
      koko_sample_pack_cta: "koko",
      koko_story_pack_section: "koko",
    },
  },
  {
    path: "/arabic",
    lang: "en",
    kind: "noor",
    required: {
      arabic_hero_weekly_pack: "noor",
      arabic_episode_story_pack: "noor",
      arabic_sample_pack_cta: "noor",
      arabic_story_pack_section: "noor",
    },
  },
  {
    path: "/zh/arabic",
    lang: "zh-TW",
    kind: "noor",
    required: {
      arabic_hero_weekly_pack: "noor",
      arabic_episode_story_pack: "noor",
      arabic_sample_pack_cta: "noor",
      arabic_story_pack_section: "noor",
    },
  },
  {
    path: "/ar/arabic",
    lang: "ar",
    dir: "rtl",
    kind: "noor",
    required: {
      arabic_hero_weekly_pack: "noor",
      arabic_episode_story_pack: "noor",
      arabic_sample_pack_cta: "noor",
      arabic_story_pack_section: "noor",
    },
  },
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
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url || "/", "http://127.0.0.1");
      if (url.pathname === "/api/subscribe") {
        res.writeHead(405, { "content-type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ success: false, message: "disabled in contract check" }));
        return;
      }
      const asset = resolveAsset(url.pathname);
      if (!asset) {
        res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        res.end("not found");
        return;
      }
      res.writeHead(200, { "content-type": contentType(asset) });
      res.end(await readFile(asset));
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

async function checkPage(browser, baseUrl, spec) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const apiCalls = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/subscribe") apiCalls.push(request.url());
  });
  await page.goto(`${baseUrl}${spec.path}`, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});

  const data = await page.evaluate((expected) => {
    const q = (selector) => [...document.querySelectorAll(selector)];
    const ctas = q("[data-open-subscribe][data-signup-source]").map((el) => ({
      pack: el.getAttribute("data-open-subscribe") || "",
      source: el.getAttribute("data-signup-source") || "",
      text: el.textContent.trim().replace(/\s+/g, " "),
    }));
    const sampleLinks = q(".home-sample-link[data-home-sample-link]").map((el) => ({
      pack: el.getAttribute("data-home-sample-link") || "",
      href: el.getAttribute("href") || "",
    }));
    const groupInputs = q('#subscribeModal input[name="groups"]').map((input) => ({
      value: input.getAttribute("value") || "",
      checked: input.checked,
    }));
    const legacyChannelInputs = q('#subscribeModal input[name="channel"]').map((input) => input.getAttribute("value") || "");
    const close = document.querySelector("#subscribeModal [data-close-subscribe]");
    return {
      lang: document.documentElement.lang || "",
      dir: document.documentElement.dir || "",
      ctas,
      sampleLinks,
      groupInputs,
      legacyChannelInputs,
      hasForm: !!document.querySelector("#subscribeModal form"),
      closeLabel: close?.getAttribute("aria-label") || "",
      submitText: document.querySelector("#subscribeModal [type='submit']")?.textContent.trim().replace(/\s+/g, " ") || "",
      expected,
    };
  }, spec);

  const failures = [];
  if (data.lang !== spec.lang) failures.push(`bad_lang:${data.lang || "none"}`);
  if ((spec.dir || "") !== data.dir) failures.push(`bad_dir:${data.dir || "none"}`);
  if (!data.hasForm) failures.push("missing_subscribe_form");
  if (!data.closeLabel) failures.push("missing_modal_close_label");
  if (!data.submitText) failures.push("missing_modal_submit_text");
  if (data.legacyChannelInputs.length) failures.push(`legacy_channel_inputs:${data.legacyChannelInputs.join(",")}`);
  const groupValues = data.groupInputs.map((input) => input.value).sort();
  if (groupValues.join(",") !== "koko,noor") failures.push(`bad_group_values:${groupValues.join(",") || "none"}`);

  for (const [source, pack] of Object.entries(spec.required)) {
    const cta = data.ctas.find((item) => item.source === source);
    if (!cta) {
      failures.push(`missing_cta:${source}`);
    } else if (cta.pack !== pack) {
      failures.push(`bad_cta_pack:${source}:${cta.pack || "none"}`);
    }
  }

  if (spec.kind === "home") {
    for (const [pack, expected] of Object.entries(spec.samples || {})) {
      const link = data.sampleLinks.find((item) => item.pack === pack);
      if (!link) {
        failures.push(`missing_home_sample:${pack}`);
        continue;
      }
      const url = new URL(link.href, "https://fursay.com");
      if (typeof expected === "string") {
        if (url.pathname !== expected) failures.push(`bad_home_sample_path:${pack}:${url.pathname}`);
        if (url.searchParams.get("subscribe") !== pack) failures.push(`bad_home_sample_subscribe:${pack}:${url.searchParams.get("subscribe") || "none"}`);
        if (url.searchParams.get("utm_source") !== "home") failures.push(`bad_home_sample_source:${pack}:${url.searchParams.get("utm_source") || "none"}`);
      } else {
        if (url.pathname !== expected.path) failures.push(`bad_home_sample_path:${pack}:${url.pathname}`);
        if (url.searchParams.get("source_id") !== expected.sourceId) failures.push(`bad_home_sample_source_id:${pack}:${url.searchParams.get("source_id") || "none"}`);
        if (url.searchParams.get("creator") !== expected.creator) failures.push(`bad_home_sample_creator:${pack}:${url.searchParams.get("creator") || "none"}`);
        if (url.searchParams.get("placement") !== expected.placement) failures.push(`bad_home_sample_placement:${pack}:${url.searchParams.get("placement") || "none"}`);
      }
    }
  }

  for (const [source, pack] of Object.entries(spec.required)) {
    await page.evaluate((ctaSource) => {
      document.querySelector(`[data-signup-source="${ctaSource}"]`)?.click();
    }, source);
    const modal = await page.evaluate(() => ({
      open: document.querySelector("#subscribeModal")?.classList.contains("open") || false,
      signupSource: document.querySelector("#subscribeModal")?.dataset.signupSource || "",
      preselect: document.querySelector("#subscribeModal")?.dataset.preselect || "",
      checked: [...document.querySelectorAll('#subscribeModal input[name="groups"]:checked')].map((input) => input.value).sort(),
    }));
    if (!modal.open) failures.push(`modal_not_open:${source}`);
    if (modal.signupSource !== source) failures.push(`bad_signup_source:${source}:${modal.signupSource || "none"}`);
    if (modal.preselect !== pack) failures.push(`bad_preselect:${source}:${modal.preselect || "none"}`);
    if (modal.checked.join(",") !== pack) failures.push(`bad_checked_group:${source}:${modal.checked.join(",") || "none"}`);
    await page.evaluate(() => window.closeSubscribeModal && window.closeSubscribeModal());
  }

  await page.goto(`${baseUrl}${spec.path}?subscribe=${spec.kind === "noor" ? "noor" : "koko"}`, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(250);
  const deepLink = await page.evaluate(() => ({
    open: document.querySelector("#subscribeModal")?.classList.contains("open") || false,
    checked: [...document.querySelectorAll('#subscribeModal input[name="groups"]:checked')].map((input) => input.value).sort(),
    source: document.querySelector("#subscribeModal")?.dataset.signupSource || "",
  }));
  const expectedDeepLinkPack = spec.kind === "noor" ? "noor" : "koko";
  if (!deepLink.open) failures.push("deeplink_modal_not_open");
  if (deepLink.checked.join(",") !== expectedDeepLinkPack) failures.push(`deeplink_bad_checked:${deepLink.checked.join(",") || "none"}`);
  if (deepLink.source !== `url_subscribe_${expectedDeepLinkPack}`) failures.push(`deeplink_bad_source:${deepLink.source || "none"}`);
  if (apiCalls.length) failures.push("api_called_before_submit");

  await page.close();
  return { path: spec.path, ok: failures.length === 0, failures, data };
}

async function main() {
  const args = parseArgs();
  const local = args.baseUrl ? { server: null, baseUrl: args.baseUrl } : await startServer();
  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    for (const spec of PAGES) results.push(await checkPage(browser, local.baseUrl, spec));
  } finally {
    await browser.close();
    if (local.server) local.server.close();
  }

  const failed = results.filter((result) => !result.ok);
  const report = {
    ok: failed.length === 0,
    mode: args.baseUrl ? "live" : "local",
    baseUrl: local.baseUrl,
    failed: failed.map((result) => ({ path: result.path, failures: result.failures })),
    results,
  };
  await mkdir(args.outDir, { recursive: true });
  await writeFile(resolve(args.outDir, "localized-cta-contract.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({
    ok: report.ok,
    mode: report.mode,
    outDir: args.outDir,
    failed: failed.length,
    pages: results.length,
  }, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
