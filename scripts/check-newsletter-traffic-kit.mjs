import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const DEFAULT_OUT = "/tmp/fursay-newsletter-traffic-kit";
const CREATOR_KIT = resolve(ROOT, "fursay-optimized-site/creator-kit.json");
const SHORTLINKS = resolve(ROOT, "fursay-optimized-site/shortlinks.json");
const RUNNER = resolve(ROOT, "scripts/newsletter-runner.mjs");

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = { outDir: DEFAULT_OUT, baseUrl: "" };
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--out-dir") parsed.outDir = args[++i];
    if (args[i] === "--base-url") parsed.baseUrl = args[++i].replace(/\/$/, "");
  }
  return parsed;
}

function hasAll(text, needles) {
  return needles.every((needle) => text.includes(needle));
}

async function readCreatorKit(baseUrl) {
  if (!baseUrl) return JSON.parse(await readFile(CREATOR_KIT, "utf8"));
  const response = await fetch(`${baseUrl}/creator-kit.json`);
  if (!response.ok) throw new Error(`creator-kit.json status ${response.status}`);
  return response.json();
}

async function readShortlinks(baseUrl) {
  if (!baseUrl) return JSON.parse(await readFile(SHORTLINKS, "utf8"));
  const response = await fetch(`${baseUrl}/shortlinks.json`);
  if (!response.ok) throw new Error(`shortlinks.json status ${response.status}`);
  return response.json();
}

async function readCreatorKitPage(baseUrl) {
  if (baseUrl) {
    const response = await fetch(`${baseUrl}/creator-kit`);
    if (!response.ok) throw new Error(`creator-kit page status ${response.status}`);
    return response.text();
  }
  try {
    return await readFile(resolve(ROOT, "fursay-optimized-site/creator-kit.html"), "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return "";
    throw error;
  }
}

async function checkCreatorRedirect(baseUrl, pack, expectedCampaign) {
  if (!baseUrl) return [];
  const response = await fetch(`${baseUrl}/creator/${pack}`, { redirect: "manual" });
  const location = response.headers.get("location") || "";
  const failures = [];
  if (response.status !== 302) failures.push(`${pack}_creator_redirect_status:${response.status}`);
  if (!location.includes(pack === "koko" ? "/koko" : "/arabic")) failures.push(`${pack}_creator_redirect_target:${location || "none"}`);
  if (!location.includes(`subscribe=${pack}`)) failures.push(`${pack}_creator_redirect_missing_subscribe`);
  if (!location.includes("utm_source=creator_kit")) failures.push(`${pack}_creator_redirect_missing_source`);
  if (!location.includes("utm_medium=description")) failures.push(`${pack}_creator_redirect_missing_medium`);
  if (!location.includes(`utm_campaign=${expectedCampaign}`)) failures.push(`${pack}_creator_redirect_missing_campaign`);
  if (!location.includes("utm_content=creator_kit_sample")) failures.push(`${pack}_creator_redirect_missing_content`);
  return failures;
}

async function checkCreatorPlacementRedirect(baseUrl, pack, placement, expected) {
  if (!baseUrl) return [];
  const response = await fetch(`${baseUrl}/creator/${pack}/${placement}`, { redirect: "manual" });
  const location = response.headers.get("location") || "";
  const failures = [];
  if (response.status !== 302) failures.push(`${pack}_${placement}_creator_redirect_status:${response.status}`);
  if (!location.includes(pack === "koko" ? "/koko" : "/arabic")) failures.push(`${pack}_${placement}_creator_redirect_target:${location || "none"}`);
  if (!location.includes(`subscribe=${pack}`)) failures.push(`${pack}_${placement}_creator_redirect_missing_subscribe`);
  if (!location.includes(`utm_source=${expected.source}`)) failures.push(`${pack}_${placement}_creator_redirect_missing_source`);
  if (!location.includes(`utm_medium=${expected.medium}`)) failures.push(`${pack}_${placement}_creator_redirect_missing_medium`);
  if (!location.includes(`utm_campaign=${expected.campaign}`)) failures.push(`${pack}_${placement}_creator_redirect_missing_campaign`);
  if (!location.includes(`utm_content=${expected.content}`)) failures.push(`${pack}_${placement}_creator_redirect_missing_content`);
  return failures;
}

async function checkSvgAsset(url) {
  const response = await fetch(url);
  const body = await response.text();
  const failures = [];
  if (!response.ok) failures.push(`status:${response.status}`);
  if (!response.headers.get("content-type")?.includes("image/svg+xml")) failures.push("content_type");
  if (!body.includes("<svg") || !body.includes("<path")) failures.push("svg_body");
  if (Buffer.byteLength(body) < 1000) failures.push("too_small");
  return failures;
}

function expectedCreatorCopyValues(baseUrl, creatorKit) {
  const values = [];
  for (const [pack, item] of Object.entries(creatorKit.packs || {})) {
    values.push(
      `${baseUrl}/creator/${pack}`,
      `${baseUrl}/sample/${pack}`,
      `${baseUrl}/share/${pack}`,
      `${baseUrl}/bio/${pack}`,
      `${baseUrl}/images/qr/sample-${pack}.svg`,
      `${baseUrl}/images/qr/share-${pack}.svg`,
      item.directSocialShare?.whatsapp,
      item.directSocialShare?.line,
      item.trackedLandingUrl,
      item.placementLinks?.youtubeDescription?.shortlink,
      item.placementLinks?.socialCaption?.shortlink,
      item.placementLinks?.newsletterBlurb?.shortlink,
      item.videoDiscovery?.manifest,
      item.videoDiscovery?.channelId,
      item.videoDiscovery?.uploadsPlaylistId,
      item.videoDiscovery?.youtubeChannel,
      item.videoDiscovery?.youtubeVideos,
      item.videoDiscovery?.youtubePlaylists,
      item.videoDiscovery?.playlistName,
      item.videoDiscovery?.playlistEmbed,
      item.youtubeDescription,
      item.socialCaption,
      item.bioProfileCopy,
      item.familyShareMessage,
      item.newsletterBlurb,
    );
  }
  return values.filter(Boolean);
}

async function checkCreatorKitBrowser(baseUrl, creatorKit) {
  if (!baseUrl) {
    return { failures: [], data: { skipped: true, reason: "local content check only" } };
  }
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const consoleMessages = [];
  const failedRequests = [];
  const badStatuses = [];
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) {
      consoleMessages.push({ type: message.type(), text: message.text().slice(0, 300) });
    }
  });
  page.on("requestfailed", (request) => failedRequests.push({ url: request.url(), failure: request.failure()?.errorText || "" }));
  page.on("response", (response) => {
    if (response.status() >= 400) badStatuses.push({ status: response.status(), url: response.url() });
  });

  const response = await page.goto(`${baseUrl}/creator-kit`, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
  await page.evaluate(async () => {
    for (const image of document.querySelectorAll(".creator-qr img")) {
      image.scrollIntoView({ block: "center" });
      if (!image.complete) {
        await new Promise((resolve) => {
          image.addEventListener("load", resolve, { once: true });
          image.addEventListener("error", resolve, { once: true });
          setTimeout(resolve, 2500);
        });
      }
      if (image.decode) await image.decode().catch(() => {});
    }
    window.scrollTo(0, 0);
  });
  const data = await page.evaluate(() => {
    const qa = (selector) => [...document.querySelectorAll(selector)];
    const qrImages = qa(".creator-qr img");
    return {
      status: document.readyState,
      title: document.title,
      canonical: document.querySelector('link[rel="canonical"]')?.href || "",
      h1Count: qa("h1").length,
      h1Text: qa("h1").map((h1) => h1.textContent.trim().replace(/\s+/g, " ")).join(" | "),
      packCount: qa("[data-creator-kit-pack]").length,
      creatorLinks: qa('.creator-pack a[href*="/creator/"]').map((anchor) => anchor.href),
      jsonManifestLink: document.querySelector('a[href="/creator-kit.json"]')?.href || "",
      copyButtonCount: qa("[data-copy-creator-kit]").length,
      copyValues: qa("[data-copy-creator-kit]").map((button) => button.getAttribute("data-copy-value") || ""),
      horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
      qrImages: qrImages.map((img) => ({
        src: img.currentSrc || img.src,
        alt: img.getAttribute("alt") || "",
        complete: img.complete,
        naturalWidth: img.naturalWidth,
      })),
    };
  });
  const copyResult = await page.evaluate(async () => {
    const button = document.querySelector("[data-copy-creator-kit]");
    if (!button) return { clicked: false };
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
    await new Promise((resolve) => setTimeout(resolve, 50));
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: originalClipboard });
    return {
      clicked: true,
      writes,
      label: button.textContent.trim(),
    };
  });
  await browser.close();

  const failures = [];
  if (response.status() !== 200) failures.push(`creator_kit_page_status:${response.status()}`);
  if (data.canonical !== `${baseUrl}/creator-kit`) failures.push(`creator_kit_page_canonical:${data.canonical || "none"}`);
  if (data.h1Count !== 1 || data.h1Text !== "Creator Kit") failures.push(`creator_kit_page_h1:${data.h1Text || "none"}`);
  if (data.packCount !== 2) failures.push(`creator_kit_page_pack_count:${data.packCount}`);
  if (!data.creatorLinks.includes(`${baseUrl}/creator/koko`)) failures.push("creator_kit_page_missing_koko_creator_link");
  if (!data.creatorLinks.includes(`${baseUrl}/creator/noor`)) failures.push("creator_kit_page_missing_noor_creator_link");
  if (data.jsonManifestLink !== `${baseUrl}/creator-kit.json`) failures.push(`creator_kit_page_json_link:${data.jsonManifestLink || "none"}`);
  if (data.copyButtonCount !== 50) failures.push(`creator_kit_page_copy_button_count:${data.copyButtonCount}`);
  for (const value of expectedCreatorCopyValues(baseUrl, creatorKit)) {
    if (!data.copyValues.some((copyValue) => copyValue.includes(value))) failures.push(`creator_kit_page_copy_missing:${value}`);
  }
  if (!copyResult.clicked) failures.push("creator_kit_page_copy_not_clickable");
  if (!copyResult.writes?.[0]) failures.push("creator_kit_page_copy_no_write");
  if (copyResult.clicked && copyResult.label !== "Copied") failures.push(`creator_kit_page_copy_label:${copyResult.label || "none"}`);
  if (data.horizontalOverflow > 2) failures.push(`creator_kit_page_horizontal_overflow:${data.horizontalOverflow}`);
  if (data.qrImages.length !== 4) failures.push(`creator_kit_page_qr_count:${data.qrImages.length}`);
  for (const image of data.qrImages) {
    if (!/https:\/\/fursay\.com\/(?:sample|share)\//.test(image.alt)) failures.push(`creator_kit_page_qr_alt:${image.alt || "none"}`);
    const assetFailures = await checkSvgAsset(image.src);
    if (assetFailures.length) failures.push(`creator_kit_page_broken_qr:${image.src || "none"}:${assetFailures.join(",")}`);
  }
  if (consoleMessages.some((message) => message.type === "error")) failures.push("creator_kit_page_console_error");
  if (failedRequests.length) failures.push(`creator_kit_page_failed_requests:${failedRequests.length}`);
  if (badStatuses.length) failures.push(`creator_kit_page_bad_statuses:${badStatuses.length}`);
  return { failures, data: { ...data, copyResult, consoleMessages, failedRequests, badStatuses } };
}

async function main() {
  const args = parseArgs();
  const creatorKit = await readCreatorKit(args.baseUrl);
  const shortlinks = await readShortlinks(args.baseUrl);
  const creatorKitPage = await readCreatorKitPage(args.baseUrl);
  const runner = await readFile(RUNNER, "utf8");
  const failures = [];

  if (creatorKit.platform !== "cloudflare-workers-static-assets") failures.push("creator_kit_bad_platform");
  if (creatorKit.safety?.subscriptionEndpoint !== "/api/subscribe") failures.push("creator_kit_bad_subscription_endpoint");
  if (creatorKit.safety?.smokeSubmitsToMailerLite !== false) failures.push("creator_kit_bad_smoke_contract");
  if (creatorKit.safety?.shortlinkManifest !== "https://fursay.com/shortlinks.json") failures.push("creator_kit_missing_shortlink_manifest");
  if (shortlinks.platform !== "cloudflare-workers-static-assets") failures.push("shortlinks_bad_platform");
  if (!Array.isArray(shortlinks.routes) || shortlinks.routes.length !== 16) failures.push(`shortlinks_bad_route_count:${shortlinks.routes?.length || 0}`);
  if (shortlinks.safety?.ownedAttributionCannotBeOverridden !== true) failures.push("shortlinks_missing_owned_attribution_guard");
  if (!shortlinks.safety?.passthroughParams?.includes("utm_term") || !shortlinks.safety?.passthroughParams?.includes("ref")) {
    failures.push("shortlinks_missing_passthrough_contract");
  }
  if (!shortlinks.safety?.blockedParams?.includes("email") || !shortlinks.safety?.blockedParams?.includes("utm_source")) {
    failures.push("shortlinks_missing_blocked_contract");
  }
  const shortlinkByUrl = new Map((shortlinks.routes || []).map((route) => [route.shortlink, route]));

  for (const [pack, expectedCampaign] of Object.entries({ koko: "koko_story_funnel", noor: "noor_story_funnel" })) {
    const item = creatorKit.packs?.[pack] || {};
    const expectedSample = `https://fursay.com/sample/${pack}`;
    const expectedShare = `https://fursay.com/share/${pack}`;
    const expectedWhatsappShare = `${expectedShare}?ref=whatsapp&placement=direct_social_share`;
    const expectedLineShare = `${expectedShare}?ref=line&placement=direct_social_share`;
    const expectedBio = `https://fursay.com/bio/${pack}`;
    const expectedCreator = `https://fursay.com/creator/${pack}`;
    const expectedWhatsappLabel = pack === "koko" ? "Koko weekly story pack" : "قصة نور الصينية في 3 دقائق";
    const expectedWhatsapp = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${expectedWhatsappLabel}: ${expectedWhatsappShare}`)}`;
    const expectedLine = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(expectedLineShare)}`;
    const expectedYoutubePlacement = `${expectedCreator}/youtube`;
    const expectedSocialPlacement = `${expectedCreator}/social`;
    const expectedNewsletterPlacement = `${expectedCreator}/newsletter`;
    if (item.sampleShortlink !== expectedSample) failures.push(`${pack}_bad_sample_shortlink`);
    if (item.shareShortlink !== expectedShare) failures.push(`${pack}_bad_share_shortlink`);
    if (item.bioShortlink !== expectedBio) failures.push(`${pack}_bad_bio_shortlink`);
    if (item.creatorShortlink !== expectedCreator) failures.push(`${pack}_bad_creator_shortlink`);
    for (const shortlink of [expectedSample, expectedShare, expectedBio, expectedCreator, expectedYoutubePlacement, expectedSocialPlacement, expectedNewsletterPlacement]) {
      if (!shortlinkByUrl.has(shortlink)) failures.push(`${pack}_shortlinks_manifest_missing:${shortlink}`);
    }
    if (item.directSocialShare?.whatsapp !== expectedWhatsapp) failures.push(`${pack}_bad_whatsapp_share`);
    if (item.directSocialShare?.line !== expectedLine) failures.push(`${pack}_bad_line_share`);
    if (item.qrSvg !== `https://fursay.com/images/qr/sample-${pack}.svg`) failures.push(`${pack}_bad_sample_qr`);
    if (item.shareQrSvg !== `https://fursay.com/images/qr/share-${pack}.svg`) failures.push(`${pack}_bad_share_qr`);
    if (!item.trackedLandingUrl?.includes("utm_source=creator_kit")) failures.push(`${pack}_missing_creator_source`);
    if (!item.trackedLandingUrl?.includes(`utm_campaign=${expectedCampaign}`)) failures.push(`${pack}_missing_campaign`);
    if (item.placementLinks?.youtubeDescription?.shortlink !== expectedYoutubePlacement) failures.push(`${pack}_bad_youtube_placement`);
    if (item.placementLinks?.socialCaption?.shortlink !== expectedSocialPlacement) failures.push(`${pack}_bad_social_placement`);
    if (item.placementLinks?.newsletterBlurb?.shortlink !== expectedNewsletterPlacement) failures.push(`${pack}_bad_newsletter_placement`);
    if (item.videoDiscovery?.manifest !== "https://fursay.com/video-discovery.json") failures.push(`${pack}_bad_video_manifest`);
    if (!item.videoDiscovery?.channelId?.startsWith("UC")) failures.push(`${pack}_bad_video_channel_id`);
    if (!item.videoDiscovery?.uploadsPlaylistId?.startsWith("UU")) failures.push(`${pack}_bad_video_uploads_playlist`);
    if (!item.videoDiscovery?.youtubeChannel?.includes(pack === "koko" ? "@KokosForest" : "@ArabicKidsChinese")) failures.push(`${pack}_bad_video_channel`);
    if (!item.videoDiscovery?.youtubeVideos?.endsWith("/videos")) failures.push(`${pack}_bad_video_videos`);
    if (!item.videoDiscovery?.youtubePlaylists?.endsWith("/playlists")) failures.push(`${pack}_bad_video_playlists`);
    if (!item.videoDiscovery?.playlistName?.includes(pack === "koko" ? "Koko" : "Arabic Kids Chinese")) failures.push(`${pack}_bad_video_playlist_name`);
    if (!item.videoDiscovery?.playlistEmbed?.startsWith("https://www.youtube-nocookie.com/embed/videoseries?list=UU")) failures.push(`${pack}_bad_video_embed`);
    if (!item.newsletterBlurb?.includes(expectedNewsletterPlacement)) failures.push(`${pack}_newsletter_blurb_missing_placement`);
    if (!item.youtubeDescription?.includes(expectedYoutubePlacement)) failures.push(`${pack}_youtube_missing_placement`);
    if (!item.socialCaption?.includes(expectedSocialPlacement)) failures.push(`${pack}_social_missing_placement`);
    if (!item.familyShareMessage?.includes(expectedShare)) failures.push(`${pack}_family_share_message_missing_share`);
    if (!item.bioProfileCopy?.includes(expectedBio)) failures.push(`${pack}_bio_profile_copy_missing_bio`);
    if (item.utmContract?.content !== "creator_kit_sample") failures.push(`${pack}_bad_utm_content`);
    if (!creatorKitPage.includes(`data-creator-kit-pack="${pack}"`)) failures.push(`${pack}_creator_page_missing_pack`);
    if (!creatorKitPage.includes(expectedCreator)) failures.push(`${pack}_creator_page_missing_creator`);
    if (!creatorKitPage.includes(expectedSample)) failures.push(`${pack}_creator_page_missing_sample`);
    if (!creatorKitPage.includes(expectedShare)) failures.push(`${pack}_creator_page_missing_share`);
    if (!creatorKitPage.includes(item.familyShareMessage || "")) failures.push(`${pack}_creator_page_missing_family_share_message`);
    if (!creatorKitPage.includes(item.bioProfileCopy || "")) failures.push(`${pack}_creator_page_missing_bio_profile_copy`);
    if (!creatorKitPage.includes(expectedWhatsapp)) failures.push(`${pack}_creator_page_missing_whatsapp_share`);
    if (!creatorKitPage.includes(expectedLine)) failures.push(`${pack}_creator_page_missing_line_share`);
    if (!creatorKitPage.includes(`/images/qr/share-${pack}.svg`)) failures.push(`${pack}_creator_page_missing_share_qr`);
    if (!creatorKitPage.includes(expectedBio)) failures.push(`${pack}_creator_page_missing_bio`);
    if (!creatorKitPage.includes(expectedYoutubePlacement)) failures.push(`${pack}_creator_page_missing_youtube_placement`);
    if (!creatorKitPage.includes(expectedSocialPlacement)) failures.push(`${pack}_creator_page_missing_social_placement`);
    if (!creatorKitPage.includes(expectedNewsletterPlacement)) failures.push(`${pack}_creator_page_missing_newsletter_placement`);
    for (const value of Object.values(item.videoDiscovery || {})) {
      if (!creatorKitPage.includes(value)) failures.push(`${pack}_creator_page_missing_video_discovery`);
    }
    if (!creatorKitPage.includes("data-copy-creator-kit")) failures.push(`${pack}_creator_page_missing_copy_buttons`);
    failures.push(...await checkCreatorRedirect(args.baseUrl, pack, expectedCampaign));
    failures.push(...await checkCreatorPlacementRedirect(args.baseUrl, pack, "youtube", {
      source: "youtube",
      medium: "description",
      campaign: expectedCampaign,
      content: "creator_kit_youtube",
    }));
    failures.push(...await checkCreatorPlacementRedirect(args.baseUrl, pack, "social", {
      source: "social",
      medium: "profile",
      campaign: expectedCampaign,
      content: "creator_kit_social",
    }));
    failures.push(...await checkCreatorPlacementRedirect(args.baseUrl, pack, "newsletter", {
      source: "newsletter",
      medium: "email",
      campaign: expectedCampaign,
      content: "creator_kit_newsletter",
    }));
  }

  const runnerNeedles = [
    "loadCreatorKit",
    "creatorPackForChannel",
    "trafficPack.trackedLandingUrl",
    "trafficPack.sampleShortlink",
    "trafficPack.placementLinks.newsletterBlurb.shortlink",
    "trafficPack.newsletterBlurb",
    "Creator Kit",
    "message body includes ${trafficPack.placementLinks.newsletterBlurb.shortlink}",
    "rendered email must include the creator-kit newsletter shortlink",
  ];
  if (!hasAll(runner, runnerNeedles)) failures.push("newsletter_runner_missing_creator_kit_hooks");
  const browserCheck = await checkCreatorKitBrowser(args.baseUrl, creatorKit);
  failures.push(...browserCheck.failures);

  const report = {
    generatedAt: new Date().toISOString(),
    ok: failures.length === 0,
    failed: failures,
    checks: {
      packs: Object.keys(creatorKit.packs || {}),
      runnerHooks: runnerNeedles.length,
      baseUrl: args.baseUrl || "local",
      creatorKitPageBytes: Buffer.byteLength(creatorKitPage),
      browser: browserCheck.data,
    },
  };

  await mkdir(args.outDir, { recursive: true });
  await writeFile(join(args.outDir, "newsletter-traffic-kit.json"), JSON.stringify(report, null, 2) + "\n");
  await writeFile(join(args.outDir, "newsletter-traffic-kit.md"), [
    "# Fursay Newsletter Traffic Kit Check",
    "",
    `- Result: ${report.ok ? "PASS" : "FAIL"}`,
    `- Failed: ${failures.length}`,
    `- Packs: ${report.checks.packs.join(", ")}`,
    `- Base URL: ${report.checks.baseUrl}`,
    `- Creator kit page bytes: ${report.checks.creatorKitPageBytes}`,
    "",
  ].join("\n"));

  console.log(JSON.stringify({ ok: report.ok, outDir: args.outDir, failed: failures.length }, null, 2));
  return report.ok ? 0 : 1;
}

main().then((code) => process.exit(code)).catch((error) => {
  console.error(error);
  process.exit(1);
});
