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

const SHORTLINK_PASSTHROUGH_PARAMS = ["utm_term", "ref", "source_id", "creator", "placement"];

function shortlinkRoutes() {
  return [
    { path: "/join/koko", target: "/koko", pack: "koko", campaign: "koko_story_funnel", content: "join_koko" },
    { path: "/join/noor", target: "/arabic", pack: "noor", campaign: "noor_story_funnel", content: "join_noor" },
    { path: "/sample/koko", target: "/koko", pack: "koko", campaign: "koko_story_funnel", content: "sample_koko" },
    { path: "/sample/noor", target: "/arabic", pack: "noor", campaign: "noor_story_funnel", content: "sample_noor" },
    { path: "/share/koko", target: "/koko", pack: "koko", source: "family_share", medium: "share", campaign: "koko_story_funnel", content: "share_sample_koko" },
    { path: "/share/noor", target: "/arabic", pack: "noor", source: "family_share", medium: "share", campaign: "noor_story_funnel", content: "share_sample_noor" },
    { path: "/bio/koko", target: "/koko", pack: "koko", source: "social_profile", medium: "bio", campaign: "koko_story_funnel", content: "bio_koko" },
    { path: "/bio/noor", target: "/arabic", pack: "noor", source: "social_profile", medium: "bio", campaign: "noor_story_funnel", content: "bio_noor" },
    { path: "/creator/koko", target: "/koko", pack: "koko", source: "creator_kit", medium: "description", campaign: "koko_story_funnel", content: "creator_kit_sample" },
    { path: "/creator/koko/youtube", target: "/koko", pack: "koko", source: "youtube", medium: "description", campaign: "koko_story_funnel", content: "creator_kit_youtube" },
    { path: "/creator/koko/social", target: "/koko", pack: "koko", source: "social", medium: "profile", campaign: "koko_story_funnel", content: "creator_kit_social" },
    { path: "/creator/koko/newsletter", target: "/koko", pack: "koko", source: "newsletter", medium: "email", campaign: "koko_story_funnel", content: "creator_kit_newsletter" },
    { path: "/creator/noor", target: "/arabic", pack: "noor", source: "creator_kit", medium: "description", campaign: "noor_story_funnel", content: "creator_kit_sample" },
    { path: "/creator/noor/youtube", target: "/arabic", pack: "noor", source: "youtube", medium: "description", campaign: "noor_story_funnel", content: "creator_kit_youtube" },
    { path: "/creator/noor/social", target: "/arabic", pack: "noor", source: "social", medium: "profile", campaign: "noor_story_funnel", content: "creator_kit_social" },
    { path: "/creator/noor/newsletter", target: "/arabic", pack: "noor", source: "newsletter", medium: "email", campaign: "noor_story_funnel", content: "creator_kit_newsletter" },
  ];
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
      deployReadinessManifest: "https://fursay.com/deploy-readiness.json",
      deployReadinessPage: "https://fursay.com/deploy-readiness",
      campaignManifest: "https://fursay.com/campaigns.json",
      creatorKitManifest: "https://fursay.com/creator-kit.json",
      creatorKitPage: "https://fursay.com/creator-kit",
      shareKitManifest: "https://fursay.com/share-kit.json",
      shareKitPage: "https://fursay.com/share-kit",
      trafficLaunchManifest: "https://fursay.com/traffic-launch.json",
      trafficLaunchPage: "https://fursay.com/traffic-launch",
      linksManifest: "https://fursay.com/links.json",
      linksPage: "https://fursay.com/links",
      videoDiscoveryManifest: "https://fursay.com/video-discovery.json",
      shortlinkManifest: "https://fursay.com/shortlinks.json",
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
      "scripts/check-localized-cta-contract.mjs",
      "scripts/check-event-tracking-contract.mjs",
      "scripts/check-subscribe-api-contract.mjs",
      "scripts/check-content-structure-contract.mjs",
      "scripts/check-semantic-funnel-contract.mjs",
      "scripts/check-site-structure-contract.mjs",
      "scripts/check-hero-preload-contract.mjs",
      "scripts/check-visual-layout-contract.mjs",
      "scripts/check-web-vitals-contract.mjs",
      "scripts/check-internal-links-contract.mjs",
      "scripts/check-newsletter-traffic-kit.mjs",
      "scripts/check-public-kit-parity.mjs",
      "scripts/check-amazon-affiliate-links.mjs",
      "scripts/check-worker-shortlinks.mjs",
      "scripts/check-structured-data.mjs",
      "scripts/check-social-preview-contract.mjs",
      "scripts/check-head-metadata.mjs",
      "scripts/check-accessibility-contract.mjs",
      "scripts/check-discovery-contract.mjs",
      "scripts/check-security-headers.mjs",
      "scripts/check-release-consistency.mjs",
      "scripts/check-doc-manifest-drift.mjs",
      "scripts/check-render-jobs.mjs",
      "scripts/check-static-asset-structure.mjs",
      "scripts/check-image-assets.mjs",
      "scripts/check-cache-headers.mjs",
      "scripts/check-deploy-readiness.mjs",
      "audit-fursay.mjs",
    ],
    liveExpectations: {
      pages: 9,
      funnelChecks: 41,
      amazonAffiliateLinks: 25,
      amazonAffiliateTag: "parenttechche-20",
      booksAffiliateLinks: 12,
      booksAffiliateId: "arthur0858",
      eventTrackingPages: 9,
      affiliateEventTrackingPages: 9,
      eventTrackingSubmitPages: 3,
      webVitalsChecks: 18,
      cacheHeaderChecks: 53,
      badAuditCount: 0,
      liveSmokeCallsMailerLite: false,
    },
  };
  writeFileSync(resolve(siteDir, "release.json"), JSON.stringify(manifest, null, 2) + "\n");
  writeDeployReadinessManifest(siteDir, source);
  writeSitemap(siteDir);
  writeCampaignManifest(siteDir, source);
  writeLinksManifest(siteDir, source);
  writeShareKit(siteDir, source);
  writeTrafficLaunchKit(siteDir, source);
  writeVideoDiscovery(siteDir, source);
  writeShortlinkManifest(siteDir, source);
}

function writeDeployReadinessManifest(siteDir, source) {
  const remote = gitRemote();
  const hasCloudflareToken = Boolean(process.env.CLOUDFLARE_API_TOKEN);
  const hasCloudflareAccount = Boolean(process.env.CLOUDFLARE_ACCOUNT_ID);
  const warnings = [];
  if (!remote) warnings.push("git_missing_origin_remote");
  if (!hasCloudflareToken) warnings.push("missing_CLOUDFLARE_API_TOKEN");
  if (!hasCloudflareAccount) warnings.push("missing_CLOUDFLARE_ACCOUNT_ID");
  const manifest = {
    site: "Fursay",
    origin: "https://fursay.com",
    platform: "cloudflare-workers-static-assets",
    updatedAt: taipeiDateString(),
    source,
    deployment: {
      workerName: "fursay",
      assetsBinding: "ASSETS",
      releaseCommand: "node scripts/release-fursay.mjs",
      localGateCommand: "npm run check",
      liveSmokeCommand: "npm run smoke:live",
      deployReadinessCommand: "npm run deploy:ready",
      autoDeployWorkflow: ".github/workflows/deploy-worker.yml",
      runbook: "docs/cloudflare-deploy-runbook.md",
    },
    requiredSecrets: [
      "CLOUDFLARE_API_TOKEN",
      "CLOUDFLARE_ACCOUNT_ID",
    ],
    evidence: {
      hasOriginRemote: Boolean(remote),
      hasCloudflareToken,
      hasCloudflareAccount,
      tokenValuesPublished: false,
      accountValuesPublished: false,
    },
    strictGates: {
      requireRemote: "npm run deploy:ready -- --require-remote",
      requireCloudflare: "npm run deploy:ready -- --require-cloudflare",
      requirePushDeploy: "npm run deploy:ready -- --require-remote --require-cloudflare",
    },
    safety: {
      failClosed: true,
      smokeSubmitsToMailerLite: false,
      releaseArtifacts: "/tmp/fursay-release-*",
      artifactRetentionDays: 14,
    },
    status: {
      localDeployReady: true,
      githubPushDeployProven: Boolean(remote && hasCloudflareToken && hasCloudflareAccount),
      warnings,
    },
  };
  writeFileSync(resolve(siteDir, "deploy-readiness.json"), JSON.stringify(manifest, null, 2) + "\n");
  writeDeployReadinessPage(siteDir, manifest);
}

function deployStatusLabel(manifest) {
  return manifest.status.githubPushDeployProven ? "Push deploy ready" : "Local deploy ready";
}

function deployReadinessRow(label, value) {
  return `<div>
                <dt>${escapeHtml(label)}</dt>
                <dd>${escapeHtml(value)}</dd>
              </div>`;
}

function writeDeployReadinessPage(siteDir, manifest) {
  const warnings = manifest.status.warnings.length
    ? manifest.status.warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("\n")
    : "<li>No readiness warnings.</li>";
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fursay Deploy Readiness</title>
  <meta name="description" content="Current Fursay Cloudflare Workers Static Assets deploy readiness, safe gates, and public release evidence.">
  <meta name="robots" content="noindex,follow">
  <meta name="theme-color" content="#4CAF7D">
  <link rel="canonical" href="https://fursay.com/deploy-readiness">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/css/picture-book-base-20260613-base1.css">
  <link rel="stylesheet" href="/css/picture-world-shared-20260613-traffic11.css">
</head>
<body class="picture-world creator-kit-page deploy-readiness-page">
  <main class="creator-kit-shell">
    <header class="creator-kit-hero">
      <p class="creator-eyebrow">Fursay deployment</p>
      <h1>Deploy Readiness</h1>
      <p>${escapeHtml(deployStatusLabel(manifest))}. This page publishes gate names and status only, never secret values.</p>
      <div class="creator-kit-meta">
        <span>Updated ${escapeHtml(manifest.updatedAt)}</span>
        <span>Commit ${escapeHtml(manifest.source.commit)}</span>
        <a href="/deploy-readiness.json">JSON manifest</a>
      </div>
    </header>
    <section class="creator-kit-safety">
      <h2>Current status</h2>
      <dl>
        ${deployReadinessRow("Platform", manifest.platform)}
        ${deployReadinessRow("Worker", manifest.deployment.workerName)}
        ${deployReadinessRow("Assets binding", manifest.deployment.assetsBinding)}
        ${deployReadinessRow("Local deploy ready", String(manifest.status.localDeployReady))}
        ${deployReadinessRow("GitHub push deploy proven", String(manifest.status.githubPushDeployProven))}
        ${deployReadinessRow("Local gate", manifest.deployment.localGateCommand)}
        ${deployReadinessRow("Live smoke", manifest.deployment.liveSmokeCommand)}
        ${deployReadinessRow("Push deploy proof", manifest.strictGates.requirePushDeploy)}
      </dl>
    </section>
    <section class="creator-kit-safety">
      <h2>Warnings</h2>
      <ul>
${warnings}
      </ul>
    </section>
    <section class="creator-kit-safety">
      <h2>Safety contract</h2>
      <p>Release artifacts use <code>${escapeHtml(manifest.safety.releaseArtifacts)}</code>. Smoke checks do not submit to MailerLite. Secret values are not published.</p>
    </section>
  </main>
</body>
</html>`;
  writeFileSync(resolve(siteDir, "deploy-readiness.html"), html + "\n");
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
  const whatsappUrl = `${shareUrl}?ref=whatsapp&placement=direct_social_share`;
  const lineUrl = `${shareUrl}?ref=line&placement=direct_social_share`;
  const label = pack === "koko" ? "Koko weekly story pack" : "Noor 3-minute story pack";
  return {
    whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(`${label}: ${whatsappUrl}`)}`,
    line: `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(lineUrl)}`,
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
        "koko_hero_weekly_pack",
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
        qrLabel: "Noor 3-minute story pack",
        shortHeadline: "Get Noor's 3-minute Chinese story pack",
        videoDescription: "Get the free Noor 3-minute story pack: https://fursay.com/sample/noor",
        familyShareText: "Noor's Arabic Kids Chinese 3-minute pack is ready for family story time: https://fursay.com/sample/noor",
        familyShareMessage: "Noor's Arabic Kids Chinese 3-minute pack is ready for family story time: https://fursay.com/share/noor",
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
        "arabic_hero_weekly_pack",
        "arabic_episode_story_pack",
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

function linkCard(title, description, primary, secondary, youtube) {
  return {
    title,
    description,
    primaryAction: primary,
    secondaryAction: secondary,
    youtube,
  };
}

function writeLinksManifest(siteDir, source) {
  const campaignManifest = readJson(resolve(siteDir, "campaigns.json"));
  const campaigns = campaignManifest.campaigns || {};
  const links = {
    site: "Fursay",
    origin: "https://fursay.com",
    platform: "cloudflare-workers-static-assets",
    updatedAt: taipeiDateString(),
    source,
    purpose: "Public social-profile landing page that lets families choose Koko or Noor before opening a tracked story-pack signup path.",
    safety: {
      subscriptionEndpoint: "/api/subscribe",
      smokeSubmitsToMailerLite: false,
      primaryLinksUseTrackedShortlinks: true,
      manifest: "https://fursay.com/links.json",
    },
    primaryRoute: "https://fursay.com/links",
    packs: {
      koko: linkCard(
        "Koko weekly English story pack",
        "English stories and parent prompts for Mandarin-speaking families.",
        {
          label: "Get Koko's weekly pack",
          url: campaigns.koko.shortlinks.sample,
          pack: "koko",
          attribution: {
            utm_source: "shortlink",
            utm_medium: "direct",
            utm_campaign: campaigns.koko.campaign,
            utm_content: "sample_koko",
          },
        },
        {
          label: "Share Koko with another family",
          url: campaigns.koko.shortlinks.share,
        },
        "https://www.youtube.com/@KokosForest",
      ),
      noor: linkCard(
        "Noor 3-minute Chinese story pack",
        "Chinese stories with Pinyin support for Arabic-speaking families.",
        {
          label: "Get Noor's 3-minute pack",
          url: campaigns.noor.shortlinks.sample,
          pack: "noor",
          attribution: {
            utm_source: "shortlink",
            utm_medium: "direct",
            utm_campaign: campaigns.noor.campaign,
            utm_content: "sample_noor",
          },
        },
        {
          label: "Share Noor with another family",
          url: campaigns.noor.shortlinks.share,
        },
        "https://www.youtube.com/@ArabicKidsChinese",
      ),
    },
    operations: {
      shareKit: {
        label: "Share kit",
        url: "https://fursay.com/share-kit",
      },
      creatorKit: {
        label: "Creator kit",
        url: "https://fursay.com/creator-kit",
      },
      trafficLaunchKit: {
        label: "Traffic launch kit",
        url: "https://fursay.com/traffic-launch",
      },
      deployReadiness: {
        label: "Deploy readiness",
        url: "https://fursay.com/deploy-readiness",
      },
    },
  };
  writeFileSync(resolve(siteDir, "links.json"), JSON.stringify(links, null, 2) + "\n");
  writeLinksPage(siteDir, links);
}

function linksActionRow(item) {
  return `<a class="creator-link-copy" href="${escapeHtml(item.url)}">${escapeHtml(item.label)}</a>`;
}

function linksValueRow(title, label, value) {
  return `<div>
                <dt>${escapeHtml(title)}</dt>
                <dd>
                  <a href="${escapeHtml(value)}">${escapeHtml(label)}</a>
                  <button type="button" class="creator-link-copy" data-copy-share-kit data-copy-value="${escapeHtml(value)}">Copy</button>
                </dd>
              </div>`;
}

function linksPackCard(pack, item) {
  return `<article class="creator-copy-block social-link-card" data-social-links-pack="${escapeHtml(pack)}">
            <div class="creator-copy-heading">
              <h2>${escapeHtml(item.title)}</h2>
              <a class="creator-copy-button" data-social-primary-link="${escapeHtml(pack)}" href="${escapeHtml(item.primaryAction.url)}">${escapeHtml(item.primaryAction.label)}</a>
            </div>
            <p>${escapeHtml(item.description)}</p>
            <dl>
              ${linksValueRow("Primary tracked link", item.primaryAction.label, item.primaryAction.url)}
              ${linksValueRow("Family share link", item.secondaryAction.label, item.secondaryAction.url)}
              ${linksValueRow("YouTube channel", item.youtube, item.youtube)}
            </dl>
          </article>`;
}

function writeLinksPage(siteDir, links) {
  const packCards = Object.entries(links.packs).map(([pack, item]) => linksPackCard(pack, item)).join("\n");
  const operationLinks = Object.values(links.operations).map((item) => linksActionRow(item)).join("\n          ");
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fursay Links</title>
  <meta name="description" content="Choose a Fursay story pack: Koko English stories or Noor Arabic-Chinese stories, with tracked signup and share links.">
  <meta property="og:title" content="Fursay story pack links">
  <meta property="og:description" content="Choose Koko or Noor and get a free family story pack.">
  <meta property="og:url" content="https://fursay.com/links">
  <meta property="og:image" content="https://fursay.com/og-image.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="Fursay story pack chooser preview">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Fursay story pack links">
  <meta name="twitter:description" content="Choose Koko or Noor and get a free family story pack.">
  <meta name="twitter:image" content="https://fursay.com/og-image.png">
  <meta name="twitter:image:alt" content="Fursay story pack chooser preview">
  <meta name="theme-color" content="#4CAF7D">
  <link rel="canonical" href="https://fursay.com/links">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/css/picture-book-base-20260613-base1.css">
  <link rel="stylesheet" href="/css/picture-world-shared-20260613-traffic11.css">
</head>
<body class="picture-world creator-kit-page social-links-page">
  <main class="creator-kit-shell">
    <header class="creator-kit-hero">
      <p class="creator-eyebrow">Fursay start here</p>
      <h1>Choose Your Story Pack</h1>
      <p>Pick Koko for English story time or Noor for Arabic-Chinese story time. Each button opens a tracked signup path with the right pack preselected.</p>
      <div class="creator-kit-meta">
        <span>Updated ${escapeHtml(links.updatedAt)}</span>
        <span>Commit ${escapeHtml(links.source.commit)}</span>
        <a href="/links.json">JSON manifest</a>
      </div>
    </header>
    <section class="creator-pack" data-social-links-page>
      <div class="creator-pack-copy">
        <p class="creator-eyebrow">Social profile landing</p>
        <h2>One link for family discovery</h2>
        <p>Use <strong>fursay.com/links</strong> in bios, QR posters, and social profiles when families should choose a story world first.</p>
        <div class="public-share-actions">
          ${operationLinks}
        </div>
      </div>
      <div class="creator-copy-blocks">
${packCards}
      </div>
    </section>
    <section class="creator-kit-safety">
      <h2>Safety contract</h2>
      <p>Smoke checks do not submit to MailerLite. Subscription traffic still flows through <code>${escapeHtml(links.safety.subscriptionEndpoint)}</code>.</p>
    </section>
  </main>
</body>
</html>`;
  writeFileSync(resolve(siteDir, "links.html"), html + "\n");
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
      shortlinkManifest: "https://fursay.com/shortlinks.json",
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

function writeShareKit(siteDir, source) {
  const campaignManifest = readJson(resolve(siteDir, "campaigns.json"));
  const packs = Object.fromEntries(Object.entries(campaignManifest.campaigns || {}).map(([pack, campaign]) => {
    const copy = campaign.copyKit || {};
    return [pack, {
      title: pack === "koko" ? "Koko weekly English story pack" : "Noor 3-minute Chinese story pack",
      audience: campaign.audience,
      campaign: campaign.campaign,
      storyWorld: campaign.landingPages?.storyWorld || "",
      sampleShortlink: campaign.shortlinks?.sample || "",
      familyShareShortlink: campaign.shortlinks?.share || "",
      bioShortlink: campaign.shortlinks?.bio || "",
      creatorShortlink: campaign.shortlinks?.creator || "",
      whatsappShareUrl: copy.whatsappShareUrl || "",
      lineShareUrl: copy.lineShareUrl || "",
      sampleQrSvg: copy.qrSvg || "",
      shareQrSvg: copy.shareQrSvg || "",
      familyShareMessage: copy.familyShareMessage || "",
      bioProfileCopy: copy.bioProfileCopy || "",
      shortHeadline: copy.shortHeadline || "",
      attribution: {
        utm_source: "family_share",
        utm_medium: "share",
        utm_campaign: campaign.campaign,
        utm_content: `share_sample_${pack}`,
      },
    }];
  }));
  const kit = {
    site: "Fursay",
    origin: "https://fursay.com",
    platform: "cloudflare-workers-static-assets",
    updatedAt: taipeiDateString(),
    source,
    purpose: "Public family sharing kit with copy-ready Fursay story-pack links, social share URLs, QR assets, and attribution contract.",
    safety: {
      subscriptionEndpoint: "/api/subscribe",
      smokeSubmitsToMailerLite: false,
      linksUseShortlinksWithUtmRedirects: true,
      shortlinkManifest: "https://fursay.com/shortlinks.json",
    },
    packs,
  };
  writeFileSync(resolve(siteDir, "share-kit.json"), JSON.stringify(kit, null, 2) + "\n");
  writeShareKitPage(siteDir, kit);
}

function trafficLaunchChannelRows(channels) {
  return channels.map((channel) => `
          <article class="creator-copy-block" data-traffic-launch-channel="${escapeHtml(channel.channel)}">
            <div class="creator-copy-heading">
              <h3>${escapeHtml(channel.label)}</h3>
              <button type="button" class="creator-copy-button" data-copy-traffic-launch data-copy-value="${escapeHtml(channel.publishCopyTemplate)}">Copy tracked copy</button>
            </div>
            <p>${escapeHtml(channel.checkpoint)}</p>
            <dl>
              ${shareKitLinkRow("Tracked link", channel.link)}
              ${shareKitLinkRow("Source ID example", channel.exampleUrl)}
            </dl>
            <pre>${escapeHtml(channel.copy)}</pre>
            <pre>${escapeHtml(channel.linkTemplate)}</pre>
            <pre>${escapeHtml(channel.publishCopyTemplate)}</pre>
          </article>`).join("\n");
}

function buildTrafficLaunchKit(siteDir, source) {
  const campaignManifest = readJson(resolve(siteDir, "campaigns.json"));
  const creatorKit = readJson(resolve(siteDir, "creator-kit.json"));
  const shareKit = readJson(resolve(siteDir, "share-kit.json"));
  const packs = Object.fromEntries(Object.entries(campaignManifest.campaigns || {}).map(([pack, campaign]) => {
    const creatorPack = creatorKit.packs?.[pack] || {};
    const sharePack = shareKit.packs?.[pack] || {};
    const channel = pack === "koko" ? "Koko" : "Noor";
    const sourceIdExample = pack === "koko" ? "koko_ep001" : "noor_ep001";
    const withSource = (link, placement) => `${link}?source_id=${sourceIdExample}&creator=fursay&placement=${placement}`;
    const template = (link, placement) => `${link}?source_id={episode_or_post_id}&creator=fursay&placement=${placement}`;
    const templatedCopy = (copy, link, linkTemplate) => {
      if (!copy) return linkTemplate;
      return copy.includes(link) ? copy.replace(link, linkTemplate) : `${copy}\n${linkTemplate}`;
    };
    const channels = [
      {
        channel: "youtube_description",
        label: "YouTube description",
        link: creatorPack.placementLinks?.youtubeDescription?.shortlink || "",
        linkTemplate: template(creatorPack.placementLinks?.youtubeDescription?.shortlink || "", "youtube_description"),
        exampleUrl: withSource(creatorPack.placementLinks?.youtubeDescription?.shortlink || "", "youtube_description"),
        copy: creatorPack.youtubeDescription || "",
        publishCopyTemplate: templatedCopy(
          creatorPack.youtubeDescription || "",
          creatorPack.placementLinks?.youtubeDescription?.shortlink || "",
          template(creatorPack.placementLinks?.youtubeDescription?.shortlink || "", "youtube_description"),
        ),
        checkpoint: "Paste under the episode description and confirm the shortlink opens a preselected signup modal.",
        attribution: {
          utm_source: "youtube",
          utm_medium: "description",
          utm_campaign: campaign.campaign,
          utm_content: "creator_kit_youtube",
        },
      },
      {
        channel: "social_profile",
        label: "Social caption or profile",
        link: creatorPack.placementLinks?.socialCaption?.shortlink || "",
        linkTemplate: template(creatorPack.placementLinks?.socialCaption?.shortlink || "", "social_profile"),
        exampleUrl: withSource(creatorPack.placementLinks?.socialCaption?.shortlink || "", "social_profile"),
        copy: creatorPack.socialCaption || "",
        publishCopyTemplate: templatedCopy(
          creatorPack.socialCaption || "",
          creatorPack.placementLinks?.socialCaption?.shortlink || "",
          template(creatorPack.placementLinks?.socialCaption?.shortlink || "", "social_profile"),
        ),
        checkpoint: "Use for profile copy or a post caption, then verify the redirect keeps the social attribution.",
        attribution: {
          utm_source: "social",
          utm_medium: "profile",
          utm_campaign: campaign.campaign,
          utm_content: "creator_kit_social",
        },
      },
      {
        channel: "newsletter_email",
        label: "Newsletter blurb",
        link: creatorPack.placementLinks?.newsletterBlurb?.shortlink || "",
        linkTemplate: template(creatorPack.placementLinks?.newsletterBlurb?.shortlink || "", "newsletter_email"),
        exampleUrl: withSource(creatorPack.placementLinks?.newsletterBlurb?.shortlink || "", "newsletter_email"),
        copy: creatorPack.newsletterBlurb || "",
        publishCopyTemplate: templatedCopy(
          creatorPack.newsletterBlurb || "",
          creatorPack.placementLinks?.newsletterBlurb?.shortlink || "",
          template(creatorPack.placementLinks?.newsletterBlurb?.shortlink || "", "newsletter_email"),
        ),
        checkpoint: "Place in MailerLite body copy only after the target group has at least one active subscriber.",
        attribution: {
          utm_source: "newsletter",
          utm_medium: "email",
          utm_campaign: campaign.campaign,
          utm_content: "creator_kit_newsletter",
        },
      },
      {
        channel: "family_share",
        label: "Family share message",
        link: sharePack.familyShareShortlink || "",
        linkTemplate: template(sharePack.familyShareShortlink || "", "family_share"),
        exampleUrl: withSource(sharePack.familyShareShortlink || "", "family_share"),
        copy: sharePack.familyShareMessage || "",
        publishCopyTemplate: templatedCopy(
          sharePack.familyShareMessage || "",
          sharePack.familyShareShortlink || "",
          template(sharePack.familyShareShortlink || "", "family_share"),
        ),
        checkpoint: "Use for parent-to-parent forwarding; add ref and placement only at the social share surface.",
        attribution: sharePack.attribution || {},
      },
      {
        channel: "qr_poster",
        label: "QR poster link",
        link: sharePack.shareQrSvg || "",
        linkTemplate: template(sharePack.familyShareShortlink || "", "qr_poster"),
        exampleUrl: withSource(sharePack.familyShareShortlink || "", "qr_poster"),
        copy: `${channel} family share QR: ${sharePack.familyShareShortlink || ""}`,
        publishCopyTemplate: `${channel} family share QR: ${template(sharePack.familyShareShortlink || "", "qr_poster")}`,
        checkpoint: "Use the QR SVG in printable or community graphics and keep the shortlink visible nearby.",
        attribution: sharePack.attribution || {},
      },
    ];
    return [pack, {
      title: pack === "koko" ? "Koko weekly English story pack" : "Noor 3-minute Chinese story pack",
      campaign: campaign.campaign,
      audience: campaign.audience,
      primaryGoal: campaign.primaryGoal,
      storyWorld: campaign.landingPages?.storyWorld || "",
      sampleShortlink: campaign.shortlinks?.sample || "",
      shareShortlink: campaign.shortlinks?.share || "",
      creatorShortlink: campaign.shortlinks?.creator || "",
      shareKit: "https://fursay.com/share-kit",
      creatorKit: "https://fursay.com/creator-kit",
      sourceIdExample,
      channels,
      preflightChecklist: [
        "Open the tracked link once and confirm the expected story world loads.",
        `Confirm the modal preselects ${channel}.`,
        "Confirm no smoke test submits to MailerLite.",
        "Replace {episode_or_post_id} before publishing when the placement has a known video, email, or post ID.",
        "Use one channel-specific link per placement so attribution stays readable.",
      ],
    }];
  }));
  return {
    site: "Fursay",
    origin: "https://fursay.com",
    platform: "cloudflare-workers-static-assets",
    updatedAt: taipeiDateString(),
    source,
    purpose: "Public launch checklist for moving each Fursay story pack through YouTube, social, newsletter, family share, and QR placements with tracked links.",
    safety: {
      subscriptionEndpoint: "/api/subscribe",
      smokeSubmitsToMailerLite: false,
      linksUseShortlinksWithUtmRedirects: true,
      creatorKitManifest: "https://fursay.com/creator-kit.json",
      shareKitManifest: "https://fursay.com/share-kit.json",
      shortlinkManifest: "https://fursay.com/shortlinks.json",
    },
    packs,
  };
}

function writeTrafficLaunchPage(siteDir, kit) {
  const packCards = Object.entries(kit.packs).map(([pack, item]) => `
      <section class="creator-pack" data-traffic-launch-pack="${escapeHtml(pack)}">
        <div class="creator-pack-copy">
          <p class="creator-eyebrow">${escapeHtml(item.campaign)}</p>
          <h2>${escapeHtml(item.title)}</h2>
          <p>${escapeHtml(item.audience)}</p>
          <dl>
            ${shareKitLinkRow("Story world", item.storyWorld)}
            ${shareKitLinkRow("Sample shortlink", item.sampleShortlink)}
            ${shareKitLinkRow("Family share shortlink", item.shareShortlink)}
            ${shareKitLinkRow("Creator shortlink", item.creatorShortlink)}
          </dl>
          <ol>
            ${item.preflightChecklist.map((entry) => `<li>${escapeHtml(entry)}</li>`).join("\n            ")}
          </ol>
        </div>
        <div class="creator-copy-blocks">
${trafficLaunchChannelRows(item.channels)}
        </div>
      </section>`).join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fursay Traffic Launch Kit</title>
  <meta name="description" content="Tracked Fursay launch checklist for YouTube, social, newsletter, family share, and QR placements.">
  <meta name="robots" content="noindex,follow">
  <meta name="theme-color" content="#4CAF7D">
  <link rel="canonical" href="https://fursay.com/traffic-launch">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/css/picture-book-base-20260613-base1.css">
  <link rel="stylesheet" href="/css/picture-world-shared-20260613-traffic11.css">
</head>
<body class="picture-world creator-kit-page traffic-launch-page">
  <main class="creator-kit-shell">
    <header class="creator-kit-hero">
      <p class="creator-eyebrow">Fursay traffic launch kit</p>
      <h1>Traffic Launch Kit</h1>
      <p>Tracked links and copy checkpoints for moving Koko and Noor story packs through the next publishing surface.</p>
      <div class="creator-kit-meta">
        <span>Updated ${escapeHtml(kit.updatedAt)}</span>
        <span>Commit ${escapeHtml(kit.source.commit)}</span>
        <a href="/traffic-launch.json">JSON manifest</a>
      </div>
    </header>
    <section class="creator-kit-safety">
      <h2>Safety contract</h2>
      <p>Smoke checks do not submit to MailerLite. Subscription traffic still flows through <code>${escapeHtml(kit.safety.subscriptionEndpoint)}</code>.</p>
    </section>
${packCards}
  </main>
  <script src="/js/site-shared-20260613-commerce1.js"></script>
</body>
</html>`;
  writeFileSync(resolve(siteDir, "traffic-launch.html"), html + "\n");
}

function writeTrafficLaunchKit(siteDir, source) {
  const kit = buildTrafficLaunchKit(siteDir, source);
  writeFileSync(resolve(siteDir, "traffic-launch.json"), JSON.stringify(kit, null, 2) + "\n");
  writeTrafficLaunchPage(siteDir, kit);
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

function writeShortlinkManifest(siteDir, source) {
  const routes = shortlinkRoutes().map((route) => {
    const landing = new URL(route.target, "https://fursay.com");
    landing.searchParams.set("subscribe", route.pack);
    landing.searchParams.set("utm_source", route.source || "shortlink");
    landing.searchParams.set("utm_medium", route.medium || "direct");
    landing.searchParams.set("utm_campaign", route.campaign);
    landing.searchParams.set("utm_content", route.content);
    return {
      path: route.path,
      shortlink: `https://fursay.com${route.path}`,
      target: landing.toString(),
      targetPath: route.target,
      pack: route.pack,
      status: 302,
      cacheControl: "public, max-age=300, must-revalidate",
      attribution: {
        subscribe: route.pack,
        utm_source: route.source || "shortlink",
        utm_medium: route.medium || "direct",
        utm_campaign: route.campaign,
        utm_content: route.content,
      },
      passthroughParams: SHORTLINK_PASSTHROUGH_PARAMS,
      blockedParams: ["email", "groups", "channel", "subscribe", "utm_source", "utm_medium", "utm_campaign", "utm_content"],
    };
  });
  const manifest = {
    site: "Fursay",
    origin: "https://fursay.com",
    platform: "cloudflare-workers-static-assets",
    updatedAt: taipeiDateString(),
    source,
    purpose: "Machine-readable index of Fursay shortlinks, landing targets, owned attribution values, and safe passthrough query parameters for traffic operations.",
    safety: {
      subscriptionEndpoint: "/api/subscribe",
      smokeSubmitsToMailerLite: false,
      ownedAttributionCannotBeOverridden: true,
      passthroughParams: SHORTLINK_PASSTHROUGH_PARAMS,
      blockedParams: ["email", "groups", "channel", "subscribe", "utm_source", "utm_medium", "utm_campaign", "utm_content"],
    },
    routes,
  };
  writeFileSync(resolve(siteDir, "shortlinks.json"), JSON.stringify(manifest, null, 2) + "\n");
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
  const linkValue = String(value || "");
  const isLink = /^(https?:\/\/|\/)/.test(linkValue);
  const valueMarkup = isLink
    ? `<a href="${escapeHtml(linkValue)}">${escapeHtml(linkValue)}</a>`
    : `<span class="creator-link-value">${escapeHtml(linkValue)}</span>`;
  return `<div>
                <dt>${escapeHtml(title)}</dt>
                <dd>
                  ${valueMarkup}
                  <button type="button" class="creator-link-copy" data-copy-creator-kit data-copy-value="${escapeHtml(linkValue)}">Copy</button>
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
  <link rel="stylesheet" href="/css/picture-book-base-20260613-base1.css">
  <link rel="stylesheet" href="/css/picture-world-shared-20260613-traffic11.css">
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
  <script src="/js/site-shared-20260613-commerce1.js"></script>
</body>
</html>`;
  writeFileSync(resolve(siteDir, "creator-kit.html"), html + "\n");
}

function shareKitLinkRow(title, value) {
  return `<div>
                <dt>${escapeHtml(title)}</dt>
                <dd>
                  <a href="${escapeHtml(value)}">${escapeHtml(value)}</a>
                  <button type="button" class="creator-link-copy" data-copy-share-kit data-copy-value="${escapeHtml(value)}">Copy</button>
                </dd>
              </div>`;
}

function shareKitCopyBlock(title, value) {
  return `<article>
            <div class="creator-copy-heading">
              <h3>${escapeHtml(title)}</h3>
              <button type="button" class="creator-copy-button" data-copy-share-kit data-copy-value="${escapeHtml(value)}">Copy</button>
            </div>
            <pre>${escapeHtml(value)}</pre>
          </article>`;
}

function writeShareKitPage(siteDir, kit) {
  const packCards = Object.entries(kit.packs).map(([pack, item]) => `
      <section class="creator-pack" data-share-kit-pack="${escapeHtml(pack)}">
        <div class="creator-pack-copy">
          <p class="creator-eyebrow">${escapeHtml(item.campaign)}</p>
          <h2>${escapeHtml(item.title)}</h2>
          <p>${escapeHtml(item.audience)}</p>
          <dl>
            ${shareKitLinkRow("Story world", item.storyWorld)}
            ${shareKitLinkRow("Family sample link", item.familyShareShortlink)}
            ${shareKitLinkRow("Preview sample link", item.sampleShortlink)}
            ${shareKitLinkRow("Bio link", item.bioShortlink)}
            ${shareKitLinkRow("Creator link", item.creatorShortlink)}
            ${shareKitLinkRow("WhatsApp share URL", item.whatsappShareUrl)}
            ${shareKitLinkRow("LINE share URL", item.lineShareUrl)}
            ${shareKitLinkRow("Sample QR asset", item.sampleQrSvg)}
            ${shareKitLinkRow("Family share QR asset", item.shareQrSvg)}
          </dl>
        </div>
        <div class="creator-copy-blocks">
          ${shareKitCopyBlock("Family share message", item.familyShareMessage)}
          ${shareKitCopyBlock("Bio profile copy", item.bioProfileCopy)}
          ${shareKitCopyBlock("Short headline", item.shortHeadline)}
        </div>
        <div class="creator-qr-grid" aria-label="${escapeHtml(item.title)} QR assets">
          <a class="creator-qr" href="${escapeHtml(item.sampleShortlink)}" aria-label="${escapeHtml(item.title)} sample QR code for ${escapeHtml(item.sampleShortlink)}">
            <img src="${escapeHtml(new URL(item.sampleQrSvg).pathname)}" alt="${escapeHtml(item.title)} sample QR code for ${escapeHtml(item.sampleShortlink)}" width="160" height="160" loading="lazy">
            <span>Sample QR</span>
          </a>
          <a class="creator-qr" href="${escapeHtml(item.familyShareShortlink)}" aria-label="${escapeHtml(item.title)} family share QR code for ${escapeHtml(item.familyShareShortlink)}">
            <img src="${escapeHtml(new URL(item.shareQrSvg).pathname)}" alt="${escapeHtml(item.title)} family share QR code for ${escapeHtml(item.familyShareShortlink)}" width="160" height="160" loading="lazy">
            <span>Share QR</span>
          </a>
        </div>
      </section>`).join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fursay Share Kit</title>
  <meta name="description" content="Copy-ready Fursay family share links, social captions, QR assets, and story-pack shortlinks for Koko and Noor.">
  <meta property="og:title" content="Fursay Share Kit">
  <meta property="og:description" content="Copy-ready family links and QR assets for sharing Koko or Noor story packs.">
  <meta property="og:url" content="https://fursay.com/share-kit">
  <meta property="og:image" content="https://fursay.com/og-image.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="Fursay family share kit preview">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Fursay Share Kit">
  <meta name="twitter:description" content="Copy-ready family links and QR assets for sharing Koko or Noor story packs.">
  <meta name="twitter:image" content="https://fursay.com/og-image.png">
  <meta name="twitter:image:alt" content="Fursay family share kit preview">
  <meta name="theme-color" content="#4CAF7D">
  <link rel="canonical" href="https://fursay.com/share-kit">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/css/picture-book-base-20260613-base1.css">
  <link rel="stylesheet" href="/css/picture-world-shared-20260613-traffic11.css">
</head>
<body class="picture-world creator-kit-page share-kit-page">
  <main class="creator-kit-shell">
    <header class="creator-kit-hero">
      <p class="creator-eyebrow">Fursay family share kit</p>
      <h1>Share Kit</h1>
      <p>Copy-ready family links, QR assets, and short messages for sharing Koko or Noor story packs.</p>
      <div class="creator-kit-meta">
        <span>Updated ${escapeHtml(kit.updatedAt)}</span>
        <span>Commit ${escapeHtml(kit.source.commit)}</span>
        <a href="/share-kit.json">JSON manifest</a>
      </div>
    </header>
${packCards}
  </main>
  <script src="/js/site-shared-20260613-commerce1.js"></script>
</body>
</html>`;
  writeFileSync(resolve(siteDir, "share-kit.html"), html + "\n");
}

async function main() {
  const args = parseArgs();
  const outRoot = `/tmp/fursay-release-${stamp}`;
  ensureOutDir(outRoot);

  writeReleaseManifest();

  run("node", ["--check", "src/worker.js"]);
  run("node", ["--check", "scripts/check-fursay-funnel.mjs"]);
  run("node", ["--check", "scripts/check-noor-list-activation.mjs"]);
  run("node", ["--check", "scripts/check-localized-cta-contract.mjs"]);
  run("node", ["--check", "scripts/check-event-tracking-contract.mjs"]);
  run("node", ["--check", "scripts/check-subscribe-api-contract.mjs"]);
  run("node", ["--check", "scripts/check-content-structure-contract.mjs"]);
  run("node", ["--check", "scripts/check-semantic-funnel-contract.mjs"]);
  run("node", ["--check", "scripts/check-site-structure-contract.mjs"]);
  run("node", ["--check", "scripts/check-hero-preload-contract.mjs"]);
  run("node", ["--check", "scripts/check-visual-layout-contract.mjs"]);
  run("node", ["--check", "scripts/check-web-vitals-contract.mjs"]);
  run("node", ["--check", "scripts/check-internal-links-contract.mjs"]);
  run("node", ["--check", "scripts/check-newsletter-traffic-kit.mjs"]);
  run("node", ["--check", "scripts/check-public-kit-parity.mjs"]);
  run("node", ["--check", "scripts/check-amazon-affiliate-links.mjs"]);
  run("node", ["--check", "scripts/check-worker-shortlinks.mjs"]);
  run("node", ["--check", "scripts/check-structured-data.mjs"]);
  run("node", ["--check", "scripts/check-social-preview-contract.mjs"]);
  run("node", ["--check", "scripts/check-head-metadata.mjs"]);
  run("node", ["--check", "scripts/check-accessibility-contract.mjs"]);
  run("node", ["--check", "scripts/check-discovery-contract.mjs"]);
  run("node", ["--check", "scripts/check-security-headers.mjs"]);
  run("node", ["--check", "scripts/check-release-consistency.mjs"]);
  run("node", ["--check", "scripts/check-doc-manifest-drift.mjs"]);
  run("node", ["--check", "scripts/check-render-jobs.mjs"]);
  run("node", ["--check", "scripts/check-static-asset-structure.mjs"]);
  run("node", ["--check", "scripts/check-image-assets.mjs"]);
  run("node", ["--check", "scripts/check-cache-headers.mjs"]);
  run("node", ["--check", "scripts/check-deploy-readiness.mjs"]);
  run("node", ["scripts/check-deploy-readiness.mjs"]);

  run("node", ["scripts/check-fursay-funnel.mjs", "--out-dir", join(outRoot, "funnel-local")]);
  run("node", ["scripts/check-noor-list-activation.mjs", "--out-dir", join(outRoot, "noor-local")]);
  run("node", ["scripts/check-localized-cta-contract.mjs", "--out-dir", join(outRoot, "localized-cta-local")]);
  run("node", ["scripts/check-event-tracking-contract.mjs", "--out-dir", join(outRoot, "event-tracking-local")]);
  run("node", ["scripts/check-subscribe-api-contract.mjs", "--out-dir", join(outRoot, "subscribe-api-local")]);
  run("node", ["scripts/check-content-structure-contract.mjs", "--out-dir", join(outRoot, "content-structure-local")]);
  run("node", ["scripts/check-semantic-funnel-contract.mjs", "--out-dir", join(outRoot, "semantic-funnel-local")]);
  run("node", ["scripts/check-site-structure-contract.mjs", "--out-dir", join(outRoot, "site-structure-local")]);
  run("node", ["scripts/check-hero-preload-contract.mjs", "--out-dir", join(outRoot, "hero-preload-local")]);
  run("node", ["scripts/check-visual-layout-contract.mjs", "--out-dir", join(outRoot, "visual-layout-local")]);
  run("node", ["scripts/check-internal-links-contract.mjs", "--out-dir", join(outRoot, "internal-links-local")]);
  run("node", ["scripts/check-newsletter-traffic-kit.mjs", "--out-dir", join(outRoot, "newsletter-traffic-kit-local")]);
  run("node", ["scripts/check-public-kit-parity.mjs", "--out-dir", join(outRoot, "public-kit-parity-local")]);
  run("node", ["scripts/check-amazon-affiliate-links.mjs", "--out-dir", join(outRoot, "amazon-affiliate-local")]);
  run("node", ["scripts/check-worker-shortlinks.mjs", "--out-dir", join(outRoot, "worker-shortlinks-local")]);
  run("node", ["scripts/check-structured-data.mjs", "--out-dir", join(outRoot, "structured-data-local")]);
  run("node", ["scripts/check-social-preview-contract.mjs", "--out-dir", join(outRoot, "social-preview-local")]);
  run("node", ["scripts/check-head-metadata.mjs", "--out-dir", join(outRoot, "head-metadata-local")]);
  run("node", ["scripts/check-accessibility-contract.mjs", "--out-dir", join(outRoot, "accessibility-local")]);
  run("node", ["scripts/check-discovery-contract.mjs", "--out-dir", join(outRoot, "discovery-local")]);
  run("node", ["scripts/check-security-headers.mjs", "--out-dir", join(outRoot, "security-headers-local")]);
  run("node", ["scripts/check-release-consistency.mjs", "--out-dir", join(outRoot, "release-consistency-local")]);
  run("node", ["scripts/check-doc-manifest-drift.mjs", "--out-dir", join(outRoot, "doc-manifest-drift-local")]);
  run("node", ["scripts/check-render-jobs.mjs", "--out-dir", join(outRoot, "render-jobs-local")]);
  run("node", ["scripts/check-static-asset-structure.mjs", "--out-dir", join(outRoot, "static-asset-structure-local")]);
  run("node", ["scripts/check-image-assets.mjs", "--out-dir", join(outRoot, "image-assets-local")]);

  if (!args.skipDeploy) {
    run("npx", ["wrangler", "deploy"]);
  }

  if (!args.skipLive) {
    run("node", ["scripts/check-fursay-funnel.mjs", "--base-url", args.baseUrl, "--out-dir", join(outRoot, "funnel-live")]);
    run("node", ["scripts/check-noor-list-activation.mjs", "--base-url", args.baseUrl, "--out-dir", join(outRoot, "noor-live")]);
    run("node", ["scripts/check-localized-cta-contract.mjs", "--base-url", args.baseUrl, "--out-dir", join(outRoot, "localized-cta-live")]);
    run("node", ["scripts/check-event-tracking-contract.mjs", "--base-url", args.baseUrl, "--out-dir", join(outRoot, "event-tracking-live")]);
    run("node", ["scripts/check-subscribe-api-contract.mjs", "--base-url", args.baseUrl, "--out-dir", join(outRoot, "subscribe-api-live")]);
    run("node", ["scripts/check-content-structure-contract.mjs", "--base-url", args.baseUrl, "--out-dir", join(outRoot, "content-structure-live")]);
    run("node", ["scripts/check-semantic-funnel-contract.mjs", "--base-url", args.baseUrl, "--out-dir", join(outRoot, "semantic-funnel-live")]);
    run("node", ["scripts/check-site-structure-contract.mjs", "--base-url", args.baseUrl, "--out-dir", join(outRoot, "site-structure-live")]);
    run("node", ["scripts/check-hero-preload-contract.mjs", "--base-url", args.baseUrl, "--out-dir", join(outRoot, "hero-preload-live")]);
    run("node", ["scripts/check-visual-layout-contract.mjs", "--base-url", args.baseUrl, "--out-dir", join(outRoot, "visual-layout-live")]);
    run("node", ["scripts/check-web-vitals-contract.mjs", "--base-url", args.baseUrl, "--out-dir", join(outRoot, "web-vitals-live")]);
    run("node", ["scripts/check-internal-links-contract.mjs", "--base-url", args.baseUrl, "--out-dir", join(outRoot, "internal-links-live")]);
    run("node", ["scripts/check-newsletter-traffic-kit.mjs", "--base-url", args.baseUrl, "--out-dir", join(outRoot, "newsletter-traffic-kit-live")]);
    run("node", ["scripts/check-public-kit-parity.mjs", "--base-url", args.baseUrl, "--out-dir", join(outRoot, "public-kit-parity-live")]);
    run("node", ["scripts/check-amazon-affiliate-links.mjs", "--base-url", args.baseUrl, "--out-dir", join(outRoot, "amazon-affiliate-live")]);
    run("node", ["scripts/check-worker-shortlinks.mjs", "--base-url", args.baseUrl, "--out-dir", join(outRoot, "worker-shortlinks-live")]);
    run("node", ["scripts/check-structured-data.mjs", "--base-url", args.baseUrl, "--out-dir", join(outRoot, "structured-data-live")]);
    run("node", ["scripts/check-social-preview-contract.mjs", "--base-url", args.baseUrl, "--out-dir", join(outRoot, "social-preview-live")]);
    run("node", ["scripts/check-head-metadata.mjs", "--base-url", args.baseUrl, "--out-dir", join(outRoot, "head-metadata-live")]);
    run("node", ["scripts/check-accessibility-contract.mjs", "--base-url", args.baseUrl, "--out-dir", join(outRoot, "accessibility-live")]);
    run("node", ["scripts/check-discovery-contract.mjs", "--base-url", args.baseUrl, "--out-dir", join(outRoot, "discovery-live")]);
    run("node", ["scripts/check-security-headers.mjs", "--base-url", args.baseUrl, "--out-dir", join(outRoot, "security-headers-live")]);
    run("node", ["scripts/check-release-consistency.mjs", "--base-url", args.baseUrl, "--out-dir", join(outRoot, "release-consistency-live")]);
    run("node", ["scripts/check-doc-manifest-drift.mjs", "--base-url", args.baseUrl, "--out-dir", join(outRoot, "doc-manifest-drift-live")]);
    run("node", ["scripts/check-image-assets.mjs", "--base-url", args.baseUrl, "--out-dir", join(outRoot, "image-assets-live")]);
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
