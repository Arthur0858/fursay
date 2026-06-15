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

function readJsonIfExists(path, fallback) {
  return existsSync(path) ? readJson(path) : fallback;
}

const SHORTLINK_PASSTHROUGH_PARAMS = ["utm_term", "ref", "source_id", "creator", "placement"];
const PRODUCT_INTEREST_SOCIAL_LINK = "https://fursay.com/products?utm_source=links&utm_medium=social_profile&utm_campaign=product_interest_validation&utm_content=links_product_interest";
const ZH_PRODUCT_INTEREST_SOCIAL_LINK = "https://fursay.com/zh/products?utm_source=links&utm_medium=social_profile&utm_campaign=product_interest_validation&utm_content=links_zh_product_interest";
const AR_PRODUCT_INTEREST_SOCIAL_LINK = "https://fursay.com/ar/products?utm_source=links&utm_medium=social_profile&utm_campaign=product_interest_validation&utm_content=links_ar_product_interest";

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
      noorSprintStatusManifest: "https://fursay.com/noor-sprint-status.json",
      noorSprintStatusPage: "https://fursay.com/noor-sprint-status",
      linksManifest: "https://fursay.com/links.json",
      linksPage: "https://fursay.com/links",
      conversionHealthManifest: "https://fursay.com/conversion-health.json",
      conversionHealthPage: "https://fursay.com/conversion-health",
      productsManifest: "https://fursay.com/products.json",
      productsPage: "https://fursay.com/products",
      monetizationRoadmapManifest: "https://fursay.com/monetization-roadmap.json",
      monetizationRoadmapPage: "https://fursay.com/monetization-roadmap",
      productSamplePreviews: [
        "https://fursay.com/product-samples/koko-printable",
        "https://fursay.com/product-samples/noor-worksheet",
      ],
      productSampleDownloads: [
        "https://fursay.com/downloads/koko-printable-sample.pdf",
        "https://fursay.com/downloads/noor-worksheet-sample.pdf",
      ],
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
      "scripts/check-conversion-health-contract.mjs",
      "scripts/check-growth-dashboard-contract.mjs",
      "scripts/check-event-analytics-contract.mjs",
      "scripts/query-event-analytics-report.mjs",
      "scripts/check-subscribe-api-contract.mjs",
      "scripts/check-content-structure-contract.mjs",
      "scripts/check-semantic-funnel-contract.mjs",
      "scripts/check-site-structure-contract.mjs",
      "scripts/check-hero-preload-contract.mjs",
      "scripts/check-visual-layout-contract.mjs",
      "scripts/check-web-vitals-contract.mjs",
      "scripts/check-internal-links-contract.mjs",
      "scripts/check-newsletter-traffic-kit.mjs",
      "scripts/check-newsletter-state-contract.mjs",
      "scripts/check-public-kit-parity.mjs",
      "scripts/check-amazon-affiliate-links.mjs",
      "scripts/check-worker-shortlinks.mjs",
      "scripts/check-structured-data.mjs",
      "scripts/check-social-preview-contract.mjs",
      "scripts/check-head-metadata.mjs",
      "scripts/check-accessibility-contract.mjs",
      "scripts/check-discovery-contract.mjs",
      "scripts/check-content-growth-contract.mjs",
      "scripts/check-episode-landing-contract.mjs",
      "scripts/check-monetization-interest-contract.mjs",
      "scripts/check-product-readiness-contract.mjs",
      "scripts/check-monetization-roadmap-contract.mjs",
      "scripts/check-noor-subscriber-readiness.mjs",
      "scripts/check-noor-sprint-log.mjs",
      "scripts/check-noor-sprint-review.mjs",
      "scripts/check-security-headers.mjs",
      "scripts/check-release-consistency.mjs",
      "scripts/check-doc-manifest-drift.mjs",
      "scripts/check-render-jobs.mjs",
      "scripts/check-workspace-hygiene.mjs",
      "scripts/update-immutable-asset-fingerprints.mjs",
      "scripts/check-static-asset-structure.mjs",
      "scripts/check-image-assets.mjs",
      "scripts/check-cache-headers.mjs",
      "scripts/check-deploy-readiness.mjs",
      "audit-fursay.mjs",
    ],
    liveExpectations: {
      pages: 9,
      funnelChecks: 41,
      amazonAffiliateLinks: 37,
      amazonAffiliateTag: "parenttechche-20",
      booksAffiliateLinks: 18,
      booksAffiliateId: "arthur0858",
      eventTrackingPages: 18,
      affiliateEventTrackingPages: 18,
      productInfoEventTrackingPages: 18,
      eventTrackingSubmitPages: 3,
      anonymousConversionEvents: 15,
      conversionDashboardSections: 6,
      eventAnalyticsBlobFields: 18,
      eventAnalyticsDoubleFields: 1,
      eventAnalyticsReportQueries: 12,
      eventAnalyticsReportWindowDays: 7,
      eventAnalyticsReportComparisonWindows: [7, 30],
      latestStoryEntries: 12,
      episodeLandingPages: 9,
      noorLeadMagnetPages: 3,
      noorSprintCopyVariants: 4,
      noorSprintStatusDays: 7,
      productInterestLinks: 18,
      productInfoLinks: 18,
      productLandingPages: 3,
      ownedProductSpecs: 2,
      productValidationPlans: 2,
      productSamplePreviewPages: 2,
      productSampleDownloadFiles: 2,
      monetizationRoadmapStages: 4,
      monetizationRoadmapProducts: 2,
      visualLayoutChecks: 28,
      checkoutGateRequirements: 4,
      webVitalsChecks: 18,
      cacheHeaderChecks: 69,
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
  writeNoorSprintStatus(siteDir, source);
  writeVideoDiscovery(siteDir, source);
  writeShortlinkManifest(siteDir, source);
  writeConversionHealth(siteDir, source);
  writeProductsManifest(siteDir, source);
  writeProductsPage(siteDir);
  writeZhProductsPage(siteDir);
  writeArProductsPage(siteDir);
  writeProductSamplePages(siteDir);
  run("node", ["scripts/build-product-sample-pdfs.mjs"]);
  writeMonetizationRoadmap(siteDir, source);
  writeMonetizationRoadmapPage(siteDir);
  writeConversionHealthPage(siteDir);
  writeSiteHealthManifest(siteDir);
}

function writeDeployReadinessManifest(siteDir, source) {
  const remote = gitRemote();
  const hasCloudflareToken = Boolean(process.env.CLOUDFLARE_API_TOKEN);
  const hasCloudflareAccount = Boolean(process.env.CLOUDFLARE_ACCOUNT_ID);
  const warnings = [];
  warnings.push("analytics_engine_dashboard_enablement_required");
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
      analyticsEngine: {
        binding: "FURSAY_EVENTS",
        dataset: "fursay_events",
        configured: false,
        status: "pending_cloudflare_dashboard_enablement",
        enablementUrl: "https://dash.cloudflare.com/e6780ef96bb6f53eba1dbc4d6dfa7376/workers/analytics-engine",
        lastDeployBlockerCode: "10089",
      },
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
  <link rel="stylesheet" href="/css/picture-world-tools-20260613-products1.css">
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
        ${deployReadinessRow("Analytics Engine", manifest.deployment.analyticsEngine.status)}
        ${deployReadinessRow("Analytics binding", `${manifest.deployment.analyticsEngine.binding} / ${manifest.deployment.analyticsEngine.dataset}`)}
        ${deployReadinessRow("Analytics enablement", manifest.deployment.analyticsEngine.enablementUrl)}
        ${deployReadinessRow("Last Analytics deploy blocker", manifest.deployment.analyticsEngine.lastDeployBlockerCode)}
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
  const kokoFeelingsAlternates = {
    en: "https://fursay.com/episodes/koko-feelings",
    "zh-TW": "https://fursay.com/zh/episodes/koko-feelings",
    ar: "https://fursay.com/ar/episodes/koko-feelings",
    "x-default": "https://fursay.com/episodes/koko-feelings",
  };
  const noorColorsAlternates = {
    en: "https://fursay.com/episodes/noor-colors",
    "zh-TW": "https://fursay.com/zh/episodes/noor-colors",
    ar: "https://fursay.com/ar/episodes/noor-colors",
    "x-default": "https://fursay.com/episodes/noor-colors",
  };
  const noorGreetingsAlternates = {
    en: "https://fursay.com/episodes/noor-greetings",
    "zh-TW": "https://fursay.com/zh/episodes/noor-greetings",
    ar: "https://fursay.com/ar/episodes/noor-greetings",
    "x-default": "https://fursay.com/episodes/noor-greetings",
  };
  const productAlternates = {
    en: "https://fursay.com/products",
    "zh-TW": "https://fursay.com/zh/products",
    ar: "https://fursay.com/ar/products",
    "x-default": "https://fursay.com/products",
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
    sitemapUrl("https://fursay.com/episodes/koko-feelings", kokoFeelingsAlternates, "0.6"),
    sitemapUrl("https://fursay.com/zh/episodes/koko-feelings", kokoFeelingsAlternates, "0.6"),
    sitemapUrl("https://fursay.com/ar/episodes/koko-feelings", kokoFeelingsAlternates, "0.6"),
    sitemapUrl("https://fursay.com/episodes/noor-colors", noorColorsAlternates, "0.6"),
    sitemapUrl("https://fursay.com/zh/episodes/noor-colors", noorColorsAlternates, "0.6"),
    sitemapUrl("https://fursay.com/ar/episodes/noor-colors", noorColorsAlternates, "0.6"),
    sitemapUrl("https://fursay.com/episodes/noor-greetings", noorGreetingsAlternates, "0.6"),
    sitemapUrl("https://fursay.com/zh/episodes/noor-greetings", noorGreetingsAlternates, "0.6"),
    sitemapUrl("https://fursay.com/ar/episodes/noor-greetings", noorGreetingsAlternates, "0.6"),
    sitemapUrl("https://fursay.com/products", productAlternates, "0.5"),
    sitemapUrl("https://fursay.com/zh/products", productAlternates, "0.5"),
    sitemapUrl("https://fursay.com/ar/products", productAlternates, "0.5"),
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
      productInterest: {
        label: "Printable and worksheet packs",
        url: PRODUCT_INTEREST_SOCIAL_LINK,
      },
      zhProductInterest: {
        label: "繁中產品等候名單",
        url: ZH_PRODUCT_INTEREST_SOCIAL_LINK,
      },
      arProductInterest: {
        label: "قائمة انتظار حزم Fursay",
        url: AR_PRODUCT_INTEREST_SOCIAL_LINK,
      },
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
  <link rel="stylesheet" href="/css/picture-world-tools-20260613-products1.css">
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
    const productSamplePreviewPath = pack === "koko" ? "/product-samples/koko-printable" : "/product-samples/noor-worksheet";
    const productSampleDownloadPath = pack === "koko" ? "/downloads/koko-printable-sample.pdf" : "/downloads/noor-worksheet-sample.pdf";
    const productSamplePreviewUrl = `https://fursay.com${productSamplePreviewPath}?source_id=${pack}_share_kit_sample_preview&creator=fursay&placement=share_kit_sample_preview`;
    const productSampleDownloadUrl = `https://fursay.com${productSampleDownloadPath}?source_id=${pack}_share_kit_pdf_sample&creator=fursay&placement=share_kit_pdf_sample`;
    return [pack, {
      title: pack === "koko" ? "Koko weekly English story pack" : "Noor 3-minute Chinese story pack",
      audience: campaign.audience,
      campaign: campaign.campaign,
      storyWorld: campaign.landingPages?.storyWorld || "",
      sampleShortlink: campaign.shortlinks?.sample || "",
      familyShareShortlink: campaign.shortlinks?.share || "",
      productSamplePreviewUrl,
      productSampleDownloadUrl,
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

function buildNoorSubscriberSprint() {
  const primaryLink = "https://fursay.com/share/noor?source_id=noor_first_subscriber_sprint&creator=fursay&placement=family_share";
  const sampleLink = "https://fursay.com/sample/noor?source_id=noor_first_subscriber_sprint&creator=fursay&placement=sample_followup";
  const worksheetPreview = "https://fursay.com/product-samples/noor-worksheet?source_id=noor_first_subscriber_sprint&creator=fursay&placement=worksheet_preview";
  const sprintLink = (path, sourceId, placement) => `https://fursay.com${path}?source_id=${sourceId}&creator=fursay&placement=${placement}`;
  const pdfSampleLink = (sourceId, placement) => `https://fursay.com/downloads/noor-worksheet-sample.pdf?source_id=${sourceId}&creator=fursay&placement=${placement}`;
  const variantLinks = {
    parentGroup: sprintLink("/share/noor", "noor_first_subscriber_sprint_parent_group", "parent_group"),
    directDm: sprintLink("/share/noor", "noor_first_subscriber_sprint_direct_dm", "direct_dm"),
    worksheetFollowup: sprintLink("/product-samples/noor-worksheet", "noor_first_subscriber_sprint_worksheet_followup", "worksheet_followup"),
    worksheetFollowupStory: sprintLink("/share/noor", "noor_first_subscriber_sprint_worksheet_followup_story", "worksheet_followup_story"),
    pdfSampleFollowup: pdfSampleLink("noor_first_subscriber_sprint_pdf_sample_followup", "pdf_sample_followup"),
    pdfSampleStory: sprintLink("/share/noor", "noor_first_subscriber_sprint_pdf_sample_story", "pdf_sample_story"),
  };
  return {
    pack: "noor",
    status: "subscriber_signal_needed",
    windowDays: 7,
    goal: "Get the first real Noor subscriber signal without sending a newsletter or enabling checkout.",
    successMetric: "at_least_one_noor_subscribe_submit_success",
    primaryLink,
    sampleLink,
    worksheetPreview,
    copy: [
      "Trying a tiny Arabic-Chinese routine with kids this week.",
      `Free Noor 3-minute story pack: ${primaryLink}`,
      "One story, one Chinese phrase with Pinyin, and one parent-child activity.",
    ].join("\n"),
    copyVariants: [
      {
        id: "parent_group",
        label: "Parent group post",
        placement: "parent_group",
        link: variantLinks.parentGroup,
        copy: [
          "Trying a tiny Arabic-Chinese routine with kids this week.",
          `Free Noor 3-minute story pack: ${variantLinks.parentGroup}`,
          "It is short: one story, one Chinese phrase with Pinyin, and one parent-child activity.",
        ].join("\n"),
      },
      {
        id: "direct_dm",
        label: "Direct family DM",
        placement: "direct_dm",
        link: variantLinks.directDm,
        copy: [
          "I thought your family might like this tiny Noor story pack.",
          `Free 3-minute Arabic-Chinese story pack: ${variantLinks.directDm}`,
          "No payment. It just helps test whether families want this kind of bilingual routine.",
        ].join("\n"),
      },
      {
        id: "worksheet_followup",
        label: "Worksheet follow-up",
        placement: "worksheet_followup",
        link: variantLinks.worksheetFollowup,
        storyLink: variantLinks.worksheetFollowupStory,
        copy: [
          "Here is the Noor worksheet preview I mentioned.",
          `Preview: ${variantLinks.worksheetFollowup}`,
          `If it feels useful, the free story pack starts here: ${variantLinks.worksheetFollowupStory}`,
        ].join("\n"),
      },
      {
        id: "pdf_sample_followup",
        label: "PDF sample follow-up",
        placement: "pdf_sample_followup",
        link: variantLinks.pdfSampleFollowup,
        storyLink: variantLinks.pdfSampleStory,
        copy: [
          "Here is the printable Noor PDF sample.",
          `Download: ${variantLinks.pdfSampleFollowup}`,
          `If the 3-minute activity feels useful, the free Noor story pack starts here: ${variantLinks.pdfSampleStory}`,
        ].join("\n"),
      },
    ],
    dailyPlan: [
      {
        day: 1,
        label: "Parent group seed",
        action: "Post the parent-group copy in one warm Arabic-speaking parent group.",
        link: variantLinks.parentGroup,
        reportQuery: "noor_growth_signals_7d",
        expectedSignal: "fursay_subscribe_open_click or fursay_subscribe_submit_success from parent_group.",
      },
      {
        day: 2,
        label: "Direct family DM",
        action: "Send the direct DM copy to two families who already know the project.",
        link: variantLinks.directDm,
        reportQuery: "noor_growth_signals_7d",
        expectedSignal: "A noor direct_dm open, modal open, or submit success signal.",
      },
      {
        day: 3,
        label: "Worksheet preview follow-up",
        action: "Use the worksheet preview only with families who ask what is inside.",
        link: variantLinks.worksheetFollowup,
        followupLink: variantLinks.worksheetFollowupStory,
        reportQuery: "page_intent_7d",
        expectedSignal: "A sample preview or product info click before the story-pack link.",
      },
      {
        day: 4,
        label: "Printable PDF follow-up",
        action: "Share the PDF sample when a parent asks for printable or offline material.",
        link: variantLinks.pdfSampleFollowup,
        followupLink: variantLinks.pdfSampleStory,
        reportQuery: "noor_growth_signals_7d",
        expectedSignal: "A pdf_sample_followup event followed by a story-pack visit.",
      },
      {
        day: 5,
        label: "Repeat best response",
        action: "Repeat the highest-response placement once; do not add price or checkout copy.",
        link: primaryLink,
        reportQuery: "event_totals_7d",
        expectedSignal: "More Noor subscribe opens without payment-link exposure.",
      },
      {
        day: 6,
        label: "Check first signal",
        action: "Run the event report and look for one Noor submit success or clear product-interest signal.",
        link: "https://fursay.com/conversion-health",
        reportQuery: "noor_growth_signals_7d",
        expectedSignal: "at_least_one_noor_subscribe_submit_success or a clear follow-up request.",
      },
      {
        day: 7,
        label: "Decision checkpoint",
        action: "Keep Noor in safe wait if there is no subscriber signal; otherwise prepare newsletter readiness review.",
        link: "https://fursay.com/traffic-launch",
        reportQuery: "subscribe_funnel_by_pack_7d",
        expectedSignal: "subscriber_signal_received or safe_wait_subscriber_empty remains explicit.",
      },
    ],
    checklist: [
      "Share the family link with 3 Arabic-speaking parent groups or families.",
      "Use the sample link only as a follow-up when someone asks what is inside.",
      "Use the PDF sample link when a parent asks for something printable or offline.",
      "Keep the worksheet preview interest-only; do not mention payment or price.",
      "Review noor_growth_signals_7d after Cloudflare Analytics credentials are enabled.",
    ],
  };
}

function trafficLaunchSprintSection(sprint) {
  const variants = (sprint.copyVariants || []).map((variant) => `
          <article class="creator-copy-block" data-noor-sprint-copy-variant="${escapeHtml(variant.id)}">
            <div class="creator-copy-heading">
              <h3>${escapeHtml(variant.label)}</h3>
              <button type="button" class="creator-copy-button" data-copy-traffic-launch data-copy-value="${escapeHtml(variant.copy)}">Copy variant</button>
            </div>
            <p>Placement: ${escapeHtml(variant.placement)}</p>
            <dl>
              ${shareKitLinkRow("Variant link", variant.link)}
              ${variant.storyLink ? shareKitLinkRow("Story pack link", variant.storyLink) : ""}
            </dl>
            <pre>${escapeHtml(variant.copy)}</pre>
          </article>`).join("\n");
  const dailyPlan = (sprint.dailyPlan || []).map((day) => `
        <tr data-noor-sprint-day="${escapeHtml(day.day)}">
          <th scope="row">Day ${escapeHtml(day.day)}</th>
          <td>${escapeHtml(day.label)}</td>
          <td>${escapeHtml(day.action)}</td>
          <td><a href="${escapeHtml(day.link || "#")}">Open link</a>${day.followupLink ? ` <a href="${escapeHtml(day.followupLink)}">Follow-up</a>` : ""}</td>
          <td><code>${escapeHtml(day.reportQuery)}</code></td>
          <td>${escapeHtml(day.expectedSignal)}</td>
        </tr>`).join("\n");
  return `
    <section class="creator-kit-safety noor-subscriber-sprint" data-noor-subscriber-sprint="${escapeHtml(sprint.status)}">
      <p class="creator-eyebrow">Noor subscriber sprint</p>
      <h2>7-day Noor first-subscriber sprint</h2>
      <p>${escapeHtml(sprint.goal)}</p>
      <dl>
        <div>
          <dt>Success metric</dt>
          <dd>${escapeHtml(sprint.successMetric)}</dd>
        </div>
        ${shareKitLinkRow("Primary family link", sprint.primaryLink)}
        ${shareKitLinkRow("Sample follow-up", sprint.sampleLink)}
        ${shareKitLinkRow("Worksheet preview", sprint.worksheetPreview)}
      </dl>
      <div class="creator-copy-block">
        <div class="creator-copy-heading">
          <h3>Parent-to-parent copy</h3>
          <button type="button" class="creator-copy-button" data-copy-traffic-launch data-copy-value="${escapeHtml(sprint.copy)}">Copy sprint copy</button>
        </div>
        <pre>${escapeHtml(sprint.copy)}</pre>
      </div>
      <div class="creator-copy-blocks" data-noor-sprint-copy-variants>
${variants}
      </div>
      <div class="creator-copy-block" data-noor-sprint-daily-plan>
        <h3>7-day action plan</h3>
        <table>
          <thead>
            <tr>
              <th scope="col">Day</th>
              <th scope="col">Focus</th>
              <th scope="col">Action</th>
              <th scope="col">Link</th>
              <th scope="col">Report</th>
              <th scope="col">Signal</th>
            </tr>
          </thead>
          <tbody>
${dailyPlan}
          </tbody>
        </table>
      </div>
      <ol>
        ${sprint.checklist.map((entry) => `<li>${escapeHtml(entry)}</li>`).join("\n        ")}
      </ol>
    </section>`;
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
    activationSprints: {
      noorFirstSubscriber: buildNoorSubscriberSprint(),
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
  <link rel="stylesheet" href="/css/picture-world-tools-20260613-products1.css">
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
${trafficLaunchSprintSection(kit.activationSprints.noorFirstSubscriber)}
${packCards}
  </main>
  <script src="/js/site-shared-20260615-sharekit1.js"></script>
</body>
</html>`;
  writeFileSync(resolve(siteDir, "traffic-launch.html"), html + "\n");
}

function writeTrafficLaunchKit(siteDir, source) {
  const kit = buildTrafficLaunchKit(siteDir, source);
  writeFileSync(resolve(siteDir, "traffic-launch.json"), JSON.stringify(kit, null, 2) + "\n");
  writeTrafficLaunchPage(siteDir, kit);
}

function buildNoorSprintStatus(siteDir, source) {
  const trafficLaunch = readJson(resolve(siteDir, "traffic-launch.json"));
  const conversionHealth = readJson(resolve(siteDir, "conversion-health.json"));
  const sprintLog = readJsonIfExists(resolve(process.cwd(), "content/growth/noor-sprint-log.json"), {
    status: "ready_to_start",
    piiAllowed: false,
    entries: [],
  });
  const sprint = trafficLaunch.activationSprints?.noorFirstSubscriber || {};
  const analyticsStatus = conversionHealth.measurement?.analyticsReport?.status || "pending_cloudflare_credentials_or_enablement";
  const readinessStatus = conversionHealth.growth?.noorReadinessStatus || "safe_wait_subscriber_empty";
  const logEntries = Array.isArray(sprintLog.entries) ? sprintLog.entries : [];
  const entriesByDay = new Map(logEntries.map((entry) => [Number(entry.day), entry]));
  const days = (sprint.dailyPlan || []).map((day) => ({
    day: day.day,
    label: day.label,
    status: entriesByDay.get(Number(day.day))?.status || "not_started",
    action: day.action,
    link: day.link,
    followupLink: day.followupLink || "",
    reportQuery: day.reportQuery,
    expectedSignal: day.expectedSignal,
    executedAt: entriesByDay.get(Number(day.day))?.executedAt || "",
    signalObserved: entriesByDay.get(Number(day.day))?.signalObserved === true,
    signalEvidence: entriesByDay.get(Number(day.day))?.signalEvidence || "",
    notes: entriesByDay.get(Number(day.day))?.notes || "",
    nextAction: entriesByDay.get(Number(day.day))?.nextAction || (day.day === 1 ? "Start with the warmest parent-group placement." : "Wait until the previous day has been tried or skipped."),
  }));
  const completedDays = days.filter((day) => day.status === "completed").length;
  const skippedDays = days.filter((day) => day.status === "skipped").length;
  const subscriberSignalObserved = days.some((day) => day.signalObserved === true);
  const nextOpenDay = days.find((day) => !["completed", "skipped"].includes(day.status)) || days.at(-1) || {};
  return {
    site: "Fursay",
    origin: "https://fursay.com",
    platform: "cloudflare-workers-static-assets",
    updatedAt: taipeiDateString(),
    page: "https://fursay.com/noor-sprint-status",
    manifest: "https://fursay.com/noor-sprint-status.json",
    releaseManifest: "https://fursay.com/release.json",
    siteHealth: "https://fursay.com/site-health.json",
    trafficLaunch: "https://fursay.com/traffic-launch.json",
    conversionHealth: "https://fursay.com/conversion-health.json",
    logSource: "content/growth/noor-sprint-log.json",
    nextActionCommand: "npm run noor:sprint:next",
    reviewCommand: "npm run noor:sprint:review",
    recorderCommand: "npm run noor:sprint:log -- --day 1 --status needs_retry --notes \"anonymous aggregate note\" --dry-run",
    piiAllowed: false,
    status: sprintLog.status || "ready_to_log",
    pack: "noor",
    windowDays: sprint.windowDays || 7,
    goal: sprint.goal || "Get the first real Noor subscriber signal.",
    successMetric: sprint.successMetric || "at_least_one_noor_subscribe_submit_success",
    readinessStatus,
    analyticsStatus,
    logStatus: sprintLog.status || "ready_to_start",
    logEntryCount: logEntries.length,
    privacy: {
      piiAllowed: false,
      boundaryConfirmed: sprintLog.piiAllowed === false,
      allowedEvidence: sprintLog.privacy?.allowedEvidence || [],
      blockedFields: sprintLog.privacy?.blockedFields || [],
    },
    summary: {
      totalDays: days.length,
      completedDays,
      skippedDays,
      subscriberSignalObserved,
      checkoutEnabled: false,
      paymentLinksAllowed: false,
      nextDay: nextOpenDay.day || 1,
      nextAction: nextOpenDay.action || "",
    },
    blockedBy: [
      analyticsStatus,
      readinessStatus,
    ],
    logFields: [
      "executedAt",
      "status",
      "signalObserved",
      "signalEvidence",
      "notes",
      "nextAction",
    ],
    days,
  };
}

function writeNoorSprintStatusPage(siteDir, manifest) {
  const rows = (manifest.days || []).map((day) => `
        <tr data-noor-sprint-status-day="${escapeHtml(day.day)}">
          <th scope="row">Day ${escapeHtml(day.day)}</th>
          <td>${escapeHtml(day.label)}</td>
          <td><span>${escapeHtml(day.status)}</span></td>
          <td>${escapeHtml(day.action)}</td>
          <td><a href="${escapeHtml(day.link || "#")}">Open link</a>${day.followupLink ? ` <a href="${escapeHtml(day.followupLink)}">Follow-up</a>` : ""}</td>
          <td><code>${escapeHtml(day.reportQuery)}</code></td>
          <td>${escapeHtml(day.expectedSignal)}</td>
          <td>${escapeHtml(day.nextAction)}</td>
        </tr>`).join("\n");
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fursay Noor Sprint Status</title>
  <meta name="description" content="Noor first-subscriber sprint status log for daily outreach actions, anonymous signal checks, and safe wait state.">
  <meta name="robots" content="noindex,follow">
  <meta name="theme-color" content="#4CAF7D">
  <link rel="canonical" href="https://fursay.com/noor-sprint-status">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/css/picture-book-base-20260613-base1.css">
  <link rel="stylesheet" href="/css/picture-world-tools-20260613-products1.css">
</head>
<body class="picture-world creator-kit-page noor-sprint-status-page">
  <main class="creator-kit-shell">
    <header class="creator-kit-hero">
      <p class="creator-eyebrow">Noor sprint log</p>
      <h1>Noor Sprint Status</h1>
      <p>${escapeHtml(manifest.goal)}</p>
      <div class="creator-kit-meta">
        <span>Updated ${escapeHtml(manifest.updatedAt)}</span>
        <a href="/noor-sprint-status.json">JSON manifest</a>
        <a href="/release.json">Release manifest</a>
        <a href="/site-health.json">Site health</a>
        <a href="/traffic-launch">Traffic launch kit</a>
      </div>
    </header>
    <section class="creator-kit-safety" data-noor-sprint-privacy>
      <h2>Logging boundary</h2>
      <p>This sprint log records anonymous execution status only. Do not store email, name, phone, address, subscriber IDs, or MailerLite IDs in <code>${escapeHtml(manifest.logSource)}</code>.</p>
      <p>Use <code>${escapeHtml(manifest.nextActionCommand)}</code> to get the next share copy, then use <code>${escapeHtml(manifest.reviewCommand)}</code> after the anonymous event report before recording an anonymous note with <code>${escapeHtml(manifest.recorderCommand)}</code>.</p>
    </section>
    <section class="creator-kit-safety" data-noor-sprint-status-summary>
      <h2>Status</h2>
      <dl>
        ${healthMetric("Sprint status", manifest.status)}
        ${healthMetric("Readiness", manifest.readinessStatus)}
        ${healthMetric("Analytics report", manifest.analyticsStatus)}
        ${healthMetric("Log status", manifest.logStatus)}
        ${healthMetric("Log entries", manifest.logEntryCount)}
        ${healthMetric("Total days", manifest.summary.totalDays)}
        ${healthMetric("Completed days", manifest.summary.completedDays)}
        ${healthMetric("Subscriber signal", String(manifest.summary.subscriberSignalObserved))}
        ${healthMetric("Checkout enabled", String(manifest.summary.checkoutEnabled))}
      </dl>
    </section>
    <section class="creator-kit-safety" data-noor-sprint-status-log>
      <h2>Daily log</h2>
      <table>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Focus</th>
            <th scope="col">Status</th>
            <th scope="col">Action</th>
            <th scope="col">Link</th>
            <th scope="col">Report</th>
            <th scope="col">Signal</th>
            <th scope="col">Next</th>
          </tr>
        </thead>
        <tbody>
${rows}
        </tbody>
      </table>
    </section>
  </main>
  <script src="/js/site-shared-20260615-sharekit1.js"></script>
</body>
</html>`;
  writeFileSync(resolve(siteDir, "noor-sprint-status.html"), html + "\n");
}

function writeNoorSprintStatus(siteDir, source) {
  const manifest = buildNoorSprintStatus(siteDir, source);
  writeFileSync(resolve(siteDir, "noor-sprint-status.json"), JSON.stringify(manifest, null, 2) + "\n");
  writeNoorSprintStatusPage(siteDir, manifest);
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
    episodeLandings: [
      {
        path: "/episodes/koko-feelings",
        url: "https://fursay.com/episodes/koko-feelings",
        pack: "koko",
        locale: "en",
        title: "Koko Feelings Story Pack",
        channel: "Koko's Forest Adventure",
        watchEmbed: "https://www.youtube-nocookie.com/embed/videoseries?list=UU0X4CIwf6KoUMoIHwRxN3jw",
        words: ["happy", "sad", "brave"],
        storyPackCta: "episode_koko_feelings_pack",
      },
      {
        path: "/zh/episodes/koko-feelings",
        url: "https://fursay.com/zh/episodes/koko-feelings",
        pack: "koko",
        locale: "zh-TW",
        title: "Koko 情緒故事包",
        channel: "Koko's Forest Adventure",
        watchEmbed: "https://www.youtube-nocookie.com/embed/videoseries?list=UU0X4CIwf6KoUMoIHwRxN3jw",
        words: ["happy", "sad", "brave"],
        storyPackCta: "episode_koko_feelings_pack",
      },
      {
        path: "/ar/episodes/koko-feelings",
        url: "https://fursay.com/ar/episodes/koko-feelings",
        pack: "koko",
        locale: "ar",
        title: "حزمة كوكو للمشاعر",
        channel: "Koko's Forest Adventure",
        watchEmbed: "https://www.youtube-nocookie.com/embed/videoseries?list=UU0X4CIwf6KoUMoIHwRxN3jw",
        words: ["happy", "sad", "brave"],
        storyPackCta: "episode_koko_feelings_pack",
      },
      {
        path: "/episodes/noor-colors",
        url: "https://fursay.com/episodes/noor-colors",
        pack: "noor",
        locale: "en",
        title: "Noor Colors Story Pack",
        channel: "Arabic Kids Chinese Picture Book",
        watchEmbed: "https://www.youtube-nocookie.com/embed/videoseries?list=UUOxmnonpfBvpiV8Vg5LEiYw",
        words: ["hong se", "lan se", "lu se"],
        storyPackCta: "episode_noor_colors_pack",
      },
      {
        path: "/zh/episodes/noor-colors",
        url: "https://fursay.com/zh/episodes/noor-colors",
        pack: "noor",
        locale: "zh-TW",
        title: "Noor 顏色故事包",
        channel: "Arabic Kids Chinese Picture Book",
        watchEmbed: "https://www.youtube-nocookie.com/embed/videoseries?list=UUOxmnonpfBvpiV8Vg5LEiYw",
        words: ["hong se", "lan se", "lu se"],
        storyPackCta: "episode_noor_colors_pack",
      },
      {
        path: "/ar/episodes/noor-colors",
        url: "https://fursay.com/ar/episodes/noor-colors",
        pack: "noor",
        locale: "ar",
        title: "حزمة ألوان نور",
        channel: "Arabic Kids Chinese Picture Book",
        watchEmbed: "https://www.youtube-nocookie.com/embed/videoseries?list=UUOxmnonpfBvpiV8Vg5LEiYw",
        words: ["hong se", "lan se", "lu se"],
        storyPackCta: "episode_noor_colors_pack",
      },
      {
        path: "/episodes/noor-greetings",
        url: "https://fursay.com/episodes/noor-greetings",
        pack: "noor",
        locale: "en",
        title: "Noor Greetings Story Pack",
        channel: "Arabic Kids Chinese Picture Book",
        watchEmbed: "https://www.youtube-nocookie.com/embed/videoseries?list=UUOxmnonpfBvpiV8Vg5LEiYw",
        words: ["ni hao", "zai jian", "xie xie"],
        storyPackCta: "episode_noor_greetings_pack",
      },
      {
        path: "/zh/episodes/noor-greetings",
        url: "https://fursay.com/zh/episodes/noor-greetings",
        pack: "noor",
        locale: "zh-TW",
        title: "Noor 問候故事包",
        channel: "Arabic Kids Chinese Picture Book",
        watchEmbed: "https://www.youtube-nocookie.com/embed/videoseries?list=UUOxmnonpfBvpiV8Vg5LEiYw",
        words: ["ni hao", "zai jian", "xie xie"],
        storyPackCta: "episode_noor_greetings_pack",
      },
      {
        path: "/ar/episodes/noor-greetings",
        url: "https://fursay.com/ar/episodes/noor-greetings",
        pack: "noor",
        locale: "ar",
        title: "حزمة تحيات نور",
        channel: "Arabic Kids Chinese Picture Book",
        watchEmbed: "https://www.youtube-nocookie.com/embed/videoseries?list=UUOxmnonpfBvpiV8Vg5LEiYw",
        words: ["ni hao", "zai jian", "xie xie"],
        storyPackCta: "episode_noor_greetings_pack",
      },
    ],
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

function writeConversionHealth(siteDir, source) {
  const release = readJson(resolve(siteDir, "release.json"));
  const trafficLaunch = readJson(resolve(siteDir, "traffic-launch.json"));
  const noorSprint = trafficLaunch.activationSprints?.noorFirstSubscriber || {};
  const trackedNoorSprintVariants = (noorSprint.copyVariants || []).map((variant) => {
    const link = variant.link || "";
    const storyLink = variant.storyLink || "";
    const params = new URL(link || "https://fursay.com").searchParams;
    const storyParams = new URL(storyLink || "https://fursay.com").searchParams;
    return {
      id: variant.id,
      label: variant.label,
      placement: variant.placement,
      sourceId: params.get("source_id") || "",
      creator: params.get("creator") || "",
      link,
      storySourceId: storyParams.get("source_id") || "",
      storyLink,
      reportFamily: "noor_growth_signals",
    };
  });
  const manifest = {
    site: "Fursay",
    origin: "https://fursay.com",
    platform: "cloudflare-workers-static-assets",
    updatedAt: taipeiDateString(),
    source,
    measurement: {
      anonymousEventEndpoint: "https://fursay.com/api/event",
      piiAllowed: false,
      subscribePayloadCompatibility: "email/groups/attribution unchanged",
      externalAnalytics: "worker_event_endpoint",
      analyticsSink: {
        binding: "FURSAY_EVENTS",
        dataset: "fursay_events",
        status: "pending_cloudflare_dashboard_enablement",
        writeMode: "worker_logs_until_dashboard_enabled",
        fallbackSink: "Cloudflare Worker logs",
        deployBlockerCode: "10089",
        enablementUrl: "https://dash.cloudflare.com/e6780ef96bb6f53eba1dbc4d6dfa7376/workers/analytics-engine",
        piiAllowed: false,
        blobFields: [
          "event",
          "path",
          "locale",
          "page_pack",
          "campaign",
          "pack",
          "signup_source",
          "market",
          "product_id",
          "outbound_host",
          "outbound_path",
          "copy_kind",
          "product_interest",
          "interest_stage",
          "colo",
          "source_id",
          "creator",
          "placement",
        ],
        doubleFields: ["event_count"],
        sqlApi: "Cloudflare Analytics Engine SQL API after account enablement",
      },
      analyticsReport: {
        script: "scripts/query-event-analytics-report.mjs",
        packageScript: "npm run report:events",
        status: "pending_cloudflare_credentials_or_enablement",
        dataset: "fursay_events",
        windowDays: 7,
        comparisonWindows: release.liveExpectations.eventAnalyticsReportComparisonWindows,
        queryCount: release.liveExpectations.eventAnalyticsReportQueries,
        output: "/tmp/fursay-event-analytics-report/event-analytics-report.json",
        requiredEnv: ["CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_ANALYTICS_TOKEN"],
        piiAllowed: false,
        queries: [
          "event_totals_7d",
          "subscribe_funnel_by_pack_7d",
          "page_intent_7d",
          "affiliate_interest_7d",
          "outbound_destinations_7d",
          "noor_growth_signals_7d",
          "event_totals_30d",
          "subscribe_funnel_by_pack_30d",
          "page_intent_30d",
          "affiliate_interest_30d",
          "outbound_destinations_30d",
          "noor_growth_signals_30d",
        ],
      },
      fallbackReviewSurface: "Cloudflare Worker logs",
    },
    events: [
      "fursay_subscribe_open_click",
      "fursay_subscribe_modal_open",
      "fursay_subscribe_submit_attempt",
      "fursay_subscribe_submit_success",
      "fursay_subscribe_submit_failure",
      "fursay_affiliate_click",
      "fursay_outbound_click",
      "fursay_share_click",
      "fursay_pack_link_copy_click",
      "fursay_sample_link_copy_click",
      "fursay_public_share_copy_click",
      "fursay_kit_copy_click",
      "fursay_product_interest_click",
      "fursay_product_info_click",
      "fursay_product_sample_download_click",
    ],
    coverage: {
      publicStoryPages: release.liveExpectations.pages,
      subscribeOpenPages: release.liveExpectations.eventTrackingPages,
      affiliateClickPages: release.liveExpectations.affiliateEventTrackingPages,
      outboundClickPages: release.liveExpectations.eventTrackingPages,
      shareOrCopyPages: release.liveExpectations.eventTrackingPages,
      productInterestPages: release.liveExpectations.pages,
      submitAttemptPages: release.liveExpectations.eventTrackingSubmitPages,
    },
    growth: {
      latestStoryEntries: release.liveExpectations.latestStoryEntries,
      episodeLandingPages: release.liveExpectations.episodeLandingPages,
      noorLeadMagnetPages: release.liveExpectations.noorLeadMagnetPages,
      noorReadinessStatus: "safe_wait_subscriber_empty",
      noorSubscriberSignalGoal: 1,
      noorSubscriberSignalStatus: "waiting_for_first_real_subscriber_signal",
      noorSprintVariantCount: trackedNoorSprintVariants.length,
      noorSprintVariants: trackedNoorSprintVariants,
      productInterestLinks: release.liveExpectations.productInterestLinks,
      productInfoLinks: release.liveExpectations.productInfoLinks,
    },
    monetization: {
      affiliate: {
        amazonLinks: release.liveExpectations.amazonAffiliateLinks,
        amazonTag: release.liveExpectations.amazonAffiliateTag,
        booksLinks: release.liveExpectations.booksAffiliateLinks,
        booksAffiliateId: release.liveExpectations.booksAffiliateId,
        localePolicy: "zh-TW pages use Books.com.tw; English and Arabic pages use Amazon",
      },
      ownedProducts: {
        checkoutEnabled: false,
        interestOnly: true,
        status: "interest_validation",
        checkoutGate: {
          status: "blocked_until_interest_signal",
          provider: "not_selected",
          requirements: [
            "verified_product_interest_clicks",
            "disclosure_copy",
            "refund_support_copy",
            "checkout_tracking_contract",
          ],
          minimumInterestClicks: 10,
          minimumSubscriberSignals: 1,
          paymentLinksAllowed: false,
          disclosureCopy: "Paid worksheet or printable packs will be clearly labeled before checkout; affiliate links remain separate from owned products.",
          refundSupportCopy: "Refund and support instructions must be published before any checkout link is enabled.",
          trackingGate: "Checkout links stay disabled until fursay_product_interest_click and subscribe success reporting can be reviewed.",
        },
        validationDashboard: {
          status: "pending_cloudflare_credentials_or_enablement",
          reportCommand: "npm run report:events",
          windowDays: release.liveExpectations.eventAnalyticsReportWindowDays,
          comparisonWindows: release.liveExpectations.eventAnalyticsReportComparisonWindows,
          unlockPolicy: "Each product needs product info clicks, product interest clicks, and subscriber signals before a full-pack or checkout decision changes.",
          metrics: ["productInfoClicks", "productInterestClicks", "subscriberSignals"],
        },
        products: [
          {
            id: "koko-printable-pack",
            pack: "koko",
            label: "Koko printable pack interest list",
            format: "PDF printable pack",
            plannedIncludes: ["story prompt sheet", "emotion word practice", "parent-child drawing activity"],
            checkoutStatus: "not_enabled",
            samplePreview: {
              status: "print_ready_preview",
              url: "https://fursay.com/product-samples/koko-printable",
              label: "Preview the Koko 3-page printable sample",
              noindex: true,
              printReady: true,
              downloadableFormat: "pdf_and_browser_print",
              downloadUrl: "https://fursay.com/downloads/koko-printable-sample.pdf",
              contents: ["Story moment prompt", "Three feeling words", "Draw-and-tell activity"],
              nextCta: "/koko?subscribe=koko&utm_source=sample_preview&utm_medium=site&utm_campaign=koko_story_funnel&utm_content=koko_printable_preview",
            },
            validationPlan: {
              audience: "Mandarin-speaking families testing English feelings practice after a Koko story.",
              freeBridge: "/koko",
              signals: ["fursay_product_info_click", "fursay_product_interest_click", "fursay_subscribe_submit_success"],
              minimumSignals: {
                productInfoClicks: 10,
                productInterestClicks: 5,
                subscriberSignals: 1,
              },
              nextDecision: "Expand the print-ready preview into a complete Koko printable pack only after product-interest clicks and at least one subscriber signal prove family demand.",
            },
          },
          {
            id: "noor-worksheet-pack",
            pack: "noor",
            label: "Noor 3-minute worksheet interest list",
            format: "PDF worksheet pack",
            plannedIncludes: ["Chinese color words with Pinyin", "Arabic parent prompts", "one 3-minute activity"],
            checkoutStatus: "not_enabled",
            samplePreview: {
              status: "print_ready_preview",
              url: "https://fursay.com/product-samples/noor-worksheet",
              label: "Preview the Noor 3-minute worksheet sample",
              noindex: true,
              printReady: true,
              downloadableFormat: "pdf_and_browser_print",
              downloadUrl: "https://fursay.com/downloads/noor-worksheet-sample.pdf",
              contents: ["Three Chinese words with Pinyin", "Arabic parent prompt", "One 3-minute activity"],
              nextCta: "/arabic?subscribe=noor&utm_source=sample_preview&utm_medium=site&utm_campaign=noor_story_funnel&utm_content=noor_worksheet_preview",
            },
            validationPlan: {
              audience: "Arabic-speaking families testing a tiny Chinese practice ritual with Noor parent prompts.",
              freeBridge: "/arabic",
              signals: ["fursay_product_info_click", "fursay_product_interest_click", "fursay_subscribe_submit_success"],
              minimumSignals: {
                productInfoClicks: 10,
                productInterestClicks: 5,
                subscriberSignals: 1,
              },
              nextDecision: "Expand the print-ready preview into a complete Noor worksheet pack only after Noor interest and at least one subscriber signal prove family demand.",
            },
          },
        ],
      },
    },
  };
  writeFileSync(resolve(siteDir, "conversion-health.json"), JSON.stringify(manifest, null, 2) + "\n");
}

function writeProductsManifest(siteDir, source) {
  const conversionHealth = readJson(resolve(siteDir, "conversion-health.json"));
  const ownedProducts = conversionHealth.monetization?.ownedProducts || {};
  const links = readJson(resolve(siteDir, "links.json"));
  const manifest = {
    site: "Fursay",
    origin: "https://fursay.com",
    platform: "cloudflare-workers-static-assets",
    updatedAt: taipeiDateString(),
    source,
    status: "interest_validation",
    page: "https://fursay.com/products",
    conversionHealth: "https://fursay.com/conversion-health.json",
    checkoutEnabled: ownedProducts.checkoutEnabled === true ? true : false,
    paymentLinksAllowed: ownedProducts.checkoutGate?.paymentLinksAllowed === true ? true : false,
    interestOnly: ownedProducts.interestOnly !== false,
    event: "fursay_product_interest_click",
    trafficEntryPoints: {
      socialProfileLinks: links.operations?.productInterest?.url || PRODUCT_INTEREST_SOCIAL_LINK,
      zhSocialProfileLinks: links.operations?.zhProductInterest?.url || ZH_PRODUCT_INTEREST_SOCIAL_LINK,
      arSocialProfileLinks: links.operations?.arProductInterest?.url || AR_PRODUCT_INTEREST_SOCIAL_LINK,
    },
    samplePreviews: (ownedProducts.products || []).map((product) => ({
      productId: product.id,
      pack: product.pack,
      ...(product.samplePreview || {}),
    })),
    subscribePayloadCompatibility: conversionHealth.measurement?.subscribePayloadCompatibility || "email/groups/attribution unchanged",
    checkoutGate: ownedProducts.checkoutGate || {},
    products: ownedProducts.products || [],
  };
  writeFileSync(resolve(siteDir, "products.json"), JSON.stringify(manifest, null, 2) + "\n");
}

function writeMonetizationRoadmap(siteDir, source) {
  const release = readJson(resolve(siteDir, "release.json"));
  const conversionHealth = readJson(resolve(siteDir, "conversion-health.json"));
  const products = readJson(resolve(siteDir, "products.json"));
  const ownedProducts = conversionHealth.monetization?.ownedProducts || {};
  const checkoutGate = ownedProducts.checkoutGate || {};
  const manifest = {
    site: "Fursay",
    origin: "https://fursay.com",
    platform: "cloudflare-workers-static-assets",
    updatedAt: taipeiDateString(),
    source,
    status: "interest_validation",
    page: "https://fursay.com/monetization-roadmap",
    productsManifest: "https://fursay.com/products.json",
    conversionHealth: "https://fursay.com/conversion-health.json",
    checkoutEnabled: products.checkoutEnabled === true,
    paymentLinksAllowed: products.paymentLinksAllowed === true,
    decisionState: "wait_for_interest_and_subscriber_signal",
    subscribePayloadCompatibility: products.subscribePayloadCompatibility,
    stages: [
      {
        id: "validate_interest",
        label: "Validate real product interest",
        status: "active",
        requiredSignals: ["fursay_product_info_click", "fursay_product_interest_click", "fursay_subscribe_submit_success"],
        evidenceSources: ["products.json", "conversion-health.json"],
        unlocks: "publish_precheckout_disclosure",
      },
      {
        id: "draft_sample_pack",
        label: "Draft sample PDF packs",
        status: "completed",
        completedAt: taipeiDateString(),
        evidenceSources: ["products.json", "product sample preview pages", "sample PDF downloads"],
        nextGate: "Keep checkout locked until each product meets minimum product-interest and subscriber signals.",
        deliverables: ["Koko 3-page printable sample", "Noor 3-minute worksheet sample"],
      },
      {
        id: "publish_precheckout_disclosure",
        label: "Publish checkout disclosure",
        status: "locked",
        requirements: checkoutGate.requirements || [],
        disclosureCopy: checkoutGate.disclosureCopy || "",
        refundSupportCopy: checkoutGate.refundSupportCopy || "",
      },
      {
        id: "choose_checkout_provider",
        label: "Choose checkout provider",
        status: "locked",
        provider: checkoutGate.provider || "not_selected",
        paymentLinksAllowed: checkoutGate.paymentLinksAllowed === true,
        allowedProviderCategories: ["hosted checkout", "creator storefront", "direct card checkout"],
      },
    ],
    products: (products.products || []).map((product) => ({
      id: product.id,
      pack: product.pack,
      label: product.label,
      format: product.format,
      checkoutStatus: product.checkoutStatus,
      plannedIncludes: product.plannedIncludes || [],
      samplePreview: product.samplePreview || {},
      validationPlan: product.validationPlan || {},
    })),
    guardrails: {
      noPaymentLinks: true,
      noPricePromise: true,
      noMailerLiteSecrets: true,
      noPiiInAnalytics: true,
      affiliateLocalePolicy: conversionHealth.monetization?.affiliate?.localePolicy || "",
      subscribePayloadCompatibility: products.subscribePayloadCompatibility,
    },
    expectations: {
      stages: release.liveExpectations?.monetizationRoadmapStages,
      products: release.liveExpectations?.monetizationRoadmapProducts,
      checkoutGateRequirements: release.liveExpectations?.checkoutGateRequirements,
    },
  };
  writeFileSync(resolve(siteDir, "monetization-roadmap.json"), JSON.stringify(manifest, null, 2) + "\n");
}

function productButton(product) {
  const source = product.pack === "noor" ? "product_page_noor_worksheet" : "product_page_koko_printable";
  return `<button class="creator-copy-button" type="button" data-product-interest="${escapeHtml(product.pack)}" data-interest-stage="waitlist" data-signup-source="${escapeHtml(source)}">Join ${escapeHtml(product.pack === "noor" ? "Noor" : "Koko")} waitlist</button>`;
}

function samplePreviewHref(product) {
  try {
    return new URL(product.samplePreview?.url || "").pathname || "";
  } catch {
    return "";
  }
}

function productPublicCopy(product) {
  if (product.pack === "noor") {
    return {
      eyebrow: "Noor Chinese-Arabic worksheet",
      label: "Noor 3-minute worksheet pack",
      audience: "For families who want a tiny Chinese practice ritual with Arabic parent prompts.",
      outcome: "Use one short story moment to practice three Chinese words, hear the parent prompt in Arabic, and finish a quick activity before attention fades.",
      format: "Printable PDF worksheets with Pinyin, Arabic prompts, and one 3-minute activity.",
      previewLabel: "Preview the free Noor worksheet sample",
      bridge: "/arabic?subscribe=noor&utm_source=products&utm_medium=site&utm_campaign=noor_story_funnel&utm_content=product_page_sample",
      bridgeLabel: "Get the free Noor story pack",
    };
  }
  return {
    eyebrow: "Koko English printable",
    label: "Koko printable story pack",
    audience: "For Mandarin-speaking families who want English feelings practice after a short forest story.",
    outcome: "Turn one Koko episode into a calm parent-child activity with emotion words, a drawing prompt, and one printable page.",
    format: "Printable PDF pages with story prompts, emotion word practice, and parent-child drawing space.",
    previewLabel: "Preview the free Koko printable sample",
    bridge: "/koko?subscribe=koko&utm_source=products&utm_medium=site&utm_campaign=koko_story_funnel&utm_content=product_page_sample",
    bridgeLabel: "Get the free Koko story pack",
  };
}

function productsJsonLd(manifest) {
  const products = (manifest.products || []).map((product) => {
    const copy = productPublicCopy(product);
    return {
      "@type": "Product",
      name: copy.label,
      description: `${copy.format} Interest list only; no payment today.`,
      brand: {
        "@type": "Brand",
        name: "Fursay",
      },
      audience: {
        "@type": "PeopleAudience",
        audienceType: copy.audience,
      },
      offers: {
        "@type": "Offer",
        availability: "https://schema.org/PreOrder",
        price: "0",
        priceCurrency: "USD",
        description: "Interest validation only. Paid access is not open, and the family is not charged on this page.",
        url: "https://fursay.com/products",
      },
      potentialAction: {
        "@type": "RegisterAction",
        target: "https://fursay.com/products",
        name: `Join the ${product.pack === "noor" ? "Noor" : "Koko"} waitlist`,
      },
    };
  });
  return JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "https://fursay.com/products#webpage",
        url: "https://fursay.com/products",
        name: "Fursay printable story pack waitlist",
        description: "Join the Koko printable pack or Noor 3-minute worksheet pack waitlist. No payment today.",
        isPartOf: {
          "@type": "WebSite",
          name: "Fursay",
          url: "https://fursay.com/",
        },
      },
      {
        "@type": "ItemList",
        name: "Fursay product waitlists",
        itemListElement: products.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          item,
        })),
      },
    ],
  });
}

function zhProductsJsonLd(manifest) {
  const products = (manifest.products || []).map((product) => {
    const copy = zhProductCopy(product);
    return {
      "@type": "Product",
      name: copy.label,
      description: `${copy.format} 目前只收集興趣信號，今天不會收費。`,
      brand: {
        "@type": "Brand",
        name: "Fursay",
      },
      audience: {
        "@type": "PeopleAudience",
        audienceType: copy.audience,
      },
      offers: {
        "@type": "Offer",
        availability: "https://schema.org/PreOrder",
        price: "0",
        priceCurrency: "USD",
        description: "等候名單與興趣驗證階段。付費版本尚未開放，這個頁面不會向家庭收費。",
        url: "https://fursay.com/zh/products",
      },
      potentialAction: {
        "@type": "RegisterAction",
        target: "https://fursay.com/zh/products",
        name: copy.button,
      },
    };
  });
  return JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "https://fursay.com/zh/products#webpage",
        url: "https://fursay.com/zh/products",
        name: "Fursay 親子可列印故事包等候名單",
        description: "加入叩叩可列印故事包或努爾 3 分鐘學習單等候名單。先領免費故事包，今天不會收費。",
        inLanguage: "zh-TW",
        isPartOf: {
          "@type": "WebSite",
          name: "Fursay",
          url: "https://fursay.com/",
        },
      },
      {
        "@type": "ItemList",
        name: "Fursay 親子產品等候名單",
        itemListElement: products.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          item,
        })),
      },
    ],
  });
}

function arProductCopy(product) {
  if (product.pack === "noor") {
    return {
      eyebrow: "ورقة نور الصينية في 3 دقائق",
      label: "قائمة انتظار ورقة نور في 3 دقائق",
      audience: "للعائلات العربية التي تريد عادة قصيرة جدا لتجربة الصينية مع توجيه للوالدين بالعربية.",
      outcome: "ابدؤوا من لحظة قصة قصيرة، تمرنوا على ثلاث كلمات صينية مع البينيين، وأنهوا نشاطا صغيرا قبل أن يتعب انتباه الطفل.",
      format: "ورقة PDF قابلة للطباعة مع كلمات صينية وبينيين، توجيهات عربية للوالدين، ونشاط لمدة 3 دقائق.",
      plannedIncludes: [
        "كلمات صينية مع البينيين",
        "توجيهات عربية للوالدين",
        "نشاط عائلي في 3 دقائق",
      ],
      validationAudience: "عائلات عربية تريد تجربة صينية قصيرة جدا مع توجيه واضح للوالدين.",
      validationNextDecision: "سنجهز عينة ورقة نور فقط بعد ظهور نقرات حقيقية على قائمة الانتظار وإشارة اشتراك واحدة على الأقل.",
      previewLabel: "شاهدوا عينة ورقة نور المجانية",
      bridge: "/ar/arabic?subscribe=noor&utm_source=ar_products&utm_medium=site&utm_campaign=noor_story_funnel&utm_content=product_page_sample",
      bridgeLabel: "احصلوا على حزمة نور المجانية",
      button: "انضموا لقائمة نور",
    };
  }
  return {
    eyebrow: "حزمة كوكو الإنجليزية",
    label: "قائمة انتظار حزمة كوكو القابلة للطباعة",
    audience: "للعائلات الناطقة بالصينية التي تريد تدريب كلمات المشاعر بالإنجليزية بعد قصة قصيرة.",
    outcome: "حوّلوا قصة كوكو إلى صفحة هادئة: كلمة شعور، سؤال صغير، ومساحة رسم للطفل.",
    format: "صفحات PDF قابلة للطباعة مع أسئلة قصة، تدريب كلمات المشاعر، ونشاط رسم عائلي.",
    plannedIncludes: [
      "ورقة تذكير بالقصة",
      "تدريب كلمات المشاعر بالإنجليزية",
      "نشاط رسم للوالد والطفل",
    ],
    validationAudience: "عائلات ناطقة بالصينية تريد متابعة قصيرة بعد قصة كوكو الإنجليزية.",
    validationNextDecision: "سنجهز عينة حزمة كوكو فقط بعد ظهور نقرات حقيقية على قائمة الانتظار وإشارة اشتراك واحدة على الأقل.",
    previewLabel: "شاهدوا عينة كوكو المجانية",
    bridge: "/ar/koko?subscribe=koko&utm_source=ar_products&utm_medium=site&utm_campaign=koko_story_funnel&utm_content=product_page_sample",
    bridgeLabel: "احصلوا على حزمة كوكو المجانية",
    button: "انضموا لقائمة كوكو",
  };
}

function arProductsJsonLd(manifest) {
  const products = (manifest.products || []).map((product) => {
    const copy = arProductCopy(product);
    return {
      "@type": "Product",
      name: copy.label,
      description: `${copy.format} قائمة اهتمام فقط؛ لا دفع اليوم.`,
      brand: {
        "@type": "Brand",
        name: "Fursay",
      },
      audience: {
        "@type": "PeopleAudience",
        audienceType: copy.audience,
      },
      offers: {
        "@type": "Offer",
        availability: "https://schema.org/PreOrder",
        price: "0",
        priceCurrency: "USD",
        description: "مرحلة انتظار وقياس اهتمام فقط. النسخة المدفوعة غير مفتوحة، ولا يتم تحصيل أي مبلغ من هذه الصفحة.",
        url: "https://fursay.com/ar/products",
      },
      potentialAction: {
        "@type": "RegisterAction",
        target: "https://fursay.com/ar/products",
        name: copy.button,
      },
    };
  });
  return JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "https://fursay.com/ar/products#webpage",
        url: "https://fursay.com/ar/products",
        name: "قائمة انتظار حزم Fursay القابلة للطباعة",
        description: "انضموا إلى قائمة انتظار حزمة كوكو القابلة للطباعة أو ورقة نور في 3 دقائق. الحزمة المجانية أولا، ولا دفع اليوم.",
        inLanguage: "ar",
        isPartOf: {
          "@type": "WebSite",
          name: "Fursay",
          url: "https://fursay.com/",
        },
      },
      {
        "@type": "ItemList",
        name: "قوائم انتظار منتجات Fursay",
        itemListElement: products.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          item,
        })),
      },
    ],
  });
}

function writeProductsPage(siteDir) {
  const manifest = readJson(resolve(siteDir, "products.json"));
  const samplePreviews = (manifest.samplePreviews || [])
    .map((sample) => `
        <article class="creator-copy-block" data-product-sample-card="${escapeHtml(sample.pack)}">
          <h3>${escapeHtml(sample.label)}</h3>
          <p>Preview contents: ${escapeHtml((sample.contents || []).join(", "))}</p>
          <p>This is a free sample preview for interest validation. It is not a checkout page.</p>
          <a href="${escapeHtml(new URL(sample.url).pathname)}" data-product-sample-preview="${escapeHtml(sample.pack)}" data-product-info-link="${escapeHtml(sample.pack)}" data-interest-stage="sample_preview" data-signup-source="products_sample_preview_${escapeHtml(sample.pack)}">Open sample preview</a>
        </article>`)
    .join("\n");
  const products = (manifest.products || [])
    .map((product) => {
      const copy = productPublicCopy(product);
      return `
      <article class="creator-pack product-waitlist-card" data-product-card="${escapeHtml(product.id)}">
        <div class="creator-pack-copy">
          <p class="creator-eyebrow">${escapeHtml(copy.eyebrow)}</p>
          <h2>${escapeHtml(copy.label)}</h2>
          <p>${escapeHtml(copy.audience)}</p>
          <p>${escapeHtml(copy.outcome)}</p>
          <p><strong>No payment today.</strong> Join only if you want a note when this pack is ready to test.</p>
        </div>
        <div class="creator-copy-blocks">
          <article>
            <h3>What the pack is planned to include</h3>
            <ul>
              ${(product.plannedIncludes || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("\n")}
            </ul>
          </article>
          <article>
            <h3>How families would use it</h3>
            <p>${escapeHtml(copy.format)} Start with the free story pack, then use the printable when your child is ready for one more small activity.</p>
          </article>
          <article data-product-validation-plan="${escapeHtml(product.id)}">
            <h3>What we are measuring first</h3>
            <p>${escapeHtml(product.validationPlan?.audience || copy.audience)}</p>
            <p>Before any paid version opens, we look for product-page visits, waitlist clicks, and real story-pack signup signals.</p>
            <p>${escapeHtml(product.validationPlan?.nextDecision || "A sample pack is drafted only after real family interest is visible.")}</p>
          </article>
        </div>
        <p class="product-sample-inline"><a href="${escapeHtml(samplePreviewHref(product))}" data-product-sample-preview="${escapeHtml(product.pack)}" data-product-info-link="${escapeHtml(product.pack)}" data-interest-stage="sample_preview" data-signup-source="product_sample_preview_${escapeHtml(product.pack)}">${escapeHtml(copy.previewLabel)}</a></p>
        <div class="public-share-actions">
          ${productButton(product)}
          <a href="${escapeHtml(copy.bridge)}">${escapeHtml(copy.bridgeLabel)}</a>
        </div>
      </article>`;
    })
    .join("\n");
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fursay Printable Story Pack Waitlist</title>
  <meta name="description" content="Join the Fursay waitlist for Koko printable story packs and Noor 3-minute worksheet packs. Families get the free story pack first; paid access is not open.">
  <meta name="theme-color" content="#4CAF7D">
  <link rel="canonical" href="https://fursay.com/products">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <meta property="og:title" content="Fursay Printable Story Pack Waitlist">
  <meta property="og:description" content="Join interest lists for parent-child printable packs based on Koko and Noor story worlds. No payment today.">
  <meta property="og:url" content="https://fursay.com/products">
  <meta property="og:image" content="https://fursay.com/og-image.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="Fursay parent-child bilingual story world">
  <meta property="og:locale" content="en_US">
  <meta property="og:locale:alternate" content="zh_TW">
  <meta property="og:locale:alternate" content="ar_SA">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Fursay Printable Story Pack Waitlist">
  <meta name="twitter:description" content="Join the Koko or Noor printable pack waitlist. Free story pack first, no payment today.">
  <meta name="twitter:image" content="https://fursay.com/og-image.png">
  <meta name="twitter:image:alt" content="Fursay parent-child bilingual story world">
  <link rel="alternate" hreflang="en" href="https://fursay.com/products">
  <link rel="alternate" hreflang="zh-TW" href="https://fursay.com/zh/products">
  <link rel="alternate" hreflang="ar" href="https://fursay.com/ar/products">
  <link rel="alternate" hreflang="x-default" href="https://fursay.com/products">
  <link rel="stylesheet" href="/css/picture-book-base-20260613-base1.css">
  <link rel="stylesheet" href="/css/story-page-common-20260613-css1.css">
  <link rel="stylesheet" href="/css/picture-world-shared-20260613-traffic12.css">
  <link rel="stylesheet" href="/css/picture-world-tools-20260613-products1.css">
  <script type="application/ld+json">${productsJsonLd(manifest)}</script>
</head>
<body class="picture-world creator-kit-page products-page product-waitlist-page" data-page-pack="products">
  <main class="creator-kit-shell">
    <header class="creator-kit-hero product-waitlist-hero" data-product-hero>
      <p class="creator-eyebrow">Fursay printable packs</p>
      <h1>Printable story packs for busy parents</h1>
      <p>Choose Koko or Noor, get the free story pack first, and join the waitlist for a future printable PDF pack. Paid access is not open yet, and this page will not charge you.</p>
      <div class="product-trust-strip" aria-label="Product waitlist status">
        <span>No payment today</span>
        <span>Free story pack first</span>
        <span>Interest list only</span>
      </div>
    </header>
    <section class="creator-kit-safety" data-product-readiness-summary>
      <h2>How the waitlist works</h2>
      <div class="product-step-grid">
        <article>
          <h3>1. Pick a story world</h3>
          <p>Koko focuses on English feelings practice. Noor focuses on Chinese words with Arabic parent prompts.</p>
        </article>
        <article>
          <h3>2. Receive the free pack first</h3>
          <p>The signup opens the existing story-pack form, so families can try the learning rhythm before any paid product exists.</p>
        </article>
        <article>
          <h3>3. Get notified only if it opens</h3>
          <p>If enough families show interest, Fursay will publish clear pricing, support, and refund details before any payment step.</p>
        </article>
      </div>
    </section>
    <section class="creator-kit-safety" data-product-sample-previews>
      <h2>Free sample previews</h2>
      <p>See the kind of printable or worksheet families would test before any paid version exists.</p>
      <div class="creator-copy-blocks">
${samplePreviews}
      </div>
    </section>
${products}
    <section class="creator-kit-safety" data-product-readiness-gate>
      <h2>Before any paid pack opens</h2>
      <p>${escapeHtml(manifest.checkoutGate?.disclosureCopy || "")}</p>
      <p>${escapeHtml(manifest.checkoutGate?.refundSupportCopy || "")}</p>
      <p>The current goal is simple: learn whether families want printable packs after the free story pack. No price, purchase button, or payment link is active on this page.</p>
    </section>
    <section class="creator-kit-safety product-faq" data-product-faq>
      <h2>FAQ</h2>
      <div class="creator-copy-blocks">
        <article>
          <h3>Will I pay today?</h3>
          <p>No. The waitlist only records interest and opens the free story-pack signup.</p>
        </article>
        <article>
          <h3>What will I receive now?</h3>
          <p>You can join the weekly story pack list and choose Koko, Noor, or both inside the signup form.</p>
        </article>
        <article>
          <h3>When will the paid packs open?</h3>
          <p>Only after enough families click, subscribe, and ask for printable practice. The product may stay waitlist-only if interest is too low.</p>
        </article>
        <article>
          <h3>Can I cancel later?</h3>
          <p>Yes. Email updates include an unsubscribe option, and any future paid product will show support and refund details before payment.</p>
        </article>
      </div>
    </section>
  </main>
  <div class="modal-overlay" id="subscribeModal">
    <div class="modal-box">
      <button class="modal-close" data-close-subscribe aria-label="Close">&times;</button>
      <span class="modal-emoji">📬</span>
      <div class="modal-title">Join the story pack list</div>
      <p class="modal-sub">Pick Koko or Noor and get updates when the weekly story pack is ready. No payment today.</p>
      <form id="subscribeForm">
        <div class="modal-field"><label for="modalEmail">Email *</label><input type="email" id="modalEmail" placeholder="your@email.com" required></div>
        <div class="modal-field"><label>I'm interested in</label><div class="modal-checks"><label class="modal-check"><input type="checkbox" name="groups" value="koko"><span class="check-dot"></span>Koko's Forest (English)</label><label class="modal-check"><input type="checkbox" name="groups" value="noor"><span class="check-dot"></span>Noor's Adventure (Arabic-Chinese)</label></div></div>
        <button type="submit" class="modal-submit" id="modalSubmitBtn">Send me the weekly pack</button>
      </form>
      <p class="modal-note">No spam, ever. Unsubscribe anytime.</p>
    </div>
  </div>
  <script src="/js/site-shared-20260615-sharekit1.js"></script>
</body>
</html>`;
  writeFileSync(resolve(siteDir, "products.html"), html + "\n");
}

function zhProductCopy(product) {
  if (product.pack === "noor") {
    return {
      eyebrow: "努爾 3 分鐘學習單",
      label: "努爾 3 分鐘中文學習單等候名單",
      audience: "給想用阿語家長提示，陪孩子做一點點中文練習的家庭。",
      outcome: "從一個短故事開始，練三個中文詞、看拼音、用阿語提示完成一個 3 分鐘小活動。",
      format: "可列印 PDF 學習單，包含拼音、阿語家長提示，以及一個 3 分鐘活動。",
      plannedIncludes: [
        "中文詞語與拼音練習",
        "阿語家長提示",
        "一個 3 分鐘親子小活動",
      ],
      validationAudience: "想用阿語提示建立一個很短中文練習節奏的家庭。",
      validationNextDecision: "只有在努爾等候名單點擊與至少一個真實訂閱信號出現後，才會製作 3 分鐘學習單樣張。",
      previewLabel: "預覽免費努爾學習單樣張",
      bridge: "/zh/arabic?subscribe=noor&utm_source=zh_products&utm_medium=site&utm_campaign=noor_story_funnel&utm_content=product_page_sample",
      bridgeLabel: "先領免費努爾故事包",
      button: "加入努爾等候名單",
    };
  }
  return {
    eyebrow: "叩叩英文可列印包",
    label: "叩叩可列印故事包等候名單",
    audience: "給想在短故事後，陪孩子練英文情緒詞與畫畫活動的華語家庭。",
    outcome: "把一集叩叩故事變成一張安靜的親子練習頁：情緒詞、故事提示、孩子可以畫下來的空間。",
    format: "可列印 PDF 頁面，包含故事提示、情緒詞練習，以及親子畫畫活動。",
    plannedIncludes: [
      "故事提示頁",
      "英文情緒詞練習",
      "親子畫畫活動",
    ],
    validationAudience: "想在叩叩故事後陪孩子練英文情緒詞的華語家庭。",
    validationNextDecision: "只有在叩叩等候名單點擊與至少一個真實訂閱信號出現後，才會製作 3 頁可列印樣張。",
    previewLabel: "預覽免費叩叩可列印樣張",
    bridge: "/zh/koko?subscribe=koko&utm_source=zh_products&utm_medium=site&utm_campaign=koko_story_funnel&utm_content=product_page_sample",
    bridgeLabel: "先領免費叩叩故事包",
    button: "加入叩叩等候名單",
  };
}

function writeZhProductsPage(siteDir) {
  const manifest = readJson(resolve(siteDir, "products.json"));
  const samplePreviews = (manifest.samplePreviews || [])
    .map((sample) => `
        <article class="creator-copy-block" data-product-sample-card="${escapeHtml(sample.pack)}">
          <h3>${escapeHtml(sample.pack === "noor" ? "免費努爾學習單樣張" : "免費叩叩可列印樣張")}</h3>
          <p>樣張內容：${escapeHtml((sample.contents || []).join("、"))}</p>
          <p>這是用來驗證家庭興趣的免費預覽，不是付款頁。</p>
          <a href="${escapeHtml(new URL(sample.url).pathname)}" data-product-sample-preview="${escapeHtml(sample.pack)}" data-product-info-link="${escapeHtml(sample.pack)}" data-interest-stage="sample_preview" data-signup-source="zh_products_sample_preview_${escapeHtml(sample.pack)}">打開樣張預覽</a>
        </article>`)
    .join("\n");
  const products = (manifest.products || [])
    .map((product) => {
      const copy = zhProductCopy(product);
      const source = product.pack === "noor" ? "zh_product_page_noor_worksheet" : "zh_product_page_koko_printable";
      return `
      <article class="creator-pack product-waitlist-card" data-product-card="${escapeHtml(product.id)}">
        <div class="creator-pack-copy">
          <p class="creator-eyebrow">${escapeHtml(copy.eyebrow)}</p>
          <h2>${escapeHtml(copy.label)}</h2>
          <p>${escapeHtml(copy.audience)}</p>
          <p>${escapeHtml(copy.outcome)}</p>
          <p><strong>今天不會收費。</strong> 只有在你想收到未來測試通知時，才需要加入等候名單。</p>
        </div>
        <div class="creator-copy-blocks">
          <article>
            <h3>預計會包含什麼</h3>
            <ul>
              ${(copy.plannedIncludes || product.plannedIncludes || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("\n")}
            </ul>
          </article>
          <article>
            <h3>家庭可以怎麼用</h3>
            <p>${escapeHtml(copy.format)} 先從免費故事包開始，孩子準備好時，再把可列印練習當成故事後的一個小步驟。</p>
          </article>
          <article data-product-validation-plan="${escapeHtml(product.id)}">
            <h3>我們先觀察什麼</h3>
            <p>${escapeHtml(copy.validationAudience || product.validationPlan?.audience || copy.audience)}</p>
            <p>付費版本開放前，我們會先看產品頁點擊、等候名單點擊，以及真實故事包訂閱信號。</p>
            <p>${escapeHtml(copy.validationNextDecision || product.validationPlan?.nextDecision || "只有在看得到真實家庭需求後，才會製作測試樣張。")}</p>
          </article>
        </div>
        <p class="product-sample-inline"><a href="${escapeHtml(samplePreviewHref(product))}" data-product-sample-preview="${escapeHtml(product.pack)}" data-product-info-link="${escapeHtml(product.pack)}" data-interest-stage="sample_preview" data-signup-source="zh_product_sample_preview_${escapeHtml(product.pack)}">${escapeHtml(copy.previewLabel)}</a></p>
        <div class="public-share-actions">
          <button class="creator-copy-button" type="button" data-product-interest="${escapeHtml(product.pack)}" data-interest-stage="waitlist" data-signup-source="${escapeHtml(source)}">${escapeHtml(copy.button)}</button>
          <a href="${escapeHtml(copy.bridge)}">${escapeHtml(copy.bridgeLabel)}</a>
        </div>
      </article>`;
    })
    .join("\n");
  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fursay 親子可列印故事包等候名單</title>
  <meta name="description" content="加入 Fursay 叩叩可列印故事包與努爾 3 分鐘學習單等候名單。先領免費故事包，付費版本尚未開放，今天不會收費。">
  <meta name="theme-color" content="#4CAF7D">
  <link rel="canonical" href="https://fursay.com/zh/products">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <meta property="og:title" content="Fursay 親子可列印故事包等候名單">
  <meta property="og:description" content="先領免費故事包，再加入叩叩或努爾可列印包等候名單。今天不會收費。">
  <meta property="og:url" content="https://fursay.com/zh/products">
  <meta property="og:image" content="https://fursay.com/og-image.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="Fursay 親子雙語故事世界">
  <meta property="og:locale" content="zh_TW">
  <meta property="og:locale:alternate" content="en_US">
  <meta property="og:locale:alternate" content="ar_SA">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Fursay 親子可列印故事包等候名單">
  <meta name="twitter:description" content="加入叩叩或努爾可列印包等候名單。先領免費故事包，今天不會收費。">
  <meta name="twitter:image" content="https://fursay.com/og-image.png">
  <meta name="twitter:image:alt" content="Fursay 親子雙語故事世界">
  <link rel="alternate" hreflang="en" href="https://fursay.com/products">
  <link rel="alternate" hreflang="zh-TW" href="https://fursay.com/zh/products">
  <link rel="alternate" hreflang="ar" href="https://fursay.com/ar/products">
  <link rel="alternate" hreflang="x-default" href="https://fursay.com/products">
  <link rel="stylesheet" href="/css/picture-book-base-20260613-base1.css">
  <link rel="stylesheet" href="/css/story-page-common-20260613-css1.css">
  <link rel="stylesheet" href="/css/picture-world-shared-20260613-traffic12.css">
  <link rel="stylesheet" href="/css/picture-world-tools-20260613-products1.css">
  <script type="application/ld+json">${zhProductsJsonLd(manifest)}</script>
</head>
<body class="picture-world creator-kit-page products-page product-waitlist-page" data-page-pack="products">
  <main class="creator-kit-shell">
    <header class="creator-kit-hero product-waitlist-hero" data-product-hero>
      <p class="creator-eyebrow">Fursay 親子可列印包</p>
      <h1>先領免費故事包，再決定是否想要可列印練習</h1>
      <p>叩叩適合英文情緒詞陪讀，努爾適合阿語家庭做 3 分鐘中文練習。付費版本尚未開放，這個頁面不會收費。</p>
      <div class="product-trust-strip" aria-label="產品等候狀態">
        <span>今天不會收費</span>
        <span>先領免費故事包</span>
        <span>只收集興趣信號</span>
      </div>
    </header>
    <section class="creator-kit-safety" data-product-readiness-summary>
      <h2>等候名單怎麼運作</h2>
      <div class="product-step-grid">
        <article>
          <h3>1. 選一個故事世界</h3>
          <p>叩叩偏英文情緒詞，努爾偏中文詞語加阿語家長提示。</p>
        </article>
        <article>
          <h3>2. 先試免費故事包</h3>
          <p>按鈕會開啟既有故事包訂閱表單，讓家庭先試試節奏。</p>
        </article>
        <article>
          <h3>3. 有足夠需求才做付費包</h3>
          <p>如果興趣信號足夠，Fursay 才會公開定價、客服與退款說明。</p>
        </article>
      </div>
    </section>
    <section class="creator-kit-safety" data-product-sample-previews>
      <h2>免費樣張預覽</h2>
      <p>先看看未來可列印包可能長什麼樣子；這些預覽只用來確認家庭是否真的有需求。</p>
      <div class="creator-copy-blocks">
${samplePreviews}
      </div>
    </section>
${products}
    <section class="creator-kit-safety" data-product-readiness-gate>
      <h2>付費包開放前</h2>
      <p>付費學習單或可列印包會在付款前清楚標示；聯盟書單與自有產品會分開說明。</p>
      <p>任何付款連結啟用前，都會先公開退款與支援方式。</p>
      <p>目前目標是確認家庭是否真的想要故事後的可列印練習。這頁沒有價格、購買按鈕或付款連結。</p>
    </section>
    <section class="creator-kit-safety product-faq" data-product-faq>
      <h2>常見問題</h2>
      <div class="creator-copy-blocks">
        <article>
          <h3>今天會收費嗎？</h3>
          <p>不會。等候名單只用來記錄興趣，並開啟免費故事包訂閱表單。</p>
        </article>
        <article>
          <h3>現在會收到什麼？</h3>
          <p>你可以加入每週故事包名單，並在表單裡選擇叩叩、努爾或兩者都要。</p>
        </article>
        <article>
          <h3>什麼時候會開放付費包？</h3>
          <p>只有在足夠家庭點擊、訂閱並表示需要可列印練習後才會開放；如果需求不足，產品會維持等候名單。</p>
        </article>
        <article>
          <h3>之後可以取消嗎？</h3>
          <p>可以。Email 會提供取消訂閱方式，未來若有付費產品，也會在付款前公開支援與退款說明。</p>
        </article>
      </div>
    </section>
  </main>
  <div class="modal-overlay" id="subscribeModal">
    <div class="modal-box">
      <button class="modal-close" data-close-subscribe aria-label="關閉">&times;</button>
      <span class="modal-emoji">📬</span>
      <div class="modal-title">加入故事包名單</div>
      <p class="modal-sub">選擇叩叩或努爾，收到每週故事包與未來測試通知。今天不會收費。</p>
      <form id="subscribeForm">
        <div class="modal-field"><label for="modalEmail">Email *</label><input type="email" id="modalEmail" placeholder="your@email.com" required></div>
        <div class="modal-field"><label>我有興趣</label><div class="modal-checks"><label class="modal-check"><input type="checkbox" name="groups" value="koko"><span class="check-dot"></span>叩叩森林英文故事</label><label class="modal-check"><input type="checkbox" name="groups" value="noor"><span class="check-dot"></span>努爾阿語中文故事</label></div></div>
        <button type="submit" class="modal-submit" id="modalSubmitBtn">寄給我每週故事包</button>
      </form>
      <p class="modal-note">不寄垃圾信，可隨時取消訂閱。</p>
    </div>
  </div>
  <script src="/js/site-shared-20260615-sharekit1.js"></script>
</body>
</html>`;
  writeFileSync(resolve(siteDir, "zh/products.html"), html + "\n");
}

function writeArProductsPage(siteDir) {
  const manifest = readJson(resolve(siteDir, "products.json"));
  const samplePreviews = (manifest.samplePreviews || [])
    .map((sample) => `
        <article class="creator-copy-block" data-product-sample-card="${escapeHtml(sample.pack)}">
          <h3>${escapeHtml(sample.pack === "noor" ? "عينة مجانية من ورقة نور" : "عينة مجانية من حزمة كوكو")}</h3>
          <p>محتوى العينة: ${escapeHtml((sample.contents || []).join("، "))}</p>
          <p>هذه معاينة مجانية لاختبار اهتمام العائلات، وليست صفحة دفع.</p>
          <a href="${escapeHtml(new URL(sample.url).pathname)}" data-product-sample-preview="${escapeHtml(sample.pack)}" data-product-info-link="${escapeHtml(sample.pack)}" data-interest-stage="sample_preview" data-signup-source="ar_products_sample_preview_${escapeHtml(sample.pack)}">افتحوا معاينة العينة</a>
        </article>`)
    .join("\n");
  const products = (manifest.products || [])
    .map((product) => {
      const copy = arProductCopy(product);
      const source = product.pack === "noor" ? "ar_product_page_noor_worksheet" : "ar_product_page_koko_printable";
      return `
      <article class="creator-pack product-waitlist-card" data-product-card="${escapeHtml(product.id)}">
        <div class="creator-pack-copy">
          <p class="creator-eyebrow">${escapeHtml(copy.eyebrow)}</p>
          <h2>${escapeHtml(copy.label)}</h2>
          <p>${escapeHtml(copy.audience)}</p>
          <p>${escapeHtml(copy.outcome)}</p>
          <p><strong>لا دفع اليوم.</strong> انضموا فقط إذا أردتم إشعارا عند جاهزية نسخة اختبارية.</p>
        </div>
        <div class="creator-copy-blocks">
          <article>
            <h3>ما الذي قد تتضمنه الحزمة؟</h3>
            <ul>
              ${(copy.plannedIncludes || product.plannedIncludes || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("\n")}
            </ul>
          </article>
          <article>
            <h3>كيف تستخدمها العائلة؟</h3>
            <p>${escapeHtml(copy.format)} ابدؤوا بالحزمة المجانية، ثم استخدموا الورقة القابلة للطباعة كخطوة صغيرة بعد القصة.</p>
          </article>
          <article data-product-validation-plan="${escapeHtml(product.id)}">
            <h3>ما الذي نقيسه أولا؟</h3>
            <p>${escapeHtml(copy.validationAudience || product.validationPlan?.audience || copy.audience)}</p>
            <p>قبل فتح أي نسخة مدفوعة، نراقب زيارات صفحة المنتج، نقرات قائمة الانتظار، وإشارات الاشتراك الحقيقية.</p>
            <p>${escapeHtml(copy.validationNextDecision || product.validationPlan?.nextDecision || "لن نجهز عينة اختبارية إلا بعد ظهور اهتمام حقيقي من العائلات.")}</p>
          </article>
        </div>
        <p class="product-sample-inline"><a href="${escapeHtml(samplePreviewHref(product))}" data-product-sample-preview="${escapeHtml(product.pack)}" data-product-info-link="${escapeHtml(product.pack)}" data-interest-stage="sample_preview" data-signup-source="ar_product_sample_preview_${escapeHtml(product.pack)}">${escapeHtml(copy.previewLabel)}</a></p>
        <div class="public-share-actions">
          <button class="creator-copy-button" type="button" data-product-interest="${escapeHtml(product.pack)}" data-interest-stage="waitlist" data-signup-source="${escapeHtml(source)}">${escapeHtml(copy.button)}</button>
          <a href="${escapeHtml(copy.bridge)}">${escapeHtml(copy.bridgeLabel)}</a>
        </div>
      </article>`;
    })
    .join("\n");
  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>قائمة انتظار حزم Fursay القابلة للطباعة</title>
  <meta name="description" content="انضموا إلى قائمة انتظار حزمة كوكو القابلة للطباعة أو ورقة نور في 3 دقائق. ابدؤوا بالحزمة المجانية أولا؛ النسخة المدفوعة غير مفتوحة ولا دفع اليوم.">
  <meta name="theme-color" content="#4CAF7D">
  <link rel="canonical" href="https://fursay.com/ar/products">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <meta property="og:title" content="قائمة انتظار حزم Fursay القابلة للطباعة">
  <meta property="og:description" content="ابدؤوا بالحزمة المجانية، ثم انضموا إلى قائمة انتظار كوكو أو نور. لا دفع اليوم.">
  <meta property="og:url" content="https://fursay.com/ar/products">
  <meta property="og:image" content="https://fursay.com/og-image.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="عالم قصص Fursay للعائلات">
  <meta property="og:locale" content="ar_SA">
  <meta property="og:locale:alternate" content="en_US">
  <meta property="og:locale:alternate" content="zh_TW">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="قائمة انتظار حزم Fursay القابلة للطباعة">
  <meta name="twitter:description" content="انضموا إلى قائمة انتظار كوكو أو نور. الحزمة المجانية أولا، ولا دفع اليوم.">
  <meta name="twitter:image" content="https://fursay.com/og-image.png">
  <meta name="twitter:image:alt" content="عالم قصص Fursay للعائلات">
  <link rel="alternate" hreflang="en" href="https://fursay.com/products">
  <link rel="alternate" hreflang="zh-TW" href="https://fursay.com/zh/products">
  <link rel="alternate" hreflang="ar" href="https://fursay.com/ar/products">
  <link rel="alternate" hreflang="x-default" href="https://fursay.com/products">
  <link rel="stylesheet" href="/css/picture-book-base-20260613-base1.css">
  <link rel="stylesheet" href="/css/story-page-common-20260613-css1.css">
  <link rel="stylesheet" href="/css/picture-world-shared-20260613-traffic12.css">
  <link rel="stylesheet" href="/css/picture-world-tools-20260613-products1.css">
  <script type="application/ld+json">${arProductsJsonLd(manifest)}</script>
</head>
<body class="picture-world creator-kit-page products-page product-waitlist-page" data-page-pack="products">
  <main class="creator-kit-shell">
    <header class="creator-kit-hero product-waitlist-hero" data-product-hero>
      <p class="creator-eyebrow">حزم Fursay القابلة للطباعة</p>
      <h1>ابدؤوا بالحزمة المجانية، ثم قرروا إن كنتم تريدون ورقة قابلة للطباعة</h1>
      <p>كوكو مناسب لتدريب كلمات المشاعر بالإنجليزية، ونور مناسب لعائلات عربية تريد تجربة صينية قصيرة. النسخة المدفوعة غير مفتوحة، وهذه الصفحة لا تجمع أي دفع.</p>
      <div class="product-trust-strip" aria-label="حالة قائمة انتظار المنتج">
        <span>لا دفع اليوم</span>
        <span>الحزمة المجانية أولا</span>
        <span>قائمة اهتمام فقط</span>
      </div>
    </header>
    <section class="creator-kit-safety" data-product-readiness-summary>
      <h2>كيف تعمل قائمة الانتظار؟</h2>
      <div class="product-step-grid">
        <article>
          <h3>1. اختاروا عالم القصة</h3>
          <p>كوكو يركز على كلمات المشاعر بالإنجليزية. نور يركز على كلمات صينية مع توجيه عربي للوالدين.</p>
        </article>
        <article>
          <h3>2. جربوا الحزمة المجانية أولا</h3>
          <p>الأزرار تفتح نموذج حزمة القصة الحالي حتى تجرّب العائلة الإيقاع قبل وجود أي منتج مدفوع.</p>
        </article>
        <article>
          <h3>3. نخبركم فقط إذا أصبحت جاهزة</h3>
          <p>إذا ظهر اهتمام كاف، ستعرض Fursay السعر والدعم والاسترجاع بوضوح قبل أي خطوة دفع.</p>
        </article>
      </div>
    </section>
    <section class="creator-kit-safety" data-product-sample-previews>
      <h2>معاينات عينات مجانية</h2>
      <p>شاهدوا شكل الورقة أو الحزمة المحتملة قبل وجود أي نسخة مدفوعة.</p>
      <div class="creator-copy-blocks">
${samplePreviews}
      </div>
    </section>
${products}
    <section class="creator-kit-safety" data-product-readiness-gate>
      <h2>قبل فتح أي حزمة مدفوعة</h2>
      <p>أي ورقة أو حزمة مدفوعة ستكون موضحة بوضوح قبل الدفع؛ قوائم الكتب التابعة ومنتجات Fursay الخاصة ستبقى منفصلة.</p>
      <p>سيتم نشر طريقة الدعم والاسترجاع قبل تفعيل أي رابط دفع.</p>
      <p>الهدف الحالي هو معرفة هل تريد العائلات نشاطا قابلا للطباعة بعد القصة المجانية. لا يوجد سعر أو زر دفع أو رابط دفع في هذه الصفحة.</p>
    </section>
    <section class="creator-kit-safety product-faq" data-product-faq>
      <h2>أسئلة شائعة</h2>
      <div class="creator-copy-blocks">
        <article>
          <h3>هل سأدفع اليوم؟</h3>
          <p>لا. قائمة الانتظار تسجل الاهتمام فقط وتفتح نموذج حزمة القصة المجانية.</p>
        </article>
        <article>
          <h3>ماذا سأحصل الآن؟</h3>
          <p>يمكنكم الانضمام إلى قائمة حزمة القصص الأسبوعية واختيار كوكو أو نور أو كليهما داخل النموذج.</p>
        </article>
        <article>
          <h3>متى تفتح الحزم المدفوعة؟</h3>
          <p>فقط بعد ظهور اهتمام حقيقي من العائلات. قد تبقى الصفحة قائمة انتظار إذا كان الطلب منخفضا.</p>
        </article>
        <article>
          <h3>هل يمكنني الإلغاء لاحقا؟</h3>
          <p>نعم. رسائل البريد تتضمن خيار إلغاء الاشتراك، وأي منتج مدفوع مستقبلي سيعرض الدعم والاسترجاع قبل الدفع.</p>
        </article>
      </div>
    </section>
  </main>
  <div class="modal-overlay" id="subscribeModal">
    <div class="modal-box">
      <button class="modal-close" data-close-subscribe aria-label="إغلاق">&times;</button>
      <span class="modal-emoji">📬</span>
      <div class="modal-title">انضموا إلى قائمة حزمة القصة</div>
      <p class="modal-sub">اختاروا كوكو أو نور لتلقي تحديثات حزمة القصة الأسبوعية. لا دفع اليوم.</p>
      <form id="subscribeForm">
        <div class="modal-field"><label for="modalEmail">Email *</label><input type="email" id="modalEmail" placeholder="your@email.com" required></div>
        <div class="modal-field"><label>أنا مهتم بـ</label><div class="modal-checks"><label class="modal-check"><input type="checkbox" name="groups" value="koko"><span class="check-dot"></span>كوكو الإنجليزية</label><label class="modal-check"><input type="checkbox" name="groups" value="noor"><span class="check-dot"></span>نور العربية الصينية</label></div></div>
        <button type="submit" class="modal-submit" id="modalSubmitBtn">أرسلوا لي الحزمة الأسبوعية</button>
      </form>
      <p class="modal-note">لا رسائل مزعجة. يمكن إلغاء الاشتراك في أي وقت.</p>
    </div>
  </div>
  <script src="/js/site-shared-20260615-sharekit1.js"></script>
</body>
</html>`;
  writeFileSync(resolve(siteDir, "ar/products.html"), html + "\n");
}

function samplePageSpec(product) {
  if (product.pack === "noor") {
    return {
      path: "product-samples/noor-worksheet.html",
      canonical: "https://fursay.com/product-samples/noor-worksheet",
      lang: "en",
      title: "Noor 3-minute worksheet sample preview",
      description: "Preview the Noor 3-minute worksheet sample: three Chinese words with Pinyin, one Arabic parent prompt, and one tiny family activity.",
      eyebrow: "Free sample preview",
      h1: "Noor 3-minute worksheet sample",
      intro: "This preview shows the kind of tiny worksheet Fursay may create after enough families join the Noor interest list. It is a sample preview only; paid access is not open.",
      sections: [
        ["Word 1", "hong", "Red. Point to something red and say the word slowly with your child."],
        ["Word 2", "lan", "Blue. Ask your child to find one blue object near the story space."],
        ["Word 3", "lv", "Green. Let your child draw a green leaf for Noor and Zayd."],
      ],
      parentPrompt: "Arabic parent prompt: Read one word, point to one object, then stop while the activity still feels easy.",
      activity: "Three-minute activity: choose one color, draw a tiny object, and say the word once more with Pinyin.",
      storyCta: "/arabic?subscribe=noor&utm_source=sample_preview&utm_medium=site&utm_campaign=noor_story_funnel&utm_content=noor_worksheet_preview",
      storyCtaLabel: "Get the free Noor story pack",
      waitlistPack: "noor",
      waitlistSource: "sample_preview_noor_worksheet",
      waitlistLabel: "Join Noor worksheet interest list",
    };
  }
  return {
    path: "product-samples/koko-printable.html",
    canonical: "https://fursay.com/product-samples/koko-printable",
    lang: "en",
    title: "Koko printable pack sample preview",
    description: "Preview the Koko 3-page printable sample: a story moment prompt, three feeling words, and one draw-and-tell activity.",
    eyebrow: "Free sample preview",
    h1: "Koko 3-page printable sample",
    intro: "This preview shows the kind of printable Fursay may create after enough families join the Koko interest list. It is a sample preview only; paid access is not open.",
    sections: [
      ["Page 1", "Story moment", "Koko pauses in the forest. Ask: What did Koko notice first?"],
      ["Page 2", "Feeling words", "Practice happy, worried, and brave with one small face drawing for each word."],
      ["Page 3", "Draw and tell", "Draw Koko taking one brave step, then tell the story in one sentence."],
    ],
    parentPrompt: "Parent prompt: Keep the practice short. Read one line, let your child draw, then stop before the activity feels heavy.",
    activity: "Five-minute activity: circle one feeling word and draw one forest detail that matches it.",
    storyCta: "/koko?subscribe=koko&utm_source=sample_preview&utm_medium=site&utm_campaign=koko_story_funnel&utm_content=koko_printable_preview",
    storyCtaLabel: "Get the free Koko story pack",
    waitlistPack: "koko",
    waitlistSource: "sample_preview_koko_printable",
    waitlistLabel: "Join Koko printable interest list",
  };
}

function writeProductSamplePages(siteDir) {
  const manifest = readJson(resolve(siteDir, "products.json"));
  mkdirSync(resolve(siteDir, "product-samples"), { recursive: true });
  for (const product of manifest.products || []) {
    const spec = samplePageSpec(product);
    const downloadPath = product.samplePreview?.downloadUrl ? new URL(product.samplePreview.downloadUrl).pathname : "";
    const cards = spec.sections.map(([label, title, body]) => `
          <article class="creator-copy-block">
            <p class="creator-eyebrow">${escapeHtml(label)}</p>
            <h2>${escapeHtml(title)}</h2>
            <p>${escapeHtml(body)}</p>
          </article>`).join("\n");
    const html = `<!DOCTYPE html>
<html lang="${escapeHtml(spec.lang)}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(spec.title)}</title>
  <meta name="description" content="${escapeHtml(spec.description)}">
  <meta name="robots" content="noindex,follow">
  <meta name="theme-color" content="#4CAF7D">
  <link rel="canonical" href="${escapeHtml(spec.canonical)}">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/css/picture-book-base-20260613-base1.css">
  <link rel="stylesheet" href="/css/story-page-common-20260613-css1.css">
  <link rel="stylesheet" href="/css/picture-world-shared-20260613-traffic12.css">
  <link rel="stylesheet" href="/css/picture-world-tools-20260613-products1.css">
</head>
<body class="picture-world creator-kit-page products-page product-sample-preview-page" data-page-pack="products">
  <main class="creator-kit-shell">
    <header class="creator-kit-hero product-waitlist-hero" data-product-sample-preview-page="${escapeHtml(product.pack)}">
      <p class="creator-eyebrow">${escapeHtml(spec.eyebrow)}</p>
      <h1>${escapeHtml(spec.h1)}</h1>
      <p>${escapeHtml(spec.intro)}</p>
      <div class="product-trust-strip" aria-label="Sample preview status">
        <span>No payment today</span>
        <span>Print-ready preview</span>
        <span>Interest validation</span>
      </div>
      <div class="public-share-actions">
        <button class="creator-copy-button" type="button" data-product-interest="${escapeHtml(spec.waitlistPack)}" data-interest-stage="sample_preview_waitlist" data-signup-source="${escapeHtml(spec.waitlistSource)}">${escapeHtml(spec.waitlistLabel)}</button>
      </div>
    </header>
    <section class="creator-kit-safety" data-product-sample-preview="${escapeHtml(product.pack)}">
      <h2>What the sample would include</h2>
      <p class="product-sample-print-note">This page is formatted as a lightweight print view. You can download the PDF sample or use the browser print command to save one copy for family testing.</p>
      <div class="creator-copy-blocks">
${cards}
      </div>
    </section>
    <section class="creator-kit-safety" data-product-sample-print-view="${escapeHtml(product.pack)}">
      <h2>Download or print the sample</h2>
      <p>Download the PDF sample for sharing, or open your browser print menu and choose Save as PDF. The printed view keeps the sample cards, parent prompt, and activity steps while hiding extra page chrome.</p>
      <p>No checkout, price, or payment link is connected to this sample. It is only a trust-building preview before a paid pack exists.</p>
      <div class="public-share-actions">
        <a class="creator-copy-button product-sample-download-link" href="${escapeHtml(downloadPath)}" download data-product-sample-download="${escapeHtml(product.pack)}" data-product-info-link="${escapeHtml(product.pack)}" data-interest-stage="sample_pdf_download" data-signup-source="sample_pdf_download_${escapeHtml(product.pack)}">Download PDF sample</a>
        <button class="creator-copy-button product-sample-print-button" type="button" data-print-product-sample="${escapeHtml(product.pack)}" data-interest-stage="sample_print" data-signup-source="sample_print_${escapeHtml(product.pack)}">Print or save as PDF</button>
      </div>
    </section>
    <section class="creator-kit-safety" data-product-sample-activity="${escapeHtml(product.pack)}">
      <h2>How to test it with a child</h2>
      <p>${escapeHtml(spec.parentPrompt)}</p>
      <p>${escapeHtml(spec.activity)}</p>
      <p>This preview is here to validate interest before a paid product exists. There is no price, purchase button, or payment link on this page.</p>
      <div class="public-share-actions">
        <a href="${escapeHtml(spec.storyCta)}">${escapeHtml(spec.storyCtaLabel)}</a>
        <a href="/products?utm_source=sample_preview&utm_medium=site&utm_campaign=product_interest_validation&utm_content=${escapeHtml(spec.waitlistPack)}_sample_back_to_products">Back to product waitlists</a>
      </div>
    </section>
  </main>
  <div class="modal-overlay" id="subscribeModal">
    <div class="modal-box">
      <button class="modal-close" data-close-subscribe aria-label="Close">&times;</button>
      <span class="modal-emoji">📬</span>
      <div class="modal-title">Join the story pack list</div>
      <p class="modal-sub">Get the free story pack first. Paid sample packs are not open yet.</p>
      <form id="subscribeForm">
        <div class="modal-field"><label for="modalEmail">Email *</label><input type="email" id="modalEmail" placeholder="your@email.com" required></div>
        <div class="modal-field"><label>I'm interested in</label><div class="modal-checks"><label class="modal-check"><input type="checkbox" name="groups" value="koko"><span class="check-dot"></span>Koko's Forest (English)</label><label class="modal-check"><input type="checkbox" name="groups" value="noor"><span class="check-dot"></span>Noor's Adventure (Arabic-Chinese)</label></div></div>
        <button type="submit" class="modal-submit" id="modalSubmitBtn">Send me the weekly pack</button>
      </form>
      <p class="modal-note">No spam, ever. Unsubscribe anytime.</p>
    </div>
  </div>
  <script src="/js/site-shared-20260615-sharekit1.js"></script>
</body>
</html>`;
    writeFileSync(resolve(siteDir, spec.path), html + "\n");
  }
}

function healthMetric(label, value, note = "") {
  return `<div>
                <dt>${escapeHtml(label)}</dt>
                <dd>${escapeHtml(value)}${note ? ` <span>${escapeHtml(note)}</span>` : ""}</dd>
              </div>`;
}

function writeConversionHealthPage(siteDir) {
  const health = readJson(resolve(siteDir, "conversion-health.json"));
  const release = readJson(resolve(siteDir, "release.json"));
  const productsManifest = readJson(resolve(siteDir, "products.json"));
  const events = (health.events || [])
    .map((event) => `<li><code>${escapeHtml(event)}</code></li>`)
    .join("\n");
  const ownedProducts = (health.monetization?.ownedProducts?.products || [])
    .map((product) => `
            <article class="creator-copy-block">
              <h3>${escapeHtml(product.label)}</h3>
              <p>Pack: <code>${escapeHtml(product.pack)}</code>. ${escapeHtml(product.format || "Product spec")}. Checkout is disabled; current goal is interest-list validation only.</p>
              <p>Planned contents: ${escapeHtml((product.plannedIncludes || []).join(", "))}</p>
              <p>Sample preview: <a href="${escapeHtml(samplePreviewHref(product))}">${escapeHtml(product.samplePreview?.label || "Sample preview")}</a></p>
            </article>`)
    .join("\n");
  const productValidationCards = (health.monetization?.ownedProducts?.products || [])
    .map((product) => {
      const plan = product.validationPlan || {};
      const minimumSignals = plan.minimumSignals || {};
      return `
            <article class="creator-copy-block" data-product-validation-scorecard="${escapeHtml(product.id)}">
              <h3>${escapeHtml(product.label)}</h3>
              <p>Decision: ${escapeHtml(plan.nextDecision || "Wait for real interest signals before drafting the paid product.")}</p>
              <dl>
                ${healthMetric("Product info clicks", minimumSignals.productInfoClicks || 0, "minimum")}
                ${healthMetric("Waitlist clicks", minimumSignals.productInterestClicks || 0, "minimum")}
                ${healthMetric("Subscriber signals", minimumSignals.subscriberSignals || 0, "minimum")}
                ${healthMetric("Free bridge", plan.freeBridge || "none")}
              </dl>
            </article>`;
    })
    .join("\n");
  const noorSprintVariantCards = (health.growth?.noorSprintVariants || [])
    .map((variant) => `
            <article class="creator-copy-block" data-noor-growth-variant="${escapeHtml(variant.id)}">
              <h3>${escapeHtml(variant.label)}</h3>
              <p>Track in <code>${escapeHtml(variant.reportFamily || "noor_growth_signals")}</code> by <code>${escapeHtml(variant.sourceId)}</code>.</p>
              <p>
                <a href="${escapeHtml(variant.link || "#")}">Open tracked link</a>
                <button type="button" class="creator-link-copy" data-copy-share-kit data-copy-value="${escapeHtml(variant.link || "")}">Copy link</button>
              </p>
              ${variant.storyLink ? `<p>
                <a href="${escapeHtml(variant.storyLink)}">Open story follow-up</a>
                <button type="button" class="creator-link-copy" data-copy-share-kit data-copy-value="${escapeHtml(variant.storyLink)}">Copy story link</button>
              </p>` : ""}
              <dl>
                ${healthMetric("Placement", variant.placement || "none")}
                ${healthMetric("Creator", variant.creator || "none")}
                ${healthMetric("Source ID", variant.sourceId || "none")}
                ${variant.storySourceId ? healthMetric("Story source ID", variant.storySourceId) : ""}
              </dl>
            </article>`)
    .join("\n");
  const socialEntries = productsManifest.trafficEntryPoints || {};
  const validationDashboard = health.monetization?.ownedProducts?.validationDashboard || {};
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fursay Conversion Health</title>
  <meta name="description" content="Fursay conversion measurement dashboard for anonymous event coverage, Noor readiness, affiliate tracking, and product interest status.">
  <meta name="robots" content="noindex,follow">
  <meta name="theme-color" content="#4CAF7D">
  <link rel="canonical" href="https://fursay.com/conversion-health">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/css/picture-book-base-20260613-base1.css">
  <link rel="stylesheet" href="/css/picture-world-tools-20260613-products1.css">
</head>
<body class="picture-world creator-kit-page conversion-health-page">
  <main class="creator-kit-shell">
    <header class="creator-kit-hero">
      <p class="creator-eyebrow">Fursay growth dashboard</p>
      <h1>Conversion Health</h1>
      <p>Anonymous measurement coverage for subscription intent, affiliate clicks, outbound clicks, share actions, Noor readiness, and product interest validation.</p>
      <div class="creator-kit-meta">
        <span>Updated ${escapeHtml(health.updatedAt)}</span>
        <span>Commit ${escapeHtml(health.source?.commit)}</span>
        <a href="/conversion-health.json">JSON manifest</a>
        <a href="/site-health.json">Site health</a>
      </div>
    </header>
    <section class="creator-kit-safety" data-growth-dashboard-section="measurement">
      <h2>Measurement contract</h2>
      <p>Events are anonymous and use <code>${escapeHtml(health.measurement?.anonymousEventEndpoint)}</code>. Subscribe payload compatibility remains <code>${escapeHtml(health.measurement?.subscribePayloadCompatibility)}</code>.</p>
      <dl>
        ${healthMetric("PII allowed", String(health.measurement?.piiAllowed))}
        ${healthMetric("External analytics", health.measurement?.externalAnalytics || "optional")}
        ${healthMetric("Analytics binding", health.measurement?.analyticsSink?.binding || "none", health.measurement?.analyticsSink?.dataset || "")}
        ${healthMetric("Analytics write mode", health.measurement?.analyticsSink?.writeMode || "none")}
        ${healthMetric("Analytics report", health.measurement?.analyticsReport?.packageScript || "none", health.measurement?.analyticsReport?.status || "")}
        ${healthMetric("Report windows", (health.measurement?.analyticsReport?.comparisonWindows || []).join(" / "), "days")}
        ${healthMetric("Fallback review", health.measurement?.fallbackReviewSurface || "Cloudflare Worker logs")}
        ${healthMetric("Tracked event types", health.events?.length || 0, `expected ${release.liveExpectations?.anonymousConversionEvents}`)}
        ${healthMetric("Analytics blob fields", health.measurement?.analyticsSink?.blobFields?.length || 0, `expected ${release.liveExpectations?.eventAnalyticsBlobFields}`)}
        ${healthMetric("Report queries", health.measurement?.analyticsReport?.queryCount || 0, `expected ${release.liveExpectations?.eventAnalyticsReportQueries}`)}
      </dl>
    </section>
    <section class="creator-kit-safety" data-growth-dashboard-section="coverage">
      <h2>Coverage</h2>
      <dl>
        ${healthMetric("Public story pages", health.coverage?.publicStoryPages)}
        ${healthMetric("Subscribe opens", health.coverage?.subscribeOpenPages, "pages")}
        ${healthMetric("Affiliate clicks", health.coverage?.affiliateClickPages, "pages")}
        ${healthMetric("Outbound clicks", health.coverage?.outboundClickPages, "pages")}
        ${healthMetric("Share or copy actions", health.coverage?.shareOrCopyPages, "pages")}
        ${healthMetric("Product interest pages", health.coverage?.productInterestPages)}
        ${healthMetric("Submit attempt pages", health.coverage?.submitAttemptPages)}
      </dl>
    </section>
    <section class="creator-kit-safety" data-growth-dashboard-section="growth">
      <h2>Growth readiness</h2>
      <dl>
        ${healthMetric("Latest story entries", health.growth?.latestStoryEntries)}
        ${healthMetric("Episode landing pages", health.growth?.episodeLandingPages)}
        ${healthMetric("Noor lead magnet pages", health.growth?.noorLeadMagnetPages)}
        ${healthMetric("Noor readiness", health.growth?.noorReadinessStatus)}
        ${healthMetric("Noor subscriber signal goal", health.growth?.noorSubscriberSignalGoal, health.growth?.noorSubscriberSignalStatus || "")}
        ${healthMetric("Noor sprint variants", health.growth?.noorSprintVariantCount || 0, `expected ${release.liveExpectations?.noorSprintCopyVariants}`)}
        ${healthMetric("Product interest links", health.growth?.productInterestLinks)}
      </dl>
      <div class="creator-copy-blocks">
${noorSprintVariantCards}
      </div>
    </section>
    <section class="creator-kit-safety" data-growth-dashboard-section="monetization">
      <h2>Monetization</h2>
      <p>${escapeHtml(health.monetization?.affiliate?.localePolicy)}</p>
      <dl>
        ${healthMetric("Amazon links", health.monetization?.affiliate?.amazonLinks, health.monetization?.affiliate?.amazonTag)}
        ${healthMetric("Books links", health.monetization?.affiliate?.booksLinks, health.monetization?.affiliate?.booksAffiliateId)}
        ${healthMetric("Checkout enabled", String(health.monetization?.ownedProducts?.checkoutEnabled))}
        ${healthMetric("Interest only", String(health.monetization?.ownedProducts?.interestOnly))}
        ${healthMetric("Owned product specs", health.monetization?.ownedProducts?.products?.length || 0, `expected ${release.liveExpectations?.ownedProductSpecs}`)}
        ${healthMetric("Sample preview pages", productsManifest.samplePreviews?.length || 0, `expected ${release.liveExpectations?.productSamplePreviewPages}`)}
        ${healthMetric("Checkout gate", health.monetization?.ownedProducts?.checkoutGate?.status || "none")}
        ${healthMetric("Gate requirements", health.monetization?.ownedProducts?.checkoutGate?.requirements?.length || 0, `expected ${release.liveExpectations?.checkoutGateRequirements}`)}
      </dl>
      <p>${escapeHtml(health.monetization?.ownedProducts?.checkoutGate?.refundSupportCopy || "")}</p>
      <div class="creator-copy-blocks">
        ${ownedProducts}
      </div>
    </section>
    <section class="creator-kit-safety" data-growth-dashboard-section="product-validation">
      <h2>Product validation scoreboard</h2>
      <p>Paid packs stay disabled until product interest, waitlist clicks, and subscriber signals meet the validation plan. Social entry points are split by language so families land on the right waitlist page.</p>
      <p><a href="/monetization-roadmap">Review the monetization roadmap</a> for completed sample previews, disclosure requirements, and locked checkout-provider stages.</p>
      <dl>
        ${healthMetric("Signal report status", validationDashboard.status || "unknown")}
        ${healthMetric("Report command", validationDashboard.reportCommand || "none")}
        ${healthMetric("Report window", validationDashboard.windowDays || 0, "days")}
        ${healthMetric("Comparison windows", (validationDashboard.comparisonWindows || []).join(" / "), "days")}
        ${healthMetric("English social product entry", socialEntries.socialProfileLinks || "none")}
        ${healthMetric("Traditional Chinese social product entry", socialEntries.zhSocialProfileLinks || "none")}
        ${healthMetric("Arabic social product entry", socialEntries.arSocialProfileLinks || "none")}
        ${healthMetric("Checkout links allowed", String(productsManifest.paymentLinksAllowed === true))}
        ${healthMetric("Interest status", productsManifest.status || "unknown")}
      </dl>
      <div class="creator-copy-blocks">
${productValidationCards}
      </div>
    </section>
    <section class="creator-kit-safety" data-growth-dashboard-section="events">
      <h2>Tracked events</h2>
      <ul>
${events}
      </ul>
    </section>
  </main>
</body>
</html>`;
  writeFileSync(resolve(siteDir, "conversion-health.html"), html + "\n");
}

function roadmapStageCard(stage) {
  const details = [
    stage.completedAt ? `Completed: ${stage.completedAt}` : "",
    stage.requiredSignals?.length ? `Signals: ${stage.requiredSignals.join(", ")}` : "",
    stage.evidenceSources?.length ? `Evidence: ${stage.evidenceSources.join(", ")}` : "",
    stage.unlocks ? `Unlocks: ${stage.unlocks}` : "",
    stage.unlockCriteria || "",
    stage.nextGate ? `Next gate: ${stage.nextGate}` : "",
    stage.deliverables?.length ? `Deliverables: ${stage.deliverables.join(", ")}` : "",
    stage.requirements?.length ? `Requirements: ${stage.requirements.join(", ")}` : "",
    stage.provider ? `Provider: ${stage.provider}` : "",
  ].filter(Boolean);
  return `
            <article class="creator-copy-block" data-roadmap-stage="${escapeHtml(stage.id)}">
              <h3>${escapeHtml(stage.label)}</h3>
              <p>Status: <code>${escapeHtml(stage.status)}</code></p>
              ${details.map((detail) => `<p>${escapeHtml(detail)}</p>`).join("\n              ")}
            </article>`;
}

function roadmapProductCard(product) {
  const plan = product.validationPlan || {};
  const minimumSignals = plan.minimumSignals || {};
  return `
            <article class="creator-copy-block" data-roadmap-product="${escapeHtml(product.id)}">
              <h3>${escapeHtml(product.label)}</h3>
              <p>${escapeHtml(product.format)}. Checkout status: <code>${escapeHtml(product.checkoutStatus)}</code>.</p>
              <p>Planned contents: ${escapeHtml((product.plannedIncludes || []).join(", "))}</p>
              <dl>
                ${healthMetric("Free bridge", plan.freeBridge || "none")}
                ${healthMetric("Info clicks", minimumSignals.productInfoClicks || 0, "minimum")}
                ${healthMetric("Interest clicks", minimumSignals.productInterestClicks || 0, "minimum")}
                ${healthMetric("Subscriber signals", minimumSignals.subscriberSignals || 0, "minimum")}
              </dl>
              <p>${escapeHtml(plan.nextDecision || "Wait for real interest signals before drafting a sample.")}</p>
            </article>`;
}

function writeMonetizationRoadmapPage(siteDir) {
  const roadmap = readJson(resolve(siteDir, "monetization-roadmap.json"));
  const stageCards = (roadmap.stages || []).map(roadmapStageCard).join("\n");
  const productCards = (roadmap.products || []).map(roadmapProductCard).join("\n");
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fursay Monetization Roadmap</title>
  <meta name="description" content="Fursay internal monetization roadmap for product-interest validation, sample-pack readiness, disclosure requirements, and checkout gating.">
  <meta name="robots" content="noindex,follow">
  <meta name="theme-color" content="#4CAF7D">
  <link rel="canonical" href="https://fursay.com/monetization-roadmap">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/css/picture-book-base-20260613-base1.css">
  <link rel="stylesheet" href="/css/picture-world-tools-20260613-products1.css">
</head>
<body class="picture-world creator-kit-page monetization-roadmap-page">
  <main class="creator-kit-shell">
    <header class="creator-kit-hero">
      <p class="creator-eyebrow">Fursay monetization roadmap</p>
      <h1>From interest list to paid product</h1>
      <p>This internal roadmap keeps checkout disabled while Fursay validates real family demand for Koko printable packs and Noor 3-minute worksheets.</p>
      <div class="creator-kit-meta">
        <span>Updated ${escapeHtml(roadmap.updatedAt)}</span>
        <span>Commit ${escapeHtml(roadmap.source?.commit)}</span>
        <a href="/monetization-roadmap.json">Roadmap JSON</a>
        <a href="/products.json">Products JSON</a>
        <a href="/conversion-health.json">Conversion health</a>
      </div>
    </header>
    <section class="creator-kit-safety" data-monetization-roadmap-section="status">
      <h2>Current status</h2>
      <p>Owned products remain in interest validation. No payment links, price promise, or checkout provider is active.</p>
      <dl>
        ${healthMetric("Status", roadmap.status)}
        ${healthMetric("Decision state", roadmap.decisionState)}
        ${healthMetric("Checkout enabled", String(roadmap.checkoutEnabled))}
        ${healthMetric("Payment links allowed", String(roadmap.paymentLinksAllowed))}
        ${healthMetric("Subscribe payload", roadmap.subscribePayloadCompatibility || "unknown")}
      </dl>
    </section>
    <section class="creator-kit-safety" data-monetization-roadmap-section="stages">
      <h2>Roadmap stages</h2>
      <div class="creator-copy-blocks">
${stageCards}
      </div>
    </section>
    <section class="creator-kit-safety" data-monetization-roadmap-section="products">
      <h2>Product validation plans</h2>
      <div class="creator-copy-blocks">
${productCards}
      </div>
    </section>
    <section class="creator-kit-safety" data-monetization-roadmap-section="guardrails">
      <h2>Guardrails</h2>
      <p>The roadmap keeps owned products separate from affiliate links and analytics remains anonymous.</p>
      <dl>
        ${healthMetric("No payment links", String(roadmap.guardrails?.noPaymentLinks))}
        ${healthMetric("No price promise", String(roadmap.guardrails?.noPricePromise))}
        ${healthMetric("No MailerLite secrets", String(roadmap.guardrails?.noMailerLiteSecrets))}
        ${healthMetric("No PII in analytics", String(roadmap.guardrails?.noPiiInAnalytics))}
        ${healthMetric("Affiliate locale policy", roadmap.guardrails?.affiliateLocalePolicy || "unknown")}
      </dl>
    </section>
  </main>
</body>
</html>`;
  writeFileSync(resolve(siteDir, "monetization-roadmap.html"), html + "\n");
}

function toOriginUrl(route) {
  return `https://fursay.com${route}`;
}

function localizedRouteUrls(siteStructure, key) {
  const page = siteStructure.pages?.find((item) => item.key === key);
  return Object.values(page?.localizedRoutes || {}).map(toOriginUrl);
}

function shortlinkUrls(shortlinks, matcher) {
  return (shortlinks.routes || [])
    .filter(matcher)
    .map((route) => route.shortlink);
}

function campaignHealth(campaigns, pack) {
  const campaign = campaigns.campaigns?.[pack] || {};
  return {
    status: campaign.status || "active",
    primaryGoal: campaign.primaryGoal || "weekly_story_pack_subscribe",
    campaign: campaign.campaign || "",
    join: campaign.shortlinks?.join || "",
    sample: campaign.shortlinks?.sample || "",
    share: campaign.shortlinks?.share || "",
    bio: campaign.shortlinks?.bio || "",
    creator: campaign.shortlinks?.creator || "",
    deepLink: pack === "koko"
      ? "https://fursay.com/koko?subscribe=koko&utm_source=shortlink&utm_medium=direct&utm_campaign=koko_story_funnel&utm_content=join_koko"
      : "https://fursay.com/arabic?subscribe=noor&utm_source=shortlink&utm_medium=direct&utm_campaign=noor_story_funnel&utm_content=join_noor",
    trackedIntents: [
      "subscribe_intent",
      "entry_pack",
      "modal_preselect",
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
    ],
    ctaSources: campaign.ctaSources || [],
  };
}

function writeSiteHealthManifest(siteDir) {
  const siteStructure = readJson(resolve(siteDir, "data/site-structure.json"));
  const campaigns = readJson(resolve(siteDir, "campaigns.json"));
  const shortlinks = readJson(resolve(siteDir, "shortlinks.json"));
  const conversionHealth = readJson(resolve(siteDir, "conversion-health.json"));
  const monetizationRoadmap = readJson(resolve(siteDir, "monetization-roadmap.json"));
  const current = readJson(resolve(siteDir, "site-health.json"));
  const manifest = {
    ...current,
    site: "Fursay",
    origin: "https://fursay.com",
    platform: "cloudflare-workers-static-assets",
    updatedAt: taipeiDateString(),
    deployment: {
      ...current.deployment,
      noorSprintStatusManifest: "https://fursay.com/noor-sprint-status.json",
      noorSprintStatusPage: "https://fursay.com/noor-sprint-status",
    },
    generatedFrom: [
      "/data/site-structure.json",
      "/campaigns.json",
      "/shortlinks.json",
      "/conversion-health.json",
      "/products.json",
      "/monetization-roadmap.json",
    ],
    routes: {
      ...current.routes,
      home: localizedRouteUrls(siteStructure, "home"),
      storyWorlds: [
        ...localizedRouteUrls(siteStructure, "koko"),
        ...localizedRouteUrls(siteStructure, "arabic"),
      ],
      episodeLandings: [
        "https://fursay.com/episodes/koko-feelings",
        "https://fursay.com/zh/episodes/koko-feelings",
        "https://fursay.com/ar/episodes/koko-feelings",
        "https://fursay.com/episodes/noor-colors",
        "https://fursay.com/zh/episodes/noor-colors",
        "https://fursay.com/ar/episodes/noor-colors",
        "https://fursay.com/episodes/noor-greetings",
        "https://fursay.com/zh/episodes/noor-greetings",
        "https://fursay.com/ar/episodes/noor-greetings",
      ],
      join: shortlinkUrls(shortlinks, (route) => route.path.startsWith("/join/")),
      sample: shortlinkUrls(shortlinks, (route) => route.path.startsWith("/sample/")),
      share: shortlinkUrls(shortlinks, (route) => route.path.startsWith("/share/")),
      bio: shortlinkUrls(shortlinks, (route) => route.path.startsWith("/bio/")),
      creator: shortlinkUrls(shortlinks, (route) => /^\/creator\/[^/]+$/.test(route.path)),
      creatorPlacement: shortlinkUrls(shortlinks, (route) => /^\/creator\/[^/]+\/[^/]+$/.test(route.path)),
      conversionHealth: [
        "https://fursay.com/conversion-health",
        "https://fursay.com/conversion-health.json",
      ],
      products: [
        "https://fursay.com/products",
        "https://fursay.com/zh/products",
        "https://fursay.com/ar/products",
        "https://fursay.com/products.json",
      ],
      productSamplePreviews: [
        "https://fursay.com/product-samples/koko-printable",
        "https://fursay.com/product-samples/noor-worksheet",
      ],
      productSampleDownloads: [
        "https://fursay.com/downloads/koko-printable-sample.pdf",
        "https://fursay.com/downloads/noor-worksheet-sample.pdf",
      ],
      monetizationRoadmap: [
        "https://fursay.com/monetization-roadmap",
        "https://fursay.com/monetization-roadmap.json",
      ],
      noorSprintStatus: [
        "https://fursay.com/noor-sprint-status",
        "https://fursay.com/noor-sprint-status.json",
      ],
    },
    funnels: {
      koko: campaignHealth(campaigns, "koko"),
      noor: campaignHealth(campaigns, "noor"),
    },
    growth: conversionHealth.growth,
    monetization: {
      ...conversionHealth.monetization,
      roadmap: {
        status: monetizationRoadmap.status,
        decisionState: monetizationRoadmap.decisionState,
        page: monetizationRoadmap.page,
        manifest: "https://fursay.com/monetization-roadmap.json",
        stages: monetizationRoadmap.stages?.length || 0,
        products: monetizationRoadmap.products?.length || 0,
      },
    },
    measurement: {
      ...(current.measurement || {}),
      subscriptionEndpoint: "/api/subscribe",
      failClosed: true,
      liveSmokeCallsMailerLite: false,
      ...conversionHealth.measurement,
    },
    sharedAssets: siteStructure.sharedAssets,
  };
  writeFileSync(resolve(siteDir, "site-health.json"), JSON.stringify(manifest, null, 2) + "\n");
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
  <link rel="stylesheet" href="/css/picture-world-tools-20260613-products1.css">
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
  <script src="/js/site-shared-20260615-sharekit1.js"></script>
</body>
</html>`;
  writeFileSync(resolve(siteDir, "creator-kit.html"), html + "\n");
}

function attrsToString(attrs = {}) {
  return Object.entries(attrs)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => ` ${key}="${escapeHtml(value)}"`)
    .join("");
}

function shareKitLinkRow(title, value, attrs = {}) {
  return `<div>
                <dt>${escapeHtml(title)}</dt>
                <dd>
                  <a href="${escapeHtml(value)}"${attrsToString(attrs)}>${escapeHtml(value)}</a>
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
            ${shareKitLinkRow("Product sample preview", item.productSamplePreviewUrl, {
              "data-product-info-link": pack,
              "data-interest-stage": "share_kit_sample_preview",
              "data-signup-source": `share_kit_sample_preview_${pack}`,
            })}
            ${shareKitLinkRow("PDF sample download", item.productSampleDownloadUrl, {
              "data-product-sample-download": pack,
              "data-product-info-link": pack,
              "data-interest-stage": "share_kit_pdf_sample",
              "data-signup-source": `share_kit_pdf_sample_${pack}`,
            })}
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
  <link rel="stylesheet" href="/css/picture-world-tools-20260613-products1.css">
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
  <script src="/js/site-shared-20260615-sharekit1.js"></script>
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
  run("node", ["--check", "scripts/check-conversion-health-contract.mjs"]);
  run("node", ["--check", "scripts/check-growth-dashboard-contract.mjs"]);
  run("node", ["--check", "scripts/check-event-analytics-contract.mjs"]);
  run("node", ["--check", "scripts/query-event-analytics-report.mjs"]);
  run("node", ["--check", "scripts/check-subscribe-api-contract.mjs"]);
  run("node", ["--check", "scripts/check-content-structure-contract.mjs"]);
  run("node", ["--check", "scripts/check-semantic-funnel-contract.mjs"]);
  run("node", ["--check", "scripts/check-site-structure-contract.mjs"]);
  run("node", ["--check", "scripts/check-hero-preload-contract.mjs"]);
  run("node", ["--check", "scripts/check-visual-layout-contract.mjs"]);
  run("node", ["--check", "scripts/check-web-vitals-contract.mjs"]);
  run("node", ["--check", "scripts/check-internal-links-contract.mjs"]);
  run("node", ["--check", "scripts/check-newsletter-traffic-kit.mjs"]);
  run("node", ["--check", "scripts/check-newsletter-state-contract.mjs"]);
  run("node", ["--check", "scripts/check-public-kit-parity.mjs"]);
  run("node", ["--check", "scripts/check-amazon-affiliate-links.mjs"]);
  run("node", ["--check", "scripts/check-worker-shortlinks.mjs"]);
  run("node", ["--check", "scripts/check-structured-data.mjs"]);
  run("node", ["--check", "scripts/check-social-preview-contract.mjs"]);
  run("node", ["--check", "scripts/check-head-metadata.mjs"]);
  run("node", ["--check", "scripts/check-accessibility-contract.mjs"]);
  run("node", ["--check", "scripts/check-discovery-contract.mjs"]);
  run("node", ["--check", "scripts/check-content-growth-contract.mjs"]);
  run("node", ["--check", "scripts/check-episode-landing-contract.mjs"]);
  run("node", ["--check", "scripts/check-monetization-interest-contract.mjs"]);
  run("node", ["--check", "scripts/check-product-readiness-contract.mjs"]);
  run("node", ["--check", "scripts/check-monetization-roadmap-contract.mjs"]);
  run("node", ["--check", "scripts/check-noor-subscriber-readiness.mjs"]);
  run("node", ["--check", "scripts/check-noor-sprint-log.mjs"]);
  run("node", ["--check", "scripts/check-noor-sprint-review.mjs"]);
  run("node", ["--check", "scripts/next-noor-sprint-action.mjs"]);
  run("node", ["--check", "scripts/review-noor-sprint-report.mjs"]);
  run("node", ["--check", "scripts/record-noor-sprint-log.mjs"]);
  run("node", ["--check", "scripts/check-security-headers.mjs"]);
  run("node", ["--check", "scripts/check-release-consistency.mjs"]);
  run("node", ["--check", "scripts/check-doc-manifest-drift.mjs"]);
  run("node", ["--check", "scripts/check-render-jobs.mjs"]);
  run("node", ["--check", "scripts/check-workspace-hygiene.mjs"]);
  run("node", ["--check", "scripts/optimize-png-fallbacks.mjs"]);
  run("node", ["--check", "scripts/update-immutable-asset-fingerprints.mjs"]);
  run("node", ["--check", "scripts/check-static-asset-structure.mjs"]);
  run("node", ["--check", "scripts/check-image-assets.mjs"]);
  run("node", ["--check", "scripts/check-cache-headers.mjs"]);
  run("node", ["--check", "scripts/check-deploy-readiness.mjs"]);
  run("node", ["scripts/check-deploy-readiness.mjs", "--out-dir", join(outRoot, "deploy-readiness-local")]);

  run("node", ["scripts/check-fursay-funnel.mjs", "--out-dir", join(outRoot, "funnel-local")]);
  run("node", ["scripts/check-noor-list-activation.mjs", "--out-dir", join(outRoot, "noor-local")]);
  run("node", ["scripts/check-localized-cta-contract.mjs", "--out-dir", join(outRoot, "localized-cta-local")]);
  run("node", ["scripts/check-event-tracking-contract.mjs", "--out-dir", join(outRoot, "event-tracking-local")]);
  run("node", ["scripts/check-conversion-health-contract.mjs", "--out-dir", join(outRoot, "conversion-health-local")]);
  run("node", ["scripts/check-growth-dashboard-contract.mjs", "--out-dir", join(outRoot, "growth-dashboard-local")]);
  run("node", ["scripts/check-event-analytics-contract.mjs", "--out-dir", join(outRoot, "event-analytics-local")]);
  run("node", ["scripts/query-event-analytics-report.mjs", "--dry-run", "--out-dir", join(outRoot, "event-analytics-report-local")]);
  run("node", ["scripts/check-subscribe-api-contract.mjs", "--out-dir", join(outRoot, "subscribe-api-local")]);
  run("node", ["scripts/check-content-structure-contract.mjs", "--out-dir", join(outRoot, "content-structure-local")]);
  run("node", ["scripts/check-semantic-funnel-contract.mjs", "--out-dir", join(outRoot, "semantic-funnel-local")]);
  run("node", ["scripts/check-site-structure-contract.mjs", "--out-dir", join(outRoot, "site-structure-local")]);
  run("node", ["scripts/check-hero-preload-contract.mjs", "--out-dir", join(outRoot, "hero-preload-local")]);
  run("node", ["scripts/check-visual-layout-contract.mjs", "--out-dir", join(outRoot, "visual-layout-local")]);
  run("node", ["scripts/check-internal-links-contract.mjs", "--out-dir", join(outRoot, "internal-links-local")]);
  run("node", ["scripts/check-newsletter-traffic-kit.mjs", "--out-dir", join(outRoot, "newsletter-traffic-kit-local")]);
  run("node", ["scripts/check-newsletter-state-contract.mjs", "--out-dir", join(outRoot, "newsletter-state-local")]);
  run("node", ["scripts/check-public-kit-parity.mjs", "--out-dir", join(outRoot, "public-kit-parity-local")]);
  run("node", ["scripts/check-amazon-affiliate-links.mjs", "--out-dir", join(outRoot, "amazon-affiliate-local")]);
  run("node", ["scripts/check-worker-shortlinks.mjs", "--out-dir", join(outRoot, "worker-shortlinks-local")]);
  run("node", ["scripts/check-structured-data.mjs", "--out-dir", join(outRoot, "structured-data-local")]);
  run("node", ["scripts/check-social-preview-contract.mjs", "--out-dir", join(outRoot, "social-preview-local")]);
  run("node", ["scripts/check-head-metadata.mjs", "--out-dir", join(outRoot, "head-metadata-local")]);
  run("node", ["scripts/check-accessibility-contract.mjs", "--out-dir", join(outRoot, "accessibility-local")]);
  run("node", ["scripts/check-discovery-contract.mjs", "--out-dir", join(outRoot, "discovery-local")]);
  run("node", ["scripts/check-content-growth-contract.mjs", "--out-dir", join(outRoot, "content-growth-local")]);
  run("node", ["scripts/check-episode-landing-contract.mjs", "--out-dir", join(outRoot, "episode-landing-local")]);
  run("node", ["scripts/check-monetization-interest-contract.mjs", "--out-dir", join(outRoot, "monetization-interest-local")]);
  run("node", ["scripts/check-product-readiness-contract.mjs", "--out-dir", join(outRoot, "product-readiness-local")]);
  run("node", ["scripts/check-monetization-roadmap-contract.mjs", "--out-dir", join(outRoot, "monetization-roadmap-local")]);
  run("node", ["scripts/check-noor-subscriber-readiness.mjs", "--out-dir", join(outRoot, "noor-readiness-local")]);
  run("node", ["scripts/check-noor-sprint-log.mjs", "--out-dir", join(outRoot, "noor-sprint-log-local")]);
  run("node", ["scripts/check-noor-sprint-review.mjs", "--out-dir", join(outRoot, "noor-sprint-review-local")]);
  run("node", ["scripts/check-security-headers.mjs", "--out-dir", join(outRoot, "security-headers-local")]);
  run("node", ["scripts/check-release-consistency.mjs", "--out-dir", join(outRoot, "release-consistency-local")]);
  run("node", ["scripts/check-doc-manifest-drift.mjs", "--out-dir", join(outRoot, "doc-manifest-drift-local")]);
  run("node", ["scripts/check-render-jobs.mjs", "--out-dir", join(outRoot, "render-jobs-local")]);
  run("node", ["scripts/check-workspace-hygiene.mjs", "--out-dir", join(outRoot, "workspace-hygiene-local")]);
  run("node", ["scripts/update-immutable-asset-fingerprints.mjs", "--check"]);
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
    run("node", ["scripts/check-conversion-health-contract.mjs", "--base-url", args.baseUrl, "--out-dir", join(outRoot, "conversion-health-live")]);
    run("node", ["scripts/check-growth-dashboard-contract.mjs", "--base-url", args.baseUrl, "--out-dir", join(outRoot, "growth-dashboard-live")]);
    run("node", ["scripts/check-event-analytics-contract.mjs", "--base-url", args.baseUrl, "--out-dir", join(outRoot, "event-analytics-live")]);
    run("node", ["scripts/query-event-analytics-report.mjs", "--dry-run", "--out-dir", join(outRoot, "event-analytics-report-live")]);
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
    run("node", ["scripts/check-content-growth-contract.mjs", "--base-url", args.baseUrl, "--out-dir", join(outRoot, "content-growth-live")]);
    run("node", ["scripts/check-episode-landing-contract.mjs", "--base-url", args.baseUrl, "--out-dir", join(outRoot, "episode-landing-live")]);
    run("node", ["scripts/check-monetization-interest-contract.mjs", "--base-url", args.baseUrl, "--out-dir", join(outRoot, "monetization-interest-live")]);
    run("node", ["scripts/check-product-readiness-contract.mjs", "--base-url", args.baseUrl, "--out-dir", join(outRoot, "product-readiness-live")]);
    run("node", ["scripts/check-monetization-roadmap-contract.mjs", "--base-url", args.baseUrl, "--out-dir", join(outRoot, "monetization-roadmap-live")]);
    run("node", ["scripts/check-noor-subscriber-readiness.mjs", "--base-url", args.baseUrl, "--out-dir", join(outRoot, "noor-readiness-live")]);
    run("node", ["scripts/check-noor-sprint-log.mjs", "--base-url", args.baseUrl, "--out-dir", join(outRoot, "noor-sprint-log-live")]);
    run("node", ["scripts/check-security-headers.mjs", "--base-url", args.baseUrl, "--out-dir", join(outRoot, "security-headers-live")]);
    run("node", ["scripts/check-release-consistency.mjs", "--base-url", args.baseUrl, "--out-dir", join(outRoot, "release-consistency-live")]);
    run("node", ["scripts/check-doc-manifest-drift.mjs", "--base-url", args.baseUrl, "--out-dir", join(outRoot, "doc-manifest-drift-live")]);
    run("node", ["scripts/update-immutable-asset-fingerprints.mjs", "--check"]);
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
