import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = process.cwd();
const DEFAULT_OUT = "/tmp/fursay-deploy-readiness";
const ANALYTICS_ENGINE_ENABLEMENT_URL =
  "https://dash.cloudflare.com/e6780ef96bb6f53eba1dbc4d6dfa7376/workers/analytics-engine";

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {
    requireRemote: args.includes("--require-remote"),
    requireCloudflare: args.includes("--require-cloudflare"),
    outDir: DEFAULT_OUT,
  };
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--out-dir") parsed.outDir = args[++i];
  }
  return parsed;
}

async function readJson(path) {
  return JSON.parse(await readFile(resolve(ROOT, path), "utf8"));
}

async function readText(path) {
  return readFile(resolve(ROOT, path), "utf8");
}

function gitValue(args) {
  const result = spawnSync("git", args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: "pipe",
  });
  return result.status === 0 ? result.stdout.trim() : "";
}

function addIssue(list, ok, code, detail = "") {
  if (!ok) list.push(detail ? `${code}:${detail}` : code);
}

async function main() {
  const args = parseArgs();
  const failures = [];
  const warnings = [];
  const packageJson = await readJson("package.json");
  const wrangler = await readJson("wrangler.jsonc");
  const workflow = await readText(".github/workflows/deploy-worker.yml");
  const deployRunbook = await readText("docs/cloudflare-deploy-runbook.md");
  const analyticsRunbook = await readText("docs/analytics-engine-enablement.md");
  const branch = gitValue(["branch", "--show-current"]);
  const commit = gitValue(["rev-parse", "--short", "HEAD"]);
  const remote = gitValue(["remote", "get-url", "origin"]);
  const hasCloudflareToken = Boolean(process.env.CLOUDFLARE_API_TOKEN);
  const hasCloudflareAccount = Boolean(process.env.CLOUDFLARE_ACCOUNT_ID);
  const hasAnalyticsReportToken = Boolean(process.env.CLOUDFLARE_ANALYTICS_TOKEN || process.env.CLOUDFLARE_API_TOKEN);

  addIssue(failures, packageJson.scripts?.check === "node scripts/release-fursay.mjs --check-only", "package_bad_check_script");
  addIssue(failures, packageJson.scripts?.deploy === "node scripts/release-fursay.mjs", "package_bad_deploy_script");
  addIssue(failures, packageJson.scripts?.["deploy:ready"] === "node scripts/check-deploy-readiness.mjs", "package_bad_deploy_ready_script");
  addIssue(failures, packageJson.scripts?.["report:events"] === "node scripts/query-event-analytics-report.mjs", "package_bad_event_report_script");
  addIssue(failures, packageJson.scripts?.["smoke:live"] === "node scripts/smoke-live.mjs", "package_bad_live_smoke_script");
  addIssue(failures, existsSync(resolve(ROOT, "scripts/smoke-live.mjs")), "missing_live_smoke_runner");
  addIssue(failures, Boolean(packageJson.devDependencies?.wrangler), "package_missing_wrangler");
  addIssue(failures, Boolean(packageJson.devDependencies?.playwright), "package_missing_playwright");

  addIssue(failures, wrangler.name === "fursay", "wrangler_bad_name", wrangler.name || "none");
  addIssue(failures, wrangler.main === "src/worker.js", "wrangler_bad_main", wrangler.main || "none");
  addIssue(failures, wrangler.assets?.directory === "./fursay-optimized-site", "wrangler_bad_assets_directory", wrangler.assets?.directory || "none");
  addIssue(failures, wrangler.assets?.binding === "ASSETS", "wrangler_bad_assets_binding", wrangler.assets?.binding || "none");
  addIssue(failures, wrangler.assets?.run_worker_first === true, "wrangler_must_run_worker_first");
  const analyticsBinding = (wrangler.analytics_engine_datasets || []).find((item) => item.binding === "FURSAY_EVENTS");
  if (!analyticsBinding) {
    warnings.push("analytics_engine_dashboard_enablement_required");
  } else {
    addIssue(failures, analyticsBinding.dataset === "fursay_events", "wrangler_bad_event_analytics_dataset", analyticsBinding.dataset || "none");
  }

  for (const needle of [
    "npm run deploy:ready",
    "npm run check",
    "npm run deploy",
    "npm run deploy:ready -- --require-remote --require-cloudflare",
    "CLOUDFLARE_API_TOKEN",
    "CLOUDFLARE_ACCOUNT_ID",
    "npx playwright install --with-deps chromium",
    "concurrency:",
    "actions/upload-artifact@v4",
    "/tmp/fursay-release-*",
    "/tmp/fursay-smoke-live",
    "/tmp/fursay-event-analytics-report",
    "retention-days: 14",
    "CLOUDFLARE_ANALYTICS_TOKEN",
    "npm run smoke:live",
    "npm run report:events -- --out-dir /tmp/fursay-event-analytics-report",
  ]) {
    addIssue(failures, workflow.includes(needle), "workflow_missing", needle);
  }

  for (const needle of [
    "Cloudflare Workers Static Assets",
    "CLOUDFLARE_API_TOKEN",
    "CLOUDFLARE_ACCOUNT_ID",
    "CLOUDFLARE_ANALYTICS_TOKEN",
    "docs/analytics-engine-enablement.md",
    "npm run deploy:ready -- --require-remote",
    "npm run deploy:ready -- --require-cloudflare",
    "npm run deploy:ready -- --require-remote --require-cloudflare",
    "fursay-release-evidence-${{ github.run_id }}",
    "/tmp/fursay-smoke-live",
    "/tmp/fursay-event-analytics-report",
    "fail-closed",
    "npm run smoke:live",
    "npm run report:events -- --out-dir /tmp/fursay-event-analytics-report",
    "/deploy-readiness.json",
    "/share-kit.json",
    "/traffic-launch.json",
    "/noor-sprint-status.json",
    "/noor-sprint-action.json",
    "/products.json",
    "/product-samples/koko-printable",
    "/product-samples/noor-worksheet",
    "/noor-sprint-status",
    "/monetization-roadmap.json",
    "/shortlinks.json",
    "FURSAY_EVENTS",
    "fursay_events",
    "never secret values",
    "GitHub push-to-deploy should attach both live smoke evidence and the real Analytics Engine report",
  ]) {
    addIssue(failures, deployRunbook.includes(needle), "deploy_runbook_missing", needle);
  }

  for (const needle of [
    "Fursay Analytics Engine Enablement",
    "FURSAY_EVENTS",
    "fursay_events",
    "pending_cloudflare_credentials_or_enablement",
    "10089",
    "npm run deploy:ready -- --require-cloudflare",
    "npm run report:events",
    "status` equal to `queried",
    "queries` count equal to `12",
    "decisionScoreboard.status` equal to `queried",
    "Do not print, commit, or publish token values",
  ]) {
    addIssue(failures, analyticsRunbook.includes(needle), "analytics_runbook_missing", needle);
  }

  if (!remote) {
    const issue = "git_missing_origin_remote";
    (args.requireRemote ? failures : warnings).push(issue);
  }
  if (!hasCloudflareToken) {
    const issue = "missing_CLOUDFLARE_API_TOKEN";
    (args.requireCloudflare ? failures : warnings).push(issue);
  }
  if (!hasCloudflareAccount) {
    const issue = "missing_CLOUDFLARE_ACCOUNT_ID";
    (args.requireCloudflare ? failures : warnings).push(issue);
  }
  if (!hasAnalyticsReportToken) {
    const issue = "missing_CLOUDFLARE_ANALYTICS_TOKEN_or_CLOUDFLARE_API_TOKEN";
    (args.requireCloudflare ? failures : warnings).push(issue);
  }

  const analyticsReportReady = Boolean(analyticsBinding && hasCloudflareAccount && hasAnalyticsReportToken);

  const report = {
    ok: failures.length === 0,
    strict: {
      requireRemote: args.requireRemote,
      requireCloudflare: args.requireCloudflare,
    },
    source: { branch, commit },
    deployment: {
      platform: "cloudflare-workers-static-assets",
      workerName: wrangler.name || "",
      assetsBinding: wrangler.assets?.binding || "",
      releaseCommand: packageJson.scripts?.deploy || "",
      localGateCommand: "npm run check",
      postDeployLiveSmokeCommand: "npm run smoke:live",
      postDeployAnalyticsReportCommand: "npm run report:events -- --out-dir /tmp/fursay-event-analytics-report",
      workflow: ".github/workflows/deploy-worker.yml",
      runbook: "docs/cloudflare-deploy-runbook.md",
      hasOriginRemote: Boolean(remote),
      hasCloudflareToken,
      hasCloudflareAccount,
      hasAnalyticsReportToken,
      analyticsEngine: {
        binding: "FURSAY_EVENTS",
        dataset: "fursay_events",
        configured: Boolean(analyticsBinding),
        status: analyticsBinding ? "configured_in_wrangler" : "pending_cloudflare_dashboard_enablement",
        enablementUrl: ANALYTICS_ENGINE_ENABLEMENT_URL,
        lastDeployBlockerCode: analyticsBinding ? "" : "10089",
      },
      analyticsReport: {
        command: "npm run report:events",
        script: "scripts/query-event-analytics-report.mjs",
        dataset: "fursay_events",
        requiredEnv: ["CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_ANALYTICS_TOKEN or CLOUDFLARE_API_TOKEN"],
        hasCloudflareAccount,
        hasAnalyticsReportToken,
        ready: analyticsReportReady,
        status: analyticsReportReady
          ? "ready_to_query_after_dashboard_enablement"
          : "pending_cloudflare_credentials_or_enablement",
        piiAllowed: false,
      },
      analyticsEnablementHandoff: {
        runbook: "docs/analytics-engine-enablement.md",
        dashboardUrl: ANALYTICS_ENGINE_ENABLEMENT_URL,
        nextSafeAction: analyticsBinding
          ? "Provide CLOUDFLARE_ACCOUNT_ID plus CLOUDFLARE_ANALYTICS_TOKEN or CLOUDFLARE_API_TOKEN before running npm run report:events."
          : "Enable Analytics Engine for dataset fursay_events, then provide CLOUDFLARE_ACCOUNT_ID plus CLOUDFLARE_ANALYTICS_TOKEN or CLOUDFLARE_API_TOKEN before running npm run report:events.",
        doNotChangeBeforeEnablement: analyticsBinding
          ? "Analytics Engine binding is configured in wrangler.jsonc; keep token values out of files and environment reports."
          : "Do not add analytics_engine_datasets back to wrangler.jsonc until Cloudflare accepts the dataset; adding it too early previously failed with blocker code 10089.",
        successCriteria: [
          "npm run deploy:ready -- --require-cloudflare passes",
          "npm run report:events returns status=queried",
          "event-analytics-report.json keeps piiAllowed=false",
          "event-analytics-report.json includes 12 queries",
          "decisionScoreboard.status is queried",
          "noor_growth_signals_7d and noor_growth_signals_30d are present",
        ],
      },
    },
    failures,
    warnings,
  };

  console.log(JSON.stringify(report, null, 2));
  await mkdir(args.outDir, { recursive: true });
  await writeFile(resolve(args.outDir, "deploy-readiness.json"), JSON.stringify(report, null, 2) + "\n");
  if (!report.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
