import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const stamp = new Date().toISOString().replace(/[:.]/g, "-");

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {
    baseUrl: "https://fursay.com",
    skipDeploy: false,
    skipLive: false,
    pushGit: false,
    checkOnly: false,
  };
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--base-url") parsed.baseUrl = args[++i].replace(/\/$/, "");
    if (args[i] === "--skip-deploy") parsed.skipDeploy = true;
    if (args[i] === "--skip-live") parsed.skipLive = true;
    if (args[i] === "--push-git") parsed.pushGit = true;
    if (args[i] === "--check-only") parsed.checkOnly = true;
  }
  if (parsed.checkOnly) {
    parsed.skipDeploy = true;
    parsed.skipLive = true;
    parsed.pushGit = false;
  }
  return parsed;
}

function run(command, args, options = {}) {
  const label = [command, ...args].join(" ");
  console.log(`\n$ ${label}`);
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
  });
  if (result.status !== 0) {
    if (options.capture) {
      if (result.stdout) process.stdout.write(result.stdout);
      if (result.stderr) process.stderr.write(result.stderr);
    }
    throw new Error(`Command failed: ${label}`);
  }
  return result.stdout || "";
}

function ensureOutDir(path) {
  if (!existsSync(path)) mkdirSync(path, { recursive: true });
}

function gitRemote() {
  const result = spawnSync("git", ["remote", "get-url", "origin"], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: "pipe",
  });
  return result.status === 0 ? result.stdout.trim() : "";
}

function gitValue(args, fallback = "") {
  const result = spawnSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: "pipe",
  });
  return result.status === 0 ? result.stdout.trim() : fallback;
}

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

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeReleaseManifest() {
  const siteDir = resolve(process.cwd(), "fursay-optimized-site");
  const siteStructure = readJson(resolve(siteDir, "data/site-structure.json"));
  const css = siteStructure.sharedAssets?.css?.find((asset) => asset.includes("picture-world-shared-")) || "";
  const js = siteStructure.sharedAssets?.js?.[0] || "";
  const source = {
    branch: gitValue(["branch", "--show-current"], "unknown"),
    commit: gitValue(["rev-parse", "--short", "HEAD"], "unknown"),
    summary: gitValue(["log", "-1", "--pretty=%s"], "unknown"),
  };
  const manifest = {
    site: "Fursay",
    origin: "https://fursay.com",
    platform: "cloudflare-workers-static-assets",
    releasedAt: taipeiDateString(),
    source,
    deployment: {
      workerName: "fursay",
      assetsBinding: "ASSETS",
      releaseCommand: "node scripts/release-fursay.mjs",
      campaignManifest: "https://fursay.com/campaigns.json",
      creatorKitManifest: "https://fursay.com/creator-kit.json",
      creatorKitPage: "https://fursay.com/creator-kit",
      videoDiscoveryManifest: "https://fursay.com/video-discovery.json",
      sitemap: "https://fursay.com/sitemap.xml",
      robots: "https://fursay.com/robots.txt",
      runbook: "docs/cloudflare-deploy-runbook.md",
      packageScripts: {
        deployReady: "npm run deploy:ready",
        check: "npm run check",
        deploy: "npm run deploy",
        liveSmoke: "npm run smoke:live",
      },
      autoDeployWorkflow: ".github/workflows/deploy-worker.yml",
    },
    funnels: {
      koko: {
        campaign: "koko_story_funnel",
        join: "https://fursay.com/join/koko",
        sample: "https://fursay.com/sample/koko",
        share: "https://fursay.com/share/koko",
        bio: "https://fursay.com/bio/koko",
        creator: "https://fursay.com/creator/koko",
        deepLink: "https://fursay.com/koko?subscribe=koko&utm_source=shortlink&utm_medium=direct&utm_campaign=koko_story_funnel&utm_content=join_koko",
      },
      noor: {
        campaign: "noor_story_funnel",
        join: "https://fursay.com/join/noor",
        sample: "https://fursay.com/sample/noor",
        share: "https://fursay.com/share/noor",
        bio: "https://fursay.com/bio/noor",
        creator: "https://fursay.com/creator/noor",
        deepLink: "https://fursay.com/arabic?subscribe=noor&utm_source=shortlink&utm_medium=direct&utm_campaign=noor_story_funnel&utm_content=join_noor",
      },
    },
    assets: { css, js },
    qualityGates: [
      "scripts/check-fursay-funnel.mjs",
      "scripts/check-noor-list-activation.mjs",
      "scripts/check-newsletter-traffic-kit.mjs",
      "scripts/check-cache-headers.mjs",
      "scripts/check-deploy-readiness.mjs",
      "audit-fursay.mjs",
    ],
    liveExpectations: {
      pages: 9,
      funnelChecks: 29,
      cacheHeaderChecks: 32,
      badAuditCount: 0,
      liveSmokeCallsMailerLite: false,
    },
  };
  writeFileSync(resolve(siteDir, "release.json"), JSON.stringify(manifest, null, 2) + "\n");
  writeSitemap(siteDir);
  writeCampaignManifest(siteDir, source);
  writeVideoDiscovery(siteDir, source);
}

function sitemapUrl(loc, alternates, priority) {
  const lastmod = taipeiDateString();
  const alternateLines = Object.entries(alternates).map(([lang, href]) => (
    `    <xhtml:link rel="alternate" hreflang="${lang}" href="${href}"/>`
  ));
  return [
    "  <url>",
    `    <loc>${loc}</loc>`,
    `    <lastmod>${lastmod}</lastmod>`,
    "    <changefreq>weekly</changefreq>",
    `    <priority>${priority}</priority>`,
    ...alternateLines,
    "  </url>",
  ].join("\n");
}

function writeSitemap(siteDir) {
  const homeAlternates = {
    en: "https://fursay.com/",
    "zh-TW": "https://fursay.com/zh/",
    ar: "https://fursay.com/ar/",
    "x-default": "https://fursay.com/",
  };
  const kokoAlternates = {
    en: "https://fursay.com/koko",
    "zh-TW": "https://fursay.com/zh/koko",
    ar: "https://fursay.com/ar/koko",
    "x-default": "https://fursay.com/koko",
  };
  const noorAlternates = {
    en: "https://fursay.com/arabic",
    "zh-TW": "https://fursay.com/zh/arabic",
    ar: "https://fursay.com/ar/arabic",
    "x-default": "https://fursay.com/arabic",
  };
  const entries = [
    sitemapUrl("https://fursay.com/", homeAlternates, "1.0"),
    sitemapUrl("https://fursay.com/zh/", homeAlternates, "0.8"),
    sitemapUrl("https://fursay.com/ar/", homeAlternates, "0.8"),
    sitemapUrl("https://fursay.com/koko", kokoAlternates, "0.7"),
    sitemapUrl("https://fursay.com/zh/koko", kokoAlternates, "0.7"),
    sitemapUrl("https://fursay.com/ar/koko", kokoAlternates, "0.7"),
    sitemapUrl("https://fursay.com/arabic", noorAlternates, "0.7"),
    sitemapUrl("https://fursay.com/zh/arabic", noorAlternates, "0.7"),
    sitemapUrl("https://fursay.com/ar/arabic", noorAlternates, "0.7"),
  ];
  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '        xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    entries.join("\n\n"),
    "</urlset>",
    "",
  ].join("\n");
  writeFileSync(resolve(siteDir, "sitemap.xml"), sitemap);
}

function campaignBase(source) {
  return {
    site: "Fursay",
    origin: "https://fursay.com",
    platform: "cloudflare-workers-static-assets",
    updatedAt: taipeiDateString(),
    source,
    attributionContract: {
      endpoint: "/api/subscribe",
      payload: "email/groups/attribution",
      requiredParams: ["subscribe", "utm_source", "utm_medium", "utm_campaign", "utm_content"],
      smokeSubmitsToMailerLite: false,
    },
  };
}

function socialShareUrls(pack) {
  const shareUrl = `https://fursay.com/share/${pack}`;
  const label = pack === "koko" ? "Koko weekly story pack" : "Noor 3-minute story pack";
  return {
    whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(`${label}: ${shareUrl}`)}`,
    line: `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrl)}`,
  };
}

function bioProfileCopy(pack) {
  return pack === "koko"
    ? "Koko's Forest Adventure: weekly English story packs for Mandarin-speaking families. Start here: https://fursay.com/bio/koko"
    : "Noor's Arabic Kids Chinese: 3-minute Chinese story packs for Arabic-speaking families. Start here: https://fursay.com/bio/noor";
}

function writeCampaignManifest(siteDir, source) {
  const campaigns = {
    koko: {
      status: "active",
      audience: "Mandarin-speaking families learning English",
      primaryGoal: "weekly_story_pack_subscribe",
      campaign: "koko_story_funnel",
      shortlinks: {
        join: "https://fursay.com/join/koko",
        sample: "https://fursay.com/sample/koko",
        share: "https://fursay.com/share/koko",
        bio: "https://fursay.com/bio/koko",
        creator: "https://fursay.com/creator/koko",
      },
      landingPages: {
        storyWorld: "https://fursay.com/koko",
        homeSample: "https://fursay.com/koko?subscribe=koko&utm_source=home&utm_medium=site&utm_campaign=koko_story_funnel&utm_content=home_koko_sample_link",
        sampleSchema: "https://fursay.com/koko?subscribe=koko&utm_source=structured_data&utm_medium=site&utm_campaign=koko_story_funnel&utm_content=koko_sample_pack_schema",
      },
      copyKit: {
        version: "2026-06-13",
        qrLabel: "Koko weekly story pack",
        shortHeadline: "Get Koko's weekly English story pack",
        videoDescription: "Get the free Koko weekly story pack: https://fursay.com/sample/koko",
        familyShareText: "Koko's Forest Adventure weekly pack is ready for family story time: https://fursay.com/sample/koko",
        familyShareMessage: "Koko's Forest Adventure weekly pack is ready for family story time: https://fursay.com/share/koko",
        bioProfileCopy: bioProfileCopy("koko"),
        primaryShortlink: "https://fursay.com/sample/koko",
        shareShortlink: "https://fursay.com/share/koko",
        whatsappShareUrl: socialShareUrls("koko").whatsapp,
        lineShareUrl: socialShareUrls("koko").line,
        qrSvg: "https://fursay.com/images/qr/sample-koko.svg",
        shareQrSvg: "https://fursay.com/images/qr/share-koko.svg",
      },
      ctaSources: [
        "home_koko_weekly_pack",
        "home_weekly_pack_koko",
        "koko_sample_pack_cta",
        "koko_story_pack_section",
        "share_strip_koko_pack",
      ],
    },
    noor: {
      status: "active",
      audience: "Arabic-speaking families learning Chinese",
      primaryGoal: "weekly_story_pack_subscribe",
      campaign: "noor_story_funnel",
      shortlinks: {
        join: "https://fursay.com/join/noor",
        sample: "https://fursay.com/sample/noor",
        share: "https://fursay.com/share/noor",
        bio: "https://fursay.com/bio/noor",
        creator: "https://fursay.com/creator/noor",
      },
      landingPages: {
        storyWorld: "https://fursay.com/arabic",
        homeSample: "https://fursay.com/arabic?subscribe=noor&utm_source=home&utm_medium=site&utm_campaign=noor_story_funnel&utm_content=home_noor_sample_link",
        sampleSchema: "https://fursay.com/arabic?subscribe=noor&utm_source=structured_data&utm_medium=site&utm_campaign=noor_story_funnel&utm_content=noor_sample_pack_schema",
      },
      copyKit: {
        version: "2026-06-13",
        qrLabel: "Noor weekly story pack",
        shortHeadline: "Get Noor's weekly Chinese story pack",
        videoDescription: "Get the free Noor weekly story pack: https://fursay.com/sample/noor",
        familyShareText: "Noor's Arabic Kids Chinese weekly pack is ready for family story time: https://fursay.com/sample/noor",
        familyShareMessage: "Noor's Arabic Kids Chinese weekly pack is ready for family story time: https://fursay.com/share/noor",
        bioProfileCopy: bioProfileCopy("noor"),
        primaryShortlink: "https://fursay.com/sample/noor",
        shareShortlink: "https://fursay.com/share/noor",
        whatsappShareUrl: socialShareUrls("noor").whatsapp,
        lineShareUrl: socialShareUrls("noor").line,
        qrSvg: "https://fursay.com/images/qr/sample-noor.svg",
        shareQrSvg: "https://fursay.com/images/qr/share-noor.svg",
      },
      ctaSources: [
        "home_noor_weekly_pack",
        "home_weekly_pack_noor",
        "arabic_sample_pack_cta",
        "arabic_story_pack_section",
        "share_strip_noor_pack",
      ],
    },
  };
  const manifest = {
    ...campaignBase(source),
    creatorKit: "https://fursay.com/creator-kit.json",
    videoDiscovery: "https://fursay.com/video-discovery.json",
    campaigns,
  };
  writeFileSync(resolve(siteDir, "campaigns.json"), JSON.stringify(manifest, null, 2) + "\n");
  writeCreatorKit(siteDir, source, campaigns);
}

function writeCreatorKit(siteDir, source, campaigns) {
  const videoDiscoveryChannels = buildVideoDiscoveryChannels();
  const kit = {
    site: "Fursay",
    origin: "https://fursay.com",
    platform: "cloudflare-workers-static-assets",
    updatedAt: taipeiDateString(),
    source,
    purpose: "Reusable traffic assets for YouTube descriptions, social captions, newsletter blurbs, QR posters, and creator handoffs.",
    safety: {
      subscriptionEndpoint: "/api/subscribe",
      smokeSubmitsToMailerLite: false,
      linksUseShortlinksWithUtmRedirects: true,
    },
    packs: Object.fromEntries(Object.entries(campaigns).map(([pack, campaign]) => {
      const sample = campaign.shortlinks.sample;
      const creator = campaign.shortlinks.creator;
      const placementLinks = {
        youtubeDescription: {
          shortlink: `${creator}/youtube`,
          source: "youtube",
          medium: "description",
          content: "creator_kit_youtube",
        },
        socialCaption: {
          shortlink: `${creator}/social`,
          source: "social",
          medium: "profile",
          content: "creator_kit_social",
        },
        newsletterBlurb: {
          shortlink: `${creator}/newsletter`,
          source: "newsletter",
          medium: "email",
          content: "creator_kit_newsletter",
        },
      };
      const landing = pack === "koko"
        ? "https://fursay.com/koko?subscribe=koko&utm_source=creator_kit&utm_medium=description&utm_campaign=koko_story_funnel&utm_content=creator_kit_sample"
        : "https://fursay.com/arabic?subscribe=noor&utm_source=creator_kit&utm_medium=description&utm_campaign=noor_story_funnel&utm_content=creator_kit_sample";
      return [pack, {
        audience: campaign.audience,
        campaign: campaign.campaign,
        primaryAction: "preview_weekly_story_pack",
        sampleShortlink: sample,
        shareShortlink: campaign.shortlinks.share,
        directSocialShare: {
          whatsapp: campaign.copyKit.whatsappShareUrl,
          line: campaign.copyKit.lineShareUrl,
        },
        bioShortlink: campaign.shortlinks.bio,
        creatorShortlink: creator,
        placementLinks,
        videoDiscovery: {
          manifest: "https://fursay.com/video-discovery.json",
          channelId: videoDiscoveryChannels[pack].channelId,
          uploadsPlaylistId: videoDiscoveryChannels[pack].uploadsPlaylistId,
          youtubeChannel: videoDiscoveryChannels[pack].youtubeChannel,
          youtubeVideos: videoDiscoveryChannels[pack].youtubeVideos,
          youtubePlaylists: videoDiscoveryChannels[pack].youtubePlaylists,
          playlistName: videoDiscoveryChannels[pack].playlistName,
          playlistEmbed: videoDiscoveryChannels[pack].playlistEmbed,
        },
        trackedLandingUrl: landing,
        qrSvg: campaign.copyKit.qrSvg,
        shareQrSvg: campaign.copyKit.shareQrSvg,
        youtubeDescription: `${campaign.copyKit.shortHeadline}\nFree weekly sample pack: ${placementLinks.youtubeDescription.shortlink}`,
        socialCaption: `${campaign.copyKit.shortHeadline}. Preview this week's family story pack: ${placementLinks.socialCaption.shortlink}`,
        familyShareMessage: campaign.copyKit.familyShareMessage,
        bioProfileCopy: campaign.copyKit.bioProfileCopy,
        newsletterBlurb: `${campaign.copyKit.familyShareText.replace(sample, placementLinks.newsletterBlurb.shortlink)}`,
        altText: `${campaign.copyKit.qrLabel} QR code for ${sample}`,
        utmContract: {
          source: "creator_kit",
          medium: "description",
          campaign: campaign.campaign,
          content: "creator_kit_sample",
        },
      }];
    })),
  };
  writeFileSync(resolve(siteDir, "creator-kit.json"), JSON.stringify(kit, null, 2) + "\n");
  writeCreatorKitPage(siteDir, kit);
}

function buildVideoDiscoveryChannels() {
  return {
    koko: {
      title: "Koko's Forest Adventure",
      audience: "Mandarin-speaking families learning English",
      languagePair: ["en", "zh"],
      storyWorld: "https://fursay.com/koko",
      localizedStoryWorlds: {
        en: "https://fursay.com/koko",
        "zh-TW": "https://fursay.com/zh/koko",
        ar: "https://fursay.com/ar/koko",
      },
      youtubeChannel: "https://www.youtube.com/@KokosForest",
      channelId: "UC0X4CIwf6KoUMoIHwRxN3jw",
      uploadsPlaylistId: "UU0X4CIwf6KoUMoIHwRxN3jw",
      youtubeVideos: "https://www.youtube.com/@KokosForest/videos",
      youtubePlaylists: "https://www.youtube.com/@KokosForest/playlists",
      playlistName: "Koko's Forest Adventure uploads",
      playlistEmbed: "https://www.youtube-nocookie.com/embed/videoseries?list=UU0X4CIwf6KoUMoIHwRxN3jw",
      subscribeShortlink: "https://fursay.com/sample/koko",
      creatorShortlink: "https://fursay.com/creator/koko/youtube",
      qrSvg: "https://fursay.com/images/qr/share-koko.svg",
      structuredDataAction: "https://fursay.com/koko?subscribe=koko&utm_source=structured_data&utm_medium=site&utm_campaign=koko_story_funnel&utm_content=koko_sample_pack_schema",
      sameAs: [
        "https://fursay.com/koko",
        "https://www.youtube.com/@KokosForest",
        "https://www.youtube.com/@KokosForest/videos",
        "https://www.youtube.com/@KokosForest/playlists",
      ],
      subscribeAction: {
        type: "SubscribeAction",
        target: "https://fursay.com/koko?subscribe=koko&utm_source=structured_data&utm_medium=site&utm_campaign=koko_story_funnel&utm_content=koko_sample_pack_schema",
        shortlink: "https://fursay.com/sample/koko",
        campaign: "koko_story_funnel",
      },
    },
    noor: {
      title: "Arabic Kids Chinese Picture Book",
      audience: "Arabic-speaking families learning Chinese",
      languagePair: ["ar", "zh"],
      storyWorld: "https://fursay.com/arabic",
      localizedStoryWorlds: {
        en: "https://fursay.com/arabic",
        "zh-TW": "https://fursay.com/zh/arabic",
        ar: "https://fursay.com/ar/arabic",
      },
      youtubeChannel: "https://www.youtube.com/@ArabicKidsChinese",
      channelId: "UCOxmnonpfBvpiV8Vg5LEiYw",
      uploadsPlaylistId: "UUOxmnonpfBvpiV8Vg5LEiYw",
      youtubeVideos: "https://www.youtube.com/@ArabicKidsChinese/videos",
      youtubePlaylists: "https://www.youtube.com/@ArabicKidsChinese/playlists",
      playlistName: "Arabic Kids Chinese Picture Book uploads",
      playlistEmbed: "https://www.youtube-nocookie.com/embed/videoseries?list=UUOxmnonpfBvpiV8Vg5LEiYw",
      subscribeShortlink: "https://fursay.com/sample/noor",
      creatorShortlink: "https://fursay.com/creator/noor/youtube",
      qrSvg: "https://fursay.com/images/qr/share-noor.svg",
      structuredDataAction: "https://fursay.com/arabic?subscribe=noor&utm_source=structured_data&utm_medium=site&utm_campaign=noor_story_funnel&utm_content=noor_sample_pack_schema",
      sameAs: [
        "https://fursay.com/arabic",
        "https://www.youtube.com/@ArabicKidsChinese",
        "https://www.youtube.com/@ArabicKidsChinese/videos",
        "https://www.youtube.com/@ArabicKidsChinese/playlists",
      ],
      subscribeAction: {
        type: "SubscribeAction",
        target: "https://fursay.com/arabic?subscribe=noor&utm_source=structured_data&utm_medium=site&utm_campaign=noor_story_funnel&utm_content=noor_sample_pack_schema",
        shortlink: "https://fursay.com/sample/noor",
        campaign: "noor_story_funnel",
      },
    },
  };
}

function writeVideoDiscovery(siteDir, source) {
  const manifest = {
    site: "Fursay",
    origin: "https://fursay.com",
    platform: "cloudflare-workers-static-assets",
    updatedAt: taipeiDateString(),
    source,
    purpose: "Search and creator discovery manifest for Fursay story-world video libraries, playlist embeds, and tracked story-pack subscription paths.",
    safety: {
      subscriptionEndpoint: "/api/subscribe",
      smokeSubmitsToMailerLite: false,
      externalVideoHost: "youtube",
    },
    channels: buildVideoDiscoveryChannels(),
  };
  writeFileSync(resolve(siteDir, "video-discovery.json"), JSON.stringify(manifest, null, 2) + "\n");
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function campaignName(pack) {
  return pack === "koko" ? "Koko" : "Noor";
}

function creatorCopyBlock(title, value) {
  return `<article>
            <div class="creator-copy-heading">
              <h3>${escapeHtml(title)}</h3>
              <button type="button" class="creator-copy-button" data-copy-creator-kit data-copy-value="${escapeHtml(value)}">Copy</button>
            </div>
            <pre>${escapeHtml(value)}</pre>
          </article>`;
}

function creatorLinkRow(title, value) {
  return `<div>
                <dt>${escapeHtml(title)}</dt>
                <dd>
                  <a href="${escapeHtml(value)}">${escapeHtml(value)}</a>
                  <button type="button" class="creator-link-copy" data-copy-creator-kit data-copy-value="${escapeHtml(value)}">Copy</button>
                </dd>
              </div>`;
}

function placementRows(placementLinks) {
  return Object.entries(placementLinks).map(([key, link]) => `
              ${creatorLinkRow(key, link.shortlink)}`).join("");
}

function videoDiscoveryRows(videoDiscovery) {
  return Object.entries(videoDiscovery).map(([key, value]) => `
              ${creatorLinkRow(key, value)}`).join("");
}

function directSocialRows(directSocialShare) {
  return Object.entries(directSocialShare || {}).map(([key, value]) => `
              ${creatorLinkRow(`${key} share URL`, value)}`).join("");
}

function writeCreatorKitPage(siteDir, kit) {
  const packCards = Object.entries(kit.packs).map(([pack, item]) => `
      <section class="creator-pack" data-creator-kit-pack="${escapeHtml(pack)}">
        <div class="creator-pack-copy">
          <p class="creator-eyebrow">${escapeHtml(item.campaign)}</p>
          <h2>${escapeHtml(campaignName(pack))} creator kit</h2>
          <p>${escapeHtml(item.audience)}</p>
          <dl>
            ${creatorLinkRow("Creator shortlink", item.creatorShortlink)}
            ${creatorLinkRow("Sample shortlink", item.sampleShortlink)}
            ${creatorLinkRow("Family share shortlink", item.shareShortlink)}
            ${creatorLinkRow("Bio shortlink", item.bioShortlink)}
            ${creatorLinkRow("Tracked landing", item.trackedLandingUrl)}
            ${creatorLinkRow("Sample QR asset", item.qrSvg)}
            ${creatorLinkRow("Share QR asset", item.shareQrSvg)}
            ${directSocialRows(item.directSocialShare)}
            ${placementRows(item.placementLinks)}
            ${videoDiscoveryRows(item.videoDiscovery)}
          </dl>
        </div>
        <div class="creator-copy-blocks">
          ${creatorCopyBlock("YouTube description", item.youtubeDescription)}
          ${creatorCopyBlock("Social caption", item.socialCaption)}
          ${creatorCopyBlock("Bio profile copy", item.bioProfileCopy)}
          ${creatorCopyBlock("Family share message", item.familyShareMessage)}
          ${creatorCopyBlock("Newsletter blurb", item.newsletterBlurb)}
        </div>
        <div class="creator-qr-grid" aria-label="${escapeHtml(campaignName(pack))} QR assets">
          <a class="creator-qr" href="${escapeHtml(item.sampleShortlink)}" aria-label="${escapeHtml(item.altText)}">
            <img src="${escapeHtml(new URL(item.qrSvg).pathname)}" alt="${escapeHtml(item.altText)}" width="160" height="160" loading="lazy">
            <span>Sample QR</span>
          </a>
          <a class="creator-qr" href="${escapeHtml(item.shareShortlink)}" aria-label="${escapeHtml(campaignName(pack))} family share QR code for ${escapeHtml(item.shareShortlink)}">
            <img src="${escapeHtml(new URL(item.shareQrSvg).pathname)}" alt="${escapeHtml(campaignName(pack))} family share QR code for ${escapeHtml(item.shareShortlink)}" width="160" height="160" loading="lazy">
            <span>Share QR</span>
          </a>
        </div>
      </section>`).join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fursay Creator Kit</title>
  <meta name="description" content="Reusable Fursay creator links, QR assets, and copy blocks for YouTube descriptions, social captions, and newsletters.">
  <meta name="robots" content="noindex,follow">
  <meta name="theme-color" content="#4CAF7D">
  <link rel="canonical" href="https://fursay.com/creator-kit">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/css/picture-book-base.css">
  <link rel="stylesheet" href="/css/picture-world-shared-20260612-traffic10.css">
</head>
<body class="picture-world creator-kit-page">
  <main class="creator-kit-shell">
    <header class="creator-kit-hero">
      <p class="creator-eyebrow">Fursay traffic kit</p>
      <h1>Creator Kit</h1>
      <p>Current reusable links and copy for YouTube descriptions, social captions, newsletter handoffs, and QR posters.</p>
      <div class="creator-kit-meta">
        <span>Updated ${escapeHtml(kit.updatedAt)}</span>
        <span>Commit ${escapeHtml(kit.source.commit)}</span>
        <a href="/creator-kit.json">JSON manifest</a>
      </div>
    </header>
    <section class="creator-kit-safety">
      <h2>Safety contract</h2>
      <p>Smoke checks do not submit to MailerLite. Subscription traffic still flows through <code>${escapeHtml(kit.safety.subscriptionEndpoint)}</code>.</p>
    </section>
${packCards}
  </main>
  <script>
    document.addEventListener("click", async (event) => {
      const button = event.target.closest("[data-copy-creator-kit]");
      if (!button) return;
      const value = button.getAttribute("data-copy-value") || "";
      try {
        await navigator.clipboard.writeText(value);
        button.textContent = "Copied";
        setTimeout(() => { button.textContent = "Copy"; }, 1600);
      } catch {
        button.textContent = "Copy failed";
        setTimeout(() => { button.textContent = "Copy"; }, 1800);
      }
    });
  </script>
</body>
</html>`;
  writeFileSync(resolve(siteDir, "creator-kit.html"), html + "\n");
}

async function main() {
  const args = parseArgs();
  const outRoot = `/tmp/fursay-release-${stamp}`;
  ensureOutDir(outRoot);

  writeReleaseManifest();

  run("node", ["--check", "src/worker.js"]);
  run("node", ["--check", "scripts/check-fursay-funnel.mjs"]);
  run("node", ["--check", "scripts/check-noor-list-activation.mjs"]);
  run("node", ["--check", "scripts/check-newsletter-traffic-kit.mjs"]);
  run("node", ["--check", "scripts/check-cache-headers.mjs"]);
  run("node", ["--check", "scripts/check-deploy-readiness.mjs"]);
  run("node", ["scripts/check-deploy-readiness.mjs"]);

  run("node", ["scripts/check-fursay-funnel.mjs", "--out-dir", join(outRoot, "funnel-local")]);
  run("node", ["scripts/check-noor-list-activation.mjs", "--out-dir", join(outRoot, "noor-local")]);
  run("node", ["scripts/check-newsletter-traffic-kit.mjs", "--out-dir", join(outRoot, "newsletter-traffic-kit-local")]);

  if (!args.skipDeploy) {
    run("npx", ["wrangler", "deploy"]);
  }

  if (!args.skipLive) {
    run("node", ["scripts/check-fursay-funnel.mjs", "--base-url", args.baseUrl, "--out-dir", join(outRoot, "funnel-live")]);
    run("node", ["scripts/check-noor-list-activation.mjs", "--base-url", args.baseUrl, "--out-dir", join(outRoot, "noor-live")]);
    run("node", ["scripts/check-newsletter-traffic-kit.mjs", "--base-url", args.baseUrl, "--out-dir", join(outRoot, "newsletter-traffic-kit-live")]);
    run("node", ["scripts/check-cache-headers.mjs", "--base-url", args.baseUrl, "--out-dir", join(outRoot, "cache-live")]);
    const auditOut = join(outRoot, "audit-live.json");
    const auditJson = run("node", ["audit-fursay.mjs", args.baseUrl], { capture: true });
    writeFileSync(auditOut, auditJson);
    const pages = JSON.parse(auditJson);
    const bad = pages.filter((page) => (
      page.status >= 400
      || page.brokenImages?.length
      || page.externalBlankNoNoopener?.length
      || page.bodyOverflow
      || page.consoleMessages?.some((message) => message.type === "error")
      || page.failedRequests?.length
      || page.badStatuses?.length
    ));
    if (bad.length) throw new Error(`Live audit found ${bad.length} bad page(s); see ${auditOut}`);
    console.log(`Live audit passed: ${pages.length} pages, badCount 0 (${auditOut})`);
  }

  if (args.pushGit) {
    const remote = gitRemote();
    if (!remote) {
      throw new Error("No git remote named origin is configured; cannot push.");
    }
    run("git", ["push"]);
  }

  console.log(`\nRelease checks completed. Artifacts: ${outRoot}`);
}

main().catch((error) => {
  console.error(`\nRelease failed: ${error.message}`);
  process.exit(1);
});
