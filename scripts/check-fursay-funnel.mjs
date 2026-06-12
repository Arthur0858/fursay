import { createServer } from "node:http";
import { existsSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const SITE_DIR = resolve(ROOT, "fursay-optimized-site");
const DEFAULT_OUT = "/tmp/fursay-funnel-check";
const PAGES = ["/", "/koko", "/arabic", "/zh/", "/zh/koko", "/zh/arabic", "/ar/", "/ar/koko", "/ar/arabic"];
const HOME_PAGES = ["/", "/zh/", "/ar/"];
const MERGED_TEXT_PATTERNS = [
  /Koko'sForest/,
  /Arabic KidsChinese/,
  /كوكوومغامرة/,
  /العربوكتاب/,
];

function taipeiDateString(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}
const JOIN_ROUTES = [
  {
    path: "/join/koko",
    targetPath: "/koko",
    pack: "koko",
    campaign: "koko_story_funnel",
    content: "join_koko",
  },
  {
    path: "/join/noor",
    targetPath: "/arabic",
    pack: "noor",
    campaign: "noor_story_funnel",
    content: "join_noor",
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
      const joinRoute = JOIN_ROUTES.find((route) => route.path === url.pathname.replace(/\/+$/, ""));
      if (joinRoute) {
        const location = new URL(joinRoute.targetPath, `http://${req.headers.host || "127.0.0.1"}`);
        location.searchParams.set("subscribe", joinRoute.pack);
        location.searchParams.set("utm_source", "shortlink");
        location.searchParams.set("utm_medium", "direct");
        location.searchParams.set("utm_campaign", joinRoute.campaign);
        location.searchParams.set("utm_content", joinRoute.content);
        res.writeHead(302, {
          "location": location.toString(),
          "cache-control": "public, max-age=300, must-revalidate",
        });
        res.end();
        return;
      }
      if (url.pathname === "/api/subscribe") {
        res.writeHead(405, { "content-type": "application/json" });
        res.end(JSON.stringify({ success: false, message: "disabled in local audit" }));
        return;
      }
      const fullPath = resolveAsset(url.pathname);
      if (!fullPath) {
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
  const response = await page.goto(baseUrl + path, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});

  const status = response.status();
  const data = await page.evaluate(({ homePages, statusCode }) => {
    const qa = (selector) => [...document.querySelectorAll(selector)];
    const h1Text = qa("h1").map((h1) => h1.textContent.trim().replace(/\s+/g, " ")).join(" | ");
    const homeCtas = qa("[data-open-subscribe][data-signup-source]").map((el) => ({
      text: el.textContent.trim().replace(/\s+/g, " "),
      group: el.getAttribute("data-open-subscribe") || "",
      source: el.getAttribute("data-signup-source") || "",
    }));
    return {
      status: statusCode,
      title: document.title,
      lang: document.documentElement.lang || "",
      dir: document.documentElement.dir || "",
      canonical: document.querySelector('link[rel="canonical"]')?.href || "",
      hreflangCount: qa('link[rel="alternate"][hreflang]').length,
      h1Count: qa("h1").length,
      h1Text,
      horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
      homeCtas: homePages.includes(location.pathname) ? homeCtas : [],
      noorLeadMagnet: !!document.querySelector(".noor-lead-magnet"),
      noorLeadMagnetItems: qa(".noor-lead-magnet li").length,
      youtubeLinks: qa('a[href*="youtube.com/"], a[href*="youtu.be/"]').map((anchor) => anchor.href),
      shareStrip: !!document.querySelector(".share-strip"),
      shareUrl: document.querySelector("[data-share-fursay]")?.getAttribute("data-share-url") || "",
      shareFallback: document.querySelector(".share-fallback")?.href || "",
      shareSubscribe: document.querySelector(".share-subscribe")?.textContent.trim().replace(/\s+/g, " ") || "",
      shareSubscribeGroup: document.querySelector(".share-subscribe")?.getAttribute("data-open-subscribe") || "",
      shareSubscribeGroups: qa(".share-subscribe[data-open-subscribe]").map((button) => button.getAttribute("data-open-subscribe") || ""),
      packLinkUrl: document.querySelector("[data-copy-pack-link]")?.getAttribute("data-pack-url") || "",
      packLinkUrls: qa("[data-copy-pack-link]").map((button) => button.getAttribute("data-pack-url") || ""),
    };
  }, { homePages: HOME_PAGES, statusCode: status });

  const failures = [];
  if (status !== 200) failures.push(`status:${status}`);
  if (!data.canonical) failures.push("missing_canonical");
  if (data.hreflangCount < 4) failures.push(`short_hreflang:${data.hreflangCount}`);
  if (data.h1Count !== 1) failures.push(`h1_count:${data.h1Count}`);
  if (MERGED_TEXT_PATTERNS.some((pattern) => pattern.test(data.h1Text))) failures.push(`merged_h1_text:${data.h1Text}`);
  if (data.horizontalOverflow > 2) failures.push(`horizontal_overflow:${data.horizontalOverflow}`);

  if (HOME_PAGES.includes(path)) {
    const groups = new Set(data.homeCtas.map((cta) => cta.group).filter(Boolean));
    if (!groups.has("koko")) failures.push("home_missing_koko_preselect");
    if (!groups.has("noor")) failures.push("home_missing_noor_preselect");

    for (const expected of ["koko", "noor"]) {
      const modalState = await page.evaluate((group) => {
        const target = document.querySelector(`[data-open-subscribe="${group}"]`);
        if (!target) return { clicked: false };
        target.click();
        const checked = [...document.querySelectorAll('#subscribeModal input[name="groups"]:checked, #subscribeModal input[name="channel"]:checked')]
          .map((input) => input.value === "arabic" ? "noor" : input.value);
        const overlay = document.querySelector("#subscribeModal");
        if (overlay) overlay.classList.remove("open");
        document.body.style.overflow = "";
        return {
          clicked: true,
          modalOpen: overlay?.classList.contains("open") || false,
          checked: [...new Set(checked)],
        };
      }, expected);
      if (!modalState.clicked) failures.push(`home_${expected}_cta_not_clickable`);
      if (modalState.checked?.length !== 1 || modalState.checked[0] !== expected) {
        failures.push(`home_${expected}_wrong_modal_preselect:${modalState.checked?.join(",") || "none"}`);
      }
    }
  }

  if (path.endsWith("/arabic") || path === "/arabic") {
    if (!data.noorLeadMagnet) failures.push("missing_noor_lead_magnet");
    if (data.noorLeadMagnetItems < 6) failures.push(`short_noor_lead_magnet:${data.noorLeadMagnetItems}`);
  }
  if (data.youtubeLinks.length) {
    const unattributed = data.youtubeLinks.filter((href) => !href.includes("utm_source=fursay") || !href.includes("utm_medium=site"));
    const channelLinks = data.youtubeLinks.filter((href) => /youtube\.com\/@(?:KokosForest|ArabicKidsChinese)(?:\?|#|$)/.test(href));
    const channelLinksWithoutSubscribeHint = channelLinks.filter((href) => !href.includes("sub_confirmation=1"));
    if (unattributed.length) failures.push(`unattributed_youtube_links:${unattributed.length}`);
    if (channelLinksWithoutSubscribeHint.length) failures.push(`missing_youtube_subscribe_hint:${channelLinksWithoutSubscribeHint.length}`);
  }
  if (!data.shareStrip) failures.push("missing_share_strip");
  if (!data.shareSubscribe) failures.push("missing_share_subscribe_action");
  if (HOME_PAGES.includes(path)) {
    const shareGroups = new Set(data.shareSubscribeGroups);
    if (!shareGroups.has("koko")) failures.push("home_share_missing_koko_preselect");
    if (!shareGroups.has("noor")) failures.push("home_share_missing_noor_preselect");
    if (!data.packLinkUrls.some((href) => href.includes("subscribe=koko") && href.includes("utm_content=koko_pack_link"))) {
      failures.push("home_missing_koko_pack_deep_link");
    }
    if (!data.packLinkUrls.some((href) => href.includes("subscribe=noor") && href.includes("utm_content=noor_pack_link"))) {
      failures.push("home_missing_noor_pack_deep_link");
    }
  }
  if ((path.includes("arabic") && data.shareSubscribeGroup !== "noor") || (path.includes("koko") && data.shareSubscribeGroup !== "koko")) {
    failures.push(`bad_share_subscribe_preselect:${data.shareSubscribeGroup || "none"}`);
  }
  if (path.includes("arabic") || path.includes("koko")) {
    const expectedPack = path.includes("arabic") ? "noor" : "koko";
    if (!data.packLinkUrl) failures.push("missing_pack_deep_link");
    if (!data.packLinkUrl.includes(`subscribe=${expectedPack}`)) failures.push(`bad_pack_deep_link_subscribe:${data.packLinkUrl}`);
    if (!data.packLinkUrl.includes("utm_source=family_share") || !data.packLinkUrl.includes("utm_medium=share")) {
      failures.push("bad_pack_deep_link_utm");
    }
    if (!data.packLinkUrl.includes(`utm_content=${expectedPack}_pack_link`)) {
      failures.push("bad_pack_deep_link_content");
    }
  }
  if (!data.shareUrl.includes("utm_source=family_share") || !data.shareUrl.includes("utm_medium=share")) {
    failures.push("bad_share_button_url");
  }
  if (!data.shareFallback.includes("utm_source=family_share") || !data.shareFallback.includes("utm_medium=share")) {
    failures.push("bad_share_fallback_url");
  }
  if (apiCalls.length) failures.push("api_called_during_static_check");

  await page.close();
  return { path, ok: failures.length === 0, failures, data };
}

async function checkSubscribeDeepLink(browser, baseUrl, path, expectedGroup) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const apiCalls = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/subscribe") apiCalls.push(request.url());
  });
  const response = await page.goto(`${baseUrl}${path}?subscribe=${expectedGroup}`, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(350);
  const data = await page.evaluate(() => {
    const overlay = document.querySelector("#subscribeModal");
    const checked = [...document.querySelectorAll('#subscribeModal input[name="groups"]:checked, #subscribeModal input[name="channel"]:checked')]
      .map((input) => input.value === "arabic" ? "noor" : input.value);
    return {
      modalOpen: overlay?.classList.contains("open") || false,
      signupSource: overlay?.dataset.signupSource || "",
      checked: [...new Set(checked)],
    };
  });
  const failures = [];
  if (response.status() !== 200) failures.push(`status:${response.status()}`);
  if (!data.modalOpen) failures.push("deep_link_modal_not_open");
  if (data.signupSource !== `url_subscribe_${expectedGroup}`) failures.push(`deep_link_signup_source:${data.signupSource || "none"}`);
  if (data.checked.length !== 1 || data.checked[0] !== expectedGroup) failures.push(`deep_link_wrong_preselect:${data.checked.join(",") || "none"}`);
  if (apiCalls.length) failures.push("api_called_during_deep_link_check");
  await page.close();
  return { path: `${path}?subscribe=${expectedGroup}`, ok: failures.length === 0, failures, data };
}

async function checkAttributionPayload(browser, baseUrl) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  let capturedPayload = null;
  await page.route("**/api/subscribe", async (route) => {
    try {
      capturedPayload = JSON.parse(route.request().postData() || "{}");
    } catch {
      capturedPayload = {};
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, message: "captured by smoke" }),
    });
  });
  const url = `${baseUrl}/arabic?subscribe=noor&utm_source=family_share&utm_medium=share&utm_campaign=noor_story_funnel&utm_content=noor_pack_link`;
  const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(350);
  await page.fill("#modalEmail, #sub-email", "funnel-smoke@example.test");
  await page.evaluate(() => document.querySelector("#subscribeModal form")?.requestSubmit());
  await page.waitForFunction(() => document.querySelector("#subscribeModal .modal-note")?.textContent.includes("Subscribed"), null, { timeout: 5000 }).catch(() => {});
  await page.close();

  const attribution = capturedPayload?.attribution || {};
  const groups = capturedPayload?.groups || [];
  const failures = [];
  if (response.status() !== 200) failures.push(`status:${response.status()}`);
  if (!capturedPayload) failures.push("subscribe_payload_not_captured");
  if (!groups.includes("noor") || groups.includes("koko")) failures.push(`wrong_payload_groups:${groups.join(",") || "none"}`);
  if (attribution.signup_source !== "url_subscribe_noor") failures.push(`wrong_payload_signup_source:${attribution.signup_source || "none"}`);
  if (attribution.subscribe_intent !== "noor") failures.push(`wrong_payload_subscribe_intent:${attribution.subscribe_intent || "none"}`);
  if (attribution.entry_pack !== "noor") failures.push(`wrong_payload_entry_pack:${attribution.entry_pack || "none"}`);
  if (attribution.modal_preselect !== "noor") failures.push(`wrong_payload_modal_preselect:${attribution.modal_preselect || "none"}`);
  if (attribution.utm_source !== "family_share" || attribution.utm_medium !== "share") failures.push("wrong_payload_utm_source_medium");
  if (attribution.utm_content !== "noor_pack_link") failures.push(`wrong_payload_utm_content:${attribution.utm_content || "none"}`);

  return {
    path: "/arabic?subscribe=noor attribution payload",
    ok: failures.length === 0,
    failures,
    data: { groups, attribution },
  };
}

async function checkJoinRedirects(baseUrl) {
  const results = [];
  for (const route of JOIN_ROUTES) {
    const response = await fetch(`${baseUrl}${route.path}`, { redirect: "manual" });
    const location = response.headers.get("location") || "";
    const failures = [];
    if (![301, 302, 303, 307, 308].includes(response.status)) failures.push(`status:${response.status}`);
    if (!location.includes(route.targetPath)) failures.push(`wrong_join_target:${location || "none"}`);
    if (!location.includes(`subscribe=${route.pack}`)) failures.push(`missing_join_subscribe:${location || "none"}`);
    if (!location.includes("utm_source=shortlink") || !location.includes("utm_medium=direct")) {
      failures.push(`missing_join_utm:${location || "none"}`);
    }
    if (!location.includes(`utm_campaign=${route.campaign}`) || !location.includes(`utm_content=${route.content}`)) {
      failures.push(`wrong_join_campaign:${location || "none"}`);
    }
    results.push({
      path: route.path,
      ok: failures.length === 0,
      failures,
      data: { status: response.status, location },
    });
  }
  return results;
}

async function readDiscoveryFile(baseUrl, fileName) {
  if (baseUrl) {
    const response = await fetch(`${baseUrl}/${fileName}`);
    if (!response.ok) throw new Error(`${fileName} status ${response.status}`);
    return response.text();
  }
  return readFile(resolve(SITE_DIR, fileName), "utf8");
}

async function checkDiscoveryFiles(baseUrl) {
  const failures = [];
  const sitemap = await readDiscoveryFile(baseUrl, "sitemap.xml");
  const llms = await readDiscoveryFile(baseUrl, "llms.txt");
  const lastmods = [...sitemap.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((match) => match[1]);
  const expectedLastmod = taipeiDateString();
  if (lastmods.length !== 9) failures.push(`sitemap_lastmod_count:${lastmods.length}`);
  if (lastmods.some((value) => value !== expectedLastmod)) failures.push(`sitemap_lastmod_not_current:${expectedLastmod}`);
  if (!llms.includes("https://fursay.com/koko") || !llms.includes("https://fursay.com/arabic")) {
    failures.push("llms_missing_story_world_routes");
  }
  if (!llms.includes("https://www.youtube.com/@KokosForest") || !llms.includes("https://www.youtube.com/@ArabicKidsChinese")) {
    failures.push("llms_missing_youtube_routes");
  }
  if (!llms.includes("https://fursay.com/join/koko") || !llms.includes("https://fursay.com/join/noor")) {
    failures.push("llms_missing_join_routes");
  }
  return {
    path: "discovery-files",
    ok: failures.length === 0,
    failures,
    data: { lastmodCount: lastmods.length, expectedLastmod, llmsBytes: Buffer.byteLength(llms) },
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
    results.push(await checkSubscribeDeepLink(browser, baseUrl, "/koko", "koko"));
    results.push(await checkSubscribeDeepLink(browser, baseUrl, "/arabic", "noor"));
    results.push(await checkAttributionPayload(browser, baseUrl));
    results.push(...await checkJoinRedirects(baseUrl));
    results.push(await checkDiscoveryFiles(args.baseUrl));
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
    .then(() => fs.writeFile(join(args.outDir, "fursay-funnel-check.json"), JSON.stringify(report, null, 2) + "\n"))
    .then(() => fs.writeFile(join(args.outDir, "fursay-funnel-check.md"), [
      "# Fursay Funnel Check",
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
