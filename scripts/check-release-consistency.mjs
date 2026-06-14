import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const SITE_DIR = resolve(process.cwd(), "fursay-optimized-site");
const DEFAULT_OUT = "/tmp/fursay-release-consistency";
const JSON_MANIFESTS = [
  "/release.json",
  "/deploy-readiness.json",
  "/campaigns.json",
  "/creator-kit.json",
  "/share-kit.json",
  "/traffic-launch.json",
  "/links.json",
  "/conversion-health.json",
  "/products.json",
  "/video-discovery.json",
  "/shortlinks.json",
];
const BADGE_PAGES = [
  "/creator-kit",
  "/share-kit",
  "/traffic-launch",
  "/links",
  "/deploy-readiness",
  "/conversion-health",
];
const LIVE_SMOKE_LOCAL_ONLY_EXCLUSIONS = new Set([
  "scripts/check-newsletter-state-contract.mjs",
  "scripts/check-render-jobs.mjs",
  "scripts/check-workspace-hygiene.mjs",
  "scripts/check-static-asset-structure.mjs",
  "scripts/check-deploy-readiness.mjs",
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

function gitCommit() {
  const result = spawnSync("git", ["rev-parse", "--short", "HEAD"], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: "pipe",
  });
  return result.status === 0 ? result.stdout.trim() : "";
}

function localFile(pathname) {
  if (pathname === "/") return "index.html";
  if (/\.[^/]+$/.test(pathname)) return pathname.slice(1);
  if (pathname.endsWith("/")) return `${pathname.slice(1)}index.html`;
  return `${pathname.slice(1)}.html`;
}

async function readText(baseUrl, pathname) {
  if (baseUrl) {
    const response = await fetch(`${baseUrl}${pathname}`);
    if (!response.ok) throw new Error(`${pathname} status ${response.status}`);
    return response.text();
  }
  return readFile(resolve(SITE_DIR, localFile(pathname)), "utf8");
}

async function readJson(baseUrl, pathname) {
  return JSON.parse(await readText(baseUrl, pathname));
}

function commitBadge(html) {
  return html.match(/<span>Commit ([0-9a-f]{7,40})<\/span>/i)?.[1] || "";
}

async function smokeLiveGateCoverage(release) {
  const packageJson = JSON.parse(await readFile(resolve(process.cwd(), "package.json"), "utf8"));
  const smokeScript = packageJson.scripts?.["smoke:live"] || "";
  const smokeGates = [...smokeScript.matchAll(/node (scripts\/[\w-]+\.mjs|audit-fursay\.mjs)\b/g)]
    .map((match) => match[1]);
  const qualityGates = Array.isArray(release.qualityGates) ? release.qualityGates : [];
  const expectedLiveGates = qualityGates.filter((gate) => !LIVE_SMOKE_LOCAL_ONLY_EXCLUSIONS.has(gate));
  const missing = expectedLiveGates.filter((gate) => !smokeGates.includes(gate));
  const extra = smokeGates.filter((gate) => !qualityGates.includes(gate));
  return {
    smokeGates,
    expectedLiveGates,
    missing,
    extra,
  };
}

async function releaseScriptGateCoverage(release) {
  const source = await readFile(resolve(process.cwd(), "scripts/release-fursay.mjs"), "utf8");
  const qualityGates = Array.isArray(release.qualityGates) ? release.qualityGates : [];
  const liveStart = source.indexOf("if (!args.skipLive) {");
  const syntaxChecks = [...source.matchAll(/run\("node", \["--check", "(scripts\/[\w-]+\.mjs|audit-fursay\.mjs)"\]\);/g)]
    .map((match) => match[1]);
  const nodeRuns = [...source.matchAll(/run\("node", \["(scripts\/[\w-]+\.mjs|audit-fursay\.mjs)"([^\]]*)\]/g)]
    .map((match) => ({
      gate: match[1],
      args: match[2],
      index: match.index,
    }));
  const localRuns = nodeRuns
    .filter((run) => liveStart === -1 || run.index < liveStart)
    .map((run) => run.gate);
  const liveRuns = nodeRuns
    .filter((run) => liveStart !== -1 && run.index > liveStart)
    .map((run) => run.gate);
  const executableRuns = [...new Set([...localRuns, ...liveRuns])];
  const expectedLiveGates = qualityGates.filter((gate) => !LIVE_SMOKE_LOCAL_ONLY_EXCLUSIONS.has(gate));
  return {
    syntaxChecks,
    localRuns,
    liveRuns,
    missingSyntaxChecks: qualityGates.filter((gate) => gate.startsWith("scripts/") && !syntaxChecks.includes(gate)),
    missingExecutableRuns: qualityGates.filter((gate) => !executableRuns.includes(gate)),
    missingReleaseLiveRuns: expectedLiveGates.filter((gate) => !liveRuns.includes(gate)),
    extraExecutableRuns: executableRuns.filter((gate) => !qualityGates.includes(gate)),
  };
}

async function main() {
  const args = parseArgs();
  const failures = [];
  const manifests = [];
  const badges = [];
  const release = await readJson(args.baseUrl, "/release.json");
  const expectedCommit = args.baseUrl ? release.source?.commit || "" : gitCommit();
  const expectedSummary = release.source?.summary || "";
  const expectedDate = release.releasedAt || "";

  if (!/^[0-9a-f]{7,40}$/.test(expectedCommit)) failures.push(`expected_commit_invalid:${expectedCommit || "none"}`);
  if (!expectedSummary) failures.push("release_missing_summary");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expectedDate)) failures.push(`release_date_invalid:${expectedDate || "none"}`);

  for (const pathname of JSON_MANIFESTS) {
    const manifest = await readJson(args.baseUrl, pathname);
    const commit = manifest.source?.commit || "";
    const summary = manifest.source?.summary || "";
    const date = manifest.releasedAt || manifest.updatedAt || "";
    const itemFailures = [];
    if (manifest.platform !== "cloudflare-workers-static-assets") itemFailures.push(`bad_platform:${manifest.platform || "none"}`);
    if (commit !== expectedCommit) itemFailures.push(`bad_commit:${commit || "none"}`);
    if (summary !== expectedSummary) itemFailures.push(`bad_summary:${summary || "none"}`);
    if (date !== expectedDate) itemFailures.push(`bad_date:${date || "none"}`);
    failures.push(...itemFailures.map((failure) => `${pathname}:${failure}`));
    manifests.push({ path: pathname, commit, summary, date, failed: itemFailures.length });
  }

  for (const pathname of BADGE_PAGES) {
    const html = await readText(args.baseUrl, pathname);
    const badge = commitBadge(html);
    const itemFailures = [];
    if (badge !== expectedCommit) itemFailures.push(`bad_badge:${badge || "none"}`);
    if (!html.includes(`Commit ${expectedCommit}`)) itemFailures.push("missing_commit_text");
    failures.push(...itemFailures.map((failure) => `${pathname}:${failure}`));
    badges.push({ path: pathname, commit: badge, failed: itemFailures.length });
  }

  let smokeLive = null;
  let releaseScript = null;
  if (!args.baseUrl) {
    smokeLive = await smokeLiveGateCoverage(release);
    failures.push(...smokeLive.missing.map((gate) => `smoke_live_missing_gate:${gate}`));
    failures.push(...smokeLive.extra.map((gate) => `smoke_live_extra_gate:${gate}`));
    releaseScript = await releaseScriptGateCoverage(release);
    failures.push(...releaseScript.missingSyntaxChecks.map((gate) => `release_script_missing_syntax_check:${gate}`));
    failures.push(...releaseScript.missingExecutableRuns.map((gate) => `release_script_missing_executable_run:${gate}`));
    failures.push(...releaseScript.missingReleaseLiveRuns.map((gate) => `release_script_missing_live_run:${gate}`));
    failures.push(...releaseScript.extraExecutableRuns.map((gate) => `release_script_extra_executable_run:${gate}`));
  }

  await mkdir(args.outDir, { recursive: true });
  const report = {
    ok: failures.length === 0,
    mode: args.baseUrl ? "live" : "local",
    baseUrl: args.baseUrl || "",
    expectedCommit,
    expectedSummary,
    expectedDate,
    failures,
    manifests,
    badges,
    smokeLive,
    releaseScript,
  };
  await writeFile(resolve(args.outDir, "release-consistency.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({
    ok: report.ok,
    mode: report.mode,
    outDir: args.outDir,
    failed: failures.length,
    manifests: manifests.length,
    badges: badges.length,
  }, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
