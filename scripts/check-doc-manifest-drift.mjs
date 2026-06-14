import { readFile, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const SITE_DIR = resolve(process.cwd(), "fursay-optimized-site");
const DEFAULT_OUT = "/tmp/fursay-doc-manifest-drift";
const PLATFORM = "cloudflare-workers-static-assets";
const ORIGIN = "https://fursay.com";
const SITE_HEALTH_GENERATED_FROM = [
  "/data/site-structure.json",
  "/campaigns.json",
  "/shortlinks.json",
  "/conversion-health.json",
  "/products.json",
  "/monetization-roadmap.json",
];
const DOCS = [
  "docs/site-architecture.md",
  "docs/cloudflare-deploy-runbook.md",
];
const PUBLIC_MANIFESTS = [
  "/release.json",
  "/deploy-readiness.json",
  "/site-health.json",
  "/campaigns.json",
  "/creator-kit.json",
  "/share-kit.json",
  "/traffic-launch.json",
  "/links.json",
  "/conversion-health.json",
  "/products.json",
  "/monetization-roadmap.json",
  "/video-discovery.json",
  "/shortlinks.json",
];
const LIVE_SMOKE_EXCLUDES = new Set([
  "scripts/check-deploy-readiness.mjs",
  "scripts/check-newsletter-state-contract.mjs",
  "scripts/check-render-jobs.mjs",
  "scripts/check-workspace-hygiene.mjs",
  "scripts/check-static-asset-structure.mjs",
  "audit-fursay.mjs",
]);

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = { outDir: DEFAULT_OUT, baseUrl: "" };
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--out-dir") parsed.outDir = args[++i];
    if (args[i] === "--base-url") parsed.baseUrl = args[++i].replace(/\/$/, "");
  }
  return parsed;
}

async function readText(baseUrl, pathname) {
  if (baseUrl) {
    const response = await fetch(`${baseUrl}${pathname}`);
    if (!response.ok) throw new Error(`${pathname} status ${response.status}`);
    return response.text();
  }
  return readFile(resolve(SITE_DIR, pathname.replace(/^\//, "")), "utf8");
}

async function readJson(baseUrl, pathname) {
  return JSON.parse(await readText(baseUrl, pathname));
}

async function readWorkspaceJson(path) {
  return JSON.parse(await readFile(resolve(process.cwd(), path), "utf8"));
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function arrayDiff(expected, actual) {
  const actualSet = new Set(actual);
  return expected.filter((item) => !actualSet.has(item));
}

function exactArrayFailures(label, expected, actual) {
  const failures = [];
  if (expected.length !== actual.length) failures.push(`${label}_count:${actual.length}!=${expected.length}`);
  for (const item of arrayDiff(expected, actual)) failures.push(`${label}_missing:${item}`);
  for (const item of arrayDiff(actual, expected)) failures.push(`${label}_extra:${item}`);
  return failures;
}

function localizedRouteUrls(siteStructure, key) {
  const page = siteStructure.pages?.find((item) => item.key === key);
  return Object.values(page?.localizedRoutes || {}).map((route) => `${ORIGIN}${route}`);
}

function shortlinkUrls(shortlinks, matcher) {
  return normalizeArray(shortlinks.routes)
    .filter(matcher)
    .map((route) => route.shortlink);
}

function findVersionedAssetRefs(text) {
  return [...text.matchAll(/\/(?:css|js)\/[a-z0-9-]+-\d{8}-[a-z0-9]+[a-z0-9-]*\.(?:css|js)/gi)].map((match) => match[0]);
}

function scriptsInSmokeCommand(command) {
  return [...command.matchAll(/node (scripts\/[^ ]+?\.mjs)/g)].map((match) => match[1]);
}

function releaseScriptQualityGates(source) {
  const match = source.match(/qualityGates:\s*\[([\s\S]*?)\]/m);
  if (!match) return [];
  return [...match[1].matchAll(/"([^"]+)"/g)].map((item) => item[1]);
}

async function checkLocalDocs(failures, details) {
  const siteStructure = await readWorkspaceJson("fursay-optimized-site/data/site-structure.json");
  const siteHealth = await readWorkspaceJson("fursay-optimized-site/site-health.json");
  const campaigns = await readWorkspaceJson("fursay-optimized-site/campaigns.json");
  const shortlinks = await readWorkspaceJson("fursay-optimized-site/shortlinks.json");
  const release = await readWorkspaceJson("fursay-optimized-site/release.json");
  const sharedCss = normalizeArray(siteStructure.sharedAssets?.css);
  const sharedJs = normalizeArray(siteStructure.sharedAssets?.js);
  const expectedAssets = [...sharedCss, ...sharedJs];
  const docs = [];

  for (const doc of DOCS) {
    const text = await readFile(resolve(process.cwd(), doc), "utf8");
    const refs = findVersionedAssetRefs(text);
    docs.push({ path: doc, refs });
    if (!text.includes("Cloudflare Workers Static Assets")) failures.push(`${doc}:missing_workers_static_assets_phrase`);
    if (/deploys through Cloudflare Pages/i.test(text)) failures.push(`${doc}:claims_cloudflare_pages_deploy`);
    if (doc === "docs/site-architecture.md") {
      for (const asset of expectedAssets) {
        if (!text.includes(asset)) failures.push(`${doc}:missing_current_asset:${asset}`);
      }
      for (const ref of refs) {
        if (!expectedAssets.includes(ref)) failures.push(`${doc}:stale_asset_ref:${ref}`);
      }
    }
  }

  const packageJson = await readWorkspaceJson("package.json");
  const releaseScript = await readFile(resolve(process.cwd(), "scripts/release-fursay.mjs"), "utf8");
  const scriptGates = releaseScriptQualityGates(releaseScript);
  const releaseGates = normalizeArray(release.qualityGates);
  const smokeScripts = scriptsInSmokeCommand(packageJson.scripts?.["smoke:live"] || "");
  const expectedSmokeScripts = releaseGates.filter((gate) => gate.startsWith("scripts/") && !LIVE_SMOKE_EXCLUDES.has(gate));

  for (const gate of releaseGates) {
    if (gate.endsWith(".mjs") && !existsSync(resolve(process.cwd(), gate))) failures.push(`release_quality_gate_missing_file:${gate}`);
  }
  for (const gate of scriptGates) {
    if (!releaseGates.includes(gate)) failures.push(`release_manifest_missing_script_gate:${gate}`);
  }
  for (const gate of releaseGates) {
    if (!scriptGates.includes(gate)) failures.push(`release_script_missing_manifest_gate:${gate}`);
  }
  for (const gate of expectedSmokeScripts) {
    if (!smokeScripts.includes(gate)) failures.push(`smoke_live_missing_gate:${gate}`);
  }
  for (const gate of smokeScripts) {
    if (!expectedSmokeScripts.includes(gate)) failures.push(`smoke_live_unexpected_gate:${gate}`);
  }

  const healthCss = normalizeArray(siteHealth.sharedAssets?.css);
  const healthJs = normalizeArray(siteHealth.sharedAssets?.js);
  for (const asset of arrayDiff(sharedCss, healthCss)) failures.push(`site_health_missing_css:${asset}`);
  for (const asset of arrayDiff(healthCss, sharedCss)) failures.push(`site_health_extra_css:${asset}`);
  for (const asset of arrayDiff(sharedJs, healthJs)) failures.push(`site_health_missing_js:${asset}`);
  for (const asset of arrayDiff(healthJs, sharedJs)) failures.push(`site_health_extra_js:${asset}`);
  if (release.assets?.css !== sharedCss.find((asset) => asset.includes("picture-world-shared-"))) {
    failures.push(`release_bad_shared_css:${release.assets?.css || "none"}`);
  }
  if (release.assets?.js !== sharedJs[0]) failures.push(`release_bad_shared_js:${release.assets?.js || "none"}`);
  if (siteHealth.platform !== PLATFORM) failures.push(`site_health_platform:${siteHealth.platform || "none"}`);
  if (release.platform !== PLATFORM) failures.push(`release_platform:${release.platform || "none"}`);

  failures.push(...exactArrayFailures("site_health_generated_from", SITE_HEALTH_GENERATED_FROM, normalizeArray(siteHealth.generatedFrom)));
  failures.push(...exactArrayFailures("site_health_home", localizedRouteUrls(siteStructure, "home"), normalizeArray(siteHealth.routes?.home)));
  failures.push(...exactArrayFailures("site_health_story_worlds", [
    ...localizedRouteUrls(siteStructure, "koko"),
    ...localizedRouteUrls(siteStructure, "arabic"),
  ], normalizeArray(siteHealth.routes?.storyWorlds)));
  failures.push(...exactArrayFailures("site_health_join", shortlinkUrls(shortlinks, (route) => route.path.startsWith("/join/")), normalizeArray(siteHealth.routes?.join)));
  failures.push(...exactArrayFailures("site_health_sample", shortlinkUrls(shortlinks, (route) => route.path.startsWith("/sample/")), normalizeArray(siteHealth.routes?.sample)));
  failures.push(...exactArrayFailures("site_health_share", shortlinkUrls(shortlinks, (route) => route.path.startsWith("/share/")), normalizeArray(siteHealth.routes?.share)));
  failures.push(...exactArrayFailures("site_health_bio", shortlinkUrls(shortlinks, (route) => route.path.startsWith("/bio/")), normalizeArray(siteHealth.routes?.bio)));
  failures.push(...exactArrayFailures("site_health_creator", shortlinkUrls(shortlinks, (route) => /^\/creator\/[^/]+$/.test(route.path)), normalizeArray(siteHealth.routes?.creator)));
  failures.push(...exactArrayFailures("site_health_creator_placement", shortlinkUrls(shortlinks, (route) => /^\/creator\/[^/]+\/[^/]+$/.test(route.path)), normalizeArray(siteHealth.routes?.creatorPlacement)));
  failures.push(...exactArrayFailures("site_health_products", [
    `${ORIGIN}/products`,
    `${ORIGIN}/zh/products`,
    `${ORIGIN}/ar/products`,
    `${ORIGIN}/products.json`,
  ], normalizeArray(siteHealth.routes?.products)));
  failures.push(...exactArrayFailures("site_health_monetization_roadmap", [
    `${ORIGIN}/monetization-roadmap`,
    `${ORIGIN}/monetization-roadmap.json`,
  ], normalizeArray(siteHealth.routes?.monetizationRoadmap)));
  for (const pack of ["koko", "noor"]) {
    if (siteHealth.funnels?.[pack]?.campaign !== campaigns.campaigns?.[pack]?.campaign) {
      failures.push(`site_health_funnel_campaign:${pack}:${siteHealth.funnels?.[pack]?.campaign || "none"}`);
    }
    if (siteHealth.funnels?.[pack]?.sample !== campaigns.campaigns?.[pack]?.shortlinks?.sample) {
      failures.push(`site_health_funnel_sample:${pack}:${siteHealth.funnels?.[pack]?.sample || "none"}`);
    }
    if (siteHealth.funnels?.[pack]?.creator !== campaigns.campaigns?.[pack]?.shortlinks?.creator) {
      failures.push(`site_health_funnel_creator:${pack}:${siteHealth.funnels?.[pack]?.creator || "none"}`);
    }
  }

  details.local = {
    docs,
    sharedCss,
    sharedJs,
    releaseQualityGates: releaseGates.length,
    smokeScripts: smokeScripts.length,
  };
}

async function checkManifestParity(args, failures, details) {
  const manifests = {};
  for (const pathname of PUBLIC_MANIFESTS) {
    manifests[pathname] = await readJson(args.baseUrl, pathname);
  }
  const release = manifests["/release.json"];
  const expectedCommit = release.source?.commit || "";
  const expectedSummary = release.source?.summary || "";
  const expectedDate = release.releasedAt || release.updatedAt || "";
  const expectedCss = release.assets?.css || "";
  const expectedJs = release.assets?.js || "";
  const manifestDetails = [];

  for (const [pathname, manifest] of Object.entries(manifests)) {
    const itemFailures = [];
    if (manifest.platform !== PLATFORM) itemFailures.push(`platform:${manifest.platform || "none"}`);
    if (pathname !== "/site-health.json" && manifest.source?.commit !== expectedCommit) {
      itemFailures.push(`commit:${manifest.source?.commit || "none"}`);
    }
    if (pathname !== "/site-health.json" && manifest.source?.summary !== expectedSummary) {
      itemFailures.push(`summary:${manifest.source?.summary || "none"}`);
    }
    const date = manifest.releasedAt || manifest.updatedAt || "";
    if (date !== expectedDate) itemFailures.push(`date:${date || "none"}`);
    failures.push(...itemFailures.map((failure) => `${pathname}:${failure}`));
    manifestDetails.push({ path: pathname, failures: itemFailures.length });
  }

  const siteHealth = manifests["/site-health.json"];
  if (!normalizeArray(siteHealth.sharedAssets?.css).includes(expectedCss)) failures.push(`site_health_missing_release_css:${expectedCss || "none"}`);
  if (!normalizeArray(siteHealth.sharedAssets?.js).includes(expectedJs)) failures.push(`site_health_missing_release_js:${expectedJs || "none"}`);
  if (!normalizeArray(release.qualityGates).includes("scripts/check-doc-manifest-drift.mjs")) {
    failures.push("release_missing_doc_manifest_drift_gate");
  }
  details.manifests = manifestDetails;
}

async function main() {
  const args = parseArgs();
  const failures = [];
  const details = {};

  if (!args.baseUrl) await checkLocalDocs(failures, details);
  await checkManifestParity(args, failures, details);

  await mkdir(args.outDir, { recursive: true });
  const report = {
    ok: failures.length === 0,
    mode: args.baseUrl ? "live" : "local",
    baseUrl: args.baseUrl || "",
    failures,
    details,
  };
  await writeFile(resolve(args.outDir, "doc-manifest-drift.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({
    ok: report.ok,
    mode: report.mode,
    outDir: args.outDir,
    failed: failures.length,
    manifests: details.manifests?.length || PUBLIC_MANIFESTS.length,
    docs: details.local?.docs?.length || 0,
  }, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
