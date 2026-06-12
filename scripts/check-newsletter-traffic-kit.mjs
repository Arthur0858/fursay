import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const ROOT = process.cwd();
const DEFAULT_OUT = "/tmp/fursay-newsletter-traffic-kit";
const CREATOR_KIT = resolve(ROOT, "fursay-optimized-site/creator-kit.json");
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

async function main() {
  const args = parseArgs();
  const creatorKit = await readCreatorKit(args.baseUrl);
  const creatorKitPage = await readCreatorKitPage(args.baseUrl);
  const runner = await readFile(RUNNER, "utf8");
  const failures = [];

  if (creatorKit.platform !== "cloudflare-workers-static-assets") failures.push("creator_kit_bad_platform");
  if (creatorKit.safety?.subscriptionEndpoint !== "/api/subscribe") failures.push("creator_kit_bad_subscription_endpoint");
  if (creatorKit.safety?.smokeSubmitsToMailerLite !== false) failures.push("creator_kit_bad_smoke_contract");

  for (const [pack, expectedCampaign] of Object.entries({ koko: "koko_story_funnel", noor: "noor_story_funnel" })) {
    const item = creatorKit.packs?.[pack] || {};
    const expectedSample = `https://fursay.com/sample/${pack}`;
    const expectedCreator = `https://fursay.com/creator/${pack}`;
    if (item.sampleShortlink !== expectedSample) failures.push(`${pack}_bad_sample_shortlink`);
    if (item.creatorShortlink !== expectedCreator) failures.push(`${pack}_bad_creator_shortlink`);
    if (!item.trackedLandingUrl?.includes("utm_source=creator_kit")) failures.push(`${pack}_missing_creator_source`);
    if (!item.trackedLandingUrl?.includes(`utm_campaign=${expectedCampaign}`)) failures.push(`${pack}_missing_campaign`);
    if (!item.newsletterBlurb?.includes(expectedSample)) failures.push(`${pack}_newsletter_blurb_missing_sample`);
    if (!item.youtubeDescription?.includes(expectedCreator)) failures.push(`${pack}_youtube_missing_creator`);
    if (!item.socialCaption?.includes(expectedCreator)) failures.push(`${pack}_social_missing_creator`);
    if (item.utmContract?.content !== "creator_kit_sample") failures.push(`${pack}_bad_utm_content`);
    if (!creatorKitPage.includes(`data-creator-kit-pack="${pack}"`)) failures.push(`${pack}_creator_page_missing_pack`);
    if (!creatorKitPage.includes(expectedCreator)) failures.push(`${pack}_creator_page_missing_creator`);
    if (!creatorKitPage.includes(expectedSample)) failures.push(`${pack}_creator_page_missing_sample`);
    failures.push(...await checkCreatorRedirect(args.baseUrl, pack, expectedCampaign));
  }

  const runnerNeedles = [
    "loadCreatorKit",
    "creatorPackForChannel",
    "trafficPack.trackedLandingUrl",
    "trafficPack.sampleShortlink",
    "trafficPack.newsletterBlurb",
    "Creator Kit",
    "message body includes ${trafficPack.sampleShortlink}",
    "rendered email must include the creator-kit sample shortlink",
  ];
  if (!hasAll(runner, runnerNeedles)) failures.push("newsletter_runner_missing_creator_kit_hooks");

  const report = {
    generatedAt: new Date().toISOString(),
    ok: failures.length === 0,
    failed: failures,
    checks: {
      packs: Object.keys(creatorKit.packs || {}),
      runnerHooks: runnerNeedles.length,
      baseUrl: args.baseUrl || "local",
      creatorKitPageBytes: Buffer.byteLength(creatorKitPage),
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
