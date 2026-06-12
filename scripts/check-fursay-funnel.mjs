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
const SMOKE_ID = `smoke_${Date.now()}`;

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
  {
    path: "/sample/koko",
    targetPath: "/koko",
    pack: "koko",
    campaign: "koko_story_funnel",
    content: "sample_koko",
  },
  {
    path: "/sample/noor",
    targetPath: "/arabic",
    pack: "noor",
    campaign: "noor_story_funnel",
    content: "sample_noor",
  },
  {
    path: "/creator/koko",
    targetPath: "/koko",
    pack: "koko",
    source: "creator_kit",
    medium: "description",
    campaign: "koko_story_funnel",
    content: "creator_kit_sample",
  },
  {
    path: "/creator/noor",
    targetPath: "/arabic",
    pack: "noor",
    source: "creator_kit",
    medium: "description",
    campaign: "noor_story_funnel",
    content: "creator_kit_sample",
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
        location.searchParams.set("utm_source", joinRoute.source || "shortlink");
        location.searchParams.set("utm_medium", joinRoute.medium || "direct");
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
  const targetUrl = new URL(path, baseUrl);
  if (!baseUrl.startsWith("http://127.0.0.1")) targetUrl.searchParams.set("fursay_smoke", SMOKE_ID);
  const response = await page.goto(targetUrl.toString(), { waitUntil: "domcontentloaded", timeout: 20000 });
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
      homeSampleLinks: homePages.includes(location.pathname)
        ? qa("[data-home-sample-link]").map((anchor) => ({
          pack: anchor.getAttribute("data-home-sample-link") || "",
          href: anchor.href,
          text: anchor.textContent.trim().replace(/\s+/g, " "),
        }))
        : [],
      kokoLeadMagnet: !!document.querySelector(".koko-lead-magnet"),
      kokoLeadMagnetVariant: document.querySelector(".koko-lead-magnet")?.getAttribute("data-koko-lead-magnet") || "",
      kokoLeadMagnetText: document.querySelector(".koko-lead-magnet")?.textContent.trim().replace(/\s+/g, " ") || "",
      kokoLeadMagnetItems: qa(".koko-lead-magnet li").length,
      kokoSampleCtaSource: document.querySelector(".koko-sample-cta")?.getAttribute("data-signup-source") || "",
      kokoSampleCtaGroup: document.querySelector(".koko-sample-cta")?.getAttribute("data-open-subscribe") || "",
      noorLeadMagnet: !!document.querySelector(".noor-lead-magnet"),
      noorLeadMagnetVariant: document.querySelector(".noor-lead-magnet")?.getAttribute("data-noor-lead-magnet") || "",
      noorLeadMagnetText: document.querySelector(".noor-lead-magnet")?.textContent.trim().replace(/\s+/g, " ") || "",
      noorLeadMagnetItems: qa(".noor-lead-magnet li").length,
      noorSampleCtaSource: document.querySelector(".noor-sample-cta")?.getAttribute("data-signup-source") || "",
      noorSampleCtaGroup: document.querySelector(".noor-sample-cta")?.getAttribute("data-open-subscribe") || "",
      youtubeLinks: qa('a[href*="youtube.com/"], a[href*="youtu.be/"]').map((anchor) => anchor.href),
      shareStrip: !!document.querySelector(".share-strip"),
      shareUrl: document.querySelector("[data-share-fursay]")?.getAttribute("data-share-url") || "",
      shareFallback: document.querySelector(".share-fallback")?.href || "",
      shareSubscribe: document.querySelector(".share-subscribe")?.textContent.trim().replace(/\s+/g, " ") || "",
      shareSubscribeGroup: document.querySelector(".share-subscribe")?.getAttribute("data-open-subscribe") || "",
      shareSubscribeGroups: qa(".share-subscribe[data-open-subscribe]").map((button) => button.getAttribute("data-open-subscribe") || ""),
      packLinkUrl: document.querySelector("[data-copy-pack-link]")?.getAttribute("data-pack-url") || "",
      packLinkUrls: qa("[data-copy-pack-link]").map((button) => button.getAttribute("data-pack-url") || ""),
      sampleLinkUrl: document.querySelector("[data-copy-sample-link]")?.getAttribute("data-sample-url") || "",
      sampleLinkUrls: qa("[data-copy-sample-link]").map((button) => ({
        pack: button.getAttribute("data-sample-pack") || "",
        href: button.getAttribute("data-sample-url") || "",
        text: button.textContent.trim().replace(/\s+/g, " "),
      })),
      campaignQrCards: qa("[data-campaign-qr]").map((card) => ({
        pack: card.getAttribute("data-campaign-qr") || "",
        href: card.href || "",
        image: card.querySelector("img")?.getAttribute("src") || "",
        alt: card.querySelector("img")?.getAttribute("alt") || "",
        text: card.textContent.trim().replace(/\s+/g, " "),
      })),
      storyPackSchemas: qa('script[type="application/ld+json"]').flatMap((script) => {
        try {
          const parsed = JSON.parse(script.textContent);
          const nodes = Array.isArray(parsed) ? parsed : (parsed["@graph"] || [parsed]);
          return nodes.filter((node) => node && node["@type"] === "ItemList").map((node) => ({
            name: node.name || "",
            itemCount: Array.isArray(node.itemListElement) ? node.itemListElement.length : 0,
            target: node.potentialAction?.target || "",
            isPartOf: node.isPartOf?.name || "",
          }));
        } catch {
          return [{ parseError: true }];
        }
      }),
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
    const sampleLinks = new Map(data.homeSampleLinks.map((link) => [link.pack, link.href]));
    const expectedSampleLinks = [
      { pack: "koko", pathNeedle: "/koko", campaign: "koko_story_funnel", content: "home_koko_sample_link" },
      { pack: "noor", pathNeedle: path === "/" ? "/arabic" : `${path.replace(/\/$/, "")}/arabic`, campaign: "noor_story_funnel", content: "home_noor_sample_link" },
    ];
    for (const expected of expectedSampleLinks) {
      const href = sampleLinks.get(expected.pack) || "";
      if (!href) failures.push(`home_missing_${expected.pack}_sample_link`);
      if (!href.includes(expected.pathNeedle)) failures.push(`home_bad_${expected.pack}_sample_path:${href || "none"}`);
      if (!href.includes(`subscribe=${expected.pack}`)) failures.push(`home_bad_${expected.pack}_sample_subscribe:${href || "none"}`);
      if (!href.includes("utm_source=home") || !href.includes("utm_medium=site")) failures.push(`home_bad_${expected.pack}_sample_utm_source_medium`);
      if (!href.includes(`utm_campaign=${expected.campaign}`) || !href.includes(`utm_content=${expected.content}`)) {
        failures.push(`home_bad_${expected.pack}_sample_campaign:${href || "none"}`);
      }
    }

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
    if (data.noorLeadMagnetVariant !== "weekly-sample-v2") failures.push(`bad_noor_lead_magnet_variant:${data.noorLeadMagnetVariant || "none"}`);
    if (data.noorLeadMagnetItems < 6) failures.push(`short_noor_lead_magnet:${data.noorLeadMagnetItems}`);
    if (data.noorSampleCtaSource !== "arabic_sample_pack_cta") failures.push(`missing_noor_sample_cta_source:${data.noorSampleCtaSource || "none"}`);
    if (data.noorSampleCtaGroup !== "noor") failures.push(`bad_noor_sample_cta_group:${data.noorSampleCtaGroup || "none"}`);
    if (!/(sample pack|樣張|نموذج)/i.test(data.noorLeadMagnetText)) failures.push("noor_lead_magnet_missing_sample_copy");
    if (!/(ready|準備好|جاهزة)/i.test(data.noorLeadMagnetText)) failures.push("noor_lead_magnet_missing_delivery_copy");
  }
  if (path.includes("koko")) {
    if (!data.kokoLeadMagnet) failures.push("missing_koko_lead_magnet");
    if (data.kokoLeadMagnetVariant !== "weekly-sample-v1") failures.push(`bad_koko_lead_magnet_variant:${data.kokoLeadMagnetVariant || "none"}`);
    if (data.kokoLeadMagnetItems < 6) failures.push(`short_koko_lead_magnet:${data.kokoLeadMagnetItems}`);
    if (data.kokoSampleCtaSource !== "koko_sample_pack_cta") failures.push(`missing_koko_sample_cta_source:${data.kokoSampleCtaSource || "none"}`);
    if (data.kokoSampleCtaGroup !== "koko") failures.push(`bad_koko_sample_cta_group:${data.kokoSampleCtaGroup || "none"}`);
    if (!/(sample|樣張|نموذج)/i.test(data.kokoLeadMagnetText)) failures.push("koko_lead_magnet_missing_sample_copy");
    if (!/(ready|準備好|جاهزة)/i.test(data.kokoLeadMagnetText)) failures.push("koko_lead_magnet_missing_delivery_copy");
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
    const homeSampleShortlinks = new Map(data.sampleLinkUrls.map((link) => [link.pack, link.href]));
    if (homeSampleShortlinks.get("koko") !== `${baseUrl}/sample/koko`) {
      failures.push(`home_bad_koko_sample_shortlink:${homeSampleShortlinks.get("koko") || "none"}`);
    }
    if (homeSampleShortlinks.get("noor") !== `${baseUrl}/sample/noor`) {
      failures.push(`home_bad_noor_sample_shortlink:${homeSampleShortlinks.get("noor") || "none"}`);
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
    if (data.sampleLinkUrl !== `${baseUrl}/sample/${expectedPack}`) {
      failures.push(`bad_sample_shortlink:${data.sampleLinkUrl || "none"}`);
    }
    const qrCard = data.campaignQrCards.find((card) => card.pack === expectedPack);
    if (!qrCard) failures.push(`missing_${expectedPack}_campaign_qr_card`);
    if (qrCard && qrCard.href !== `${baseUrl}/sample/${expectedPack}`) {
      failures.push(`bad_${expectedPack}_campaign_qr_href:${qrCard.href || "none"}`);
    }
    if (qrCard && qrCard.image !== `/images/qr/sample-${expectedPack}.svg`) {
      failures.push(`bad_${expectedPack}_campaign_qr_image:${qrCard.image || "none"}`);
    }
    if (qrCard && !qrCard.text.includes(`fursay.com/sample/${expectedPack}`)) {
      failures.push(`bad_${expectedPack}_campaign_qr_text:${qrCard.text || "none"}`);
    }
    const storyPackSchema = data.storyPackSchemas.find((schema) => (
      !schema.parseError
      && schema.target.includes(`subscribe=${expectedPack}`)
    ));
    if (!storyPackSchema) failures.push(`missing_${expectedPack}_story_pack_schema`);
    if (storyPackSchema?.itemCount !== 3) failures.push(`bad_${expectedPack}_story_pack_schema_items:${storyPackSchema?.itemCount || 0}`);
    const expectedCampaign = expectedPack === "koko" ? "koko_story_funnel" : "noor_story_funnel";
    if (!storyPackSchema?.target?.includes(`utm_campaign=${expectedCampaign}`)) {
      failures.push(`bad_${expectedPack}_story_pack_schema_campaign:${storyPackSchema?.target || "none"}`);
    }
    const expectedContent = expectedPack === "koko" ? "koko_sample_pack_schema" : "noor_sample_pack_schema";
    if (!storyPackSchema?.target?.includes(`utm_content=${expectedContent}`)) {
      failures.push(`bad_${expectedPack}_story_pack_schema_content:${storyPackSchema?.target || "none"}`);
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
    if (!location.includes(`utm_source=${route.source || "shortlink"}`) || !location.includes(`utm_medium=${route.medium || "direct"}`)) {
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

async function readAssetText(baseUrl, assetUrl) {
  const url = new URL(assetUrl);
  if (baseUrl) {
    const response = await fetch(new URL(url.pathname, baseUrl));
    if (!response.ok) throw new Error(`${url.pathname} status ${response.status}`);
    return response.text();
  }
  return readFile(resolve(SITE_DIR, `.${url.pathname}`), "utf8");
}

async function checkDiscoveryFiles(baseUrl) {
  const failures = [];
  const sitemap = await readDiscoveryFile(baseUrl, "sitemap.xml");
  const llms = await readDiscoveryFile(baseUrl, "llms.txt");
  const siteHealthRaw = await readDiscoveryFile(baseUrl, "site-health.json");
  const releaseRaw = await readDiscoveryFile(baseUrl, "release.json");
  const campaignsRaw = await readDiscoveryFile(baseUrl, "campaigns.json");
  const creatorKitRaw = await readDiscoveryFile(baseUrl, "creator-kit.json");
  const creatorKitPage = await readDiscoveryFile(baseUrl, "creator-kit.html");
  let siteHealth = {};
  let release = {};
  let campaigns = {};
  let creatorKit = {};
  try {
    siteHealth = JSON.parse(siteHealthRaw);
  } catch {
    failures.push("site_health_invalid_json");
  }
  try {
    release = JSON.parse(releaseRaw);
  } catch {
    failures.push("release_invalid_json");
  }
  try {
    campaigns = JSON.parse(campaignsRaw);
  } catch {
    failures.push("campaigns_invalid_json");
  }
  try {
    creatorKit = JSON.parse(creatorKitRaw);
  } catch {
    failures.push("creator_kit_invalid_json");
  }
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
  if (!llms.includes("https://fursay.com/sample/koko") || !llms.includes("https://fursay.com/sample/noor")) {
    failures.push("llms_missing_sample_routes");
  }
  if (!llms.includes("https://fursay.com/creator/koko") || !llms.includes("https://fursay.com/creator/noor")) {
    failures.push("llms_missing_creator_routes");
  }
  if (!llms.includes("https://fursay.com/creator-kit")) failures.push("llms_missing_creator_kit_page");
  if (!llms.includes("https://fursay.com/site-health.json")) failures.push("llms_missing_site_health");
  if (!llms.includes("https://fursay.com/release.json")) failures.push("llms_missing_release_manifest");
  if (!llms.includes("https://fursay.com/campaigns.json")) failures.push("llms_missing_campaign_manifest");
  if (!llms.includes("https://fursay.com/creator-kit.json")) failures.push("llms_missing_creator_kit");
  if (siteHealth.platform !== "cloudflare-workers-static-assets") failures.push(`site_health_platform:${siteHealth.platform || "none"}`);
  if (siteHealth.deployment?.workerName !== "fursay") failures.push(`site_health_worker:${siteHealth.deployment?.workerName || "none"}`);
  if (siteHealth.deployment?.assetsBinding !== "ASSETS") failures.push(`site_health_assets_binding:${siteHealth.deployment?.assetsBinding || "none"}`);
  if (siteHealth.deployment?.releaseCommand !== "node scripts/release-fursay.mjs") {
    failures.push(`site_health_release_command:${siteHealth.deployment?.releaseCommand || "none"}`);
  }
  if (siteHealth.deployment?.releaseManifest !== "https://fursay.com/release.json") {
    failures.push(`site_health_release_manifest:${siteHealth.deployment?.releaseManifest || "none"}`);
  }
  if (siteHealth.deployment?.campaignManifest !== "https://fursay.com/campaigns.json") {
    failures.push(`site_health_campaign_manifest:${siteHealth.deployment?.campaignManifest || "none"}`);
  }
  if (siteHealth.deployment?.creatorKitManifest !== "https://fursay.com/creator-kit.json") {
    failures.push(`site_health_creator_kit_manifest:${siteHealth.deployment?.creatorKitManifest || "none"}`);
  }
  if (siteHealth.deployment?.creatorKitPage !== "https://fursay.com/creator-kit") {
    failures.push(`site_health_creator_kit_page:${siteHealth.deployment?.creatorKitPage || "none"}`);
  }
  if (release.platform !== "cloudflare-workers-static-assets") failures.push(`release_platform:${release.platform || "none"}`);
  if (release.deployment?.workerName !== "fursay") failures.push(`release_worker:${release.deployment?.workerName || "none"}`);
  if (release.deployment?.releaseCommand !== "node scripts/release-fursay.mjs") {
    failures.push(`release_command:${release.deployment?.releaseCommand || "none"}`);
  }
  if (!/^[0-9a-f]{7,40}$/.test(release.source?.commit || "")) failures.push(`release_commit:${release.source?.commit || "none"}`);
  if (release.funnels?.koko?.sample !== "https://fursay.com/sample/koko") failures.push("release_bad_koko_sample");
  if (release.funnels?.noor?.sample !== "https://fursay.com/sample/noor") failures.push("release_bad_noor_sample");
  if (release.funnels?.koko?.creator !== "https://fursay.com/creator/koko") failures.push("release_bad_koko_creator");
  if (release.funnels?.noor?.creator !== "https://fursay.com/creator/noor") failures.push("release_bad_noor_creator");
  if (release.assets?.css !== "/css/picture-world-shared-20260612-traffic10.css") failures.push(`release_css:${release.assets?.css || "none"}`);
  if (release.assets?.js !== "/js/site-shared-20260612-traffic8.js") failures.push(`release_js:${release.assets?.js || "none"}`);
  if (!release.qualityGates?.includes("scripts/check-cache-headers.mjs")) failures.push("release_missing_cache_gate");
  if (release.deployment?.campaignManifest !== "https://fursay.com/campaigns.json") {
    failures.push(`release_campaign_manifest:${release.deployment?.campaignManifest || "none"}`);
  }
  if (release.deployment?.creatorKitManifest !== "https://fursay.com/creator-kit.json") {
    failures.push(`release_creator_kit_manifest:${release.deployment?.creatorKitManifest || "none"}`);
  }
  if (release.deployment?.creatorKitPage !== "https://fursay.com/creator-kit") {
    failures.push(`release_creator_kit_page:${release.deployment?.creatorKitPage || "none"}`);
  }
  if (release.liveExpectations?.cacheHeaderChecks !== 19) failures.push(`release_cache_expectation:${release.liveExpectations?.cacheHeaderChecks || "none"}`);
  if (campaigns.platform !== "cloudflare-workers-static-assets") failures.push(`campaigns_platform:${campaigns.platform || "none"}`);
  if (!/^[0-9a-f]{7,40}$/.test(campaigns.source?.commit || "")) failures.push(`campaigns_commit:${campaigns.source?.commit || "none"}`);
  if (campaigns.creatorKit !== "https://fursay.com/creator-kit.json") failures.push(`campaigns_creator_kit:${campaigns.creatorKit || "none"}`);
  if (campaigns.attributionContract?.endpoint !== "/api/subscribe") failures.push("campaigns_bad_endpoint");
  if (campaigns.attributionContract?.smokeSubmitsToMailerLite !== false) failures.push("campaigns_bad_mailerlite_smoke_contract");
  if (creatorKit.platform !== "cloudflare-workers-static-assets") failures.push(`creator_kit_platform:${creatorKit.platform || "none"}`);
  if (!/^[0-9a-f]{7,40}$/.test(creatorKit.source?.commit || "")) failures.push(`creator_kit_commit:${creatorKit.source?.commit || "none"}`);
  if (creatorKit.safety?.subscriptionEndpoint !== "/api/subscribe") failures.push("creator_kit_bad_subscription_endpoint");
  if (creatorKit.safety?.smokeSubmitsToMailerLite !== false) failures.push("creator_kit_bad_mailerlite_smoke_contract");
  if (!creatorKitPage.includes('<body class="picture-world creator-kit-page">')) failures.push("creator_kit_page_missing_body_class");
  if (!creatorKitPage.includes('data-creator-kit-pack="koko"')) failures.push("creator_kit_page_missing_koko_pack");
  if (!creatorKitPage.includes('data-creator-kit-pack="noor"')) failures.push("creator_kit_page_missing_noor_pack");
  if (!creatorKitPage.includes("https://fursay.com/creator/koko")) failures.push("creator_kit_page_missing_koko_creator");
  if (!creatorKitPage.includes("https://fursay.com/creator/noor")) failures.push("creator_kit_page_missing_noor_creator");
  if (!creatorKitPage.includes("/images/qr/sample-koko.svg") || !creatorKitPage.includes("/images/qr/sample-noor.svg")) {
    failures.push("creator_kit_page_missing_qr_assets");
  }
  if (!creatorKitPage.includes("/creator-kit.json")) failures.push("creator_kit_page_missing_json_manifest_link");
  for (const pack of ["koko", "noor"]) {
    const campaign = campaigns.campaigns?.[pack] || {};
    const creatorPack = creatorKit.packs?.[pack] || {};
    const expectedCampaign = pack === "koko" ? "koko_story_funnel" : "noor_story_funnel";
    const expectedSample = `https://fursay.com/sample/${pack}`;
    const expectedCreator = `https://fursay.com/creator/${pack}`;
    if (campaign.status !== "active") failures.push(`campaigns_${pack}_status:${campaign.status || "none"}`);
    if (campaign.campaign !== expectedCampaign) failures.push(`campaigns_${pack}_campaign:${campaign.campaign || "none"}`);
    if (campaign.shortlinks?.sample !== expectedSample) failures.push(`campaigns_${pack}_sample:${campaign.shortlinks?.sample || "none"}`);
    if (campaign.shortlinks?.creator !== expectedCreator) failures.push(`campaigns_${pack}_creator:${campaign.shortlinks?.creator || "none"}`);
    if (!campaign.landingPages?.homeSample?.includes(`subscribe=${pack}`)) failures.push(`campaigns_${pack}_home_sample_subscribe`);
    if (!campaign.landingPages?.sampleSchema?.includes("utm_source=structured_data")) failures.push(`campaigns_${pack}_schema_source`);
    if (campaign.copyKit?.primaryShortlink !== expectedSample) failures.push(`campaigns_${pack}_copy_primary_shortlink:${campaign.copyKit?.primaryShortlink || "none"}`);
    if (!campaign.copyKit?.qrLabel) failures.push(`campaigns_${pack}_copy_missing_qr_label`);
    if (!campaign.copyKit?.shortHeadline) failures.push(`campaigns_${pack}_copy_missing_short_headline`);
    if (!campaign.copyKit?.videoDescription?.includes(expectedSample)) failures.push(`campaigns_${pack}_copy_video_missing_sample`);
    if (!campaign.copyKit?.familyShareText?.includes(expectedSample)) failures.push(`campaigns_${pack}_copy_share_missing_sample`);
    const expectedQr = `https://fursay.com/images/qr/sample-${pack}.svg`;
    if (campaign.copyKit?.qrSvg !== expectedQr) failures.push(`campaigns_${pack}_qr_svg:${campaign.copyKit?.qrSvg || "none"}`);
    if (creatorPack.sampleShortlink !== expectedSample) failures.push(`creator_kit_${pack}_sample:${creatorPack.sampleShortlink || "none"}`);
    if (creatorPack.creatorShortlink !== expectedCreator) failures.push(`creator_kit_${pack}_creator:${creatorPack.creatorShortlink || "none"}`);
    if (creatorPack.qrSvg !== expectedQr) failures.push(`creator_kit_${pack}_qr_svg:${creatorPack.qrSvg || "none"}`);
    if (!creatorPack.trackedLandingUrl?.includes(`subscribe=${pack}`)) failures.push(`creator_kit_${pack}_missing_subscribe`);
    if (!creatorPack.trackedLandingUrl?.includes("utm_source=creator_kit")) failures.push(`creator_kit_${pack}_missing_source`);
    if (!creatorPack.trackedLandingUrl?.includes(`utm_campaign=${expectedCampaign}`)) failures.push(`creator_kit_${pack}_missing_campaign`);
    if (!creatorPack.youtubeDescription?.includes(expectedCreator)) failures.push(`creator_kit_${pack}_youtube_missing_creator`);
    if (!creatorPack.socialCaption?.includes(expectedCreator)) failures.push(`creator_kit_${pack}_social_missing_creator`);
    if (!creatorPack.newsletterBlurb?.includes(expectedSample)) failures.push(`creator_kit_${pack}_newsletter_missing_sample`);
    if (!creatorPack.altText?.includes(expectedSample)) failures.push(`creator_kit_${pack}_alt_missing_sample`);
    if (creatorPack.utmContract?.source !== "creator_kit") failures.push(`creator_kit_${pack}_utm_source:${creatorPack.utmContract?.source || "none"}`);
    if (campaign.copyKit?.qrSvg === expectedQr) {
      try {
        const svg = await readAssetText(baseUrl, campaign.copyKit.qrSvg);
        if (!svg.includes("<svg") || !svg.includes("<path")) failures.push(`campaigns_${pack}_qr_svg_invalid`);
        if (Buffer.byteLength(svg) < 1000) failures.push(`campaigns_${pack}_qr_svg_too_small`);
      } catch (error) {
        failures.push(`campaigns_${pack}_qr_svg_unreadable:${error instanceof Error ? error.message : String(error)}`);
      }
    }
    if (!campaign.ctaSources?.length) failures.push(`campaigns_${pack}_missing_cta_sources`);
  }
  for (const route of ["https://fursay.com/join/koko", "https://fursay.com/join/noor"]) {
    if (!siteHealth.routes?.join?.includes(route)) failures.push(`site_health_missing_join_route:${route}`);
  }
  for (const route of ["https://fursay.com/sample/koko", "https://fursay.com/sample/noor"]) {
    if (!siteHealth.routes?.sample?.includes(route)) failures.push(`site_health_missing_sample_route:${route}`);
  }
  for (const route of ["https://fursay.com/creator/koko", "https://fursay.com/creator/noor"]) {
    if (!siteHealth.routes?.creator?.includes(route)) failures.push(`site_health_missing_creator_route:${route}`);
  }
  for (const route of ["https://fursay.com/creator-kit", "https://fursay.com/creator-kit.json"]) {
    if (!siteHealth.routes?.creatorKit?.includes(route)) failures.push(`site_health_missing_creator_kit_route:${route}`);
  }
  if (siteHealth.funnels?.koko?.join !== "https://fursay.com/join/koko") failures.push("site_health_bad_koko_join");
  if (siteHealth.funnels?.noor?.join !== "https://fursay.com/join/noor") failures.push("site_health_bad_noor_join");
  if (siteHealth.funnels?.koko?.sample !== "https://fursay.com/sample/koko") failures.push("site_health_bad_koko_sample");
  if (siteHealth.funnels?.noor?.sample !== "https://fursay.com/sample/noor") failures.push("site_health_bad_noor_sample");
  if (siteHealth.funnels?.koko?.creator !== "https://fursay.com/creator/koko") failures.push("site_health_bad_koko_creator");
  if (siteHealth.funnels?.noor?.creator !== "https://fursay.com/creator/noor") failures.push("site_health_bad_noor_creator");
  if (siteHealth.funnels?.koko?.status !== "active") failures.push(`site_health_koko_status:${siteHealth.funnels?.koko?.status || "none"}`);
  if (siteHealth.funnels?.noor?.status !== "active") failures.push(`site_health_noor_status:${siteHealth.funnels?.noor?.status || "none"}`);
  if (siteHealth.funnels?.koko?.campaign !== "koko_story_funnel") failures.push(`site_health_koko_campaign:${siteHealth.funnels?.koko?.campaign || "none"}`);
  if (siteHealth.funnels?.noor?.campaign !== "noor_story_funnel") failures.push(`site_health_noor_campaign:${siteHealth.funnels?.noor?.campaign || "none"}`);
  if (!siteHealth.funnels?.koko?.deepLink?.includes("subscribe=koko")) failures.push("site_health_bad_koko_deep_link");
  if (!siteHealth.funnels?.noor?.deepLink?.includes("subscribe=noor")) failures.push("site_health_bad_noor_deep_link");
  for (const key of ["subscribe_intent", "entry_pack", "modal_preselect", "utm_campaign", "utm_content"]) {
    if (!siteHealth.funnels?.koko?.trackedIntents?.includes(key)) failures.push(`site_health_koko_missing_tracked_intent:${key}`);
    if (!siteHealth.funnels?.noor?.trackedIntents?.includes(key)) failures.push(`site_health_noor_missing_tracked_intent:${key}`);
  }
  for (const source of ["home_weekly_pack_koko", "koko_sample_pack_cta", "share_strip_koko_pack"]) {
    if (!siteHealth.funnels?.koko?.ctaSources?.includes(source)) failures.push(`site_health_koko_missing_cta_source:${source}`);
  }
  for (const source of ["home_weekly_pack_noor", "arabic_sample_pack_cta", "arabic_story_pack_section", "share_strip_noor_pack"]) {
    if (!siteHealth.funnels?.noor?.ctaSources?.includes(source)) failures.push(`site_health_noor_missing_cta_source:${source}`);
  }
  if (siteHealth.measurement?.subscriptionEndpoint !== "/api/subscribe") failures.push("site_health_bad_subscription_endpoint");
  if (siteHealth.measurement?.failClosed !== true) failures.push("site_health_fail_closed_not_true");
  if (siteHealth.measurement?.liveSmokeCallsMailerLite !== false) failures.push("site_health_live_smoke_mailerlite_not_false");
  for (const surface of ["homepage_split_cta", "homepage_sample_deep_link", "sample_shortlink", "sample_pack_schema", "copy_sample_shortlink", "campaign_copy_kit", "campaign_qr_asset", "campaign_qr_card", "creator_kit_manifest", "creator_kit_page", "creator_shortlink", "koko_sample_pack_cta", "noor_sample_pack_cta", "share_strip", "shortlink", "youtube_outbound_utm", "subscribe_deep_link"]) {
    if (!siteHealth.trafficSurfaces?.includes(surface)) failures.push(`site_health_missing_traffic_surface:${surface}`);
  }
  for (const signal of ["modal_preselect_matches_pack", "subscribe_payload_keeps_attribution", "no_console_error"]) {
    if (!siteHealth.successSignals?.includes(signal)) failures.push(`site_health_missing_success_signal:${signal}`);
  }
  if (!siteHealth.sharedAssets?.css?.includes("/css/picture-world-shared-20260612-traffic10.css")) {
    failures.push("site_health_missing_current_shared_css");
  }
  if (!siteHealth.sharedAssets?.js?.includes("/js/site-shared-20260612-traffic8.js")) {
    failures.push("site_health_missing_current_shared_js");
  }
  return {
    path: "discovery-files",
    ok: failures.length === 0,
    failures,
    data: {
      lastmodCount: lastmods.length,
      expectedLastmod,
      llmsBytes: Buffer.byteLength(llms),
      siteHealthBytes: Buffer.byteLength(siteHealthRaw),
      releaseBytes: Buffer.byteLength(releaseRaw),
      campaignsBytes: Buffer.byteLength(campaignsRaw),
      creatorKitBytes: Buffer.byteLength(creatorKitRaw),
      creatorKitPageBytes: Buffer.byteLength(creatorKitPage),
      platform: siteHealth.platform || "",
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
