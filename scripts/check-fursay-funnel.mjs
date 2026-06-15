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

function urlPath(value) {
  try {
    return new URL(value, "https://fursay.com").pathname;
  } catch {
    return "";
  }
}

function urlParam(value, key) {
  try {
    return new URL(value, "https://fursay.com").searchParams.get(key) || "";
  } catch {
    return "";
  }
}

function htmlContains(html, value) {
  if (!value) return false;
  return html.includes(value) || html.includes(String(value).replace(/&/g, "&amp;"));
}

function validateNoorSprintVariantLinks(noorSprint, failures, prefix) {
  const expected = {
    parent_group: {
      linkPath: "/share/noor",
      sourceId: "noor_first_subscriber_sprint_parent_group",
      placement: "parent_group",
    },
    direct_dm: {
      linkPath: "/share/noor",
      sourceId: "noor_first_subscriber_sprint_direct_dm",
      placement: "direct_dm",
    },
    worksheet_followup: {
      linkPath: "/product-samples/noor-worksheet",
      sourceId: "noor_first_subscriber_sprint_worksheet_followup",
      placement: "worksheet_followup",
      storyLinkPath: "/share/noor",
      storySourceId: "noor_first_subscriber_sprint_worksheet_followup_story",
      storyPlacement: "worksheet_followup_story",
    },
    pdf_sample_followup: {
      linkPath: "/downloads/noor-worksheet-sample.pdf",
      sourceId: "noor_first_subscriber_sprint_pdf_sample_followup",
      placement: "pdf_sample_followup",
      storyLinkPath: "/share/noor",
      storySourceId: "noor_first_subscriber_sprint_pdf_sample_story",
      storyPlacement: "pdf_sample_story",
    },
  };
  for (const variant of noorSprint.copyVariants || []) {
    const spec = expected[variant.id];
    if (!spec) continue;
    if (!variant.link?.includes(`${spec.linkPath}?source_id=${spec.sourceId}`)) {
      failures.push(`${prefix}_variant_bad_link:${variant.id || "none"}:${variant.link || "none"}`);
    }
    if (!variant.link?.includes("creator=fursay")) failures.push(`${prefix}_variant_missing_creator:${variant.id || "none"}`);
    if (!variant.link?.includes(`placement=${spec.placement}`)) failures.push(`${prefix}_variant_bad_placement:${variant.id || "none"}`);
    if (!variant.copy?.includes(variant.link || "missing")) failures.push(`${prefix}_variant_copy_missing_link:${variant.id || "none"}`);
    if (spec.storyLinkPath) {
      if (!variant.storyLink?.includes(`${spec.storyLinkPath}?source_id=${spec.storySourceId}`)) {
        failures.push(`${prefix}_variant_bad_story_link:${variant.id || "none"}:${variant.storyLink || "none"}`);
      }
      if (!variant.storyLink?.includes("creator=fursay")) failures.push(`${prefix}_variant_story_missing_creator:${variant.id || "none"}`);
      if (!variant.storyLink?.includes(`placement=${spec.storyPlacement}`)) failures.push(`${prefix}_variant_bad_story_placement:${variant.id || "none"}`);
      if (!variant.copy?.includes(variant.storyLink || "missing")) failures.push(`${prefix}_variant_copy_missing_story_link:${variant.id || "none"}`);
    }
  }
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function expectedSocialPreview(path) {
  const normalized = path.replace(/\/+$/, "") || "/";
  if (normalized.endsWith("/koko")) {
    return {
      image: "https://fursay.com/og-koko.png",
      altNeedle: "Koko",
    };
  }
  if (normalized === "/arabic" || normalized.endsWith("/arabic")) {
    return {
      image: "https://fursay.com/og-noor.png",
      altNeedle: "Noor",
    };
  }
  return {
    image: "https://fursay.com/og-image.png",
    altNeedle: "Fursay",
  };
}

const SHORTLINK_PASSTHROUGH_PARAMS = ["utm_term", "ref", "source_id", "creator", "placement"];

function copyShortlinkPassthroughParams(source, target) {
  for (const key of SHORTLINK_PASSTHROUGH_PARAMS) {
    const value = source.searchParams.get(key);
    if (value) target.searchParams.set(key, value);
  }
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
    path: "/share/koko",
    targetPath: "/koko",
    pack: "koko",
    source: "family_share",
    medium: "share",
    campaign: "koko_story_funnel",
    content: "share_sample_koko",
  },
  {
    path: "/share/noor",
    targetPath: "/arabic",
    pack: "noor",
    source: "family_share",
    medium: "share",
    campaign: "noor_story_funnel",
    content: "share_sample_noor",
  },
  {
    path: "/bio/koko",
    targetPath: "/koko",
    pack: "koko",
    source: "social_profile",
    medium: "bio",
    campaign: "koko_story_funnel",
    content: "bio_koko",
  },
  {
    path: "/bio/noor",
    targetPath: "/arabic",
    pack: "noor",
    source: "social_profile",
    medium: "bio",
    campaign: "noor_story_funnel",
    content: "bio_noor",
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
    path: "/creator/koko/youtube",
    targetPath: "/koko",
    pack: "koko",
    source: "youtube",
    medium: "description",
    campaign: "koko_story_funnel",
    content: "creator_kit_youtube",
  },
  {
    path: "/creator/koko/social",
    targetPath: "/koko",
    pack: "koko",
    source: "social",
    medium: "profile",
    campaign: "koko_story_funnel",
    content: "creator_kit_social",
  },
  {
    path: "/creator/koko/newsletter",
    targetPath: "/koko",
    pack: "koko",
    source: "newsletter",
    medium: "email",
    campaign: "koko_story_funnel",
    content: "creator_kit_newsletter",
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
  {
    path: "/creator/noor/youtube",
    targetPath: "/arabic",
    pack: "noor",
    source: "youtube",
    medium: "description",
    campaign: "noor_story_funnel",
    content: "creator_kit_youtube",
  },
  {
    path: "/creator/noor/social",
    targetPath: "/arabic",
    pack: "noor",
    source: "social",
    medium: "profile",
    campaign: "noor_story_funnel",
    content: "creator_kit_social",
  },
  {
    path: "/creator/noor/newsletter",
    targetPath: "/arabic",
    pack: "noor",
    source: "newsletter",
    medium: "email",
    campaign: "noor_story_funnel",
    content: "creator_kit_newsletter",
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
        copyShortlinkPassthroughParams(url, location);
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
      socialPreview: {
        ogImage: document.querySelector('meta[property="og:image"]')?.getAttribute("content") || "",
        ogImageWidth: document.querySelector('meta[property="og:image:width"]')?.getAttribute("content") || "",
        ogImageHeight: document.querySelector('meta[property="og:image:height"]')?.getAttribute("content") || "",
        ogImageAlt: document.querySelector('meta[property="og:image:alt"]')?.getAttribute("content") || "",
        twitterImage: document.querySelector('meta[name="twitter:image"]')?.getAttribute("content") || "",
        twitterImageAlt: document.querySelector('meta[name="twitter:image:alt"]')?.getAttribute("content") || "",
      },
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
      publicSharePanels: qa("[data-public-share]").map((panel) => ({
        pack: panel.getAttribute("data-public-share") || "",
        text: panel.textContent.trim().replace(/\s+/g, " "),
        links: [...panel.querySelectorAll("[data-public-share-link]")].map((anchor) => ({
          type: anchor.getAttribute("data-public-share-link") || "",
          href: anchor.href,
        })),
        copyButtons: [...panel.querySelectorAll("[data-copy-public-share-link]")].map((button) => ({
          type: button.getAttribute("data-public-share-copy") || "",
          value: button.getAttribute("data-copy-public-share-link") || "",
        })),
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
      faqPageSchemas: qa('script[type="application/ld+json"]').flatMap((script) => {
        try {
          const parsed = JSON.parse(script.textContent);
          const nodes = Array.isArray(parsed) ? parsed : (parsed["@graph"] || [parsed]);
          return nodes.filter((node) => node && node["@type"] === "FAQPage").map((node) => ({
            questionCount: Array.isArray(node.mainEntity) ? node.mainEntity.length : 0,
            hasAnswerText: Array.isArray(node.mainEntity)
              ? node.mainEntity.every((entry) => entry?.acceptedAnswer?.text)
              : false,
          }));
        } catch {
          return [{ parseError: true }];
        }
      }),
    };
  }, { homePages: HOME_PAGES, statusCode: status });

  const failures = [];
  const expectedPreview = expectedSocialPreview(path);
  if (status !== 200) failures.push(`status:${status}`);
  if (!data.canonical) failures.push("missing_canonical");
  if (data.socialPreview.ogImage !== expectedPreview.image) failures.push(`bad_og_image:${data.socialPreview.ogImage || "none"}`);
  if (data.socialPreview.ogImageWidth !== "1200") failures.push(`bad_og_image_width:${data.socialPreview.ogImageWidth || "none"}`);
  if (data.socialPreview.ogImageHeight !== "630") failures.push(`bad_og_image_height:${data.socialPreview.ogImageHeight || "none"}`);
  if (!data.socialPreview.ogImageAlt.includes(expectedPreview.altNeedle)) failures.push(`bad_og_image_alt:${data.socialPreview.ogImageAlt || "none"}`);
  if (data.socialPreview.twitterImage !== expectedPreview.image) failures.push(`bad_twitter_image:${data.socialPreview.twitterImage || "none"}`);
  if (!data.socialPreview.twitterImageAlt.includes(expectedPreview.altNeedle)) failures.push(`bad_twitter_image_alt:${data.socialPreview.twitterImageAlt || "none"}`);
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
    if (urlPath(homeSampleShortlinks.get("koko")) !== "/share/koko") {
      failures.push(`home_bad_koko_sample_shortlink:${homeSampleShortlinks.get("koko") || "none"}`);
    }
    if (urlPath(homeSampleShortlinks.get("noor")) !== "/share/noor") {
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
    if (urlPath(data.sampleLinkUrl) !== `/share/${expectedPack}`) {
      failures.push(`bad_sample_shortlink:${data.sampleLinkUrl || "none"}`);
    }
    const qrCard = data.campaignQrCards.find((card) => card.pack === expectedPack);
    if (!qrCard) failures.push(`missing_${expectedPack}_campaign_qr_card`);
    if (urlPath(qrCard?.href || "") !== `/share/${expectedPack}`) {
      failures.push(`bad_${expectedPack}_campaign_qr_href:${qrCard.href || "none"}`);
    }
    if (qrCard && qrCard.image !== `/images/qr/share-${expectedPack}.svg`) {
      failures.push(`bad_${expectedPack}_campaign_qr_image:${qrCard.image || "none"}`);
    }
    if (qrCard && !qrCard.text.includes(`fursay.com/share/${expectedPack}`)) {
      failures.push(`bad_${expectedPack}_campaign_qr_text:${qrCard.text || "none"}`);
    }
    const publicSharePanel = data.publicSharePanels.find((panel) => panel.pack === expectedPack);
    if (!publicSharePanel) failures.push(`missing_${expectedPack}_public_share_panel`);
    const publicShareLinks = new Map((publicSharePanel?.links || []).map((link) => [link.type, link.href]));
    const familyPublicShareLink = publicShareLinks.get("family") || "";
    if (urlPath(familyPublicShareLink) !== `/share/${expectedPack}`) {
      failures.push(`bad_${expectedPack}_public_family_link:${familyPublicShareLink || "none"}`);
    }
    if (expectedPack === "noor") {
      if (urlParam(familyPublicShareLink, "source_id") !== "noor_first_subscriber_sprint_public_share"
        || urlParam(familyPublicShareLink, "creator") !== "fursay"
        || urlParam(familyPublicShareLink, "placement") !== "public_share_panel") {
        failures.push(`bad_noor_public_family_attribution:${familyPublicShareLink || "none"}`);
      }
    }
    if (urlPath(publicShareLinks.get("creator")) !== `/creator/${expectedPack}/youtube`) {
      failures.push(`bad_${expectedPack}_public_creator_link:${publicShareLinks.get("creator") || "none"}`);
    }
    if (urlPath(publicShareLinks.get("share-kit")) !== "/share-kit") {
      failures.push(`bad_${expectedPack}_public_share_kit_link:${publicShareLinks.get("share-kit") || "none"}`);
    }
    const whatsappLink = publicShareLinks.get("whatsapp") || "";
    const decodedWhatsappLink = decodeURIComponent(whatsappLink);
    if (!whatsappLink.startsWith("https://api.whatsapp.com/send?")
      || !decodedWhatsappLink.includes(`https://fursay.com/share/${expectedPack}?`)
      || !decodedWhatsappLink.includes("ref=whatsapp")
      || !decodedWhatsappLink.includes("placement=direct_social_share")) {
      failures.push(`bad_${expectedPack}_public_whatsapp_link:${whatsappLink || "none"}`);
    }
    if (expectedPack === "noor"
      && (!decodedWhatsappLink.includes("source_id=noor_first_subscriber_sprint_public_share")
        || !decodedWhatsappLink.includes("creator=fursay"))) {
      failures.push(`bad_noor_public_whatsapp_attribution:${whatsappLink || "none"}`);
    }
    const lineLink = publicShareLinks.get("line") || "";
    const decodedLineLink = decodeURIComponent(lineLink);
    if (!lineLink.startsWith("https://social-plugins.line.me/lineit/share?")
      || !decodedLineLink.includes(`https://fursay.com/share/${expectedPack}?`)
      || !decodedLineLink.includes("ref=line")
      || !decodedLineLink.includes("placement=direct_social_share")) {
      failures.push(`bad_${expectedPack}_public_line_link:${lineLink || "none"}`);
    }
    if (expectedPack === "noor"
      && (!decodedLineLink.includes("source_id=noor_first_subscriber_sprint_public_share")
        || !decodedLineLink.includes("creator=fursay"))) {
      failures.push(`bad_noor_public_line_attribution:${lineLink || "none"}`);
    }
    const publicShareCopies = new Map((publicSharePanel?.copyButtons || []).map((button) => [button.type, button.value]));
    const familyPublicShareCopy = publicShareCopies.get("family") || "";
    if (urlPath(familyPublicShareCopy) !== `/share/${expectedPack}`) {
      failures.push(`bad_${expectedPack}_public_family_copy:${familyPublicShareCopy || "none"}`);
    }
    if (expectedPack === "noor") {
      if (urlParam(familyPublicShareCopy, "source_id") !== "noor_first_subscriber_sprint_public_share"
        || urlParam(familyPublicShareCopy, "creator") !== "fursay"
        || urlParam(familyPublicShareCopy, "placement") !== "public_share_panel") {
        failures.push(`bad_noor_public_family_copy_attribution:${familyPublicShareCopy || "none"}`);
      }
    }
    if (urlPath(publicShareCopies.get("creator")) !== `/creator/${expectedPack}/youtube`) {
      failures.push(`bad_${expectedPack}_public_creator_copy:${publicShareCopies.get("creator") || "none"}`);
    }
    if (publicSharePanel && !/(creator|創作者|المبدعين|فيديو|video)/i.test(publicSharePanel.text)) {
      failures.push(`bad_${expectedPack}_public_share_copy`);
    }
    const publicCopyState = await page.evaluate((pack) => {
      const panel = document.querySelector(`[data-public-share="${pack}"]`);
      const button = panel?.querySelector('[data-public-share-copy="family"]');
      if (!panel || !button) return { clicked: false };
      const writes = [];
      const originalClipboard = navigator.clipboard;
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async (value) => {
            writes.push(value);
          },
        },
      });
      button.click();
      return new Promise((resolve) => {
        setTimeout(() => {
          const status = panel.querySelector("[data-public-share-status]")?.textContent.trim() || "";
          Object.defineProperty(navigator, "clipboard", { configurable: true, value: originalClipboard });
          resolve({ clicked: true, writes, status });
        }, 50);
      });
    }, expectedPack);
    if (!publicCopyState.clicked) failures.push(`bad_${expectedPack}_public_copy_not_clickable`);
    if (urlPath(publicCopyState.writes?.[0] || "") !== `/share/${expectedPack}`) {
      failures.push(`bad_${expectedPack}_public_copy_write:${publicCopyState.writes?.[0] || "none"}`);
    }
    if (!publicCopyState.status) failures.push(`bad_${expectedPack}_public_copy_status`);
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
    const faqPageSchema = data.faqPageSchemas.find((schema) => !schema.parseError);
    if (!faqPageSchema) failures.push(`missing_${expectedPack}_faq_schema`);
    if (faqPageSchema?.questionCount < 3) failures.push(`short_${expectedPack}_faq_schema:${faqPageSchema?.questionCount || 0}`);
    if (faqPageSchema && !faqPageSchema.hasAnswerText) failures.push(`bad_${expectedPack}_faq_schema_answers`);
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

async function checkSocialLinksLanding(browser, baseUrl) {
  const failures = [];
  const checks = [];
  for (const pack of ["koko", "noor"]) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const apiCalls = [];
    page.on("request", (request) => {
      if (new URL(request.url()).pathname === "/api/subscribe") apiCalls.push(request.url());
    });
    try {
      const response = await page.goto(`${baseUrl}/links`, { waitUntil: "domcontentloaded", timeout: 20000 });
      const staticData = await page.evaluate(() => ({
        title: document.title,
        bodyClass: document.body.className,
        h1: document.querySelector("h1")?.textContent.trim() || "",
        canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href") || "",
        manifestHref: document.querySelector('a[href="/links.json"]')?.getAttribute("href") || "",
        cards: [...document.querySelectorAll("[data-social-links-pack]")].map((card) => card.getAttribute("data-social-links-pack")),
        primaryLinks: [...document.querySelectorAll("[data-social-primary-link]")].map((anchor) => ({
          pack: anchor.getAttribute("data-social-primary-link") || "",
          href: anchor.href,
          text: anchor.textContent.trim().replace(/\s+/g, " "),
        })),
      }));
      if (response?.status() !== 200) failures.push(`links_status:${response?.status() || "none"}`);
      if (staticData.bodyClass !== "picture-world creator-kit-page social-links-page") failures.push(`links_body_class:${staticData.bodyClass || "none"}`);
      if (staticData.h1 !== "Choose Your Story Pack") failures.push(`links_h1:${staticData.h1 || "none"}`);
      if (staticData.canonical !== "https://fursay.com/links") failures.push(`links_canonical:${staticData.canonical || "none"}`);
      if (staticData.manifestHref !== "/links.json") failures.push("links_missing_manifest_link");
      if (!staticData.cards.includes("koko") || !staticData.cards.includes("noor")) failures.push(`links_missing_cards:${staticData.cards.join(",") || "none"}`);
      const primary = staticData.primaryLinks.find((link) => link.pack === pack);
      if (!primary) failures.push(`links_missing_primary:${pack}`);
      if (primary && urlPath(primary.href) !== `/sample/${pack}`) failures.push(`links_bad_primary:${pack}:${primary.href}`);
      const expectedText = pack === "koko" ? "Koko" : "Noor";
      if (primary && !primary.text.includes(expectedText)) failures.push(`links_bad_primary_text:${pack}:${primary.text}`);

      await page.locator(`[data-social-primary-link="${pack}"]`).click();
      await page.waitForSelector("#subscribeModal.open", { timeout: 5000 });
      const modalData = await page.evaluate(() => {
        const checked = [...document.querySelectorAll('#subscribeModal input[name="groups"]:checked, #subscribeModal input[name="channel"]:checked')]
          .map((input) => input.value === "arabic" ? "noor" : input.value);
        return {
          path: location.pathname,
          search: location.search,
          signupSource: document.querySelector("#subscribeModal")?.dataset.signupSource || "",
          checked: [...new Set(checked)],
        };
      });
      const expectedPath = pack === "koko" ? "/koko" : "/arabic";
      if (modalData.path !== expectedPath) failures.push(`links_wrong_landing:${pack}:${modalData.path}`);
      if (!modalData.search.includes(`subscribe=${pack}`)) failures.push(`links_missing_subscribe:${pack}:${modalData.search || "none"}`);
      if (!modalData.search.includes("utm_source=shortlink") || !modalData.search.includes(`utm_content=sample_${pack}`)) {
        failures.push(`links_missing_shortlink_attribution:${pack}:${modalData.search || "none"}`);
      }
      if (modalData.signupSource !== `url_subscribe_${pack}`) failures.push(`links_signup_source:${pack}:${modalData.signupSource || "none"}`);
      if (modalData.checked.length !== 1 || modalData.checked[0] !== pack) failures.push(`links_wrong_preselect:${pack}:${modalData.checked.join(",") || "none"}`);
      checks.push({ pack, staticData, modalData });
    } catch (error) {
      failures.push(`links_${pack}_exception:${error instanceof Error ? error.message : String(error)}`);
    } finally {
      if (apiCalls.length) failures.push(`links_api_called_before_submit:${pack}:${apiCalls.length}`);
      await page.close();
    }
  }
  return {
    path: "/links social profile landing",
    ok: failures.length === 0,
    failures,
    data: { checks },
  };
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
  const url = `${baseUrl}/arabic?subscribe=noor&utm_source=family_share&utm_medium=share&utm_campaign=noor_story_funnel&utm_content=noor_pack_link&utm_term=family_forward&ref=wa_parent&source_id=chat42&creator=parent_group&placement=whatsapp`;
  const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(350);
  await page.waitForSelector("#subscribeModal.open", { timeout: 5000 });
  await page.locator('#subscribeModal.open input[type="email"]:visible').fill("funnel-smoke@example.test");
  await page.evaluate(() => document.querySelector("#subscribeModal form")?.requestSubmit());
  await page.waitForFunction(() => document.querySelector("#subscribeModal .modal-note")?.textContent.includes("Subscribed"), null, { timeout: 5000 }).catch(() => {});
  const events = await page.evaluate(() => window.fursayEvents || []);
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
  if (attribution.utm_term !== "family_forward") failures.push(`wrong_payload_utm_term:${attribution.utm_term || "none"}`);
  if (attribution.ref !== "wa_parent") failures.push(`wrong_payload_ref:${attribution.ref || "none"}`);
  if (attribution.source_id !== "chat42") failures.push(`wrong_payload_source_id:${attribution.source_id || "none"}`);
  if (attribution.creator !== "parent_group") failures.push(`wrong_payload_creator:${attribution.creator || "none"}`);
  if (attribution.placement !== "whatsapp") failures.push(`wrong_payload_placement:${attribution.placement || "none"}`);
  for (const eventName of ["fursay_subscribe_modal_open", "fursay_subscribe_submit_attempt", "fursay_subscribe_submit_success"]) {
    const event = events.find((item) => item.event === eventName);
    if (!event) {
      failures.push(`missing_attribution_event:${eventName}`);
      continue;
    }
    if (event.detail?.pack !== "noor") failures.push(`wrong_event_pack:${eventName}:${event.detail?.pack || "none"}`);
    if (event.detail?.source_id !== "chat42") failures.push(`wrong_event_source_id:${eventName}:${event.detail?.source_id || "none"}`);
    if (event.detail?.creator !== "parent_group") failures.push(`wrong_event_creator:${eventName}:${event.detail?.creator || "none"}`);
    if (event.detail?.placement !== "whatsapp") failures.push(`wrong_event_placement:${eventName}:${event.detail?.placement || "none"}`);
  }

  return {
    path: "/arabic?subscribe=noor attribution payload",
    ok: failures.length === 0,
    failures,
    data: { groups, attribution, eventCount: events.length },
  };
}

async function checkJoinRedirects(baseUrl) {
  const results = [];
  for (const route of JOIN_ROUTES) {
    const requestUrl = new URL(route.path, baseUrl);
    requestUrl.searchParams.set("utm_source", "untrusted_source");
    requestUrl.searchParams.set("utm_term", "ig_bio_smoke");
    requestUrl.searchParams.set("ref", "creator_card");
    requestUrl.searchParams.set("source_id", "ep001_smoke");
    requestUrl.searchParams.set("creator", "fursay_smoke");
    requestUrl.searchParams.set("placement", "description_smoke");
    requestUrl.searchParams.set("email", "blocked@example.com");
    const response = await fetch(requestUrl, { redirect: "manual" });
    const location = response.headers.get("location") || "";
    const redirected = location ? new URL(location) : null;
    const failures = [];
    if (![301, 302, 303, 307, 308].includes(response.status)) failures.push(`status:${response.status}`);
    if (!location.includes(route.targetPath)) failures.push(`wrong_join_target:${location || "none"}`);
    if (redirected?.searchParams.get("subscribe") !== route.pack) failures.push(`missing_join_subscribe:${location || "none"}`);
    if (redirected?.searchParams.get("utm_source") !== (route.source || "shortlink") || redirected?.searchParams.get("utm_medium") !== (route.medium || "direct")) {
      failures.push(`missing_join_utm:${location || "none"}`);
    }
    if (redirected?.searchParams.get("utm_campaign") !== route.campaign || redirected?.searchParams.get("utm_content") !== route.content) {
      failures.push(`wrong_join_campaign:${location || "none"}`);
    }
    if (redirected?.searchParams.get("utm_term") !== "ig_bio_smoke") failures.push(`missing_passthrough_utm_term:${location || "none"}`);
    if (redirected?.searchParams.get("ref") !== "creator_card") failures.push(`missing_passthrough_ref:${location || "none"}`);
    if (redirected?.searchParams.get("source_id") !== "ep001_smoke") failures.push(`missing_passthrough_source_id:${location || "none"}`);
    if (redirected?.searchParams.get("creator") !== "fursay_smoke") failures.push(`missing_passthrough_creator:${location || "none"}`);
    if (redirected?.searchParams.get("placement") !== "description_smoke") failures.push(`missing_passthrough_placement:${location || "none"}`);
    if (redirected?.searchParams.get("email")) failures.push(`leaked_blocked_email:${location || "none"}`);
    if (redirected?.searchParams.get("utm_source") === "untrusted_source") failures.push(`overrode_owned_utm_source:${location || "none"}`);
    results.push({
      path: route.path,
      ok: failures.length === 0,
      failures,
      data: { status: response.status, location, requestUrl: requestUrl.toString() },
    });
  }
  return results;
}

async function checkTrafficLaunchExampleRedirects(baseUrl) {
  const raw = await readDiscoveryFile(baseUrl, "traffic-launch.json");
  const trafficLaunch = JSON.parse(raw);
  const results = [];
  for (const [pack, launchPack] of Object.entries(trafficLaunch.packs || {})) {
    const expectedTarget = pack === "koko" ? "/koko" : "/arabic";
    const expectedCampaign = pack === "koko" ? "koko_story_funnel" : "noor_story_funnel";
    for (const channel of launchPack.channels || []) {
      if (!channel.exampleUrl) {
        results.push({
          path: `traffic-launch:${pack}:${channel.channel || "unknown"}`,
          ok: false,
          failures: ["missing_example_url"],
          data: { channel },
        });
        continue;
      }
      const requestUrl = new URL(channel.exampleUrl);
      requestUrl.searchParams.set("email", "blocked@example.com");
      const response = await fetch(new URL(`${requestUrl.pathname}${requestUrl.search}`, baseUrl), { redirect: "manual" });
      const location = response.headers.get("location") || "";
      const redirected = location ? new URL(location) : null;
      const failures = [];
      if (![301, 302, 303, 307, 308].includes(response.status)) failures.push(`status:${response.status}`);
      if (!location.includes(expectedTarget)) failures.push(`wrong_target:${location || "none"}`);
      if (redirected?.searchParams.get("subscribe") !== pack) failures.push(`wrong_subscribe:${location || "none"}`);
      if (redirected?.searchParams.get("utm_campaign") !== expectedCampaign) failures.push(`wrong_campaign:${location || "none"}`);
      if (redirected?.searchParams.get("utm_content") !== channel.attribution?.utm_content) failures.push(`wrong_content:${location || "none"}`);
      if (redirected?.searchParams.get("source_id") !== `${pack}_ep001`) failures.push(`missing_source_id:${location || "none"}`);
      if (redirected?.searchParams.get("creator") !== "fursay") failures.push(`missing_creator:${location || "none"}`);
      if (redirected?.searchParams.get("placement") !== channel.channel) failures.push(`missing_placement:${location || "none"}`);
      if (redirected?.searchParams.get("email")) failures.push(`leaked_blocked_email:${location || "none"}`);
      results.push({
        path: `traffic-launch:${pack}:${channel.channel}`,
        ok: failures.length === 0,
        failures,
        data: { status: response.status, location, requestUrl: requestUrl.toString() },
      });
    }
  }
  return results;
}

async function checkTrafficLaunchSubscribePayloads(browser, baseUrl) {
  const raw = await readDiscoveryFile(baseUrl, "traffic-launch.json");
  const trafficLaunch = JSON.parse(raw);
  const checks = [];
  const failures = [];
  for (const [pack, launchPack] of Object.entries(trafficLaunch.packs || {})) {
    for (const channel of launchPack.channels || []) {
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
          body: JSON.stringify({ success: true, message: "captured by traffic launch smoke" }),
        });
      });
      const example = new URL(channel.exampleUrl || `/${pack}`, "https://fursay.com");
      const localUrl = new URL(`${example.pathname}${example.search}`, baseUrl).toString();
      try {
        const response = await page.goto(localUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
        await page.waitForSelector("#subscribeModal.open", { timeout: 5000 });
        await page.locator('#subscribeModal.open input[type="email"]:visible').fill(`traffic-${pack}-${channel.channel}@example.test`);
        await page.evaluate(() => document.querySelector("#subscribeModal form")?.requestSubmit());
        await page.waitForFunction(() => document.querySelector("#subscribeModal .modal-note")?.textContent.includes("Subscribed"), null, { timeout: 5000 }).catch(() => {});
        const attribution = capturedPayload?.attribution || {};
        const groups = capturedPayload?.groups || [];
        const checkFailures = [];
        if (response?.status() !== 200) checkFailures.push(`status:${response?.status() || "none"}`);
        if (!capturedPayload) checkFailures.push("payload_not_captured");
        if (!groups.includes(pack)) checkFailures.push(`wrong_groups:${groups.join(",") || "none"}`);
        if (groups.includes(pack === "koko" ? "noor" : "koko")) checkFailures.push(`unexpected_other_group:${groups.join(",") || "none"}`);
        if (attribution.subscribe_intent !== pack) checkFailures.push(`wrong_subscribe_intent:${attribution.subscribe_intent || "none"}`);
        if (attribution.entry_pack !== pack) checkFailures.push(`wrong_entry_pack:${attribution.entry_pack || "none"}`);
        if (attribution.modal_preselect !== pack) checkFailures.push(`wrong_modal_preselect:${attribution.modal_preselect || "none"}`);
        if (attribution.utm_source !== channel.attribution?.utm_source) checkFailures.push(`wrong_utm_source:${attribution.utm_source || "none"}`);
        if (attribution.utm_medium !== channel.attribution?.utm_medium) checkFailures.push(`wrong_utm_medium:${attribution.utm_medium || "none"}`);
        if (attribution.utm_campaign !== channel.attribution?.utm_campaign) checkFailures.push(`wrong_utm_campaign:${attribution.utm_campaign || "none"}`);
        if (attribution.utm_content !== channel.attribution?.utm_content) checkFailures.push(`wrong_utm_content:${attribution.utm_content || "none"}`);
        if (attribution.source_id !== `${pack}_ep001`) checkFailures.push(`wrong_source_id:${attribution.source_id || "none"}`);
        if (attribution.creator !== "fursay") checkFailures.push(`wrong_creator:${attribution.creator || "none"}`);
        if (attribution.placement !== channel.channel) checkFailures.push(`wrong_placement:${attribution.placement || "none"}`);
        if (checkFailures.length) failures.push(`${pack}:${channel.channel}:${checkFailures.join("|")}`);
        checks.push({
          pack,
          channel: channel.channel,
          ok: checkFailures.length === 0,
          groups,
          attribution,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failures.push(`${pack}:${channel.channel}:exception:${message}`);
        checks.push({ pack, channel: channel.channel, ok: false, error: message });
      } finally {
        await page.close();
      }
    }
  }
  return {
    path: "traffic-launch subscribe payloads",
    ok: failures.length === 0,
    failures,
    data: { checks },
  };
}

async function readDiscoveryFile(baseUrl, fileName) {
  if (baseUrl) {
    const url = new URL(fileName, `${baseUrl}/`);
    url.searchParams.set("fursay_discovery_smoke", SMOKE_ID);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${fileName} status ${response.status}`);
    return response.text();
  }
  return readFile(resolve(SITE_DIR, fileName), "utf8");
}

async function readRepoFile(fileName) {
  return readFile(resolve(ROOT, fileName), "utf8");
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
  const robots = await readDiscoveryFile(baseUrl, "robots.txt");
  const llms = await readDiscoveryFile(baseUrl, "llms.txt");
  const siteHealthRaw = await readDiscoveryFile(baseUrl, "site-health.json");
  const releaseRaw = await readDiscoveryFile(baseUrl, "release.json");
  const deployReadinessRaw = await readDiscoveryFile(baseUrl, "deploy-readiness.json");
  const deployReadinessPage = await readDiscoveryFile(baseUrl, "deploy-readiness.html");
  const campaignsRaw = await readDiscoveryFile(baseUrl, "campaigns.json");
  const creatorKitRaw = await readDiscoveryFile(baseUrl, "creator-kit.json");
  const shareKitRaw = await readDiscoveryFile(baseUrl, "share-kit.json");
  const trafficLaunchRaw = await readDiscoveryFile(baseUrl, "traffic-launch.json");
  const noorSprintStatusRaw = await readDiscoveryFile(baseUrl, "noor-sprint-status.json");
  const linksRaw = await readDiscoveryFile(baseUrl, "links.json");
  const videoDiscoveryRaw = await readDiscoveryFile(baseUrl, "video-discovery.json");
  const shortlinksRaw = await readDiscoveryFile(baseUrl, "shortlinks.json");
  const creatorKitPage = await readDiscoveryFile(baseUrl, "creator-kit.html");
  const shareKitPage = await readDiscoveryFile(baseUrl, "share-kit.html");
  const trafficLaunchPage = await readDiscoveryFile(baseUrl, "traffic-launch.html");
  const noorSprintStatusPage = await readDiscoveryFile(baseUrl, "noor-sprint-status.html");
  const linksPage = await readDiscoveryFile(baseUrl, "links.html");
  const packageRaw = baseUrl ? "" : await readRepoFile("package.json");
  const workflowRaw = baseUrl ? "" : await readRepoFile(".github/workflows/deploy-worker.yml");
  const deployReadinessScriptRaw = baseUrl ? "" : await readRepoFile("scripts/check-deploy-readiness.mjs");
  const deployRunbookRaw = baseUrl ? "" : await readRepoFile("docs/cloudflare-deploy-runbook.md");
  let siteHealth = {};
  let release = {};
  let deployReadiness = {};
  let campaigns = {};
  let creatorKit = {};
  let shareKit = {};
  let trafficLaunch = {};
  let noorSprintStatus = {};
  let links = {};
  let videoDiscovery = {};
  let shortlinks = {};
  let packageJson = {};
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
    deployReadiness = JSON.parse(deployReadinessRaw);
  } catch {
    failures.push("deploy_readiness_invalid_json");
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
  try {
    shareKit = JSON.parse(shareKitRaw);
  } catch {
    failures.push("share_kit_invalid_json");
  }
  try {
    trafficLaunch = JSON.parse(trafficLaunchRaw);
  } catch {
    failures.push("traffic_launch_invalid_json");
  }
  try {
    noorSprintStatus = JSON.parse(noorSprintStatusRaw);
  } catch {
    failures.push("noor_sprint_status_invalid_json");
  }
  try {
    links = JSON.parse(linksRaw);
  } catch {
    failures.push("links_invalid_json");
  }
  try {
    videoDiscovery = JSON.parse(videoDiscoveryRaw);
  } catch {
    failures.push("video_discovery_invalid_json");
  }
  try {
    shortlinks = JSON.parse(shortlinksRaw);
  } catch {
    failures.push("shortlinks_invalid_json");
  }
  if (!baseUrl) {
    try {
      packageJson = JSON.parse(packageRaw);
    } catch {
      failures.push("package_invalid_json");
    }
  }
  const lastmods = [...sitemap.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((match) => match[1]);
  const sitemapLocs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  const sitemapAlternateCount = (sitemap.match(/<xhtml:link /g) || []).length;
  const expectedLastmod = taipeiDateString();
  const expectedSitemapLocs = [
    "https://fursay.com/",
    "https://fursay.com/zh/",
    "https://fursay.com/ar/",
    "https://fursay.com/koko",
    "https://fursay.com/zh/koko",
    "https://fursay.com/ar/koko",
    "https://fursay.com/arabic",
    "https://fursay.com/zh/arabic",
    "https://fursay.com/ar/arabic",
    "https://fursay.com/episodes/koko-feelings",
    "https://fursay.com/zh/episodes/koko-feelings",
    "https://fursay.com/ar/episodes/koko-feelings",
    "https://fursay.com/episodes/noor-colors",
    "https://fursay.com/zh/episodes/noor-colors",
    "https://fursay.com/ar/episodes/noor-colors",
    "https://fursay.com/episodes/noor-greetings",
    "https://fursay.com/zh/episodes/noor-greetings",
    "https://fursay.com/ar/episodes/noor-greetings",
    "https://fursay.com/products",
    "https://fursay.com/zh/products",
    "https://fursay.com/ar/products",
  ];
  if (!sitemap.includes('xmlns:xhtml="http://www.w3.org/1999/xhtml"')) failures.push("sitemap_missing_xhtml_namespace");
  if (sitemapLocs.length !== expectedSitemapLocs.length) failures.push(`sitemap_loc_count:${sitemapLocs.length}`);
  for (const loc of expectedSitemapLocs) {
    if (!sitemapLocs.includes(loc)) failures.push(`sitemap_missing_loc:${loc}`);
  }
  if (sitemapAlternateCount !== 84) failures.push(`sitemap_alternate_count:${sitemapAlternateCount}`);
  for (const productLoc of ["https://fursay.com/products", "https://fursay.com/zh/products", "https://fursay.com/ar/products"]) {
    const start = sitemap.indexOf(`<loc>${productLoc}</loc>`);
    const block = start >= 0 ? sitemap.slice(start, sitemap.indexOf("</url>", start)) : "";
    for (const alternate of [
      '<xhtml:link rel="alternate" hreflang="en" href="https://fursay.com/products"/>',
      '<xhtml:link rel="alternate" hreflang="zh-TW" href="https://fursay.com/zh/products"/>',
      '<xhtml:link rel="alternate" hreflang="ar" href="https://fursay.com/ar/products"/>',
      '<xhtml:link rel="alternate" hreflang="x-default" href="https://fursay.com/products"/>',
    ]) {
      if (!block.includes(alternate)) failures.push(`sitemap_product_alternate_missing:${productLoc}:${alternate}`);
    }
  }
  if (lastmods.length !== expectedSitemapLocs.length) failures.push(`sitemap_lastmod_count:${lastmods.length}`);
  if (lastmods.some((value) => value !== expectedLastmod)) failures.push(`sitemap_lastmod_not_current:${expectedLastmod}`);
  if (!robots.includes("Sitemap: https://fursay.com/sitemap.xml")) failures.push("robots_missing_sitemap");
  if (!llms.includes("https://fursay.com/sitemap.xml") || !llms.includes("https://fursay.com/robots.txt")) {
    failures.push("llms_missing_sitemap_or_robots");
  }
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
  if (!llms.includes("https://fursay.com/share/koko") || !llms.includes("https://fursay.com/share/noor")) {
    failures.push("llms_missing_share_routes");
  }
  if (!llms.includes("https://fursay.com/bio/koko") || !llms.includes("https://fursay.com/bio/noor")) {
    failures.push("llms_missing_bio_routes");
  }
  if (!llms.includes("https://fursay.com/creator/koko") || !llms.includes("https://fursay.com/creator/noor")) {
    failures.push("llms_missing_creator_routes");
  }
  for (const route of [
    "https://fursay.com/creator/koko/youtube",
    "https://fursay.com/creator/koko/social",
    "https://fursay.com/creator/koko/newsletter",
    "https://fursay.com/creator/noor/youtube",
    "https://fursay.com/creator/noor/social",
    "https://fursay.com/creator/noor/newsletter",
  ]) {
    if (!llms.includes(route)) failures.push(`llms_missing_creator_placement:${route}`);
  }
  if (!llms.includes("https://fursay.com/creator-kit")) failures.push("llms_missing_creator_kit_page");
  if (!llms.includes("https://fursay.com/share-kit")) failures.push("llms_missing_share_kit_page");
  if (!llms.includes("https://fursay.com/traffic-launch")) failures.push("llms_missing_traffic_launch_page");
  if (!llms.includes("https://fursay.com/links")) failures.push("llms_missing_links_page");
  if (!llms.includes("https://fursay.com/video-discovery.json")) failures.push("llms_missing_video_discovery");
  if (!llms.includes("npm run deploy:ready")) failures.push("llms_missing_deploy_readiness");
  if (!llms.includes("https://fursay.com/site-health.json")) failures.push("llms_missing_site_health");
  if (!llms.includes("https://fursay.com/release.json")) failures.push("llms_missing_release_manifest");
  if (!llms.includes("https://fursay.com/deploy-readiness")) failures.push("llms_missing_deploy_readiness_page");
  if (!llms.includes("https://fursay.com/deploy-readiness.json")) failures.push("llms_missing_deploy_readiness_manifest");
  if (!llms.includes("https://fursay.com/campaigns.json")) failures.push("llms_missing_campaign_manifest");
  if (!llms.includes("https://fursay.com/creator-kit.json")) failures.push("llms_missing_creator_kit");
  if (!llms.includes("https://fursay.com/share-kit.json")) failures.push("llms_missing_share_kit");
  if (!llms.includes("https://fursay.com/traffic-launch.json")) failures.push("llms_missing_traffic_launch");
  if (!llms.includes("https://fursay.com/links.json")) failures.push("llms_missing_links_manifest");
  if (!llms.includes("https://fursay.com/shortlinks.json")) failures.push("llms_missing_shortlinks");
  if (siteHealth.platform !== "cloudflare-workers-static-assets") failures.push(`site_health_platform:${siteHealth.platform || "none"}`);
  if (siteHealth.deployment?.workerName !== "fursay") failures.push(`site_health_worker:${siteHealth.deployment?.workerName || "none"}`);
  if (siteHealth.deployment?.assetsBinding !== "ASSETS") failures.push(`site_health_assets_binding:${siteHealth.deployment?.assetsBinding || "none"}`);
  if (siteHealth.deployment?.releaseCommand !== "node scripts/release-fursay.mjs") {
    failures.push(`site_health_release_command:${siteHealth.deployment?.releaseCommand || "none"}`);
  }
  if (siteHealth.deployment?.releaseManifest !== "https://fursay.com/release.json") {
    failures.push(`site_health_release_manifest:${siteHealth.deployment?.releaseManifest || "none"}`);
  }
  if (siteHealth.deployment?.deployReadinessManifest !== "https://fursay.com/deploy-readiness.json") {
    failures.push(`site_health_deploy_readiness_manifest:${siteHealth.deployment?.deployReadinessManifest || "none"}`);
  }
  if (siteHealth.deployment?.deployReadinessPage !== "https://fursay.com/deploy-readiness") {
    failures.push(`site_health_deploy_readiness_page:${siteHealth.deployment?.deployReadinessPage || "none"}`);
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
  if (siteHealth.deployment?.shareKitManifest !== "https://fursay.com/share-kit.json") {
    failures.push(`site_health_share_kit_manifest:${siteHealth.deployment?.shareKitManifest || "none"}`);
  }
  if (siteHealth.deployment?.shareKitPage !== "https://fursay.com/share-kit") {
    failures.push(`site_health_share_kit_page:${siteHealth.deployment?.shareKitPage || "none"}`);
  }
  if (siteHealth.deployment?.trafficLaunchManifest !== "https://fursay.com/traffic-launch.json") {
    failures.push(`site_health_traffic_launch_manifest:${siteHealth.deployment?.trafficLaunchManifest || "none"}`);
  }
  if (siteHealth.deployment?.trafficLaunchPage !== "https://fursay.com/traffic-launch") {
    failures.push(`site_health_traffic_launch_page:${siteHealth.deployment?.trafficLaunchPage || "none"}`);
  }
  if (siteHealth.deployment?.noorSprintStatusManifest !== "https://fursay.com/noor-sprint-status.json") {
    failures.push(`site_health_noor_sprint_status_manifest:${siteHealth.deployment?.noorSprintStatusManifest || "none"}`);
  }
  if (siteHealth.deployment?.noorSprintStatusPage !== "https://fursay.com/noor-sprint-status") {
    failures.push(`site_health_noor_sprint_status_page:${siteHealth.deployment?.noorSprintStatusPage || "none"}`);
  }
  if (siteHealth.deployment?.linksManifest !== "https://fursay.com/links.json") {
    failures.push(`site_health_links_manifest:${siteHealth.deployment?.linksManifest || "none"}`);
  }
  if (siteHealth.deployment?.linksPage !== "https://fursay.com/links") {
    failures.push(`site_health_links_page:${siteHealth.deployment?.linksPage || "none"}`);
  }
  if (siteHealth.deployment?.videoDiscoveryManifest !== "https://fursay.com/video-discovery.json") {
    failures.push(`site_health_video_discovery:${siteHealth.deployment?.videoDiscoveryManifest || "none"}`);
  }
  if (siteHealth.deployment?.shortlinkManifest !== "https://fursay.com/shortlinks.json") {
    failures.push(`site_health_shortlink_manifest:${siteHealth.deployment?.shortlinkManifest || "none"}`);
  }
  if (siteHealth.deployment?.sitemap !== "https://fursay.com/sitemap.xml") {
    failures.push(`site_health_sitemap:${siteHealth.deployment?.sitemap || "none"}`);
  }
  if (siteHealth.deployment?.robots !== "https://fursay.com/robots.txt") {
    failures.push(`site_health_robots:${siteHealth.deployment?.robots || "none"}`);
  }
  if (siteHealth.deployment?.runbook !== "docs/cloudflare-deploy-runbook.md") {
    failures.push(`site_health_runbook:${siteHealth.deployment?.runbook || "none"}`);
  }
  if (siteHealth.deployment?.packageScripts?.deployReady !== "npm run deploy:ready") failures.push("site_health_bad_deploy_ready_script");
  if (siteHealth.deployment?.packageScripts?.check !== "npm run check") failures.push("site_health_bad_check_script");
  if (siteHealth.deployment?.packageScripts?.deploy !== "npm run deploy") failures.push("site_health_bad_deploy_script");
  if (siteHealth.deployment?.packageScripts?.liveSmoke !== "npm run smoke:live") failures.push("site_health_bad_live_smoke_script");
  if (siteHealth.deployment?.autoDeployWorkflow !== ".github/workflows/deploy-worker.yml") failures.push("site_health_bad_auto_deploy_workflow");
  if (release.platform !== "cloudflare-workers-static-assets") failures.push(`release_platform:${release.platform || "none"}`);
  if (release.deployment?.workerName !== "fursay") failures.push(`release_worker:${release.deployment?.workerName || "none"}`);
  if (release.deployment?.releaseCommand !== "node scripts/release-fursay.mjs") {
    failures.push(`release_command:${release.deployment?.releaseCommand || "none"}`);
  }
  if (!/^[0-9a-f]{7,40}$/.test(release.source?.commit || "")) failures.push(`release_commit:${release.source?.commit || "none"}`);
  if (release.funnels?.koko?.sample !== "https://fursay.com/sample/koko") failures.push("release_bad_koko_sample");
  if (release.funnels?.noor?.sample !== "https://fursay.com/sample/noor") failures.push("release_bad_noor_sample");
  if (release.funnels?.koko?.share !== "https://fursay.com/share/koko") failures.push("release_bad_koko_share");
  if (release.funnels?.noor?.share !== "https://fursay.com/share/noor") failures.push("release_bad_noor_share");
  if (release.funnels?.koko?.bio !== "https://fursay.com/bio/koko") failures.push("release_bad_koko_bio");
  if (release.funnels?.noor?.bio !== "https://fursay.com/bio/noor") failures.push("release_bad_noor_bio");
  if (release.funnels?.koko?.creator !== "https://fursay.com/creator/koko") failures.push("release_bad_koko_creator");
  if (release.funnels?.noor?.creator !== "https://fursay.com/creator/noor") failures.push("release_bad_noor_creator");
  if (release.assets?.css !== "/css/picture-world-shared-20260613-traffic12.css") failures.push(`release_css:${release.assets?.css || "none"}`);
  if (release.assets?.js !== "/js/site-shared-20260615-sharekit1.js") failures.push(`release_js:${release.assets?.js || "none"}`);
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
  if (release.deployment?.shareKitManifest !== "https://fursay.com/share-kit.json") {
    failures.push(`release_share_kit_manifest:${release.deployment?.shareKitManifest || "none"}`);
  }
  if (release.deployment?.shareKitPage !== "https://fursay.com/share-kit") {
    failures.push(`release_share_kit_page:${release.deployment?.shareKitPage || "none"}`);
  }
  if (release.deployment?.trafficLaunchManifest !== "https://fursay.com/traffic-launch.json") {
    failures.push(`release_traffic_launch_manifest:${release.deployment?.trafficLaunchManifest || "none"}`);
  }
  if (release.deployment?.trafficLaunchPage !== "https://fursay.com/traffic-launch") {
    failures.push(`release_traffic_launch_page:${release.deployment?.trafficLaunchPage || "none"}`);
  }
  if (release.deployment?.noorSprintStatusManifest !== "https://fursay.com/noor-sprint-status.json") {
    failures.push(`release_noor_sprint_status_manifest:${release.deployment?.noorSprintStatusManifest || "none"}`);
  }
  if (release.deployment?.noorSprintStatusPage !== "https://fursay.com/noor-sprint-status") {
    failures.push(`release_noor_sprint_status_page:${release.deployment?.noorSprintStatusPage || "none"}`);
  }
  if (release.deployment?.linksManifest !== "https://fursay.com/links.json") {
    failures.push(`release_links_manifest:${release.deployment?.linksManifest || "none"}`);
  }
  if (release.deployment?.linksPage !== "https://fursay.com/links") {
    failures.push(`release_links_page:${release.deployment?.linksPage || "none"}`);
  }
  if (release.deployment?.videoDiscoveryManifest !== "https://fursay.com/video-discovery.json") {
    failures.push(`release_video_discovery:${release.deployment?.videoDiscoveryManifest || "none"}`);
  }
  if (release.deployment?.shortlinkManifest !== "https://fursay.com/shortlinks.json") {
    failures.push(`release_shortlink_manifest:${release.deployment?.shortlinkManifest || "none"}`);
  }
  if (release.deployment?.deployReadinessManifest !== "https://fursay.com/deploy-readiness.json") {
    failures.push(`release_deploy_readiness_manifest:${release.deployment?.deployReadinessManifest || "none"}`);
  }
  if (release.deployment?.deployReadinessPage !== "https://fursay.com/deploy-readiness") {
    failures.push(`release_deploy_readiness_page:${release.deployment?.deployReadinessPage || "none"}`);
  }
  if (release.deployment?.sitemap !== "https://fursay.com/sitemap.xml") failures.push(`release_sitemap:${release.deployment?.sitemap || "none"}`);
  if (release.deployment?.robots !== "https://fursay.com/robots.txt") failures.push(`release_robots:${release.deployment?.robots || "none"}`);
  if (release.deployment?.runbook !== "docs/cloudflare-deploy-runbook.md") failures.push(`release_runbook:${release.deployment?.runbook || "none"}`);
  if (release.deployment?.packageScripts?.deployReady !== "npm run deploy:ready") failures.push("release_bad_deploy_ready_script");
  if (release.deployment?.packageScripts?.check !== "npm run check") failures.push("release_bad_check_script");
  if (release.deployment?.packageScripts?.deploy !== "npm run deploy") failures.push("release_bad_deploy_script");
  if (release.deployment?.packageScripts?.liveSmoke !== "npm run smoke:live") failures.push("release_bad_live_smoke_script");
  if (release.deployment?.autoDeployWorkflow !== ".github/workflows/deploy-worker.yml") failures.push("release_bad_auto_deploy_workflow");
  if (release.liveExpectations?.funnelChecks !== 41) failures.push(`release_funnel_expectation:${release.liveExpectations?.funnelChecks || "none"}`);
  if (release.liveExpectations?.amazonAffiliateLinks !== 37) failures.push(`release_amazon_affiliate_link_expectation:${release.liveExpectations?.amazonAffiliateLinks || "none"}`);
  if (release.liveExpectations?.amazonAffiliateTag !== "parenttechche-20") failures.push(`release_amazon_affiliate_tag:${release.liveExpectations?.amazonAffiliateTag || "none"}`);
  if (release.liveExpectations?.booksAffiliateLinks !== 18) failures.push(`release_books_affiliate_link_expectation:${release.liveExpectations?.booksAffiliateLinks || "none"}`);
  if (release.liveExpectations?.booksAffiliateId !== "arthur0858") failures.push(`release_books_affiliate_id:${release.liveExpectations?.booksAffiliateId || "none"}`);
  if (release.liveExpectations?.amazonAffiliateLinks !== 37) failures.push(`release_amazon_affiliate_links:${release.liveExpectations?.amazonAffiliateLinks || "none"}`);
  if (release.liveExpectations?.booksAffiliateLinks !== 18) failures.push(`release_books_affiliate_links:${release.liveExpectations?.booksAffiliateLinks || "none"}`);
  if (release.liveExpectations?.eventTrackingPages !== 18) failures.push(`release_event_tracking_pages:${release.liveExpectations?.eventTrackingPages || "none"}`);
  if (release.liveExpectations?.affiliateEventTrackingPages !== 18) failures.push(`release_affiliate_event_tracking_pages:${release.liveExpectations?.affiliateEventTrackingPages || "none"}`);
  if (release.liveExpectations?.eventTrackingSubmitPages !== 3) failures.push(`release_event_tracking_submit_pages:${release.liveExpectations?.eventTrackingSubmitPages || "none"}`);
  if (release.liveExpectations?.anonymousConversionEvents !== 15) failures.push(`release_anonymous_conversion_events:${release.liveExpectations?.anonymousConversionEvents || "none"}`);
  if (release.liveExpectations?.eventAnalyticsBlobFields !== 18) failures.push(`release_event_analytics_blob_fields:${release.liveExpectations?.eventAnalyticsBlobFields || "none"}`);
  if (release.liveExpectations?.eventAnalyticsDoubleFields !== 1) failures.push(`release_event_analytics_double_fields:${release.liveExpectations?.eventAnalyticsDoubleFields || "none"}`);
  if (release.liveExpectations?.eventAnalyticsReportQueries !== 12) failures.push(`release_event_analytics_report_queries:${release.liveExpectations?.eventAnalyticsReportQueries || "none"}`);
  if (release.liveExpectations?.eventAnalyticsReportWindowDays !== 7) failures.push(`release_event_analytics_report_window:${release.liveExpectations?.eventAnalyticsReportWindowDays || "none"}`);
  if (JSON.stringify(release.liveExpectations?.eventAnalyticsReportComparisonWindows || []) !== JSON.stringify([7, 30])) {
    failures.push(`release_event_analytics_report_comparison_windows:${(release.liveExpectations?.eventAnalyticsReportComparisonWindows || []).join(",") || "none"}`);
  }
  if (release.liveExpectations?.latestStoryEntries !== 12) failures.push(`release_latest_story_entries:${release.liveExpectations?.latestStoryEntries || "none"}`);
  if (release.liveExpectations?.noorLeadMagnetPages !== 3) failures.push(`release_noor_lead_magnet_pages:${release.liveExpectations?.noorLeadMagnetPages || "none"}`);
  if (release.liveExpectations?.noorSprintCopyVariants !== 4) failures.push(`release_noor_sprint_copy_variants:${release.liveExpectations?.noorSprintCopyVariants || "none"}`);
  if (release.liveExpectations?.noorSprintStatusDays !== 7) failures.push(`release_noor_sprint_status_days:${release.liveExpectations?.noorSprintStatusDays || "none"}`);
  if (release.liveExpectations?.productInterestLinks !== 18) failures.push(`release_product_interest_links:${release.liveExpectations?.productInterestLinks || "none"}`);
  if (release.liveExpectations?.productInfoLinks !== 18) failures.push(`release_product_info_links:${release.liveExpectations?.productInfoLinks || "none"}`);
  if (release.liveExpectations?.productInfoEventTrackingPages !== 18) failures.push(`release_product_info_event_tracking_pages:${release.liveExpectations?.productInfoEventTrackingPages || "none"}`);
  if (release.liveExpectations?.productLandingPages !== 3) failures.push(`release_product_landing_pages:${release.liveExpectations?.productLandingPages || "none"}`);
  if (release.liveExpectations?.ownedProductSpecs !== 2) failures.push(`release_owned_product_specs:${release.liveExpectations?.ownedProductSpecs || "none"}`);
  if (release.liveExpectations?.productValidationPlans !== 2) failures.push(`release_product_validation_plans:${release.liveExpectations?.productValidationPlans || "none"}`);
  if (release.liveExpectations?.productSamplePreviewPages !== 2) failures.push(`release_product_sample_preview_pages:${release.liveExpectations?.productSamplePreviewPages || "none"}`);
  if (release.liveExpectations?.monetizationRoadmapStages !== 4) failures.push(`release_monetization_roadmap_stages:${release.liveExpectations?.monetizationRoadmapStages || "none"}`);
  if (release.liveExpectations?.monetizationRoadmapProducts !== 2) failures.push(`release_monetization_roadmap_products:${release.liveExpectations?.monetizationRoadmapProducts || "none"}`);
  if (release.liveExpectations?.checkoutGateRequirements !== 4) failures.push(`release_checkout_gate_requirements:${release.liveExpectations?.checkoutGateRequirements || "none"}`);
  if (release.liveExpectations?.cacheHeaderChecks !== 69) failures.push(`release_cache_expectation:${release.liveExpectations?.cacheHeaderChecks || "none"}`);
  if (!release.qualityGates?.includes("scripts/check-deploy-readiness.mjs")) failures.push("release_missing_deploy_readiness_gate");
  if (!release.qualityGates?.includes("scripts/check-amazon-affiliate-links.mjs")) failures.push("release_missing_amazon_affiliate_gate");
  if (!release.qualityGates?.includes("scripts/check-conversion-health-contract.mjs")) failures.push("release_missing_conversion_health_gate");
  if (!release.qualityGates?.includes("scripts/check-event-analytics-contract.mjs")) failures.push("release_missing_event_analytics_gate");
  if (!release.qualityGates?.includes("scripts/query-event-analytics-report.mjs")) failures.push("release_missing_event_report_gate");
  if (!release.qualityGates?.includes("scripts/check-content-growth-contract.mjs")) failures.push("release_missing_content_growth_gate");
  if (!release.qualityGates?.includes("scripts/check-monetization-interest-contract.mjs")) failures.push("release_missing_monetization_interest_gate");
  if (!release.qualityGates?.includes("scripts/check-product-readiness-contract.mjs")) failures.push("release_missing_product_readiness_gate");
  if (!release.qualityGates?.includes("scripts/check-monetization-roadmap-contract.mjs")) failures.push("release_missing_monetization_roadmap_gate");
  if (!release.qualityGates?.includes("scripts/check-noor-subscriber-readiness.mjs")) failures.push("release_missing_noor_readiness_gate");
  if (!release.qualityGates?.includes("scripts/update-immutable-asset-fingerprints.mjs")) failures.push("release_missing_immutable_fingerprint_gate");
  if (!release.qualityGates?.includes("scripts/check-static-asset-structure.mjs")) failures.push("release_missing_static_asset_structure_gate");
  if (!release.qualityGates?.includes("scripts/check-image-assets.mjs")) failures.push("release_missing_image_asset_gate");
  if (deployReadiness.platform !== "cloudflare-workers-static-assets") failures.push(`deploy_readiness_platform:${deployReadiness.platform || "none"}`);
  if (deployReadiness.deployment?.workerName !== "fursay") failures.push(`deploy_readiness_worker:${deployReadiness.deployment?.workerName || "none"}`);
  if (deployReadiness.deployment?.autoDeployWorkflow !== ".github/workflows/deploy-worker.yml") failures.push("deploy_readiness_bad_workflow");
  if (deployReadiness.deployment?.runbook !== "docs/cloudflare-deploy-runbook.md") failures.push("deploy_readiness_bad_runbook");
  if (!deployReadiness.requiredSecrets?.includes("CLOUDFLARE_API_TOKEN")) failures.push("deploy_readiness_missing_token_name");
  if (!deployReadiness.requiredSecrets?.includes("CLOUDFLARE_ACCOUNT_ID")) failures.push("deploy_readiness_missing_account_name");
  if (!deployReadiness.requiredSecrets?.includes("CLOUDFLARE_ANALYTICS_TOKEN")) failures.push("deploy_readiness_missing_analytics_token_name");
  if (deployReadiness.deployment?.analyticsReport?.command !== "npm run report:events") failures.push("deploy_readiness_missing_report_command");
  if (deployReadiness.deployment?.analyticsReport?.piiAllowed !== false) failures.push("deploy_readiness_report_must_disallow_pii");
  if (deployReadiness.deployment?.analyticsEnablementHandoff?.runbook !== "docs/analytics-engine-enablement.md") failures.push("deploy_readiness_missing_analytics_runbook");
  if (!deployReadiness.deployment?.analyticsEnablementHandoff?.doNotChangeBeforeEnablement?.includes("10089")) failures.push("deploy_readiness_missing_analytics_10089_guardrail");
  for (const criterion of [
    "npm run deploy:ready -- --require-cloudflare passes",
    "npm run report:events returns status=queried",
    "event-analytics-report.json keeps piiAllowed=false",
    "event-analytics-report.json includes 12 queries",
    "decisionScoreboard.status is queried",
    "noor_growth_signals_7d and noor_growth_signals_30d are present",
  ]) {
    if (!deployReadiness.deployment?.analyticsEnablementHandoff?.successCriteria?.includes(criterion)) {
      failures.push(`deploy_readiness_missing_analytics_success_criterion:${criterion}`);
    }
  }
  if (deployReadiness.evidence?.tokenValuesPublished !== false) failures.push("deploy_readiness_must_not_publish_token_values");
  if (deployReadiness.evidence?.accountValuesPublished !== false) failures.push("deploy_readiness_must_not_publish_account_values");
  if (deployReadiness.evidence?.analyticsTokenValuesPublished !== false) failures.push("deploy_readiness_must_not_publish_analytics_token_values");
  if (deployReadiness.safety?.failClosed !== true) failures.push("deploy_readiness_fail_closed_not_true");
  if (deployReadiness.safety?.smokeSubmitsToMailerLite !== false) failures.push("deploy_readiness_bad_mailerlite_smoke_contract");
  if (deployReadiness.strictGates?.requireCloudflare !== "npm run deploy:ready -- --require-cloudflare") failures.push("deploy_readiness_missing_strict_cloudflare_gate");
  if (deployReadiness.strictGates?.requirePushDeploy !== "npm run deploy:ready -- --require-remote --require-cloudflare") failures.push("deploy_readiness_missing_push_deploy_gate");
  if (!/^[0-9a-f]{7,40}$/.test(deployReadiness.source?.commit || "")) failures.push(`deploy_readiness_commit:${deployReadiness.source?.commit || "none"}`);
  if (!deployReadinessPage.includes('<body class="picture-world creator-kit-page deploy-readiness-page">')) failures.push("deploy_readiness_page_missing_body_class");
  if (!deployReadinessPage.includes("<h1>Deploy Readiness</h1>")) failures.push("deploy_readiness_page_missing_h1");
  if (!deployReadinessPage.includes("/deploy-readiness.json")) failures.push("deploy_readiness_page_missing_json_link");
  if (!deployReadinessPage.includes("GitHub push deploy proven")) failures.push("deploy_readiness_page_missing_push_status");
  if (!deployReadinessPage.includes("Analytics report")) failures.push("deploy_readiness_page_missing_analytics_report_status");
  if (!deployReadinessPage.includes('data-deploy-readiness-section="analytics-enablement"')) failures.push("deploy_readiness_page_missing_analytics_handoff_section");
  if (!deployReadinessPage.includes("docs/analytics-engine-enablement.md")) failures.push("deploy_readiness_page_missing_analytics_runbook");
  if (!deployReadinessPage.includes("status=queried")) failures.push("deploy_readiness_page_missing_analytics_queried_gate");
  if (!deployReadinessPage.includes("piiAllowed=false")) failures.push("deploy_readiness_page_missing_analytics_pii_gate");
  if (!deployReadinessPage.includes("npm run deploy:ready -- --require-remote --require-cloudflare")) failures.push("deploy_readiness_page_missing_push_gate");
  if (
    deployReadinessPage.includes("CLOUDFLARE_API_TOKEN=")
    || deployReadinessPage.includes("CLOUDFLARE_ACCOUNT_ID=")
    || deployReadinessPage.includes("CLOUDFLARE_ANALYTICS_TOKEN=")
  ) {
    failures.push("deploy_readiness_page_leaks_secret_value_shape");
  }
  if (campaigns.platform !== "cloudflare-workers-static-assets") failures.push(`campaigns_platform:${campaigns.platform || "none"}`);
  if (!/^[0-9a-f]{7,40}$/.test(campaigns.source?.commit || "")) failures.push(`campaigns_commit:${campaigns.source?.commit || "none"}`);
  if (campaigns.creatorKit !== "https://fursay.com/creator-kit.json") failures.push(`campaigns_creator_kit:${campaigns.creatorKit || "none"}`);
  if (campaigns.videoDiscovery !== "https://fursay.com/video-discovery.json") failures.push(`campaigns_video_discovery:${campaigns.videoDiscovery || "none"}`);
  if (campaigns.attributionContract?.endpoint !== "/api/subscribe") failures.push("campaigns_bad_endpoint");
  if (campaigns.attributionContract?.smokeSubmitsToMailerLite !== false) failures.push("campaigns_bad_mailerlite_smoke_contract");
  if (creatorKit.platform !== "cloudflare-workers-static-assets") failures.push(`creator_kit_platform:${creatorKit.platform || "none"}`);
  if (!/^[0-9a-f]{7,40}$/.test(creatorKit.source?.commit || "")) failures.push(`creator_kit_commit:${creatorKit.source?.commit || "none"}`);
  if (creatorKit.safety?.subscriptionEndpoint !== "/api/subscribe") failures.push("creator_kit_bad_subscription_endpoint");
  if (creatorKit.safety?.smokeSubmitsToMailerLite !== false) failures.push("creator_kit_bad_mailerlite_smoke_contract");
  if (shareKit.platform !== "cloudflare-workers-static-assets") failures.push(`share_kit_platform:${shareKit.platform || "none"}`);
  if (!/^[0-9a-f]{7,40}$/.test(shareKit.source?.commit || "")) failures.push(`share_kit_commit:${shareKit.source?.commit || "none"}`);
  if (shareKit.safety?.subscriptionEndpoint !== "/api/subscribe") failures.push("share_kit_bad_subscription_endpoint");
  if (shareKit.safety?.smokeSubmitsToMailerLite !== false) failures.push("share_kit_bad_mailerlite_smoke_contract");
  if (shareKit.safety?.shortlinkManifest !== "https://fursay.com/shortlinks.json") failures.push("share_kit_missing_shortlink_manifest");
  if (trafficLaunch.platform !== "cloudflare-workers-static-assets") failures.push(`traffic_launch_platform:${trafficLaunch.platform || "none"}`);
  if (!/^[0-9a-f]{7,40}$/.test(trafficLaunch.source?.commit || "")) failures.push(`traffic_launch_commit:${trafficLaunch.source?.commit || "none"}`);
  if (trafficLaunch.safety?.subscriptionEndpoint !== "/api/subscribe") failures.push("traffic_launch_bad_subscription_endpoint");
  if (trafficLaunch.safety?.smokeSubmitsToMailerLite !== false) failures.push("traffic_launch_bad_mailerlite_smoke_contract");
  if (trafficLaunch.safety?.creatorKitManifest !== "https://fursay.com/creator-kit.json") failures.push("traffic_launch_missing_creator_kit_manifest");
  if (trafficLaunch.safety?.shareKitManifest !== "https://fursay.com/share-kit.json") failures.push("traffic_launch_missing_share_kit_manifest");
  if (trafficLaunch.safety?.shortlinkManifest !== "https://fursay.com/shortlinks.json") failures.push("traffic_launch_missing_shortlink_manifest");
  const noorSprint = trafficLaunch.activationSprints?.noorFirstSubscriber || {};
  if (noorSprint.pack !== "noor") failures.push(`traffic_launch_noor_sprint_pack:${noorSprint.pack || "none"}`);
  if (noorSprint.status !== "subscriber_signal_needed") failures.push(`traffic_launch_noor_sprint_status:${noorSprint.status || "none"}`);
  if (noorSprint.windowDays !== 7) failures.push(`traffic_launch_noor_sprint_window:${noorSprint.windowDays || "none"}`);
  if (noorSprint.successMetric !== "at_least_one_noor_subscribe_submit_success") {
    failures.push(`traffic_launch_noor_sprint_success_metric:${noorSprint.successMetric || "none"}`);
  }
  if (!noorSprint.primaryLink?.includes("/share/noor?source_id=noor_first_subscriber_sprint")) {
    failures.push(`traffic_launch_noor_sprint_primary_link:${noorSprint.primaryLink || "none"}`);
  }
  if (!noorSprint.sampleLink?.includes("/sample/noor?source_id=noor_first_subscriber_sprint")) {
    failures.push(`traffic_launch_noor_sprint_sample_link:${noorSprint.sampleLink || "none"}`);
  }
  if (!noorSprint.worksheetPreview?.includes("/product-samples/noor-worksheet?source_id=noor_first_subscriber_sprint")) {
    failures.push(`traffic_launch_noor_sprint_worksheet_link:${noorSprint.worksheetPreview || "none"}`);
  }
  if (!noorSprint.copy?.includes("Free Noor 3-minute story pack") || !noorSprint.copy?.includes(noorSprint.primaryLink || "missing")) {
    failures.push("traffic_launch_noor_sprint_copy_missing_primary_link");
  }
  if (!Array.isArray(noorSprint.copyVariants) || noorSprint.copyVariants.length !== 4) {
    failures.push(`traffic_launch_noor_sprint_variant_count:${noorSprint.copyVariants?.length || 0}`);
  }
  const variantIds = new Set((noorSprint.copyVariants || []).map((variant) => variant.id));
  for (const id of ["parent_group", "direct_dm", "worksheet_followup", "pdf_sample_followup"]) {
    if (!variantIds.has(id)) failures.push(`traffic_launch_noor_sprint_missing_variant:${id}`);
  }
  for (const variant of noorSprint.copyVariants || []) {
    if (!variant.link) failures.push(`traffic_launch_noor_sprint_variant_missing_link:${variant.id || "none"}`);
    if (!variant.localizedCopy?.ar) failures.push(`traffic_launch_noor_sprint_variant_missing_arabic_copy:${variant.id || "none"}`);
    if (variant.id === "parent_group" && !String(variant.localizedCopy?.ar || "").includes("قصة نور الصينية في 3 دقائق")) {
      failures.push("traffic_launch_noor_sprint_parent_group_missing_arabic_offer");
    }
  }
  validateNoorSprintVariantLinks(noorSprint, failures, "traffic_launch_noor_sprint");
  if (!Array.isArray(noorSprint.checklist) || noorSprint.checklist.length < 4) failures.push("traffic_launch_noor_sprint_short_checklist");
  if (!Array.isArray(noorSprint.dailyPlan) || noorSprint.dailyPlan.length !== 7) {
    failures.push(`traffic_launch_noor_sprint_daily_plan_count:${noorSprint.dailyPlan?.length || 0}`);
  }
  const dailyPlanDays = new Set((noorSprint.dailyPlan || []).map((day) => day.day));
  for (let day = 1; day <= 7; day += 1) {
    if (!dailyPlanDays.has(day)) failures.push(`traffic_launch_noor_sprint_missing_day:${day}`);
  }
  for (const day of noorSprint.dailyPlan || []) {
    if (!day.label) failures.push(`traffic_launch_noor_sprint_day_missing_label:${day.day || "none"}`);
    if (!day.action) failures.push(`traffic_launch_noor_sprint_day_missing_action:${day.day || "none"}`);
    if (!day.link?.startsWith("https://fursay.com/")) failures.push(`traffic_launch_noor_sprint_day_bad_link:${day.day || "none"}`);
    if (day.followupLink && !day.followupLink.startsWith("https://fursay.com/")) {
      failures.push(`traffic_launch_noor_sprint_day_bad_followup:${day.day || "none"}`);
    }
    if (!String(day.reportQuery || "").endsWith("_7d")) failures.push(`traffic_launch_noor_sprint_day_bad_report:${day.day || "none"}:${day.reportQuery || "none"}`);
    if (!day.expectedSignal) failures.push(`traffic_launch_noor_sprint_day_missing_signal:${day.day || "none"}`);
  }
  if (noorSprintStatus.platform !== "cloudflare-workers-static-assets") failures.push(`noor_sprint_status_platform:${noorSprintStatus.platform || "none"}`);
  if (noorSprintStatus.page !== "https://fursay.com/noor-sprint-status") failures.push(`noor_sprint_status_page:${noorSprintStatus.page || "none"}`);
  if (noorSprintStatus.manifest !== "https://fursay.com/noor-sprint-status.json") failures.push(`noor_sprint_status_manifest:${noorSprintStatus.manifest || "none"}`);
  if (noorSprintStatus.releaseManifest !== "https://fursay.com/release.json") failures.push(`noor_sprint_status_release_manifest:${noorSprintStatus.releaseManifest || "none"}`);
  if (noorSprintStatus.siteHealth !== "https://fursay.com/site-health.json") failures.push(`noor_sprint_status_site_health:${noorSprintStatus.siteHealth || "none"}`);
  if (noorSprintStatus.trafficLaunch !== "https://fursay.com/traffic-launch.json") failures.push("noor_sprint_status_bad_traffic_launch");
  if (noorSprintStatus.conversionHealth !== "https://fursay.com/conversion-health.json") failures.push("noor_sprint_status_bad_conversion_health");
  if (noorSprintStatus.logSource !== "content/growth/noor-sprint-log.json") failures.push(`noor_sprint_status_bad_log_source:${noorSprintStatus.logSource || "none"}`);
  if (noorSprintStatus.piiAllowed !== false) failures.push("noor_sprint_status_pii_allowed");
  if (!["ready_to_start", "in_progress", "signal_observed", "safe_wait_subscriber_empty"].includes(noorSprintStatus.status)) {
    failures.push(`noor_sprint_status_bad_status:${noorSprintStatus.status || "none"}`);
  }
  if (noorSprintStatus.privacy?.piiAllowed !== false) failures.push("noor_sprint_status_privacy_pii_allowed");
  if (noorSprintStatus.privacy?.boundaryConfirmed !== true) failures.push("noor_sprint_status_privacy_boundary_missing");
  if (!Array.isArray(noorSprintStatus.privacy?.blockedFields) || !noorSprintStatus.privacy.blockedFields.includes("email")) {
    failures.push("noor_sprint_status_missing_blocked_email");
  }
  if (noorSprintStatus.pack !== "noor") failures.push(`noor_sprint_status_pack:${noorSprintStatus.pack || "none"}`);
  if (noorSprintStatus.windowDays !== 7) failures.push(`noor_sprint_status_window:${noorSprintStatus.windowDays || "none"}`);
  if (noorSprintStatus.successMetric !== "at_least_one_noor_subscribe_submit_success") failures.push(`noor_sprint_status_success_metric:${noorSprintStatus.successMetric || "none"}`);
  if (noorSprintStatus.summary?.totalDays !== 7) failures.push(`noor_sprint_status_total_days:${noorSprintStatus.summary?.totalDays || "none"}`);
  const noorStatusCompletedDays = (noorSprintStatus.days || []).filter((day) => day.status === "completed").length;
  const noorStatusSignalObserved = (noorSprintStatus.days || []).some((day) => day.signalObserved === true);
  if (noorSprintStatus.summary?.completedDays !== noorStatusCompletedDays) failures.push(`noor_sprint_status_completed_days:${noorSprintStatus.summary?.completedDays || "none"}`);
  if (noorSprintStatus.summary?.subscriberSignalObserved !== noorStatusSignalObserved) failures.push("noor_sprint_status_signal_mismatch");
  if (noorSprintStatus.summary?.checkoutEnabled !== false || noorSprintStatus.summary?.paymentLinksAllowed !== false) failures.push("noor_sprint_status_checkout_not_locked");
  if (!Array.isArray(noorSprintStatus.days) || noorSprintStatus.days.length !== 7) failures.push(`noor_sprint_status_day_count:${noorSprintStatus.days?.length || 0}`);
  for (const day of noorSprintStatus.days || []) {
    const planDay = (noorSprint.dailyPlan || []).find((entry) => entry.day === day.day) || {};
    if (day.status !== "not_started") failures.push(`noor_sprint_status_day_status:${day.day || "none"}:${day.status || "none"}`);
    if (day.link !== planDay.link) failures.push(`noor_sprint_status_day_link:${day.day || "none"}`);
    if ((day.followupLink || "") !== (planDay.followupLink || "")) failures.push(`noor_sprint_status_day_followup:${day.day || "none"}`);
    if (day.reportQuery !== planDay.reportQuery) failures.push(`noor_sprint_status_day_report:${day.day || "none"}`);
    if (day.signalObserved !== false) failures.push(`noor_sprint_status_day_signal_should_start_false:${day.day || "none"}`);
    if (!day.nextAction) failures.push(`noor_sprint_status_day_missing_next_action:${day.day || "none"}`);
  }
  if (links.platform !== "cloudflare-workers-static-assets") failures.push(`links_platform:${links.platform || "none"}`);
  if (!/^[0-9a-f]{7,40}$/.test(links.source?.commit || "")) failures.push(`links_commit:${links.source?.commit || "none"}`);
  if (links.safety?.subscriptionEndpoint !== "/api/subscribe") failures.push("links_bad_subscription_endpoint");
  if (links.safety?.smokeSubmitsToMailerLite !== false) failures.push("links_bad_mailerlite_smoke_contract");
  if (links.safety?.primaryLinksUseTrackedShortlinks !== true) failures.push("links_missing_tracked_shortlink_contract");
  if (links.primaryRoute !== "https://fursay.com/links") failures.push(`links_primary_route:${links.primaryRoute || "none"}`);
  if (videoDiscovery.platform !== "cloudflare-workers-static-assets") failures.push(`video_discovery_platform:${videoDiscovery.platform || "none"}`);
  if (videoDiscovery.safety?.subscriptionEndpoint !== "/api/subscribe") failures.push("video_discovery_bad_subscription_endpoint");
  if (videoDiscovery.safety?.smokeSubmitsToMailerLite !== false) failures.push("video_discovery_bad_mailerlite_smoke_contract");
  if (videoDiscovery.safety?.externalVideoHost !== "youtube") failures.push(`video_discovery_host:${videoDiscovery.safety?.externalVideoHost || "none"}`);
  if (!baseUrl) {
    if (packageJson.scripts?.check !== "node scripts/release-fursay.mjs --check-only") failures.push("package_bad_check_script");
    if (packageJson.scripts?.["deploy:ready"] !== "node scripts/check-deploy-readiness.mjs") failures.push("package_bad_deploy_ready_script");
    if (packageJson.scripts?.deploy !== "node scripts/release-fursay.mjs") failures.push("package_bad_deploy_script");
    if (packageJson.scripts?.["smoke:live"] !== "node scripts/smoke-live.mjs") failures.push("package_bad_live_smoke_script");
    if (!existsSync(resolve(process.cwd(), "scripts/smoke-live.mjs"))) failures.push("missing_live_smoke_runner");
    if (!packageJson.devDependencies?.wrangler) failures.push("package_missing_wrangler");
    if (!packageJson.devDependencies?.playwright) failures.push("package_missing_playwright");
    if (!workflowRaw.includes("npm run check")) failures.push("workflow_missing_local_gate");
    if (!workflowRaw.includes("npm run deploy:ready")) failures.push("workflow_missing_deploy_readiness");
    if (!workflowRaw.includes("npm run deploy:ready -- --require-cloudflare")
      && !workflowRaw.includes("npm run deploy:ready -- --require-remote --require-cloudflare")) {
      failures.push("workflow_missing_strict_cloudflare_readiness");
    }
    if (!workflowRaw.includes("npm run deploy:ready -- --require-remote --require-cloudflare")) failures.push("workflow_missing_push_deploy_readiness");
    if (!workflowRaw.includes("npm run deploy")) failures.push("workflow_missing_deploy");
    if (!workflowRaw.includes("CLOUDFLARE_API_TOKEN")) failures.push("workflow_missing_cloudflare_token_gate");
    if (!workflowRaw.includes("CLOUDFLARE_ACCOUNT_ID")) failures.push("workflow_missing_cloudflare_account_gate");
    if (!workflowRaw.includes("npx playwright install --with-deps chromium")) failures.push("workflow_missing_browser_runtime");
    if (!workflowRaw.includes("concurrency:")) failures.push("workflow_missing_concurrency");
    if (!workflowRaw.includes("actions/upload-artifact@v4") || !workflowRaw.includes("/tmp/fursay-release-*")) failures.push("workflow_missing_release_artifact_upload");
    if (
      !deployReadinessScriptRaw.includes("requireCloudflare")
      || !deployReadinessScriptRaw.includes("missing_CLOUDFLARE_API_TOKEN")
      || !deployReadinessScriptRaw.includes("missing_CLOUDFLARE_ANALYTICS_TOKEN_or_CLOUDFLARE_API_TOKEN")
    ) {
      failures.push("deploy_readiness_missing_cloudflare_gate");
    }
    if (!deployReadinessScriptRaw.includes("actions/upload-artifact@v4") || !deployReadinessScriptRaw.includes("/tmp/fursay-release-*")) {
      failures.push("deploy_readiness_missing_artifact_gate");
    }
    if (!deployReadinessScriptRaw.includes("docs/cloudflare-deploy-runbook.md")) failures.push("deploy_readiness_missing_runbook_gate");
    if (!deployRunbookRaw.includes("Cloudflare Workers Static Assets")) failures.push("deploy_runbook_missing_platform");
    if (!deployRunbookRaw.includes("CLOUDFLARE_API_TOKEN") || !deployRunbookRaw.includes("CLOUDFLARE_ACCOUNT_ID")) {
      failures.push("deploy_runbook_missing_secrets");
    }
    if (!deployRunbookRaw.includes("fail-closed") || !deployRunbookRaw.includes("npm run smoke:live")) {
      failures.push("deploy_runbook_missing_fail_closed_or_live_smoke");
    }
    if (!deployRunbookRaw.includes("npm run deploy:ready -- --require-remote --require-cloudflare")) {
      failures.push("deploy_runbook_missing_push_deploy_gate");
    }
    for (const route of ["/deploy-readiness.json", "/deploy-readiness", "/share-kit.json", "/traffic-launch.json", "/shortlinks.json", "/share-kit", "/traffic-launch"]) {
      if (!deployRunbookRaw.includes(route)) failures.push(`deploy_runbook_missing_public_route:${route}`);
    }
    for (const route of ["/links", "/links.json"]) {
      if (!deployRunbookRaw.includes(route)) failures.push(`deploy_runbook_missing_public_route:${route}`);
    }
    if (!deployRunbookRaw.includes("never secret values")) failures.push("deploy_runbook_missing_secret_value_boundary");
    if (!deployReadinessScriptRaw.includes("git_missing_origin_remote")) failures.push("deploy_readiness_missing_remote_gate");
    const releaseScript = await readRepoFile("scripts/release-fursay.mjs");
    if (!releaseScript.includes("function writeSitemap") || !releaseScript.includes("writeSitemap(siteDir)")) {
      failures.push("release_script_missing_sitemap_writer");
    }
  }
  if (!creatorKitPage.includes('<body class="picture-world creator-kit-page">')) failures.push("creator_kit_page_missing_body_class");
  if (!creatorKitPage.includes('data-creator-kit-pack="koko"')) failures.push("creator_kit_page_missing_koko_pack");
  if (!creatorKitPage.includes('data-creator-kit-pack="noor"')) failures.push("creator_kit_page_missing_noor_pack");
  if (!creatorKitPage.includes("https://fursay.com/creator/koko")) failures.push("creator_kit_page_missing_koko_creator");
  if (!creatorKitPage.includes("https://fursay.com/creator/noor")) failures.push("creator_kit_page_missing_noor_creator");
  if ((creatorKitPage.match(/<button[^>]+data-copy-creator-kit/g) || []).length !== 50) failures.push("creator_kit_page_bad_copy_button_count");
  if (!creatorKitPage.includes("/images/qr/sample-koko.svg") || !creatorKitPage.includes("/images/qr/sample-noor.svg")
    || !creatorKitPage.includes("/images/qr/share-koko.svg") || !creatorKitPage.includes("/images/qr/share-noor.svg")) {
    failures.push("creator_kit_page_missing_qr_assets");
  }
  if (!creatorKitPage.includes("/creator-kit.json")) failures.push("creator_kit_page_missing_json_manifest_link");
  if (!shareKitPage.includes('<body class="picture-world creator-kit-page share-kit-page">')) failures.push("share_kit_page_missing_body_class");
  if (!shareKitPage.includes('data-share-kit-pack="koko"')) failures.push("share_kit_page_missing_koko_pack");
  if (!shareKitPage.includes('data-share-kit-pack="noor"')) failures.push("share_kit_page_missing_noor_pack");
  if (!shareKitPage.includes("/share-kit.json")) failures.push("share_kit_page_missing_json_manifest_link");
  if ((shareKitPage.match(/<button[^>]+data-copy-share-kit/g) || []).length !== 28) failures.push("share_kit_page_bad_copy_button_count");
  if (!trafficLaunchPage.includes('<body class="picture-world creator-kit-page traffic-launch-page">')) failures.push("traffic_launch_page_missing_body_class");
  if (!trafficLaunchPage.includes('data-traffic-launch-pack="koko"')) failures.push("traffic_launch_page_missing_koko_pack");
  if (!trafficLaunchPage.includes('data-traffic-launch-pack="noor"')) failures.push("traffic_launch_page_missing_noor_pack");
  if (!trafficLaunchPage.includes("/traffic-launch.json")) failures.push("traffic_launch_page_missing_json_manifest_link");
  if ((trafficLaunchPage.match(/data-traffic-launch-channel=/g) || []).length !== 10) failures.push("traffic_launch_page_bad_channel_count");
  if ((trafficLaunchPage.match(/<button[^>]+data-copy-traffic-launch/g) || []).length !== 20) failures.push("traffic_launch_page_bad_copy_button_count");
  if (!trafficLaunchPage.includes('data-noor-subscriber-sprint="subscriber_signal_needed"')) failures.push("traffic_launch_page_missing_noor_sprint");
  if ((trafficLaunchPage.match(/data-noor-sprint-copy-variant=/g) || []).length !== 4) failures.push("traffic_launch_page_bad_noor_sprint_variant_count");
  if (!trafficLaunchPage.includes("data-noor-sprint-daily-plan")) failures.push("traffic_launch_page_missing_noor_daily_plan");
  if ((trafficLaunchPage.match(/data-noor-sprint-day=/g) || []).length !== 7) failures.push("traffic_launch_page_bad_noor_daily_plan_count");
  if (!htmlContains(trafficLaunchPage, noorSprint.primaryLink || "missing")) failures.push("traffic_launch_page_missing_noor_sprint_primary_link");
  if (!htmlContains(trafficLaunchPage, noorSprint.copy || "missing")) failures.push("traffic_launch_page_missing_noor_sprint_copy");
  for (const day of noorSprint.dailyPlan || []) {
    if (!trafficLaunchPage.includes(`data-noor-sprint-day="${escapeHtml(day.day || "")}"`)) failures.push(`traffic_launch_page_missing_noor_day:${day.day || "none"}`);
    if (!htmlContains(trafficLaunchPage, day.action || "missing")) failures.push(`traffic_launch_page_missing_noor_day_action:${day.day || "none"}`);
    if (!htmlContains(trafficLaunchPage, day.link || "missing")) failures.push(`traffic_launch_page_missing_noor_day_link:${day.day || "none"}`);
    if (day.followupLink && !htmlContains(trafficLaunchPage, day.followupLink)) failures.push(`traffic_launch_page_missing_noor_day_followup:${day.day || "none"}`);
    if (!trafficLaunchPage.includes(`<code>${escapeHtml(day.reportQuery || "")}</code>`)) failures.push(`traffic_launch_page_missing_noor_day_report:${day.day || "none"}`);
  }
  for (const variant of noorSprint.copyVariants || []) {
    if (!trafficLaunchPage.includes(`data-noor-sprint-copy-variant="${escapeHtml(variant.id || "")}"`)) failures.push(`traffic_launch_page_missing_noor_variant:${variant.id || "none"}`);
    if (!htmlContains(trafficLaunchPage, variant.copy || "missing")) failures.push(`traffic_launch_page_missing_noor_variant_copy:${variant.id || "none"}`);
    if (variant.localizedCopy?.ar && !htmlContains(trafficLaunchPage, variant.localizedCopy.ar)) failures.push(`traffic_launch_page_missing_noor_variant_arabic_copy:${variant.id || "none"}`);
    if (!htmlContains(trafficLaunchPage, variant.link || "missing")) failures.push(`traffic_launch_page_missing_noor_variant_link:${variant.id || "none"}`);
    if (variant.storyLink && !htmlContains(trafficLaunchPage, variant.storyLink)) failures.push(`traffic_launch_page_missing_noor_variant_story_link:${variant.id || "none"}`);
  }
  if (!noorSprintStatusPage.includes('<body class="picture-world creator-kit-page noor-sprint-status-page">')) failures.push("noor_sprint_status_page_missing_body_class");
  if (!noorSprintStatusPage.includes("/noor-sprint-status.json")) failures.push("noor_sprint_status_page_missing_json_manifest_link");
  if (!noorSprintStatusPage.includes("/release.json")) failures.push("noor_sprint_status_page_missing_release_manifest_link");
  if (!noorSprintStatusPage.includes("/site-health.json")) failures.push("noor_sprint_status_page_missing_site_health_link");
  if (!noorSprintStatusPage.includes("/traffic-launch")) failures.push("noor_sprint_status_page_missing_traffic_launch_link");
  if (!noorSprintStatusPage.includes("data-noor-sprint-privacy")) failures.push("noor_sprint_status_page_missing_privacy_boundary");
  if (!noorSprintStatusPage.includes("content/growth/noor-sprint-log.json")) failures.push("noor_sprint_status_page_missing_log_source");
  if (!noorSprintStatusPage.includes("data-noor-sprint-status-summary")) failures.push("noor_sprint_status_page_missing_summary");
  if (!noorSprintStatusPage.includes("data-noor-sprint-status-log")) failures.push("noor_sprint_status_page_missing_log");
  if (!noorSprintStatusPage.includes("data-noor-sprint-arabic-handoff")) failures.push("noor_sprint_status_page_missing_arabic_handoff");
  if (!htmlContains(noorSprintStatusPage, noorSprintStatus.nextActionHandoff?.localizedCopy?.ar || "missing")) failures.push("noor_sprint_status_page_missing_arabic_parent_copy");
  if ((noorSprintStatusPage.match(/data-noor-sprint-status-day=/g) || []).length !== 7) failures.push("noor_sprint_status_page_bad_day_count");
  for (const day of noorSprintStatus.days || []) {
    if (!noorSprintStatusPage.includes(`data-noor-sprint-status-day="${escapeHtml(day.day || "")}"`)) failures.push(`noor_sprint_status_page_missing_day:${day.day || "none"}`);
    if (!htmlContains(noorSprintStatusPage, day.action || "missing")) failures.push(`noor_sprint_status_page_missing_action:${day.day || "none"}`);
    if (!htmlContains(noorSprintStatusPage, day.link || "missing")) failures.push(`noor_sprint_status_page_missing_link:${day.day || "none"}`);
    if (day.followupLink && !htmlContains(noorSprintStatusPage, day.followupLink)) failures.push(`noor_sprint_status_page_missing_followup:${day.day || "none"}`);
    if (!noorSprintStatusPage.includes(`<code>${escapeHtml(day.reportQuery || "")}</code>`)) failures.push(`noor_sprint_status_page_missing_report:${day.day || "none"}`);
  }
  if (!linksPage.includes('<body class="picture-world creator-kit-page social-links-page">')) failures.push("links_page_missing_body_class");
  if (!linksPage.includes("<h1>Choose Your Story Pack</h1>")) failures.push("links_page_missing_h1");
  if (!linksPage.includes("/links.json")) failures.push("links_page_missing_json_manifest_link");
  if (!linksPage.includes('data-social-links-pack="koko"')) failures.push("links_page_missing_koko_pack");
  if (!linksPage.includes('data-social-links-pack="noor"')) failures.push("links_page_missing_noor_pack");
  if (!linksPage.includes('data-social-primary-link="koko"') || !linksPage.includes('data-social-primary-link="noor"')) {
    failures.push("links_page_missing_primary_links");
  }
  for (const pack of ["koko", "noor"]) {
    const campaign = campaigns.campaigns?.[pack] || {};
    const creatorPack = creatorKit.packs?.[pack] || {};
    const expectedCampaign = pack === "koko" ? "koko_story_funnel" : "noor_story_funnel";
    const expectedSample = `https://fursay.com/sample/${pack}`;
    const expectedShare = `https://fursay.com/share/${pack}`;
    const expectedWhatsappShare = `${expectedShare}?ref=whatsapp&placement=direct_social_share`;
    const expectedLineShare = `${expectedShare}?ref=line&placement=direct_social_share`;
    const expectedCreator = `https://fursay.com/creator/${pack}`;
    const expectedWhatsappLabel = pack === "koko" ? "Koko weekly story pack" : "قصة نور الصينية في 3 دقائق";
    const expectedWhatsapp = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${expectedWhatsappLabel}: ${expectedWhatsappShare}`)}`;
    const expectedLine = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(expectedLineShare)}`;
    const expectedQr = `https://fursay.com/images/qr/sample-${pack}.svg`;
    const expectedShareQr = `https://fursay.com/images/qr/share-${pack}.svg`;
    const expectedChannelId = pack === "koko" ? "UC0X4CIwf6KoUMoIHwRxN3jw" : "UCOxmnonpfBvpiV8Vg5LEiYw";
    const expectedUploadsPlaylistId = pack === "koko" ? "UU0X4CIwf6KoUMoIHwRxN3jw" : "UUOxmnonpfBvpiV8Vg5LEiYw";
    const expectedPlaylistName = pack === "koko" ? "Koko's Forest Adventure uploads" : "Arabic Kids Chinese Picture Book uploads";
    const expectedYoutubePlacement = `${expectedCreator}/youtube`;
    const expectedSocialPlacement = `${expectedCreator}/social`;
    const expectedNewsletterPlacement = `${expectedCreator}/newsletter`;
    if (campaign.status !== "active") failures.push(`campaigns_${pack}_status:${campaign.status || "none"}`);
    if (campaign.campaign !== expectedCampaign) failures.push(`campaigns_${pack}_campaign:${campaign.campaign || "none"}`);
    if (campaign.shortlinks?.sample !== expectedSample) failures.push(`campaigns_${pack}_sample:${campaign.shortlinks?.sample || "none"}`);
    if (campaign.shortlinks?.share !== `https://fursay.com/share/${pack}`) failures.push(`campaigns_${pack}_share:${campaign.shortlinks?.share || "none"}`);
    if (campaign.shortlinks?.bio !== `https://fursay.com/bio/${pack}`) failures.push(`campaigns_${pack}_bio:${campaign.shortlinks?.bio || "none"}`);
    if (campaign.shortlinks?.creator !== expectedCreator) failures.push(`campaigns_${pack}_creator:${campaign.shortlinks?.creator || "none"}`);
    if (!campaign.landingPages?.homeSample?.includes(`subscribe=${pack}`)) failures.push(`campaigns_${pack}_home_sample_subscribe`);
    if (!campaign.landingPages?.sampleSchema?.includes("utm_source=structured_data")) failures.push(`campaigns_${pack}_schema_source`);
    if (campaign.copyKit?.primaryShortlink !== expectedSample) failures.push(`campaigns_${pack}_copy_primary_shortlink:${campaign.copyKit?.primaryShortlink || "none"}`);
    if (campaign.copyKit?.shareShortlink !== `https://fursay.com/share/${pack}`) failures.push(`campaigns_${pack}_copy_share_shortlink:${campaign.copyKit?.shareShortlink || "none"}`);
    if (campaign.copyKit?.whatsappShareUrl !== expectedWhatsapp) failures.push(`campaigns_${pack}_copy_whatsapp_share:${campaign.copyKit?.whatsappShareUrl || "none"}`);
    if (campaign.copyKit?.lineShareUrl !== expectedLine) failures.push(`campaigns_${pack}_copy_line_share:${campaign.copyKit?.lineShareUrl || "none"}`);
    if (!campaign.copyKit?.qrLabel) failures.push(`campaigns_${pack}_copy_missing_qr_label`);
    if (!campaign.copyKit?.shortHeadline) failures.push(`campaigns_${pack}_copy_missing_short_headline`);
    if (!campaign.copyKit?.videoDescription?.includes(expectedSample)) failures.push(`campaigns_${pack}_copy_video_missing_sample`);
    if (!campaign.copyKit?.familyShareText?.includes(expectedSample)) failures.push(`campaigns_${pack}_copy_share_missing_sample`);
    if (!campaign.copyKit?.familyShareMessage?.includes(expectedShare)) failures.push(`campaigns_${pack}_copy_family_message_missing_share`);
    if (!campaign.copyKit?.bioProfileCopy?.includes(`https://fursay.com/bio/${pack}`)) failures.push(`campaigns_${pack}_copy_bio_profile_missing_bio`);
    if (campaign.copyKit?.qrSvg !== expectedQr) failures.push(`campaigns_${pack}_qr_svg:${campaign.copyKit?.qrSvg || "none"}`);
    if (campaign.copyKit?.shareQrSvg !== expectedShareQr) failures.push(`campaigns_${pack}_share_qr_svg:${campaign.copyKit?.shareQrSvg || "none"}`);
    if (creatorPack.sampleShortlink !== expectedSample) failures.push(`creator_kit_${pack}_sample:${creatorPack.sampleShortlink || "none"}`);
    if (creatorPack.shareShortlink !== expectedShare) failures.push(`creator_kit_${pack}_share:${creatorPack.shareShortlink || "none"}`);
    const sharePack = shareKit.packs?.[pack] || {};
    const launchPack = trafficLaunch.packs?.[pack] || {};
    const expectedProductSamplePreview = `https://fursay.com/${pack === "koko" ? "product-samples/koko-printable" : "product-samples/noor-worksheet"}?source_id=${pack}_share_kit_sample_preview&creator=fursay&placement=share_kit_sample_preview`;
    const expectedProductSampleDownload = `https://fursay.com/${pack === "koko" ? "downloads/koko-printable-sample.pdf" : "downloads/noor-worksheet-sample.pdf"}?source_id=${pack}_share_kit_pdf_sample&creator=fursay&placement=share_kit_pdf_sample`;
    if (sharePack.sampleShortlink !== expectedSample) failures.push(`share_kit_${pack}_sample:${sharePack.sampleShortlink || "none"}`);
    if (sharePack.familyShareShortlink !== expectedShare) failures.push(`share_kit_${pack}_share:${sharePack.familyShareShortlink || "none"}`);
    if (sharePack.productSamplePreviewUrl !== expectedProductSamplePreview) failures.push(`share_kit_${pack}_product_sample_preview:${sharePack.productSamplePreviewUrl || "none"}`);
    if (sharePack.productSampleDownloadUrl !== expectedProductSampleDownload) failures.push(`share_kit_${pack}_product_sample_download:${sharePack.productSampleDownloadUrl || "none"}`);
    if (sharePack.bioShortlink !== `https://fursay.com/bio/${pack}`) failures.push(`share_kit_${pack}_bio:${sharePack.bioShortlink || "none"}`);
    if (sharePack.creatorShortlink !== expectedCreator) failures.push(`share_kit_${pack}_creator:${sharePack.creatorShortlink || "none"}`);
    if (sharePack.whatsappShareUrl !== expectedWhatsapp) failures.push(`share_kit_${pack}_whatsapp_share:${sharePack.whatsappShareUrl || "none"}`);
    if (sharePack.lineShareUrl !== expectedLine) failures.push(`share_kit_${pack}_line_share:${sharePack.lineShareUrl || "none"}`);
    if (sharePack.sampleQrSvg !== expectedQr) failures.push(`share_kit_${pack}_sample_qr:${sharePack.sampleQrSvg || "none"}`);
    if (sharePack.shareQrSvg !== expectedShareQr) failures.push(`share_kit_${pack}_share_qr:${sharePack.shareQrSvg || "none"}`);
    if (!sharePack.familyShareMessage?.includes(expectedShare)) failures.push(`share_kit_${pack}_family_message_missing_share`);
    if (!sharePack.bioProfileCopy?.includes(`https://fursay.com/bio/${pack}`)) failures.push(`share_kit_${pack}_bio_profile_missing_bio`);
    if (pack === "noor") {
      if (!sharePack.familyShareMessage?.includes("قصة نور الصينية في 3 دقائق")) failures.push("share_kit_noor_family_message_missing_arabic_copy");
      if (!sharePack.bioProfileCopy?.includes("عائلات") && !sharePack.bioProfileCopy?.includes("العائلات")) failures.push("share_kit_noor_bio_profile_missing_arabic_copy");
      if (!decodeURIComponent(sharePack.whatsappShareUrl || "").includes("قصة نور الصينية في 3 دقائق")) failures.push("share_kit_noor_whatsapp_missing_arabic_copy");
      if (!shareKitPage.includes('data-share-kit-copy-locale="ar"')) failures.push("share_kit_page_missing_arabic_copy_locale");
      if (!shareKitPage.includes('<pre dir="rtl" lang="ar">')) failures.push("share_kit_page_missing_arabic_rtl_pre");
    }
    if (sharePack.attribution?.utm_source !== "family_share" || sharePack.attribution?.utm_medium !== "share") failures.push(`share_kit_${pack}_bad_attribution_source`);
    if (!shareKitPage.includes(sharePack.familyShareMessage || "")) failures.push(`share_kit_page_missing_family_message:${pack}`);
    if (!shareKitPage.includes(sharePack.bioProfileCopy || "")) failures.push(`share_kit_page_missing_bio_profile:${pack}`);
    for (const value of [expectedSample, expectedShare, expectedProductSamplePreview, expectedProductSampleDownload, expectedCreator, `https://fursay.com/bio/${pack}`, expectedWhatsapp, expectedLine, expectedQr, expectedShareQr]) {
      if (!htmlContains(shareKitPage, value)) failures.push(`share_kit_page_missing_value:${pack}:${value}`);
    }
    if (launchPack.campaign !== expectedCampaign) failures.push(`traffic_launch_${pack}_campaign:${launchPack.campaign || "none"}`);
    if (launchPack.sampleShortlink !== expectedSample) failures.push(`traffic_launch_${pack}_sample:${launchPack.sampleShortlink || "none"}`);
    if (launchPack.shareShortlink !== expectedShare) failures.push(`traffic_launch_${pack}_share:${launchPack.shareShortlink || "none"}`);
    if (launchPack.creatorShortlink !== expectedCreator) failures.push(`traffic_launch_${pack}_creator:${launchPack.creatorShortlink || "none"}`);
    if (!Array.isArray(launchPack.preflightChecklist) || launchPack.preflightChecklist.length < 5) failures.push(`traffic_launch_${pack}_short_preflight`);
    if (launchPack.sourceIdExample !== `${pack}_ep001`) failures.push(`traffic_launch_${pack}_source_id_example:${launchPack.sourceIdExample || "none"}`);
    const launchChannels = new Map((launchPack.channels || []).map((channel) => [channel.channel, channel]));
    const expectedLaunchChannels = [
      ["youtube_description", expectedYoutubePlacement, expectedYoutubePlacement, "youtube", "description", "creator_kit_youtube", "youtube_description"],
      ["social_profile", expectedSocialPlacement, expectedSocialPlacement, "social", "profile", "creator_kit_social", "social_profile"],
      ["newsletter_email", expectedNewsletterPlacement, expectedNewsletterPlacement, "newsletter", "email", "creator_kit_newsletter", "newsletter_email"],
      ["family_share", expectedShare, expectedShare, "family_share", "share", `share_sample_${pack}`, "family_share"],
      ["qr_poster", expectedShareQr, expectedShare, "family_share", "share", `share_sample_${pack}`, "qr_poster"],
    ];
    for (const [channel, link, trackingLink, source, medium, content, placement] of expectedLaunchChannels) {
      const launchChannel = launchChannels.get(channel);
      if (!launchChannel) {
        failures.push(`traffic_launch_${pack}_missing_channel:${channel}`);
        continue;
      }
      if (launchChannel.link !== link) failures.push(`traffic_launch_${pack}_${channel}_link:${launchChannel.link || "none"}`);
      if (!launchChannel.copy?.includes(channel === "qr_poster" ? expectedShare : link)) {
        failures.push(`traffic_launch_${pack}_${channel}_copy_missing_link`);
      }
      if (launchChannel.linkTemplate !== `${trackingLink}?source_id={episode_or_post_id}&creator=fursay&placement=${placement}`) {
        failures.push(`traffic_launch_${pack}_${channel}_bad_link_template:${launchChannel.linkTemplate || "none"}`);
      }
      if (launchChannel.exampleUrl !== `${trackingLink}?source_id=${pack}_ep001&creator=fursay&placement=${placement}`) {
        failures.push(`traffic_launch_${pack}_${channel}_bad_example_url:${launchChannel.exampleUrl || "none"}`);
      }
      if (!launchChannel.publishCopyTemplate?.includes(launchChannel.linkTemplate || "")) {
        failures.push(`traffic_launch_${pack}_${channel}_publish_copy_missing_template`);
      }
      if (!launchChannel.checkpoint) failures.push(`traffic_launch_${pack}_${channel}_missing_checkpoint`);
      if (launchChannel.attribution?.utm_source !== source || launchChannel.attribution?.utm_medium !== medium) {
        failures.push(`traffic_launch_${pack}_${channel}_bad_source_medium`);
      }
      if (launchChannel.attribution?.utm_campaign !== expectedCampaign || launchChannel.attribution?.utm_content !== content) {
        failures.push(`traffic_launch_${pack}_${channel}_bad_campaign_content`);
      }
      if (!htmlContains(trafficLaunchPage, link)) failures.push(`traffic_launch_page_missing_link:${pack}:${channel}`);
      if (!htmlContains(trafficLaunchPage, launchChannel.linkTemplate)) failures.push(`traffic_launch_page_missing_link_template:${pack}:${channel}`);
      if (!htmlContains(trafficLaunchPage, launchChannel.exampleUrl)) failures.push(`traffic_launch_page_missing_example_url:${pack}:${channel}`);
      if (!htmlContains(trafficLaunchPage, launchChannel.publishCopyTemplate)) failures.push(`traffic_launch_page_missing_publish_copy:${pack}:${channel}`);
      if (!trafficLaunchPage.includes(`data-copy-value="${escapeHtml(launchChannel.publishCopyTemplate || "")}`)) {
        failures.push(`traffic_launch_page_bad_copy_value:${pack}:${channel}`);
      }
    }
    if (!trafficLaunchPage.includes(`data-traffic-launch-pack="${pack}"`)) failures.push(`traffic_launch_page_missing_pack:${pack}`);
    if (creatorPack.directSocialShare?.whatsapp !== expectedWhatsapp) failures.push(`creator_kit_${pack}_whatsapp_share:${creatorPack.directSocialShare?.whatsapp || "none"}`);
    if (creatorPack.directSocialShare?.line !== expectedLine) failures.push(`creator_kit_${pack}_line_share:${creatorPack.directSocialShare?.line || "none"}`);
    if (creatorPack.bioShortlink !== `https://fursay.com/bio/${pack}`) failures.push(`creator_kit_${pack}_bio:${creatorPack.bioShortlink || "none"}`);
    if (creatorPack.creatorShortlink !== expectedCreator) failures.push(`creator_kit_${pack}_creator:${creatorPack.creatorShortlink || "none"}`);
    if (creatorPack.qrSvg !== expectedQr) failures.push(`creator_kit_${pack}_qr_svg:${creatorPack.qrSvg || "none"}`);
    if (creatorPack.shareQrSvg !== expectedShareQr) failures.push(`creator_kit_${pack}_share_qr_svg:${creatorPack.shareQrSvg || "none"}`);
    if (!creatorPack.trackedLandingUrl?.includes(`subscribe=${pack}`)) failures.push(`creator_kit_${pack}_missing_subscribe`);
    if (!creatorPack.trackedLandingUrl?.includes("utm_source=creator_kit")) failures.push(`creator_kit_${pack}_missing_source`);
    if (!creatorPack.trackedLandingUrl?.includes(`utm_campaign=${expectedCampaign}`)) failures.push(`creator_kit_${pack}_missing_campaign`);
    if (creatorPack.placementLinks?.youtubeDescription?.shortlink !== expectedYoutubePlacement) {
      failures.push(`creator_kit_${pack}_youtube_placement:${creatorPack.placementLinks?.youtubeDescription?.shortlink || "none"}`);
    }
    if (creatorPack.placementLinks?.socialCaption?.shortlink !== expectedSocialPlacement) {
      failures.push(`creator_kit_${pack}_social_placement:${creatorPack.placementLinks?.socialCaption?.shortlink || "none"}`);
    }
    if (creatorPack.placementLinks?.newsletterBlurb?.shortlink !== expectedNewsletterPlacement) {
      failures.push(`creator_kit_${pack}_newsletter_placement:${creatorPack.placementLinks?.newsletterBlurb?.shortlink || "none"}`);
    }
    if (!creatorPack.youtubeDescription?.includes(expectedYoutubePlacement)) failures.push(`creator_kit_${pack}_youtube_missing_placement`);
    if (!creatorPack.socialCaption?.includes(expectedSocialPlacement)) failures.push(`creator_kit_${pack}_social_missing_placement`);
    if (!creatorPack.familyShareMessage?.includes(expectedShare)) failures.push(`creator_kit_${pack}_family_message_missing_share`);
    if (!creatorPack.bioProfileCopy?.includes(`https://fursay.com/bio/${pack}`)) failures.push(`creator_kit_${pack}_bio_profile_missing_bio`);
    if (!creatorPack.newsletterBlurb?.includes(expectedNewsletterPlacement)) failures.push(`creator_kit_${pack}_newsletter_missing_placement`);
    if (!creatorKitPage.includes(creatorPack.familyShareMessage || "")) failures.push(`creator_kit_page_missing_family_share_message:${pack}`);
    if (!creatorKitPage.includes(creatorPack.bioProfileCopy || "")) failures.push(`creator_kit_page_missing_bio_profile_copy:${pack}`);
    if (!creatorKitPage.includes(expectedWhatsapp)) failures.push(`creator_kit_page_missing_whatsapp_share:${pack}`);
    if (!creatorKitPage.includes(expectedLine)) failures.push(`creator_kit_page_missing_line_share:${pack}`);
    if (!creatorPack.altText?.includes(expectedSample)) failures.push(`creator_kit_${pack}_alt_missing_sample`);
    if (creatorPack.utmContract?.source !== "creator_kit") failures.push(`creator_kit_${pack}_utm_source:${creatorPack.utmContract?.source || "none"}`);
    const videoPack = videoDiscovery.channels?.[pack] || {};
    const expectedChannel = pack === "koko" ? "https://www.youtube.com/@KokosForest" : "https://www.youtube.com/@ArabicKidsChinese";
    const expectedStoryWorld = pack === "koko" ? "https://fursay.com/koko" : "https://fursay.com/arabic";
    if (videoPack.storyWorld !== expectedStoryWorld) failures.push(`video_discovery_${pack}_story_world:${videoPack.storyWorld || "none"}`);
    if (videoPack.channelId !== expectedChannelId) failures.push(`video_discovery_${pack}_channel_id:${videoPack.channelId || "none"}`);
    if (videoPack.uploadsPlaylistId !== expectedUploadsPlaylistId) failures.push(`video_discovery_${pack}_uploads_playlist:${videoPack.uploadsPlaylistId || "none"}`);
    if (videoPack.playlistName !== expectedPlaylistName) failures.push(`video_discovery_${pack}_playlist_name:${videoPack.playlistName || "none"}`);
    if (videoPack.youtubeChannel !== expectedChannel) failures.push(`video_discovery_${pack}_youtube:${videoPack.youtubeChannel || "none"}`);
    if (videoPack.youtubeVideos !== `${expectedChannel}/videos`) failures.push(`video_discovery_${pack}_videos:${videoPack.youtubeVideos || "none"}`);
    if (videoPack.youtubePlaylists !== `${expectedChannel}/playlists`) failures.push(`video_discovery_${pack}_playlists:${videoPack.youtubePlaylists || "none"}`);
    if (!videoPack.playlistEmbed?.startsWith("https://www.youtube-nocookie.com/embed/videoseries?list=UU")) {
      failures.push(`video_discovery_${pack}_bad_playlist_embed`);
    }
    if (creatorPack.videoDiscovery?.manifest !== "https://fursay.com/video-discovery.json") failures.push(`creator_kit_${pack}_video_manifest:${creatorPack.videoDiscovery?.manifest || "none"}`);
    if (creatorPack.videoDiscovery?.channelId !== expectedChannelId) failures.push(`creator_kit_${pack}_video_channel_id:${creatorPack.videoDiscovery?.channelId || "none"}`);
    if (creatorPack.videoDiscovery?.uploadsPlaylistId !== expectedUploadsPlaylistId) failures.push(`creator_kit_${pack}_video_uploads_playlist:${creatorPack.videoDiscovery?.uploadsPlaylistId || "none"}`);
    if (creatorPack.videoDiscovery?.youtubeChannel !== expectedChannel) failures.push(`creator_kit_${pack}_video_channel:${creatorPack.videoDiscovery?.youtubeChannel || "none"}`);
    if (creatorPack.videoDiscovery?.youtubeVideos !== `${expectedChannel}/videos`) failures.push(`creator_kit_${pack}_video_videos:${creatorPack.videoDiscovery?.youtubeVideos || "none"}`);
    if (creatorPack.videoDiscovery?.youtubePlaylists !== `${expectedChannel}/playlists`) failures.push(`creator_kit_${pack}_video_playlists:${creatorPack.videoDiscovery?.youtubePlaylists || "none"}`);
    if (creatorPack.videoDiscovery?.playlistName !== expectedPlaylistName) failures.push(`creator_kit_${pack}_video_playlist_name:${creatorPack.videoDiscovery?.playlistName || "none"}`);
    if (creatorPack.videoDiscovery?.playlistEmbed !== videoPack.playlistEmbed) failures.push(`creator_kit_${pack}_video_embed:${creatorPack.videoDiscovery?.playlistEmbed || "none"}`);
    for (const value of Object.values(creatorPack.videoDiscovery || {})) {
      if (!creatorKitPage.includes(value)) failures.push(`creator_kit_page_missing_video_discovery:${pack}:${value || "none"}`);
    }
    if (videoPack.subscribeShortlink !== expectedSample) failures.push(`video_discovery_${pack}_subscribe:${videoPack.subscribeShortlink || "none"}`);
    if (videoPack.creatorShortlink !== expectedYoutubePlacement) failures.push(`video_discovery_${pack}_creator:${videoPack.creatorShortlink || "none"}`);
    if (videoPack.qrSvg !== `https://fursay.com/images/qr/share-${pack}.svg`) failures.push(`video_discovery_${pack}_qr:${videoPack.qrSvg || "none"}`);
    if (!videoPack.structuredDataAction?.includes(`subscribe=${pack}`) || !videoPack.structuredDataAction?.includes("utm_source=structured_data")) {
      failures.push(`video_discovery_${pack}_bad_structured_action`);
    }
    if (!Array.isArray(videoPack.sameAs) || !videoPack.sameAs.includes(expectedStoryWorld) || !videoPack.sameAs.includes(expectedChannel)) {
      failures.push(`video_discovery_${pack}_bad_same_as`);
    }
    if (videoPack.subscribeAction?.type !== "SubscribeAction" || videoPack.subscribeAction?.target !== videoPack.structuredDataAction
      || videoPack.subscribeAction?.shortlink !== expectedSample || videoPack.subscribeAction?.campaign !== expectedCampaign) {
      failures.push(`video_discovery_${pack}_bad_subscribe_action`);
    }
    if (campaign.copyKit?.qrSvg === expectedQr) {
      try {
        const svg = await readAssetText(baseUrl, campaign.copyKit.qrSvg);
        if (!svg.includes("<svg") || !svg.includes("<path")) failures.push(`campaigns_${pack}_qr_svg_invalid`);
        if (Buffer.byteLength(svg) < 1000) failures.push(`campaigns_${pack}_qr_svg_too_small`);
      } catch (error) {
        failures.push(`campaigns_${pack}_qr_svg_unreadable:${error instanceof Error ? error.message : String(error)}`);
      }
    }
    if (campaign.copyKit?.shareQrSvg === expectedShareQr) {
      try {
        const svg = await readAssetText(baseUrl, campaign.copyKit.shareQrSvg);
        if (!svg.includes("<svg") || !svg.includes("<path")) failures.push(`campaigns_${pack}_share_qr_svg_invalid`);
        if (Buffer.byteLength(svg) < 1000) failures.push(`campaigns_${pack}_share_qr_svg_too_small`);
      } catch (error) {
        failures.push(`campaigns_${pack}_share_qr_svg_unreadable:${error instanceof Error ? error.message : String(error)}`);
      }
    }
    if (!campaign.ctaSources?.length) failures.push(`campaigns_${pack}_missing_cta_sources`);
    const linksPack = links.packs?.[pack] || {};
    if (linksPack.primaryAction?.url !== expectedSample) failures.push(`links_${pack}_primary_url:${linksPack.primaryAction?.url || "none"}`);
    if (linksPack.secondaryAction?.url !== expectedShare) failures.push(`links_${pack}_secondary_url:${linksPack.secondaryAction?.url || "none"}`);
    if (linksPack.primaryAction?.pack !== pack) failures.push(`links_${pack}_primary_pack:${linksPack.primaryAction?.pack || "none"}`);
    if (linksPack.primaryAction?.attribution?.utm_campaign !== expectedCampaign) failures.push(`links_${pack}_campaign:${linksPack.primaryAction?.attribution?.utm_campaign || "none"}`);
    if (linksPack.primaryAction?.attribution?.utm_content !== `sample_${pack}`) failures.push(`links_${pack}_content:${linksPack.primaryAction?.attribution?.utm_content || "none"}`);
    if (!linksPack.youtube?.includes(pack === "koko" ? "@KokosForest" : "@ArabicKidsChinese")) failures.push(`links_${pack}_youtube:${linksPack.youtube || "none"}`);
    for (const value of [expectedSample, expectedShare, linksPack.youtube]) {
      if (!htmlContains(linksPage, value)) failures.push(`links_page_missing_value:${pack}:${value || "none"}`);
    }
  }
  if (shortlinks.platform !== "cloudflare-workers-static-assets") failures.push(`shortlinks_platform:${shortlinks.platform || "none"}`);
  if (shortlinks.safety?.subscriptionEndpoint !== "/api/subscribe") failures.push("shortlinks_bad_subscription_endpoint");
  if (shortlinks.safety?.smokeSubmitsToMailerLite !== false) failures.push("shortlinks_bad_smoke_contract");
  if (shortlinks.safety?.ownedAttributionCannotBeOverridden !== true) failures.push("shortlinks_missing_owned_attribution_guard");
  for (const key of ["utm_term", "ref", "source_id", "creator", "placement"]) {
    if (!shortlinks.safety?.passthroughParams?.includes(key)) failures.push(`shortlinks_missing_passthrough:${key}`);
  }
  for (const key of ["email", "groups", "channel", "subscribe", "utm_source", "utm_medium", "utm_campaign", "utm_content"]) {
    if (!shortlinks.safety?.blockedParams?.includes(key)) failures.push(`shortlinks_missing_blocked_param:${key}`);
  }
  if (!Array.isArray(shortlinks.routes) || shortlinks.routes.length !== JOIN_ROUTES.length) {
    failures.push(`shortlinks_route_count:${shortlinks.routes?.length || 0}`);
  }
  const shortlinkByPath = new Map((shortlinks.routes || []).map((route) => [route.path, route]));
  for (const route of JOIN_ROUTES) {
    const item = shortlinkByPath.get(route.path);
    if (!item) {
      failures.push(`shortlinks_missing_route:${route.path}`);
      continue;
    }
    const expectedShortlink = `https://fursay.com${route.path}`;
    const expectedSource = route.source || "shortlink";
    const expectedMedium = route.medium || "direct";
    if (item.shortlink !== expectedShortlink) failures.push(`shortlinks_bad_shortlink:${route.path}:${item.shortlink || "none"}`);
    if (item.targetPath !== route.targetPath) failures.push(`shortlinks_bad_target_path:${route.path}:${item.targetPath || "none"}`);
    if (item.pack !== route.pack) failures.push(`shortlinks_bad_pack:${route.path}:${item.pack || "none"}`);
    if (item.status !== 302) failures.push(`shortlinks_bad_status:${route.path}:${item.status || "none"}`);
    if (item.cacheControl !== "public, max-age=300, must-revalidate") failures.push(`shortlinks_bad_cache:${route.path}:${item.cacheControl || "none"}`);
    if (item.attribution?.subscribe !== route.pack) failures.push(`shortlinks_bad_subscribe:${route.path}`);
    if (item.attribution?.utm_source !== expectedSource) failures.push(`shortlinks_bad_source:${route.path}:${item.attribution?.utm_source || "none"}`);
    if (item.attribution?.utm_medium !== expectedMedium) failures.push(`shortlinks_bad_medium:${route.path}:${item.attribution?.utm_medium || "none"}`);
    if (item.attribution?.utm_campaign !== route.campaign) failures.push(`shortlinks_bad_campaign:${route.path}:${item.attribution?.utm_campaign || "none"}`);
    if (item.attribution?.utm_content !== route.content) failures.push(`shortlinks_bad_content:${route.path}:${item.attribution?.utm_content || "none"}`);
    if (!item.target?.includes(`subscribe=${route.pack}`) || !item.target?.includes(`utm_source=${expectedSource}`)) {
      failures.push(`shortlinks_bad_target:${route.path}:${item.target || "none"}`);
    }
    if (!item.passthroughParams?.includes("utm_term") || !item.passthroughParams?.includes("ref")) {
      failures.push(`shortlinks_bad_passthrough:${route.path}`);
    }
    if (!item.blockedParams?.includes("email") || !item.blockedParams?.includes("utm_source")) {
      failures.push(`shortlinks_bad_blocked_params:${route.path}`);
    }
  }
  for (const route of ["https://fursay.com/join/koko", "https://fursay.com/join/noor"]) {
    if (!siteHealth.routes?.join?.includes(route)) failures.push(`site_health_missing_join_route:${route}`);
  }
  for (const route of ["https://fursay.com/sample/koko", "https://fursay.com/sample/noor"]) {
    if (!siteHealth.routes?.sample?.includes(route)) failures.push(`site_health_missing_sample_route:${route}`);
  }
  for (const route of ["https://fursay.com/share/koko", "https://fursay.com/share/noor"]) {
    if (!siteHealth.routes?.share?.includes(route)) failures.push(`site_health_missing_share_route:${route}`);
  }
  for (const route of ["https://fursay.com/bio/koko", "https://fursay.com/bio/noor"]) {
    if (!siteHealth.routes?.bio?.includes(route)) failures.push(`site_health_missing_bio_route:${route}`);
  }
  for (const route of ["https://fursay.com/creator/koko", "https://fursay.com/creator/noor"]) {
    if (!siteHealth.routes?.creator?.includes(route)) failures.push(`site_health_missing_creator_route:${route}`);
  }
  for (const route of [
    "https://fursay.com/creator/koko/youtube",
    "https://fursay.com/creator/koko/social",
    "https://fursay.com/creator/koko/newsletter",
    "https://fursay.com/creator/noor/youtube",
    "https://fursay.com/creator/noor/social",
    "https://fursay.com/creator/noor/newsletter",
  ]) {
    if (!siteHealth.routes?.creatorPlacement?.includes(route)) failures.push(`site_health_missing_creator_placement_route:${route}`);
  }
  for (const route of ["https://fursay.com/creator-kit", "https://fursay.com/creator-kit.json"]) {
    if (!siteHealth.routes?.creatorKit?.includes(route)) failures.push(`site_health_missing_creator_kit_route:${route}`);
  }
  for (const route of ["https://fursay.com/share-kit", "https://fursay.com/share-kit.json"]) {
    if (!siteHealth.routes?.shareKit?.includes(route)) failures.push(`site_health_missing_share_kit_route:${route}`);
  }
  for (const route of ["https://fursay.com/traffic-launch", "https://fursay.com/traffic-launch.json"]) {
    if (!siteHealth.routes?.trafficLaunch?.includes(route)) failures.push(`site_health_missing_traffic_launch_route:${route}`);
  }
  for (const route of ["https://fursay.com/noor-sprint-status", "https://fursay.com/noor-sprint-status.json"]) {
    if (!siteHealth.routes?.noorSprintStatus?.includes(route)) failures.push(`site_health_missing_noor_sprint_status_route:${route}`);
  }
  for (const route of ["https://fursay.com/links", "https://fursay.com/links.json"]) {
    if (!siteHealth.routes?.links?.includes(route)) failures.push(`site_health_missing_links_route:${route}`);
  }
  for (const route of ["https://fursay.com/deploy-readiness", "https://fursay.com/deploy-readiness.json"]) {
    if (!siteHealth.routes?.deployReadiness?.includes(route)) failures.push(`site_health_missing_deploy_readiness_route:${route}`);
  }
  for (const route of ["https://fursay.com/video-discovery.json", "https://fursay.com/shortlinks.json", "https://fursay.com/links.json", "https://fursay.com/deploy-readiness.json", "https://fursay.com/sitemap.xml", "https://fursay.com/robots.txt"]) {
    if (!siteHealth.routes?.discovery?.includes(route)) failures.push(`site_health_missing_discovery_route:${route}`);
  }
  if (siteHealth.funnels?.koko?.join !== "https://fursay.com/join/koko") failures.push("site_health_bad_koko_join");
  if (siteHealth.funnels?.noor?.join !== "https://fursay.com/join/noor") failures.push("site_health_bad_noor_join");
  if (siteHealth.funnels?.koko?.sample !== "https://fursay.com/sample/koko") failures.push("site_health_bad_koko_sample");
  if (siteHealth.funnels?.noor?.sample !== "https://fursay.com/sample/noor") failures.push("site_health_bad_noor_sample");
  if (siteHealth.funnels?.koko?.share !== "https://fursay.com/share/koko") failures.push("site_health_bad_koko_share");
  if (siteHealth.funnels?.noor?.share !== "https://fursay.com/share/noor") failures.push("site_health_bad_noor_share");
  if (siteHealth.funnels?.koko?.bio !== "https://fursay.com/bio/koko") failures.push("site_health_bad_koko_bio");
  if (siteHealth.funnels?.noor?.bio !== "https://fursay.com/bio/noor") failures.push("site_health_bad_noor_bio");
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
  for (const surface of ["homepage_split_cta", "homepage_sample_deep_link", "sample_shortlink", "family_share_shortlink", "family_share_message", "bio_shortlink", "bio_profile_copy", "amazon_affiliate_book_links", "books_affiliate_book_links", "locale_market_affiliate_split", "amazon_affiliate_disclosure", "social_profile_links_page", "social_profile_links_manifest", "social_profile_primary_pack_choice", "shortlink_manifest", "shortlink_query_passthrough", "source_id_passthrough", "video_discovery_manifest", "sitemap_manifest", "robots_manifest", "deploy_readiness_manifest", "deploy_readiness_page", "video_playlist_manifest", "video_subscribe_action", "social_preview_metadata", "story_world_social_preview_image", "sample_pack_schema", "story_world_faq_schema", "public_creator_share_panel", "public_share_kit_entry", "direct_social_share_link", "direct_social_share_manifest", "copy_sample_shortlink", "campaign_copy_kit", "campaign_qr_asset", "campaign_share_qr_asset", "campaign_qr_card", "creator_kit_manifest", "creator_kit_page", "share_kit_manifest", "share_kit_page", "traffic_launch_manifest", "traffic_launch_page", "traffic_launch_example_redirect", "traffic_launch_subscribe_payload", "episode_launch_link_template", "tracked_publish_copy", "creator_shortlink", "creator_placement_shortlink", "koko_sample_pack_cta", "noor_sample_pack_cta", "share_strip", "shortlink", "youtube_outbound_utm", "subscribe_deep_link"]) {
    if (!siteHealth.trafficSurfaces?.includes(surface)) failures.push(`site_health_missing_traffic_surface:${surface}`);
  }
  for (const signal of ["modal_preselect_matches_pack", "social_links_primary_cta_preselects_pack", "amazon_affiliate_links_use_parenttechche_20", "zh_pages_use_books_affiliate", "non_zh_pages_use_amazon_affiliate", "shortlink_redirect_keeps_utm", "shortlink_subscribe_attribution", "traffic_launch_example_redirect_keeps_attribution", "traffic_launch_payload_keeps_attribution", "subscribe_payload_keeps_attribution", "no_console_error"]) {
    if (!siteHealth.successSignals?.includes(signal)) failures.push(`site_health_missing_success_signal:${signal}`);
  }
  if (!siteHealth.sharedAssets?.css?.includes("/css/picture-world-shared-20260613-traffic12.css")) {
    failures.push("site_health_missing_current_shared_css");
  }
  if (!siteHealth.sharedAssets?.css?.includes("/css/picture-world-tools-20260613-products1.css")) {
    failures.push("site_health_missing_ops_tools_css");
  }
  if (!siteHealth.sharedAssets?.css?.includes("/css/home-common-20260613-cache1.css")) {
    failures.push("site_health_missing_home_common_css");
  }
  if (!siteHealth.sharedAssets?.css?.includes("/css/picture-book-base-20260613-base1.css")) {
    failures.push("site_health_missing_picture_book_base_css");
  }
  if (!siteHealth.sharedAssets?.css?.includes("/css/storybook-skin-20260613-inline1.css")) {
    failures.push("site_health_missing_storybook_skin_css");
  }
  if (!siteHealth.sharedAssets?.css?.includes("/css/story-page-common-20260613-css1.css")) {
    failures.push("site_health_missing_story_page_common_css");
  }
  if (!siteHealth.sharedAssets?.css?.includes("/css/noor-ltr-page-20260613-cache1.css")) {
    failures.push("site_health_missing_noor_ltr_css");
  }
  if (!siteHealth.sharedAssets?.css?.includes("/css/noor-common-20260613-cache1.css")) {
    failures.push("site_health_missing_noor_common_css");
  }
  if (!siteHealth.sharedAssets?.css?.includes("/css/noor-rtl-page-20260613-cache1.css")) {
    failures.push("site_health_missing_noor_rtl_css");
  }
  for (const asset of [
    "/css/home-en-page-20260613-cache1.css",
    "/css/home-zh-page-20260613-cache1.css",
    "/css/home-ar-page-20260613-cache1.css",
    "/css/koko-common-20260613-cache1.css",
    "/css/koko-en-page-20260613-cache1.css",
    "/css/koko-ar-page-20260613-cache1.css",
  ]) {
    if (!siteHealth.sharedAssets?.css?.includes(asset)) failures.push(`site_health_missing_page_css:${asset}`);
  }
  if (!siteHealth.sharedAssets?.js?.includes("/js/site-shared-20260615-sharekit1.js")) {
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
      deployReadinessBytes: Buffer.byteLength(deployReadinessRaw),
      deployReadinessPageBytes: Buffer.byteLength(deployReadinessPage),
      campaignsBytes: Buffer.byteLength(campaignsRaw),
      creatorKitBytes: Buffer.byteLength(creatorKitRaw),
      shareKitBytes: Buffer.byteLength(shareKitRaw),
      linksBytes: Buffer.byteLength(linksRaw),
      videoDiscoveryBytes: Buffer.byteLength(videoDiscoveryRaw),
      shortlinksBytes: Buffer.byteLength(shortlinksRaw),
      trafficLaunchBytes: Buffer.byteLength(trafficLaunchRaw),
      packageBytes: Buffer.byteLength(packageRaw),
      workflowBytes: Buffer.byteLength(workflowRaw),
      deployRunbookBytes: Buffer.byteLength(deployRunbookRaw),
      creatorKitPageBytes: Buffer.byteLength(creatorKitPage),
      shareKitPageBytes: Buffer.byteLength(shareKitPage),
      trafficLaunchPageBytes: Buffer.byteLength(trafficLaunchPage),
      linksPageBytes: Buffer.byteLength(linksPage),
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
    results.push(await checkSocialLinksLanding(browser, baseUrl));
    results.push(await checkAttributionPayload(browser, baseUrl));
    results.push(...await checkJoinRedirects(baseUrl));
    results.push(...await checkTrafficLaunchExampleRedirects(baseUrl));
    results.push(await checkTrafficLaunchSubscribePayloads(browser, baseUrl));
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
