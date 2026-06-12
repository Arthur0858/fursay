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
    },
    funnels: {
      koko: {
        campaign: "koko_story_funnel",
        join: "https://fursay.com/join/koko",
        sample: "https://fursay.com/sample/koko",
        creator: "https://fursay.com/creator/koko",
        deepLink: "https://fursay.com/koko?subscribe=koko&utm_source=shortlink&utm_medium=direct&utm_campaign=koko_story_funnel&utm_content=join_koko",
      },
      noor: {
        campaign: "noor_story_funnel",
        join: "https://fursay.com/join/noor",
        sample: "https://fursay.com/sample/noor",
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
      "audit-fursay.mjs",
    ],
    liveExpectations: {
      pages: 9,
      funnelChecks: 25,
      cacheHeaderChecks: 25,
      badAuditCount: 0,
      liveSmokeCallsMailerLite: false,
    },
  };
  writeFileSync(resolve(siteDir, "release.json"), JSON.stringify(manifest, null, 2) + "\n");
  writeCampaignManifest(siteDir, source);
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
        primaryShortlink: "https://fursay.com/sample/koko",
        qrSvg: "https://fursay.com/images/qr/sample-koko.svg",
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
        primaryShortlink: "https://fursay.com/sample/noor",
        qrSvg: "https://fursay.com/images/qr/sample-noor.svg",
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
    campaigns,
  };
  writeFileSync(resolve(siteDir, "campaigns.json"), JSON.stringify(manifest, null, 2) + "\n");
  writeCreatorKit(siteDir, source, campaigns);
}

function writeCreatorKit(siteDir, source, campaigns) {
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
        creatorShortlink: creator,
        placementLinks,
        trackedLandingUrl: landing,
        qrSvg: campaign.copyKit.qrSvg,
        youtubeDescription: `${campaign.copyKit.shortHeadline}\nFree weekly sample pack: ${placementLinks.youtubeDescription.shortlink}`,
        socialCaption: `${campaign.copyKit.shortHeadline}. Preview this week's family story pack: ${placementLinks.socialCaption.shortlink}`,
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
            ${creatorLinkRow("Tracked landing", item.trackedLandingUrl)}
            ${placementRows(item.placementLinks)}
          </dl>
        </div>
        <div class="creator-copy-blocks">
          ${creatorCopyBlock("YouTube description", item.youtubeDescription)}
          ${creatorCopyBlock("Social caption", item.socialCaption)}
          ${creatorCopyBlock("Newsletter blurb", item.newsletterBlurb)}
        </div>
        <a class="creator-qr" href="${escapeHtml(item.creatorShortlink)}" aria-label="${escapeHtml(item.altText)}">
          <img src="${escapeHtml(new URL(item.qrSvg).pathname)}" alt="${escapeHtml(item.altText)}" width="160" height="160" loading="lazy">
          <span>QR asset</span>
        </a>
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
